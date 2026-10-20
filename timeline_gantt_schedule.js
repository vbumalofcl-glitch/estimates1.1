/**
 * ============================================================================
 * FCLDC TIMELINE PROJECT SCHEDULE (GANTT) - EXCEL-LIKE SCHEDULE STUDIO ENGINE
 * Complete Feature Parity with BOQ Workbook Gantt Schedule Module
 * ============================================================================
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.TimelineGanttStudio = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // --- Module State ---
  let currentProjectId = 'PRJ-2026-001';
  let boqData = [];
  let ganttScale = 'weeks'; // 'days' | 'weeks' | 'months' | 'quarters'
  let ganttMonthFilter = 'all'; // 'all' or 'YYYY-MM' / '0'..'11'
  let tgFilterRowsByMonth = false;
  let currentDate = new Date().toISOString().slice(0, 10);
  let projectStartDate = '2026-03-01';
  let highlightMode = 'none'; // 'none' | 'yellow' | 'blue' | 'green' | 'orange'
  let showCoordinates = false;
  let leftPanelWidth = 680;
  let isDraggingDivider = false;
  let selectedCellCoord = 'C2';
  let undoStack = [];

  // Qty Inst Modal State
  let qtyModalScale = 'days';
  let qtyModalActiveView = 'quantity'; // 'quantity' | 'accomplishment' | 'progress_cost' | 'progress_day' | 'cash_flow_estimated' | 'cash_flow_day'
  let qtyModalMonthFilter = 'all'; // 'all' or '0'..'11' / 'january'..'december'

  // Billing Engine State
  let fclBillingPeriods = [];
  let activeBillingCycle = 0;

  // Visual & Style Settings
  let ganttSettings = {
    barHeight: 18,
    rowHeight: 40,
    headerHeight: 52,
    coordHeaderHeight: 22,
    colWidthDays: 46,
    colWidthWeeks: 68,
    colWidthMonths: 110,
    colWidthQuarters: 200,
    barArrangement: 'planned_actual',
    taskColor: '#3b82f6',
    taskDayColor: '#10b981',
    criticalColor: '#ef4444',
    actualColor: '#f59e0b',
    headerLeftBg: '#107c41',
    headerLeftColor: '#ffffff',
    headerRightBg: '#1e293b',
    headerRightColor: '#ffffff',
    headerAltBg: '#334155',
    coordRowBg: '#f8fafc',
    coordRowColor: '#64748b',
    showDayLabel: true,
    showActualLabel: true,
    showScurve: true,
    showConnectors: true
  };

  // Helper date utilities
  function parseDate(str) {
    if (!str) return null;
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }

  function formatDate(d) {
    if (!d || isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function addDays(d, days) {
    const res = new Date(d.getTime());
    res.setDate(res.getDate() + days);
    return res;
  }

  function daysBetween(d1, d2) {
    if (!d1 || !d2) return 0;
    const diff = d2.getTime() - d1.getTime();
    return Math.round(diff / 86400000);
  }

  function formatMoney(num) {
    const n = Number(num);
    if (!Number.isFinite(n)) return '₱ 0.00';
    return '₱ ' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Row hierarchy helpers
  function levelOf(type) {
    if (type === 'category') return 1;
    if (type === 'subcategory') return 2;
    if (type === 'subsubcategory') return 3;
    if (type === 'subsubsubcategory') return 4;
    return 5;
  }

  function hasChildRow(data, index) {
    if (!data || index < 0 || index >= data.length - 1) return false;
    const currentLevel = levelOf(data[index].type);
    if (currentLevel >= 5) return false;
    const nextLevel = levelOf(data[index + 1].type);
    return nextLevel > currentLevel;
  }

  function getLeafDescendents(data, index) {
    const leaves = [];
    if (!data || index < 0 || index >= data.length) return leaves;
    const parentLevel = levelOf(data[index].type);
    for (let i = index + 1; i < data.length; i++) {
      if (levelOf(data[i].type) <= parentLevel) break;
      if (!hasChildRow(data, i)) {
        leaves.push(i);
      }
    }
    return leaves;
  }

  // --- Data Initialization & Loading ---
  function loadProjectScheduleData(projId) {
    currentProjectId = projId || currentProjectId;
    boqData = [];

    let savedBOQ = null;
    if (window.FCLStorage && typeof window.FCLStorage.readProjectSectionSync === 'function') {
      savedBOQ = window.FCLStorage.readProjectSectionSync(currentProjectId, 'boq');
    }
    if (!savedBOQ) {
      try {
        const raw = localStorage.getItem('cost_estimate_boq_' + currentProjectId);
        if (raw) savedBOQ = JSON.parse(raw);
      } catch (e) {}
    }

    // Guard against corrupt tasks
    const isCorrupted = (rows) => {
      if (!Array.isArray(rows) || rows.length === 0) return true;
      const hasCat = rows.some(r => r.type === 'category' || r.type === 'subcategory');
      const hasCost = rows.some(r => (parseFloat(r.materialUnitCost) || 0) > 0 || (parseFloat(r.laborUnitCost || r.leUnitCost) || 0) > 0);
      return !hasCat && !hasCost;
    };

    if (savedBOQ && Array.isArray(savedBOQ.boqData) && !isCorrupted(savedBOQ.boqData)) {
      boqData = JSON.parse(JSON.stringify(savedBOQ.boqData));
      if (Array.isArray(savedBOQ.billingPeriods) && savedBOQ.billingPeriods.length > 0) {
        fclBillingPeriods = JSON.parse(JSON.stringify(savedBOQ.billingPeriods));
      }
    } else if (typeof DEFAULT_SPORTS_CLUB_BOQ_DATA !== 'undefined' && Array.isArray(DEFAULT_SPORTS_CLUB_BOQ_DATA)) {
      boqData = JSON.parse(JSON.stringify(DEFAULT_SPORTS_CLUB_BOQ_DATA));
    } else if (window.FCL_BOQ_WORKBOOK && Array.isArray(window.FCL_BOQ_WORKBOOK.DEFAULT_SPORTS_CLUB_BOQ_DATA)) {
      boqData = JSON.parse(JSON.stringify(window.FCL_BOQ_WORKBOOK.DEFAULT_SPORTS_CLUB_BOQ_DATA));
    }

    // Ensure date defaults on rows
    let rollingDate = new Date(projectStartDate);
    boqData.forEach((row, idx) => {
      if (!row.ganttStartDate && !row.startDate) {
        row.startDate = formatDate(rollingDate);
        row.ganttStartDate = row.startDate;
      }
      if (!row.ganttDuration && !row.days) {
        const dur = (row.type === 'category' || row.type === 'subcategory') ? 30 : Math.max(10, Math.min(60, Math.round(15 + (idx % 4) * 8)));
        row.days = dur;
        row.ganttDuration = dur;
      }
      const dur = parseInt(row.ganttDuration || row.days || 10, 10);
      const sDate = parseDate(row.ganttStartDate || row.startDate);
      if (sDate && (!row.ganttFinishDate || !row.finishDate)) {
        const fDate = addDays(sDate, dur);
        row.finishDate = formatDate(fDate);
        row.ganttFinishDate = row.finishDate;
      }
      if (row.ganttProgress === undefined && row.percentDone !== undefined) {
        row.ganttProgress = row.percentDone;
      }
      if (!row.ganttPeriodQty) {
        row.ganttPeriodQty = {};
      }
      if (row.type !== 'category' && row.type !== 'subcategory' && idx % 3 === 0) {
        rollingDate = addDays(rollingDate, 4);
      }
    });

    // Load saved settings if any
    try {
      const savedGantt = window.FCLStorage ? window.FCLStorage.readProjectSectionSync(currentProjectId, 'ganttSettings') : null;
      if (savedGantt && savedGantt.settings) {
        Object.assign(ganttSettings, savedGantt.settings);
      }
    } catch (e) {}

    // Init billing periods if empty
    if (!Array.isArray(fclBillingPeriods) || fclBillingPeriods.length === 0) {
      initDefaultBillingPeriods();
    }
  }

  function initDefaultBillingPeriods() {
    fclBillingPeriods = [
      { id: 1, name: 'Billing Period #1', prevDate: '2026-03-01', currDate: '2026-03-31', retentionRate: 10, dpRate: 15, accomplishments: {} },
      { id: 2, name: 'Billing Period #2', prevDate: '2026-04-01', currDate: '2026-04-30', retentionRate: 10, dpRate: 15, accomplishments: {} },
      { id: 3, name: 'Billing Period #3', prevDate: '2026-05-01', currDate: '2026-05-31', retentionRate: 10, dpRate: 15, accomplishments: {} }
    ];
  }

  // --- Boundary Calculation ---
  function getProjectDateBoundary() {
    let minD = null;
    let maxD = null;
    boqData.forEach(r => {
      const s = parseDate(r.ganttStartDate || r.startDate);
      const e = parseDate(r.ganttFinishDate || r.finishDate);
      if (s) {
        if (!minD || s < minD) minD = s;
      }
      if (e) {
        if (!maxD || e > maxD) maxD = e;
      }
    });
    const pStart = parseDate(projectStartDate);
    if (pStart) {
      if (!minD || pStart < minD) minD = pStart;
    }
    if (!minD) minD = new Date();
    if (!maxD || maxD <= minD) maxD = addDays(minD, 180);
    return {
      start: addDays(minD, -2),
      finish: addDays(maxD, 5),
      minDate: minD,
      maxDate: maxD
    };
  }

  function buildMonthSelectOptionsHtml() {
    const boundary = getProjectDateBoundary();
    const minD = boundary.minDate || boundary.start;
    const maxD = boundary.maxDate || boundary.finish;

    const cur = new Date(minD.getFullYear(), minD.getMonth(), 1);
    const endLimit = new Date(maxD.getFullYear(), maxD.getMonth(), 1);

    let html = `<option value="all" ${ganttMonthFilter === 'all' ? 'selected' : ''}>All Scheduled Time (Full Timeline)</option>`;

    while (cur <= endLimit) {
      const y = cur.getFullYear();
      const mNum = String(cur.getMonth() + 1).padStart(2, '0');
      const val = `${y}-${mNum}`;
      const label = cur.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const isSelected = (ganttMonthFilter === val || ganttMonthFilter === String(cur.getMonth())) ? 'selected' : '';
      html += `<option value="${val}" ${isSelected}>${label}</option>`;
      cur.setMonth(cur.getMonth() + 1);
    }
    return html;
  }

  function isRowActiveInSelectedMonth(idx, boundary) {
    const row = boqData[idx];
    if (!row) return false;
    let y, targetM;
    if (String(ganttMonthFilter).includes('-')) {
      const parts = String(ganttMonthFilter).split('-').map(Number);
      y = parts[0];
      targetM = parts[1] - 1;
    } else {
      targetM = parseInt(ganttMonthFilter, 10);
      y = (boundary.minDate || boundary.start).getFullYear() || 2026;
    }
    const mStart = new Date(y, targetM, 1, 0, 0, 0, 0);
    const mEnd = new Date(y, targetM + 1, 0, 23, 59, 59, 999);

    if (row.type === 'category' || row.type === 'subcategory') {
      for (let i = idx + 1; i < boqData.length; i++) {
        if (boqData[i].type === 'category') break;
        if (row.type === 'subcategory' && boqData[i].type === 'subcategory') break;
        const s = parseDate(boqData[i].ganttStartDate || boqData[i].startDate);
        const e = parseDate(boqData[i].ganttFinishDate || boqData[i].finishDate);
        if (s && e && s <= mEnd && e >= mStart) return true;
      }
      return false;
    }

    const s = parseDate(row.ganttStartDate || row.startDate);
    const e = parseDate(row.ganttFinishDate || row.finishDate);
    if (!s || !e) return false;
    return (s <= mEnd && e >= mStart);
  }

  // Compute time columns for scale
  function getTimelineColumns(boundary, scale, monthFilter) {
    const s = scale || ganttScale;
    const cols = [];

    // When a specific month is selected (e.g. 'YYYY-MM' or '0'..'11'),
    // isolate that month's full calendar scope so the user sees the complete month
    if (monthFilter && monthFilter !== 'all') {
      let y, targetM;
      if (String(monthFilter).includes('-')) {
        const parts = String(monthFilter).split('-').map(Number);
        y = parts[0];
        targetM = parts[1] - 1; // 0-based
      } else {
        targetM = !isNaN(parseInt(monthFilter, 10))
          ? parseInt(monthFilter, 10)
          : new Date(Date.parse(monthFilter + " 1, 2026")).getMonth();
        y = (boundary.minDate || boundary.start).getFullYear() || 2026;
      }
      const mStart = new Date(y, targetM, 1);
      const mEnd = new Date(y, targetM + 1, 0, 23, 59, 59, 999);
      const mDays = mEnd.getDate();

      if (s === 'days') {
        const colW = ganttSettings.colWidthDays || 34;
        for (let d = 1; d <= mDays; d++) {
          const cur = new Date(y, targetM, d);
          cols.push({
            date: cur,
            endDate: cur,
            dateStr: formatDate(cur),
            label: String(d),
            topLabel: cur.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
            width: colW
          });
        }
      } else if (s === 'weeks') {
        const colW = ganttSettings.colWidthWeeks || 68;
        const numWeeks = Math.ceil(mDays / 7);
        for (let w = 0; w < numWeeks; w++) {
          const cur = addDays(mStart, w * 7);
          const endW = new Date(Math.min(addDays(cur, 6).getTime(), mEnd.getTime()));
          cols.push({
            date: cur,
            endDate: endW,
            dateStr: formatDate(cur),
            endDateStr: formatDate(endW),
            label: `W${w + 1}`,
            subLabel: cur.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            topLabel: cur.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
            width: colW
          });
        }
      } else if (s === 'months') {
        const colW = ganttSettings.colWidthMonths || 120;
        cols.push({
          date: mStart,
          endDate: mEnd,
          dateStr: formatDate(mStart),
          endDateStr: formatDate(mEnd),
          label: mStart.toLocaleDateString('en-US', { month: 'long' }),
          topLabel: `Year ${y}`,
          width: colW
        });
      } else if (s === 'quarters') {
        const colW = ganttSettings.colWidthQuarters || 200;
        const qNum = Math.floor(targetM / 3) + 1;
        const qStartM = (qNum - 1) * 3;
        const qStart = new Date(y, qStartM, 1);
        const qEnd = new Date(y, qStartM + 3, 0, 23, 59, 59, 999);
        cols.push({
          date: qStart,
          endDate: qEnd,
          dateStr: formatDate(qStart),
          endDateStr: formatDate(qEnd),
          label: `Q${qNum} ${y}`,
          topLabel: `Quarterly Milestone`,
          width: colW
        });
      }
      return cols;
    }

    // Default: 'all' months across project date boundary
    const totalDays = Math.max(7, daysBetween(boundary.start, boundary.finish));

    if (s === 'days') {
      const colW = ganttSettings.colWidthDays || 34;
      for (let d = 0; d < totalDays; d++) {
        const cur = addDays(boundary.start, d);
        cols.push({
          date: cur,
          endDate: cur,
          dateStr: formatDate(cur),
          label: String(cur.getDate()),
          topLabel: cur.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          width: colW
        });
      }
    } else if (s === 'weeks') {
      const colW = ganttSettings.colWidthWeeks || 68;
      const numWeeks = Math.ceil(totalDays / 7);
      for (let w = 0; w < numWeeks; w++) {
        const cur = addDays(boundary.start, w * 7);
        const endW = addDays(cur, 6);
        cols.push({
          date: cur,
          endDate: endW,
          dateStr: formatDate(cur),
          endDateStr: formatDate(endW),
          label: `W${w + 1}`,
          subLabel: cur.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          topLabel: cur.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          width: colW
        });
      }
    } else if (s === 'months') {
      const colW = ganttSettings.colWidthMonths || 120;
      const startY = boundary.start.getFullYear();
      const startM = boundary.start.getMonth();
      const endY = boundary.maxDate.getFullYear();
      const endM = boundary.maxDate.getMonth();

      let curY = startY;
      let curM = startM;

      while (curY < endY || (curY === endY && curM <= endM)) {
        const monthStart = new Date(curY, curM, 1);
        const monthEnd = new Date(curY, curM + 1, 0, 23, 59, 59, 999);
        const monthName = monthStart.toLocaleDateString('en-US', { month: 'long' });

        cols.push({
          date: monthStart,
          endDate: monthEnd,
          dateStr: formatDate(monthStart),
          endDateStr: formatDate(monthEnd),
          label: monthName,
          topLabel: `Year ${curY}`,
          width: colW
        });

        curM++;
        if (curM > 11) {
          curM = 0;
          curY++;
        }
      }
    } else if (s === 'quarters') {
      const colW = ganttSettings.colWidthQuarters || 200;
      const numQuarters = Math.ceil(totalDays / 90);
      for (let q = 0; q < numQuarters; q++) {
        const cur = addDays(boundary.start, q * 90);
        const endQ = addDays(cur, 89);
        const qNum = Math.floor(cur.getMonth() / 3) + 1;
        cols.push({
          date: cur,
          endDate: endQ,
          dateStr: formatDate(cur),
          label: `Q${qNum} ${cur.getFullYear()}`,
          topLabel: `Quarterly Milestone`,
          width: colW
        });
      }
    }

    return cols;
  }

  // --- Calculations for Accomplishment & S-Curve ---
  function getTaskCost(row) {
    if (!row) return 0;
    if (row.grandTotalCost !== undefined && parseFloat(row.grandTotalCost) > 0) {
      return parseFloat(row.grandTotalCost);
    }
    const q = parseFloat(row.qty) || 1;
    const m = parseFloat(row.materialUnitCost) || 0;
    const l = parseFloat(row.laborUnitCost !== undefined ? row.laborUnitCost : (row.leUnitCost || 0));
    return q * (m + l);
  }

  function getInstalledQty(index) {
    const row = boqData[index];
    if (!row) return 0;
    if (hasChildRow(boqData, index)) {
      const leaves = getLeafDescendents(boqData, index);
      return leaves.reduce((sum, leafIdx) => sum + getInstalledQty(leafIdx), 0);
    }
    if (row.ganttPeriodQty && Object.keys(row.ganttPeriodQty).length > 0) {
      return Object.values(row.ganttPeriodQty).reduce((acc, v) => acc + (parseFloat(v) || 0), 0);
    }
    return parseFloat(row.ganttInstalledQty) || 0;
  }

  function getAccomplishedCost(index) {
    const row = boqData[index];
    if (!row) return 0;
    if (hasChildRow(boqData, index)) {
      const leaves = getLeafDescendents(boqData, index);
      return leaves.reduce((sum, leafIdx) => sum + getAccomplishedCost(leafIdx), 0);
    }
    const totalCost = getTaskCost(row);
    const estQty = parseFloat(row.qty) || 1;
    const instQty = getInstalledQty(index);
    if (estQty <= 0) return 0;
    return (instQty / estQty) * totalCost;
  }

  // --- Recalculate Progress (Day) function ---
  function recalculateProgressPercentDay() {
    const curD = parseDate(currentDate);
    if (!curD) return;

    let totalBudget = 0;
    let earnedValueSum = 0;

    boqData.forEach((row, idx) => {
      const s = parseDate(row.ganttStartDate || row.startDate);
      const e = parseDate(row.ganttFinishDate || row.finishDate);
      const dur = parseInt(row.ganttDuration || row.days || 10, 10);
      const rowTotal = getTaskCost(row);

      if (row.type !== 'category' && row.type !== 'subcategory') {
        totalBudget += rowTotal;
      }

      if (s && dur > 0) {
        let prog = 0;
        if (curD <= s) {
          prog = 0;
        } else if (e && curD >= e) {
          prog = 100;
        } else {
          const elapsed = daysBetween(s, curD);
          prog = Math.min(100, Math.max(0, Math.round((elapsed / dur) * 100)));
        }
        row.ganttProgress = prog;
        row.percentDone = prog;

        if (row.type !== 'category' && row.type !== 'subcategory') {
          earnedValueSum += (rowTotal * (prog / 100));
        }
      }
    });

    const projectProgress = totalBudget > 0 ? parseFloat(((earnedValueSum / totalBudget) * 100).toFixed(1)) : 0;

    // Save and re-render
    saveSchedule(true);
    renderMainGanttView();

    // Trigger toast notification
    if (window.FCLStorage && typeof window.FCLStorage.showToast === 'function') {
      window.FCLStorage.showToast(`✅ Progress Percent (Day) Recalculated! Project Progress: ${projectProgress}%`, 'success');
    } else {
      alert(`✅ Progress Percent (Day) Recalculated!\n\n• Current Date: ${currentDate}\n• Calculated Project Actual Progress: ${projectProgress}%\n• All activities updated based on elapsed schedule duration.`);
    }
  }

  // --- Main HTML Render ---
  function render(containerId, projectData) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (projectData && (projectData.id || projectData.code)) {
      currentProjectId = projectData.id || projectData.code;
    } else if (typeof window !== 'undefined' && window.currentProjectId) {
      currentProjectId = window.currentProjectId;
    }

    loadProjectScheduleData(currentProjectId);

    const boundary = getProjectDateBoundary();
    const columns = getTimelineColumns(boundary, ganttScale, ganttMonthFilter);
    const finishDateStr = formatDate(boundary.maxDate);

    container.innerHTML = `
      <div class="tg-excel-window" id="tgExcelWindow">
        <!-- 1. Excel Green Title Bar -->
        <div class="tg-titlebar">
          <div class="tg-titlebar-left">
            <span class="tg-excel-badge">X</span>
            <span class="tg-autosave-badge">
              <span class="tg-autosave-dot"></span>
              AutoSave <strong style="color:#ffffff; margin-left:3px;">ON</strong>
            </span>
            <div class="tg-title-text">
              <span id="tgWorkbookName">${currentProjectId}_Schedule_Gantt_CPM_Matrix.xlsx</span>
              <span style="opacity:0.75; font-size:11px;">- Excel Studio (Live Interactive Gantt)</span>
            </div>
          </div>

          <div class="tg-tellme-box">
            <input type="text" class="tg-tellme-input" id="tgTellMeInput" placeholder="🔍 Search activities, codes, CPM milestones or tell me what to do..." oninput="TimelineGanttStudio.filterTasks(this.value)">
          </div>

          <div class="tg-titlebar-actions">
            <button type="button" class="tg-win-btn" onclick="TimelineGanttStudio.toggleFullView()" id="tgFullViewBtn" title="Toggle Full Screen View">⛶ Full View</button>
            <button type="button" class="tg-win-btn" onclick="TimelineGanttStudio.exportToExcel()" title="Export Schedule to Microsoft Excel (.xlsx)">📥 Export .xlsx</button>
            <button type="button" class="tg-win-btn" style="background:#059669;" onclick="TimelineGanttStudio.saveSchedule(false)" title="Save Schedule & Sync to Cloud Firestore">💾 Save &amp; Sync</button>
          </div>
        </div>

        <!-- 2. Excel Ribbon Tabs -->
        <div class="tg-ribbon-tabs">
          <div class="tg-ribbon-tab active" onclick="TimelineGanttStudio.switchRibbonTab('home')">Home</div>
          <div class="tg-ribbon-tab" onclick="TimelineGanttStudio.openAddActivityModal()">Insert Task</div>
          <div class="tg-ribbon-tab" onclick="TimelineGanttStudio.showUpdateQtyInst(event)">Accomplishment</div>
          <div class="tg-ribbon-tab" onclick="TimelineGanttStudio.showBillingRecord(event)">Billing Engine</div>
          <div class="tg-ribbon-tab" onclick="TimelineGanttStudio.openStyleSettings()">Style Settings</div>
          <div class="tg-ribbon-tab" onclick="TimelineGanttStudio.exportToExcel()">Data Export</div>
          <div class="tg-ribbon-tab" onclick="window.print()">Print Schedule</div>
        </div>

        <!-- 3. Gantt Toolbar Controls (Parity with BOQ Schedule Tab) -->
        <div class="tg-toolbar-strip">
          <!-- Left Controls Group -->
          <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
            <!-- Current Date & Update Percent -->
            <div class="tg-toolbar-group">
              <span class="tg-toolbar-label">Current Date:</span>
              <input type="date" id="tgCurrentDateInput" value="${currentDate}" style="height: 24px; border: 1px solid #cbd5e1; border-radius: 4px; padding: 2px 4px; font-size: 11px; font-weight: 600;" onchange="TimelineGanttStudio.onCurrentDateChange(this.value)">
              <button type="button" class="tg-tool-btn" style="background: #f1f5f9; color: #0284c7; border-color: #0284c7;" onclick="TimelineGanttStudio.recalculateProgressPercentDay()" title="Recalculate task accomplishment % based on elapsed time to Current Date">⚡ Update Percent (Day)</button>
              <button type="button" class="tg-tool-btn" style="background: #0284c7; color: #fff; border-color: #0284c7; font-weight: 700;" onclick="TimelineGanttStudio.triggerScheduleImport()" title="Load Schedule from Excel (.xlsx, .xls) or JSON (.json)">📂 Load Schedule</button>
              <button type="button" class="tg-tool-btn primary" style="background: #059669; border-color: #059669; color: #fff; font-weight: 700;" onclick="TimelineGanttStudio.saveSchedule(false)" title="Save Schedule &amp; sync to Cloud Firestore so other users can view on their computer">💾 Save Schedule &amp; Sync</button>
            </div>

            <!-- Update Data Dropdown -->
            <div class="tg-dropdown">
              <button type="button" class="tg-tool-btn primary" onclick="TimelineGanttStudio.toggleUpdateDataDropdown(event)" id="tgUpdateDataBtn">
                📊 Update Data <span style="font-size: 8px; margin-left: 2px;">▼</span>
              </button>
              <div class="tg-dropdown-menu" id="tgUpdateDataDropdown">
                <a href="javascript:void(0)" class="tg-dropdown-item" onclick="TimelineGanttStudio.showUpdateQtyInst(event)">
                  <span>📈 Update Qty Inst (Accomplishment)</span>
                </a>
                <a href="javascript:void(0)" class="tg-dropdown-item" onclick="TimelineGanttStudio.showBillingRecord(event)">
                  <span>💳 Billing Record &amp; Payment Certificate</span>
                </a>
              </div>
            </div>

            <!-- Undo -->
            <button type="button" class="tg-tool-btn" id="tgUndoBtn" onclick="TimelineGanttStudio.undo()" disabled title="Undo last change">↺ Undo</button>

            <!-- Row Highlight Dropdown -->
            <div class="tg-dropdown">
              <button type="button" class="tg-tool-btn" onclick="TimelineGanttStudio.toggleHighlightDropdown(event)" id="tgHighlightBtn">
                Row Highlight: <span id="tgHighlightLabel" style="font-weight: 800; margin-left: 2px;">None</span> <span style="font-size: 8px;">▼</span>
              </button>
              <div class="tg-dropdown-menu" id="tgHighlightDropdown">
                <a href="javascript:void(0)" class="tg-dropdown-item" onclick="TimelineGanttStudio.setHighlightMode('none', event)">Disable Highlight</a>
                <a href="javascript:void(0)" class="tg-dropdown-item" style="background:#fef08a; font-weight:700;" onclick="TimelineGanttStudio.setHighlightMode('yellow', event)">Yellow Highlight</a>
                <a href="javascript:void(0)" class="tg-dropdown-item" style="background:#bfdbfe; font-weight:700;" onclick="TimelineGanttStudio.setHighlightMode('blue', event)">Blue Highlight</a>
                <a href="javascript:void(0)" class="tg-dropdown-item" style="background:#bbf7d0; font-weight:700;" onclick="TimelineGanttStudio.setHighlightMode('green', event)">Green Highlight</a>
                <a href="javascript:void(0)" class="tg-dropdown-item" style="background:#fed7aa; font-weight:700;" onclick="TimelineGanttStudio.setHighlightMode('orange', event)">Orange Highlight</a>
              </div>
            </div>
          </div>

          <!-- Center/Right Controls: Scales, Month, Coordinates, Settings, Start/Finish -->
          <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
            <!-- Scale Switcher -->
            <div class="tg-toolbar-group">
              <span class="tg-toolbar-label">Scale:</span>
              <div class="tg-scale-btn-group">
                <button type="button" class="tg-scale-btn ${ganttScale === 'days' ? 'active' : ''}" onclick="TimelineGanttStudio.setScale('days')">Days</button>
                <button type="button" class="tg-scale-btn ${ganttScale === 'weeks' ? 'active' : ''}" onclick="TimelineGanttStudio.setScale('weeks')">Weeks</button>
                <button type="button" class="tg-scale-btn ${ganttScale === 'months' ? 'active' : ''}" onclick="TimelineGanttStudio.setScale('months')">Months</button>
                <button type="button" class="tg-scale-btn ${ganttScale === 'quarters' ? 'active' : ''}" onclick="TimelineGanttStudio.setScale('quarters')">Quarters</button>
              </div>
            </div>

            <!-- Month Selector Filter -->
            <div class="tg-toolbar-group" style="display: flex; align-items: center; gap: 4px;">
              <span class="tg-toolbar-label">Month:</span>
              <select id="tgGanttMonthSelect" style="height: 24px; border: 1px solid #cbd5e1; border-radius: 4px; padding: 0 6px; font-size: 11px; font-weight: 700; background: #ffffff; color: #1e3a8a; cursor: pointer;" onchange="TimelineGanttStudio.setMonthFilter(this.value)">
                ${buildMonthSelectOptionsHtml()}
              </select>
              <label style="display: inline-flex; align-items: center; gap: 3px; font-size: 10.5px; font-weight: 600; color: #475569; cursor: pointer;" title="Filter task table to only activities scheduled in the selected month">
                <input type="checkbox" id="tgFilterRowsByMonth" ${tgFilterRowsByMonth ? 'checked' : ''} ${ganttMonthFilter === 'all' ? 'disabled' : ''} onchange="TimelineGanttStudio.toggleFilterRowsByMonth(this.checked)" style="cursor: pointer; margin: 0;">
                <span>Only Month Tasks</span>
              </label>
              <button type="button" class="tg-tool-btn" style="padding: 2px 7px; font-size: 10px; height: 24px; line-height: 20px; font-weight: 700;" onclick="TimelineGanttStudio.setMonthFilter('all')" title="Show all scheduled time across the full project span">All Scheduled Time</button>
            </div>

            <!-- Coordinates Toggle -->
            <button type="button" class="tg-tool-btn ${showCoordinates ? 'active' : ''}" id="tgCoordinatesBtn" onclick="TimelineGanttStudio.toggleCoordinates()" title="Toggle numeric coordinate header numbers (0, 1, 2, 3...)">
              # Coordinates
            </button>

            <!-- Style Settings Modal Button -->
            <button type="button" class="tg-tool-btn" onclick="TimelineGanttStudio.openStyleSettings()" title="Gantt Chart Visual, Color &amp; Grid Style Settings">
              ⚙ Style Settings
            </button>

            <!-- Project Dates -->
            <div class="tg-toolbar-group">
              <span class="tg-toolbar-label">Start:</span>
              <input type="date" id="tgProjectStartInput" value="${projectStartDate}" style="height: 24px; border: 1px solid #cbd5e1; border-radius: 4px; padding: 2px 4px; font-size: 11px;" onchange="TimelineGanttStudio.onProjectStartChange(this.value)">
            </div>
            <div class="tg-toolbar-group">
              <span class="tg-toolbar-label">Finish:</span>
              <span id="tgProjectFinishDisplay" style="padding: 3px 8px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 11px; font-weight: 700; color: #0f172a;">${finishDateStr || '-'}</span>
            </div>
          </div>
        </div>

        <!-- 4. Excel Formula Bar -->
        <div class="tg-formula-bar">
          <div class="tg-name-box" id="tgFormulaNameBox">${selectedCellCoord}</div>
          <span class="tg-fx-label">fx</span>
          <input type="text" class="tg-formula-input" id="tgFormulaInput" value="${escapeHtml(boqData[0] ? boqData[0].title : '')}" readonly>
        </div>

        <!-- 5. Dual-Panel Excel-Like Table & Gantt Viewport -->
        <div class="tg-gantt-container" id="tgMainSplitArea">
          <!-- Left Panel: Excel-like Task Table -->
          <div class="tg-left-panel" id="tgLeftPanel" style="width: ${leftPanelWidth}px;">
            ${buildExcelTaskTableHtml()}
          </div>

          <!-- Divider -->
          <div class="tg-divider" id="tgDivider" onmousedown="TimelineGanttStudio.startDividerDrag(event)">
            <div class="tg-divider-handle"></div>
          </div>

          <!-- Right Panel: Visual Gantt Timeline -->
          <div class="tg-right-panel" id="tgRightPanel">
            ${buildGanttTimelineHtml(boundary, columns)}
          </div>
        </div>
      </div>

      <!-- Attached Parity Modals -->
      ${buildQtyInstModalHtml()}
      ${buildBillingRecordModalHtml()}
      ${buildStyleSettingsModalHtml()}
      ${buildAddActivityModalHtml()}

      <!-- Hidden File Import for Schedule -->
      <input type="file" id="tgScheduleFileInput" style="display:none;" accept=".xlsx,.xls,.json,.csv" onchange="TimelineGanttStudio.handleScheduleFileImport(this)">
    `;

    setupPanelScrollSync();
    renderMainGanttView();
  }

  // --- Build Left Excel Task Table HTML ---
  function buildExcelTaskTableHtml() {
    let coordRowHtml = '';
    if (showCoordinates) {
      coordRowHtml = `
        <tr class="tg-coord-row">
          <th class="tg-coord-cell" style="width: 40px;">#</th>
          <th class="tg-coord-cell" style="width: 50px;">0</th>
          <th class="tg-coord-cell" style="width: 75px;">1</th>
          <th class="tg-coord-cell" style="width: 220px;">2</th>
          <th class="tg-coord-cell" style="width: 85px;">3</th>
          <th class="tg-coord-cell" style="width: 85px;">4</th>
          <th class="tg-coord-cell" style="width: 50px;">5</th>
          <th class="tg-coord-cell" style="width: 75px;">6</th>
          <th class="tg-coord-cell" style="width: 95px;">7</th>
          <th class="tg-coord-cell" style="width: 60px;">8</th>
        </tr>
      `;
    }

    let theadCols = `
      <thead>
        <!-- Row 0: Excel Column Letters -->
        <tr>
          <th class="tg-corner-cell"></th>
          <th class="tg-col-letter-th" style="width: 50px;">A</th>
          <th class="tg-col-letter-th" style="width: 75px;">B</th>
          <th class="tg-col-letter-th" style="width: 220px;">C</th>
          <th class="tg-col-letter-th" style="width: 85px;">D</th>
          <th class="tg-col-letter-th" style="width: 85px;">E</th>
          <th class="tg-col-letter-th" style="width: 50px;">F</th>
          <th class="tg-col-letter-th" style="width: 75px;">G</th>
          <th class="tg-col-letter-th" style="width: 95px;">H</th>
          <th class="tg-col-letter-th" style="width: 60px;">I</th>
        </tr>
        <!-- Row 1: Table Column Names -->
        <tr>
          <th class="tg-row-num-corner">#</th>
          <th class="tg-table-header-th" style="width: 50px;">Pred No.</th>
          <th class="tg-table-header-th" style="width: 75px;">Code</th>
          <th class="tg-table-header-th" style="width: 220px; text-align: left; padding-left: 8px;">Work Description</th>
          <th class="tg-table-header-th" style="width: 85px;">Start Date</th>
          <th class="tg-table-header-th" style="width: 85px;">Finish Date</th>
          <th class="tg-table-header-th" style="width: 50px;">Days</th>
          <th class="tg-table-header-th" style="width: 75px;">Predec.</th>
          <th class="tg-table-header-th" style="width: 95px; text-align: right; padding-right: 8px;">Total Cost</th>
          <th class="tg-table-header-th" style="width: 60px;">Progress %</th>
        </tr>
        ${coordRowHtml}
      </thead>
    `;

    let tbodyRows = '<tbody>';
    boqData.forEach((row, idx) => {
      if (tgFilterRowsByMonth && ganttMonthFilter !== 'all' && !isRowActiveInSelectedMonth(idx, boundary)) {
        return;
      }
      const isParent = hasChildRow(boqData, idx);
      const rowNum = idx + 1;
      const isCategory = row.type === 'category';
      const isSubcategory = row.type === 'subcategory';
      const rowClass = isCategory ? 'tg-row-category' : isSubcategory ? 'tg-row-subcategory' : '';
      const costVal = getTaskCost(row);
      const progVal = row.ganttProgress !== undefined ? row.ganttProgress : (row.percentDone || 0);
      const isCPM = Boolean(row.isCritical);

      tbodyRows += `
        <tr class="tg-task-tr ${rowClass}" data-index="${idx}" style="height: ${ganttSettings.rowHeight || 40}px;" onclick="TimelineGanttStudio.onRowClick(${idx}, event)">
          <td class="tg-row-num-td">${rowNum}</td>
          <td class="tg-data-td" style="text-align: center; font-weight: 700; color: #64748b;" onclick="TimelineGanttStudio.onCellSelect(${idx}, 'A', '${rowNum}')">${rowNum}</td>
          <td class="tg-data-td" style="text-align: center; font-weight: 700; color: #2563eb;" onclick="TimelineGanttStudio.onCellSelect(${idx}, 'B', '${escapeHtml(row.code)}')">${escapeHtml(row.code)}</td>
          <td class="tg-data-td" style="text-align: left; padding-left: ${isCategory ? '6px' : isSubcategory ? '16px' : '26px'};" onclick="TimelineGanttStudio.onCellSelect(${idx}, 'C', '${escapeHtml(row.title)}')">
            <span style="font-weight: ${isParent ? '800' : '600'};" title="${escapeHtml(row.title)}">
              ${isCategory ? '📁 ' : isSubcategory ? '📂 ' : '🔹 '}${escapeHtml(row.title)}
            </span>
          </td>
          <td class="tg-data-td" style="text-align: center;">
            ${isParent ? `<span style="font-size:10.5px; color:#475569;">${row.ganttStartDate || row.startDate || '-'}</span>` : `<input type="date" value="${row.ganttStartDate || row.startDate || ''}" style="width: 100%; border: none; background: transparent; font-size: 10.5px; text-align: center; font-family: inherit;" onchange="TimelineGanttStudio.updateRowDate(${idx}, 'start', this.value)">`}
          </td>
          <td class="tg-data-td" style="text-align: center;">
            ${isParent ? `<span style="font-size:10.5px; color:#475569;">${row.ganttFinishDate || row.finishDate || '-'}</span>` : `<input type="date" value="${row.ganttFinishDate || row.finishDate || ''}" style="width: 100%; border: none; background: transparent; font-size: 10.5px; text-align: center; font-family: inherit;" onchange="TimelineGanttStudio.updateRowDate(${idx}, 'finish', this.value)">`}
          </td>
          <td class="tg-data-td" style="text-align: center;">
            ${isParent ? `<span style="font-size:11px; font-weight:700;">${row.ganttDuration || row.days || '-'}</span>` : `<input type="number" min="1" value="${row.ganttDuration || row.days || 10}" style="width: 100%; border: none; background: transparent; font-size: 11px; text-align: center; font-weight: 700; font-family: inherit;" onchange="TimelineGanttStudio.updateRowDuration(${idx}, this.value)">`}
          </td>
          <td class="tg-data-td" style="text-align: center;">
            <input type="text" value="${escapeHtml(row.ganttPredecessors || '')}" placeholder="FS..." style="width: 100%; border: none; background: transparent; font-size: 10.5px; text-align: center; font-family: inherit;" onchange="TimelineGanttStudio.updateRowPredecessors(${idx}, this.value)">
          </td>
          <td class="tg-data-td" style="text-align: right; font-weight: 700; color: #1e3a8a; padding-right: 8px;">
            ${formatMoney(costVal)}
          </td>
          <td class="tg-data-td" style="text-align: center;">
            <div style="display: flex; align-items: center; justify-content: center; gap: 3px;">
              <input type="number" min="0" max="100" value="${progVal}" style="width: 38px; border: 1px solid #cbd5e1; border-radius: 3px; font-size: 10px; font-weight: 700; text-align: center;" onchange="TimelineGanttStudio.updateRowProgress(${idx}, this.value)">
              <span style="font-size: 9.5px; color: #64748b;">%</span>
            </div>
          </td>
        </tr>
      `;
    });
    tbodyRows += '</tbody>';

    return `<table class="tg-excel-table" id="tgExcelTaskTable">${theadCols}${tbodyRows}</table>`;
  }

  // --- Build Right Timeline & Visual Bars HTML ---
  function buildGanttTimelineHtml(boundary, columns) {
    const totalTimelineW = columns.reduce((acc, c) => acc + c.width, 0);

    // Multi-tier header
    let topCells = '';
    let bottomCells = '';
    let coordCells = '';

    // Precompute offsets and end boundaries for each column
    const colOffsets = [];
    const colEndMsList = [];
    let cumX = 0;

    for (let i = 0; i < columns.length; i++) {
      colOffsets.push(cumX);
      cumX += columns[i].width;

      const c = columns[i];
      let endMs;
      if (c.endDate) {
        if (c.endDate.getHours() === 23) {
          endMs = c.endDate.getTime() + 1;
        } else {
          endMs = c.endDate.getTime() + 86400000;
        }
      } else {
        endMs = c.date.getTime() + 86400000;
      }
      colEndMsList.push(endMs);
    }

    function getXForDate(d) {
      if (!d || columns.length === 0) return 0;
      const t = d.getTime();
      const firstStartMs = columns[0].date.getTime();
      const lastEndMs = colEndMsList[colEndMsList.length - 1];

      if (t < firstStartMs) {
        return -9999;
      }
      if (t >= lastEndMs) {
        return totalTimelineW + 9999;
      }

      for (let i = 0; i < columns.length; i++) {
        const cStartMs = columns[i].date.getTime();
        const cEndMs = colEndMsList[i];
        if (t >= cStartMs && t < cEndMs) {
          const frac = (cEndMs > cStartMs) ? ((t - cStartMs) / (cEndMs - cStartMs)) : 0;
          return colOffsets[i] + Math.round(frac * columns[i].width);
        }
      }
      return totalTimelineW;
    }

    // Group top headers by month/year
    let currentTop = null;
    let currentTopW = 0;
    columns.forEach((col, cIdx) => {
      const topTxt = col.topLabel || '';
      if (!currentTop) {
        currentTop = topTxt;
        currentTopW = col.width;
      } else if (currentTop === topTxt) {
        currentTopW += col.width;
      } else {
        topCells += `<div class="tg-time-cell-top" style="width: ${currentTopW}px;">${currentTop}</div>`;
        currentTop = topTxt;
        currentTopW = col.width;
      }
      if (cIdx === columns.length - 1) {
        topCells += `<div class="tg-time-cell-top" style="width: ${currentTopW}px;">${currentTop}</div>`;
      }

      bottomCells += `<div class="tg-time-cell-bottom ${cIdx % 2 === 0 ? '' : 'alt'}" style="width: ${col.width}px;" title="${col.dateStr}">${col.label}</div>`;
      coordCells += `<div class="tg-coord-cell" style="width: ${col.width}px;">${cIdx}</div>`;
    });

    const headerHtml = `
      <div class="tg-timeline-header-sticky" style="width: ${totalTimelineW}px; min-width: 100%;">
        <div class="tg-time-row-top" style="width: ${totalTimelineW}px; min-width: 100%;">${topCells}</div>
        <div class="tg-time-row-bottom" style="width: ${totalTimelineW}px; min-width: 100%;">${bottomCells}</div>
        ${showCoordinates ? `<div class="tg-coord-row" style="width: ${totalTimelineW}px; min-width: 100%;">${coordCells}</div>` : ''}
      </div>
    `;

    // Today Line Calculation
    const todayD = parseDate(currentDate) || new Date();
    const todayMid = new Date(todayD.getFullYear(), todayD.getMonth(), todayD.getDate(), 12, 0, 0);
    const todayX = getXForDate(todayMid);
    let todayLineHtml = '';
    if (todayX >= 0 && todayX <= totalTimelineW) {
      todayLineHtml = `
        <div class="tg-today-line" style="left: ${todayX}px;">
          <span class="tg-today-badge">Today (${currentDate})</span>
        </div>
      `;
    }

    // Gridlines running down full timeline
    let gridlinesHtml = '';
    colOffsets.forEach(ox => {
      gridlinesHtml += `<div class="tg-timeline-gridline" style="left: ${ox}px;"></div>`;
    });

    // Gridlines & Bars
    let rowsHtml = '';
    boqData.forEach((row, idx) => {
      if (tgFilterRowsByMonth && ganttMonthFilter !== 'all' && !isRowActiveInSelectedMonth(idx, boundary)) {
        return;
      }
      const isParent = hasChildRow(boqData, idx);
      const isCategory = row.type === 'category';
      const s = parseDate(row.ganttStartDate || row.startDate);
      const e = parseDate(row.ganttFinishDate || row.finishDate);
      const prog = Math.min(100, Math.max(0, parseFloat(row.ganttProgress !== undefined ? row.ganttProgress : (row.percentDone || 0)) || 0));
      const isCPM = Boolean(row.isCritical);

      let barHtml = '';
      if (s && e && e >= s) {
        const startTarget = s;
        const endTarget = addDays(e, 1);
        const rawStartX = getXForDate(startTarget);
        const rawEndX = getXForDate(endTarget);

        if (rawEndX > 0 && rawStartX < totalTimelineW) {
          const clampedStart = Math.max(0, rawStartX);
          const clampedEnd = Math.min(totalTimelineW, rawEndX);
          const durDays = Math.max(1, daysBetween(s, e));
          const widthPx = Math.max(8, clampedEnd - clampedStart);
          const leftPx = clampedStart;

          barHtml = `
            <div class="tg-bar-wrapper" style="left: ${leftPx}px; width: ${widthPx}px; height: ${ganttSettings.barHeight || 16}px;" title="${escapeHtml(row.code)} - ${escapeHtml(row.title)} (${durDays} days, ${prog}%)">
              <div class="tg-bar-planned ${isCPM ? 'cpm' : ''}"></div>
              <div class="tg-bar-actual ${isCPM ? 'cpm' : ''}" style="width: ${prog}%;"></div>
              <span class="tg-bar-label">${durDays}d (${prog}%)</span>
            </div>
          `;
        }
      }

      rowsHtml += `
        <div class="tg-timeline-row ${isCategory ? 'row-category' : ''}" style="width: ${totalTimelineW}px; min-width: 100%; height: ${ganttSettings.rowHeight || 40}px;">
          ${barHtml}
        </div>
      `;
    });

    return `
      <div style="width: ${totalTimelineW}px; min-width: 100%; position: relative;">
        ${headerHtml}
        <div class="tg-timeline-body" style="width: ${totalTimelineW}px; min-width: 100%;">
          ${gridlinesHtml}
          ${todayLineHtml}
          ${rowsHtml}
        </div>
      </div>
    `;
  }

  // --- Scroll Sync between Left and Right Panel ---
  function setupPanelScrollSync() {
    const left = document.getElementById('tgLeftPanel');
    const right = document.getElementById('tgRightPanel');
    if (!left || !right) return;

    let isSyncing = false;
    left.onscroll = () => {
      if (isSyncing) return;
      isSyncing = true;
      right.scrollTop = left.scrollTop;
      isSyncing = false;
    };

    right.onscroll = () => {
      if (isSyncing) return;
      isSyncing = true;
      left.scrollTop = right.scrollTop;
      isSyncing = false;
    };

    const splitArea = document.getElementById('tgMainSplitArea');
    if (splitArea && !splitArea._hasWheelSync) {
      splitArea._hasWheelSync = true;
      splitArea.addEventListener('wheel', (e) => {
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
          left.scrollTop += e.deltaY;
          right.scrollTop = left.scrollTop;
        }
      }, { passive: true });
    }
  }

  function syncGanttRowHeights() {
    const leftThead = document.querySelector('#tgLeftPanel thead');
    const rightHeader = document.querySelector('.tg-timeline-header-sticky');
    if (leftThead && rightHeader) {
      const theadH = Math.round(leftThead.getBoundingClientRect().height);
      if (theadH > 0) {
        rightHeader.style.setProperty('height', theadH + 'px', 'important');
      }
    }
    const leftRows = document.querySelectorAll('#tgExcelTaskTable tbody tr.tg-task-tr');
    const rightRows = document.querySelectorAll('.tg-timeline-body .tg-timeline-row');
    const count = Math.min(leftRows.length, rightRows.length);
    for (let i = 0; i < count; i++) {
      const lh = Math.round(leftRows[i].getBoundingClientRect().height);
      if (lh > 0 && rightRows[i]) {
        rightRows[i].style.setProperty('height', lh + 'px', 'important');
      }
    }
  }

  // --- Divider Resizing ---
  function startDividerDrag(e) {
    isDraggingDivider = true;
    document.body.style.cursor = 'col-resize';
    const divider = document.getElementById('tgDivider');
    if (divider) divider.classList.add('dragging');

    const onMouseMove = (moveEvent) => {
      if (!isDraggingDivider) return;
      const container = document.getElementById('tgMainSplitArea');
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const newWidth = Math.max(350, Math.min(1100, moveEvent.clientX - rect.left));
      leftPanelWidth = newWidth;
      const leftPanel = document.getElementById('tgLeftPanel');
      if (leftPanel) leftPanel.style.width = newWidth + 'px';
    };

    const onMouseUp = () => {
      isDraggingDivider = false;
      document.body.style.cursor = '';
      if (divider) divider.classList.remove('dragging');
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      renderMainGanttView();
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  // --- Interactive Toolbar Actions ---
  function onCurrentDateChange(val) {
    if (!val) return;
    currentDate = val;
    renderMainGanttView();
  }

  function onProjectStartChange(val) {
    if (!val) return;
    projectStartDate = val;
    renderMainGanttView();
  }

  function setScale(scale) {
    ganttScale = scale;
    renderMainGanttView();
  }

  function setMonthFilter(val) {
    ganttMonthFilter = val || 'all';
    const select = document.getElementById('tgGanttMonthSelect');
    if (select) select.value = ganttMonthFilter;
    const filterCheckbox = document.getElementById('tgFilterRowsByMonth');
    if (filterCheckbox) {
      filterCheckbox.disabled = (ganttMonthFilter === 'all');
      if (filterCheckbox.parentElement) {
        filterCheckbox.parentElement.style.opacity = (ganttMonthFilter === 'all') ? '0.5' : '1';
      }
    }
    renderMainGanttView();
  }

  function toggleFilterRowsByMonth(checked) {
    tgFilterRowsByMonth = !!checked;
    renderMainGanttView();
  }

  function toggleCoordinates() {
    showCoordinates = !showCoordinates;
    renderMainGanttView();
  }

  function toggleHighlightDropdown(e) {
    if (e) e.stopPropagation();
    const dd = document.getElementById('tgHighlightDropdown');
    if (dd) dd.classList.toggle('show');
  }

  function setHighlightMode(mode, e) {
    if (e) e.stopPropagation();
    highlightMode = mode;
    const label = document.getElementById('tgHighlightLabel');
    if (label) {
      label.textContent = mode === 'none' ? 'None' : mode.toUpperCase();
      label.style.color = mode === 'none' ? '#334155' : mode === 'yellow' ? '#ca8a04' : mode === 'blue' ? '#2563eb' : mode === 'green' ? '#16a34a' : '#ea580c';
    }
    const dd = document.getElementById('tgHighlightDropdown');
    if (dd) dd.classList.remove('show');
  }

  function toggleUpdateDataDropdown(e) {
    if (e) e.stopPropagation();
    const dd = document.getElementById('tgUpdateDataDropdown');
    if (dd) dd.classList.toggle('show');
  }

  window.addEventListener('click', () => {
    const d1 = document.getElementById('tgHighlightDropdown');
    if (d1) d1.classList.remove('show');
    const d2 = document.getElementById('tgUpdateDataDropdown');
    if (d2) d2.classList.remove('show');
  });

  window.addEventListener('resize', () => {
    if (document.getElementById('tgRightPanel')) {
      renderMainGanttView();
    }
  });

  function toggleFullView() {
    const subView = document.getElementById('timelineSubView_gantt');
    if (!subView) return;
    const isFull = subView.classList.toggle('tg-fullview-active');
    const btn = document.getElementById('tgFullViewBtn');
    if (btn) btn.textContent = isFull ? '✕ Exit Full View' : '⛶ Full View';
    setTimeout(renderMainGanttView, 50);
  }

  function onCellSelect(rowIdx, colLetter, val) {
    selectedCellCoord = `${colLetter}${rowIdx + 1}`;
    const nameBox = document.getElementById('tgFormulaNameBox');
    if (nameBox) nameBox.textContent = selectedCellCoord;
    const fInput = document.getElementById('tgFormulaInput');
    if (fInput) fInput.value = val || '';
  }

  function onRowClick(rowIdx, e) {
    if (highlightMode === 'none') return;
    const rowEl = document.querySelector(`.tg-task-tr[data-index="${rowIdx}"]`);
    if (!rowEl) return;
    const colors = {
      yellow: '#fef08a',
      blue: '#bfdbfe',
      green: '#bbf7d0',
      orange: '#fed7aa'
    };
    if (rowEl.dataset.highlighted === highlightMode) {
      rowEl.style.backgroundColor = '';
      rowEl.dataset.highlighted = '';
    } else {
      rowEl.style.backgroundColor = colors[highlightMode] || '';
      rowEl.dataset.highlighted = highlightMode;
    }
  }

  function updateRowDate(index, type, val) {
    const row = boqData[index];
    if (!row || !val) return;
    pushUndoState();
    if (type === 'start') {
      row.ganttStartDate = val;
      row.startDate = val;
      const dur = parseInt(row.ganttDuration || row.days || 10, 10);
      const s = parseDate(val);
      if (s) {
        const e = addDays(s, dur);
        row.finishDate = formatDate(e);
        row.ganttFinishDate = row.finishDate;
      }
    } else {
      row.ganttFinishDate = val;
      row.finishDate = val;
      const s = parseDate(row.ganttStartDate || row.startDate);
      const e = parseDate(val);
      if (s && e) {
        const dur = Math.max(1, daysBetween(s, e));
        row.days = dur;
        row.ganttDuration = dur;
      }
    }
    renderMainGanttView();
  }

  function updateRowDuration(index, val) {
    const row = boqData[index];
    if (!row) return;
    const dur = parseInt(val, 10);
    if (isNaN(dur) || dur < 1) return;
    pushUndoState();
    row.days = dur;
    row.ganttDuration = dur;
    const s = parseDate(row.ganttStartDate || row.startDate);
    if (s) {
      const e = addDays(s, dur);
      row.finishDate = formatDate(e);
      row.ganttFinishDate = row.finishDate;
    }
    renderMainGanttView();
  }

  function updateRowPredecessors(index, val) {
    const row = boqData[index];
    if (!row) return;
    pushUndoState();
    row.ganttPredecessors = val;
    renderMainGanttView();
  }

  function updateRowProgress(index, val) {
    const row = boqData[index];
    if (!row) return;
    const prog = Math.min(100, Math.max(0, parseFloat(val) || 0));
    pushUndoState();
    row.ganttProgress = prog;
    row.percentDone = prog;
    renderMainGanttView();
  }

  function filterTasks(query) {
    const q = String(query || '').trim().toLowerCase();
    const trs = document.querySelectorAll('.tg-task-tr');
    trs.forEach(tr => {
      const idx = parseInt(tr.dataset.index, 10);
      const row = boqData[idx];
      if (!row) return;
      const match = !q || (row.title && row.title.toLowerCase().includes(q)) || (row.code && row.code.toLowerCase().includes(q));
      tr.style.display = match ? '' : 'none';
    });
  }

  function pushUndoState() {
    undoStack.push(JSON.stringify(boqData));
    if (undoStack.length > 20) undoStack.shift();
    const btn = document.getElementById('tgUndoBtn');
    if (btn) btn.disabled = false;
  }

  function undo() {
    if (undoStack.length === 0) return;
    const prev = undoStack.pop();
    if (prev) {
      boqData = JSON.parse(prev);
      renderMainGanttView();
    }
    const btn = document.getElementById('tgUndoBtn');
    if (btn) btn.disabled = undoStack.length === 0;
  }

  function renderMainGanttView() {
    const boundary = getProjectDateBoundary();
    const columns = getTimelineColumns(boundary, ganttScale, ganttMonthFilter);
    const left = document.getElementById('tgLeftPanel');
    const right = document.getElementById('tgRightPanel');

    // Synchronize month selector
    const monthSelect = document.getElementById('tgGanttMonthSelect');
    if (monthSelect) {
      monthSelect.innerHTML = buildMonthSelectOptionsHtml();
      monthSelect.value = ganttMonthFilter;
    }
    const filterCheckbox = document.getElementById('tgFilterRowsByMonth');
    if (filterCheckbox) {
      filterCheckbox.checked = !!tgFilterRowsByMonth;
      filterCheckbox.disabled = (ganttMonthFilter === 'all');
      if (filterCheckbox.parentElement) {
        filterCheckbox.parentElement.style.opacity = (ganttMonthFilter === 'all') ? '0.5' : '1';
      }
    }

    // Synchronize active scale buttons
    document.querySelectorAll('.tg-scale-btn').forEach(btn => {
      btn.classList.toggle('active', btn.textContent.toLowerCase() === ganttScale);
    });

    // Auto-expand scale column widths (Days, Weeks, Months, Quarters) to fit right panel width
    if (right && columns.length > 0) {
      const availableW = right.clientWidth || Math.max(400, Math.round(window.innerWidth - leftPanelWidth - 30));
      const baseTotalW = columns.reduce((a, c) => a + c.width, 0);

      if (availableW > baseTotalW) {
        const extraTotal = availableW - baseTotalW;
        const extraPerCol = Math.floor(extraTotal / columns.length);
        const remainder = extraTotal % columns.length;
        columns.forEach((col, idx) => {
          col.width += extraPerCol + (idx < remainder ? 1 : 0);
        });
      }
    }

    if (left) left.innerHTML = buildExcelTaskTableHtml();
    if (right) right.innerHTML = buildGanttTimelineHtml(boundary, columns);
    const finishEl = document.getElementById('tgProjectFinishDisplay');
    if (finishEl) finishEl.textContent = formatDate(boundary.maxDate) || '-';
    setupPanelScrollSync();
    syncGanttRowHeights();
    requestAnimationFrame(syncGanttRowHeights);
  }

  // --- Save Schedule & Sync to Cloud ---
  function saveSchedule(silent = false) {
    let calcBudget = 0;
    let earnedValueSum = 0;
    const validRows = boqData.filter(r => r.type !== 'category' && r.type !== 'subcategory');
    validRows.forEach(r => {
      const rowTotal = getTaskCost(r);
      calcBudget += rowTotal;
      const prog = parseFloat(r.ganttProgress !== undefined ? r.ganttProgress : (r.percentDone || 0)) || 0;
      earnedValueSum += (rowTotal * (prog / 100));
    });
    const actualProgress = calcBudget > 0 ? parseFloat(((earnedValueSum / calcBudget) * 100).toFixed(1)) : 0;

    const boqPayload = {
      boqData: boqData,
      totalBudget: calcBudget,
      actualProgress: actualProgress,
      billingPeriods: fclBillingPeriods,
      items: validRows.map((r, idx) => ({
        id: r.id || `boq_${idx}`,
        code: r.code || `${idx + 1}.00`,
        title: r.title || `Item ${idx + 1}`,
        specification: r.specification || '',
        category: r.category || 'General Works',
        type: r.type || 'subsubcategory',
        qty: parseFloat(r.qty) || 1,
        unit: r.unit || 'lot',
        materialUnitCost: parseFloat(r.materialUnitCost) || 0,
        laborUnitCost: parseFloat(r.laborUnitCost !== undefined ? r.laborUnitCost : (r.leUnitCost || 0)),
        grandTotalCost: getTaskCost(r),
        percentDone: parseFloat(r.ganttProgress !== undefined ? r.ganttProgress : (r.percentDone || 0)) || 0,
        isCritical: Boolean(r.isCritical)
      }))
    };

    const ganttTasks = validRows.map((r, idx) => ({
      id: r.id || `task_${idx}`,
      code: r.code || `T-${101 + idx}`,
      name: r.title || `Activity ${idx + 1}`,
      category: r.category || 'Construction Phase',
      startDate: r.ganttStartDate || r.startDate || '2026-03-01',
      endDate: r.ganttFinishDate || r.finishDate || '',
      duration: parseInt(r.ganttDuration || r.days || 10, 10),
      progress: Math.min(100, Math.max(0, parseFloat(r.ganttProgress !== undefined ? r.ganttProgress : (r.percentDone || 0)) || 0)),
      predecessors: r.ganttPredecessors || '',
      isCritical: Boolean(r.isCritical)
    }));

    const timelineData = {
      ganttTasks: ganttTasks,
      settings: ganttSettings,
      billingPeriods: fclBillingPeriods,
      progress: actualProgress,
      lastUpdated: new Date().toISOString()
    };

    if (window.FCLStorage) {
      if (typeof window.FCLStorage.saveProjectBOQ === 'function') {
        window.FCLStorage.saveProjectBOQ(currentProjectId, boqPayload);
      }
      if (typeof window.FCLStorage.saveProjectGantt === 'function') {
        window.FCLStorage.saveProjectGantt(currentProjectId, timelineData);
      }
    } else {
      try {
        localStorage.setItem('cost_estimate_boq_' + currentProjectId, JSON.stringify(boqPayload));
      } catch (e) {}
    }

    if (!silent) {
      const isCloud = typeof FCLFirebaseSync !== 'undefined' && FCLFirebaseSync.isConfigured();
      const msg = isCloud
        ? `✅ Gantt Schedule Saved & Synced to Cloud Firestore!\n\n• Project: ${currentProjectId}\n• Total Budget: ${formatMoney(calcBudget)}\n• Actual Progress: ${actualProgress}%\n• All team members connected to Firestore will see this schedule update in real-time.`
        : `✅ Gantt Schedule Saved Locally!\n\n• Project: ${currentProjectId}\n• Total Budget: ${formatMoney(calcBudget)}\n• Actual Progress: ${actualProgress}%`;
      alert(msg);
    }
  }

  // --- Export to Excel ---
  function exportToExcel() {
    if (typeof XLSX === 'undefined') {
      alert('XLSX library not loaded. Please ensure internet access for CDN.');
      return;
    }
    const wb = XLSX.utils.book_new();

    // Sheet 1: Schedule Task Matrix
    const taskRows = [
      ['No.', 'Code', 'Work Description', 'Start Date', 'Finish Date', 'Duration (Days)', 'Predecessors', 'Total Cost (PHP)', 'Progress (%)', 'Critical (CPM)']
    ];
    boqData.forEach((r, idx) => {
      taskRows.push([
        idx + 1,
        r.code || '',
        r.title || '',
        r.ganttStartDate || r.startDate || '',
        r.ganttFinishDate || r.finishDate || '',
        r.ganttDuration || r.days || 0,
        r.ganttPredecessors || '',
        getTaskCost(r),
        r.ganttProgress !== undefined ? r.ganttProgress : (r.percentDone || 0),
        r.isCritical ? 'CPM' : 'FLOAT'
      ]);
    });
    const ws1 = XLSX.utils.aoa_to_sheet(taskRows);
    XLSX.utils.book_append_sheet(wb, ws1, 'Project_Schedule');

    XLSX.writeFile(wb, `${currentProjectId}_Gantt_Schedule_${currentDate}.xlsx`);
  }

  // --- Import Schedule (Excel or JSON) ---
  function triggerScheduleImport() {
    const input = document.getElementById('tgScheduleFileInput') || document.getElementById('timelineScheduleFileInput');
    if (input) {
      input.value = '';
      input.click();
    }
  }

  async function handleScheduleFileImport(input) {
    const file = input && input.files && input.files[0];
    if (!file) return;
    const fileName = file.name || '';
    const isJson = /\.json$/i.test(fileName);
    const isExcel = /\.(xlsx|xls|xlsm|xlsb|csv|tsv)$/i.test(fileName);

    try {
      if (isJson) {
        const text = await file.text();
        const parsed = JSON.parse(text);
        let rawTasks = [];
        if (Array.isArray(parsed)) rawTasks = parsed;
        else if (parsed.timeline && Array.isArray(parsed.timeline.ganttTasks)) rawTasks = parsed.timeline.ganttTasks;
        else if (Array.isArray(parsed.ganttTasks)) rawTasks = parsed.ganttTasks;
        else if (Array.isArray(parsed.boqData)) rawTasks = parsed.boqData;
        else if (parsed.boq && Array.isArray(parsed.boq.boqData)) rawTasks = parsed.boq.boqData;

        if (rawTasks.length > 0) {
          pushUndoState();
          boqData = rawTasks.map((t, idx) => ({
            id: t.id || `task_${idx}`,
            code: String(t.code || `T-${101 + idx}`).trim(),
            title: String(t.title || t.name || `Activity ${idx + 1}`).trim(),
            ganttStartDate: t.ganttStartDate || t.startDate || '2026-03-01',
            startDate: t.startDate || t.ganttStartDate || '2026-03-01',
            ganttFinishDate: t.ganttFinishDate || t.finishDate || t.endDate || '',
            finishDate: t.finishDate || t.ganttFinishDate || t.endDate || '',
            ganttDuration: parseInt(t.ganttDuration || t.duration || t.days || 10, 10),
            days: parseInt(t.days || t.ganttDuration || t.duration || 10, 10),
            ganttPredecessors: t.ganttPredecessors || t.predecessors || '',
            grandTotalCost: parseFloat(t.grandTotalCost || t.cost || 0),
            ganttProgress: parseFloat(t.ganttProgress !== undefined ? t.ganttProgress : (t.percentDone || t.progress || 0)) || 0,
            percentDone: parseFloat(t.percentDone !== undefined ? t.percentDone : (t.ganttProgress || t.progress || 0)) || 0,
            isCritical: Boolean(t.isCritical),
            type: t.type || 'subsubcategory',
            qty: parseFloat(t.qty) || 1,
            unit: t.unit || 'lot'
          }));
          saveSchedule(true);
          renderMainGanttView();
          alert(`✅ Schedule imported successfully from ${fileName}! (${boqData.length} activities)`);
        } else {
          alert('No activities found in JSON schedule file.');
        }
      } else if (isExcel && typeof XLSX !== 'undefined') {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName]);
        if (rows && rows.length > 0) {
          pushUndoState();
          boqData = rows.map((r, idx) => {
            const code = r['Code'] || r['code'] || `T-${101 + idx}`;
            const title = r['Work Description'] || r['Title'] || r['title'] || r['Name'] || r['name'] || `Activity ${idx + 1}`;
            const s = r['Start Date'] || r['startDate'] || '2026-03-01';
            const e = r['Finish Date'] || r['finishDate'] || '';
            const dur = parseInt(r['Duration (Days)'] || r['Duration'] || r['Days'] || 10, 10);
            const cost = parseFloat(r['Total Cost (PHP)'] || r['Cost'] || r['Total Cost'] || 0);
            const prog = parseFloat(r['Progress (%)'] || r['Progress'] || 0);
            const pred = r['Predecessors'] || r['predecessors'] || '';
            return {
              id: `task_${idx}`,
              code: String(code),
              title: String(title),
              ganttStartDate: String(s),
              startDate: String(s),
              ganttFinishDate: String(e),
              finishDate: String(e),
              ganttDuration: dur,
              days: dur,
              ganttPredecessors: String(pred),
              grandTotalCost: cost,
              materialUnitCost: cost * 0.6,
              laborUnitCost: cost * 0.4,
              ganttProgress: prog,
              percentDone: prog,
              isCritical: String(r['Critical (CPM)'] || '').toUpperCase().includes('CPM'),
              type: 'subsubcategory',
              qty: 1,
              unit: 'lot'
            };
          });
          saveSchedule(true);
          renderMainGanttView();
          alert(`✅ Excel Schedule imported successfully from ${fileName}! (${boqData.length} activities)`);
        } else {
          alert('No activities found in Excel file.');
        }
      }
    } catch (err) {
      alert('❌ Failed to import schedule: ' + err.message);
    }
  }

  // ==========================================================================
  // MODAL 1: QUANTITY INSTALLED & ACCOMPLISHMENT (6 VIEW TABS)
  // ==========================================================================
  let isDraggingQtyDivider = false;
  let qtyLeftPanelWidth = 620;
  let qtyHighlightMode = 'yellow';

  function getGanttTaskOverlapDays(task, pStart, pEnd) {
    const s = parseDate(task.ganttStartDate || task.startDate);
    const e = parseDate(task.ganttFinishDate || task.finishDate);
    if (!s || !e) return 0;

    const tStart = new Date(s);
    const tEnd = new Date(e);
    tStart.setHours(0, 0, 0, 0);
    tEnd.setHours(0, 0, 0, 0);

    const pStartCopy = new Date(pStart);
    pStartCopy.setHours(0, 0, 0, 0);
    const pEndCopy = new Date(pEnd);
    pEndCopy.setHours(0, 0, 0, 0);

    const overlapStart = new Date(Math.max(tStart, pStartCopy));
    const overlapEnd = new Date(Math.min(tEnd, pEndCopy));

    if (overlapStart > overlapEnd) return 0;
    const diffTime = overlapEnd - overlapStart;
    const diffDays = Math.round(diffTime / 86400000) + 1;
    return Math.max(0, diffDays);
  }

  function getPeriodQtySingle(taskIdx, dateStr) {
    const row = boqData[taskIdx];
    if (!row) return 0;
    if (hasChildRow(boqData, taskIdx)) {
      const leaves = getLeafDescendents(boqData, taskIdx);
      let sum = 0;
      leaves.forEach(lIdx => {
        sum += getPeriodQtySingle(lIdx, dateStr);
      });
      return sum;
    }
    return row.ganttPeriodQty && row.ganttPeriodQty[dateStr] ? (parseFloat(row.ganttPeriodQty[dateStr]) || 0) : 0;
  }

  function getAccumulatedPeriodQty(taskIdx, pStart, pEnd) {
    const row = boqData[taskIdx];
    if (!row) return 0;
    if (hasChildRow(boqData, taskIdx)) {
      const leaves = getLeafDescendents(boqData, taskIdx);
      let sum = 0;
      leaves.forEach(lIdx => {
        sum += getAccumulatedPeriodQty(lIdx, pStart, pEnd);
      });
      return sum;
    }
    if (!row.ganttPeriodQty) return 0;

    const s = new Date(pStart);
    const e = new Date(pEnd);
    s.setHours(0, 0, 0, 0);
    e.setHours(23, 59, 59, 999);

    let sum = 0;
    for (const dStr in row.ganttPeriodQty) {
      const d = parseDate(dStr);
      if (d) {
        d.setHours(12, 0, 0, 0);
        if (d >= s && d <= e) {
          sum += parseFloat(row.ganttPeriodQty[dStr]) || 0;
        }
      }
    }
    return sum;
  }

  function getMaxCutoffDate() {
    let maxInstalled = null;
    boqData.forEach(r => {
      if (r.ganttPeriodQty) {
        for (const dStr in r.ganttPeriodQty) {
          if (parseFloat(r.ganttPeriodQty[dStr]) > 0) {
            const d = parseDate(dStr);
            if (d && (!maxInstalled || d.getTime() > maxInstalled.getTime())) {
              maxInstalled = d;
            }
          }
        }
      }
    });

    const curD = parseDate(currentDate);
    if (maxInstalled && curD) {
      return new Date(Math.max(maxInstalled.getTime(), curD.getTime()));
    } else if (maxInstalled) {
      return maxInstalled;
    } else if (curD) {
      return curD;
    }
    return null;
  }

  function isPeriodFuture(pStart, maxCutoffDate) {
    if (!maxCutoffDate) return false;
    const p = new Date(pStart);
    p.setHours(0, 0, 0, 0);
    const cutoff = new Date(maxCutoffDate);
    cutoff.setHours(23, 59, 59, 999);
    return p.getTime() > cutoff.getTime();
  }

  function getAccumulatedQtyToDate(taskIdx, targetDate) {
    const row = boqData[taskIdx];
    if (!row) return 0;
    if (hasChildRow(boqData, taskIdx)) {
      const leaves = getLeafDescendents(boqData, taskIdx);
      return leaves.reduce((sum, leafIdx) => sum + getAccumulatedQtyToDate(leafIdx, targetDate), 0);
    }
    if (!targetDate) return 0;
    const t = new Date(targetDate);
    t.setHours(23, 59, 59, 999);

    let cumQty = 0;
    if (row.ganttPeriodQty && Object.keys(row.ganttPeriodQty).length > 0) {
      for (const dStr in row.ganttPeriodQty) {
        const d = parseDate(dStr);
        if (d) {
          d.setHours(12, 0, 0, 0);
          if (d.getTime() <= t.getTime()) {
            cumQty += (parseFloat(row.ganttPeriodQty[dStr]) || 0);
          }
        }
      }
    } else if (parseFloat(row.ganttInstalledQty) > 0) {
      const sDate = parseDate(row.ganttStartDate || row.startDate);
      if (sDate) {
        sDate.setHours(0, 0, 0, 0);
        if (sDate.getTime() <= t.getTime()) {
          cumQty = parseFloat(row.ganttInstalledQty) || 0;
        }
      }
    }
    return cumQty;
  }

  function getAccumulatedCostToDate(taskIdx, targetDate) {
    const row = boqData[taskIdx];
    if (!row) return 0;
    if (hasChildRow(boqData, taskIdx)) {
      const leaves = getLeafDescendents(boqData, taskIdx);
      return leaves.reduce((sum, leafIdx) => sum + getAccumulatedCostToDate(leafIdx, targetDate), 0);
    }
    const cumQty = getAccumulatedQtyToDate(taskIdx, targetDate);
    const totalCost = getTaskCost(row);
    const estQty = parseFloat(row.qty) || 1;
    const unitCost = estQty > 0 ? (totalCost / estQty) : 0;
    return cumQty * unitCost;
  }

  function getGanttSummaryTaskTimelineValue(taskIdx, rowLabel, pStart, pEnd) {
    const row = boqData[taskIdx];
    if (!row) return 0;

    const isParent = hasChildRow(boqData, taskIdx);

    if (rowLabel === 'Summary of Accomplishment') {
      if (isParent) {
        const leaves = getLeafDescendents(boqData, taskIdx);
        return leaves.reduce((sum, lIdx) => sum + (getGanttSummaryTaskTimelineValue(lIdx, rowLabel, pStart, pEnd) || 0), 0);
      } else {
        const periodQty = getAccumulatedPeriodQty(taskIdx, pStart, pEnd);
        const estQty = parseFloat(row.qty) || 1;
        const totalCost = getTaskCost(row);
        const unitCost = estQty > 0 ? (totalCost / estQty) : 0;
        return periodQty * unitCost;
      }
    }

    if (rowLabel === 'Progress % (Cost) Summary') {
      if (isParent) {
        const leaves = getLeafDescendents(boqData, taskIdx);
        let accomplishedCostSum = 0;
        let totalCostSum = 0;
        leaves.forEach(lIdx => {
          const lRow = boqData[lIdx];
          totalCostSum += getTaskCost(lRow);
          accomplishedCostSum += (getGanttSummaryTaskTimelineValue(lIdx, 'Summary of Accomplishment', pStart, pEnd) || 0);
        });
        return totalCostSum > 0 ? (accomplishedCostSum / totalCostSum) * 100 : 0;
      } else {
        const periodQty = getAccumulatedPeriodQty(taskIdx, pStart, pEnd);
        const estQty = parseFloat(row.qty) || 1;
        return estQty > 0 ? (periodQty / estQty) * 100 : 0;
      }
    }

    if (rowLabel === 'Progress % (Day) Summary') {
      const cur = parseDate(currentDate) || new Date();
      const pStartCopy = new Date(pStart);
      pStartCopy.setHours(0, 0, 0, 0);
      const curCopy = new Date(cur);
      curCopy.setHours(0, 0, 0, 0);
      if (pStartCopy.getTime() > curCopy.getTime()) return null;
      if (isParent) {
        const leaves = getLeafDescendents(boqData, taskIdx);
        let totalOv = 0;
        let totalDur = 0;
        leaves.forEach(lIdx => {
          const lRow = boqData[lIdx];
          const lDur = parseInt(lRow.ganttDuration || lRow.days || 10, 10);
          const lOv = getGanttTaskOverlapDays(lRow, pStart, pEnd);
          totalOv += lOv;
          totalDur += lDur;
        });
        return totalDur > 0 ? (totalOv / totalDur) * 100 : 0;
      } else {
        const dur = parseInt(row.ganttDuration || row.days || 10, 10);
        const overlapDays = getGanttTaskOverlapDays(row, pStart, pEnd);
        if (overlapDays <= 0 || dur <= 0) return 0;
        return (overlapDays / dur) * 100;
      }
    }

    if (rowLabel === 'Cash Flow (Estimated)') {
      if (isParent) {
        const leaves = getLeafDescendents(boqData, taskIdx);
        let sum = 0;
        leaves.forEach(lIdx => {
          sum += getGanttSummaryTaskTimelineValue(lIdx, rowLabel, pStart, pEnd) || 0;
        });
        return sum;
      } else {
        const dur = parseInt(row.ganttDuration || row.days || 10, 10);
        const overlapDays = getGanttTaskOverlapDays(row, pStart, pEnd);
        if (overlapDays <= 0 || dur <= 0) return 0;
        const totalCost = getTaskCost(row);
        return totalCost * (overlapDays / dur);
      }
    }

    if (rowLabel === 'Cash Flow (Day)') {
      if (isParent) {
        const leaves = getLeafDescendents(boqData, taskIdx);
        let sum = 0;
        leaves.forEach(lIdx => {
          sum += getGanttSummaryTaskTimelineValue(lIdx, rowLabel, pStart, pEnd) || 0;
        });
        return sum;
      } else {
        return getGanttTaskOverlapDays(row, pStart, pEnd);
      }
    }

    return 0;
  }

  function getColLetter(idx) {
    let letter = '';
    while (idx >= 0) {
      letter = String.fromCharCode((idx % 26) + 65) + letter;
      idx = Math.floor(idx / 26) - 1;
    }
    return letter;
  }

  function buildQtyInstModalHtml() {
    return `
      <div class="tg-modal-overlay" id="tgQtyInstModal">
        <div class="tg-modal-dialog" style="width: 96vw; height: 92vh;">
          <div class="tg-modal-header">
            <h3 class="tg-modal-title">
              <span>📊 Update Quantity Installed (Accomplishment Studio)</span>
            </h3>
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <span style="font-size: 11px; font-weight: 700; color: #475569;">Scale:</span>
              <div class="tg-scale-btn-group">
                <button type="button" class="tg-scale-btn ${qtyModalScale === 'days' ? 'active' : ''}" onclick="TimelineGanttStudio.setQtyModalScale('days')">Days</button>
                <button type="button" class="tg-scale-btn ${qtyModalScale === 'weeks' ? 'active' : ''}" onclick="TimelineGanttStudio.setQtyModalScale('weeks')">Weeks</button>
                <button type="button" class="tg-scale-btn ${qtyModalScale === 'months' ? 'active' : ''}" onclick="TimelineGanttStudio.setQtyModalScale('months')">Months</button>
                <button type="button" class="tg-scale-btn ${qtyModalScale === 'quarters' ? 'active' : ''}" onclick="TimelineGanttStudio.setQtyModalScale('quarters')">Quarters</button>
              </div>

              <!-- Option to show only the month -->
              <div class="tg-month-select-group" style="display: flex; align-items: center; gap: 4px; background: #f8fafc; padding: 2px 6px; border-radius: 4px; border: 1px solid #cbd5e1;">
                <span style="font-size: 11px; font-weight: 700; color: #1e3a8a;">📅 Month:</span>
                <select id="tgQtyMonthSelect" style="height: 24px; border: 1px solid #94a3b8; border-radius: 3px; padding: 0 4px; font-size: 11px; font-weight: 700; background: #ffffff; color: #1e3a8a; cursor: pointer;" onchange="TimelineGanttStudio.setQtyModalMonth(this.value)">
                  <option value="all" ${qtyModalMonthFilter === 'all' ? 'selected' : ''}>All Months</option>
                  <option value="0" ${qtyModalMonthFilter === '0' ? 'selected' : ''}>January</option>
                  <option value="1" ${qtyModalMonthFilter === '1' ? 'selected' : ''}>February</option>
                  <option value="2" ${qtyModalMonthFilter === '2' ? 'selected' : ''}>March</option>
                  <option value="3" ${qtyModalMonthFilter === '3' ? 'selected' : ''}>April</option>
                  <option value="4" ${qtyModalMonthFilter === '4' ? 'selected' : ''}>May</option>
                  <option value="5" ${qtyModalMonthFilter === '5' ? 'selected' : ''}>June</option>
                  <option value="6" ${qtyModalMonthFilter === '6' ? 'selected' : ''}>July</option>
                  <option value="7" ${qtyModalMonthFilter === '7' ? 'selected' : ''}>August</option>
                  <option value="8" ${qtyModalMonthFilter === '8' ? 'selected' : ''}>September</option>
                  <option value="9" ${qtyModalMonthFilter === '9' ? 'selected' : ''}>October</option>
                  <option value="10" ${qtyModalMonthFilter === '10' ? 'selected' : ''}>November</option>
                  <option value="11" ${qtyModalMonthFilter === '11' ? 'selected' : ''}>December</option>
                </select>
                <button type="button" class="tg-tool-btn" style="padding: 2px 6px; font-size: 10px; height: 24px; line-height: 20px; font-weight: 700;" onclick="TimelineGanttStudio.setQtyModalScale('months')" title="Show month-only columns (January, February, etc.) across the project">Months View</button>
              </div>

              <!-- Row Highlight Dropdown in Modal -->
              <div class="tg-dropdown" style="display: inline-block; position: relative;">
                <button type="button" class="tg-tool-btn" onclick="TimelineGanttStudio.toggleQtyHighlightDropdown(event)" id="tgQtyHighlightBtn">
                  Row Highlight: <span id="tgQtyHighlightLabel" style="font-weight: 800; margin-left: 2px;">Yellow</span> <span style="font-size: 8px;">▼</span>
                </button>
                <div class="tg-dropdown-menu" id="tgQtyHighlightDropdown">
                  <a href="javascript:void(0)" class="tg-dropdown-item" onclick="TimelineGanttStudio.setQtyHighlightMode('none', event)">Disable Highlight</a>
                  <a href="javascript:void(0)" class="tg-dropdown-item" style="background:#fef08a; font-weight:700;" onclick="TimelineGanttStudio.setQtyHighlightMode('yellow', event)">Yellow Highlight</a>
                  <a href="javascript:void(0)" class="tg-dropdown-item" style="background:#bfdbfe; font-weight:700;" onclick="TimelineGanttStudio.setQtyHighlightMode('blue', event)">Blue Highlight</a>
                  <a href="javascript:void(0)" class="tg-dropdown-item" style="background:#bbf7d0; font-weight:700;" onclick="TimelineGanttStudio.setQtyHighlightMode('green', event)">Green Highlight</a>
                  <a href="javascript:void(0)" class="tg-dropdown-item" style="background:#fed7aa; font-weight:700;" onclick="TimelineGanttStudio.setQtyHighlightMode('orange', event)">Orange Highlight</a>
                </div>
              </div>

              <button type="button" class="tg-tool-btn" onclick="TimelineGanttStudio.openStyleSettings()">🎨 Style Settings</button>
              <button type="button" class="tg-tool-btn primary" onclick="TimelineGanttStudio.closeQtyInstModal()">💾 Save &amp; Close</button>
            </div>
          </div>

          <div class="tg-modal-body" style="padding: 10px; display: flex; flex-direction: column;">
            <!-- 6 View Selector Tabs -->
            <div class="tg-view-tabs-strip">
              <span style="font-size: 11px; font-weight: 800; color: #334155; margin-right: 4px;">SELECT TABLE:</span>
              <button type="button" class="tg-view-tab ${qtyModalActiveView === 'quantity' ? 'active' : ''}" id="tgQtyViewTab-quantity" onclick="TimelineGanttStudio.setQtyModalView('quantity')">Quantity Installed</button>
              <button type="button" class="tg-view-tab ${qtyModalActiveView === 'accomplishment' ? 'active' : ''}" id="tgQtyViewTab-accomplishment" onclick="TimelineGanttStudio.setQtyModalView('accomplishment')">Summary of Accomplishment</button>
              <button type="button" class="tg-view-tab ${qtyModalActiveView === 'progress_cost' ? 'active' : ''}" id="tgQtyViewTab-progress_cost" onclick="TimelineGanttStudio.setQtyModalView('progress_cost')">Progress % (Cost) Summary</button>
              <button type="button" class="tg-view-tab ${qtyModalActiveView === 'progress_day' ? 'active' : ''}" id="tgQtyViewTab-progress_day" onclick="TimelineGanttStudio.setQtyModalView('progress_day')">Progress % (Day) Summary</button>
              <button type="button" class="tg-view-tab ${qtyModalActiveView === 'cash_flow_estimated' ? 'active' : ''}" id="tgQtyViewTab-cash_flow_estimated" onclick="TimelineGanttStudio.setQtyModalView('cash_flow_estimated')">Cash Flow (Estimated)</button>
              <button type="button" class="tg-view-tab ${qtyModalActiveView === 'cash_flow_day' ? 'active' : ''}" id="tgQtyViewTab-cash_flow_day" onclick="TimelineGanttStudio.setQtyModalView('cash_flow_day')">Cash Flow (Day)</button>
            </div>

            <!-- Dual Panel Container -->
            <div class="tg-qty-modal-container">
              <div class="tg-qty-left" id="tgQtyLeftPanel" style="width: ${qtyLeftPanelWidth}px;">
                <!-- Left table rendered dynamically -->
              </div>
              <div class="tg-divider" id="tgQtyModalDivider" onmousedown="TimelineGanttStudio.startQtyDividerDrag(event)">
                <div class="tg-divider-handle"></div>
              </div>
              <div class="tg-qty-right" id="tgQtyRightPanel">
                <!-- Right time-matrix rendered dynamically -->
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function showUpdateQtyInst(e) {
    if (e) e.preventDefault();
    qtyModalScale = 'days';
    qtyModalActiveView = 'quantity';
    const modal = document.getElementById('tgQtyInstModal');
    if (modal) {
      modal.classList.add('show');
      // Update scale button active state in modal
      document.querySelectorAll('#tgQtyInstModal .tg-scale-btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.trim().toLowerCase() === 'days');
      });
      // Update view tab active state in modal
      document.querySelectorAll('#tgQtyInstModal .tg-view-tab').forEach(tab => {
        tab.classList.toggle('active', tab.id === 'tgQtyViewTab-quantity');
      });
      renderQtyModalTables();
      // Auto-scroll timeline to currentDate or project start
      setTimeout(() => {
        syncQtyRowHeights();
        const rightEl = document.getElementById('tgQtyRightPanel');
        if (rightEl) {
          const targetCol = rightEl.querySelector(`[title="${currentDate}"]`) || rightEl.querySelector('.tg-qty-period-cell input');
          if (targetCol) {
            const cellParent = targetCol.closest('.tg-qty-period-cell') || targetCol;
            rightEl.scrollLeft = Math.max(0, cellParent.offsetLeft - 240);
          }
        }
      }, 60);
    }
  }

  function closeQtyInstModal() {
    const modal = document.getElementById('tgQtyInstModal');
    if (modal) modal.classList.remove('show');
    saveSchedule(true);
    renderMainGanttView();
  }

  function setQtyModalScale(scale) {
    qtyModalScale = scale;
    // Update active state on scale buttons
    document.querySelectorAll('#tgQtyInstModal .tg-scale-btn').forEach(btn => {
      btn.classList.toggle('active', btn.textContent.trim().toLowerCase() === scale);
    });
    renderQtyModalTables();
  }

  function setQtyModalView(viewKey) {
    qtyModalActiveView = viewKey;
    // Update active classes on tabs
    document.querySelectorAll('#tgQtyInstModal .tg-view-tab').forEach(tab => {
      const isMatch = (viewKey === 'quantity' && tab.textContent.includes('Quantity Installed')) ||
                      (viewKey === 'accomplishment' && tab.textContent.includes('Accomplishment')) ||
                      (viewKey === 'progress_cost' && tab.textContent.includes('(Cost)')) ||
                      (viewKey === 'progress_day' && tab.textContent.includes('(Day) Summary')) ||
                      (viewKey === 'cash_flow_estimated' && tab.textContent.includes('Estimated')) ||
                      (viewKey === 'cash_flow_day' && tab.textContent.includes('Cash Flow (Day)'));
      tab.classList.toggle('active', isMatch);
    });
    renderQtyModalTables();
  }

  function setQtyModalMonth(val) {
    qtyModalMonthFilter = val || 'all';
    const select = document.getElementById('tgQtyMonthSelect');
    if (select) select.value = qtyModalMonthFilter;
    renderQtyModalTables();
  }

  function startQtyDividerDrag(e) {
    isDraggingQtyDivider = true;
    document.body.style.cursor = 'col-resize';
    const divider = document.getElementById('tgQtyModalDivider');
    if (divider) divider.classList.add('dragging');

    const onMouseMove = (moveEvent) => {
      if (!isDraggingQtyDivider) return;
      const container = document.querySelector('.tg-qty-modal-container');
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const newWidth = Math.max(320, Math.min(1200, moveEvent.clientX - rect.left));
      qtyLeftPanelWidth = newWidth;
      const leftPanel = document.getElementById('tgQtyLeftPanel');
      if (leftPanel) leftPanel.style.width = newWidth + 'px';
    };

    const onMouseUp = () => {
      isDraggingQtyDivider = false;
      document.body.style.cursor = '';
      if (divider) divider.classList.remove('dragging');
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      renderQtyModalTables();
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  function toggleQtyHighlightDropdown(e) {
    if (e) e.stopPropagation();
    const dd = document.getElementById('tgQtyHighlightDropdown');
    if (dd) dd.classList.toggle('show');
  }

  function setQtyHighlightMode(mode, e) {
    if (e) e.stopPropagation();
    qtyHighlightMode = mode;
    const label = document.getElementById('tgQtyHighlightLabel');
    if (label) {
      label.textContent = mode === 'none' ? 'None' : mode.charAt(0).toUpperCase() + mode.slice(1);
    }
    const dd = document.getElementById('tgQtyHighlightDropdown');
    if (dd) dd.classList.remove('show');
  }

  function highlightQtyRow(rowIdx, e) {
    if (qtyHighlightMode === 'none') return;
    const leftRow = document.getElementById(`tgQtyLeftRow-${rowIdx}`);
    const rightRow = document.getElementById(`tgQtyRightRow-${rowIdx}`);
    const colors = {
      yellow: '#fef08a',
      blue: '#bfdbfe',
      green: '#bbf7d0',
      orange: '#fed7aa'
    };
    const c = colors[qtyHighlightMode] || '#fef08a';
    if (leftRow) {
      const isHi = leftRow.dataset.highlighted === qtyHighlightMode;
      leftRow.style.backgroundColor = isHi ? '' : c;
      leftRow.dataset.highlighted = isHi ? '' : qtyHighlightMode;
    }
    if (rightRow) {
      const isHi = rightRow.dataset.highlighted === qtyHighlightMode;
      rightRow.style.backgroundColor = isHi ? '' : c;
      rightRow.dataset.highlighted = isHi ? '' : qtyHighlightMode;
    }
  }

  function hoverQtyRow(rowIdx, isHovered) {
    const leftRow = document.getElementById(`tgQtyLeftRow-${rowIdx}`);
    const rightRow = document.getElementById(`tgQtyRightRow-${rowIdx}`);
    if (leftRow) {
      if (isHovered) leftRow.classList.add('tg-qty-row-hovered');
      else leftRow.classList.remove('tg-qty-row-hovered');
    }
    if (rightRow) {
      if (isHovered) rightRow.classList.add('tg-qty-row-hovered');
      else rightRow.classList.remove('tg-qty-row-hovered');
    }
  }

  function syncQtyRowHeights() {
    const leftEl = document.getElementById('tgQtyLeftPanel');
    const rightEl = document.getElementById('tgQtyRightPanel');
    if (!leftEl || !rightEl) return;

    // 1. Sync Header height
    const leftThead = leftEl.querySelector('thead');
    const rightStickyHeader = document.getElementById('tgQtyRightStickyHeader');
    if (leftThead && rightStickyHeader) {
      const theadH = Math.round(leftThead.getBoundingClientRect().height);
      if (theadH > 0) {
        rightStickyHeader.style.setProperty('height', theadH + 'px', 'important');
      }
    }

    // 2. Sync Each Row (Tasks + 5 Summary Rows)
    const totalCount = boqData.length + 5;
    for (let i = 0; i < totalCount; i++) {
      const leftRow = document.getElementById(`tgQtyLeftRow-${i}`);
      const rightRow = document.getElementById(`tgQtyRightRow-${i}`);
      if (leftRow && rightRow) {
        const lh = Math.round(leftRow.getBoundingClientRect().height);
        if (lh > 0) {
          rightRow.style.setProperty('height', lh + 'px', 'important');
          rightRow.style.setProperty('min-height', lh + 'px', 'important');
          rightRow.style.setProperty('max-height', lh + 'px', 'important');
          const cells = rightRow.children;
          for (let j = 0; j < cells.length; j++) {
            cells[j].style.setProperty('height', lh + 'px', 'important');
          }
        }
      }
    }
  }

  function renderQtyModalTables() {
    const leftEl = document.getElementById('tgQtyLeftPanel');
    const rightEl = document.getElementById('tgQtyRightPanel');
    if (!leftEl || !rightEl) return;

    const savedLeftScrollTop = leftEl.scrollTop;
    const savedLeftScrollLeft = leftEl.scrollLeft;
    const savedRightScrollTop = rightEl.scrollTop;
    const savedRightScrollLeft = rightEl.scrollLeft;

    const boundary = getProjectDateBoundary();
    const columns = getTimelineColumns(boundary, qtyModalScale, qtyModalMonthFilter);

    // Auto-expand scale column widths (Day, Weeks, Month, Quarter) to fit right panel width
    const availableW = rightEl.clientWidth || Math.max(400, Math.round((window.innerWidth * 0.94) - qtyLeftPanelWidth - 25));
    const baseTotalW = columns.reduce((a, c) => a + c.width, 0);

    if (columns.length > 0 && availableW > baseTotalW) {
      const extraTotal = availableW - baseTotalW;
      const extraPerCol = Math.floor(extraTotal / columns.length);
      const remainder = extraTotal % columns.length;
      columns.forEach((col, idx) => {
        col.width += extraPerCol + (idx < remainder ? 1 : 0);
      });
    }

    const totalColsW = columns.reduce((a, c) => a + c.width, 0);

    // Synchronize month filter select if present
    const monthSelect = document.getElementById('tgQtyMonthSelect');
    if (monthSelect) monthSelect.value = qtyModalMonthFilter;

    // Complete 13 Columns matching boq_schedule ganttColumns
    const modalCols = [
      { id: 'predNo', name: 'Pred. No.', width: 55, align: 'center' },
      { id: 'code', name: 'Code', width: 75, align: 'center' },
      { id: 'title', name: 'Work Description', width: 220, align: 'left' },
      { id: 'startDate', name: 'Start Date', width: 90, align: 'center' },
      { id: 'finishDate', name: 'Finish Date', width: 90, align: 'center' },
      { id: 'days', name: 'Duration', width: 55, align: 'center' },
      { id: 'predecessors', name: 'Predecessors', width: 75, align: 'center' },
      { id: 'cost', name: 'Total Cost', width: 105, align: 'right' },
      { id: 'estQty', name: 'EST. QTY', width: 70, align: 'right' },
      { id: 'instQty', name: 'INST. QTY', width: 70, align: 'right' },
      { id: 'qtyAccmpCost', name: 'QTY ACCMP. COST', width: 110, align: 'right' },
      { id: 'progress', name: 'Progress % (Cost)', width: 90, align: 'center' },
      { id: 'progressDay', name: 'Progress % (Day)', width: 90, align: 'center' }
    ];

    const totalTableWidth = modalCols.reduce((sum, c) => sum + c.width, 40);

    // Calculate overall project totals
    let totalProjectCost = 0;
    let totalEstQtySum = 0;
    let totalInstQtySum = 0;
    let totalAccmpCostSum = 0;
    let totalDurationDays = 0;
    let minStartDate = null;
    let maxFinishDate = null;

    boqData.forEach((row, idx) => {
      const cost = getTaskCost(row);
      const instQ = getInstalledQty(idx);
      const accCost = getAccomplishedCost(idx);
      const s = parseDate(row.ganttStartDate || row.startDate);
      const e = parseDate(row.ganttFinishDate || row.finishDate);
      const dur = parseInt(row.ganttDuration || row.days || 10, 10);

      if (!hasChildRow(boqData, idx)) {
        totalProjectCost += cost;
        totalEstQtySum += (parseFloat(row.qty) || 1);
        totalInstQtySum += instQ;
        totalAccmpCostSum += accCost;
        totalDurationDays += dur;
      }
      if (s && (!minStartDate || s < minStartDate)) minStartDate = s;
      if (e && (!maxFinishDate || e > maxFinishDate)) maxFinishDate = e;
    });

    const minStartStr = minStartDate ? formatDate(minStartDate) : '2026-03-01';
    const maxEndStr = maxFinishDate ? formatDate(maxFinishDate) : '2026-09-30';
    const overallProgressCostPct = totalProjectCost > 0 ? (totalAccmpCostSum / totalProjectCost) * 100 : 0;

    // --- Build Left Table Header ---
    let colLettersRow = '<tr style="height: 24px; max-height: 24px; background: #f8fafc; border-bottom: 1px solid #cbd5e1; box-sizing: border-box;">';
    colLettersRow += '<th class="tg-corner-cell" style="width: 35px; border-right: 1px solid #cbd5e1; height: 24px; padding: 0; box-sizing: border-box;"></th>';
    modalCols.forEach((col, cIdx) => {
      colLettersRow += `<th class="tg-col-letter-th" style="width: ${col.width}px; border-right: 1px solid #cbd5e1; text-align: center; font-size: 10px; font-weight: 700; color: #64748b; height: 24px; line-height: 24px; padding: 0; box-sizing: border-box;">${getColLetter(cIdx)}</th>`;
    });
    colLettersRow += '</tr>';

    let headerTitlesRow = '<tr style="height: 36px; max-height: 36px; background: #107c41; color: white; border-bottom: 2px solid #0b5a2f; box-sizing: border-box;">';
    headerTitlesRow += '<th class="tg-row-num-corner" style="width: 35px; text-align: center; border-right: 1px solid rgba(255,255,255,0.2); font-size: 10px; height: 36px; line-height: 36px; padding: 0; box-sizing: border-box;">#</th>';
    modalCols.forEach(col => {
      headerTitlesRow += `<th style="width: ${col.width}px; text-align: ${col.align}; padding: 0 6px; border-right: 1px solid rgba(255,255,255,0.2); font-size: 10px; font-weight: 700; text-transform: uppercase; height: 36px; line-height: 36px; box-sizing: border-box;">${col.name}</th>`;
    });
    headerTitlesRow += '</tr>';

    // --- Build Left Table Rows ---
    let tbodyHtml = '';
    boqData.forEach((row, idx) => {
      const isParent = hasChildRow(boqData, idx);
      const isCat = row.type === 'category' || row.type === 'subcategory';
      const leaves = isParent ? getLeafDescendents(boqData, idx) : [];
      const costVal = isParent ? leaves.reduce((s, l) => s + getTaskCost(boqData[l]), 0) : getTaskCost(row);
      const estQ = isParent ? leaves.reduce((s, l) => s + (parseFloat(boqData[l].qty) || 0), 0) : (parseFloat(row.qty) || 1);
      const instQ = getInstalledQty(idx);
      const accmpCost = getAccomplishedCost(idx);
      const progCost = costVal > 0 ? Math.min(100, Math.max(0, (accmpCost / costVal) * 100)) : (estQ > 0 ? Math.min(100, Math.max(0, (instQ / estQ) * 100)) : 0);
      let progDay = (row.ganttProgress !== undefined) ? row.ganttProgress : (row.percentDone || 0);
      if (isParent) {
        let totalD = 0;
        let totalProgD = 0;
        leaves.forEach(l => {
          const lD = parseInt(boqData[l].ganttDuration || boqData[l].days || 10, 10);
          const lP = (boqData[l].ganttProgress !== undefined) ? boqData[l].ganttProgress : (boqData[l].percentDone || 0);
          totalD += lD;
          totalProgD += (lP * lD);
        });
        progDay = totalD > 0 ? (totalProgD / totalD) : 0;
      }

      let sDateStr = row.ganttStartDate || row.startDate || '';
      let fDateStr = row.ganttFinishDate || row.finishDate || '';
      let durVal = row.ganttDuration || row.days || 10;
      if (isParent) {
        let minS = null;
        let maxE = null;
        let sumDur = 0;
        leaves.forEach(l => {
          const ls = parseDate(boqData[l].ganttStartDate || boqData[l].startDate);
          const le = parseDate(boqData[l].ganttFinishDate || boqData[l].finishDate);
          const ld = parseInt(boqData[l].ganttDuration || boqData[l].days || 10, 10);
          sumDur += ld;
          if (ls && (!minS || ls < minS)) minS = ls;
          if (le && (!maxE || le > maxE)) maxE = le;
        });
        if (minS) sDateStr = formatDate(minS);
        if (maxE) fDateStr = formatDate(maxE);
        durVal = sumDur;
      }
      const predVal = row.ganttPredecessors || '';

      const rowNum = idx + 1;
      const bgStyle = isCat ? 'background: #f1f5f9; font-weight: 800;' : 'background: #ffffff;';

      tbodyHtml += `
        <tr id="tgQtyLeftRow-${idx}" class="tg-task-tr" data-index="${idx}" style="height: 34px; max-height: 34px; ${bgStyle} border-bottom: 1px solid #e2e8f0; cursor: pointer; box-sizing: border-box;" onclick="TimelineGanttStudio.highlightQtyRow(${idx}, event)" onmouseenter="TimelineGanttStudio.hoverQtyRow(${idx}, true)" onmouseleave="TimelineGanttStudio.hoverQtyRow(${idx}, false)">
          <td class="tg-row-num-td" style="width: 35px; text-align: center; font-size: 10px; font-weight: 700; color: #64748b; border-right: 1px solid #e2e8f0; height: 34px; box-sizing: border-box;">${rowNum}</td>
          <td style="text-align: center; border-right: 1px solid #e2e8f0; font-weight: 700; color: #64748b; height: 34px; box-sizing: border-box;">${rowNum}</td>
          <td style="text-align: center; border-right: 1px solid #e2e8f0; font-weight: 700; color: #2563eb; height: 34px; box-sizing: border-box;">${escapeHtml(row.code || '')}</td>
          <td style="text-align: left; padding-left: ${isCat ? '6px' : '16px'}; border-right: 1px solid #e2e8f0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; height: 34px; box-sizing: border-box;" title="${escapeHtml(row.title || '')}">
            <span>${isCat ? '📁 ' : '🔹 '}${escapeHtml(row.title || '')}</span>
          </td>
          <td style="text-align: center; border-right: 1px solid #e2e8f0; height: 34px; box-sizing: border-box;">
            ${isParent ? `<span style="font-size: 10.5px; color: #475569;">${sDateStr || '-'}</span>` : `<input type="date" value="${sDateStr}" style="width: 100%; border: none; background: transparent; font-size: 10.5px; text-align: center; font-family: inherit; height: 24px; box-sizing: border-box;" onchange="TimelineGanttStudio.updateRowDate(${idx}, 'start', this.value); TimelineGanttStudio.renderQtyModalTables();">`}
          </td>
          <td style="text-align: center; border-right: 1px solid #e2e8f0; height: 34px; box-sizing: border-box;">
            ${isParent ? `<span style="font-size: 10.5px; color: #475569;">${fDateStr || '-'}</span>` : `<input type="date" value="${fDateStr}" style="width: 100%; border: none; background: transparent; font-size: 10.5px; text-align: center; font-family: inherit; height: 24px; box-sizing: border-box;" onchange="TimelineGanttStudio.updateRowDate(${idx}, 'finish', this.value); TimelineGanttStudio.renderQtyModalTables();">`}
          </td>
          <td style="text-align: center; border-right: 1px solid #e2e8f0; height: 34px; box-sizing: border-box;">
            ${isParent ? `<span style="font-size: 10.5px; font-weight: 700;">${durVal}</span>` : `<input type="number" min="1" value="${durVal}" style="width: 100%; border: none; background: transparent; font-size: 10.5px; text-align: center; font-weight: 700; font-family: inherit; height: 24px; box-sizing: border-box;" onchange="TimelineGanttStudio.updateRowDuration(${idx}, this.value); TimelineGanttStudio.renderQtyModalTables();">`}
          </td>
          <td style="text-align: center; border-right: 1px solid #e2e8f0; height: 34px; box-sizing: border-box;">
            ${isParent ? `<span style="font-size: 10.5px; color: #94a3b8;">-</span>` : `<input type="text" value="${escapeHtml(predVal)}" placeholder="FS..." style="width: 100%; border: none; background: transparent; font-size: 10px; text-align: center; font-family: inherit; height: 24px; box-sizing: border-box;" onchange="TimelineGanttStudio.updateRowPredecessors(${idx}, this.value); TimelineGanttStudio.renderQtyModalTables();">`}
          </td>
          <td style="text-align: right; padding-right: 6px; border-right: 1px solid #e2e8f0; font-weight: 700; color: #1e3a8a; height: 34px; box-sizing: border-box;">${formatMoney(costVal)}</td>
          <td style="text-align: right; padding-right: 6px; border-right: 1px solid #e2e8f0; color: #475569; height: 34px; box-sizing: border-box;">${estQ.toLocaleString()}</td>
          <td id="tgQtyInstTotal-${idx}" style="text-align: right; padding-right: 6px; border-right: 1px solid #e2e8f0; font-weight: 700; color: #059669; height: 34px; box-sizing: border-box;" title="Total installed quantity for this work description: ${instQ > 0 ? instQ.toFixed(2) : '0.00'}">
            ${instQ > 0 ? instQ.toFixed(2) : '0.00'}
          </td>
          <td style="text-align: right; padding-right: 6px; border-right: 1px solid #e2e8f0; font-weight: 700; color: #059669; height: 34px; box-sizing: border-box;">${formatMoney(accmpCost)}</td>
          <td style="text-align: center; border-right: 1px solid #e2e8f0; font-weight: 700; color: #0f172a; height: 34px; box-sizing: border-box;">${progCost.toFixed(2)}%</td>
          <td style="text-align: center; border-right: 1px solid #e2e8f0; font-weight: 700; color: #0284c7; height: 34px; box-sizing: border-box;">${Number(progDay).toFixed(2)}%</td>
        </tr>
      `;
    });

    // --- Build 5 Summary Accomplishment Rows on Left Table ---
    const accomplishmentRows = [
      { id: 'accomplishment', label: 'Summary of Accomplishment' },
      { id: 'progress_cost', label: 'Progress % (Cost) Summary' },
      { id: 'progress_day', label: 'Progress % (Day) Summary' },
      { id: 'cash_flow_estimated', label: 'Cash Flow (Estimated)' },
      { id: 'cash_flow_day', label: 'Cash Flow (Day)' }
    ];

    const overallProgressDayPct = totalDurationDays > 0 ? (boqData.reduce((acc, r, i) => {
      if (hasChildRow(boqData, i)) return acc;
      const d = parseInt(r.ganttDuration || r.days || 10, 10);
      const p = (r.ganttProgress !== undefined) ? r.ganttProgress : (r.percentDone || 0);
      return acc + (p * d);
    }, 0) / totalDurationDays) : 0;

    accomplishmentRows.forEach((sRow, sIdx) => {
      const isActive = (qtyModalActiveView === sRow.id);
      const rowId = boqData.length + sIdx + 1;
      const activeClass = isActive ? 'active-summary-row' : '';

      tbodyHtml += `
        <tr id="tgQtyLeftRow-${boqData.length + sIdx}" class="tg-qty-summary-row ${activeClass}" style="height: 34px; max-height: 34px; border-bottom: 1px solid #cbd5e1; cursor: pointer; box-sizing: border-box;" onclick="TimelineGanttStudio.setQtyModalView('${sRow.id}')" onmouseenter="TimelineGanttStudio.hoverQtyRow(${boqData.length + sIdx}, true)" onmouseleave="TimelineGanttStudio.hoverQtyRow(${boqData.length + sIdx}, false)" title="Click to view ${sRow.label} details">
          <td class="tg-row-num-td" style="width: 35px; text-align: center; font-size: 10px; font-weight: 800; border-right: 1px solid #cbd5e1; height: 34px; box-sizing: border-box;">${rowId}</td>
          <td style="text-align: center; border-right: 1px solid #cbd5e1; font-weight: 800; height: 34px; box-sizing: border-box;">-</td>
          <td style="text-align: center; border-right: 1px solid #cbd5e1; font-weight: 800; color: #1e40af; height: 34px; box-sizing: border-box;">SUM</td>
          <td style="text-align: left; padding-left: 8px; border-right: 1px solid #cbd5e1; font-weight: 800; text-transform: uppercase; height: 34px; box-sizing: border-box;">
            <span>📊 ${escapeHtml(sRow.label)}</span>
          </td>
          <td style="text-align: center; border-right: 1px solid #cbd5e1; font-weight: 700; font-size: 10px; height: 34px; box-sizing: border-box;">${minStartStr}</td>
          <td style="text-align: center; border-right: 1px solid #cbd5e1; font-weight: 700; font-size: 10px; height: 34px; box-sizing: border-box;">${maxEndStr}</td>
          <td style="text-align: center; border-right: 1px solid #cbd5e1; font-weight: 700; height: 34px; box-sizing: border-box;">${totalDurationDays}d</td>
          <td style="text-align: center; border-right: 1px solid #cbd5e1; height: 34px; box-sizing: border-box;">-</td>
          <td style="text-align: right; padding-right: 6px; border-right: 1px solid #cbd5e1; font-weight: 900; color: #1e3a8a; height: 34px; box-sizing: border-box;">${formatMoney(totalProjectCost)}</td>
          <td style="text-align: right; padding-right: 6px; border-right: 1px solid #cbd5e1; font-weight: 700; height: 34px; box-sizing: border-box;">${totalEstQtySum.toLocaleString()}</td>
          <td style="text-align: right; padding-right: 6px; border-right: 1px solid #cbd5e1; font-weight: 800; color: #059669; height: 34px; box-sizing: border-box;">${totalInstQtySum > 0 ? totalInstQtySum.toFixed(2) : '0.00'}</td>
          <td style="text-align: right; padding-right: 6px; border-right: 1px solid #cbd5e1; font-weight: 900; color: #059669; height: 34px; box-sizing: border-box;">${formatMoney(totalAccmpCostSum)}</td>
          <td style="text-align: center; border-right: 1px solid #cbd5e1; font-weight: 900; color: #047857; height: 34px; box-sizing: border-box;">${overallProgressCostPct.toFixed(2)}%</td>
          <td style="text-align: center; border-right: 1px solid #cbd5e1; font-weight: 900; color: #0284c7; height: 34px; box-sizing: border-box;">${overallProgressDayPct.toFixed(2)}%</td>
        </tr>
      `;
    });

    leftEl.innerHTML = `
      <table class="tg-qty-table" style="width: ${totalTableWidth}px; border-collapse: separate; border-spacing: 0;">
        <thead style="position: sticky; top: 0; z-index: 10;">
          ${colLettersRow}
          ${headerTitlesRow}
        </thead>
        <tbody>
          ${tbodyHtml}
        </tbody>
      </table>
    `;

    // --- Build Right Time Matrix ---
    let topCells = '';
    let bottomCells = '';
    let currentTop = null;
    let currentTopW = 0;

    columns.forEach((col, cIdx) => {
      const topTxt = col.topLabel || '';
      if (!currentTop) {
        currentTop = topTxt;
        currentTopW = col.width;
      } else if (currentTop === topTxt) {
        currentTopW += col.width;
      } else {
        topCells += `<div style="width: ${currentTopW}px; min-width: ${currentTopW}px; height: 24px; line-height: 24px; text-align: center; font-size: 10px; font-weight: 700; border-right: 1px solid rgba(255,255,255,0.2); border-bottom: 1px solid #cbd5e1; box-sizing: border-box; background: #0f172a; color: white;">${currentTop}</div>`;
        currentTop = topTxt;
        currentTopW = col.width;
      }
      if (cIdx === columns.length - 1) {
        topCells += `<div style="width: ${currentTopW}px; min-width: ${currentTopW}px; height: 24px; line-height: 24px; text-align: center; font-size: 10px; font-weight: 700; border-right: 1px solid rgba(255,255,255,0.2); border-bottom: 1px solid #cbd5e1; box-sizing: border-box; background: #0f172a; color: white;">${currentTop}</div>`;
      }
      bottomCells += `<div style="width: ${col.width}px; min-width: ${col.width}px; height: 36px; line-height: 36px; text-align: center; font-size: 9.5px; font-weight: 700; border-right: 1px solid rgba(255,255,255,0.2); border-bottom: 2px solid #0b5a2f; box-sizing: border-box; background: #1e293b; color: white;" title="${col.dateStr}">${col.label}</div>`;
    });

    // Right Task Rows
    let rightRowsHtml = '';
    boqData.forEach((row, idx) => {
      const isParent = hasChildRow(boqData, idx);
      const isCat = row.type === 'category' || row.type === 'subcategory';
      let cellsHtml = '';

      columns.forEach(col => {
        const pStart = col.date;
        const pEnd = col.endDate || col.date;
        const dateKey = col.dateStr;

        if (qtyModalActiveView === 'quantity') {
          const sDateStr = col.dateStr;
          const eDateStr = col.endDateStr || col.dateStr;

          if (isParent) {
            const periodVal = (qtyModalScale === 'days')
              ? getPeriodQtySingle(idx, sDateStr)
              : getAccumulatedPeriodQty(idx, pStart, pEnd);

            cellsHtml += `
              <div class="tg-qty-period-cell" style="width: ${col.width}px; min-width: ${col.width}px; height: 34px; max-height: 34px; box-sizing: border-box; background: #f8fafc; color: ${periodVal > 0 ? '#1e40af' : '#64748b'}; font-weight: 700;">
                ${periodVal > 0 ? periodVal.toFixed(2) : '-'}
              </div>
            `;
          } else {
            const periodVal = (qtyModalScale === 'days')
              ? (row.ganttPeriodQty && row.ganttPeriodQty[sDateStr] ? parseFloat(row.ganttPeriodQty[sDateStr]) || 0 : 0)
              : getAccumulatedPeriodQty(idx, pStart, pEnd);

            const displayVal = periodVal > 0 ? periodVal : '';
            const tooltipTitle = (qtyModalScale === 'days')
              ? `Day: ${sDateStr} - Enter Installed Qty`
              : `${col.label} (${sDateStr} to ${eDateStr}) - Enter Installed Qty`;

            cellsHtml += `
              <div class="tg-qty-period-cell" style="width: ${col.width}px; min-width: ${col.width}px; height: 34px; max-height: 34px; box-sizing: border-box; padding: 0;">
                <input type="number" step="any" min="0" class="tg-qty-input" value="${displayVal}" placeholder="-" title="${tooltipTitle}" onkeydown="if(event.key==='Enter')this.blur();" onchange="TimelineGanttStudio.updatePeriodQty(${idx}, '${sDateStr}', this.value, '${sDateStr}', '${eDateStr}')">
              </div>
            `;
          }
        } else if (qtyModalActiveView === 'accomplishment') {
          const val = getGanttSummaryTaskTimelineValue(idx, 'Summary of Accomplishment', pStart, pEnd);
          cellsHtml += `<div class="tg-qty-period-cell" style="width: ${col.width}px; min-width: ${col.width}px; height: 34px; max-height: 34px; box-sizing: border-box; color: ${val > 0 ? '#1e40af' : '#94a3b8'};">${val > 0 ? formatMoney(val) : '-'}</div>`;
        } else if (qtyModalActiveView === 'progress_cost') {
          const val = getGanttSummaryTaskTimelineValue(idx, 'Progress % (Cost) Summary', pStart, pEnd);
          cellsHtml += `<div class="tg-qty-period-cell" style="width: ${col.width}px; min-width: ${col.width}px; height: 34px; max-height: 34px; box-sizing: border-box; color: ${val > 0 ? '#047857' : '#94a3b8'};">${val > 0 ? val.toFixed(2) + '%' : '-'}</div>`;
        } else if (qtyModalActiveView === 'progress_day') {
          const val = getGanttSummaryTaskTimelineValue(idx, 'Progress % (Day) Summary', pStart, pEnd);
          cellsHtml += `<div class="tg-qty-period-cell" style="width: ${col.width}px; min-width: ${col.width}px; height: 34px; max-height: 34px; box-sizing: border-box; color: ${val !== null && val > 0 ? '#0284c7' : '#94a3b8'};">${val !== null && val > 0 ? val.toFixed(2) + '%' : '-'}</div>`;
        } else if (qtyModalActiveView === 'cash_flow_estimated') {
          const val = getGanttSummaryTaskTimelineValue(idx, 'Cash Flow (Estimated)', pStart, pEnd);
          cellsHtml += `<div class="tg-qty-period-cell" style="width: ${col.width}px; min-width: ${col.width}px; height: 34px; max-height: 34px; box-sizing: border-box; color: ${val > 0 ? '#b45309' : '#94a3b8'};">${val > 0 ? formatMoney(val) : '-'}</div>`;
        } else if (qtyModalActiveView === 'cash_flow_day') {
          const val = getGanttSummaryTaskTimelineValue(idx, 'Cash Flow (Day)', pStart, pEnd);
          cellsHtml += `<div class="tg-qty-period-cell" style="width: ${col.width}px; min-width: ${col.width}px; height: 34px; max-height: 34px; box-sizing: border-box; color: ${val > 0 ? '#0f172a' : '#94a3b8'};">${val > 0 ? val.toFixed(1) : '-'}</div>`;
        }
      });

      rightRowsHtml += `
        <div id="tgQtyRightRow-${idx}" class="tg-qty-right-row" style="height: 34px; max-height: 34px; background: ${isCat ? '#f8fafc' : '#ffffff'}; border-bottom: 1px solid #e2e8f0; display: flex; width: ${totalColsW}px; min-width: 100%; box-sizing: border-box; cursor: pointer;" onclick="TimelineGanttStudio.highlightQtyRow(${idx}, event)" onmouseenter="TimelineGanttStudio.hoverQtyRow(${idx}, true)" onmouseleave="TimelineGanttStudio.hoverQtyRow(${idx}, false)">
          ${cellsHtml}
        </div>
      `;
    });

    // Right Summary Accomplishment Rows Matrix
    accomplishmentRows.forEach((sRow, sIdx) => {
      let runningCashFlowEstimated = 0;
      const isActive = (qtyModalActiveView === sRow.id);
      const rowBg = isActive ? '#dbeafe' : '#f1f5f9';
      const rowColor = isActive ? '#1e40af' : '#1e293b';
      let cellsHtml = '';

      columns.forEach(col => {
        const pStart = col.date;
        const pEnd = col.endDate || col.date;
        const maxCutoffDate = getMaxCutoffDate();
        const isFuture = isPeriodFuture(pStart, maxCutoffDate);

        let displayVal = '-';

        if (sRow.id === 'accomplishment') {
          let projectPeriodCost = 0;
          boqData.forEach((r, rIdx) => {
            if (!hasChildRow(boqData, rIdx)) {
              projectPeriodCost += (getGanttSummaryTaskTimelineValue(rIdx, 'Summary of Accomplishment', pStart, pEnd) || 0);
            }
          });
          displayVal = projectPeriodCost > 0 ? formatMoney(projectPeriodCost) : '-';
        } else if (sRow.id === 'progress_cost') {
          let projectPeriodCost = 0;
          boqData.forEach((r, rIdx) => {
            if (!hasChildRow(boqData, rIdx)) {
              projectPeriodCost += (getGanttSummaryTaskTimelineValue(rIdx, 'Summary of Accomplishment', pStart, pEnd) || 0);
            }
          });
          const pct = totalProjectCost > 0 ? (projectPeriodCost / totalProjectCost) * 100 : 0;
          displayVal = pct > 0 ? pct.toFixed(2) + '%' : '-';
        } else if (sRow.id === 'progress_day') {
          const curD = parseDate(currentDate) || new Date();
          const isDayFuture = isPeriodFuture(pStart, curD);
          if (!isDayFuture) {
            let totalOverlap = 0;
            let totalDur = 0;
            boqData.forEach((r, rIdx) => {
              if (!hasChildRow(boqData, rIdx)) {
                const dur = parseInt(r.ganttDuration || r.days || 10, 10);
                const ov = getGanttTaskOverlapDays(r, boundary.start, pEnd);
                totalOverlap += ov;
                totalDur += dur;
              }
            });
            const cumDayPct = totalDur > 0 ? Math.min(100, (totalOverlap / totalDur) * 100) : 0;
            displayVal = cumDayPct > 0 ? cumDayPct.toFixed(2) + '%' : '-';
          } else {
            displayVal = '-';
          }
        } else if (sRow.id === 'cash_flow_estimated') {
          let periodCostFlow = 0;
          boqData.forEach((r, rIdx) => {
            if (!hasChildRow(boqData, rIdx)) {
              periodCostFlow += getGanttSummaryTaskTimelineValue(rIdx, 'Cash Flow (Estimated)', pStart, pEnd) || 0;
            }
          });
          runningCashFlowEstimated += periodCostFlow;
          displayVal = runningCashFlowEstimated > 0 ? formatMoney(runningCashFlowEstimated) : '-';
        } else if (sRow.id === 'cash_flow_day') {
          let periodDays = 0;
          boqData.forEach((r, rIdx) => {
            if (!hasChildRow(boqData, rIdx)) {
              periodDays += getGanttTaskOverlapDays(r, pStart, pEnd);
            }
          });
          displayVal = periodDays > 0 ? periodDays.toFixed(1) : '-';
        }

        cellsHtml += `<div class="tg-qty-period-cell" style="width: ${col.width}px; min-width: ${col.width}px; height: 34px; max-height: 34px; box-sizing: border-box; background: ${rowBg}; color: ${rowColor}; font-weight: 800; border-bottom: 1px solid #cbd5e1;">${displayVal}</div>`;
      });

      rightRowsHtml += `
        <div id="tgQtyRightRow-${boqData.length + sIdx}" class="tg-qty-right-row" style="height: 34px; max-height: 34px; background: ${rowBg}; display: flex; width: ${totalColsW}px; min-width: 100%; box-sizing: border-box; border-bottom: 1px solid #cbd5e1; cursor: pointer;" onclick="TimelineGanttStudio.setQtyModalView('${sRow.id}')" onmouseenter="TimelineGanttStudio.hoverQtyRow(${boqData.length + sIdx}, true)" onmouseleave="TimelineGanttStudio.hoverQtyRow(${boqData.length + sIdx}, false)">
          ${cellsHtml}
        </div>
      `;
    });

    rightEl.innerHTML = `
      <div style="width: ${totalColsW}px; min-width: 100%;">
        <div id="tgQtyRightStickyHeader" style="position: sticky; top: 0; z-index: 10; width: ${totalColsW}px; min-width: 100%; height: 60px; box-sizing: border-box;">
          <div style="display: flex; width: ${totalColsW}px; min-width: 100%; height: 24px; box-sizing: border-box;">${topCells}</div>
          <div style="display: flex; width: ${totalColsW}px; min-width: 100%; height: 36px; box-sizing: border-box;">${bottomCells}</div>
        </div>
        <div style="width: ${totalColsW}px; min-width: 100%;">${rightRowsHtml}</div>
      </div>
    `;

    // Re-bind scroll sync between left and right panel
    let isSyncing = false;
    const syncFromLeft = () => {
      if (isSyncing) return;
      isSyncing = true;
      if (Math.abs(rightEl.scrollTop - leftEl.scrollTop) >= 0.5) {
        rightEl.scrollTop = leftEl.scrollTop;
      }
      isSyncing = false;
    };
    const syncFromRight = () => {
      if (isSyncing) return;
      isSyncing = true;
      if (Math.abs(leftEl.scrollTop - rightEl.scrollTop) >= 0.5) {
        leftEl.scrollTop = rightEl.scrollTop;
      }
      isSyncing = false;
    };

    leftEl.onscroll = syncFromLeft;
    rightEl.onscroll = syncFromRight;

    // Synchronous Wheel Event lock for modal container
    const modalContainer = document.querySelector('#tgQtyInstModal .tg-qty-modal-container');
    if (modalContainer && !modalContainer._hasQtyWheelSync) {
      modalContainer._hasQtyWheelSync = true;
      modalContainer.addEventListener('wheel', (e) => {
        if (Math.abs(e.deltaY) >= Math.abs(e.deltaX) && e.deltaY !== 0) {
          e.preventDefault();
          const cur = leftEl.scrollTop;
          const maxLeft = leftEl.scrollHeight - leftEl.clientHeight;
          const maxRight = rightEl.scrollHeight - rightEl.clientHeight;
          const maxScroll = Math.max(maxLeft, maxRight);
          const nextTop = Math.max(0, Math.min(maxScroll, cur + e.deltaY));
          leftEl.scrollTop = nextTop;
          rightEl.scrollTop = nextTop;
        }
      }, { passive: false });
    }

    // Restore scroll positions
    if (savedLeftScrollTop) leftEl.scrollTop = savedLeftScrollTop;
    if (savedLeftScrollLeft) leftEl.scrollLeft = savedLeftScrollLeft;
    if (savedRightScrollTop) rightEl.scrollTop = savedRightScrollTop;
    if (savedRightScrollLeft) rightEl.scrollLeft = savedRightScrollLeft;

    // Apply row heights synchronizer to ensure exact pixel-perfect coincidence
    syncQtyRowHeights();
    requestAnimationFrame(syncQtyRowHeights);
  }

  function updatePeriodQty(rowIdx, dateKey, val, startDateStr, endDateStr) {
    const row = boqData[rowIdx];
    if (!row) return;
    if (!row.ganttPeriodQty) row.ganttPeriodQty = {};
    const num = parseFloat(val);

    // If this period covers a date range (weeks, months, quarters), clear individual dates in this range first
    if (startDateStr && endDateStr && startDateStr !== endDateStr) {
      const s = parseDate(startDateStr);
      const e = parseDate(endDateStr);
      if (s && e) {
        s.setHours(0, 0, 0, 0);
        e.setHours(23, 59, 59, 999);
        for (const k in row.ganttPeriodQty) {
          const kd = parseDate(k);
          if (kd) {
            kd.setHours(12, 0, 0, 0);
            if (kd >= s && kd <= e) {
              delete row.ganttPeriodQty[k];
            }
          }
        }
      }
    }

    if (!isNaN(num) && num > 0) {
      row.ganttPeriodQty[dateKey] = num;
    } else {
      delete row.ganttPeriodQty[dateKey];
    }

    // Auto-update task total installed quantity and progress %
    const totalInst = getInstalledQty(rowIdx);
    row.ganttInstalledQty = totalInst;
    const estQ = parseFloat(row.qty) || 1;
    if (estQ > 0) {
      const prog = Math.min(100, Math.max(0, Math.round((totalInst / estQ) * 100)));
      row.ganttProgress = prog;
      row.percentDone = prog;
    }

    saveSchedule(true);
    renderQtyModalTables();
    renderMainGanttView();
  }

  function updateTotalInstalledQty(rowIdx, val) {
    const row = boqData[rowIdx];
    if (!row) return;
    const num = parseFloat(val);
    const validNum = (!isNaN(num) && num >= 0) ? num : 0;
    row.ganttInstalledQty = validNum;

    const curDStr = currentDate || formatDate(new Date());
    if (!row.ganttPeriodQty) row.ganttPeriodQty = {};
    row.ganttPeriodQty[curDStr] = validNum;

    const estQ = parseFloat(row.qty) || 1;
    if (estQ > 0) {
      const prog = Math.min(100, Math.round((validNum / estQ) * 100));
      row.ganttProgress = prog;
      row.percentDone = prog;
    }

    saveSchedule(true);
    renderQtyModalTables();
    renderMainGanttView();
  }

  // ==========================================================================
  // MODAL 2: MULTI-PERIOD PROGRESS BILLING & PAYMENT ENGINE
  // ==========================================================================
  function buildBillingRecordModalHtml() {
    return `
      <div class="tg-modal-overlay" id="tgBillingRecordModal">
        <div class="tg-modal-dialog" style="width: 94vw; height: 92vh;">
          <div class="tg-modal-header">
            <h3 class="tg-modal-title">
              <span>💳 Multi-Period Progress Billing &amp; Payment Certificate Engine</span>
            </h3>
            <button type="button" class="tg-tool-btn primary" onclick="TimelineGanttStudio.closeBillingRecordModal()">✕ Close</button>
          </div>

          <div class="tg-modal-body" style="padding: 18px; display: flex; flex-direction: column; gap: 14px;">
            <!-- Controls Bar -->
            <div style="display: flex; gap: 16px; align-items: center; flex-wrap: wrap; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span class="tg-toolbar-label">Billing Cycle:</span>
                <select id="tgBillingCycleSelect" style="height: 28px; font-size: 11px; font-weight: 700; border-radius: 4px; border: 1px solid #cbd5e1; padding: 0 8px;" onchange="TimelineGanttStudio.onBillingCycleSelect(this.value)">
                  ${fclBillingPeriods.map((p, idx) => `<option value="${idx}">Billing Period #${p.id} (${p.currDate})</option>`).join('')}
                </select>
                <button type="button" class="tg-tool-btn" onclick="TimelineGanttStudio.addNewBillingCycle()">+ New Cycle</button>
              </div>

              <div style="display: flex; align-items: center; gap: 6px;">
                <span class="tg-toolbar-label">Period Dates:</span>
                <input type="date" id="tgBillingPrevDate" value="2026-03-01" style="height: 24px; border: 1px solid #cbd5e1; border-radius: 4px; padding: 2px 4px; font-size: 11px;" onchange="TimelineGanttStudio.recalculateBillingCertificate()">
                <span>to</span>
                <input type="date" id="tgBillingCurrDate" value="2026-03-31" style="height: 24px; border: 1px solid #cbd5e1; border-radius: 4px; padding: 2px 4px; font-size: 11px;" onchange="TimelineGanttStudio.recalculateBillingCertificate()">
              </div>

              <div style="display: flex; align-items: center; gap: 6px;">
                <span class="tg-toolbar-label">Retention:</span>
                <input type="number" id="tgBillingRetentionRate" value="10" min="0" max="30" style="width: 45px; height: 24px; border: 1px solid #cbd5e1; border-radius: 4px; text-align: center; font-size: 11px; font-weight: 700;" onchange="TimelineGanttStudio.recalculateBillingCertificate()">
                <span style="font-size: 11px; font-weight: 700;">%</span>
              </div>

              <div style="display: flex; align-items: center; gap: 6px;">
                <span class="tg-toolbar-label">DP Recoupment:</span>
                <input type="number" id="tgBillingDPRate" value="15" min="0" max="30" style="width: 45px; height: 24px; border: 1px solid #cbd5e1; border-radius: 4px; text-align: center; font-size: 11px; font-weight: 700;" onchange="TimelineGanttStudio.recalculateBillingCertificate()">
                <span style="font-size: 11px; font-weight: 700;">%</span>
              </div>

              <button type="button" class="tg-tool-btn" style="background:#107c41; color:#fff;" onclick="window.print()">🖨 Print Certificate</button>
            </div>

            <!-- Contractor's Application for Payment Certificate Sheet -->
            <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);" id="tgPaymentCertSheet">
              <div style="text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px;">
                <h2 style="margin: 0; font-size: 17px; font-weight: 900; color: #1e3a8a; text-transform: uppercase;">CONTRACTOR'S APPLICATION FOR PAYMENT</h2>
                <div style="font-size: 11.5px; font-weight: 700; color: #475569; margin-top: 3px;">FCL Aranang Development Corporation &bull; Active Construction Contract Certification</div>
              </div>

              <!-- 10-Line Payment Summary Table -->
              <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 18px;" id="tgCertSummaryTable">
                <tbody>
                  <tr style="border-bottom: 1px solid #e2e8f0; height: 30px;">
                    <td style="width: 35px; font-weight: 700;">1.</td>
                    <td>ORIGINAL CONTRACT SUM</td>
                    <td style="text-align: right; font-weight: 700; width: 170px;" id="certOriginalSum">₱ 33,800,000.00</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #e2e8f0; height: 30px;">
                    <td style="font-weight: 700;">2.</td>
                    <td>Net change by Change Orders / Variations</td>
                    <td style="text-align: right; font-weight: 700;" id="certChangeOrders">₱ 0.00</td>
                  </tr>
                  <tr style="border-bottom: 2px solid #cbd5e1; height: 32px; background: #f8fafc; font-weight: 800;">
                    <td style="font-weight: 700;">3.</td>
                    <td>CONTRACT SUM TO DATE (Line 1 &plusmn; Line 2)</td>
                    <td style="text-align: right;" id="certContractToDate">₱ 33,800,000.00</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #e2e8f0; height: 30px;">
                    <td style="font-weight: 700;">4.</td>
                    <td>TOTAL COMPLETED &amp; STORED TO DATE (Gross Accomplishment) <span id="certGrossPct" style="color: #2563eb; font-weight: 800;">(0.00%)</span></td>
                    <td style="text-align: right; font-weight: 800; color: #1e40af;" id="certGrossAmount">₱ 0.00</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #e2e8f0; height: 30px; background: #fff1f2;">
                    <td style="font-weight: 700;">5.</td>
                    <td>Less: Retention (<span id="certRetDisplay">10%</span> of Completed Work)</td>
                    <td style="text-align: right; color: #b91c1c; font-weight: 700;" id="certRetentionVal">(₱ 0.00)</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #e2e8f0; height: 30px; background: #fff1f2;">
                    <td style="font-weight: 700;">6.</td>
                    <td>Less: Mobilization / Downpayment Recoupment (<span id="certDPDisplay">15%</span> of Completed Work)</td>
                    <td style="text-align: right; color: #b91c1c; font-weight: 700;" id="certDPVal">(₱ 0.00)</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #cbd5e1; height: 32px; background: #f1f5f9; font-weight: 800;">
                    <td style="font-weight: 700;">7.</td>
                    <td>TOTAL EARNED LESS RETAINAGE &amp; ADVANCE PAYMENT (Line 4 less Lines 5 &amp; 6)</td>
                    <td style="text-align: right;" id="certTotalEarned">₱ 0.00</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #e2e8f0; height: 30px;">
                    <td style="font-weight: 700;">8.</td>
                    <td>Less: Previous Certificates for Payment (Prior Billings Paid)</td>
                    <td style="text-align: right; color: #475569;" id="certPriorPaid">(₱ 0.00)</td>
                  </tr>
                  <tr style="border-bottom: 2px solid #047857; height: 36px; background: #ecfdf5; font-size: 13px; font-weight: 900;">
                    <td style="color: #047857;">9.</td>
                    <td style="color: #047857; text-transform: uppercase;">CURRENT PAYMENT DUE THIS APPLICATION (Line 7 less Line 8)</td>
                    <td style="text-align: right; color: #047857; font-size: 14px;" id="certPaymentDue">₱ 0.00</td>
                  </tr>
                  <tr style="height: 30px; background: #fafafa;">
                    <td style="font-weight: 700;">10.</td>
                    <td>BALANCE TO FINISH, INCLUDING RETAINAGE (Line 3 less Line 7)</td>
                    <td style="text-align: right; font-weight: 700;" id="certBalanceToFinish">₱ 33,800,000.00</td>
                  </tr>
                </tbody>
              </table>

              <!-- Contractor's Certification Note -->
              <div style="font-size: 11px; color: #475569; line-height: 1.5; margin-bottom: 24px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 10px 14px;">
                <strong>CONTRACTOR'S CERTIFICATION:</strong> The undersigned Contractor certifies that to the best of the Contractor's knowledge, information and belief the Work covered by this Application for Payment has been completed in accordance with the Contract Documents, that all amounts have been paid by the Contractor for Work for which previous Certificates for Payment were issued and payments received from the Owner, and that current payment shown herein is now due.
              </div>

              <!-- Sign-off Blocks -->
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; text-align: center; font-size: 11px;">
                <div>
                  <div style="font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 40px;">Prepared &amp; Submitted By:</div>
                  <div style="border-top: 1.5px solid #0f172a; padding-top: 4px;">
                    <strong style="font-size: 11.5px; color: #0f172a;">ENGR. J. DELA CRUZ</strong>
                    <div style="font-size: 10px; color: #475569;">Project In-Charge</div>
                  </div>
                </div>
                <div>
                  <div style="font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 40px;">Evaluated &amp; Certified By:</div>
                  <div style="border-top: 1.5px solid #0f172a; padding-top: 4px;">
                    <strong style="font-size: 11.5px; color: #0f172a;">ENGR. V. BUMALANG</strong>
                    <div style="font-size: 10px; color: #475569;">QA/QC &amp; Billing Engineer</div>
                  </div>
                </div>
                <div>
                  <div style="font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 40px;">Approved for Payment By:</div>
                  <div style="border-top: 1.5px solid #0f172a; padding-top: 4px;">
                    <strong style="font-size: 11.5px; color: #0f172a;">CLIENT REPRESENTATIVE</strong>
                    <div style="font-size: 10px; color: #475569;">Authorized Project Director</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function showBillingRecord(e) {
    if (e) e.preventDefault();
    const modal = document.getElementById('tgBillingRecordModal');
    if (modal) {
      modal.classList.add('show');
      recalculateBillingCertificate();
    }
  }

  function closeBillingRecordModal() {
    const modal = document.getElementById('tgBillingRecordModal');
    if (modal) modal.classList.remove('show');
  }

  function onBillingCycleSelect(val) {
    activeBillingCycle = parseInt(val, 10) || 0;
    recalculateBillingCertificate();
  }

  function addNewBillingCycle() {
    const nextId = fclBillingPeriods.length + 1;
    const lastP = fclBillingPeriods[fclBillingPeriods.length - 1];
    let nextStart = '2026-06-01';
    let nextEnd = '2026-06-30';
    if (lastP && lastP.currDate) {
      const d = parseDate(lastP.currDate);
      if (d) {
        nextStart = formatDate(addDays(d, 1));
        nextEnd = formatDate(addDays(d, 30));
      }
    }
    fclBillingPeriods.push({
      id: nextId,
      name: `Billing Period #${nextId}`,
      prevDate: nextStart,
      currDate: nextEnd,
      retentionRate: 10,
      dpRate: 15,
      accomplishments: {}
    });

    const select = document.getElementById('tgBillingCycleSelect');
    if (select) {
      select.innerHTML = fclBillingPeriods.map((p, idx) => `<option value="${idx}">Billing Period #${p.id} (${p.currDate})</option>`).join('');
      select.value = String(fclBillingPeriods.length - 1);
      activeBillingCycle = fclBillingPeriods.length - 1;
    }
    recalculateBillingCertificate();
  }

  function recalculateBillingCertificate() {
    let totalContract = 0;
    let grossAccomplished = 0;

    boqData.forEach((r, idx) => {
      const cost = getTaskCost(r);
      if (r.type !== 'category' && r.type !== 'subcategory') {
        totalContract += cost;
        const prog = parseFloat(r.ganttProgress !== undefined ? r.ganttProgress : (r.percentDone || 0)) || 0;
        grossAccomplished += (cost * (prog / 100));
      }
    });

    if (totalContract <= 0) totalContract = 33800000;

    const retRate = (parseFloat(document.getElementById('tgBillingRetentionRate')?.value) || 10) / 100;
    const dpRate = (parseFloat(document.getElementById('tgBillingDPRate')?.value) || 15) / 100;

    const retDeduction = grossAccomplished * retRate;
    const dpDeduction = grossAccomplished * dpRate;
    const totalEarned = grossAccomplished - retDeduction - dpDeduction;
    const priorPaid = activeBillingCycle > 0 ? (totalEarned * 0.4) : 0;
    const paymentDue = Math.max(0, totalEarned - priorPaid);
    const balanceToFinish = Math.max(0, totalContract - totalEarned);
    const grossPct = totalContract > 0 ? ((grossAccomplished / totalContract) * 100).toFixed(2) : '0.00';

    const setTxt = (id, txt) => {
      const el = document.getElementById(id);
      if (el) el.textContent = txt;
    };

    setTxt('certOriginalSum', formatMoney(totalContract));
    setTxt('certContractToDate', formatMoney(totalContract));
    setTxt('certGrossAmount', formatMoney(grossAccomplished));
    setTxt('certGrossPct', `(${grossPct}%)`);
    setTxt('certRetentionVal', `(${formatMoney(retDeduction)})`);
    setTxt('certDPVal', `(${formatMoney(dpDeduction)})`);
    setTxt('certTotalEarned', formatMoney(totalEarned));
    setTxt('certPriorPaid', `(${formatMoney(priorPaid)})`);
    setTxt('certPaymentDue', formatMoney(paymentDue));
    setTxt('certBalanceToFinish', formatMoney(balanceToFinish));
    setTxt('certRetDisplay', `${(retRate * 100).toFixed(0)}%`);
    setTxt('certDPDisplay', `${(dpRate * 100).toFixed(0)}%`);
  }

  // ==========================================================================
  // MODAL 3: GANTT STYLE & VISUAL SETTINGS
  // ==========================================================================
  function buildStyleSettingsModalHtml() {
    return `
      <div class="tg-modal-overlay" id="tgStyleSettingsModal">
        <div class="tg-modal-dialog" style="width: 820px; max-width: 95vw;">
          <div class="tg-modal-header">
            <h3 class="tg-modal-title">
              <span>🎨 Gantt Chart Style &amp; Visual Settings</span>
            </h3>
            <button type="button" class="tg-tool-btn" onclick="TimelineGanttStudio.closeStyleSettings()">✕</button>
          </div>

          <div class="tg-modal-body" style="padding: 18px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <!-- Column 1: Layout & Column Widths -->
            <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 14px; display: flex; flex-direction: column; gap: 10px;">
              <span style="font-size: 11px; font-weight: 800; color: #1e3a8a; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px;">Layout &amp; Bar Sizing</span>
              
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <label style="font-size: 11px; font-weight: 600;">Gantt Bar Height (px):</label>
                <input type="number" id="setGanttBarH" value="${ganttSettings.barHeight || 16}" min="10" max="32" style="width: 60px; height: 24px; text-align: center; border: 1px solid #cbd5e1; border-radius: 4px;">
              </div>

              <div style="display: flex; justify-content: space-between; align-items: center;">
                <label style="font-size: 11px; font-weight: 600;">Row Height (px):</label>
                <input type="number" id="setGanttRowH" value="${ganttSettings.rowHeight || 38}" min="24" max="60" style="width: 60px; height: 24px; text-align: center; border: 1px solid #cbd5e1; border-radius: 4px;">
              </div>

              <span style="font-size: 11px; font-weight: 800; color: #1e3a8a; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-top: 6px;">Scale Column Widths (px)</span>
              
              <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; text-align: center;">
                <div>
                  <label style="font-size: 10px; font-weight: 700;">Days</label>
                  <input type="number" id="setColWDays" value="${ganttSettings.colWidthDays || 34}" style="width: 100%; height: 24px; text-align: center; border: 1px solid #cbd5e1; border-radius: 4px;">
                </div>
                <div>
                  <label style="font-size: 10px; font-weight: 700;">Weeks</label>
                  <input type="number" id="setColWWeeks" value="${ganttSettings.colWidthWeeks || 68}" style="width: 100%; height: 24px; text-align: center; border: 1px solid #cbd5e1; border-radius: 4px;">
                </div>
                <div>
                  <label style="font-size: 10px; font-weight: 700;">Months</label>
                  <input type="number" id="setColWMonths" value="${ganttSettings.colWidthMonths || 110}" style="width: 100%; height: 24px; text-align: center; border: 1px solid #cbd5e1; border-radius: 4px;">
                </div>
                <div>
                  <label style="font-size: 10px; font-weight: 700;">Quarters</label>
                  <input type="number" id="setColWQuarters" value="${ganttSettings.colWidthQuarters || 200}" style="width: 100%; height: 24px; text-align: center; border: 1px solid #cbd5e1; border-radius: 4px;">
                </div>
              </div>
            </div>

            <!-- Column 2: Colors & Overlays -->
            <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 14px; display: flex; flex-direction: column; gap: 10px;">
              <span style="font-size: 11px; font-weight: 800; color: #1e3a8a; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px;">Colors &amp; Overlays</span>

              <div style="display: flex; justify-content: space-between; align-items: center;">
                <label style="font-size: 11px; font-weight: 600;">Planned Bar Color:</label>
                <input type="color" id="setTaskColor" value="${ganttSettings.taskColor || '#3b82f6'}" style="width: 40px; height: 24px; border: 1px solid #cbd5e1; border-radius: 4px; padding: 1px;">
              </div>

              <div style="display: flex; justify-content: space-between; align-items: center;">
                <label style="font-size: 11px; font-weight: 600;">Critical Path (CPM) Color:</label>
                <input type="color" id="setCriticalColor" value="${ganttSettings.criticalColor || '#ef4444'}" style="width: 40px; height: 24px; border: 1px solid #cbd5e1; border-radius: 4px; padding: 1px;">
              </div>

              <div style="display: flex; justify-content: space-between; align-items: center;">
                <label style="font-size: 11px; font-weight: 600;">Actual Progress Color:</label>
                <input type="color" id="setActualColor" value="${ganttSettings.actualColor || '#f59e0b'}" style="width: 40px; height: 24px; border: 1px solid #cbd5e1; border-radius: 4px; padding: 1px;">
              </div>

              <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed #cbd5e1; padding-top: 8px;">
                <label style="font-size: 11px; font-weight: 600;">Show Task Connectors (FS Arrows):</label>
                <input type="checkbox" id="setShowConnectors" ${ganttSettings.showConnectors ? 'checked' : ''}>
              </div>

              <div style="display: flex; justify-content: space-between; align-items: center;">
                <label style="font-size: 11px; font-weight: 600;">Show S-Curve Cumulative Accomplishment:</label>
                <input type="checkbox" id="setShowScurve" ${ganttSettings.showScurve ? 'checked' : ''}>
              </div>
            </div>
          </div>

          <div class="tg-modal-footer">
            <button type="button" class="tg-tool-btn" onclick="TimelineGanttStudio.closeStyleSettings()">Cancel</button>
            <button type="button" class="tg-tool-btn primary" onclick="TimelineGanttStudio.applyStyleSettings()">Apply Style Settings</button>
          </div>
        </div>
      </div>
    `;
  }

  function openStyleSettings() {
    const modal = document.getElementById('tgStyleSettingsModal');
    if (modal) modal.classList.add('show');
  }

  function closeStyleSettings() {
    const modal = document.getElementById('tgStyleSettingsModal');
    if (modal) modal.classList.remove('show');
  }

  function applyStyleSettings() {
    const getVal = (id, def) => {
      const el = document.getElementById(id);
      return el ? (parseFloat(el.value) || def) : def;
    };
    ganttSettings.barHeight = getVal('setGanttBarH', 16);
    ganttSettings.rowHeight = getVal('setGanttRowH', 38);
    ganttSettings.colWidthDays = getVal('setColWDays', 34);
    ganttSettings.colWidthWeeks = getVal('setColWWeeks', 68);
    ganttSettings.colWidthMonths = getVal('setColWMonths', 110);
    ganttSettings.colWidthQuarters = getVal('setColWQuarters', 200);

    const c1 = document.getElementById('setTaskColor');
    if (c1) ganttSettings.taskColor = c1.value;
    const c2 = document.getElementById('setCriticalColor');
    if (c2) ganttSettings.criticalColor = c2.value;
    const c3 = document.getElementById('setActualColor');
    if (c3) ganttSettings.actualColor = c3.value;

    const cb1 = document.getElementById('setShowConnectors');
    if (cb1) ganttSettings.showConnectors = cb1.checked;
    const cb2 = document.getElementById('setShowScurve');
    if (cb2) ganttSettings.showScurve = cb2.checked;

    closeStyleSettings();
    saveSchedule(true);
    renderMainGanttView();
  }

  // ==========================================================================
  // MODAL 4: ADD ACTIVITY MODAL
  // ==========================================================================
  function buildAddActivityModalHtml() {
    return `
      <div class="tg-modal-overlay" id="tgAddActivityModal">
        <div class="tg-modal-dialog" style="width: 500px; max-width: 95vw;">
          <div class="tg-modal-header">
            <h3 class="tg-modal-title">
              <span>➕ Add Schedule Activity</span>
            </h3>
            <button type="button" class="tg-tool-btn" onclick="TimelineGanttStudio.closeAddActivityModal()">✕</button>
          </div>

          <div class="tg-modal-body" style="padding: 16px; display: flex; flex-direction: column; gap: 10px;">
            <div>
              <label style="font-size: 11px; font-weight: 700; color: #475569;">Activity Code:</label>
              <input type="text" id="tgNewActCode" value="T-180" style="width: 100%; height: 28px; border: 1px solid #cbd5e1; border-radius: 4px; padding: 0 8px; font-size: 11.5px; font-weight: 700;">
            </div>
            <div>
              <label style="font-size: 11px; font-weight: 700; color: #475569;">Work Description:</label>
              <input type="text" id="tgNewActTitle" placeholder="e.g. Electrical Conduit & Rough-in Installation" style="width: 100%; height: 28px; border: 1px solid #cbd5e1; border-radius: 4px; padding: 0 8px; font-size: 11.5px;">
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <div>
                <label style="font-size: 11px; font-weight: 700; color: #475569;">Start Date:</label>
                <input type="date" id="tgNewActStart" value="${currentDate}" style="width: 100%; height: 28px; border: 1px solid #cbd5e1; border-radius: 4px; padding: 0 8px; font-size: 11px;">
              </div>
              <div>
                <label style="font-size: 11px; font-weight: 700; color: #475569;">Duration (Days):</label>
                <input type="number" id="tgNewActDur" value="15" min="1" style="width: 100%; height: 28px; border: 1px solid #cbd5e1; border-radius: 4px; padding: 0 8px; font-size: 11px; font-weight: 700;">
              </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <div>
                <label style="font-size: 11px; font-weight: 700; color: #475569;">Predecessors:</label>
                <input type="text" id="tgNewActPred" placeholder="e.g. 03.01.05 (FS)" style="width: 100%; height: 28px; border: 1px solid #cbd5e1; border-radius: 4px; padding: 0 8px; font-size: 11px;">
              </div>
              <div>
                <label style="font-size: 11px; font-weight: 700; color: #475569;">Estimated Budget (PHP):</label>
                <input type="number" id="tgNewActCost" value="250000" min="0" style="width: 100%; height: 28px; border: 1px solid #cbd5e1; border-radius: 4px; padding: 0 8px; font-size: 11px; font-weight: 700;">
              </div>
            </div>
          </div>

          <div class="tg-modal-footer">
            <button type="button" class="tg-tool-btn" onclick="TimelineGanttStudio.closeAddActivityModal()">Cancel</button>
            <button type="button" class="tg-tool-btn primary" onclick="TimelineGanttStudio.saveNewActivity()">+ Insert Activity</button>
          </div>
        </div>
      </div>
    `;
  }

  function openAddActivityModal() {
    const modal = document.getElementById('tgAddActivityModal');
    if (modal) modal.classList.add('show');
  }

  function closeAddActivityModal() {
    const modal = document.getElementById('tgAddActivityModal');
    if (modal) modal.classList.remove('show');
  }

  function saveNewActivity() {
    const code = document.getElementById('tgNewActCode')?.value || `T-${boqData.length + 1}`;
    const title = document.getElementById('tgNewActTitle')?.value || `New Activity ${boqData.length + 1}`;
    const sDate = document.getElementById('tgNewActStart')?.value || currentDate;
    const dur = parseInt(document.getElementById('tgNewActDur')?.value, 10) || 10;
    const pred = document.getElementById('tgNewActPred')?.value || '';
    const cost = parseFloat(document.getElementById('tgNewActCost')?.value) || 0;

    const s = parseDate(sDate) || new Date();
    const e = addDays(s, dur);

    pushUndoState();
    boqData.push({
      id: 'task_' + Date.now(),
      type: 'subsubcategory',
      code: code,
      title: title,
      specification: '',
      qty: 1,
      unit: 'lot',
      materialUnitCost: cost * 0.6,
      laborUnitCost: cost * 0.4,
      grandTotalCost: cost,
      ganttStartDate: formatDate(s),
      startDate: formatDate(s),
      ganttFinishDate: formatDate(e),
      finishDate: formatDate(e),
      ganttDuration: dur,
      days: dur,
      ganttProgress: 0,
      percentDone: 0,
      ganttPredecessors: pred,
      isCritical: false
    });

    closeAddActivityModal();
    saveSchedule(true);
    renderMainGanttView();
  }

  // --- Public Interface ---
  return {
    render,
    recalculateProgressPercentDay,
    onCurrentDateChange,
    onProjectStartChange,
    setScale,
    setMonthFilter,
    toggleFilterRowsByMonth,
    renderMainGanttView,
    toggleCoordinates,
    toggleHighlightDropdown,
    setHighlightMode,
    toggleUpdateDataDropdown,
    toggleFullView,
    onCellSelect,
    onRowClick,
    updateRowDate,
    updateRowDuration,
    updateRowPredecessors,
    updateRowProgress,
    filterTasks,
    undo,
    saveSchedule,
    exportToExcel,
    showUpdateQtyInst,
    closeQtyInstModal,
    setQtyModalScale,
    setQtyModalView,
    setQtyModalMonth,
    updatePeriodQty,
    updateTotalInstalledQty,
    startQtyDividerDrag,
    toggleQtyHighlightDropdown,
    setQtyHighlightMode,
    highlightQtyRow,
    hoverQtyRow,
    syncQtyRowHeights,
    renderQtyModalTables,
    getAccumulatedCostToDate,
    getAccomplishedCost,
    getInstalledQty,
    getMaxCutoffDate,
    getGanttSummaryTaskTimelineValue,
    showBillingRecord,
    closeBillingRecordModal,
    onBillingCycleSelect,
    addNewBillingCycle,
    recalculateBillingCertificate,
    openStyleSettings,
    closeStyleSettings,
    applyStyleSettings,
    openAddActivityModal,
    closeAddActivityModal,
    saveNewActivity,
    startDividerDrag,
    triggerScheduleImport,
    handleScheduleFileImport,
    switchRibbonTab: (tab) => {
      document.querySelectorAll('.tg-ribbon-tab').forEach(t => t.classList.remove('active'));
      const active = Array.from(document.querySelectorAll('.tg-ribbon-tab')).find(t => t.textContent.toLowerCase().includes(tab));
      if (active) active.classList.add('active');
    }
  };
});

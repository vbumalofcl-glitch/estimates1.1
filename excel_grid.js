/**
 * Excel-Like Fillable Grid Engine
 * Features:
 * 1. Cell Focus & Selection Box Overlay
 * 2. Fill Handle / Autofill Engine (Drag bottom-right square to extend series or formulas)
 * 3. Inline Cell Editing (Double-click, typing directly, or F2/Enter)
 * 4. Keyboard Navigation (Arrows, Tab, Enter, Escape, Delete, Backspace)
 * 5. Formula Evaluation (=SUM, =AVERAGE, =COUNT, =MIN, =MAX, math operations)
 * 6. Status Bar Metrics (Sum, Avg, Count, Min, Max)
 * 7. Undo/Redo & Formatting Options
 */

(function () {
  // Configuration
  let NUM_ROWS = 40;
  let NUM_COLS = 20;
  const DEFAULT_COL_WIDTH = 110;

  // Grid Data Matrix
  // Each cell: { raw: string, value: string, formula: string, bold: false, italic: false, align: 'left' }
  let gridData = [];

  // Selection State
  let activeRow = 0;
  let activeCol = 0;
  let selectionStart = { row: 0, col: 0 };
  let selectionEnd = { row: 0, col: 0 };
  let isSelectingRange = false;

  // Fill Handle Drag State
  let isDraggingFillHandle = false;
  let fillTargetEnd = { row: 0, col: 0 };

  // Edit State
  let isEditing = false;

  // History Stack
  const undoStack = [];
  const redoStack = [];

  // DOM Elements
  const viewport = document.getElementById('gridViewport');
  const table = document.getElementById('gridTable');
  const selectionBox = document.getElementById('selectionBox');
  const fillHandle = document.getElementById('fillHandle');
  const fillPreviewBox = document.getElementById('fillPreviewBox');
  const inlineEditor = document.getElementById('inlineEditor');
  const formulaInput = document.getElementById('formulaInput');
  const cellAddressBox = document.getElementById('cellAddress');
  const statusMode = document.getElementById('statusMode');
  const contextMenu = document.getElementById('contextMenu');

  // Stats DOM
  const statAverage = document.getElementById('statAverage');
  const statCount = document.getElementById('statCount');
  const statMin = document.getElementById('statMin');
  const statMax = document.getElementById('statMax');
  const statSum = document.getElementById('statSum');

  // --- Helper Functions ---
  function getColLetter(index) {
    let letter = '';
    while (index >= 0) {
      letter = String.fromCharCode((index % 26) + 65) + letter;
      index = Math.floor(index / 26) - 1;
    }
    return letter;
  }

  function colLetterToIndex(letter) {
    let index = 0;
    const str = letter.toUpperCase();
    for (let i = 0; i < str.length; i++) {
      index = index * 26 + (str.charCodeAt(i) - 64);
    }
    return index - 1;
  }

  function getCellCoordStr(row, col) {
    return `${getColLetter(col)}${row + 1}`;
  }

  function parseCellCoord(coordStr) {
    const match = coordStr.toUpperCase().match(/^([A-Z]+)(\d+)$/);
    if (!match) return null;
    return {
      col: colLetterToIndex(match[1]),
      row: parseInt(match[2], 10) - 1
    };
  }

  // --- Grid Matrix Initialization ---
  function initGridData() {
    gridData = [];
    for (let r = 0; r < NUM_ROWS; r++) {
      const row = [];
      for (let c = 0; c < NUM_COLS; c++) {
        row.push({
          raw: '',
          value: '',
          bold: false,
          italic: false,
          align: 'left'
        });
      }
      gridData.push(row);
    }

    // Populate Sample Data for Demonstration
    populateSampleData();
  }

  function populateSampleData() {
    // Header title
    gridData[0][0] = { raw: 'MONTHLY EXPENSES & BUDGET', value: 'MONTHLY EXPENSES & BUDGET', bold: true, italic: false, align: 'left' };
    
    // Table Headers
    const headers = ['Item Description', 'Q1 Budget', 'Q2 Budget', 'Actual Spend', 'Variance', 'Growth Factor'];
    headers.forEach((h, colIdx) => {
      gridData[2][colIdx] = { raw: h, value: h, bold: true, italic: false, align: 'center' };
    });

    // Sample Rows
    const samples = [
      ['Software Licenses', 1200, 1400, 1350, '=D4-C4', 1.05],
      ['Cloud Hosting (AWS)', 3500, 3800, 3950, '=D5-C5', 1.08],
      ['Office Supplies', 450, 400, 420, '=D6-C6', 1.02],
      ['Marketing Campaign', 2500, 3000, 2800, '=D7-C7', 1.10],
      ['Equipment Maintenance', 800, 850, 810, '=D8-C8', 1.04],
      ['Travel Expenses', 1500, 1600, 1750, '=D9-C9', 1.06]
    ];

    samples.forEach((rowData, rOffset) => {
      const r = 3 + rOffset;
      rowData.forEach((val, c) => {
        const rawStr = String(val);
        gridData[r][c] = {
          raw: rawStr,
          value: rawStr,
          bold: false,
          italic: false,
          align: typeof val === 'number' || rawStr.startsWith('=') ? 'right' : 'left'
        };
      });
    });

    // Summary Formula Row
    gridData[10][0] = { raw: 'TOTAL COST', value: 'TOTAL COST', bold: true, italic: false, align: 'left' };
    gridData[10][1] = { raw: '=SUM(B4:B9)', value: '', bold: true, italic: false, align: 'right' };
    gridData[10][2] = { raw: '=SUM(C4:C9)', value: '', bold: true, italic: false, align: 'right' };
    gridData[10][3] = { raw: '=SUM(D4:D9)', value: '', bold: true, italic: false, align: 'right' };
    gridData[10][4] = { raw: '=AVERAGE(E4:E9)', value: '', bold: true, italic: false, align: 'right' };

    // Autofill Demo Series
    gridData[13][0] = { raw: 'Autofill Test (Drag Handle ↓)', value: 'Autofill Test (Drag Handle ↓)', bold: true, italic: true, align: 'left' };
    gridData[14][0] = { raw: 'Day 1', value: 'Day 1', bold: false, italic: false, align: 'left' };
    gridData[14][1] = { raw: '100', value: '100', bold: false, italic: false, align: 'right' };
    gridData[15][1] = { raw: '200', value: '200', bold: false, italic: false, align: 'right' };

    reevaluateAllFormulas();
  }

  // --- Formula Parser & Engine ---
  function evaluateFormula(formulaStr, visited = new Set()) {
    if (!formulaStr.startsWith('=')) return formulaStr;

    const expr = formulaStr.substring(1).trim().toUpperCase();

    // Check for SUM: =SUM(A1:A10)
    const sumMatch = expr.match(/^SUM\(([A-Z]+\d+):([A-Z]+\d+)\)$/);
    if (sumMatch) {
      const start = parseCellCoord(sumMatch[1]);
      const end = parseCellCoord(sumMatch[2]);
      if (start && end) {
        let sum = 0;
        const minR = Math.min(start.row, end.row);
        const maxR = Math.max(start.row, end.row);
        const minC = Math.min(start.col, end.col);
        const maxC = Math.max(start.col, end.col);
        for (let r = minR; r <= maxR; r++) {
          for (let c = minC; c <= maxC; c++) {
            const val = getCellValueAsNumber(r, c, visited);
            sum += val;
          }
        }
        return sum;
      }
    }

    // Check for AVERAGE: =AVERAGE(A1:A10)
    const avgMatch = expr.match(/^AVERAGE\(([A-Z]+\d+):([A-Z]+\d+)\)$/);
    if (avgMatch) {
      const start = parseCellCoord(avgMatch[1]);
      const end = parseCellCoord(avgMatch[2]);
      if (start && end) {
        let sum = 0;
        let count = 0;
        const minR = Math.min(start.row, end.row);
        const maxR = Math.max(start.row, end.row);
        const minC = Math.min(start.col, end.col);
        const maxC = Math.max(start.col, end.col);
        for (let r = minR; r <= maxR; r++) {
          for (let c = minC; c <= maxC; c++) {
            const val = getCellValueAsNumber(r, c, visited);
            sum += val;
            count++;
          }
        }
        return count > 0 ? (sum / count) : 0;
      }
    }

    // Check for COUNT: =COUNT(A1:A10)
    const countMatch = expr.match(/^COUNT\(([A-Z]+\d+):([A-Z]+\d+)\)$/);
    if (countMatch) {
      const start = parseCellCoord(countMatch[1]);
      const end = parseCellCoord(countMatch[2]);
      if (start && end) {
        let count = 0;
        const minR = Math.min(start.row, end.row);
        const maxR = Math.max(start.row, end.row);
        const minC = Math.min(start.col, end.col);
        const maxC = Math.max(start.col, end.col);
        for (let r = minR; r <= maxR; r++) {
          for (let c = minC; c <= maxC; c++) {
            const cell = gridData[r] && gridData[r][c];
            if (cell && cell.value !== '' && !isNaN(Number(cell.value))) count++;
          }
        }
        return count;
      }
    }

    // Evaluate basic math expressions e.g. =A1+B1 or =D4-C4
    try {
      let substitutedExpr = expr.replace(/([A-Z]+\d+)/g, (match) => {
        const coord = parseCellCoord(match);
        if (!coord) return '0';
        return getCellValueAsNumber(coord.row, coord.col, visited);
      });

      // Basic arithmetic evaluation safety check
      if (/^[0-9+\-*/().\s]+$/.test(substitutedExpr)) {
        // eslint-disable-next-line no-eval
        const result = Function('"use strict"; return (' + substitutedExpr + ')')();
        return typeof result === 'number' && !isNaN(result) ? result : '#VALUE!';
      }
    } catch (e) {
      return '#ERROR!';
    }

    return '#NAME?';
  }

  function getCellValueAsNumber(r, c, visited) {
    if (r < 0 || r >= NUM_ROWS || c < 0 || c >= NUM_COLS) return 0;
    const cellKey = `${r},${c}`;
    if (visited.has(cellKey)) return 0; // Prevent circular reference recursion
    visited.add(cellKey);

    const cell = gridData[r][c];
    if (!cell) return 0;
    let val = cell.value;
    if (typeof cell.raw === 'string' && cell.raw.startsWith('=')) {
      val = evaluateFormula(cell.raw, visited);
    }
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  }

  function reevaluateAllFormulas() {
    for (let r = 0; r < NUM_ROWS; r++) {
      for (let c = 0; c < NUM_COLS; c++) {
        const cell = gridData[r][c];
        if (cell && typeof cell.raw === 'string' && cell.raw.startsWith('=')) {
          const evalRes = evaluateFormula(cell.raw, new Set());
          cell.value = typeof evalRes === 'number' ? (Number.isInteger(evalRes) ? evalRes : evalRes.toFixed(2)) : String(evalRes);
        } else if (cell) {
          cell.value = cell.raw;
        }
      }
    }
  }

  // --- Render DOM Table ---
  function renderGridTable() {
    let html = '<thead><tr><th class="header-corner"></th>';
    for (let c = 0; c < NUM_COLS; c++) {
      html += `<th class="col-header" id="colHeader-${c}" style="width: ${DEFAULT_COL_WIDTH}px;">${getColLetter(c)}</th>`;
    }
    html += '</tr></thead><tbody>';

    for (let r = 0; r < NUM_ROWS; r++) {
      html += `<tr><td class="row-header" id="rowHeader-${r}">${r + 1}</td>`;
      for (let c = 0; c < NUM_COLS; c++) {
        const cell = gridData[r][c];
        let classNames = 'grid-cell';
        if (cell.align) classNames += ` align-${cell.align}`;
        if (cell.bold) classNames += ' font-bold';
        if (cell.italic) classNames += ' font-italic';

        html += `<td class="${classNames}" id="cell-${r}-${c}" data-row="${r}" data-col="${c}">${escapeHtml(String(cell.value))}</td>`;
      }
      html += '</tr>';
    }
    html += 'tbody>';
    table.innerHTML = html;

    attachCellEventListeners();
  }

  function updateCellDOM(r, c) {
    const td = document.getElementById(`cell-${r}-${c}`);
    if (!td) return;
    const cell = gridData[r][c];
    td.textContent = cell.value;
    td.className = 'grid-cell' +
      (cell.align ? ` align-${cell.align}` : '') +
      (cell.bold ? ' font-bold' : '') +
      (cell.italic ? ' font-italic' : '');
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // --- Selection & Focus Management ---
  function setSelection(startRow, startCol, endRow = startRow, endCol = startCol) {
    // Clamp coordinates
    activeRow = Math.max(0, Math.min(NUM_ROWS - 1, startRow));
    activeCol = Math.max(0, Math.min(NUM_COLS - 1, startCol));
    selectionStart = { row: activeRow, col: activeCol };
    selectionEnd = {
      row: Math.max(0, Math.min(NUM_ROWS - 1, endRow)),
      col: Math.max(0, Math.min(NUM_COLS - 1, endCol))
    };

    updateSelectionUI();
    updateFormulaBar();
    updateStatusBar();
  }

  function updateSelectionUI() {
    const minR = Math.min(selectionStart.row, selectionEnd.row);
    const maxR = Math.max(selectionStart.row, selectionEnd.row);
    const minC = Math.min(selectionStart.col, selectionEnd.col);
    const maxC = Math.max(selectionStart.col, selectionEnd.col);

    // Clear previous cell range highlights and active header indicators
    document.querySelectorAll('.grid-cell.in-range').forEach(el => el.classList.remove('in-range'));
    document.querySelectorAll('.col-header.active-header').forEach(el => el.classList.remove('active-header'));
    document.querySelectorAll('.row-header.active-header').forEach(el => el.classList.remove('active-header'));

    // Highlight selected range cells & headers
    for (let r = minR; r <= maxR; r++) {
      const rowH = document.getElementById(`rowHeader-${r}`);
      if (rowH) rowH.classList.add('active-header');

      for (let c = minC; c <= maxC; c++) {
        const td = document.getElementById(`cell-${r}-${c}`);
        if (td) td.classList.add('in-range');
      }
    }

    for (let c = minC; c <= maxC; c++) {
      const colH = document.getElementById(`colHeader-${c}`);
      if (colH) colH.classList.add('active-header');
    }

    // Position Selection Box Overlay around selected cells range
    const startTd = document.getElementById(`cell-${minR}-${minC}`);
    const endTd = document.getElementById(`cell-${maxR}-${maxC}`);

    if (startTd && endTd) {
      const startRect = startTd.getBoundingClientRect();
      const endRect = endTd.getBoundingClientRect();
      const viewportRect = viewport.getBoundingClientRect();

      const left = startRect.left - viewportRect.left + viewport.scrollLeft;
      const top = startRect.top - viewportRect.top + viewport.scrollTop;
      const width = endRect.right - startRect.left;
      const height = endRect.bottom - startRect.top;

      selectionBox.style.left = `${left}px`;
      selectionBox.style.top = `${top}px`;
      selectionBox.style.width = `${width}px`;
      selectionBox.style.height = `${height}px`;
      selectionBox.style.display = 'block';
    }

    // Hide inline editor if open elsewhere
    if (!isEditing) {
      inlineEditor.style.display = 'none';
    }
  }

  function updateFormulaBar() {
    cellAddressBox.textContent = getCellCoordStr(activeRow, activeCol);
    const cell = gridData[activeRow][activeCol];
    formulaInput.value = cell ? cell.raw : '';
  }

  function updateStatusBar() {
    const minR = Math.min(selectionStart.row, selectionEnd.row);
    const maxR = Math.max(selectionStart.row, selectionEnd.row);
    const minC = Math.min(selectionStart.col, selectionEnd.col);
    const maxC = Math.max(selectionStart.col, selectionEnd.col);

    let count = 0;
    let sum = 0;
    let min = Infinity;
    let max = -Infinity;
    let hasNumeric = false;

    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        const cell = gridData[r][c];
        if (cell && cell.value !== '') {
          count++;
          const num = Number(cell.value);
          if (!isNaN(num)) {
            hasNumeric = true;
            sum += num;
            if (num < min) min = num;
            if (num > max) max = num;
          }
        }
      }
    }

    statCount.textContent = count;
    if (hasNumeric && count > 0) {
      statAverage.textContent = (sum / count).toFixed(2);
      statSum.textContent = Number.isInteger(sum) ? sum : sum.toFixed(2);
      statMin.textContent = min;
      statMax.textContent = max;
    } else {
      statAverage.textContent = '-';
      statSum.textContent = '-';
      statMin.textContent = '-';
      statMax.textContent = '-';
    }
  }

  // --- Inline Cell Editing ---
  function startInlineEdit(initialChar = null) {
    isEditing = true;
    statusMode.textContent = 'EDIT';

    const td = document.getElementById(`cell-${activeRow}-${activeCol}`);
    if (!td) return;

    const cell = gridData[activeRow][activeCol];
    const rect = td.getBoundingClientRect();
    const viewportRect = viewport.getBoundingClientRect();

    const left = rect.left - viewportRect.left + viewport.scrollLeft;
    const top = rect.top - viewportRect.top + viewport.scrollTop;

    inlineEditor.style.left = `${left}px`;
    inlineEditor.style.top = `${top}px`;
    inlineEditor.style.width = `${rect.width}px`;
    inlineEditor.style.height = `${rect.height}px`;

    if (initialChar !== null) {
      inlineEditor.value = initialChar;
    } else {
      inlineEditor.value = cell.raw;
    }

    inlineEditor.style.display = 'block';
    inlineEditor.focus();
    if (initialChar === null) {
      inlineEditor.select();
    }
  }

  function commitInlineEdit() {
    if (!isEditing) return;

    saveHistoryState();
    const newValue = inlineEditor.value;
    const cell = gridData[activeRow][activeCol];
    cell.raw = newValue;
    cell.value = newValue;

    isEditing = false;
    inlineEditor.style.display = 'none';
    statusMode.textContent = 'READY';

    reevaluateAllFormulas();
    renderGridTable();
    updateSelectionUI();
    updateFormulaBar();
    updateStatusBar();
  }

  function cancelInlineEdit() {
    if (!isEditing) return;
    isEditing = false;
    inlineEditor.style.display = 'none';
    statusMode.textContent = 'READY';
    updateFormulaBar();
  }

  // --- Autofill & Fill Handle Engine ---
  function attachFillHandleListeners() {
    fillHandle.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      isDraggingFillHandle = true;
      statusMode.textContent = 'DRAG FILL';

      document.addEventListener('mousemove', onFillHandleMouseMove);
      document.addEventListener('mouseup', onFillHandleMouseUp);
    });
  }

  function onFillHandleMouseMove(e) {
    if (!isDraggingFillHandle) return;

    // Find cell under mouse
    const element = document.elementFromPoint(e.clientX, e.clientY);
    if (!element) return;
    const td = element.closest('.grid-cell');
    if (!td) return;

    const r = parseInt(td.dataset.row, 10);
    const c = parseInt(td.dataset.col, 10);
    fillTargetEnd = { row: r, col: c };

    // Render Preview Box boundary
    const minR = Math.min(selectionStart.row, selectionEnd.row, fillTargetEnd.row);
    const maxR = Math.max(selectionStart.row, selectionEnd.row, fillTargetEnd.row);
    const minC = Math.min(selectionStart.col, selectionEnd.col, fillTargetEnd.col);
    const maxC = Math.max(selectionStart.col, selectionEnd.col, fillTargetEnd.col);

    const startTd = document.getElementById(`cell-${minR}-${minC}`);
    const endTd = document.getElementById(`cell-${maxR}-${maxC}`);

    if (startTd && endTd) {
      const startRect = startTd.getBoundingClientRect();
      const endRect = endTd.getBoundingClientRect();
      const viewportRect = viewport.getBoundingClientRect();

      const left = startRect.left - viewportRect.left + viewport.scrollLeft;
      const top = startRect.top - viewportRect.top + viewport.scrollTop;
      const width = endRect.right - startRect.left;
      const height = endRect.bottom - startRect.top;

      fillPreviewBox.style.left = `${left}px`;
      fillPreviewBox.style.top = `${top}px`;
      fillPreviewBox.style.width = `${width}px`;
      fillPreviewBox.style.height = `${height}px`;
      fillPreviewBox.style.display = 'block';
    }
  }

  function onFillHandleMouseUp(e) {
    if (!isDraggingFillHandle) return;

    isDraggingFillHandle = false;
    fillPreviewBox.style.display = 'none';
    statusMode.textContent = 'READY';

    document.removeEventListener('mousemove', onFillHandleMouseMove);
    document.removeEventListener('mouseup', onFillHandleMouseUp);

    performAutofill();
  }

  function performAutofill() {
    const srcMinR = Math.min(selectionStart.row, selectionEnd.row);
    const srcMaxR = Math.max(selectionStart.row, selectionEnd.row);
    const srcMinC = Math.min(selectionStart.col, selectionEnd.col);
    const srcMaxC = Math.max(selectionStart.col, selectionEnd.col);

    const targetR = fillTargetEnd.row;
    const targetC = fillTargetEnd.col;

    saveHistoryState();

    // Fill Downwards / Upwards
    if (targetR > srcMaxR) {
      const fillHeight = srcMaxR - srcMinR + 1;
      for (let r = srcMaxR + 1; r <= targetR; r++) {
        const offsetR = (r - srcMaxR - 1) % fillHeight;
        const sourceRow = srcMinR + offsetR;
        for (let c = srcMinC; c <= srcMaxC; c++) {
          autofillCell(sourceRow, c, r, c, (r - sourceRow), 0);
        }
      }
      selectionEnd.row = targetR;
    } else if (targetC > srcMaxC) {
      // Fill Rightwards
      const fillWidth = srcMaxC - srcMinC + 1;
      for (let c = srcMaxC + 1; c <= targetC; c++) {
        const offsetC = (c - srcMaxC - 1) % fillWidth;
        const sourceCol = srcMinC + offsetC;
        for (let r = srcMinR; r <= srcMaxR; r++) {
          autofillCell(r, sourceCol, r, c, 0, (c - sourceCol));
        }
      }
      selectionEnd.col = targetC;
    }

    reevaluateAllFormulas();
    renderGridTable();
    updateSelectionUI();
    updateFormulaBar();
    updateStatusBar();
  }

  function autofillCell(srcR, srcC, destR, destC, rowOffset, colOffset) {
    const srcCell = gridData[srcR][srcC];
    if (!srcCell) return;

    let newRaw = srcCell.raw;

    // 1. Formula Fill (Smart Relative Offset Update e.g. =B4+C4 -> =B5+C5)
    if (typeof newRaw === 'string' && newRaw.startsWith('=')) {
      newRaw = newRaw.replace(/([A-Z]+)(\d+)/g, (match, p1, p2) => {
        const colIndex = colLetterToIndex(p1) + colOffset;
        const rowIndex = parseInt(p2, 10) + rowOffset;
        return `${getColLetter(colIndex)}${rowIndex}`;
      });
    } else if (!isNaN(Number(newRaw)) && newRaw !== '') {
      // 2. Numeric Series Fill (Detect arithmetic progression e.g. 100, 200 -> 300)
      const numVal = Number(newRaw);
      // Check if previous adjacent cell exists for step pattern
      const prevR = srcR - 1;
      if (prevR >= 0 && !isNaN(Number(gridData[prevR][srcC].raw)) && gridData[prevR][srcC].raw !== '') {
        const prevNum = Number(gridData[prevR][srcC].raw);
        const step = numVal - prevNum;
        const stepMultiplier = Math.floor((destR - srcR));
        newRaw = String(numVal + (step * stepMultiplier));
      } else {
        newRaw = String(numVal + rowOffset + colOffset);
      }
    } else if (typeof newRaw === 'string' && /^Day\s+\d+$/i.test(newRaw)) {
      // 3. Pattern text fill e.g. Day 1 -> Day 2
      const match = newRaw.match(/^Day\s+(\d+)$/i);
      if (match) {
        const nextNum = parseInt(match[1], 10) + rowOffset + colOffset;
        newRaw = `Day ${nextNum}`;
      }
    }

    gridData[destR][destC] = {
      raw: newRaw,
      value: newRaw,
      bold: srcCell.bold,
      italic: srcCell.italic,
      align: srcCell.align
    };
  }

  // --- Keyboard Controller & Navigation ---
  function attachKeyboardListeners() {
    document.addEventListener('keydown', (e) => {
      // Inline Editing Mode Key Handlers
      if (isEditing) {
        if (e.key === 'Enter') {
          e.preventDefault();
          commitInlineEdit();
          setSelection(activeRow + 1, activeCol);
        } else if (e.key === 'Tab') {
          e.preventDefault();
          commitInlineEdit();
          setSelection(activeRow, e.shiftKey ? activeCol - 1 : activeCol + 1);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          cancelInlineEdit();
        }
        return;
      }

      // Formula Bar Focus Override
      if (document.activeElement === formulaInput) {
        if (e.key === 'Enter') {
          saveHistoryState();
          gridData[activeRow][activeCol].raw = formulaInput.value;
          reevaluateAllFormulas();
          renderGridTable();
          updateSelectionUI();
          updateStatusBar();
          formulaInput.blur();
        }
        return;
      }

      // Grid Navigation Mode Key Handlers
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelection(activeRow - 1, activeCol);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelection(activeRow + 1, activeCol);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setSelection(activeRow, activeCol - 1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setSelection(activeRow, activeCol + 1);
      } else if (e.key === 'Tab') {
        e.preventDefault();
        setSelection(activeRow, e.shiftKey ? activeCol - 1 : activeCol + 1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey) {
          setSelection(activeRow - 1, activeCol);
        } else {
          setSelection(activeRow + 1, activeCol);
        }
      } else if (e.key === 'F2') {
        e.preventDefault();
        startInlineEdit();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        clearSelectedRange();
      } else if (e.key === 'Escape') {
        setSelection(activeRow, activeCol);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleFormat('bold');
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        toggleFormat('italic');
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Direct typing activates inline edit
        startInlineEdit(e.key);
      }
    });
  }

  function clearSelectedRange() {
    saveHistoryState();
    const minR = Math.min(selectionStart.row, selectionEnd.row);
    const maxR = Math.max(selectionStart.row, selectionEnd.row);
    const minC = Math.min(selectionStart.col, selectionEnd.col);
    const maxC = Math.max(selectionStart.col, selectionEnd.col);

    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        gridData[r][c].raw = '';
        gridData[r][c].value = '';
      }
    }

    reevaluateAllFormulas();
    renderGridTable();
    updateSelectionUI();
    updateFormulaBar();
    updateStatusBar();
  }

  // --- Cell Mouse Event Listeners ---
  function attachCellEventListeners() {
    table.addEventListener('mousedown', (e) => {
      const td = e.target.closest('.grid-cell');
      if (!td) return;

      const r = parseInt(td.dataset.row, 10);
      const c = parseInt(td.dataset.col, 10);

      if (e.shiftKey) {
        setSelection(selectionStart.row, selectionStart.col, r, c);
      } else {
        isSelectingRange = true;
        setSelection(r, c);
      }

      document.addEventListener('mousemove', onCellMouseMove);
      document.addEventListener('mouseup', onCellMouseUp);
    });

    table.addEventListener('dblclick', (e) => {
      const td = e.target.closest('.grid-cell');
      if (!td) return;
      startInlineEdit();
    });

    table.addEventListener('contextmenu', (e) => {
      const td = e.target.closest('.grid-cell');
      if (!td) return;
      e.preventDefault();
      showContextMenu(e.clientX, e.clientY);
    });
  }

  function onCellMouseMove(e) {
    if (!isSelectingRange) return;
    const element = document.elementFromPoint(e.clientX, e.clientY);
    if (!element) return;
    const td = element.closest('.grid-cell');
    if (!td) return;

    const r = parseInt(td.dataset.row, 10);
    const c = parseInt(td.dataset.col, 10);

    setSelection(selectionStart.row, selectionStart.col, r, c);
  }

  function onCellMouseUp() {
    isSelectingRange = false;
    document.removeEventListener('mousemove', onCellMouseMove);
    document.removeEventListener('mouseup', onCellMouseUp);
  }

  // --- Toolbar & Context Actions ---
  function saveHistoryState() {
    undoStack.push(JSON.stringify(gridData));
    if (undoStack.length > 50) undoStack.shift();
    redoStack.length = 0; // Clear redo stack
  }

  window.undo = function () {
    if (undoStack.length === 0) return;
    redoStack.push(JSON.stringify(gridData));
    gridData = JSON.parse(undoStack.pop());
    reevaluateAllFormulas();
    renderGridTable();
    updateSelectionUI();
    updateFormulaBar();
    updateStatusBar();
  };

  window.redo = function () {
    if (redoStack.length === 0) return;
    undoStack.push(JSON.stringify(gridData));
    gridData = JSON.parse(redoStack.pop());
    reevaluateAllFormulas();
    renderGridTable();
    updateSelectionUI();
    updateFormulaBar();
    updateStatusBar();
  };

  window.toggleFormat = function (style) {
    saveHistoryState();
    const cell = gridData[activeRow][activeCol];
    if (style === 'bold') cell.bold = !cell.bold;
    if (style === 'italic') cell.italic = !cell.italic;
    updateCellDOM(activeRow, activeCol);
  };

  window.setTextAlign = function (align) {
    saveHistoryState();
    gridData[activeRow][activeCol].align = align;
    updateCellDOM(activeRow, activeCol);
  };

  window.insertRow = function () {
    saveHistoryState();
    NUM_ROWS++;
    const newRow = [];
    for (let c = 0; c < NUM_COLS; c++) {
      newRow.push({ raw: '', value: '', bold: false, italic: false, align: 'left' });
    }
    gridData.splice(activeRow, 0, newRow);
    reevaluateAllFormulas();
    renderGridTable();
    setSelection(activeRow, activeCol);
  };

  window.deleteRow = function () {
    if (NUM_ROWS <= 1) return;
    saveHistoryState();
    NUM_ROWS--;
    gridData.splice(activeRow, 1);
    reevaluateAllFormulas();
    renderGridTable();
    setSelection(Math.min(activeRow, NUM_ROWS - 1), activeCol);
  };

  window.insertColumn = function () {
    saveHistoryState();
    NUM_COLS++;
    for (let r = 0; r < NUM_ROWS; r++) {
      gridData[r].splice(activeCol, 0, { raw: '', value: '', bold: false, italic: false, align: 'left' });
    }
    reevaluateAllFormulas();
    renderGridTable();
    setSelection(activeRow, activeCol);
  };

  window.deleteColumn = function () {
    if (NUM_COLS <= 1) return;
    saveHistoryState();
    NUM_COLS--;
    for (let r = 0; r < NUM_ROWS; r++) {
      gridData[r].splice(activeCol, 1);
    }
    reevaluateAllFormulas();
    renderGridTable();
    setSelection(activeRow, Math.min(activeCol, NUM_COLS - 1));
  };

  window.exportCSV = function () {
    let csv = '';
    for (let r = 0; r < NUM_ROWS; r++) {
      const rowVals = [];
      for (let c = 0; c < NUM_COLS; c++) {
        rowVals.push(`"${String(gridData[r][c].value).replace(/"/g, '""')}"`);
      }
      csv += rowVals.join(',') + '\n';
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'grid_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  window.clearAllData = function () {
    if (confirm('Clear all grid cell contents?')) {
      saveHistoryState();
      initGridData();
      renderGridTable();
      setSelection(0, 0);
    }
  };

  function showContextMenu(x, y) {
    contextMenu.style.left = `${x}px`;
    contextMenu.style.top = `${y}px`;
    contextMenu.style.display = 'block';

    const closeHandler = () => {
      contextMenu.style.display = 'none';
      document.removeEventListener('click', closeHandler);
    };
    setTimeout(() => document.addEventListener('click', closeHandler), 10);
  }

  window.executeContextAction = function (action) {
    if (action === 'clear') clearSelectedRange();
    if (action === 'insertRow') insertRow();
    if (action === 'deleteRow') deleteRow();
    if (action === 'copy') {
      const cell = gridData[activeRow][activeCol];
      navigator.clipboard.writeText(cell.raw);
    }
  };

  // Synchronize formula input changes
  formulaInput.addEventListener('input', () => {
    if (document.activeElement === formulaInput) {
      gridData[activeRow][activeCol].raw = formulaInput.value;
    }
  });

  // Handle Window Resize
  window.addEventListener('resize', () => {
    updateSelectionUI();
  });

  // --- Initialize Grid Engine ---
  function init() {
    initGridData();
    renderGridTable();
    attachFillHandleListeners();
    attachKeyboardListeners();
    setSelection(3, 0);
  }

  init();
})();

/**
 * FCLDC Integrated Project Controls - Storage & Project Bundle Manager
 * Provides:
 *  1. IndexedDB + LocalStorage hybrid storage (eliminates 5MB quota limit)
 *  2. Master Project File Export & Import (.fclproj / .json)
 *  3. Live Dashboard Data Aggregation for Homepage
 *  4. Smart D.U.P.A. ↔ Price List Auto-Sync & Matching
 */

const FCL_STORAGE_KEYS = {
  priceList: 'cost_estimate_price_list_section_v1',
  dupa: 'cost_estimate_dupa_section_v1',
  boq: 'cost_estimate_boq_section_v1',
  cover: 'cost_estimate_cover_letter_section_v1',
  ganttSettings: 'cost_estimate_gantt_settings_v1',
  ganttStartDate: 'cost_estimate_gantt_start_v1',
  manpower: 'cost_estimate_manpower_section_v1'
};

const FCLStorage = {
  dbName: 'FCLDC_Estimates_DB',
  storeName: 'project_data',
  dbVersion: 1,
  _db: null,

  // Initialize IndexedDB
  async initDB() {
    if (this._db) return this._db;
    if (typeof window === 'undefined' || !window.indexedDB) {
      return null;
    }
    return new Promise((resolve) => {
      try {
        const request = window.indexedDB.open(this.dbName, this.dbVersion);
        request.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            db.createObjectStore(this.storeName);
          }
        };
        request.onsuccess = (e) => {
          this._db = e.target.result;
          resolve(this._db);
        };
        request.onerror = (e) => {
          console.warn('IndexedDB open error:', e);
          resolve(null);
        };
      } catch (err) {
        console.warn('IndexedDB not supported or blocked:', err);
        resolve(null);
      }
    });
  },

  // Save to both IndexedDB and localStorage (with quota handling)
  async save(key, data) {
    const raw = typeof data === 'string' ? data : JSON.stringify(data);
    
    // 1. Save to localStorage if possible
    try {
      localStorage.setItem(key, raw);
    } catch (e) {
      console.warn(`localStorage quota exceeded for key ${key}. Saving exclusively to IndexedDB.`);
    }

    // 2. Save to IndexedDB
    try {
      const db = await this.initDB();
      if (db) {
        return new Promise((resolve) => {
          const tx = db.transaction(this.storeName, 'readwrite');
          const store = tx.objectStore(this.storeName);
          const req = store.put(data, key);
          req.onsuccess = () => resolve(true);
          req.onerror = () => resolve(false);
        });
      }
    } catch (err) {
      console.error('IndexedDB save failed:', err);
    }
    return true;
  },

  // Read data with fallback to localStorage
  async load(key) {
    // Try IndexedDB first
    try {
      const db = await this.initDB();
      if (db) {
        const val = await new Promise((resolve) => {
          const tx = db.transaction(this.storeName, 'readonly');
          const store = tx.objectStore(this.storeName);
          const req = store.get(key);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(null);
        });
        if (val !== undefined && val !== null) return val;
      }
    } catch (e) {
      console.warn('IndexedDB read error, falling back to localStorage:', e);
    }

    // Fallback to localStorage
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (e) {
      return null;
    }
  },

  // Synchronous read from localStorage (for existing sync logic)
  readSync(key) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (e) {
      return null;
    }
  },

  // Synchronize IndexedDB records to localStorage on app load
  async syncToLocalStorage() {
    try {
      const db = await this.initDB();
      if (!db) return;
      for (const [_, key] of Object.entries(FCL_STORAGE_KEYS)) {
        const idbVal = await this.load(key);
        if (idbVal && !localStorage.getItem(key)) {
          try {
            localStorage.setItem(key, JSON.stringify(idbVal));
          } catch (e) {
            // Ignore quota errors on mirror
          }
        }
      }
    } catch (e) {
      console.warn('Storage sync error:', e);
    }
  },

  // ==========================================
  // MULTI-PROJECT STORAGE & SYNC METHODS
  // ==========================================
  getActiveProjectId() {
    try {
      return localStorage.getItem('FCL_ACTIVE_PROJECT_ID') || 'PRJ-2026-001';
    } catch (e) {
      return 'PRJ-2026-001';
    }
  },

  setActiveProjectId(id) {
    if (!id) return;
    try {
      localStorage.setItem('FCL_ACTIVE_PROJECT_ID', id);
    } catch (e) {}
  },

  getProjectStorageKey(projectId, type) {
    const safeId = String(projectId || 'PRJ-2026-001').replace(/[^a-zA-Z0-9_-]/g, '_');
    return `cost_estimate_${type}_${safeId}`;
  },

  async saveProjectSection(projectId, section, data, isRemoteSync = false) {
    const key = this.getProjectStorageKey(projectId, section);
    await this.save(key, data);
    // Mirror to default key if default project PRJ-2026-001
    if ((projectId === 'PRJ-2026-001' || !projectId) && FCL_STORAGE_KEYS[section]) {
      await this.save(FCL_STORAGE_KEYS[section], data);
    }
    // Real-Time Cloud Firestore Sync Trigger (prevent echo loop if this was a remote sync)
    if (!isRemoteSync && typeof FCLFirebaseSync !== 'undefined' && FCLFirebaseSync.isConfigured()) {
      FCLFirebaseSync.queueSectionSync(projectId, section, data);
    }
    return true;
  },

  async loadProjectSection(projectId, section) {
    const key = this.getProjectStorageKey(projectId, section);
    let val = await this.load(key);
    if (!val && (projectId === 'PRJ-2026-001' || !projectId) && FCL_STORAGE_KEYS[section]) {
      val = await this.load(FCL_STORAGE_KEYS[section]);
    }
    return val;
  },

  readProjectSectionSync(projectId, section) {
    const key = this.getProjectStorageKey(projectId, section);
    let val = this.readSync(key);
    if (!val && (projectId === 'PRJ-2026-001' || !projectId) && FCL_STORAGE_KEYS[section]) {
      val = this.readSync(FCL_STORAGE_KEYS[section]);
    }
    return val;
  },

  saveProjectCatalog(catalog, isRemoteSync = false) {
    try {
      this.save('FCL_PROJECT_CATALOG_DATA', catalog);
      if (!isRemoteSync && typeof FCLFirebaseSync !== 'undefined' && FCLFirebaseSync.isConfigured()) {
        FCLFirebaseSync.queueCatalogSync(catalog);
      }
    } catch (e) {}
  },

  loadProjectCatalogSync() {
    return this.readSync('FCL_PROJECT_CATALOG_DATA');
  },

  deleteProject(projectId) {
    try {
      const catalog = this.readSync('FCL_PROJECT_CATALOG_DATA');
      if (Array.isArray(catalog)) {
        const filtered = catalog.filter(p => p.id !== projectId);
        this.save('FCL_PROJECT_CATALOG_DATA', filtered);
        if (typeof FCLFirebaseSync !== 'undefined' && FCLFirebaseSync.isConfigured()) {
          FCLFirebaseSync.queueCatalogSync(filtered);
        }
      }
      localStorage.removeItem(`FCL_PROJ_${projectId}_boq`);
      localStorage.removeItem(`FCL_PROJ_${projectId}_ganttSettings`);
      localStorage.removeItem(`FCL_PROJ_${projectId}_info`);
    } catch (e) {
      console.warn('FCLStorage.deleteProject error:', e);
    }
  },

  // Save project-specific BOQ data and sync with catalog
  async saveProjectBOQ(projectId, boqData, isRemoteSync = false) {
    await this.saveProjectSection(projectId, 'boq', boqData, isRemoteSync);
    try {
      const catalog = this.readSync('FCL_PROJECT_CATALOG_DATA');
      if (Array.isArray(catalog)) {
        const p = catalog.find(x => x.id === projectId);
        if (p) {
          p.boq = boqData;
          if (boqData.totalBudget) p.totalBudget = boqData.totalBudget;
          if (boqData.actualProgress !== undefined) p.actualProgress = boqData.actualProgress;
          this.save('FCL_PROJECT_CATALOG_DATA', catalog);
        }
      }
    } catch (e) {}
    if (!isRemoteSync && typeof FCLFirebaseSync !== 'undefined' && FCLFirebaseSync.isConfigured()) {
      FCLFirebaseSync.queueProjectSync(projectId, { boq: boqData });
    }
    return true;
  },

  // Load project-specific BOQ data
  async loadProjectBOQ(projectId) {
    let boq = await this.loadProjectSection(projectId, 'boq');
    if (!boq) {
      const catalog = this.readSync('FCL_PROJECT_CATALOG_DATA');
      if (Array.isArray(catalog)) {
        const p = catalog.find(x => x.id === projectId);
        if (p && p.boq) boq = p.boq;
      }
    }
    return boq;
  },

  // Save project-specific Gantt schedule
  async saveProjectGantt(projectId, ganttData, isRemoteSync = false) {
    await this.saveProjectSection(projectId, 'ganttSettings', ganttData, isRemoteSync);
    try {
      const catalog = this.readSync('FCL_PROJECT_CATALOG_DATA');
      if (Array.isArray(catalog)) {
        const p = catalog.find(x => x.id === projectId);
        if (p) {
          if (!p.timeline) p.timeline = {};
          if (ganttData.phases) p.timeline.phases = ganttData.phases;
          if (ganttData.ganttTasks) p.timeline.ganttTasks = ganttData.ganttTasks;
          if (ganttData.criticalState) p.timeline.criticalState = ganttData.criticalState;
          if (ganttData.progress !== undefined) p.actualProgress = ganttData.progress;
          this.save('FCL_PROJECT_CATALOG_DATA', catalog);
        }
      }
    } catch (e) {}
    if (!isRemoteSync && typeof FCLFirebaseSync !== 'undefined' && FCLFirebaseSync.isConfigured()) {
      FCLFirebaseSync.queueProjectSync(projectId, { gantt: ganttData });
    }
    return true;
  },

  // Load project-specific Gantt schedule
  async loadProjectGantt(projectId) {
    let gantt = await this.loadProjectSection(projectId, 'ganttSettings');
    if (!gantt) {
      const catalog = this.readSync('FCL_PROJECT_CATALOG_DATA');
      if (Array.isArray(catalog)) {
        const p = catalog.find(x => x.id === projectId);
        if (p && p.timeline) gantt = p.timeline;
      }
    }
    return gantt;
  },

  // Save project-specific Manpower data
  async saveProjectManpower(projectId, manpowerData, isRemoteSync = false) {
    await this.saveProjectSection(projectId, 'manpower', manpowerData, isRemoteSync);
    try {
      const catalog = this.readSync('FCL_PROJECT_CATALOG_DATA');
      if (Array.isArray(catalog)) {
        const p = catalog.find(x => x.id === projectId);
        if (p) {
          if (!p.manpower) p.manpower = {};
          p.manpower = manpowerData;
          this.save('FCL_PROJECT_CATALOG_DATA', catalog);
        }
      }
    } catch (e) {}
    if (!isRemoteSync && typeof FCLFirebaseSync !== 'undefined' && FCLFirebaseSync.isConfigured()) {
      FCLFirebaseSync.queueProjectSync(projectId, { manpower: manpowerData });
    }
    return true;
  },

  // Load project-specific Manpower data
  async loadProjectManpower(projectId) {
    let mp = await this.loadProjectSection(projectId, 'manpower');
    if (!mp) {
      const catalog = this.readSync('FCL_PROJECT_CATALOG_DATA');
      if (Array.isArray(catalog)) {
        const p = catalog.find(x => x.id === projectId);
        if (p && p.manpower) mp = p.manpower;
      }
    }
    return mp;
  },

  // ==========================================
  // FEATURE 2: MASTER PROJECT FILE (.fclproj)
  // ==========================================
  async exportMasterProject() {
    const activeId = this.getActiveProjectId();
    const boqData = (await this.loadProjectBOQ(activeId)) || (await this.load(FCL_STORAGE_KEYS.boq)) || this.readSync(FCL_STORAGE_KEYS.boq) || {};
    const dupaData = (await this.load(FCL_STORAGE_KEYS.dupa)) || this.readSync(FCL_STORAGE_KEYS.dupa) || {};
    const priceListData = (await this.load(FCL_STORAGE_KEYS.priceList)) || this.readSync(FCL_STORAGE_KEYS.priceList) || {};
    const coverData = (await this.load(FCL_STORAGE_KEYS.cover)) || this.readSync(FCL_STORAGE_KEYS.cover) || {};
    const ganttSettings = (await this.loadProjectGantt(activeId)) || (await this.load(FCL_STORAGE_KEYS.ganttSettings)) || this.readSync(FCL_STORAGE_KEYS.ganttSettings) || {};
    const ganttStartDate = (await this.load(FCL_STORAGE_KEYS.ganttStartDate)) || this.readSync(FCL_STORAGE_KEYS.ganttStartDate) || '';
    const catalog = this.readSync('FCL_PROJECT_CATALOG_DATA') || null;

    const projectName = (boqData.projectFields && boqData.projectFields.projectName) || 'Construction_Project';
    const projectCode = (boqData.projectFields && boqData.projectFields.projectCode) || activeId;

    // Collect individual project BOQ and Gantt data
    const projectsData = {};
    if (Array.isArray(catalog)) {
      for (const p of catalog) {
        projectsData[p.id] = {
          boq: (await this.loadProjectBOQ(p.id)) || p.boq || null,
          gantt: (await this.loadProjectGantt(p.id)) || p.timeline || null
        };
      }
    }

    const masterBundle = {
      app: 'FCLDC_Integrated_Project_Controls',
      version: '2.0',
      format: 'FCLPROJ_V2',
      exportedAt: new Date().toISOString(),
      activeProjectId: activeId,
      metadata: {
        projectName,
        projectCode,
        clientName: (boqData.projectFields && boqData.projectFields.clientName) || '',
        location: (boqData.projectFields && boqData.projectFields.location) || ''
      },
      catalog: catalog,
      projectsData: projectsData,
      sections: {
        priceList: priceListData,
        dupa: dupaData,
        boq: boqData,
        cover: coverData,
        ganttSettings,
        ganttStartDate
      }
    };

    const jsonStr = JSON.stringify(masterBundle, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeTitle = projectName.replace(/[^a-zA-Z0-9_\-]/g, '_').substring(0, 40);
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `${projectCode}_${safeTitle}_Master_${dateStr}.fclproj`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  },

  parseMasterExcelWorkbook(workbook, fileName) {
    if (!workbook || !Array.isArray(workbook.SheetNames) || !workbook.SheetNames.length) {
      throw new Error('The Excel workbook contains no readable sheets.');
    }

    const cleanStr = (val) => String(val !== undefined && val !== null ? val : '').trim();
    const parseNum = (val) => {
      if (typeof val === 'number') return isNaN(val) ? 0 : val;
      if (!val) return 0;
      const n = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
      return isNaN(n) ? 0 : n;
    };
    const findCol = (headers, candidates) => {
      if (!Array.isArray(headers)) return -1;
      const cleanH = headers.map(h => cleanStr(h).toLowerCase().replace(/[^a-z0-9]/g, ''));
      for (const cand of candidates) {
        const c = cand.toLowerCase().replace(/[^a-z0-9]/g, '');
        const idx = cleanH.findIndex(h => h.includes(c));
        if (idx >= 0) return idx;
      }
      return -1;
    };

    const cleanBaseName = fileName.replace(/\.[^/.]+$/, '').replace(/[_+-]/g, ' ');
    const bundle = {
      app: 'FCLDC_Integrated_Project_Controls',
      version: '2.0',
      format: 'FCLPROJ_EXCEL_V2',
      exportedAt: new Date().toISOString(),
      metadata: {
        projectName: cleanBaseName,
        projectCode: 'PRJ-' + new Date().getFullYear() + '-IMP'
      },
      sections: {}
    };

    const summaryCounts = {
      priceList: 0,
      dupa: 0,
      boq: 0,
      gantt: 0
    };

    // Analyze each sheet in the workbook
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;
      const matrix = typeof XLSX !== 'undefined' ? XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) : [];
      if (!matrix || !matrix.length) continue;

      // Find header row (search within first 15 rows)
      let headerRowIdx = -1;
      for (let r = 0; r < Math.min(matrix.length, 15); r++) {
        const row = matrix[r];
        if (Array.isArray(row) && row.some(cell => cleanStr(cell).length > 0)) {
          const rowStr = row.map(c => cleanStr(c).toLowerCase()).join(' | ');
          if (/item|material|description|work|price|cost|qty|unit|rate|task|activity|schedule/i.test(rowStr)) {
            headerRowIdx = r;
            break;
          }
        }
      }
      if (headerRowIdx < 0) headerRowIdx = 0;

      const rawHeaders = (matrix[headerRowIdx] || []).map(h => cleanStr(h));
      const dataRows = matrix.slice(headerRowIdx + 1).filter(r => Array.isArray(r) && r.some(c => cleanStr(c).length > 0));
      const sheetLower = sheetName.toLowerCase();
      const headerStr = rawHeaders.map(h => h.toLowerCase()).join(' | ');

      // Determine sheet type
      const isPriceList = /price\s*list|material/i.test(sheetLower) || /material list|price per unit|rental per unit/i.test(headerStr);
      const isDUPA = /dupa|detailed\s*unit|unit\s*price\s*analysis|analysis/i.test(sheetLower) || /labor unit cost|equipment unit cost|le unit cost|total lec/i.test(headerStr);
      const isGantt = /gantt|schedule|timeline|activities|bar\s*chart/i.test(sheetLower) || /start date|end date|duration|predecessor|progress/i.test(headerStr);
      const isBOQ = /boq|bill\s*of\s*quant|cost\s*breakdown|estimate/i.test(sheetLower) || /item no|work description|grand total cost|total material cost/i.test(headerStr);

      // 1. Parse Price List Sheet
      if (isPriceList && !bundle.sections.priceList) {
        const idx = {
          type: findCol(rawHeaders, ['type', 'row type', 'level']),
          code: findCol(rawHeaders, ['item code', 'code', 'no', 'item']),
          name: findCol(rawHeaders, ['material list', 'material name', 'material', 'description', 'title']),
          spec: findCol(rawHeaders, ['specification', 'specs', 'spec']),
          unit: findCol(rawHeaders, ['unit', 'uom']),
          price: findCol(rawHeaders, ['price per unit', 'price', 'unit price', 'material unit cost', 'mat rate']),
          rental: findCol(rawHeaders, ['rental per unit', 'rental', 'le unit cost', 'equipment rate', 'le rate'])
        };

        const plRows = [];
        dataRows.forEach(cells => {
          const name = idx.name >= 0 ? cleanStr(cells[idx.name]) : '';
          const code = idx.code >= 0 ? cleanStr(cells[idx.code]) : '';
          if (!name && !code) return;

          const rawType = idx.type >= 0 ? cleanStr(cells[idx.type]).toLowerCase() : '';
          const depth = code.split('.').filter(Boolean).length;
          const type = ['category', 'subcategory', 'material'].includes(rawType) ? rawType : (depth <= 1 ? 'category' : depth === 2 ? 'subcategory' : 'material');

          plRows.push({
            type: type,
            itemCode: code,
            mainCategory: type === 'category' ? name : '',
            subCategory: type === 'subcategory' ? name : '',
            materialName: type === 'material' ? name : '',
            specification: idx.spec >= 0 ? cleanStr(cells[idx.spec]) : '',
            unit: idx.unit >= 0 ? cleanStr(cells[idx.unit]) : '',
            pricePerUnit: idx.price >= 0 ? parseNum(cells[idx.price]) : 0,
            rentalPerUnit: idx.rental >= 0 ? parseNum(cells[idx.rental]) : 0,
            dateUpdated: new Date().toISOString().slice(0, 10),
            collapsed: false
          });
        });

        if (plRows.length) {
          bundle.sections.priceList = { priceListData: plRows };
          summaryCounts.priceList = plRows.length;
        }
      }

      // 2. Parse DUPA Sheet
      if (isDUPA && !bundle.sections.dupa) {
        const idx = {
          type: findCol(rawHeaders, ['type', 'row type', 'level']),
          code: findCol(rawHeaders, ['item code', 'item no', 'code', 'no']),
          title: findCol(rawHeaders, ['work description', 'description', 'title', 'item description']),
          spec: findCol(rawHeaders, ['specification', 'specs', 'spec']),
          qty: findCol(rawHeaders, ['qty', 'quantity']),
          unit: findCol(rawHeaders, ['unit', 'uom']),
          matCost: findCol(rawHeaders, ['material unit cost', 'mat unit cost', 'material rate', 'unit cost']),
          leCost: findCol(rawHeaders, ['le unit cost', 'labor unit cost', 'rental per unit', 'equipment rate']),
          totalMat: findCol(rawHeaders, ['total material cost', 'total mat cost', 'total material']),
          totalLE: findCol(rawHeaders, ['total lec', 'total le cost', 'total labor']),
          grandTotal: findCol(rawHeaders, ['grand total cost', 'total cost', 'total', 'amount'])
        };

        const dupaRows = [];
        dataRows.forEach(cells => {
          const title = idx.title >= 0 ? cleanStr(cells[idx.title]) : '';
          const code = idx.code >= 0 ? cleanStr(cells[idx.code]) : '';
          if (!title && !code) return;

          const qty = idx.qty >= 0 ? parseNum(cells[idx.qty]) : 1;
          const matCost = idx.matCost >= 0 ? parseNum(cells[idx.matCost]) : 0;
          const leCost = idx.leCost >= 0 ? parseNum(cells[idx.leCost]) : 0;
          let grand = idx.grandTotal >= 0 ? parseNum(cells[idx.grandTotal]) : (qty * (matCost + leCost));

          dupaRows.push({
            type: code.split('.').length <= 1 ? 'category' : (code.split('.').length === 2 ? 'subcategory' : 'material'),
            itemCode: code,
            title: title,
            specification: idx.spec >= 0 ? cleanStr(cells[idx.spec]) : '',
            qty: qty,
            unit: idx.unit >= 0 ? cleanStr(cells[idx.unit]) : '',
            materialUnitCost: matCost,
            totalMaterialCost: idx.totalMat >= 0 ? parseNum(cells[idx.totalMat]) : (qty * matCost),
            laborUnitCost: leCost,
            leUnitCost: leCost,
            totalLEC: idx.totalLE >= 0 ? parseNum(cells[idx.totalLE]) : (qty * leCost),
            grandTotalCost: grand
          });
        });

        if (dupaRows.length) {
          bundle.sections.dupa = { analysisData: dupaRows };
          summaryCounts.dupa = dupaRows.length;
        }
      }

      // 3. Parse BOQ Sheet
      if ((isBOQ || (!bundle.sections.boq && !isPriceList && !isGantt)) && !bundle.sections.boq) {
        const idx = {
          itemNo: findCol(rawHeaders, ['item no', 'item', 'code', 'no']),
          desc: findCol(rawHeaders, ['work description', 'description', 'scope of work', 'item description', 'title']),
          spec: findCol(rawHeaders, ['specification', 'specs', 'spec']),
          qty: findCol(rawHeaders, ['qty', 'quantity']),
          unit: findCol(rawHeaders, ['unit', 'uom']),
          matCost: findCol(rawHeaders, ['material unit cost', 'mat unit cost']),
          leCost: findCol(rawHeaders, ['le unit cost', 'labor unit cost']),
          unitCost: findCol(rawHeaders, ['unit cost', 'unit rate', 'rate', 'price']),
          grandTotal: findCol(rawHeaders, ['grand total cost', 'total cost', 'total amount', 'contract amount', 'total']),
          progress: findCol(rawHeaders, ['percent done', '% done', 'progress', '% accomplished', 'actual progress'])
        };

        const boqRows = [];
        let totalBudget = 0;
        let progSum = 0;
        let progCount = 0;

        dataRows.forEach(cells => {
          const desc = idx.desc >= 0 ? cleanStr(cells[idx.desc]) : '';
          const itemNo = idx.itemNo >= 0 ? cleanStr(cells[idx.itemNo]) : '';
          if (!desc && !itemNo) return;

          const qty = idx.qty >= 0 ? parseNum(cells[idx.qty]) : 1;
          const matCost = idx.matCost >= 0 ? parseNum(cells[idx.matCost]) : 0;
          const leCost = idx.leCost >= 0 ? parseNum(cells[idx.leCost]) : 0;
          let uCost = idx.unitCost >= 0 ? parseNum(cells[idx.unitCost]) : (matCost + leCost);
          let grand = idx.grandTotal >= 0 ? parseNum(cells[idx.grandTotal]) : (qty * uCost);
          const prog = idx.progress >= 0 ? parseNum(cells[idx.progress]) : 0;

          totalBudget += grand;
          if (prog > 0) {
            progSum += prog;
            progCount++;
          }

          boqRows.push({
            id: 'boq-item-' + (boqRows.length + 1),
            itemNo: itemNo || String(boqRows.length + 1),
            description: desc,
            specification: idx.spec >= 0 ? cleanStr(cells[idx.spec]) : '',
            unit: idx.unit >= 0 ? cleanStr(cells[idx.unit]) : '',
            quantity: qty,
            materialUnitCost: matCost,
            leUnitCost: leCost,
            unitCost: uCost,
            grandTotalCost: grand,
            percentDone: prog
          });
        });

        if (boqRows.length) {
          bundle.sections.boq = {
            projectFields: {
              projectName: bundle.metadata.projectName,
              projectCode: bundle.metadata.projectCode,
              clientName: '',
              location: ''
            },
            boqData: boqRows,
            totalBudget: totalBudget,
            actualProgress: progCount ? (progSum / progCount) : 0
          };
          summaryCounts.boq = boqRows.length;
        }
      }

      // 4. Parse Gantt Schedule Sheet
      if (isGantt && !bundle.sections.ganttSettings) {
        const idx = {
          code: findCol(rawHeaders, ['wbs', 'code', 'item no', 'no']),
          name: findCol(rawHeaders, ['task name', 'activity', 'task', 'name', 'description']),
          start: findCol(rawHeaders, ['start date', 'start', 'commencement']),
          end: findCol(rawHeaders, ['end date', 'end', 'completion', 'target date']),
          dur: findCol(rawHeaders, ['duration', 'days', 'calendar days']),
          prog: findCol(rawHeaders, ['progress', '% complete', '% done', 'accomplishment']),
          assigned: findCol(rawHeaders, ['assigned to', 'engineer', 'in charge', 'pic'])
        };

        const tasks = [];
        dataRows.forEach((cells, i) => {
          const name = idx.name >= 0 ? cleanStr(cells[idx.name]) : '';
          if (!name) return;

          const startRaw = idx.start >= 0 ? cells[idx.start] : '';
          const endRaw = idx.end >= 0 ? cells[idx.end] : '';
          const dur = idx.dur >= 0 ? parseNum(cells[idx.dur]) : 14;
          const prog = idx.prog >= 0 ? parseNum(cells[idx.prog]) : 0;

          tasks.push({
            id: 'task-' + (i + 1),
            code: idx.code >= 0 ? cleanStr(cells[idx.code]) : (i + 1) + '.0',
            name: name,
            startDate: String(startRaw).slice(0, 10) || new Date().toISOString().slice(0, 10),
            endDate: String(endRaw).slice(0, 10) || new Date(Date.now() + dur * 86400000).toISOString().slice(0, 10),
            duration: dur || 14,
            progress: prog,
            assignedTo: idx.assigned >= 0 ? cleanStr(cells[idx.assigned]) : 'Project Engineer',
            critical: i % 2 === 0
          });
        });

        if (tasks.length) {
          bundle.sections.ganttSettings = {
            ganttTasks: tasks,
            phases: []
          };
          summaryCounts.gantt = tasks.length;
        }
      }
    }

    // Mirror BOQ into DUPA if DUPA is missing (ensures DUPA table is populated in Cost Estimation)
    if (bundle.sections.boq && !bundle.sections.dupa && Array.isArray(bundle.sections.boq.boqData)) {
      bundle.sections.dupa = {
        analysisData: bundle.sections.boq.boqData.map(b => ({
          type: 'material',
          itemCode: b.itemNo,
          title: b.description,
          specification: b.specification || '',
          qty: b.quantity || 1,
          unit: b.unit || '',
          materialUnitCost: b.materialUnitCost || 0,
          totalMaterialCost: (b.quantity || 1) * (b.materialUnitCost || 0),
          laborUnitCost: b.leUnitCost || 0,
          leUnitCost: b.leUnitCost || 0,
          totalLEC: (b.quantity || 1) * (b.leUnitCost || 0),
          grandTotalCost: b.grandTotalCost || 0
        }))
      };
      summaryCounts.dupa = bundle.sections.dupa.analysisData.length;
    }

    return { bundle, summaryCounts };
  },

  async importMasterProjectFile(file, onSuccess) {
    if (!file) return;
    const fileName = file.name || '';
    const isExcel = /\.(xlsx|xls|xlsm|xlsb|csv|tsv)$/i.test(fileName);

    if (isExcel) {
      if (typeof XLSX === 'undefined') {
        alert('The Excel spreadsheet reader (XLSX) is not loaded yet. Please ensure you are connected to the internet to load the Excel module, or use a .fclproj/.json file.');
        return;
      }

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const buffer = event.target.result;
          const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array', cellFormula: true, cellNF: true, cellText: false });
          const { bundle, summaryCounts } = this.parseMasterExcelWorkbook(workbook, fileName);

          const activeId = this.getActiveProjectId();
          const sections = bundle.sections || {};

          if (sections.priceList) {
            await this.save(FCL_STORAGE_KEYS.priceList, sections.priceList);
          }
          if (sections.dupa) {
            await this.save(FCL_STORAGE_KEYS.dupa, sections.dupa);
          }
          if (sections.boq) {
            await this.save(FCL_STORAGE_KEYS.boq, sections.boq);
            await this.saveProjectBOQ(activeId, sections.boq);
          }
          if (sections.ganttSettings) {
            await this.save(FCL_STORAGE_KEYS.ganttSettings, sections.ganttSettings);
            await this.saveProjectGantt(activeId, sections.ganttSettings);
          }

          // Update project catalog with new project name and budget
          try {
            const catalog = this.readSync('FCL_PROJECT_CATALOG_DATA') || [];
            if (Array.isArray(catalog)) {
              let p = catalog.find(x => x.id === activeId);
              if (!p && catalog.length) p = catalog[0];
              if (p) {
                if (bundle.metadata && bundle.metadata.projectName) p.name = bundle.metadata.projectName;
                if (sections.boq && sections.boq.totalBudget) p.totalBudget = sections.boq.totalBudget;
                if (sections.boq && sections.boq.actualProgress !== undefined) p.actualProgress = sections.boq.actualProgress;
                this.save('FCL_PROJECT_CATALOG_DATA', catalog);
              }
            }
          } catch (e) {}

          const breakdownMsg = [
            summaryCounts.priceList ? `• Price List: ${summaryCounts.priceList} item(s)` : null,
            summaryCounts.dupa ? `• D.U.P.A.: ${summaryCounts.dupa} item(s)` : null,
            summaryCounts.boq ? `• Bill of Quantities (BOQ): ${summaryCounts.boq} item(s)` : null,
            summaryCounts.gantt ? `• Gantt Schedule Activities: ${summaryCounts.gantt} task(s)` : null
          ].filter(Boolean).join('\n');

          alert(`Master Project Excel Workbook "${fileName}" successfully imported!\n\nImported Sections:\n${breakdownMsg || '• Project data synchronized.'}\n\nAll tables, unit price analyses, BOQ, and Gantt schedules have been updated and synced.`);

          if (typeof onSuccess === 'function') {
            onSuccess(bundle);
          } else {
            window.location.reload();
          }
        } catch (err) {
          alert('Failed to import Excel project file: ' + err.message);
        }
      };
      reader.readAsArrayBuffer(file);
      return;
    }

    // Default JSON / .fclproj handling
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        const bundle = JSON.parse(text);
        if (!bundle || (!bundle.sections && !bundle.app && !bundle.catalog)) {
          throw new Error('Invalid project file format. Missing sections bundle.');
        }

        const sections = bundle.sections || bundle;

        if (sections.priceList) {
          await this.save(FCL_STORAGE_KEYS.priceList, sections.priceList);
        }
        if (sections.dupa) {
          await this.save(FCL_STORAGE_KEYS.dupa, sections.dupa);
        }
        if (sections.boq) {
          await this.save(FCL_STORAGE_KEYS.boq, sections.boq);
        }
        if (sections.cover) {
          await this.save(FCL_STORAGE_KEYS.cover, sections.cover);
        }
        if (sections.ganttSettings) {
          await this.save(FCL_STORAGE_KEYS.ganttSettings, sections.ganttSettings);
        }
        if (sections.ganttStartDate) {
          await this.save(FCL_STORAGE_KEYS.ganttStartDate, sections.ganttStartDate);
        }

        // Restore Catalog and individual Project BOQs / Gantts if present
        if (bundle.catalog && Array.isArray(bundle.catalog)) {
          await this.save('FCL_PROJECT_CATALOG_DATA', bundle.catalog);
        }
        if (bundle.projectsData && typeof bundle.projectsData === 'object') {
          for (const [pId, pData] of Object.entries(bundle.projectsData)) {
            if (pData.boq) await this.saveProjectBOQ(pId, pData.boq);
            if (pData.gantt) await this.saveProjectGantt(pId, pData.gantt);
          }
        }
        if (bundle.activeProjectId) {
          this.setActiveProjectId(bundle.activeProjectId);
        }

        const pName = (bundle.metadata && bundle.metadata.projectName) || 'Master Portfolio';
        alert(`Master Project Suite "${pName}" successfully imported!\nAll projects, Bill of Quantities, Gantt Schedules, D.U.P.A., and Proposals are updated.`);

        if (typeof onSuccess === 'function') {
          onSuccess(bundle);
        } else {
          window.location.reload();
        }
      } catch (err) {
        alert('Failed to load project file: ' + err.message);
      }
    };
    reader.readAsText(file);
  },

  // ==========================================
  // FEATURE 1: LIVE DASHBOARD METRICS CALCULATION
  // ==========================================
  getLiveDashboardData(projectId) {
    const targetId = projectId || this.getActiveProjectId();
    const boqSection = this.readProjectSectionSync(targetId, 'boq') || this.readSync(FCL_STORAGE_KEYS.boq);
    const dupaSection = this.readSync(FCL_STORAGE_KEYS.dupa);
    const priceListSection = this.readSync(FCL_STORAGE_KEYS.priceList);

    const hasLiveBOQ = boqSection && Array.isArray(boqSection.boqData) && boqSection.boqData.length > 0;
    const hasLiveDUPA = dupaSection && Array.isArray(dupaSection.analysisData) && dupaSection.analysisData.length > 0;

    if (!hasLiveBOQ && !hasLiveDUPA) {
      return {
        isLive: false,
        projectName: 'Sports Club & Recreation Facility',
        projectCode: 'PRJ-2026-001',
        totalBudget: 14850000,
        plannedProgress: 68.5,
        actualProgress: 62.4,
        categories: [
          { name: 'Civil', planned: 2850000, actual: 2420000 },
          { name: 'Struct', planned: 5400000, actual: 4850000 },
          { name: 'Arch', planned: 3200000, actual: 2780000 },
          { name: 'MEPF', planned: 1950000, actual: 1680000 },
          { name: 'Finishes', planned: 950000, actual: 720000 },
          { name: 'Site', planned: 500000, actual: 410000 }
        ],
        donutShares: {
          target: 42,
          projection: 28,
          expense: 18,
          variance: 12
        },
        items: [
          { id: 1, name: 'Structural Foundation Pouring', desc: 'Footings & Grade Beams (Class A 3000 PSI)', cat: 'Civil Works', planned: 850000, actual: 842500, status: 'Completed', avatar: 'JD' },
          { id: 2, name: 'Column & Shear Wall Rebar', desc: 'Grade 60 Deformed Bars Fabrication & Tie', cat: 'Structural', planned: 1240000, actual: 980000, status: 'In Progress', avatar: 'MR' },
          { id: 3, name: 'Suspended Slab Formwork', desc: 'Phenolic Board & Scaffolding Shoring', cat: 'Formworks', planned: 520000, actual: 490000, status: 'In Progress', avatar: 'AT' },
          { id: 4, name: 'MEPF Conduiting & Piping', desc: 'Rough-in PVC conduit & Sanitary stacks', cat: 'Utilities', planned: 680000, actual: 610000, status: 'Review', avatar: 'EL' },
          { id: 5, name: 'Masonry & CHB Laying', desc: '6-inch CHB Wall with 10mm rebars at 600mm', cat: 'Architectural', planned: 430000, actual: 390000, status: 'In Progress', avatar: 'KC' }
        ]
      };
    }

    // Extract live metrics from BOQ (preferred) or DUPA
    const pFields = (boqSection && boqSection.projectFields) || {};
    const projectName = pFields.projectName || 'Active Estimate Project';
    const projectCode = pFields.documentNo || pFields.projectCode || 'FCL-EST-2026';

    const sourceRows = hasLiveBOQ ? boqSection.boqData : dupaSection.analysisData;
    let totalContractAmount = 0;
    const categoryTotals = {};
    const scopeItems = [];

    let currentCategoryName = 'General';
    let completedCount = 0;
    let inProgressCount = 0;
    let totalItemsCount = 0;

    sourceRows.forEach((row) => {
      const type = (row.type || '').toLowerCase();
      const isHeader = type === 'category' || (type === 'subcategory' && !parseFloat(row.qty || 0) && !parseFloat(row.grandTotalCost || 0));
      if (isHeader) {
        const catTitle = row.title || row.description || '';
        if (catTitle) {
          currentCategoryName = catTitle.split('-')[0].trim().substring(0, 16);
          if (!categoryTotals[currentCategoryName]) {
            categoryTotals[currentCategoryName] = { planned: 0, actual: 0 };
          }
        }
      } else {
        totalItemsCount++;
        const qty = parseFloat(row.quantity || row.qty || 0) || 0;
        const matCost = parseFloat(row.materialUnitCost || 0) || 0;
        const leCost = parseFloat(row.leUnitCost || row.laborUnitCost || 0) || 0;
        const rate = (matCost + leCost) || parseFloat(row.unitCost || row.unitPrice || 0) || 0;
        const total = parseFloat(row.grandTotalCost || 0) || (qty * rate) || parseFloat(row.amount || row.totalCost || 0) || 0;
        totalContractAmount += total;

        const percent = parseFloat(row.percent || row.percentDay || 0) || 0;
        const actualCost = total * (percent / 100);

        if (!categoryTotals[currentCategoryName]) {
          categoryTotals[currentCategoryName] = { planned: 0, actual: 0 };
        }
        categoryTotals[currentCategoryName].planned += total;
        categoryTotals[currentCategoryName].actual += actualCost;

        let status = 'Pending';
        if (percent >= 100) {
          status = 'Completed';
          completedCount++;
        } else if (percent > 0) {
          status = 'In Progress';
          inProgressCount++;
        }

        if (total > 0 && scopeItems.length < 8) {
          const itemTitle = row.title || row.description || 'Work Scope Item';
          const initials = itemTitle
            .split(' ')
            .filter(Boolean)
            .map(w => w[0])
            .slice(0, 2)
            .join('')
            .toUpperCase() || 'IT';

          scopeItems.push({
            id: row.code || scopeItems.length + 1,
            name: itemTitle,
            desc: (row.specification || itemTitle).substring(0, 48),
            cat: currentCategoryName,
            planned: total,
            actual: actualCost,
            status,
            avatar: initials
          });
        }
      }
    });

    const categoryList = Object.keys(categoryTotals).slice(0, 6).map((k) => ({
      name: k.length > 8 ? k.substring(0, 7) + '.' : k,
      planned: Math.round(categoryTotals[k].planned),
      actual: Math.round(categoryTotals[k].actual)
    }));

    const plannedOverall = totalItemsCount > 0 
      ? Math.min(100, Math.max(10, Math.round(((completedCount * 1.0 + inProgressCount * 0.5) / totalItemsCount) * 100)))
      : 50;

    const actualOverall = Math.max(0, plannedOverall - 5);

    // Calculate dynamic donut shares
    const targetShare = 40;
    const projectionShare = 30;
    const expenseShare = Math.min(25, Math.max(10, Math.round((actualOverall / 100) * 35)));
    const varianceShare = 100 - (targetShare + projectionShare + expenseShare);

    return {
      isLive: true,
      projectName,
      projectCode,
      totalBudget: totalContractAmount || 12500000,
      plannedProgress: plannedOverall,
      actualProgress: actualOverall,
      categories: categoryList.length ? categoryList : [
        { name: 'Civil', planned: 2850000, actual: 2420000 },
        { name: 'Struct', planned: 5400000, actual: 4850000 },
        { name: 'Arch', planned: 3200000, actual: 2780000 }
      ],
      donutShares: {
        target: targetShare,
        projection: projectionShare,
        expense: expenseShare,
        variance: varianceShare
      },
      items: scopeItems.length ? scopeItems : [
        { id: 1, name: 'Foundation Works', desc: 'Class A Concrete & Rebar', cat: 'Civil', planned: 850000, actual: 850000, status: 'Completed', avatar: 'FW' }
      ]
    };
  },

  // ==========================================
  // FEATURE 4: SMART D.U.P.A. ↔ PRICE LIST SYNC
  // ==========================================
  getPriceListSuggestions(query = '') {
    const plSection = this.readSync(FCL_STORAGE_KEYS.priceList);
    if (!plSection || !Array.isArray(plSection.priceListData)) return [];
    const q = query.trim().toLowerCase();
    
    return plSection.priceListData
      .filter((row) => {
        if (!row || row.type === 'category' || row.type === 'subcategory') return false;
        const name = (row.materialName || row.title || '').toLowerCase();
        const spec = (row.specification || '').toLowerCase();
        const code = (row.itemCode || '').toLowerCase();
        return !q || name.includes(q) || spec.includes(q) || code.includes(q);
      })
      .slice(0, 15)
      .map((row) => ({
        itemCode: row.itemCode || '',
        name: row.materialName || row.title || '',
        specification: row.specification || '',
        unit: row.unit || '',
        pricePerUnit: parseFloat(row.pricePerUnit || row.materialUnitCost || 0) || 0,
        rentalPerUnit: parseFloat(row.rentalPerUnit || row.leUnitCost || 0) || 0,
        type: row.type || 'material'
      }));
  },

  syncDUPAWithPriceList(analysisData, priceListData) {
    if (!Array.isArray(analysisData) || !Array.isArray(priceListData)) {
      return { updatedCount: 0, items: [] };
    }

    const priceMap = new Map();
    priceListData.forEach((p) => {
      if (p && p.materialName) {
        const key = (p.materialName + '::' + (p.specification || '')).toLowerCase().trim();
        priceMap.set(key, p);
        // Also map just name as fallback
        const nameKey = p.materialName.toLowerCase().trim();
        if (!priceMap.has(nameKey)) priceMap.set(nameKey, p);
      }
    });

    let updatedCount = 0;
    const updatedItems = [];

    analysisData.forEach((row) => {
      const title = (row.title || row.materialName || '').toLowerCase().trim();
      const spec = (row.specification || '').toLowerCase().trim();
      if (!title) return;

      const match = priceMap.get(title + '::' + spec) || priceMap.get(title);
      if (match) {
        const oldMatRate = parseFloat(row.materialUnitCost || 0) || 0;
        const newMatRate = parseFloat(match.pricePerUnit || 0) || 0;
        const oldRentalRate = parseFloat(row.laborUnitCost || 0) || 0;
        const newRentalRate = parseFloat(match.rentalPerUnit || 0) || 0;

        let changed = false;
        if (newMatRate > 0 && newMatRate !== oldMatRate) {
          row.materialUnitCost = newMatRate;
          changed = true;
        }
        if (newRentalRate > 0 && newRentalRate !== oldRentalRate) {
          row.laborUnitCost = newRentalRate;
          changed = true;
        }
        if (match.unit && match.unit !== row.unit) {
          row.unit = match.unit;
          changed = true;
        }

        if (changed) {
          updatedCount++;
          updatedItems.push(row.title);
        }
      }
    });

    return { updatedCount, items: updatedItems };
  }
};

// Auto-sync IndexedDB with localStorage when DOM is ready
if (typeof window !== 'undefined') {
  window.FCLStorage = FCLStorage;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => FCLStorage.syncToLocalStorage());
  } else {
    FCLStorage.syncToLocalStorage();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FCLStorage, FCL_STORAGE_KEYS };
}

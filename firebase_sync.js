/**
 * FCL Aranang Integrated Project Controls - Cloud Firestore Real-Time Synchronization Module
 * 
 * =========================================================================================
 * FREE FIREBASE CLOUD FIRESTORE SETUP GUIDE (Spark Plan - 100% Free Forever)
 * =========================================================================================
 * Free Quotas Provided by Google Cloud:
 *  - 20,000 document writes / day (Protected by debounced write queue in this module)
 *  - 50,000 document reads / day
 *  - 1 GiB total stored data
 *  - 10 GiB / month network egress
 * 
 * 5-MINUTE STEP-BY-STEP SETUP:
 * 1. Go to Google Firebase Console: https://console.firebase.google.com/
 * 2. Click "Add project", enter a name (e.g., "fcl-project-controls"), and click Continue.
 * 3. In the left sidebar, click "Build" > "Firestore Database" > click "Create database".
 *    - Location: choose your nearest region (e.g. asia-southeast1 / Singapore or Philippines).
 *    - Security rules: Choose "Start in test mode" (or configure rules below).
 * 4. In Project Overview / Project Settings (Gear icon) > "General":
 *    - Scroll down to "Your apps", click the Web icon ("</>").
 *    - Register app name (e.g., "FCL Web Controls").
 *    - Copy the `firebaseConfig` keys and paste them into DEFAULT_FIREBASE_CONFIG below,
 *      OR paste them into the "Cloud Settings" modal in the web app navigation bar.
 * 5. Security Rules (Firestore Database > Rules tab):
 *    rules_version = '2';
 *    service cloud.firestore {
 *      match /databases/{database}/documents {
 *        match /{document=**} {
 *          allow read, write: if true; // Open for team members with web app URL
 *        }
 *      }
 *    }
 * 6. Save & Publish rules. All devices & engineers are now synchronized in real-time!
 * =========================================================================================
 */

// DEFAULT CONFIGURATION - PMCC ESTIMATES PROJECT
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyD5VwDFQ5qWT2iOTHCSiHH4d7wM_R4ibyw",
  authDomain: "pmcc-2cb89.firebaseapp.com",
  projectId: "pmcc-2cb89",
  storageBucket: "pmcc-2cb89.firebasestorage.app",
  messagingSenderId: "1016255912023",
  appId: "1:1016255912023:web:6fe0c3573b89f7db3e2b12",
  measurementId: "G-2Y0H01W1XB"
};

const FCLFirebaseSync = {
  // Module State
  state: 'unconfigured', // 'unconfigured' | 'connecting' | 'connected' | 'syncing' | 'offline' | 'error'
  statusMessage: 'Local Mode (Unconfigured)',
  lastSyncTime: null,
  clientId: 'fcl_client_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
  db: null,
  app: null,
  
  // Debounce & Write Quota Protection
  debounceMs: 1200,
  _syncTimers: {},
  _pendingProjectSync: {},
  _pendingCatalogSync: null,
  _unsubscribers: [],
  _isInitialized: false,

  /**
   * Retrieves active configuration (prefers user-saved localStorage override, falls back to DEFAULT_FIREBASE_CONFIG)
   */
  getConfig() {
    try {
      const stored = localStorage.getItem('FCL_FIREBASE_CONFIG_OVERRIDE');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.projectId && parsed.projectId !== 'YOUR_PROJECT_ID') {
          return parsed;
        }
      }
    } catch (e) {}
    return DEFAULT_FIREBASE_CONFIG;
  },

  /**
   * Checks if Firebase is configured with real credentials (not placeholders)
   */
  isConfigured() {
    const config = this.getConfig();
    return !!(
      config &&
      config.projectId &&
      config.projectId !== 'YOUR_PROJECT_ID' &&
      config.apiKey &&
      config.apiKey !== 'YOUR_FIREBASE_API_KEY'
    );
  },

  /**
   * Initialize Firebase SDK, Firestore, Offline Persistence, and Snapshot Listeners
   */
  async init() {
    if (this._isInitialized && this.state === 'connected') return;

    if (!this.isConfigured()) {
      this._setState('unconfigured', 'Local Mode (Offline/Unconfigured)');
      console.info(
        '%c[FCL Cloud Sync]%c Firebase credentials not configured. App is running 100% offline via local IndexedDB.',
        'color: #2563eb; font-weight: bold;',
        'color: #64748b;'
      );
      this.updateBadges();
      return;
    }

    if (typeof firebase === 'undefined' || typeof firebase.firestore === 'undefined') {
      this._setState('offline', 'Offline (Firebase SDK Not Loaded)');
      console.warn('[FCL Cloud Sync] Firebase Compat SDK is not available. Operating in local offline mode.');
      this.updateBadges();
      return;
    }

    const config = this.getConfig();
    this._setState('connecting', 'Connecting to Cloud Firestore...');
    this.updateBadges();

    try {
      // 1. Initialize Firebase App
      if (!firebase.apps.length) {
        this.app = firebase.initializeApp(config);
      } else {
        this.app = firebase.app();
      }

      // 2. Initialize Firestore
      this.db = firebase.firestore();

      // 3. Enable offline persistence (IndexedDB client cache)
      try {
        await this.db.enablePersistence({ synchronizeTabs: true });
        console.log('[FCL Cloud Sync] Cloud Firestore multi-tab offline persistence enabled.');
      } catch (err) {
        if (err.code === 'failed-precondition') {
          console.warn('[FCL Cloud Sync] Multiple tabs open; offline persistence enabled in primary tab only.');
        } else if (err.code === 'unimplemented') {
          console.warn('[FCL Cloud Sync] Browser does not support Firestore IndexedDB persistence.');
        } else {
          console.warn('[FCL Cloud Sync] Persistence notice:', err.message);
        }
      }

      // 4. Attach real-time snapshot listeners
      this._initSnapshotListeners();

      // 5. Monitor browser online / offline state
      if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') window.addEventListener('online', () => {
        if (this.isConfigured() && this.db) {
          this._setState('connected', 'Cloud Synced');
          this.updateBadges();
          this._showToast('🌐 Internet restored. Cloud Firestore is active.', 'info');
        }
      });

      if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') window.addEventListener('offline', () => {
        this._setState('offline', 'Offline (IndexedDB Queued)');
        this.updateBadges();
        this._showToast('📡 You are offline. Changes will save locally and sync when reconnected.', 'warning');
      });

      this._isInitialized = true;
      this._setState('connected', 'Cloud Synced');
      this.updateBadges();
      console.log(`%c[FCL Cloud Sync]%c Connected to Firestore project: ${config.projectId}`, 'color: #10b981; font-weight: bold;', 'color: #0f172a;');

    } catch (err) {
      console.error('[FCL Cloud Sync] Initialization error:', err);
      this._setState('error', 'Cloud Connection Error');
      this.updateBadges();
    }
  },

  /**
   * Internal state setter
   */
  _setState(state, msg) {
    this.state = state;
    this.statusMessage = msg;
    this.updateBadges();
  },

  /**
   * Initialize Real-Time Listeners for Projects Collection and Catalog Document
   */
  _initSnapshotListeners() {
    if (!this.db) return;

    // Clear previous subscriptions
    this._unsubscribers.forEach(unsub => {
      try { unsub(); } catch (e) {}
    });
    this._unsubscribers = [];

    // Listener 1: Project Documents Collection
    try {
      const unsubProjects = this.db.collection('fcl_projects').onSnapshot(
        (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            const doc = change.doc;
            // Free-tier Quota & Loop Protection: Ignore writes originating from this client
            if (doc.metadata.hasPendingWrites) {
              return;
            }

            const data = doc.data();
            if (!data) return;

            // If the document was updated by this client in another tab or just confirmed
            if (data.updatedBy === this.clientId) {
              return;
            }

            // Remote change confirmed from another user / cloud device!
            this._handleRemoteProjectChange(doc.id, data, change.type);
          });
        },
        (error) => {
          console.warn('[FCL Cloud Sync] Projects snapshot listener warning:', error.message);
          if (!navigator.onLine) {
            this._setState('offline', 'Offline (Local IDB Mode)');
          } else {
            this._setState('error', 'Firestore Permission / Quota Issue');
          }
        }
      );
      this._unsubscribers.push(unsubProjects);
    } catch (e) {
      console.warn('[FCL Cloud Sync] Could not subscribe to fcl_projects:', e);
    }

    // Listener 2: System Catalog Document
    try {
      const unsubCatalog = this.db.collection('fcl_system').doc('catalog').onSnapshot(
        (doc) => {
          if (doc.metadata.hasPendingWrites) return;
          const data = doc.data();
          if (!data || data.updatedBy === this.clientId) return;

          if (Array.isArray(data.catalog)) {
            this._handleRemoteCatalogChange(data.catalog);
          }
        },
        (error) => {
          console.warn('[FCL Cloud Sync] Catalog listener error:', error.message);
        }
      );
      this._unsubscribers.push(unsubCatalog);
    } catch (e) {
      console.warn('[FCL Cloud Sync] Could not subscribe to fcl_system/catalog:', e);
    }
  },

  /**
   * Handle incoming remote project document changes
   */
  /**
   * Deeply cleans and sanitizes data for Cloud Firestore compatibility:
   * 1. Eliminates Firestore's "Nested arrays are not allowed / supported" restriction by wrapping inner arrays.
   * 2. Strips all unsupported `undefined` field values from objects.
   * 3. Drops functions, symbols, and DOM elements.
   * 4. Converts Date objects to ISO 8601 strings.
   * 5. Preserves Firestore FieldValues (e.g. serverTimestamp).
   */
  sanitizeForFirestore(val, depth = 0, insideArray = false) {
    if (val === undefined) {
      return insideArray ? null : undefined;
    }
    if (val === null) {
      return null;
    }
    if (typeof val === 'function' || typeof val === 'symbol') {
      return undefined;
    }
    if (typeof val !== 'object') {
      return val;
    }
    if (val instanceof Date) {
      return val.toISOString();
    }
    // Retain Firestore FieldValue instances (e.g. serverTimestamp)
    if (typeof firebase !== 'undefined' && firebase.firestore && firebase.firestore.FieldValue) {
      if (val === firebase.firestore.FieldValue.serverTimestamp() || (val && val._methodName)) {
        return val;
      }
    }
    if (typeof Element !== 'undefined' && val instanceof Element) {
      return undefined;
    }
    if (typeof Window !== 'undefined' && val instanceof Window) {
      return undefined;
    }
    if (Array.isArray(val)) {
      if (insideArray) {
        // Firestore strictly forbids nested arrays (array directly within another array)
        return {
          _isNestedArray: true,
          items: val
            .map(item => this.sanitizeForFirestore(item, depth + 1, false))
            .filter(item => item !== undefined)
        };
      }
      return val
        .map(item => this.sanitizeForFirestore(item, depth + 1, true))
        .filter(item => item !== undefined);
    }
    // Plain Object
    const clean = {};
    for (const key of Object.keys(val)) {
      if (typeof val[key] === 'function' || typeof val[key] === 'symbol') continue;
      if (typeof Element !== 'undefined' && val[key] instanceof Element) continue;
      const cleanedVal = this.sanitizeForFirestore(val[key], depth + 1, false);
      if (cleanedVal !== undefined) {
        clean[key] = cleanedVal;
      }
    }
    return clean;
  },

  /**
   * Reverses Firestore sanitization when reading documents:
   * Unwraps wrapped nested arrays back to standard native JavaScript arrays.
   */
  desanitizeFromFirestore(val) {
    if (!val || typeof val !== 'object') return val;
    if (Array.isArray(val)) {
      return val.map(item => this.desanitizeFromFirestore(item));
    }
    if (val._isNestedArray && Array.isArray(val.items)) {
      return val.items.map(item => this.desanitizeFromFirestore(item));
    }
    const result = {};
    for (const k of Object.keys(val)) {
      result[k] = this.desanitizeFromFirestore(val[k]);
    }
    return result;
  },

  /**
   * Handle incoming remote project document changes
   */
  _handleRemoteProjectChange(projectId, data, changeType) {
    if (typeof FCLStorage === 'undefined') return;

    const cleanData = this.desanitizeFromFirestore(data) || {};
    console.log(`[FCL Cloud Sync] Remote update received for project ${projectId}`, cleanData);

    // Update local storage without triggering recursive cloud push
    if (cleanData.boq) {
      const bData = cleanData.boq.boqData;
      const isCorrupted = Array.isArray(bData) &&
        bData.length > 0 &&
        bData.every(r => r.type === 'task' || (r.id && String(r.id).startsWith('task_item_'))) &&
        !bData.some(r => r.type === 'category' || (parseFloat(r.materialUnitCost) || 0) > 0 || (parseFloat(r.laborUnitCost || r.leUnitCost) || 0) > 0);
      if (!isCorrupted) {
        FCLStorage.saveProjectSection(projectId, 'boq', cleanData.boq, true);
      } else {
        console.warn(`[FCL Cloud Sync] Ignored corrupted BOQ remote payload for project ${projectId}`);
      }
    }
    const ganttVal = cleanData.gantt || cleanData.ganttSettings;
    if (ganttVal) {
      FCLStorage.saveProjectSection(projectId, 'ganttSettings', ganttVal, true);
    }
    if (cleanData.manpower) {
      FCLStorage.saveProjectSection(projectId, 'manpower', cleanData.manpower, true);
    }

    // Also update catalog item if present
    try {
      const catalog = FCLStorage.loadProjectCatalogSync();
      if (Array.isArray(catalog)) {
        const item = catalog.find(x => x.id === projectId);
        if (item) {
          if (cleanData.boq && cleanData.boq.totalBudget) item.totalBudget = cleanData.boq.totalBudget;
          if (cleanData.boq && cleanData.boq.actualProgress !== undefined) item.actualProgress = cleanData.boq.actualProgress;
          if (cleanData.metadata && cleanData.metadata.name) item.name = cleanData.metadata.name;
          FCLStorage.save('FCL_PROJECT_CATALOG_DATA', catalog);
        }
      }
    } catch (e) {}

    // Dispatch system-wide event for active views to re-render
    window.dispatchEvent(new CustomEvent('fcl:remote-update', {
      detail: {
        type: 'project',
        projectId: projectId,
        data: cleanData,
        changeType: changeType
      }
    }));

    const pName = (cleanData.metadata && cleanData.metadata.name) || projectId;
    this._showToast(`⚡ Live Update: "${pName}" was synced from cloud.`, 'success');
  },

  /**
   * Handle incoming remote catalog changes
   */
  _handleRemoteCatalogChange(newCatalog) {
    if (typeof FCLStorage === 'undefined') return;

    const cleanCatalog = this.desanitizeFromFirestore(newCatalog);
    console.log('[FCL Cloud Sync] Remote project catalog update received');
    FCLStorage.save('FCL_PROJECT_CATALOG_DATA', cleanCatalog);

    window.dispatchEvent(new CustomEvent('fcl:remote-update', {
      detail: {
        type: 'catalog',
        catalog: cleanCatalog
      }
    }));

    this._showToast('⚡ Live Update: Project portfolio list synced from cloud.', 'info');
  },

  /**
   * Queue and debounce a project update (Free-Tier Protection)
   * Merges boq, gantt, metadata into a single document write after debounce window.
   */
  queueProjectSync(projectId, partialData) {
    if (!this.isConfigured() || !this.db) return;

    if (!projectId) projectId = 'PRJ-2026-001';

    // 1. Merge into pending buffer
    if (!this._pendingProjectSync[projectId]) {
      this._pendingProjectSync[projectId] = {};
    }
    Object.assign(this._pendingProjectSync[projectId], partialData);

    // 2. Set syncing status
    this._setState('syncing', 'Syncing to Cloud...');
    this.updateBadges();

    // 3. Clear existing debounce timer
    if (this._syncTimers[projectId]) {
      clearTimeout(this._syncTimers[projectId]);
    }

    // 4. Set debounce timer (1200ms) to coalesce keystrokes into a single write
    this._syncTimers[projectId] = setTimeout(() => {
      this._flushProjectSync(projectId);
    }, this.debounceMs);
  },

  /**
   * Flush pending project update to Firestore
   */
  async _flushProjectSync(projectId) {
    const payload = this._pendingProjectSync[projectId];
    if (!payload || !this.db) return;

    // Clear pending buffer
    delete this._pendingProjectSync[projectId];
    delete this._syncTimers[projectId];

    try {
      const sanitizedPayload = this.sanitizeForFirestore(payload);
      const docPayload = {
        projectId: projectId,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: this.clientId,
        ...sanitizedPayload
      };

      await this.db.collection('fcl_projects').doc(projectId).set(docPayload, { merge: true });

      this.lastSyncTime = new Date();
      this._setState('connected', 'Cloud Synced');
      this.updateBadges();
      console.log(`[FCL Cloud Sync] Project ${projectId} successfully written to Cloud Firestore.`);
    } catch (err) {
      console.error(`[FCL Cloud Sync] Failed to sync project ${projectId}:`, err);
      if (!navigator.onLine) {
        this._setState('offline', 'Offline (IndexedDB Queued)');
      } else {
        const errorDetail = (err && err.message) || 'Cloud Sync Error';
        this._setState('error', 'Cloud Error: ' + errorDetail);
        this._showToast(`⚠️ Cloud Sync failed: ${errorDetail}`, 'warning');
      }
      this.updateBadges();
    }
  },

  /**
   * Queue and debounce catalog update
   */
  queueCatalogSync(catalog) {
    if (!this.isConfigured() || !this.db) return;

    this._pendingCatalogSync = catalog;
    this._setState('syncing', 'Syncing Portfolio...');
    this.updateBadges();

    if (this._syncTimers['catalog']) {
      clearTimeout(this._syncTimers['catalog']);
    }

    this._syncTimers['catalog'] = setTimeout(async () => {
      const cat = this._pendingCatalogSync;
      this._pendingCatalogSync = null;
      if (!cat) return;

      try {
        // Strip heavy redundant project payloads so catalog remains lightweight (< 50 KB)
        const compactCatalog = Array.isArray(cat) ? cat.map(p => {
          const item = { ...p };
          if (item.boq) {
            item.boq = {
              projectName: item.boq.projectName || item.name,
              totalBudget: item.boq.totalBudget || item.totalBudget || 0,
              actualProgress: item.boq.actualProgress !== undefined ? item.boq.actualProgress : (item.actualProgress || 0),
              itemCount: (item.boq.items ? item.boq.items.length : (item.boq.boqData ? item.boq.boqData.length : 0))
            };
          }
          if (item.timeline && item.timeline.ganttTasks) {
            item.timeline = {
              criticalState: item.timeline.criticalState || 'ON TRACK',
              taskCount: item.timeline.ganttTasks.length,
              phases: item.timeline.phases || []
            };
          }
          return item;
        }) : cat;

        const sanitizedCat = this.sanitizeForFirestore(compactCatalog);

        await this.db.collection('fcl_system').doc('catalog').set({
          catalog: sanitizedCat,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedBy: this.clientId
        }, { merge: true });

        this.lastSyncTime = new Date();
        this._setState('connected', 'Cloud Synced');
        this.updateBadges();
        console.log('[FCL Cloud Sync] Project catalog successfully updated in Cloud Firestore.');
      } catch (err) {
        console.error('[FCL Cloud Sync] Failed to sync catalog:', err);
      }
    }, this.debounceMs);
  },

  /**
   * Queue general section sync helper
   */
  queueSectionSync(projectId, section, data) {
    if (section === 'boq') {
      this.queueProjectSync(projectId, { boq: data });
    } else if (section === 'ganttSettings') {
      this.queueProjectSync(projectId, { gantt: data });
    } else if (section === 'cover') {
      this.queueProjectSync(projectId, { cover: data });
    } else if (section === 'manpower') {
      this.queueProjectSync(projectId, { manpower: data });
    }
  },

  /**
   * Update visual badge elements in DOM
   */
  updateBadges() {
    const badges = document.querySelectorAll('.fcl-cloud-badge');
    badges.forEach(badge => {
      this._renderBadgeContent(badge);
    });
  },

  /**
   * Render badge HTML and status styles
   */
  _renderBadgeContent(badge) {
    let icon = '🟡';
    let text = 'Local Mode';
    let bg = 'rgba(255, 255, 255, 0.08)';
    let border = 'rgba(255, 255, 255, 0.2)';
    let color = '#cbd5e1';

    if (this.state === 'connected') {
      icon = '☁️';
      text = 'Cloud Synced';
      bg = 'rgba(16, 185, 129, 0.15)';
      border = 'rgba(16, 185, 129, 0.4)';
      color = '#34d399';
    } else if (this.state === 'syncing') {
      icon = '🔄';
      text = 'Syncing...';
      bg = 'rgba(37, 99, 235, 0.2)';
      border = 'rgba(37, 99, 235, 0.5)';
      color = '#60a5fa';
    } else if (this.state === 'connecting') {
      icon = '⏳';
      text = 'Connecting...';
      bg = 'rgba(245, 158, 11, 0.15)';
      border = 'rgba(245, 158, 11, 0.4)';
      color = '#fbbf24';
    } else if (this.state === 'offline') {
      icon = '📡';
      text = 'Offline (IDB Active)';
      bg = 'rgba(245, 158, 11, 0.15)';
      border = 'rgba(245, 158, 11, 0.4)';
      color = '#fbbf24';
    } else if (this.state === 'error') {
      icon = '⚠️';
      text = 'Cloud Error';
      bg = 'rgba(239, 68, 68, 0.15)';
      border = 'rgba(239, 68, 68, 0.4)';
      color = '#f87171';
    } else {
      icon = '🟡';
      text = 'Local (Offline)';
      bg = 'rgba(148, 163, 184, 0.12)';
      border = 'rgba(148, 163, 184, 0.3)';
      color = '#94a3b8';
    }

    badge.style.background = bg;
    badge.style.borderColor = border;
    badge.style.color = color;
    badge.innerHTML = `
      <span style="font-size: 13px; line-height: 1;">${icon}</span>
      <span style="font-weight: 700; font-size: 11px; letter-spacing: -0.1px;">${text}</span>
    `;
    badge.title = `Cloud Firestore Status: ${this.statusMessage}. Click to configure credentials.`;
  },

  /**
   * Helper to create or attach a badge to a container
   */
  createBadgeElement() {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'fcl-cloud-badge ctrl-btn';
    btn.style.display = 'inline-flex';
    btn.style.alignItems = 'center';
    btn.style.gap = '6px';
    btn.style.padding = '6px 12px';
    btn.style.borderRadius = '20px';
    btn.style.border = '1px solid rgba(255, 255, 255, 0.2)';
    btn.style.cursor = 'pointer';
    btn.style.transition = 'all 0.2s ease';
    btn.style.fontFamily = 'inherit';
    btn.onclick = () => this.openConfigModal();
    this._renderBadgeContent(btn);
    return btn;
  },

  /**
   * Display Cloud Firestore Configuration & Sync Status Modal
   */
  openConfigModal() {
    let modal = document.getElementById('fclCloudConfigModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'fclCloudConfigModal';
      modal.className = 'modal-overlay';
      modal.style.position = 'fixed';
      modal.style.top = '0';
      modal.style.left = '0';
      modal.style.right = '0';
      modal.style.bottom = '0';
      modal.style.background = 'rgba(15, 23, 42, 0.7)';
      modal.style.backdropFilter = 'blur(4px)';
      modal.style.display = 'flex';
      modal.style.alignItems = 'center';
      modal.style.justifyContent = 'center';
      modal.style.zIndex = '99999';
      modal.style.padding = '16px';
      modal.onclick = (e) => {
        if (e.target === modal) modal.style.display = 'none';
      };
      document.body.appendChild(modal);
    }

    const currentConfig = this.getConfig();
    const isConf = this.isConfigured();
    const configStr = isConf ? JSON.stringify(currentConfig, null, 2) : '';

    modal.innerHTML = `
      <div class="modal-content" style="background:#ffffff; border-radius:14px; max-width:620px; width:100%; box-shadow:0 25px 50px rgba(0,0,0,0.3); border:1px solid #e2e8f0; overflow:hidden; font-family:'Inter', sans-serif;" onclick="event.stopPropagation()">
        <!-- Header -->
        <div style="background:#0f172a; color:#ffffff; padding:18px 24px; display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:34px; height:34px; border-radius:8px; background:linear-gradient(135deg, #2563eb, #1d4ed8); display:flex; align-items:center; justify-content:center; font-size:18px;">☁️</div>
            <div>
              <h3 style="margin:0; font-size:16px; font-weight:800; letter-spacing:-0.2px;">Cloud Firestore Real-Time Sync</h3>
              <div style="font-size:11px; color:#94a3b8; margin-top:2px;">Google Firebase Spark Plan &bull; 100% Free Collaboration</div>
            </div>
          </div>
          <button type="button" onclick="document.getElementById('fclCloudConfigModal').style.display='none'" style="background:none; border:none; color:#94a3b8; font-size:24px; line-height:1; cursor:pointer;" title="Close">&times;</button>
        </div>

        <!-- Body -->
        <div style="padding:22px 24px; max-height:75vh; overflow-y:auto;">
          <!-- Status Banner -->
          <div style="background:${isConf ? '#f0fdf4' : '#fffbeb'}; border:1px solid ${isConf ? '#bbf7d0' : '#fef08a'}; border-radius:8px; padding:12px 16px; margin-bottom:18px; display:flex; align-items:center; justify-content:space-between;">
            <div>
              <div style="font-size:11px; font-weight:700; color:${isConf ? '#15803d' : '#854d0e'}; text-transform:uppercase;">Current Connection Status</div>
              <div style="font-size:14px; font-weight:800; color:#0f172a; margin-top:2px;">
                ${this.state === 'connected' ? '🟢 Connected & Live Synced' : (this.state === 'syncing' ? '🔄 Syncing Changes...' : (this.state === 'offline' ? '📡 Offline (Queued locally)' : '🟡 Local Mode (Unconfigured)'))}
              </div>
              <div style="font-size:11px; color:#64748b; margin-top:2px;">${this.statusMessage}</div>
            </div>
            ${this.lastSyncTime ? `<div style="text-align:right; font-size:10.5px; color:#64748b;">Last cloud sync:<br><strong>${this.lastSyncTime.toLocaleTimeString()}</strong></div>` : ''}
          </div>

          <!-- Explanation & Free Tier Info -->
          <p style="font-size:12px; color:#475569; line-height:1.5; margin-bottom:16px;">
            Synchronize your <strong>Bill of Quantities (BOQ)</strong>, <strong>Gantt Timeline Schedules</strong>, and <strong>Multi-Project Portfolio</strong> automatically across all engineers, estimators, and job site devices.
          </p>

          <!-- Input Form -->
          <div style="margin-bottom:14px;">
            <label style="display:block; font-size:12px; font-weight:700; color:#0f172a; margin-bottom:6px;">
              Paste Firebase Config JSON Object:
            </label>
            <textarea id="fclFirebaseJsonInput" rows="7" style="width:100%; box-sizing:border-box; padding:10px 12px; font-family:monospace; font-size:11.5px; border:1px solid #cbd5e1; border-radius:8px; background:#f8fafc; color:#0f172a; resize:vertical;" placeholder='{\n  "apiKey": "AIzaSy...",\n  "authDomain": "fcl-project.firebaseapp.com",\n  "projectId": "fcl-project-2026",\n  "storageBucket": "fcl-project.appspot.com",\n  "messagingSenderId": "123456789",\n  "appId": "1:123456789:web:abcdef"\n}'>${configStr}</textarea>
            <div style="font-size:11px; color:#64748b; margin-top:4px;">
              You can copy this directly from your <strong>Firebase Console &rarr; Project Settings &rarr; General &rarr; Your apps &rarr; firebaseConfig</strong>.
            </div>
          </div>

          <!-- Quick Setup Instructions Accordion -->
          <div style="background:#f1f5f9; border-radius:8px; padding:12px 14px; font-size:11.5px; color:#334155; line-height:1.5; margin-bottom:16px;">
            <strong style="color:#0f172a; display:block; margin-bottom:4px;">Need to create a free Firebase project? (Takes 2 minutes)</strong>
            <ol style="margin-left:18px; padding:0; display:flex; flex-direction:column; gap:3px;">
              <li>Go to <a href="https://console.firebase.google.com/" target="_blank" style="color:#2563eb; font-weight:700; text-decoration:underline;">console.firebase.google.com</a> and sign in with any Google account.</li>
              <li>Click <strong>Add project</strong> (e.g. <em>fcl-construction</em>).</li>
              <li>Go to <strong>Build &rarr; Firestore Database</strong> &rarr; Click <strong>Create database</strong> (choose Test Mode).</li>
              <li>Under <strong>Project Settings</strong>, click <strong>Web (&lt;/&gt;)</strong> to register app and copy the credentials snippet.</li>
            </ol>
          </div>
        </div>

        <!-- Footer Actions -->
        <div style="background:#f8fafc; padding:14px 24px; border-top:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
          <div>
            ${isConf ? `
              <button type="button" onclick="FCLFirebaseSync.clearConfig()" style="background:#fee2e2; color:#b91c1c; border:1px solid #fecaca; padding:7px 12px; font-size:11.5px; font-weight:700; border-radius:6px; cursor:pointer;">
                Disconnect Cloud
              </button>
            ` : ''}
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button type="button" onclick="document.getElementById('fclCloudConfigModal').style.display='none'; FCLCloudVault.openVaultModal();" style="background:#1e40af; color:#ffffff; border:none; padding:7px 14px; font-size:12px; font-weight:700; border-radius:6px; cursor:pointer; display:inline-flex; align-items:center; gap:5px;" title="Open Cloud File Vault">
              📁 Cloud Vault
            </button>
            <button type="button" id="btnTestCloudPing" onclick="FCLFirebaseSync.testCloudPingFromModal(this)" style="background:#059669; color:#ffffff; border:none; padding:7px 14px; font-size:12px; font-weight:700; border-radius:6px; cursor:pointer; display:inline-flex; align-items:center; gap:5px;" title="Test Cloud Latency">
              ⚡ Test Ping
            </button>
            <button type="button" onclick="document.getElementById('fclCloudConfigModal').style.display='none'" style="background:#ffffff; color:#475569; border:1px solid #cbd5e1; padding:7px 14px; font-size:12px; font-weight:600; border-radius:6px; cursor:pointer;">
              Close
            </button>
            <button type="button" onclick="FCLFirebaseSync.saveConfigFromModal()" style="background:#2563eb; color:#ffffff; border:none; padding:7px 18px; font-size:12px; font-weight:700; border-radius:6px; cursor:pointer; box-shadow:0 2px 6px rgba(37,99,235,0.3);">
              Save &amp; Connect Cloud
            </button>
          </div>
        </div>
      </div>
    `;

    modal.style.display = 'flex';
  },

  /**
   * Save config pasted in modal (supports raw JS snippet, JSON, or key-value pairs)
   */
  async saveConfigFromModal() {
    const input = document.getElementById('fclFirebaseJsonInput');
    if (!input) return;
    const text = input.value.trim();
    if (!text) {
      alert('Please enter or paste your Firebase configuration.');
      return;
    }

    try {
      let configObj = null;

      // Strategy 1: Direct JSON.parse
      try {
        const p = JSON.parse(text);
        if (p && p.projectId) configObj = p;
      } catch (e) {}

      // Strategy 2: Extract {...} block and evaluate JS object literal
      if (!configObj) {
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          try {
            const fn = new Function('return (' + match[0] + ');');
            const evaluated = fn();
            if (evaluated && typeof evaluated === 'object' && evaluated.projectId) {
              configObj = evaluated;
            }
          } catch (e) {}

          // Strategy 3: Quote unquoted keys and parse as JSON
          if (!configObj) {
            try {
              const jsonified = match[0]
                .replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":')
                .replace(/:\s*'([^']*)'/g, ': "$1"')
                .replace(/,\s*([}\]])/g, '$1');
              const p = JSON.parse(jsonified);
              if (p && p.projectId) configObj = p;
            } catch (e) {}
          }
        }
      }

      // Strategy 4: Direct regex key-value extraction for all standard Firebase keys
      if (!configObj) {
        const keys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
        const extracted = {};
        keys.forEach(k => {
          const re = new RegExp('["\']?' + k + '["\']?\\s*[:=]\\s*["\']([^"\'\\r\\n]+)["\']', 'i');
          const m = text.match(re);
          if (m && m[1]) extracted[k] = m[1].trim();
        });
        if (extracted.projectId && extracted.apiKey) {
          configObj = extracted;
        }
      }

      if (!configObj || !configObj.projectId) {
        throw new Error('Could not find a valid "projectId" or "apiKey" in the pasted configuration.');
      }

      localStorage.setItem('FCL_FIREBASE_CONFIG_OVERRIDE', JSON.stringify(configObj));
      this._isInitialized = false;
      await this.init();

      const modal = document.getElementById('fclCloudConfigModal');
      if (modal) modal.style.display = 'none';

      this._showToast('✅ Cloud Firestore configuration saved and connected!', 'success');
    } catch (err) {
      alert('Could not parse Firebase configuration: ' + err.message + '\n\nPlease ensure your configuration includes "apiKey" and "projectId".');
    }
  },

  /**
   * Disconnect and clear credentials
   */
  clearConfig() {
    if (confirm('Disconnect from Cloud Firestore and return to local offline storage?')) {
      localStorage.removeItem('FCL_FIREBASE_CONFIG_OVERRIDE');
      this._unsubscribers.forEach(u => { try { u(); } catch(e){} });
      this._unsubscribers = [];
      this.db = null;
      this._isInitialized = false;
      this._setState('unconfigured', 'Local Mode (Unconfigured)');
      const modal = document.getElementById('fclCloudConfigModal');
      if (modal) modal.style.display = 'none';
      this._showToast('Cloud Firestore disconnected. Operating in local mode.', 'info');
    }
  },

  /**
   * Lightweight toast notification helper
   */

  /**
   * Ping Cloud Firestore to test latency and connectivity
   */
  async testConnection() {
    if (!this.isConfigured()) {
      return { success: false, message: 'Firebase credentials are not configured.' };
    }
    if (!this.db) {
      await this.init();
    }
    if (!this.db) {
      return { success: false, message: 'Could not connect to Firestore database.' };
    }

    const t0 = performance.now();
    try {
      const pingRef = this.db.collection('fcl_system').doc('ping');
      await pingRef.set({
        lastPingAt: firebase.firestore.FieldValue.serverTimestamp(),
        clientId: this.clientId,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Node/Browser'
      }, { merge: true });
      const latencyMs = Math.round(performance.now() - t0);
      this.lastSyncTime = new Date();
      this._setState('connected', `Cloud Synced (${latencyMs}ms)`);
      this.updateBadges();
      return { success: true, latency: latencyMs, message: `Connected to Cloud Firestore (Latency: ${latencyMs}ms)` };
    } catch (err) {
      console.error('[FCL Cloud Sync] Ping test failed:', err);
      return { success: false, message: err.message };
    }
  },

  async testCloudPingFromModal(btn) {
    if (!btn) btn = document.getElementById('btnTestCloudPing');
    const origHtml = btn ? btn.innerHTML : '';
    if (btn) {
      btn.innerHTML = '⏳ Testing...';
      btn.disabled = true;
    }

    const res = await this.testConnection();
    if (btn) {
      btn.innerHTML = origHtml;
      btn.disabled = false;
    }

    if (res.success) {
      this._showToast(`⚡ ${res.message}`, 'success');
      const statusBox = document.getElementById('fclCloudPingStatus');
      if (statusBox) {
        statusBox.innerHTML = `🟢 <strong>Cloud Online</strong> &bull; Latency: ${res.latency}ms &bull; Project: <code>${this.getConfig().projectId}</code>`;
        statusBox.style.display = 'block';
      }
    } else {
      this._showToast(`⚠️ Connection Test: ${res.message}`, 'warning');
      const statusBox = document.getElementById('fclCloudPingStatus');
      if (statusBox) {
        statusBox.innerHTML = `🔴 <strong>Connection Failed</strong>: ${res.message}`;
        statusBox.style.display = 'block';
      }
    }
  },

  _showToast(msg, type = 'info') {
    if (typeof document === 'undefined' || !document.body) return;
    let toast = document.getElementById('fclSyncToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'fclSyncToast';
      toast.style.position = 'fixed';
      toast.style.bottom = '20px';
      toast.style.right = '20px';
      toast.style.zIndex = '999999';
      toast.style.maxWidth = '360px';
      toast.style.padding = '10px 16px';
      toast.style.borderRadius = '8px';
      toast.style.fontSize = '12px';
      toast.style.fontWeight = '600';
      toast.style.boxShadow = '0 10px 25px rgba(0,0,0,0.2)';
      toast.style.transition = 'all 0.3s ease';
      toast.style.display = 'none';
      toast.style.fontFamily = "'Inter', sans-serif";
      document.body.appendChild(toast);
    }

    let bg = '#0f172a';
    let text = '#ffffff';
    let border = '#334155';

    if (type === 'success') {
      bg = '#065f46';
      text = '#ecfdf5';
      border = '#059669';
    } else if (type === 'warning') {
      bg = '#92400e';
      text = '#fffbeb';
      border = '#d97706';
    } else if (type === 'info') {
      bg = '#1e3a8a';
      text = '#eff6ff';
      border = '#2563eb';
    }

    toast.style.background = bg;
    toast.style.color = text;
    toast.style.border = `1px solid ${border}`;
    toast.innerHTML = msg;
    toast.style.display = 'block';
    toast.style.opacity = '1';

    if (this._toastTimer) clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => { toast.style.display = 'none'; }, 300);
    }, 4000);
  }
};

// Auto-initialize when window and DOM are ready
if (typeof window !== 'undefined') {
  window.FCLFirebaseSync = FCLFirebaseSync;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => FCLFirebaseSync.init());
  } else {
    FCLFirebaseSync.init();
  }
}


/**
 * =========================================================================================
 * FCL Aranang Cloud File Vault Module
 * =========================================================================================
 * Allows engineers and estimators to:
 * 1. Save full project file snapshots (.fclproj) to Firebase Cloud Firestore & Cloud Storage.
 * 2. Browse, filter, search, and manage cloud snapshots across all devices.
 * 3. Load / restore any cloud snapshot version into the workspace with 1 click.
 * 4. Download any cloud snapshot directly as an .fclproj file for offline archival.
 * 5. Upload external .fclproj, .json, or Excel (.xlsx) files directly into the Cloud Vault.
 * =========================================================================================
 */
const FCLCloudVault = {
  _modalId: 'fclCloudVaultModal',
  _snapshots: [],
  _isLoading: false,
  _activeTab: 'list', // 'list' | 'save' | 'upload' | 'status'
  _searchFilter: '',
  _selectedFile: null,

  isReady() {
    return typeof FCLFirebaseSync !== 'undefined' && FCLFirebaseSync.isConfigured() && FCLFirebaseSync.db;
  },

  getCollection() {
    if (!this.isReady()) return null;
    return FCLFirebaseSync.db.collection('fcl_cloud_vault');
  },

  async buildProjectBundle(scope = 'active') {
    if (typeof FCLStorage === 'undefined') {
      throw new Error('FCLStorage module is not available.');
    }

    const activeId = FCLStorage.getActiveProjectId();
    const boqData = (await FCLStorage.loadProjectBOQ(activeId)) || (await FCLStorage.load(FCL_STORAGE_KEYS.boq)) || FCLStorage.readSync(FCL_STORAGE_KEYS.boq) || {};
    const dupaData = (await FCLStorage.load(FCL_STORAGE_KEYS.dupa)) || FCLStorage.readSync(FCL_STORAGE_KEYS.dupa) || {};
    const priceListData = (await FCLStorage.load(FCL_STORAGE_KEYS.priceList)) || FCLStorage.readSync(FCL_STORAGE_KEYS.priceList) || {};
    const coverData = (await FCLStorage.load(FCL_STORAGE_KEYS.cover)) || FCLStorage.readSync(FCL_STORAGE_KEYS.cover) || {};
    const ganttSettings = (await FCLStorage.loadProjectGantt(activeId)) || (await FCLStorage.load(FCL_STORAGE_KEYS.ganttSettings)) || FCLStorage.readSync(FCL_STORAGE_KEYS.ganttSettings) || {};
    const ganttStartDate = (await FCLStorage.load(FCL_STORAGE_KEYS.ganttStartDate)) || FCLStorage.readSync(FCL_STORAGE_KEYS.ganttStartDate) || '';
    const manpowerData = (await FCLStorage.loadProjectManpower(activeId)) || (await FCLStorage.load(FCL_STORAGE_KEYS.manpower)) || FCLStorage.readSync(FCL_STORAGE_KEYS.manpower) || {};
    const catalog = FCLStorage.readSync('FCL_PROJECT_CATALOG_DATA') || null;

    const projectName = (boqData.projectFields && boqData.projectFields.projectName) || 'Construction_Project';
    const projectCode = (boqData.projectFields && boqData.projectFields.projectCode) || activeId;

    const projectsData = {};
    if (scope === 'all' && Array.isArray(catalog)) {
      for (const p of catalog) {
        projectsData[p.id] = {
          boq: (await FCLStorage.loadProjectBOQ(p.id)) || p.boq || null,
          gantt: (await FCLStorage.loadProjectGantt(p.id)) || p.timeline || null,
          manpower: (await FCLStorage.loadProjectManpower(p.id)) || p.manpower || null
        };
      }
    } else {
      projectsData[activeId] = {
        boq: boqData,
        gantt: ganttSettings,
        manpower: manpowerData
      };
    }

    return {
      app: 'FCLDC_Integrated_Project_Controls',
      version: '2.0',
      format: 'FCLPROJ_V2',
      exportedAt: new Date().toISOString(),
      activeProjectId: activeId,
      scope: scope,
      metadata: {
        projectName: projectName,
        projectCode: projectCode,
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
        ganttSettings: ganttSettings,
        ganttStartDate: ganttStartDate,
        manpower: manpowerData
      }
    };
  },

  async saveSnapshot(customName, description = '', scope = 'active') {
    if (!this.isReady()) {
      await FCLFirebaseSync.init();
      if (!this.isReady()) {
        alert('Cloud connection is not ready. Please connect to Firebase first.');
        return false;
      }
    }

    const bundle = await this.buildProjectBundle(scope);
    const projName = bundle.metadata.projectName || 'Project';
    const projCode = bundle.metadata.projectCode || bundle.activeProjectId || 'PRJ';
    const snapName = customName && customName.trim() ? customName.trim() : `${projName} - ${new Date().toLocaleDateString()}`;
    const safeTitle = snapName.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().replace(/\s+/g, '_');
    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `${projCode}_${safeTitle}_${dateStr}.fclproj`;

    const jsonStr = JSON.stringify(bundle);
    const sizeBytes = new Blob([jsonStr]).size;
    const sizeFormatted = sizeBytes > 1048576 
      ? (sizeBytes / 1048576).toFixed(2) + ' MB'
      : (sizeBytes / 1024).toFixed(1) + ' KB';

    const snapId = 'snap_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);

    const docData = {
      id: snapId,
      name: snapName,
      fileName: fileName,
      description: description || '',
      scope: scope,
      projectId: bundle.activeProjectId,
      projectName: projName,
      projectCode: projCode,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      createdAtIso: new Date().toISOString(),
      fileSize: sizeBytes,
      sizeFormatted: sizeFormatted,
      itemCounts: {
        boq: (bundle.sections.boq && Array.isArray(bundle.sections.boq.boqData)) ? bundle.sections.boq.boqData.length : 0,
        tasks: (bundle.sections.ganttSettings && Array.isArray(bundle.sections.ganttSettings.ganttTasks)) ? bundle.sections.ganttSettings.ganttTasks.length : 0,
        dupa: (bundle.sections.dupa && Array.isArray(bundle.sections.dupa.analysisData)) ? bundle.sections.dupa.analysisData.length : 0
      },
      bundleJson: jsonStr,
      savedBy: FCLFirebaseSync.clientId
    };

    const coll = this.getCollection();
    await coll.doc(snapId).set(docData);

    // Optional upload to Firebase Storage if available
    if (typeof firebase !== 'undefined' && firebase.storage && FCLFirebaseSync.getConfig().storageBucket) {
      try {
        const storageRef = firebase.storage().ref();
        const fileRef = storageRef.child(`snapshots/${fileName}`);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        await fileRef.put(blob);
        const downloadUrl = await fileRef.getDownloadURL();
        await coll.doc(snapId).update({ storageUrl: downloadUrl });
      } catch (stErr) {
        console.warn('[FCL Cloud Vault] Firebase Storage optional upload:', stErr.message);
      }
    }

    FCLFirebaseSync._showToast(`☁️ Cloud Snapshot "${snapName}" saved successfully!`, 'success');
    return snapId;
  },

  async fetchSnapshots() {
    if (!this.isReady()) {
      await FCLFirebaseSync.init();
      if (!this.isReady()) return [];
    }

    const coll = this.getCollection();
    if (!coll) return [];

    try {
      const snap = await coll.get();
      const list = [];
      snap.forEach(doc => {
        const d = doc.data();
        d.id = doc.id;
        list.push(d);
      });
      // Sort newest first
      list.sort((a, b) => {
        const timeA = a.createdAtIso ? new Date(a.createdAtIso).getTime() : 0;
        const timeB = b.createdAtIso ? new Date(b.createdAtIso).getTime() : 0;
        return timeB - timeA;
      });
      this._snapshots = list;
      return list;
    } catch (err) {
      console.error('[FCL Cloud Vault] fetchSnapshots error:', err);
      return [];
    }
  },

  async loadSnapshot(snapshotId) {
    let item = this._snapshots.find(s => s.id === snapshotId);
    if (!item) {
      const coll = this.getCollection();
      const doc = await coll.doc(snapshotId).get();
      if (!doc.exists) {
        alert('Snapshot not found in Cloud Vault.');
        return;
      }
      item = doc.data();
      item.id = doc.id;
    }

    const confirmMsg = `Load Cloud Snapshot "${item.name}"?\n\nProject: ${item.projectName} (${item.projectCode || item.projectId})\nSaved: ${item.createdAtIso ? new Date(item.createdAtIso).toLocaleString() : 'Recent'}\n\nThis will restore all Bill of Quantities, Gantt Schedule, and Cost Estimate data into your workspace.`;
    if (!confirm(confirmMsg)) return;

    try {
      let bundle = null;
      if (item.bundleJson) {
        bundle = JSON.parse(item.bundleJson);
      } else if (item.bundle) {
        bundle = item.bundle;
      } else if (item.storageUrl) {
        const res = await fetch(item.storageUrl);
        bundle = await res.json();
      }

      if (!bundle || (!bundle.sections && !bundle.app && !bundle.catalog)) {
        throw new Error('Invalid project file format in cloud snapshot.');
      }

      const sections = bundle.sections || bundle;

      if (sections.priceList) {
        await FCLStorage.save(FCL_STORAGE_KEYS.priceList, sections.priceList);
      }
      if (sections.dupa) {
        await FCLStorage.save(FCL_STORAGE_KEYS.dupa, sections.dupa);
      }
      if (sections.boq) {
        await FCLStorage.save(FCL_STORAGE_KEYS.boq, sections.boq);
      }
      if (sections.cover) {
        await FCLStorage.save(FCL_STORAGE_KEYS.cover, sections.cover);
      }
      if (sections.ganttSettings) {
        await FCLStorage.save(FCL_STORAGE_KEYS.ganttSettings, sections.ganttSettings);
      }
      if (sections.ganttStartDate) {
        await FCLStorage.save(FCL_STORAGE_KEYS.ganttStartDate, sections.ganttStartDate);
      }
      if (sections.manpower) {
        await FCLStorage.save(FCL_STORAGE_KEYS.manpower, sections.manpower);
      }

      if (bundle.catalog && Array.isArray(bundle.catalog)) {
        await FCLStorage.save('FCL_PROJECT_CATALOG_DATA', bundle.catalog);
      }
      if (bundle.projectsData && typeof bundle.projectsData === 'object') {
        for (const [pId, pData] of Object.entries(bundle.projectsData)) {
          if (pData.boq) await FCLStorage.saveProjectBOQ(pId, pData.boq);
          if (pData.gantt) await FCLStorage.saveProjectGantt(pId, pData.gantt);
          if (pData.manpower) await FCLStorage.saveProjectManpower(pId, pData.manpower);
        }
      }
      if (bundle.activeProjectId) {
        FCLStorage.setActiveProjectId(bundle.activeProjectId);
      }

      FCLFirebaseSync._showToast(`✅ Snapshot "${item.name}" loaded successfully!`, 'success');
      this.closeModal();

      setTimeout(() => {
        window.location.reload();
      }, 500);

    } catch (err) {
      alert('Failed to load cloud snapshot: ' + err.message);
    }
  },

  async downloadSnapshot(snapshotId) {
    let item = this._snapshots.find(s => s.id === snapshotId);
    if (!item) {
      const coll = this.getCollection();
      const doc = await coll.doc(snapshotId).get();
      if (!doc.exists) {
        alert('Snapshot not found in Cloud Vault.');
        return;
      }
      item = doc.data();
    }

    const jsonStr = item.bundleJson || JSON.stringify(item.bundle, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = item.fileName || `${item.name}.fclproj`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    FCLFirebaseSync._showToast(`💾 Downloaded "${a.download}"`, 'info');
  },

  async deleteSnapshot(snapshotId) {
    const item = this._snapshots.find(s => s.id === snapshotId);
    const name = item ? item.name : 'this snapshot';
    if (!confirm(`Are you sure you want to delete "${name}" from Cloud Vault?\nThis action cannot be undone.`)) {
      return;
    }
    try {
      const coll = this.getCollection();
      await coll.doc(snapshotId).delete();
      this._snapshots = this._snapshots.filter(s => s.id !== snapshotId);
      FCLFirebaseSync._showToast(`🗑️ Snapshot deleted from Cloud Vault.`, 'warning');
      this.renderSnapshotList();
    } catch (err) {
      alert('Could not delete snapshot: ' + err.message);
    }
  },

  closeModal() {
    const modal = document.getElementById(this._modalId);
    if (modal) modal.style.display = 'none';
  },

  switchTab(tab) {
    this._activeTab = tab;
    this.updateTabHeaders();
    const tabPanels = ['list', 'save', 'upload', 'status'];
    tabPanels.forEach(t => {
      const p = document.getElementById(`fclVaultTab_${t}`);
      if (p) p.style.display = (t === tab) ? 'block' : 'none';
    });

    if (tab === 'list') {
      this.renderSnapshotList();
    } else if (tab === 'save') {
      this.prepareSaveTab();
    }
  },

  updateTabHeaders() {
    const tabButtons = ['list', 'save', 'upload', 'status'];
    tabButtons.forEach(t => {
      const btn = document.getElementById(`fclVaultTabBtn_${t}`);
      if (btn) {
        if (t === this._activeTab) {
          btn.style.color = '#2563eb';
          btn.style.borderBottom = '2px solid #2563eb';
          btn.style.fontWeight = '700';
          btn.style.background = '#f8fafc';
        } else {
          btn.style.color = '#64748b';
          btn.style.borderBottom = '2px solid transparent';
          btn.style.fontWeight = '600';
          btn.style.background = 'transparent';
        }
      }
    });
  },

  prepareSaveTab() {
    const activeId = (typeof FCLStorage !== 'undefined') ? FCLStorage.getActiveProjectId() : 'PRJ-2026-001';
    let projName = 'Construction Project';
    let totalBudget = '₱0.00';
    let boqCount = 0;
    let taskCount = 0;

    try {
      const boq = FCLStorage.readProjectSectionSync(activeId, 'boq') || FCLStorage.readSync(FCL_STORAGE_KEYS.boq);
      if (boq) {
        if (boq.projectFields && boq.projectFields.projectName) projName = boq.projectFields.projectName;
        if (boq.totalBudget) {
          totalBudget = '₱' + Number(boq.totalBudget).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
        if (Array.isArray(boq.boqData)) boqCount = boq.boqData.length;
      }
      const gantt = FCLStorage.readProjectSectionSync(activeId, 'ganttSettings') || FCLStorage.readSync(FCL_STORAGE_KEYS.ganttSettings);
      if (gantt && Array.isArray(gantt.ganttTasks)) {
        taskCount = gantt.ganttTasks.length;
      }
    } catch (e) {}

    const nameInput = document.getElementById('fclVaultSaveTitle');
    if (nameInput) {
      nameInput.value = `${projName} - Baseline ${new Date().toLocaleDateString()}`;
    }

    const badge = document.getElementById('fclVaultActiveProjSummary');
    if (badge) {
      badge.innerHTML = `
        <div style="font-weight:700; color:#0f172a; font-size:13px;">${projName} <span style="font-size:11px; color:#2563eb; background:#eff6ff; padding:2px 8px; border-radius:12px; border:1px solid #bfdbfe;">${activeId}</span></div>
        <div style="font-size:11.5px; color:#64748b; margin-top:4px;">
          Budget: <strong>${totalBudget}</strong> &bull; <strong>${boqCount}</strong> BOQ Items &bull; <strong>${taskCount}</strong> Scheduled Tasks
        </div>
      `;
    }
  },

  async handleSaveFormSubmit() {
    const nameInput = document.getElementById('fclVaultSaveTitle');
    const descInput = document.getElementById('fclVaultSaveDesc');
    const scopeRadio = document.querySelector('input[name="fclVaultScope"]:checked');
    const btn = document.getElementById('fclVaultSaveSubmitBtn');

    const name = nameInput ? nameInput.value.trim() : '';
    if (!name) {
      alert('Please enter a name for your cloud snapshot.');
      return;
    }

    const desc = descInput ? descInput.value.trim() : '';
    const scope = scopeRadio ? scopeRadio.value : 'active';

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '⏳ Uploading to Cloud Vault...';
    }

    try {
      await this.saveSnapshot(name, desc, scope);
      await this.fetchSnapshots();
      this.switchTab('list');
    } catch (err) {
      alert('Failed to save snapshot to cloud: ' + err.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '☁️ Save Snapshot to Cloud Vault';
      }
    }
  },

  async handleUploadFile(file) {
    if (!file) return;
    const isExcel = /\.(xlsx|xls|xlsm|xlsb|csv)$/i.test(file.name);
    const customTitleInput = document.getElementById('fclVaultUploadTitle');
    const customDescInput = document.getElementById('fclVaultUploadDesc');
    const btn = document.getElementById('fclVaultUploadSubmitBtn');

    let customName = customTitleInput ? customTitleInput.value.trim() : '';
    if (!customName) {
      customName = file.name.replace(/\.[^/.]+$/, '').replace(/[_+-]/g, ' ');
    }
    const description = customDescInput ? customDescInput.value.trim() : `Uploaded from ${file.name}`;

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '⏳ Processing & Uploading...';
    }

    try {
      if (isExcel) {
        if (typeof XLSX === 'undefined') {
          throw new Error('Excel parser library (XLSX) is not ready. Please use a .fclproj or .json file.');
        }
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const { bundle } = FCLStorage.parseMasterExcelWorkbook(workbook, file.name);
        
        const jsonStr = JSON.stringify(bundle);
        const sizeBytes = new Blob([jsonStr]).size;
        const sizeFormatted = sizeBytes > 1048576 ? (sizeBytes / 1048576).toFixed(2) + ' MB' : (sizeBytes / 1024).toFixed(1) + ' KB';
        const snapId = 'snap_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);

        const docData = {
          id: snapId,
          name: customName,
          fileName: file.name.replace(/\.[^/.]+$/, '') + '.fclproj',
          description: description,
          scope: 'imported_excel',
          projectId: bundle.activeProjectId || 'PRJ-IMPORTED',
          projectName: (bundle.metadata && bundle.metadata.projectName) || customName,
          projectCode: (bundle.metadata && bundle.metadata.projectCode) || 'PRJ-IMP',
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          createdAtIso: new Date().toISOString(),
          fileSize: sizeBytes,
          sizeFormatted: sizeFormatted,
          itemCounts: {
            boq: (bundle.sections.boq && Array.isArray(bundle.sections.boq.boqData)) ? bundle.sections.boq.boqData.length : 0,
            tasks: (bundle.sections.ganttSettings && Array.isArray(bundle.sections.ganttSettings.ganttTasks)) ? bundle.sections.ganttSettings.ganttTasks.length : 0,
            dupa: (bundle.sections.dupa && Array.isArray(bundle.sections.dupa.analysisData)) ? bundle.sections.dupa.analysisData.length : 0
          },
          bundleJson: jsonStr,
          savedBy: FCLFirebaseSync.clientId
        };

        const coll = this.getCollection();
        await coll.doc(snapId).set(docData);
      } else {
        // .fclproj or .json
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (!parsed || (!parsed.sections && !parsed.app && !parsed.catalog)) {
          throw new Error('Invalid project file format. File must contain project sections or bundle.');
        }

        const sizeBytes = new Blob([text]).size;
        const sizeFormatted = sizeBytes > 1048576 ? (sizeBytes / 1048576).toFixed(2) + ' MB' : (sizeBytes / 1024).toFixed(1) + ' KB';
        const snapId = 'snap_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);

        const docData = {
          id: snapId,
          name: customName,
          fileName: file.name.endsWith('.fclproj') ? file.name : (file.name.replace(/\.[^/.]+$/, '') + '.fclproj'),
          description: description,
          scope: parsed.scope || 'imported_file',
          projectId: parsed.activeProjectId || (parsed.metadata && parsed.metadata.projectCode) || 'PRJ-2026-001',
          projectName: (parsed.metadata && parsed.metadata.projectName) || customName,
          projectCode: (parsed.metadata && parsed.metadata.projectCode) || 'PRJ',
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          createdAtIso: new Date().toISOString(),
          fileSize: sizeBytes,
          sizeFormatted: sizeFormatted,
          itemCounts: {
            boq: (parsed.sections && parsed.sections.boq && Array.isArray(parsed.sections.boq.boqData)) ? parsed.sections.boq.boqData.length : 0,
            tasks: (parsed.sections && parsed.sections.ganttSettings && Array.isArray(parsed.sections.ganttSettings.ganttTasks)) ? parsed.sections.ganttSettings.ganttTasks.length : 0,
            dupa: (parsed.sections && parsed.sections.dupa && Array.isArray(parsed.sections.dupa.analysisData)) ? parsed.sections.dupa.analysisData.length : 0
          },
          bundleJson: text,
          savedBy: FCLFirebaseSync.clientId
        };

        const coll = this.getCollection();
        await coll.doc(snapId).set(docData);
      }

      FCLFirebaseSync._showToast(`☁️ File "${file.name}" uploaded to Cloud Vault!`, 'success');
      await this.fetchSnapshots();
      this.switchTab('list');

    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '⬆️ Upload to Firebase Cloud Vault';
      }
    }
  },

  filterSnapshots(query) {
    this._searchFilter = (query || '').toLowerCase().trim();
    this.renderSnapshotList();
  },

  renderSnapshotList() {
    const container = document.getElementById('fclVaultSnapshotsList');
    if (!container) return;

    const countBadge = document.getElementById('fclVaultCountBadge');
    if (countBadge) {
      countBadge.innerText = this._snapshots.length;
    }

    let items = this._snapshots;
    if (this._searchFilter) {
      items = items.filter(s => {
        const text = `${s.name || ''} ${s.fileName || ''} ${s.projectName || ''} ${s.projectCode || ''} ${s.description || ''}`.toLowerCase();
        return text.includes(this._searchFilter);
      });
    }

    if (!items.length) {
      container.innerHTML = `
        <div style="text-align:center; padding:48px 16px; background:#f8fafc; border:2px dashed #cbd5e1; border-radius:12px; margin-top:8px;">
          <div style="font-size:36px; line-height:1; margin-bottom:12px;">☁️</div>
          <h4 style="margin:0 0 6px 0; color:#0f172a; font-size:15px; font-weight:700;">
            ${this._searchFilter ? 'No matching snapshots found' : 'Your Cloud File Vault is Empty'}
          </h4>
          <p style="margin:0 0 16px 0; color:#64748b; font-size:12px; max-width:380px; margin-left:auto; margin-right:auto;">
            ${this._searchFilter ? 'Try clearing your search query or looking for a different term.' : 'Save your first cloud snapshot to collaborate across devices or restore prior project revisions anytime.'}
          </p>
          <button type="button" onclick="FCLCloudVault.switchTab('save')" style="background:#2563eb; color:#ffffff; border:none; padding:8px 16px; border-radius:6px; font-size:12px; font-weight:700; cursor:pointer; box-shadow:0 2px 6px rgba(37,99,235,0.3);">
            ➕ Save Active Project to Cloud
          </button>
        </div>
      `;
      return;
    }

    const cardsHtml = items.map(s => {
      const dateStr = s.createdAtIso ? new Date(s.createdAtIso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Recent';
      const boqCount = s.itemCounts ? (s.itemCounts.boq || 0) : 0;
      const taskCount = s.itemCounts ? (s.itemCounts.tasks || 0) : 0;

      return `
        <div class="fcl-vault-card" style="background:#ffffff; border:1px solid #e2e8f0; border-radius:10px; padding:14px 18px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center; transition:all 0.2s ease; box-shadow:0 1px 3px rgba(0,0,0,0.04); gap:14px;" onmouseover="this.style.borderColor='#93c5fd'; this.style.boxShadow='0 4px 12px rgba(37,99,235,0.08)';" onmouseout="this.style.borderColor='#e2e8f0'; this.style.boxShadow='0 1px 3px rgba(0,0,0,0.04)';">
          <!-- Left info -->
          <div style="flex:1 1 auto; min-width:0;">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px; flex-wrap:wrap;">
              <span style="font-weight:700; font-size:13.5px; color:#0f172a;">${s.name || s.fileName}</span>
              <span style="background:#eff6ff; color:#1d4ed8; font-size:11px; font-weight:700; padding:2px 8px; border-radius:12px; border:1px solid #bfdbfe;">
                ${s.projectCode || s.projectId || 'PRJ'}
              </span>
              <span style="background:#f1f5f9; color:#475569; font-size:11px; font-weight:600; padding:2px 7px; border-radius:6px;">
                ${s.sizeFormatted || 'File'}
              </span>
            </div>

            <div style="font-size:11.5px; color:#64748b; margin-bottom:4px; display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
              <span>📁 <strong>${s.projectName || 'Project'}</strong></span>
              <span>📅 ${dateStr}</span>
              ${(boqCount || taskCount) ? `<span>📊 <strong>${boqCount}</strong> BOQ items &bull; <strong>${taskCount}</strong> Tasks</span>` : ''}
            </div>

            ${s.description ? `<div style="font-size:11.5px; color:#334155; background:#f8fafc; padding:4px 8px; border-radius:4px; border-left:3px solid #3b82f6; margin-top:4px;">${s.description}</div>` : ''}
          </div>

          <!-- Right actions -->
          <div style="display:flex; align-items:center; gap:6px; flex-shrink:0;">
            <button type="button" onclick="FCLCloudVault.loadSnapshot('${s.id}')" style="background:#2563eb; color:#ffffff; border:none; padding:7px 12px; border-radius:6px; font-size:11.5px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:5px; box-shadow:0 1px 4px rgba(37,99,235,0.25);" title="Load and restore this project snapshot into your active workspace">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
              Load &amp; Open
            </button>
            <button type="button" onclick="FCLCloudVault.downloadSnapshot('${s.id}')" style="background:#059669; color:#ffffff; border:none; padding:7px 10px; border-radius:6px; font-size:11.5px; font-weight:600; cursor:pointer; display:inline-flex; align-items:center; gap:4px;" title="Download .fclproj to your computer">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download
            </button>
            <button type="button" onclick="FCLCloudVault.deleteSnapshot('${s.id}')" style="background:#fee2e2; color:#b91c1c; border:1px solid #fecaca; padding:7px 8px; border-radius:6px; font-size:11.5px; font-weight:600; cursor:pointer;" title="Delete snapshot from cloud">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = cardsHtml;
  },

  async openVaultModal(initialTab = 'list') {
    let modal = document.getElementById(this._modalId);
    if (!modal) {
      modal = document.createElement('div');
      modal.id = this._modalId;
      modal.className = 'modal-overlay';
      modal.style.position = 'fixed';
      modal.style.top = '0';
      modal.style.left = '0';
      modal.style.right = '0';
      modal.style.bottom = '0';
      modal.style.background = 'rgba(15, 23, 42, 0.75)';
      modal.style.backdropFilter = 'blur(5px)';
      modal.style.display = 'flex';
      modal.style.alignItems = 'center';
      modal.style.justifyContent = 'center';
      modal.style.zIndex = '99999';
      modal.style.padding = '16px';
      modal.onclick = (e) => {
        if (e.target === modal) modal.style.display = 'none';
      };
      document.body.appendChild(modal);
    }

    const config = FCLFirebaseSync.getConfig();

    modal.innerHTML = `
      <div class="modal-content" style="background:#ffffff; border-radius:14px; max-width:760px; width:100%; box-shadow:0 25px 50px rgba(0,0,0,0.35); border:1px solid #e2e8f0; overflow:hidden; font-family:'Inter', sans-serif; display:flex; flex-direction:column; max-height:88vh;" onclick="event.stopPropagation()">
        <!-- Header -->
        <div style="background:#0f172a; color:#ffffff; padding:18px 24px; display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="width:38px; height:38px; border-radius:10px; background:linear-gradient(135deg, #1e40af, #2563eb); display:flex; align-items:center; justify-content:center; font-size:20px; box-shadow:0 2px 8px rgba(37,99,235,0.4);">
              ☁️
            </div>
            <div>
              <h3 style="margin:0; font-size:16.5px; font-weight:800; letter-spacing:-0.2px;">Cloud File Vault</h3>
              <div style="font-size:11px; color:#94a3b8; margin-top:2px;">
                Firebase Project: <strong style="color:#60a5fa;">${config.projectId || 'pmcc-2cb89'}</strong> &bull; Cloud Firestore &amp; Storage
              </div>
            </div>
          </div>
          <button type="button" onclick="FCLCloudVault.closeModal()" style="background:none; border:none; color:#94a3b8; font-size:26px; line-height:1; cursor:pointer; padding:0 4px;" title="Close">&times;</button>
        </div>

        <!-- Navigation Tabs Bar -->
        <div style="background:#ffffff; border-bottom:1px solid #e2e8f0; display:flex; padding:0 24px; gap:4px; overflow-x:auto;">
          <button type="button" id="fclVaultTabBtn_list" onclick="FCLCloudVault.switchTab('list')" style="background:none; border:none; padding:12px 14px; font-size:12.5px; cursor:pointer; display:inline-flex; align-items:center; gap:6px;">
            <span>📋 Saved Snapshots</span>
            <span id="fclVaultCountBadge" style="background:#e2e8f0; color:#334155; font-size:10.5px; font-weight:700; padding:1px 6px; border-radius:10px;">0</span>
          </button>
          <button type="button" id="fclVaultTabBtn_save" onclick="FCLCloudVault.switchTab('save')" style="background:none; border:none; padding:12px 14px; font-size:12.5px; cursor:pointer; display:inline-flex; align-items:center; gap:6px;">
            <span>💾 Save Active Project</span>
          </button>
          <button type="button" id="fclVaultTabBtn_upload" onclick="FCLCloudVault.switchTab('upload')" style="background:none; border:none; padding:12px 14px; font-size:12.5px; cursor:pointer; display:inline-flex; align-items:center; gap:6px;">
            <span>⬆️ Upload Local File</span>
          </button>
          <button type="button" id="fclVaultTabBtn_status" onclick="FCLCloudVault.switchTab('status')" style="background:none; border:none; padding:12px 14px; font-size:12.5px; cursor:pointer; display:inline-flex; align-items:center; gap:6px;">
            <span>⚡ Cloud Status</span>
          </button>
        </div>

        <!-- Body / Content Panels -->
        <div style="padding:20px 24px; overflow-y:auto; flex:1 1 auto;">
          <!-- TAB 1: LIST SNAPSHOTS -->
          <div id="fclVaultTab_list" style="display:block;">
            <!-- Search & Filter Controls -->
            <div style="display:flex; gap:10px; margin-bottom:14px; align-items:center;">
              <div style="position:relative; flex:1 1 auto;">
                <input type="text" id="fclVaultSearchInput" onkeyup="FCLCloudVault.filterSnapshots(this.value)" placeholder="🔍 Search saved files, project names, or notes..." style="width:100%; box-sizing:border-box; padding:9px 12px; font-size:12px; border:1px solid #cbd5e1; border-radius:8px; background:#f8fafc;">
              </div>
              <button type="button" onclick="FCLCloudVault.fetchSnapshots().then(() => FCLCloudVault.renderSnapshotList())" style="background:#f1f5f9; color:#334155; border:1px solid #cbd5e1; padding:9px 14px; font-size:12px; font-weight:600; border-radius:8px; cursor:pointer; display:inline-flex; align-items:center; gap:6px;" title="Refresh list from Firebase">
                🔄 Refresh
              </button>
              <button type="button" onclick="FCLCloudVault.switchTab('save')" style="background:#2563eb; color:#ffffff; border:none; padding:9px 14px; font-size:12px; font-weight:700; border-radius:8px; cursor:pointer; display:inline-flex; align-items:center; gap:6px; box-shadow:0 2px 6px rgba(37,99,235,0.3);">
                ➕ Save Snapshot
              </button>
            </div>

            <!-- Snapshots Container -->
            <div id="fclVaultSnapshotsList" style="min-height:180px;">
              <div style="text-align:center; padding:30px; color:#64748b; font-size:12px;">Loading snapshots from cloud...</div>
            </div>
          </div>

          <!-- TAB 2: SAVE ACTIVE PROJECT -->
          <div id="fclVaultTab_save" style="display:none;">
            <!-- Active Project Highlight Card -->
            <div id="fclVaultActiveProjSummary" style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:10px; padding:12px 16px; margin-bottom:16px;">
              <!-- Dynamically populated by prepareSaveTab -->
            </div>

            <div style="margin-bottom:14px;">
              <label style="display:block; font-size:12px; font-weight:700; color:#0f172a; margin-bottom:6px;">
                Snapshot / Version Name:
              </label>
              <input type="text" id="fclVaultSaveTitle" style="width:100%; box-sizing:border-box; padding:9px 12px; font-size:12px; border:1px solid #cbd5e1; border-radius:8px; background:#ffffff;" placeholder="e.g. Approved Contract Baseline Rev 2">
            </div>

            <div style="margin-bottom:14px;">
              <label style="display:block; font-size:12px; font-weight:700; color:#0f172a; margin-bottom:6px;">
                Notes / Change Log (Optional):
              </label>
              <textarea id="fclVaultSaveDesc" rows="3" style="width:100%; box-sizing:border-box; padding:9px 12px; font-size:12px; border:1px solid #cbd5e1; border-radius:8px; background:#ffffff; resize:vertical;" placeholder="e.g. Updated material price list, added foundation excavation tasks, ready for billing."></textarea>
            </div>

            <div style="margin-bottom:18px;">
              <label style="display:block; font-size:12px; font-weight:700; color:#0f172a; margin-bottom:8px;">
                Backup Scope:
              </label>
              <div style="display:flex; flex-direction:column; gap:8px;">
                <label style="display:flex; align-items:center; gap:8px; font-size:12px; color:#334155; cursor:pointer;">
                  <input type="radio" name="fclVaultScope" value="active" checked>
                  <strong>Current Active Project Only</strong> (Recommended &bull; Fast, lightweight snapshot)
                </label>
                <label style="display:flex; align-items:center; gap:8px; font-size:12px; color:#334155; cursor:pointer;">
                  <input type="radio" name="fclVaultScope" value="all">
                  <strong>Master Portfolio</strong> (Includes all projects, catalog, DUPA, and price lists)
                </label>
              </div>
            </div>

            <div style="display:flex; justify-content:flex-end; gap:10px;">
              <button type="button" onclick="FCLCloudVault.switchTab('list')" style="background:#ffffff; color:#475569; border:1px solid #cbd5e1; padding:9px 16px; border-radius:8px; font-size:12px; font-weight:600; cursor:pointer;">
                Cancel
              </button>
              <button type="button" id="fclVaultSaveSubmitBtn" onclick="FCLCloudVault.handleSaveFormSubmit()" style="background:#2563eb; color:#ffffff; border:none; padding:9px 20px; border-radius:8px; font-size:12.5px; font-weight:700; cursor:pointer; box-shadow:0 2px 8px rgba(37,99,235,0.35);">
                ☁️ Save Snapshot to Cloud Vault
              </button>
            </div>
          </div>

          <!-- TAB 3: UPLOAD FILE -->
          <div id="fclVaultTab_upload" style="display:none;">
            <!-- Dropzone -->
            <div id="fclVaultDropzone" style="border:2px dashed #93c5fd; background:#eff6ff; border-radius:12px; padding:32px 20px; text-align:center; margin-bottom:16px; cursor:pointer; transition:all 0.2s ease;" onclick="document.getElementById('fclVaultUploadInput').click()">
              <input type="file" id="fclVaultUploadInput" accept=".fclproj,.xlsx,.xls,.json" style="display:none" onchange="
                if (this.files[0]) {
                  document.getElementById('fclVaultSelectedFileDisplay').innerText = this.files[0].name + ' (' + (this.files[0].size/1024).toFixed(1) + ' KB)';
                  document.getElementById('fclVaultSelectedFileInfo').style.display = 'block';
                }
              ">
              <div style="font-size:32px; margin-bottom:8px;">📁</div>
              <div style="font-size:13.5px; font-weight:700; color:#1e40af; margin-bottom:4px;">
                Click or drag &amp; drop file to upload
              </div>
              <div style="font-size:11.5px; color:#64748b;">
                Supported formats: <strong>.fclproj</strong>, <strong>.xlsx</strong>, <strong>.xls</strong>, <strong>.json</strong>
              </div>
            </div>

            <!-- Selected File Badge -->
            <div id="fclVaultSelectedFileInfo" style="display:none; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:10px 14px; margin-bottom:14px; font-size:12px; color:#15803d; font-weight:600;">
              Selected file: <span id="fclVaultSelectedFileDisplay" style="font-family:monospace; font-weight:700; color:#0f172a;"></span>
            </div>

            <div style="margin-bottom:14px;">
              <label style="display:block; font-size:12px; font-weight:700; color:#0f172a; margin-bottom:6px;">
                Custom Snapshot Title:
              </label>
              <input type="text" id="fclVaultUploadTitle" style="width:100%; box-sizing:border-box; padding:9px 12px; font-size:12px; border:1px solid #cbd5e1; border-radius:8px; background:#ffffff;" placeholder="e.g. Imported BOQ Revision from Client">
            </div>

            <div style="margin-bottom:18px;">
              <label style="display:block; font-size:12px; font-weight:700; color:#0f172a; margin-bottom:6px;">
                Description / Note:
              </label>
              <textarea id="fclVaultUploadDesc" rows="2" style="width:100%; box-sizing:border-box; padding:9px 12px; font-size:12px; border:1px solid #cbd5e1; border-radius:8px; background:#ffffff; resize:vertical;" placeholder="Optional notes about this file..."></textarea>
            </div>

            <div style="display:flex; justify-content:flex-end; gap:10px;">
              <button type="button" onclick="FCLCloudVault.switchTab('list')" style="background:#ffffff; color:#475569; border:1px solid #cbd5e1; padding:9px 16px; border-radius:8px; font-size:12px; font-weight:600; cursor:pointer;">
                Cancel
              </button>
              <button type="button" id="fclVaultUploadSubmitBtn" onclick="
                const fileInput = document.getElementById('fclVaultUploadInput');
                if (fileInput && fileInput.files[0]) {
                  FCLCloudVault.handleUploadFile(fileInput.files[0]);
                } else {
                  alert('Please select a file to upload first.');
                }
              " style="background:#2563eb; color:#ffffff; border:none; padding:9px 20px; border-radius:8px; font-size:12.5px; font-weight:700; cursor:pointer; box-shadow:0 2px 8px rgba(37,99,235,0.35);">
                ⬆️ Upload to Firebase Cloud Vault
              </button>
            </div>
          </div>

          <!-- TAB 4: CLOUD STATUS -->
          <div id="fclVaultTab_status" style="display:none;">
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:16px; margin-bottom:16px;">
              <h4 style="margin:0 0 12px 0; font-size:13.5px; color:#0f172a; font-weight:700;">Google Firebase Cloud Architecture</h4>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; font-size:11.5px;">
                <div>
                  <div style="color:#64748b; margin-bottom:2px;">Project ID</div>
                  <div style="font-weight:700; color:#0f172a; font-family:monospace;">${config.projectId || 'pmcc-2cb89'}</div>
                </div>
                <div>
                  <div style="color:#64748b; margin-bottom:2px;">Auth Domain</div>
                  <div style="font-weight:700; color:#0f172a; font-family:monospace;">${config.authDomain || 'pmcc-2cb89.firebaseapp.com'}</div>
                </div>
                <div>
                  <div style="color:#64748b; margin-bottom:2px;">Storage Bucket</div>
                  <div style="font-weight:700; color:#0f172a; font-family:monospace;">${config.storageBucket || 'pmcc-2cb89.firebasestorage.app'}</div>
                </div>
                <div>
                  <div style="color:#64748b; margin-bottom:2px;">Client Session ID</div>
                  <div style="font-weight:700; color:#0f172a; font-family:monospace;">${FCLFirebaseSync.clientId || 'Active'}</div>
                </div>
              </div>
            </div>

            <!-- Ping Status Box -->
            <div id="fclVaultPingStatusBox" style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:12px 14px; margin-bottom:16px; font-size:12px; color:#1e40af; display:flex; align-items:center; justify-content:space-between;">
              <div>
                <strong>Cloud Firestore Real-Time Status:</strong> ${FCLFirebaseSync.statusMessage}
              </div>
              <button type="button" id="fclVaultPingBtn" onclick="
                const btn = this;
                btn.innerHTML = '⏳ Testing...';
                btn.disabled = true;
                FCLFirebaseSync.testConnection().then(res => {
                  btn.innerHTML = '⚡ Test Cloud Ping';
                  btn.disabled = false;
                  if (res.success) {
                    FCLFirebaseSync._showToast('⚡ ' + res.message, 'success');
                  } else {
                    FCLFirebaseSync._showToast('⚠️ ' + res.message, 'warning');
                  }
                });
              " style="background:#2563eb; color:#ffffff; border:none; padding:6px 12px; border-radius:6px; font-size:11.5px; font-weight:700; cursor:pointer;">
                ⚡ Test Cloud Ping
              </button>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center;">
              <button type="button" onclick="FCLFirebaseSync.openConfigModal()" style="background:#f1f5f9; color:#334155; border:1px solid #cbd5e1; padding:8px 14px; border-radius:6px; font-size:12px; font-weight:600; cursor:pointer;">
                ⚙️ Configure Firebase Credentials
              </button>
              <button type="button" onclick="FCLCloudVault.switchTab('list')" style="background:#2563eb; color:#ffffff; border:none; padding:8px 16px; border-radius:6px; font-size:12px; font-weight:700; cursor:pointer;">
                View Saved Snapshots
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    modal.style.display = 'flex';
    this.switchTab(initialTab);
    this.fetchSnapshots().then(() => this.renderSnapshotList());
  }
};

// Expose globally
if (typeof window !== 'undefined') {
  window.FCLCloudVault = FCLCloudVault;
}


if (typeof module !== 'undefined' && module.exports) {
  module.exports = FCLFirebaseSync;
}

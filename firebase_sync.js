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

// DEFAULT CONFIGURATION PLACEHOLDERS
// Replace these values with your Firebase project credentials from the Firebase Console.
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
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
      window.addEventListener('online', () => {
        if (this.isConfigured() && this.db) {
          this._setState('connected', 'Cloud Synced');
          this.updateBadges();
          this._showToast('🌐 Internet restored. Cloud Firestore is active.', 'info');
        }
      });

      window.addEventListener('offline', () => {
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
  _handleRemoteProjectChange(projectId, data, changeType) {
    if (typeof FCLStorage === 'undefined') return;

    console.log(`[FCL Cloud Sync] Remote update received for project ${projectId}`);

    // Update local storage without triggering recursive cloud push
    if (data.boq) {
      FCLStorage.saveProjectSection(projectId, 'boq', data.boq, true);
    }
    if (data.gantt) {
      FCLStorage.saveProjectSection(projectId, 'ganttSettings', data.gantt, true);
    }

    // Also update catalog item if present
    try {
      const catalog = FCLStorage.loadProjectCatalogSync();
      if (Array.isArray(catalog)) {
        const item = catalog.find(x => x.id === projectId);
        if (item) {
          if (data.boq && data.boq.totalBudget) item.totalBudget = data.boq.totalBudget;
          if (data.boq && data.boq.actualProgress !== undefined) item.actualProgress = data.boq.actualProgress;
          if (data.metadata && data.metadata.name) item.name = data.metadata.name;
          FCLStorage.save('FCL_PROJECT_CATALOG_DATA', catalog);
        }
      }
    } catch (e) {}

    // Dispatch system-wide event for active views to re-render
    window.dispatchEvent(new CustomEvent('fcl:remote-update', {
      detail: {
        type: 'project',
        projectId: projectId,
        data: data,
        changeType: changeType
      }
    }));

    const pName = (data.metadata && data.metadata.name) || projectId;
    this._showToast(`⚡ Live Update: "${pName}" was synced from cloud.`, 'success');
  },

  /**
   * Handle incoming remote catalog changes
   */
  _handleRemoteCatalogChange(newCatalog) {
    if (typeof FCLStorage === 'undefined') return;

    console.log('[FCL Cloud Sync] Remote project catalog update received');
    FCLStorage.save('FCL_PROJECT_CATALOG_DATA', newCatalog);

    window.dispatchEvent(new CustomEvent('fcl:remote-update', {
      detail: {
        type: 'catalog',
        catalog: newCatalog
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
      const docPayload = {
        projectId: projectId,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: this.clientId,
        ...payload
      };

      await this.db.collection('fcl_projects').doc(projectId).set(docPayload, { merge: true });

      this.lastSyncTime = new Date();
      this._setState('connected', 'Cloud Synced');
      this.updateBadges();
      console.log(`[FCL Cloud Sync] Project ${projectId} successfully written to Cloud Firestore.`);
    } catch (err) {
      console.warn(`[FCL Cloud Sync] Failed to sync project ${projectId}:`, err);
      if (!navigator.onLine) {
        this._setState('offline', 'Offline (IndexedDB Queued)');
      } else {
        this._setState('error', 'Cloud Sync Error');
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
        await this.db.collection('fcl_system').doc('catalog').set({
          catalog: cat,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedBy: this.clientId
        }, { merge: true });

        this.lastSyncTime = new Date();
        this._setState('connected', 'Cloud Synced');
        this.updateBadges();
        console.log('[FCL Cloud Sync] Project catalog successfully updated in Cloud Firestore.');
      } catch (err) {
        console.warn('[FCL Cloud Sync] Failed to sync catalog:', err);
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
        <div style="background:#f8fafc; padding:14px 24px; border-top:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;">
          <div>
            ${isConf ? `
              <button type="button" onclick="FCLFirebaseSync.clearConfig()" style="background:#fee2e2; color:#b91c1c; border:1px solid #fecaca; padding:7px 12px; font-size:11.5px; font-weight:700; border-radius:6px; cursor:pointer;">
                Disconnect Cloud
              </button>
            ` : ''}
          </div>
          <div style="display:flex; gap:10px;">
            <button type="button" onclick="document.getElementById('fclCloudConfigModal').style.display='none'" style="background:#ffffff; color:#475569; border:1px solid #cbd5e1; padding:7px 14px; font-size:12px; font-weight:600; border-radius:6px; cursor:pointer;">
              Cancel
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
   * Save config pasted in modal
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
      if (text.startsWith('{')) {
        configObj = JSON.parse(text);
      } else {
        // Attempt parsing standard const firebaseConfig = { ... } JS snippet
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          configObj = JSON.parse(match[0]);
        }
      }

      if (!configObj || !configObj.projectId) {
        throw new Error('Missing projectId field.');
      }

      localStorage.setItem('FCL_FIREBASE_CONFIG_OVERRIDE', JSON.stringify(configObj));
      this._isInitialized = false;
      await this.init();

      const modal = document.getElementById('fclCloudConfigModal');
      if (modal) modal.style.display = 'none';

      this._showToast('✅ Cloud Firestore configuration saved and connected!', 'success');
    } catch (err) {
      alert('Invalid Firebase configuration format: ' + err.message + '\n\nPlease ensure you paste a valid JSON object with apiKey and projectId.');
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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = FCLFirebaseSync;
}

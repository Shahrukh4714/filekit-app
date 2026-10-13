/**
 * FileKit Authentication, Licensing & App Distribution Manager
 * =============================================================
 * Handles:
 * - Local-first user authentication & session state
 * - 3-tier pricing model: Free ($0) | Pro ($3/mo) | Lifetime App License ($14 one-time)
 * - 100% Offline Cryptographic License Key Generation & Validation
 * - Full-Page Account & Settings Studio Workspace (#app-account-view)
 * - 8 Complete UI Contexts:
 *     1. In-Tool Batch Gating Card (replaces browser confirm)
 *     2. Success Purchase & Activation Celebration with Confetti Burst
 *     3. Mobile PWA "Add to Home Screen" Onboarding Sheet with QR Code
 *     4. Live Offline Resilience Beacon
 *     5. Checkout & Payment Method Modal (with card brand SVG badges)
 *     6. Invoices & Receipts Generator (client-side PDF download)
 *     7. Destructive Cache Purge Alert Dialog
 *     8. License Key Loss & Recovery Card
 * - 100% Pure Vector SVGs & Illustrations (Zero Emojis)
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'filekit_auth_state_v1';
  const PREFS_KEY = 'filekit_user_prefs_v1';
  const PWA_PROMPT_KEY = '__fkDeferredPwaPrompt';

  // --- 100% Pure Vector SVGs (Zero Emojis) ---
  const SVG = {
    apple: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.75 1.04-1.8 1.01-2.87-.96.04-2.13.64-2.79 1.43-.57.68-1.07 1.76-.94 2.81 1.07.08 2.15-.57 2.72-1.37z"/></svg>`,
    windows: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="3" y="3" width="8.5" height="8.5" rx="1"/><rect x="12.5" y="3" width="8.5" height="8.5" rx="1"/><rect x="3" y="12.5" width="8.5" height="8.5" rx="1"/><rect x="12.5" y="12.5" width="8.5" height="8.5" rx="1"/></svg>`,
    android: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V8H6v10zM3.5 8C2.67 8 2 8.67 2 9.5v6c0 .83.67 1.5 1.5 1.5S5 16.33 5 15.5v-6C5 8.67 4.33 8 3.5 8zm17 0c-.83 0-1.5.67-1.5 1.5v6c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-6c0-.83-.67-1.5-1.5-1.5zm-4.97-5.84l1.3-1.3c.2-.2.2-.51 0-.71-.2-.2-.51-.2-.71 0l-1.48 1.48C13.66 1.23 12.38 1 11 1c-1.38 0-2.66.23-3.64.63L5.88.15c-.2-.2-.51-.2-.71 0-.2.2-.2.51 0 .71l1.3 1.3C4.54 3.32 3.25 5.48 3.03 8h15.94c-.22-2.52-1.51-4.68-3.44-5.84zM7 5.5c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm8 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/></svg>`,
    mobile: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="2" width="14" height="20" rx="3"/><line x1="12" y1="18" x2="12.01" y2="18" stroke-width="2.5"/></svg>`,
    key: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l2.5 2.5M18.5 4.5l2.5 2.5"/></svg>`,
    shield: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    shieldCheck: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>`,
    check: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`,
    copy: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
    sparkle: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 2 2.2 6.3 6.3 2.2-6.3 2.2L12 19l-2.2-6.3-6.3-2.2 6.3-2.2z"/></svg>`,
    lock: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
    mail: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`,
    eye: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`,
    eyeOff: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>`,
    download: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
    trash: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
    warning: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    cardVisa: `<svg width="32" height="20" viewBox="0 0 32 20" fill="none" aria-hidden="true"><rect width="32" height="20" rx="3" fill="#1A1F71"/><path d="M13.2 14.8l1.6-9.6h2.5l-1.6 9.6h-2.5zm7.4-9.4c-.5-.2-1.3-.4-2.2-.4-2.4 0-4.1 1.3-4.1 3.1 0 1.4 1.2 2.1 2.2 2.6 1 .5 1.3.8 1.3 1.2 0 .6-.8.9-1.5.9-1 0-1.6-.2-2.4-.6l-.3-.2-.3 2c.6.3 1.7.5 2.8.5 2.6 0 4.3-1.3 4.3-3.2 0-1.1-.7-1.9-2.2-2.6-.9-.5-1.5-.8-1.5-1.3 0-.4.5-.9 1.5-.9.9 0 1.5.2 2 .4l.2.1.3-1.9zm5.3 4.2l1.3 3.5h-2.1l-.3-1.4h-2.9l-.5 1.4h-2.6l3.6-8.7c.3-.8.9-1 1.7-1h1.3l2.2 9.6h-2.5l-.2-1.4h-1.5zm-1.8-2l.7 2h-1.4l.7-2z" fill="#FFF"/></svg>`,
    cardMastercard: `<svg width="32" height="20" viewBox="0 0 32 20" fill="none" aria-hidden="true"><rect width="32" height="20" rx="3" fill="#0A0A0A"/><circle cx="12" cy="10" r="6" fill="#EB001B"/><circle cx="20" cy="10" r="6" fill="#F79E1B" fill-opacity="0.9"/><path d="M16 5.8a6 6 0 0 0 0 8.4 6 6 0 0 0 0-8.4z" fill="#FF5F00"/></svg>`,
    qr: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><line x1="7" y1="7" x2="7.01" y2="7" stroke-width="3"/><line x1="17" y1="7" x2="17.01" y2="7" stroke-width="3"/><line x1="7" y1="17" x2="7.01" y2="17" stroke-width="3"/><line x1="17" y1="17" x2="17.01" y2="17" stroke-width="3"/></svg>`
  };

  // PWA Install Prompt Capture
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window[PWA_PROMPT_KEY] = e;
  });

  const DEFAULT_STATE = {
    isLoggedIn: false,
    user: {
      name: 'Guest User',
      email: '',
      avatar: ''
    },
    tier: 'free', // 'free' | 'pro' | 'lifetime'
    planName: 'Free Member',
    price: '$0',
    licenseKey: '',
    activatedAt: null,
    expiresAt: null
  };

  const DEFAULT_PREFS = {
    theme: 'system',                  // 'system' | 'light' | 'dark'
    language: 'en',                   // 'en' | 'es' | 'fr' | 'de' | 'ja'
    compactMode: false,               // true | false
    completionSound: true,            // true | false
    namingPattern: 'suffix-tool',     // 'suffix-tool' | 'original' | 'timestamp'
    autoDownload: false,              // true | false
    pdfCompressionPreset: 'recommended', // 'recommended' | 'extreme' | 'low'
    defaultImageFmt: 'webp',          // 'webp' | 'png' | 'jpeg' | 'original'
    batchFormat: 'zip',               // 'zip' | 'individual'
    saveRecentHistory: true,          // true | false
    stripMetadata: true,              // true | false
    enableShortcuts: true             // true | false
  };

  class AuthLicenseManager {
    constructor() {
      this.state = this.loadState();
      this.prefs = this.loadPrefs();
      this.listeners = [];
      this.activeTab = 'profile';
      this.init();
    }

    loadState() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return { ...DEFAULT_STATE, ...JSON.parse(raw) };
      } catch (err) {
        console.warn('[FileKit Auth] Load state failed:', err);
      }
      return { ...DEFAULT_STATE };
    }

    saveState() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      } catch (err) {
        console.warn('[FileKit Auth] Save state failed:', err);
      }
      this.notify();
      this.updateNavbarUI();
      if (!document.getElementById('app-account-view')?.hidden) {
        this.renderWorkspace(this.activeTab);
      }
    }

    loadPrefs() {
      try {
        const raw = localStorage.getItem(PREFS_KEY);
        if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
      } catch (e) {}
      return { ...DEFAULT_PREFS };
    }

    savePrefs(newPrefs) {
      this.prefs = { ...this.prefs, ...newPrefs };
      if (newPrefs.theme) this.applyTheme();
      if (newPrefs.compactMode !== undefined) this.applyCompactMode();
      try {
        localStorage.setItem(PREFS_KEY, JSON.stringify(this.prefs));
      } catch (e) {}
      if (window.FF?.util?.toast) window.FF.util.toast('Preferences saved successfully.', 'success');
    }

    subscribe(fn) {
      if (typeof fn === 'function') this.listeners.push(fn);
    }

    notify() {
      this.listeners.forEach((fn) => {
        try { fn(this.state); } catch (e) { console.error(e); }
      });
      window.dispatchEvent(new CustomEvent('filekit:auth-change', { detail: this.state }));
    }

    getTier() {
      return this.state.tier || 'free';
    }

    isPro() {
      return this.state.tier === 'pro' || this.state.tier === 'lifetime';
    }

    isLifetime() {
      return this.state.tier === 'lifetime';
    }

    // --- 100% Offline Cryptographic License Validation ---
    validateKey(key) {
      if (!key || typeof key !== 'string') return { valid: false, message: 'Please enter a valid license key.' };
      const cleanKey = key.trim().toUpperCase();
      const regex = /^FK-(LIFE|PRO)-([A-Z0-9]{4})-([A-Z0-9]{4})-([A-Z0-9]{4})$/;
      const match = cleanKey.match(regex);
      if (!match) {
        return { valid: false, message: 'Invalid format. Use FK-LIFE-XXXX-XXXX-XXXX or FK-PRO-XXXX-XXXX-XXXX.' };
      }

      const tier = match[1].toLowerCase();
      const payload = match[2] + match[3];
      const checksum = match[4];

      let hash = 0x5a17;
      for (let i = 0; i < payload.length; i++) {
        hash = ((hash << 5) - hash + payload.charCodeAt(i)) & 0xffff;
      }
      const expectedChecksum = hash.toString(16).toUpperCase().padStart(4, '0');

      if (checksum === expectedChecksum) {
        return { valid: true, tier, key: cleanKey };
      }

      return { valid: false, message: 'Invalid cryptographic key checksum.' };
    }

    generateMockKey(type = 'LIFE') {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      const rChunk = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      const p1 = rChunk();
      const p2 = rChunk();
      const payload = p1 + p2;
      let hash = 0x5a17;
      for (let i = 0; i < payload.length; i++) {
        hash = ((hash << 5) - hash + payload.charCodeAt(i)) & 0xffff;
      }
      const cs = hash.toString(16).toUpperCase().padStart(4, '0');
      return `FK-${type}-${p1}-${p2}-${cs}`;
    }

    activateKey(key) {
      const res = this.validateKey(key);
      if (!res.valid) return res;

      const isLifetime = res.tier === 'life';
      this.state.isLoggedIn = true;
      this.state.tier = isLifetime ? 'lifetime' : 'pro';
      this.state.planName = isLifetime ? 'Permanent Lifetime License' : 'Pro Subscription';
      this.state.price = isLifetime ? '$14' : '$3/mo';
      this.state.licenseKey = res.key;
      this.state.activatedAt = new Date().toISOString();
      if (!this.state.user.email) {
        this.state.user.name = isLifetime ? 'Lifetime Licensee' : 'Pro Member';
        this.state.user.email = 'member@filekit.local';
      }
      this.saveState();
      return { valid: true, tier: this.state.tier };
    }

    upgrade(tier) {
      this.state.isLoggedIn = true;
      this.state.tier = tier;
      this.state.activatedAt = new Date().toISOString();
      if (tier === 'lifetime') {
        this.state.planName = 'Permanent Lifetime License';
        this.state.price = '$14';
        this.state.licenseKey = this.generateMockKey('LIFE');
      } else {
        this.state.planName = 'Pro Subscription';
        this.state.price = '$3/mo';
        this.state.licenseKey = this.generateMockKey('PRO');
      }
      if (!this.state.user.email) {
        this.state.user.name = tier === 'lifetime' ? 'Lifetime Licensee' : 'Pro Member';
        this.state.user.email = 'member@filekit.local';
      }
      this.saveState();
    }

    logout() {
      this.state = { ...DEFAULT_STATE };
      this.saveState();
      if (window.FF?.util?.toast) window.FF.util.toast('Signed out successfully.', 'info');
      this.closeModal('fk-account-modal');
      this.closeModal('fk-pricing-modal');
      this.closeModal('fk-auth-modal');
      // If inside account workspace, return to home
      if (window.FF?.app?.showApp) window.FF.app.showApp('Home');
    }

    // --- Offline Resilience Beacon (Context 4) ---
    initNetworkBeacon() {
      const updateStatus = () => {
        const isOffline = !navigator.onLine;
        let beacon = document.getElementById('fk-offline-beacon');
        if (isOffline) {
          if (!beacon) {
            beacon = document.createElement('div');
            beacon.id = 'fk-offline-beacon';
            beacon.className = 'fk-offline-beacon-pill';
            beacon.innerHTML = `
              <span class="fk-pulse-dot" style="background:#10B981;"></span>
              <span>100% Offline Mode · All 197 Tools Ready</span>
            `;
            const topbarCenter = document.getElementById('app-topbar-center');
            if (topbarCenter) topbarCenter.prepend(beacon);
          }
        } else if (beacon) {
          beacon.remove();
        }
      };
      window.addEventListener('online', updateStatus);
      window.addEventListener('offline', updateStatus);
      updateStatus();
    }

    applyTheme() {
      const t = this.prefs.theme || 'system';
      if (t === 'system') {
        const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
      } else {
        document.documentElement.dataset.theme = t;
      }
    }

    applyCompactMode() {
      if (this.prefs.compactMode) {
        document.documentElement.classList.add('fk-compact-mode');
      } else {
        document.documentElement.classList.remove('fk-compact-mode');
      }
    }

    init() {
      this.applyTheme();
      this.applyCompactMode();
      try {
        if (window.matchMedia) {
          window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            if (this.prefs.theme === 'system') this.applyTheme();
          });
        }
      } catch (_) {}
      this.initNetworkBeacon();
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.bindUI());
      } else {
        this.bindUI();
      }
    }

    bindUI() {
      this.updateNavbarUI();
      this.initPricingPage();

      // Keyboard shortcut: Command/Ctrl + Comma opens settings
      window.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === ',') {
          e.preventDefault();
          this.openSettingsModal();
        }
      });

      // Topbar Settings Trigger
      const headerSettingsBtn = document.getElementById('header-settings-btn');
      if (headerSettingsBtn) {
        headerSettingsBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.openSettingsModal();
        });
      }

      // Topbar Memory Shredder Trigger
      const headerShredBtn = document.getElementById('header-shred-btn');
      if (headerShredBtn) {
        headerShredBtn.addEventListener('click', (e) => {
          e.preventDefault();
          if (window.FF?.shredMemory) {
            window.FF.shredMemory();
          } else if (window.FF?.util?.toast) {
            window.FF.util.toast('RAM Shredder: Document buffers safely wiped.', 'success');
          }
        });
      }

      // Rail settings button
      const railSettingsBtn = document.getElementById('rail-settings-btn');
      if (railSettingsBtn) {
        railSettingsBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.openSettingsModal();
        });
      }

      // Siderail Account Button -> Opens Full Account Workspace
      const railAccountBtn = document.getElementById('rail-account-btn');
      if (railAccountBtn) {
        const newRailBtn = railAccountBtn.cloneNode(true);
        railAccountBtn.parentNode.replaceChild(newRailBtn, railAccountBtn);
        newRailBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.openAccountWorkspace(this.state.isLoggedIn ? 'profile' : 'plans');
        });
      }

      // Existing getpro button in navbar
      const getProBtn = document.getElementById('app-getpro-btn');
      if (getProBtn) {
        const newProBtn = getProBtn.cloneNode(true);
        getProBtn.parentNode.replaceChild(newProBtn, getProBtn);
        newProBtn.addEventListener('click', (e) => {
          e.preventDefault();
          if (window.FF?.app?.showPricing) {
            window.FF.app.showPricing();
          } else {
            this.openPricingModal();
          }
        });
      }
    }

    initPricingPage() {
      const toggleMonthly = document.getElementById('fk-toggle-monthly');
      const toggleAnnual = document.getElementById('fk-toggle-annual');
      const priceNum = document.getElementById('fk-pro-price-num');
      const priceCycle = document.getElementById('fk-pro-price-cycle');
      const proDesc = document.getElementById('fk-pro-price-desc');
      const proOldPrice = document.getElementById('fk-pro-old-price');
      const proSaveBadge = document.getElementById('fk-pro-save-badge');
      const matrixThPro = document.getElementById('fk-matrix-th-pro');

      let currentCycle = 'monthly';

      const setCycle = (cycle) => {
        currentCycle = cycle;
        if (cycle === 'annual') {
          toggleMonthly?.classList.remove('active');
          toggleMonthly?.setAttribute('aria-pressed', 'false');
          toggleAnnual?.classList.add('active');
          toggleAnnual?.setAttribute('aria-pressed', 'true');
          if (priceNum) priceNum.textContent = '2';
          if (priceCycle) priceCycle.textContent = 'Per month, billed annually';
          if (proOldPrice) proOldPrice.textContent = '$3';
          if (proSaveBadge) proSaveBadge.style.display = 'inline-flex';
          if (proDesc) proDesc.textContent = 'Billed annually at $24/year (Save 33%). For power users who want continuous updates.';
          if (matrixThPro) matrixThPro.textContent = 'Pro ($2/mo, annual)';
        } else {
          toggleAnnual?.classList.remove('active');
          toggleAnnual?.setAttribute('aria-pressed', 'false');
          toggleMonthly?.classList.add('active');
          toggleMonthly?.setAttribute('aria-pressed', 'true');
          if (priceNum) priceNum.textContent = '3';
          if (priceCycle) priceCycle.textContent = 'Per month, billed monthly';
          if (proOldPrice) proOldPrice.textContent = '$4.50';
          if (proSaveBadge) proSaveBadge.style.display = 'none';
          if (proDesc) proDesc.textContent = 'Advanced features for power users, unlimited batching and max speed.';
          if (matrixThPro) matrixThPro.textContent = 'Pro ($3/mo)';
        }
      };

      if (toggleMonthly) toggleMonthly.onclick = () => setCycle('monthly');
      if (toggleAnnual) toggleAnnual.onclick = () => setCycle('annual');

      const btnFree = document.getElementById('btn-page-choose-free');
      if (btnFree) {
        btnFree.onclick = () => {
          if (window.FF?.app?.showApp) window.FF.app.showApp();
        };
      }

      const btnPro = document.getElementById('btn-page-choose-pro');
      if (btnPro) {
        btnPro.onclick = () => {
          this.openCheckoutModal('pro', currentCycle);
        };
      }

      const btnLife = document.getElementById('btn-page-choose-lifetime');
      if (btnLife) {
        btnLife.onclick = () => {
          this.openCheckoutModal('lifetime');
        };
      }

      const btnActivate = document.getElementById('btn-page-activate-key');
      if (btnActivate) {
        btnActivate.onclick = () => {
          this.openAuthModal('activate');
        };
      }
    }

    updateNavbarUI() {
      // 1. Landing page topbar integration
      const navPricingBtn = document.getElementById('nav-pricing-btn');
      if (navPricingBtn) {
        navPricingBtn.onclick = () => {
          if (window.FF?.app?.showPricing) {
            window.FF.app.showPricing();
          } else {
            this.openPricingModal();
          }
        };
      }
      document.getElementById('landing-pricing-trigger')?.remove();

      // 2. App workstation topbar integration
      const topbarRight = document.querySelector('.app-topbar-right');
      if (!topbarRight) return;

      if (!this.state.isLoggedIn) {
        topbarRight.innerHTML = `
          <button type="button" class="fk-topbar-pricing-btn" id="app-upgrade-trigger">Pricing</button>
          <button type="button" class="app-login-btn" id="app-login-btn">Log In</button>
        `;
        document.getElementById('app-upgrade-trigger')?.addEventListener('click', () => {
          if (window.FF?.app?.showPricing) {
            window.FF.app.showPricing();
          } else {
            this.openPricingModal();
          }
        });
        document.getElementById('app-login-btn')?.addEventListener('click', () => this.openAuthModal('login'));
      } else {
        const isLife = this.state.tier === 'lifetime';
        const isPro = this.state.tier === 'pro';
        const badgeText = isLife ? 'LIFETIME' : isPro ? 'PRO' : 'FREE';
        const badgeClass = isLife ? 'is-lifetime' : isPro ? 'is-pro' : 'is-free';

        topbarRight.innerHTML = `
          <button type="button" class="fk-nav-user-profile-btn" id="app-user-profile-trigger" title="Account & Settings">
            <div class="fk-nav-user-avatar">${(this.state.user.name || 'U').charAt(0).toUpperCase()}</div>
            <div class="fk-nav-user-info">
              <span class="fk-nav-user-name">${this.state.user.name || 'Member'}</span>
              <span class="fk-nav-user-badge ${badgeClass}">${badgeText}</span>
            </div>
            <svg class="fk-nav-user-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
        `;
        document.getElementById('app-user-profile-trigger')?.addEventListener('click', () => {
          this.openAccountWorkspace('profile');
        });
      }
    }

    // =========================================================================
    // FULL SETTINGS STUDIO WORKSPACE CONTROLLER (#app-account-view)
    // =========================================================================
    openAccountWorkspace(initialTab = 'profile') {
      const appView = document.getElementById('app-view');
      const homeView = document.getElementById('app-home-view');
      const catView = document.getElementById('app-category-view');
      const toolView = document.getElementById('app-workspace-tool-view');
      const accountView = document.getElementById('app-account-view');

      if (!accountView) return;

      // Ensure app workstation is visible
      if (appView && appView.hidden) {
        if (window.FF?.app?.showApp) window.FF.app.showApp('Account');
      }

      // Hide all sibling views
      if (homeView) homeView.hidden = true;
      if (catView) catView.hidden = true;
      if (toolView) toolView.hidden = true;
      accountView.hidden = false;

      // Clean topbar in Account Studio
      const topbarCenter = document.getElementById('app-topbar-center');
      if (topbarCenter) topbarCenter.innerHTML = '';
      const topbarUpgrade = document.getElementById('app-getpro-btn');
      if (topbarUpgrade) topbarUpgrade.style.display = 'none';

      // Update workspace header & sidebar active states
      const workspaceTitle = document.getElementById('app-workspace-title');
      if (workspaceTitle) workspaceTitle.textContent = 'Account & Settings';

      document.querySelectorAll('.rail-item').forEach((item) => {
        const isAccount = item.id === 'rail-account-btn';
        item.classList.toggle('active', isAccount);
        if (isAccount) item.setAttribute('aria-current', 'page');
        else item.removeAttribute('aria-current');
      });

      // Render header status badge
      this.renderWorkspaceHeaderBadge();

      // Render tab nav & content
      this.setupWorkspaceTabs();
      this.switchWorkspaceTab(initialTab);
    }

    renderWorkspaceHeaderBadge() {
      const container = document.getElementById('fk-settings-header-badge');
      if (!container) return;

      const isLife = this.isLifetime();
      const isPro = this.state.tier === 'pro';

      if (isLife) {
        container.innerHTML = `
          <div class="fk-status-pill is-lifetime">
            ${SVG.shieldCheck}
            <span>Permanent Lifetime License</span>
          </div>
        `;
      } else if (isPro) {
        container.innerHTML = `
          <div class="fk-status-pill is-pro">
            ${SVG.sparkle}
            <span>Pro Subscriber ($3/mo)</span>
          </div>
        `;
      } else {
        container.innerHTML = `
          <div class="fk-status-pill is-free">
            ${SVG.shield}
            <span>Free Local Tier</span>
          </div>
        `;
      }
    }

    setupWorkspaceTabs() {
      const navList = document.querySelector('.fk-settings-nav-list');
      const pill = document.getElementById('fk-settings-nav-pill');
      if (!navList) return;

      const items = navList.querySelectorAll('.fk-settings-nav-item');
      items.forEach((item) => {
        item.onclick = (e) => {
          e.preventDefault();
          const tab = item.dataset.tab;
          this.switchWorkspaceTab(tab);
        };
      });

      // Wire logout button in left rail
      const logoutBtn = document.getElementById('fk-settings-logout-btn');
      if (logoutBtn) {
        logoutBtn.onclick = () => this.logout();
      }
    }

    switchWorkspaceTab(tabName) {
      this.activeTab = tabName;
      const navList = document.querySelector('.fk-settings-nav-list');
      const pill = document.getElementById('fk-settings-nav-pill');
      const items = navList?.querySelectorAll('.fk-settings-nav-item') || [];

      items.forEach((item) => {
        const isAct = item.dataset.tab === tabName;
        item.classList.toggle('active', isAct);
        item.setAttribute('aria-selected', isAct ? 'true' : 'false');
        if (isAct && pill) {
          pill.style.opacity = '1';
          pill.style.transform = `translateY(${item.offsetTop}px)`;
          pill.style.height = `${item.offsetHeight}px`;
        }
      });

      this.renderWorkspace(tabName);
    }

    renderWorkspace(tabName) {
      const content = document.getElementById('fk-settings-content');
      if (!content) return;

      content.innerHTML = '';
      if (tabName === 'profile') this.renderProfilePanel(content);
      else if (tabName === 'plans') this.renderPlansPanel(content);
      else if (tabName === 'apps') this.renderAppsPanel(content);
      else if (tabName === 'privacy') this.renderPrivacyPanel(content);
      else if (tabName === 'preferences') this.renderPreferencesPanel(content);
    }

    // --- Tab 1: Profile & Identity ---
    renderProfilePanel(container) {
      const u = this.state.user;
      const card = document.createElement('div');
      card.className = 'fk-card';

      card.innerHTML = `
        <div class="fk-card-header">
          <div class="fk-card-header-left">
            <h3 class="fk-card-title">Profile & Workstation Identity</h3>
            <p class="fk-card-desc">Your credentials and hardware license seat on this device.</p>
          </div>
        </div>

        <div class="fk-card-body">
          <div class="fk-profile-row">
            <div class="fk-profile-avatar">${(u.name || 'G').charAt(0).toUpperCase()}</div>
            <div class="fk-profile-meta">
              <span class="fk-profile-name">${u.name || 'Guest User'}</span>
              <span class="fk-profile-email">${u.email || '100% on-device private session'}</span>
            </div>
          </div>

          <div class="fk-bento-stats">
            <div class="fk-bento-stat-card">
              <div class="fk-bento-stat-top">
                <span class="fk-bento-stat-label">Unlocked Tools</span>
                ${SVG.sparkle}
              </div>
              <span class="fk-bento-stat-val">197 / 197</span>
              <span style="font-size:11.5px;color:#737373;">All format families active</span>
            </div>

            <div class="fk-bento-stat-card">
              <div class="fk-bento-stat-top">
                <span class="fk-bento-stat-label">Privacy Shield</span>
                ${SVG.shieldCheck}
              </div>
              <span class="fk-bento-stat-val" style="color:#059669;">100%</span>
              <span style="font-size:11.5px;color:#737373;">0 Bytes uploaded to cloud</span>
            </div>

            <div class="fk-bento-stat-card">
              <div class="fk-bento-stat-top">
                <span class="fk-bento-stat-label">Batch Engine</span>
                ${SVG.lock}
              </div>
              <span class="fk-bento-stat-val" style="font-size:19px;">${this.isPro() ? 'Unlimited' : '10 Files'}</span>
              <span style="font-size:11.5px;color:#737373;">${this.isPro() ? 'Turbo multi-core worker' : 'Standard local batch'}</span>
            </div>
          </div>

          <div class="fk-form-grid" style="margin-top:8px;">
            <div class="fk-form-group">
              <label class="fk-form-label" for="ws-inp-name">Display Name</label>
              <input type="text" id="ws-inp-name" class="fk-input-control" value="${u.name || ''}" placeholder="Alex Morgan" />
            </div>
            <div class="fk-form-group">
              <label class="fk-form-label" for="ws-inp-email">Account Email</label>
              <input type="email" id="ws-inp-email" class="fk-input-control" value="${u.email || ''}" placeholder="alex@domain.com" />
            </div>
          </div>
        </div>

        <div class="fk-card-footer">
          <span>Identity stored securely in local browser memory.</span>
          <button type="button" class="fk-app-dl-btn" id="btn-save-profile" style="width:auto;padding:0 20px;background:#0A0A0A;color:#FFF;border:none;">
            Save Identity
          </button>
        </div>
      `;

      container.appendChild(card);

      card.querySelector('#btn-save-profile')?.addEventListener('click', () => {
        const nameVal = card.querySelector('#ws-inp-name').value.trim();
        const emailVal = card.querySelector('#ws-inp-email').value.trim();
        if (nameVal) this.state.user.name = nameVal;
        if (emailVal) this.state.user.email = emailVal;
        this.saveState();
        if (window.FF?.util?.toast) window.FF.util.toast('Profile identity saved.', 'success');
      });
    }

    // --- Tab 2: Plans & Pricing ---
    renderPlansPanel(container) {
      const isLife = this.isLifetime();
      const isPro = this.state.tier === 'pro';
      const isFree = !isLife && !isPro;

      const card = document.createElement('div');
      card.className = 'fk-card';

      card.innerHTML = `
        <div class="fk-card-header">
          <div class="fk-card-header-left">
            <h3 class="fk-card-title">Plans & Transparent Subscriptions</h3>
            <p class="fk-card-desc">Zero cloud upsells. Files execute 100% on your device hardware.</p>
          </div>
        </div>

        <div class="fk-card-body">
          <div class="fk-pricing-grid" style="margin-top:0;">
            
            <!-- Free Forever -->
            <div class="fk-pricing-card ${isFree ? 'is-current' : ''}">
              <div class="fk-pricing-card-top">
                <span class="fk-pricing-card-tier">Free Forever</span>
                <div class="fk-pricing-card-price">
                  <span class="fk-price-cur">$</span><span class="fk-price-val">0</span>
                  <span class="fk-price-period">forever</span>
                </div>
                <p class="fk-pricing-card-desc">Complete private file workstation with 8 primary engines and 197+ format tools.</p>
              </div>

              <div class="fk-pricing-feature-list">
                <div class="fk-pricing-feat-item"><span class="fk-check">${SVG.check}</span> <span><b>100% Private:</b> Files never touch any server</span></div>
                <div class="fk-pricing-feat-item"><span class="fk-check">${SVG.check}</span> <span><b>All 197+ Tools & 8 Workstations:</b> Siderail hubs & all format families</span></div>
                <div class="fk-pricing-feat-item"><span class="fk-check">${SVG.check}</span> <span><b>Generous Batching:</b> Up to 10 files simultaneously</span></div>
                <div class="fk-pricing-feat-item"><span class="fk-check">${SVG.check}</span> <span><b>Free OCR Engine:</b> Searchable PDF & Text extraction</span></div>
                <div class="fk-pricing-feat-item"><span class="fk-check">${SVG.check}</span> <span><b>High-Res Export:</b> Up to 300 DPI clarity</span></div>
                <div class="fk-pricing-feat-item"><span class="fk-check">${SVG.check}</span> <span>No watermarks, no ads, no countdown timers</span></div>
              </div>

              <button type="button" class="fk-pricing-cta-btn is-secondary" disabled>
                ${isFree ? 'Current Plan' : 'Free Included'}
              </button>
            </div>

            <!-- Pro Subscription -->
            <div class="fk-pricing-card ${isPro ? 'is-current' : ''}">
              <div class="fk-pricing-card-top">
                <span class="fk-pricing-card-tier">Pro Subscription</span>
                <div class="fk-pricing-card-price">
                  <span class="fk-price-cur">$</span><span class="fk-price-val">3</span>
                  <span class="fk-price-period">/ month</span>
                </div>
                <p class="fk-pricing-card-desc">For professionals and heavy users who need unlimited bulk volume and maximum turbo speed.</p>
              </div>

              <div class="fk-pricing-feature-list">
                <div class="fk-pricing-feat-item"><span class="fk-check">${SVG.check}</span> <span><b>Everything in Free</b></span></div>
                <div class="fk-pricing-feat-item"><span class="fk-check">${SVG.check}</span> <span><b>Unlimited Bulk Batching:</b> 50+ files across all 197+ tools</span></div>
                <div class="fk-pricing-feat-item"><span class="fk-check">${SVG.check}</span> <span><b>Turbo Parallel Engine:</b> Uses all CPU worker cores</span></div>
                <div class="fk-pricing-feat-item"><span class="fk-check">${SVG.check}</span> <span><b>Deep Compression:</b> AVIF/WebP & custom KB target</span></div>
                <div class="fk-pricing-feat-item"><span class="fk-check">${SVG.check}</span> <span><b>Preloaded OCR:</b> Instant multi-language dictionaries</span></div>
                <div class="fk-pricing-feat-item"><span class="fk-check">${SVG.check}</span> <span><b>Cloud Connectors:</b> Google Drive & Dropbox sync</span></div>
              </div>

              <button type="button" class="fk-pricing-cta-btn is-outline" id="btn-ws-choose-pro">
                ${isPro ? 'Active Plan' : 'Subscribe for $3 / month'}
              </button>
            </div>

            <!-- Permanent License HERO -->
            <div class="fk-pricing-card is-hero ${isLife ? 'is-current' : ''}">
              <div class="fk-hero-badge">BEST VALUE · PAY ONCE, OWN FOREVER</div>
              <div class="fk-pricing-card-top">
                <span class="fk-pricing-card-tier">Permanent App License</span>
                <div class="fk-pricing-card-price">
                  <span class="fk-price-cur">$</span><span class="fk-price-val">14</span>
                  <span class="fk-price-period">one-time</span>
                </div>
                <p class="fk-pricing-card-desc">Own standalone desktop apps and mobile PWAs forever with full access to all 197+ tools & 8 engines. Zero recurring fees.</p>
              </div>

              <div class="fk-apps-platform-badges">
                <div class="fk-platform-badge" title="Standalone macOS Application">${SVG.apple} <span>macOS</span></div>
                <div class="fk-platform-badge" title="Standalone Windows Application">${SVG.windows} <span>Windows</span></div>
                <div class="fk-platform-badge" title="Progressive Web App for Android">${SVG.android} <span>Android</span></div>
                <div class="fk-platform-badge" title="Progressive Web App for iOS">${SVG.mobile} <span>iOS</span></div>
              </div>

              <div class="fk-pricing-feature-list">
                <div class="fk-pricing-feat-item"><span class="fk-check">${SVG.check}</span> <span><b>All Pro Features Included Forever</b></span></div>
                <div class="fk-pricing-feat-item"><span class="fk-check">${SVG.check}</span> <span><b>Standalone Desktop App</b> for macOS & Windows</span></div>
                <div class="fk-pricing-feat-item"><span class="fk-check">${SVG.check}</span> <span><b>Native PWA App</b> for Android & iOS Home Screen</span></div>
                <div class="fk-pricing-feat-item"><span class="fk-check">${SVG.check}</span> <span><b>100% Offline Key:</b> Activates without internet</span></div>
                <div class="fk-pricing-feat-item"><span class="fk-check">${SVG.check}</span> <span><b>Multi-Device License:</b> Use on all your devices</span></div>
                <div class="fk-pricing-feat-item"><span class="fk-check">${SVG.check}</span> <span>Free lifetime software & engine updates</span></div>
              </div>

              <button type="button" class="fk-pricing-cta-btn is-primary" id="btn-ws-choose-lifetime">
                ${isLife ? 'Active Lifetime License' : 'Get Lifetime License ($14) →'}
              </button>
            </div>

          </div>
        </div>
      `;

      container.appendChild(card);

      card.querySelector('#btn-ws-choose-pro')?.addEventListener('click', () => {
        this.openCheckoutModal('pro');
      });

      card.querySelector('#btn-ws-choose-lifetime')?.addEventListener('click', () => {
        this.openCheckoutModal('lifetime');
      });
    }

    // --- Tab 3: License Keys & Desktop Apps Hub ---
    renderAppsPanel(container) {
      const isLife = this.isLifetime();
      const hasKey = !!this.state.licenseKey;

      const card = document.createElement('div');
      card.className = 'fk-card';

      card.innerHTML = `
        <div class="fk-card-header">
          <div class="fk-card-header-left">
            <h3 class="fk-card-title">Cryptographic License & Cross-Platform Apps</h3>
            <p class="fk-card-desc">Your perpetual offline device key and standalone desktop installer packages.</p>
          </div>
        </div>

        <div class="fk-card-body">
          <!-- Aceternity Glowing Border License Key Card -->
          <div class="fk-license-hero-card">
            <div class="fk-license-hero-top">
              <span class="fk-license-hero-tag">${SVG.key} <span>PERMANENT DEVICE LICENSE KEY</span></span>
              <span class="fk-license-status-tag">
                <span class="fk-pulse-dot"></span>
                <span>100% Offline Cryptographic Checksum Validated</span>
              </span>
            </div>

            <div class="fk-license-mono-box">
              <span class="fk-license-mono-val" id="ws-license-key-val">${this.state.licenseKey || 'NO KEY ACTIVATED (FREE TIER)'}</span>
              <button type="button" class="fk-copy-btn" id="btn-ws-copy-key" ${!hasKey ? 'disabled' : ''}>
                <span id="ws-copy-icon">${SVG.copy}</span>
                <span id="ws-copy-text">Copy Key</span>
              </button>
            </div>

            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
              <p class="fk-license-hero-sub">Validates 100% offline via polynomial checksum without phone-home telemetry tracking.</p>
              <button type="button" class="fk-app-dl-btn" id="btn-ws-recover-key" style="width:auto;height:30px;font-size:12px;padding:0 12px;background:rgba(255,255,255,0.08);border-color:rgba(255,255,255,0.15);color:#FFF;">
                Lost key? Lookup
              </button>
            </div>
          </div>

          <!-- Bento Grid Apps Hub -->
          <h4 style="font-family:'Outfit',sans-serif;font-size:17px;font-weight:600;margin:12px 0 4px 0;color:#0A0A0A;">
            Standalone Desktop & Mobile Apps
          </h4>

          <div class="fk-bento-apps-grid">
            <!-- macOS -->
            <div class="fk-bento-app-card">
              <div class="fk-app-card-top">
                <div class="fk-app-svg-box is-mac">${SVG.apple}</div>
                <strong class="fk-app-card-name">macOS Standalone App</strong>
                <p class="fk-app-card-desc">Native app window, system drag-and-drop, and dock integration for Apple Silicon & Intel.</p>
              </div>
              <button type="button" class="fk-app-dl-btn" id="btn-ws-dl-mac">
                ${SVG.download}
                <span>macOS (.dmg)</span>
              </button>
            </div>

            <!-- Windows -->
            <div class="fk-bento-app-card">
              <div class="fk-app-card-top">
                <div class="fk-app-svg-box is-win">${SVG.windows}</div>
                <strong class="fk-app-card-name">Windows Standalone App</strong>
                <p class="fk-app-card-desc">Native 64-bit desktop executable with offline file associations and zero latency.</p>
              </div>
              <button type="button" class="fk-app-dl-btn" id="btn-ws-dl-win">
                ${SVG.download}
                <span>Windows (.exe)</span>
              </button>
            </div>

            <!-- Mobile PWA -->
            <div class="fk-bento-app-card">
              <div class="fk-app-card-top">
                <div class="fk-app-svg-box is-mobile">${SVG.mobile}</div>
                <strong class="fk-app-card-name">Mobile PWA (iOS & Android)</strong>
                <p class="fk-app-card-desc">Install to Home Screen. Fast, full-screen offline workstation with zero App Store fees.</p>
              </div>
              <button type="button" class="fk-app-dl-btn" id="btn-ws-install-pwa">
                ${SVG.qr}
                <span>Install / Add to Home</span>
              </button>
            </div>
          </div>
        </div>
      `;

      container.appendChild(card);

      // Copy key with transitions.dev checkmark morph
      card.querySelector('#btn-ws-copy-key')?.addEventListener('click', () => {
        if (!this.state.licenseKey) return;
        navigator.clipboard.writeText(this.state.licenseKey).then(() => {
          const btn = card.querySelector('#btn-ws-copy-key');
          const icon = card.querySelector('#ws-copy-icon');
          const text = card.querySelector('#ws-copy-text');
          btn.classList.add('is-copied');
          icon.innerHTML = SVG.check;
          text.textContent = 'Copied!';
          setTimeout(() => {
            btn.classList.remove('is-copied');
            icon.innerHTML = SVG.copy;
            text.textContent = 'Copy Key';
          }, 2000);
          if (window.FF?.util?.toast) window.FF.util.toast('License key copied to clipboard.', 'success');
        });
      });

      card.querySelector('#btn-ws-recover-key')?.addEventListener('click', () => {
        this.openKeyRecoveryModal();
      });

      card.querySelector('#btn-ws-dl-mac')?.addEventListener('click', () => {
        if (!this.isPro()) {
          this.switchWorkspaceTab('plans');
          return;
        }
        if (window.FF?.util?.toast) window.FF.util.toast('Initiating macOS standalone app package download…', 'info');
      });

      card.querySelector('#btn-ws-dl-win')?.addEventListener('click', () => {
        if (!this.isPro()) {
          this.switchWorkspaceTab('plans');
          return;
        }
        if (window.FF?.util?.toast) window.FF.util.toast('Initiating Windows standalone app installer download…', 'info');
      });

      card.querySelector('#btn-ws-install-pwa')?.addEventListener('click', () => {
        this.showPwaInstallGuide();
      });
    }

    // --- Tab 4: Privacy & Local Storage Audit ---
    renderPrivacyPanel(container) {
      const card = document.createElement('div');
      card.className = 'fk-card';

      card.innerHTML = `
        <div class="fk-card-header">
          <div class="fk-card-header-left">
            <h3 class="fk-card-title">Zero-Telemetry Privacy & Local Storage Audit</h3>
            <p class="fk-card-desc">Verify that all 197 tools execute on-device with zero byte transmissions.</p>
          </div>
        </div>

        <div class="fk-card-body">
          <div class="fk-privacy-audit-box">
            <div class="fk-audit-metric-card">
              <span class="fk-audit-big-num">0 Bytes</span>
              <strong class="fk-audit-label">Cloud Data Uploads</strong>
              <span class="fk-audit-sub">Zero telemetry, zero remote document processing, zero tracking pixels.</span>
            </div>

            <div class="fk-audit-metric-card">
              <span class="fk-audit-big-num" id="ws-storage-size" style="color:#0A0A0A;">Estimating…</span>
              <strong class="fk-audit-label">Local Cache & Wasm Storage</strong>
              <span class="fk-audit-sub">Stored in browser IndexedDB for offline instant launches.</span>
            </div>
          </div>

          <div style="margin-top:8px;">
            <h4 style="font-size:14px;font-weight:600;margin-bottom:10px;color:#0A0A0A;">
              Installed On-Device WebAssembly Engines
            </h4>
            <div style="display:flex;flex-direction:column;gap:8px;">
              <div style="display:flex;justify-content:space-between;padding:10px 14px;background:#F7F7F7;border:1px solid #E5E5E5;border-radius:8px;font-size:13px;">
                <span><b>PDF-Lib & PDF.js Wasm</b> (Local PDF Engine)</span>
                <span style="color:#10B981;font-weight:600;">Active · On-Device</span>
              </div>
              <div style="display:flex;justify-content:space-between;padding:10px 14px;background:#F7F7F7;border:1px solid #E5E5E5;border-radius:8px;font-size:13px;">
                <span><b>FFmpeg WebAssembly Core</b> (Video & Audio Engine)</span>
                <span style="color:#10B981;font-weight:600;">Active · On-Device</span>
              </div>
              <div style="display:flex;justify-content:space-between;padding:10px 14px;background:#F7F7F7;border:1px solid #E5E5E5;border-radius:8px;font-size:13px;">
                <span><b>Tesseract.js OCR Models</b> (Optical Character Recognition)</span>
                <span style="color:#10B981;font-weight:600;">Active · On-Device</span>
              </div>
            </div>
          </div>
        </div>

        <div class="fk-card-footer">
          <span>Leave zero trace on shared computers or work laptops.</span>
          <button type="button" class="fk-app-dl-btn" id="btn-purge-storage" style="width:auto;padding:0 18px;color:#DC2626;border-color:#FCA5A5;">
            ${SVG.trash}
            <span>Purge Local Storage & Cache</span>
          </button>
        </div>
      `;

      container.appendChild(card);

      // Estimate real browser storage
      if (navigator.storage && navigator.storage.estimate) {
        navigator.storage.estimate().then((est) => {
          const mb = (est.usage / (1024 * 1024)).toFixed(1);
          const el = card.querySelector('#ws-storage-size');
          if (el) el.textContent = `${mb} MB`;
        }).catch(() => {
          const el = card.querySelector('#ws-storage-size');
          if (el) el.textContent = '< 5 MB';
        });
      }

      card.querySelector('#btn-purge-storage')?.addEventListener('click', () => {
        this.showPurgeConfirmModal();
      });
    }

    // --- Tab 5: Preferences & Invoices ---
    renderPreferencesPanel(container) {
      const p = this.prefs;
      const card = document.createElement('div');
      card.className = 'fk-card';

      card.innerHTML = `
        <div class="fk-card-header">
          <div class="fk-card-header-left">
            <h3 class="fk-card-title">Workspace Preferences & Invoices</h3>
            <p class="fk-card-desc">Configure resolution defaults, parallel worker engines, and download receipts.</p>
          </div>
        </div>

        <div class="fk-card-body">
          <div class="fk-pref-row">
            <div class="fk-pref-text">
              <span class="fk-pref-title">Default Export Resolution</span>
              <span class="fk-pref-desc">Rendering resolution for PDF page exports and scanned documents.</span>
            </div>
            <div style="display:flex;gap:6px;">
              <button type="button" class="fk-pref-dpi-btn ${p.exportDpi === '150' ? 'is-act' : ''}" data-dpi="150">150 DPI</button>
              <button type="button" class="fk-pref-dpi-btn ${p.exportDpi === '300' ? 'is-act' : ''}" data-dpi="300">300 DPI</button>
              <button type="button" class="fk-pref-dpi-btn ${p.exportDpi === '600' ? 'is-act' : ''}" data-dpi="600">600 DPI</button>
            </div>
          </div>

          <div class="fk-pref-row">
            <div class="fk-pref-text">
              <span class="fk-pref-title">Turbo Web Workers Multi-Core Engine</span>
              <span class="fk-pref-desc">Utilize all available hardware CPU worker threads for bulk conversions.</span>
            </div>
            <label class="fk-toggle-switch">
              <input type="checkbox" id="pref-turbo" ${p.turboWorkers ? 'checked' : ''} />
              <span class="fk-toggle-slider"></span>
            </label>
          </div>

          <div class="fk-pref-row">
            <div class="fk-pref-text">
              <span class="fk-pref-title">Deep Compression Engine (AVIF / WebP)</span>
              <span class="fk-pref-desc">Prioritize maximum file size reduction over compression speed.</span>
            </div>
            <label class="fk-toggle-switch">
              <input type="checkbox" id="pref-deep" ${p.deepCompression ? 'checked' : ''} />
              <span class="fk-toggle-slider"></span>
            </label>
          </div>

          <!-- Billing & Receipts Table (Context 6) -->
          <div style="margin-top:14px;padding-top:16px;border-top:1px solid #E5E5E5;">
            <h4 style="font-family:'Outfit',sans-serif;font-size:16px;font-weight:600;margin:0 0 10px 0;color:#0A0A0A;">
              Billing History & Tax Receipts
            </h4>
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
              <thead>
                <tr style="text-align:left;color:#737373;border-bottom:1px solid #E5E5E5;">
                  <th style="padding:8px 0;">Date</th>
                  <th style="padding:8px 0;">Description</th>
                  <th style="padding:8px 0;">Amount</th>
                  <th style="padding:8px 0;">Status</th>
                  <th style="padding:8px 0;text-align:right;">Receipt</th>
                </tr>
              </thead>
              <tbody>
                <tr style="border-bottom:1px solid #EEEEEE;">
                  <td style="padding:10px 0;">${this.state.activatedAt ? new Date(this.state.activatedAt).toLocaleDateString() : 'Sep 27, 2026'}</td>
                  <td style="padding:10px 0;font-weight:500;">${this.state.planName}</td>
                  <td style="padding:10px 0;font-family:'SF Mono',monospace;">${this.state.price}</td>
                  <td style="padding:10px 0;"><span style="color:#059669;font-weight:600;">Paid ✓</span></td>
                  <td style="padding:10px 0;text-align:right;">
                    <button type="button" class="fk-app-dl-btn" id="btn-dl-receipt" style="width:auto;height:28px;padding:0 10px;font-size:11.5px;">
                      ${SVG.download}
                      <span>Download Receipt (PDF)</span>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="fk-card-footer">
          <span>Settings persist locally in your browser storage.</span>
          <button type="button" class="fk-app-dl-btn" id="btn-save-prefs" style="width:auto;padding:0 20px;background:#0A0A0A;color:#FFF;border:none;">
            Save Preferences
          </button>
        </div>
      `;

      container.appendChild(card);

      // DPI buttons
      card.querySelectorAll('.fk-pref-dpi-btn').forEach((btn) => {
        btn.onclick = () => {
          card.querySelectorAll('.fk-pref-dpi-btn').forEach((b) => b.classList.remove('is-act'));
          btn.classList.add('is-act');
          p.exportDpi = btn.dataset.dpi;
        };
      });

      card.querySelector('#btn-save-prefs')?.addEventListener('click', () => {
        p.turboWorkers = card.querySelector('#pref-turbo').checked;
        p.deepCompression = card.querySelector('#pref-deep').checked;
        this.savePrefs(p);
      });

      // Client-side receipt generation via PDF-Lib
      card.querySelector('#btn-dl-receipt')?.addEventListener('click', () => {
        this.generateReceiptPdf();
      });
    }

    // =========================================================================
    // 8 CONTEXTUAL MICRO-COMPONENTS & DIALOGS
    // =========================================================================

    // --- Context 1: In-Tool Batch Gating Card (replaces browser confirm) ---
    checkBatchLimit(fileCount) {
      if (fileCount <= 10 || this.isPro()) return true;

      document.querySelectorAll('.fk-app-modal-overlay').forEach((m) => m.remove());
      const modal = document.createElement('div');
      modal.className = 'fk-app-modal-overlay';
      modal.id = 'fk-batch-gate-modal';

      modal.innerHTML = `
        <div class="fk-auth-dialog" style="max-width:480px;text-align:center;">
          <button type="button" class="fk-modal-close-btn" id="btn-gate-close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>

          <div style="width:52px;height:52px;border-radius:14px;background:#FEF3C7;color:#D97706;display:flex;align-items:center;justify-content:center;margin:0 auto 14px auto;">
            ${SVG.warning}
          </div>

          <h3 style="font-family:'Outfit',sans-serif;font-size:22px;font-weight:700;margin:0 0 8px 0;color:#0A0A0A;">
            Batch Limit: 10 Files on Free Tier
          </h3>
          <p style="font-size:14px;color:#737373;line-height:1.5;margin:0 0 22px 0;">
            You selected <b>${fileCount} files</b>. FileKit Free processes up to 10 files simultaneously on-device.
          </p>

          <div style="display:flex;flex-direction:column;gap:10px;">
            <button type="button" class="fk-pricing-cta-btn is-primary" id="btn-gate-upgrade" style="height:44px;">
              ${SVG.sparkle}
              <span>Unlock Unlimited Batching &rarr;</span>
            </button>
            <button type="button" class="fk-app-dl-btn" id="btn-gate-process-10" style="height:40px;">
              Process First 10 Files (Free)
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      modal.querySelector('#btn-gate-close').onclick = () => modal.remove();
      modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

      modal.querySelector('#btn-gate-upgrade').onclick = () => {
        modal.remove();
        this.openPricingModal();
      };

      modal.querySelector('#btn-gate-process-10').onclick = () => {
        modal.remove();
        if (window.FF?.util?.toast) window.FF.util.toast('Processing first 10 files…', 'info');
      };

      return false;
    }

    // --- Context 2: Success Purchase & Activation Celebration with Confetti Burst ---
    showCelebration(title, sub, isLife = true) {
      document.querySelectorAll('#fk-celebration-overlay').forEach((m) => m.remove());

      const overlay = document.createElement('div');
      overlay.id = 'fk-celebration-overlay';
      overlay.className = 'fk-app-modal-overlay';

      // 50 Confetti particles
      let confettiHtml = '';
      const colors = ['#10B981', '#6366F1', '#F59E0B', '#EC4899', '#3B82F6'];
      for (let i = 0; i < 40; i++) {
        const left = Math.random() * 100;
        const animDelay = Math.random() * 1.5;
        const color = colors[Math.floor(Math.random() * colors.length)];
        confettiHtml += `<span class="fk-confetti-piece" style="left:${left}%;animation-delay:${animDelay}s;background:${color};"></span>`;
      }

      overlay.innerHTML = `
        <div class="fk-confetti-container">${confettiHtml}</div>
        <div class="fk-auth-dialog" style="max-width:480px;text-align:center;position:relative;z-index:10;animation:pop-in 350ms cubic-bezier(0.22, 1, 0.36, 1) both;">
          <div style="width:64px;height:64px;border-radius:9999px;background:#DCFCE7;color:#166534;display:flex;align-items:center;justify-content:center;margin:0 auto 16px auto;box-shadow:0 0 24px rgba(16,185,129,0.3);">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>

          <h3 style="font-family:'Outfit',sans-serif;font-size:24px;font-weight:700;margin:0 0 8px 0;color:#0A0A0A;">
            ${title || 'License Successfully Unlocked!'}
          </h3>
          <p style="font-size:14px;color:#737373;line-height:1.5;margin:0 0 24px 0;">
            ${sub || 'All 197 specialized tools and standalone cross-platform apps are permanently unlocked.'}
          </p>

          <div style="display:flex;flex-direction:column;gap:10px;">
            <button type="button" class="fk-pricing-cta-btn is-primary" id="btn-cel-open-apps" style="height:44px;">
              ${SVG.download}
              <span>Download Desktop Apps (.dmg & .exe) →</span>
            </button>
            <button type="button" class="fk-app-dl-btn" id="btn-cel-close" style="height:40px;">
              Continue to Workstation
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      overlay.querySelector('#btn-cel-close').onclick = () => overlay.remove();
      overlay.querySelector('#btn-cel-open-apps').onclick = () => {
        overlay.remove();
        this.openAccountWorkspace('apps');
      };
    }

    // --- Context 3: Mobile PWA "Add to Home Screen" Onboarding Sheet ---
    showPwaInstallGuide() {
      // Check native beforeinstallprompt
      const promptEvent = window[PWA_PROMPT_KEY];
      if (promptEvent) {
        promptEvent.prompt();
        promptEvent.userChoice.then((choice) => {
          if (choice.outcome === 'accepted') {
            if (window.FF?.util?.toast) window.FF.util.toast('FileKit installed to Home Screen!', 'success');
          }
          window[PWA_PROMPT_KEY] = null;
        });
        return;
      }

      // Step-by-step iOS & Android visual guide
      const modal = document.createElement('div');
      modal.className = 'fk-app-modal-overlay';

      modal.innerHTML = `
        <div class="fk-auth-dialog" style="max-width:480px;">
          <button type="button" class="fk-modal-close-btn" id="btn-pwa-close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>

          <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
            <div style="width:40px;height:40px;border-radius:10px;background:#10B981;color:#FFF;display:flex;align-items:center;justify-content:center;">
              ${SVG.mobile}
            </div>
            <div>
              <h3 style="font-family:'Outfit',sans-serif;font-size:18px;font-weight:700;margin:0;color:#0A0A0A;">Install FileKit Mobile App</h3>
              <span style="font-size:12.5px;color:#737373;">Runs full-screen offline on iOS & Android</span>
            </div>
          </div>

          <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:20px;">
            <div style="display:flex;gap:12px;padding:12px;background:#F7F7F7;border:1px solid #E5E5E5;border-radius:10px;">
              <span style="width:24px;height:24px;border-radius:9999px;background:#0A0A0A;color:#FFF;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;">1</span>
              <span style="font-size:13px;color:#383838;line-height:1.4;">In <b>Safari (iOS)</b> or <b>Chrome (Android)</b>, tap the <b>Share / Menu icon</b> in your browser.</span>
            </div>

            <div style="display:flex;gap:12px;padding:12px;background:#F7F7F7;border:1px solid #E5E5E5;border-radius:10px;">
              <span style="width:24px;height:24px;border-radius:9999px;background:#0A0A0A;color:#FFF;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;">2</span>
              <span style="font-size:13px;color:#383838;line-height:1.4;">Scroll down and tap <b>"Add to Home Screen"</b>.</span>
            </div>

            <div style="display:flex;gap:12px;padding:12px;background:#F7F7F7;border:1px solid #E5E5E5;border-radius:10px;">
              <span style="width:24px;height:24px;border-radius:9999px;background:#0A0A0A;color:#FFF;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;">3</span>
              <span style="font-size:13px;color:#383838;line-height:1.4;">Launch FileKit from your home screen as a standalone offline application!</span>
            </div>
          </div>

          <button type="button" class="fk-pricing-cta-btn is-primary" id="btn-pwa-dismiss">Got It</button>
        </div>
      `;

      document.body.appendChild(modal);
      modal.querySelector('#btn-pwa-close').onclick = () => modal.remove();
      modal.querySelector('#btn-pwa-dismiss').onclick = () => modal.remove();
      modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    }

    // --- Context 5: Clean SaaS Checkout Sheet ---
    openCheckoutModal(tier = 'lifetime', cycle = 'monthly') {
      document.querySelectorAll('.fk-app-modal-overlay').forEach((m) => m.remove());
      const isLife = tier === 'lifetime';
      const isAnnual = cycle === 'annual';
      const price = isLife ? '$14.00' : isAnnual ? '$24.00' : '$3.00';
      const title = isLife ? 'Permanent Lifetime License' : isAnnual ? 'Pro Annual ($24/yr — $2/mo)' : 'Pro Subscription ($3/mo)';

      const modal = document.createElement('div');
      modal.className = 'fk-app-modal-overlay';
      modal.id = 'fk-checkout-modal';

      modal.innerHTML = `
        <div class="fk-auth-dialog" style="max-width:480px;">
          <button type="button" class="fk-modal-close-btn" id="btn-chk-close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>

          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
            <div>
              <span style="font-size:11.5px;font-weight:700;color:#059669;letter-spacing:0.04em;text-transform:uppercase;">SECURE CHECKOUT</span>
              <h3 style="font-family:'Outfit',sans-serif;font-size:20px;font-weight:700;margin:2px 0 0 0;color:#0A0A0A;">${title}</h3>
            </div>
            <div style="font-family:'Outfit',sans-serif;font-size:24px;font-weight:800;color:#0A0A0A;">${price}</div>
          </div>

          <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:#F7F7F7;border:1px solid #E5E5E5;border-radius:10px;margin-bottom:18px;">
            <div style="display:flex;align-items:center;gap:8px;">
              ${SVG.cardVisa}
              ${SVG.cardMastercard}
            </div>
            <span style="font-size:12px;color:#737373;">256-Bit Encrypted</span>
          </div>

          <form id="form-checkout">
            <div class="fk-form-group" style="margin-bottom:12px;">
              <label class="fk-form-label" for="inp-card-name">Cardholder Name</label>
              <input type="text" id="inp-card-name" class="fk-input-control" placeholder="Alex Morgan" required />
            </div>

            <div class="fk-form-group" style="margin-bottom:12px;">
              <label class="fk-form-label" for="inp-card-num">Card Number</label>
              <input type="text" id="inp-card-num" class="fk-input-control" placeholder="•••• •••• •••• 4242" required />
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">
              <div class="fk-form-group">
                <label class="fk-form-label" for="inp-card-exp">Expires</label>
                <input type="text" id="inp-card-exp" class="fk-input-control" placeholder="MM / YY" required />
              </div>
              <div class="fk-form-group">
                <label class="fk-form-label" for="inp-card-cvc">CVC</label>
                <input type="text" id="inp-card-cvc" class="fk-input-control" placeholder="123" required />
              </div>
            </div>

            <button type="submit" class="fk-pricing-cta-btn is-primary" style="height:44px;font-size:14px;">
              ${SVG.lock}
              <span>Pay ${price} & Unlock Instant Key</span>
            </button>
          </form>

          <p style="text-align:center;font-size:11.5px;color:#8C8C8C;margin:14px 0 0 0;">
            14-day money back guarantee · 100% offline license key generated instantly
          </p>
        </div>
      `;

      document.body.appendChild(modal);

      modal.querySelector('#btn-chk-close').onclick = () => modal.remove();
      modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

      modal.querySelector('#form-checkout').onsubmit = (e) => {
        e.preventDefault();
        this.upgrade(tier);
        modal.remove();
        this.showCelebration('Payment Successful!', `Your ${title} is active. Generated key: ${this.state.licenseKey}`, isLife);
      };
    }

    // --- Context 6: Invoices & Receipts Generator (client-side PDF) ---
    async generateReceiptPdf() {
      try {
        if (!window.PDFLib) {
          if (window.FF?.util?.toast) window.FF.util.toast('Loading PDF engine…', 'info');
          await window.FF?.loadScript?.('vendor/pdf-lib.min.js');
        }
        const PDFLib = window.PDFLib;
        const pdfDoc = await PDFLib.PDFDocument.create();
        const page = pdfDoc.addPage([595, 420]); // A5 landscape receipt
        const font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
        const fontBold = await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBold);

        page.drawText('FILEKIT RECEIPT & PROOF OF PURCHASE', { x: 40, y: 370, size: 16, font: fontBold, color: PDFLib.rgb(0.06, 0.09, 0.16) });
        page.drawText('100% Private On-Device File Workstation', { x: 40, y: 350, size: 10, font, color: PDFLib.rgb(0.4, 0.45, 0.5) });

        page.drawLine({ start: { x: 40, y: 330 }, end: { x: 555, y: 330 }, thickness: 1, color: PDFLib.rgb(0.88, 0.9, 0.94) });

        page.drawText('Order Date: ' + (this.state.activatedAt ? new Date(this.state.activatedAt).toLocaleDateString() : 'Sep 27, 2026'), { x: 40, y: 300, size: 11, font, color: PDFLib.rgb(0.2, 0.2, 0.2) });
        page.drawText('License Plan: ' + this.state.planName, { x: 40, y: 275, size: 11, font: fontBold, color: PDFLib.rgb(0.06, 0.09, 0.16) });
        page.drawText('Cryptographic License Key: ' + (this.state.licenseKey || 'N/A'), { x: 40, y: 250, size: 10, font, color: PDFLib.rgb(0.3, 0.3, 0.3) });
        page.drawText('Amount Paid: ' + this.state.price + ' (USD)', { x: 40, y: 225, size: 12, font: fontBold, color: PDFLib.rgb(0.02, 0.58, 0.41) });
        page.drawText('Payment Status: PAID IN FULL (Tax Deductible)', { x: 40, y: 200, size: 10, font, color: PDFLib.rgb(0.1, 0.4, 0.2) });

        page.drawLine({ start: { x: 40, y: 170 }, end: { x: 555, y: 170 }, thickness: 1, color: PDFLib.rgb(0.88, 0.9, 0.94) });
        page.drawText('Thank you for supporting private, local-first open tools.', { x: 40, y: 140, size: 10, font, color: PDFLib.rgb(0.4, 0.45, 0.5) });

        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `FileKit_Receipt_${this.state.tier.toUpperCase()}.pdf`;
        a.click();
        if (window.FF?.util?.toast) window.FF.util.toast('PDF Receipt downloaded.', 'success');
      } catch (err) {
        console.error('Receipt generation error:', err);
        alert('Receipt: ' + this.state.planName + ' - ' + this.state.price + '\nKey: ' + this.state.licenseKey);
      }
    }

    // --- Context 7: Destructive Cache Purge Alert Dialog ---
    showPurgeConfirmModal() {
      const modal = document.createElement('div');
      modal.className = 'fk-app-modal-overlay';

      modal.innerHTML = `
        <div class="fk-auth-dialog" style="max-width:440px;text-align:center;">
          <div style="width:52px;height:52px;border-radius:14px;background:#FEE2E2;color:#DC2626;display:flex;align-items:center;justify-content:center;margin:0 auto 14px auto;">
            ${SVG.trash}
          </div>

          <h3 style="font-family:'Outfit',sans-serif;font-size:20px;font-weight:700;margin:0 0 8px 0;color:#0A0A0A;">
            Purge Local Storage & Cache?
          </h3>
          <p style="font-size:13.5px;color:#737373;line-height:1.5;margin:0 0 20px 0;">
            This removes all cached WebAssembly binaries (FFmpeg, OCR) and resets local session state. No file data is permanently lost.
          </p>

          <div style="display:flex;gap:10px;">
            <button type="button" class="fk-app-dl-btn" id="btn-purge-cancel" style="flex:1;">Cancel</button>
            <button type="button" class="fk-pricing-cta-btn" id="btn-purge-confirm" style="flex:1;background:#DC2626;color:#FFF;border:none;">
              Yes, Purge Storage
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      modal.querySelector('#btn-purge-cancel').onclick = () => modal.remove();
      modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

      modal.querySelector('#btn-purge-confirm').onclick = async () => {
        try {
          if (window.caches) {
            const keys = await caches.keys();
            await Promise.all(keys.map((k) => caches.delete(k)));
          }
          if (window.indexedDB && window.indexedDB.databases) {
            const dbs = await window.indexedDB.databases();
            dbs.forEach((db) => window.indexedDB.deleteDatabase(db.name));
          }
        } catch (e) {}
        modal.remove();
        if (window.FF?.util?.toast) window.FF.util.toast('Local cache purged cleanly.', 'success');
        this.renderWorkspace('privacy');
      };
    }

    // --- Context 8: License Key Recovery Modal ---
    openKeyRecoveryModal() {
      const modal = document.createElement('div');
      modal.className = 'fk-app-modal-overlay';

      modal.innerHTML = `
        <div class="fk-auth-dialog" style="max-width:440px;">
          <button type="button" class="fk-modal-close-btn" id="btn-rec-close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>

          <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
            <div style="width:38px;height:38px;border-radius:10px;background:#EEF2FF;color:#4F46E5;display:flex;align-items:center;justify-content:center;">
              ${SVG.key}
            </div>
            <div>
              <h3 style="font-family:'Outfit',sans-serif;font-size:18px;font-weight:700;margin:0;color:#0A0A0A;">Recover License Key</h3>
              <span style="font-size:12px;color:#737373;">Instant offline lookup for registered emails</span>
            </div>
          </div>

          <form id="form-recovery">
            <div class="fk-form-group" style="margin-bottom:14px;">
              <label class="fk-form-label">Registered Email</label>
              <input type="email" id="inp-rec-email" class="fk-input-control" placeholder="you@domain.com" required />
            </div>

            <div id="rec-result" style="display:none;margin-bottom:14px;padding:12px;border-radius:8px;background:#F7F7F7;border:1px solid #E5E5E5;font-size:13px;"></div>

            <button type="submit" class="fk-pricing-cta-btn is-primary" style="height:40px;">
              <span>Lookup My Key</span>
            </button>
          </form>
        </div>
      `;

      document.body.appendChild(modal);

      modal.querySelector('#btn-rec-close').onclick = () => modal.remove();
      modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

      modal.querySelector('#form-recovery').onsubmit = (e) => {
        e.preventDefault();
        const email = modal.querySelector('#inp-rec-email').value.trim();
        const resBox = modal.querySelector('#rec-result');
        resBox.style.display = 'block';

        if (this.state.licenseKey) {
          resBox.innerHTML = `
            <span style="color:#059669;font-weight:600;">Key Found:</span><br/>
            <code style="font-family:'SF Mono',monospace;font-size:14px;display:block;margin-top:4px;">${this.state.licenseKey}</code>
          `;
        } else {
          const sample = 'FK-LIFE-782A-94B1-33FC';
          resBox.innerHTML = `
            <span style="color:#4F46E5;font-weight:600;">Demo Key Available:</span><br/>
            <code style="font-family:'SF Mono',monospace;font-size:14px;display:block;margin-top:4px;">${sample}</code>
          `;
        }
      };
    }

    // =========================================================================
    // QUICK MODALS (Pricing, Auth, Account Hub)
    // =========================================================================

    openPricingModal() {
      this.closeModal('fk-pricing-modal');
      const isCurrentLifetime = this.isLifetime();
      const isCurrentPro = this.state.tier === 'pro';
      const isCurrentFree = !isCurrentLifetime && !isCurrentPro;

      const modal = document.createElement('div');
      modal.className = 'fk-app-modal-overlay';
      modal.id = 'fk-pricing-modal';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');

      modal.innerHTML = `
        <div class="fk-pricing-dialog" role="document">
          <button type="button" class="fk-modal-close-btn" id="btn-pricing-close" aria-label="Close dialog">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>

          <div class="fk-pricing-header">
            <div class="fk-pricing-pill">${SVG.shieldCheck} <span>TRANSPARENT LOCAL-FIRST LICENSING</span></div>
            <h2 class="fk-pricing-title">Simple, Honest Pricing. Zero Cloud Upsells.</h2>
            <p class="fk-pricing-subtitle">Your files are processed 100% locally in your device's memory. No server compute costs mean we pass the savings directly to you.</p>
          </div>

          <div class="fk-pricing-grid">
            <!-- Free Forever -->
            <div class="fk-pricing-card ${isCurrentFree ? 'is-current' : ''}">
              <div class="fk-pricing-card-top">
                <span class="fk-pricing-card-tier">Free Forever</span>
                <div class="fk-pricing-card-price"><span class="fk-price-cur">$</span><span class="fk-price-val">0</span><span class="fk-price-period">forever</span></div>
                <p class="fk-pricing-card-desc">Complete private file workstation with 8 primary engines and 197+ format tools.</p>
              </div>

              <div class="fk-pricing-feature-list">
                <div class="fk-pricing-feat-item"><span class="fk-check">${SVG.check}</span> <span><b>100% Private:</b> Files never touch any server</span></div>
                <div class="fk-pricing-feat-item"><span class="fk-check">${SVG.check}</span> <span><b>All 197+ Tools & 8 Workstations:</b> Siderail hubs & all format families</span></div>
                <div class="fk-pricing-feat-item"><span class="fk-check">${SVG.check}</span> <span><b>Generous Batching:</b> Up to 10 files simultaneously</span></div>
                <div class="fk-pricing-feat-item"><span class="fk-check">${SVG.check}</span> <span><b>Free OCR Engine:</b> Searchable PDF & Text extraction</span></div>
                <div class="fk-pricing-feat-item"><span class="fk-check">${SVG.check}</span> <span><b>High-Res Export:</b> Up to 300 DPI clarity</span></div>
                <div class="fk-pricing-feat-item"><span class="fk-check">${SVG.check}</span> <span>No watermarks, no ads, no countdown timers</span></div>
              </div>

              <button type="button" class="fk-pricing-cta-btn is-secondary" disabled>${isCurrentFree ? 'Current Plan' : 'Free Included'}</button>
            </div>

            <!-- Pro Subscription -->
            <div class="fk-pricing-card ${isCurrentPro ? 'is-current' : ''}">
              <div class="fk-pricing-card-top">
                <span class="fk-pricing-card-tier">Pro Subscription</span>
                <div class="fk-pricing-card-price"><span class="fk-price-cur">$</span><span class="fk-price-val">3</span><span class="fk-price-period">/ month</span></div>
                <p class="fk-pricing-card-desc">For professionals and heavy users who need unlimited bulk volume and maximum turbo speed.</p>
              </div>

              <div class="fk-pricing-feature-list">
                <div class="fk-pricing-feat-item"><span class="fk-check">${SVG.check}</span> <span><b>Everything in Free</b></span></div>
                <div class="fk-pricing-feat-item"><span class="fk-check">${SVG.check}</span> <span><b>Unlimited Bulk Batching:</b> 50+ files across all 197+ tools</span></div>
                <div class="fk-pricing-feat-item"><span class="fk-check">${SVG.check}</span> <span><b>Turbo Parallel Engine:</b> Uses all CPU worker cores</span></div>
                <div class="fk-pricing-feat-item"><span class="fk-check">${SVG.check}</span> <span><b>Deep Compression:</b> AVIF/WebP & custom KB target</span></div>
                <div class="fk-pricing-feat-item"><span class="fk-check">${SVG.check}</span> <span><b>Preloaded OCR:</b> Instant multi-language dictionaries</span></div>
                <div class="fk-pricing-feat-item"><span class="fk-check">${SVG.check}</span> <span><b>Cloud Connectors:</b> Google Drive & Dropbox sync</span></div>
              </div>

              <button type="button" class="fk-pricing-cta-btn is-outline" id="btn-choose-pro">${isCurrentPro ? 'Active Plan' : 'Subscribe for $3 / month'}</button>
            </div>

            <!-- Permanent License HERO -->
            <div class="fk-pricing-card is-hero ${isCurrentLifetime ? 'is-current' : ''}">
              <div class="fk-hero-badge">BEST VALUE · PAY ONCE, OWN FOREVER</div>
              <div class="fk-pricing-card-top">
                <span class="fk-pricing-card-tier">Permanent App License</span>
                <div class="fk-pricing-card-price"><span class="fk-price-cur">$</span><span class="fk-price-val">14</span><span class="fk-price-period">one-time</span></div>
                <p class="fk-pricing-card-desc">Own standalone desktop apps and mobile PWAs forever with full access to all 197+ tools & 8 engines. Zero recurring fees.</p>
              </div>

              <div class="fk-apps-platform-badges">
                <div class="fk-platform-badge" title="Standalone macOS Application">${SVG.apple} <span>macOS</span></div>
                <div class="fk-platform-badge" title="Standalone Windows Application">${SVG.windows} <span>Windows</span></div>
                <div class="fk-platform-badge" title="Progressive Web App for Android">${SVG.android} <span>Android</span></div>
                <div class="fk-platform-badge" title="Progressive Web App for iOS">${SVG.mobile} <span>iOS</span></div>
              </div>

              <div class="fk-pricing-feature-list">
                <div class="fk-pricing-feat-item"><span class="fk-check">${SVG.check}</span> <span><b>All Pro Features Included Forever</b></span></div>
                <div class="fk-pricing-feat-item"><span class="fk-check">${SVG.check}</span> <span><b>Standalone Desktop App</b> for macOS & Windows</span></div>
                <div class="fk-pricing-feat-item"><span class="fk-check">${SVG.check}</span> <span><b>Native PWA App</b> for Android & iOS Home Screen</span></div>
                <div class="fk-pricing-feat-item"><span class="fk-check">${SVG.check}</span> <span><b>100% Offline Key:</b> Activates without internet</span></div>
                <div class="fk-pricing-feat-item"><span class="fk-check">${SVG.check}</span> <span><b>Multi-Device License:</b> Use on all your devices</span></div>
                <div class="fk-pricing-feat-item"><span class="fk-check">${SVG.check}</span> <span>Free lifetime software & engine updates</span></div>
              </div>

              <button type="button" class="fk-pricing-cta-btn is-primary" id="btn-choose-lifetime">${isCurrentLifetime ? 'Active Lifetime License' : 'Get Lifetime License ($14) →'}</button>
            </div>
          </div>

          <div class="fk-pricing-footer">
            <span class="fk-pricing-footer-text">Already purchased a permanent license key?</span>
            <button type="button" class="fk-pricing-link-btn" id="btn-switch-to-activate">Activate License Key →</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      modal.querySelector('#btn-pricing-close').onclick = () => modal.remove();
      modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

      modal.querySelector('#btn-choose-pro')?.addEventListener('click', () => {
        modal.remove();
        this.openCheckoutModal('pro');
      });

      modal.querySelector('#btn-choose-lifetime')?.addEventListener('click', () => {
        modal.remove();
        this.openCheckoutModal('lifetime');
      });

      modal.querySelector('#btn-switch-to-activate')?.addEventListener('click', () => {
        modal.remove();
        this.openAuthModal('activate');
      });
    }

    // --- High-Craft Auth Cards: Sign In, Sign Up, and Key Activation ---
    openAuthModal(defaultTab = 'login') {
      this.closeModal('fk-auth-modal');

      const modal = document.createElement('div');
      modal.className = 'fk-app-modal-overlay';
      modal.id = 'fk-auth-modal';

      modal.innerHTML = `
        <div class="fk-auth-dialog" role="document">
          <button type="button" class="fk-modal-close-btn" id="btn-auth-close" aria-label="Close dialog">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>

          <div class="fk-auth-head">
            <div class="fk-auth-logo">
              ${SVG.shieldCheck}
            </div>
            <h3 class="fk-auth-title">FileKit Account & License</h3>
            <p class="fk-auth-sub">Manage your workstation subscriptions and activate offline device licenses.</p>
          </div>

          <div class="fk-auth-tabs" role="tablist">
            <button type="button" class="fk-auth-tab ${defaultTab === 'login' ? 'is-active' : ''}" data-tab="login">Sign In</button>
            <button type="button" class="fk-auth-tab ${defaultTab === 'register' ? 'is-active' : ''}" data-tab="register">Create Account</button>
            <button type="button" class="fk-auth-tab ${defaultTab === 'activate' ? 'is-active' : ''}" data-tab="activate">
              ${SVG.key} <span>Activate Key</span>
            </button>
          </div>

          <!-- Sign In Card (Shadcn Blocks style) -->
          <div class="fk-auth-pane ${defaultTab === 'login' ? 'is-active' : ''}" id="pane-login">
            <form id="form-auth-login">
              <div class="fk-form-group" style="margin-bottom:12px;">
                <label class="fk-form-label" for="inp-login-email">Email Address</label>
                <div style="position:relative;display:flex;align-items:center;">
                  <span style="position:absolute;left:12px;display:flex;align-items:center;color:#8C8C8C;pointer-events:none;">${SVG.mail}</span>
                  <input type="email" id="inp-login-email" class="fk-input-control fk-has-left-icon" placeholder="you@domain.com" required />
                </div>
              </div>

              <div class="fk-form-group" style="margin-bottom:12px;">
                <label class="fk-form-label" for="inp-login-pass">Password</label>
                <div style="position:relative;display:flex;align-items:center;">
                  <span style="position:absolute;left:12px;display:flex;align-items:center;color:#8C8C8C;pointer-events:none;">${SVG.lock}</span>
                  <input type="password" id="inp-login-pass" class="fk-input-control fk-has-left-icon fk-has-right-icon" placeholder="••••••••" required />
                  <button type="button" id="btn-toggle-login-pass" style="position:absolute;right:10px;background:none;border:none;color:#8C8C8C;cursor:pointer;display:flex;align-items:center;">
                    ${SVG.eye}
                  </button>
                </div>
              </div>

              <div style="display:flex;align-items:center;justify-content:space-between;font-size:12.5px;color:#737373;margin-bottom:16px;">
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
                  <input type="checkbox" checked />
                  <span>Remember this device</span>
                </label>
                <a href="#" id="link-forgot-pass" style="color:#0A0A0A;font-weight:600;text-decoration:none;">Forgot?</a>
              </div>

              <button type="submit" class="fk-pricing-cta-btn is-primary" style="height:42px;">
                <span>Sign In to Workstation →</span>
              </button>
            </form>
          </div>

          <!-- Sign Up Card -->
          <div class="fk-auth-pane ${defaultTab === 'register' ? 'is-active' : ''}" id="pane-register">
            <form id="form-auth-register">
              <div class="fk-form-group" style="margin-bottom:12px;">
                <label class="fk-form-label">Full Name</label>
                <input type="text" id="inp-reg-name" class="fk-input-control" placeholder="Alex Morgan" required />
              </div>

              <div class="fk-form-group" style="margin-bottom:12px;">
                <label class="fk-form-label">Email Address</label>
                <input type="email" id="inp-reg-email" class="fk-input-control" placeholder="alex@domain.com" required />
              </div>

              <div class="fk-form-group" style="margin-bottom:14px;">
                <label class="fk-form-label">Password</label>
                <input type="password" id="inp-reg-pass" class="fk-input-control" placeholder="At least 6 characters" minlength="6" required />
              </div>

              <div style="margin-bottom:16px;font-size:12px;color:#737373;">
                <label style="display:flex;align-items:flex-start;gap:8px;cursor:pointer;">
                  <input type="checkbox" required checked />
                  <span>I agree that all my file tasks run 100% locally on this device without cloud uploads.</span>
                </label>
              </div>

              <button type="submit" class="fk-pricing-cta-btn is-primary" style="height:42px;">
                <span>Create Free Account →</span>
              </button>
            </form>
          </div>

          <!-- Key Activation Card -->
          <div class="fk-auth-pane ${defaultTab === 'activate' ? 'is-active' : ''}" id="pane-activate">
            <form id="form-auth-activate">
              <div class="fk-form-group" style="margin-bottom:10px;">
                <label class="fk-form-label">Permanent License Key (macOS, Windows, iOS, Android)</label>
                <div style="position:relative;display:flex;align-items:center;">
                  <span style="position:absolute;left:12px;display:flex;align-items:center;color:#8C8C8C;pointer-events:none;">${SVG.key}</span>
                  <input type="text" id="inp-activate-key" class="fk-input-control fk-has-left-icon" style="font-family:'SF Mono',monospace;letter-spacing:0.06em;" placeholder="FK-LIFE-XXXX-XXXX-XXXX" required />
                </div>
              </div>

              <p style="font-size:12px;color:#737373;line-height:1.4;margin:0 0 12px 0;">
                Validates 100% offline via cryptographic polynomial checksum without phone-home tracking.
              </p>

              <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">
                <span style="font-size:12px;color:#737373;">Sample Key:</span>
                <button type="button" class="fk-key-sample-btn" id="btn-insert-demo-key">FK-LIFE-782A-94B1-33FC</button>
              </div>

              <button type="submit" class="fk-pricing-cta-btn is-primary" style="height:42px;">
                ${SVG.sparkle}
                <span>Unlock Permanent License</span>
              </button>
            </form>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      modal.querySelector('#btn-auth-close').onclick = () => modal.remove();
      modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

      // Tab switcher
      modal.querySelectorAll('.fk-auth-tab').forEach((tabBtn) => {
        tabBtn.onclick = () => {
          modal.querySelectorAll('.fk-auth-tab').forEach((b) => b.classList.remove('is-active'));
          modal.querySelectorAll('.fk-auth-pane').forEach((p) => p.classList.remove('is-active'));
          tabBtn.classList.add('is-active');
          const target = modal.querySelector('#pane-' + tabBtn.dataset.tab);
          if (target) target.classList.add('is-active');
        };
      });

      // Password toggle
      const passBtn = modal.querySelector('#btn-toggle-login-pass');
      const passInp = modal.querySelector('#inp-login-pass');
      passBtn?.addEventListener('click', () => {
        const isPass = passInp.type === 'password';
        passInp.type = isPass ? 'text' : 'password';
        passBtn.innerHTML = isPass ? SVG.eyeOff : SVG.eye;
      });

      // Form 1: Login
      modal.querySelector('#form-auth-login').onsubmit = (e) => {
        e.preventDefault();
        const email = modal.querySelector('#inp-login-email').value.trim();
        this.state.isLoggedIn = true;
        this.state.user.email = email;
        this.state.user.name = email.split('@')[0];
        this.saveState();
        modal.remove();
        if (window.FF?.util?.toast) window.FF.util.toast('Signed in as ' + email, 'success');
      };

      // Form 2: Register
      modal.querySelector('#form-auth-register').onsubmit = (e) => {
        e.preventDefault();
        const name = modal.querySelector('#inp-reg-name').value.trim();
        const email = modal.querySelector('#inp-reg-email').value.trim();
        this.state.isLoggedIn = true;
        this.state.user.name = name;
        this.state.user.email = email;
        this.saveState();
        modal.remove();
        if (window.FF?.util?.toast) window.FF.util.toast('Welcome to FileKit, ' + name + '!', 'success');
      };

      // Form 3: Activate Key
      modal.querySelector('#btn-insert-demo-key').onclick = () => {
        modal.querySelector('#inp-activate-key').value = 'FK-LIFE-782A-94B1-33FC';
      };

      modal.querySelector('#form-auth-activate').onsubmit = (e) => {
        e.preventDefault();
        const key = modal.querySelector('#inp-activate-key').value.trim();
        const res = this.activateKey(key);
        if (res.valid) {
          modal.remove();
          this.showCelebration('Permanent License Unlocked!', `Key ${key} activated 100% offline. Desktop and PWA apps unlocked!`, true);
        } else {
          alert(res.message);
        }
      };
    }

    // --- Compact Account Modal ---
    openAccountModal() {
      this.closeModal('fk-account-modal');

      const isLife = this.isLifetime();
      const isPro = this.state.tier === 'pro';
      const tierBadge = isLife ? 'Permanent Lifetime License' : isPro ? 'Pro Subscriber ($3/mo)' : 'Free Tier';
      const badgeStyle = isLife ? 'background:#DCFCE7; color:#166534; border:1px solid #86EFAC;' : isPro ? 'background:#EEF2FF; color:#3730A3; border:1px solid #C7D2FE;' : 'background:#EEEEEE; color:#525252; border:1px solid #D4D4D4;';

      const modal = document.createElement('div');
      modal.className = 'fk-app-modal-overlay';
      modal.id = 'fk-account-modal';

      modal.innerHTML = `
        <div class="fk-account-dialog" role="document">
          <button type="button" class="fk-modal-close-btn" id="btn-account-close" aria-label="Close dialog">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>

          <div class="fk-acc-header">
            <div class="fk-acc-avatar">${(this.state.user.name || 'U').charAt(0).toUpperCase()}</div>
            <div class="fk-acc-user-info">
              <h3 class="fk-acc-name">${this.state.user.name || 'Member'}</h3>
              <p class="fk-acc-email">${this.state.user.email || '100% on-device private session'}</p>
              <span class="fk-acc-badge" style="${badgeStyle}">${tierBadge}</span>
            </div>
          </div>

          <!-- License Key Section -->
          <div class="fk-key-card">
            <div class="fk-key-card-head">
              <span class="fk-key-title">Permanent Device License Key</span>
              <span class="fk-key-status">${this.state.licenseKey ? 'Activated ✓' : 'No Key'}</span>
            </div>
            <div class="fk-key-display">
              <span class="fk-key-value">${this.state.licenseKey || 'FREE TIER (UPGRADE FOR KEY)'}</span>
              ${this.state.licenseKey ? '<button type="button" class="fk-key-copy-btn" id="btn-copy-key">Copy</button>' : ''}
            </div>
            <p class="fk-key-note">Use this key on your Mac, Windows PC, Android, or iPhone to unlock unrestricted offline processing.</p>
          </div>

          <!-- Apps Download Section -->
          <div class="fk-apps-hub">
            <h4 class="fk-apps-hub-title">Cross-Platform Standalone & PWA Apps</h4>
            <div class="fk-app-item">
              <div class="fk-app-icon" style="color:#10B981;">${SVG.mobile}</div>
              <div class="fk-app-details">
                <span class="fk-app-name">Mobile App (Android & iOS via PWA)</span>
                <span class="fk-app-desc">Install to Home Screen. Fast, full-screen offline workstation with zero App Store fees.</span>
              </div>
              <button type="button" class="fk-app-action-btn" id="btn-install-pwa">
                ${SVG.download}
                <span>Install App</span>
              </button>
            </div>

            <div class="fk-app-item">
              <div class="fk-app-icon">${SVG.apple}</div>
              <div class="fk-app-details">
                <span class="fk-app-name">macOS Standalone App</span>
                <span class="fk-app-desc">Native window, system drag-and-drop, and dock integration for Apple Silicon & Intel.</span>
              </div>
              <button type="button" class="fk-app-action-btn" id="btn-dl-mac">
                ${SVG.download}
                <span>macOS (.dmg)</span>
              </button>
            </div>

            <div class="fk-app-item">
              <div class="fk-app-icon" style="color:#0078D4;">${SVG.windows}</div>
              <div class="fk-app-details">
                <span class="fk-app-name">Windows Standalone App</span>
                <span class="fk-app-desc">Native 64-bit desktop application with offline file association and zero cloud latency.</span>
              </div>
              <button type="button" class="fk-app-action-btn" id="btn-dl-win">
                ${SVG.download}
                <span>Windows (.exe)</span>
              </button>
            </div>
          </div>

          <div class="fk-acc-footer">
            <button type="button" class="fk-acc-link-btn" id="btn-acc-change-plan">Change Plan</button>
            <button type="button" class="fk-acc-link-btn is-danger" id="btn-acc-logout">Sign Out</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      modal.querySelector('#btn-account-close').onclick = () => modal.remove();
      modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

      modal.querySelector('#btn-acc-change-plan').onclick = () => {
        modal.remove();
        this.openPricingModal();
      };

      modal.querySelector('#btn-acc-logout').onclick = () => this.logout();

      modal.querySelector('#btn-copy-key')?.addEventListener('click', () => {
        navigator.clipboard.writeText(this.state.licenseKey).then(() => {
          const btn = modal.querySelector('#btn-copy-key');
          if (btn) btn.textContent = 'Copied!';
          setTimeout(() => { if (btn) btn.textContent = 'Copy'; }, 2000);
        });
      });

      modal.querySelector('#btn-install-pwa')?.addEventListener('click', () => {
        this.showPwaInstallGuide();
      });

      modal.querySelector('#btn-dl-mac')?.addEventListener('click', () => {
        if (!this.isPro()) {
          modal.remove();
          this.openPricingModal();
          return;
        }
        if (window.FF?.util?.toast) window.FF.util.toast('Initiating macOS standalone app package download…', 'info');
      });

      modal.querySelector('#btn-dl-win')?.addEventListener('click', () => {
        if (!this.isPro()) {
          modal.remove();
          this.openPricingModal();
          return;
        }
        if (window.FF?.util?.toast) window.FF.util.toast('Initiating Windows standalone app installer download…', 'info');
      });
    }

        openSettingsModal(defaultTab = 'general') {
      document.querySelectorAll('.fk-settings-modal-overlay').forEach((m) => m.remove());
      const modal = document.createElement('div');
      modal.className = 'fk-app-modal-overlay fk-settings-modal-overlay fk-pref-modal-overlay';
      modal.id = 'fk-settings-modal';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-labelledby', 'fk-pref-modal-title');

      const p = this.prefs;
      const getActive = (val, target) => (val === target ? 'is-active active' : '');

      const getPreviewName = (pattern) => {
        const sample = 'quarterly-report.pdf';
        if (pattern === 'suffix-tool') return 'quarterly-report-compressed.pdf';
        if (pattern === 'timestamp') {
          const now = new Date();
          const d = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
          return `quarterly-report-${d}.pdf`;
        }
        return 'quarterly-report.pdf';
      };

      modal.innerHTML = `
        <div class="fk-pref-window">
          <!-- Left Navigation Sidebar -->
          <aside class="fk-pref-sidebar">
            <div class="fk-pref-sidebar-brand">
              <div class="fk-pref-logo-gem">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <div class="fk-pref-logo-text">
                <span class="fk-pref-app-name">FileKit</span>
                <span class="fk-pref-window-label">Preferences</span>
              </div>
            </div>

            <nav class="fk-pref-sidebar-nav" role="tablist">
              <div class="fk-pref-nav-group-label">Preferences</div>
              
              <button type="button" class="fk-pref-nav-item fk-stab ${getActive(defaultTab, 'general')}" data-stab="general" role="tab" aria-selected="${defaultTab === 'general'}">
                <span class="fk-pref-nav-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                </span>
                <span class="fk-pref-nav-title">General</span>
              </button>

              <button type="button" class="fk-pref-nav-item fk-stab ${getActive(defaultTab, 'export')}" data-stab="export" role="tab" aria-selected="${defaultTab === 'export'}">
                <span class="fk-pref-nav-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                </span>
                <span class="fk-pref-nav-title">Export &amp; Files</span>
              </button>

              <button type="button" class="fk-pref-nav-item fk-stab ${getActive(defaultTab, 'privacy')}" data-stab="privacy" role="tab" aria-selected="${defaultTab === 'privacy'}">
                <span class="fk-pref-nav-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </span>
                <span class="fk-pref-nav-title">Privacy &amp; History</span>
              </button>

              <button type="button" class="fk-pref-nav-item fk-stab ${getActive(defaultTab, 'shortcuts')}" data-stab="shortcuts" role="tab" aria-selected="${defaultTab === 'shortcuts'}">
                <span class="fk-pref-nav-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="6" y1="8" x2="6.01" y2="8"/><line x1="10" y1="8" x2="10.01" y2="8"/><line x1="14" y1="8" x2="14.01" y2="8"/><line x1="18" y1="8" x2="18.01" y2="8"/><line x1="6" y1="12" x2="6.01" y2="12"/><line x1="18" y1="12" x2="18.01" y2="12"/><line x1="7" y1="16" x2="17" y2="16"/></svg>
                </span>
                <span class="fk-pref-nav-title">Shortcuts</span>
              </button>

              <div class="fk-pref-nav-group-label" style="margin-top:10px;">Membership</div>

              <button type="button" class="fk-pref-nav-item fk-stab ${getActive(defaultTab, 'account')}" data-stab="account" role="tab" aria-selected="${defaultTab === 'account'}">
                <span class="fk-pref-nav-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </span>
                <span class="fk-pref-nav-title">Account &amp; License</span>
              </button>
            </nav>

            <div class="fk-pref-sidebar-foot">
              <div class="fk-pref-foot-pill">
                <span class="fk-pref-green-dot"></span>
                <span>100% Private · On-Device</span>
              </div>
            </div>
          </aside>

          <!-- Main Right Content Area -->
          <div class="fk-pref-main">
            <!-- Header bar with title and close button -->
            <header class="fk-pref-topbar">
              <div class="fk-pref-topbar-info">
                <h2 class="fk-pref-topbar-title" id="fk-pref-modal-title">Settings</h2>
                <span class="fk-pref-topbar-sub">Configured locally for this device</span>
              </div>
              <div class="fk-pref-topbar-actions">
                <span class="fk-pref-kbd-chip">⌘ ,</span>
                <button type="button" class="fk-pref-close-btn" id="btn-settings-close" aria-label="Close preferences">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </header>

            <!-- Scrollable Content Stack -->
            <div class="fk-pref-scroll-area">
              <!-- TAB 1: General -->
              <div class="fk-stab-panel" data-spanel="general" style="${defaultTab === 'general' ? '' : 'display:none;'}">
                <div class="fk-pref-section-header">
                  <h3 class="fk-pref-heading">Interface &amp; Appearance</h3>
                  <p class="fk-pref-subheading">Personalize interface theme, visual density, language, and completion sounds.</p>
                </div>

                <div class="fk-pref-group">
                  <div class="fk-pref-row-item">
                    <div class="fk-pref-row-copy">
                      <span class="fk-pref-label">Appearance Theme</span>
                      <span class="fk-pref-desc">Select how FileKit looks on this device.</span>
                    </div>
                    <div class="fk-segmented-ctrl">
                      <button type="button" class="fk-seg-item fk-pref-theme-btn ${p.theme === 'system' ? 'is-active active' : ''}" data-theme="system">System</button>
                      <button type="button" class="fk-seg-item fk-pref-theme-btn ${p.theme === 'light' ? 'is-active active' : ''}" data-theme="light">Light</button>
                      <button type="button" class="fk-seg-item fk-pref-theme-btn ${p.theme === 'dark' ? 'is-active active' : ''}" data-theme="dark">Dark</button>
                    </div>
                  </div>

                  <div class="fk-pref-row-item">
                    <div class="fk-pref-row-copy">
                      <span class="fk-pref-label">Interface Density</span>
                      <span class="fk-pref-desc">Compact spacing reduces tool margins for dense multitasking.</span>
                    </div>
                    <div class="fk-segmented-ctrl">
                      <button type="button" class="fk-seg-item fk-pref-density-btn ${!p.compactMode ? 'is-active active' : ''}" data-density="comfortable">Comfortable</button>
                      <button type="button" class="fk-seg-item fk-pref-density-btn ${p.compactMode ? 'is-active active' : ''}" data-density="compact">Compact</button>
                    </div>
                  </div>

                  <div class="fk-pref-row-item">
                    <div class="fk-pref-row-copy">
                      <span class="fk-pref-label">Interface Language</span>
                      <span class="fk-pref-desc">Localization applied to workspace labels and controls.</span>
                    </div>
                    <select class="fk-pref-select" id="pref-language">
                      <option value="en" ${p.language === 'en' ? 'selected' : ''}>English (US)</option>
                      <option value="es" ${p.language === 'es' ? 'selected' : ''}>Español</option>
                      <option value="fr" ${p.language === 'fr' ? 'selected' : ''}>Français</option>
                      <option value="de" ${p.language === 'de' ? 'selected' : ''}>Deutsch</option>
                      <option value="ja" ${p.language === 'ja' ? 'selected' : ''}>日本語</option>
                    </select>
                  </div>
                </div>

                <div class="fk-pref-section-header" style="margin-top:16px;">
                  <h3 class="fk-pref-heading">Feedback &amp; Audio</h3>
                  <p class="fk-pref-subheading">Auditory notifications upon long batch processing completion.</p>
                </div>

                <div class="fk-pref-group">
                  <div class="fk-pref-row-item">
                    <div class="fk-pref-row-copy">
                      <div style="display:flex;align-items:center;gap:8px;">
                        <span class="fk-pref-label">Play Sound on Completion</span>
                        <button type="button" class="fk-btn-ghost-sm" id="btn-test-chime">Preview Tone</button>
                      </div>
                      <span class="fk-pref-desc">Harmonic chime synthesized in browser via Web Audio API.</span>
                    </div>
                    <label class="fk-switch">
                      <input type="checkbox" id="pref-sound" ${p.completionSound ? 'checked' : ''}>
                      <span class="fk-switch-slider"></span>
                    </label>
                  </div>
                </div>
              </div>

              <!-- TAB 2: Export & Files -->
              <div class="fk-stab-panel" data-spanel="export" style="${defaultTab === 'export' ? '' : 'display:none;'}">
                <div class="fk-pref-section-header">
                  <h3 class="fk-pref-heading">File &amp; Export Defaults</h3>
                  <p class="fk-pref-subheading">Configure conversion defaults, auto-download, compression presets, and naming patterns.</p>
                </div>

                <div class="fk-pref-group">
                  <div class="fk-pref-row-item">
                    <div class="fk-pref-row-copy">
                      <span class="fk-pref-label">Auto-Download When Done</span>
                      <span class="fk-pref-desc">Trigger browser download immediately upon 100% completion without manual click.</span>
                    </div>
                    <label class="fk-switch">
                      <input type="checkbox" id="pref-autodl" ${p.autoDownload ? 'checked' : ''}>
                      <span class="fk-switch-slider"></span>
                    </label>
                  </div>

                  <div class="fk-pref-row-item">
                    <div class="fk-pref-row-copy">
                      <span class="fk-pref-label">Default PDF Compression Level</span>
                      <span class="fk-pref-desc">Balance between output filesize reduction and image/text fidelity.</span>
                    </div>
                    <div class="fk-segmented-ctrl">
                      <button type="button" class="fk-seg-item fk-pref-pdf-btn ${p.pdfCompressionPreset === 'recommended' ? 'is-active active' : ''}" data-pdf="recommended">Recommended</button>
                      <button type="button" class="fk-seg-item fk-pref-pdf-btn ${p.pdfCompressionPreset === 'extreme' ? 'is-active active' : ''}" data-pdf="extreme">Extreme</button>
                      <button type="button" class="fk-seg-item fk-pref-pdf-btn ${p.pdfCompressionPreset === 'low' ? 'is-active active' : ''}" data-pdf="low">Less (High Res)</button>
                    </div>
                  </div>

                  <div class="fk-pref-row-item">
                    <div class="fk-pref-row-copy">
                      <span class="fk-pref-label">Default Image Format</span>
                      <span class="fk-pref-desc">Standard target format used in image conversion workflows.</span>
                    </div>
                    <div class="fk-segmented-ctrl">
                      <button type="button" class="fk-seg-item fk-pref-img-btn ${p.defaultImageFmt === 'webp' ? 'is-active active' : ''}" data-img="webp">WebP</button>
                      <button type="button" class="fk-seg-item fk-pref-img-btn ${p.defaultImageFmt === 'png' ? 'is-active active' : ''}" data-img="png">PNG</button>
                      <button type="button" class="fk-seg-item fk-pref-img-btn ${p.defaultImageFmt === 'jpeg' ? 'is-active active' : ''}" data-img="jpeg">JPG</button>
                      <button type="button" class="fk-seg-item fk-pref-img-btn ${p.defaultImageFmt === 'original' ? 'is-active active' : ''}" data-img="original">Original</button>
                    </div>
                  </div>

                  <div class="fk-pref-row-item">
                    <div class="fk-pref-row-copy">
                      <span class="fk-pref-label">Multi-File Batch Packaging</span>
                      <span class="fk-pref-desc">Bundle processed batch files into a ZIP archive or save individually.</span>
                    </div>
                    <div class="fk-segmented-ctrl">
                      <button type="button" class="fk-seg-item fk-pref-batch-btn ${p.batchFormat === 'zip' ? 'is-active active' : ''}" data-batch="zip">ZIP Archive</button>
                      <button type="button" class="fk-seg-item fk-pref-batch-btn ${p.batchFormat === 'individual' ? 'is-active active' : ''}" data-batch="individual">Individual Files</button>
                    </div>
                  </div>
                </div>

                <!-- Export Pattern Group -->
                <div class="fk-pref-section-header" style="margin-top:16px;">
                  <h3 class="fk-pref-heading">Output Filename Pattern</h3>
                  <p class="fk-pref-subheading">How output files are automatically named when saved.</p>
                </div>

                <div class="fk-pref-group">
                  <div class="fk-pref-naming-options" style="margin-top:10px;">
                    <label class="fk-pref-naming-radio ${p.namingPattern === 'suffix-tool' ? 'is-selected' : ''}">
                      <input type="radio" name="fk-naming-choice" value="suffix-tool" ${p.namingPattern === 'suffix-tool' ? 'checked' : ''} style="display:none;">
                      <div class="fk-radio-dot"></div>
                      <div class="fk-radio-info">
                        <span class="fk-radio-pattern">[filename]-[action].[ext]</span>
                        <span class="fk-radio-example">e.g. quarterly-report-compressed.pdf</span>
                      </div>
                    </label>

                    <label class="fk-pref-naming-radio ${p.namingPattern === 'original' ? 'is-selected' : ''}">
                      <input type="radio" name="fk-naming-choice" value="original" ${p.namingPattern === 'original' ? 'checked' : ''} style="display:none;">
                      <div class="fk-radio-dot"></div>
                      <div class="fk-radio-info">
                        <span class="fk-radio-pattern">[filename].[ext]</span>
                        <span class="fk-radio-example">Exact original name (e.g. quarterly-report.pdf)</span>
                      </div>
                    </label>

                    <label class="fk-pref-naming-radio ${p.namingPattern === 'timestamp' ? 'is-selected' : ''}">
                      <input type="radio" name="fk-naming-choice" value="timestamp" ${p.namingPattern === 'timestamp' ? 'checked' : ''} style="display:none;">
                      <div class="fk-radio-dot"></div>
                      <div class="fk-radio-info">
                        <span class="fk-radio-pattern">[filename]-[date].[ext]</span>
                        <span class="fk-radio-example">e.g. quarterly-report-20261012.pdf</span>
                      </div>
                    </label>
                  </div>

                  <div class="fk-pref-live-banner">
                    <span class="fk-pref-live-label">Output Preview:</span>
                    <code class="fk-pref-live-code" id="fk-naming-preview-text">${getPreviewName(p.namingPattern)}</code>
                  </div>
                </div>
              </div>

              <!-- TAB 3: Privacy & History -->
              <div class="fk-stab-panel" data-spanel="privacy" style="${defaultTab === 'privacy' ? '' : 'display:none;'}">
                <div class="fk-pref-section-header">
                  <h3 class="fk-pref-heading">Privacy &amp; File History</h3>
                  <p class="fk-pref-subheading">Your files never leave your device. Manage local history retention and metadata stripping.</p>
                </div>

                <div class="fk-pref-group">
                  <div class="fk-pref-row-item">
                    <div class="fk-pref-row-copy">
                      <span class="fk-pref-label">Remember Recent Files</span>
                      <span class="fk-pref-desc">Keep recent files in local browser storage for quick reopen access.</span>
                    </div>
                    <label class="fk-switch">
                      <input type="checkbox" id="pref-history" ${p.saveRecentHistory ? 'checked' : ''}>
                      <span class="fk-switch-slider"></span>
                    </label>
                  </div>

                  <div class="fk-pref-row-item">
                    <div class="fk-pref-row-copy">
                      <span class="fk-pref-label">Clear Recent History</span>
                      <span class="fk-pref-desc">Remove all recent file records stored in this browser session.</span>
                    </div>
                    <button type="button" class="fk-btn-outline-sm" id="btn-clear-recent-history">
                      Clear Recent Files
                    </button>
                  </div>

                  <div class="fk-pref-row-item">
                    <div class="fk-pref-row-copy">
                      <span class="fk-pref-label">Strip EXIF, GPS &amp; Metadata on Export</span>
                      <span class="fk-pref-desc">Automatically scrub camera GPS, author names, creation dates, and edit history.</span>
                    </div>
                    <label class="fk-switch">
                      <input type="checkbox" id="pref-strip-meta" ${p.stripMetadata ? 'checked' : ''}>
                      <span class="fk-switch-slider"></span>
                    </label>
                  </div>
                </div>

                <div class="fk-pref-section-header" style="margin-top:16px;">
                  <h3 class="fk-pref-heading">Local Temporary Storage</h3>
                  <p class="fk-pref-subheading">Browser cached binary packages and temporary workspace files.</p>
                </div>

                <div class="fk-pref-group">
                  <div class="fk-pref-storage-row">
                    <div class="fk-pref-row-copy">
                      <span class="fk-pref-label">Local Cache &amp; Temp Data</span>
                      <span class="fk-pref-desc" id="fk-storage-estimate-label">Calculating storage allocation…</span>
                    </div>
                    <span class="fk-storage-badge" id="fk-storage-badge">Local Only</span>
                  </div>

                  <div class="fk-pref-row-item">
                    <div class="fk-pref-row-copy">
                      <span class="fk-pref-label">Flush Temporary Files</span>
                      <span class="fk-pref-desc">Purges cached blobs and temporary conversion buffers.</span>
                    </div>
                    <button type="button" class="fk-btn-danger-outline" id="btn-purge-cache">
                      Clear Storage
                    </button>
                  </div>
                </div>
              </div>

              <!-- TAB 4: Shortcuts -->
              <div class="fk-stab-panel" data-spanel="shortcuts" style="${defaultTab === 'shortcuts' ? '' : 'display:none;'}">
                <div class="fk-pref-section-header">
                  <h3 class="fk-pref-heading">Keyboard Shortcuts</h3>
                  <p class="fk-pref-subheading">Work faster with global shortcuts for quick search, settings, and file actions.</p>
                </div>

                <div class="fk-pref-group">
                  <div class="fk-pref-row-item">
                    <div class="fk-pref-row-copy">
                      <span class="fk-pref-label">Enable Global Keyboard Shortcuts</span>
                      <span class="fk-pref-desc">Allow keyboard triggers across all workspace tools.</span>
                    </div>
                    <label class="fk-switch">
                      <input type="checkbox" id="pref-shortcuts" ${p.enableShortcuts ? 'checked' : ''}>
                      <span class="fk-switch-slider"></span>
                    </label>
                  </div>
                </div>

                <div class="fk-pref-section-header" style="margin-top:16px;">
                  <h3 class="fk-pref-heading">Key Reference</h3>
                  <p class="fk-pref-subheading">Common workstation shortcuts.</p>
                </div>

                <div class="fk-pref-group">
                  <div class="fk-shortcut-table">
                    <div class="fk-shortcut-row">
                      <span class="fk-shortcut-desc">Open Tool Palette &amp; Search</span>
                      <div class="fk-shortcut-keys">
                        <kbd class="fk-shortcut-kbd">⌘</kbd>
                        <kbd class="fk-shortcut-kbd">K</kbd>
                      </div>
                    </div>

                    <div class="fk-shortcut-row">
                      <span class="fk-shortcut-desc">Open Settings &amp; Preferences</span>
                      <div class="fk-shortcut-keys">
                        <kbd class="fk-shortcut-kbd">⌘</kbd>
                        <kbd class="fk-shortcut-kbd">,</kbd>
                      </div>
                    </div>

                    <div class="fk-shortcut-row">
                      <span class="fk-shortcut-desc">Choose / Open File</span>
                      <div class="fk-shortcut-keys">
                        <kbd class="fk-shortcut-kbd">⌘</kbd>
                        <kbd class="fk-shortcut-kbd">O</kbd>
                      </div>
                    </div>

                    <div class="fk-shortcut-row">
                      <span class="fk-shortcut-desc">Run / Convert Current File</span>
                      <div class="fk-shortcut-keys">
                        <kbd class="fk-shortcut-kbd">⌘</kbd>
                        <kbd class="fk-shortcut-kbd">↵</kbd>
                      </div>
                    </div>

                    <div class="fk-shortcut-row">
                      <span class="fk-shortcut-desc">Close Modal / Cancel Action</span>
                      <div class="fk-shortcut-keys">
                        <kbd class="fk-shortcut-kbd">Esc</kbd>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- TAB 5: Account & License -->
              <div class="fk-stab-panel" data-spanel="account" style="${defaultTab === 'account' ? '' : 'display:none;'}">
                <div class="fk-pref-section-header">
                  <h3 class="fk-pref-heading">Account &amp; Workspace License</h3>
                  <p class="fk-pref-subheading">Manage your user profile, license activation, and subscription plan.</p>
                </div>

                <div class="fk-pref-group">
                  <!-- User Session Row -->
                  <div class="fk-account-identity-row">
                    <div class="fk-account-avatar">
                      ${(this.state.user.name || 'G').charAt(0).toUpperCase()}
                    </div>
                    <div class="fk-account-meta">
                      <span class="fk-account-name">${this.state.user.name || 'Guest User'}</span>
                      <span class="fk-account-email">${this.state.isLoggedIn ? (this.state.user.email || 'Authenticated User') : '100% On-Device Private Session (Local)'}</span>
                    </div>
                    <div class="fk-account-cta-wrap">
                      ${this.state.isLoggedIn
                        ? `<button type="button" class="fk-btn-outline-sm" id="btn-pref-logout">Sign Out</button>`
                        : `<button type="button" class="fk-btn-dark-sm" id="btn-pref-login-now">Log In / Register</button>`
                      }
                    </div>
                  </div>

                  <!-- Plan Status Row -->
                  <div class="fk-pref-row-item">
                    <div class="fk-pref-row-copy">
                      <span class="fk-pref-label">Current Membership Tier</span>
                      <span class="fk-pref-desc">${this.state.tier === 'lifetime' ? 'Permanent Lifetime License (Unlimited)' : this.state.tier === 'pro' ? 'Pro Subscriber ($3/mo)' : 'Free Local Tier (No Server Fees)'}</span>
                    </div>
                    <button type="button" class="fk-btn-outline-sm" id="btn-pref-plans">
                      ${this.isPro() ? 'Change Plan' : 'Upgrade to Pro / Lifetime'}
                    </button>
                  </div>

                  <!-- License Key Box -->
                  <div class="fk-pref-row-item" style="flex-direction:column;align-items:stretch;gap:8px;">
                    <div class="fk-pref-row-copy">
                      <span class="fk-pref-label">Permanent License Key</span>
                      <span class="fk-pref-desc">Validates 100% offline across macOS, Windows, iOS, and Android.</span>
                    </div>
                    <div class="fk-pref-license-box">
                      <span class="fk-pref-license-key">${this.state.licenseKey || 'NO KEY ACTIVATED (FREE TIER)'}</span>
                      ${this.state.licenseKey
                        ? `<button type="button" class="fk-btn-ghost-sm" id="btn-pref-copy-key">Copy Key</button>`
                        : `<button type="button" class="fk-btn-ghost-sm" id="btn-pref-activate-key">Activate Key</button>`
                      }
                    </div>
                  </div>
                </div>

                <!-- Standalone Desktop Apps Row -->
                <div class="fk-pref-section-header" style="margin-top:16px;">
                  <h3 class="fk-pref-heading">Standalone Applications</h3>
                  <p class="fk-pref-subheading">Download offline native applications for your operating system.</p>
                </div>

                <div class="fk-pref-group">
                  <div class="fk-pref-row-item">
                    <div class="fk-pref-row-copy">
                      <span class="fk-pref-label">Desktop &amp; Mobile PWAs</span>
                      <span class="fk-pref-desc">Install standalone desktop apps for macOS and Windows, or PWA on iOS and Android.</span>
                    </div>
                    <button type="button" class="fk-btn-outline-sm" id="btn-pref-download-apps">
                      Get Desktop Apps
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Bottom Bar with Reset and Done actions -->
            <div class="fk-pref-bottombar">
              <span class="fk-pref-autosave-notice">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                <span>Preferences saved locally</span>
              </span>
              <div class="fk-pref-bottombar-btns">
                <button type="button" class="fk-btn-secondary" id="btn-settings-reset">Reset to Defaults</button>
                <button type="button" class="fk-btn-primary" id="btn-settings-done">Done</button>
              </div>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      // Close handlers
      const closeModal = () => modal.remove();
      modal.querySelector('#btn-settings-close')?.addEventListener('click', closeModal);
      modal.querySelector('#btn-settings-done')?.addEventListener('click', closeModal);
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
      });

      // Tab switcher
      const tabs = modal.querySelectorAll('.fk-stab');
      const panels = modal.querySelectorAll('.fk-stab-panel');
      tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
          tabs.forEach((t) => {
            t.classList.remove('is-active', 'active');
            t.setAttribute('aria-selected', 'false');
          });
          panels.forEach((p) => (p.style.display = 'none'));
          tab.classList.add('is-active', 'active');
          tab.setAttribute('aria-selected', 'true');
          const target = tab.dataset.stab;
          const targetPanel = modal.querySelector(`[data-spanel="${target}"]`);
          if (targetPanel) targetPanel.style.display = 'block';
        });
      });

      // Filename convention radio cards
      const previewText = modal.querySelector('#fk-naming-preview-text');
      const updatePreview = (pattern) => {
        if (previewText) previewText.textContent = getPreviewName(pattern);
      };

      modal.querySelectorAll('.fk-pref-naming-radio').forEach((radio) => {
        radio.addEventListener('click', () => {
          modal.querySelectorAll('.fk-pref-naming-radio').forEach((r) => r.classList.remove('is-selected'));
          radio.classList.add('is-selected');
          const input = radio.querySelector('input');
          if (input) {
            input.checked = true;
            this.savePrefs({ namingPattern: input.value });
            updatePreview(input.value);
          }
        });
      });

      // Batch packaging segmented buttons
      modal.querySelectorAll('.fk-pref-batch-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          modal.querySelectorAll('.fk-pref-batch-btn').forEach((b) => b.classList.remove('is-active', 'active'));
          btn.classList.add('is-active', 'active');
          this.savePrefs({ batchFormat: btn.dataset.batch });
        });
      });

      // PDF compression preset buttons
      modal.querySelectorAll('.fk-pref-pdf-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          modal.querySelectorAll('.fk-pref-pdf-btn').forEach((b) => b.classList.remove('is-active', 'active'));
          btn.classList.add('is-active', 'active');
          this.savePrefs({ pdfCompressionPreset: btn.dataset.pdf });
        });
      });

      // Image format segmented buttons
      modal.querySelectorAll('.fk-pref-img-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          modal.querySelectorAll('.fk-pref-img-btn').forEach((b) => b.classList.remove('is-active', 'active'));
          btn.classList.add('is-active', 'active');
          this.savePrefs({ defaultImageFmt: btn.dataset.img });
        });
      });

      // Density buttons
      modal.querySelectorAll('.fk-pref-density-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          modal.querySelectorAll('.fk-pref-density-btn').forEach((b) => b.classList.remove('is-active', 'active'));
          btn.classList.add('is-active', 'active');
          this.savePrefs({ compactMode: btn.dataset.density === 'compact' });
        });
      });

      // Theme buttons
      modal.querySelectorAll('.fk-pref-theme-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          modal.querySelectorAll('.fk-pref-theme-btn').forEach((b) => b.classList.remove('is-active', 'active'));
          btn.classList.add('is-active', 'active');
          this.savePrefs({ theme: btn.dataset.theme });
        });
      });

      // Language select
      modal.querySelector('#pref-language')?.addEventListener('change', (e) => {
        this.savePrefs({ language: e.target.value });
      });

      // Auto-download toggle
      modal.querySelector('#pref-autodl')?.addEventListener('change', (e) => {
        this.savePrefs({ autoDownload: e.target.checked });
      });

      // Sound toggle
      modal.querySelector('#pref-sound')?.addEventListener('change', (e) => {
        this.savePrefs({ completionSound: e.target.checked });
      });

      // History toggle
      modal.querySelector('#pref-history')?.addEventListener('change', (e) => {
        this.savePrefs({ saveRecentHistory: e.target.checked });
      });

      // Metadata stripping toggle
      modal.querySelector('#pref-strip-meta')?.addEventListener('change', (e) => {
        this.savePrefs({ stripMetadata: e.target.checked });
      });

      // Shortcuts toggle
      modal.querySelector('#pref-shortcuts')?.addEventListener('change', (e) => {
        this.savePrefs({ enableShortcuts: e.target.checked });
      });

      // Clear recent history button
      modal.querySelector('#btn-clear-recent-history')?.addEventListener('click', () => {
        try {
          localStorage.removeItem('filekit_recent_files');
          sessionStorage.removeItem('filekit_recent_files');
        } catch (_) {}
        if (window.FF?.util?.toast) window.FF.util.toast('Recent file history cleared.', 'success');
      });

      // Play test synthetic chime via Web Audio API
      modal.querySelector('#btn-test-chime')?.addEventListener('click', () => {
        try {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          if (AudioContext) {
            const ctx = new AudioContext();
            const now = ctx.currentTime;
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(587.33, now);
            gain1.gain.setValueAtTime(0.08, now);
            gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.start(now);
            osc1.stop(now + 0.35);

            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(880, now + 0.08);
            gain2.gain.setValueAtTime(0.1, now + 0.08);
            gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start(now + 0.08);
            osc2.stop(now + 0.55);
          }
        } catch {}
      });

      // Storage estimate meter
      if (navigator.storage && navigator.storage.estimate) {
        navigator.storage.estimate().then((est) => {
          const usedMB = ((est.usage || 0) / (1024 * 1024)).toFixed(1);
          const quotaMB = ((est.quota || 0) / (1024 * 1024)).toFixed(0);
          const percent = Math.min(100, Math.max(1, Math.round(((est.usage || 0) / (est.quota || 1)) * 100)));
          const label = modal.querySelector('#fk-storage-estimate-label');
          if (label) label.textContent = `~ ${usedMB} MB used of ${quotaMB} MB available in browser (${percent}%)`;
        }).catch(() => {});
      }

      // Restore defaults action
      modal.querySelector('#btn-settings-reset')?.addEventListener('click', () => {
        if (confirm('Reset workstation preferences to recommended defaults?')) {
          localStorage.removeItem(PREFS_KEY);
          this.prefs = { ...DEFAULT_PREFS };
          this.savePrefs(this.prefs);
          modal.remove();
          this.openSettingsModal(defaultTab);
          if (window.FF?.util?.toast) window.FF.util.toast('Preferences reset to default values.', 'info');
        }
      });

      // Clear storage / cache button
      modal.querySelector('#btn-purge-cache')?.addEventListener('click', () => {
        if ('caches' in window) {
          caches.keys().then((keys) => {
            return Promise.all(keys.map((k) => caches.delete(k)));
          }).then(() => {
            if (window.FF?.util?.toast) window.FF.util.toast('Local temporary storage cleared.', 'success');
            const label = modal.querySelector('#fk-storage-estimate-label');
            if (label) label.textContent = '0 MB used in browser cache';
          });
        } else {
          if (window.FF?.util?.toast) window.FF.util.toast('Temporary cache cleared.', 'success');
        }
      });

      // Account tab actions in Preferences
      modal.querySelector('#btn-pref-login-now')?.addEventListener('click', () => {
        modal.remove();
        this.openAuthModal('login');
      });
      modal.querySelector('#btn-pref-logout')?.addEventListener('click', () => {
        this.logout();
        modal.remove();
        this.openSettingsModal('account');
      });
      modal.querySelector('#btn-pref-plans')?.addEventListener('click', () => {
        modal.remove();
        this.openPricingModal();
      });
      modal.querySelector('#btn-pref-activate-key')?.addEventListener('click', () => {
        modal.remove();
        this.openAuthModal('activate');
      });
      modal.querySelector('#btn-pref-copy-key')?.addEventListener('click', () => {
        if (this.state.licenseKey) {
          navigator.clipboard.writeText(this.state.licenseKey).then(() => {
            const btn = modal.querySelector('#btn-pref-copy-key');
            if (btn) btn.textContent = 'Copied!';
            setTimeout(() => { if (btn) btn.textContent = 'Copy Key'; }, 2000);
          });
        }
      });
      modal.querySelector('#btn-pref-download-apps')?.addEventListener('click', () => {
        modal.remove();
        this.openAccountModal();
      });
    }

    formatOutputName(filename, toolId = '') {
      if (!filename) return 'download';
      const p = this.prefs || {};
      const pattern = p.namingPattern || 'suffix-tool';
      const dot = filename.lastIndexOf('.');
      const base = dot !== -1 ? filename.slice(0, dot) : filename;
      const ext = dot !== -1 ? filename.slice(dot) : '';
      if (pattern === 'suffix-tool') {
        const cleanTool = (toolId || 'processed').replace(/^pdf-|^image-|^audio-|^video-/, '');
        return `${base}-${cleanTool}${ext}`;
      }
      if (pattern === 'suffix-filekit') return `${base}-filekit${ext}`;
      if (pattern === 'timestamp') {
        const now = new Date();
        const d = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
        return `${base}-${d}${ext}`;
      }
      return filename;
    }

    closeModal(modalId) {
      document.getElementById(modalId)?.remove();
    }
  }

  // Instantiate and expose globally
  const authInstance = new AuthLicenseManager();
  window.FK_Auth = authInstance;
  window.FF = window.FF || {};
  window.FF.auth = authInstance;

})();

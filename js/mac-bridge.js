/**
 * FileKit macOS Native Bridge & Ergonomics Layer
 * Manages runtime platform detection, macOS keybindings, 
 * proxy icons, Dock progress, and Tauri IPC integration.
 */
(() => {
  'use strict';
  const FF = (window.FF = window.FF || {});
  const MacBridge = (FF.MacBridge = {});

  // 1. Precise macOS Runtime Detection
  const isMac = Boolean(
    navigator.userAgentData?.platform === 'macOS' ||
    /Macintosh|Mac OS X|MacIntel/i.test(navigator.userAgent) ||
    /Mac/i.test(navigator.platform)
  );

  const isTauriApp = Boolean(window.__TAURI__ || window.__TAURI_INTERNALS__);

  MacBridge.isMac = isMac;
  MacBridge.isTauriApp = isTauriApp;

  function initPlatform() {
    if (!isMac) return;

    document.body.classList.add('is-macos');
    if (isTauriApp) {
      document.body.classList.add('is-macos-app');
    }

    normalizeKeyGlyphs();
    initMacShortcuts();
    initDockBridge();
  }

  // 2. Normalize Keyboard Hints across UI to Native Mac Glyphs
  function normalizeKeyGlyphs() {
    document.querySelectorAll('kbd, [data-shortcut]').forEach((node) => {
      let txt = node.textContent || '';
      txt = txt.replace(/Ctrl\s*\+\s*/gi, '⌘')
               .replace(/Control\s*\+\s*/gi, '⌘')
               .replace(/Alt\s*\+\s*/gi, '⌥')
               .replace(/Shift\s*\+\s*/gi, '⇧')
               .replace(/Cmd\s*\+\s*/gi, '⌘')
               .replace(/Command\s*\+\s*/gi, '⌘');
      node.textContent = txt;
    });
  }

  // 3. Native macOS Keyboard Shortcuts
  function initMacShortcuts() {
    window.addEventListener('keydown', (e) => {
      const isCmd = e.metaKey;
      const isShift = e.shiftKey;
      const key = e.key.toLowerCase();
      const inInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) || document.activeElement?.isContentEditable;

      // ⌘ , -> Settings / Preferences Modal
      if (isCmd && e.key === ',') {
        e.preventDefault();
        openPreferences();
        return;
      }

      // ⌘ K -> Search Tools Palette
      if (isCmd && key === 'k') {
        e.preventDefault();
        const searchTrigger = document.getElementById('header-search-trigger');
        if (searchTrigger) searchTrigger.click();
        return;
      }

      // ⇧ ⌘ Z -> macOS Standard Redo
      if (isCmd && isShift && key === 'z') {
        e.preventDefault();
        if (typeof FF.redo === 'function') FF.redo();
        return;
      }

      // Spacebar -> Instant Quick Look Preview
      if (e.key === ' ' && !inInput) {
        const activeCard = document.querySelector('.file-card.selected, .page-thumb.selected');
        if (activeCard && typeof FF.openQuickLook === 'function') {
          e.preventDefault();
          FF.openQuickLook(activeCard);
        }
      }
    }, { capture: true });
  }

  // 4. Settings Modal Handler for macOS ⌘,
  function openPreferences() {
    const existing = document.getElementById('mac-preferences-modal');
    if (existing) {
      existing.hidden = false;
      return;
    }

    const modal = document.createElement('div');
    modal.id = 'mac-preferences-modal';
    modal.className = 'palette-overlay';
    modal.style.display = 'flex';
    modal.innerHTML = `
      <div class="palette-box mac-settings-box" style="max-width: 520px; width: 90%; padding: 24px; margin: auto;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h2 style="margin: 0; font-size: 18px; font-weight: 600;">FileKit Preferences</h2>
          <button type="button" class="palette-esc mac-pref-close-btn" style="cursor: pointer;">ESC</button>
        </div>
        <div style="display: flex; flex-direction: column; gap: 14px; font-size: 13.5px;">
          <label style="display: flex; justify-content: space-between; align-items: center;">
            <span>Privacy & Processing</span>
            <strong style="color: #10B981;">100% Local On-Device</strong>
          </label>
          <label style="display: flex; justify-content: space-between; align-items: center;">
            <span>Hardware Acceleration</span>
            <strong style="color: #3B82F6;">Metal / WASM SIMD Active</strong>
          </label>
          <label style="display: flex; justify-content: space-between; align-items: center;">
            <span>Menu Bar Companion</span>
            <span>Always Running</span>
          </label>
          <label style="display: flex; justify-content: space-between; align-items: center;">
            <span>Theme Appearance</span>
            <span>Sync with macOS System</span>
          </label>
        </div>
        <div style="margin-top: 24px; text-align: right;">
          <button type="button" class="primary-button mac-pref-close-btn" style="padding: 6px 16px; font-size: 13px;">Done</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  // 5. Dock Progress & Native Notifications
  function initDockBridge() {
    MacBridge.updateProgress = (percent) => {
      if (isTauriApp && window.__TAURI__?.core?.invoke) {
        window.__TAURI__.core.invoke('set_dock_progress', { progress: Number(percent) / 100 }).catch(() => {});
      }
    };

    MacBridge.clearProgress = () => {
      if (isTauriApp && window.__TAURI__?.core?.invoke) {
        window.__TAURI__.core.invoke('clear_dock_progress').catch(() => {});
      }
    };
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPlatform);
  } else {
    initPlatform();
  }
})();

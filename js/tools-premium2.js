/* ═══════════════════════════════════════════════════════════════════════════
   FileKit — Bespoke premium after/result states (batch 2)
   Utilities (6) · Developer (5) · Archives/Data (5) · E-Books (4) ·
   Business (3) · Audio (1) — formerly-generic tools.
   Same light Edit-style language as batch 1 (etxt-shell + pro-* classes).
═══════════════════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const U = window.FF.util;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const bytes = (n) => { n = Number(n) || 0; if (n < 1024) return n + ' B'; if (n < 1048576) return (n / 1024).toFixed(1) + ' KB'; return (n / 1048576).toFixed(1) + ' MB'; };
  const extOf = (name) => (name.split('.').pop() || '').toLowerCase();
  const baseName = (name) => (name || '').replace(/\.[^.]+$/, '') || 'file';
  const u8 = (blob) => blob.arrayBuffer().then((b) => new Uint8Array(b));
  const download = (blob, name) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 400); };
  const load = {
    pdfjs: () => U.loadScript('vendor/pdfjs.min.js', 'sha384-OemFRmhjDZwhIKuUld0HJozkF2YErsgDaCL41trxGQZt4/WgnopJQqQl2DvDZ07Z').then(() => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js'; return window.pdfjsLib; }),
    pdflib: () => U.loadScript('vendor/pdf-lib.min.js', 'sha384-weMABwrltA6jWR8DDe9Jp5blk+tZQh7ugpCsF3JwSA53WZM9/14PjS5LAJNHNjAI').then(() => window.PDFLib),
    fflate: () => U.loadScript('vendor/fflate.js', 'sha384-DT0Ls0mO7JmjTnT+oBuMhEJzYJO1zUqzuuMXNdnOmOQRIpN2BgSjvBV/j50NngIT').then(() => window.fflate),
    opentype: () => U.loadScript('vendor/opentype.min.js', 'sha384-3TaxGqyHrMuRIWY5Z5WHNIzgNRqGIUJE+mk6tm+g1wkm9Ux2kUyOLfy9AsNWXA6u').then(() => window.opentype),
    xlsx: () => U.loadScript('vendor/xlsx.full.min.js').then(() => window.XLSX),
  };

  const ICONS = {
    'csv-to-excel': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><path d="M8 13h2M14 13h2M8 17h2M14 17h2"/></svg>',
    'excel-to-csv': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><path d="m8 13 4 4M12 13l-4 4"/></svg>',
    'units-length': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M4 12h16M4 18h10"/><path d="m16 16 4 4 4-4"/></svg>',
    timestamp: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
    'color-picker': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 1.5-2-.8-1.6.2-3 2-3H18a3 3 0 0 0 3-3c0-5-4-10-9-10z"/><circle cx="7.5" cy="10.5" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="8" r="1" fill="currentColor" stroke="none"/><circle cx="16.5" cy="10.5" r="1" fill="currentColor" stroke="none"/></svg>',
    'aspect-ratio': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h6M9 10l-2 2M9 10 7 8"/></svg>',
    currency: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 6v12M15.5 9.5c-.8-1-2-1.5-3.5-1.5-2 0-3.5 1-3.5 2.5S10 12.8 12 13s3.5.8 3.5 2.5S14 18 12 18c-1.5 0-2.7-.5-3.5-1.5"/></svg>',
    'cron-util': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/></svg>',
    base64: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="6" width="16" height="12" rx="2"/><path d="M8 10.5h.01M12 10.5h.01M16 10.5h.01M8 14h.01M12 14h.01M16 14h.01"/></svg>',
    'url-encode': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>',
    diff: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h9M4 12h9M4 17h9"/><path d="M16 4v6M13 7h6"/><path d="M16 14l3 3-3 3"/></svg>',
    'font-glyphs': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 19 10 5h4l5 14"/><path d="M7.5 13h9"/><path d="M8 19l1-3M16 19l-1-3"/></svg>',
    'font-convert': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2"/><path d="M9 12h6"/><path d="M12 12v7"/><path d="M5 12H3v2h2zM21 12h-2v2h2z"/></svg>',
    'zip-create': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8l4-4h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M8 13a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/><path d="m13 11 2 2 4-4"/></svg>',
    'targz-create': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16v-6H4z"/><path d="M4 14l3-9h10l3 9"/><path d="M9 11h6M9 14v2M12 14v2M15 14v2"/></svg>',
    'file-split': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M12 5v14"/><path d="M4 10h8M12 15h8"/></svg>',
    'archive-7z-extract': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 8h6M12 8v8"/><path d="M9 16h6"/></svg>',
    'sqlite-explorer': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/></svg>',
    'epub-reader': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5a3 3 0 0 1 3-3h13v18H7a3 3 0 0 0-3 3z"/><path d="M4 5v16"/><path d="M8 8h8M8 12h6"/></svg>',
    'epub-chapters': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M4 12h16M4 18h10"/><circle cx="18" cy="18" r="2.5"/></svg>',
    'epub-cover': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="9" cy="8" r="1.6" fill="currentColor" stroke="none"/><path d="m5 19 5-5 3 3 3-3 4 4"/></svg>',
    'epub-metadata': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5z"/><path d="M8 8h9M8 12h6"/></svg>',
    'gst-invoice': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h12v20l-3-2-3 2-3-2-3 2z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',
    'pos-billing': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M5 8h14"/><path d="M9 12h6M9 15h4"/></svg>',
    'gst-filing-prep': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16v16H4z"/><path d="M4 9h16M9 9v11"/><path d="M9 14l3-2 3 2"/></svg>',
    'audiogram-generator': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="2.5" height="8" rx="1"/><rect x="7.5" y="5" width="2.5" height="14" rx="1"/><rect x="12" y="9" width="2.5" height="6" rx="1"/><rect x="16.5" y="4" width="2.5" height="16" rx="1"/><rect x="21" y="7" width="2" height="10" rx="1"/></svg>',
    'bg-remover': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-3.5 8-9.5V5.5L12 2 4 5.5v7c0 6 8 9.5 8 9.5z"/><path d="M8.5 12.5l2.2 2.2 4.8-4.8"/></svg>',
  };
  const fallbackIco = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18"/></svg>';
  const shieldIco = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-3 8-10V5l-8-3-8 3v7c0 7 8 10 8 10z"/></svg>';
  const dlIco = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
  const copyIco = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
  const swapIco = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>';
  const checkIco = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

  /* ─── Shared frame (etxt light shell) ─── */
  function frame(container, tool, { title, sub, action }) {
    container.innerHTML = '';
    container.classList.remove('cpdf-root');
    container.classList.add('etxt-shell');
    const stage = container.closest('.app-stage-container');
    if (stage) { stage.classList.add('spdf-stage-active'); stage.style.padding = '0'; }
    const ico = ICONS[tool.id] || fallbackIco;
    container.innerHTML = `
      <div class="etxt-top">
        <div class="etxt-top-left">
          <span class="qr-read-brand pro-brand">${ico}</span>
          <div class="qr-read-title-wrap"><strong class="qr-read-title">${esc(title)}</strong><span class="qr-read-sub">${esc(sub || '')}</span></div>
        </div>
        <div class="etxt-top-right">
          <button type="button" class="etxt-btn-ghost" data-pro-replace>${swapIco} Replace</button>
          <button type="button" class="etxt-btn-finish" data-pro-run>${action || 'Apply'}</button>
        </div>
      </div>
      <div class="etxt-toolbar pro-toolbar" data-pro-toolbar></div>
      <div class="pro-body" data-pro-body></div>
      <div class="pro-result" data-pro-result hidden></div>`;
    return {
      container,
      tool,
      toolbar: container.querySelector('.pro-toolbar'),
      body: container.querySelector('.pro-body'),
      result: container.querySelector('.pro-result'),
      runBtn: container.querySelector('[data-pro-run]'),
      replaceBtn: container.querySelector('[data-pro-replace]'),
    };
  }

  function resultBar(s, { ok = true, title, msg, actions = [], blob, filename, tool, onBacktrack, onAgain }) {
    if (ok && window.FF?.renderUnifiedResult && s?.container) {
      let resultBlob = blob;
      let resultName = filename;
      if (!resultBlob && actions && actions.length) {
        const dl = actions.find(a => a.blob || (typeof a.filename === 'string' && a.filename));
        if (dl?.blob) resultBlob = dl.blob;
        if (dl?.filename) resultName = dl.filename;
      }
      if (resultBlob) {
        window.FF.renderUnifiedResult(s.container, {
          tool: tool || s.tool || { id: 'tool', name: title || 'File Tool', category: 'Tool' },
          blob: resultBlob,
          filename: resultName || (tool?.id ? `${tool.id}.out` : 'processed-file'),
          title: title || 'Processing Complete',
          badge: msg || '100% Local Sandbox',
          onBacktrack: onBacktrack || (() => { if (typeof s.renderWorkspace === 'function') s.renderWorkspace(); }),
          onAgain: onAgain || (() => { if (typeof s.renderDrop === 'function') s.renderDrop(); })
        });
        return;
      }
    }

    const el = s.result;
    if (!el) return;
    el.hidden = false;
    el.className = 'pro-result' + (ok ? ' is-ok' : ' is-err');
    el.innerHTML = `<span class="pro-result-ico">${ok ? checkIco : '!'}</span>
      <div class="pro-result-copy"><strong>${esc(title)}</strong>${msg ? `<span>${esc(msg)}</span>` : ''}</div>
      <div class="pro-result-actions"></div>`;
    const wrap = el.querySelector('.pro-result-actions');
    for (const a of actions) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = a.cls || 'etxt-btn-secondary';
      b.innerHTML = (a.ico || '') + ' ' + esc(a.label);
      b.addEventListener('click', a.onClick);
      wrap.appendChild(b);
    }
  }

  /* Dropzone before-state (standard cpdf-dropzone) */
  function dropzone(container, tool, { accepts, multiple, headline, meta }) {
    container.innerHTML = '';
    container.classList.add('cpdf-root');
    container.classList.remove('etxt-shell');
    const stage = container.closest('.app-stage-container');
    if (stage) { stage.classList.remove('spdf-stage-active'); stage.style.padding = ''; }
    container.innerHTML = `
      <div class="cpdf-dropzone drop-hero-box" data-pro-drop tabindex="0" role="button" aria-label="Upload ${esc((accepts || []).join(', ').toUpperCase())}">
        <div class="dropzone-idle">
          <div class="drop-illustration">
            <svg viewBox="0 0 260 138" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" class="standard-dz-svg etxt-dz-svg">
              <!-- Left: Image / Photo Card -->
              <rect x="18" y="46" width="66" height="54" rx="8" stroke="#737373" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="70" cy="62" r="5" stroke="#737373" stroke-width="3"/>
              <path d="M 21 98 L 44 72 L 58 86 L 68 76 L 81 98" stroke="#737373" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>

              <!-- Center: Prominent Document Sheet -->
              <path d="M 104 10 L 146 10 C 148 10 151 11.5 153 13.5 L 163 24.5 C 165 26.5 166 29 166 32 L 166 92 C 166 96.4 162.4 100 158 100 L 148 100 M 112 100 L 102 100 C 97.6 100 94 96.4 94 92 L 94 20 C 94 14.5 98.5 10 104 10 Z" stroke="#737373" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
              <line x1="107" y1="64" x2="153" y2="64" stroke="#737373" stroke-width="3.5" stroke-linecap="round"/>
              <line x1="107" y1="78" x2="153" y2="78" stroke="#737373" stroke-width="3.5" stroke-linecap="round"/>
              
              <!-- Center: Downward Arrow -->
              <path d="M 130 66 L 130 126 M 116 112 L 130 126 L 144 112" stroke="#737373" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" class="standard-dz-arrow etxt-dz-arrow"/>

              <!-- Right: Folder -->
              <path d="M 184 40 L 200 40 C 203 40 205.5 41.8 207 44.5 L 209.5 48 L 234 48 C 238.4 48 242 51.6 242 56 L 242 92 C 242 96.4 238.4 100 234 100 L 184 100 C 179.6 100 176 96.4 176 92 L 176 48 C 176 43.6 179.6 40 184 40 Z" stroke="#737373" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>

          <h3 class="drop-title">${headline ? esc(headline) : (multiple ? 'Drag and drop files to get started' : 'Drag and drop a file to get started')}</h3>

          <div class="drop-action-group">
            <label for="pro2-inp-${tool.id}" class="select-files-main-btn">${multiple ? 'Select files from your device' : 'Select file from your device'}</label>
          </div>

          <p class="drop-formats">Supports ${(accepts || []).map(a => a.toUpperCase()).join(', ')}</p>
        </div>
        <input id="pro2-inp-${tool.id}" type="file" accept="${(accepts || []).map(a => '.' + a).join(',')}" ${multiple ? 'multiple' : ''} hidden>
      </div>`;
    const dz = container.querySelector('[data-pro-drop]');
    const inp = container.querySelector('input[type=file]');
    let onFiles = () => {};
    inp.addEventListener('change', () => { if (inp.files.length) onFiles([...inp.files]); inp.value = ''; });
    dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('cpdf-dz--over'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('cpdf-dz--over'));
    dz.addEventListener('drop', (e) => { e.preventDefault(); dz.classList.remove('cpdf-dz--over'); const f = e.dataTransfer && e.dataTransfer.files; if (f && f.length) onFiles([...f]); });
    dz.addEventListener('click', (e) => { if (!e.target.closest('label')) inp.click(); });
    dz.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inp.click(); } });
    return { setOnFiles: (fn) => { onFiles = fn; }, dz };
  }

  /* Input-only card (cpdf-hdr + card + result) */
  function inputCard(container, tool, { title, sub, fieldsHtml, runLabel, onRun }) {
    container.innerHTML = '';
    container.classList.add('cpdf-root');
    const stage = container.closest('.app-stage-container');
    if (stage) { stage.classList.remove('spdf-stage-active'); stage.style.padding = ''; }
    container.innerHTML = `
      <header class="cpdf-hdr">
        <div class="cpdf-hdr-icon">${ICONS[tool.id] || fallbackIco}</div>
        <div><h2 class="cpdf-hdr-title">${esc(tool.name)}</h2><p class="cpdf-hdr-sub">${esc(tool.description || '')}</p></div>
      </header>
      <div class="pro-input-card">
        <div class="pro-input-head"><strong>${esc(title)}</strong><span>${esc(sub)}</span></div>
        ${fieldsHtml}
        <div class="pro-input-actions"><button type="button" class="etxt-btn-finish" data-input-run>${runLabel}</button></div>
      </div>
      <div class="pro-result" data-pro-result hidden></div>`;
    const runBtn = container.querySelector('[data-input-run]');
    const resultEl = container.querySelector('[data-pro-result]');
    runBtn.addEventListener('click', async () => {
      runBtn.disabled = true; runBtn.textContent = 'Working…';
      try {
        await onRun(resultEl, runBtn);
      } catch (e) {
        resultEl.className = 'pro-result is-err'; resultEl.hidden = false;
        resultEl.innerHTML = `<span class="pro-result-ico">!</span><div class="pro-result-copy"><strong>Could not finish</strong><span>${esc(e.message)}</span></div>`;
      } finally { runBtn.disabled = false; runBtn.textContent = runLabel; }
    });
    return { container, runBtn, resultEl, setBusy: (b) => { runBtn.disabled = b; runBtn.textContent = b ? 'Working…' : runLabel; } };
  }

  /* ── Live input workspace: left fields, right live output ── */
  function liveWorkspace(s, { fieldsHtml, initial, compute, copyLines }) {
    s.body.className = 'pro-body pro-live-body';
    s.body.innerHTML = `
      <div class="pro-live-in">
        <div class="pro-panel-head"><strong>Input</strong><span>Changes update the result live</span></div>
        <div class="pro-controls" data-controls>${fieldsHtml}</div>
      </div>
      <div class="pro-live-out">
        <div class="pro-live-card" data-out></div>
      </div>`;
    const controls = s.body.querySelector('[data-controls]');
    const out = s.body.querySelector('[data-out]');
    let state = { ...initial };
    controls.querySelectorAll('[data-k]').forEach((el) => {
      const k = el.dataset.k;
      if (el.type === 'checkbox') el.checked = !!state[k];
      else el.value = state[k];
      el.addEventListener('input', () => {
        state[k] = el.type === 'checkbox' ? el.checked : (el.type === 'number' ? +el.value : el.value);
        render();
      });
    });
    function render() {
      try {
        const r = compute(state);
        out.innerHTML = r.html;
        if (r.after) r.after(out, state);
      } catch (e) {
        out.innerHTML = `<div class="pro-live-err">${esc(e.message)}</div>`;
      }
    }
    render();
    s.toolbar.innerHTML = `<span class="pro-dim">Live · updates as you type</span><span class="pro-live">● Live</span>`;
    if (copyLines) {
      const btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'etxt-btn-ghost'; btn.style.height = '30px';
      btn.innerHTML = copyIco + ' Copy result';
      btn.addEventListener('click', async () => { try { await navigator.clipboard.writeText(copyLines(state)); resultBar(s, { ok: true, title: 'Result copied', msg: 'Text is on your clipboard', actions: [{ label: 'Done', cls: 'etxt-btn-ghost', onClick: () => s.result.hidden = true }] }); } catch (e) {} });
      s.toolbar.appendChild(btn);
    }
    return { getState: () => state, setField: (k, v) => { state[k] = v; const el = controls.querySelector(`[data-k="${k}"]`); if (el) el.value = v; render(); } };
  }

  const copyBtn = (label, text) => ({ label, ico: copyIco, cls: 'etxt-btn-ghost', onClick: async () => { try { await navigator.clipboard.writeText(text); } catch (e) {} } });

  /* ═══════════════════════════════════════════════════════
     UTILITIES — 6 live input tools
  ═══════════════════════════════════════════════════════ */
  const LEN = { km: 1000, m: 1, cm: 0.01, mm: 0.001, mi: 1609.344, yd: 0.9144, ft: 0.3048, in: 0.0254 };
  const LEN_LABEL = { km: 'Kilometers', m: 'Meters', cm: 'Centimeters', mm: 'Millimeters', mi: 'Miles', yd: 'Yards', ft: 'Feet', in: 'Inches' };
  const CUR = { date: '2026-01-01', USD: 1, EUR: 0.92, GBP: 0.79, JPY: 157, INR: 83.2, CAD: 1.36, AUD: 1.52, CHF: 0.88, CNY: 7.24, SGD: 1.34, AED: 3.67, BRL: 4.95, ZAR: 18.6, RUB: 92, KRW: 1330, MXN: 17.1 };

  function mountUtilPro(container, tool) {
    const id = tool.id;
    if (id === 'units-length') {
      inputCard(container, tool, {
        title: 'Length converter', sub: 'Metric ↔ imperial, live as you type',
        fieldsHtml: `<div class="pro-live-grid">
          <div class="pro-control"><label><span>Value</span></label><input type="number" step="any" value="1" data-k="value" data-live></div>
          <div class="pro-control"><label><span>From</span></label><select data-k="from" data-live>${Object.keys(LEN).map(k => `<option value="${k}">${LEN_LABEL[k]}</option>`).join('')}</select></div>
          <div class="pro-control"><label><span>To</span></label><select data-k="to" data-live>${Object.keys(LEN).map(k => `<option value="${k}">${LEN_LABEL[k]}</option>`).join('')}</select></div>
        </div><div class="pro-live-big" data-live-out>1 m = 3.28084 ft</div>
        <div class="pro-live-table" data-live-table></div>`,
        runLabel: 'Copy result',
        onRun: async (resultEl) => {
          const v = +document.querySelector('[data-live-out]')?.dataset.v || 1;
          await navigator.clipboard.writeText(String(v));
          resultEl.className = 'pro-result is-ok'; resultEl.hidden = false;
          resultEl.innerHTML = `<span class="pro-result-ico">${checkIco}</span><div class="pro-result-copy"><strong>Copied</strong><span>Conversion on your clipboard</span></div>`;
        },
      });
      // live wiring
      const wire = () => {
        const outs = container.querySelector('[data-live-out]');
        const table = container.querySelector('[data-live-table]');
        const get = () => ({ value: +document.querySelector('[data-k=value]')?.value || 0, from: document.querySelector('[data-k=from]')?.value, to: document.querySelector('[data-k=to]')?.value });
        const render = () => {
          const { value, from, to } = get();
          const meters = value * LEN[from];
          const out = meters / LEN[to];
          outs.textContent = `${value} ${from} = ${out.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${to}`;
          outs.dataset.v = out;
          table.innerHTML = Object.keys(LEN).map(k => `<div><span>${LEN_LABEL[k]}</span><b>${(meters / LEN[k]).toLocaleString(undefined, { maximumFractionDigits: 4 })} ${k}</b></div>`).join('');
        };
        container.querySelectorAll('[data-live]').forEach(el => el.addEventListener('input', render));
        render();
      };
      wire();
      return;
    }
    if (id === 'timestamp') {
      const lw = inputCard(container, tool, {
        title: 'Timestamp converter', sub: 'Unix seconds ⇄ ISO / local / UTC',
        fieldsHtml: `<div class="pro-control"><label><span>Unix seconds or ISO date</span></label><input type="text" id="ts-value" value="${Math.floor(Date.now() / 1000)}"></div>
        <div class="pro-live-rows" id="ts-rows"></div>`,
        runLabel: 'Copy all',
        onRun: async (resultEl) => { await navigator.clipboard.writeText(document.querySelector('#ts-rows')?.innerText || ''); resultEl.className = 'pro-result is-ok'; resultEl.hidden = false; resultEl.innerHTML = `<span class="pro-result-ico">${checkIco}</span><div class="pro-result-copy"><strong>Copied</strong><span>All timestamp formats</span></div>`; },
      });
      const renderTs = () => {
        const v = document.querySelector('#ts-value')?.value.trim();
        const rows = document.querySelector('#ts-rows');
        if (!rows) return;
        let d;
        if (/^\d{10,13}$/.test(v || '')) d = new Date(v.length === 13 ? +v : +v * 1000);
        else d = new Date(v || '');
        if (isNaN(d.getTime())) { rows.innerHTML = '<div class="pro-live-err">Not a valid timestamp or date</div>'; return; }
        rows.innerHTML = [
          ['Unix (seconds)', Math.floor(d.getTime() / 1000)],
          ['Unix (milliseconds)', d.getTime()],
          ['ISO 8601', d.toISOString()],
          ['Local', d.toString()],
          ['UTC', d.toUTCString()],
        ].map(([k, val]) => `<div class="pro-live-row"><span>${k}</span><code>${esc(String(val))}</code></div>`).join('');
      };
      const inp = container.querySelector('#ts-value');
      inp.addEventListener('input', renderTs);
      renderTs();
      return;
    }
    if (id === 'color-picker') {
      const toHex = (r, g, b) => '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
      const hexToRgb = (hex) => { const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16); return { r, g, b }; };
      const rgbToHsl = ({ r, g, b }) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0, l = (mx + mn) / 2; if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; } return `hsl(${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`; };
      inputCard(container, tool, {
        title: 'Color picker', sub: 'Pick any color — get HEX, RGB and HSL instantly',
        fieldsHtml: `<div class="pro-color-pick"><input type="color" id="cp-value" value="#5B8EF0"><div class="pro-color-swatch" id="cp-swatch"></div></div>
        <div class="pro-live-rows" id="cp-rows"></div>`,
        runLabel: 'Copy HEX',
        onRun: async (resultEl) => { await navigator.clipboard.writeText(document.querySelector('#cp-value')?.value || ''); resultEl.className = 'pro-result is-ok'; resultEl.hidden = false; resultEl.innerHTML = `<span class="pro-result-ico">${checkIco}</span><div class="pro-result-copy"><strong>Copied</strong><span>HEX color on your clipboard</span></div>`; },
      });
      const renderCp = () => {
        const inp = container.querySelector('#cp-value'); if (!inp) return;
        const hex = inp.value;
        const { r, g, b } = hexToRgb(hex);
        container.querySelector('#cp-swatch').style.background = hex;
        container.querySelector('#cp-rows').innerHTML = [
          ['HEX', hex],
          ['RGB', `rgb(${r}, ${g}, ${b})`],
          ['HSL', rgbToHsl({ r, g, b })],
        ].map(([k, val]) => `<div class="pro-live-row"><span>${k}</span><code>${esc(val)}</code></div>`).join('');
      };
      container.querySelector('#cp-value').addEventListener('input', renderCp);
      renderCp();
      return;
    }
    if (id === 'aspect-ratio') {
      inputCard(container, tool, {
        title: 'Aspect ratio calculator', sub: 'Simplify a ratio and scale dimensions',
        fieldsHtml: `<div class="pro-live-grid">
          <div class="pro-control"><label><span>Width</span></label><input type="number" value="1920" data-k="w" data-live></div>
          <div class="pro-control"><label><span>Height</span></label><input type="number" value="1080" data-k="h" data-live></div>
          <div class="pro-control"><label><span>New width (optional)</span></label><input type="number" value="0" data-k="target" data-live></div>
        </div><div class="pro-live-big" data-live-out>16:9</div>
        <div class="pro-live-rows" data-live-table></div>`,
        runLabel: 'Copy ratio',
        onRun: async (resultEl) => { await navigator.clipboard.writeText(document.querySelector('[data-live-out]')?.textContent || ''); resultEl.className = 'pro-result is-ok'; resultEl.hidden = false; resultEl.innerHTML = `<span class="pro-result-ico">${checkIco}</span><div class="pro-result-copy"><strong>Copied</strong><span>Ratio on your clipboard</span></div>`; },
      });
      const gcd = (a, b) => b ? gcd(b, a % b) : a;
      const wire = () => {
        const render = () => {
          const w = +document.querySelector('[data-k=w]')?.value || 0;
          const h = +document.querySelector('[data-k=h]')?.value || 0;
          const t = +document.querySelector('[data-k=target]')?.value || 0;
          const g = gcd(w, h) || 1;
          const out = document.querySelector('[data-live-out]');
          const table = document.querySelector('[data-live-table]');
          if (!w || !h) { out.textContent = '—'; table.innerHTML = ''; return; }
          out.textContent = `${w / g}:${h / g}`;
          table.innerHTML = [
            ['Decimal', (w / h).toFixed(4)],
            ['Landscape / Portrait', w >= h ? 'Landscape' : 'Portrait'],
            t > 0 ? ['Height at width ' + t, Math.round(t * h / w) + ' px'] : null,
          ].filter(Boolean).map(([k, val]) => `<div class="pro-live-row"><span>${k}</span><b>${esc(val)}</b></div>`).join('');
        };
        container.querySelectorAll('[data-live]').forEach(el => el.addEventListener('input', render));
        render();
      };
      wire();
      return;
    }
    if (id === 'currency') {
      inputCard(container, tool, {
        title: 'Currency converter', sub: `Offline snapshot · rates as of ${CUR.date}`,
        fieldsHtml: `<div class="pro-live-grid">
          <div class="pro-control"><label><span>Amount</span></label><input type="number" value="100" data-k="amt" data-live></div>
          <div class="pro-control"><label><span>From</span></label><select data-k="from" data-live>${Object.keys(CUR).filter(k => k !== 'date').map(k => `<option value="${k}">${k}</option>`).join('')}</select></div>
          <div class="pro-control"><label><span>To</span></label><select data-k="to" data-live>${Object.keys(CUR).filter(k => k !== 'date').map(k => `<option value="${k}">${k}</option>`).join('')}</select></div>
        </div><div class="pro-live-big" data-live-out>—</div>
        <div class="pro-live-note" data-live-note>Rates are an offline snapshot — for display only</div>`,
        runLabel: 'Copy result',
        onRun: async (resultEl) => { await navigator.clipboard.writeText(document.querySelector('[data-live-out]')?.textContent || ''); resultEl.className = 'pro-result is-ok'; resultEl.hidden = false; resultEl.innerHTML = `<span class="pro-result-ico">${checkIco}</span><div class="pro-result-copy"><strong>Copied</strong><span>Conversion on your clipboard</span></div>`; },
      });
      const wire = () => {
        const render = () => {
          const amt = +document.querySelector('[data-k=amt]')?.value || 0;
          const from = document.querySelector('[data-k=from]')?.value;
          const to = document.querySelector('[data-k=to]')?.value;
          const out = document.querySelector('[data-live-out]');
          if (!from || !to || !amt) { out.textContent = '—'; return; }
          const usd = amt / CUR[from];
          out.textContent = `${amt.toLocaleString()} ${from} = ${(usd * CUR[to]).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${to}`;
        };
        container.querySelectorAll('[data-live]').forEach(el => el.addEventListener('input', render));
        render();
      };
      wire();
      return;
    }
    if (id === 'cron-util') {
      const PRESETS = [
        ['Every 15 minutes', '*/15 * * * *'],
        ['Every hour', '0 * * * *'],
        ['Workdays 9–5', '*/15 9-17 * * 1-5'],
        ['Midnight daily', '0 0 * * *'],
        ['Weekly Monday', '0 9 * * 1'],
      ];
      inputCard(container, tool, {
        title: 'Cron job explainer', sub: 'Explain a 5-field cron expression in plain English',
        fieldsHtml: `<div class="pro-control"><label><span>Cron expression</span></label><input type="text" id="cron-expr" value="*/15 9-17 * * 1-5" spellcheck="false"></div>
        <div class="pro-cron-presets">${PRESETS.map(([l, e]) => `<button type="button" data-preset="${e}">${l}</button>`).join('')}</div>
        <div class="pro-live-rows" id="cron-rows"></div>`,
        runLabel: 'Copy explanation',
        onRun: async (resultEl) => { await navigator.clipboard.writeText(document.querySelector('#cron-rows')?.innerText || ''); resultEl.className = 'pro-result is-ok'; resultEl.hidden = false; resultEl.innerHTML = `<span class="pro-result-ico">${checkIco}</span><div class="pro-result-copy"><strong>Copied</strong><span>Explanation on your clipboard</span></div>`; },
      });
      const explain = (expr) => {
        const f = String(expr).trim().split(/\s+/);
        if (f.length !== 5) return { err: 'Enter exactly 5 fields: minute hour day-of-month month weekday' };
        const [mi, hr, dom, mon, dow] = f;
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const p = (v, u) => v === '*' ? `every ${u}` : v.includes('/') ? `every ${v.split('/')[1]} ${u}(s)` : v.includes('-') ? `${u}s ${v.replace(/-/g, '–')}` : v === '0' ? `at ${u} 0` : `${u} ${v}`;
        const dowt = dow === '*' ? 'every day' : dow.split(/[,-]/).map(d => days[+d] || d).join(' and ');
        return { text: `At ${p(mi, 'minute')}, ${p(hr, 'hour')}, ${p(dom, 'day-of-month')}, ${p(mon, 'month')}, on ${dowt}.` };
      };
      const render = () => {
        const expr = container.querySelector('#cron-expr')?.value;
        const rows = container.querySelector('#cron-rows');
        if (!rows) return;
        const r = explain(expr);
        if (r.err) { rows.innerHTML = `<div class="pro-live-err">${esc(r.err)}</div>`; return; }
        const next = [];
        const now = new Date();
        const base = new Date(now);
        base.setSeconds(0, 0);
        for (let i = 0; i < 5; i++) {
          base.setMinutes(base.getMinutes() + 1);
          next.push(base.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }));
        }
        rows.innerHTML = `<div class="pro-live-row is-main"><span>When</span><b>${esc(r.text)}</b></div>` +
          `<div class="pro-live-row"><span>Next runs</span><code>${next.join('  ·  ')}</code></div>` +
          `<div class="pro-live-row"><span>Raw</span><code>${esc(expr)}</code></div>`;
      };
      container.querySelector('#cron-expr').addEventListener('input', render);
      container.querySelectorAll('[data-preset]').forEach(b => b.addEventListener('click', () => { container.querySelector('#cron-expr').value = b.dataset.preset; render(); }));
      render();
      return;
    }
    /* fallback to generic for anything unhandled */
    if (window.FF.Flow && window.FF.Flow.mount && window.FF.Flow.mount.__ffPremiumRouter && window.__ffOriginalFlowMount) window.__ffOriginalFlowMount(container, tool);
  }

  /* ═══════════════════════════════════════════════════════
     DEVELOPER — base64, url-encode, diff (input) + font tools (file)
  ═══════════════════════════════════════════════════════ */
  function mountDevPro(container, tool) {
    const id = tool.id;
    if (id === 'base64' || id === 'url-encode') {
      inputCard(container, tool, {
        title: id === 'base64' ? 'Base64 encode / decode' : 'URL encode / decode',
        sub: id === 'base64' ? 'UTF-8 safe — paste text below' : 'Percent-encode or decode URL components',
        fieldsHtml: `<div class="pro-control"><label><span>Mode</span></label><select id="dev-mode"><option value="encode" selected>Encode</option><option value="decode">Decode</option></select></div>
        <div class="pro-control"><label><span>Text</span></label><textarea id="dev-src" placeholder="${id === 'base64' ? 'Hello, world' : 'a b&c=d'}"></textarea></div>
        <div class="pro-live-note" id="dev-count">0 characters</div>
        <div class="pro-control"><label><span>Output</span></label><textarea id="dev-out" readonly spellcheck="false" placeholder="Result appears here…"></textarea></div>`,
        runLabel: 'Copy output',
        onRun: async (resultEl) => { await navigator.clipboard.writeText(document.querySelector('#dev-out')?.value || ''); resultEl.className = 'pro-result is-ok'; resultEl.hidden = false; resultEl.innerHTML = `<span class="pro-result-ico">${checkIco}</span><div class="pro-result-copy"><strong>Copied</strong><span>Output on your clipboard</span></div>`; },
      });
      const src = container.querySelector('#dev-src');
      const mode = container.querySelector('#dev-mode');
      const out = container.querySelector('#dev-out');
      const count = container.querySelector('#dev-count');
      const render = () => {
        const s = src.value;
        count.textContent = s.length + ' characters';
        if (!s) { out.value = ''; return; }
        try {
          if (id === 'base64') out.value = mode.value === 'encode' ? btoa(unescape(encodeURIComponent(s))) : decodeURIComponent(escape(atob(s.trim())));
          else out.value = mode.value === 'encode' ? encodeURIComponent(s) : decodeURIComponent(s);
        } catch (e) { out.value = '— invalid input for ' + mode.value; }
      };
      src.addEventListener('input', render);
      mode.addEventListener('change', render);
      render();
      return;
    }
    if (id === 'diff') {
      inputCard(container, tool, {
        title: 'Text diff', sub: 'Line-by-line comparison with colored changes',
        fieldsHtml: `<div class="pro-diff-in">
          <div class="pro-control"><label><span>Original</span></label><textarea id="diff-a" spellcheck="false">line one\nline two\nline three</textarea></div>
          <div class="pro-control"><label><span>Changed</span></label><textarea id="diff-b" spellcheck="false">line one\nline 2\nline three\nline four</textarea></div>
        </div>
        <div class="pro-diff-out-wrap"><div class="pro-diff-stats" id="diff-stats"></div><pre id="diff-out" class="pro-diff-pre"></pre></div>`,
        runLabel: 'Copy diff',
        onRun: async (resultEl) => { await navigator.clipboard.writeText(document.querySelector('#diff-out')?.innerText || ''); resultEl.className = 'pro-result is-ok'; resultEl.hidden = false; resultEl.innerHTML = `<span class="pro-result-ico">${checkIco}</span><div class="pro-result-copy"><strong>Copied</strong><span>Diff output on your clipboard</span></div>`; },
      });
      const a = container.querySelector('#diff-a');
      const b = container.querySelector('#diff-b');
      const outEl = container.querySelector('#diff-out');
      const stats = container.querySelector('#diff-stats');
      const renderDiff = () => {
        const A = a.value.split('\n'), B = b.value.split('\n');
        const n = A.length, m = B.length;
        const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
        for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
        const out = []; let i = 0, j = 0;
        while (i < n && j < m) {
          if (A[i] === B[j]) { out.push({ t: 'eq', s: A[i] }); i++; j++; }
          else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push({ t: 'del', s: A[i] }); i++; }
          else { out.push({ t: 'add', s: B[j] }); j++; }
        }
        while (i < n) out.push({ t: 'del', s: A[i++] });
        while (j < m) out.push({ t: 'add', s: B[j++] });
        const added = out.filter(x => x.t === 'add').length, removed = out.filter(x => x.t === 'del').length;
        stats.innerHTML = `<span class="diff-add">+${added} added</span><span class="diff-del">−${removed} removed</span><span class="diff-eq">${out.length} lines</span>`;
        outEl.innerHTML = out.map(x => `<span class="diff-line ${x.t}"><i>${x.t === 'add' ? '+' : x.t === 'del' ? '−' : ' '}</i>${esc(x.s)}</span>`).join('');
      };
      a.addEventListener('input', renderDiff);
      b.addEventListener('input', renderDiff);
      renderDiff();
      return;
    }
    if (id === 'font-glyphs' || id === 'font-convert') {
      const dz = dropzone(container, tool, {
        accepts: ['ttf', 'otf', 'woff'],
        multiple: false,
        headline: `Drop your font file here`,
        meta: 'TTF · OTF · WOFF · 100% local',
      });
      dz.setOnFiles(async (list) => {
        const file = list[0];
        const app = window.FF.app;
        if (app && app.updateSidebarForFileCategory) app.updateSidebarForFileCategory('Developer', file);
        if (id === 'font-glyphs') return bodyGlyphs(file);
        bodyFontConvert(file);
      });
      function bodyGlyphs(file) {
        const s = frame(container, tool, { title: 'Font glyphs', sub: 'Render a grid of glyphs from your font', action: 'Download PNG' });
        s.replaceBtn.addEventListener('click', () => reset());
        s.body.className = 'pro-body pro-simple-body';
        s.body.innerHTML = `<div class="pro-simple-stage"><div class="pro-font-stage"><img id="fg-img" alt="Glyph grid preview"></div></div>
          <aside class="pro-panel"><div class="pro-panel-head"><strong>Glyph grid</strong><span id="fg-meta">Parsing font…</span></div>
          <div class="pro-control"><label><span>Glyphs</span><b id="fg-count">100</b></label><input type="range" id="fg-n" min="10" max="500" step="10" value="100"></div>
          <button type="button" class="etxt-btn-finish pro-panel-run" data-fg-dl>${dlIco} Download PNG</button></aside>`;
        let blob = null;
        const render = async () => {
          try {
            const ot = await load.opentype();
            const font = ot.parse(await file.arrayBuffer());
            const n = Math.min(+document.querySelector('#fg-n').value, font.numGlyphs);
            const cols = 10, cell = 48, rows = Math.ceil(n / cols);
            const c = document.createElement('canvas'); c.width = cols * cell; c.height = rows * cell;
            const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.fillStyle = '#111';
            for (let i = 0; i < n; i++) {
              const glyph = font.glyphs.get(i);
              const x = (i % cols) * cell + 6, y = Math.floor(i / cols) * cell + cell - 12;
              try { glyph.getPath(x, y, 32).draw(ctx); } catch (e) {}
            }
            document.querySelector('#fg-img').src = c.toDataURL('image/png');
            document.querySelector('#fg-meta').textContent = `${font.familyName} · ${font.numGlyphs} glyphs`;
            blob = await new Promise(r => c.toBlob(r, 'image/png'));
          } catch (e) { document.querySelector('#fg-meta').textContent = 'Could not parse font: ' + e.message; }
        };
        render();
        document.querySelector('#fg-n').addEventListener('input', (e) => { document.querySelector('#fg-count').textContent = e.target.value; render(); });
        s.toolbar.innerHTML = `<span class="pro-dim">${esc(file.name)} · ${bytes(file.size)}</span><span class="pro-live">Parsed locally</span>`;
        document.querySelector('[data-fg-dl]').addEventListener('click', () => { if (blob) download(blob, baseName(file.name) + '.glyphs.png'); });
      }
      function bodyFontConvert(file) {
        const s = frame(container, tool, { title: 'Font convert', sub: 'Normalize to OTF (SFNT)', action: 'Convert to OTF' });
        s.replaceBtn.addEventListener('click', () => reset());
        s.body.className = 'pro-body pro-simple-body';
        s.body.innerHTML = `<div class="pro-simple-stage"><div class="pro-font-card" id="fc-info">Reading font…</div></div>
          <aside class="pro-panel"><div class="pro-panel-head"><strong>Font information</strong><span id="fc-meta">—</span></div>
          <p class="pro-panel-note">The font is re-emitted as a clean OTF (SFNT) file — ready for web or desktop use.</p></aside>`;
        const info = document.querySelector('#fc-info');
        const meta = document.querySelector('#fc-meta');
        (async () => {
          try {
            const ot = await load.opentype();
            const font = ot.parse(await file.arrayBuffer());
            const rows = [
              ['Family', font.familyName], ['Subfamily', font.subfamilyName], ['Glyphs', font.numGlyphs],
              ['Units per em', font.unitsPerEm], ['Ascender', font.ascender], ['Descender', font.descender],
            ].map(([k, v]) => `<div class="pro-live-row"><span>${k}</span><b>${esc(String(v ?? '—'))}</b></div>`).join('');
            info.innerHTML = rows;
            meta.textContent = `${file.name} · ${bytes(file.size)}`;
          } catch (e) { info.innerHTML = `<div class="pro-live-err">Could not parse font: ${esc(e.message)}</div>`; }
        })();
        s.toolbar.innerHTML = `<span class="pro-dim">${esc(file.name)}</span><span class="pro-live">OTF output</span>`;
        s.runBtn.addEventListener('click', async () => {
          s.runBtn.disabled = true; s.runBtn.textContent = 'Converting…';
          try {
            const out = await tool.run({ file, engine: await load.opentype() });
            resultBar(s, {
              ok: true,
              title: 'Converted to OTF',
              msg: `${out.filename} · ${bytes(out.blob.size)}`,
              blob: out.blob,
              filename: out.filename,
              tool,
              actions: [{ label: 'Download', cls: 'etxt-btn-finish', ico: dlIco, onClick: () => download(out.blob, out.filename) }]
            });
          } catch (e) { resultBar(s, { ok: false, title: 'Could not convert', msg: e.message }); }
          finally { s.runBtn.disabled = false; s.runBtn.textContent = 'Convert to OTF'; }
        });
      }
      function reset() {
        dropzone(container, tool, { accepts: ['ttf', 'otf', 'woff'], multiple: false, headline: 'Drop your font file here', meta: 'TTF · OTF · WOFF · 100% local' })
          .setOnFiles(async (list) => {
            const file = list[0];
            if (id === 'font-glyphs') return bodyGlyphs(file);
            bodyFontConvert(file);
          });
      }
      return;
    }
    if (window.FF.Flow && window.FF.Flow.mount && window.FF.Flow.mount.__ffPremiumRouter && window.__ffOriginalFlowMount) window.__ffOriginalFlowMount(container, tool);
  }

  /* ═══════════════════════════════════════════════════════
     ARCHIVES + DATA — zip/targz create, file-split, 7z, sqlite
  ═══════════════════════════════════════════════════════ */
  function mountArcPro(container, tool) {
    const id = tool.id;
    const dz = dropzone(container, tool, {
      accepts: id === 'sqlite-explorer' ? ['sqlite', 'sqlite3', 'db', 'sql'] : (id === 'archive-7z-extract' ? ['7z', 'rar', 'tar', 'gz', 'tgz', 'bz2', 'xz', 'zip'] : []),
      multiple: id === 'zip-create' || id === 'targz-create',
      headline: id === 'zip-create' || id === 'targz-create' ? 'Drop files to bundle' : (id === 'file-split' ? 'Drop a large file to split' : `Drop your ${tool.name.toLowerCase()} file here`),
      meta: id === 'sqlite-explorer' ? 'SQLite · DB · SQLITE3' : id === 'archive-7z-extract' ? '7Z · RAR · TAR · GZ · ZIP' : id === 'file-split' ? 'Any file · up to 200 MB' : 'Any files · 100% local',
    });
    dz.setOnFiles(async (list) => {
      const files = [...list];
      if (id === 'sqlite-explorer') return bodySqlite(files[0]);
      if (id === 'archive-7z-extract') return body7z(files[0]);
      if (id === 'file-split') return bodySplit(files[0]);
      bodyCreate(files);
    });

    function bodyCreate(files) {
      const isTar = id === 'targz-create';
      const s = frame(container, tool, { title: isTar ? 'Create TAR.GZ' : 'Create ZIP', sub: isTar ? 'Bundle files into a compressed archive' : 'Bundle files into a single archive', action: isTar ? 'Create TAR.GZ' : 'Create ZIP' });
      s.replaceBtn.addEventListener('click', () => reset());
      s.body.className = 'pro-body pro-simple-body';
      s.body.innerHTML = `
        <div class="pro-simple-stage"><div class="pro-arc-list">${files.map((f, i) => `
          <div class="pro-arc-file"><span class="pro-arc-type">${esc(extOf(f.name).toUpperCase() || 'FILE')}</span><div class="pro-arc-meta"><strong title="${esc(f.name)}">${esc(f.name)}</strong><span>${bytes(f.size)}</span></div><button type="button" class="pro-arc-remove" data-i="${i}">×</button></div>`).join('')}</div></div>
        <aside class="pro-panel"><div class="pro-panel-head"><strong>${isTar ? 'TAR.GZ create' : 'ZIP create'}</strong><span>${files.length} files selected</span></div>
        <div class="pro-control"><label><span>Compression</span></label><select data-k="level"><option value="0">Store (fastest)</option><option value="3">Fast</option><option value="6" selected>Balanced</option><option value="9">Maximum</option></select></div>
        <p class="pro-panel-note">Total ${bytes(files.reduce((a, f) => a + f.size, 0))} — everything stays in your browser.</p></aside>`;
      let current = [...files];
      const listEl = s.body.querySelector('.pro-arc-list');
      listEl.addEventListener('click', (e) => {
        const btn = e.target.closest('.pro-arc-remove'); if (!btn) return;
        current = current.filter((_, i) => i !== +btn.dataset.i);
        if (!current.length) { reset(); return; }
        btn.closest('.pro-arc-file').remove();
        s.body.querySelector('.pro-panel-head span').textContent = current.length + ' files selected';
      });
      s.toolbar.innerHTML = `<span class="pro-dim">${files.length} files · ${bytes(files.reduce((a, f) => a + f.size, 0))}</span><span class="pro-live">Local</span>`;
      s.runBtn.addEventListener('click', async () => {
        setBusy(s, true, isTar ? 'Creating…' : 'Zipping…');
        try {
          const level = +s.body.querySelector('[data-k=level]').value;
          const out = await tool.run({ files: current, inputs: { level } });
          resultBar(s, {
            ok: true,
            title: isTar ? 'TAR.GZ ready' : 'ZIP ready',
            msg: `${out.filename} · ${bytes(out.blob.size)}`,
            blob: out.blob,
            filename: out.filename,
            tool,
            actions: [{ label: 'Download', cls: 'etxt-btn-finish', ico: dlIco, onClick: () => download(out.blob, out.filename) }]
          });
        } catch (e) { resultBar(s, { ok: false, title: 'Could not create archive', msg: e.message }); }
        finally { setBusy(s, false); }
      });
    }

    function bodySplit(file) {
      const s = frame(container, tool, { title: 'Split file', sub: 'Split any large file into fixed-size parts', action: 'Split into parts' });
      s.replaceBtn.addEventListener('click', () => reset());
      s.body.className = 'pro-body pro-simple-body';
      s.body.innerHTML = `
        <div class="pro-simple-stage"><div class="pro-font-card"><div class="pro-live-row"><span>File</span><b>${esc(file.name)}</b></div>
        <div class="pro-live-row"><span>Size</span><b>${bytes(file.size)}</b></div>
        <div class="pro-live-row"><span>Parts</span><b id="split-parts">—</b></div></div></div>
        <aside class="pro-panel"><div class="pro-panel-head"><strong>Split settings</strong><span>ZIP of numbered parts</span></div>
        <div class="pro-control"><label><span>Part size (MB)</span></label><input type="number" id="split-mb" min="1" value="10"></div>
        <p class="pro-panel-note" id="split-note">Each part is stored uncompressed so chunks are exact.</p></aside>`;
      const update = () => {
        const chunk = Math.max(1, +document.querySelector('#split-mb').value || 1) * 1048576;
        const n = Math.ceil(file.size / chunk);
        document.querySelector('#split-parts').textContent = n + ' part' + (n === 1 ? '' : 's');
        document.querySelector('#split-note').textContent = n < 2 ? 'File is smaller than one part — increase part size or pick a bigger file.' : `Chunks of ${Math.max(1, +document.querySelector('#split-mb').value || 1)} MB each.`;
      };
      document.querySelector('#split-mb').addEventListener('input', update);
      update();
      s.toolbar.innerHTML = `<span class="pro-dim">${esc(file.name)}</span><span class="pro-live">Chunks local</span>`;
      s.runBtn.addEventListener('click', async () => {
        setBusy(s, true, 'Splitting…');
        try {
          const out = await tool.run({ file, inputs: { mb: document.querySelector('#split-mb').value } });
          resultBar(s, {
            ok: true,
            title: 'Parts ready',
            msg: `${out.filename} · ${bytes(out.blob.size)}`,
            blob: out.blob,
            filename: out.filename,
            tool,
            actions: [{ label: 'Download', cls: 'etxt-btn-finish', ico: dlIco, onClick: () => download(out.blob, out.filename) }]
          });
        } catch (e) { resultBar(s, { ok: false, title: 'Could not split', msg: e.message }); }
        finally { setBusy(s, false); }
      });
    }

    function body7z(file) {
      const s = frame(container, tool, { title: 'Universal extractor', sub: '7Z · RAR · TAR · GZ · ZIP → files or manifest', action: 'Extract' });
      s.replaceBtn.addEventListener('click', () => reset());
      s.body.className = 'pro-body pro-simple-body';
      s.body.innerHTML = `
        <div class="pro-simple-stage"><div class="pro-font-card"><div class="pro-live-row"><span>Archive</span><b>${esc(file.name)}</b></div>
        <div class="pro-live-row"><span>Size</span><b>${bytes(file.size)}</b></div>
        <div class="pro-live-row"><span>Format</span><b>${esc(extOf(file.name).toUpperCase())}</b></div></div></div>
        <aside class="pro-panel"><div class="pro-panel-head"><strong>Extraction mode</strong><span>Choose your output</span></div>
        <div class="pro-control"><label><span>Mode</span></label><select data-k="action"><option value="zip">Unpack into a standard ZIP</option><option value="manifest">Generate a file list (.txt)</option></select></div>
        <p class="pro-panel-note">ZIP / TAR / GZ are unpacked in full. Other containers fall back to a safe binary extraction.</p></aside>`;
      s.toolbar.innerHTML = `<span class="pro-dim">${esc(file.name)}</span><span class="pro-live">Browser-side</span>`;
      s.runBtn.addEventListener('click', async () => {
        setBusy(s, true, 'Extracting…');
        try {
          const out = await tool.run({ file, inputs: { action: s.body.querySelector('[data-k=action]').value } });
          resultBar(s, {
            ok: true,
            title: 'Extraction ready',
            msg: `${out.filename} · ${bytes(out.blob.size)}`,
            blob: out.blob,
            filename: out.filename,
            tool,
            actions: [{ label: 'Download', cls: 'etxt-btn-finish', ico: dlIco, onClick: () => download(out.blob, out.filename) }]
          });
        } catch (e) { resultBar(s, { ok: false, title: 'Could not extract', msg: e.message }); }
        finally { setBusy(s, false); }
      });
    }

    function bodySqlite(file) {
      const s = frame(container, tool, { title: 'SQLite explorer', sub: 'Inspect a database file in your browser', action: 'Run & export' });
      s.replaceBtn.addEventListener('click', () => reset());
      s.body.className = 'pro-body pro-pii-body';
      s.body.innerHTML = `
        <div class="pro-pii-stage"><div class="pro-sql">
          <div class="pro-pii-count">${esc(file.name)} · ${bytes(file.size)}</div>
          <div class="pro-sql-tables" id="sql-tables">Reading database…</div>
          <div class="pro-control"><label><span>SQL query</span></label><input type="text" id="sql-query" value="SELECT * FROM sqlite_master WHERE type=&quot;table&quot;;" spellcheck="false"></div>
          <div class="pro-control"><label><span>Export format</span></label><select id="sql-fmt"><option value="csv">CSV</option><option value="json">JSON</option><option value="markdown">Markdown</option></select></div>
        </div></div>
        <aside class="pro-panel"><div class="pro-panel-head"><strong>Database</strong><span id="sql-meta">Local scan</span></div>
        <p class="pro-panel-note">Tables are detected by scanning the schema. The report can be exported as CSV, JSON or Markdown.</p></aside>`;
      (async () => {
        try {
          const buf = await u8(file);
          const magic = String.fromCharCode(...buf.slice(0, 15));
          if (!magic.startsWith('SQLite format 3')) { document.querySelector('#sql-tables').innerHTML = '<div class="pro-live-err">Not a valid SQLite 3 header</div>'; return; }
          const rawText = new TextDecoder('utf-8').decode(buf);
          const tables = [];
          for (const m of rawText.matchAll(/CREATE\s+TABLE\s+["`']?([a-zA-Z0-9_]+)["`']?/gi)) {
            if (m[1] && !tables.includes(m[1]) && !m[1].startsWith('sqlite_')) tables.push(m[1]);
          }
          document.querySelector('#sql-tables').innerHTML = (tables.length ? tables : ['No user tables found']).map(t => `<span class="pro-sql-table">${esc(t)}</span>`).join('');
          document.querySelector('#sql-meta').textContent = tables.length + ' table' + (tables.length === 1 ? '' : 's') + ' detected';
        } catch (e) { document.querySelector('#sql-tables').innerHTML = `<div class="pro-live-err">${esc(e.message)}</div>`; }
      })();
      s.toolbar.innerHTML = `<span class="pro-dim">${esc(file.name)}</span><span class="pro-live">Offline</span>`;
      s.runBtn.addEventListener('click', async () => {
        setBusy(s, true, 'Building report…');
        try {
          const out = await tool.run({ file, inputs: { sql: document.querySelector('#sql-query').value, exportFormat: document.querySelector('#sql-fmt').value } });
          resultBar(s, {
            ok: true,
            title: 'Report ready',
            msg: `${out.filename} · ${bytes(out.blob.size)}`,
            blob: out.blob,
            filename: out.filename,
            tool,
            actions: [{ label: 'Download', cls: 'etxt-btn-finish', ico: dlIco, onClick: () => download(out.blob, out.filename) }]
          });
        } catch (e) { resultBar(s, { ok: false, title: 'Could not inspect', msg: e.message }); }
        finally { setBusy(s, false); }
      });
    }

    function reset() {
      dropzone(container, tool, {
        accepts: id === 'sqlite-explorer' ? ['sqlite', 'sqlite3', 'db', 'sql'] : (id === 'archive-7z-extract' ? ['7z', 'rar', 'tar', 'gz', 'tgz', 'bz2', 'xz', 'zip'] : []),
        multiple: id === 'zip-create' || id === 'targz-create',
        headline: id === 'zip-create' || id === 'targz-create' ? 'Drop files to bundle' : (id === 'file-split' ? 'Drop a large file to split' : `Drop your ${tool.name.toLowerCase()} file here`),
        meta: id === 'sqlite-explorer' ? 'SQLite · DB · SQLITE3' : id === 'archive-7z-extract' ? '7Z · RAR · TAR · GZ · ZIP' : id === 'file-split' ? 'Any file · up to 200 MB' : 'Any files · 100% local',
      }).setOnFiles(async (list) => {
        const files = [...list];
        if (id === 'sqlite-explorer') return bodySqlite(files[0]);
        if (id === 'archive-7z-extract') return body7z(files[0]);
        if (id === 'file-split') return bodySplit(files[0]);
        bodyCreate(files);
      });
    }

    function setBusy(s, busy, label) {
      if (s.runBtn) { s.runBtn.disabled = busy; if (label) s.runBtn.textContent = label; }
      s.body.setAttribute('aria-busy', String(busy));
    }
  }

  /* ═══════════════════════════════════════════════════════
     E-BOOKS — reader, chapters, cover, metadata
  ═══════════════════════════════════════════════════════ */
  function mountEbookPro(container, tool) {
    const id = tool.id;
    const dz = dropzone(container, tool, { accepts: ['epub'], multiple: false, headline: 'Drop your EPUB file here', meta: 'EPUB · 100% local' });
    dz.setOnFiles(async (list) => { const file = list[0]; const app = window.FF.app; if (app && app.updateSidebarForFileCategory) app.updateSidebarForFileCategory('E-Books', file); if (id === 'epub-reader') return bodyReader(file); if (id === 'epub-chapters') return bodyChapters(file); if (id === 'epub-cover') return bodyCover(file); bodyMetadata(file); });

    /* epub parsing helpers (fflate-based, same as tools.js) */
    function parseEpub(fflate, buf) {
      const entries = fflate.unzipSync(buf);
      const files = {};
      for (const [n, d] of Object.entries(entries)) files['/' + n] = d;
      const dec = new TextDecoder();
      let opfPath = '';
      const meta = (k) => {
        if (!opfPath) return null;
        const opf = dec.decode(files[opfPath]);
        const m = opf.match(new RegExp('<dc:' + k + '[^>]*>([\\s\\S]*?)<\\/dc:' + k + '>', 'i'));
        return m ? m[1].trim() : null;
      };
      const items = {};
      let base = '';
      if (!opfPath) {
        const containerXml = dec.decode(files['/META-INF/container.xml'] || new Uint8Array());
        const m = containerXml.match(/full-path="([^"]+)"/);
        if (m) opfPath = '/' + m[1];
        const b = (m && m[1].split('/').slice(0, -1).join('/'));
        base = b && b !== '' ? b + '/' : '';
        if (opfPath) {
          const opf = dec.decode(files[opfPath]);
          for (const im of opf.matchAll(/<item[^>]*id="([^"]+)"[^>]*href="([^"]+)"[^>]*media-type="([^"]+)"/g)) {
            items[im[1]] = { href: im[2], type: im[3] };
          }
          for (const im of opf.matchAll(/<item[^>]*href="([^"]+)"[^>]*id="([^"]+)"[^>]*media-type="([^"]+)"/g)) {
            items[im[2]] = { href: im[1], type: im[3] };
          }
        }
      }
      const spine = [];
      if (opfPath) {
        const opf = dec.decode(files[opfPath]);
        for (const im of opf.matchAll(/<itemref[^>]*idref="([^"]+)"/g)) spine.push(im[1]);
      }
      const readFile = (href) => {
        const p = '/' + base + href.replace(/^\//, '');
        return files[p] ? dec.decode(files[p]) : null;
      };
      return { meta, items, spine, base, readFile, files, opfPath, dec };
    }
    const strip = (html) => String(html || '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();

    function bodyReader(file) {
      const s = frame(container, tool, { title: 'EPUB reader', sub: 'Read the book right in your browser', action: 'Next chapter' });
      s.replaceBtn.addEventListener('click', () => reset());
      s.body.className = 'pro-body pro-reader-body';
      s.body.innerHTML = `
        <div class="pro-reader-list" data-chapters></div>
        <div class="pro-reader-pane">
          <div class="pro-reader-meta" id="rd-meta"></div>
          <div class="pro-reader-controls" style="display:flex;gap:8px;align-items:center;padding:8px 16px;background:rgba(0,0,0,0.03);border-bottom:1px solid var(--pro-border, #E5E5E5);">
            <button type="button" id="rd-font-dn" style="padding:4px 8px;border:1px solid var(--pro-border, #ccc);border-radius:4px;background:#fff;cursor:pointer;">A-</button>
            <button type="button" id="rd-font-up" style="padding:4px 8px;border:1px solid var(--pro-border, #ccc);border-radius:4px;background:#fff;cursor:pointer;">A+</button>
            <div style="flex:1"></div>
            <button type="button" class="rd-theme-btn" data-theme="light" style="padding:4px 8px;border:1px solid #ccc;border-radius:4px;background:#fff;cursor:pointer;">Light</button>
            <button type="button" class="rd-theme-btn" data-theme="sepia" style="padding:4px 8px;border:1px solid #d2b48c;border-radius:4px;background:#fbf0d9;color:#5f4b32;cursor:pointer;">Sepia</button>
            <button type="button" class="rd-theme-btn" data-theme="dark" style="padding:4px 8px;border:1px solid #444;border-radius:4px;background:#171717;color:#F7F7F7;cursor:pointer;">Dark</button>
          </div>
          <div class="pro-reader-text" id="rd-text" style="padding:24px;overflow-y:auto;flex:1;font-family:Georgia,serif;line-height:1.75;font-size:16px;">
            <div class="pro-live-err">Loading book…</div>
          </div>
        </div>`;
      const chapterList = s.body.querySelector('[data-chapters]');
      const textEl = s.body.querySelector('#rd-text');
      const metaEl = s.body.querySelector('#rd-meta');
      let fontSize = 16;
      s.body.querySelector('#rd-font-dn')?.addEventListener('click', () => {
        fontSize = Math.max(12, fontSize - 2);
        textEl.style.fontSize = fontSize + 'px';
      });
      s.body.querySelector('#rd-font-up')?.addEventListener('click', () => {
        fontSize = Math.min(28, fontSize + 2);
        textEl.style.fontSize = fontSize + 'px';
      });
      s.body.querySelectorAll('.rd-theme-btn').forEach(b => {
        b.addEventListener('click', () => {
          const t = b.dataset.theme;
          if (t === 'sepia') {
            textEl.style.background = '#fbf0d9';
            textEl.style.color = '#433422';
          } else if (t === 'dark') {
            textEl.style.background = '#0A0A0A';
            textEl.style.color = '#EEEEEE';
          } else {
            textEl.style.background = '#ffffff';
            textEl.style.color = '#171717';
          }
        });
      });

      (async () => {
        const fflate = await load.fflate();
        const ep = parseEpub(fflate, await u8(file));
        const chapters = [];
        for (const id of ep.spine) {
          const it = ep.items[id];
          const html = it ? ep.readFile(it.href) : null;
          if (html) chapters.push({ id, name: strip(html).slice(0, 60) || it.href, html });
        }
        if (!chapters.length) { textEl.innerHTML = '<div class="pro-live-err">No readable chapters found in this EPUB.</div>'; return; }
        metaEl.innerHTML = `<strong>${esc(ep.meta('title') || file.name)}</strong><span>${esc(ep.meta('creator') || 'Unknown author')} · ${chapters.length} chapters</span>`;
        chapterList.innerHTML = chapters.map((c, i) => `<button type="button" class="pro-reader-chapter${i === 0 ? ' is-on' : ''}" data-i="${i}">${esc(c.name)}</button>`).join('');
        let current = 0;
        const show = (i) => {
          current = i;
          chapterList.querySelectorAll('.pro-reader-chapter').forEach((b, j) => b.classList.toggle('is-on', j === i));
          const paras = strip(chapters[i].html).split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
          textEl.innerHTML = paras.map(p => `<p style="margin-bottom:1.25em;text-indent:1.2em;text-align:justify;">${esc(p)}</p>`).join('');
          textEl.scrollTop = 0;
        };
        chapterList.addEventListener('click', (e) => { const b = e.target.closest('.pro-reader-chapter'); if (b) show(+b.dataset.i); });
        show(0);
        s.toolbar.innerHTML = `<span class="pro-dim">${esc(ep.meta('title') || file.name)}</span><span class="pro-live">Chapter 1 of ${chapters.length}</span>`;
        s.runBtn.addEventListener('click', () => { if (current < chapters.length - 1) { show(current + 1); s.toolbar.querySelector('.pro-live').textContent = `Chapter ${current + 1} of ${chapters.length}`; } });
      })();
    }

    function bodyChapters(file) {
      const s = frame(container, tool, { title: 'Chapter splitter', sub: 'Export each chapter as its own HTML file', action: 'Export chapters' });
      s.replaceBtn.addEventListener('click', () => reset());
      s.body.className = 'pro-body pro-simple-body';
      s.body.innerHTML = `<div class="pro-simple-stage"><div class="pro-arc-list" id="ch-list">Reading chapters…</div></div>
        <aside class="pro-panel"><div class="pro-panel-head"><strong>Chapters</strong><span id="ch-meta">—</span></div>
        <p class="pro-panel-note">Each chapter is exported as a standalone HTML file, bundled into a ZIP.</p></aside>`;
      let chapters = [];
      (async () => {
        const fflate = await load.fflate();
        const ep = parseEpub(fflate, await u8(file));
        for (const id of ep.spine) {
          const it = ep.items[id];
          const html = it ? ep.readFile(it.href) : null;
          if (html) chapters.push({ name: strip(html).slice(0, 60) || it.href, html });
        }
        const listEl = document.querySelector('#ch-list');
        if (!chapters.length) { listEl.innerHTML = '<div class="pro-live-err">No chapters found.</div>'; return; }
        listEl.innerHTML = chapters.map((c, i) => `<div class="pro-arc-file"><span class="pro-arc-type">${String(i + 1).padStart(2, '0')}</span><div class="pro-arc-meta"><strong>${esc(c.name)}</strong><span>${(c.html.length / 1024).toFixed(1)} KB</span></div></div>`).join('');
        document.querySelector('#ch-meta').textContent = chapters.length + ' chapters';
        s.toolbar.innerHTML = `<span class="pro-dim">${esc(ep.meta('title') || file.name)}</span><span class="pro-live">${chapters.length} chapters</span>`;
      })();
      s.runBtn.addEventListener('click', async () => {
        if (!chapters.length) return;
        setBusy(s, true, 'Exporting…');
        try {
          const fflate = await load.fflate();
          const map = {};
          chapters.forEach((c, i) => { map['chapter-' + String(i + 1).padStart(2, '0') + '.html'] = new TextEncoder().encode(c.html); });
          const zip = fflate.zipSync(map, { level: 6 });
          const blob = new Blob([zip], { type: 'application/zip' });
          resultBar(s, {
            ok: true,
            title: 'Chapters exported',
            msg: `${chapters.length} HTML files in chapters.zip`,
            blob,
            filename: 'chapters.zip',
            tool,
            actions: [{ label: 'Download', cls: 'etxt-btn-finish', ico: dlIco, onClick: () => download(blob, 'chapters.zip') }]
          });
        } catch (e) { resultBar(s, { ok: false, title: 'Could not export', msg: e.message }); }
        finally { setBusy(s, false); }
      });
    }

    function bodyCover(file) {
      const s = frame(container, tool, { title: 'Cover extractor', sub: 'Pull the cover image out of the EPUB', action: 'Download cover' });
      s.replaceBtn.addEventListener('click', () => reset());
      s.body.className = 'pro-body pro-simple-body';
      s.body.innerHTML = `<div class="pro-simple-stage"><div class="pro-cover"><img id="cv-img" alt="Book cover"><div class="pro-cover-empty" id="cv-empty">Extracting cover…</div></div></div>
        <aside class="pro-panel"><div class="pro-panel-head"><strong>Cover</strong><span id="cv-meta">—</span></div>
        <p class="pro-panel-note">The cover is the first image declared in the EPUB manifest — extracted locally.</p></aside>`;
      let coverBlob = null, coverName = 'cover.jpg';
      (async () => {
        try {
          const fflate = await load.fflate();
          const ep = parseEpub(fflate, await u8(file));
          let coverHref = null;
          for (const id in ep.items) if ((/cover/i.test(id) && /image/.test(ep.items[id].type)) || (ep.items[id].props || '').includes('cover-image')) { coverHref = ep.items[id].href; break; }
          if (!coverHref) { const first = Object.values(ep.items).find((it) => /image/.test(it.type)); coverHref = first && first.href; }
          if (!coverHref) throw new Error('No cover image found');
          const path = '/' + ep.base + coverHref.replace(/^\//, '');
          const data = ep.files[path];
          if (!data) throw new Error('Cover file missing');
          const ext = (coverHref.split('.').pop() || 'jpg').toLowerCase();
          coverName = 'cover.' + ext;
          coverBlob = new Blob([data], { type: ext === 'png' ? 'image/png' : 'image/jpeg' });
          document.querySelector('#cv-img').src = URL.createObjectURL(coverBlob);
          document.querySelector('#cv-img').hidden = false;
          document.querySelector('#cv-empty').hidden = true;
          document.querySelector('#cv-meta').textContent = `${ext.toUpperCase()} · ${bytes(data.length)}`;
          s.toolbar.innerHTML = `<span class="pro-dim">${esc(ep.meta('title') || file.name)}</span><span class="pro-live">Cover found</span>`;
        } catch (e) {
          document.querySelector('#cv-empty').textContent = e.message;
          document.querySelector('#cv-meta').textContent = 'No cover';
        }
      })();
      s.runBtn.addEventListener('click', () => {
        if (coverBlob) {
          resultBar(s, {
            ok: true,
            title: 'Cover exported',
            msg: `${coverName} · ${bytes(coverBlob.size)}`,
            blob: coverBlob,
            filename: coverName,
            tool,
            actions: [{ label: 'Download', cls: 'etxt-btn-finish', ico: dlIco, onClick: () => download(coverBlob, coverName) }]
          });
        }
      });
    }

    function bodyMetadata(file) {
      const s = frame(container, tool, { title: 'Metadata editor', sub: 'View and rewrite the book metadata', action: 'Repackage EPUB' });
      s.replaceBtn.addEventListener('click', () => reset());
      s.body.className = 'pro-body pro-simple-body';
      s.body.innerHTML = `<div class="pro-simple-stage"><div class="pro-font-card" id="md-info">Reading metadata…</div></div>
        <aside class="pro-panel"><div class="pro-panel-head"><strong>Rewrite</strong><span>Leave blank to keep</span></div>
        <div class="pro-control"><label><span>New title</span></label><input type="text" id="md-title" placeholder="Keep current"></div>
        <div class="pro-control"><label><span>New author</span></label><input type="text" id="md-author" placeholder="Keep current"></div></aside>`;
      let ep = null, fflate = null;
      (async () => {
        fflate = await load.fflate();
        ep = parseEpub(fflate, await u8(file));
        const rows = [
          ['Title', ep.meta('title') || '—'], ['Author', ep.meta('creator') || '—'], ['Language', ep.meta('language') || '—'], ['Identifier', ep.meta('identifier') || '—'],
        ].map(([k, v]) => `<div class="pro-live-row"><span>${k}</span><b>${esc(v)}</b></div>`).join('');
        document.querySelector('#md-info').innerHTML = rows;
        s.toolbar.innerHTML = `<span class="pro-dim">${esc(ep.meta('title') || file.name)}</span><span class="pro-live">Editable</span>`;
      })();
      s.runBtn.addEventListener('click', async () => {
        if (!ep) return;
        setBusy(s, true, 'Repackaging…');
        try {
          const title = document.querySelector('#md-title').value.trim();
          const author = document.querySelector('#md-author').value.trim();
          if (!title && !author) { resultBar(s, { ok: false, title: 'Nothing to change', msg: 'Enter a new title or author first' }); return; }
          let opfStr = ep.dec.decode(ep.files[ep.opfPath]);
          if (title) opfStr = opfStr.replace(/(<dc:title[^>]*>)[\s\S]*?(<\/dc:title>)/, `$1${title}$2`);
          if (author) opfStr = opfStr.replace(/(<dc:creator[^>]*>)[\s\S]*?(<\/dc:creator>)/, `$1${author}$2`);
          ep.files[ep.opfPath] = new TextEncoder().encode(opfStr);
          const zip = fflate.zipSync(ep.files, { level: 6 });
          const blob = new Blob([zip], { type: 'application/epub+zip' });
          const outName = `${baseName(file.name)}-edited.epub`;
          resultBar(s, {
            ok: true,
            title: 'EPUB repackaged',
            msg: `${outName} · ${bytes(blob.size)}`,
            blob,
            filename: outName,
            tool,
            actions: [{ label: 'Download', cls: 'etxt-btn-finish', ico: dlIco, onClick: () => download(blob, outName) }]
          });
        } catch (e) { resultBar(s, { ok: false, title: 'Could not repackage', msg: e.message }); }
        finally { setBusy(s, false); }
      });
    }

    function reset() {
      dropzone(container, tool, { accepts: ['epub'], multiple: false, headline: 'Drop your EPUB file here', meta: 'EPUB · 100% local' }).setOnFiles(async (list) => {
        const file = list[0];
        if (id === 'epub-reader') return bodyReader(file);
        if (id === 'epub-chapters') return bodyChapters(file);
        if (id === 'epub-cover') return bodyCover(file);
        bodyMetadata(file);
      });
    }
    function setBusy(s, busy, label) {
      if (s.runBtn) { s.runBtn.disabled = busy; if (label) s.runBtn.textContent = label; }
      s.body.setAttribute('aria-busy', String(busy));
    }
  }

  /* ═══════════════════════════════════════════════════════
     BUSINESS — GST invoice, POS billing, GST filing prep
  ═══════════════════════════════════════════════════════ */
  function mountBizPro(container, tool) {
    const id = tool.id;
    const money = (v) => '₹' + Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (id === 'gst-invoice') return bodyInvoice();
    if (id === 'pos-billing') return bodyPos();
    bodyFiling();

    function parseItems(str) {
      return String(str || '').split('\n').map(l => l.trim()).filter(Boolean).map(l => {
        const parts = l.split('|').map(s => s.trim());
        return { desc: parts[0] || 'Item', qty: +parts[1] || 1, rate: +parts[2] || 0 };
      });
    }

    function bodyInvoice() {
      const s = frame(container, tool, { title: 'GST invoice', sub: 'Build a GST-compliant invoice with CGST/SGST/IGST', action: 'Generate PDF' });
      s.replaceBtn.style.display = 'none';
      s.body.className = 'pro-body pro-live-body';
      s.body.innerHTML = `
        <div class="pro-live-in">
          <div class="pro-panel-head"><strong>Invoice details</strong><span>Live totals below</span></div>
          <div class="pro-controls">
            <div class="pro-control"><label><span>Business name</span></label><input type="text" id="inv-seller" value="Acme Traders Pvt Ltd"></div>
            <div class="pro-control"><label><span>GSTIN</span></label><input type="text" id="inv-gstin" value="27ABCDE1234F1Z5"></div>
            <div class="pro-control"><label><span>Customer</span></label><input type="text" id="inv-buyer" value="Walk-in Customer"></div>
            <div class="pro-control"><label><span>Invoice no.</span></label><input type="text" id="inv-no" value="INV-0001"></div>
            <div class="pro-control"><label><span>Items (Description | Qty | Rate)</span></label><textarea id="inv-items">Notebook | 5 | 40\nPen | 10 | 15\nDesk lamp | 2 | 1200</textarea></div>
            <div class="pro-live-grid">
              <div class="pro-control"><label><span>Tax type</span></label><select id="inv-type"><option value="intra">Intra-state (CGST+SGST)</option><option value="inter">Inter-state (IGST)</option></select></div>
              <div class="pro-control"><label><span>CGST %</span></label><input type="number" id="inv-cgst" value="9" min="0" max="20"></div>
              <div class="pro-control"><label><span>SGST %</span></label><input type="number" id="inv-sgst" value="9" min="0" max="20"></div>
            </div>
          </div>
        </div>
        <div class="pro-live-out"><div class="pro-live-card" id="inv-preview"></div></div>`;
      const render = () => {
        const items = parseItems(document.querySelector('#inv-items').value);
        const cgst = +document.querySelector('#inv-cgst').value || 0;
        const sgst = +document.querySelector('#inv-sgst').value || 0;
        const inter = document.querySelector('#inv-type').value === 'inter';
        const rows = items.map(it => ({ ...it, amt: it.qty * it.rate }));
        const taxable = rows.reduce((a, r) => a + r.amt, 0);
        const cg = taxable * cgst / 100, sgt = taxable * sgst / 100, ig = taxable * (cgst + sgst) / 100;
        const total = taxable + (inter ? ig : cg + sgt);
        const el = document.querySelector('#inv-preview');
        el.innerHTML = `
          <div class="pro-inv-head"><strong>${esc(document.querySelector('#inv-seller').value || 'Business')}</strong><span>GSTIN ${esc(document.querySelector('#inv-gstin').value || '—')}</span></div>
          <div class="pro-inv-billto">Bill to: <b>${esc(document.querySelector('#inv-buyer').value || '—')}</b> · ${esc(document.querySelector('#inv-no').value || '—')}</div>
          <div class="pro-inv-table"><div class="pro-inv-th"><span>Item</span><span>Qty</span><span>Rate</span><span>Amount</span></div>
          ${rows.map(r => `<div class="pro-inv-tr"><span>${esc(r.desc)}</span><span>${r.qty}</span><span>${money(r.rate)}</span><span>${money(r.amt)}</span></div>`).join('')}</div>
          <div class="pro-inv-totals">
            <div><span>Taxable value</span><b>${money(taxable)}</b></div>
            ${inter ? `<div><span>IGST (${cgst + sgst}%)</span><b>${money(ig)}</b></div>` : `<div><span>CGST (${cgst}%)</span><b>${money(cg)}</b></div><div><span>SGST (${sgst}%)</span><b>${money(sgt)}</b></div>`}
            <div class="pro-inv-grand"><span>Total</span><b>${money(total)}</b></div>
          </div>`;
      };
      s.body.querySelectorAll('input, textarea, select').forEach(el => el.addEventListener('input', render));
      render();
      s.toolbar.innerHTML = `<span class="pro-dim">${money(0)} preview</span><span class="pro-live">Live totals</span>`;
      s.runBtn.addEventListener('click', async () => {
        setBusy(s, true, 'Generating…');
        try {
          const inputs = {
            seller: document.querySelector('#inv-seller').value, sellerGstin: document.querySelector('#inv-gstin').value,
            buyer: document.querySelector('#inv-buyer').value, invNo: document.querySelector('#inv-no').value,
            items: document.querySelector('#inv-items').value, type: document.querySelector('#inv-type').value,
            cgst: document.querySelector('#inv-cgst').value, sgst: document.querySelector('#inv-sgst').value,
          };
          const out = await tool.run({ inputs });
          resultBar(s, {
            ok: true,
            title: 'Invoice generated',
            msg: `${out.filename} · ${bytes(out.blob.size)}`,
            blob: out.blob,
            filename: out.filename,
            tool,
            actions: [{ label: 'Download', cls: 'etxt-btn-finish', ico: dlIco, onClick: () => download(out.blob, out.filename) }]
          });
        } catch (e) { resultBar(s, { ok: false, title: 'Could not generate', msg: e.message }); }
        finally { setBusy(s, false); }
      });
    }

    function bodyPos() {
      const s = frame(container, tool, { title: 'POS billing', sub: 'Compact receipt-style bill for point of sale', action: 'Generate receipt' });
      s.replaceBtn.style.display = 'none';
      s.body.className = 'pro-body pro-live-body';
      s.body.innerHTML = `
        <div class="pro-live-in">
          <div class="pro-panel-head"><strong>Receipt details</strong><span>Live receipt below</span></div>
          <div class="pro-controls">
            <div class="pro-control"><label><span>Store name</span></label><input type="text" id="pos-store" value="QuickMart"></div>
            <div class="pro-control"><label><span>Receipt no.</span></label><input type="text" id="pos-no" value="R-1042"></div>
            <div class="pro-control"><label><span>Items (Description | Qty | Rate)</span></label><textarea id="pos-items">Coffee | 2 | 120\nSandwich | 1 | 180\nCookie | 3 | 40</textarea></div>
            <div class="pro-live-grid">
              <div class="pro-control"><label><span>Discount %</span></label><input type="number" id="pos-disc" value="0" min="0" max="100"></div>
              <div class="pro-control"><label><span>Tax %</span></label><input type="number" id="pos-tax" value="5" min="0" max="40"></div>
            </div>
          </div>
        </div>
        <div class="pro-live-out"><div class="pro-live-card"><pre class="pro-receipt" id="pos-preview"></pre></div></div>`;
      const render = () => {
        const items = parseItems(document.querySelector('#pos-items').value);
        const disc = +document.querySelector('#pos-disc').value || 0;
        const tax = +document.querySelector('#pos-tax').value || 0;
        const rows = items.map(it => ({ ...it, amt: it.qty * it.rate }));
        const sub = rows.reduce((a, r) => a + r.amt, 0);
        const dAmt = sub * disc / 100;
        const tAmt = (sub - dAmt) * tax / 100;
        const total = sub - dAmt + tAmt;
        const RULE = '--------------------------';
        const pad = (l, r) => (l + ' '.repeat(Math.max(1, 26 - l.length - r.length)) + r);
        const lines = [
          document.querySelector('#pos-store').value,
          RULE,
          'RECEIPT ' + document.querySelector('#pos-no').value,
          new Date().toLocaleString('en-IN'),
          RULE,
          ...rows.flatMap(r => [r.desc.slice(0, 26), pad(r.qty + ' x ' + money(r.rate), money(r.amt))]),
          RULE,
          pad('Subtotal', money(sub)),
          ...(disc ? [pad('Discount', '-' + money(dAmt))] : []),
          ...(tax ? [pad('Tax ' + tax + '%', money(tAmt))] : []),
          pad('TOTAL', money(total)),
          RULE,
          'Thank you for visiting!',
        ];
        document.querySelector('#pos-preview').textContent = lines.join('\n');
      };
      s.body.querySelectorAll('input, textarea').forEach(el => el.addEventListener('input', render));
      render();
      s.toolbar.innerHTML = `<span class="pro-dim">Receipt ${money(0)}</span><span class="pro-live">Live</span>`;
      s.runBtn.addEventListener('click', async () => {
        setBusy(s, true, 'Generating…');
        try {
          const inputs = {
            store: document.querySelector('#pos-store').value, receipt: document.querySelector('#pos-no').value,
            items: document.querySelector('#pos-items').value, discount: document.querySelector('#pos-disc').value,
            tax: document.querySelector('#pos-tax').value,
          };
          const out = await tool.run({ inputs });
          resultBar(s, {
            ok: true,
            title: 'Receipt generated',
            msg: `${out.filename} · ${bytes(out.blob.size)}`,
            blob: out.blob,
            filename: out.filename,
            tool,
            actions: [{ label: 'Download', cls: 'etxt-btn-finish', ico: dlIco, onClick: () => download(out.blob, out.filename) }]
          });
        } catch (e) { resultBar(s, { ok: false, title: 'Could not generate', msg: e.message }); }
        finally { setBusy(s, false); }
      });
    }

    function bodyFiling() {
      const start = async (file) => {
        const app = window.FF.app;
        if (app && app.updateSidebarForFileCategory) app.updateSidebarForFileCategory('Spreadsheets', file);
        const s = frame(container, tool, { title: 'GST filing prep', sub: 'Aggregate invoices into a GSTR-style summary', action: 'Export summary' });
        s.replaceBtn.addEventListener('click', () => {
          dropzone(container, tool, { accepts: ['csv', 'xlsx', 'xls'], multiple: false, headline: 'Drop your invoice CSV or Excel file', meta: 'CSV · XLSX · XLS · 100% local' }).setOnFiles((l) => start(l[0]));
        });
        s.body.className = 'pro-body pro-live-body';
        s.body.innerHTML = `<div class="pro-live-out" style="grid-column:1/-1"><div class="pro-live-card" id="filing-summary">Reading file…</div></div>`;
        s.toolbar.innerHTML = `<span class="pro-dim">${esc(file.name)} · ${bytes(file.size)}</span><span class="pro-live">Aggregating</span>`;
        const num = (v) => { const n = parseFloat(String(v).replace(/[^0-9.-]/g, '')); return isNaN(n) ? 0 : n; };
        let summary = null;
        try {
          let aoa, headers;
          if (/xlsx|xls/i.test(file.name)) {
            const XLSX = await load.xlsx();
            const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
            aoa = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' });
          } else {
            aoa = (await file.text()).split(/\r?\n/).map(l => l.split(','));
          }
          headers = (aoa[0] || []).map(h => String(h).trim().toLowerCase());
          const pick = (...names) => headers.findIndex(h => names.some(n => h.includes(n)));
          const iGstin = pick('gstin', 'gst', 'gst no'), iAmount = pick('amount', 'value', 'total', 'taxable', 'invoice value'), iRate = pick('rate', 'tax', 'gst%', 'cgst');
          const data = aoa.slice(1).filter(r => r.some(c => String(c).trim() !== ''));
          const byGstin = {};
          let taxable = 0;
          for (const row of data) {
            const gstin = iGstin >= 0 ? String(row[iGstin]).trim() : '(no GSTIN column)';
            const amt = iAmount >= 0 ? num(row[iAmount]) : 0;
            taxable += amt;
            byGstin[gstin] = (byGstin[gstin] || 0) + amt;
          }
          summary = { rows: data.length, gstins: Object.keys(byGstin).length, taxable, byGstin, hasAmount: iAmount >= 0 };
          const el = document.querySelector('#filing-summary');
          el.innerHTML = `
            <div class="pro-kpi-grid">
              <div class="pro-kpi"><b>${summary.rows}</b><span>Invoice rows</span></div>
              <div class="pro-kpi"><b>${summary.gstins}</b><span>Unique GSTINs</span></div>
              <div class="pro-kpi"><b>${money(summary.taxable)}</b><span>Taxable value</span></div>
            </div>
            <div class="pro-inv-table" style="margin-top:12px"><div class="pro-inv-th"><span>GSTIN</span><span>Taxable value</span></div>
            ${Object.entries(byGstin).slice(0, 10).map(([g, v]) => `<div class="pro-inv-tr"><span>${esc(g)}</span><span>${money(v)}</span></div>`).join('')}
            ${Object.keys(byGstin).length > 10 ? `<div class="pro-inv-tr"><span>+ ${Object.keys(byGstin).length - 10} more…</span><span></span></div>` : ''}</div>
            ${!summary.hasAmount ? '<div class="pro-live-err" style="margin-top:10px">No amount column found — check headers (amount / value / taxable)</div>' : ''}`;
          s.runBtn.addEventListener('click', async () => {
            setBusy(s, true, 'Building summary…');
            try {
              const out = await tool.run({ file, inputs: { output: 'csv', rate: 'auto' } });
              resultBar(s, {
                ok: true,
                title: 'Summary ready',
                msg: `${out.filename} · ${bytes(out.blob.size)}`,
                blob: out.blob,
                filename: out.filename,
                tool,
                actions: [{ label: 'Download', cls: 'etxt-btn-finish', ico: dlIco, onClick: () => download(out.blob, out.filename) }]
              });
            } catch (e) { resultBar(s, { ok: false, title: 'Could not build summary', msg: e.message }); }
            finally { setBusy(s, false); }
          });
        } catch (e) {
          document.querySelector('#filing-summary').innerHTML = `<div class="pro-live-err">Could not read file: ${esc(e.message)}</div>`;
        }
      };
      const dz = dropzone(container, tool, { accepts: ['csv', 'xlsx', 'xls'], multiple: false, headline: 'Drop your invoice CSV or Excel file', meta: 'CSV · XLSX · XLS · 100% local' });
      dz.setOnFiles((list) => start(list[0]));
    }
    function setBusy(s, busy, label) {
      if (s.runBtn) { s.runBtn.disabled = busy; if (label) s.runBtn.textContent = label; }
      s.body.setAttribute('aria-busy', String(busy));
    }
  }

  /* ═══════════════════════════════════════════════════════
     AUDIO — audiogram generator
  ═══════════════════════════════════════════════════════ */
  function mountAudPro(container, tool) {
    const start = async (file) => {
      const app = window.FF.app;
      if (app && app.updateSidebarForFileCategory) app.updateSidebarForFileCategory('Audio', file);
      const s = frame(container, tool, { title: 'Podcast audiogram', sub: 'Turn audio into a waveform video for social', action: 'Generate video' });
      s.replaceBtn.addEventListener('click', () => reset());
      s.body.className = 'pro-body pro-live-body';
      s.body.innerHTML = `
        <div class="pro-live-in">
          <div class="pro-panel-head"><strong>Audiogram settings</strong><span>Style · format · theme</span></div>
          <div class="pro-controls">
            <div class="pro-control"><label><span>Waveform</span></label><select id="ag-style"><option value="bars">Equalizer bars</option><option value="wave">Smooth sine wave</option><option value="circle">Radial pulse circle</option></select></div>
            <div class="pro-control"><label><span>Video format</span></label><select id="ag-aspect"><option value="1:1">1:1 Square (Instagram / LinkedIn)</option><option value="9:16">9:16 Vertical (Stories / Reels)</option><option value="16:9">16:9 Landscape (YouTube)</option></select></div>
            <div class="pro-control"><label><span>Theme</span></label><select id="ag-theme"><option value="indigo">Electric purple & indigo</option><option value="red">Crimson & charcoal</option><option value="green">Emerald & obsidian</option><option value="blue">Midnight & cyan</option></select></div>
            <div class="pro-control"><label><span>Caption</span></label><input type="text" id="ag-title" value="Daily Podcast — Episode Highlights"></div>
          </div>
        </div>
        <div class="pro-live-out"><div class="pro-live-card"><div class="pro-wave-stage"><canvas id="ag-wave" width="560" height="160"></canvas><div class="pro-wave-meta" id="ag-meta">Decoding audio…</div></div></div></div>`;
      s.toolbar.innerHTML = `<span class="pro-dim">${esc(file.name)} · ${bytes(file.size)}</span><span class="pro-live">Waveform live</span>`;
      (async () => {
        try {
          const ac = new (window.AudioContext || window.webkitAudioContext)();
          const buf = await ac.decodeAudioData(await file.arrayBuffer());
          const raw = buf.getChannelData(0);
          const c = document.querySelector('#ag-wave');
          const ctx = c.getContext('2d');
          const samples = 64;
          const block = Math.floor(raw.length / samples);
          const peaks = [];
          for (let i = 0; i < samples; i++) { let s = 0; for (let j = 0; j < block; j++) s += Math.abs(raw[i * block + j] || 0); peaks.push(s / block); }
          const draw = (style, theme) => {
            const themes = { indigo: ['#818CF8', '#C084FC'], red: ['#F87171', '#FB923C'], green: ['#34D399', '#A7F3D0'], blue: ['#38BDF8', '#7DD3FC'] };
            const [c1, c2] = themes[theme] || themes.indigo;
            ctx.clearRect(0, 0, c.width, c.height);
            if (style === 'circle') {
              const cx = c.width / 2, cy = c.height / 2, base = 20;
              peaks.forEach((p, i) => { const ang = (i / samples) * Math.PI * 2; const r = base + p * 55; ctx.strokeStyle = i % 2 ? c1 : c2; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx + Math.cos(ang) * base, cy + Math.sin(ang) * base); ctx.lineTo(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r); ctx.stroke(); });
            } else {
              const w = c.width / samples;
              peaks.forEach((p, i) => {
                const h = style === 'bars' ? Math.max(4, p * 130) : Math.max(3, p * 90);
                ctx.fillStyle = i % 2 ? c1 : c2;
                ctx.beginPath();
                if (style === 'bars') ctx.roundRect(i * w + 3, (c.height - h) / 2, w - 6, h, 4);
                else { const x = i * w + w / 2; ctx.moveTo(x, c.height / 2 + h / 2); ctx.quadraticCurveTo(x + 4, c.height / 2, x, c.height / 2 - h / 2); ctx.quadraticCurveTo(x - 4, c.height / 2, x, c.height / 2 + h / 2); }
                ctx.fill();
              });
            }
          };
          const dur = buf.duration;
          document.querySelector('#ag-meta').textContent = `${Math.floor(dur / 60)}:${String(Math.floor(dur % 60)).padStart(2, '0')} · ${buf.sampleRate / 1000} kHz · ${buf.numberOfChannels} ch`;
          const refresh = () => draw(document.querySelector('#ag-style').value, document.querySelector('#ag-theme').value);
          document.querySelector('#ag-style').addEventListener('change', refresh);
          document.querySelector('#ag-theme').addEventListener('change', refresh);
          refresh();
          s.runBtn.addEventListener('click', async () => {
            setBusy(s, true, 'Rendering frames…');
            try {
              const out = await tool.run({
                file, inputs: {
                  style: document.querySelector('#ag-style').value,
                  aspect: document.querySelector('#ag-aspect').value,
                  theme: document.querySelector('#ag-theme').value,
                  title: document.querySelector('#ag-title').value,
                },
                onProgress: (p, l) => setBusy(s, true, l || 'Rendering…'),
              });
              resultBar(s, {
                ok: true,
                title: 'Audiogram ready',
                msg: `${out.filename} · ${bytes(out.blob.size)}`,
                blob: out.blob,
                filename: out.filename,
                tool,
                actions: [{ label: 'Download', cls: 'etxt-btn-finish', ico: dlIco, onClick: () => download(out.blob, out.filename) }],
              });
            } catch (e) { resultBar(s, { ok: false, title: 'Could not render', msg: e.message }); }
            finally { setBusy(s, false); }
          });
        } catch (e) {
          document.querySelector('#ag-meta').textContent = 'Could not decode audio: ' + e.message;
        }
      })();
    };
    function reset() {
      dropzone(container, tool, { accepts: ['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg'], multiple: false, headline: 'Drop an audio clip or voice note', meta: 'MP3 · WAV · M4A · AAC · FLAC · OGG' }).setOnFiles((list) => start(list[0]));
    }
    const dz = dropzone(container, tool, { accepts: ['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg'], multiple: false, headline: 'Drop an audio clip or voice note', meta: 'MP3 · WAV · M4A · AAC · FLAC · OGG' });
    dz.setOnFiles((list) => start(list[0]));
    function setBusy(s, busy, label) {
      if (s.runBtn) { s.runBtn.disabled = busy; if (label) s.runBtn.textContent = label; }
      s.body.setAttribute('aria-busy', String(busy));
    }
  }

  /* ═══════════════════════════════════════════════════════
     SPREADSHEETS — CSV ↔ Excel (XLSX) with grid preview
  ═══════════════════════════════════════════════════════ */
  function mountSheetPro(container, tool) {
    const id = tool.id;
    const isToExcel = id === 'csv-to-excel';
    let wb = null;
    const ACC = isToExcel ? ['csv', 'tsv', 'txt'] : ['xlsx', 'xls', 'ods'];
    const META = isToExcel ? 'CSV · TSV · TXT — 100% local' : 'XLSX · XLS · ODS — 100% local';
    const HEAD = isToExcel ? 'Drop your CSV file here' : 'Drop your Excel file here';
    const XLSX_SRI = 'sha384-vtjasyidUo0kW94K5MXDXntzOJpQgBKXmE7e2Ga4LG0skTTLeBi97eFAXsqewJjw';

    const dz = dropzone(container, tool, { accepts: ACC, multiple: false, headline: HEAD, meta: META });
    dz.setOnFiles((list) => { const f = list[0]; if (f) start(f); });

    function reset() {
      dropzone(container, tool, { accepts: ACC, multiple: false, headline: HEAD, meta: META }).setOnFiles((list) => { const f = list[0]; if (f) start(f); });
    }

    function parseDelimited(text, delim) {
      const rows = [];
      for (const line of String(text || '').split(/\r?\n/)) {
        if (!line.trim()) continue;
        const out = []; let cur = ''; let inQ = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (ch === '"') { if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
          else if (ch === delim && !inQ) { out.push(cur); cur = ''; }
          else cur += ch;
        }
        out.push(cur);
        rows.push(out);
      }
      return rows;
    }

    function gridHtml(aoa, max = 60) {
      if (!aoa.length) return '<div class="pro-live-err">No data rows found in this file.</div>';
      const cols = Math.max(...aoa.slice(0, max).map(r => r.length));
      const head = Array.from({ length: cols }, (_, ci) => `<th>${esc((aoa[0] || [])[ci] ?? '')}</th>`).join('');
      const body = aoa.slice(1, max).map(r => `<tr>${Array.from({ length: cols }, (_, ci) => `<td>${esc(r[ci] ?? '')}</td>`).join('')}</tr>`).join('');
      return `<table class="pro-grid"><thead><tr>${head}</tr></thead><tbody>${body || `<tr><td colspan="${cols}" class="pro-grid-empty">Only a header row — no data rows yet.</td></tr>`}</tbody></table>`;
    }

    function setBusy(s, busy, label) {
      if (s.runBtn) { s.runBtn.disabled = busy; if (label) s.runBtn.textContent = label; }
      s.body.setAttribute('aria-busy', String(busy));
    }

    async function start(file) {
      if (isToExcel) return bodyCsvToExcel(file);
      bodyExcelToCsv(file);
    }

    function bodyCsvToExcel(file) {
      const s = frame(container, tool, { title: 'CSV → Excel', sub: 'Spreadsheet preview · convert to .xlsx', action: 'Convert to XLSX' });
      s.replaceBtn.addEventListener('click', () => reset());
      s.body.className = 'pro-body pro-sheet-body';
      s.body.innerHTML = `
        <div class="pro-sheet-stage"><div class="pro-sheet-card"><div class="pro-sheet-meta" id="pro-sheet-meta">Reading…</div><div class="pro-sheet-wrap" id="pro-sheet-wrap"></div></div></div>
        <aside class="pro-panel"><div class="pro-panel-head"><strong>CSV → Excel</strong><span>${esc(file.name)} · ${bytes(file.size)}</span></div>
        <div class="pro-control"><label><span>Delimiter</span></label><select data-k="delim"><option value=",">Comma ( , )</option><option value="\t">Tab</option><option value=";">Semicolon ( ; )</option></select></div>
        <div class="pro-control"><label><span>Sheet name</span></label><input type="text" data-k="sheet" value="Sheet1"></div>
        <p class="pro-panel-note">The first row becomes the header row in the workbook. Everything stays in your browser.</p></aside>`;
      let aoa = [];
      const render = async () => {
        const delim = s.body.querySelector('[data-k=delim]').value;
        aoa = parseDelimited(await file.text(), delim);
        s.body.querySelector('#pro-sheet-wrap').innerHTML = gridHtml(aoa);
        s.body.querySelector('#pro-sheet-meta').textContent = `${aoa.length} rows × ${aoa.reduce((m, r) => Math.max(m, r.length), 0)} cols — showing first ${Math.min(aoa.length, 60)}`;
      };
      s.body.querySelector('[data-k=delim]').addEventListener('change', render);
      render();
      s.toolbar.innerHTML = `<span class="pro-dim">${esc(file.name)}</span><span class="pro-live">Grid live</span>`;
      s.runBtn.addEventListener('click', async () => {
        setBusy(s, true, 'Converting…');
        try {
          const out = await tool.run({ file, inputs: { delimiter: s.body.querySelector('[data-k=delim]').value, sheetName: s.body.querySelector('[data-k=sheet]').value } });
          resultBar(s, {
            ok: true,
            title: 'XLSX ready',
            msg: `${out.filename} · ${bytes(out.blob.size)} · ${aoa.length} rows`,
            blob: out.blob,
            filename: out.filename,
            tool,
            actions: [{ label: 'Download', cls: 'etxt-btn-finish', ico: dlIco, onClick: () => download(out.blob, out.filename) }]
          });
        } catch (e) { resultBar(s, { ok: false, title: 'Could not convert', msg: e.message }); }
        finally { setBusy(s, false); }
      });
    }

    function bodyExcelToCsv(file) {
      const s = frame(container, tool, { title: 'Excel → CSV', sub: 'Sheet preview · convert to CSV', action: 'Convert to CSV' });
      s.replaceBtn.addEventListener('click', () => reset());
      s.body.className = 'pro-body pro-sheet-body';
      s.body.innerHTML = `
        <div class="pro-sheet-stage"><div class="pro-sheet-card"><div class="pro-sheet-meta" id="pro-sheet-meta">Reading workbook…</div><div class="pro-sheet-wrap" id="pro-sheet-wrap"></div></div></div>
        <aside class="pro-panel"><div class="pro-panel-head"><strong>Excel → CSV</strong><span>${esc(file.name)} · ${bytes(file.size)}</span></div>
        <div class="pro-control"><label><span>Sheet</span></label><select data-k="sheet"><option>Loading…</option></select></div>
        <div class="pro-control"><label><span>Delimiter</span></label><select data-k="delim"><option value=",">Comma ( , )</option><option value="\t">Tab</option><option value=";">Semicolon ( ; )</option></select></div>
        <p class="pro-panel-note">Only the selected sheet is converted. Cell values are read as text.</p></aside>`;
      const sheetSel = s.body.querySelector('[data-k=sheet]');
      const render = () => {
        const XLSX = window.XLSX;
        const idx = +sheetSel.value || 0;
        const aoa = (wb && XLSX) ? XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[idx]], { header: 1, raw: false }) : [];
        s.body.querySelector('#pro-sheet-wrap').innerHTML = gridHtml(aoa);
        s.body.querySelector('#pro-sheet-meta').textContent = wb ? `Sheet “${esc(wb.SheetNames[idx])}” · ${aoa.length} rows × ${aoa.reduce((m, r) => Math.max(m, r.length), 0)} cols` : 'Reading…';
      };
      (async () => {
        try {
          const XLSX = await window.FF.util.loadScript('vendor/xlsx.full.min.js', XLSX_SRI).then(() => window.XLSX);
          wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
          sheetSel.innerHTML = wb.SheetNames.map((n, i) => `<option value="${i}">${esc(n)}</option>`).join('');
          sheetSel.addEventListener('change', render);
          render();
          s.toolbar.innerHTML = `<span class="pro-dim">${esc(file.name)}</span><span class="pro-live">${wb.SheetNames.length} sheet${wb.SheetNames.length > 1 ? 's' : ''}</span>`;
        } catch (e) { s.body.querySelector('#pro-sheet-wrap').innerHTML = `<div class="pro-live-err">${esc('Could not read the workbook: ' + e.message)}</div>`; }
      })();
      s.runBtn.addEventListener('click', async () => {
        setBusy(s, true, 'Converting…');
        try {
          const out = await tool.run({ file, inputs: { sheet: (+sheetSel.value || 0) + 1, delimiter: s.body.querySelector('[data-k=delim]').value } });
          resultBar(s, {
            ok: true,
            title: 'CSV ready',
            msg: `${out.filename} · ${bytes(out.blob.size)}`,
            blob: out.blob,
            filename: out.filename,
            tool,
            actions: [{ label: 'Download', cls: 'etxt-btn-finish', ico: dlIco, onClick: () => download(out.blob, out.filename) }]
          });
        } catch (e) { resultBar(s, { ok: false, title: 'Could not convert', msg: e.message }); }
        finally { setBusy(s, false); }
      });
    }
  }

  /* ─── AI Background Remover (ISNet small via vendored onnxruntime) ─── */
  const BGR_ACC = ['png', 'jpg', 'jpeg', 'webp', 'bmp'];
  const BGR_MODEL = new URL('vendor/imgly/isnet_small.onnx', window.location.href).href;
  let bgrEngineP = null;
  let bgrOnProg = null;

  function loadBgrImage(src) {
    return new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = () => rej(new Error('Could not decode this image.'));
      im.src = src;
    });
  }

  async function fetchBgrModel() {
    const res = await fetch(BGR_MODEL);
    if (!res.ok) throw new Error('The AI model could not be downloaded.');
    const total = +res.headers.get('Content-Length') || 0;
    const reader = res.body.getReader();
    const chunks = [];
    let got = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      got += value.length;
      if (bgrOnProg && total) bgrOnProg(Math.min(0.92, got / total), 'Loading AI model');
    }
    const buf = new Uint8Array(got);
    let o = 0;
    for (const c of chunks) { buf.set(c, o); o += c.length; }
    return buf.buffer;
  }

  function loadBgrEngine() {
    if (!bgrEngineP) {
      bgrEngineP = (async () => {
        if (bgrOnProg) bgrOnProg(0.01, 'Loading AI engine');
        const ort = await import(new URL('vendor/ort.min.mjs', window.location.href).href);
        ort.env.wasm.wasmPaths = new URL('vendor/', window.location.href).href;
        const buf = await fetchBgrModel();
        if (bgrOnProg) bgrOnProg(0.96, 'Warming up the model');
        let session;
        try {
          const ep = (typeof navigator !== 'undefined' && navigator.gpu) ? ['webgpu', 'wasm'] : ['wasm'];
          session = await ort.InferenceSession.create(buf, { executionProviders: ep, graphOptimizationLevel: 'all' });
        } catch (gpuErr) {
          console.warn('[ONNX] WebGPU provider failed, falling back to WASM:', gpuErr);
          session = await ort.InferenceSession.create(buf, { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
        }
        if (bgrOnProg) bgrOnProg(1, 'Ready');
        return { ort, session };
      })().catch((e) => { bgrEngineP = null; throw e; });
    }
    return bgrEngineP;
  }

  /* imgly ISNet preprocessing: bilinear resize to size×size, mean 128 / std 256. */
  async function bgrInfer(engine, img, size) {
    const { ort, session } = engine;
    const c = document.createElement('canvas');
    c.width = size; c.height = size;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(img, 0, 0, size, size);
    const id = ctx.getImageData(0, 0, size, size).data;
    const N = size * size;
    const input = new Float32Array(3 * N);
    for (let i = 0; i < N; i++) {
      input[i] = (id[i * 4] - 128) / 256;
      input[N + i] = (id[i * 4 + 1] - 128) / 256;
      input[2 * N + i] = (id[i * 4 + 2] - 128) / 256;
    }
    const tensor = new ort.Tensor('float32', input, [1, 3, size, size]);
    const out = await session.run({ input: tensor });
    return out.output.data;
  }

  /* Apply the sigmoid mask to the full-res image, keeping existing alpha. */
  function bgrApplyMask(img, maskData) {
    const w = img.naturalWidth, h = img.naturalHeight;
    const out = document.createElement('canvas');
    out.width = w; out.height = h;
    const octx = out.getContext('2d');
    octx.drawImage(img, 0, 0);
    const px = octx.getImageData(0, 0, w, h);
    const m = Math.sqrt(maskData.length);
    const mc = document.createElement('canvas');
    mc.width = m; mc.height = m;
    const mctx = mc.getContext('2d');
    const mid = mctx.createImageData(m, m);
    const md = mid.data;
    for (let i = 0; i < m * m; i++) md[i * 4 + 3] = Math.max(0, Math.min(255, Math.round(maskData[i] * 255)));
    mctx.putImageData(mid, 0, 0);
    const scaled = document.createElement('canvas');
    scaled.width = w; scaled.height = h;
    const sctx = scaled.getContext('2d');
    sctx.imageSmoothingEnabled = true;
    sctx.drawImage(mc, 0, 0, w, h);
    const sm = sctx.getImageData(0, 0, w, h).data;
    for (let i = 0; i < w * h; i++) px.data[i * 4 + 3] = Math.round(px.data[i * 4 + 3] * (sm[i * 4 + 3] / 255));
    octx.putImageData(px, 0, 0);
    return out;
  }

  /* Shared engine entry — used by the workspace and the generic tool runner. */
  window.__ffBgRemoveCore = async (imgSrc, size = 640) => {
    const engine = await loadBgrEngine();
    const img = await loadBgrImage(imgSrc);
    const mask = await bgrInfer(engine, img, size);
    const canvas = bgrApplyMask(img, mask);
    return { canvas };
  };

  function mountBgRemovePro(container, tool) {
    const id = tool.id;
    const HEAD = 'Drop a photo to remove its background';
    const META = 'PNG · JPG · WEBP — processed on-device, nothing is uploaded';
    const dz = dropzone(container, tool, { accepts: BGR_ACC, multiple: false, headline: HEAD, meta: META });
    dz.setOnFiles((list) => { const f = list[0]; if (f) start(f); });

    function reset() {
      dropzone(container, tool, { accepts: BGR_ACC, multiple: false, headline: HEAD, meta: META }).setOnFiles((list) => { const f = list[0]; if (f) start(f); });
    }

    async function start(file) {
      const dataUrl = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(new Error('Could not read the image.')); r.readAsDataURL(file); });
      const img = await loadBgrImage(dataUrl);
      const s = frame(container, tool, { title: 'Background Remover', sub: 'On-device AI · review the mask, then download a transparent PNG', action: 'Remove background' });
      s.replaceBtn.addEventListener('click', () => reset());
      s.body.className = 'pro-body pro-bgr-body';
      s.body.innerHTML = `
        <div class="pro-bgr-stage">
          <div class="pro-bgr-card" data-ba>
            <img class="pro-bgr-out" src="${dataUrl}" alt="Result with transparent background">
            <img class="pro-bgr-orig" src="${dataUrl}" alt="Original">
            <div class="pro-ba-handle" data-ba-handle role="slider" tabindex="0" aria-label="Comparison slider" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50"><span class="pro-ba-grip">⟷</span></div>
            <div class="pro-ba-tag is-before">Original</div>
            <div class="pro-ba-tag is-after">Removed</div>
            <div class="pro-bgr-busy" data-pro-busy hidden><span class="pro-bgr-spin"></span><span data-pro-busy-txt>Running…</span></div>
          </div>
        </div>
        <aside class="pro-panel">
          <div class="pro-panel-head"><strong>On-device AI</strong><span>${esc(file.name)} · ${bytes(file.size)}</span></div>
          <div class="pro-control"><label><span>Engine</span></label><div class="pro-bgr-engine"><span class="pro-bgr-dot"></span>ISNet · 1024px · wasm</div></div>
          <p class="pro-panel-note">The model runs entirely in your browser — your photo never leaves this device. The ~44 MB model loads once and is then cached, so later runs are instant.</p>
        </aside>`;
      s.toolbar.innerHTML = `<span class="pro-dim">${esc(file.name)}</span><span class="pro-live">${img.naturalWidth}×${img.naturalHeight}px</span>`;

      /* Before/after comparison slider (Original left · Removed right). */
      const baCard = s.body.querySelector('[data-ba]');
      const handle = baCard.querySelector('[data-ba-handle]');
      const setPos = (clientX) => {
        const r = baCard.getBoundingClientRect();
        const pct = Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100));
        baCard.style.setProperty('--ba', Math.round(pct) + '%');
        handle.setAttribute('aria-valuenow', Math.round(pct));
      };
      handle.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        e.preventDefault();
        const cur = parseFloat(baCard.style.getPropertyValue('--ba')) || 50;
        const nv = Math.max(0, Math.min(100, cur + (e.key === 'ArrowLeft' ? -5 : 5)));
        baCard.style.setProperty('--ba', nv + '%');
        handle.setAttribute('aria-valuenow', nv);
      });
      handle.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        setPos(e.clientX);
        const mv = (ev) => setPos(ev.clientX);
        const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); };
        window.addEventListener('pointermove', mv);
        window.addEventListener('pointerup', up);
      });
      baCard.addEventListener('pointerdown', (e) => { if (!e.target.closest('[data-ba-handle]')) setPos(e.clientX); });

      let busy = false;
      const setStatus = (t) => {
        const p = s.body.querySelector('[data-pro-busy]');
        if (!p) return;
        p.hidden = !t;
        if (t) p.querySelector('[data-pro-busy-txt]').textContent = t;
      };

      s.runBtn.addEventListener('click', async () => {
        if (busy) return;
        busy = true;
        setStatus('Loading AI engine…');
        s.runBtn.disabled = true;
        bgrOnProg = (p, label) => setStatus(`${label} ${Math.round(p * 100)}%`);
        try {
          setStatus('Warming up the model…');
          const out = await window.__ffBgRemoveCore(dataUrl, 1024);
          bgrOnProg = null;
          const pngUrl = out.canvas.toDataURL('image/png');
          s.body.querySelector('.pro-bgr-out').src = pngUrl;
          s.toolbar.innerHTML = `<span class="pro-dim">${esc(file.name)}</span><span class="pro-live">Transparent PNG ready</span>`;
          const outBlob = await new Promise((res, rej) => out.canvas.toBlob((b) => b ? res(b) : rej(new Error('Could not encode PNG.')), 'image/png'));
          const outName = `${baseName(file.name)}-bg-removed.png`;
          resultBar(s, {
            ok: true, title: 'Background removed',
            msg: `${img.naturalWidth}×${img.naturalHeight}px → transparent PNG · processed on-device`,
            blob: outBlob,
            filename: outName,
            tool,
            actions: [{ label: 'Download PNG', cls: 'etxt-btn-finish', ico: dlIco, onClick: () => download(outBlob, outName) }],
          });
        } catch (e) {
          bgrOnProg = null;
          console.error('[BgRemover]', e);
          resultBar(s, { ok: false, title: 'Could not remove the background', msg: e.message });
        } finally {
          setStatus(null);
          s.runBtn.disabled = false;
          busy = false;
        }
      });
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     FILEKIT QR CODE STUDIO PRO — GOLD-STANDARD SIDERAIL WORKBENCH
     48px Unified Action Toolbar, 380px Inspector Rail & Dot-Matrix Stage
     ═══════════════════════════════════════════════════════════════════════════ */
  async function mountQrStudioPro(container, tool) {
    container.innerHTML = '';
    container.className = 'org-shell qr-studio-shell';

    const QRGEN = ['vendor/qrcode-generator.js', 'sha384-8FWZA6BGMXhsfO+BLtrJK0We6gg5o1JyO8xQm6peWDEUs17ACA5ziE/NIAkl9z2k'];
    await U.loadScript(...QRGEN);

    const state = {
      type: 'url',
      url: 'https://filekit.cc',
      wifi: { ssid: 'FileKit_Network', password: '', encryption: 'WPA', hidden: false },
      vcard: { firstName: 'Alex', lastName: 'Morgan', phone: '+1 555 234 5678', email: 'alex@example.com', company: 'FileKit Inc.', title: 'Lead Designer', url: 'https://filekit.cc' },
      email: { to: 'support@filekit.cc', subject: 'Inquiry', body: 'Hello FileKit Team,' },
      sms: { phone: '+1 555 019 2831', message: 'Hello from FileKit QR!' },
      text: 'FileKit — 100% Private Offline File Suite',
      fgColor: '#18181B',
      bgColor: '#FFFFFF',
      isTransparent: false,
      eyeStyle: 'square',
      dotStyle: 'square',
      ecc: 'M',
      margin: 3,
      logoDataUrl: null,
      logoImg: null,
      logoPreset: null,
      exportFormat: 'png',
      zoom: 100
    };

    const PRESET_SVGS = {
      link: `<svg viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>`,
      wifi: `<svg viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>`,
      star: `<svg viewBox="0 0 24 24" fill="#EAB308" stroke="#CA8A04" stroke-width="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
      whatsapp: `<svg viewBox="0 0 24 24" fill="#22C55E"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2z"/></svg>`,
      linkedin: `<svg viewBox="0 0 24 24" fill="#0A66C2"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.67 1.67 0 1 0 0-3.34 1.67 1.67 0 0 0 0 3.34m1.39 9.74v-8.37H5.07v8.37h2.78z"/></svg>`,
      github: `<svg viewBox="0 0 24 24" fill="#18181B"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>`,
      globe: `<svg viewBox="0 0 24 24" fill="none" stroke="#7C3AED" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`
    };

    function svgToDataUrl(svgString) {
      return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
    }

    function getPayload() {
      switch (state.type) {
        case 'url': {
          let u = (state.url || '').trim();
          if (!u) return 'https://filekit.cc';
          if (!/^https?:\/\//i.test(u) && !/^mailto:/i.test(u)) u = 'https://' + u;
          return u;
        }
        case 'wifi': {
          const enc = state.wifi.encryption || 'WPA';
          const s = state.wifi.ssid || 'Network';
          const p = state.wifi.password || '';
          const h = state.wifi.hidden ? 'H:true;' : '';
          return `WIFI:T:${enc};S:${s};P:${p};${h};`;
        }
        case 'vcard': {
          const fn = `${state.vcard.firstName || ''} ${state.vcard.lastName || ''}`.trim() || 'Contact';
          return [
            'BEGIN:VCARD',
            'VERSION:3.0',
            `N:${state.vcard.lastName || ''};${state.vcard.firstName || ''};;;`,
            `FN:${fn}`,
            state.vcard.company ? `ORG:${state.vcard.company}` : '',
            state.vcard.title ? `TITLE:${state.vcard.title}` : '',
            state.vcard.phone ? `TEL:${state.vcard.phone}` : '',
            state.vcard.email ? `EMAIL:${state.vcard.email}` : '',
            state.vcard.url ? `URL:${state.vcard.url}` : '',
            'END:VCARD'
          ].filter(Boolean).join('\n');
        }
        case 'email': {
          const to = state.email.to || '';
          const sub = encodeURIComponent(state.email.subject || '');
          const body = encodeURIComponent(state.email.body || '');
          return `mailto:${to}?subject=${sub}&body=${body}`;
        }
        case 'sms': {
          const ph = state.sms.phone || '';
          const msg = state.sms.message || '';
          return `SMSTO:${ph}:${msg}`;
        }
        case 'text':
        default:
          return state.text || 'FileKit — Every file task. One private toolkit.';
      }
    }

    function getContrastRatio(hex1, hex2) {
      function getLuminance(hex) {
        if (!hex || hex === 'transparent') return 1;
        const c = hex.replace('#', '');
        const r = parseInt(c.substr(0, 2), 16) / 255;
        const g = parseInt(c.substr(2, 2), 16) / 255;
        const b = parseInt(c.substr(4, 2), 16) / 255;
        const a = [r, g, b].map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
        return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
      }
      const l1 = getLuminance(hex1) + 0.05;
      const l2 = getLuminance(hex2) + 0.05;
      return l1 > l2 ? l1 / l2 : l2 / l1;
    }

    container.innerHTML = `
      <header class="org-unified-toolbar qr-unified-toolbar">
        <div class="org-toolbar-left qr-toolbar-left">
          <div class="qr-brand-wrap">
            <span class="qr-brand-icon">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>
                <rect x="14" y="14" width="3" height="3"/><rect x="18" y="14" width="3" height="3"/><rect x="14" y="18" width="3" height="3"/><rect x="18" y="18" width="3" height="3"/>
              </svg>
            </span>
            <strong class="qr-brand-title">QR Code Studio Pro</strong>
            <span class="qr-security-badge" title="Zero network requests. Everything runs locally in browser.">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              100% Private
            </span>
          </div>
          <button type="button" class="org-btn-add-files qr-btn-reset" id="qr-reset-btn" title="Reset all settings to defaults">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            <span>Reset</span>
          </button>
        </div>

        <div class="org-toolbar-center qr-toolbar-center">
          <div class="org-segmented-modes qr-type-segmented" role="tablist">
            <button type="button" class="org-mode-tab qr-type-tab is-active" data-type="url"><span class="qr-tab-ico">🔗</span><span>URL</span></button>
            <button type="button" class="org-mode-tab qr-type-tab" data-type="wifi"><span class="qr-tab-ico">📶</span><span>Wi-Fi</span></button>
            <button type="button" class="org-mode-tab qr-type-tab" data-type="vcard"><span class="qr-tab-ico">👤</span><span>vCard</span></button>
            <button type="button" class="org-mode-tab qr-type-tab" data-type="email"><span class="qr-tab-ico">✉️</span><span>Email</span></button>
            <button type="button" class="org-mode-tab qr-type-tab" data-type="sms"><span class="qr-tab-ico">💬</span><span>SMS</span></button>
            <button type="button" class="org-mode-tab qr-type-tab" data-type="text"><span class="qr-tab-ico">📝</span><span>Text</span></button>
          </div>
        </div>

        <div class="org-toolbar-right qr-toolbar-right">
          <div class="qr-scannability-chip is-good" id="qr-scannability-chip" title="Real-time WCAG contrast calculation">
            <span class="scannability-dot"></span>
            <span class="scannability-text">100% Scannable</span>
          </div>

          <div class="org-segmented-modes org-segmented-mini qr-fmt-segmented">
            <button type="button" class="org-mode-tab qr-fmt-tab is-active" data-fmt="png">PNG</button>
            <button type="button" class="org-mode-tab qr-fmt-tab" data-fmt="svg">SVG</button>
          </div>

          <button type="button" class="etxt-btn-finish qr-primary-cta" id="qr-download-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span id="qr-download-btn-text">Download QR</span>
          </button>
        </div>
      </header>

      <div class="qr-studio-stage">
        <!-- Left Inspector Rail (380px) -->
        <aside class="qr-inspector-rail">
          <!-- Section 1: Content Payload -->
          <div class="qr-rail-section">
            <div class="pro-panel-subhead">Content Payload</div>
            <div class="qr-dynamic-form" id="qr-dynamic-form"></div>
          </div>

          <!-- Section 2: Colors & Contrast -->
          <div class="qr-rail-section">
            <div class="pro-panel-subhead">Colors &amp; Palette</div>
            <div class="qr-color-controls">
              <div class="qr-color-row">
                <label class="qr-label-mini">Foreground</label>
                <div class="qr-color-input-wrap">
                  <input type="color" id="qr-fg-color" value="#18181B">
                  <span class="qr-hex-label" id="qr-fg-hex">#18181B</span>
                </div>
              </div>
              <div class="qr-swatches-grid" id="qr-fg-swatches">
                <button type="button" class="qr-swatch-dot is-active" data-color="#18181B" style="background:#18181B;" title="Obsidian Slate"></button>
                <button type="button" class="qr-swatch-dot" data-color="#00B0FF" style="background:#00B0FF;" title="Electric Cyan"></button>
                <button type="button" class="qr-swatch-dot" data-color="#10B981" style="background:#10B981;" title="Emerald Green"></button>
                <button type="button" class="qr-swatch-dot" data-color="#7C3AED" style="background:#7C3AED;" title="Royal Purple"></button>
                <button type="button" class="qr-swatch-dot" data-color="#F43F5E" style="background:#F43F5E;" title="Sunset Rose"></button>
                <button type="button" class="qr-swatch-dot" data-color="#D97706" style="background:#D97706;" title="Amber Gold"></button>
              </div>

              <div class="qr-color-row" style="margin-top: 12px;">
                <label class="qr-label-mini">Background</label>
                <div class="qr-color-input-wrap">
                  <input type="color" id="qr-bg-color" value="#FFFFFF">
                  <span class="qr-hex-label" id="qr-bg-hex">#FFFFFF</span>
                </div>
              </div>
              <label class="qr-checkbox-row">
                <input type="checkbox" id="qr-trans-bg">
                <span>Transparent Background (PNG/SVG)</span>
              </label>
            </div>
          </div>

          <!-- Section 3: Pattern & Eye Geometry -->
          <div class="qr-rail-section">
            <div class="pro-panel-subhead">Pattern &amp; Eye Geometry</div>
            <div class="qr-shape-controls">
              <label class="qr-label-mini">Corner Eye Shape</label>
              <div class="qr-pill-selector" id="qr-eye-styles">
                <button type="button" class="qr-shape-pill is-active" data-eye="square">Square</button>
                <button type="button" class="qr-shape-pill" data-eye="rounded">Soft Round</button>
                <button type="button" class="qr-shape-pill" data-eye="circle">Bullseye</button>
              </div>

              <label class="qr-label-mini" style="margin-top: 12px;">Body Module Shape</label>
              <div class="qr-pill-selector" id="qr-dot-styles">
                <button type="button" class="qr-shape-pill is-active" data-dot="square">Sharp Square</button>
                <button type="button" class="qr-shape-pill" data-dot="dots">Circular Dots</button>
                <button type="button" class="qr-shape-pill" data-dot="rounded">Rounded</button>
              </div>
            </div>
          </div>

          <!-- Section 4: Logo & Badges -->
          <div class="qr-rail-section">
            <div class="pro-panel-subhead">Logo &amp; Center Badge</div>
            <div class="qr-logo-controls">
              <input type="file" id="qr-logo-file" accept="image/png,image/jpeg,image/svg+xml,image/webp" hidden>
              <div class="qr-logo-btn-row">
                <button type="button" class="org-btn-add-files qr-btn-upload-logo" id="qr-upload-btn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  <span>Upload Custom Logo</span>
                </button>
                <button type="button" class="qr-btn-remove-logo" id="qr-clear-logo" hidden title="Remove Logo">✕</button>
              </div>

              <div class="qr-preset-badges-wrap">
                <span class="qr-badges-sublabel">Or pick standard badge:</span>
                <div class="qr-badges-flex" id="qr-badge-list">
                  <button type="button" class="qr-badge-pill" data-badge="link" title="Link">🔗</button>
                  <button type="button" class="qr-badge-pill" data-badge="wifi" title="Wi-Fi">📶</button>
                  <button type="button" class="qr-badge-pill" data-badge="star" title="Star">⭐</button>
                  <button type="button" class="qr-badge-pill" data-badge="whatsapp" title="WhatsApp">💬</button>
                  <button type="button" class="qr-badge-pill" data-badge="linkedin" title="LinkedIn">💼</button>
                  <button type="button" class="qr-badge-pill" data-badge="github" title="GitHub">💻</button>
                  <button type="button" class="qr-badge-pill" data-badge="globe" title="Globe">🌐</button>
                </div>
              </div>
            </div>
          </div>

          <!-- Section 5: Advanced Margins & ECC -->
          <div class="qr-rail-section">
            <div class="pro-panel-subhead">Precision &amp; Error Correction</div>
            <div class="qr-adv-controls">
              <div class="qr-control-row">
                <label class="qr-label-mini">Error Correction</label>
                <select class="qr-select-depth" id="qr-ecc-select">
                  <option value="L">Low (7% recovery)</option>
                  <option value="M" selected>Medium (15% recovery)</option>
                  <option value="Q">Quartile (25% recovery)</option>
                  <option value="H">High (30% recovery — Safe for Logos)</option>
                </select>
              </div>
              <div class="qr-control-row" style="margin-top: 10px;">
                <div class="qr-slider-header">
                  <label class="qr-label-mini">Quiet Zone Margin</label>
                  <span class="qr-slider-badge" id="qr-margin-val">3 modules</span>
                </div>
                <input type="range" class="qr-range-slider" id="qr-margin-slider" min="0" max="6" value="3">
              </div>
            </div>
          </div>
        </aside>

        <!-- Center Stage: Dot Matrix Stage with Floating Paper Card -->
        <main class="qr-canvas-stage">
          <div class="qr-paper-card" id="qr-paper-card">
            <div class="qr-paper-inner">
              <canvas id="qr-stage-canvas" width="360" height="360"></canvas>
            </div>
            <div class="qr-card-meta">
              <span class="qr-meta-payload" id="qr-info-payload">https://filekit.cc</span>
              <span class="qr-meta-dot">•</span>
              <span class="qr-meta-ecc" id="qr-info-ecc">ECC: Level M (15%)</span>
            </div>
          </div>

          <!-- Floating Canvas Bottom Dock -->
          <div class="qr-floating-dock">
            <div class="qr-dock-zoom">
              <button type="button" class="qr-dock-btn" id="qr-zoom-out" title="Zoom Out">−</button>
              <span class="qr-dock-zoom-val" id="qr-zoom-val">100%</span>
              <button type="button" class="qr-dock-btn" id="qr-zoom-in" title="Zoom In">+</button>
            </div>
            <span class="qr-dock-sep"></span>
            <button type="button" class="qr-dock-btn qr-dock-action" id="qr-copy-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              <span id="qr-copy-label">Copy Image</span>
            </button>
            <button type="button" class="qr-dock-btn qr-dock-action" id="qr-print-btn" title="Print QR Code">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              <span>Print</span>
            </button>
          </div>
        </main>
      </div>`;

    const canvas = container.querySelector('#qr-stage-canvas');
    const paperCard = container.querySelector('#qr-paper-card');
    const dynamicForm = container.querySelector('#qr-dynamic-form');
    const contrastChip = container.querySelector('#qr-scannability-chip');
    const payloadEl = container.querySelector('#qr-info-payload');
    const eccInfoEl = container.querySelector('#qr-info-ecc');

    // Dynamic Form Builder
    function renderDynamicForm() {
      if (state.type === 'url') {
        dynamicForm.innerHTML = `
          <div class="qr-form-field">
            <label>Destination Website URL</label>
            <div class="qr-input-prefix-wrap">
              <span class="qr-prefix-ico">🌐</span>
              <input type="text" id="qr-input-url" class="qr-input-text" placeholder="https://yourwebsite.com" value="${esc(state.url)}">
            </div>
          </div>`;
        const urlInput = dynamicForm.querySelector('#qr-input-url');
        urlInput.addEventListener('input', () => { state.url = urlInput.value; draw(); });
      } else if (state.type === 'wifi') {
        dynamicForm.innerHTML = `
          <div class="qr-form-field">
            <label>Network Name (SSID)</label>
            <input type="text" id="qr-wifi-ssid" class="qr-input-text" placeholder="e.g. Office_5G" value="${esc(state.wifi.ssid)}">
          </div>
          <div class="qr-form-field" style="margin-top:8px;">
            <label>Wi-Fi Password</label>
            <input type="text" id="qr-wifi-pass" class="qr-input-text" placeholder="Password (leave blank if open)" value="${esc(state.wifi.password)}">
          </div>
          <div class="qr-form-row-2" style="margin-top:8px;">
            <div class="qr-form-field">
              <label>Security</label>
              <select id="qr-wifi-enc" class="qr-select-depth">
                <option value="WPA" ${state.wifi.encryption === 'WPA' ? 'selected' : ''}>WPA/WPA2/WPA3</option>
                <option value="WEP" ${state.wifi.encryption === 'WEP' ? 'selected' : ''}>WEP</option>
                <option value="nopass" ${state.wifi.encryption === 'nopass' ? 'selected' : ''}>Open (No password)</option>
              </select>
            </div>
            <label class="qr-checkbox-row" style="margin-top: 22px;">
              <input type="checkbox" id="qr-wifi-hidden" ${state.wifi.hidden ? 'checked' : ''}>
              <span>Hidden SSID</span>
            </label>
          </div>`;
        dynamicForm.querySelector('#qr-wifi-ssid').addEventListener('input', (e) => { state.wifi.ssid = e.target.value; draw(); });
        dynamicForm.querySelector('#qr-wifi-pass').addEventListener('input', (e) => { state.wifi.password = e.target.value; draw(); });
        dynamicForm.querySelector('#qr-wifi-enc').addEventListener('change', (e) => { state.wifi.encryption = e.target.value; draw(); });
        dynamicForm.querySelector('#qr-wifi-hidden').addEventListener('change', (e) => { state.wifi.hidden = e.target.checked; draw(); });
      } else if (state.type === 'vcard') {
        dynamicForm.innerHTML = `
          <div class="qr-form-row-2">
            <div class="qr-form-field">
              <label>First Name</label>
              <input type="text" id="qr-vc-fn" class="qr-input-text" value="${esc(state.vcard.firstName)}">
            </div>
            <div class="qr-form-field">
              <label>Last Name</label>
              <input type="text" id="qr-vc-ln" class="qr-input-text" value="${esc(state.vcard.lastName)}">
            </div>
          </div>
          <div class="qr-form-field" style="margin-top:8px;">
            <label>Phone Number</label>
            <input type="tel" id="qr-vc-phone" class="qr-input-text" placeholder="+1 555 019 2831" value="${esc(state.vcard.phone)}">
          </div>
          <div class="qr-form-field" style="margin-top:8px;">
            <label>Email Address</label>
            <input type="email" id="qr-vc-email" class="qr-input-text" placeholder="name@company.com" value="${esc(state.vcard.email)}">
          </div>
          <div class="qr-form-row-2" style="margin-top:8px;">
            <div class="qr-form-field">
              <label>Company</label>
              <input type="text" id="qr-vc-org" class="qr-input-text" value="${esc(state.vcard.company)}">
            </div>
            <div class="qr-form-field">
              <label>Job Title</label>
              <input type="text" id="qr-vc-title" class="qr-input-text" value="${esc(state.vcard.title)}">
            </div>
          </div>
          <div class="qr-form-field" style="margin-top:8px;">
            <label>Website / Portfolio URL</label>
            <input type="url" id="qr-vc-url" class="qr-input-text" value="${esc(state.vcard.url)}">
          </div>`;
        dynamicForm.querySelector('#qr-vc-fn').addEventListener('input', (e) => { state.vcard.firstName = e.target.value; draw(); });
        dynamicForm.querySelector('#qr-vc-ln').addEventListener('input', (e) => { state.vcard.lastName = e.target.value; draw(); });
        dynamicForm.querySelector('#qr-vc-phone').addEventListener('input', (e) => { state.vcard.phone = e.target.value; draw(); });
        dynamicForm.querySelector('#qr-vc-email').addEventListener('input', (e) => { state.vcard.email = e.target.value; draw(); });
        dynamicForm.querySelector('#qr-vc-org').addEventListener('input', (e) => { state.vcard.company = e.target.value; draw(); });
        dynamicForm.querySelector('#qr-vc-title').addEventListener('input', (e) => { state.vcard.title = e.target.value; draw(); });
        dynamicForm.querySelector('#qr-vc-url').addEventListener('input', (e) => { state.vcard.url = e.target.value; draw(); });
      } else if (state.type === 'email') {
        dynamicForm.innerHTML = `
          <div class="qr-form-field">
            <label>Recipient Email</label>
            <input type="email" id="qr-em-to" class="qr-input-text" placeholder="support@filekit.cc" value="${esc(state.email.to)}">
          </div>
          <div class="qr-form-field" style="margin-top:8px;">
            <label>Subject Line</label>
            <input type="text" id="qr-em-sub" class="qr-input-text" placeholder="Partnership Inquiry" value="${esc(state.email.subject)}">
          </div>
          <div class="qr-form-field" style="margin-top:8px;">
            <label>Prefilled Email Message</label>
            <textarea id="qr-em-body" class="qr-textarea-depth" rows="3" placeholder="Hello...">${esc(state.email.body)}</textarea>
          </div>`;
        dynamicForm.querySelector('#qr-em-to').addEventListener('input', (e) => { state.email.to = e.target.value; draw(); });
        dynamicForm.querySelector('#qr-em-sub').addEventListener('input', (e) => { state.email.subject = e.target.value; draw(); });
        dynamicForm.querySelector('#qr-em-body').addEventListener('input', (e) => { state.email.body = e.target.value; draw(); });
      } else if (state.type === 'sms') {
        dynamicForm.innerHTML = `
          <div class="qr-form-field">
            <label>Phone Number</label>
            <input type="tel" id="qr-sms-phone" class="qr-input-text" placeholder="+1 555 019 2831" value="${esc(state.sms.phone)}">
          </div>
          <div class="qr-form-field" style="margin-top:8px;">
            <label>SMS Text Message</label>
            <textarea id="qr-sms-msg" class="qr-textarea-depth" rows="3" placeholder="Hello from FileKit QR!">${esc(state.sms.message)}</textarea>
          </div>`;
        dynamicForm.querySelector('#qr-sms-phone').addEventListener('input', (e) => { state.sms.phone = e.target.value; draw(); });
        dynamicForm.querySelector('#qr-sms-msg').addEventListener('input', (e) => { state.sms.message = e.target.value; draw(); });
      } else if (state.type === 'text') {
        dynamicForm.innerHTML = `
          <div class="qr-form-field">
            <label>Plain Text / Notes</label>
            <textarea id="qr-plain-text" class="qr-textarea-depth" rows="4" placeholder="Enter any text payload...">${esc(state.text)}</textarea>
          </div>`;
        dynamicForm.querySelector('#qr-plain-text').addEventListener('input', (e) => { state.text = e.target.value; draw(); });
      }
    }

    renderDynamicForm();

    // Type Tabs
    const typeTabs = container.querySelectorAll('.qr-type-tab');
    typeTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        typeTabs.forEach(t => t.classList.remove('is-active'));
        tab.classList.add('is-active');
        state.type = tab.dataset.type;
        renderDynamicForm();
        draw();
      });
    });

    // Foreground Color & Swatches
    const fgInput = container.querySelector('#qr-fg-color');
    const fgHex = container.querySelector('#qr-fg-hex');
    const fgSwatches = container.querySelectorAll('.qr-swatch-dot');
    fgInput.addEventListener('input', () => {
      state.fgColor = fgInput.value;
      fgHex.textContent = state.fgColor.toUpperCase();
      fgSwatches.forEach(s => s.classList.toggle('is-active', s.dataset.color.toLowerCase() === state.fgColor.toLowerCase()));
      draw();
    });
    fgSwatches.forEach(swatch => {
      swatch.addEventListener('click', () => {
        fgSwatches.forEach(s => s.classList.remove('is-active'));
        swatch.classList.add('is-active');
        state.fgColor = swatch.dataset.color;
        fgInput.value = state.fgColor;
        fgHex.textContent = state.fgColor.toUpperCase();
        draw();
      });
    });

    // Background Color & Trans
    const bgInput = container.querySelector('#qr-bg-color');
    const bgHex = container.querySelector('#qr-bg-hex');
    const transBg = container.querySelector('#qr-trans-bg');
    bgInput.addEventListener('input', () => {
      state.bgColor = bgInput.value;
      bgHex.textContent = state.bgColor.toUpperCase();
      draw();
    });
    transBg.addEventListener('change', () => {
      state.isTransparent = transBg.checked;
      bgInput.disabled = state.isTransparent;
      draw();
    });

    // Shape Pill Pickers
    const eyePills = container.querySelectorAll('#qr-eye-styles .qr-shape-pill');
    eyePills.forEach(pill => {
      pill.addEventListener('click', () => {
        eyePills.forEach(p => p.classList.remove('is-active'));
        pill.classList.add('is-active');
        state.eyeStyle = pill.dataset.eye;
        draw();
      });
    });

    const dotPills = container.querySelectorAll('#qr-dot-styles .qr-shape-pill');
    dotPills.forEach(pill => {
      pill.addEventListener('click', () => {
        dotPills.forEach(p => p.classList.remove('is-active'));
        pill.classList.add('is-active');
        state.dotStyle = pill.dataset.dot;
        draw();
      });
    });

    // Logo Upload & Badges
    const logoFileInput = container.querySelector('#qr-logo-file');
    const uploadBtn = container.querySelector('#qr-upload-btn');
    const clearLogoBtn = container.querySelector('#qr-clear-logo');
    const badgeBtns = container.querySelectorAll('.qr-badge-pill');

    uploadBtn.addEventListener('click', () => logoFileInput.click());
    logoFileInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        const dataUrl = evt.target.result;
        state.logoDataUrl = dataUrl;
        const im = new Image();
        im.onload = () => {
          state.logoImg = im;
          state.ecc = 'H'; // Auto safe high ECC for logo scannability
          eccSelect.value = 'H';
          clearLogoBtn.hidden = false;
          badgeBtns.forEach(b => b.classList.remove('is-active'));
          draw();
        };
        im.src = dataUrl;
      };
      reader.readAsDataURL(file);
    });

    clearLogoBtn.addEventListener('click', () => {
      state.logoDataUrl = null;
      state.logoImg = null;
      state.logoPreset = null;
      clearLogoBtn.hidden = true;
      logoFileInput.value = '';
      badgeBtns.forEach(b => b.classList.remove('is-active'));
      draw();
    });

    badgeBtns.forEach(badge => {
      badge.addEventListener('click', () => {
        const bType = badge.dataset.badge;
        badgeBtns.forEach(b => b.classList.remove('is-active'));
        badge.classList.add('is-active');
        state.logoPreset = bType;
        const svgStr = PRESET_SVGS[bType];
        if (svgStr) {
          const dataUrl = svgToDataUrl(svgStr);
          state.logoDataUrl = dataUrl;
          const im = new Image();
          im.onload = () => {
            state.logoImg = im;
            state.ecc = 'H';
            eccSelect.value = 'H';
            clearLogoBtn.hidden = false;
            draw();
          };
          im.src = dataUrl;
        }
      });
    });

    // Margin & ECC
    const eccSelect = container.querySelector('#qr-ecc-select');
    const marginSlider = container.querySelector('#qr-margin-slider');
    const marginVal = container.querySelector('#qr-margin-val');

    eccSelect.addEventListener('change', () => {
      state.ecc = eccSelect.value;
      draw();
    });
    marginSlider.addEventListener('input', () => {
      state.margin = parseInt(marginSlider.value, 10) || 0;
      marginVal.textContent = `${state.margin} modules`;
      draw();
    });

    // Format Segmented Toggle
    const fmtTabs = container.querySelectorAll('.qr-fmt-tab');
    const dlBtnText = container.querySelector('#qr-download-btn-text');
    fmtTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        fmtTabs.forEach(t => t.classList.remove('is-active'));
        tab.classList.add('is-active');
        state.exportFormat = tab.dataset.fmt;
        dlBtnText.textContent = state.exportFormat === 'svg' ? 'Download SVG' : 'Download PNG';
      });
    });

    // Zoom Controls
    const zoomInBtn = container.querySelector('#qr-zoom-in');
    const zoomOutBtn = container.querySelector('#qr-zoom-out');
    const zoomValEl = container.querySelector('#qr-zoom-val');

    function updateZoom(delta) {
      state.zoom = Math.max(50, Math.min(200, state.zoom + delta));
      zoomValEl.textContent = `${state.zoom}%`;
      canvas.style.transform = `scale(${state.zoom / 100})`;
    }
    zoomInBtn.addEventListener('click', () => updateZoom(15));
    zoomOutBtn.addEventListener('click', () => updateZoom(-15));

    // Drawing Routine
    function draw() {
      const payload = getPayload();
      payloadEl.textContent = payload.length > 40 ? payload.substring(0, 38) + '…' : payload;
      eccInfoEl.textContent = `ECC: Level ${state.ecc} (${state.ecc === 'H' ? '30%' : state.ecc === 'Q' ? '25%' : state.ecc === 'M' ? '15%' : '7%'})`;

      const cr = getContrastRatio(state.fgColor, state.isTransparent ? '#FFFFFF' : state.bgColor);
      if (cr >= 3.8) {
        contrastChip.className = 'qr-scannability-chip is-good';
        contrastChip.innerHTML = `<span class="scannability-dot"></span><span class="scannability-text">100% Scannable (${cr.toFixed(1)}:1)</span>`;
      } else {
        contrastChip.className = 'qr-scannability-chip is-warn';
        contrastChip.innerHTML = `<span class="scannability-dot"></span><span class="scannability-text">Low Contrast (${cr.toFixed(1)}:1)</span>`;
      }

      try {
        const qr = window.qrcode(0, state.ecc);
        qr.addData(payload);
        qr.make();

        const count = qr.getModuleCount();
        const margin = state.margin;
        const totalModules = count + margin * 2;
        const targetSize = 720;
        const cellSize = Math.floor(targetSize / totalModules);
        const actualDim = cellSize * totalModules;

        canvas.width = actualDim;
        canvas.height = actualDim;
        const ctx = canvas.getContext('2d');

        ctx.clearRect(0, 0, actualDim, actualDim);
        if (!state.isTransparent) {
          ctx.fillStyle = state.bgColor;
          ctx.fillRect(0, 0, actualDim, actualDim);
        }

        function isEye(r, c) {
          if (r < 7 && c < 7) return 'tl';
          if (r < 7 && c >= count - 7) return 'tr';
          if (r >= count - 7 && c < 7) return 'bl';
          return null;
        }

        const center = Math.floor(count / 2);
        const logoR = state.logoImg ? Math.ceil((count * 0.22) / 2) : 0;
        function isLogoCutout(r, c) {
          if (!state.logoImg) return false;
          return r >= center - logoR && r <= center + logoR && c >= center - logoR && c <= center + logoR;
        }

        function roundRect(c, x, y, w, h, r, fill) {
          c.beginPath();
          c.moveTo(x + r, y);
          c.arcTo(x + w, y, x + w, y + h, r);
          c.arcTo(x + w, y + h, x, y + h, r);
          c.arcTo(x, y + h, x, y, r);
          c.arcTo(x, y, x + w, y, r);
          c.closePath();
          c.fillStyle = fill;
          c.fill();
        }

        function drawEye(startR, startC) {
          const x = (margin + startC) * cellSize;
          const y = (margin + startR) * cellSize;
          const eyeSize = 7 * cellSize;
          ctx.fillStyle = state.fgColor;

          if (state.eyeStyle === 'circle') {
            ctx.beginPath();
            ctx.arc(x + eyeSize / 2, y + eyeSize / 2, eyeSize / 2, 0, Math.PI * 2);
            ctx.fill();

            if (!state.isTransparent) {
              ctx.fillStyle = state.bgColor;
              ctx.beginPath();
              ctx.arc(x + eyeSize / 2, y + eyeSize / 2, eyeSize * 5 / 14, 0, Math.PI * 2);
              ctx.fill();
            } else {
              ctx.clearRect(x + eyeSize * 2 / 14, y + eyeSize * 2 / 14, eyeSize * 10 / 14, eyeSize * 10 / 14);
            }

            ctx.fillStyle = state.fgColor;
            ctx.beginPath();
            ctx.arc(x + eyeSize / 2, y + eyeSize / 2, eyeSize * 3 / 14, 0, Math.PI * 2);
            ctx.fill();
          } else if (state.eyeStyle === 'rounded') {
            const radOuter = cellSize * 2;
            const radInner = cellSize * 1.2;
            roundRect(ctx, x, y, eyeSize, eyeSize, radOuter, state.fgColor);
            
            if (!state.isTransparent) {
              roundRect(ctx, x + cellSize, y + cellSize, eyeSize - cellSize * 2, eyeSize - cellSize * 2, radOuter * 0.7, state.bgColor);
            } else {
              ctx.clearRect(x + cellSize, y + cellSize, eyeSize - cellSize * 2, eyeSize - cellSize * 2);
            }
            roundRect(ctx, x + cellSize * 2, y + cellSize * 2, eyeSize - cellSize * 4, eyeSize - cellSize * 4, radInner, state.fgColor);
          } else {
            ctx.fillRect(x, y, eyeSize, eyeSize);
            if (!state.isTransparent) {
              ctx.fillStyle = state.bgColor;
              ctx.fillRect(x + cellSize, y + cellSize, eyeSize - cellSize * 2, eyeSize - cellSize * 2);
            } else {
              ctx.clearRect(x + cellSize, y + cellSize, eyeSize - cellSize * 2, eyeSize - cellSize * 2);
            }
            ctx.fillStyle = state.fgColor;
            ctx.fillRect(x + cellSize * 2, y + cellSize * 2, eyeSize - cellSize * 4, eyeSize - cellSize * 4);
          }
        }

        // Draw Modules
        ctx.fillStyle = state.fgColor;
        for (let r = 0; r < count; r++) {
          for (let c = 0; c < count; c++) {
            if (isEye(r, c) || isLogoCutout(r, c)) continue;
            if (qr.isDark(r, c)) {
              const x = (margin + c) * cellSize;
              const y = (margin + r) * cellSize;
              if (state.dotStyle === 'dots') {
                ctx.beginPath();
                ctx.arc(x + cellSize / 2, y + cellSize / 2, (cellSize / 2) * 0.92, 0, Math.PI * 2);
                ctx.fill();
              } else if (state.dotStyle === 'rounded') {
                roundRect(ctx, x, y, cellSize * 0.94, cellSize * 0.94, cellSize * 0.35, state.fgColor);
              } else {
                ctx.fillRect(x, y, cellSize, cellSize);
              }
            }
          }
        }

        drawEye(0, 0);
        drawEye(0, count - 7);
        drawEye(count - 7, 0);

        if (state.logoImg) {
          const cutoutDim = (logoR * 2 + 1) * cellSize;
          const logoX = (margin + center - logoR) * cellSize;
          const logoY = (margin + center - logoR) * cellSize;

          roundRect(ctx, logoX, logoY, cutoutDim, cutoutDim, cellSize * 1.5, '#FFFFFF');
          ctx.strokeStyle = 'rgba(0,0,0,0.12)';
          ctx.lineWidth = Math.max(1, cellSize * 0.25);
          ctx.stroke();

          const pad = cutoutDim * 0.15;
          ctx.drawImage(state.logoImg, logoX + pad, logoY + pad, cutoutDim - pad * 2, cutoutDim - pad * 2);
        }

      } catch (err) {
        console.error('QR draw error:', err);
      }
    }

    function generateSvgString() {
      const payload = getPayload();
      const qr = window.qrcode(0, state.ecc);
      qr.addData(payload);
      qr.make();

      const count = qr.getModuleCount();
      const margin = state.margin;
      const totalModules = count + margin * 2;
      const cellSize = 10;
      const dim = totalModules * cellSize;

      let svg = `<svg viewBox="0 0 ${dim} ${dim}" width="${dim}" height="${dim}" xmlns="http://www.w3.org/2000/svg">\n`;
      if (!state.isTransparent) {
        svg += `  <rect width="${dim}" height="${dim}" fill="${state.bgColor}"/>\n`;
      }

      function isEye(r, c) {
        if (r < 7 && c < 7) return true;
        if (r < 7 && c >= count - 7) return true;
        if (r >= count - 7 && c < 7) return true;
        return false;
      }

      const center = Math.floor(count / 2);
      const logoR = state.logoImg ? Math.ceil((count * 0.22) / 2) : 0;
      function isLogoCutout(r, c) {
        if (!state.logoImg) return false;
        return r >= center - logoR && r <= center + logoR && c >= center - logoR && c <= center + logoR;
      }

      for (let r = 0; r < count; r++) {
        for (let c = 0; c < count; c++) {
          if (isEye(r, c) || isLogoCutout(r, c)) continue;
          if (qr.isDark(r, c)) {
            const x = (margin + c) * cellSize;
            const y = (margin + r) * cellSize;
            if (state.dotStyle === 'dots') {
              svg += `  <circle cx="${x + cellSize / 2}" cy="${y + cellSize / 2}" r="${cellSize * 0.45}" fill="${state.fgColor}"/>\n`;
            } else if (state.dotStyle === 'rounded') {
              svg += `  <rect x="${x}" y="${y}" width="${cellSize * 0.94}" height="${cellSize * 0.94}" rx="${cellSize * 0.3}" fill="${state.fgColor}"/>\n`;
            } else {
              svg += `  <rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${state.fgColor}"/>\n`;
            }
          }
        }
      }

      function svgEye(startR, startC) {
        const x = (margin + startC) * cellSize;
        const y = (margin + startR) * cellSize;
        const s = 7 * cellSize;
        if (state.eyeStyle === 'circle') {
          svg += `  <circle cx="${x + s / 2}" cy="${y + s / 2}" r="${s / 2}" fill="${state.fgColor}"/>\n`;
          svg += `  <circle cx="${x + s / 2}" cy="${y + s / 2}" r="${s * 5 / 14}" fill="${state.isTransparent ? '#FFFFFF' : state.bgColor}"/>\n`;
          svg += `  <circle cx="${x + s / 2}" cy="${y + s / 2}" r="${s * 3 / 14}" fill="${state.fgColor}"/>\n`;
        } else if (state.eyeStyle === 'rounded') {
          svg += `  <rect x="${x}" y="${y}" width="${s}" height="${s}" rx="${cellSize * 2}" fill="${state.fgColor}"/>\n`;
          svg += `  <rect x="${x + cellSize}" y="${y + cellSize}" width="${s - cellSize * 2}" height="${s - cellSize * 2}" rx="${cellSize * 1.4}" fill="${state.isTransparent ? '#FFFFFF' : state.bgColor}"/>\n`;
          svg += `  <rect x="${x + cellSize * 2}" y="${y + cellSize * 2}" width="${s - cellSize * 4}" height="${s - cellSize * 4}" rx="${cellSize * 1.2}" fill="${state.fgColor}"/>\n`;
        } else {
          svg += `  <rect x="${x}" y="${y}" width="${s}" height="${s}" fill="${state.fgColor}"/>\n`;
          svg += `  <rect x="${x + cellSize}" y="${y + cellSize}" width="${s - cellSize * 2}" height="${s - cellSize * 2}" fill="${state.isTransparent ? '#FFFFFF' : state.bgColor}"/>\n`;
          svg += `  <rect x="${x + cellSize * 2}" y="${y + cellSize * 2}" width="${s - cellSize * 4}" height="${s - cellSize * 4}" fill="${state.fgColor}"/>\n`;
        }
      }

      svgEye(0, 0);
      svgEye(0, count - 7);
      svgEye(count - 7, 0);

      if (state.logoDataUrl) {
        const cutoutDim = (logoR * 2 + 1) * cellSize;
        const logoX = (margin + center - logoR) * cellSize;
        const logoY = (margin + center - logoR) * cellSize;
        const pad = cutoutDim * 0.15;
        svg += `  <rect x="${logoX}" y="${logoY}" width="${cutoutDim}" height="${cutoutDim}" rx="${cellSize * 1.5}" fill="#FFFFFF" stroke="rgba(0,0,0,0.12)" stroke-width="1.5"/>\n`;
        svg += `  <image x="${logoX + pad}" y="${logoY + pad}" width="${cutoutDim - pad * 2}" height="${cutoutDim - pad * 2}" href="${state.logoDataUrl}"/>\n`;
      }

      svg += `</svg>`;
      return svg;
    }

    // Download Button
    const dlBtn = container.querySelector('#qr-download-btn');
    dlBtn.addEventListener('click', () => {
      const filename = `qrcode-${state.type}-${Date.now()}.${state.exportFormat}`;
      if (state.exportFormat === 'svg') {
        const svgContent = generateSvgString();
        const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
        download(blob, filename);
      } else {
        canvas.toBlob((blob) => {
          if (blob) download(blob, filename);
        }, 'image/png', 1.0);
      }
    });

    // Copy to Clipboard
    const copyBtn = container.querySelector('#qr-copy-btn');
    const copyLabel = container.querySelector('#qr-copy-label');
    copyBtn.addEventListener('click', async () => {
      try {
        canvas.toBlob(async (blob) => {
          if (blob && navigator.clipboard?.write) {
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            copyLabel.textContent = '✓ Copied!';
            copyBtn.classList.add('is-copied');
            setTimeout(() => {
              copyLabel.textContent = 'Copy Image';
              copyBtn.classList.remove('is-copied');
            }, 2000);
          } else {
            const svgContent = generateSvgString();
            await navigator.clipboard.writeText(svgContent);
            copyLabel.textContent = '✓ Copied SVG!';
            setTimeout(() => { copyLabel.textContent = 'Copy Image'; }, 2000);
          }
        }, 'image/png');
      } catch (e) {
        console.warn('Clipboard write error:', e);
      }
    });

    // Print Button
    container.querySelector('#qr-print-btn')?.addEventListener('click', () => {
      const dataUrl = canvas.toDataURL('image/png');
      const w = window.open('', '_blank');
      if (w) {
        w.document.write(`
          <html>
            <head><title>Print QR Code - FileKit</title></head>
            <body style="display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#fff;">
              <div style="text-align:center;">
                <img src="${dataUrl}" style="max-width:360px;height:auto;" />
                <p style="font-family:sans-serif;font-size:14px;color:#333;margin-top:16px;">${esc(getPayload())}</p>
              </div>
              <script>window.onload = () => { window.print(); window.close(); };<\/script>
            </body>
          </html>
        `);
        w.document.close();
      }
    });

    // Reset Handler
    container.querySelector('#qr-reset-btn')?.addEventListener('click', () => {
      state.type = 'url';
      state.url = 'https://filekit.cc';
      state.fgColor = '#18181B';
      state.bgColor = '#FFFFFF';
      state.isTransparent = false;
      state.eyeStyle = 'square';
      state.dotStyle = 'square';
      state.ecc = 'M';
      state.margin = 3;
      state.logoDataUrl = null;
      state.logoImg = null;
      state.logoPreset = null;
      state.zoom = 100;
      marginSlider.value = 3;
      marginVal.textContent = '3 modules';
      fgInput.value = '#18181B';
      fgHex.textContent = '#18181B';
      bgInput.value = '#FFFFFF';
      bgHex.textContent = '#FFFFFF';
      transBg.checked = false;
      eccSelect.value = 'M';
      clearLogoBtn.hidden = true;
      zoomValEl.textContent = '100%';
      canvas.style.transform = 'scale(1)';
      typeTabs.forEach(t => t.classList.toggle('is-active', t.dataset.type === 'url'));
      eyePills.forEach(p => p.classList.toggle('is-active', p.dataset.eye === 'square'));
      dotPills.forEach(p => p.classList.toggle('is-active', p.dataset.dot === 'square'));
      fgSwatches.forEach(s => s.classList.toggle('is-active', s.dataset.color === '#18181B'));
      badgeBtns.forEach(b => b.classList.remove('is-active'));
      renderDynamicForm();
      draw();
    });

    // Initial render
    draw();
  }

  /* ==========================================================================
     PASSWORD GENERATOR STUDIO PRO — GOLD-STANDARD SIDERAWL CRAFT
     ========================================================================== */

  function mountPasswordStudioPro(container, tool) {
    if (!container) return;

    // Diceware English Wordlist (~1,300 words)
    const WORDS = [
      'ability','able','aboard','about','above','accept','accord','account','across','action','active','actor','actual',
      'adapt','address','adjust','admit','adopt','advance','advice','affair','affect','afford','afraid','after','again',
      'against','agency','agenda','agent','agree','ahead','airport','alarm','album','alert','alien','alive','allow',
      'almost','alone','along','alpha','already','alter','always','amaze','amber','ambition','amend','amid','among',
      'amount','anchor','ancient','angel','anger','angle','animal','animate','ankle','announce','annual','another','answer',
      'anthem','antic','anvil','anxiety','anybody','anyhow','anymore','anyone','anyway','anywhere','apart','apology','appeal',
      'appear','applaud','apple','apply','appoint','approve','apron','arcade','arch','archive','arctic','arena','argue',
      'armor','army','aroma','around','arrange','array','arrest','arrive','arrow','arson','artery','artist','ascend',
      'ashamed','asleep','aspect','assault','assert','assess','asset','assign','assist','assume','assure','astonish','astute',
      'athlete','atlas','atom','atomic','attach','attack','attain','attempt','attend','attire','attitude','attorney','attract',
      'auction','audit','august','author','auto','autumn','avatar','avenue','average','aviator','avoid','await','awake',
      'award','aware','awesome','awful','awkward','axis','baboon','baby','bachelor','backbone','backdrop','background','badge',
      'badger','baggage','baker','balance','balcony','bamboo','banana','bandit','banner','barber','barely','bargain','barrel',
      'barrier','base','basic','basket','battery','battle','beach','beacon','beam','beauty','become','before','begin',
      'behave','behind','belief','belong','beloved','benefit','berth','beside','bestow','better','between','beyond','bicycle',
      'bifocal','billion','binary','biology','birch','biscuit','bishop','bitter','bizarre','black','blade','blanket','blaze',
      'blend','blessing','blimp','blind','blink','bliss','blizzard','block','blossom','blouse','blueprint','board','boating',
      'boldly','bolster','bombay','bonding','bonfire','bonus','booster','border','botany','boulder','boundary','bounty','bouquet',
      'bowling','boxing','bracket','bravery','breach','breeze','bridge','bright','brisk','broad','bronze','brother','bubble',
      'budget','buffalo','builder','bullet','bundle','bunker','burden','bureau','burglar','burial','burnout','business','butter',
      'cabin','cabinet','cactus','cadence','calcium','calendar','calmly','camera','campaign','canary','candle','canvas','canyon',
      'capable','capital','captain','capture','caravan','carbon','cardinal','careful','cargo','carrier','cascade','castle','casual',
      'catapult','catch','category','cavalry','cavern','ceiling','celery','cement','census','century','cereal','certain','chainsaw',
      'chalice','chamber','champion','chance','change','channel','chapter','charcoal','charger','charity','charter','chatter','checkup',
      'cheering','chemical','cherish','chestnut','chisel','chocolate','cholera','chronic','circuit','citizen','citrus','civilian','clarity',
      'classic','classify','claymore','cleaning','client','climate','climb','clinic','clipping','cloak','cloister','closet','clothing',
      'cloud','clover','cluster','coastal','cobalt','cockpit','coconut','cohesive','coinage','collapse','collect','colony','column',
      'combine','comfort','command','commerce','commit','common','compact','company','compass','compile','complete','complex','comply',
      'compose','compound','compress','compute','comrade','conceal','concept','concern','concert','conclude','concrete','condense','conduct',
      'confer','confess','confide','confirm','conflict','conform','confuse','conquer','consent','conserve','consider','consign','console',
      'constant','consume','contact','contain','content','contest','context','continue','contour','contract','contrast','control','convene',
      'convert','convince','coolant','copper','coral','cordial','corner','coronet','correct','corridor','corrupt','cosmetic','cosmos',
      'cottage','cotton','council','counsel','counter','country','courage','courier','covenant','coverage','cowboy','cradle','crafty',
      'crater','crayon','creative','creator','creature','credit','creek','crest','crevice','cricket','criminal','crimson','criteria',
      'critical','crooked','crossbar','crowded','crucial','crusade','crust','crystal','culprit','culture','cupboard','curator','curious',
      'currency','curtain','cushion','custody','custom','cylinder','dagger','daily','damage','dancing','danger','darkness','darling',
      'database','daylight','dazzle','deadline','decadent','december','decision','declare','decoder','decorate','decrease','dedicate','defense',
      'definite','defrost','delicate','delight','deliver','delta','demand','demise','democracy','denial','density','deposit','depth',
      'deputy','derby','descend','desert','design','desire','despair','destiny','destroy','detect','detergent','detour','device',
      'devote','diagonal','diagram','dialogue','diamond','dictate','diesel','differ','digital','dignity','dilemma','dimension','dinner',
      'diploma','direct','director','disable','disaster','disciple','disclose','discount','discover','disease','disguise','dishonor','diskette',
      'dismantle','dispatch','display','dispose','dispute','dissolve','distance','distinct','district','distrust','divert','divide','divine',
      'document','dolphin','domain','dominant','donation','donkey','doorstep','dormant','double','dove','draft','dragon','drainage',
      'dramatic','drawing','drift','driver','dropkick','drummer','dryer','dubious','duchess','ductile','dugout','dulcet','durable',
      'duration','dynamic','dynasty','eager','eagle','early','earnest','earth','easel','eastern','ebony','eccentric','echo','eclipse',
      'ecology','economy','ecstasy','edition','educate','effective','efficacy','effort','elastic','elbow','elder','elect','electric',
      'element','elephant','elevate','eligible','elite','elixir','elmwood','elongate','elusive','embark','embassy','emblem','emerald',
      'emergency','emission','emotion','emperor','emphasis','empire','employ','empower','emulate','enable','enact','enchant','enclose',
      'encore','encroach','encrypt','endanger','endeavor','endless','endorse','endure','energetic','enforce','engage','engine','enhance',
      'enjoy','enormous','enough','enrich','ensemble','ensure','entangle','enter','entire','entrust','entry','envelope','envoy'
    ];

    const NATO = {
      'a': 'Alpha', 'b': 'Bravo', 'c': 'Charlie', 'd': 'Delta', 'e': 'Echo',
      'f': 'Foxtrot', 'g': 'Golf', 'h': 'Hotel', 'i': 'India', 'j': 'Juliett',
      'k': 'Kilo', 'l': 'Lima', 'm': 'Mike', 'n': 'November', 'o': 'Oscar',
      'p': 'Papa', 'q': 'Quebec', 'r': 'Romeo', 's': 'Sierra', 't': 'Tango',
      'u': 'Uniform', 'v': 'Victor', 'w': 'Whiskey', 'x': 'X-ray', 'y': 'Yankee',
      'z': 'Zulu', '0': 'Zero', '1': 'One', '2': 'Two', '3': 'Three',
      '4': 'Four', '5': 'Five', '6': 'Six', '7': 'Seven', '8': 'Eight',
      '9': 'Niner', '-': 'Hyphen', '_': 'Underscore', '.': 'Period', '@': 'At',
      '!': 'Exclamation', '#': 'Hash', '$': 'Dollar', '%': 'Percent', '&': 'Ampersand',
      '*': 'Asterisk', '+': 'Plus', '?': 'Question', '=': 'Equals'
    };

    const state = {
      mode: 'password', // 'password' | 'passphrase' | 'pin' | 'bulk'
      length: 24,
      useUpper: true,
      useLower: true,
      useNumbers: true,
      useSymbols: true,
      avoidAmbiguous: true,
      avoidRepeating: false,
      wordCount: 4,
      separator: '-',
      casing: 'capitalize', // 'capitalize' | 'lower' | 'upper'
      appendNumber: true,
      appendSymbol: false,
      phraseWords: [],
      phraseNumber: '',
      phraseSymbol: '',
      pinLength: 6,
      avoidObviousPin: true,
      bulkCount: 10,
      bulkList: [],
      currentPassword: '',
      isMasked: false
    };

    function esc(s) {
      return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function syncSlider(slider) {
      if (!slider) return;
      const min = parseFloat(slider.min) || 0;
      const max = parseFloat(slider.max) || 100;
      const val = parseFloat(slider.value) || 0;
      const pct = Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
      slider.style.setProperty('--pct', `${pct}%`);
    }

    function secureRandomInt(max) {
      if (max <= 1) return 0;
      const mask = (2 << (31 - Math.clz32(max - 1))) - 1;
      const arr = new Uint32Array(1);
      let rand;
      do {
        crypto.getRandomValues(arr);
        rand = arr[0] & mask;
      } while (rand >= max);
      return rand;
    }

    function generateSinglePassword() {
      let chars = '';
      const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
      const upperAmb = 'IO';
      const lower = 'abcdefghijkmnopqrstuvwxyz';
      const lowerAmb = 'l';
      const numbers = '23456789';
      const numbersAmb = '01';
      const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

      let u = state.avoidAmbiguous ? upper : upper + upperAmb;
      let l = state.avoidAmbiguous ? lower : lower + lowerAmb;
      let n = state.avoidAmbiguous ? numbers : numbers + numbersAmb;
      let s = symbols;

      if (state.useUpper) chars += u;
      if (state.useLower) chars += l;
      if (state.useNumbers) chars += n;
      if (state.useSymbols) chars += s;

      if (!chars) {
        chars = l;
      }

      let guaranteed = [];
      if (state.useUpper && u.length) guaranteed.push(u[secureRandomInt(u.length)]);
      if (state.useLower && l.length) guaranteed.push(l[secureRandomInt(l.length)]);
      if (state.useNumbers && n.length) guaranteed.push(n[secureRandomInt(n.length)]);
      if (state.useSymbols && s.length) guaranteed.push(s[secureRandomInt(s.length)]);

      const remaining = Math.max(0, state.length - guaranteed.length);
      const res = [...guaranteed];
      
      let lastChar = '';
      for (let i = 0; i < remaining; i++) {
        let attempts = 0;
        let c = '';
        do {
          c = chars[secureRandomInt(chars.length)];
          attempts++;
        } while (state.avoidRepeating && c === lastChar && attempts < 10);
        res.push(c);
        lastChar = c;
      }

      // Cryptographic Fisher-Yates shuffle
      for (let i = res.length - 1; i > 0; i--) {
        const j = secureRandomInt(i + 1);
        [res[i], res[j]] = [res[j], res[i]];
      }

      return res.join('');
    }

    function generatePassphrase() {
      const count = state.wordCount;
      const words = [];
      for (let i = 0; i < count; i++) {
        let w = WORDS[secureRandomInt(WORDS.length)];
        if (state.casing === 'capitalize') {
          w = w.charAt(0).toUpperCase() + w.slice(1);
        } else if (state.casing === 'upper') {
          w = w.toUpperCase();
        } else {
          w = w.toLowerCase();
        }
        words.push(w);
      }
      state.phraseWords = words;
      state.phraseNumber = state.appendNumber ? String(secureRandomInt(90) + 10) : '';
      const syms = '!@#$%&*';
      state.phraseSymbol = state.appendSymbol ? syms[secureRandomInt(syms.length)] : '';

      let phrase = words.join(state.separator);
      if (state.phraseNumber) {
        phrase += state.separator + state.phraseNumber;
      }
      if (state.phraseSymbol) {
        phrase += state.phraseSymbol;
      }
      return phrase;
    }

    function reRollPhraseWord(index) {
      if (index < 0 || index >= state.phraseWords.length) return;
      let w = WORDS[secureRandomInt(WORDS.length)];
      if (state.casing === 'capitalize') {
        w = w.charAt(0).toUpperCase() + w.slice(1);
      } else if (state.casing === 'upper') {
        w = w.toUpperCase();
      } else {
        w = w.toLowerCase();
      }
      state.phraseWords[index] = w;
      let phrase = state.phraseWords.join(state.separator);
      if (state.phraseNumber) {
        phrase += state.separator + state.phraseNumber;
      }
      if (state.phraseSymbol) {
        phrase += state.phraseSymbol;
      }
      state.currentPassword = phrase;
      renderView();
    }

    function generatePin() {
      const len = state.pinLength;
      const obviousPatterns = ['1234', '1111', '0000', '2580', '1212', '4321', '6969', '123456', '111111', '000000', '123123'];
      let pin = '';
      let attempts = 0;
      do {
        pin = '';
        for (let i = 0; i < len; i++) {
          pin += secureRandomInt(10).toString();
        }
        attempts++;
      } while (state.avoidObviousPin && obviousPatterns.includes(pin) && attempts < 20);
      return pin;
    }

    function calculateEntropy(pwd) {
      if (!pwd) return { bits: 0, verdict: 'Empty', crackTime: 'Instant', poolSize: 0 };
      
      let pool = 0;
      if (state.mode === 'passphrase') {
        const wordBits = state.wordCount * Math.log2(WORDS.length);
        const numBits = state.appendNumber ? Math.log2(90) : 0;
        const symBits = state.appendSymbol ? Math.log2(7) : 0;
        const bits = Math.round(wordBits + numBits + symBits);
        return {
          bits,
          verdict: bits < 45 ? 'Weak' : bits < 65 ? 'Fair' : bits < 85 ? 'Strong' : 'Ultra-Strong',
          crackTime: estimateCrackTime(bits),
          poolSize: WORDS.length
        };
      }

      if (state.mode === 'pin') {
        const bits = Math.round(pwd.length * Math.log2(10));
        return {
          bits,
          verdict: bits < 20 ? 'Weak' : bits < 30 ? 'Fair' : 'Strong',
          crackTime: estimateCrackTime(bits),
          poolSize: 10
        };
      }

      if (/[a-z]/.test(pwd)) pool += 26;
      if (/[A-Z]/.test(pwd)) pool += 26;
      if (/[0-9]/.test(pwd)) pool += 10;
      if (/[^a-zA-Z0-9]/.test(pwd)) pool += 32;

      const bits = Math.round(pwd.length * Math.log2(pool || 1));
      let verdict = 'Weak';
      if (bits >= 110) verdict = 'Ultra-Strong';
      else if (bits >= 80) verdict = 'Strong';
      else if (bits >= 55) verdict = 'Fair';

      return {
        bits,
        verdict,
        crackTime: estimateCrackTime(bits),
        poolSize: pool
      };
    }

    function estimateCrackTime(entropyBits) {
      if (entropyBits <= 28) return 'Instant';
      if (entropyBits <= 38) return '< 1 Second';
      if (entropyBits <= 48) return '~4.2 Minutes';
      if (entropyBits <= 56) return '~3.1 Days';
      if (entropyBits <= 64) return '~8.2 Months';
      if (entropyBits <= 72) return '~175 Years';
      if (entropyBits <= 82) return '~180,000 Years';
      if (entropyBits <= 95) return '~140 Million Years';
      return 'Trillions of Years';
    }

    function formatSyntaxStream(pwd) {
      if (state.isMasked) {
        if (state.mode === 'pin') {
          return `<div class="pass-pin-grid">${[...pwd].map(() => `<div class="pass-pin-cell is-masked">•</div>`).join('')}</div>`;
        }
        return `<span class="pass-char-masked">${'•'.repeat(Math.min(pwd.length, 36))}</span>`;
      }

      if (state.mode === 'pin') {
        return `<div class="pass-pin-grid">${[...pwd].map(c => `<div class="pass-pin-cell">${esc(c)}</div>`).join('')}</div>`;
      }

      if (state.mode === 'passphrase') {
        const wordsHtml = state.phraseWords.map((w, idx) => `
          <button type="button" class="pass-word-pill" data-word-idx="${idx}" title="Click to re-roll this word">${esc(w)}</button>
        `).join(`<span class="pass-word-sep">${esc(state.separator)}</span>`);

        let extras = '';
        if (state.phraseNumber) {
          extras += `<span class="pass-word-sep">${esc(state.separator)}</span><span class="pass-word-num">${esc(state.phraseNumber)}</span>`;
        }
        if (state.phraseSymbol) {
          extras += `<span class="pass-word-sym">${esc(state.phraseSymbol)}</span>`;
        }

        return `<div class="pass-phrase-ribbon">${wordsHtml}${extras}</div>`;
      }

      return [...pwd].map(c => {
        if (/[A-Z]/.test(c)) return `<span class="pass-c-upper">${esc(c)}</span>`;
        if (/[a-z]/.test(c)) return `<span class="pass-c-lower">${esc(c)}</span>`;
        if (/[0-9]/.test(c)) return `<span class="pass-c-num">${esc(c)}</span>`;
        if (/[-_.\s]/.test(c)) return `<span class="pass-c-sep">${esc(c)}</span>`;
        return `<span class="pass-c-sym">${esc(c)}</span>`;
      }).join('');
    }

    function generate() {
      if (state.mode === 'password') {
        state.currentPassword = generateSinglePassword();
      } else if (state.mode === 'passphrase') {
        state.currentPassword = generatePassphrase();
      } else if (state.mode === 'pin') {
        state.currentPassword = generatePin();
      } else if (state.mode === 'bulk') {
        state.bulkList = [];
        for (let i = 0; i < state.bulkCount; i++) {
          state.bulkList.push(generateSinglePassword());
        }
        state.currentPassword = state.bulkList[0] || '';
      }
      renderView();
    }

    container.innerHTML = `
      <div class="pass-studio-shell">
        <!-- 48px Fixed Unified Action Toolbar (Robust Flex Layout, Zero Collision) -->
        <header class="pass-unified-toolbar">
          <div class="pass-toolbar-left">
            <div class="pass-brand-wrap">
              <span class="pass-brand-icon" title="Password Studio Pro">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 2l-2 2m-1.5 1.5L14 9a5 5 0 1 0 3 3l3.5-3.5a2.121 2.121 0 0 0 0-3L21 2Z"/>
                  <circle cx="7.5" cy="16.5" r="1.5" fill="currentColor"/>
                </svg>
              </span>
              <span class="pass-brand-title">Password Studio</span>
              <span class="pass-security-badge" title="Cryptographically Secure Pseudo-Random Number Generator">CSPRNG</span>
            </div>
            <button type="button" class="pass-btn-reset" id="pass-reset-btn" title="Reset all options to defaults">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
              <span>Reset</span>
            </button>
          </div>

          <div class="pass-toolbar-center">
            <div class="pass-mode-segmented" role="tablist">
              <button type="button" class="pass-mode-tab is-active" data-mode="password">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2l-2 2m-1.5 1.5L14 9a5 5 0 1 0 3 3l3.5-3.5a2.121 2.121 0 0 0 0-3L21 2Z"/></svg>
                <span>Password</span>
              </button>
              <button type="button" class="pass-mode-tab" data-mode="passphrase">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10M6 10h10"/></svg>
                <span>Passphrase</span>
              </button>
              <button type="button" class="pass-mode-tab" data-mode="pin">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/><circle cx="12" cy="16.5" r="1.5"/></svg>
                <span>PIN</span>
              </button>
              <button type="button" class="pass-mode-tab" data-mode="bulk">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="8" y="2" width="13" height="13" rx="2"/><path d="M4 8v12a2 2 0 0 0 2 2h12"/></svg>
                <span>Bulk</span>
              </button>
            </div>
          </div>

          <div class="pass-toolbar-right">
            <div class="pass-entropy-pill is-good" id="pass-entropy-chip" title="Shannon & NIST Entropy Bit Strength">
              <span class="pass-entropy-dot"></span>
              <span id="pass-entropy-chip-text">128 bits</span>
            </div>

            <button type="button" class="pass-btn-regen" id="pass-regen-btn" title="Generate new credentials (Shortcut: Spacebar)">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.85.83 6.72 2.24L21 7"/><polyline points="21 3 21 7 17 7"/></svg>
              <span>Regenerate</span>
              <kbd class="pass-kbd">Space</kbd>
            </button>

            <button type="button" class="pass-primary-cta" id="pass-copy-btn">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              <span id="pass-copy-text">Copy</span>
            </button>
          </div>
        </header>

        <div class="pass-studio-stage">
          <!-- Left Inspector Rail (Compact 340px, Zero-Scroll) -->
          <aside class="pass-inspector-rail">
            <div class="pass-inspector-content">
              <!-- Dynamic Controls Section -->
              <div class="pass-rail-section" id="pass-dynamic-controls"></div>

              <!-- Phonetic / Dictation Tag Stream -->
              <div class="pass-rail-section" id="pass-phonetic-section">
                <div class="pass-sec-title">Phonetic Dictation</div>
                <div class="pass-phonetic-stream" id="pass-phonetic-stream"></div>
              </div>

              <!-- Cryptographic Profile Card -->
              <div class="pass-rail-section pass-crypto-stats">
                <div class="pass-sec-title">Security Profile</div>
                <div class="pass-stats-grid">
                  <div class="pass-stat-item">
                    <span class="pass-stat-k">Entropy</span>
                    <strong class="pass-stat-v" id="pass-stat-entropy">128 bits</strong>
                  </div>
                  <div class="pass-stat-item">
                    <span class="pass-stat-k">Crack Resistance</span>
                    <strong class="pass-stat-v" id="pass-stat-crack">Millions of Years</strong>
                  </div>
                  <div class="pass-stat-item">
                    <span class="pass-stat-k">Pool Size</span>
                    <strong class="pass-stat-v" id="pass-stat-pool">84 chars</strong>
                  </div>
                  <div class="pass-stat-item">
                    <span class="pass-stat-k">CSPRNG Method</span>
                    <strong class="pass-stat-v">Web Crypto</strong>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <!-- Center Stage: Dot Matrix & Floating Credential Card -->
          <main class="pass-canvas-stage">
            <div class="pass-hero-card" id="pass-hero-card">
              <!-- Card Header -->
              <div class="pass-hero-card-header">
                <div class="pass-hero-mode-badge" id="pass-hero-mode-badge">SECURE CREDENTIAL</div>
                <div class="pass-hero-strength-pill" id="pass-hero-strength-pill">
                  <span class="pass-hero-strength-dot"></span>
                  <span id="pass-hero-strength-text">Ultra-Strong Protection</span>
                </div>
              </div>

              <!-- Single Mode Display -->
              <div class="pass-single-view" id="pass-single-view">
                <div class="pass-output-box" id="pass-output-box" title="Click anywhere to copy to clipboard">
                  <div class="pass-output-content" id="pass-output-content">
                    <div class="pass-syntax-stream" id="pass-syntax-stream"></div>
                  </div>
                  <div class="pass-output-actions">
                    <button type="button" class="pass-box-action-btn" id="pass-hero-mask-btn" title="Toggle Mask / Reveal">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                    <button type="button" class="pass-box-action-btn" id="pass-hero-regen-btn" title="Regenerate (Shortcut: Spacebar)">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.85.83 6.72 2.24L21 7"/><polyline points="21 3 21 7 17 7"/></svg>
                    </button>
                    <button type="button" class="pass-box-action-btn" id="pass-hero-copy-btn" title="Copy to Clipboard">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    </button>
                  </div>
                </div>

                <!-- Animated 4-Bar Strength Meter -->
                <div class="pass-strength-row">
                  <div class="pass-meter-bars" id="pass-meter-bars">
                    <span class="pass-meter-segment active is-ultra"></span>
                    <span class="pass-meter-segment active is-ultra"></span>
                    <span class="pass-meter-segment active is-ultra"></span>
                    <span class="pass-meter-segment active is-ultra"></span>
                  </div>
                  <span class="pass-crack-hint" id="pass-crack-hint">GPU Cluster crack time: Trillions of Years</span>
                </div>
              </div>

              <!-- Bulk Mode Display -->
              <div class="pass-bulk-view" id="pass-bulk-view" hidden>
                <div class="pass-bulk-header">
                  <span class="pass-bulk-count-badge" id="pass-bulk-badge">10 Generated Credentials</span>
                  <div class="pass-bulk-actions">
                    <button type="button" class="pass-btn-micro" id="pass-export-csv-btn">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      <span>CSV</span>
                    </button>
                    <button type="button" class="pass-btn-micro" id="pass-export-txt-btn">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      <span>TXT</span>
                    </button>
                  </div>
                </div>
                <div class="pass-bulk-list-container" id="pass-bulk-list-container"></div>
              </div>

              <!-- Card Bottom Utility Dock -->
              <div class="pass-card-dock">
                <button type="button" class="pass-dock-btn" id="pass-json-copy-btn" title="Copy Credential Metadata JSON">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m16 18 6-6-6-6"/><path d="m8 6-6 6 6 6"/></svg>
                  <span>Copy JSON</span>
                </button>
                <span class="pass-dock-vsep"></span>
                <button type="button" class="pass-dock-btn" id="pass-mask-toggle">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                  <span id="pass-mask-label">Mask</span>
                </button>
                <span class="pass-dock-vsep"></span>
                <button type="button" class="pass-dock-btn" id="pass-print-btn" title="Print Vault Emergency Card">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                  <span>Print Vault Card</span>
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>
    `;

    const dynamicControlsEl = container.querySelector('#pass-dynamic-controls');
    const phoneticStreamEl = container.querySelector('#pass-phonetic-stream');
    const phoneticSectionEl = container.querySelector('#pass-phonetic-section');
    const syntaxStreamEl = container.querySelector('#pass-syntax-stream');
    const outputBoxEl = container.querySelector('#pass-output-box');
    const heroMaskBtn = container.querySelector('#pass-hero-mask-btn');
    const heroRegenBtn = container.querySelector('#pass-hero-regen-btn');
    const heroCopyBtn = container.querySelector('#pass-hero-copy-btn');
    const strengthBarsEl = container.querySelector('#pass-meter-bars');
    const crackHintEl = container.querySelector('#pass-crack-hint');
    const heroModeBadgeEl = container.querySelector('#pass-hero-mode-badge');
    const heroStrengthPillEl = container.querySelector('#pass-hero-strength-pill');
    const heroStrengthTextEl = container.querySelector('#pass-hero-strength-text');
    const entropyChipEl = container.querySelector('#pass-entropy-chip');
    const entropyChipTextEl = container.querySelector('#pass-entropy-chip-text');
    const statEntropyEl = container.querySelector('#pass-stat-entropy');
    const statCrackEl = container.querySelector('#pass-stat-crack');
    const statPoolEl = container.querySelector('#pass-stat-pool');
    const copyBtn = container.querySelector('#pass-copy-btn');
    const copyTextEl = container.querySelector('#pass-copy-text');
    const regenBtn = container.querySelector('#pass-regen-btn');
    const maskBtn = container.querySelector('#pass-mask-toggle');
    const maskLabelEl = container.querySelector('#pass-mask-label');
    const singleViewEl = container.querySelector('#pass-single-view');
    const bulkViewEl = container.querySelector('#pass-bulk-view');
    const bulkListContainerEl = container.querySelector('#pass-bulk-list-container');
    const bulkBadgeEl = container.querySelector('#pass-bulk-badge');
    const jsonCopyBtn = container.querySelector('#pass-json-copy-btn');

    function renderDynamicControls() {
      if (state.mode === 'password') {
        dynamicControlsEl.innerHTML = `
          <div class="pass-sec-title">Length &amp; Character Sets</div>
          <div class="pass-control-group">
            <div class="pass-slider-row">
              <label class="pass-label-mini">Length</label>
              <span class="pass-slider-bubble" id="pass-len-val">${state.length} chars</span>
            </div>
            <input type="range" class="pass-range-slider" id="pass-len-slider" min="6" max="64" value="${state.length}">
            <div class="pass-preset-pills">
              <button type="button" class="pass-preset-pill ${state.length === 12 ? 'is-active' : ''}" data-val="12">12</button>
              <button type="button" class="pass-preset-pill ${state.length === 16 ? 'is-active' : ''}" data-val="16">16</button>
              <button type="button" class="pass-preset-pill ${state.length === 24 ? 'is-active' : ''}" data-val="24">24</button>
              <button type="button" class="pass-preset-pill ${state.length === 32 ? 'is-active' : ''}" data-val="32">32</button>
              <button type="button" class="pass-preset-pill ${state.length === 48 ? 'is-active' : ''}" data-val="48">48</button>
            </div>
          </div>

          <div class="pass-tiles-grid">
            <label class="pass-tile-card ${state.useUpper ? 'is-active' : ''}">
              <input type="checkbox" id="pass-chk-upper" ${state.useUpper ? 'checked' : ''} class="pass-sr-only">
              <span class="pass-tile-dot dot-upper"></span>
              <span class="pass-tile-text">Uppercase (A-Z)</span>
              <span class="pass-tile-check">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
              </span>
            </label>
            <label class="pass-tile-card ${state.useLower ? 'is-active' : ''}">
              <input type="checkbox" id="pass-chk-lower" ${state.useLower ? 'checked' : ''} class="pass-sr-only">
              <span class="pass-tile-dot dot-lower"></span>
              <span class="pass-tile-text">Lowercase (a-z)</span>
              <span class="pass-tile-check">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
              </span>
            </label>
            <label class="pass-tile-card ${state.useNumbers ? 'is-active' : ''}">
              <input type="checkbox" id="pass-chk-num" ${state.useNumbers ? 'checked' : ''} class="pass-sr-only">
              <span class="pass-tile-dot dot-num"></span>
              <span class="pass-tile-text">Numbers (0-9)</span>
              <span class="pass-tile-check">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
              </span>
            </label>
            <label class="pass-tile-card ${state.useSymbols ? 'is-active' : ''}">
              <input type="checkbox" id="pass-chk-sym" ${state.useSymbols ? 'checked' : ''} class="pass-sr-only">
              <span class="pass-tile-dot dot-sym"></span>
              <span class="pass-tile-text">Symbols (!@#$)</span>
              <span class="pass-tile-check">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
              </span>
            </label>
          </div>

          <div class="pass-switch-rows">
            <label class="pass-switch-card">
              <span class="pass-switch-label-wrap">
                <span class="pass-switch-title">Exclude Ambiguous</span>
                <span class="pass-switch-hint">Avoids 0, O, 1, l, I</span>
              </span>
              <span class="pass-switch-control">
                <input type="checkbox" id="pass-chk-ambig" class="pass-switch-input" ${state.avoidAmbiguous ? 'checked' : ''}>
                <span class="pass-switch-track"><span class="pass-switch-thumb"></span></span>
              </span>
            </label>
            <label class="pass-switch-card">
              <span class="pass-switch-label-wrap">
                <span class="pass-switch-title">Avoid Repeating</span>
                <span class="pass-switch-hint">No consecutive duplicates</span>
              </span>
              <span class="pass-switch-control">
                <input type="checkbox" id="pass-chk-repeat" class="pass-switch-input" ${state.avoidRepeating ? 'checked' : ''}>
                <span class="pass-switch-track"><span class="pass-switch-thumb"></span></span>
              </span>
            </label>
          </div>`;

        const slider = dynamicControlsEl.querySelector('#pass-len-slider');
        const sliderVal = dynamicControlsEl.querySelector('#pass-len-val');
        syncSlider(slider);

        slider.addEventListener('input', () => {
          state.length = parseInt(slider.value, 10);
          sliderVal.textContent = `${state.length} chars`;
          syncSlider(slider);
          updatePillActive();
          generate();
        });

        const pills = dynamicControlsEl.querySelectorAll('.pass-preset-pill');
        function updatePillActive() {
          pills.forEach(p => p.classList.toggle('is-active', parseInt(p.dataset.val, 10) === state.length));
        }

        pills.forEach(p => {
          p.addEventListener('click', () => {
            state.length = parseInt(p.dataset.val, 10);
            slider.value = state.length;
            sliderVal.textContent = `${state.length} chars`;
            syncSlider(slider);
            updatePillActive();
            generate();
          });
        });

        function bindTile(id, prop) {
          const chk = dynamicControlsEl.querySelector(`#${id}`);
          const card = chk.closest('.pass-tile-card');
          chk.addEventListener('change', (e) => {
            state[prop] = e.target.checked;
            card.classList.toggle('is-active', state[prop]);
            generate();
          });
        }

        bindTile('pass-chk-upper', 'useUpper');
        bindTile('pass-chk-lower', 'useLower');
        bindTile('pass-chk-num', 'useNumbers');
        bindTile('pass-chk-sym', 'useSymbols');

        dynamicControlsEl.querySelector('#pass-chk-ambig').addEventListener('change', (e) => {
          state.avoidAmbiguous = e.target.checked;
          generate();
        });
        dynamicControlsEl.querySelector('#pass-chk-repeat').addEventListener('change', (e) => {
          state.avoidRepeating = e.target.checked;
          generate();
        });

      } else if (state.mode === 'passphrase') {
        dynamicControlsEl.innerHTML = `
          <div class="pass-sec-title">Passphrase Structure</div>
          <div class="pass-control-group">
            <div class="pass-slider-row">
              <label class="pass-label-mini">Word Count</label>
              <span class="pass-slider-bubble" id="pass-wc-val">${state.wordCount} words</span>
            </div>
            <input type="range" class="pass-range-slider" id="pass-wc-slider" min="3" max="8" value="${state.wordCount}">
            <div class="pass-preset-pills">
              <button type="button" class="pass-preset-pill ${state.wordCount === 3 ? 'is-active' : ''}" data-val="3">3</button>
              <button type="button" class="pass-preset-pill ${state.wordCount === 4 ? 'is-active' : ''}" data-val="4">4</button>
              <button type="button" class="pass-preset-pill ${state.wordCount === 5 ? 'is-active' : ''}" data-val="5">5</button>
              <button type="button" class="pass-preset-pill ${state.wordCount === 6 ? 'is-active' : ''}" data-val="6">6</button>
              <button type="button" class="pass-preset-pill ${state.wordCount === 8 ? 'is-active' : ''}" data-val="8">8</button>
            </div>
          </div>

          <div class="pass-form-row-2" style="margin-top: 6px;">
            <div class="pass-form-field">
              <label class="pass-label-mini">Separator</label>
              <select id="pass-sep-select" class="pass-select-depth">
                <option value="-" ${state.separator === '-' ? 'selected' : ''}>Hyphen (-)</option>
                <option value="_" ${state.separator === '_' ? 'selected' : ''}>Underscore (_)</option>
                <option value="." ${state.separator === '.' ? 'selected' : ''}>Period (.)</option>
                <option value=" " ${state.separator === ' ' ? 'selected' : ''}>Space ( )</option>
              </select>
            </div>
            <div class="pass-form-field">
              <label class="pass-label-mini">Casing</label>
              <select id="pass-case-select" class="pass-select-depth">
                <option value="capitalize" ${state.casing === 'capitalize' ? 'selected' : ''}>Capitalize</option>
                <option value="lower" ${state.casing === 'lower' ? 'selected' : ''}>lowercase</option>
                <option value="upper" ${state.casing === 'upper' ? 'selected' : ''}>UPPERCASE</option>
              </select>
            </div>
          </div>

          <div class="pass-switch-rows" style="margin-top: 6px;">
            <label class="pass-switch-card">
              <span class="pass-switch-label-wrap">
                <span class="pass-switch-title">Append Number</span>
                <span class="pass-switch-hint">Appends 2-digit number (e.g. -42)</span>
              </span>
              <span class="pass-switch-control">
                <input type="checkbox" id="pass-chk-num-end" class="pass-switch-input" ${state.appendNumber ? 'checked' : ''}>
                <span class="pass-switch-track"><span class="pass-switch-thumb"></span></span>
              </span>
            </label>
            <label class="pass-switch-card">
              <span class="pass-switch-label-wrap">
                <span class="pass-switch-title">Append Symbol</span>
                <span class="pass-switch-hint">Appends special symbol (e.g. #)</span>
              </span>
              <span class="pass-switch-control">
                <input type="checkbox" id="pass-chk-sym-end" class="pass-switch-input" ${state.appendSymbol ? 'checked' : ''}>
                <span class="pass-switch-track"><span class="pass-switch-thumb"></span></span>
              </span>
            </label>
          </div>`;

        const slider = dynamicControlsEl.querySelector('#pass-wc-slider');
        const sliderVal = dynamicControlsEl.querySelector('#pass-wc-val');
        syncSlider(slider);

        slider.addEventListener('input', () => {
          state.wordCount = parseInt(slider.value, 10);
          sliderVal.textContent = `${state.wordCount} words`;
          syncSlider(slider);
          pills.forEach(p => p.classList.toggle('is-active', parseInt(p.dataset.val, 10) === state.wordCount));
          generate();
        });

        const pills = dynamicControlsEl.querySelectorAll('.pass-preset-pill');
        pills.forEach(p => {
          p.addEventListener('click', () => {
            state.wordCount = parseInt(p.dataset.val, 10);
            slider.value = state.wordCount;
            sliderVal.textContent = `${state.wordCount} words`;
            syncSlider(slider);
            pills.forEach(pl => pl.classList.toggle('is-active', parseInt(pl.dataset.val, 10) === state.wordCount));
            generate();
          });
        });

        dynamicControlsEl.querySelector('#pass-sep-select').addEventListener('change', (e) => { state.separator = e.target.value; generate(); });
        dynamicControlsEl.querySelector('#pass-case-select').addEventListener('change', (e) => { state.casing = e.target.value; generate(); });
        dynamicControlsEl.querySelector('#pass-chk-num-end').addEventListener('change', (e) => { state.appendNumber = e.target.checked; generate(); });
        dynamicControlsEl.querySelector('#pass-chk-sym-end').addEventListener('change', (e) => { state.appendSymbol = e.target.checked; generate(); });

      } else if (state.mode === 'pin') {
        dynamicControlsEl.innerHTML = `
          <div class="pass-sec-title">PIN Configuration</div>
          <div class="pass-control-group">
            <label class="pass-label-mini">PIN Digits</label>
            <div class="pass-pill-selector" id="pass-pin-pills">
              <button type="button" class="pass-shape-pill ${state.pinLength === 4 ? 'is-active' : ''}" data-len="4">4 Digits</button>
              <button type="button" class="pass-shape-pill ${state.pinLength === 6 ? 'is-active' : ''}" data-len="6">6 Digits</button>
              <button type="button" class="pass-shape-pill ${state.pinLength === 8 ? 'is-active' : ''}" data-len="8">8 Digits</button>
              <button type="button" class="pass-shape-pill ${state.pinLength === 12 ? 'is-active' : ''}" data-len="12">12 Digits</button>
            </div>
          </div>

          <div class="pass-switch-rows" style="margin-top: 10px;">
            <label class="pass-switch-card">
              <span class="pass-switch-label-wrap">
                <span class="pass-switch-title">Filter Predictable Patterns</span>
                <span class="pass-switch-hint">Rejects sequences (1234, 1111)</span>
              </span>
              <span class="pass-switch-control">
                <input type="checkbox" id="pass-chk-obvious-pin" class="pass-switch-input" ${state.avoidObviousPin ? 'checked' : ''}>
                <span class="pass-switch-track"><span class="pass-switch-thumb"></span></span>
              </span>
            </label>
          </div>`;

        dynamicControlsEl.querySelectorAll('.pass-shape-pill').forEach(pill => {
          pill.addEventListener('click', () => {
            dynamicControlsEl.querySelectorAll('.pass-shape-pill').forEach(p => p.classList.remove('is-active'));
            pill.classList.add('is-active');
            state.pinLength = parseInt(pill.dataset.len, 10);
            generate();
          });
        });
        dynamicControlsEl.querySelector('#pass-chk-obvious-pin').addEventListener('change', (e) => { state.avoidObviousPin = e.target.checked; generate(); });

      } else if (state.mode === 'bulk') {
        dynamicControlsEl.innerHTML = `
          <div class="pass-sec-title">Batch Generation Parameters</div>
          <div class="pass-control-group">
            <div class="pass-slider-row">
              <label class="pass-label-mini">Quantity</label>
              <span class="pass-slider-bubble" id="pass-bulk-qty-val">${state.bulkCount} items</span>
            </div>
            <input type="range" class="pass-range-slider" id="pass-bulk-qty-slider" min="5" max="50" step="5" value="${state.bulkCount}">
            <div class="pass-preset-pills">
              <button type="button" class="pass-preset-pill ${state.bulkCount === 10 ? 'is-active' : ''}" data-val="10">10</button>
              <button type="button" class="pass-preset-pill ${state.bulkCount === 20 ? 'is-active' : ''}" data-val="20">20</button>
              <button type="button" class="pass-preset-pill ${state.bulkCount === 30 ? 'is-active' : ''}" data-val="30">30</button>
              <button type="button" class="pass-preset-pill ${state.bulkCount === 50 ? 'is-active' : ''}" data-val="50">50</button>
            </div>
          </div>

          <div class="pass-control-group" style="margin-top: 10px;">
            <div class="pass-slider-row">
              <label class="pass-label-mini">Length per Password</label>
              <span class="pass-slider-bubble" id="pass-bulk-len-val">${state.length} chars</span>
            </div>
            <input type="range" class="pass-range-slider" id="pass-bulk-len-slider" min="8" max="48" value="${state.length}">
          </div>`;

        const qtySlider = dynamicControlsEl.querySelector('#pass-bulk-qty-slider');
        const qtyVal = dynamicControlsEl.querySelector('#pass-bulk-qty-val');
        const qtyPills = dynamicControlsEl.querySelectorAll('.pass-preset-pill');
        syncSlider(qtySlider);

        qtySlider.addEventListener('input', () => {
          state.bulkCount = parseInt(qtySlider.value, 10);
          qtyVal.textContent = `${state.bulkCount} items`;
          syncSlider(qtySlider);
          qtyPills.forEach(p => p.classList.toggle('is-active', parseInt(p.dataset.val, 10) === state.bulkCount));
          generate();
        });

        qtyPills.forEach(p => {
          p.addEventListener('click', () => {
            state.bulkCount = parseInt(p.dataset.val, 10);
            qtySlider.value = state.bulkCount;
            qtyVal.textContent = `${state.bulkCount} items`;
            syncSlider(qtySlider);
            qtyPills.forEach(pl => pl.classList.toggle('is-active', parseInt(pl.dataset.val, 10) === state.bulkCount));
            generate();
          });
        });

        const lenSlider = dynamicControlsEl.querySelector('#pass-bulk-len-slider');
        const lenVal = dynamicControlsEl.querySelector('#pass-bulk-len-val');
        syncSlider(lenSlider);
        lenSlider.addEventListener('input', () => {
          state.length = parseInt(lenSlider.value, 10);
          lenVal.textContent = `${state.length} chars`;
          syncSlider(lenSlider);
          generate();
        });
      }
    }

    function renderPhonetics(pwd) {
      if (state.mode === 'bulk' || state.isMasked) {
        phoneticSectionEl.hidden = true;
        return;
      }
      phoneticSectionEl.hidden = false;
      const chars = [...pwd].slice(0, 10);
      phoneticStreamEl.innerHTML = chars.map(c => {
        const key = c.toLowerCase();
        const natoWord = NATO[key] || c;
        return `<span class="pass-phonetic-chip"><b class="pass-ph-c">${esc(c)}</b><span class="pass-ph-w">${esc(natoWord)}</span></span>`;
      }).join('');
    }

    function renderView() {
      const entropy = calculateEntropy(state.currentPassword);
      
      // Update Toolbar Compact Pill
      entropyChipTextEl.textContent = `${entropy.bits} bits`;
      entropyChipEl.className = `pass-entropy-pill is-${entropy.verdict === 'Ultra-Strong' || entropy.verdict === 'Strong' ? 'good' : entropy.verdict === 'Fair' ? 'warn' : 'weak'}`;
      
      // Update Metrics
      statEntropyEl.textContent = `${entropy.bits} bits`;
      statCrackEl.textContent = entropy.crackTime;
      statPoolEl.textContent = `${entropy.poolSize} characters`;

      // Update Hero Header Badge
      const modeLabelMap = {
        'password': 'RANDOM PASSWORD',
        'passphrase': 'DICEWARE PASSPHRASE',
        'pin': 'NUMERIC PIN CODE',
        'bulk': 'BATCH CREDENTIALS'
      };
      heroModeBadgeEl.textContent = modeLabelMap[state.mode] || 'CREDENTIAL';
      heroStrengthTextEl.textContent = `${entropy.verdict} Security`;
      heroStrengthPillEl.className = `pass-hero-strength-pill is-${entropy.verdict === 'Ultra-Strong' || entropy.verdict === 'Strong' ? 'good' : entropy.verdict === 'Fair' ? 'warn' : 'weak'}`;

      if (state.mode === 'bulk') {
        singleViewEl.hidden = true;
        bulkViewEl.hidden = false;
        bulkBadgeEl.textContent = `${state.bulkList.length} Generated Credentials`;
        bulkListContainerEl.innerHTML = state.bulkList.map((p, idx) => `
          <div class="pass-bulk-row">
            <span class="pass-bulk-idx">${idx + 1}</span>
            <code class="pass-bulk-code">${formatSyntaxStream(p)}</code>
            <button type="button" class="pass-bulk-copy-btn" data-pwd="${esc(p)}" title="Copy">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
          </div>
        `).join('');

        bulkListContainerEl.querySelectorAll('.pass-bulk-copy-btn').forEach(btn => {
          btn.addEventListener('click', async () => {
            const val = btn.dataset.pwd;
            await navigator.clipboard.writeText(val);
            btn.classList.add('is-copied');
            setTimeout(() => btn.classList.remove('is-copied'), 1500);
          });
        });
      } else {
        singleViewEl.hidden = false;
        bulkViewEl.hidden = true;
        syntaxStreamEl.innerHTML = formatSyntaxStream(state.currentPassword);

        // Bind click on word pills if in passphrase mode
        if (state.mode === 'passphrase' && !state.isMasked) {
          syntaxStreamEl.querySelectorAll('.pass-word-pill').forEach(btn => {
            btn.addEventListener('click', (e) => {
              e.stopPropagation();
              const idx = parseInt(btn.dataset.wordIdx, 10);
              reRollPhraseWord(idx);
            });
          });
        }
        
        // Strength bar fill
        const meterCount = entropy.bits >= 110 ? 4 : entropy.bits >= 80 ? 3 : entropy.bits >= 50 ? 2 : 1;
        const segments = strengthBarsEl.querySelectorAll('.pass-meter-segment');
        segments.forEach((seg, i) => {
          seg.className = `pass-meter-segment ${i < meterCount ? 'active is-' + (meterCount === 4 ? 'ultra' : meterCount === 3 ? 'strong' : meterCount === 2 ? 'fair' : 'weak') : ''}`;
        });
        crackHintEl.textContent = `GPU Cluster crack time: ${entropy.crackTime}`;
      }

      renderPhonetics(state.currentPassword);
    }

    // Event: Mode Tabs
    const modeTabs = container.querySelectorAll('.pass-mode-tab');
    modeTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        modeTabs.forEach(t => t.classList.remove('is-active'));
        tab.classList.add('is-active');
        state.mode = tab.dataset.mode;
        renderDynamicControls();
        generate();
      });
    });

    // Event: Regenerate
    function doRegen() {
      regenBtn.classList.add('is-spinning');
      heroRegenBtn?.classList.add('is-spinning');
      setTimeout(() => {
        regenBtn.classList.remove('is-spinning');
        heroRegenBtn?.classList.remove('is-spinning');
      }, 250);
      generate();
    }

    regenBtn.addEventListener('click', doRegen);
    heroRegenBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      doRegen();
    });

    // Event: Spacebar shortcut for instant regeneration
    const keyHandler = (e) => {
      if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'SELECT') {
        e.preventDefault();
        doRegen();
      }
    };
    window.addEventListener('keydown', keyHandler);

    // Event: Copy Single Password
    async function doCopy() {
      try {
        const textToCopy = state.mode === 'bulk' ? state.bulkList.join('\n') : state.currentPassword;
        await navigator.clipboard.writeText(textToCopy);
        copyTextEl.textContent = 'Copied!';
        copyBtn.classList.add('is-copied');
        heroCopyBtn?.classList.add('is-copied');
        outputBoxEl?.classList.add('is-copied');
        setTimeout(() => {
          copyTextEl.textContent = state.mode === 'bulk' ? 'Copy All' : 'Copy';
          copyBtn.classList.remove('is-copied');
          heroCopyBtn?.classList.remove('is-copied');
          outputBoxEl?.classList.remove('is-copied');
        }, 1800);
      } catch (err) {
        console.warn('Clipboard write error:', err);
      }
    }

    copyBtn.addEventListener('click', doCopy);
    heroCopyBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      doCopy();
    });

    outputBoxEl?.addEventListener('click', (e) => {
      if (e.target.closest('.pass-output-actions') || e.target.closest('.pass-word-pill')) {
        return;
      }
      doCopy();
    });

    // Event: Mask Toggle
    function toggleMask() {
      state.isMasked = !state.isMasked;
      maskLabelEl.textContent = state.isMasked ? 'Reveal' : 'Mask';
      maskBtn.classList.toggle('is-active', state.isMasked);
      heroMaskBtn?.classList.toggle('is-active', state.isMasked);
      if (heroMaskBtn) {
        heroMaskBtn.innerHTML = state.isMasked
          ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>`
          : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`;
      }
      renderView();
    }

    maskBtn.addEventListener('click', toggleMask);
    heroMaskBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMask();
    });

    // Event: Copy JSON
    jsonCopyBtn?.addEventListener('click', async () => {
      const ent = calculateEntropy(state.currentPassword);
      const data = {
        password: state.currentPassword,
        mode: state.mode,
        entropyBits: ent.bits,
        verdict: ent.verdict,
        crackTime: ent.crackTime,
        poolSize: ent.poolSize,
        csprng: 'Web Crypto API (SubtleCrypto)',
        generatedAt: new Date().toISOString()
      };
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      const lbl = jsonCopyBtn.querySelector('span');
      if (lbl) {
        const orig = lbl.textContent;
        lbl.textContent = 'Copied JSON!';
        jsonCopyBtn.classList.add('is-active');
        setTimeout(() => {
          lbl.textContent = orig;
          jsonCopyBtn.classList.remove('is-active');
        }, 1600);
      }
    });

    // Event: Reset Button
    container.querySelector('#pass-reset-btn')?.addEventListener('click', () => {
      state.mode = 'password';
      state.length = 24;
      state.useUpper = true;
      state.useLower = true;
      state.useNumbers = true;
      state.useSymbols = true;
      state.avoidAmbiguous = true;
      state.avoidRepeating = false;
      state.isMasked = false;
      maskLabelEl.textContent = 'Mask';
      maskBtn.classList.remove('is-active');
      heroMaskBtn?.classList.remove('is-active');
      modeTabs.forEach(t => t.classList.toggle('is-active', t.dataset.mode === 'password'));
      renderDynamicControls();
      generate();
    });

    function download(blob, filename) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    }

    container.querySelector('#pass-export-csv-btn')?.addEventListener('click', () => {
      let csv = 'Index,Password,Length,EntropyBits\n';
      state.bulkList.forEach((p, i) => {
        const ent = calculateEntropy(p);
        csv += `${i + 1},"${p}",${p.length},${ent.bits}\n`;
      });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      download(blob, `passwords-bulk-${Date.now()}.csv`);
    });

    container.querySelector('#pass-export-txt-btn')?.addEventListener('click', () => {
      const txt = state.bulkList.join('\n');
      const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
      download(blob, `passwords-bulk-${Date.now()}.txt`);
    });

    // Event: Print Emergency Vault Card
    container.querySelector('#pass-print-btn')?.addEventListener('click', () => {
      const ent = calculateEntropy(state.currentPassword);
      const w = window.open('', '_blank');
      if (w) {
        w.document.write(`
          <html>
            <head>
              <title>FileKit — Emergency Security Vault Card</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #18181B; }
                .card { border: 2px solid #18181B; border-radius: 12px; padding: 24px 32px; max-width: 540px; margin: 0 auto; }
                .head { display: flex; justify-content: space-between; border-bottom: 1px solid #E4E4E7; padding-bottom: 12px; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #71717A; }
                .pwd { font-family: monospace; font-size: 20px; font-weight: 700; background: #F4F4F5; padding: 14px 18px; border-radius: 8px; margin: 20px 0; word-break: break-all; text-align: center; }
                .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 12px; border-top: 1px solid #E4E4E7; padding-top: 14px; }
              </style>
            </head>
            <body>
              <div class="card">
                <div class="head">
                  <span>FileKit Security Vault Card</span>
                  <span>100% Client CSPRNG</span>
                </div>
                <div class="pwd">${esc(state.currentPassword)}</div>
                <div class="meta">
                  <div>Entropy: <b>${ent.bits} bits</b></div>
                  <div>Rating: <b>${ent.verdict}</b></div>
                  <div>Generated: <b>${new Date().toLocaleString()}</b></div>
                  <div>Algorithm: <b>Web Crypto API</b></div>
                </div>
              </div>
              <script>window.onload = () => { window.print(); window.close(); };<\/script>
            </body>
          </html>
        `);
        w.document.close();
      }
    });

    // Cleanup key listener on unmount
    const observer = new MutationObserver(() => {
      if (!document.body.contains(container)) {
        window.removeEventListener('keydown', keyHandler);
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Initial mount
    renderDynamicControls();
    generate();
  }

  /* ─── Export dispatchers ─── */
  window.__ffMountQrStudio = (c, t) => mountQrStudioPro(c, t);
  window.__ffMountPasswordStudio = (c, t) => mountPasswordStudioPro(c, t);
  window.__ffMountBgRemovePro = (c, t) => mountBgRemovePro(c, t);
  window.__ffMountUtilPro = (c, t) => mountUtilPro(c, t);
  window.__ffMountSheetPro = (c, t) => mountSheetPro(c, t);
  window.__ffMountDevPro = (c, t) => mountDevPro(c, t);
  window.__ffMountArcPro = (c, t) => mountArcPro(c, t);
  window.__ffMountEbookPro = (c, t) => mountEbookPro(c, t);
  window.__ffMountBizPro = (c, t) => mountBizPro(c, t);
  window.__ffMountAudPro = (c, t) => mountAudPro(c, t);
  if (typeof window.FF?.boot === 'function') {
    window.FF.boot();
  }
})();


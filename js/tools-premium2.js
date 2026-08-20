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
    opentype: () => U.loadScript('vendor/opentype.min.js', 'sha384-eGx3HP9p5kF4C2k1EkJd6W2BmT7dFZQJ4YW1dNZLWRptZ1HOF4x4NtVRkT6cQn8h').then(() => window.opentype),
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
      toolbar: container.querySelector('.pro-toolbar'),
      body: container.querySelector('.pro-body'),
      result: container.querySelector('.pro-result'),
      runBtn: container.querySelector('[data-pro-run]'),
      replaceBtn: container.querySelector('[data-pro-replace]'),
    };
  }

  function resultBar(s, { ok = true, title, msg, actions = [] }) {
    const el = s.result;
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
    const acceptsBadges = (accepts || []).map(a => `<span class="fmt-badge fmt-${a.toLowerCase()}">${a.toUpperCase()}</span>`).join(' ');
    container.innerHTML = `
      <div class="cpdf-dropzone drop-hero-box" data-pro-drop tabindex="0" role="button" aria-label="Upload ${esc(accepts.join(', ').toUpperCase())}">
        <div class="dropzone-idle">
          <div class="drop-illustration">
            <svg viewBox="0 0 220 150" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" class="standard-dz-svg">
              <rect x="38" y="98" width="144" height="36" rx="6" stroke="#CBD5E1" stroke-width="1.5" stroke-dasharray="6 6" stroke-linecap="round"/>
              <ellipse cx="70" cy="122" rx="24" ry="6" fill="#1A1714" opacity="0.06"/>
              <ellipse cx="110" cy="128" rx="24" ry="6" fill="#1A1714" opacity="0.06"/>
              <ellipse cx="150" cy="122" rx="24" ry="6" fill="#1A1714" opacity="0.06"/>
              <g transform="rotate(-9 66 74)">
                <rect x="46" y="48" width="40" height="52" rx="4" fill="#fff" stroke="#E2E8F0" stroke-width="1"/>
                <path d="M72 48h14v14z" fill="#F1F5F9"/>
                <rect x="52" y="66" width="28" height="3.5" rx="1.75" fill="#E5252A" opacity="0.9"/>
                <rect x="52" y="74" width="28" height="3.5" rx="1.75" fill="#E5252A" opacity="0.9"/>
                <rect x="52" y="82" width="17" height="3.5" rx="1.75" fill="#E5252A" opacity="0.9"/>
              </g>
              <g transform="rotate(9 154 74)">
                <rect x="134" y="48" width="40" height="52" rx="4" fill="#fff" stroke="#E2E8F0" stroke-width="1"/>
                <path d="M160 48h14v14z" fill="#F1F5F9"/>
                <circle cx="150" cy="63" r="3.5" fill="#EA580C" opacity="0.95"/>
                <path d="M142 88l8-10 6 7 5-4 7 7" stroke="#EA580C" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              </g>
              <g>
                <rect x="90" y="54" width="40" height="52" rx="4" fill="#fff" stroke="#E2E8F0" stroke-width="1"/>
                <path d="M116 54h14v14z" fill="#F1F5F9"/>
                <rect x="96" y="72" width="28" height="3.5" rx="1.75" fill="#2563EB" opacity="0.9"/>
                <rect x="96" y="80" width="28" height="3.5" rx="1.75" fill="#2563EB" opacity="0.9"/>
                <rect x="96" y="88" width="17" height="3.5" rx="1.75" fill="#2563EB" opacity="0.9"/>
              </g>
              <path d="M110 12v28m0 0l-9-9m9 9l9-9" stroke="#1A1714" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="36" cy="44" r="3.5" fill="#94A3B8"/>
              <circle cx="186" cy="52" r="3" fill="#94A3B8"/>
              <circle cx="190" cy="90" r="2.5" fill="#94A3B8"/>
              <circle cx="30" cy="90" r="2.5" fill="#94A3B8"/>
            </svg>
          </div>

          <div class="drop-action-group">
            <label for="pro2-inp-${tool.id}" class="select-files-main-btn">
              <svg class="plus-circle-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="12"/></svg>
              <span>${multiple ? 'Select files' : 'Select file'}</span>
            </label>
            <label for="pro2-inp-${tool.id}" class="select-files-chevron-btn" aria-label="More file options">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3.5 5.25L7 8.75l3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </label>
          </div>

          <p class="drop-sub-text">${esc(headline)}</p>

          <div class="supported-formats-row">
            <span class="fmt-label">Supported formats:</span>
            ${acceptsBadges}
          </div>
        </div>
        <input id="pro2-inp-${tool.id}" type="file" accept="${accepts.map(a => '.' + a).join(',')}" ${multiple ? 'multiple' : ''} hidden>
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
        s.toolbar.innerHTML = `<span class="pro-dim">${file.name} · ${bytes(file.size)}</span><span class="pro-live">Parsed locally</span>`;
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
        s.toolbar.innerHTML = `<span class="pro-dim">${file.name}</span><span class="pro-live">OTF output</span>`;
        s.runBtn.addEventListener('click', async () => {
          s.runBtn.disabled = true; s.runBtn.textContent = 'Converting…';
          try {
            const out = await tool.run({ file, engine: await load.opentype() });
            resultBar(s, { ok: true, title: 'Converted to OTF', msg: `${out.filename} · ${bytes(out.blob.size)}`, actions: [{ label: 'Download', cls: 'etxt-btn-finish', ico: dlIco, onClick: () => download(out.blob, out.filename) }] });
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
          resultBar(s, { ok: true, title: isTar ? 'TAR.GZ ready' : 'ZIP ready', msg: `${out.filename} · ${bytes(out.blob.size)}`, actions: [{ label: 'Download', cls: 'etxt-btn-finish', ico: dlIco, onClick: () => download(out.blob, out.filename) }] });
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
      s.toolbar.innerHTML = `<span class="pro-dim">${file.name}</span><span class="pro-live">Chunks local</span>`;
      s.runBtn.addEventListener('click', async () => {
        setBusy(s, true, 'Splitting…');
        try {
          const out = await tool.run({ file, inputs: { mb: document.querySelector('#split-mb').value } });
          resultBar(s, { ok: true, title: 'Parts ready', msg: `${out.filename} · ${bytes(out.blob.size)}`, actions: [{ label: 'Download', cls: 'etxt-btn-finish', ico: dlIco, onClick: () => download(out.blob, out.filename) }] });
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
      s.toolbar.innerHTML = `<span class="pro-dim">${file.name}</span><span class="pro-live">Browser-side</span>`;
      s.runBtn.addEventListener('click', async () => {
        setBusy(s, true, 'Extracting…');
        try {
          const out = await tool.run({ file, inputs: { action: s.body.querySelector('[data-k=action]').value } });
          resultBar(s, { ok: true, title: 'Extraction ready', msg: `${out.filename} · ${bytes(out.blob.size)}`, actions: [{ label: 'Download', cls: 'etxt-btn-finish', ico: dlIco, onClick: () => download(out.blob, out.filename) }] });
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
      s.toolbar.innerHTML = `<span class="pro-dim">${file.name}</span><span class="pro-live">Offline</span>`;
      s.runBtn.addEventListener('click', async () => {
        setBusy(s, true, 'Building report…');
        try {
          const out = await tool.run({ file, inputs: { sql: document.querySelector('#sql-query').value, exportFormat: document.querySelector('#sql-fmt').value } });
          resultBar(s, { ok: true, title: 'Report ready', msg: `${out.filename} · ${bytes(out.blob.size)}`, actions: [{ label: 'Download', cls: 'etxt-btn-finish', ico: dlIco, onClick: () => download(out.blob, out.filename) }] });
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
      s.body.innerHTML = `<div class="pro-reader-list" data-chapters></div><div class="pro-reader-pane"><div class="pro-reader-meta" id="rd-meta"></div><div class="pro-reader-text" id="rd-text"><div class="pro-live-err">Loading book…</div></div></div>`;
      const chapterList = s.body.querySelector('[data-chapters]');
      const textEl = s.body.querySelector('#rd-text');
      const metaEl = s.body.querySelector('#rd-meta');
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
          textEl.innerHTML = `<p class="pro-reader-body">${esc(strip(chapters[i].html))}</p>`;
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
          resultBar(s, { ok: true, title: 'Chapters exported', msg: `${chapters.length} HTML files in chapters.zip`, actions: [{ label: 'Download', cls: 'etxt-btn-finish', ico: dlIco, onClick: () => download(blob, 'chapters.zip') }] });
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
      s.runBtn.addEventListener('click', () => { if (coverBlob) download(coverBlob, coverName); });
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
          resultBar(s, { ok: true, title: 'EPUB repackaged', msg: `${baseName(file.name)}-edited.epub · ${bytes(blob.size)}`, actions: [{ label: 'Download', cls: 'etxt-btn-finish', ico: dlIco, onClick: () => download(blob, baseName(file.name) + '-edited.epub') }] });
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
          resultBar(s, { ok: true, title: 'Invoice generated', msg: `${out.filename} · ${bytes(out.blob.size)}`, actions: [{ label: 'Download', cls: 'etxt-btn-finish', ico: dlIco, onClick: () => download(out.blob, out.filename) }] });
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
          resultBar(s, { ok: true, title: 'Receipt generated', msg: `${out.filename} · ${bytes(out.blob.size)}`, actions: [{ label: 'Download', cls: 'etxt-btn-finish', ico: dlIco, onClick: () => download(out.blob, out.filename) }] });
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
              resultBar(s, { ok: true, title: 'Summary ready', msg: `${out.filename} · ${bytes(out.blob.size)}`, actions: [{ label: 'Download', cls: 'etxt-btn-finish', ico: dlIco, onClick: () => download(out.blob, out.filename) }] });
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
                ok: true, title: 'Audiogram ready', msg: `${out.filename} · ${bytes(out.blob.size)}`,
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
          resultBar(s, { ok: true, title: 'XLSX ready', msg: `${out.filename} · ${bytes(out.blob.size)} · ${aoa.length} rows`, actions: [{ label: 'Download', cls: 'etxt-btn-finish', ico: dlIco, onClick: () => download(out.blob, out.filename) }] });
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
          resultBar(s, { ok: true, title: 'CSV ready', msg: `${out.filename} · ${bytes(out.blob.size)}`, actions: [{ label: 'Download', cls: 'etxt-btn-finish', ico: dlIco, onClick: () => download(out.blob, out.filename) }] });
        } catch (e) { resultBar(s, { ok: false, title: 'Could not convert', msg: e.message }); }
        finally { setBusy(s, false); }
      });
    }
  }

  /* ─── AI Background Remover (ISNet small via vendored onnxruntime) ─── */
  const BGR_ACC = ['png', 'jpg', 'jpeg', 'webp', 'bmp'];
  const BGR_MODEL = '/vendor/imgly/isnet_small.onnx';
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
        const ort = await import('/vendor/ort.min.mjs');
        ort.env.wasm.wasmPaths = '/vendor/';
        const buf = await fetchBgrModel();
        if (bgrOnProg) bgrOnProg(0.96, 'Warming up the model');
        const session = await ort.InferenceSession.create(buf, { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
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
          resultBar(s, {
            ok: true, title: 'Background removed',
            msg: `${img.naturalWidth}×${img.naturalHeight}px → transparent PNG · processed on-device`,
            actions: [{ label: 'Download PNG', cls: 'etxt-btn-finish', ico: dlIco, onClick: () => download(outBlob, `${U.baseName(file.name)}-bg-removed.png`) }],
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

  /* ─── Export dispatchers ─── */
  window.__ffMountBgRemovePro = (c, t) => mountBgRemovePro(c, t);
  window.__ffMountUtilPro = (c, t) => mountUtilPro(c, t);
  window.__ffMountSheetPro = (c, t) => mountSheetPro(c, t);
  window.__ffMountDevPro = (c, t) => mountDevPro(c, t);
  window.__ffMountArcPro = (c, t) => mountArcPro(c, t);
  window.__ffMountEbookPro = (c, t) => mountEbookPro(c, t);
  window.__ffMountBizPro = (c, t) => mountBizPro(c, t);
  window.__ffMountAudPro = (c, t) => mountAudPro(c, t);
})();

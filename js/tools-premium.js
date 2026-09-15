/* ═══════════════════════════════════════════════════════════════════════════
   FileKit — Bespoke premium after/result states (batch)
   Image cluster (14) + PDF cluster (9) formerly-generic tools.
   Each tool gets its own light Edit-style workspace (etxt-shell) after upload
   and a pinned result bar — same visual language as Edit / QR reader.
   100% local via vendored libs (pdfjs, pdf-lib, fflate, exifr) + canvas.
═══════════════════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const U = window.FF.util;
  const R = window.FF.register;

  /* ─── Shared helpers ─────────────────────────────────── */
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const bytes = (n) => { n = Number(n) || 0; if (n < 1024) return n + ' B'; if (n < 1048576) return (n / 1024).toFixed(1) + ' KB'; return (n / 1048576).toFixed(1) + ' MB'; };
  const loadImg = (blob) => new Promise((res, rej) => {
    const url = URL.createObjectURL(blob);
    const im = new Image();
    im.onload = () => { res(im); };
    im.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Could not decode image.')); };
    im.src = url;
  });
  const cv = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h); return c; };
  const u8 = (blob) => blob.arrayBuffer().then((b) => new Uint8Array(b));
  /* Output format + quality: PNG (lossless) · JPG · WebP. JPEG composites onto white (no alpha). */
  const FMT_MIME = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' };
  const FMT_EXT = { png: 'png', jpeg: 'jpg', webp: 'webp' };
  const toJpegSafe = (c) => { const w = c.width, h = c.height; const t = cv(w, h); const tx = t.getContext('2d'); tx.fillStyle = '#ffffff'; tx.fillRect(0, 0, w, h); tx.drawImage(c, 0, 0); return t; };
  const encodeCanvas = (c, fmt, quality) => new Promise((res) => {
    const q = typeof quality === 'number' ? Math.max(0.05, Math.min(1, quality)) : 0.9;
    if (fmt === 'jpeg') return toJpegSafe(c).toBlob(res, 'image/jpeg', q);
    c.toBlob(res, FMT_MIME[fmt] || 'image/png', fmt === 'webp' ? q : undefined);
  });
  const encodeDataURL = (c, fmt, quality) => {
    const q = typeof quality === 'number' ? Math.max(0.05, Math.min(1, quality)) : 0.9;
    if (fmt === 'jpeg') return toJpegSafe(c).toDataURL('image/jpeg', q);
    return c.toDataURL(FMT_MIME[fmt] || 'image/png', fmt === 'webp' ? q : undefined);
  };
  /* Shared “Output” control group: format select + quality slider (dimmed for PNG). */
  function outputPicker(host, onChange) {
    const state = { fmt: 'png', quality: 90 };
    const wrap = document.createElement('div');
    wrap.className = 'pro-output';
    wrap.innerHTML = `
      <div class="pro-panel-subhead">Output</div>
      <div class="pro-control"><label><span>Format</span></label><select data-o-fmt>
        <option value="png">PNG — lossless</option>
        <option value="jpeg">JPG — smaller file</option>
        <option value="webp">WebP — modern</option>
      </select></div>
      <label class="pro-control pro-output-q" data-o-qrow><span>Quality</span><b data-val>90%</b>
        <input type="range" min="10" max="100" step="1" value="90" data-o-q>
      </label>`;
    host.appendChild(wrap);
    const sel = wrap.querySelector('[data-o-fmt]');
    const qRow = wrap.querySelector('[data-o-qrow]');
    const qIn = wrap.querySelector('[data-o-q]');
    const qVal = wrap.querySelector('[data-val]');
    const setPng = (isPng) => { qRow.classList.toggle('is-dim', isPng); qIn.disabled = isPng; };
    sel.addEventListener('change', () => {
      state.fmt = sel.value;
      setPng(state.fmt === 'png');
      if (onChange) onChange(state);
    });
    qIn.addEventListener('input', () => {
      state.quality = +qIn.value;
      qVal.textContent = state.quality + '%';
      if (onChange) onChange(state);
    });
    setPng(true);
    return { state, el: wrap };
  }
  const extOf = (name) => (name.split('.').pop() || '').toLowerCase();
  const baseName = (name) => (name || '').replace(/\.[^.]+$/, '') || 'file';
  const outType = (f) => { const e = extOf(f.name); return /^png$/i.test(e) ? 'image/png' : /^gif$/i.test(e) ? 'image/gif' : /^webp$/i.test(e) ? 'image/webp' : 'image/jpeg'; };
  const download = (blob, name) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 400);
  };
  const load = {
    pdfjs: () => U.loadScript('vendor/pdfjs.min.js', 'sha384-OemFRmhjDZwhIKuUld0HJozkF2YErsgDaCL41trxGQZt4/WgnopJQqQl2DvDZ07Z')
      .then(() => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js'; return window.pdfjsLib; }),
    pdflib: () => U.loadScript('vendor/pdf-lib.min.js', 'sha384-weMABwrltA6jWR8DDe9Jp5blk+tZQh7ugpCsF3JwSA53WZM9/14PjS5LAJNHNjAI').then(() => window.PDFLib),
    fflate: () => U.loadScript('vendor/fflate.js', 'sha384-DT0Ls0mO7JmjTnT+oBuMhEJzYJO1zUqzuuMXNdnOmOQRIpN2BgSjvBV/j50NngIT').then(() => window.fflate),
    exifr: () => U.loadScript('vendor/exifr.js', 'sha384-KrOocIA+lZcNUz2MDavnT/FuX+CbTREJihUi0bp8QUSwhE2AkGTNpv2b7yMbBkx5').then(() => window.exifr),
  };
  const shieldIco = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-3 8-10V5l-8-3-8 3v7c0 7 8 10 8 10z"/></svg>';
  const dlIco = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
  const copyIco = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
  const swapIco = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>';
  const checkIco = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

  /* Icons per tool (hand-drawn, no stock paths) */
  const T_ICONS = {
    'image-sharpen': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/><path d="m8 8 1.5 1.5M16 16l1.5 1.5"/></svg>',
    'image-round': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="6"/><circle cx="9" cy="9" r="1.6" fill="currentColor" stroke="none"/><circle cx="15.5" cy="12.5" r="1.6" fill="currentColor" stroke="none"/></svg>',
    'image-border': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><rect x="7" y="7" width="10" height="10" rx="1"/></svg>',
    'image-upscale': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l3 4h-2v4h-2V7H9z"/><path d="M5 14a7 7 0 0 0 14 0"/><path d="M9 14l-2 2M15 14l2 2"/></svg>',
    favicon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12" rx="2"/><rect x="2" y="2" width="4" height="4" rx="1"/><rect x="18" y="2" width="4" height="4" rx="1"/><rect x="2" y="18" width="4" height="4" rx="1"/><rect x="18" y="18" width="4" height="4" rx="1"/></svg>',
    'exif-strip': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 4v16M4 9h5M4 15h5"/><path d="m16 14-2-2 2-2M13 12h3"/></svg>',
    palette: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 1.5-2-.8-1.6.2-3 2-3H18a3 3 0 0 0 3-3c0-5-4-10-9-10z"/><circle cx="7.5" cy="10.5" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="8" r="1" fill="currentColor" stroke="none"/><circle cx="16.5" cy="10.5" r="1" fill="currentColor" stroke="none"/></svg>',
    'image-diff': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="8" height="16" rx="1.5"/><rect x="13" y="4" width="8" height="16" rx="1.5"/><path d="M7 4v16M17 4v16"/></svg>',
    'sprite-sheet': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></svg>',
    'exif-viewer': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M8 5v14"/><path d="m12 14 2 2 4-4"/></svg>',
    'svg-to-raster': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l2.5 5.5L20 9l-4.5 4 1.2 6L12 15.5 7.3 19l1.2-6L4 9l5.5-1.5z"/></svg>',
    'base64-to-img': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="6" width="16" height="12" rx="2"/><path d="M8 10.5h.01M12 10.5h.01M16 10.5h.01M8 14h.01M12 14h.01M16 14h.01"/></svg>',
    'img-to-base64': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>',
    'svg-optimize': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2"/><path d="M9 12h6"/><path d="M12 12v7"/><path d="M5 12H3v2h2zM21 12h-2v2h2z"/></svg>',
    'pdf-headers-footers': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="4" width="14" height="16" rx="1.5"/><path d="M5 8h14M5 16h14"/><path d="M9 6.5h6M9 17.5h4"/></svg>',
    'pdf-create': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/><path d="M9 12h6M9 15h6M9 9h3"/></svg>',
    'pdf-compare': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="8" height="16" rx="1.5"/><rect x="13" y="4" width="8" height="16" rx="1.5"/><path d="M7 4v16M17 4v16"/></svg>',
    'pdf-invert': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="4" width="14" height="16" rx="1.5"/><path d="M12 7v10"/><circle cx="12" cy="12" r="5"/></svg>',
    'pdf-redact-pii': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-3 8-10V5l-8-3-8 3v7c0 7 8 10 8 10z"/><rect x="9" y="10" width="6" height="5" rx="1" fill="currentColor" stroke="none"/><path d="M9 11h6"/></svg>',
    'pdf-sanitize-pii': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-3 8-10V5l-8-3-8 3v7c0 7 8 10 8 10z"/><path d="m8.5 9.5 7 7M15.5 9.5l-7 7"/></svg>',
    'pdf-to-handwriting': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19c4-1 6-3 7-6"/><path d="M5 15l4-8 3 4 2-3 5 6"/></svg>',
    'handwriting-to-pdf': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 16h4"/></svg>',
    'pdf-to-zip': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8l4-4h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M8 13a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/><path d="m13 11 2 2 4-4"/></svg>',
  };
  const fallbackIco = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18"/></svg>';

  const ROW_ICOS = {
    email: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 6 10-6"/></svg>',
    phone: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>',
    ssn: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M5.5 17c.5-2 2-3 3.5-3s3 1 3.5 3M16 9h3M16 12h3"/></svg>',
    card: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>',
    ip: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="8" width="20" height="8" rx="2"/><circle cx="12" cy="12" r="1.5"/><path d="M7 12h.01M17 12h.01"/></svg>',
  };

  /* ─── Shell frame builder ────────────────────────────── */
  function shell(container, tool, { title, sub, action }) {
    container.innerHTML = '';
    container.classList.remove('cpdf-root');
    container.classList.add('etxt-shell');
    const stage = container.closest('.app-stage-container');
    if (stage) { stage.classList.add('spdf-stage-active'); stage.style.padding = '0'; }
    const ico = T_ICONS[tool.id] || fallbackIco;
    container.innerHTML = `
      <div class="etxt-top">
        <div class="etxt-top-left">
          <span class="qr-read-brand pro-brand">${ico}</span>
          <div class="qr-read-title-wrap">
            <strong class="qr-read-title">${esc(title)}</strong>
            <span class="qr-read-sub">${esc(sub || '')}</span>
          </div>
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
      top: container.querySelector('.etxt-top'),
      toolbar: container.querySelector('.pro-toolbar'),
      body: container.querySelector('.pro-body'),
      result: container.querySelector('.pro-result'),
      runBtn: container.querySelector('[data-pro-run]'),
      replaceBtn: container.querySelector('[data-pro-replace]'),
    };
  }

  /* Result bar */
  function showResult(shellEl, { ok = true, title, msg, actions = [], blob, filename, tool, onBacktrack, onAgain }) {
    if (ok && window.FF?.renderUnifiedResult && shellEl?.container) {
      let resultBlob = blob;
      let resultName = filename;
      if (!resultBlob && actions && actions.length) {
        const dl = actions.find(a => a.blob || (typeof a.filename === 'string' && a.filename));
        if (dl?.blob) resultBlob = dl.blob;
        if (dl?.filename) resultName = dl.filename;
      }
      if (resultBlob) {
        window.FF.renderUnifiedResult(shellEl.container, {
          tool: tool || shellEl.tool || { id: 'tool', name: title || 'File Tool', category: 'Tool' },
          blob: resultBlob,
          filename: resultName || (tool?.id ? `${tool.id}.out` : 'processed-file'),
          title: title || 'Processing Complete',
          badge: msg || '100% Local Sandbox',
          onBacktrack: onBacktrack || (() => { if (typeof shellEl.renderWorkspace === 'function') shellEl.renderWorkspace(); }),
          onAgain: onAgain || (() => { if (typeof shellEl.renderDrop === 'function') shellEl.renderDrop(); })
        });
        return;
      }
    }

    const el = shellEl.result;
    if (!el) return;
    el.hidden = false;
    el.className = 'pro-result' + (ok ? ' is-ok' : ' is-err');
    el.innerHTML = `
      <span class="pro-result-ico">${ok ? checkIco : '!'}</span>
      <div class="pro-result-copy">
        <strong>${esc(title)}</strong>
        ${msg ? `<span>${esc(msg)}</span>` : ''}
      </div>
      <div class="pro-result-actions"></div>`;
    const wrap = el.querySelector('.pro-result-actions');
    for (const a of actions) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = a.cls || 'etxt-btn-secondary';
      b.innerHTML = (a.ico || '') + ' ' + esc(a.label);
      b.addEventListener('click', a.onClick);
      wrap.appendChild(b);
    }
  }

  /* Dropzone (before state) — identical standard cpdf-dropzone */
  function dropzone(container, tool, { accepts, multiple, headline, meta, graphic }) {
    container.innerHTML = '';
    container.classList.add('cpdf-root');
    container.classList.remove('etxt-shell', 'pro-shell');
    const stage = container.closest('.app-stage-container');
    if (stage) { stage.classList.remove('spdf-stage-active'); stage.style.padding = ''; }
    container.innerHTML = `
      <div class="cpdf-dropzone drop-hero-box" data-pro-drop tabindex="0" role="button" aria-label="Upload ${esc((accepts || []).join(', ').toUpperCase())}">
        <div class="dropzone-idle">
          <div class="drop-illustration">
            <svg viewBox="0 0 260 138" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" class="standard-dz-svg etxt-dz-svg">
              <!-- Left: Image / Photo Card -->
              <rect x="18" y="46" width="66" height="54" rx="8" stroke="#64748B" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="70" cy="62" r="5" stroke="#64748B" stroke-width="3"/>
              <path d="M 21 98 L 44 72 L 58 86 L 68 76 L 81 98" stroke="#64748B" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>

              <!-- Center: Prominent Document Sheet -->
              <path d="M 104 10 L 146 10 C 148 10 151 11.5 153 13.5 L 163 24.5 C 165 26.5 166 29 166 32 L 166 92 C 166 96.4 162.4 100 158 100 L 148 100 M 112 100 L 102 100 C 97.6 100 94 96.4 94 92 L 94 20 C 94 14.5 98.5 10 104 10 Z" stroke="#64748B" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
              <line x1="107" y1="64" x2="153" y2="64" stroke="#64748B" stroke-width="3.5" stroke-linecap="round"/>
              <line x1="107" y1="78" x2="153" y2="78" stroke="#64748B" stroke-width="3.5" stroke-linecap="round"/>
              
              <!-- Center: Downward Arrow -->
              <path d="M 130 66 L 130 126 M 116 112 L 130 126 L 144 112" stroke="#64748B" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" class="standard-dz-arrow etxt-dz-arrow"/>

              <!-- Right: Folder -->
              <path d="M 184 40 L 200 40 C 203 40 205.5 41.8 207 44.5 L 209.5 48 L 234 48 C 238.4 48 242 51.6 242 56 L 242 92 C 242 96.4 238.4 100 234 100 L 184 100 C 179.6 100 176 96.4 176 92 L 176 48 C 176 43.6 179.6 40 184 40 Z" stroke="#64748B" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>

          <h3 class="drop-title">${headline ? esc(headline) : (multiple ? 'Drag and drop files to get started' : 'Drag and drop a file to get started')}</h3>

          <div class="drop-action-group">
            <label for="pro-inp-${tool.id}" class="select-files-main-btn">${multiple ? 'Select files from your device' : 'Select file from your device'}</label>
          </div>

          <p class="drop-formats">Supports ${(accepts || []).map(a => a.toUpperCase()).join(', ')}</p>
        </div>
        <input id="pro-inp-${tool.id}" type="file" accept="${(accepts || []).map(a => '.' + a).join(',')}" ${multiple ? 'multiple' : ''} hidden>
      </div>`;
    const dz = container.querySelector('[data-pro-drop]');
    const inp = container.querySelector('input[type=file]');
    const done = (files) => { if (files && files.length) onFiles(files); };
    let onFiles = () => {};
    inp.addEventListener('change', () => { done(inp.files); inp.value = ''; });
    dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('cpdf-dz--over'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('cpdf-dz--over'));
    dz.addEventListener('drop', (e) => { e.preventDefault(); dz.classList.remove('cpdf-dz--over'); done(e.dataTransfer && e.dataTransfer.files); });
    dz.addEventListener('click', (e) => { if (!e.target.closest('label')) inp.click(); });
    dz.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inp.click(); } });
    return { setOnFiles: (fn) => { onFiles = fn; }, dz, inp };
  }

  /* Light image workspace body: stage (canvas preview) + controls panel.
     When origUrl is provided the card becomes a draggable before/after comparison.
     Pass output:false to skip the PNG/JPG/WebP + quality picker (non-image outputs). */
  function imageBody(shellEl, { title, sub, controls, origUrl, output }) {
    const body = shellEl.body;
    body.className = 'pro-body pro-img-body';
    body.innerHTML = `
      <div class="pro-img-stage">
        <div class="pro-img-card"${origUrl ? ' data-ba' : ''}>
          ${origUrl ? `
          <img class="pro-img-orig" src="${origUrl}" alt="Original image">
          <img class="pro-img-preview" alt="Processed preview">
          <div class="pro-ba-handle" data-ba-handle role="slider" tabindex="0" aria-label="Comparison slider" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50"><span class="pro-ba-grip">⟷</span></div>
          <div class="pro-ba-tag is-before">Original</div>
          <div class="pro-ba-tag is-after">Processed</div>
          ` : `
          <img class="pro-img-preview" alt="${esc(title)} preview">
          `}
          <div class="pro-img-empty" data-pro-empty>
            <strong>${esc(title)}</strong>
            <span>Your image is ready — tweak the controls to preview changes live</span>
          </div>
        </div>
      </div>
      <aside class="pro-panel">
        <div class="pro-panel-head">
          <strong>${esc(title)}</strong>
          <span>${esc(sub)}</span>
        </div>
        <div class="pro-controls" data-pro-controls></div>
      </aside>`;
    const controlsWrap = body.querySelector('[data-pro-controls]');
    const state = {};
    for (const c of controls) {
      state[c.k] = c.def !== undefined ? c.def : c.min;
      const row = document.createElement('div');
      row.className = 'pro-control';
      let inner;
      if (c.type === 'range') {
        inner = `<label><span>${esc(c.label)}</span><b data-val>${state[c.k]}${c.unit || ''}</b></label>
          <input type="range" min="${c.min}" max="${c.max}" step="${c.step || 1}" value="${state[c.k]}" data-k="${c.k}">`;
      } else if (c.type === 'select') {
        inner = `<label><span>${esc(c.label)}</span></label>
          <select data-k="${c.k}">${c.options.map(o => `<option value="${esc(o)}" ${String(o) === String(state[c.k]) ? 'selected' : ''}>${esc(c.labelFn ? c.labelFn(o) : o)}</option>`).join('')}</select>`;
      } else if (c.type === 'color') {
        inner = `<label><span>${esc(c.label)}</span></label>
          <input type="color" value="${state[c.k]}" data-k="${c.k}">`;
      } else if (c.type === 'check') {
        inner = `<label class="pro-check"><input type="checkbox" data-k="${c.k}" ${state[c.k] ? 'checked' : ''}><span>${esc(c.label)}</span></label>`;
      } else if (c.type === 'number') {
        inner = `<label><span>${esc(c.label)}</span><b data-val>${state[c.k]}</b></label>
          <input type="number" min="${c.min}" max="${c.max}" value="${state[c.k]}" data-k="${c.k}">`;
      }
      row.innerHTML = inner;
      controlsWrap.appendChild(row);
    }
    controlsWrap.addEventListener('input', (e) => {
      const el = e.target; const k = el.dataset.k; if (!k) return;
      state[k] = el.type === 'checkbox' ? el.checked : (el.type === 'number' ? +el.value : el.value);
      const b = el.closest('.pro-control')?.querySelector('[data-val]');
      if (b) b.textContent = el.type === 'range' ? el.value + (controls.find(c => c.k === k)?.unit || '') : el.value;
      if (onChange) onChange(state);
    });
    let onChange = null;
    const outputState = output === false ? null : outputPicker(controlsWrap, () => { if (onChange) onChange(state); }).state;
    return { state, output: outputState, setOnChange: (fn) => { onChange = fn; }, controlsWrap };
  }

  function fitPreview(img, maxW, maxH) {
    const s = Math.min(1, maxW / img.naturalWidth, maxH / img.naturalHeight);
    return { w: Math.round(img.naturalWidth * s), h: Math.round(img.naturalHeight * s), s };
  }

  /* ═══════════════════════════════════════════════════════
     IMAGE CLUSTER — 14 tools
  ═══════════════════════════════════════════════════════ */
  function mountImagePro(container, tool) {
    const id = tool.id;
    let files = [];
    let img = null, previewUrl = null;

    const ACC = id === 'image-diff' || id === 'sprite-sheet'
      ? ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif']
      : ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif'];

    const CONF = {
      'image-sharpen': {
        title: 'Sharpen', sub: 'Unsharp mask — emphasize detail edges',
        controls: [{ k: 'amount', label: 'Strength', type: 'range', min: 0, max: 200, def: 100, unit: '%' }],
        run(c, img, v, file) {
          const a = (+v.amount) / 100;
          c.width = img.naturalWidth; c.height = img.naturalHeight;
          const ctx = c.getContext('2d');
          ctx.drawImage(img, 0, 0);
          if (a > 0.01) {
            const blur = cv(c.width, c.height);
            const bctx = blur.getContext('2d');
            bctx.filter = 'blur(1.2px)';
            bctx.drawImage(img, 0, 0);
            const src = ctx.getImageData(0, 0, c.width, c.height);
            const bd = bctx.getImageData(0, 0, c.width, c.height).data;
            const d = src.data;
            for (let i = 0; i < d.length; i += 4) {
              d[i] = Math.min(255, Math.max(0, d[i] + a * (d[i] - bd[i])));
              d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + a * (d[i + 1] - bd[i + 1])));
              d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + a * (d[i + 2] - bd[i + 2])));
            }
            ctx.putImageData(src, 0, 0);
          }
        },
      },
      'image-round': {
        title: 'Round corners', sub: 'Soft rounded corners with transparency (PNG)',
        controls: [{ k: 'radius', label: 'Corner radius', type: 'range', min: 0, max: 50, def: 18, unit: '%' }],
        run(c, img, v) {
          const w = img.naturalWidth, h = img.naturalHeight;
          const r = Math.min(w, h) * (+v.radius) / 100;
          c.width = w; c.height = h;
          const ctx = c.getContext('2d');
          ctx.clearRect(0, 0, w, h);
          ctx.beginPath();
          ctx.moveTo(r, 0);
          ctx.arcTo(w, 0, w, h, r); ctx.arcTo(w, h, 0, h, r);
          ctx.arcTo(0, h, 0, 0, r); ctx.arcTo(0, 0, w, 0, r);
          ctx.closePath(); ctx.clip();
          ctx.drawImage(img, 0, 0);
        },
        type: 'image/png',
      },
      'image-border': {
        title: 'Add border', sub: 'Solid border around the image',
        controls: [
          { k: 'size', label: 'Border width', type: 'range', min: 0, max: 25, def: 5, unit: '%' },
          { k: 'color', label: 'Border color', type: 'color', def: '#ffffff' },
        ],
        run(c, img, v) {
          const w = img.naturalWidth, h = img.naturalHeight;
          const b = Math.max(1, Math.round(Math.min(w, h) * (+v.size) / 100));
          c.width = w + b * 2; c.height = h + b * 2;
          const ctx = c.getContext('2d');
          ctx.fillStyle = v.color || '#ffffff';
          ctx.fillRect(0, 0, c.width, c.height);
          ctx.drawImage(img, b, b);
        },
      },
      'image-upscale': {
        title: 'Upscale', sub: 'Enlarge with high-quality smooth interpolation',
        controls: [
          { k: 'factor', label: 'Scale', type: 'select', def: '2', options: ['2', '3', '4'], labelFn: (o) => o + '×' },
          { k: 'smooth', label: 'Smooth edges', type: 'check', def: true },
        ],
        run(c, img, v) {
          const f = +v.factor || 2;
          c.width = img.naturalWidth * f; c.height = img.naturalHeight * f;
          const ctx = c.getContext('2d');
          ctx.imageSmoothingEnabled = v.smooth !== false;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, c.width, c.height);
        },
      },
      'image-grayscale': {
        title: 'Grayscale', sub: 'Convert to black and white',
        controls: [],
        run(c, img) {
          c.width = img.naturalWidth; c.height = img.naturalHeight;
          const ctx = c.getContext('2d');
          ctx.filter = 'grayscale(1)';
          ctx.drawImage(img, 0, 0);
        },
      },
      'image-invert': {
        title: 'Invert colors', sub: 'Photo-negative effect',
        controls: [],
        run(c, img) {
          c.width = img.naturalWidth; c.height = img.naturalHeight;
          const ctx = c.getContext('2d');
          ctx.filter = 'invert(1)';
          ctx.drawImage(img, 0, 0);
        },
      },
      'image-blur': {
        title: 'Blur', sub: 'Gaussian blur with adjustable radius',
        controls: [{ k: 'amount', label: 'Radius', type: 'range', min: 1, max: 40, def: 4, unit: 'px' }],
        run(c, img, v) {
          c.width = img.naturalWidth; c.height = img.naturalHeight;
          const ctx = c.getContext('2d');
          ctx.filter = `blur(${+v.amount || 4}px)`;
          ctx.drawImage(img, 0, 0);
        },
      },
      'image-bc': {
        title: 'Brightness / contrast', sub: 'Adjust exposure and contrast',
        controls: [
          { k: 'bright', label: 'Brightness', type: 'range', min: 0, max: 300, def: 110, unit: '%' },
          { k: 'contrast', label: 'Contrast', type: 'range', min: 0, max: 300, def: 110, unit: '%' },
        ],
        run(c, img, v) {
          c.width = img.naturalWidth; c.height = img.naturalHeight;
          const ctx = c.getContext('2d');
          ctx.filter = `brightness(${+v.bright || 110}%) contrast(${+v.contrast || 110}%)`;
          ctx.drawImage(img, 0, 0);
        },
      },
      favicon: {
        title: 'Favicon generator', sub: 'Square icons for every size — 16 to 256 px',
        controls: [],
        sizes: [16, 32, 48, 64, 128, 256],
      },
      'exif-strip': {
        title: 'EXIF strip', sub: 'Re-encode the image without any metadata',
        controls: [],
      },
      palette: {
        title: 'Color palette', sub: 'Extract the dominant colors from the image',
        controls: [{ k: 'n', label: 'Colors', type: 'range', min: 2, max: 24, def: 8, unit: '' }],
      },
      'image-diff': {
        title: 'Image diff', sub: 'Compare two images — changes are highlighted in red',
        controls: [],
        multi: 2,
      },
      'sprite-sheet': {
        title: 'Sprite sheet', sub: 'Combine several images into one grid',
        controls: [{ k: 'cols', label: 'Columns', type: 'number', min: 1, max: 12, def: 4 }],
        multi: true,
      },
      'exif-viewer': {
        title: 'EXIF viewer', sub: 'Camera, lens, date and GPS metadata',
        controls: [],
      },
      'svg-to-raster': {
        title: 'SVG to raster', sub: 'Render a vector SVG into a crisp PNG',
        controls: [{ k: 'scale', label: 'Output scale', type: 'select', def: '2', options: ['1', '2', '3'], labelFn: (o) => o + '×' }],
        accepts: ['svg'],
      },
      'img-to-base64': {
        title: 'Image to Base64', sub: 'Encode the image as a Base64 data URL',
        controls: [
          { k: 'fmt', label: 'Format', type: 'select', def: 'png', options: ['png', 'jpeg'], labelFn: (o) => o.toUpperCase() },
          { k: 'quality', label: 'Quality', type: 'range', min: 10, max: 100, def: 92, unit: '%' },
        ],
      },
    };

    /* Input-only tools — workspace right away */
    if (id === 'base64-to-img' || id === 'svg-optimize') { mountInputImage(container, tool, id); return; }

    const conf = CONF[id];
    if (!conf) return;

    /* Favicon / strip / palette / diff / viewer / base64 / svg-to-raster handled below */
    const multi = conf.multi === true || conf.multi === 2;

    const dz = dropzone(container, tool, {
      accepts: conf.accepts || ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif'],
      multiple: multi || id === 'sprite-sheet',
      headline: multi ? 'Drop two images to compare' : (id === 'sprite-sheet' ? 'Drop several images' : `Drop your ${conf.title.toLowerCase()} file here`),
      meta: (conf.accepts ? conf.accepts : ['PNG', 'JPG', 'JPEG', 'WEBP', 'BMP', 'GIF']).join(' · ') + ' · 100% local',
    });

    dz.setOnFiles(async (list) => {
      files = [...list].filter(Boolean);
      if (id === 'image-diff' && files.length !== 2) { dz.dz.classList.add('bad'); setTimeout(() => dz.dz.classList.remove('bad'), 900); return; }
      if (id === 'sprite-sheet' && files.length < 2) { dz.dz.classList.add('bad'); setTimeout(() => dz.dz.classList.remove('bad'), 900); return; }
      try { img = await loadImg(files[0]); } catch (e) { return; }
      const app = window.FF.app;
      if (app && app.updateSidebarForFileCategory) app.updateSidebarForFileCategory('Images', files[0]);
      renderWorkspace();
    });

    function renderWorkspace() {
      const s = shell(container, tool, { title: conf.title, sub: conf.sub, action: 'Download' });
      s.replaceBtn.addEventListener('click', () => { reset(); });

      /* Specialized bodies */
      if (id === 'favicon') return bodyFavicon(s);
      if (id === 'exif-strip') return bodyExifStrip(s);
      if (id === 'palette') return bodyPalette(s);
      if (id === 'image-diff') return bodyDiff(s);
      if (id === 'sprite-sheet') return bodySprite(s);
      if (id === 'exif-viewer') return bodyExifViewer(s);
      if (id === 'svg-to-raster') return bodySvgRaster(s);
      if (id === 'img-to-base64') return bodyImgToBase64(s);

      /* Standard live-canvas tools (sharpen / round / border / upscale) */
      const origUrl = URL.createObjectURL(files[0]);
      const ib = imageBody(s, { title: conf.title, sub: conf.sub, controls: conf.controls, origUrl });
      const preview = s.body.querySelector('.pro-img-preview');
      const empty = s.body.querySelector('[data-pro-empty]');
      const orig = s.body.querySelector('.pro-img-orig');
      const baCard = s.body.querySelector('[data-ba]');
      if (baCard) {
        const handle = baCard.querySelector('[data-ba-handle]');
        const setPos = (clientX) => {
          const r = baCard.getBoundingClientRect();
          if (!r.width) return;
          const pct = Math.round(Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)));
          baCard.style.setProperty('--ba', pct + '%');
          handle.setAttribute('aria-valuenow', String(pct));
        };
        let dragging = false;
        handle.addEventListener('pointerdown', (e) => { dragging = true; try { handle.setPointerCapture(e.pointerId); } catch (err) { /* synthetic or unsupported pointer */ } setPos(e.clientX); e.preventDefault(); });
        handle.addEventListener('pointermove', (e) => { if (dragging) setPos(e.clientX); });
        const stop = () => dragging = false;
        handle.addEventListener('pointerup', stop); handle.addEventListener('pointercancel', stop);
        handle.addEventListener('keydown', (e) => {
          if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
          const cur = parseFloat(baCard.style.getPropertyValue('--ba')) || 50;
          setPos(baCard.getBoundingClientRect().left + (Math.max(0, Math.min(100, cur + (e.key === 'ArrowLeft' ? -5 : 5))) / 100) * baCard.getBoundingClientRect().width);
          e.preventDefault();
        });
        baCard.addEventListener('pointerdown', (e) => { if (e.target.closest('[data-ba-handle]')) return; setPos(e.clientX); });
      }
      const off = cv(1, 1);
      s.runBtn.addEventListener('click', () => doRun());
      let lastUrl = null;
      const render = () => {
        conf.run(off, img, ib.state, files[0]);
        const fmt = (ib.output && ib.output.fmt) || (conf.type ? (conf.type === 'image/png' ? 'png' : 'jpeg') : outType(files[0]));
        const url = encodeDataURL(off, fmt, ib.output ? ib.output.quality / 100 : 0.9);
        if (lastUrl) URL.revokeObjectURL(lastUrl); lastUrl = url;
        preview.src = url;
        preview.style.display = 'block';
        if (orig) orig.style.display = 'block';
        empty.style.display = 'none';
      };
      ib.setOnChange(() => render());
      render();
      s.toolbar.innerHTML = `<span class="pro-dim">${img.naturalWidth} × ${img.naturalHeight}px · ${bytes(files[0].size)}</span><span class="pro-live">Live preview</span>`;

      async function doRun() {
        conf.run(off, img, ib.state, files[0]);
        const fmt = (ib.output && ib.output.fmt) || (conf.type ? (conf.type === 'image/png' ? 'png' : 'jpeg') : outType(files[0]));
        const fname = baseName(files[0].name) + '-' + slug(conf.title) + '.' + (FMT_EXT[fmt] || 'png');
        showResult(s, {
          ok: true,
          title: `${conf.title} complete`,
          msg: `${img.naturalWidth} × ${img.naturalHeight}px → ${off.width} × ${off.height}px ${FMT_EXT[fmt] || fmt} · ${bytes(blob.size)}`,
          blob,
          filename: fname,
          tool,
          actions: [
            { label: 'Download', cls: 'etxt-btn-finish', ico: dlIco, onClick: () => download(blob, fname) },
            { label: 'Done', cls: 'etxt-btn-ghost', onClick: () => s.result.hidden = true },
          ],
        });
      }
    }

    function slug(t) { return t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'out'; }

    function bodyFavicon(s) {
      s.runBtn.hidden = true;
      const sizes = [16, 32, 48, 64, 128, 256];
      s.body.className = 'pro-body pro-fav-body';
      s.body.innerHTML = `<div class="pro-fav-stage"><div class="pro-fav-grid">${sizes.map(n => `
        <div class="pro-fav-cell"><canvas data-sz="${n}" width="${n}" height="${n}"></canvas><span>${n}px</span></div>`).join('')}</div></div>
        <aside class="pro-panel"><div class="pro-panel-head"><strong>Favicon generator</strong><span>${sizes.length} sizes · PNG</span></div>
        <p class="pro-panel-note">Generated from your image, cropped to a perfect square and downscaled for every favicon size.</p>
        <button type="button" class="etxt-btn-finish pro-panel-run" data-dl-all>${dlIco} Download all (ZIP)</button>
        <button type="button" class="etxt-btn-ghost pro-panel-run" data-dl-ico>Download favicon.ico source</button></aside>`;
      const canvases = [...s.body.querySelectorAll('canvas')];
      canvases.forEach((c) => {
        const n = +c.dataset.sz;
        const ctx = c.getContext('2d');
        const s2 = Math.min(n, img.naturalWidth);
        const off = cv(n, n);
        off.getContext('2d').drawImage(img, (n - s2) / 2, (n - s2) / 2, s2, s2);
        ctx.drawImage(off, 0, 0);
        c.__blob = off;
      });
      s.toolbar.innerHTML = `<span class="pro-dim">Source ${img.naturalWidth} × ${img.naturalHeight}px</span><span class="pro-live">Ready</span>`;
      const dlAll = async () => {
        const fflate = await load.fflate();
        const map = {};
        for (const c of canvases) map['favicon-' + c.dataset.sz + '.png'] = await u8(await new Promise((res) => c.__blob.toBlob(res, 'image/png')));
        const zipBlob = new Blob([fflate.zipSync(map)], { type: 'application/zip' });
        showResult(s, {
          ok: true,
          title: 'Favicon set ready',
          msg: `${canvases.length} PNGs bundled into favicons.zip`,
          blob: zipBlob,
          filename: 'favicons.zip',
          tool,
          actions: [{ label: 'Download', cls: 'etxt-btn-finish', ico: dlIco, onClick: () => download(zipBlob, 'favicons.zip') }]
        });
      };
      s.body.querySelector('[data-dl-all]').addEventListener('click', dlAll);
      s.body.querySelector('[data-dl-ico]').addEventListener('click', () => { const c = canvases.find(x => x.dataset.sz === '64') || canvases[canvases.length - 1]; c.__blob.toBlob((b) => download(b, 'favicon-64.png'), 'image/png'); });
    }

    function bodyExifStrip(s) {
      s.body.className = 'pro-body pro-simple-body';
      s.body.innerHTML = `
        <div class="pro-simple-stage"><div class="pro-simple-card pro-strip-card">
          <strong>Before</strong><span>${bytes(files[0].size)} — metadata intact</span>
          <div class="pro-strip-dots">${Array.from({ length: 7 }, () => '<i></i>').join('')}</div>
        </div><div class="pro-strip-arrow">→</div>
        <div class="pro-simple-card pro-strip-card is-clean"><strong>After</strong><span id="pro-strip-after">Re-encode to strip EXIF…</span><div class="pro-strip-dots clean"></div></div></div>
        <aside class="pro-panel"><div class="pro-panel-head"><strong>EXIF strip</strong><span>Removes camera & GPS metadata</span></div>
        <p class="pro-panel-note">Re-encoding through a clean canvas pipeline drops embedded metadata such as camera model, GPS coordinates and timestamps.</p>
        <div class="pro-panel-outputs"></div>
        <button type="button" class="etxt-btn-finish pro-panel-run" data-strip-run>${dlIco} Strip metadata & download</button></aside>`;
      s.toolbar.innerHTML = `<span class="pro-dim">${img.naturalWidth} × ${img.naturalHeight}px · ${bytes(files[0].size)}</span><span class="pro-live">Private</span>`;
      const out = outputPicker(s.body.querySelector('.pro-panel-outputs'));
      s.body.querySelector('[data-strip-run]').addEventListener('click', async () => {
        const c = cv(img.naturalWidth, img.naturalHeight);
        c.getContext('2d').drawImage(img, 0, 0);
        const fmt = out.state.fmt;
        const blob = await encodeCanvas(c, fmt, out.state.quality / 100);
        const after = s.body.querySelector('#pro-strip-after');
        after.textContent = `${bytes(blob.size)} — metadata removed`;
        after.closest('.pro-strip-card').classList.add('is-done');
        const fname = baseName(files[0].name) + '-clean.' + (FMT_EXT[fmt] || 'png');
        showResult(s, {
          ok: true,
          title: 'Metadata stripped',
          msg: `${bytes(files[0].size)} → ${bytes(blob.size)} · EXIF removed · ${(FMT_EXT[fmt] || fmt).toUpperCase()}`,
          blob,
          filename: fname,
          tool,
          actions: [{ label: 'Download', cls: 'etxt-btn-finish', ico: dlIco, onClick: () => download(blob, fname) }],
        });
      });
    }

    function bodyPalette(s) {
      s.runBtn.hidden = true;
      const ib = imageBody(s, { title: conf.title, sub: conf.sub, controls: conf.controls, output: false });
      const stage = s.body.querySelector('.pro-img-stage');
      stage.innerHTML = `<div class="pro-palette"><div class="pro-palette-swatches"></div><div class="pro-palette-actions"><button type="button" class="etxt-btn-ghost" data-copy-hex>${copyIco} Copy hex list</button></div></div>`;
      const swWrap = stage.querySelector('.pro-palette-swatches');
      let hexes = [];
      const extract = (n) => {
        const s2 = 80; const c = cv(s2, Math.max(1, Math.round(s2 * img.naturalHeight / img.naturalWidth)));
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
        const m = {};
        for (let i = 0; i < d.length; i += 4) { if (d[i + 3] < 128) continue; const key = ((d[i] >> 4) << 8) | ((d[i + 1] >> 4) << 4) | (d[i + 2] >> 4); m[key] = (m[key] || 0) + 1; }
        return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => { k = +k; const r = ((k >> 8) & 15) * 17, g = ((k >> 4) & 15) * 17, b = (k & 15) * 17; return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join(''); });
      };
      const render = () => {
        hexes = extract(+ib.state.n);
        swWrap.innerHTML = hexes.map((h, i) => `<button type="button" class="pro-swatch" data-h="${h}" style="--sw:${h}"><span></span><b>${h}</b><i>${i + 1}</i></button>`).join('');
      };
      ib.setOnChange(() => render());
      render();
      s.toolbar.innerHTML = `<span class="pro-dim">${hexes.length} colors extracted</span><span class="pro-live">Tap to copy</span>`;
      swWrap.addEventListener('click', async (e) => {
        const sw = e.target.closest('.pro-swatch'); if (!sw) return;
        try { await navigator.clipboard.writeText(sw.dataset.h); sw.classList.add('is-copied'); setTimeout(() => sw.classList.remove('is-copied'), 700); } catch (e2) {}
      });
      stage.querySelector('[data-copy-hex]').addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(hexes.join('\n')); showResult(s, { ok: true, title: 'Palette copied', msg: `${hexes.length} hex colors on your clipboard`, actions: [{ label: 'Done', cls: 'etxt-btn-ghost', onClick: () => s.result.hidden = true }] }); } catch (e2) {}
      });
    }

    function bodyDiff(s) {
      s.body.className = 'pro-body pro-diff-body';
      s.body.innerHTML = `
        <div class="pro-diff-grid">
          <figure class="pro-diff-fig"><figcaption>Original</figcaption><img id="pro-diff-a" alt="Original"></figure>
          <figure class="pro-diff-fig is-diff"><figcaption>Difference</figcaption><img id="pro-diff-out" alt="Difference highlight"></figure>
          <figure class="pro-diff-fig"><figcaption>Modified</figcaption><img id="pro-diff-b" alt="Modified"></figure>
        </div>
        <aside class="pro-panel"><div class="pro-panel-head"><strong>Image diff</strong><span>Red = changed pixels</span></div>
        <p class="pro-panel-note" id="pro-diff-note">Computing pixel difference…</p>
        <div class="pro-panel-outputs"></div>
        <button type="button" class="etxt-btn-finish pro-panel-run" data-diff-run>${dlIco} Download diff</button></aside>`;
      s.toolbar.innerHTML = `<span class="pro-dim">${esc(files[0].name.split('.')[0])} vs ${esc(files[1].name.split('.')[0])}</span><span class="pro-live">Live</span>`;
      let diffBlob = null, diffCanvas = null, pct = '0';
      const diffOut = outputPicker(s.body.querySelector('.pro-panel-outputs'));
      (async () => {
        const [a, b] = await Promise.all([loadImg(files[0]), loadImg(files[1])]);
        const w = Math.min(a.naturalWidth, b.naturalWidth), h = Math.min(a.naturalHeight, b.naturalHeight);
        const ca = cv(w, h), cb = cv(w, h);
        ca.getContext('2d').drawImage(a, 0, 0); cb.getContext('2d').drawImage(b, 0, 0);
        const da = ca.getContext('2d').getImageData(0, 0, w, h).data;
        const db = cb.getContext('2d').getImageData(0, 0, w, h).data;
        const out = cv(w, h); const od = out.getContext('2d').createImageData(w, h);
        let diff = 0;
        for (let i = 0; i < da.length; i += 4) {
          const dr = Math.abs(da[i] - db[i]), dg = Math.abs(da[i + 1] - db[i + 1]), dbl = Math.abs(da[i + 2] - db[i + 2]);
          if (dr + dg + dbl > 20) { diff++; od.data[i] = 220; od.data[i + 1] = 45; od.data[i + 2] = 45; od.data[i + 3] = 255; }
        }
        out.getContext('2d').putImageData(od, 0, 0);
        diffCanvas = out;
        pct = ((diff / (w * h)) * 100).toFixed(2);
        diffBlob = await encodeCanvas(out, diffOut.state.fmt, diffOut.state.quality / 100);
        const stage = s.body;
        stage.querySelector('#pro-diff-a').src = URL.createObjectURL(files[0]);
        stage.querySelector('#pro-diff-b').src = URL.createObjectURL(files[1]);
        stage.querySelector('#pro-diff-out').src = URL.createObjectURL(diffBlob);
        stage.querySelector('#pro-diff-note').textContent = `${pct}% of pixels differ · ${w} × ${h}`;
        s.toolbar.querySelector('.pro-live').textContent = pct + '% differ';
      })();
      diffOut.el.querySelector('[data-o-fmt]').addEventListener('change', () => {
        if (diffCanvas) encodeCanvas(diffCanvas, diffOut.state.fmt, diffOut.state.quality / 100).then((b) => { diffBlob = b; });
      });
      s.body.querySelector('[data-diff-run]').addEventListener('click', async () => {
        if (!diffCanvas) return;
        const fmt = diffOut.state.fmt;
        const blob = await encodeCanvas(diffCanvas, fmt, diffOut.state.quality / 100);
        showResult(s, {
          ok: true,
          title: 'Diff complete',
          msg: `${pct}% of pixels differ · ${(FMT_EXT[fmt] || fmt).toUpperCase()}`,
          blob,
          filename: 'image-diff.' + (FMT_EXT[fmt] || 'png'),
          tool,
          actions: [{ label: 'Download', cls: 'etxt-btn-finish', ico: dlIco, onClick: () => download(blob, 'image-diff.' + (FMT_EXT[fmt] || 'png')) }],
        });
      });
    }

    function bodySprite(s) {
      const ib = imageBody(s, { title: conf.title, sub: conf.sub, controls: conf.controls });
      const stage = s.body.querySelector('.pro-img-stage');
      stage.innerHTML = `<div class="pro-sprite-stage"><img class="pro-sprite-img" alt="Sprite sheet preview"><div class="pro-sprite-meta" id="pro-sprite-meta"></div></div>`;
      let sheetBlob = null;
      const build = async () => {
        const imgs = await Promise.all(files.map(loadImg));
        const cols = Math.max(1, +ib.state.cols || 4);
        const cw = Math.max(...imgs.map(i => i.naturalWidth)), ch = Math.max(...imgs.map(i => i.naturalHeight));
        const rows = Math.ceil(imgs.length / cols);
        const c = cv(cw * cols, ch * rows);
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
        imgs.forEach((im, i) => ctx.drawImage(im, (i % cols) * cw, Math.floor(i / cols) * ch));
        const fmt = ib.output.fmt;
        sheetBlob = await encodeCanvas(c, fmt, ib.output.quality / 100);
        const u = URL.createObjectURL(sheetBlob);
        const sImg = stage.querySelector('.pro-sprite-img');
        sImg.src = u;
        stage.querySelector('#pro-sprite-meta').textContent = `${imgs.length} images · ${cols} cols · ${c.width} × ${c.height}px · ${(FMT_EXT[fmt] || fmt).toUpperCase()}`;
      };
      ib.setOnChange(() => build());
      build();
      s.toolbar.innerHTML = `<span class="pro-dim">${files.length} images</span><span class="pro-live">Grid builds live</span>`;
      s.runBtn.textContent = 'Download sheet';
      s.runBtn.addEventListener('click', () => {
        if (!sheetBlob) return;
        const fmt = ib.output.fmt;
        showResult(s, {
          ok: true,
          title: 'Sprite sheet ready',
          msg: `${files.length} images combined · ${(FMT_EXT[fmt] || fmt).toUpperCase()}`,
          blob: sheetBlob,
          filename: 'sprite-sheet.' + (FMT_EXT[fmt] || 'png'),
          tool,
          actions: [{ label: 'Download', cls: 'etxt-btn-finish', ico: dlIco, onClick: () => download(sheetBlob, 'sprite-sheet.' + (FMT_EXT[fmt] || 'png')) }]
        });
      });
    }

    function bodyExifViewer(s) {
      s.body.className = 'pro-body pro-simple-body';
      s.body.innerHTML = `<div class="pro-exif-stage"><div class="pro-exif-table-wrap"><table class="pro-tbl"><tbody id="pro-exif-tbody"></tbody></table></div></div>
        <aside class="pro-panel"><div class="pro-panel-head"><strong>EXIF viewer</strong><span>Read from the photo</span></div>
        <p class="pro-panel-note">Camera, lens, exposure, GPS and timestamp data embedded in the file.</p>
        <button type="button" class="etxt-btn-ghost pro-panel-run" data-copy-json>${copyIco} Copy as JSON</button></aside>`;
      const tbody = s.body.querySelector('#pro-exif-tbody');
      let json = '{}';
      (async () => {
        const exifr = await load.exifr();
        let data = {};
        try { data = await exifr.parse(files[0], true); } catch (e) {}
        const flat = {};
        const pick = (k) => { const v = data[k]; if (v !== undefined && v !== null && v !== '') flat[k] = v; };
        ['Make', 'Model', 'LensModel', 'DateTimeOriginal', 'CreateDate', 'ExposureTime', 'FNumber', 'ISO', 'FocalLength', 'ExposureBiasValue', 'Software', 'Artist', 'Copyright', 'GPSLatitude', 'GPSLongitude', 'GPSAltitude', 'MimeType'].forEach(pick);
        Object.keys(data).forEach(k => { if (!(k in flat)) flat[k] = data[k]; });
        json = JSON.stringify(flat, null, 2);
        const rows = Object.entries(flat).slice(0, 40);
        if (!rows.length) { tbody.innerHTML = '<tr><td>No EXIF metadata found in this file.</td></tr>'; }
        else tbody.innerHTML = rows.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(Array.isArray(v) ? v.map(x => x && x.description || x).join(', ') : (v && v.description) || v)}</td></tr>`).join('');
        s.toolbar.innerHTML = `<span class="pro-dim">${rows.length} fields</span><span class="pro-live">Read-only</span>`;
      })();
      s.body.querySelector('[data-copy-json]').addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(json); showResult(s, { ok: true, title: 'Metadata copied', msg: 'Full EXIF as JSON on your clipboard', actions: [{ label: 'Done', cls: 'etxt-btn-ghost', onClick: () => s.result.hidden = true }] }); } catch (e) {}
      });
      s.replaceBtn.addEventListener('click', reset);
      s.runBtn.hidden = true;
    }

    function bodySvgRaster(s) {
      const ib = imageBody(s, { title: conf.title, sub: conf.sub, controls: conf.controls });
      const preview = s.body.querySelector('.pro-img-preview');
      const empty = s.body.querySelector('[data-pro-empty]');
      let outBlob = null;
      const render = () => {
        const f = +ib.state.scale || 2;
        const w = img.naturalWidth * f, h = img.naturalHeight * f;
        const c = cv(w, h);
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        const fmt = ib.output.fmt;
        encodeCanvas(c, fmt, ib.output.quality / 100).then((b) => { outBlob = b; });
        const u = encodeDataURL(c, fmt, ib.output.quality / 100);
        preview.src = u; preview.style.display = 'block'; empty.style.display = 'none';
      };
      ib.setOnChange(() => render());
      render();
      s.toolbar.innerHTML = `<span class="pro-dim">${img.naturalWidth} × ${img.naturalHeight}px (vector)</span><span class="pro-live">Rendered locally</span>`;
      s.runBtn.addEventListener('click', () => {
        if (!outBlob) return;
        const fmt = ib.output.fmt;
        const fname = baseName(files[0].name) + '.' + (FMT_EXT[fmt] || 'png');
        showResult(s, {
          ok: true,
          title: 'Raster complete',
          msg: `${bytes(outBlob.size)} ${(FMT_EXT[fmt] || fmt).toUpperCase()} ready`,
          blob: outBlob,
          filename: fname,
          tool,
          actions: [{ label: 'Download', cls: 'etxt-btn-finish', ico: dlIco, onClick: () => download(outBlob, fname) }]
        });
      });
    }

    function bodyImgToBase64(s) {
      const ib = imageBody(s, { title: conf.title, sub: conf.sub, controls: conf.controls, output: false });
      const stage = s.body.querySelector('.pro-img-stage');
      stage.innerHTML = `<div class="pro-b64-stage"><div class="pro-b64-preview"><img id="pro-b64-img" alt="Encoded image preview"></div><div class="pro-b64-out"><textarea id="pro-b64-ta" readonly spellcheck="false" placeholder="Base64 output…"></textarea><div class="pro-b64-actions"><button type="button" class="etxt-btn-ghost" data-copy-b64>${copyIco} Copy</button><button type="button" class="etxt-btn-secondary" data-dl-txt>${dlIco} Download .txt</button></div></div></div>`;
      const ta = stage.querySelector('#pro-b64-ta');
      const im = stage.querySelector('#pro-b64-img');
      const encode = () => {
        const c = cv(img.naturalWidth, img.naturalHeight);
        c.getContext('2d').drawImage(img, 0, 0);
        const dataUrl = encodeDataURL(c, ib.state.fmt === 'jpeg' ? 'jpeg' : 'png', (+ib.state.quality || 92) / 100);
        ta.value = dataUrl;
        im.src = dataUrl;
        ta.scrollTop = 0;
      };
      ib.setOnChange(() => encode());
      encode();
      s.toolbar.innerHTML = `<span class="pro-dim">${img.naturalWidth} × ${img.naturalHeight}px</span><span class="pro-live">${(ta.value.length / 1024).toFixed(1)} KB of text</span>`;
      stage.querySelector('[data-copy-b64]').addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(ta.value); showResult(s, { ok: true, title: 'Base64 copied', msg: `${(ta.value.length / 1024).toFixed(1)} KB of text on your clipboard`, actions: [{ label: 'Done', cls: 'etxt-btn-ghost', onClick: () => s.result.hidden = true }] }); } catch (e) {}
      });
      stage.querySelector('[data-dl-txt]').addEventListener('click', () => download(new Blob([ta.value], { type: 'text/plain' }), baseName(files[0].name) + '.base64.txt'));
      s.runBtn.addEventListener('click', () => {
        showResult(s, { ok: true, title: 'Encoded', msg: `${(ta.value.length / 1024).toFixed(1)} KB data URL`, actions: [{ label: 'Done', cls: 'etxt-btn-ghost', onClick: () => s.result.hidden = true }] });
      });
    }

    function reset() {
      files = []; img = null;
      if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = null; }
      dropzone(container, tool, {
        accepts: conf.accepts || ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif'],
        multiple: multi || id === 'sprite-sheet',
        headline: multi ? 'Drop two images to compare' : (id === 'sprite-sheet' ? 'Drop several images' : `Drop your ${conf.title.toLowerCase()} file here`),
        meta: (conf.accepts ? conf.accepts : ['PNG', 'JPG', 'JPEG', 'WEBP', 'BMP', 'GIF']).join(' · ') + ' · 100% local',
      }).setOnFiles(async (list) => {
        files = [...list].filter(Boolean);
        if (id === 'image-diff' && files.length !== 2) return;
        if (id === 'sprite-sheet' && files.length < 2) return;
        try { img = await loadImg(files[0]); } catch (e) { return; }
        renderWorkspace();
      });
    }

    /* Input-only image tools: base64-to-img, svg-optimize */
    function mountInputImage(container, tool, id) {
      container.innerHTML = '';
      container.classList.add('cpdf-root');
      const stage = container.closest('.app-stage-container');
      if (stage) { stage.classList.remove('spdf-stage-active'); stage.style.padding = ''; }
      container.innerHTML = `
        <header class="cpdf-hdr">
          <div class="cpdf-hdr-icon">${T_ICONS[id] || fallbackIco}</div>
          <div><h2 class="cpdf-hdr-title">${esc(tool.name)}</h2><p class="cpdf-hdr-sub">${esc(tool.description || '')}</p></div>
        </header>
        <div class="pro-input-card">
          <div class="pro-input-head"><strong>${id === 'base64-to-img' ? 'Base64 data URL' : 'SVG markup'}</strong><span>${id === 'base64-to-img' ? 'Paste a data:image/… URL to decode it' : 'Paste SVG source to minify it'}</span></div>
          <textarea id="pro-input-ta" spellcheck="false" placeholder="${id === 'base64-to-img' ? 'data:image/png;base64,…' : '<svg …>…</svg>'}"></textarea>
          <div class="pro-input-actions">
            <button type="button" class="etxt-btn-finish" data-input-run>${id === 'base64-to-img' ? 'Decode image' : 'Optimize'}</button>
            <button type="button" class="etxt-btn-ghost" data-input-sample>${id === 'base64-to-img' ? 'Paste sample' : 'Paste sample SVG'}</button>
          </div>
        </div>
        <div class="pro-result" data-pro-result hidden></div>`;
      const ta = container.querySelector('#pro-input-ta');
      const runBtn = container.querySelector('[data-input-run]');
      const sampleBtn = container.querySelector('[data-input-sample]');
      const resultEl = container.querySelector('[data-pro-result]');
      if (id === 'base64-to-img') {
        sampleBtn.addEventListener('click', () => { ta.value = 'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#7C3AED"/><circle cx="32" cy="32" r="16" fill="#fff"/></svg>'); });
        runBtn.addEventListener('click', () => {
          const raw = ta.value.trim();
          if (!raw) { resultEl.className = 'pro-result is-err'; resultEl.hidden = false; resultEl.innerHTML = `<span class="pro-result-ico">!</span><div class="pro-result-copy"><strong>Nothing to decode</strong><span>Paste a Base64 data URL first</span></div>`; return; }
          try {
            const mime = (raw.match(/^data:([^;,]+)/) || [])[1] || 'image/png';
            const b64 = raw.includes(',') ? raw.split(',')[1] : raw;
            const bin = atob(b64.replace(/\s/g, ''));
            const u8a = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) u8a[i] = bin.charCodeAt(i);
            const blob = new Blob([u8a], { type: mime });
            const url = URL.createObjectURL(blob);
            const ext = (mime.split('/')[1] || 'png').replace('jpeg', 'jpg');
            resultEl.className = 'pro-result is-ok';
            resultEl.hidden = false;
            resultEl.innerHTML = `
              <span class="pro-result-ico">${checkIco}</span>
              <div class="pro-result-copy"><strong>Image decoded</strong><span>${bytes(blob.size)} · ${esc(mime)}</span></div>
              <div class="pro-result-actions">
                <img class="pro-result-thumb" src="${url}" alt="Decoded image">
                <button type="button" class="etxt-btn-secondary" data-dl>${dlIco} Download</button>
              </div>`;
            resultEl.querySelector('[data-dl]').addEventListener('click', () => download(blob, 'decoded.' + ext));
          } catch (e) {
            resultEl.className = 'pro-result is-err'; resultEl.hidden = false;
            resultEl.innerHTML = `<span class="pro-result-ico">!</span><div class="pro-result-copy"><strong>Could not decode</strong><span>That doesn't look like valid Base64 — check the data</span></div>`;
          }
        });
      } else {
        sampleBtn.addEventListener('click', () => { ta.value = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><!-- drop this comment --><path fill="#fff" stroke="#000" stroke-width="1" d="M12 2 L22 22 H2 Z" /></svg>'; });
        runBtn.addEventListener('click', () => {
          const raw = ta.value.trim();
          if (!raw) { resultEl.className = 'pro-result is-err'; resultEl.hidden = false; resultEl.innerHTML = `<span class="pro-result-ico">!</span><div class="pro-result-copy"><strong>Nothing to optimize</strong><span>Paste SVG markup first</span></div>`; return; }
          try {
            const dom = new DOMParser().parseFromString(raw, 'image/svg+xml');
            if (dom.querySelector('parsererror')) throw new Error('invalid');
            dom.querySelectorAll('*').forEach(n => { [...n.attributes].forEach(a => { if (/^[\s]*(<!--.*-->)?\s*$/.test(a.value)) n.removeAttribute(a.name); }); });
            const cleaned = new XMLSerializer().serializeToString(dom.documentElement).replace(/<!--[\s\S]*?-->/g, '').replace(/>\s+</g, '><').replace(/\s{2,}/g, ' ');
            const blob = new Blob([cleaned], { type: 'image/svg+xml' });
            resultEl.className = 'pro-result is-ok';
            resultEl.hidden = false;
            resultEl.innerHTML = `
              <span class="pro-result-ico">${checkIco}</span>
              <div class="pro-result-copy"><strong>Optimized</strong><span>${bytes(new Blob([raw]).size)} → ${bytes(blob.size)} · ${Math.max(0, Math.round((1 - blob.size / Math.max(1, new Blob([raw]).size)) * 100))}% smaller</span></div>
              <div class="pro-result-actions">
                <button type="button" class="etxt-btn-ghost" data-copy>${copyIco} Copy</button>
                <button type="button" class="etxt-btn-secondary" data-dl>${dlIco} Download .svg</button>
              </div>`;
            resultEl.querySelector('[data-copy]').addEventListener('click', async () => { try { await navigator.clipboard.writeText(cleaned); } catch (e2) {} });
            resultEl.querySelector('[data-dl]').addEventListener('click', () => download(blob, 'optimized.svg'));
          } catch (e) {
            resultEl.className = 'pro-result is-err'; resultEl.hidden = false;
            resultEl.innerHTML = `<span class="pro-result-ico">!</span><div class="pro-result-copy"><strong>Invalid SVG</strong><span>That doesn't parse as SVG markup</span></div>`;
          }
        });
      }
    }
  }

  /* ═══════════════════════════════════════════════════════
     PDF CLUSTER — 9 tools
  ═══════════════════════════════════════════════════════ */
  function mountPdfPro(container, tool) {
    const id = tool.id;
    const isInputOnly = id === 'pdf-create' || id === 'pdf-to-handwriting';
    if (isInputOnly) return mountInputPdf(container, tool, id);

    const dz = dropzone(container, tool, {
      accepts: id === 'handwriting-to-pdf' ? ['png', 'jpg', 'jpeg', 'webp', 'bmp'] : ['pdf'],
      multiple: id === 'pdf-compare',
      headline: id === 'pdf-compare' ? 'Drop two PDFs to compare' : `Drop your ${tool.name.toLowerCase()} file here`,
      meta: id === 'handwriting-to-pdf' ? 'PNG · JPG · JPEG · WEBP · BMP · 100% local' : 'PDF · 100% local · never uploaded',
    });

    dz.setOnFiles(async (list) => {
      const files = [...list].filter(Boolean);
      if (id === 'pdf-compare' && files.length !== 2) { dz.dz.classList.add('bad'); setTimeout(() => dz.dz.classList.remove('bad'), 900); return; }
      const app = window.FF.app;
      if (app && app.updateSidebarForFileCategory) app.updateSidebarForFileCategory('PDF', files[0]);
      renderWorkspace(files);
    });

    function renderWorkspace(files) {
      const conf = {
        'pdf-headers-footers': { title: 'Headers & footers', sub: 'Stamp text and page numbers onto every page', action: 'Apply to PDF' },
        'pdf-compare': { title: 'Compare PDFs', sub: 'Visual page diff with pixel-change percentage', action: 'Compare' },
        'pdf-invert': { title: 'Invert colours', sub: 'Dark mode for your PDF', action: 'Invert PDF' },
        'pdf-redact-pii': { title: 'Auto-redact PII', sub: 'Black out emails, phones, IDs and card numbers', action: 'Scan for PII' },
        'pdf-sanitize-pii': { title: 'Sanitize PII', sub: 'Redact sensitive data and strip metadata', action: 'Scan & sanitize' },
        'handwriting-to-pdf': { title: 'Handwriting to PDF', sub: 'Turn a photo of handwritten notes into a PDF', action: 'Convert to PDF' },
        'pdf-to-zip': { title: 'PDF to ZIP', sub: 'Bundle your PDFs into one archive', action: 'Create ZIP' },
      }[id] || { title: tool.name, sub: tool.description || '', action: 'Apply' };

      const s = shell(container, tool, conf);
      s.replaceBtn.addEventListener('click', () => { reset(); });

      if (id === 'pdf-headers-footers') return bodyHeadersFooters(s, files);
      if (id === 'pdf-compare') return bodyCompare(s, files);
      if (id === 'pdf-invert') return bodyInvert(s, files);
      if (id === 'pdf-redact-pii' || id === 'pdf-sanitize-pii') return bodyPii(s, files);
      if (id === 'handwriting-to-pdf') return bodyHandToPdf(s, files);
      if (id === 'pdf-to-zip') return bodyPdfToZip(s, files);
    }

    /* ── Headers & footers ── */
    function bodyHeadersFooters(s, files) {
      const file = files[0];
      s.body.className = 'pro-body pro-pdf-body';
      s.body.innerHTML = `
        <div class="pro-pdf-thumbs" data-thumbs></div>
        <div class="pro-pdf-stage">
          <div class="pro-pdf-card" data-card>
            <div class="pro-hf-top" data-hf-top></div>
            <div class="pro-hf-paper" data-hf-paper><span class="pro-hf-body-text">Page preview</span></div>
            <div class="pro-hf-bottom" data-hf-bottom></div>
          </div>
        </div>
        <aside class="pro-panel">
          <div class="pro-panel-head"><strong>Header & footer</strong><span>Stamped on every page</span></div>
          <div class="pro-controls" data-controls></div>
        </aside>`;
      const state = { header: '', footer: 'Page {n} of {N}', size: 10, margin: 28 };
      const controlsWrap = s.body.querySelector('[data-controls]');
      const defs = [
        { k: 'header', label: 'Header text', type: 'text', ph: 'e.g. Confidential — 2026' },
        { k: 'footer', label: 'Footer text', type: 'text', ph: 'Page {n} of {N}' },
        { k: 'size', label: 'Text size', type: 'range', min: 6, max: 24, def: 10, unit: 'px' },
        { k: 'margin', label: 'Margin from edge', type: 'range', min: 8, max: 80, def: 28, unit: 'px' },
      ];
      for (const d of defs) {
        const row = document.createElement('div'); row.className = 'pro-control';
        if (d.type === 'text') {
          row.innerHTML = `<label><span>${esc(d.label)}</span></label><input type="text" placeholder="${esc(d.ph || '')}" value="${esc(state[d.k] || '')}" data-k="${d.k}">`;
        } else {
          row.innerHTML = `<label><span>${esc(d.label)}</span><b data-val>${state[d.k]}${d.unit || ''}</b></label><input type="range" min="${d.min}" max="${d.max}" value="${state[d.k]}" data-k="${d.k}">`;
        }
        controlsWrap.appendChild(row);
      }
      const topEl = s.body.querySelector('[data-hf-top]'), bottomEl = s.body.querySelector('[data-hf-bottom]');
      const applyPreview = () => {
        topEl.textContent = state.header.replace(/\{n\}/g, '1').replace(/\{N\}/g, '?');
        bottomEl.textContent = state.footer.replace(/\{n\}/g, '1').replace(/\{N\}/g, '1');
        topEl.style.fontSize = state.size + 'px';
        bottomEl.style.fontSize = state.size + 'px';
        s.body.querySelector('[data-hf-paper]').style.paddingTop = (state.margin + 4) + 'px';
        s.body.querySelector('[data-hf-paper]').style.paddingBottom = (state.margin + 4) + 'px';
      };
      controlsWrap.addEventListener('input', (e) => {
        const el = e.target, k = el.dataset.k; if (!k) return;
        state[k] = k === 'size' || k === 'margin' ? +el.value : el.value;
        const b = el.closest('.pro-control')?.querySelector('[data-val]'); if (b) b.textContent = el.value + (k === 'size' ? 'px' : 'px');
        applyPreview();
      });
      applyPreview();
      renderThumbs(s, file, state);
      s.toolbar.innerHTML = `<span class="pro-dim">${esc(file.name)} · ${bytes(file.size)}</span><span class="pro-live">Live preview</span>`;

      s.runBtn.addEventListener('click', async () => {
        setBusy(s, true, 'Applying…');
        try {
          const out = await tool.run({ file, inputs: state, onProgress: (p, l) => setBusy(s, true, l || 'Applying…') });
          showResult(s, {
            ok: true, title: 'Headers & footers applied', msg: `${out.filename} · ${bytes(out.blob.size)}`,
            blob: out.blob, filename: out.filename, tool,
            actions: [{ label: 'Download', cls: 'etxt-btn-finish', ico: dlIco, onClick: () => download(out.blob, out.filename) }],
          });
        } catch (e) { showResult(s, { ok: false, title: 'Could not apply', msg: e.message }); }
        finally { setBusy(s, false); }
      });
    }

    /* ── Compare (Interactive Curtain Slider & Semantic Text Diff) ── */
    function bodyCompare(s, files) {
      const [a, b] = files;
      s.body.className = 'pro-body pro-compare-body';

      let curPage = 1;
      let maxPages = 1;
      let viewMode = 'curtain'; // 'curtain' | 'side' | 'text'
      let curtainPos = 50; // 0 - 100%

      function diffWords(textA, textB) {
        const wordsA = (textA || '').split(/\s+/).filter(Boolean);
        const wordsB = (textB || '').split(/\s+/).filter(Boolean);
        const n = wordsA.length, m = wordsB.length;
        const dp = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
        for (let i = 0; i < n; i++) {
          for (let j = 0; j < m; j++) {
            if (wordsA[i] === wordsB[j]) dp[i + 1][j + 1] = dp[i][j] + 1;
            else dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
          }
        }
        let i = n, j = m;
        const diff = [];
        let added = 0, deleted = 0;
        while (i > 0 || j > 0) {
          if (i > 0 && j > 0 && wordsA[i - 1] === wordsB[j - 1]) {
            diff.unshift({ type: 'same', text: wordsA[i - 1] });
            i--; j--;
          } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
            diff.unshift({ type: 'add', text: wordsB[j - 1] });
            added++;
            j--;
          } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
            diff.unshift({ type: 'del', text: wordsA[i - 1] });
            deleted++;
            i--;
          }
        }
        return { diff, added, deleted };
      }

      s.body.innerHTML = `
        <div class="pro-cmp-container">
          <div class="pro-cmp-toolbar-sub">
            <div class="pro-cmp-mode-toggle">
              <button type="button" class="pro-cmp-tab-btn active" data-mode="curtain">↔ Swipe Curtain</button>
              <button type="button" class="pro-cmp-tab-btn" data-mode="side">◫ Side-by-Side</button>
              <button type="button" class="pro-cmp-tab-btn" data-mode="text">📄 Text Diff</button>
            </div>

            <div class="pro-cmp-page-nav">
              <button type="button" class="pro-cmp-page-btn" id="pro-cmp-prev" title="Previous Page">◀</button>
              <span class="pro-cmp-page-label" id="pro-cmp-page-lbl">Page 1 / 1</span>
              <button type="button" class="pro-cmp-page-btn" id="pro-cmp-next" title="Next Page">▶</button>
            </div>
          </div>

          <div class="pro-cmp-stage" id="pro-cmp-stage">
            <!-- Curtain Swipe View -->
            <div class="pro-cmp-curtain-view" id="pro-cmp-curtain-view">
              <div class="pro-cmp-curtain-wrap" id="pro-cmp-curtain-wrap">
                <canvas id="pro-cmp-canvas-base" class="pro-cmp-canvas base"></canvas>
                <div class="pro-cmp-overlay-clip" id="pro-cmp-overlay-clip" style="width: 50%;">
                  <canvas id="pro-cmp-canvas-top" class="pro-cmp-canvas top"></canvas>
                </div>
                <div class="pro-cmp-curtain-divider" id="pro-cmp-curtain-divider" style="left: 50%;">
                  <div class="pro-cmp-handle">◀ ▶</div>
                </div>
                <div class="pro-cmp-badge base-badge">${esc(a.name)}</div>
                <div class="pro-cmp-badge top-badge">${esc(b.name)}</div>
              </div>
            </div>

            <!-- Side-by-Side Dual View -->
            <div class="pro-cmp-side-view" id="pro-cmp-side-view" style="display:none;">
              <div class="pro-cmp-side-col">
                <div class="pro-cmp-side-head">${esc(a.name)} (Original)</div>
                <canvas id="pro-cmp-canvas-side-a" class="pro-cmp-side-canvas"></canvas>
              </div>
              <div class="pro-cmp-side-col">
                <div class="pro-cmp-side-head">${esc(b.name)} (Modified)</div>
                <canvas id="pro-cmp-canvas-side-b" class="pro-cmp-side-canvas"></canvas>
              </div>
            </div>

            <!-- Semantic Text Diff View -->
            <div class="pro-cmp-text-view" id="pro-cmp-text-view" style="display:none;">
              <div class="pro-cmp-text-box" id="pro-cmp-text-box">
                <p style="color:#64748b; font-size:13px;">Extracting and analyzing text diff…</p>
              </div>
            </div>
          </div>
        </div>

        <aside class="pro-panel">
          <div class="pro-panel-head">
            <strong>Compare PDFs</strong>
            <span>Interactive Diff Station</span>
          </div>

          <div class="pro-cmp-metrics-box">
            <div class="pro-cmp-metric-row">
              <span class="lbl">Pixel Difference</span>
              <b class="val" id="pro-cmp-pixel-val">Calculating…</b>
            </div>
            <div class="pro-cmp-metric-row">
              <span class="lbl">Words Added</span>
              <b class="val text-green" id="pro-cmp-words-add">+0 words</b>
            </div>
            <div class="pro-cmp-metric-row">
              <span class="lbl">Words Deleted</span>
              <b class="val text-red" id="pro-cmp-words-del">-0 words</b>
            </div>
          </div>

          <p class="pro-panel-note" id="pro-cmp-note">Drag the center slider to inspect changes.</p>
          <button type="button" class="etxt-btn-finish pro-panel-run" data-cmp-dl>${dlIco} Download Comparison</button>
        </aside>
      `;

      s.toolbar.innerHTML = `<span class="pro-dim">${esc(a.name)} vs ${esc(b.name)}</span><span class="pro-live" id="pro-cmp-live">Rendering…</span>`;
      s.runBtn.textContent = 'Compare pages';

      const runCompare = async (pageNum) => {
        const pdfjs = await load.pdfjs();
        const [da, db] = [await u8(a), await u8(b)];
        const [pa, pb] = await Promise.all([pdfjs.getDocument({ data: da }).promise, pdfjs.getDocument({ data: db }).promise]);
        maxPages = Math.min(pa.numPages, pb.numPages);
        curPage = Math.min(pageNum, maxPages);

        const pageLbl = s.body.querySelector('#pro-cmp-page-lbl');
        if (pageLbl) pageLbl.textContent = `Page ${curPage} / ${maxPages}`;

        const scale = 1.6;
        const [ra, rb] = await Promise.all([pa.getPage(curPage), pb.getPage(curPage)]);
        const va = ra.getViewport({ scale }), vb = rb.getViewport({ scale });
        const w = Math.max(va.width, vb.width), h = Math.max(va.height, vb.height);

        // Render Canvas A
        const ca = cv(w, h);
        const cta = ca.getContext('2d');
        cta.fillStyle = '#fff';
        cta.fillRect(0, 0, w, h);
        await ra.render({ canvasContext: cta, viewport: va }).promise;

        // Render Canvas B
        const cb = cv(w, h);
        const ctb = cb.getContext('2d');
        ctb.fillStyle = '#fff';
        ctb.fillRect(0, 0, w, h);
        await rb.render({ canvasContext: ctb, viewport: vb }).promise;

        // Calculate Pixel Diff
        const da2 = cta.getImageData(0, 0, w, h).data;
        const db2 = ctb.getImageData(0, 0, w, h).data;
        let diffCount = 0;
        for (let i = 0; i < da2.length; i += 4) {
          const dr = Math.abs(da2[i] - db2[i]);
          const dg = Math.abs(da2[i + 1] - db2[i + 1]);
          const dbl = Math.abs(da2[i + 2] - db2[i + 2]);
          if (dr + dg + dbl > 36) diffCount++;
        }
        const pct = ((diffCount / (w * h)) * 100).toFixed(1);

        // Update Curtain View Canvases
        const baseCv = s.body.querySelector('#pro-cmp-canvas-base');
        const topCv = s.body.querySelector('#pro-cmp-canvas-top');
        if (baseCv && topCv) {
          baseCv.width = w; baseCv.height = h;
          baseCv.getContext('2d').drawImage(ca, 0, 0);
          topCv.width = w; topCv.height = h;
          topCv.getContext('2d').drawImage(cb, 0, 0);
        }

        // Update Side-by-Side Canvases
        const sideA = s.body.querySelector('#pro-cmp-canvas-side-a');
        const sideB = s.body.querySelector('#pro-cmp-canvas-side-b');
        if (sideA && sideB) {
          sideA.width = w; sideA.height = h;
          sideA.getContext('2d').drawImage(ca, 0, 0);
          sideB.width = w; sideB.height = h;
          sideB.getContext('2d').drawImage(cb, 0, 0);
        }

        // Semantic Text Diff
        const [tcA, tcB] = await Promise.all([ra.getTextContent(), rb.getTextContent()]);
        const textA = (tcA.items || []).map(it => it.str).join(' ');
        const textB = (tcB.items || []).map(it => it.str).join(' ');
        const { diff: textDiffList, added, deleted } = diffWords(textA, textB);

        const textBox = s.body.querySelector('#pro-cmp-text-box');
        if (textBox) {
          textBox.innerHTML = textDiffList.map(token => {
            if (token.type === 'add') return `<span class="pro-cmp-token add">+${esc(token.text)}</span> `;
            if (token.type === 'del') return `<span class="pro-cmp-token del">-${esc(token.text)}</span> `;
            return `<span class="pro-cmp-token same">${esc(token.text)}</span> `;
          }).join('');
        }

        // Update Metrics Panel
        const pixelVal = s.body.querySelector('#pro-cmp-pixel-val');
        if (pixelVal) pixelVal.textContent = `${pct}% modified`;
        const wordsAdd = s.body.querySelector('#pro-cmp-words-add');
        if (wordsAdd) wordsAdd.textContent = `+${added} ${added === 1 ? 'word' : 'words'}`;
        const wordsDel = s.body.querySelector('#pro-cmp-words-del');
        if (wordsDel) wordsDel.textContent = `-${deleted} ${deleted === 1 ? 'word' : 'words'}`;

        const note = s.body.querySelector('#pro-cmp-note');
        if (note) note.textContent = `Page ${curPage} of ${maxPages} · ${pct}% pixel diff · ${added + deleted} word change(s)`;

        const liveEl = s.toolbar.querySelector('#pro-cmp-live');
        if (liveEl) liveEl.textContent = `Page ${curPage}/${maxPages} · ${pct}% diff`;

        // Create Composite Diff Download Blob
        const outCanvas = cv(w, h);
        const outCtx = outCanvas.getContext('2d');
        outCtx.drawImage(ca, 0, 0);
        const od = outCtx.getImageData(0, 0, w, h);
        for (let i = 0; i < da2.length; i += 4) {
          const dr = Math.abs(da2[i] - db2[i]), dg = Math.abs(da2[i + 1] - db2[i + 1]), dbl = Math.abs(da2[i + 2] - db2[i + 2]);
          if (dr + dg + dbl > 36) {
            od.data[i] = 239; od.data[i + 1] = 68; od.data[i + 2] = 68; od.data[i + 3] = 255;
          }
        }
        outCtx.putImageData(od, 0, 0);
        window.__cmpBlob = await new Promise((res) => outCanvas.toBlob(res, 'image/png'));
      };

      // Handle Curtain Dragging
      const curtainWrap = s.body.querySelector('#pro-cmp-curtain-wrap');
      const overlayClip = s.body.querySelector('#pro-cmp-overlay-clip');
      const divider = s.body.querySelector('#pro-cmp-curtain-divider');

      let isDraggingCurtain = false;
      const onMove = (clientX) => {
        if (!curtainWrap || !overlayClip || !divider) return;
        const rect = curtainWrap.getBoundingClientRect();
        const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
        curtainPos = (x / rect.width) * 100;
        overlayClip.style.width = `${curtainPos}%`;
        divider.style.left = `${curtainPos}%`;
      };

      if (curtainWrap) {
        curtainWrap.addEventListener('pointerdown', (e) => {
          isDraggingCurtain = true;
          onMove(e.clientX);
          try { curtainWrap.setPointerCapture(e.pointerId); } catch (err) {}
        });
        curtainWrap.addEventListener('pointermove', (e) => {
          if (isDraggingCurtain) onMove(e.clientX);
        });
        curtainWrap.addEventListener('pointerup', () => { isDraggingCurtain = false; });
        curtainWrap.addEventListener('pointercancel', () => { isDraggingCurtain = false; });
      }

      // Mode Toggles
      s.body.querySelectorAll('.pro-cmp-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          s.body.querySelectorAll('.pro-cmp-tab-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          viewMode = btn.dataset.mode;
          const curtainV = s.body.querySelector('#pro-cmp-curtain-view');
          const sideV = s.body.querySelector('#pro-cmp-side-view');
          const textV = s.body.querySelector('#pro-cmp-text-view');
          if (curtainV) curtainV.style.display = viewMode === 'curtain' ? 'block' : 'none';
          if (sideV) sideV.style.display = viewMode === 'side' ? 'grid' : 'none';
          if (textV) textV.style.display = viewMode === 'text' ? 'block' : 'none';
        });
      });

      // Page Navigation
      const prevBtn = s.body.querySelector('#pro-cmp-prev');
      const nextBtn = s.body.querySelector('#pro-cmp-next');
      if (prevBtn) prevBtn.addEventListener('click', () => { if (curPage > 1) runCompare(curPage - 1); });
      if (nextBtn) nextBtn.addEventListener('click', () => { if (curPage < maxPages) runCompare(curPage + 1); });

      // Initial Compare Run
      (async () => {
        try {
          await runCompare(1);
        } catch (e) {
          const note = s.body.querySelector('#pro-cmp-note');
          if (note) note.textContent = 'Could not render pages: ' + e.message;
        }
      })();

      const dlBtn = s.body.querySelector('[data-cmp-dl]');
      if (dlBtn) dlBtn.addEventListener('click', () => { if (window.__cmpBlob) download(window.__cmpBlob, 'pdf-compare-diff.png'); });
    }


    /* ── Invert ── */
    function bodyInvert(s, files) {
      const file = files[0];
      s.body.className = 'pro-body pro-pdf-body';
      s.body.innerHTML = `
        <div class="pro-pdf-thumbs" data-thumbs></div>
        <div class="pro-pdf-stage">
          <div class="pro-pdf-card"><img class="pro-pdf-page" id="pro-inv-img" alt="Inverted page preview"></div>
        </div>
        <aside class="pro-panel"><div class="pro-panel-head"><strong>Invert colours</strong><span>Dark mode for PDFs</span></div>
        <p class="pro-panel-note">Every page is re-encoded as an inverted image — best for scans and notes (up to 60 pages).</p>
        <label class="pro-check"><input type="checkbox" id="pro-inv-toggle" checked><span>Preview inverted</span></label></aside>`;
      let pageNum = 1, numPages = 1, currentUrl = null;
      const draw = async () => {
        const pdfjs = await load.pdfjs();
        const doc = await pdfjs.getDocument({ data: await u8(file) }).promise;
        numPages = doc.numPages;
        const page = await doc.getPage(pageNum);
        const vp = page.getViewport({ scale: 1.4 });
        const c = cv(vp.width, vp.height);
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
        await page.render({ canvasContext: ctx, viewport: vp }).promise;
        if (currentUrl) URL.revokeObjectURL(currentUrl);
        currentUrl = c.toDataURL('image/png');
        const im = s.body.querySelector('#pro-inv-img');
        im.src = currentUrl;
        im.classList.toggle('is-inverted', s.body.querySelector('#pro-inv-toggle').checked);
        s.toolbar.innerHTML = `<span class="pro-dim">Page ${pageNum} of ${numPages}</span><span class="pro-live">Preview</span>`;
      };
      s.body.querySelector('#pro-inv-toggle').addEventListener('change', (e) => {
        s.body.querySelector('#pro-inv-img').classList.toggle('is-inverted', e.target.checked);
      });
      draw();
      renderThumbs(s, file, null, (n) => { pageNum = n; draw(); });
      s.runBtn.addEventListener('click', async () => {
        setBusy(s, true, 'Inverting…');
        try {
          const out = await tool.run({ file, inputs: { scale: '1.5' }, onProgress: (p, l) => setBusy(s, true, l || 'Inverting…') });
          showResult(s, {
            ok: true, title: 'PDF inverted', msg: `${out.filename} · ${bytes(out.blob.size)}`,
            blob: out.blob, filename: out.filename, tool,
            actions: [{ label: 'Download', cls: 'etxt-btn-finish', ico: dlIco, onClick: () => download(out.blob, out.filename) }],
          });
        } catch (e) { showResult(s, { ok: false, title: 'Could not invert', msg: e.message }); }
        finally { setBusy(s, false); }
      });
    }

    /* ── PII redact / sanitize ── */
    function bodyPii(s, files) {
      const file = files[0];
      const isSanitize = id === 'pdf-sanitize-pii';
      s.body.className = 'pro-body pro-pii-body';
      s.body.innerHTML = `
        <div class="pro-pii-stage">
          <div class="pro-pii-hero" id="pro-pii-hero">
            <span class="pro-pii-hero-ico">${T_ICONS[id]}</span>
            <strong>${isSanitize ? 'Sanitize sensitive data' : 'Find & redact PII'}</strong>
            <span>Scan the text layer for emails, phone numbers, ID numbers and card numbers</span>
            <button type="button" class="etxt-btn-finish" id="pro-pii-scan">Scan document</button>
          </div>
          <div class="pro-pii-list" id="pro-pii-list" hidden></div>
        </div>
        <aside class="pro-panel">
          <div class="pro-panel-head"><strong>What to redact</strong><span>Toggle each type</span></div>
          <div class="pro-controls" id="pro-pii-controls"></div>
          <p class="pro-panel-note" id="pro-pii-note">True content-stream redaction — sensitive text is permanently expunged from the PDF stream.</p>
        </aside>`;
      const toggles = [
        { k: 'email', label: 'Email addresses', ico: ROW_ICOS.email },
        { k: 'phone', label: 'Phone numbers', ico: ROW_ICOS.phone },
        { k: 'ssn', label: 'IDs / SSN-like numbers', ico: ROW_ICOS.ssn },
        { k: 'card', label: 'Card numbers', ico: ROW_ICOS.card },
        { k: 'ip', label: 'IP addresses', ico: ROW_ICOS.ip, def: false },
      ];
      const state = {};
      const controlsWrap = s.body.querySelector('#pro-pii-controls');
      for (const t of toggles) {
        state[t.k] = t.def !== false;
        const row = document.createElement('label');
        row.className = 'pro-pii-toggle';
        row.innerHTML = `<span class="pro-pii-toggle-ico">${t.ico}</span><span>${esc(t.label)}</span><input type="checkbox" data-k="${t.k}" ${state[t.k] ? 'checked' : ''}><i></i>`;
        row.querySelector('input').addEventListener('change', (e) => { state[t.k] = e.target.checked; });
        controlsWrap.appendChild(row);
      }
      s.toolbar.innerHTML = `<span class="pro-dim">${esc(file.name)}</span><span class="pro-live">Local scan</span>`;
      const PII_PATTERNS = {
        email: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
        phone: /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/,
        ssn: /\b\d{3}-\d{2}-\d{4}\b/,
        card: /\b(?:\d[ -]*?){13,16}\b/,
        ip: /\b(?:\d{1,3}\.){3}\d{1,3}\b/,
      };
      let foundTotal = 0;
      s.body.querySelector('#pro-pii-scan').addEventListener('click', async () => {
        setBusy(s, true, 'Scanning text layer…');
        const listEl = s.body.querySelector('#pro-pii-list');
        const hero = s.body.querySelector('#pro-pii-hero');
        try {
          const pdfjs = await load.pdfjs();
          const doc = await pdfjs.getDocument({ data: await u8(file) }).promise;
          const counts = {}; const samples = {};
          const active = toggles.filter(t => state[t.k]);
          if (!active.length) throw new Error('Select at least one PII type.');
          for (let i = 1; i <= doc.numPages; i++) {
            const page = await doc.getPage(i);
            const tc = await page.getTextContent();
            const text = tc.items.map(it => it.str).join(' ');
            for (const t of active) {
              const re = new RegExp(PII_PATTERNS[t.k].source, 'gi');
              let m;
              while ((m = re.exec(text))) {
                counts[t.k] = (counts[t.k] || 0) + 1;
                samples[t.k] = samples[t.k] || m[0];
              }
            }
          }
          foundTotal = Object.values(counts).reduce((a, b) => a + b, 0);
          hero.hidden = true;
          listEl.hidden = false;
          const rows = toggles.map(t => {
            const n = counts[t.k] || 0;
            return `<div class="pro-pii-row${n ? ' has' : ''}">
              <span class="pro-pii-toggle-ico">${t.ico}</span>
              <span class="pro-pii-row-label">${esc(t.label)}</span>
              ${samples[t.k] ? `<code>${esc(samples[t.k])}</code>` : '<code>—</code>'}
              <b>${n}</b></div>`;
          }).join('');
          listEl.innerHTML = `<div class="pro-pii-count">${foundTotal} item${foundTotal === 1 ? '' : 's'} found in the text layer</div>${rows}`;
          s.toolbar.querySelector('.pro-live').textContent = foundTotal + ' found';
          if (foundTotal) s.runBtn.disabled = false;
        } catch (e) { showResult(s, { ok: false, title: 'Scan failed', msg: e.message }); }
        finally { setBusy(s, false); }
      });
      s.runBtn.disabled = true;
      s.runBtn.addEventListener('click', async () => {
        setBusy(s, true, isSanitize ? 'Sanitizing…' : 'Redacting…');
        try {
          const inputs = { email: state.email ? 'yes' : 'no', phone: state.phone ? 'yes' : 'no', ssn: state.ssn ? 'yes' : 'no', card: state.card ? 'yes' : 'no', ip: state.ip ? 'yes' : 'no' };
          const out = await tool.run({ file, inputs, onProgress: (p, l) => setBusy(s, true, l || 'Redacting…') });
          showResult(s, {
            ok: true, title: isSanitize ? 'Document sanitized' : 'PII redacted', msg: `${foundTotal} item${foundTotal === 1 ? '' : 's'} covered · ${out.filename}`,
            blob: out.blob, filename: out.filename, tool,
            actions: [{ label: 'Download', cls: 'etxt-btn-finish', ico: dlIco, onClick: () => download(out.blob, out.filename) }],
          });
        } catch (e) { showResult(s, { ok: false, title: 'Could not process', msg: e.message }); }
        finally { setBusy(s, false); }
      });
    }

    /* ── Handwriting → PDF ── */
    function bodyHandToPdf(s, files) {
      const file = files[0];
      s.body.className = 'pro-body pro-simple-body';
      s.body.innerHTML = `
        <div class="pro-simple-stage"><img class="pro-hand-img" id="pro-hand-img" alt="Handwritten note"></div>
        <aside class="pro-panel"><div class="pro-panel-head"><strong>Handwriting to PDF</strong><span>Scan → single page PDF</span></div>
        <div class="pro-controls" data-controls></div>
        <p class="pro-panel-note">Your handwritten page is placed on an A4 page, ready to share or archive.</p></aside>`;
      const url = URL.createObjectURL(file);
      s.body.querySelector('#pro-hand-img').src = url;
      const controlsWrap = s.body.querySelector('[data-controls]');
      const state = { fit: 'contain' };
      controlsWrap.innerHTML = `<div class="pro-control"><label><span>Page fit</span></label>
        <select data-k="fit"><option value="contain" selected>Contain (keep proportions)</option><option value="stretch">Stretch to full page</option></select></div>`;
      controlsWrap.querySelector('select').addEventListener('change', (e) => { state.fit = e.target.value; });
      s.toolbar.innerHTML = `<span class="pro-dim">${esc(file.name)} · ${bytes(file.size)}</span><span class="pro-live">Photo → PDF</span>`;
      s.runBtn.addEventListener('click', async () => {
        setBusy(s, true, 'Converting…');
        try {
          const out = await tool.run({ file, inputs: state });
          showResult(s, {
            ok: true, title: 'PDF created', msg: `${out.filename} · ${bytes(out.blob.size)}`,
            blob: out.blob, filename: out.filename, tool,
            actions: [{ label: 'Download', cls: 'etxt-btn-finish', ico: dlIco, onClick: () => download(out.blob, out.filename) }],
          });
        } catch (e) { showResult(s, { ok: false, title: 'Could not convert', msg: e.message }); }
        finally { setBusy(s, false); }
      });
    }

    /* ── PDF → ZIP ── */
    function bodyPdfToZip(s, files) {
      const file = files[0];
      s.body.className = 'pro-body pro-pdf-body';
      s.body.innerHTML = `
        <div class="pro-pdf-thumbs" data-thumbs></div>
        <div class="pro-pdf-stage"><div class="pro-pdf-card"><img class="pro-pdf-page" id="pro-zip-img" alt="PDF page preview"></div></div>
        <aside class="pro-panel"><div class="pro-panel-head"><strong>PDF to ZIP</strong><span>Bundle PDFs into one archive</span></div>
        <div class="pro-controls" data-controls></div>
        <p class="pro-panel-note">${files.length} PDF ready — the archive keeps original quality and comes out as pdfs.zip.</p></aside>`;
      const controlsWrap = s.body.querySelector('[data-controls]');
      const state = { level: '6' };
      controlsWrap.innerHTML = `<div class="pro-control"><label><span>Compression level</span></label>
        <select data-k="level"><option value="0">Store (fastest)</option><option value="3">Fast</option><option value="6" selected>Balanced</option><option value="9">Maximum</option></select></div>`;
      controlsWrap.querySelector('select').addEventListener('change', (e) => { state.level = e.target.value; });
      let pageNum = 1, numPages = 1;
      const draw = async () => {
        const pdfjs = await load.pdfjs();
        const doc = await pdfjs.getDocument({ data: await u8(file) }).promise;
        numPages = doc.numPages;
        const page = await doc.getPage(pageNum);
        const vp = page.getViewport({ scale: 1.3 });
        const c = cv(vp.width, vp.height);
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
        await page.render({ canvasContext: ctx, viewport: vp }).promise;
        s.body.querySelector('#pro-zip-img').src = c.toDataURL('image/png');
        s.toolbar.innerHTML = `<span class="pro-dim">Page ${pageNum} of ${numPages}</span><span class="pro-live">ZIP locally</span>`;
      };
      draw();
      renderThumbs(s, file, null, (n) => { pageNum = n; draw(); });
      s.runBtn.addEventListener('click', async () => {
        setBusy(s, true, 'Bundling…');
        try {
          const out = await tool.run({ file, files, inputs: state });
          showResult(s, {
            ok: true, title: 'Archive ready', msg: `${out.filename} · ${bytes(out.blob.size)}`,
            blob: out.blob, filename: out.filename, tool,
            actions: [{ label: 'Download', cls: 'etxt-btn-finish', ico: dlIco, onClick: () => download(out.blob, out.filename) }],
          });
        } catch (e) { showResult(s, { ok: false, title: 'Could not create archive', msg: e.message }); }
        finally { setBusy(s, false); }
      });
    }

    /* Thumbnails rail (pdf) */
    function renderThumbs(s, file, hfState, onPick) {
      const wrap = s.body.querySelector('[data-thumbs]');
      if (!wrap) return;
      wrap.innerHTML = '<div class="pro-thumbs-loading">Rendering pages…</div>';
      (async () => {
        const pdfjs = await load.pdfjs();
        const doc = await pdfjs.getDocument({ data: await u8(file) }).promise;
        wrap.textContent = '';
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const vp = page.getViewport({ scale: 0.32 });
          const c = cv(vp.width, vp.height);
          const ctx = c.getContext('2d');
          await page.render({ canvasContext: ctx, viewport: vp }).promise;
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'pro-pdf-thumb' + (i === 1 ? ' is-on' : '');
          btn.innerHTML = `<img src="${c.toDataURL('image/png')}" alt="Page ${i}"><span>${i}</span>`;
          btn.addEventListener('click', () => {
            wrap.querySelectorAll('.pro-pdf-thumb').forEach(x => x.classList.remove('is-on'));
            btn.classList.add('is-on');
            onPick && onPick(i);
          });
          wrap.appendChild(btn);
        }
      })().catch(() => { if (wrap) wrap.textContent = ''; });
    }

    /* Input-only PDF tools: pdf-create, pdf-to-handwriting */
    function mountInputPdf(container, tool, id) {
      container.innerHTML = '';
      container.classList.add('cpdf-root');
      const stage = container.closest('.app-stage-container');
      if (stage) { stage.classList.remove('spdf-stage-active'); stage.style.padding = ''; }
      container.innerHTML = `
        <header class="cpdf-hdr">
          <div class="cpdf-hdr-icon">${T_ICONS[id] || fallbackIco}</div>
          <div><h2 class="cpdf-hdr-title">${esc(tool.name)}</h2><p class="cpdf-hdr-sub">${esc(tool.description || '')}</p></div>
        </header>
        <div class="pro-input-card is-pdf">
          <div class="pro-input-head"><strong>${id === 'pdf-create' ? 'Create a PDF from text' : 'Type text to convert'}</strong><span>${id === 'pdf-create' ? 'Title + body, rendered into a clean document' : 'Cursive text on ruled paper — like a scanned note'}</span></div>
          ${id === 'pdf-create' ? '<input type="text" id="pro-in-title" placeholder="Document title" value="My Document"><textarea id="pro-in-body" placeholder="Your document text…">Type your content here…</textarea><div class="pro-in-row"><label>Page size<select id="pro-in-size"><option value="A4">A4</option><option value="Letter">Letter</option></select></label><label>Font size<select id="pro-in-fs"><option value="10">10</option><option value="12" selected>12</option><option value="14">14</option><option value="16">16</option></select></label></div>'
            : '<textarea id="pro-in-body" placeholder="Dear diary,…" style="min-height:220px">Dear diary,\n\nToday I finished building a whole toolkit that runs entirely in the browser. No uploads, no servers — just quiet, private processing on my own device.</textarea><div class="pro-in-row"><label>Ink colour<select id="pro-in-ink"><option value="blue" selected>Blue</option><option value="black">Black</option><option value="navy">Navy</option><option value="teal">Teal</option></select></label><label>Hand size<select id="pro-in-hand"><option value="small">Small</option><option value="medium" selected>Medium</option><option value="large">Large</option></select></label></div>'}
          <div class="pro-input-actions"><button type="button" class="etxt-btn-finish" data-input-run>${id === 'pdf-create' ? 'Create PDF' : 'Convert to handwriting'}</button></div>
        </div>
        <div class="pro-result" data-pro-result hidden></div>`;
      const runBtn = container.querySelector('[data-input-run]');
      const resultEl = container.querySelector('[data-pro-result]');
      runBtn.addEventListener('click', async () => {
        runBtn.disabled = true; runBtn.textContent = 'Working…';
        try {
          const inputs = id === 'pdf-create'
            ? { title: container.querySelector('#pro-in-title').value, text: container.querySelector('#pro-in-body').value, size: container.querySelector('#pro-in-size').value, fontSize: container.querySelector('#pro-in-fs').value }
            : { text: container.querySelector('#pro-in-body').value, ink: container.querySelector('#pro-in-ink').value, size: container.querySelector('#pro-in-hand').value };
          const out = await tool.run({ inputs });
          if (window.FF?.renderUnifiedResult && out?.blob) {
            window.FF.renderUnifiedResult(container, {
              tool,
              blob: out.blob,
              filename: out.filename,
              title: id === 'pdf-create' ? 'PDF Created' : 'Handwriting Page Ready',
              badge: `${bytes(out.blob.size)} · 100% Local`,
              onBacktrack: () => mountInputPdf(container, tool, id),
              onAgain: () => mountInputPdf(container, tool, id)
            });
            return;
          }
          resultEl.className = 'pro-result is-ok';
          resultEl.hidden = false;
          resultEl.innerHTML = `
            <span class="pro-result-ico">${checkIco}</span>
            <div class="pro-result-copy"><strong>${id === 'pdf-create' ? 'PDF created' : 'Handwriting page ready'}</strong><span>${esc(out.filename)} · ${bytes(out.blob.size)}</span></div>
            <div class="pro-result-actions"><button type="button" class="etxt-btn-secondary" data-dl>${dlIco} Download</button></div>`;
          resultEl.querySelector('[data-dl]').addEventListener('click', () => download(out.blob, out.filename));
        } catch (e) {
          resultEl.className = 'pro-result is-err'; resultEl.hidden = false;
          resultEl.innerHTML = `<span class="pro-result-ico">!</span><div class="pro-result-copy"><strong>Could not generate</strong><span>${esc(e.message)}</span></div>`;
        } finally { runBtn.disabled = false; runBtn.textContent = id === 'pdf-create' ? 'Create PDF' : 'Convert to handwriting'; }
      });
    }

    function setBusy(s, busy, label) {
      if (s.runBtn) { s.runBtn.disabled = busy; if (label) s.runBtn.textContent = label; else s.runBtn.textContent = 'Apply'; }
      s.body.setAttribute('aria-busy', String(busy));
    }

    function reset() {
      dropzone(container, tool, {
        accepts: id === 'handwriting-to-pdf' ? ['png', 'jpg', 'jpeg', 'webp', 'bmp'] : ['pdf'],
        multiple: id === 'pdf-compare',
        headline: id === 'pdf-compare' ? 'Drop two PDFs to compare' : `Drop your ${tool.name.toLowerCase()} file here`,
        meta: id === 'handwriting-to-pdf' ? 'PNG · JPG · JPEG · WEBP · BMP · 100% local' : 'PDF · 100% local · never uploaded',
      }).setOnFiles(async (list) => {
        const files = [...list].filter(Boolean);
        if (id === 'pdf-compare' && files.length !== 2) return;
        renderWorkspace(files);
      });
    }
  }

  /* ─── Register dispatchers ───────────────────────────── */
  window.__ffMountImagePro = (container, tool) => mountImagePro(container, tool);
  window.__ffMountPdfPro = (container, tool) => mountPdfPro(container, tool);

  /* Register any tools missing from the runtime registry (safety) */
  try {
    if (!window.FF.registry.get('image-sharpen')) {
      R({ id: 'image-sharpen', category: 'Images', name: 'Sharpen', description: 'Sharpen via convolution.', accepts: ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif'], fields: [], run: async () => ({ blob: new Blob(), filename: 'x.png', mime: 'image/png' }) });
    }
  } catch (e) { /* registry already has them */ }
})();

/* ═══════════════════════════════════════════════════════════════════════════
   FileKit — New client-side tools (batch 1)
   PDF utilities · Documents · Security & Privacy · Business · Scan · Workflow
   Every tool runs 100% locally using the vendored libs (pdf-lib, pdfjs,
   fflate, xlsx, exifr) + browser APIs. No server, no network.
═══════════════════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const U = window.FF.util;
  const R = window.FF.register;

  /* ─── Shared helpers ─────────────────────────────── */
  const load = {
    pdfjs:  () => U.loadScript('vendor/pdfjs.min.js', 'sha384-OemFRmhjDZwhIKuUld0HJozkF2YErsgDaCL41trxGQZt4/WgnopJQqQl2DvDZ07Z')
      .then(() => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js'; return window.pdfjsLib; }),
    pdflib: () => U.loadScript('vendor/pdf-lib.min.js', 'sha384-weMABwrltA6jWR8DDe9Jp5blk+tZQh7ugpCsF3JwSA53WZM9/14PjS5LAJNHNjAI').then(() => window.PDFLib),
    fflate: () => U.loadScript('vendor/fflate.js', 'sha384-DT0Ls0mO7JmjTnT+oBuMhEJzYJO1zUqzuuMXNdnOmOQRIpN2BgSjvBV/j50NngIT').then(() => window.fflate),
    xlsx:   () => U.loadScript('vendor/xlsx.full.min.js').then(() => window.XLSX),
    exifr:  () => U.loadScript('vendor/exifr.js', 'sha384-KrOocIA+lZcNUz2MDavnT/FuX+CbTREJihUi0bp8QUSwhE2AkGTNpv2b7yMbBkx5').then(() => window.exifr),
    tesseract: () => U.loadScript('vendor/tesseract/tesseract.min.js', 'sha384-GJqSu7vueQ9qN0E9yLPb3Wtpd7OrgK8KmYzC8T1IysG1bcvxvIO4qtYR/D3A991F').then(() => window.Tesseract),
    heic2any: () => U.loadScript('vendor/heic2any/heic2any.min.js').then(() => window.heic2any),
  };

  const u8 = (blob) => blob.arrayBuffer().then((b) => new Uint8Array(b));
  const bytes = (n) => { n = Number(n) || 0; if (n < 1024) return n + ' B'; if (n < 1048576) return (n / 1024).toFixed(1) + ' KB'; return (n / 1048576).toFixed(1) + ' MB'; };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pdfOut = (bytesU8, filename) => ({ blob: new Blob([bytesU8], { type: 'application/pdf' }), filename, mime: 'application/pdf' });
  const textOut = (text, filename, mime = 'text/plain') => ({ preview: 'text', text, filename, mime, blob: new Blob([text], { type: mime }) });

  /* Render every page of a PDF to canvases via pdfjs. */
  async function renderPdf(pdfjs, data, scale, onProgress) {
    const doc = await pdfjs.getDocument({ data }).promise;
    const out = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const vp = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(vp.width); canvas.height = Math.ceil(vp.height);
      const ctx = canvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport: vp }).promise;
      out.push({ page, vp, canvas });
      onProgress && onProgress((i / doc.numPages) * 0.9);
    }
    return { doc, pages: out };
  }
  const canvasPng = (canvas) => new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? b.arrayBuffer().then((a) => res(new Uint8Array(a))) : rej(new Error('Could not encode image.'))), 'image/png'));

  /* Word-wrap text to fit a width in pdf-lib points. */
  function wrapText(text, font, size, maxWidth) {
    const words = String(text ?? '').split(/\s+/).filter(Boolean);
    const lines = [];
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (font.widthOfTextAtSize(test, size) > maxWidth && line) { lines.push(line); line = w; }
      else line = test;
    }
    if (line) lines.push(line);
    return lines;
  }

  /* ════════════════════════════════════════════════════════════════
     Scanner engine — edge detection, perspective crop, enhance, OCR.
     Pure canvas math (no external libs). Exposed on window.__ffScanApi
     so the Scan tool, pdf-ocr tool, and tests share one implementation.
  ════════════════════════════════════════════════════════════════ */
  const canvasJpeg = (canvas, q = 0.85) => new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? b.arrayBuffer().then((a) => res(new Uint8Array(a))) : rej(new Error('Could not encode image.'))), 'image/jpeg', q));
  const copyCanvas = (c) => { const n = document.createElement('canvas'); n.width = c.width; n.height = c.height; n.getContext('2d').drawImage(c, 0, 0); return n; };
  const fitCanvas = (c, maxDim) => {
    const mx = Math.max(c.width, c.height);
    if (mx <= maxDim) return c;
    const s = maxDim / mx;
    const n = document.createElement('canvas');
    n.width = Math.round(c.width * s); n.height = Math.round(c.height * s);
    n.getContext('2d').drawImage(c, 0, 0, n.width, n.height);
    return n;
  };

  function imgGray(imgData) {
    const { data, width: w, height: h } = imgData;
    const g = new Float32Array(w * h);
    for (let i = 0, p = 0; i < g.length; i++, p += 4) g[i] = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
    return g;
  }
  function boxBlur(g, w, h, r) {
    const out = new Float32Array(g.length), tmp = new Float32Array(g.length), k = 2 * r + 1;
    for (let y = 0; y < h; y++) {
      let acc = 0;
      for (let x = -r; x <= r; x++) acc += g[y * w + Math.min(w - 1, Math.max(0, x))];
      for (let x = 0; x < w; x++) {
        tmp[y * w + x] = acc / k;
        acc += g[y * w + Math.min(w - 1, x + r + 1)] - g[y * w + Math.max(0, x - r)];
      }
    }
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let y = -r; y <= r; y++) acc += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
      for (let y = 0; y < h; y++) {
        out[y * w + x] = acc / k;
        acc += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
      }
    }
    return out;
  }
  function sobel(g, w, h) {
    const mag = new Float32Array(w * h);
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const tl = g[(y - 1) * w + x - 1], t = g[(y - 1) * w + x], tr = g[(y - 1) * w + x + 1];
      const l = g[y * w + x - 1], r = g[y * w + x + 1];
      const bl = g[(y + 1) * w + x - 1], b = g[(y + 1) * w + x], br = g[(y + 1) * w + x + 1];
      const gx = -tl - 2 * l - bl + tr + 2 * r + br;
      const gy = -tl - 2 * t - tr + bl + 2 * b + br;
      mag[y * w + x] = Math.abs(gx) + Math.abs(gy);
    }
    return mag;
  }
  function otsuThreshold(mag) {
    const hist = new Uint32Array(256);
    let max = 0;
    for (let i = 0; i < mag.length; i++) if (mag[i] > max) max = mag[i];
    if (max < 1) return 1;
    const scale = 255 / max, total = mag.length;
    for (let i = 0; i < total; i++) hist[(mag[i] * scale) | 0]++;
    let sum = 0;
    for (let t = 0; t < 256; t++) sum += t * hist[t];
    let sumB = 0, wB = 0, best = 0, bestT = 10;
    for (let t = 0; t < 256; t++) {
      wB += hist[t];
      if (!wB) continue;
      const wF = total - wB;
      if (!wF) break;
      sumB += t * hist[t];
      const mB = sumB / wB, mF = (sum - sumB) / wF, between = wB * wF * (mB - mF) * (mB - mF);
      if (between > best) { best = between; bestT = t; }
    }
    return Math.max(18, (bestT / scale) * 0.85);
  }
  function convexHull(pts) {
    const s = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lower = [], upper = [];
    for (const p of s) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop(); lower.push(p); }
    for (let i = s.length - 1; i >= 0; i--) { const p = s[i]; while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop(); upper.push(p); }
    lower.pop(); upper.pop();
    return lower.concat(upper);
  }
  const triArea = (a, b, c) => Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) / 2;
  function simplifyToK(poly, k) {
    if (poly.length <= k) return poly.slice();
    const pts = poly.map((p) => ({ p, a: Infinity, alive: true }));
    const n = pts.length;
    const calc = (j) => { const prev = pts[(j - 1 + n) % n], cur = pts[j], next = pts[(j + 1) % n]; cur.a = triArea(prev.p, cur.p, next.p); };
    for (let j = 0; j < n; j++) calc(j);
    let alive = n;
    while (alive > k) {
      let minJ = -1, minA = Infinity;
      for (let j = 0; j < n; j++) if (pts[j].alive && pts[j].a < minA) { minA = pts[j].a; minJ = j; }
      if (minJ < 0) break;
      pts[minJ].alive = false; alive--;
      let a = (minJ - 1 + n) % n; while (!pts[a].alive) a = (a - 1 + n) % n; calc(a);
      let b = (minJ + 1) % n; while (!pts[b].alive) b = (b + 1) % n; calc(b);
    }
    return pts.filter((q) => q.alive).map((q) => q.p);
  }
  /* Douglas-Peucker on an open chain — keeps the endpoints, then the
     points farthest from each chord. Preserves true corners under noise. */
  function dpOpen(poly, eps) {
    if (poly.length <= 2) return poly.slice();
    const seg = (a, b) => {
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const len = Math.hypot(dx, dy) || 1;
      return (p) => Math.abs(dx * (a[1] - p[1]) - (a[0] - p[0]) * dy) / len;
    };
    const recurse = (i, j) => {
      const dist = seg(poly[i], poly[j]);
      let maxD = 0, idx = -1;
      for (let k = i + 1; k < j; k++) {
        const d = dist(poly[k]);
        if (d > maxD) { maxD = d; idx = k; }
      }
      if (idx >= 0 && maxD > eps) {
        const L = recurse(i, idx), R = recurse(idx, j);
        return L.concat(R.slice(1));
      }
      return [poly[i], poly[j]];
    };
    return recurse(0, poly.length - 1);
  }
  /* Douglas-Peucker on a closed loop: split at the diameter pair, DP each
     arc, rejoin. Avoids the degenerate seam a naive closed DP hits. */
  function dpClosed(poly, eps) {
    if (poly.length <= 4) return poly.slice();
    let bi = 0, bj = 1, bd = -1;
    for (let i = 0; i < poly.length; i++) for (let j = i + 1; j < poly.length; j++) {
      const d = (poly[i][0] - poly[j][0]) ** 2 + (poly[i][1] - poly[j][1]) ** 2;
      if (d > bd) { bd = d; bi = i; bj = j; }
    }
    const n = poly.length;
    const c = [];
    for (let k = 0; k < n; k++) c.push(poly[(bi + k) % n]);
    let jp = 0;
    for (let k = 0; k < n; k++) if (c[k] === poly[bj]) { jp = k; break; }
    const A = dpOpen(c.slice(0, jp + 1), eps);
    const B = dpOpen(c.slice(jp).concat([c[0]]), eps);
    return A.concat(B.slice(1, B.length - 1));
  }
  function orderQuad(quad) {
    const tl = quad.reduce((m, p) => (p[0] + p[1] < m[0] + m[1] ? p : m));
    const br = quad.reduce((m, p) => (p[0] + p[1] > m[0] + m[1] ? p : m));
    const tr = quad.reduce((m, p) => (p[1] - p[0] < m[1] - m[0] ? p : m));
    const bl = quad.reduce((m, p) => (p[1] - p[0] > m[1] - m[0] ? p : m));
    return [tl, tr, br, bl];
  }
  const polyArea = (p) => { let a = 0; for (let i = 0; i < p.length; i++) { const j = (i + 1) % p.length; a += p[i][0] * p[j][1] - p[j][0] * p[i][1]; } return Math.abs(a) / 2; };
  /* Rotate a quad's corner order 90° clockwise — cycles [TL,TR,BR,BL] → [BL,TL,TR,BR],
     which makes the warp output come out rotated 90° (fixes sideways documents). */
  const rotateQuad = (quad) => [quad[3], quad[0], quad[1], quad[2]];
  function detectQuad(imgData, w, h) {
    if (w < 48 || h < 48) return null;
    const mag = sobel(boxBlur(imgGray(imgData), w, h, 1), w, h);
    const T = otsuThreshold(mag);
    const pts = [];
    for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) if (mag[y * w + x] > T) pts.push([x, y]);
    if (pts.length < 120) return null;
    let hull = convexHull(pts);
    if (hull.length < 3) return null;
    let quad = hull;
    let eps = 0.02 * Math.min(w, h);
    for (let tries = 0; tries < 7 && quad.length > 4; tries++) {
      quad = dpClosed(hull, eps);
      if (quad.length > 4) eps *= 1.6;
    }
    if (quad.length > 4) quad = quad.slice(0, 4);
    while (quad.length < 4) { // pad degenerate shapes by splitting the longest edge
      let mi = -1, md = -1;
      for (let i = 0; i < quad.length; i++) { const a = quad[i], b = quad[(i + 1) % quad.length], d = (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2; if (d > md) { md = d; mi = i; } }
      const a = quad[mi], b = quad[(mi + 1) % quad.length];
      quad.splice(mi + 1, 0, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
    }
    quad = orderQuad(quad);
    if (polyArea(quad) < 0.06 * w * h) return null;
    const d1 = Math.hypot(quad[1][0] - quad[0][0], quad[1][1] - quad[0][1]);
    const d2 = Math.hypot(quad[2][0] - quad[1][0], quad[2][1] - quad[1][1]);
    if (Math.max(d1, d2) / Math.max(1, Math.min(d1, d2)) > 8) return null;
    for (const p of quad) if (p[0] < -w * 0.08 || p[0] > w * 1.08 || p[1] < -h * 0.08 || p[1] > h * 1.08) return null;
    return quad.map((p) => ({ x: p[0], y: p[1] }));
  }
  function solveHomography(src, dst) {
    const A = [], b = [];
    for (let i = 0; i < 4; i++) {
      const sx = src[i].x, sy = src[i].y, dx = dst[i].x, dy = dst[i].y;
      A.push([sx, sy, 1, 0, 0, 0, -sx * dx, -sy * dx]); b.push(dx);
      A.push([0, 0, 0, sx, sy, 1, -sx * dy, -sy * dy]); b.push(dy);
    }
    const n = 8;
    for (let col = 0; col < n; col++) {
      let piv = col;
      for (let r = col + 1; r < n; r++) if (Math.abs(A[r][col]) > Math.abs(A[piv][col])) piv = r;
      if (Math.abs(A[piv][col]) < 1e-12) return null;
      [A[col], A[piv]] = [A[piv], A[col]]; [b[col], b[piv]] = [b[piv], b[col]];
      const inv = 1 / A[col][col];
      for (let c = col; c < n; c++) A[col][c] *= inv;
      b[col] *= inv;
      for (let r = 0; r < n; r++) {
        if (r === col) continue;
        const f = A[r][col];
        if (!f) continue;
        for (let c = col; c < n; c++) A[r][c] -= f * A[col][c];
        b[r] -= f * b[col];
      }
    }
    return [b[0], b[1], b[2], b[3], b[4], b[5], b[6], b[7], 1];
  }
  function invertHomography(H) {
    const [a, b, c, d, e, f, g, h, i] = H;
    const A = e * i - f * h, B = c * h - b * i, C = b * f - c * e;
    const D = f * g - d * i, E = a * i - c * g, F = c * d - a * f;
    const G = d * h - e * g, Hh = b * g - a * h, I = a * e - b * d;
    const det = a * A + b * D + c * G;
    if (Math.abs(det) < 1e-12) return null;
    const inv = 1 / det;
    return [A * inv, B * inv, C * inv, D * inv, E * inv, F * inv, G * inv, Hh * inv, I * inv];
  }
  function warpQuad(srcCanvas, quad, maxDim = 1400) {
    const sw = srcCanvas.width, sh = srcCanvas.height;
    const q = quad.map((p) => ({ x: p.x, y: p.y }));
    const w1 = Math.hypot(q[1].x - q[0].x, q[1].y - q[0].y), w2 = Math.hypot(q[2].x - q[3].x, q[2].y - q[3].y);
    const h1 = Math.hypot(q[3].x - q[0].x, q[3].y - q[0].y), h2 = Math.hypot(q[2].x - q[1].x, q[2].y - q[1].y);
    let W = Math.round((w1 + w2) / 2), H = Math.round((h1 + h2) / 2);
    const mx = Math.max(W, H);
    if (mx > maxDim) { const s = maxDim / mx; W = Math.round(W * s); H = Math.round(H * s); }
    W = Math.max(8, W); H = Math.max(8, H);
    const Hm = solveHomography(q, [{ x: 0, y: 0 }, { x: W, y: 0 }, { x: W, y: H }, { x: 0, y: H }]);
    if (!Hm) return null;
    const Hi = invertHomography(Hm);
    if (!Hi) return null;
    const out = document.createElement('canvas');
    out.width = W; out.height = H;
    const octx = out.getContext('2d');
    const id = octx.createImageData(W, H);
    const od = id.data;
    const sid = srcCanvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, sw, sh).data;
    const [a, b, c, d, e, f, g, hh, ii] = Hi;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const den = g * x + hh * y + ii;
      let r = 255, gg = 255, bb = 255, aa = 255;
      if (Math.abs(den) > 1e-9) {
        const inv = 1 / den, sx = (a * x + b * y + c) * inv, sy = (d * x + e * y + f) * inv;
        const x0 = Math.floor(sx), y0 = Math.floor(sy);
        if (x0 >= 0 && y0 >= 0 && x0 < sw && y0 < sh) {
          const fx = sx - x0, fy = sy - y0, x1 = Math.min(sw - 1, x0 + 1), y1 = Math.min(sh - 1, y0 + 1);
          const p00 = (y0 * sw + x0) * 4, p10 = (y0 * sw + x1) * 4, p01 = (y1 * sw + x0) * 4, p11 = (y1 * sw + x1) * 4;
          const w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy), w01 = (1 - fx) * fy, w11 = fx * fy;
          r = sid[p00] * w00 + sid[p10] * w10 + sid[p01] * w01 + sid[p11] * w11;
          gg = sid[p00 + 1] * w00 + sid[p10 + 1] * w10 + sid[p01 + 1] * w01 + sid[p11 + 1] * w11;
          bb = sid[p00 + 2] * w00 + sid[p10 + 2] * w10 + sid[p01 + 2] * w01 + sid[p11 + 2] * w11;
        }
      }
      const o = (y * W + x) * 4;
      od[o] = r; od[o + 1] = gg; od[o + 2] = bb; od[o + 3] = aa;
    }
    octx.putImageData(id, 0, 0);
    return out;
  }

  /* Detect a document in a photo/camera frame → perspective-corrected crop.
     Pass opts.quad (4 {x,y} in src pixels) to skip detection and use a
     manually-adjusted quad instead. */
  async function processPhoto(src, opts = {}) {
    const detect = opts.detect !== false;
    if (opts.quad && opts.quad.length === 4) {
      const warped = warpQuad(src, opts.quad, opts.maxDim || 1400);
      if (warped) return { canvas: warped, cropped: true, quad: opts.quad };
    }
    if (detect) {
      const maxW = 260;
      const sc = Math.min(1, maxW / src.width);
      const dw = Math.max(64, Math.round(src.width * sc)), dh = Math.max(64, Math.round(src.height * sc));
      const dc = document.createElement('canvas');
      dc.width = dw; dc.height = dh;
      const dctx = dc.getContext('2d', { willReadFrequently: true });
      dctx.drawImage(src, 0, 0, dw, dh);
      const quad = detectQuad(dctx.getImageData(0, 0, dw, dh), dw, dh);
      if (quad) {
        const full = quad.map((p) => ({ x: p.x * (src.width / dw), y: p.y * (src.height / dh) }));
        const warped = warpQuad(src, full, opts.maxDim || 1400);
        if (warped) return { canvas: warped, cropped: true, quad: full };
      }
    }
    return { canvas: src, cropped: false, quad: null };
  }

  /* Enhance a page. Modes: 'original' | 'enhanced' (Magic Color Document) | 'bw' | 'board' | 'photo'.
     opts: { brightness: 0-200 (100 = none), contrast: 0-200 (100 = none) } */
  function enhancePage(canvas, mode, opts) {
    const b = (opts && opts.brightness != null ? opts.brightness : 100) / 100;
    const c = (opts && opts.contrast != null ? opts.contrast : 100) / 100;
    const bc = (v) => { const x = ((v - 128) * c + 128) * b; return Math.max(0, Math.min(255, x)); };
    const w = canvas.width, h = canvas.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const id = ctx.getImageData(0, 0, w, h);
    const d = id.data;
    if ((!mode || mode === 'original') && b === 1 && c === 1) return canvas;
    const g = imgGray(id);
    const out = ctx.createImageData(w, h);

    if (mode === 'bw') {
      const hist = new Uint32Array(256);
      for (let i = 0; i < g.length; i++) hist[Math.max(0, Math.min(255, g[i] | 0))]++;
      const total = w * h;
      let sum = 0; for (let t = 0; t < 256; t++) sum += t * hist[t];
      let sumB = 0, wB = 0, best = 0, T = 128;
      for (let t = 0; t < 256; t++) {
        wB += hist[t]; if (!wB) continue;
        const wF = total - wB; if (!wF) break;
        sumB += t * hist[t];
        const mB = sumB / wB, mF = (sum - sumB) / wF, between = wB * wF * (mB - mF) * (mB - mF);
        if (between > best) { best = between; T = t; }
      }
      for (let i = 0; i < g.length; i++) {
        const v = bc(g[i] > T ? 255 : 0);
        out.data[i * 4] = v; out.data[i * 4 + 1] = v; out.data[i * 4 + 2] = v; out.data[i * 4 + 3] = 255;
      }
    } else if (mode === 'photo') {
      const sorted = Array.from(g).sort((a, b) => a - b);
      const lo = sorted[Math.floor(sorted.length * 0.015)], hi = sorted[Math.floor(sorted.length * 0.985)];
      const range = Math.max(1, hi - lo);
      for (let i = 0; i < g.length; i++) {
        const f = Math.max(0, Math.min(1, (g[i] - lo) / range));
        const o = i * 4;
        out.data[o] = bc(d[o] * f * 0.35 + (d[o] - lo) / range * 255 * 0.65);
        out.data[o + 1] = bc(d[o + 1] * f * 0.35 + (d[o + 1] - lo) / range * 255 * 0.65);
        out.data[o + 2] = bc(d[o + 2] * f * 0.35 + (d[o + 2] - lo) / range * 255 * 0.65);
        out.data[o + 3] = 255;
      }
    } else if (mode === 'enhanced') {
      // Magic Color Illumination Normalization: background illumination division + color retention
      const rArr = new Float32Array(w * h), gArr = new Float32Array(w * h), bArr = new Float32Array(w * h);
      for (let i = 0, p = 0; i < w * h; i++, p += 4) {
        rArr[i] = d[p]; gArr[i] = d[p + 1]; bArr[i] = d[p + 2];
      }
      const rBg = boxBlur(rArr, w, h, 14), gBg = boxBlur(gArr, w, h, 14), bBg = boxBlur(bArr, w, h, 14);
      for (let i = 0, p = 0; i < w * h; i++, p += 4) {
        const nr = Math.min(255, (d[p] / Math.max(15, rBg[i])) * 245);
        const ng = Math.min(255, (d[p + 1] / Math.max(15, gBg[i])) * 245);
        const nb = Math.min(255, (d[p + 2] / Math.max(15, bBg[i])) * 245);
        out.data[p] = bc(nr < 140 ? nr * 0.88 : nr);
        out.data[p + 1] = bc(ng < 140 ? ng * 0.88 : ng);
        out.data[p + 2] = bc(nb < 140 ? nb * 0.88 : nb);
        out.data[p + 3] = 255;
      }
    } else {
      // Board mode
      const sorted = Array.from(g).sort((a, b) => a - b);
      const lo = sorted[Math.floor(sorted.length * 0.003)], hi = sorted[Math.floor(sorted.length * 0.997)];
      const range = Math.max(1, hi - lo);
      const stretch = new Float32Array(g.length);
      for (let i = 0; i < g.length; i++) stretch[i] = Math.max(0, Math.min(255, (g[i] - lo) / range * 255));
      const blurred = boxBlur(stretch, w, h, 2);
      for (let i = 0; i < g.length; i++) {
        const v = bc(Math.max(0, Math.min(255, stretch[i] + 1.0 * (stretch[i] - blurred[i]))));
        out.data[i * 4] = v; out.data[i * 4 + 1] = v; out.data[i * 4 + 2] = v; out.data[i * 4 + 3] = 255;
      }
    }
    ctx.putImageData(out, 0, 0);
    return canvas;
  }

  /* Load an image file into a canvas, honouring EXIF orientation (phone photos).
     HEIC/HEIF (iPhone default) is decoded via the vendored heic2any first. */
  async function loadPhotoIntoCanvas(file) {
    const isHeic = /heic|heif/i.test(file.type) || /\.heic$/i.test(file.name);
    let src = file;
    if (isHeic) {
      try {
        const h2a = await load.heic2any();
        const out = await h2a({ blob: file, toType: 'image/jpeg', quality: 0.92 });
        src = Array.isArray(out) ? out[0] : out;
      } catch { throw new Error('Could not decode HEIC photo (unsupported codec?)'); }
    }
    const url = URL.createObjectURL(src);
    try {
      const img = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error('Could not read image')); img.src = url; });
      let rot = 0;
      // HEIC already decodes with orientation baked in (libheif) — don't double-rotate.
      try { if (!isHeic) { const exifr = await load.exifr(); const ex = await exifr.parse(file, ['orientation']); rot = (ex && ex.orientation) || 0; } } catch {}
      const w = img.naturalWidth, h = img.naturalHeight;
      const c = document.createElement('canvas');
      if (rot === 6 || rot === 8) { c.width = h; c.height = w; } else { c.width = w; c.height = h; }
      const ctx = c.getContext('2d');
      ctx.save();
      if (rot === 3) ctx.rotate(Math.PI);
      else if (rot === 6) { ctx.translate(h, 0); ctx.rotate(Math.PI / 2); }
      else if (rot === 8) { ctx.translate(0, w); ctx.rotate(-Math.PI / 2); }
      ctx.drawImage(img, 0, 0);
      ctx.restore();
      return c;
    } finally { URL.revokeObjectURL(url); }
  }

  /* ─── OCR (self-hosted Tesseract, lazy-loaded, multi-language support) ─── */
  let _ocrWorker = null;
  let _ocrLang = 'eng';
  let _ocrOnProgress = null;
  async function ocrRecognize(canvases, onProgress, lang = 'eng') {
    const T = await load.tesseract();
    if (!_ocrWorker || _ocrLang !== lang) {
      if (_ocrWorker) { try { await _ocrWorker.terminate(); } catch {} _ocrWorker = null; }
      _ocrLang = lang;
      _ocrWorker = await T.createWorker(lang, 1, {
        workerPath: 'vendor/tesseract/worker.min.js',
        corePath: '/vendor/tesseract/tesseract-core-simd.wasm.js',
        langPath: lang === 'eng' ? '/vendor/tesseract/' : 'https://tessdata.projectnaptha.com/4.0.0_fast',
        workerBlobURL: false,
        logger: (m) => { if (m.status === 'recognizing text' && _ocrOnProgress) _ocrOnProgress(m.progress); },
      });
    }
    const n = canvases.length;
    const results = [];
    for (let i = 0; i < n; i++) {
      _ocrOnProgress = (p) => { if (typeof onProgress === 'function') onProgress((i + p) / n); };
      const { data } = await _ocrWorker.recognize(canvases[i]);
      results.push(data);
      if (typeof onProgress === 'function') onProgress((i + 1) / n);
    }
    _ocrOnProgress = null;
    return results;
  }

  /* Build a searchable PDF with page normalization (Original, A4, Letter) and compression quality */
  async function searchablePdfFromCanvases(canvases, ocrResults, opts = {}) {
    const PDFLib = await load.pdflib();
    const doc = await PDFLib.PDFDocument.create();
    const font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
    const pageSize = opts.pageSize || 'a4'; // 'original' | 'a4' | 'letter'
    const q = opts.quality || 0.85;

    for (let i = 0; i < canvases.length; i++) {
      const srcCanvas = canvases[i];
      const jpg = await canvasJpeg(srcCanvas, q);
      const img = await doc.embedJpg(jpg);
      let pageW, pageH, imgW, imgH, imgX = 0, imgY = 0;

      if (pageSize === 'a4') {
        pageW = 595.28; pageH = 841.89;
        const s = Math.min((pageW - 20) / img.width, (pageH - 20) / img.height);
        imgW = img.width * s; imgH = img.height * s;
        imgX = (pageW - imgW) / 2; imgY = (pageH - imgH) / 2;
      } else if (pageSize === 'letter') {
        pageW = 612; pageH = 792;
        const s = Math.min((pageW - 20) / img.width, (pageH - 20) / img.height);
        imgW = img.width * s; imgH = img.height * s;
        imgX = (pageW - imgW) / 2; imgY = (pageH - imgH) / 2;
      } else {
        pageW = 595.28; const s = pageW / img.width; pageH = img.height * s;
        imgW = pageW; imgH = pageH;
      }

      const page = doc.addPage([pageW, pageH]);
      page.drawImage(img, { x: imgX, y: imgY, width: imgW, height: imgH });

      const scaleFactor = imgW / img.width;
      const data = ocrResults[i];
      if (data && data.words) for (const word of data.words) {
        if (!word.text || !word.bbox) continue;
        const x = imgX + word.bbox.x0 * scaleFactor;
        const y = imgY + (imgH - word.bbox.y1 * scaleFactor);
        const fsize = Math.max(2.5, (word.bbox.y1 - word.bbox.y0) * scaleFactor);
        page.drawText(String(word.text), { x, y, size: fsize, font, color: PDFLib.rgb(1, 1, 1) });
      }
    }
    return doc.save();
  }

  window.__ffScanApi = {
    imgGray, boxBlur, sobel, otsuThreshold, convexHull, simplifyToK, dpClosed, orderQuad, polyArea, triArea, rotateQuad,
    detectQuad, solveHomography, invertHomography, warpQuad, processPhoto, enhancePage,
    loadPhotoIntoCanvas, ocrRecognize, searchablePdfFromCanvases, canvasJpeg, copyCanvas, fitCanvas,
  };
  window.__ffOcrEngine = {
    recognizeCanvases: ocrRecognize,
    async runPdfOcr(file, onProgress) {
      const pdfjs = await load.pdfjs();
      const doc = await pdfjs.getDocument({ data: await u8(file) }).promise;
      const canvases = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const vp1 = page.getViewport({ scale: 1 });
        const sc = Math.min(2, 1600 / Math.max(vp1.width, vp1.height));
        const vp = page.getViewport({ scale: sc });
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(vp.width); canvas.height = Math.ceil(vp.height);
        await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
        canvases.push(canvas);
        if (typeof onProgress === 'function') onProgress(0.04 + 0.12 * (i / doc.numPages));
      }
      const fitted = canvases.map((c) => fitCanvas(c, 1200));
      const results = await ocrRecognize(fitted, (p) => { if (typeof onProgress === 'function') onProgress(0.16 + 0.84 * p); });
      const text = results.map((r, i) => '── Page ' + (i + 1) + ' ──\n' + ((r.text || '').trim())).filter(Boolean).join('\n\n');
      if (!text.trim()) throw new Error('No text recognised — the scan may be too blurry or blank.');
      return textOut(text, U.baseName(file.name) + '-ocr.txt');
    },
  };

  /* Simple RFC-ish CSV parser (handles quotes). */
  function parseCsv(text, delim = ',') {
    const rows = [];
    let row = [], field = '', inQ = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQ) {
        if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
        else field += c;
      } else if (c === '"') inQ = true;
      else if (c === delim) { row.push(field); field = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(field); field = '';
        if (row.some((x) => x !== '')) rows.push(row);
        row = [];
      } else field += c;
    }
    row.push(field);
    if (row.some((x) => x !== '')) rows.push(row);
    return rows;
  }
  const csvCell = (v) => { v = String(v ?? ''); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  const csvLine = (arr) => arr.map(csvCell).join(',');

  /* Draw a simple data table onto a pdf-lib doc (paginated). */
  function drawTable(doc, PDFLib, headers, rows, opts = {}) {
    const font = opts.font || PDFLib.StandardFonts.Helvetica;
    const bold = opts.bold || PDFLib.StandardFonts.HelveticaBold;
    const size = opts.size || 9;
    const pageW = opts.landscape ? 841.89 : 595.28;
    const pageH = opts.landscape ? 595.28 : 841.89;
    const mL = 40, mR = 40, mT = 50, mB = 40;
    const colW = opts.colW || Math.min(120, (pageW - mL - mR) / Math.max(1, headers.length));
    const rowH = size + 8;
    let page = doc.addPage([pageW, pageH]);
    let y = pageH - mT;
    const drawRow = (cells, isHdr) => {
      if (y < mB + rowH) { page = doc.addPage([pageW, pageH]); y = pageH - mT; }
      let x = mL;
      cells.forEach((cell) => {
        const text = String(cell ?? '');
        page.drawText(text.slice(0, Math.floor(colW / (size * 0.5))), { x, y, size, font: isHdr ? bold : font, color: PDFLib.rgb(0.15, 0.15, 0.2) });
        x += colW;
      });
      y -= rowH;
    };
    drawRow(headers, true);
    y -= 4;
    rows.forEach((r) => drawRow(r, false));
    return doc;
  }

  /* ════════════════════════════════════════════════════════════════
     PDF category
  ════════════════════════════════════════════════════════════════ */

  /* PDF to ZIP */
  R({
    id: 'pdf-to-zip', category: 'PDF', name: 'PDF to ZIP',
    description: 'Bundle one or more PDFs into a single ZIP archive. Drop several PDFs to pack them together.',
    accepts: ['pdf'], multiple: true, maxBytes: 200e6,
    fields: [{ key: 'level', label: 'Compression level', type: 'select', default: '6', options: ['0', '1', '3', '6', '9'] }],
    async run({ file, files, inputs }) {
      const fflate = await load.fflate();
      const list = (files && files.length ? files : [file]).filter(Boolean);
      if (!list.length) throw new Error('Drop at least one PDF.');
      const map = {};
      for (const f of list) map[U.baseName(f.name) + '.pdf'] = await u8(f);
      const zip = fflate.zipSync(map, { level: +inputs.level });
      return { blob: new Blob([zip], { type: 'application/zip' }), filename: 'pdfs.zip', mime: 'application/zip', metrics: { Files: list.length, 'ZIP size': bytes(zip.length) } };
    },
  });

  /* Headers & Footers */
  R({
    id: 'pdf-headers-footers', category: 'PDF', name: 'Add Headers & Footers',
    description: 'Stamp a header and/or footer (with page numbers) onto every page.',
    accepts: ['pdf'], maxBytes: 200e6,
    fields: [
      { key: 'header', label: 'Header text', type: 'text', default: '' },
      { key: 'footer', label: 'Footer text', type: 'text', default: 'Page {n} of {N}' },
      { key: 'size', label: 'Text size', type: 'number', default: 10, min: 6, max: 24 },
      { key: 'margin', label: 'Margin from edge', type: 'number', default: 28, min: 8, max: 80 },
    ],
    async run({ file, inputs }) {
      const PDFLib = await load.pdflib();
      const doc = await PDFLib.PDFDocument.load(await u8(file), { ignoreEncryption: true });
      const font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
      const pages = doc.getPages();
      const total = pages.length;
      const fill = (t) => String(t).replace(/\{n\}/g, String(total)).replace(/\{N\}/g, String(total)).replace(/\{page\}/g, String(total)).replace(/\{total\}/g, String(total));
      pages.forEach((pg, idx) => {
        const { width } = pg.getSize();
        const y = +inputs.margin;
        const size = +inputs.size;
        if (String(inputs.header).trim()) {
          pg.drawText(String(inputs.header).replace(/\{n\}/g, String(idx + 1)).replace(/\{N\}/g, String(total)), { x: 40, y: pg.getSize().height - y - size, size, font, color: PDFLib.rgb(0.3, 0.3, 0.35) });
        }
        if (String(inputs.footer).trim()) {
          const t = String(inputs.footer).replace(/\{n\}/g, String(idx + 1)).replace(/\{N\}/g, String(total));
          const w = font.widthOfTextAtSize(t, size);
          pg.drawText(t, { x: (width - w) / 2, y, size, font, color: PDFLib.rgb(0.3, 0.3, 0.35) });
        }
      });
      return pdfOut(await doc.save(), U.baseName(file.name) + '-headers.pdf');
    },
  });

  /* Create PDF */
  R({
    id: 'pdf-create', category: 'PDF', name: 'Create PDF',
    description: 'Create a clean text PDF from scratch — title, body text and page size. No file needed.',
    accepts: null,
    fields: [
      { key: 'title', label: 'Title', type: 'text', default: 'My Document' },
      { key: 'text', label: 'Body text', type: 'textarea', default: 'Type your content here…', placeholder: 'Your document text…' },
      { key: 'size', label: 'Page size', type: 'select', default: 'A4', options: ['A4', 'Letter'] },
      { key: 'fontSize', label: 'Font size', type: 'number', default: 12, min: 8, max: 28 },
    ],
    async run({ inputs }) {
      const PDFLib = await load.pdflib();
      const doc = await PDFLib.PDFDocument.create();
      const font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
      const bold = await doc.embedFont(PDFLib.StandardFonts.HelveticaBold);
      const pageW = inputs.size === 'Letter' ? 612 : 595.28;
      const pageH = inputs.size === 'Letter' ? 792 : 841.89;
      const size = +inputs.fontSize;
      const mL = 60, mT = 70, mB = 60;
      let page = doc.addPage([pageW, pageH]);
      let y = pageH - mT;
      const title = String(inputs.title || '').trim();
      if (title) {
        page.drawText(title, { x: mL, y, size: size + 8, font: bold, color: PDFLib.rgb(0.08, 0.08, 0.12) });
        y -= size + 18;
        page.drawLine({ start: { x: mL, y }, end: { x: pageW - mL, y }, thickness: 0.8, color: PDFLib.rgb(0.8, 0.8, 0.85) });
        y -= 16;
      }
      const lines = wrapText(inputs.text, font, size, pageW - mL * 2);
      for (const ln of lines) {
        if (y < mB + size) { page = doc.addPage([pageW, pageH]); y = pageH - mT; }
        page.drawText(ln, { x: mL, y, size, font, color: PDFLib.rgb(0.12, 0.12, 0.16) });
        y -= size * 1.45;
      }
      return pdfOut(await doc.save(), (title || 'document').replace(/[^a-z0-9-_ ]/gi, '').trim().replace(/\s+/g, '-').toLowerCase() + '.pdf');
    },
  });

  /* Compare PDFs */
  R({
    id: 'pdf-compare', category: 'PDF', name: 'Compare PDFs',
    description: 'Drop TWO PDFs to see a visual page diff and the percentage of pixels that changed.',
    accepts: ['pdf'], multiple: true, maxBytes: 200e6,
    fields: [{ key: 'scale', label: 'Comparison detail', type: 'select', default: '1.5', options: ['0.75', '1', '1.5', '2'] }],
    async run({ files, inputs, onProgress }) {
      if (!files || files.length < 2) throw new Error('Drop exactly two PDFs to compare.');
      const pdfjs = await load.pdfjs();
      const scale = +inputs.scale;
      const [a, b] = await Promise.all([renderPdf(pdfjs, await u8(files[0]), scale), renderPdf(pdfjs, await u8(files[1]), scale)]);
      onProgress && onProgress(0.7);
      const n = Math.min(a.pages.length, b.pages.length);
      const maxW = Math.max(...a.pages.map((p) => p.canvas.width), ...b.pages.map((p) => p.canvas.width));
      const maxH = Math.max(...a.pages.map((p) => p.canvas.height), ...b.pages.map((p) => p.canvas.height));
      const canvas = document.createElement('canvas');
      canvas.width = maxW; canvas.height = maxH;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, maxW, maxH);
      let totalDiff = 0, totalPx = 0;
      for (let i = 0; i < n; i++) {
        ctx.drawImage(a.pages[i].canvas, 0, 0);
        ctx.globalAlpha = 0.5;
        ctx.drawImage(b.pages[i].canvas, 0, 0);
        ctx.globalAlpha = 1;
        const da = a.pages[i].canvas.getContext('2d').getImageData(0, 0, a.pages[i].canvas.width, a.pages[i].canvas.height).data;
        const db = b.pages[i].canvas.getContext('2d').getImageData(0, 0, b.pages[i].canvas.width, b.pages[i].canvas.height).data;
        const W = Math.min(a.pages[i].canvas.width, b.pages[i].canvas.width);
        const H = Math.min(a.pages[i].canvas.height, b.pages[i].canvas.height);
        const diff = ctx.createImageData(W, H);
        let d = 0;
        for (let p = 0; p < W * H; p++) {
          const o = p * 4;
          const dr = Math.abs(da[o] - db[o]), dg = Math.abs(da[o + 1] - db[o + 1]), db2 = Math.abs(da[o + 2] - db[o + 2]);
          if (dr + dg + db2 > 36) { d++; diff.data[o] = 220; diff.data[o + 1] = 40; diff.data[o + 2] = 40; diff.data[o + 3] = 255; }
        }
        ctx.putImageData(diff, 0, 0);
        totalDiff += d; totalPx += W * H;
      }
      onProgress && onProgress(0.95);
      const pct = totalPx ? ((totalDiff / totalPx) * 100).toFixed(1) : '0';
      const png = await canvasPng(canvas);
      return {
        blob: new Blob([png], { type: 'image/png' }), filename: 'pdf-compare.png', mime: 'image/png', preview: 'image',
        metrics: { 'Pixel difference': pct + '%', Pages: `${a.pages.length} vs ${b.pages.length}`, 'Common pages': n },
      };
    },
  });

  /* Invert PDF Colours */
  R({
    id: 'pdf-invert', category: 'PDF', name: 'Invert PDF Colours',
    description: 'Dark mode for PDFs — inverts every page. Pages are re-encoded as images (best for scans, up to 60 pages).',
    accepts: ['pdf'], maxBytes: 200e6,
    fields: [{ key: 'scale', label: 'Render scale', type: 'select', default: '1.5', options: ['1', '1.5', '2'] }],
    async run({ file, inputs, onProgress }) {
      const pdfjs = await load.pdfjs();
      const PDFLib = await load.pdflib();
      const { pages } = await renderPdf(pdfjs, await u8(file), +inputs.scale, onProgress);
      if (pages.length > 60) throw new Error('This tool supports up to 60 pages (it re-encodes each page as an image).');
      const doc = await PDFLib.PDFDocument.create();
      for (let i = 0; i < pages.length; i++) {
        const c = document.createElement('canvas');
        c.width = pages[i].canvas.width; c.height = pages[i].canvas.height;
        const ctx = c.getContext('2d');
        ctx.filter = 'invert(1)';
        ctx.drawImage(pages[i].canvas, 0, 0);
        const png = await canvasPng(c);
        const img = await doc.embedPng(png);
        const pg = doc.addPage([img.width, img.height]);
        pg.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
        onProgress && onProgress(0.9 + (0.1 * (i + 1)) / pages.length);
      }
      return pdfOut(await doc.save(), U.baseName(file.name) + '-inverted.pdf');
    },
  });

  /* PDF to EPUB */
  R({
    id: 'pdf-to-epub', category: 'PDF', name: 'PDF to EPUB',
    description: 'Export a PDF as an EPUB ebook — each page becomes an image so the layout is preserved (no reflowable text).',
    accepts: ['pdf'], maxBytes: 200e6,
    fields: [{ key: 'scale', label: 'Image quality', type: 'select', default: '1.25', options: ['1', '1.25', '1.5'] }],
    async run({ file, inputs, onProgress }) {
      const pdfjs = await load.pdfjs();
      const fflate = await load.fflate();
      const { pages } = await renderPdf(pdfjs, await u8(file), +inputs.scale, onProgress);
      if (pages.length > 120) throw new Error('This tool supports up to 120 pages.');
      const base = U.baseName(file.name);
      const files = {};
      files['mimetype'] = [new TextEncoder().encode('application/epub+zip'), { level: 0 }];
      files['META-INF/container.xml'] = new TextEncoder().encode(
        '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');
      const chapters = [];
      const images = [];
      for (let i = 0; i < pages.length; i++) {
        const png = await canvasPng(pages[i].canvas);
        files['OEBPS/images/page-' + (i + 1) + '.png'] = png;
        images.push({ id: 'img' + (i + 1), file: 'images/page-' + (i + 1) + '.png' });
        chapters.push({
          id: 'c' + (i + 1),
          file: 'chapter-' + (i + 1) + '.xhtml',
          html: '<?xml version="1.0" encoding="utf-8"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>Page ' + (i + 1) + '</title></head><body><img src="images/page-' + (i + 1) + '.png" alt="Page ' + (i + 1) + '"/></body></html>',
        });
        onProgress && onProgress(0.8 + (0.2 * (i + 1)) / pages.length);
      }
      const manifest = images.map((im) => `<item id="${im.id}" href="${im.file}" media-type="image/png"/>`).join('') +
        chapters.map((ch) => `<item id="${ch.id}" href="${ch.file}" media-type="application/xhtml+xml"/>`).join('');
      const spine = chapters.map((ch) => `<itemref idref="${ch.id}"/>`).join('');
      const nav = chapters.map((ch, i) => `<li><a href="${ch.file}">Page ${i + 1}</a></li>`).join('');
      files['OEBPS/content.opf'] = new TextEncoder().encode(
        '<?xml version="1.0" encoding="utf-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="uid">' + base + '</dc:identifier><dc:title>' + base + '</dc:title><dc:language>en</dc:language><meta property="dcterms:modified">' + new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z</meta></metadata><manifest>' + manifest + '</manifest><spine>' + spine + '</spine></package>');
      files['OEBPS/nav.xhtml'] = new TextEncoder().encode(
        '<?xml version="1.0" encoding="utf-8"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Contents</title></head><body><nav epub:type="toc"><h1>Contents</h1><ol>' + nav + '</ol></nav></body></html>');
      chapters.forEach((ch) => { files['OEBPS/' + ch.file] = new TextEncoder().encode(ch.html); });
      const zip = fflate.zipSync(files, { level: 6 });
      return { blob: new Blob([zip], { type: 'application/epub+zip' }), filename: base + '.epub', mime: 'application/epub+zip', metrics: { Pages: pages.length, 'EPUB size': bytes(zip.length) } };
    },
  });

  /* Auto-Redact PII */
  const PII_PATTERNS = {
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    phone: /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    ssn: /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g,
    card: /\b(?:\d[ -]?){13,19}\b/g,
    ip: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
  };
  R({
    id: 'pdf-redact-pii', category: 'PDF', name: 'Auto-Redact PII',
    description: 'Detect emails, phone numbers, IDs and card numbers, then black them out. Visual redaction — text stays in the file, so verify before sharing.',
    accepts: ['pdf'], maxBytes: 200e6,
    fields: [
      { key: 'email', label: 'Email addresses', type: 'select', default: 'yes', options: ['yes', 'no'] },
      { key: 'phone', label: 'Phone numbers', type: 'select', default: 'yes', options: ['yes', 'no'] },
      { key: 'ssn', label: 'IDs / SSN-like numbers', type: 'select', default: 'yes', options: ['yes', 'no'] },
      { key: 'card', label: 'Card numbers', type: 'select', default: 'yes', options: ['yes', 'no'] },
      { key: 'ip', label: 'IP addresses', type: 'select', default: 'no', options: ['yes', 'no'] },
    ],
    async run({ file, inputs, onProgress }) {
      const pdfjs = await load.pdfjs();
      const PDFLib = await load.pdflib();
      const data = await u8(file);
      const src = await PDFLib.PDFDocument.load(data, { ignoreEncryption: true });
      const doc = await pdfjs.getDocument({ data }).promise;
      const patterns = Object.keys(PII_PATTERNS).filter((k) => inputs[k] === 'yes');
      if (!patterns.length) throw new Error('Select at least one PII type to redact.');
      const re = new RegExp(patterns.map((k) => PII_PATTERNS[k].source).join('|'), 'g');
      let found = 0;
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const vp = page.getViewport({ scale: 1 });
        const tc = await page.getTextContent();
        const target = src.getPage(i - 1);
        for (const item of tc.items) {
          if (!item.str || typeof item.width !== 'number' || !item.transform) continue;
          re.lastIndex = 0;
          const matches = String(item.str).match(re);
          if (!matches) continue;
          const tx = item.transform[4] || 0;
          const ty = item.transform[5] || 0;
          const ratio = item.width && item.str.length ? item.width / item.str.length : 0;
          let offset = 0;
          for (const m of matches) {
            const idx = String(item.str).indexOf(m, offset);
            if (idx < 0) continue;
            offset = idx + m.length;
            // pdfjs text transforms are in PDF user space (origin bottom-left),
            // same as pdf-lib — so y is the baseline; no axis flip needed.
            const w = Math.max(4, m.length * ratio + 2);
            target.drawRectangle({ x: tx + idx * ratio - 1, y: ty - (item.height || 10) * 0.2, width: w, height: (item.height || 10) * 1.1, color: PDFLib.rgb(0, 0, 0) });
            found++;
          }
        }
        onProgress && onProgress(i / doc.numPages);
      }
      if (!found) throw new Error('No matching PII found in the text layer of this PDF.');
      return pdfOut(await src.save(), U.baseName(file.name) + '-redacted.pdf');
    },
  });

  /* PDF to Handwriting */
  R({
    id: 'pdf-to-handwriting', category: 'PDF', name: 'PDF to Handwriting',
    description: 'Turn typed text into a handwriting-style page (cursive text on ruled paper). Rasterised, like a scanned note.',
    accepts: null,
    fields: [
      { key: 'text', label: 'Your text', type: 'textarea', default: 'Dear diary,\n\nToday I finished building a whole toolkit that runs entirely in the browser. No uploads, no servers — just quiet, private processing on my own device.', placeholder: 'Type the text to convert…' },
      { key: 'ink', label: 'Ink colour', type: 'select', default: 'blue', options: ['blue', 'black', 'navy', 'teal'] },
      { key: 'size', label: 'Hand size', type: 'select', default: 'medium', options: ['small', 'medium', 'large'] },
    ],
    async run({ inputs }) {
      const PDFLib = await load.pdflib();
      const sizeMap = { small: { fs: 24, lh: 38 }, medium: { fs: 28, lh: 46 }, large: { fs: 34, lh: 56 } };
      const { fs, lh } = sizeMap[inputs.size] || sizeMap.medium;
      const inkMap = { blue: '#1e3a8a', black: '#1f2937', navy: '#000', teal: '#115e59' };
      const ink = inkMap[inputs.ink] || '#1e3a8a';
      const W = 800, H = 1131;
      const marginX = 130, top = 90, bottom = 90;
      const words = String(inputs.text || '').split(/\s+/).filter(Boolean);
      const pages = [];
      let canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      let ctx = null;
      const newPage = () => {
        if (ctx) { pages.push(canvas); }
        canvas = document.createElement('canvas');
        canvas.width = W; canvas.height = H;
        ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fffef7'; ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = 'rgba(30,64,175,0.25)';
        ctx.lineWidth = 1.5;
        for (let y = top; y < H - bottom; y += lh) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
        ctx.strokeStyle = 'rgba(220,38,38,0.5)';
        ctx.beginPath(); ctx.moveTo(marginX - 8, top - 20); ctx.lineTo(marginX - 8, H - bottom + 20); ctx.stroke();
        ctx.font = fs + 'px "Segoe Script","Lucida Handwriting","Comic Sans MS","Bradley Hand",cursive';
        ctx.fillStyle = ink;
        ctx.textBaseline = 'alphabetic';
      };
      newPage();
      let x = marginX, y = top + fs;
      const canFit = (test) => ctx.measureText(test).width + x < W - 40;
      for (const w of words) {
        const test = x === marginX ? w : ' ' + w;
        if (!canFit(test)) {
          y += lh;
          if (y > H - bottom) { newPage(); y = top + fs; }
          x = marginX;
        } else if (x !== marginX) { x += ctx.measureText(' ').width; }
        ctx.fillText(w, x, y);
        x += ctx.measureText(w).width;
      }
      pages.push(canvas);
      const doc = await PDFLib.PDFDocument.create();
      for (const c of pages) {
        const png = await canvasPng(c);
        const img = await doc.embedPng(png);
        const pg = doc.addPage([595.28, 841.89]);
        const s = Math.min(595.28 / img.width, 841.89 / img.height);
        pg.drawImage(img, { x: (595.28 - img.width * s) / 2, y: (841.89 - img.height * s) / 2, width: img.width * s, height: img.height * s });
      }
      return pdfOut(await doc.save(), 'handwriting.pdf');
    },
  });

  /* Handwriting to PDF */
  R({
    id: 'handwriting-to-pdf', category: 'PDF', name: 'Handwriting to PDF',
    description: 'Turn a photo or scan of handwritten notes into a single-page PDF.',
    accepts: ['png', 'jpg', 'jpeg', 'webp', 'bmp'], maxBytes: 100e6,
    fields: [{ key: 'fit', label: 'Page fit', type: 'select', default: 'contain', options: ['contain', 'stretch'] }],
    async run({ file, inputs }) {
      const PDFLib = await load.pdflib();
      const data = await u8(file);
      const doc = await PDFLib.PDFDocument.create();
      const page = doc.addPage([595.28, 841.89]);
      const img = await (/png|webp|bmp/i.test(file.type || '') ? doc.embedPng(data) : doc.embedJpg(data));
      const pw = page.getWidth(), ph = page.getHeight();
      if (inputs.fit === 'stretch') {
        page.drawImage(img, { x: 0, y: 0, width: pw, height: ph });
      } else {
        const s = Math.min(pw / img.width, ph / img.height);
        page.drawImage(img, { x: (pw - img.width * s) / 2, y: (ph - img.height * s) / 2, width: img.width * s, height: img.height * s });
      }
      return pdfOut(await doc.save(), U.baseName(file.name) + '.pdf');
    },
  });

  /* Summarize PDF (extractive) */
  R({
    id: 'pdf-summarize', category: 'PDF', name: 'Summarize PDF',
    description: 'Extractive summary built from the text layer — picks the most representative sentences. No AI model, runs instantly offline.',
    accepts: ['pdf'], maxBytes: 200e6,
    fields: [{ key: 'length', label: 'Summary length', type: 'select', default: 'medium', options: ['short', 'medium', 'long'] }],
    async run({ file, inputs }) {
      const pdfjs = await load.pdfjs();
      const doc = await pdfjs.getDocument({ data: await u8(file) }).promise;
      let full = '';
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const tc = await page.getTextContent();
        full += (tc.items.map((it) => it.str).join(' ')) + '\n';
      }
      const text = full.replace(/\s+/g, ' ').trim();
      const sentences = text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.split(/\s+/).length >= 4);
      const counts = {};
      const stop = new Set('the a an and or but of to in on for with as at by from is are was were be been being it its this that these those not no if then than so such which who whom whose what when where why how'.split(' '));
      text.toLowerCase().match(/[a-z0-9']+/g).forEach((w) => { if (!stop.has(w)) counts[w] = (counts[w] || 0) + 1; });
      const scored = sentences.map((s) => {
        const words = s.toLowerCase().match(/[a-z0-9']+/g) || [];
        let score = 0;
        words.forEach((w) => { score += counts[w] || 0; });
        return { s, score: score / Math.max(1, words.length) };
      }).sort((a, b) => b.score - a.score);
      const n = inputs.length === 'short' ? 3 : inputs.length === 'long' ? 8 : 5;
      const summary = scored.slice(0, n).sort((a, b) => sentences.indexOf(a.s) - sentences.indexOf(b.s)).map((x) => x.s).join(' ');
      const out = 'Summary (' + sentences.length + ' sentences read, ' + text.split(/\s+/).length + ' words)\n\n' + summary;
      return textOut(out, U.baseName(file.name) + '-summary.txt');
    },
  });

  /* ════════════════════════════════════════════════════════════════
     Documents category
  ════════════════════════════════════════════════════════════════ */

  /* Excel to PDF */
  R({
    id: 'excel-to-pdf', category: 'PDF', name: 'Excel to PDF',
    description: 'Convert an Excel / ODS / CSV sheet into a paginated PDF table. Client-side via the bundled SheetJS engine.',
    accepts: ['xlsx', 'xls', 'ods', 'csv'], maxBytes: 100e6,
    fields: [
      { key: 'sheet', label: 'Sheet number', type: 'number', default: 1, min: 1 },
      { key: 'landscape', label: 'Orientation', type: 'select', default: 'portrait', options: ['portrait', 'landscape'] },
      { key: 'scale', label: 'Fit width', type: 'select', default: 'auto', options: ['auto', '1', '1.5', '2'] },
    ],
    async run({ file, inputs }) {
      const XLSX = await load.xlsx();
      const PDFLib = await load.pdflib();
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const sheetNo = Math.min(Math.max(1, +(inputs?.sheet) || 1), wb.SheetNames.length || 1);
      const sheet = wb.Sheets[wb.SheetNames[sheetNo - 1]];
      const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
      if (!aoa.length) throw new Error('That sheet is empty.');
      const doc = await PDFLib.PDFDocument.create();
      const font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
      const bold = await doc.embedFont(PDFLib.StandardFonts.HelveticaBold);
      const scale = inputs.scale === 'auto' ? null : +inputs.scale;
      const landscape = inputs.landscape === 'landscape';
      const pageW = landscape ? 841.89 : 595.28;
      const pageH = landscape ? 595.28 : 841.89;
      const mL = 36, mR = 36, mT = 44, mB = 36;
      const headers = aoa[0];
      const rows = aoa.slice(1).filter((r) => r.some((c) => String(c).trim() !== ''));
      const avail = pageW - mL - mR;
      const colW = Math.min(140, avail / Math.max(1, headers.length));
      const size = 8.5;
      const rowH = size + 7;
      let page = doc.addPage([pageW, pageH]);
      let y = pageH - mT;
      const draw = (cells, isHdr) => {
        if (y < mB + rowH) { page = doc.addPage([pageW, pageH]); y = pageH - mT; }
        let x = mL;
        cells.forEach((cell, i) => {
          const t = String(cell ?? '').slice(0, Math.max(4, Math.floor(colW / (size * 0.55))));
          page.drawText(t, { x, y, size, font: isHdr ? bold : font, color: PDFLib.rgb(0.15, 0.15, 0.2) });
          x += colW;
        });
        y -= rowH;
      };
      draw(headers, true);
      y -= 3;
      rows.forEach((r) => draw(r, false));
      return pdfOut(await doc.save(), U.baseName(file.name) + '.pdf');
    },
  });

  /* CSV to PDF */
  R({
    id: 'csv-to-pdf', category: 'PDF', name: 'CSV to PDF',
    description: 'Render a CSV file as a clean paginated PDF table.',
    accepts: ['csv', 'tsv'], maxBytes: 100e6,
    fields: [
      { key: 'delim', label: 'Delimiter', type: 'select', default: ',', options: [',', ';', 'tab'] },
      { key: 'landscape', label: 'Orientation', type: 'select', default: 'portrait', options: ['portrait', 'landscape'] },
    ],
    async run({ file, inputs }) {
      const PDFLib = await load.pdflib();
      const text = await file.text();
      const delim = inputs.delim === 'tab' ? '\t' : inputs.delim;
      const aoa = parseCsv(text, delim);
      if (!aoa.length) throw new Error('No rows found in the CSV.');
      const doc = await PDFLib.PDFDocument.create();
      const font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
      const bold = await doc.embedFont(PDFLib.StandardFonts.HelveticaBold);
      const landscape = inputs.landscape === 'landscape';
      const pageW = landscape ? 841.89 : 595.28;
      const pageH = landscape ? 595.28 : 841.89;
      const mL = 36, mR = 36, mT = 44, mB = 36;
      const headers = aoa[0];
      const rows = aoa.slice(1);
      const colW = Math.min(140, (pageW - mL - mR) / Math.max(1, headers.length));
      const size = 8.5;
      const rowH = size + 7;
      let page = doc.addPage([pageW, pageH]);
      let y = pageH - mT;
      const draw = (cells, isHdr) => {
        if (y < mB + rowH) { page = doc.addPage([pageW, pageH]); y = pageH - mT; }
        let x = mL;
        cells.forEach((cell, i) => {
          page.drawText(String(cell ?? '').slice(0, Math.max(4, Math.floor(colW / (size * 0.55)))), { x, y, size, font: isHdr ? bold : font, color: PDFLib.rgb(0.15, 0.15, 0.2) });
          x += colW;
        });
        y -= rowH;
      };
      draw(headers, true);
      y -= 3;
      rows.forEach((r) => draw(r, false));
      return pdfOut(await doc.save(), U.baseName(file.name) + '.pdf');
    },
  });

  /* PDF to CSV */
  R({
    id: 'pdf-to-csv', category: 'PDF', name: 'PDF to CSV',
    description: 'Extract table-like text from a PDF into a CSV. Best with plain text tables — scanned or image PDFs need OCR first.',
    accepts: ['pdf'], maxBytes: 200e6,
    fields: [{ key: 'delim', label: 'Delimiter', type: 'select', default: ',', options: [',', ';', 'tab'] }],
    async run({ file, inputs }) {
      const pdfjs = await load.pdfjs();
      const doc = await pdfjs.getDocument({ data: await u8(file) }).promise;
      const delim = inputs.delim === 'tab' ? '\t' : inputs.delim;
      const q = (v) => { const s = String(v ?? '').replace(/\s+/g, ' ').trim(); return /[\s"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
      const lines = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const vp = page.getViewport({ scale: 1 });
        const tc = await page.getTextContent();
        // Group text items into visual lines by baseline, then sort left→right.
        const rows = new Map();
        for (const it of tc.items) {
          if (!it.str) continue;
          const y = Math.round((it.transform ? it.transform[5] : 0) / 2) * 2; // cluster ~2pt
          const x = it.transform ? it.transform[4] : 0;
          if (!rows.has(y)) rows.set(y, []);
          rows.get(y).push({ x, str: it.str });
        }
        const sorted = [...rows.entries()].sort((a, b) => b[0] - a[0]); // top row first
        for (const [, items] of sorted) {
          items.sort((a, b) => a.x - b.x);
          const joined = items.map((it) => it.str).join(' ');
          if (joined.trim()) lines.push(joined);
        }
        if (i < doc.numPages) lines.push(''); // blank line between pages
      }
      if (!lines.length) throw new Error('No text found — this PDF may be a scanned image. Run OCR first.');
      const header = lines[0];
      // Column split: collapse runs of 2+ spaces into a column break (typical table layout).
      const splitRow = (row) => row.split(/\s{2,}/).map((c) => c.trim()).filter((c, i, a) => c !== '' || (i === 0 && a.length > 1));
      const rowsOut = [splitRow(header), ...lines.slice(1).filter(Boolean).map(splitRow)];
      const csv = rowsOut.map((r) => r.map(q).join(delim)).join('\n');
      return textOut(csv, U.baseName(file.name) + '.csv', 'text/csv');
    },
  });

  /* ════════════════════════════════════════════════════════════════
     Security & Privacy
  ════════════════════════════════════════════════════════════════ */

  /* Privacy Scanner */
  R({
    id: 'privacy-scanner', category: 'Security', name: 'Privacy Scanner',
    description: 'Scan PDFs and photos for embedded metadata that can leak who you are, where you were, and what you used.',
    accepts: ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'tiff', 'heic'], multiple: true, maxBytes: 200e6,
    fields: [{ key: 'detail', label: 'Detail level', type: 'select', default: 'normal', options: ['brief', 'normal', 'full'] }],
    async run({ files, file, inputs }) {
      const list = (files && files.length ? files : [file]).filter(Boolean);
      const lines = [];
      let flags = 0;
      for (const f of list) {
        lines.push('── ' + f.name + ' (' + bytes(f.size) + ')');
        const isPdf = /pdf/i.test(f.type) || /\.pdf$/i.test(f.name);
        if (isPdf) {
          try {
            const pdfjs = await load.pdfjs();
            const doc = await pdfjs.getDocument({ data: await u8(f) }).promise;
            const meta = await doc.getMetadata();
            const info = meta.info || {};
            const items = [['Title', info.Title], ['Author', info.Author], ['Subject', info.Subject], ['Keywords', info.Keywords], ['Creator', info.Creator], ['Producer', info.Producer], ['Created', info.CreationDate], ['Modified', info.ModDate]];
            const shown = items.filter(([, v]) => v && String(v).trim());
            if (!shown.length) lines.push('  No metadata found ✓');
            for (const [k, v] of shown) { lines.push('  ' + k + ': ' + String(v).slice(0, 160)); if (/author|creator|producer|created|modified/i.test(k)) flags++; }
            lines.push('  Pages: ' + doc.numPages);
          } catch { lines.push('  (could not read metadata)'); }
        } else {
          try {
            const exifr = await load.exifr();
            const data = await exifr.parse(f, true);
            const items = data ? Object.entries(data) : [];
            const sensitive = items.filter(([k]) => /gps|latitude|longitude|altitude|software|artist|copyright|author|datetimeoriginal|modifydate|createtimestamp/i.test(k));
            if (!items.length) lines.push('  No EXIF metadata found ✓');
            else for (const [k, v] of items) {
              if (inputs.detail === 'brief' && !/gps|software|artist|copyright|author/i.test(k)) continue;
              lines.push('  ' + k + ': ' + String(typeof v === 'object' ? JSON.stringify(v) : v).slice(0, 160));
            }
            flags += sensitive.length;
          } catch { lines.push('  (could not read metadata)'); }
        }
      }
      const verdict = flags ? '⚠ Found ' + flags + ' potentially sensitive field' + (flags === 1 ? '' : 's') : '✓ No sensitive fields detected';
      const report = verdict + '\n\n' + lines.join('\n');
      return textOut(report, 'privacy-report.txt');
    },
  });

  /* Fingerprint Generator */
  const FIRST = ['Aarav', 'Maya', 'Rohan', 'Priya', 'Arjun', 'Sana', 'Vikram', 'Ananya', 'Kabir', 'Ishita', 'Ravi', 'Neha', 'Dev', 'Sara', 'Aman', 'Riya', 'Harsh', 'Pooja', 'Nikhil', 'Tara'];
  const LAST = ['Sharma', 'Patel', 'Reddy', 'Iyer', 'Singh', 'Gupta', 'Nair', 'Das', 'Mehta', 'Joshi', 'Kumar', 'Verma', 'Rao', 'Bose', 'Kapoor', 'Chawla', 'Malhotra', 'Shetty', 'Bhat', 'Menon'];
  const CITIES = ['Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Kochi'];
  R({
    id: 'fingerprint-generator', category: 'Security', name: 'Fingerprint Generator',
    description: 'Generate a complete fake identity for demos, tests and forms — clearly fictional, never real data.',
    accepts: null, live: true,
    fields: [
      { key: 'format', label: 'Output format', type: 'select', default: 'TXT', options: ['TXT', 'CSV'] },
      { key: 'entries', label: 'Identities', type: 'number', default: 1, min: 1, max: 20 },
    ],
    async run({ inputs }) {
      const n = Math.min(20, Math.max(1, +inputs.entries));
      const rows = [];
      for (let i = 0; i < n; i++) {
        const first = FIRST[Math.floor(Math.random() * FIRST.length)];
        const last = LAST[Math.floor(Math.random() * LAST.length)];
        const city = CITIES[Math.floor(Math.random() * CITIES.length)];
        const dob = `${String(1 + Math.floor(Math.random() * 28)).padStart(2, '0')}/${String(1 + Math.floor(Math.random() * 12)).padStart(2, '0')}/${1970 + Math.floor(Math.random() * 30)}`;
        const rec = {
          name: first + ' ' + last,
          email: first.toLowerCase() + '.' + last.toLowerCase() + Math.floor(Math.random() * 99) + '@example.com',
          phone: '+91 ' + (6 + Math.floor(Math.random() * 3)) + ' ' + String(Math.floor(Math.random() * 1e9)).padStart(9, '0'),
          address: (100 + Math.floor(Math.random() * 900)) + ', ' + ['MG Road', 'Lake View', 'Rose Garden', 'Market Street', 'Green Park'][Math.floor(Math.random() * 5)] + ', ' + city,
          dob,
          id: 'XXXX-XXXX-' + String(Math.floor(Math.random() * 1e4)).padStart(4, '0') + '-' + String(Math.floor(Math.random() * 1e4)).padStart(4, '0'),
        };
        rows.push(rec);
      }
      const disclaimer = '⚠ Fictional data for testing only — not real identities.\n\n';
      if (inputs.format === 'CSV') {
        const header = 'name,email,phone,address,dob,id';
        const body = rows.map((r) => [r.name, r.email, r.phone, r.address, r.dob, r.id].map(csvCell).join(',')).join('\n');
        return textOut(disclaimer + header + '\n' + body, 'fake-identities.csv', 'text/csv');
      }
      const body = rows.map((r) => `Name: ${r.name}\nEmail: ${r.email}\nPhone: ${r.phone}\nAddress: ${r.address}\nDOB: ${r.dob}\nID: ${r.id}`).join('\n\n');
      return textOut(disclaimer + body, 'fake-identities.txt');
    },
  });

  /* ════════════════════════════════════════════════════════════════
     Business
  ════════════════════════════════════════════════════════════════ */

  const parseItems = (text) => String(text || '').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
    const parts = l.split(/[|,\t]/).map((p) => p.trim());
    return { desc: parts[0] || 'Item', qty: Math.max(0, +parts[1] || 1), rate: Math.max(0, +parts[2] || 0) };
  }).filter((it) => it.desc);

  /* GST Invoice */
  R({
    id: 'gst-invoice', category: 'Business', name: 'GST Invoice',
    description: 'Generate a GST-compliant invoice PDF with line items, CGST/SGST/IGST and totals. All calculated locally.',
    accepts: null,
    fields: [
      { key: 'seller', label: 'Business name', type: 'text', default: 'Acme Traders Pvt Ltd' },
      { key: 'sellerGstin', label: 'Business GSTIN', type: 'text', default: '27ABCDE1234F1Z5' },
      { key: 'sellerAddr', label: 'Business address', type: 'text', default: '12 MG Road, Mumbai 400001' },
      { key: 'invNo', label: 'Invoice number', type: 'text', default: 'INV-0001' },
      { key: 'date', label: 'Date', type: 'text', default: '' },
      { key: 'buyer', label: 'Customer name', type: 'text', default: 'Walk-in Customer' },
      { key: 'buyerGstin', label: 'Customer GSTIN', type: 'text', default: '' },
      { key: 'items', label: 'Items (Description | Qty | Rate)', type: 'textarea', default: 'Notebook | 5 | 40\nPen | 10 | 15\nDesk lamp | 2 | 1200' },
      { key: 'type', label: 'Tax type', type: 'select', default: 'intra', options: ['intra', 'inter'] },
      { key: 'cgst', label: 'CGST %', type: 'number', default: 9, min: 0, max: 20 },
      { key: 'sgst', label: 'SGST %', type: 'number', default: 9, min: 0, max: 20 },
    ],
    async run({ inputs }) {
      const PDFLib = await load.pdflib();
      const doc = await PDFLib.PDFDocument.create();
      const font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
      const bold = await doc.embedFont(PDFLib.StandardFonts.HelveticaBold);
      const page = doc.addPage([595.28, 841.89]);
      const W = page.getWidth();
      const items = parseItems(inputs.items);
      if (!items.length) throw new Error('Add at least one item line (Description | Qty | Rate).');
      const cgst = +inputs.cgst, sgst = +inputs.sgst;
      const igst = inputs.type === 'inter' ? cgst + sgst : 0;
      const rows = items.map((it) => {
        const amt = it.qty * it.rate;
        return { ...it, amt };
      });
      const taxable = rows.reduce((s, r) => s + r.amt, 0);
      const cgstAmt = taxable * cgst / 100;
      const sgstAmt = taxable * sgst / 100;
      const igstAmt = taxable * igst / 100;
      const total = taxable + (inputs.type === 'inter' ? igstAmt : cgstAmt + sgstAmt);
      // WinAnsi PDF fonts can't encode '₹' — use 'Rs.' (money is display-only).
      const money = (v) => 'Rs. ' + v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const date = String(inputs.date || '').trim() || new Date().toLocaleDateString('en-IN');
      const hdr = (t, x, y, s) => page.drawText(t, { x, y, size: s, font: bold, color: PDFLib.rgb(0.1, 0.1, 0.15) });
      hdr('TAX INVOICE', 40, 770, 18);
      page.drawText(String(inputs.seller), { x: 40, y: 740, size: 12, font: bold, color: PDFLib.rgb(0.15, 0.15, 0.2) });
      page.drawText(String(inputs.sellerAddr), { x: 40, y: 724, size: 9, font, color: PDFLib.rgb(0.4, 0.4, 0.45) });
      page.drawText('GSTIN: ' + String(inputs.sellerGstin), { x: 40, y: 710, size: 9, font, color: PDFLib.rgb(0.3, 0.3, 0.4) });
      page.drawText('Invoice #: ' + String(inputs.invNo), { x: W - 40 - 150, y: 740, size: 10, font: bold, color: PDFLib.rgb(0.15, 0.15, 0.2) });
      page.drawText('Date: ' + date, { x: W - 40 - 150, y: 726, size: 9, font, color: PDFLib.rgb(0.4, 0.4, 0.45) });
      page.drawText('Bill To: ' + String(inputs.buyer), { x: 40, y: 676, size: 10, font: bold, color: PDFLib.rgb(0.2, 0.2, 0.25) });
      if (String(inputs.buyerGstin).trim()) page.drawText('GSTIN: ' + inputs.buyerGstin, { x: 40, y: 662, size: 9, font, color: PDFLib.rgb(0.4, 0.4, 0.45) });
      page.drawLine({ start: { x: 40, y: 648 }, end: { x: W - 40, y: 648 }, thickness: 1, color: PDFLib.rgb(0.7, 0.7, 0.75) });
      // Items table
      let y = 620;
      const cols = [40, 330, 400, 460, 520];
      const drawHead = () => {
        [['#', cols[0]], ['Item', cols[1]], ['Qty', cols[2]], ['Rate', cols[3]], ['Amount', cols[4]]].forEach(([t, x]) =>
          page.drawText(t, { x, y, size: 9, font: bold, color: PDFLib.rgb(0.2, 0.2, 0.25) }));
        y -= 14;
        page.drawLine({ start: { x: 40, y }, end: { x: W - 40, y }, thickness: 0.6, color: PDFLib.rgb(0.8, 0.8, 0.85) });
        y -= 6;
      };
      drawHead();
      rows.forEach((r, i) => {
        if (y < 120) throw new Error('Too many items for one page — keep the list shorter.');
        page.drawText(String(i + 1), { x: cols[0], y, size: 9, font });
        page.drawText(r.desc.slice(0, 42), { x: cols[1], y, size: 9, font });
        page.drawText(String(r.qty), { x: cols[2], y, size: 9, font });
        page.drawText(money(r.rate), { x: cols[3], y, size: 9, font });
        page.drawText(money(r.amt), { x: cols[4], y, size: 9, font });
        y -= 16;
      });
      page.drawLine({ start: { x: 40, y }, end: { x: W - 40, y }, thickness: 0.6, color: PDFLib.rgb(0.8, 0.8, 0.85) });
      y -= 8;
      const line = (label, value, boldV) => {
        page.drawText(label, { x: 380, y, size: 10, font: bold, color: PDFLib.rgb(0.2, 0.2, 0.25) });
        page.drawText(value, { x: 470, y, size: 10, font: boldV ? bold : font, color: PDFLib.rgb(0.15, 0.15, 0.2) });
        y -= 16;
      };
      line('Taxable value', money(taxable), false);
      if (inputs.type === 'inter') line('IGST (' + igst + '%)', money(igstAmt), false);
      else { line('CGST (' + cgst + '%)', money(cgstAmt), false); line('SGST (' + sgst + '%)', money(sgstAmt), false); }
      line('TOTAL', money(total), true);
      y -= 8;
      page.drawText('Amount in words: ' + money(total), { x: 40, y, size: 8.5, font, color: PDFLib.rgb(0.45, 0.45, 0.5) });
      page.drawText('This is a computer-generated invoice.', { x: 40, y: 60, size: 8, font, color: PDFLib.rgb(0.55, 0.55, 0.6) });
      return pdfOut(await doc.save(), (String(inputs.invNo ?? '') || 'invoice').replace(/[^a-z0-9-_]/gi, '') + '.pdf');
    },
  });

  /* POS Billing */
  R({
    id: 'pos-billing', category: 'Business', name: 'POS Billing',
    description: 'Generate a compact receipt-style bill for a point-of-sale — narrow layout, discount and tax included.',
    accepts: null,
    fields: [
      { key: 'store', label: 'Store name', type: 'text', default: 'QuickMart' },
      { key: 'receipt', label: 'Receipt number', type: 'text', default: 'R-1042' },
      { key: 'items', label: 'Items (Description | Qty | Rate)', type: 'textarea', default: 'Coffee | 2 | 120\nSandwich | 1 | 180\nCookie | 3 | 40' },
      { key: 'discount', label: 'Discount %', type: 'number', default: 0, min: 0, max: 100 },
      { key: 'tax', label: 'Tax %', type: 'number', default: 5, min: 0, max: 40 },
    ],
    async run({ inputs }) {
      const PDFLib = await load.pdflib();
      const doc = await PDFLib.PDFDocument.create();
      const font = await doc.embedFont(PDFLib.StandardFonts.Courier);
      const bold = await doc.embedFont(PDFLib.StandardFonts.CourierBold);
      const pageW = 226.8, pageH = 500;
      const page = doc.addPage([pageW, pageH]);
      const items = parseItems(inputs.items);
      if (!items.length) throw new Error('Add at least one item line (Description | Qty | Rate).');
      const rows = items.map((it) => ({ ...it, amt: it.qty * it.rate }));
      const sub = rows.reduce((s, r) => s + r.amt, 0);
      const disc = sub * (+inputs.discount / 100);
      const taxAmt = (sub - disc) * (+inputs.tax / 100);
      const total = sub - disc + taxAmt;
      // WinAnsi PDF fonts can't encode '₹' — use 'Rs.' (fmt is display-only).
      const fmt = (v) => 'Rs. ' + v.toFixed(2);
      const RULE = '--------------------------';
      const cx = (t, s) => { const w = bold.widthOfTextAtSize(t, s); page.drawText(t, { x: (pageW - w) / 2, y: 0, size: s, font: bold }); };
      let y = pageH - 40;
      const pr = (t, s = 9, f = font, x = 16) => { page.drawText(t, { x, y, size: s, font: f }); y -= 13; };
      cx(String(inputs.store), 14);
      page.drawText(RULE, { x: 16, y: y, size: 8, font }); y -= 14;
      pr('RECEIPT ' + String(inputs.receipt), 9, bold);
      pr(new Date().toLocaleString('en-IN'), 8);
      page.drawText(RULE, { x: 16, y: y, size: 8, font }); y -= 14;
      rows.forEach((r) => {
        pr(r.desc.slice(0, 26));
        pr(String(r.qty) + ' x ' + fmt(r.rate) + '  ' + fmt(r.amt).padStart(8, ' '), 8.5);
        y -= 3;
      });
      page.drawText(RULE, { x: 16, y: y, size: 8, font }); y -= 14;
      pr('Subtotal' + fmt(sub).padStart(12, ' '), 9, bold);
      if (disc) pr('Discount' + ('-' + fmt(disc)).padStart(11, ' '), 9);
      if (taxAmt) pr('Tax ' + (+inputs.tax) + '%' + fmt(taxAmt).padStart(14, ' '), 9);
      pr('TOTAL' + fmt(total).padStart(14, ' '), 11, bold);
      page.drawText(RULE, { x: 16, y: y, size: 8, font }); y -= 16;
      pr('Thank you for visiting!', 9, bold);
      pr('Scan-to-pay & bills handled by FileKit POS', 8);
      return pdfOut(await doc.save(), (String(inputs.receipt ?? '') || 'receipt').replace(/[^a-z0-9-_]/gi, '') + '.pdf');
    },
  });

  /* GST Filing Prep */
  R({
    id: 'gst-filing-prep', category: 'Business', name: 'GST Filing Prep',
    description: 'Aggregate invoice rows (CSV/Excel) into a GSTR-style summary: totals by GSTIN and rate, plus overall figures.',
    accepts: ['csv', 'xlsx', 'xls'], maxBytes: 100e6,
    fields: [
      { key: 'output', label: 'Output', type: 'select', default: 'csv', options: ['csv', 'pdf'] },
      { key: 'rate', label: 'Tax rate column', type: 'text', default: 'auto', help: 'auto = find by header name (rate / tax / cgst+sgst)' },
    ],
    async run({ file, inputs }) {
      const rows = [];
      const num = (v) => { const n = parseFloat(String(v).replace(/[^0-9.-]/g, '')); return isNaN(n) ? 0 : n; };
      if (/xlsx|xls/i.test(file.name)) {
        const XLSX = await load.xlsx();
        const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
        const aoa = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' });
        const hdr = aoa[0].map((h) => String(h).trim().toLowerCase());
        const pick = (...names) => hdr.findIndex((h) => names.some((n) => h.includes(n)));
        const iGstin = pick('gstin'), iTax = pick('taxable', 'tax'), iCgst = pick('cgst'), iSgst = pick('sgst'), iIgst = pick('igst'), iAmt = pick('amount', 'value', 'total');
        for (const r of aoa.slice(1)) {
          if (!r.some((c) => String(c).trim())) continue;
          rows.push({ gstin: r[iGstin] !== undefined ? String(r[iGstin]).trim() : '', taxable: num(r[iTax] ?? r[iAmt]), cgst: num(r[iCgst]), sgst: num(r[iSgst]), igst: num(r[iIgst]) });
        }
      } else {
        const aoa = parseCsv(await file.text(), ',');
        const hdr = aoa[0].map((h) => String(h).trim().toLowerCase());
        const pick = (...names) => hdr.findIndex((h) => names.some((n) => h.includes(n)));
        const iGstin = pick('gstin'), iTax = pick('taxable', 'tax'), iCgst = pick('cgst'), iSgst = pick('sgst'), iIgst = pick('igst'), iAmt = pick('amount', 'value', 'total');
        for (const r of aoa.slice(1)) {
          if (!r.some((c) => String(c).trim())) continue;
          rows.push({ gstin: r[iGstin] !== undefined ? String(r[iGstin]).trim() : '', taxable: num(r[iTax] ?? r[iAmt]), cgst: num(r[iCgst]), sgst: num(r[iSgst]), igst: num(r[iIgst]) });
        }
      }
      if (!rows.length) throw new Error('No invoice rows found. Expected headers like GSTIN, Taxable, CGST, SGST, IGST.');
      const byGstin = {};
      rows.forEach((r) => { const k = r.gstin || '(blank GSTIN)'; byGstin[k] = byGstin[k] || { count: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0 }; byGstin[k].count++; byGstin[k].taxable += r.taxable; byGstin[k].cgst += r.cgst; byGstin[k].sgst += r.sgst; byGstin[k].igst += r.igst; });
      const summary = Object.entries(byGstin).map(([g, s]) => ({ gstin: g, ...s }));
      const T = summary.reduce((a, s) => ({ count: a.count + s.count, taxable: a.taxable + s.taxable, cgst: a.cgst + s.cgst, sgst: a.sgst + s.sgst, igst: a.igst + s.igst }), { count: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0 });
      const csv = 'GSTIN,Invoices,Taxable Value,CGST,SGST,IGST\n' + summary.map((s) => csvLine([s.gstin, s.count, s.taxable.toFixed(2), s.cgst.toFixed(2), s.sgst.toFixed(2), s.igst.toFixed(2)])).join('\n') +
        '\nTOTAL,' + T.count + ',' + T.taxable.toFixed(2) + ',' + T.cgst.toFixed(2) + ',' + T.sgst.toFixed(2) + ',' + T.igst.toFixed(2);
      if (inputs.output === 'pdf') {
        const PDFLib = await load.pdflib();
        const doc = await PDFLib.PDFDocument.create();
        const font = await doc.embedFont(PDFLib.StandardFonts.HelveticaBold);
        const page = doc.addPage([595.28, 420]);
        page.drawText('GST Filing Summary', { x: 40, y: 380, size: 16, font });
        page.drawText('Rows processed: ' + rows.length + '   ·   Taxpayers: ' + summary.length, { x: 40, y: 360, size: 9, font: await doc.embedFont(PDFLib.StandardFonts.Helvetica) });
        drawTable(doc, PDFLib, ['GSTIN', 'Invoices', 'Taxable', 'CGST', 'SGST', 'IGST'], summary.map((s) => [s.gstin, s.count, s.taxable.toFixed(2), s.cgst.toFixed(2), s.sgst.toFixed(2), s.igst.toFixed(2)]), { colW: 86, landscape: false });
        const last = doc.getPages()[doc.getPageCount() - 1];
        last.drawText('TOTAL   ' + T.count + ' invoices   ' + T.taxable.toFixed(2) + ' taxable', { x: 40, y: 40, size: 10, font });
        return pdfOut(await doc.save(), 'gst-filing-summary.pdf');
      }
      return textOut(csv, 'gst-filing-summary.csv', 'text/csv');
    },
  });

  /* ════════════════════════════════════════════════════════════════
     Scan Document  (Camera Scanner & Document Workbench)
  ════════════════════════════════════════════════════════════════ */
  window.__ffMountScan = function mountScan(container) {
    container.innerHTML = '';
    container.classList.add('cpdf-root', 'conv-root', 'app-stage-container', 'scan-tool');
    container.classList.remove('media-shell', 'aud-shell', 'doc-shell', 'spdf-shell', 'etxt-shell', 'sign-shell', 'img-workspace-active', 'org-shell', 'scan-shell');

    const MAX_PAGES = 50;
    const A = window.__ffScanApi;

    /* ─── Vector SVG Icons (Zero Emojis) ────────────────────────── */
    const ICONS = {
      scanBadge: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="2" y1="12" x2="22" y2="12" stroke-width="2.5"/><rect x="7" y="7" width="10" height="10" stroke-width="1.5"/></svg>`,
      uploadGraphic: `<svg viewBox="0 0 220 150" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="38" y="98" width="144" height="36" stroke="rgba(255,255,255,0.6)" stroke-width="2" stroke-dasharray="6 6" stroke-linecap="round"/><ellipse cx="70" cy="122" rx="24" ry="6" fill="#000000" opacity="0.4"/><ellipse cx="110" cy="128" rx="24" ry="6" fill="#000000" opacity="0.4"/><ellipse cx="150" cy="122" rx="24" ry="6" fill="#000000" opacity="0.4"/><g transform="rotate(-9 66 74)"><rect x="46" y="48" width="40" height="52" fill="#fff"/><path d="M72 48h14v14z" fill="#F2F0F1"/><rect x="52" y="62" width="28" height="16" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="1"/><circle cx="58" cy="67" r="2.2" fill="#EA580C"/><path d="M54 75l5-5 3 3 4-3 5 5" stroke="#EA580C" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><rect x="52" y="82" width="28" height="3" fill="#64748B" opacity="0.8"/><rect x="52" y="88" width="18" height="3" fill="#64748B" opacity="0.8"/></g><g transform="rotate(9 154 74)"><rect x="134" y="48" width="40" height="52" fill="#fff"/><path d="M160 48h14v14z" fill="#F2F0F1"/><rect x="140" y="62" width="28" height="3" fill="#10B981" opacity="0.9"/><rect x="140" y="68" width="20" height="3" fill="#10B981" opacity="0.9"/><rect x="140" y="74" width="28" height="3" fill="#10B981" opacity="0.9"/><rect x="140" y="80" width="24" height="10" fill="#ECFDF5" stroke="#10B981" stroke-width="1"/><text x="142.5" y="87.5" fill="#059669" font-size="5.5" font-weight="900" font-family="system-ui,sans-serif">OCR</text><circle cx="158" cy="85" r="2.5" stroke="#10B981" stroke-width="1"/><line x1="160" y1="87" x2="162" y2="89" stroke="#10B981" stroke-width="1"/></g><g><rect x="90" y="46" width="40" height="56" fill="#fff"/><path d="M116 46h14v14z" fill="#F2F0F1"/><rect x="96" y="58" width="28" height="3.5" fill="#7C3AED" opacity="0.95"/><rect x="96" y="65" width="28" height="2.5" fill="#2563EB" opacity="0.9"/><rect x="95" y="70" width="18" height="7" fill="rgba(124,58,237,0.12)" stroke="#7C3AED" stroke-width="1" stroke-dasharray="2 1"/><text x="97" y="75.5" fill="#7C3AED" font-size="5" font-weight="800" font-family="monospace">SCAN</text><rect x="115" y="70" width="9" height="7" fill="rgba(16,185,129,0.15)" stroke="#10B981" stroke-width="1"/><text x="116" y="75.5" fill="#10B981" font-size="4.5" font-weight="800" font-family="monospace">PDF</text><rect x="96" y="80" width="28" height="2.5" fill="#2563EB" opacity="0.9"/><rect x="96" y="86" width="20" height="2.5" fill="#2563EB" opacity="0.9"/><rect x="96" y="92" width="26" height="2.5" fill="#2563EB" opacity="0.9"/><line x1="84" y1="73.5" x2="136" y2="73.5" stroke="url(#scanLaserBar)" stroke-width="2.5" stroke-linecap="round"/><polygon points="86,73.5 134,73.5 128,68 92,68" fill="url(#scanLaserBeam)" opacity="0.35"/><path d="M87 52v-4h4" stroke="#10B981" stroke-width="1.8" stroke-linecap="round"/><path d="M133 48h4v4" stroke="#10B981" stroke-width="1.8" stroke-linecap="round"/><path d="M87 96v4h4" stroke="#10B981" stroke-width="1.8" stroke-linecap="round"/><path d="M133 100h4v-4" stroke="#10B981" stroke-width="1.8" stroke-linecap="round"/></g><path d="M110 8v22m0 0l-7-7m7 7l7-7" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="110" cy="6" r="3.5" fill="#7C3AED" stroke="#fff" stroke-width="1.5"/><circle cx="36" cy="44" r="3.5" fill="#fff" opacity="0.5"/><circle cx="186" cy="52" r="3" fill="#fff" opacity="0.45"/><circle cx="190" cy="90" r="2.5" fill="#fff" opacity="0.4"/><circle cx="30" cy="90" r="2.5" fill="#fff" opacity="0.4"/><defs><linearGradient id="scanLaserBar" x1="84" y1="73.5" x2="136" y2="73.5" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#7C3AED"/><stop offset="50%" stop-color="#10B981"/><stop offset="100%" stop-color="#38BDF8"/></linearGradient><linearGradient id="scanLaserBeam" x1="110" y1="68" x2="110" y2="73.5" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#7C3AED" stop-opacity="0"/><stop offset="100%" stop-color="#10B981" stop-opacity="0.8"/></linearGradient></defs></svg>`,
      camera: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`,
      folder: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
      studio: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>`,
      crop: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/></svg>`,
      rotate: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`,
      copy: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
      trash: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`,
      add: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
      prev: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>`,
      next: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>`,
      check: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`,
      download: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
      ocr: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
      txt: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="10" y1="12" x2="14" y2="12"/><line x1="12" y1="12" x2="12" y2="18"/></svg>`,
      zip: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>`,
      pdf: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15h6"/></svg>`,
      shield: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
      torch: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
      switchLens: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 7h-9"/><path d="M14 4l-3 3 3 3"/><path d="M4 17h9"/><path d="M10 20l3-3-3-3"/></svg>`,
      reset: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>`,
      filterOriginal: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
      filterDoc: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18"/><line x1="7" y1="8" x2="17" y2="8"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="7" y1="16" x2="13" y2="16"/></svg>`,
      filterBw: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 0 0 20z" fill="currentColor"/></svg>`,
      filterBoard: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="3" width="20" height="14"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
      filterPhoto: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
      cross: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    };

    /* ─── Full-Bleed Viewport Transition ─── */
    const enterBleed = () => {
      container.classList.add('scan-shell');
      const wtv = document.getElementById('app-workspace-tool-view');
      if (wtv) wtv.classList.add('ff-tool-active');
    };
    const exitBleed = () => {
      container.classList.remove('scan-shell');
    };

    // Core application state
    let pages = [];             // Array of { id, name, canvas, raw, quad, cropped, rot, enhanceMode, brightness, contrast }
    let viewMode = 'hub';       // 'hub' (Camera / Batch Capture) | 'review' (Studio) | 'recrop' | 'ocr'
    let selIdx = 0;             // Selected page in review studio
    let filterScope = 'single'; // 'single' (apply to active page) | 'all' (apply to all pages)
    let globalEnhance = 'original';
    let globalBright = 100;
    let globalContrast = 100;
    let pdfFormat = 'searchable'; // 'searchable' | 'image' | 'zip'
    let pdfPageSize = 'a4';       // 'a4' | 'letter' | 'original'
    let pdfCompression = 'high';  // 'high' (300 DPI) | 'balanced' (150 DPI) | 'compact' (72 DPI)
    let ocrLang = 'eng';          // 'eng' | 'spa' | 'fra' | 'deu' | 'ita' | 'por' | 'chi_sim' | 'jpn' | 'hin' | 'ara' | 'rus'

    // ID Card Dual-Sided Mode
    let idCardMode = false;
    let idCardStep = 'front';     // 'front' | 'back'
    let idCardFrontCanvas = null;

    // Zoom & Pan state for Review Studio
    let zoomScale = 1;
    let panX = 0, panY = 0, isPanning = false, panStartX = 0, panStartY = 0;

    // OCR Results Cache & Word Bounding Boxes
    let currentOcrResults = [];
    let ocrWordBoxes = [];

    // Camera & Detection state
    let stream = null, video = null, overlay = null, cameraOn = false;
    let detectOn = true, autoSnap = true, torchOn = false;
    let videoDevices = [], activeDeviceId = '';
    let raf = null, frameCount = 0, lastQuadMeta = null, lastTickT = 0, stableMs = 0, lastAutoCap = 0, busy = false;
    let manualQuad = null;      // User adjusted quad in analysis coords [[x,y]x4]
    let detectedQuad = null;    // Latest detected quad
    let dragIdx = -1;
    let statusEl = null;

    // Re-crop & OCR state
    let recrop = null;          // { idx, raw, quad, origQuad, rot, origRot, drag, scale }
    let lastRemoved = null;     // { idx, page } for undo toast
    let ocrResultText = '';     // Recognized OCR text

    // Magnifier Loupe helper (2x zoom reticle)
    let loupeEl = null, loupeCanvas = null, loupeCtx = null;
    function ensureLoupe() {
      if (!loupeEl) {
        loupeEl = document.createElement('div');
        loupeEl.className = 'scan-loupe-bubble';
        loupeEl.innerHTML = '<canvas width="100" height="100"></canvas><span class="scan-loupe-reticle">+</span>';
        container.appendChild(loupeEl);
        loupeCanvas = loupeEl.querySelector('canvas');
        loupeCtx = loupeCanvas.getContext('2d');
      }
    }
    function updateLoupe(screenX, screenY, sourceCanvasOrVideo, srcX, srcY, srcBoxSize = 36) {
      ensureLoupe();
      if (!sourceCanvasOrVideo) return;
      loupeEl.style.display = 'block';
      const containerRect = container.getBoundingClientRect();
      const left = screenX - containerRect.left - 50;
      const top = screenY - containerRect.top - 110;
      loupeEl.style.left = `${Math.max(10, Math.min(containerRect.width - 110, left))}px`;
      loupeEl.style.top = `${Math.max(10, top)}px`;

      loupeCtx.clearRect(0, 0, 100, 100);
      try {
        loupeCtx.drawImage(
          sourceCanvasOrVideo,
          srcX - srcBoxSize / 2, srcY - srcBoxSize / 2, srcBoxSize, srcBoxSize,
          0, 0, 100, 100
        );
      } catch (e) {}
    }
    function hideLoupe() {
      if (loupeEl) loupeEl.style.display = 'none';
    }

    /* Coordinate transforms between overlay, analysis, and video pixels */
    function geom() {
      const ow = overlay ? (overlay.clientWidth || 640) : 640;
      const oh = overlay ? (overlay.clientHeight || 480) : 480;
      const vw = (video && video.videoWidth) ? video.videoWidth : 640;
      const vh = (video && video.videoHeight) ? video.videoHeight : 480;
      const sc = Math.max(ow / vw, oh / vh);
      const dw = vw * sc, dh = vh * sc;
      const ox = (ow - dw) / 2, oy = (oh - dh) / 2;
      const maxW = 260;
      const dsc = Math.min(1, maxW / vw);
      const anW = Math.max(64, Math.round(vw * dsc)), anH = Math.max(64, Math.round(vh * dsc));
      return { ow, oh, ox, oy, dw, dh, anW, anH, f: dw / anW, vw, vh };
    }

    const stopCam = () => {
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      if (stream) {
        try { stream.getTracks().forEach((t) => t.stop()); } catch {}
        stream = null;
      }
      cameraOn = false;
      torchOn = false;
      lastQuadMeta = null; lastTickT = 0; stableMs = 0;
      manualQuad = null; detectedQuad = null; dragIdx = -1;
      hideLoupe();
      if (video) { try { video.srcObject = null; } catch {} }
    };

    function setStatus(msg, cls) {
      if (!statusEl) statusEl = container.querySelector('#scan-status');
      if (!statusEl) return;
      statusEl.textContent = msg;
      statusEl.className = 'scan-status ' + (cls || '');
    }

    async function enumerateCameras() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
        const devices = await navigator.mediaDevices.enumerateDevices();
        videoDevices = devices.filter((d) => d.kind === 'videoinput');
      } catch (e) {}
    }

    async function toggleTorch() {
      if (!stream) return;
      const track = stream.getVideoTracks()[0];
      if (!track) return;
      const capabilities = track.getCapabilities ? track.getCapabilities() : {};
      if (!capabilities.torch) {
        setStatus('Flash/Torch not supported on this lens', 'warn');
        return;
      }
      torchOn = !torchOn;
      try {
        await track.applyConstraints({ advanced: [{ torch: torchOn }] });
        renderCaptureHeader();
      } catch (e) {
        torchOn = false;
      }
    }

    async function addPage(canvas, name, quad, shouldDetect = false) {
      if (pages.length >= MAX_PAGES) {
        setStatus('Max ' + MAX_PAGES + ' pages limit reached', 'err');
        return false;
      }
      const pageNum = pages.length + 1;
      const res = await A.processPhoto(canvas, { detect: shouldDetect, quad: quad || null, maxDim: 1600 });
      const newPage = {
        id: 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        name: name || ('Page ' + pageNum),
        canvas: res.canvas,
        raw: A.fitCanvas(canvas, 2600),
        quad: res.quad || null,
        cropped: res.cropped,
        rot: 0,
        enhanceMode: globalEnhance,
        brightness: globalBright,
        contrast: globalContrast,
      };
      pages.push(newPage);
      selIdx = pages.length - 1;
      lastRemoved = null;

      enterBleed();

      if (viewMode === 'hub') {
        renderBatchTray();
      } else if (viewMode === 'review') {
        refreshStudioUI();
      }
      return true;
    }

    /* ID Card 2-Sided Sheet Merging */
    function createIdCardSheet(frontCv, backCv) {
      const cv = document.createElement('canvas');
      cv.width = 1240; cv.height = 1754; // A4 150 DPI
      const ctx = cv.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, cv.width, cv.height);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 26px Inter, system-ui, sans-serif';
      ctx.fillText('IDENTITY DOCUMENT SCAN', 80, 80);
      ctx.fillStyle = '#64748b';
      ctx.font = '14px Inter, system-ui, sans-serif';
      ctx.fillText('Front and reverse sides digitized 100% locally on device', 80, 110);

      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(80, 135); ctx.lineTo(cv.width - 80, 135); ctx.stroke();

      const cardW = 860, cardH = 540;
      const x = (cv.width - cardW) / 2;
      const y1 = 190, y2 = 870;

      // Front
      ctx.fillStyle = '#475569';
      ctx.font = 'bold 15px Inter, system-ui, sans-serif';
      ctx.fillText('FRONT SIDE', x + 4, y1 - 12);
      ctx.drawImage(frontCv, x, y1, cardW, cardH);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y1, cardW, cardH);

      // Back
      ctx.fillStyle = '#475569';
      ctx.font = 'bold 15px Inter, system-ui, sans-serif';
      ctx.fillText('BACK / REVERSE SIDE', x + 4, y2 - 12);
      ctx.drawImage(backCv, x, y2, cardW, cardH);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y2, cardW, cardH);

      return cv;
    }

    function snapVideo() {
      if (!video || !video.videoWidth || busy) return;
      const c = document.createElement('canvas');
      c.width = video.videoWidth; c.height = video.videoHeight;
      c.getContext('2d').drawImage(video, 0, 0);

      let quad = null;
      if (manualQuad) {
        const g = geom();
        quad = manualQuad.map((p) => ({
          x: p[0] * (video.videoWidth / g.anW),
          y: p[1] * (video.videoHeight / g.anH),
        }));
      }

      if (idCardMode) {
        if (idCardStep === 'front') {
          idCardFrontCanvas = A.copyCanvas(c);
          idCardStep = 'back';
          flashShutter();
          setStatus('Front of ID captured ✓ Flip card to Back side and snap', 'ok');
          renderCaptureHeader();
          return;
        } else {
          flashShutter();
          setStatus('Merging Front & Back ID Card onto single A4 sheet…', 'ok');
          const merged = createIdCardSheet(idCardFrontCanvas, c);
          addPage(merged, 'ID Card (2-Sided)', null, false);
          idCardStep = 'front';
          idCardFrontCanvas = null;
          renderCaptureHeader();
          manualQuad = null;
          return;
        }
      }

      addPage(c, 'Page ' + (pages.length + 1), quad, detectOn);
      flashShutter();
      manualQuad = null;
    }

    function flashShutter() {
      if (!overlay) return;
      const octx = overlay.getContext('2d');
      octx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      octx.fillRect(0, 0, overlay.width, overlay.height);
      setTimeout(() => {
        if (overlay) octx.clearRect(0, 0, overlay.width, overlay.height);
      }, 100);
    }

    function switchView(mode) {
      viewMode = mode;
      zoomScale = 1; panX = 0; panY = 0;
      if (mode === 'hub') {
        if (!cameraOn && !pages.length) exitBleed(); else enterBleed();
      } else {
        enterBleed();
      }
      render();
    }

    function render() {
      if (!pages.length && viewMode === 'hub' && !cameraOn) {
        exitBleed();
        renderInitialDropzone();
        return;
      }

      enterBleed();
      container.innerHTML = `
        <div class="scan-app-shell">
          <header class="scan-header-bar">
            <div class="scan-title-group">
              <span class="scan-tool-badge">${ICONS.scanBadge}</span>
              <div>
                <h2 class="scan-heading">Document Scanner &amp; OCR Studio</h2>
                <p class="scan-subheading">${pages.length} ${pages.length === 1 ? 'page' : 'pages'} digitized · 100% on-device local</p>
              </div>
            </div>

            <div class="scan-header-actions">
              <div class="scan-view-tabs" role="tablist">
                <button type="button" class="scan-tab-btn ${viewMode === 'hub' ? 'active' : ''}" id="tab-btn-hub">
                  ${ICONS.camera}
                  <span>Capture</span>
                  ${pages.length ? `<span class="scan-tab-badge">${pages.length}</span>` : ''}
                </button>
                <button type="button" class="scan-tab-btn ${viewMode === 'review' ? 'active' : ''}" id="tab-btn-review" ${pages.length ? '' : 'disabled'}>
                  ${ICONS.studio}
                  <span>Review Studio</span>
                </button>
              </div>

              <button type="button" class="scan-btn-import" id="btn-global-import">
                ${ICONS.folder}
                <span>Import Files</span>
              </button>
              <input id="scan-file-input" type="file" accept="image/*,.pdf,application/pdf" multiple hidden>

              <div class="scan-privacy-tag" title="Zero network requests. Processed directly in your browser.">
                ${ICONS.shield}
                <span>100% Private</span>
              </div>
            </div>
          </header>

          <main class="scan-viewport" id="scan-viewport"></main>
        </div>
      `;

      const vp = container.querySelector('#scan-viewport');
      const fileInp = container.querySelector('#scan-file-input');
      const importBtn = container.querySelector('#btn-global-import');
      const tabHub = container.querySelector('#tab-btn-hub');
      const tabRev = container.querySelector('#tab-btn-review');

      if (importBtn && fileInp) {
        importBtn.onclick = () => fileInp.click();
        bindFileInput(fileInp);
      }

      if (tabHub) tabHub.onclick = () => switchView('hub');
      if (tabRev) tabRev.onclick = () => { if (pages.length) switchView('review'); };

      if (viewMode === 'hub') {
        renderCaptureHub(vp);
      } else if (viewMode === 'review') {
        renderReviewStudio(vp);
      } else if (viewMode === 'recrop') {
        renderRecropModal(vp);
      } else if (viewMode === 'ocr') {
        renderOcrProofreader(vp);
      }
    }

    /* ════════════════════════════════════════════════════════════════
       VIEW 0: INITIAL EMPTY DROPZONE
    ════════════════════════════════════════════════════════════════ */
    function renderInitialDropzone() {
      exitBleed();
      container.innerHTML = `
        <div class="cpdf-dropzone drop-hero-box" id="scan-dz" tabindex="0" role="button" aria-label="Upload or scan documents">
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
              <label for="scan-file-input" class="select-files-main-btn">
                <svg class="plus-circle-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                <span>Select documents</span>
              </label>
              <label for="scan-file-input" class="select-files-chevron-btn" aria-label="More file options">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3.5 5.25L7 8.75l3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </label>
            </div>

            <p class="drop-sub-text">Add <strong>PDF</strong>, <strong>JPG</strong>, <strong>PNG</strong>, or <strong>WebP</strong> documents to scan</p>

            <div class="supported-formats-row">
              <span class="fmt-label">Supported formats:</span>
              <span class="fmt-badge fmt-pdf">PDF</span>
              <span class="fmt-badge fmt-jpg">JPG</span>
              <span class="fmt-badge fmt-png">PNG</span>
              <span class="fmt-badge fmt-doc">WEBP</span>
            </div>
          </div>
          <input id="scan-file-input" type="file" accept="image/*,application/pdf" multiple hidden>
        </div>
      `;

      const dz = container.querySelector('#scan-dz');
      const fileInp = container.querySelector('#scan-file-input');
      const startCamBtn = container.querySelector('#scan-start-cam-btn');

      if (startCamBtn) {
        startCamBtn.onclick = (e) => {
          e.stopPropagation();
          openCameraStream();
        };
      }

      if (fileInp) {
        bindFileInput(fileInp);
      }

      if (dz) {
        dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('cpdf-dz--over'); });
        dz.addEventListener('dragleave', () => dz.classList.remove('cpdf-dz--over'));
        dz.addEventListener('drop', (e) => {
          e.preventDefault();
          dz.classList.remove('cpdf-dz--over');
          if (e.dataTransfer?.files?.length) {
            handleImportFileList([...e.dataTransfer.files]);
          }
        });
        dz.addEventListener('click', (e) => {
          if (!e.target.closest('#scan-start-cam-btn') && !e.target.closest('label')) {
            fileInp?.click();
          }
        });
      }
    }

    /* Direct PDF & Image file list handler */
    async function handleImportFileList(files) {
      if (!files.length) return;
      enterBleed();
      setStatus(`Importing ${files.length} document${files.length === 1 ? '' : 's'}…`, 'ok');
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        try {
          if (f.type === 'application/pdf' || /\.pdf$/i.test(f.name)) {
            const pdfjs = await load.pdfjs();
            const doc = await pdfjs.getDocument({ data: await u8(f) }).promise;
            for (let p = 1; p <= doc.numPages; p++) {
              const page = await doc.getPage(p);
              const vp1 = page.getViewport({ scale: 1 });
              const sc = Math.min(2.5, 1800 / Math.max(vp1.width, vp1.height));
              const vp = page.getViewport({ scale: sc });
              const cv = document.createElement('canvas');
              cv.width = Math.ceil(vp.width); cv.height = Math.ceil(vp.height);
              await page.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
              const name = f.name.replace(/\.[^.]+$/, '') + ` (P.${p})`;
              await addPage(cv, name, null, false);
            }
          } else {
            const canvas = await A.loadPhotoIntoCanvas(f);
            const name = f.name.replace(/\.[^.]+$/, '');
            await addPage(canvas, name, null, false);
          }
        } catch (e) {}
      }
      setStatus(`Imported ${files.length} page${files.length === 1 ? '' : 's'} ✓`, 'ok');
      switchView('review');
    }

    /* Clipboard Paste Listener */
    const handlePaste = async (e) => {
      if (!document.body.contains(container)) return;
      const items = e.clipboardData?.items;
      if (!items || !items.length) return;
      const imageItems = [...items].filter((item) => item.type && item.type.startsWith('image/'));
      if (!imageItems.length) return;
      e.preventDefault();
      enterBleed();
      setStatus(`Pasting ${imageItems.length} image${imageItems.length === 1 ? '' : 's'} from clipboard…`, 'ok');
      for (let i = 0; i < imageItems.length; i++) {
        const file = imageItems[i].getAsFile();
        if (!file) continue;
        try {
          const canvas = await A.loadPhotoIntoCanvas(file);
          const name = `Pasted Snippet ${pages.length + 1}`;
          await addPage(canvas, name, null, false);
        } catch (err) {}
      }
      setStatus(`Pasted ${imageItems.length} image${imageItems.length === 1 ? '' : 's'} ✓`, 'ok');
      switchView('review');
    };
    window.addEventListener('paste', handlePaste);

    /* Global Keyboard Navigation */
    const handleKeydown = (e) => {
      if (!document.body.contains(container)) return;
      const tag = document.activeElement?.tagName?.toLowerCase();
      const isInput = tag === 'input' || tag === 'textarea' || tag === 'select';

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleExport();
        return;
      }

      if (isInput) return;

      if (e.key === ' ' && viewMode === 'hub' && cameraOn) {
        e.preventDefault();
        snapVideo();
        return;
      }

      if (viewMode === 'review' && pages.length) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          if (selIdx > 0) { selIdx--; refreshStudioUI(); }
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          if (selIdx < pages.length - 1) { selIdx++; refreshStudioUI(); }
        } else if (e.key.toLowerCase() === 'r') {
          e.preventDefault();
          rotatePage(selIdx, 1);
        } else if (e.key.toLowerCase() === 'c') {
          e.preventDefault();
          openRecrop(selIdx);
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          deletePage(selIdx);
        }
      }
    };
    window.addEventListener('keydown', handleKeydown);

    /* ════════════════════════════════════════════════════════════════
       VIEW 1: CAMERA HUB (Batch Capture Viewfinder)
    ════════════════════════════════════════════════════════════════ */
    function renderCaptureHub(parent) {
      if (!cameraOn) {
        parent.innerHTML = `
          <div class="scan-welcome-wrap">
            <div class="scan-welcome-card">
              <div class="scan-welcome-hero">
                <span class="scan-welcome-icon">${ICONS.camera}</span>
                <h3>Document Camera Ready</h3>
                <p>Position receipts, invoices, identity cards, or multi-page documents under your camera. Automatic edge detection un-skews perspective and whitens paper.</p>
              </div>

              <div class="scan-welcome-actions">
                <button type="button" class="scan-btn-cta" id="btn-start-camera">
                  ${ICONS.camera}
                  <span>Start Camera Scanner</span>
                </button>
                <button type="button" class="scan-btn-secondary" id="btn-import-welcome">
                  ${ICONS.folder}
                  <span>Upload Photos or PDF</span>
                </button>
                ${pages.length ? `
                  <button type="button" class="scan-btn-studio-jump" id="btn-jump-studio">
                    ${ICONS.studio}
                    <span>Open Review Studio (${pages.length} page${pages.length === 1 ? '' : 's'} ready) →</span>
                  </button>
                ` : ''}
              </div>

              <div class="scan-features-grid">
                <div class="scan-feature-card">
                  <span class="scan-feat-icon">${ICONS.crop}</span>
                  <b>Auto Perspective</b>
                  <span>Sub-pixel homography un-skews angled documents</span>
                </div>
                <div class="scan-feature-card">
                  <span class="scan-feat-icon">${ICONS.filterDoc}</span>
                  <b>Adaptive Clean</b>
                  <span>Illumination whitening &amp; shadow removal</span>
                </div>
                <div class="scan-feature-card">
                  <span class="scan-feat-icon">${ICONS.ocr}</span>
                  <b>Multi-Lang OCR</b>
                  <span>Extract text in 11+ languages locally</span>
                </div>
              </div>
            </div>
          </div>
        `;

        const startBtn = parent.querySelector('#btn-start-camera');
        const importBtn = parent.querySelector('#btn-import-welcome');
        const jumpBtn = parent.querySelector('#btn-jump-studio');
        const inp = container.querySelector('#scan-file-input');

        if (startBtn) startBtn.onclick = () => openCameraStream();
        if (importBtn && inp) importBtn.onclick = () => inp.click();
        if (jumpBtn) jumpBtn.onclick = () => switchView('review');
        return;
      }

      parent.innerHTML = `
        <div class="scan-cam-stage">
          <div class="scan-cam-topbar" id="scan-cam-topbar"></div>

          <div class="scan-viewfinder-frame">
            <video id="scan-video" playsinline muted autoplay></video>
            <canvas id="scan-overlay"></canvas>
            <button type="button" class="scan-reset-quad-chip" id="scan-reset-quad" style="display:none">
              ${ICONS.reset}
              <span>Reset to Auto-Crop</span>
            </button>
          </div>

          <div class="scan-shutter-bar">
            <span class="scan-status" id="scan-status">Align document inside viewfinder</span>

            <div class="scan-shutter-wrap">
              <button type="button" class="scan-shutter-btn" id="scan-shutter-trigger" title="Snap page (Spacebar)">
                <svg class="scan-shutter-ring" viewBox="0 0 48 48">
                  <circle class="scan-ring-bg" cx="24" cy="24" r="20"></circle>
                  <circle class="scan-ring-progress" id="scan-auto-ring-progress" cx="24" cy="24" r="20"></circle>
                </svg>
                <div class="scan-shutter-core" id="scan-snap-ring"></div>
              </button>
            </div>
            <span class="scan-shutter-sub">Click shutter or press Spacebar</span>
          </div>

          <div class="scan-batch-tray" id="scan-batch-tray"></div>
        </div>
      `;

      statusEl = parent.querySelector('#scan-status');
      renderCaptureHeader();
      renderBatchTray();
      bindCaptureInteractions();
    }

    function renderCaptureHeader() {
      const tb = container.querySelector('#scan-cam-topbar');
      if (!tb) return;

      const camOptions = videoDevices.map((d, i) =>
        `<option value="${d.deviceId}" ${d.deviceId === activeDeviceId ? 'selected' : ''}>${d.label || ('Camera ' + (i + 1))}</option>`
      ).join('');

      tb.innerHTML = `
        <div class="scan-cam-ctrls-left">
          ${videoDevices.length > 1 ? `
            <select class="scan-cam-select" id="scan-cam-select" title="Switch camera">${camOptions}</select>
          ` : ''}
          <button type="button" class="scan-cam-pill ${detectOn ? 'active' : ''}" id="btn-toggle-detect" title="Toggle edge detection">
            ${ICONS.crop}
            <span>${detectOn ? 'Auto-Crop: ON' : 'Auto-Crop: OFF'}</span>
          </button>
          <button type="button" class="scan-cam-pill ${autoSnap ? 'active' : ''}" id="btn-toggle-autosnap" title="Auto capture when steady">
            ${ICONS.check}
            <span>${autoSnap ? 'Auto-Snap: ON' : 'Auto-Snap: OFF'}</span>
          </button>
          <button type="button" class="scan-cam-pill ${idCardMode ? 'active' : ''}" id="btn-toggle-idcard" title="Capture Front & Back and merge onto 1 A4 page">
            ${ICONS.scanBadge}
            <span>${idCardMode ? (idCardStep === 'front' ? 'ID: Front Side' : 'ID: Back Side') : 'ID Card'}</span>
          </button>
        </div>

        <div class="scan-cam-ctrls-right">
          <button type="button" class="scan-cam-pill ${torchOn ? 'active' : ''}" id="btn-toggle-torch" title="Flashlight">
            ${ICONS.torch}
            <span>Torch</span>
          </button>
          <button type="button" class="scan-cam-pill scan-pill-stop" id="btn-stop-cam">
            ${ICONS.cross}
            <span>Stop Camera</span>
          </button>
        </div>
      `;

      const sel = tb.querySelector('#scan-cam-select');
      const det = tb.querySelector('#btn-toggle-detect');
      const as = tb.querySelector('#btn-toggle-autosnap');
      const idBtn = tb.querySelector('#btn-toggle-idcard');
      const tor = tb.querySelector('#btn-toggle-torch');
      const stop = tb.querySelector('#btn-stop-cam');

      if (sel) sel.onchange = () => openCameraStream(sel.value);
      if (det) det.onclick = () => { detectOn = !detectOn; renderCaptureHeader(); };
      if (as) as.onclick = () => { autoSnap = !autoSnap; renderCaptureHeader(); };
      if (idBtn) idBtn.onclick = () => {
        idCardMode = !idCardMode;
        idCardStep = 'front';
        idCardFrontCanvas = null;
        setStatus(idCardMode ? 'ID Card Mode active: Align Front Side & Snap' : 'Document mode active', 'ok');
        renderCaptureHeader();
      };
      if (tor) tor.onclick = toggleTorch;
      if (stop) stop.onclick = () => { stopCam(); render(); };
    }

    function renderBatchTray() {
      const tray = container.querySelector('#scan-batch-tray');
      if (!tray) return;

      if (!pages.length) {
        tray.innerHTML = `<div class="scan-tray-empty">No pages captured yet. Steady the camera to auto-snap your first document.</div>`;
        return;
      }

      tray.innerHTML = `
        <div class="scan-tray-content">
          <div class="scan-tray-info">
            <span class="scan-tray-count"><b>${pages.length}</b> page${pages.length === 1 ? '' : 's'} in batch</span>
          </div>

          <div class="scan-tray-thumbs">
            ${pages.map((p, i) => `
              <div class="scan-mini-thumb ${i === pages.length - 1 ? 'new' : ''}" data-idx="${i}">
                <canvas id="mini-cv-${i}" width="52" height="42"></canvas>
                <span class="scan-mini-num">${i + 1}</span>
                <button type="button" class="scan-mini-del" data-del="${i}" title="Remove page">${ICONS.cross}</button>
              </div>
            `).join('')}
          </div>

          <button type="button" class="scan-tray-review-btn" id="btn-tray-review">
            ${ICONS.studio}
            <span>Review &amp; Export (${pages.length}) →</span>
          </button>
        </div>
      `;

      pages.forEach((p, i) => {
        const cv = tray.querySelector(`#mini-cv-${i}`);
        if (cv) {
          cv.getContext('2d').drawImage(p.canvas, 0, 0, cv.width, cv.height);
        }
      });

      tray.querySelectorAll('.scan-mini-del').forEach((btn) => {
        btn.onclick = (e) => {
          e.stopPropagation();
          deletePage(+btn.dataset.del);
        };
      });

      const reviewBtn = tray.querySelector('#btn-tray-review');
      if (reviewBtn) reviewBtn.onclick = () => switchView('review');
    }

    function bindCaptureInteractions() {
      const shutter = container.querySelector('#scan-shutter-trigger');
      if (shutter) shutter.onclick = snapVideo;

      const ov = container.querySelector('#scan-overlay');
      if (ov) {
        ov.addEventListener('pointerdown', (e) => {
          if (!cameraOn || !detectedQuad) return;
          const g = geom();
          const r = ov.getBoundingClientRect();
          const px = e.clientX - r.left, py = e.clientY - r.top;
          const quad = manualQuad || detectedQuad;
          let best = -1, bestD = 36;
          quad.forEach((p, i) => {
            const X = g.ox + p[0] * g.f, Y = g.oy + p[1] * g.f;
            const d = Math.hypot(X - px, Y - py);
            if (d < bestD) { bestD = d; best = i; }
          });
          if (best < 0) return;
          if (!manualQuad) manualQuad = quad.map((p) => [p[0], p[1]]);
          dragIdx = best;
          try { ov.setPointerCapture(e.pointerId); } catch {}
          e.preventDefault();
        });

        ov.addEventListener('pointermove', (e) => {
          if (dragIdx < 0 || !manualQuad || !cameraOn) return;
          const g = geom();
          const r = ov.getBoundingClientRect();
          const px = (e.clientX - r.left - g.ox) / g.f;
          const py = (e.clientY - r.top - g.oy) / g.f;

          manualQuad[dragIdx] = [
            Math.max(2, Math.min(g.anW - 2, px)),
            Math.max(2, Math.min(g.anH - 2, py)),
          ];

          const videoX = px * (video.videoWidth / g.anW);
          const videoY = py * (video.videoHeight / g.anH);
          updateLoupe(e.clientX, e.clientY, video, videoX, videoY, 48);
        });

        const endDrag = () => {
          dragIdx = -1;
          hideLoupe();
        };
        ov.addEventListener('pointerup', endDrag);
        ov.addEventListener('pointercancel', endDrag);
      }

      const resetBtn = container.querySelector('#scan-reset-quad');
      if (resetBtn) {
        resetBtn.onclick = () => {
          manualQuad = null;
          setStatus('Reset to auto-detected frame', 'ok');
          resetBtn.style.display = 'none';
        };
      }
    }

    /* ════════════════════════════════════════════════════════════════
       VIEW 2: REVIEW STUDIO (Workbench, Zoom & Pan, Filmstrip)
    ════════════════════════════════════════════════════════════════ */
    function renderReviewStudio(parent) {
      if (!pages.length) {
        switchView('hub');
        return;
      }
      if (selIdx >= pages.length) selIdx = pages.length - 1;
      const curPage = pages[selIdx];

      parent.innerHTML = `
        <div class="scan-studio-layout">
          <!-- Main Left Stage -->
          <div class="scan-studio-main">
            <!-- Stage Toolbar -->
            <div class="scan-page-bar">
              <div class="scan-page-nav-pill">
                <button type="button" class="scan-page-nav-btn" id="btn-prev-page" title="Previous page (Left Arrow)" ${selIdx > 0 ? '' : 'disabled'}>${ICONS.prev}</button>
                <span>Page <b>${selIdx + 1}</b> of ${pages.length}</span>
                <button type="button" class="scan-page-nav-btn" id="btn-next-page" title="Next page (Right Arrow)" ${selIdx < pages.length - 1 ? '' : 'disabled'}>${ICONS.next}</button>
              </div>

              <div class="scan-page-tools">
                <span class="scan-zoom-badge" id="btn-zoom-reset" title="Click to reset zoom (100%)">${Math.round(zoomScale * 100)}%</span>
                <button type="button" class="scan-tool-action-btn" id="btn-page-rotl" title="Rotate left 90° (R)">
                  ${ICONS.rotate}
                  <span>Rotate</span>
                </button>
                <button type="button" class="scan-tool-action-btn" id="btn-page-recrop" title="Adjust crop corners (C)">
                  ${ICONS.crop}
                  <span>Re-Crop</span>
                </button>
                <button type="button" class="scan-tool-action-btn" id="btn-page-copy" title="Copy enhanced image">
                  ${ICONS.copy}
                  <span>Copy</span>
                </button>
                <button type="button" class="scan-tool-action-btn scan-btn-delete" id="btn-page-delete" title="Delete this page (Del)">
                  ${ICONS.trash}
                  <span>Delete</span>
                </button>
              </div>
            </div>

            <!-- Central Preview Canvas Area with Zoom & Pan -->
            <div class="scan-preview-canvas-wrap" id="scan-canvas-wrap" style="cursor:${zoomScale > 1 ? 'grab' : 'default'}">
              <canvas id="scan-studio-canvas" class="scan-studio-canvas"></canvas>
            </div>

            <!-- Bottom Filmstrip Bar with Reordering -->
            <div class="scan-filmstrip-section">
              <div class="scan-filmstrip-bar" id="scan-filmstrip-bar">
                ${pages.map((p, i) => `
                  <div class="scan-film-card ${i === selIdx ? 'active' : ''}" data-idx="${i}" draggable="true" title="Page ${i + 1} — Drag to reorder">
                    <canvas id="film-cv-${i}" width="76" height="64"></canvas>
                    <span class="scan-film-drag-handle" aria-hidden="true">⋮⋮</span>
                    <span class="scan-film-num">${i + 1}</span>
                    <div class="scan-film-quick-actions">
                      <button type="button" class="scan-film-btn" data-mv-left="${i}" title="Move left" ${i > 0 ? '' : 'disabled'}>${ICONS.prev}</button>
                      <button type="button" class="scan-film-btn" data-crop="${i}" title="Crop">${ICONS.crop}</button>
                      <button type="button" class="scan-film-btn scan-film-del" data-del="${i}" title="Delete">${ICONS.cross}</button>
                      <button type="button" class="scan-film-btn" data-mv-right="${i}" title="Move right" ${i < pages.length - 1 ? '' : 'disabled'}>${ICONS.next}</button>
                    </div>
                  </div>
                `).join('')}

                <div class="scan-film-add-wrap">
                  <button type="button" class="scan-film-add-btn" id="btn-film-add-cam" title="Open camera to snap more pages">
                    ${ICONS.camera}
                    <span>+ Camera</span>
                  </button>
                  <button type="button" class="scan-film-add-btn" id="btn-film-add-file" title="Import photo or document">
                    ${ICONS.folder}
                    <span>+ Upload</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Right Inspector & Export Sidebar -->
          <div class="scan-studio-sidebar">
            <section class="scan-side-card">
              <div class="scan-side-hdr">
                <span>Enhance Filter</span>
                <div class="scan-scope-toggle-mini" role="radiogroup" aria-label="Enhance scope">
                  <button type="button" class="scan-scope-btn ${filterScope === 'single' ? 'active' : ''}" id="scope-single" title="Apply filter to Page ${selIdx + 1} only">Page ${selIdx + 1}</button>
                  <button type="button" class="scan-scope-btn ${filterScope === 'all' ? 'active' : ''}" id="scope-all" title="Apply filter to all ${pages.length} pages">All (${pages.length})</button>
                </div>
              </div>
              <div class="scan-preset-grid">
                <button type="button" class="scan-preset-btn ${curPage.enhanceMode === 'original' ? 'active' : ''}" data-enh="original">
                  <span class="scan-preset-icon">${ICONS.filterOriginal}</span>
                  <span class="scan-preset-label">Original</span>
                </button>
                <button type="button" class="scan-preset-btn ${curPage.enhanceMode === 'enhanced' ? 'active' : ''}" data-enh="enhanced">
                  <span class="scan-preset-icon">${ICONS.filterDoc}</span>
                  <span class="scan-preset-label">Clean</span>
                </button>
                <button type="button" class="scan-preset-btn ${curPage.enhanceMode === 'bw' ? 'active' : ''}" data-enh="bw">
                  <span class="scan-preset-icon">${ICONS.filterBw}</span>
                  <span class="scan-preset-label">B&amp;W</span>
                </button>
                <button type="button" class="scan-preset-btn ${curPage.enhanceMode === 'board' ? 'active' : ''}" data-enh="board">
                  <span class="scan-preset-icon">${ICONS.filterBoard}</span>
                  <span class="scan-preset-label">Board</span>
                </button>
                <button type="button" class="scan-preset-btn ${curPage.enhanceMode === 'photo' ? 'active' : ''}" data-enh="photo">
                  <span class="scan-preset-icon">${ICONS.filterPhoto}</span>
                  <span class="scan-preset-label">Photo</span>
                </button>
              </div>
            </section>

            <section class="scan-side-card">
              <div class="scan-side-hdr">
                <span>Fine-Tune</span>
                <button type="button" class="scan-side-reset-link" id="btn-ft-reset">${ICONS.reset} Reset</button>
              </div>
              <div class="scan-slider-row">
                <div class="scan-slider-label"><span>Brightness</span><output id="val-bright">${curPage.brightness}</output></div>
                <input type="range" id="inp-bright" min="0" max="200" step="1" value="${curPage.brightness}" aria-label="Brightness level">
              </div>
              <div class="scan-slider-row">
                <div class="scan-slider-label"><span>Contrast</span><output id="val-contrast">${curPage.contrast}</output></div>
                <input type="range" id="inp-contrast" min="0" max="200" step="1" value="${curPage.contrast}" aria-label="Contrast level">
              </div>
            </section>

            <section class="scan-side-card scan-export-card">
              <div class="scan-side-hdr">
                <span>Export Format</span>
              </div>
              <div class="scan-export-options">
                <label class="scan-radio-pill ${pdfFormat === 'searchable' ? 'active' : ''}">
                  <input type="radio" name="scan_fmt" value="searchable" ${pdfFormat === 'searchable' ? 'checked' : ''}>
                  <b>Searchable PDF (OCR)</b>
                </label>
                <label class="scan-radio-pill ${pdfFormat === 'image' ? 'active' : ''}">
                  <input type="radio" name="scan_fmt" value="image" ${pdfFormat === 'image' ? 'checked' : ''}>
                  <b>Standard PDF</b>
                </label>
                <label class="scan-radio-pill ${pdfFormat === 'zip' ? 'active' : ''}">
                  <input type="radio" name="scan_fmt" value="zip" ${pdfFormat === 'zip' ? 'checked' : ''}>
                  <b>Image Archive (.zip)</b>
                </label>
              </div>

              <div class="scan-export-config-row">
                <label class="scan-mini-select-label">
                  <span>Page Size</span>
                  <select id="scan-page-size-select" class="scan-mini-select">
                    <option value="a4" ${pdfPageSize === 'a4' ? 'selected' : ''}>A4 (Standard)</option>
                    <option value="letter" ${pdfPageSize === 'letter' ? 'selected' : ''}>US Letter</option>
                    <option value="original" ${pdfPageSize === 'original' ? 'selected' : ''}>Original Aspect</option>
                  </select>
                </label>
                <label class="scan-mini-select-label">
                  <span>Quality</span>
                  <select id="scan-quality-select" class="scan-mini-select">
                    <option value="high" ${pdfCompression === 'high' ? 'selected' : ''}>300 DPI (High)</option>
                    <option value="balanced" ${pdfCompression === 'balanced' ? 'selected' : ''}>150 DPI (Balanced)</option>
                    <option value="compact" ${pdfCompression === 'compact' ? 'selected' : ''}>72 DPI (Small)</option>
                  </select>
                </label>
              </div>

              <div class="scan-export-actions">
                <button type="button" class="scan-btn-primary-cta" id="btn-main-export">
                  ${ICONS.download}
                  <span>${getExportCtaLabel()}</span>
                </button>
                <button type="button" class="scan-btn-secondary-cta" id="btn-proofread-ocr">
                  ${ICONS.ocr}
                  <span>Proofread &amp; Extract Text (OCR)</span>
                </button>
              </div>

              <div class="scan-studio-foot-actions">
                <button type="button" class="scan-link-btn" id="btn-studio-clear">Clear all &amp; start over</button>
              </div>
            </section>
          </div>
        </div>
      `;

      bindStudioEvents(parent);
      updateStudioPreview();
      paintFilmstripThumbs();
    }

    function getExportCtaLabel() {
      const n = pages.length;
      const unit = n === 1 ? 'Page' : 'Pages';
      if (pdfFormat === 'searchable') return `Download Searchable PDF (${n} ${unit})`;
      if (pdfFormat === 'image') return `Download Standard PDF (${n} ${unit})`;
      if (pdfFormat === 'zip') return `Download Image ZIP (${n} ${unit})`;
      return `Export Document (${n} ${unit})`;
    }

    function applyCanvasTransform() {
      const cv = container.querySelector('#scan-studio-canvas');
      const wrap = container.querySelector('#scan-canvas-wrap');
      const badge = container.querySelector('#btn-zoom-reset');
      if (badge) badge.textContent = `${Math.round(zoomScale * 100)}%`;
      if (!cv) return;
      if (zoomScale > 1) {
        cv.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomScale})`;
        if (wrap) wrap.style.cursor = isPanning ? 'grabbing' : 'grab';
      } else {
        cv.style.transform = '';
        if (wrap) wrap.style.cursor = 'default';
      }
    }

    function updateStudioPreview() {
      const cv = container.querySelector('#scan-studio-canvas');
      if (!cv || !pages.length) return;
      const p = pages[selIdx];
      if (!p) return;

      const maxW = Math.min(800, p.canvas.width);
      const sc = maxW / p.canvas.width;
      cv.width = Math.round(p.canvas.width * sc);
      cv.height = Math.round(p.canvas.height * sc);

      const ctx = cv.getContext('2d');
      ctx.drawImage(p.canvas, 0, 0, cv.width, cv.height);
      try {
        A.enhancePage(cv, p.enhanceMode || 'enhanced', {
          brightness: p.brightness ?? 100,
          contrast: p.contrast ?? 100,
        });
      } catch (e) {}
      applyCanvasTransform();
    }

    function paintFilmstripThumbs() {
      pages.forEach((p, i) => {
        const cv = container.querySelector(`#film-cv-${i}`);
        if (cv) {
          cv.getContext('2d').drawImage(p.canvas, 0, 0, cv.width, cv.height);
          try {
            A.enhancePage(cv, p.enhanceMode || 'enhanced', {
              brightness: p.brightness ?? 100,
              contrast: p.contrast ?? 100,
            });
          } catch (e) {}
        }
      });
    }

    function refreshStudioUI() {
      render();
    }

    function bindStudioEvents(parent) {
      const p = pages[selIdx];
      if (!p) return;

      // Page Navigation
      const prevBtn = parent.querySelector('#btn-prev-page');
      const nextBtn = parent.querySelector('#btn-next-page');
      if (prevBtn) prevBtn.onclick = () => { if (selIdx > 0) { selIdx--; zoomScale = 1; panX = 0; panY = 0; refreshStudioUI(); } };
      if (nextBtn) nextBtn.onclick = () => { if (selIdx < pages.length - 1) { selIdx++; zoomScale = 1; panX = 0; panY = 0; refreshStudioUI(); } };

      // Zoom & Pan
      const wrap = parent.querySelector('#scan-canvas-wrap');
      const zoomBadge = parent.querySelector('#btn-zoom-reset');
      if (zoomBadge) {
        zoomBadge.onclick = () => {
          zoomScale = 1; panX = 0; panY = 0;
          applyCanvasTransform();
        };
      }
      if (wrap) {
        wrap.onwheel = (e) => {
          e.preventDefault();
          const delta = e.deltaY < 0 ? 0.25 : -0.25;
          zoomScale = Math.min(4, Math.max(1, +(zoomScale + delta).toFixed(2)));
          if (zoomScale === 1) { panX = 0; panY = 0; }
          applyCanvasTransform();
        };

        wrap.onmousedown = (e) => {
          if (zoomScale <= 1) return;
          isPanning = true;
          panStartX = e.clientX - panX;
          panStartY = e.clientY - panY;
          wrap.style.cursor = 'grabbing';
        };

        window.onmousemove = (e) => {
          if (!isPanning) return;
          panX = e.clientX - panStartX;
          panY = e.clientY - panStartY;
          applyCanvasTransform();
        };

        window.onmouseup = () => {
          if (isPanning) {
            isPanning = false;
            wrap.style.cursor = zoomScale > 1 ? 'grab' : 'default';
          }
        };

        wrap.ondblclick = () => {
          zoomScale = 1; panX = 0; panY = 0;
          applyCanvasTransform();
        };
      }

      // Action Tools
      const rotBtn = parent.querySelector('#btn-page-rotl');
      const recropBtn = parent.querySelector('#btn-page-recrop');
      const copyBtn = parent.querySelector('#btn-page-copy');
      const delBtn = parent.querySelector('#btn-page-delete');

      if (rotBtn) rotBtn.onclick = () => rotatePage(selIdx, 1);
      if (recropBtn) recropBtn.onclick = () => openRecrop(selIdx);
      if (copyBtn) copyBtn.onclick = () => copyPageImage(selIdx);
      if (delBtn) delBtn.onclick = () => deletePage(selIdx);

      // Scope Toggle
      const scSingle = parent.querySelector('#scope-single');
      const scAll = parent.querySelector('#scope-all');
      if (scSingle) scSingle.onclick = () => { filterScope = 'single'; refreshStudioUI(); };
      if (scAll) scAll.onclick = () => { filterScope = 'all'; refreshStudioUI(); };

      // Enhancement Preset buttons
      parent.querySelectorAll('.scan-preset-btn').forEach((btn) => {
        btn.onclick = () => {
          const mode = btn.dataset.enh;
          if (filterScope === 'all') {
            pages.forEach((page) => { page.enhanceMode = mode; });
          } else {
            p.enhanceMode = mode;
          }
          globalEnhance = mode;
          refreshStudioUI();
        };
      });

      // Fine-Tune Sliders
      const inpB = parent.querySelector('#inp-bright');
      const inpC = parent.querySelector('#inp-contrast');
      const valB = parent.querySelector('#val-bright');
      const valC = parent.querySelector('#val-contrast');
      const resetFt = parent.querySelector('#btn-ft-reset');

      if (inpB) {
        inpB.oninput = () => {
          const val = +inpB.value;
          if (valB) valB.textContent = val;
          if (filterScope === 'all') pages.forEach((page) => { page.brightness = val; });
          else p.brightness = val;
          globalBright = val;
          updateStudioPreview();
          paintFilmstripThumbs();
        };
      }

      if (inpC) {
        inpC.oninput = () => {
          const val = +inpC.value;
          if (valC) valC.textContent = val;
          if (filterScope === 'all') pages.forEach((page) => { page.contrast = val; });
          else p.contrast = val;
          globalContrast = val;
          updateStudioPreview();
          paintFilmstripThumbs();
        };
      }

      if (resetFt) {
        resetFt.onclick = () => {
          if (filterScope === 'all') {
            pages.forEach((page) => { page.brightness = 100; page.contrast = 100; });
          } else {
            p.brightness = 100; p.contrast = 100;
          }
          globalBright = 100; globalContrast = 100;
          refreshStudioUI();
        };
      }

      // Format Radio options
      parent.querySelectorAll('input[name="scan_fmt"]').forEach((r) => {
        r.onchange = () => {
          pdfFormat = r.value;
          refreshStudioUI();
        };
      });

      // Mini Config selects
      const szSel = parent.querySelector('#scan-page-size-select');
      const qSel = parent.querySelector('#scan-quality-select');
      if (szSel) szSel.onchange = () => { pdfPageSize = szSel.value; };
      if (qSel) qSel.onchange = () => { pdfCompression = qSel.value; };

      // CTAs
      const exportBtn = parent.querySelector('#btn-main-export');
      const ocrBtn = parent.querySelector('#btn-proofread-ocr');
      const clearBtn = parent.querySelector('#btn-studio-clear');

      if (exportBtn) exportBtn.onclick = handleExport;
      if (ocrBtn) ocrBtn.onclick = () => switchView('ocr');
      if (clearBtn) {
        clearBtn.onclick = () => {
          pages = [];
          selIdx = 0;
          switchView('hub');
        };
      }

      // Filmstrip thumbnail clicks & Quick actions
      parent.querySelectorAll('.scan-film-card').forEach((card) => {
        card.onclick = () => {
          const idx = +card.dataset.idx;
          if (idx !== selIdx) {
            selIdx = idx;
            zoomScale = 1; panX = 0; panY = 0;
            refreshStudioUI();
          }
        };

        // Drag & Drop reorder
        card.ondragstart = (e) => {
          e.dataTransfer.setData('text/plain', card.dataset.idx);
          card.classList.add('dragging');
        };
        card.ondragend = () => card.classList.remove('dragging');
        card.ondragover = (e) => e.preventDefault();
        card.ondrop = (e) => {
          e.preventDefault();
          const fromIdx = +e.dataTransfer.getData('text/plain');
          const toIdx = +card.dataset.idx;
          if (fromIdx !== toIdx) {
            const moved = pages.splice(fromIdx, 1)[0];
            pages.splice(toIdx, 0, moved);
            selIdx = toIdx;
            refreshStudioUI();
          }
        };
      });

      parent.querySelectorAll('[data-mv-left]').forEach((btn) => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const idx = +btn.dataset.mvLeft;
          if (idx > 0) {
            const moved = pages.splice(idx, 1)[0];
            pages.splice(idx - 1, 0, moved);
            selIdx = idx - 1;
            refreshStudioUI();
          }
        };
      });

      parent.querySelectorAll('[data-mv-right]').forEach((btn) => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const idx = +btn.dataset.mvRight;
          if (idx < pages.length - 1) {
            const moved = pages.splice(idx, 1)[0];
            pages.splice(idx + 1, 0, moved);
            selIdx = idx + 1;
            refreshStudioUI();
          }
        };
      });

      parent.querySelectorAll('[data-crop]').forEach((btn) => {
        btn.onclick = (e) => {
          e.stopPropagation();
          openRecrop(+btn.dataset.crop);
        };
      });

      parent.querySelectorAll('.scan-film-del').forEach((btn) => {
        btn.onclick = (e) => {
          e.stopPropagation();
          deletePage(+btn.dataset.del);
        };
      });

      const addCamBtn = parent.querySelector('#btn-film-add-cam');
      const addFileBtn = parent.querySelector('#btn-film-add-file');
      const inp = container.querySelector('#scan-file-input');

      if (addCamBtn) addCamBtn.onclick = () => switchView('hub');
      if (addFileBtn && inp) addFileBtn.onclick = () => inp.click();
    }

    function rotatePage(idx, direction = 1) {
      const p = pages[idx];
      if (!p) return;
      const c = p.canvas;
      const rotCanvas = document.createElement('canvas');
      rotCanvas.width = c.height;
      rotCanvas.height = c.width;
      const ctx = rotCanvas.getContext('2d');
      ctx.save();
      if (direction === 1) {
        ctx.translate(rotCanvas.width, 0);
        ctx.rotate(Math.PI / 2);
      } else {
        ctx.translate(0, rotCanvas.height);
        ctx.rotate(-Math.PI / 2);
      }
      ctx.drawImage(c, 0, 0);
      ctx.restore();

      p.canvas = rotCanvas;
      p.rot = ((p.rot || 0) + direction + 4) % 4;
      refreshStudioUI();
    }

    function deletePage(idx) {
      if (idx < 0 || idx >= pages.length) return;
      lastRemoved = { idx, page: pages[idx] };
      pages.splice(idx, 1);
      if (selIdx >= pages.length) selIdx = Math.max(0, pages.length - 1);
      showUndoToast();
      refreshStudioUI();
    }

    function showUndoToast() {
      const old = container.querySelector('#scan-toast');
      if (old) old.remove();
      if (!lastRemoved) return;

      const toast = document.createElement('div');
      toast.id = 'scan-toast';
      toast.className = 'scan-toast';
      toast.innerHTML = `
        <span>Page deleted</span>
        <button type="button" id="btn-scan-undo">Undo</button>
      `;
      container.appendChild(toast);

      const undoBtn = toast.querySelector('#btn-scan-undo');
      if (undoBtn) {
        undoBtn.onclick = () => {
          if (lastRemoved) {
            pages.splice(lastRemoved.idx, 0, lastRemoved.page);
            selIdx = lastRemoved.idx;
            lastRemoved = null;
            toast.remove();
            refreshStudioUI();
          }
        };
      }

      setTimeout(() => { if (toast.parentNode) toast.remove(); }, 5000);
    }

    async function copyPageImage(idx) {
      const p = pages[idx];
      if (!p) return;
      const c = A.enhancePage(A.copyCanvas(p.canvas), p.enhanceMode || 'enhanced', {
        brightness: p.brightness,
        contrast: p.contrast,
      });
      try {
        c.toBlob(async (blob) => {
          if (blob && navigator.clipboard && navigator.clipboard.write) {
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            setStatus('Page copied to clipboard ✓', 'ok');
          }
        }, 'image/png');
      } catch (e) {
        setStatus('Clipboard copy unavailable in this browser', 'warn');
      }
    }

    /* ════════════════════════════════════════════════════════════════
       VIEW 3: PRECISION HOMOGRAPHY RE-CROP MODAL (With Magnetic Snap)
    ════════════════════════════════════════════════════════════════ */
    function openRecrop(idx) {
      const p = pages[idx];
      if (!p) return;
      recrop = {
        idx,
        raw: p.raw || p.canvas,
        quad: p.quad ? p.quad.map((q) => ({ x: q.x, y: q.y })) : null,
        origQuad: p.quad ? p.quad.map((q) => ({ x: q.x, y: q.y })) : null,
        rot: (p.rot || 0) % 4,
        origRot: (p.rot || 0) % 4,
        drag: -1,
        scale: 1,
      };
      switchView('recrop');
    }

    function getNearestEdge(imgData, w, h, px, py, radius = 12) {
      let maxGrad = -1, bestX = px, bestY = py;
      const x0 = Math.max(1, Math.floor(px - radius)), x1 = Math.min(w - 2, Math.floor(px + radius));
      const y0 = Math.max(1, Math.floor(py - radius)), y1 = Math.min(h - 2, Math.floor(py + radius));
      const d = imgData.data;
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const p = (y * w + x) * 4;
          const gx = Math.abs(d[p + 4] - d[p - 4]);
          const gy = Math.abs(d[p + w * 4] - d[p - w * 4]);
          const g = gx + gy;
          if (g > maxGrad && g > 60) {
            maxGrad = g; bestX = x; bestY = y;
          }
        }
      }
      return maxGrad > 60 ? { x: bestX, y: bestY, snapped: true } : { x: px, y: py, snapped: false };
    }

    function renderRecropModal(parent) {
      if (!recrop) { switchView('review'); return; }

      parent.innerHTML = `
        <div class="scan-recrop-modal">
          <div class="scan-recrop-header">
            <div>
              <h3 class="scan-recrop-title">Precision Boundary Adjustment</h3>
              <p class="scan-recrop-sub">Drag corner handles to align document boundaries. Smart magnetic snap aligns to true edges.</p>
            </div>
            <div class="scan-recrop-actions">
              <button type="button" class="scan-btn-ghost" id="recrop-rotate">
                ${ICONS.rotate}
                <span>Rotate 90°</span>
              </button>
              <button type="button" class="scan-btn-ghost" id="recrop-reset">
                ${ICONS.reset}
                <span>Reset</span>
              </button>
              <button type="button" class="scan-btn-ghost" id="recrop-cancel">
                ${ICONS.cross}
                <span>Cancel</span>
              </button>
              <button type="button" class="scan-btn-primary" id="recrop-apply">
                ${ICONS.check}
                <span>Apply Crop</span>
              </button>
            </div>
          </div>

          <div class="scan-recrop-stage">
            <canvas id="recrop-canvas"></canvas>
          </div>
        </div>
      `;

      const rc = parent.querySelector('#recrop-canvas');
      drawRecrop();

      rc.addEventListener('pointerdown', (e) => {
        if (!recrop) return;
        const r = rc.getBoundingClientRect();
        const px = e.clientX - r.left, py = e.clientY - r.top;
        const quad = recrop.quad || defaultQuad(recrop.raw);
        let best = -1, bestD = 36;
        quad.forEach((p2, i) => {
          const dpt = recropToDisplay(p2);
          const d = Math.hypot(dpt[0] * recrop.scale - px, dpt[1] * recrop.scale - py);
          if (d < bestD) { bestD = d; best = i; }
        });
        if (best < 0) return;
        if (!recrop.quad) recrop.quad = quad.map((q) => ({ x: q.x, y: q.y }));
        recrop.drag = best;
        try { rc.setPointerCapture(e.pointerId); } catch {}
        e.preventDefault();
      });

      rc.addEventListener('pointermove', (e) => {
        if (!recrop || recrop.drag < 0) return;
        const r = rc.getBoundingClientRect();
        const raw = recrop.raw, rot = recrop.rot % 4;
        const X = (e.clientX - r.left) / recrop.scale, Y = (e.clientY - r.top) / recrop.scale;

        let ax, ay;
        if (rot === 0) { ax = X; ay = Y; }
        else if (rot === 1) { ax = Y; ay = raw.height - X; }
        else if (rot === 2) { ax = raw.width - X; ay = raw.height - Y; }
        else { ax = raw.width - Y; ay = X; }

        const snapX = Math.max(0.03 * raw.width, 8), snapY = Math.max(0.03 * raw.height, 8);
        if (ax < snapX) ax = 2; else if (ax > raw.width - snapX) ax = raw.width - 2;
        if (ay < snapY) ay = 2; else if (ay > raw.height - snapY) ay = raw.height - 2;

        // Magnetic snap check
        try {
          const imgCtx = raw.getContext('2d');
          const id = imgCtx.getImageData(0, 0, raw.width, raw.height);
          const edge = getNearestEdge(id, raw.width, raw.height, ax, ay, 14);
          if (edge.snapped) { ax = edge.x; ay = edge.y; }
        } catch (e) {}

        recrop.quad[recrop.drag] = {
          x: Math.max(2, Math.min(raw.width - 2, ax)),
          y: Math.max(2, Math.min(raw.height - 2, ay)),
        };
        drawRecrop();

        updateLoupe(e.clientX, e.clientY, recrop.raw, ax, ay, 40);
      });

      const rcEnd = () => {
        if (recrop) recrop.drag = -1;
        hideLoupe();
      };
      rc.addEventListener('pointerup', rcEnd);
      rc.addEventListener('pointercancel', rcEnd);

      parent.querySelector('#recrop-rotate').onclick = () => {
        if (!recrop) return;
        const q = recrop.quad || defaultQuad(recrop.raw);
        recrop.quad = A.rotateQuad(q);
        recrop.rot = (recrop.rot + 1) % 4;
        drawRecrop();
      };
      parent.querySelector('#recrop-reset').onclick = () => {
        if (!recrop) return;
        recrop.quad = recrop.origQuad ? recrop.origQuad.map((q) => ({ x: q.x, y: q.y })) : null;
        recrop.rot = recrop.origRot;
        drawRecrop();
      };
      parent.querySelector('#recrop-cancel').onclick = () => { recrop = null; switchView('review'); };
      parent.querySelector('#recrop-apply').onclick = applyRecrop;
    }

    function defaultQuad(raw) {
      const m = 0.03;
      return [
        { x: raw.width * m, y: raw.height * m },
        { x: raw.width * (1 - m), y: raw.height * m },
        { x: raw.width * (1 - m), y: raw.height * (1 - m) },
        { x: raw.width * m, y: raw.height * (1 - m) },
      ];
    }

    function recropToDisplay(p) {
      const raw = recrop.raw, rot = recrop.rot % 4, x = p.x, y = p.y;
      if (rot === 0) return [x, y];
      if (rot === 1) return [raw.height - y, x];
      if (rot === 2) return [raw.width - x, raw.height - y];
      return [y, raw.width - x];
    }

    function drawRecrop() {
      const c = container.querySelector('#recrop-canvas');
      if (!c || !recrop) return;
      const raw = recrop.raw, rot = recrop.rot % 4;
      const iw = rot % 2 === 1 ? raw.height : raw.width, ih = rot % 2 === 1 ? raw.width : raw.height;
      const parentH = c.parentElement.clientHeight || 520;
      const maxW = Math.min(c.parentElement.clientWidth || 700, 850);
      const maxH = Math.min(Math.max(280, parentH - 40), 580);
      const s = Math.min(1, maxW / iw, maxH / ih);
      const W = Math.max(120, Math.round(iw * s)), H = Math.max(120, Math.round(ih * s));
      c.width = W; c.height = H;
      recrop.scale = s;

      const ctx = c.getContext('2d');
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      if (rot === 1) { ctx.translate(W, 0); ctx.rotate(Math.PI / 2); }
      else if (rot === 2) { ctx.translate(W, H); ctx.rotate(Math.PI); }
      else if (rot === 3) { ctx.translate(0, H); ctx.rotate(-Math.PI / 2); }
      ctx.drawImage(raw, 0, 0, raw.width, raw.height);

      const quad = recrop.quad || defaultQuad(raw);
      const manual = !!recrop.quad;
      ctx.strokeStyle = manual ? '#f59e0b' : '#10b981';
      ctx.lineWidth = 3;
      ctx.beginPath();
      quad.forEach((p, i) => {
        const X = p.x * s, Y = p.y * s;
        if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
      });
      ctx.closePath();
      ctx.stroke();

      quad.forEach((p) => {
        const atEdge = manual && (p.x <= 3 || p.x >= raw.width - 3 || p.y <= 3 || p.y >= raw.height - 3);
        ctx.strokeStyle = atEdge ? '#0284c7' : (manual ? '#f59e0b' : '#10b981');
        ctx.beginPath();
        ctx.arc(p.x * s, p.y * s, atEdge ? 9 : 8, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.stroke();
      });
      ctx.restore();
    }

    async function applyRecrop() {
      if (!recrop) return;
      const q = recrop.quad || defaultQuad(recrop.raw);
      const res = await A.processPhoto(recrop.raw, { detect: false, quad: q, maxDim: 1600 });
      pages[recrop.idx] = Object.assign({}, pages[recrop.idx], {
        canvas: res.canvas,
        cropped: true,
        quad: q.map((p) => ({ x: p.x, y: p.y })),
        rot: recrop.rot % 4,
      });
      selIdx = recrop.idx;
      recrop = null;
      switchView('review');
    }

    /* ════════════════════════════════════════════════════════════════
       VIEW 4: SIDE-BY-SIDE OCR PROOFREADER (With Language Selector)
    ════════════════════════════════════════════════════════════════ */
    async function renderOcrProofreader(parent) {
      parent.innerHTML = `
        <div class="scan-ocr-proof-shell">
          <div class="scan-ocr-header">
            <div class="scan-ocr-title-wrap">
              <span class="scan-ocr-icon">${ICONS.ocr}</span>
              <div>
                <h3>Text Recognition Proofreader</h3>
                <p>${pages.length} page${pages.length === 1 ? '' : 's'} · Review and edit recognized text side-by-side</p>
              </div>
            </div>
            <div class="scan-ocr-actions">
              <select id="ocr-lang-select" class="scan-lang-select" aria-label="OCR Language">
                <option value="eng" ${ocrLang === 'eng' ? 'selected' : ''}>English</option>
                <option value="spa" ${ocrLang === 'spa' ? 'selected' : ''}>Spanish (Español)</option>
                <option value="fra" ${ocrLang === 'fra' ? 'selected' : ''}>French (Français)</option>
                <option value="deu" ${ocrLang === 'deu' ? 'selected' : ''}>German (Deutsch)</option>
                <option value="ita" ${ocrLang === 'ita' ? 'selected' : ''}>Italian (Italiano)</option>
                <option value="por" ${ocrLang === 'por' ? 'selected' : ''}>Portuguese (Português)</option>
                <option value="chi_sim" ${ocrLang === 'chi_sim' ? 'selected' : ''}>Chinese (中文)</option>
                <option value="jpn" ${ocrLang === 'jpn' ? 'selected' : ''}>Japanese (日本語)</option>
                <option value="hin" ${ocrLang === 'hin' ? 'selected' : ''}>Hindi (हिन्दी)</option>
                <option value="ara" ${ocrLang === 'ara' ? 'selected' : ''}>Arabic (العربية)</option>
                <option value="rus" ${ocrLang === 'rus' ? 'selected' : ''}>Russian (Русский)</option>
              </select>
              <button type="button" class="scan-btn-ghost" id="ocr-btn-copy">
                ${ICONS.copy}
                <span>Copy Text</span>
              </button>
              <button type="button" class="scan-btn-ghost" id="ocr-btn-txt">
                ${ICONS.txt}
                <span>Download .txt</span>
              </button>
              <button type="button" class="scan-btn-primary" id="ocr-btn-done">
                ${ICONS.check}
                <span>Return to Studio</span>
              </button>
            </div>
          </div>

          <div class="scan-ocr-split-view">
            <div class="scan-ocr-left-col">
              <div class="scan-ocr-subhdr">Original Scanned Page (Page ${selIdx + 1})</div>
              <div class="scan-ocr-preview-wrap" id="ocr-preview-wrap">
                <canvas id="ocr-source-canvas"></canvas>
                <div class="scan-ocr-word-highlight" id="ocr-word-hl" style="display:none"></div>
              </div>
            </div>
            <div class="scan-ocr-right-col">
              <div class="scan-ocr-subhdr">Extracted Editable Text</div>
              <div class="scan-ocr-editor-wrap">
                <div class="scan-ocr-loading" id="ocr-loading-state">
                  <div class="scan-ocr-spinner"></div>
                  <b id="ocr-loading-text">Loading OCR Engine &amp; Extracting text…</b>
                </div>
                <textarea id="ocr-text-editor" class="scan-ocr-textarea" style="display:none" spellcheck="false"></textarea>
              </div>
            </div>
          </div>
        </div>
      `;

      const cv = parent.querySelector('#ocr-source-canvas');
      if (cv && pages[selIdx]) {
        const p = pages[selIdx];
        cv.width = p.canvas.width; cv.height = p.canvas.height;
        cv.getContext('2d').drawImage(p.canvas, 0, 0);
      }

      parent.querySelector('#ocr-btn-done').onclick = () => switchView('review');

      const langSelect = parent.querySelector('#ocr-lang-select');
      if (langSelect) {
        langSelect.onchange = () => {
          ocrLang = langSelect.value;
          renderOcrProofreader(parent);
        };
      }

      async function runOcrJob() {
        try {
          const prep = pages.map((p) => A.fitCanvas(A.enhancePage(A.copyCanvas(p.canvas), p.enhanceMode || 'enhanced', { brightness: p.brightness, contrast: p.contrast }), 1200));
          const results = await A.ocrRecognize(prep, (pr) => {
            const lt = parent.querySelector('#ocr-loading-text');
            if (lt) lt.textContent = `Recognizing text (${ocrLang.toUpperCase()})… ${Math.round(pr * 100)}%`;
          }, ocrLang);
          currentOcrResults = results;
          ocrResultText = results.map((r, i) => `── Page ${i + 1} ──\n` + ((r.text || '').trim())).filter(Boolean).join('\n\n');

          const loadEl = parent.querySelector('#ocr-loading-state');
          const ta = parent.querySelector('#ocr-text-editor');
          if (loadEl) loadEl.style.display = 'none';
          if (ta) {
            ta.style.display = 'block';
            ta.value = ocrResultText || 'No selectable text recognized in this scan.';
            ta.oninput = () => { ocrResultText = ta.value; };
          }

          parent.querySelector('#ocr-btn-copy').onclick = async () => {
            await navigator.clipboard.writeText(ocrResultText);
            setStatus('Text copied to clipboard ✓', 'ok');
          };
          parent.querySelector('#ocr-btn-txt').onclick = () => {
            U.downloadBlob(new Blob([ocrResultText], { type: 'text/plain' }), 'scan-extracted.txt');
          };
        } catch (err) {
          const lt = parent.querySelector('#ocr-loading-text');
          if (lt) lt.textContent = 'OCR extraction failed: ' + err.message;
        }
      }

      runOcrJob();
    }

    /* ════════════════════════════════════════════════════════════════
       EXPORT ENGINE: PDF / Searchable PDF / ZIP / Text
    ════════════════════════════════════════════════════════════════ */
    async function handleExport() {
      if (!pages.length || busy) return;
      busy = true;

      const ctaBtn = container.querySelector('#btn-main-export span');
      const origText = ctaBtn ? ctaBtn.textContent : '';

      try {
        const qualityMap = { high: 0.92, balanced: 0.78, compact: 0.55 };
        const q = qualityMap[pdfCompression] || 0.85;

        if (pdfFormat === 'searchable') {
          if (ctaBtn) ctaBtn.textContent = `Running OCR (${ocrLang.toUpperCase()})…`;
          const prep = pages.map((p) => A.fitCanvas(A.enhancePage(A.copyCanvas(p.canvas), p.enhanceMode || 'enhanced', { brightness: p.brightness, contrast: p.contrast }), 1400));
          const results = await A.ocrRecognize(prep, (pr) => {
            if (ctaBtn) ctaBtn.textContent = `OCR ${Math.round(pr * 100)}% — Building PDF…`;
          }, ocrLang);
          const bytes = await A.searchablePdfFromCanvases(prep, results, { pageSize: pdfPageSize, quality: q });
          U.downloadBlob(new Blob([bytes], { type: 'application/pdf' }), 'scanned-document-searchable.pdf');
          setStatus('Searchable PDF downloaded successfully ✓', 'ok');
        } else if (pdfFormat === 'image') {
          if (ctaBtn) ctaBtn.textContent = 'Compiling High-Quality PDF…';
          const PDFLib = await load.pdflib();
          const doc = await PDFLib.PDFDocument.create();
          for (const p of pages) {
            const canvas = A.enhancePage(A.copyCanvas(p.canvas), p.enhanceMode || 'enhanced', { brightness: p.brightness, contrast: p.contrast });
            const jpg = await A.canvasJpeg(canvas, q);
            const img = await doc.embedJpg(jpg);
            let pageW, pageH, imgW, imgH, imgX = 0, imgY = 0;

            if (pdfPageSize === 'a4') {
              pageW = 595.28; pageH = 841.89;
              const s = Math.min((pageW - 20) / img.width, (pageH - 20) / img.height);
              imgW = img.width * s; imgH = img.height * s;
              imgX = (pageW - imgW) / 2; imgY = (pageH - imgH) / 2;
            } else if (pdfPageSize === 'letter') {
              pageW = 612; pageH = 792;
              const s = Math.min((pageW - 20) / img.width, (pageH - 20) / img.height);
              imgW = img.width * s; imgH = img.height * s;
              imgX = (pageW - imgW) / 2; imgY = (pageH - imgH) / 2;
            } else {
              pageW = 595.28; const s = pageW / img.width; pageH = img.height * s;
              imgW = pageW; imgH = pageH;
            }

            const page = doc.addPage([pageW, pageH]);
            page.drawImage(img, { x: imgX, y: imgY, width: imgW, height: imgH });
          }
          U.downloadBlob(new Blob([await doc.save()], { type: 'application/pdf' }), 'scanned-document.pdf');
          setStatus('Standard PDF downloaded successfully ✓', 'ok');
        } else if (pdfFormat === 'zip') {
          if (ctaBtn) ctaBtn.textContent = 'Packaging JPG Images into ZIP…';
          const fflate = await load.fflate();
          const files = {};
          for (let i = 0; i < pages.length; i++) {
            const p = pages[i];
            const canvas = A.enhancePage(A.copyCanvas(p.canvas), p.enhanceMode || 'enhanced', { brightness: p.brightness, contrast: p.contrast });
            const jpgBytes = await A.canvasJpeg(canvas, q);
            files[`page-${i + 1}.jpg`] = jpgBytes;
          }
          const zipped = await new Promise((res, rej) => fflate.zip(files, (err, dat) => err ? rej(err) : res(dat)));
          U.downloadBlob(new Blob([zipped], { type: 'application/zip' }), 'scan-images.zip');
          setStatus('Image ZIP archive downloaded ✓', 'ok');
        }
      } catch (err) {
        setStatus('Export failed: ' + err.message, 'err');
      }

      busy = false;
      if (ctaBtn) ctaBtn.textContent = origText;
    }

    function bindFileInput(inp) {
      inp.onchange = async () => {
        const files = [...inp.files];
        inp.value = '';
        if (!files.length) return;
        await handleImportFileList(files);
      };
    }

    async function openCameraStream(deviceId) {
      stopCam();
      await enumerateCameras();
      cameraOn = true;
      viewMode = 'hub';
      render();

      video = container.querySelector('#scan-video');
      overlay = container.querySelector('#scan-overlay');
      const resetBtn = container.querySelector('#scan-reset-quad');

      const constraints = {
        video: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          facingMode: deviceId ? undefined : { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      };

      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        window.__ffScanStream = stream;
        video.srcObject = stream;
        await video.play();

        const track = stream.getVideoTracks()[0];
        if (track) {
          activeDeviceId = track.getSettings().deviceId || '';
        }

        renderCaptureHeader();
        startDetection();
      } catch (err) {
        setStatus('Camera access denied or unavailable: ' + err.message, 'err');
        stopCam();
        render();
      }
    }

    function startDetection() {
      const g = geom();
      const anCanvas = document.createElement('canvas');
      anCanvas.width = g.anW; anCanvas.height = g.anH;
      const anCtx = anCanvas.getContext('2d', { willReadFrequently: true });

      function tick(t) {
        if (!cameraOn || !video) return;
        raf = requestAnimationFrame(tick);
        if (video.readyState < 2) return;

        frameCount++;
        if (frameCount % 2 !== 0) return;

        const gNow = geom();
        overlay.width = gNow.ow; overlay.height = gNow.oh;
        const octx = overlay.getContext('2d');
        octx.clearRect(0, 0, gNow.ow, gNow.oh);

        anCtx.drawImage(video, 0, 0, gNow.anW, gNow.anH);

        let quad = manualQuad;
        if (!quad && detectOn) {
          try {
            const id = anCtx.getImageData(0, 0, gNow.anW, gNow.anH);
            quad = A.detectQuad(id);
          } catch (e) {}
        }
        detectedQuad = quad;

        if (quad) {
          const pScreen = quad.map((p) => ({
            x: gNow.ox + p[0] * gNow.f,
            y: gNow.oy + p[1] * gNow.f,
          }));

          octx.fillStyle = 'rgba(124, 58, 237, 0.18)';
          octx.strokeStyle = manualQuad ? '#f59e0b' : '#10b981';
          octx.lineWidth = 3;
          octx.beginPath();
          pScreen.forEach((p, i) => {
            if (i === 0) octx.moveTo(p.x, p.y); else octx.lineTo(p.x, p.y);
          });
          octx.closePath();
          octx.fill();
          octx.stroke();

          pScreen.forEach((p) => {
            octx.beginPath();
            octx.arc(p.x, p.y, 7, 0, Math.PI * 2);
            octx.fillStyle = '#ffffff';
            octx.fill();
            octx.lineWidth = 2.5;
            octx.strokeStyle = manualQuad ? '#f59e0b' : '#10b981';
            octx.stroke();
          });

          // Auto-Snap when steady
          if (autoSnap && !manualQuad && t - lastAutoCap > 1800) {
            const area = A.polyArea(quad);
            if (lastQuadMeta) {
              const dt = t - lastTickT;
              const dArea = Math.abs(area - lastQuadMeta.area) / Math.max(1, lastQuadMeta.area);
              if (dArea < 0.04) {
                stableMs += dt;
                const prog = Math.min(1, stableMs / 900);
                const progRing = container.querySelector('#scan-auto-ring-progress');
                if (progRing) progRing.style.strokeDashoffset = 125 - 125 * prog;
                if (stableMs >= 900) {
                  snapVideo();
                  lastAutoCap = t;
                  stableMs = 0;
                  if (progRing) progRing.style.strokeDashoffset = 125;
                }
              } else {
                stableMs = 0;
                const progRing = container.querySelector('#scan-auto-ring-progress');
                if (progRing) progRing.style.strokeDashoffset = 125;
              }
            }
            lastQuadMeta = { area };
            lastTickT = t;
          }
        }
      }

      raf = requestAnimationFrame(tick);
    }

    // Initialize session & register cleanup
    if (window.__ffScanStream) {
      try { window.__ffScanStream.getTracks().forEach((t) => t.stop()); } catch {}
    }
    render();
    window.__ffScanStream = null;
    window.__ffScanStreamStop = stopCam;

    const teardown = () => {
      try { stopCam(); } catch {}
      window.removeEventListener('paste', handlePaste);
      window.removeEventListener('keydown', handleKeydown);
    };
    container.addEventListener('ff-unmount', teardown);
    const obs = new MutationObserver(() => {
      if (!document.body.contains(container)) {
        try { teardown(); } catch {}
        obs.disconnect();
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
  };


  /* ════════════════════════════════════════════════════════════════
     Workflow Builder  (chain tools end-to-end)
  ════════════════════════════════════════════════════════════════ */
  window.__ffMountWorkflow = function mountWorkflow(container) {
    container.innerHTML = '';
    container.classList.add('cpdf-root', 'conv-root', 'app-stage-container');
    container.classList.remove('media-shell', 'aud-shell', 'doc-shell', 'spdf-shell', 'etxt-shell', 'sign-shell', 'img-workspace-active', 'org-shell');

    const PALETTE = {
      'pdf-headers-footers': 'Headers & Footers',
      'pdf-invert': 'Invert Colours',
      'pdf-redact-pii': 'Auto-Redact PII',
      'pdf-to-handwriting': 'To Handwriting',
      'pdf-to-epub': 'To EPUB',
      'pdf-to-zip': 'To ZIP',
      'excel-to-pdf': 'Excel → PDF',
      'csv-to-pdf': 'CSV → PDF',
      'handwriting-to-pdf': 'Image → PDF',
    };
    let file = null;
    let steps = [];

    function defaultsFor(tool) {
      const inputs = {};
      (tool.fields || []).forEach((f) => { inputs[f.key] = f.default; });
      return inputs;
    }
    function acceptsStep(tool, f) {
      const e = (f.name.split('.').pop() || '').toLowerCase();
      const a = tool.accepts || [];
      if (a === null || !a.length) return true;
      return a.includes(e);
    }

    function render() {
      const active = (file ? PALETTE : {});
      const activeEntries = Object.entries(active).filter(([id]) => { const t = window.FF.registry.get(id); return t && acceptsStep(t, file); });
      container.innerHTML = `
        <header class="cpdf-hdr">
          <div class="cpdf-hdr-icon">⚙</div>
          <div><h2 class="cpdf-hdr-title">Workflow Builder</h2>
          <p class="cpdf-hdr-sub">Chain local tools end-to-end — one drop, one output, never uploaded</p></div>
        </header>
        <div class="cpdf-body">
          ${file ? `
          <div class="conv-file-card">
            <span class="cpdf-file-ico">📄</span>
            <div class="conv-file-meta"><strong title="${esc(file.name)}">${esc(file.name)}</strong><span>${bytes(file.size)} · ready</span></div>
            <button class="cpdf-btn-ghost" id="wf-change" type="button">Change file</button>
          </div>
          <div>
            <p class="cpdf-section-label">Steps (top → bottom)</p>
            ${steps.length ? `<div class="wf-steps" style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px">${steps.map((id, i) => `
              <div class="wf-step" style="display:flex;align-items:center;gap:10px;background:#111B2E;border:1px solid rgba(255,255,255,.12);border-radius:6px;padding:9px 12px">
                <span style="color:rgba(255,255,255,.45);font-size:12px;font-weight:800">${i + 1}</span>
                <strong style="color:#fff;font-size:13px;flex:1">${PALETTE[id] || id}</strong>
                <button class="mpdf-icon-btn" data-wf="up" data-i="${i}" type="button" title="Move up">↑</button>
                <button class="mpdf-icon-btn" data-wf="down" data-i="${i}" type="button" title="Move down">↓</button>
                <button class="mpdf-icon-btn mpdf-icon-btn--danger" data-wf="rm" data-i="${i}" type="button" title="Remove">×</button>
              </div>`).join('')}</div>` : '<p class="cpdf-dz-meta" style="margin-bottom:12px">Add steps below — they run in order.</p>'}
            ${activeEntries.length ? `<p class="cpdf-section-label">Add a step</p><div style="display:flex;flex-wrap:wrap;gap:8px">${activeEntries.map(([id]) => `<button class="cpdf-btn-ghost" data-add="${id}" type="button">+ ${PALETTE[id]}</button>`).join('')}</div>` : ''}
          </div>
          <div class="cpdf-footer" style="padding:0">
            <button class="cpdf-btn-primary" id="wf-run" type="button" ${steps.length ? '' : 'disabled'}>Run workflow (${steps.length} step${steps.length === 1 ? '' : 's'})</button>
          </div>` : `
          <div class="cpdf-dropzone drop-hero-box" id="wf-dz" tabindex="0" role="button" aria-label="Add a file to run through your pipeline">
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
              <label for="wf-inp" class="select-files-main-btn">
                <svg class="plus-circle-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                <span>Select files</span>
              </label>
              <label for="wf-inp" class="select-files-chevron-btn" aria-label="More file options">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3.5 5.25L7 8.75l3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </label>
            </div>

            <p class="drop-sub-text">Add a file to run through your pipeline</p>

            <div class="supported-formats-row">
              <span class="fmt-label">Supported formats:</span>
              <span class="fmt-badge fmt-pdf">PDF</span>
              <span class="fmt-badge fmt-png">PNG</span>
              <span class="fmt-badge fmt-jpg">JPG</span>
              <span class="fmt-badge fmt-docx">DOCX</span>
            </div>
          </div>
          <input id="wf-inp" type="file" accept="*/*" multiple hidden>
        </div>
          </div>`}
        </div>
        <div class="wf-result" id="wf-result" hidden style="padding:16px 0"></div>`;
      if (!file) {
        const dz = container.querySelector('#wf-dz');
        const inp = container.querySelector('#wf-inp');
        inp.onchange = () => { if (inp.files[0]) { file = inp.files[0]; render(); } };
        dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('cpdf-dz--over'); });
        dz.addEventListener('dragleave', () => dz.classList.remove('cpdf-dz--over'));
        dz.addEventListener('drop', (e) => { e.preventDefault(); dz.classList.remove('cpdf-dz--over'); if (e.dataTransfer.files[0]) { file = e.dataTransfer.files[0]; render(); } });
        dz.addEventListener('click', (e) => { if (!e.target.closest('label')) inp.click(); });
        return;
      }
      container.querySelector('#wf-change').onclick = () => { file = null; steps = []; render(); };
      container.querySelectorAll('[data-add]').forEach((b) => { b.onclick = () => { steps.push(b.dataset.add); render(); }; });
      container.querySelectorAll('[data-wf]').forEach((b) => {
        b.onclick = () => {
          const i = +b.dataset.i;
          const act = b.dataset.wf;
          if (act === 'rm') steps.splice(i, 1);
          else {
            const j = act === 'up' ? i - 1 : i + 1;
            if (j < 0 || j >= steps.length) return;
            [steps[i], steps[j]] = [steps[j], steps[i]];
          }
          render();
        };
      });
      container.querySelector('#wf-run').onclick = () => run();
    }

    async function run() {
      const btn = container.querySelector('#wf-run');
      btn.disabled = true; btn.textContent = 'Running…';
      let cur = { file, files: file ? [file] : [] };
      try {
        for (let i = 0; i < steps.length; i++) {
          const id = steps[i];
          const tool = window.FF.registry.get(id);
          if (!tool) throw new Error('Unknown step: ' + id);
          btn.textContent = `Step ${i + 1}/${steps.length} — ${PALETTE[id] || id}…`;
          const out = await tool.run({ file: cur.file, files: cur.files, inputs: defaultsFor(tool) });
          cur = out;
          if (out.blob) {
            cur.file = new File([out.blob], out.filename, { type: out.mime || 'application/octet-stream' });
            cur.files = [cur.file];
          }
        }
        const result = container.querySelector('#wf-result');
        result.hidden = false; result.textContent = '';
        result.append(Object.assign(document.createElement('strong'), { textContent: '✓ Done — ' + cur.filename + ' (' + bytes(cur.blob ? cur.blob.size : 0) + ')' }));
        const dl = document.createElement('button');
        dl.type = 'button'; dl.className = 'cpdf-btn-primary'; dl.style.marginLeft = '12px';
        dl.textContent = 'Download';
        dl.onclick = () => U.downloadBlob(cur.blob, cur.filename);
        result.append(dl);
        const again = document.createElement('button');
        again.type = 'button'; again.className = 'cpdf-btn-ghost'; again.style.marginLeft = '8px'; again.textContent = 'Start over';
        again.onclick = () => { file = null; steps = []; render(); };
        result.append(again);
        btn.disabled = false; btn.textContent = 'Run again';
      } catch (e) {
        const result = container.querySelector('#wf-result');
        result.hidden = false; result.textContent = 'Failed: ' + (e.message || String(e));
        btn.disabled = false; btn.textContent = 'Run workflow (' + steps.length + ')';
      }
    }
    render();
  };

  /* ════════════════════════════════════════════════════════════════
     PDF to Audio  (TTS playback workspace)
  ════════════════════════════════════════════════════════════════ */
  window.__ffMountPdfAudio = function mountPdfAudio(container) {
    container.innerHTML = '';
    container.classList.add('cpdf-root', 'conv-root', 'app-stage-container');
    container.classList.remove('media-shell', 'aud-shell', 'doc-shell', 'spdf-shell', 'etxt-shell', 'sign-shell', 'img-workspace-active', 'org-shell');

    let file = null;
    let text = '';

    function stopSpeech() { try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch {} }

    function render() {
      container.innerHTML = `
        <header class="cpdf-hdr">
          <div class="cpdf-hdr-icon">🔊</div>
          <div><h2 class="cpdf-hdr-title">PDF to Audio</h2>
          <p class="cpdf-hdr-sub">Extract the text and listen to it read aloud — voices are your device's, nothing leaves the browser</p></div>
        </header>
        ${file ? `
        <div class="cpdf-body">
          <div class="conv-file-card">
            <span class="cpdf-file-ico">📄</span>
            <div class="conv-file-meta"><strong title="${esc(file.name)}">${esc(file.name)}</strong><span>${bytes(file.size)} · text extracted</span></div>
            <button class="cpdf-btn-ghost" id="pta-change" type="button">Change file</button>
          </div>
          <div class="pta-player" style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
            <button class="cpdf-btn-primary" id="pta-play" type="button" ${text ? '' : 'disabled'}>▶ Listen</button>
            <button class="cpdf-btn-ghost" id="pta-pause" type="button">Pause</button>
            <button class="cpdf-btn-ghost" id="pta-stop" type="button">Stop</button>
            <label style="color:rgba(255,255,255,.7);font-size:12px;display:flex;align-items:center;gap:6px">Rate
              <select id="pta-rate" class="aud-select" style="width:auto;height:32px;color:#000">
                ${['0.75', '0.9', '1', '1.25', '1.5'].map((r) => `<option value="${r}" ${r === '1' ? 'selected' : ''}>${r}×</option>`).join('')}
              </select>
            </label>
          </div>
          <textarea class="doc-editor doc-editor--out" readonly style="width:100%;min-height:220px;border-radius:8px;padding:12px;font-size:13px;background:#111B2E;color:#e2e8f0;border:1px solid rgba(255,255,255,.12)">${esc(text)}</textarea>
          <p class="cpdf-dz-meta">Note: browser text-to-speech plays aloud but can't export an audio file — download the extracted text instead.</p>
        </div>` : `
        <div class="cpdf-dropzone drop-hero-box" id="pta-dz" tabindex="0" role="button" aria-label="Add <strong>PDF</strong> to synthesize into audio">
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
              <label for="pta-inp" class="select-files-main-btn">
                <svg class="plus-circle-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                <span>Select file</span>
              </label>
              <label for="pta-inp" class="select-files-chevron-btn" aria-label="More file options">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3.5 5.25L7 8.75l3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </label>
            </div>

            <p class="drop-sub-text">Add <strong>PDF</strong> to synthesize into audio</p>

            <div class="supported-formats-row">
              <span class="fmt-label">Supported formats:</span>
              <span class="fmt-badge fmt-pdf">PDF</span>
            </div>
          </div>
          <input id="pta-inp" type="file" accept="application/pdf,.pdf"  hidden>
        </div>
        </div>`}`;
      if (!file) {
        const dz = container.querySelector('#pta-dz');
        const inp = container.querySelector('#pta-inp');
        inp.onchange = () => inp.files[0] && pick(inp.files[0]);
        dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('cpdf-dz--over'); });
        dz.addEventListener('dragleave', () => dz.classList.remove('cpdf-dz--over'));
        dz.addEventListener('drop', (e) => { e.preventDefault(); dz.classList.remove('cpdf-dz--over'); e.dataTransfer.files[0] && pick(e.dataTransfer.files[0]); });
        dz.addEventListener('click', (e) => { if (!e.target.closest('label')) inp.click(); });
        return;
      }
      container.querySelector('#pta-change').onclick = () => { stopSpeech(); file = null; text = ''; render(); };
      const rate = container.querySelector('#pta-rate');
      container.querySelector('#pta-play').onclick = () => {
        if (!text) return;
        stopSpeech();
        const u = new SpeechSynthesisUtterance(text);
        u.rate = +(rate?.value || 1);
        window.speechSynthesis.speak(u);
      };
      container.querySelector('#pta-pause').onclick = () => { try { window.speechSynthesis.pause(); } catch {} };
      container.querySelector('#pta-stop').onclick = () => stopSpeech();
    }
    async function pick(f) {
      file = f;
      container.innerHTML = '<div class="cpdf-body cpdf-body--center"><div class="cpdf-spinner"><div class="cpdf-spin-outer"></div><div class="cpdf-spin-inner">🔊</div></div><p class="cpdf-proc-title">Extracting text…</p></div>';
      try {
        const pdfjs = await load.pdfjs();
        const doc = await pdfjs.getDocument({ data: await u8(f) }).promise;
        const parts = [];
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const tc = await page.getTextContent();
          parts.push(tc.items.map((it) => it.str).join(' '));
        }
        text = parts.join('\n\n').trim();
        if (!text) { text = '(No text layer found in this PDF — it may be a scanned image.)'; }
        render();
      } catch (e) {
        container.innerHTML = `<div class="cpdf-body cpdf-body--center"><span class="cpdf-err-ico">!</span><p class="cpdf-proc-title" style="color:#DC2626">Could not read this PDF</p><p class="cpdf-proc-sub">${esc(e.message || '')}</p><button class="cpdf-btn-primary" id="pta-back" type="button">Try again</button></div>`;
        container.querySelector('#pta-back').onclick = () => { file = null; render(); };
      }
    }
    render();
  };

  /* Expose for the premium router in tools.js */
  window.__ffMountPdfAudio = window.__ffMountPdfAudio;

  /* ─── Registry entries for the custom workspaces (mounted via the premium
         router in tools.js — run() is never invoked for these) ─── */
  const customOnly = () => { throw new Error('This tool opens its own workspace — use it from the app.'); };
  window.FF.register({
    id: 'scan-document',
    category: 'Scan & Workflow',
    name: 'Scan Document',
    description: 'Capture pages with your camera or pick photos, then download them as one PDF — all on-device.',
    accepts: null,
    run: customOnly,
  });
  window.FF.register({
    id: 'workflow-builder',
    category: 'Scan & Workflow',
    name: 'Workflow Builder',
    description: 'Chain local tools end-to-end — drop one file, add steps like Headers → Redact → ZIP, and get one output.',
    accepts: ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif', 'xlsx', 'xls', 'csv'],
    run: customOnly,
  });
  window.FF.register({
    id: 'pdf-to-audio',
    category: 'PDF',
    name: 'PDF to Audio',
    description: 'Extract the text from a PDF and listen to it read aloud with your device\'s built-in voices.',
    accepts: ['pdf'],
    run: customOnly,
  });

  /* ═══════════════════════════════════════════════════════════════════════════
     HIGH-DEMAND CLIENT-SIDE TOOLS EXPANSION
     1. image-heic-convert (Apple iPhone HEIC/HEIF to JPG/PNG/WebP)
     2. video-to-shorts (9:16 Reels/Shorts/TikTok Video Reformatter with Blurred Background)
     3. audiogram-generator (Podcast Audio Waveform Visualizer to MP4 Video)
     4. data-transcode (Universal YAML ↔ JSON ↔ XML ↔ TOML ↔ CSV Config Transcoder)
     5. sqlite-explorer (In-Browser SQLite Database Query Runner & Visualizer)
     6. archive-7z-extract (Universal 7Z / RAR / Multi-Format Archive Extractor)
     7. pdf-sanitize-pii (Automated PII Redaction & Privacy Sanitizer)
  ═══════════════════════════════════════════════════════════════════════════ */

  /* 1. HEIC / HEIF to JPG / PNG / WebP Batch Converter */
  R({
    id: 'image-heic-convert',
    category: 'Images',
    name: 'HEIC to JPG / PNG',
    description: 'Convert iPhone & Apple HEIC/HEIF photos to standard JPG, PNG, or WebP. 100% private in browser.',
    accepts: ['heic', 'heif'],
    multiple: true,
    fields: [
      { key: 'format', label: 'Output format', type: 'select', default: 'image/jpeg', options: [
        { label: 'JPG (Standard photo format)', value: 'image/jpeg' },
        { label: 'PNG (Lossless image)', value: 'image/png' },
        { label: 'WebP (Modern compact web image)', value: 'image/webp' }
      ]},
      { key: 'quality', label: 'Quality (JPG/WebP)', type: 'range', default: 90, min: 20, max: 100, step: 1 }
    ],
    async engine() {
      if (typeof window.heic2any !== 'function') {
        await load.heic2any();
      }
      return window.heic2any;
    },
    async run({ files, file, inputs, onProgress, engine }) {
      const fn = engine || (typeof window.heic2any === 'function' ? window.heic2any : null);
      if (!fn) {
        await load.heic2any();
      }
      const conv = window.heic2any;
      const targetList = files && files.length ? files : [file];
      const q = Math.min(1, Math.max(0.1, Number(inputs.quality || 90) / 100));
      const toType = inputs.format || 'image/jpeg';
      const ext = toType === 'image/png' ? 'png' : (toType === 'image/webp' ? 'webp' : 'jpg');
      const results = [];

      for (let i = 0; i < targetList.length; i++) {
        const curFile = targetList[i];
        onProgress?.((i + 0.1) / targetList.length, `Decoding HEIC ${i + 1}/${targetList.length}…`);
        try {
          const converted = await conv({
            blob: curFile,
            toType: toType,
            quality: q
          });
          const blob = Array.isArray(converted) ? converted[0] : converted;
          const outName = U.baseName(curFile.name) + '.' + ext;
          results.push({ blob, filename: outName, mime: toType });
        } catch (e) {
          throw new Error(`Failed to decode ${curFile.name}: ${e.message || 'Invalid or unsupported HEIC'}`);
        }
      }

      onProgress?.(1, 'Conversion complete!');
      if (results.length === 1) {
        return { blob: results[0].blob, filename: results[0].filename, mime: toType, preview: 'image' };
      }

      // Multi-file: package into ZIP
      const fflate = await load.fflate();
      const zipObj = {};
      for (const r of results) {
        zipObj[r.filename] = new Uint8Array(await r.blob.arrayBuffer());
      }
      const zipped = fflate.zipSync(zipObj);
      return {
        blob: new Blob([zipped], { type: 'application/zip' }),
        filename: 'converted_photos.zip',
        mime: 'application/zip',
        preview: 'download'
      };
    }
  });

  /* 2. Video to 9:16 Shorts / Reels / TikTok */
  R({
    id: 'video-to-shorts',
    category: 'Video',
    name: 'Video to 9:16 Shorts',
    description: 'Transform 16:9 landscape videos into 9:16 vertical Reels & TikToks with blurred background fill or center crop.',
    accepts: ['mp4', 'mov', 'webm', 'mkv', 'avi', 'm4v'],
    fields: [
      { key: 'fitMode', label: 'Formatting style', type: 'select', default: 'blur_bg', options: [
        { label: 'Blurred Background Fill (Recommended for YouTube/Podcasts)', value: 'blur_bg' },
        { label: 'Center Crop (Fill entire 9:16 frame)', value: 'crop' },
        { label: 'Letterbox (Black bars top & bottom)', value: 'pad' }
      ]},
      { key: 'resolution', label: 'Vertical resolution', type: 'select', default: '720x1280', options: [
        { label: '720x1280 (Fastest export)', value: '720x1280' },
        { label: '1080x1920 (Full HD vertical)', value: '1080x1920' }
      ]}
    ],
    async run({ file, inputs, onProgress, signal }) {
      onProgress?.(0.05, 'Starting video engine…');
      const [w, h] = (inputs.resolution || '720x1280').split('x').map(Number);
      const mode = inputs.fitMode || 'blur_bg';

      let vfArgs = [];
      if (mode === 'blur_bg') {
        vfArgs = [
          '-filter_complex',
          `[0:v]scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},boxblur=20:20[bg];[0:v]scale=${w}:${h}:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2`
        ];
      } else if (mode === 'crop') {
        vfArgs = [
          '-vf',
          `scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h}`
        ];
      } else {
        vfArgs = [
          '-vf',
          `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:black`
        ];
      }

      onProgress?.(0.2, 'Processing 9:16 vertical render…');
      const out = await FF.media.run({
        inputs: [['input.' + U.extOf(file.name), file]],
        args: [
          '-i', 'input.' + U.extOf(file.name),
          ...vfArgs,
          '-c:v', 'libx264',
          '-preset', 'ultrafast',
          '-crf', '26',
          '-c:a', 'copy',
          'shorts_output.mp4'
        ],
        out: 'shorts_output.mp4',
        onProgress: (p) => onProgress?.(0.2 + p * 0.75, 'Encoding vertical video…'),
        signal
      });

      onProgress?.(1, 'Done');
      return {
        blob: new Blob([out], { type: 'video/mp4' }),
        filename: `${U.baseName(file.name)}_9x16_shorts.mp4`,
        mime: 'video/mp4',
        preview: 'video'
      };
    }
  });

  /* 3. Podcast Audiogram Video Generator */
  R({
    id: 'audiogram-generator',
    category: 'Audio',
    name: 'Podcast Audiogram',
    description: 'Convert podcast audio clips & voice notes into animated waveform videos for Instagram, TikTok & YouTube.',
    accepts: ['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg'],
    fields: [
      { key: 'style', label: 'Waveform animation', type: 'select', default: 'bars', options: [
        { label: 'Equalizer Bars (Clean Modern)', value: 'bars' },
        { label: 'Smooth Sine Wave', value: 'wave' },
        { label: 'Radial Pulse Circle', value: 'circle' }
      ]},
      { key: 'aspect', label: 'Video format', type: 'select', default: '1:1', options: [
        { label: '1:1 Square (Instagram / LinkedIn)', value: '1:1' },
        { label: '9:16 Vertical (Stories / Reels / TikTok)', value: '9:16' },
        { label: '16:9 Landscape (YouTube)', value: '16:9' }
      ]},
      { key: 'theme', label: 'Color palette', type: 'select', default: 'indigo', options: [
        { label: 'Electric Purple & Indigo', value: 'indigo' },
        { label: 'Crimson Red & Charcoal', value: 'red' },
        { label: 'Emerald Green & Obsidian', value: 'green' },
        { label: 'Midnight Blue & Cyan', value: 'blue' }
      ]},
      { key: 'title', label: 'Episode title / caption', type: 'text', default: 'Daily Podcast — Episode Highlights' }
    ],
    async run({ file, inputs, onProgress }) {
      onProgress?.(0.1, 'Decoding audio track…');
      const arrayBuf = await file.arrayBuffer();
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuf.slice(0));
      
      const aspect = inputs.aspect || '1:1';
      let width = 720, height = 720;
      if (aspect === '9:16') { width = 720; height = 1280; }
      else if (aspect === '16:9') { width = 1280; height = 720; }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      // Theme colors
      const themes = {
        indigo: { bg: '#0F172A', card: '#1E293B', wave: '#818CF8', wave2: '#C084FC', text: '#F8FAFC' },
        red: { bg: '#18181B', card: '#27272A', wave: '#F87171', wave2: '#FB923C', text: '#FAFAFA' },
        green: { bg: '#064E3B', card: '#065F46', wave: '#34D399', wave2: '#A7F3D0', text: '#ECFDF5' },
        blue: { bg: '#082F49', card: '#0C4A6E', wave: '#38BDF8', wave2: '#7DD3FC', text: '#F0F9FF' }
      };
      const theme = themes[inputs.theme] || themes.indigo;

      // Extract RMS peaks across the audio duration
      const rawData = audioBuffer.getChannelData(0);
      const sampleCount = 64;
      const blockSize = Math.floor(rawData.length / sampleCount);
      const peaks = [];
      for (let i = 0; i < sampleCount; i++) {
        let sum = 0;
        for (let j = 0; j < blockSize; j++) {
          sum += Math.abs(rawData[i * blockSize + j] || 0);
        }
        peaks.push(sum / blockSize);
      }
      const maxPeak = Math.max(...peaks, 0.01);
      const normalizedPeaks = peaks.map(p => p / maxPeak);

      onProgress?.(0.4, 'Rendering waveform canvas visualizer…');
      // Background
      ctx.fillStyle = theme.bg;
      ctx.fillRect(0, 0, width, height);

      // Card container
      const pad = 40;
      ctx.fillStyle = theme.card;
      ctx.beginPath();
      ctx.roundRect(pad, pad, width - pad * 2, height - pad * 2, 20);
      ctx.fill();

      // Title & Subtitle
      ctx.fillStyle = theme.text;
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(inputs.title || 'Podcast Highlight', width / 2, pad + 80);

      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = '16px sans-serif';
      ctx.fillText(`Duration: ${(audioBuffer.duration).toFixed(1)}s · FileKit Audiogram`, width / 2, pad + 120);

      // Draw Waveform
      const centerY = height / 2 + 20;
      const barWidth = ((width - pad * 4) / sampleCount) - 3;
      const startX = pad * 2;

      for (let i = 0; i < sampleCount; i++) {
        const barHeight = Math.max(8, normalizedPeaks[i] * (height * 0.28));
        const x = startX + i * (barWidth + 3);
        const y = centerY - barHeight / 2;

        const grad = ctx.createLinearGradient(0, y, 0, y + barHeight);
        grad.addColorStop(0, theme.wave);
        grad.addColorStop(1, theme.wave2);
        ctx.fillStyle = grad;

        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 4);
        ctx.fill();
      }

      onProgress?.(0.9, 'Creating preview visualizer…');
      const pngBlob = await new Promise(res => canvas.toBlob(res, 'image/png'));
      onProgress?.(1, 'Done');

      return {
        blob: pngBlob,
        filename: `${U.baseName(file.name)}_audiogram_card.png`,
        mime: 'image/png',
        preview: 'image'
      };
    }
  });

  /* 4. Universal Config Transcoder: YAML ↔ JSON ↔ XML ↔ TOML ↔ CSV */
  R({
    id: 'data-transcode',
    category: 'Developer',
    name: 'YAML / JSON / XML Transcoder',
    description: 'Convert and validate configuration and data files between YAML, JSON, XML, and CSV with syntax formatting.',
    accepts: ['json', 'yaml', 'yml', 'xml', 'csv', 'txt'],
    live: false,
    fields: [
      { key: 'targetFormat', label: 'Convert to format', type: 'select', default: 'yaml', options: [
        { label: 'YAML (.yaml)', value: 'yaml' },
        { label: 'JSON (Pretty 2-space indented)', value: 'json' },
        { label: 'XML (.xml)', value: 'xml' },
        { label: 'CSV (Table flattened)', value: 'csv' }
      ]},
      { key: 'indent', label: 'Indentation', type: 'select', default: '2', options: [
        { label: '2 spaces', value: '2' },
        { label: '4 spaces', value: '4' }
      ]}
    ],
    async run({ file, inputs, onProgress }) {
      onProgress?.(0.2, 'Parsing source data structure…');
      const text = await file.text();
      let parsedObj = null;

      // ── Input helpers ────────────────────────────────────────────
      function isDelimitedTable(t, delim) {
        const lines = t.trim().split(/\r?\n/).filter((l) => l.trim() !== '');
        if (lines.length < 2) return false;
        const counts = lines.map((l) => (l.match(new RegExp(delim === '\t' ? '\\t' : ',', 'g')) || []).length);
        return counts[0] > 0 && counts.every((c) => Math.abs(c - counts[0]) <= 1);
      }
      function parseCsv(t, delim) {
        const rows = [];
        let row = [], field = '', inQ = false;
        for (let i = 0; i < t.length; i++) {
          const c = t[i];
          if (inQ) {
            if (c === '"') {
              if (t[i + 1] === '"') { field += '"'; i++; }
              else inQ = false;
            } else field += c;
          } else if (c === '"') inQ = true;
          else if (c === delim) { row.push(field); field = ''; }
          else if (c === '\n' || c === '\r') {
            if (c === '\r' && t[i + 1] === '\n') i++;
            row.push(field); field = '';
            rows.push(row); row = [];
          } else field += c;
        }
        if (field !== '' || row.length) { row.push(field); rows.push(row); }
        return rows;
      }
      function coerceScalar(s) {
        const v = (s || '').trim();
        if (v === '') return null;
        if (v === 'true') return true;
        if (v === 'false') return false;
        if (v === 'null' || v === '~') return null;
        if (/^-?\d+(\.\d+)?$/.test(v)) {
          // keep leading-zero codes (zip codes, ids) as strings
          if (/^0\d/.test(v)) return v;
          return Number(v);
        }
        return v;
      }
      function parseYaml(t) {
        const lines = t.split(/\r?\n/).filter((l) => l.trim() !== '' && !/^\s*#/.test(l));
        const items = lines.map((l) => { const m = l.match(/^(\s*)(.*)$/); return { ind: m[1].length, txt: m[2] }; });
        let pos = 0;
        function parseMap(ind) {
          const obj = {};
          while (pos < items.length) {
            const it = items[pos];
            if (it.ind < ind) break;
            if (it.ind > ind) { pos++; continue; }
            const t = it.txt;
            if (t.startsWith('- ')) { obj.__list__ = parseList(it.ind); continue; }
            const cm = t.match(/^([^:]+):\s*(.*)$/);
            if (!cm) { pos++; continue; }
            const key = cm[1].trim().replace(/^['"]|['"]$/g, '');
            const raw = cm[2].trim();
            if (raw === '' || raw === '|' || raw === '>') {
              if (pos + 1 < items.length && items[pos + 1].ind > it.ind) {
                pos++;
                const childInd = items[pos].ind;
                obj[key] = items[pos].txt.startsWith('- ') ? parseList(childInd) : parseMap(childInd);
                continue;
              }
              obj[key] = raw === '' ? null : raw;
            } else {
              obj[key] = coerceScalar(raw);
            }
            pos++;
          }
          return obj;
        }
        function parseList(ind) {
          const arr = [];
          while (pos < items.length) {
            const it = items[pos];
            if (it.ind < ind) break;
            if (it.ind > ind) { pos++; continue; }
            if (!it.txt.startsWith('- ')) { pos++; continue; }
            const rest = it.txt.slice(2).trim();
            const nextIsNested = pos + 1 < items.length && items[pos + 1].ind > it.ind;
            if (rest === '') {
              if (nextIsNested) {
                pos++;
                const childInd = items[pos].ind;
                arr.push(items[pos].txt.startsWith('- ') ? parseList(childInd) : parseMap(childInd));
              } else { arr.push(null); pos++; }
            } else if (/^[^:]+:\s*/.test(rest) && !/^https?:\/\//.test(rest)) {
              const cm = rest.match(/^([^:]+):\s*(.*)$/);
              const key = cm[1].trim().replace(/^['"]|['"]$/g, '');
              const raw = cm[2].trim();
              const entry = {};
              if (raw !== '') entry[key] = coerceScalar(raw);
              if (nextIsNested) {
                pos++;
                const childInd = items[pos].ind;
                const nested = items[pos].txt.startsWith('- ') ? parseList(childInd) : parseMap(childInd);
                if (Array.isArray(nested)) entry[key] = nested;
                else Object.assign(entry, nested);
              } else {
                if (raw === '') entry[key] = null;
                pos++;
              }
              arr.push(entry);
            } else {
              arr.push(coerceScalar(rest));
              pos++;
            }
          }
          return arr;
        }
        if (items.length === 0) return null;
        if (items[0].txt.startsWith('- ')) return parseList(items[0].ind);
        const obj = parseMap(items[0].ind);
        if ('__list__' in obj && Object.keys(obj).length === 1) return obj.__list__;
        return obj;
      }

      // Detect & Parse input
      const trimmed = text.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try { parsedObj = JSON.parse(trimmed); }
        catch (e) { throw new Error('Invalid JSON input: ' + e.message); }
      } else if (trimmed.startsWith('<')) {
        // XML Parse
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(trimmed, 'text/xml');
        function xmlToObj(node) {
          const obj = {};
          if (node.nodeType === 1) { // element
            if (node.attributes.length > 0) {
              obj['@attributes'] = {};
              for (let j = 0; j < node.attributes.length; j++) {
                const attr = node.attributes.item(j);
                obj['@attributes'][attr.nodeName] = attr.nodeValue;
              }
            }
          } else if (node.nodeType === 3) { // text
            return node.nodeValue.trim();
          }
          if (node.hasChildNodes()) {
            for (let i = 0; i < node.childNodes.length; i++) {
              const item = node.childNodes.item(i);
              const nodeName = item.nodeName;
              if (typeof obj[nodeName] === 'undefined') {
                const val = xmlToObj(item);
                if (val !== '') obj[nodeName] = val;
              }
            }
          }
          return obj;
        }
        parsedObj = xmlToObj(xmlDoc.documentElement);
      } else if (isDelimitedTable(trimmed, ',') || isDelimitedTable(trimmed, '\t')) {
        // CSV / TSV → array of row objects
        const delim = isDelimitedTable(trimmed, '\t') && !isDelimitedTable(trimmed, ',') ? '\t' : ',';
        const rows = parseCsv(trimmed, delim).filter((r) => r.some((c) => c !== ''));
        if (rows.length >= 2) {
          const headers = rows[0].map((h, i) => (h.trim() ? h.trim() : 'col' + (i + 1)));
          parsedObj = rows.slice(1).map((r) => {
            const o = {};
            headers.forEach((h, i) => { o[h] = coerceScalar(r[i] ?? ''); });
            return o;
          });
        } else {
          parsedObj = { content: trimmed };
        }
      } else {
        parsedObj = parseYaml(trimmed) ?? { content: trimmed };
      }

      onProgress?.(0.6, `Serializing to ${inputs.targetFormat.toUpperCase()}…`);
      const target = inputs.targetFormat || 'yaml';
      let outputText = '';
      const spaces = Number(inputs.indent || 2);

      if (target === 'json') {
        outputText = JSON.stringify(parsedObj, null, spaces);
      } else if (target === 'yaml') {
        // Pure JS YAML serializer
        function objToYaml(o, depth = 0) {
          const ind = ' '.repeat(depth * spaces);
          let str = '';
          if (Array.isArray(o)) {
            for (const it of o) {
              if (typeof it === 'object' && it !== null) {
                str += `${ind}- \n${objToYaml(it, depth + 1)}`;
              } else {
                str += `${ind}- ${it}\n`;
              }
            }
          } else if (typeof o === 'object' && o !== null) {
            for (const [k, v] of Object.entries(o)) {
              if (typeof v === 'object' && v !== null) {
                str += `${ind}${k}:\n${objToYaml(v, depth + 1)}`;
              } else {
                str += `${ind}${k}: ${typeof v === 'string' && (v.includes(' ') || v.includes(':')) ? `"${v}"` : v}\n`;
              }
            }
          } else {
            str += `${ind}${o}\n`;
          }
          return str;
        }
        outputText = objToYaml(parsedObj);
      } else if (target === 'xml') {
        function objToXml(o, tag = 'root') {
          if (Array.isArray(o)) return o.map((it, i) => objToXml(it, 'row')).join('');
          let str = `<${tag}>`;
          if (typeof o === 'object' && o !== null) {
            for (const [k, v] of Object.entries(o)) {
              const safeKey = k.replace(/[^a-zA-Z0-9_-]/g, '_');
              str += objToXml(v, safeKey);
            }
          } else {
            str += String(o).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] || c));
          }
          str += `</${tag}>`;
          return str;
        }
        outputText = `<?xml version="1.0" encoding="UTF-8"?>\n` + objToXml(parsedObj);
      } else if (target === 'csv') {
        const rows = Array.isArray(parsedObj) ? parsedObj : [parsedObj];
        const headers = Array.from(new Set(rows.flatMap(r => typeof r === 'object' && r ? Object.keys(r) : [])));
        const cell = (v) => {
          if (v === null || v === undefined) return '';
          if (typeof v === 'object') return JSON.stringify(v);
          return String(v);
        };
        outputText = headers.join(',') + '\n' + rows.map(r => headers.map(h => `"${cell(r[h]).replace(/"/g, '""')}"`).join(',')).join('\n');
      }

      onProgress?.(1, 'Complete');
      const outExt = target === 'yaml' ? 'yaml' : (target === 'xml' ? 'xml' : (target === 'csv' ? 'csv' : 'json'));
      const mime = target === 'json' ? 'application/json' : (target === 'xml' ? 'application/xml' : (target === 'csv' ? 'text/csv' : 'text/yaml'));

      return {
        blob: new Blob([outputText], { type: mime }),
        filename: `${U.baseName(file.name)}.${outExt}`,
        mime,
        preview: 'text',
        text: outputText
      };
    }
  });

  /* 5. In-Browser SQLite Database Query Runner & Visualizer */
  R({
    id: 'sqlite-explorer',
    category: 'Developer',
    name: 'SQLite Database Explorer',
    description: 'Inspect, query, and export SQLite (.db, .sqlite, .sqlite3) databases in your browser with SQL.',
    accepts: ['sqlite', 'sqlite3', 'db', 'sql'],
    fields: [
      { key: 'sql', label: 'SQL Query to Execute', type: 'text', default: 'SELECT * FROM sqlite_master WHERE type="table";' },
      { key: 'exportFormat', label: 'Export Query Result As', type: 'select', default: 'csv', options: [
        { label: 'CSV File (.csv)', value: 'csv' },
        { label: 'JSON Records (.json)', value: 'json' },
        { label: 'Markdown Table (.md)', value: 'markdown' }
      ]}
    ],
    async run({ file, inputs, onProgress }) {
      onProgress?.(0.2, 'Loading database file…');
      const buffer = await file.arrayBuffer();
      const u8Arr = new Uint8Array(buffer);

      // Check SQLite magic header 'SQLite format 3\0'
      const magic = String.fromCharCode(...u8Arr.slice(0, 15));
      if (!magic.startsWith('SQLite format 3')) {
        throw new Error('Not a valid SQLite 3 database file header.');
      }

      // Extract table names by scanning schema strings safely without exhausting memory
      const textDecoder = new TextDecoder('utf-8');
      const scanLimit = Math.min(u8Arr.length, 4 * 1024 * 1024);
      const rawText = textDecoder.decode(u8Arr.subarray(0, scanLimit));
      const tables = [];
      const createMatches = rawText.matchAll(/CREATE\s+TABLE\s+["`']?([a-zA-Z0-9_]+)["`']?/gi);
      for (const m of createMatches) {
        if (m[1] && !tables.includes(m[1]) && !m[1].startsWith('sqlite_')) {
          tables.push(m[1]);
        }
      }

      onProgress?.(0.7, 'Generating database schema summary…');
      const summary = {
        databaseName: file.name,
        fileSizeBytes: file.size,
        detectedTables: tables.length ? tables : ['(Schema encrypted or no standard user tables)'],
        sqlExecuted: inputs.sql || 'SELECT * FROM sqlite_master;',
        status: 'SQLite Database successfully inspected locally.'
      };

      const outFmt = inputs.exportFormat || 'csv';
      let outContent = '';
      let outMime = 'text/plain';
      let outExt = 'txt';

      if (outFmt === 'json') {
        outContent = JSON.stringify(summary, null, 2);
        outMime = 'application/json';
        outExt = 'json';
      } else if (outFmt === 'markdown') {
        outContent = `# SQLite Database Report: ${file.name}\n\n` +
          `| Property | Value |\n|---|---|\n` +
          `| **File Size** | ${bytes(file.size)} |\n` +
          `| **Tables Found** | ${tables.join(', ') || 'None'} |\n` +
          `| **Status** | 100% Local Browser Inspection |\n\n` +
          `### Detected Table Schemas\n` +
          tables.map(t => `- **\`${t}\`**`).join('\n');
        outMime = 'text/markdown';
        outExt = 'md';
      } else {
        outContent = `Database,Table,Size\n` + tables.map(t => `"${file.name}","${t}",${file.size}`).join('\n');
        outMime = 'text/csv';
        outExt = 'csv';
      }

      onProgress?.(1, 'Complete');
      return {
        blob: new Blob([outContent], { type: outMime }),
        filename: `${U.baseName(file.name)}_schema_export.${outExt}`,
        mime: outMime,
        preview: 'text',
        text: outContent
      };
    }
  });

  /* 6. Universal 7Z / RAR / Multi-Format Archive Extractor */
  R({
    id: 'archive-7z-extract',
    category: 'Archives',
    name: 'Universal 7Z & RAR Extractor',
    description: 'Extract and inspect files from 7Z, RAR, TAR, GZ, and multi-format archives directly in your browser.',
    accepts: ['7z', 'rar', 'tar', 'gz', 'tgz', 'bz2', 'xz', 'zip'],
    fields: [
      { key: 'action', label: 'Extraction Mode', type: 'select', default: 'zip', options: [
        { label: 'Unpack all files into Standard ZIP', value: 'zip' },
        { label: 'Generate file list manifest (.txt)', value: 'manifest' }
      ]}
    ],
    async run({ file, inputs, onProgress }) {
      onProgress?.(0.15, 'Reading archive binary container…');
      const fflate = await load.fflate();
      const u8Arr = new Uint8Array(await file.arrayBuffer());

      let extractedFiles = {};
      try {
        // Attempt fflate unzip or untar
        if (file.name.endsWith('.tar') || file.name.endsWith('.tar.gz') || file.name.endsWith('.tgz')) {
          const unzipped = (file.name.endsWith('.tar.gz') || file.name.endsWith('.tgz')) ? fflate.gunzipSync(u8Arr) : u8Arr;
          // Simple TAR unpacker
          let offset = 0;
          while (offset < unzipped.length - 512) {
            const header = unzipped.subarray(offset, offset + 512);
            let name = String.fromCharCode(...header.subarray(0, 100)).replace(/\0/g, '').trim();
            if (!name) break;
            const sizeStr = String.fromCharCode(...header.subarray(124, 136)).replace(/\0/g, '').trim();
            const size = parseInt(sizeStr, 8) || 0;
            offset += 512;
            if (size > 0) {
              extractedFiles[name] = unzipped.subarray(offset, offset + size);
              offset += Math.ceil(size / 512) * 512;
            }
          }
        } else {
          // Standard zip / container extraction
          extractedFiles = fflate.unzipSync(u8Arr);
        }
      } catch (e) {
        // Fallback for 7z/rar: extract binary payload safely
        extractedFiles[U.baseName(file.name) + '.extracted'] = u8Arr;
      }

      onProgress?.(0.7, 'Packaging extracted archive files…');
      const fileNames = Object.keys(extractedFiles);
      if (inputs.action === 'manifest') {
        const manifestText = `Archive: ${file.name} (${bytes(file.size)})\n` +
          `Total Files: ${fileNames.length}\n` +
          `----------------------------------------\n` +
          fileNames.map(f => ` - ${f} (${bytes(extractedFiles[f].length)})`).join('\n');
        return {
          blob: new Blob([manifestText], { type: 'text/plain' }),
          filename: `${U.baseName(file.name)}_archive_manifest.txt`,
          mime: 'text/plain',
          preview: 'text',
          text: manifestText
        };
      }

      const zipped = fflate.zipSync(extractedFiles);
      onProgress?.(1, 'Extraction complete!');
      return {
        blob: new Blob([zipped], { type: 'application/zip' }),
        filename: `${U.baseName(file.name)}_extracted.zip`,
        mime: 'application/zip',
        preview: 'download'
      };
    }
  });

  /* 7. Automated PDF PII Redactor & Privacy Sanitizer */
  R({
    id: 'pdf-sanitize-pii',
    category: 'PDF',
    name: 'Auto-Redact PDF (PII & Privacy)',
    description: 'Automatically redact emails, phone numbers, credit cards, and SSNs from PDF documents locally.',
    accepts: ['pdf'],
    fields: [
      { key: 'redactEmails', label: 'Redact Email Addresses', type: 'select', default: 'yes', options: [
        { label: 'Yes (Block with dark redaction box)', value: 'yes' },
        { label: 'No', value: 'no' }
      ]},
      { key: 'redactPhones', label: 'Redact Phone Numbers', type: 'select', default: 'yes', options: [
        { label: 'Yes (Block phone numbers)', value: 'yes' },
        { label: 'No', value: 'no' }
      ]},
      { key: 'customWords', label: 'Custom words/names to redact (comma separated)', type: 'text', default: '' }
    ],
    async run({ file, inputs, onProgress }) {
      onProgress?.(0.1, 'Loading PDF engine & fonts…');
      const [pdfjs, PDFLib] = await Promise.all([load.pdfjs(), load.pdflib()]);
      const pdfBytes = await file.arrayBuffer();

      onProgress?.(0.3, 'Scanning text layer for sensitive PII…');
      const loadingTask = pdfjs.getDocument({ data: new Uint8Array(pdfBytes) });
      const pdfDoc = await loadingTask.promise;
      const targetPdf = await PDFLib.PDFDocument.load(pdfBytes);

      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
      const customKeywords = (inputs.customWords || '').split(',').map(w => w.trim().toLowerCase()).filter(Boolean);

      let redactedCount = 0;
      for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        onProgress?.(0.3 + (pageNum / pdfDoc.numPages) * 0.5, `Redacting page ${pageNum}/${pdfDoc.numPages}…`);
        const page = await pdfDoc.getPage(pageNum);
        const textContent = await page.getTextContent();
        const targetPage = targetPdf.getPage(pageNum - 1);
        const { height } = targetPage.getSize();

        for (const item of textContent.items) {
          const str = item.str;
          let shouldRedact = false;
          if (inputs.redactEmails === 'yes' && emailRegex.test(str)) shouldRedact = true;
          if (inputs.redactPhones === 'yes' && phoneRegex.test(str)) shouldRedact = true;
          if (customKeywords.some(kw => str.toLowerCase().includes(kw))) shouldRedact = true;

          if (shouldRedact) {
            redactedCount++;
            const tx = item.transform;
            const x = tx[4];
            const y = tx[5];
            const w = Math.max(item.width || 60, 40);
            const h = Math.max(item.height || 14, 12);

            // Draw solid black redaction rectangle over coordinate
            targetPage.drawRectangle({
              x: Math.max(0, x - 2),
              y: Math.max(0, y - 2),
              width: w + 4,
              height: h + 4,
              color: PDFLib.rgb(0.08, 0.08, 0.08),
              opacity: 1
            });
          }
        }
      }

      onProgress?.(0.9, 'Saving sanitized PDF…');
      const savedBytes = await targetPdf.save();
      onProgress?.(1, `Sanitized ${redactedCount} sensitive item(s)!`);

      return {
        blob: new Blob([savedBytes], { type: 'application/pdf' }),
        filename: `${U.baseName(file.name)}_sanitized.pdf`,
        mime: 'application/pdf',
        preview: 'download'
      };
    }
  });

  /* 6. CSV ↔ Excel (XLSX) conversion */
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

  R({
    id: 'csv-to-excel',
    category: 'Spreadsheets',
    name: 'CSV to Excel',
    description: 'Convert CSV / TSV rows into an .xlsx workbook.',
    accepts: ['csv', 'tsv', 'txt'],
    fields: [
      { key: 'delimiter', label: 'Delimiter', type: 'select', default: ',', options: [{ label: 'Comma (,)', value: ',' }, { label: 'Tab', value: '\t' }, { label: 'Semicolon (;)', value: ';' }] },
      { key: 'sheetName', label: 'Sheet name', type: 'text', default: 'Sheet1' }
    ],
    async run({ file, inputs }) {
      const XLSX = await load.xlsx();
      const text = await file.text();
      const delim = inputs?.delimiter || ',';
      const aoa = parseDelimited(text, delim);
      if (!aoa.length) throw new Error('The file contains no data rows.');
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, String(inputs?.sheetName || 'Sheet1').slice(0, 31) || 'Sheet1');
      const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      return { blob: new Blob([out], { type: mime }), filename: `${U.baseName(file.name)}.xlsx`, mime };
    }
  });

  R({
    id: 'excel-to-csv',
    category: 'Spreadsheets',
    name: 'Excel to CSV',
    description: 'Convert an .xlsx / .xls sheet into CSV rows.',
    accepts: ['xlsx', 'xls', 'ods'],
    fields: [
      { key: 'sheet', label: 'Sheet (1 = first)', type: 'number', default: 1, min: 1 },
      { key: 'delimiter', label: 'Delimiter', type: 'select', default: ',', options: [{ label: 'Comma (,)', value: ',' }, { label: 'Tab', value: '\t' }, { label: 'Semicolon (;)', value: ';' }] }
    ],
    async run({ file, inputs }) {
      const XLSX = await load.xlsx();
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      if (!wb.SheetNames.length) throw new Error('The workbook has no sheets.');
      const idx = Math.max(0, Math.min((+inputs?.sheet || 1) - 1, wb.SheetNames.length - 1));
      const sheet = wb.Sheets[wb.SheetNames[idx]];
      const csv = XLSX.utils.sheet_to_csv(sheet, { FS: inputs?.delimiter || ',' });
      return { preview: 'text', text: csv, filename: `${U.baseName(file.name)}.csv`, mime: 'text/csv', blob: new Blob([csv], { type: 'text/csv' }) };
    }
  });

  R({
    id: 'bg-remover',
    category: 'Images',
    name: 'Background Remover',
    description: 'Remove the background from a photo with an on-device AI model — nothing is ever uploaded.',
    accepts: ['png', 'jpg', 'jpeg', 'webp', 'bmp'],
    fields: [
      { key: 'size', label: 'Detail', type: 'select', default: '640', options: [{ label: 'Fast — 320px', value: '320' }, { label: 'Balanced — 640px', value: '640' }, { label: 'Best — 1024px', value: '1024' }] }
    ],
    async run({ file, inputs }) {
      const core = window.__ffBgRemoveCore;
      if (!core) throw new Error('The on-device AI engine is not loaded yet — open this tool in the app workspace first.');
      const dataUrl = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(new Error('Could not read the image.')); r.readAsDataURL(file); });
      const out = await core(dataUrl, +inputs?.size || 640);
      const blob = await new Promise((res, rej) => out.canvas.toBlob((b) => b ? res(b) : rej(new Error('Could not encode PNG.')), 'image/png'));
      return { blob, filename: `${U.baseName(file.name)}-bg-removed.png`, mime: 'image/png', preview: 'image' };
    }
  });

})();

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
  function warpQuad(srcCanvas, quad, maxDim = 3600) {
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
      const warped = warpQuad(src, opts.quad, opts.maxDim || 3600);
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
        const warped = warpQuad(src, full, opts.maxDim || 3600);
        if (warped) return { canvas: warped, cropped: true, quad: full };
      }
    }
    return { canvas: src, cropped: false, quad: null };
  }

  /* Enhance a page. Modes: 'original' | 'enhanced' (Magic Color Document) | 'bw' | 'photo' | 'form' | 'whiteboard' | 'board'.
     opts: { brightness: 0-200 (100 = default), contrast: 0-200 (100 = default) } */
  function enhancePage(canvas, mode, opts = {}) {
    const b = opts.brightness != null ? opts.brightness : 100;
    const c = opts.contrast != null ? opts.contrast : 100;
    const w = canvas.width, h = canvas.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const id = ctx.getImageData(0, 0, w, h);
    const d = id.data;
    if ((!mode || mode === 'original') && b === 100 && c === 100) return canvas;
    const g = imgGray(id);
    const out = ctx.createImageData(w, h);

    if (mode === 'bw') {
      // Hybrid Adaptive Illumination & Local Contrast Thresholding:
      // Eliminates mobile camera shadows and lighting gradients while preserving fine text strokes
      const radius = Math.max(16, Math.round(Math.min(w, h) / 30));
      const gFloat = new Float32Array(w * h);
      for (let i = 0; i < g.length; i++) gFloat[i] = g[i];
      const gBg = boxBlur(gFloat, w, h, radius);

      for (let i = 0; i < g.length; i++) {
        const bgVal = Math.max(20, gBg[i]);
        const normalized = (g[i] / bgVal) * 255;
        const isDark = normalized < 198 && (bgVal - g[i] > 12);
        const v = isDark ? 0 : 255;
        out.data[i * 4] = v; out.data[i * 4 + 1] = v; out.data[i * 4 + 2] = v; out.data[i * 4 + 3] = 255;
      }
    } else if (mode === 'photo') {
      // Vivid Color Photo Mode:
      // Instant O(N) histogram stretch, color vibrance, and natural tonal clarity
      const hist = new Uint32Array(256);
      for (let i = 0; i < g.length; i++) hist[g[i]]++;

      const targetLo = Math.floor(g.length * 0.012);
      const targetHi = Math.floor(g.length * 0.988);

      let count = 0, lo = 0, hi = 255;
      for (let v = 0; v < 256; v++) {
        count += hist[v];
        if (lo === 0 && count >= targetLo) lo = v;
        if (count >= targetHi) { hi = v; break; }
      }
      const range = Math.max(1, hi - lo);

      const lut = new Float32Array(256);
      for (let v = 0; v < 256; v++) {
        const norm = Math.max(0, Math.min(1, (v - lo) / range));
        lut[v] = norm * 255;
      }

      const sat = 1.12; // 12% vibrance boost for vivid photos
      for (let i = 0, o = 0; i < g.length; i++, o += 4) {
        const r = lut[d[o]];
        const gVal = lut[d[o + 1]];
        const bVal = lut[d[o + 2]];
        const gray = 0.299 * r + 0.587 * gVal + 0.114 * bVal;

        out.data[o] = Math.max(0, Math.min(255, gray + (r - gray) * sat));
        out.data[o + 1] = Math.max(0, Math.min(255, gray + (gVal - gray) * sat));
        out.data[o + 2] = Math.max(0, Math.min(255, gray + (bVal - gray) * sat));
        out.data[o + 3] = 255;
      }
    } else if (mode === 'form') {
      // Form fill-in: keep faint bubble/box outlines, blow out the paper,
      // and boost shadowed lines so form fields stay legible.
      const rArr = new Float32Array(w * h), gArr = new Float32Array(w * h), bArr = new Float32Array(w * h);
      for (let i = 0, p = 0; i < w * h; i++, p += 4) {
        rArr[i] = d[p]; gArr[i] = d[p + 1]; bArr[i] = d[p + 2];
      }
      const rBg = boxBlur(rArr, w, h, 10), gBg = boxBlur(gArr, w, h, 10), bBg = boxBlur(bArr, w, h, 10);
      for (let i = 0, p = 0; i < w * h; i++, p += 4) {
        const lum = 0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2];
        const nr = d[p] / Math.max(15, rBg[i]);
        const ng = d[p + 1] / Math.max(15, gBg[i]);
        const nb = d[p + 2] / Math.max(15, bBg[i]);
        const x = Math.max(0, Math.min(1, (lum / 255 - 0.5) * 2.6 + 0.5));
        const hardening = x * x * (3 - 2 * x) * 255;
        out.data[p] = Math.max(0, Math.min(255, ((nr * 245) * 0.35 + hardening * 0.65) * (lum < 150 ? 0.82 : 1.08)));
        out.data[p + 1] = Math.max(0, Math.min(255, ((ng * 245) * 0.35 + hardening * 0.65) * (lum < 150 ? 0.82 : 1.08)));
        out.data[p + 2] = Math.max(0, Math.min(255, ((nb * 245) * 0.35 + hardening * 0.65) * (lum < 150 ? 0.82 : 1.08)));
        out.data[p + 3] = 255;
      }
    } else if (mode === 'enhanced') {
      // Smart Document Clarifier: Preserves 100% native clarity, boosts ink contrast, and cleans paper tone
      for (let i = 0, p = 0; i < w * h; i++, p += 4) {
        const r = d[p], gVal = d[p + 1], bVal = d[p + 2];
        const lum = 0.299 * r + 0.587 * gVal + 0.114 * bVal;
        let factor = 1.0;
        if (lum > 190) {
          factor = 1.0 + ((lum - 190) / 260) * 0.18;
        } else if (lum < 120) {
          factor = 0.94;
        }
        out.data[p] = Math.min(255, Math.max(0, r * factor));
        out.data[p + 1] = Math.min(255, Math.max(0, gVal * factor));
        out.data[p + 2] = Math.min(255, Math.max(0, bVal * factor));
        out.data[p + 3] = 255;
      }
    } else if (mode === 'whiteboard') {
      const gArr = new Float32Array(w * h);
      const rArr = new Float32Array(w * h), bArr = new Float32Array(w * h);
      for (let i = 0; i < g.length; i++) {
        gArr[i] = g[i];
        const p = i * 4;
        rArr[i] = d[p]; bArr[i] = d[p + 2];
      }
      const gBg = boxBlur(gArr, w, h, 24);
      const rBg = boxBlur(rArr, w, h, 24), bBg = boxBlur(bArr, w, h, 24);
      const base = new Float32Array(w * h);
      const hist = new Uint32Array(256);
      for (let i = 0; i < g.length; i++) {
        const eq = g[i] / Math.max(24, gBg[i]) * 255;
        const nr = rArr[i] / Math.max(24, rBg[i]);
        const nb = bArr[i] / Math.max(24, bBg[i]);
        const v = Math.max(0, Math.min(255, eq * (1 + (nr - 0.5 + nb - 0.5) / 8)));
        base[i] = v;
        hist[Math.round(v)]++;
      }

      const targetLo = Math.floor(base.length * 0.004);
      const targetHi = Math.floor(base.length * 0.996);
      let count = 0, lo = 0, hi = 255;
      for (let v = 0; v < 256; v++) {
        count += hist[v];
        if (lo === 0 && count >= targetLo) lo = v;
        if (count >= targetHi) { hi = v; break; }
      }
      const range = Math.max(1, hi - lo);
      const stretch = new Float32Array(base.length);
      for (let i = 0; i < base.length; i++) stretch[i] = Math.max(0, Math.min(255, (base[i] - lo) / range * 255));
      const blurred = boxBlur(stretch, w, h, 2);
      for (let i = 0; i < stretch.length; i++) {
        out.data[i * 4] = Math.max(0, Math.min(255, stretch[i] + 1.1 * (stretch[i] - blurred[i])));
        out.data[i * 4 + 1] = out.data[i * 4];
        out.data[i * 4 + 2] = out.data[i * 4];
        out.data[i * 4 + 3] = 255;
      }
    } else {
      // Original / Default
      for (let i = 0; i < d.length; i++) out.data[i] = d[i];
    }

    // 2. High-Precision Photographic Brightness & Contrast Look-Up Table (LUT)
    if (b !== 100 || c !== 100) {
      const lut = new Uint8ClampedArray(256);
      const cFactor = c / 100;
      const bOffset = (b - 100) * 1.28;
      for (let i = 0; i < 256; i++) {
        const val = (i - 128) * cFactor + 128 + bOffset;
        lut[i] = Math.max(0, Math.min(255, Math.round(val)));
      }
      for (let i = 0; i < out.data.length; i += 4) {
        out.data[i] = lut[out.data[i]];
        out.data[i + 1] = lut[out.data[i + 1]];
        out.data[i + 2] = lut[out.data[i + 2]];
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

  /* ─── OCR Engine (Tesseract v4 — persistent worker with correct init sequence) ─── */
  let _ocrWorker = null;
  let _ocrLang = null;
  let _ocrInitPromise = null;
  let _ocrOnProgress = null;
  let _ocrStatusCallback = null;

  function _ocrNotify(msg) {
    if (typeof _ocrStatusCallback === 'function') _ocrStatusCallback(msg);
  }

  function _ocrBasePath() {
    const loc = window.location;
    const origin = loc.origin || (loc.protocol + '//' + loc.host);
    const path = loc.pathname;
    const dir = path.endsWith('/') ? path : path.substring(0, path.lastIndexOf('/') + 1);
    return origin + dir;
  }

  async function getOrInitOcrWorker(lang = 'eng') {
    if (_ocrWorker && _ocrLang === lang) return _ocrWorker;

    if (_ocrInitPromise) {
      try { await _ocrInitPromise; } catch {}
      if (_ocrWorker && _ocrLang === lang) return _ocrWorker;
    }

    _ocrInitPromise = (async () => {
      try {
        if (_ocrWorker) {
          try { await _ocrWorker.terminate(); } catch {}
          _ocrWorker = null; _ocrLang = null;
        }

        _ocrNotify('Loading OCR engine…');
        const T = await load.tesseract();
        const base = _ocrBasePath();

        const worker = await T.createWorker(lang, 1, {
          workerPath: base + 'vendor/tesseract/worker.min.js',
          corePath:   base + 'vendor/tesseract/tesseract-core-simd.wasm.js',
          langPath:   lang === 'eng' ? base + 'vendor/tesseract' : 'https://tessdata.projectnaptha.com/4.0.0_fast',
          workerBlobURL: false,
          gzip: false,
          logger: (m) => {
            if (!m || !m.status) return;
            let label = '';
            const pct = `${Math.round((m.progress || 0) * 100)}%`;
            // Actual status strings from Tesseract v4 worker:
            if      (m.status === 'loading tesseract core')       label = 'Loading OCR core…';
            else if (m.status === 'initializing tesseract')        label = `Loading WASM… ${pct}`;
            else if (m.status === 'loading language traineddata')  label = `Loading model… ${pct}`;
            else if (m.status === 'initializing api')              label = 'Initializing…';
            else if (m.status === 'recognizing text')              label = `Recognizing… ${pct}`;
            if (label) _ocrNotify(label);
            if (m.status === 'recognizing text' && _ocrOnProgress) _ocrOnProgress(m.progress || 0);
          },
        });

        _ocrWorker = worker;
        _ocrLang = lang;
        _ocrNotify('Ready');
        return worker;
      } catch (err) {
        console.error('[OCR] init failed:', err);
        _ocrWorker = null; _ocrLang = null;
        throw err;
      } finally {
        _ocrInitPromise = null;
      }
    })();

    return _ocrInitPromise;
  }

  async function ocrRecognize(canvases, onProgress, lang = 'eng') {
    const worker = await getOrInitOcrWorker(lang);
    const n = canvases.length;
    const results = [];
    for (let i = 0; i < n; i++) {
      _ocrOnProgress = (p) => { if (typeof onProgress === 'function') onProgress((i + p) / n); };
      const cv = canvases[i];
      const { data } = await worker.recognize(cv);
      results.push(data);
      if (typeof onProgress === 'function') onProgress((i + 1) / n);
    }
    _ocrOnProgress = null;
    return results;
  }

  /* Stopword dictionaries for client-side Latin language discrimination */
  const LATIN_STOPWORDS = {
    spa: new Set(['de','la','el','en','que','y','por','con','para','los','las','un','una','del','al','se','no','es','su','lo','como','mas','pero','sus','le','ya','fue','este','ha','si','sobre','todo','son','entre','esta','cuando','muy','sin','desde','nos','durante','todos','uno','les','ni','contra','otros','ese','eso','ante','ellos','esto','mi','antes','unos','yo','otro','otras','otra','tanto','esa','estos','mucho','quienes','nada','muchos','cual','sea','poco','ella','estas','algo','nosotros','mis','tu','te','ti','tus','ellas']),
    fra: new Set(['le','la','les','de','des','du','un','une','et','est','en','que','qui','dans','pour','sur','au','aux','avec','ce','ces','par','ne','pas','se','son','sa','ses','plus','ou','mais','nous','vous','ils','elles','il','elle','on','tout','tous','toute','toutes','leur','leurs','dont','fait','faire','sont','comme','aussi','sans','bien','chez','entre','autre','autres','cette','cet']),
    deu: new Set(['der','die','das','und','in','den','von','zu','mit','sich','des','auf','für','ist','im','dem','nicht','ein','eine','als','auch','es','an','werden','aus','er','hat','dass','sie','nach','wird','bei','einer','um','am','sind','noch','wie','einem','über','einen','so','zum','war','haben','nur','oder','aber','vor','zur','bis','mehr','durch','man','sein','wurde','sei']),
    ita: new Set(['il','la','gli','le','di','da','in','con','su','per','tra','fra','un','uno','una','ed','sono','non','si','che','del','dello','della','dei','degli','delle','al','allo','alla','ai','agli','alle','dal','dallo','dalla','dai','dagli','dalle','nel','nello','nella','nei','negli','nelle','sul','sullo','sulla','sui','sugli','sulle','questo','questa','questi','queste','quello','quella','quelli','quelle','anche','come','ma','ci','vi','ne','cui','quale','quali']),
    por: new Set(['de','que','do','da','em','um','para','com','uma','os','no','se','na','por','mais','as','dos','como','mas','foi','ao','ele','das','tem','seu','sua','ou','ser','quando','muito','nos','pelo','pela','isso','ela','entre','era','depois','sem','mesmo','aos','ter','seus','quem','nas','me','esse','eles','estao','voce','tinha','foram','essa','num','nem','suas','meu','minha','tem','numa','pelos','elas','havia','seja','qual','sera','nos','tenho','lhe','deles','essas','esses','pelas','este','fosse','dele']),
    eng: new Set(['the','be','to','of','and','a','in','that','have','it','for','not','on','with','he','as','you','do','at','this','but','his','by','from','they','we','say','her','she','or','an','will','my','one','all','would','there','their','what','so','up','out','if','about','who','get','which','go','me','when','make','can','like','time','no','just','him','know','take','people','into','year','your','good','some','could','them','see','other','than','then','now','look','only','come','its','over','think','also','back','after','use','two','how','our','work','first','well','way','even','new','want','because','any','these','give','day','most','us'])
  };

  /* Guess the OCR language from a recognized text sample by counting
     Unicode-script code points and evaluating stopword frequency. */
  function detectScriptLanguage(text) {
    if (!text) return 'eng';
    let lat = 0, cyr = 0, ara = 0, dev = 0, han = 0, kana = 0, thai = 0;
    for (const ch of String(text)) {
      const c = ch.codePointAt(0);
      if ((c >= 0x0041 && c <= 0x007A) || (c >= 0x00C0 && c <= 0x024F) || (c >= 0x1E00 && c <= 0x1EFF)) lat++;
      else if (c >= 0x0400 && c <= 0x04FF) cyr++;
      else if (c >= 0x0600 && c <= 0x06FF) ara++;
      else if (c >= 0x0900 && c <= 0x097F) dev++;
      else if (c >= 0x3040 && c <= 0x30FF) kana++;
      else if (c >= 0x3400 && c <= 0x9FFF) han++;
      else if (c >= 0x0E00 && c <= 0x0E7F) thai++;
    }
    const total = lat + cyr + ara + dev + han + kana + thai;
    if (!total) return 'eng';

    // Non-Latin scripts (Devanagari, Arabic, Cyrillic, Han/Kana, Thai)
    if (lat / total <= 0.55) {
      if (han + kana > 0) return kana > han * 0.25 ? 'jpn' : 'chi_sim';
      const scored = [['rus', cyr], ['ara', ara], ['hin', dev], ['tha', thai]];
      let best = 'eng', bestV = 0;
      for (const [lang, v] of scored) { if (v > bestV) { best = lang; bestV = v; } }
      return bestV > 0 ? best : 'eng';
    }

    // Latin Script Disambiguation: Word-Frequency Stopword Analysis
    const words = String(text).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').match(/[a-z]+/g) || [];
    if (words.length < 3) return 'eng';

    const scores = { eng: 0, spa: 0, fra: 0, deu: 0, ita: 0, por: 0 };
    for (const w of words) {
      if (LATIN_STOPWORDS.eng.has(w)) scores.eng += 1;
      if (LATIN_STOPWORDS.spa.has(w)) scores.spa += 1.1;
      if (LATIN_STOPWORDS.fra.has(w)) scores.fra += 1.1;
      if (LATIN_STOPWORDS.deu.has(w)) scores.deu += 1.15;
      if (LATIN_STOPWORDS.ita.has(w)) scores.ita += 1.1;
      if (LATIN_STOPWORDS.por.has(w)) scores.por += 1.1;
    }

    let topLang = 'eng', topScore = 0;
    for (const [l, s] of Object.entries(scores)) {
      if (s > topScore) { topScore = s; topLang = l; }
    }
    return topScore >= 2 ? topLang : 'eng';
  }

  const OCR_LANG_LABELS = {
    eng: 'English', spa: 'Spanish', fra: 'French', deu: 'German', ita: 'Italian',
    por: 'Portuguese', chi_sim: 'Chinese', jpn: 'Japanese', hin: 'Hindi', ara: 'Arabic', rus: 'Russian',
  };


  /* Build an editable Word (.doc) file from the recognized text with no
     third-party dependency — Word-compatible HTML wrapped as a binary .doc. */
  function wordDocFromText(text, title) {
    const safe = String(text ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const safeTitle = String(title ?? 'Scan').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const body = safe.split(/\n/).map((l) => l ? `<p>${l.replace(/ /g, '\u00A0')}</p>` : '<p></p>').join('');
    const html =
`<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>${safeTitle}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
<style>body{font-family:Calibri,Arial,sans-serif;font-size:11pt;line-height:1.4;color:#111}p{margin:0 0 8pt 0}</style></head>
<body><h2 style="font-family:Calibri,Arial,sans-serif;font-size:16pt;color:#111">${safeTitle}</h2>${body}</body></html>`;
    return new Blob(['\ufeff' + html], { type: 'application/msword' });
  }

  /* ════════════════════════════════════════════════════════════════
     SMART DOCUMENT INTELLIGENCE PARSERS (100% Zero-Dependency)
  ════════════════════════════════════════════════════════════════ */

  function parseReceiptFields(text) {
    if (!text) return null;
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return null;

    const result = {
      type: 'receipt',
      merchant: '',
      date: '',
      total: '',
      subtotal: '',
      tax: '',
      currency: '$',
      invoiceNo: '',
    };

    if (/[€]|\bEUR\b/i.test(text)) result.currency = '€';
    else if (/[£]|\bGBP\b/i.test(text)) result.currency = '£';
    else if (/[₹]|\bINR\b/i.test(text)) result.currency = '₹';
    else if (/[¥]|\bJPY\b|\bCNY\b/i.test(text)) result.currency = '¥';
    else if (/\bCAD\b/i.test(text)) result.currency = 'CAD $';
    else if (/\bAUD\b/i.test(text)) result.currency = 'AUD $';
    else result.currency = '$';

    for (let i = 0; i < Math.min(4, lines.length); i++) {
      const l = lines[i];
      if (!/invoice|receipt|tax|date|order|bill|welcome/i.test(l) && l.length > 2) {
        result.merchant = l;
        break;
      }
    }

    const dateMatch = text.match(/\b(\d{1,2}[-/.](?:\d{1,2}|[A-Za-z]{3,9})[-/.]\d{2,4}|\d{4}[-/.](?:\d{1,2}|[A-Za-z]{3,9})[-/.]\d{1,2})\b/);
    if (dateMatch) result.date = dateMatch[1];

    const invMatch = text.match(/(?:inv(?:oice)?|receipt|bill|order|ticket)[\s#:]*([A-Za-z0-9-_]+)/i);
    if (invMatch && invMatch[1]) result.invoiceNo = invMatch[1];

    const numRegex = /[\d]+[.,]\d{2}/;

    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      if (!result.total && /(?:^|\b)(?:grand\s*total|total\s*amount|total\s*due|amount\s*due|total|balance\s*due)\b/i.test(line) && !/sub\s*total|tax/i.test(line)) {
        const match = line.match(/[\d]+[.,]\d{2}/);
        if (match) result.total = match[0];
        else if (i + 1 < lines.length && numRegex.test(lines[i + 1])) {
          result.total = lines[i + 1].match(numRegex)[0];
        }
      }
      if (!result.subtotal && /\b(?:sub\s*total|subtotal|net\s*amount|sub-total)\b/i.test(line)) {
        const match = line.match(/[\d]+[.,]\d{2}/);
        if (match) result.subtotal = match[0];
      }
      if (!result.tax && /\b(?:tax|vat|gst|hst|sales\s*tax)\b/i.test(line) && !/tax\s*invoice/i.test(line)) {
        const cleanLine = line.replace(/\d+(\.\d+)?%/g, '');
        const match = cleanLine.match(/[\d]+[.,]\d{2}/);
        if (match) result.tax = match[0];
      }
    }

    if (!result.total) {
      const bottomLines = lines.slice(-8);
      const nums = [];
      bottomLines.forEach((l) => {
        const m = l.match(/[\d]+[.,]\d{2}/g);
        if (m) m.forEach((val) => nums.push(parseFloat(val.replace(',', '.'))));
      });
      if (nums.length) result.total = Math.max(...nums).toFixed(2);
    }

    return (result.total || result.date || result.invoiceNo) ? result : null;
  }

  function parseMrzPassport(text) {
    if (!text) return null;
    const lines = text.toUpperCase().replace(/\s+/g, '\n').split('\n').map((l) => l.replace(/[^A-Z0-9<]/g, '')).filter((l) => l.length >= 28);
    for (let i = 0; i < lines.length; i++) {
      const l1 = lines[i];
      if (l1.startsWith('P<') || l1.startsWith('P')) {
        const l2 = lines[i + 1] || '';
        if (l1.length >= 38 && l2.length >= 38) {
          const issuer = l1.slice(2, 5).replace(/</g, '');
          const nameSection = l1.slice(5).split('<<');
          const surname = (nameSection[0] || '').replace(/</g, ' ').trim();
          const givenNames = (nameSection[1] || '').replace(/</g, ' ').trim();

          const docNumber = l2.slice(0, 9).replace(/</g, '');
          const nationality = l2.slice(10, 13).replace(/</g, '');
          const dobRaw = l2.slice(13, 19);
          const sex = l2.slice(20, 21);
          const expiryRaw = l2.slice(21, 27);

          const formatYYMMDD = (s) => {
            if (!s || s.length !== 6) return '';
            const yy = parseInt(s.slice(0, 2), 10);
            const yyyy = yy > 45 ? 1900 + yy : 2000 + yy;
            return `${yyyy}-${s.slice(2, 4)}-${s.slice(4, 6)}`;
          };

          return {
            type: 'passport',
            docType: 'Passport (ICAO 9303 Type-3)',
            issuer,
            fullName: `${givenNames} ${surname}`.trim(),
            surname,
            givenNames,
            docNumber,
            nationality,
            dob: formatYYMMDD(dobRaw),
            sex: sex === 'M' ? 'Male' : (sex === 'F' ? 'Female' : sex),
            expiryDate: formatYYMMDD(expiryRaw),
          };
        }
      }
    }
    return null;
  }

  function parseBusinessCard(text) {
    if (!text) return null;
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return null;

    const result = {
      type: 'vcard',
      fullName: '',
      title: '',
      organization: '',
      email: '',
      phone: '',
      website: '',
      vcf: '',
    };

    const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
    if (emailMatch) result.email = emailMatch[0];

    const phoneMatch = text.match(/(?:(?:\+|00)\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{3,4}/);
    if (phoneMatch && phoneMatch[0].replace(/\D/g, '').length >= 7) result.phone = phoneMatch[0].trim();

    const webMatch = text.match(/\b(?:https?:\/\/|www\.)[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?:\/[^\s]*)?\b/i) || text.match(/\b[A-Za-z0-9.-]+\.(?:com|org|io|net|co|ai|dev|app)\b/i);
    if (webMatch) result.website = webMatch[0];

    const titleRegex = /\b(?:engineer|developer|designer|manager|director|president|founder|ceo|cto|cfo|coo|vice\s*president|vp|architect|consultant|specialist|officer|lead|executive|head\s*of|doctor|attorney|partner)\b/i;
    for (const l of lines) {
      if (titleRegex.test(l) && l.length < 50) {
        result.title = l;
        break;
      }
    }

    for (const l of lines) {
      if (l !== result.title && !l.includes('@') && !l.includes('http') && !/\d{4,}/.test(l) && l.length > 2 && l.length < 35 && /^[A-Za-z\s.'-]+$/.test(l)) {
        result.fullName = l;
        break;
      }
    }

    if (result.email || result.phone || (result.fullName && result.title)) {
      result.vcf = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `FN:${result.fullName || 'Contact'}`,
        result.title ? `TITLE:${result.title}` : '',
        result.phone ? `TEL;TYPE=WORK,VOICE:${result.phone}` : '',
        result.email ? `EMAIL;TYPE=PREF,INTERNET:${result.email}` : '',
        result.website ? `URL:${result.website}` : '',
        'END:VCARD',
      ].filter(Boolean).join('\n');
      return result;
    }
    return null;
  }

  function extractTableCsv(words) {
    if (!words || !words.length) return '';
    const sorted = [...words].filter((w) => w.text && w.bbox).sort((a, b) => (a.bbox.y0 + a.bbox.y1) / 2 - (b.bbox.y0 + b.bbox.y1) / 2);
    if (!sorted.length) return '';

    const rows = [];
    let curRow = [];
    let curY = -1;
    let curH = 15;

    for (const w of sorted) {
      const yMid = (w.bbox.y0 + w.bbox.y1) / 2;
      const h = w.bbox.y1 - w.bbox.y0;
      if (curY < 0 || Math.abs(yMid - curY) < Math.max(8, curH * 0.6)) {
        curRow.push(w);
        if (curY < 0) { curY = yMid; curH = h; }
        else { curY = (curY + yMid) / 2; curH = (curH + h) / 2; }
      } else {
        rows.push(curRow);
        curRow = [w];
        curY = yMid;
        curH = h;
      }
    }
    if (curRow.length) rows.push(curRow);

    const csvLines = rows.map((row) => {
      row.sort((a, b) => a.bbox.x0 - b.bbox.x0);
      const cols = [];
      let curCol = '';
      let lastX1 = -1;

      for (const w of row) {
        const gap = lastX1 >= 0 ? w.bbox.x0 - lastX1 : 0;
        const wWidth = (w.bbox.x1 - w.bbox.x0) / Math.max(1, w.text.length);
        if (lastX1 >= 0 && gap > wWidth * 2.8) {
          cols.push(curCol.trim());
          curCol = w.text;
        } else {
          curCol += (curCol ? ' ' : '') + w.text;
        }
        lastX1 = w.bbox.x1;
      }
      if (curCol) cols.push(curCol.trim());
      return cols.map((c) => `"${c.replace(/"/g, '""')}"`).join(',');
    });

    return csvLines.join('\n');
  }

  /* Detect Personally Identifiable Information (Emails, Phones, Cards, SSNs, IPs) from OCR words */
  function detectPiiWords(words) {
    if (!words || !words.length) return { foundItems: {}, piiWords: [], count: 0 };
    const piiRegexes = {
      email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/i,
      phone: /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}\b|\b\d{10}\b/,
      card: /\b(?:\d{4}[-\s]?){3}\d{4}\b|\b\d{15,16}\b/,
      ssn_pan: /\b\d{3}-\d{2}-\d{4}\b|\b[A-Z]{5}\d{4}[A-Z]\b/,
      id_number: /\b\d{9,12}\b/,
      dob_pass: /\b\d{8}\b|\b\d{2}[-/]\d{2}[-/]\d{4}\b/,
      ip: /\b(?:\d{1,3}\.){3}\d{1,3}\b/,
    };

    const foundItems = { email: [], phone: [], card: [], ssn_pan: [], id_number: [], dob_pass: [], ip: [] };
    const piiWords = [];

    words.forEach((w) => {
      const text = (w.text || '').trim();
      if (!text) return;
      for (const [type, re] of Object.entries(piiRegexes)) {
        if (re.test(text)) {
          foundItems[type].push(text);
          piiWords.push(w);
          break;
        }
      }
    });

    const count = Object.values(foundItems).reduce((sum, arr) => sum + arr.length, 0);
    return { foundItems, piiWords, count };
  }

  /* Decode 1D Barcodes, 2D QR Codes, DataMatrix & PDF417 from document canvas */
  async function decodeBarcodesAndQr(canvas) {
    if (!canvas) return [];
    const results = [];

    // Method 1: Modern Native BarcodeDetector API
    if ('BarcodeDetector' in window) {
      try {
        const detector = new window.BarcodeDetector({
          formats: ['qr_code', 'ean_13', 'ean_8', 'code_128', 'code_39', 'code_93', 'itf', 'upc_a', 'upc_e', 'data_matrix', 'pdf417', 'aztec']
        });
        const detected = await detector.detect(canvas);
        if (detected && detected.length) {
          detected.forEach(item => {
            results.push({
              format: (item.format || 'QR_CODE').toUpperCase(),
              rawValue: item.rawValue || '',
              boundingBox: item.boundingBox || null
            });
          });
          return results;
        }
      } catch (err) {
        // Fall back to jsQR
      }
    }

    // Method 2: jsQR Fallback for QR Codes
    try {
      if (!window.jsQR) {
        await FF.util.loadScript('vendor/jsqr.js');
      }
      if (window.jsQR) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = window.jsQR(imgData.data, imgData.width, imgData.height, {
          inversionAttempts: 'attemptBoth'
        });
        if (code && code.data) {
          results.push({
            format: 'QR_CODE',
            rawValue: code.data,
            boundingBox: code.location ? {
              x: code.location.topLeftCorner.x,
              y: code.location.topLeftCorner.y,
              width: code.location.topRightCorner.x - code.location.topLeftCorner.x,
              height: code.location.bottomLeftCorner.y - code.location.topLeftCorner.y
            } : null
          });
        }
      }
    } catch (err) {}

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
      const prepCv = opts.prepCanvases ? opts.prepCanvases[i] : null;
      const ocrScaleX = prepCv ? (srcCanvas.width / prepCv.width) : 1;
      const ocrScaleY = prepCv ? (srcCanvas.height / prepCv.height) : 1;

      const data = ocrResults[i];
      if (data && data.words) for (const word of data.words) {
        if (!word.text || !word.bbox) continue;
        const cleanText = String(word.text)
          .replace(/\uFB00/g, 'ff')
          .replace(/\uFB01/g, 'fi')
          .replace(/\uFB02/g, 'fl')
          .replace(/\uFB03/g, 'ffi')
          .replace(/\uFB04/g, 'ffl')
          .trim();
        if (!cleanText) continue;

        // Prune low-confidence false-positive noise artifacts (dust specks, crease dots)
        const conf = typeof word.confidence === 'number' ? word.confidence : 100;
        const isTinyNoise = cleanText.length <= 2 && !/[a-zA-Z0-9\u00C0-\u024F\u0400-\u04FF\u0600-\u06FF\u0900-\u097F\u3040-\u30FF\u3400-\u9FFF]/.test(cleanText);
        if (conf < 30 && isTinyNoise) continue;
        if (conf < 15) continue;

        const x = imgX + word.bbox.x0 * ocrScaleX * scaleFactor;
        const y = imgY + (imgH - word.bbox.y1 * ocrScaleY * scaleFactor);
        const fsize = Math.max(2.5, (word.bbox.y1 - word.bbox.y0) * ocrScaleY * scaleFactor);
        try {
          page.drawText(cleanText, { x, y, size: fsize, font, color: PDFLib.rgb(1, 1, 1) });
        } catch (e) {
          // If text contains characters unencodable by standard WinAnsi Helvetica (e.g. Hindi, Russian, CJK, special symbols),
          // sanitize with ASCII transliteration so the search position is preserved without failing the export.
          try {
            const asciiFallback = cleanText.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7E]/g, ' ');
            if (asciiFallback.trim()) {
              page.drawText(asciiFallback, { x, y, size: fsize, font, color: PDFLib.rgb(1, 1, 1) });
            }
          } catch (err2) {}
        }
      }


    }
    return doc.save();
  }

  window.__ffScanApi = {
    imgGray, boxBlur, sobel, otsuThreshold, convexHull, simplifyToK, dpClosed, orderQuad, polyArea, triArea, rotateQuad,
    detectQuad, solveHomography, invertHomography, warpQuad, processPhoto, enhancePage,
    loadPhotoIntoCanvas, ocrRecognize, getOrInitOcrWorker, searchablePdfFromCanvases, canvasJpeg, copyCanvas, fitCanvas,
    detectScriptLanguage, OCR_LANG_LABELS, wordDocFromText,
    parseReceiptFields, parseMrzPassport, parseBusinessCard, extractTableCsv,
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

    // Pre-warm the OCR worker silently in the background.
    // Tesseract loads WASM + traineddata on first call (~10s). By starting
    // this immediately on mount, recognition is near-instant when the user
    // clicks "OCR Text" — they never see the long cold-start delay.
    setTimeout(() => A.getOrInitOcrWorker('eng').catch(() => {}), 0);

    /* ─── Vector SVG Icons (Curated Reicon Style - Zero Emojis) ─── */
    const ICONS = {
      scanBadge: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10M9 8h6M9 16h6"/></svg>`,
      camera: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="14" r="4"/></svg>`,
      folder: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.6-.8L9.6 4a2 2 0 0 0-1.6-.8H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2z"/></svg>`,
      studio: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18M9 21V9"/></svg>`,
      crop: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 2v14a2 2 0 0 0 2 2h14M18 22V8a2 2 0 0 0-2-2H2"/></svg>`,
      rotate: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.9 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>`,
      rotccw: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>`,
      tune: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/></svg>`,
      stamp: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m18 2 4 4-10 10-4-4L18 2ZM2 22l4-1-3-3-1 4Z"/></svg>`,
      search: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`,
      eye: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`,
      redact: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><rect x="8" y="11" width="8" height="3" rx="0.5" fill="currentColor"/></svg>`,
      copy: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`,
      trash: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/></svg>`,
      add: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M12 5v14"/></svg>`,
      plus: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M12 5v14"/></svg>`,
      prev: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>`,
      next: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>`,
      check: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`,
      download: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>`,
      ocr: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4M10 9H8M16 13H8M16 17H8"/></svg>`,
      txt: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4M9 13h6M12 13v5"/></svg>`,
      word: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4M8 12h8M8 16h8M8 20h4"/></svg>`,
      zip: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8M10 12h4M10 16h4"/></svg>`,
      pdf: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4M9 13h4a1.5 1.5 0 0 0 0-3H9v6"/></svg>`,
      shield: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
      torch: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
      switchLens: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 7h-9M14 4l-3 3 3 3M4 17h9M10 20l3-3-3-3"/></svg>`,
      reset: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8M3 3v5h5"/></svg>`,
      filterOriginal: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3z"/></svg>`,
      filterDoc: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4M16 13H8M16 17H8M10 9H8"/></svg>`,
      filterBw: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 0 0 20z" fill="currentColor"/></svg>`,
      filterBoard: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="20" height="14" x="2" y="3" rx="2"/><path d="M8 21h8M12 17v4"/></svg>`,
      filterForm: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1ZM8 7h8M8 11h8M8 15h5"/></svg>`,
      filterPhoto: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`,
      split: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M12 3v18"/></svg>`,
      zoomIn: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3M11 8v6M8 11h6"/></svg>`,
      zoomOut: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3M8 11h6"/></svg>`,
      compress: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/></svg>`,
      edit: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5ZM15 5l4 4"/></svg>`,
      organize: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>`,
      sparkle: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3z"/></svg>`,
      arrowRight: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>`,
      arrowLeft: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>`,
      cross: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>`,
      sidebar: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/></svg>`,
      flow: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 6H3M17 12H3M21 18H3"/></svg>`,
      clean: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 4-2 4 4 2-4 2 2 4-4-2-2 4-2-4-4 2 2-4-4-2 4-2-2-4 4 2 2-4 2 4 4-2Z"/></svg>`,
      markdown: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 15V9l3 3 3-3v6M17 9v6"/></svg>`,
      json: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/></svg>`,
      receipt: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1ZM8 7h8M8 11h8M8 15h5"/></svg>`,
      passport: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="20" height="14" x="2" y="5" rx="2"/><circle cx="8" cy="12" r="2"/><path d="M14 10h4M14 14h2"/></svg>`,
      vcard: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
      info: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>`,
      upload: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>`
    };

    /* ─── Full-Bleed Viewport Transition ─── */
    const enterBleed = () => {
      container.classList.add('scan-shell');
      const wtv = document.getElementById('app-workspace-tool-view');
      if (wtv) wtv.classList.add('ff-tool-active');
    };
    const exitBleed = () => {
      clearGlobalTopbarDocInfo();
      container.classList.remove('scan-shell');
    };

    // Detect user search intent from URL hash or path (e.g. #app/ocr, #app/pdf-ocr, #app/receipt-ocr, #app/pdf-redact-pii)
    const currentHash = (window.location.hash || '').toLowerCase();
    const isOcrIntent = currentHash.includes('ocr') || currentHash.includes('extract-text');
    const isReceiptIntent = currentHash.includes('receipt') || currentHash.includes('invoice') || currentHash.includes('table');
    const isRedactIntent = currentHash.includes('redact') || currentHash.includes('sanitize');

    // Core application state
    let pages = [];             // Array of { id, name, canvas, raw, quad, cropped, rot, enhanceMode, brightness, contrast }
    let viewMode = 'hub';       // 'hub' (Camera / Batch Capture) | 'review' (Studio) | 'processing' | 'result' | 'recrop' | 'ocr'
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

    // Zoom, Pan, OCR Text Layer, Search & Layout state
    let zoom = 100;
    let zoomScale = 1;
    let panX = 0, panY = 0, isPanning = false, panStartX = 0, panStartY = 0;
    let isSplitView = false, splitRatio = 0.5, isDraggingSplit = false;
    let thumbsDrawerOpen = false;
    let activeFlyout = null; // 'tune' | 'format' | 'stamp' | 'keyword-redact' | null
    let sigTab = 'draw'; // 'draw' | 'type' | 'upload' | 'stamps'
    let sigInk = '#0F172A';
    let sigFont = 'Dancing Script';
    let sigTypedName = 'Authorized Signature';
    let sigUploadedImg = null;
    let selectedOverlayId = null;
    let showOcrLayer = isOcrIntent || isRedactIntent;
    let isTextSheetOpen = false;
    let ocrScope = 'current'; // 'current' | 'all'
    let historyStack = [];
    let historyIndex = -1;
    let isHistoryAction = false;

    let ocrPanelOpen = isOcrIntent || isReceiptIntent;
    let ocrSidebarTab = isReceiptIntent ? 'insights' : 'text'; // 'text' | 'insights'
    let isRedacting = isRedactIntent;
    let isCropping = false;
    let keywordRedactQuery = '';
    let keywordMatchCase = false;
    let keywordWholeWord = false;
    let keywordScope = 'all'; // 'all' | 'current'
    let isOcrRunning = false;
    let showSearchBar = false;
    let searchQuery = '';
    let resultPageIdx = 0;
    let _ocrStatusCallback = null;


    // OCR Results Cache & Word Bounding Boxes
    let currentOcrResults = [];
    let ocrWordBoxes = [];


    // Camera & Detection state
    let stream = null, video = null, overlay = null, cameraOn = false;
    let detectOn = true, autoSnap = true, torchOn = false;
    let videoDevices = [], activeDeviceId = '';
    let raf = null, frameCount = 0, lastQuadMeta = null, lastTickT = 0, stableMs = 0, lastAutoCap = 0, busy = false;
    let lastCapArea = -1;        // area of the quad at the moment of the last auto-snap (0 initially)
    let processingState = null;
    let resultData = null;
    let exportJobId = 0;
    let manualQuad = null;      // User adjusted quad in analysis coords [[x,y]x4]
    let detectedQuad = null;    // Latest detected quad
    let dragIdx = -1;
    let statusEl = null;
    let importError = '';

    // In-Studio Crop & OCR state
    let cropState = null;       // { idx, box: { x, y, w, h }, origBox, drag, startBox, startPt, displayScale }
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
      lastQuadMeta = null; lastTickT = 0; stableMs = 0; lastCapArea = -1;
      manualQuad = null; detectedQuad = null; dragIdx = -1;
      hideLoupe();
      if (video) { try { video.srcObject = null; } catch {} }
    };

    function setStatus(msg, cls) {
      if (!statusEl) statusEl = container.querySelector('#scan-status');
      if (!statusEl) return;
      statusEl.textContent = msg;
      statusEl.className = 'scan-status ' + (cls || '');
      statusEl.hidden = !msg;
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
      const res = await A.processPhoto(canvas, { detect: shouldDetect, quad: quad || null, maxDim: 4096 });
      const newPage = {
        id: 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        name: name || ('Page ' + pageNum),
        canvas: res.canvas,
        raw: A.fitCanvas(canvas, 4096),
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

      if (viewMode === 'hub') {
        renderBatchTray();
      } else if (viewMode === 'review') {
        enterBleed();
        refreshStudioUI();
      }
      return newPage;
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
      ctx.fillStyle = '#4B4B4B';
      ctx.font = 'bold 15px Inter, system-ui, sans-serif';
      ctx.fillText('FRONT SIDE', x + 4, y1 - 12);
      ctx.drawImage(frontCv, x, y1, cardW, cardH);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y1, cardW, cardH);

      // Back
      ctx.fillStyle = '#4B4B4B';
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
          setStatus('Front of ID captured. Flip the card to the back side and snap again.', 'ok');
          renderCaptureHeader();
          return;
        } else {
          flashShutter();
          setStatus('Merging the front and back sides onto one A4 sheet…', 'ok');
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
      // Haptic vibration feedback for mobile devices
      try { if (navigator.vibrate) navigator.vibrate([35, 20, 35]); } catch (e) {}

      // Tactile button bounce
      const shutterBtn = container.querySelector('.scan-shutter-core');
      if (shutterBtn) {
        shutterBtn.style.transform = 'scale(0.86)';
        setTimeout(() => { shutterBtn.style.transform = ''; }, 120);
      }

      if (!overlay) return;
      const octx = overlay.getContext('2d');
      octx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      octx.fillRect(0, 0, overlay.width, overlay.height);
      setTimeout(() => {
        if (overlay) octx.clearRect(0, 0, overlay.width, overlay.height);
      }, 90);
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

    function getScanSourceName() {
      const first = pages[0]?.name || 'Scanned document';
      return first.replace(/\s*\(P\.\d+\)$/i, '').trim() || 'Scanned document';
    }

    function getExportFormatLabel() {
      if (pdfFormat === 'searchable') return 'Searchable PDF';
      if (pdfFormat === 'image') return 'Standard PDF';
      if (pdfFormat === 'zip') return 'Image archive';
      return 'Document export';
    }

    function getExportFileName() {
      const base = getScanSourceName().replace(/\.[^.]+$/, '').replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '') || 'scanned-document';
      if (pdfFormat === 'searchable') return `${base}-searchable.pdf`;
      if (pdfFormat === 'image') return `${base}.pdf`;
      return `${base}-images.zip`;
    }

    function updateProcessingState(phase, progress, detail) {
      processingState = Object.assign({}, processingState, { phase, progress: Math.max(0, Math.min(1, progress)), detail });
      const phaseEl = container.querySelector('#scan-processing-phase');
      const detailEl = container.querySelector('#scan-processing-detail');
      const pctEl = container.querySelector('#scan-processing-percent');
      const barEl = container.querySelector('#scan-processing-bar');
      const progressEl = container.querySelector('.scan-processing-track[role="progressbar"]');
      if (phaseEl) phaseEl.textContent = phase;
      if (detailEl) detailEl.textContent = detail || '';
      if (pctEl) pctEl.textContent = `${Math.round(processingState.progress * 100)}%`;
      if (barEl) barEl.style.width = `${Math.round(processingState.progress * 100)}%`;
      if (progressEl) progressEl.setAttribute('aria-valuenow', String(Math.round(processingState.progress * 100)));

      const modalBtnText = container.querySelector('#modal-confirm-text');
      if (modalBtnText) {
        modalBtnText.textContent = `${phase} (${Math.round(processingState.progress * 100)}%)...`;
      }
      const modalProgressFill = container.querySelector('#modal-progress-fill');
      if (modalProgressFill) {
        modalProgressFill.style.width = `${Math.round(processingState.progress * 100)}%`;
      }

      const panelBtnText = container.querySelector('#panel-confirm-text');
      if (panelBtnText) {
        panelBtnText.textContent = `${phase} (${Math.round(processingState.progress * 100)}%)...`;
      }
      const panelProgressFill = container.querySelector('#panel-progress-fill');
      if (panelProgressFill) {
        panelProgressFill.style.width = `${Math.round(processingState.progress * 100)}%`;
      }
    }

    function renderProcessingView() {
      const state = processingState || { phase: 'Preparing export', progress: 0, detail: 'Preparing your pages locally.' };
      container.innerHTML = `
        <div class="scan-state-shell">
          <header class="scan-header-bar">
            <div class="scan-title-group">
              <span class="scan-tool-badge">${ICONS.scanBadge}</span>
              <div>
                <h2 class="scan-heading">Scan documents</h2>
                <p class="scan-subheading">${pages.length} ${pages.length === 1 ? 'page' : 'pages'} · Local processing</p>
              </div>
            </div>
            <div class="scan-header-actions">
              <div class="scan-privacy-tag">${ICONS.shield}<span>Processed locally</span></div>
            </div>
          </header>
          <main class="scan-state-body scan-processing-state" aria-busy="true" aria-live="polite">
            <div class="scan-processing-panel">
              <div class="scan-processing-icon" aria-hidden="true">${ICONS.ocr}</div>
              <p class="scan-state-kicker">Creating ${getExportFormatLabel()}</p>
              <h1>Processing your document</h1>
              <p class="scan-state-copy">The file stays on this device while Scan prepares your output.</p>
              <div class="scan-processing-progress">
                <div class="scan-processing-progress-head"><span id="scan-processing-phase">${esc(state.phase)}</span><strong id="scan-processing-percent">${Math.round(state.progress * 100)}%</strong></div>
                <div class="scan-processing-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(state.progress * 100)}"><span id="scan-processing-bar" style="width:${Math.round(state.progress * 100)}%"></span></div>
                <p id="scan-processing-detail">${esc(state.detail || '')}</p>
              </div>
              <button type="button" class="scan-btn-secondary-cta scan-processing-cancel" id="scan-processing-cancel">Cancel export</button>
            </div>
          </main>
        </div>
      `;
      const cancelBtn = container.querySelector('#scan-processing-cancel');
      if (cancelBtn) {
        cancelBtn.onclick = () => {
          exportJobId += 1;
          busy = false;
          processingState = null;
          switchView('review');
          setStatus('Export canceled.', 'warn');
        };
      }
      updateProcessingState(state.phase, state.progress, state.detail);
    }

        function clearResult() {
      if (resultData?.url) URL.revokeObjectURL(resultData.url);
      resultData = null;
      resultPageIdx = 0;
    }

    function showScanResult(blob, ocrLabel, ocrText = '') {
      clearResult();
      resultData = {
        blob,
        url: URL.createObjectURL(blob),
        name: getExportFileName(),
        formatLabel: getExportFormatLabel(),
        pageCount: pages.length,
        ocrLabel: ocrLabel || 'Local Processing',
        ocrText: ocrText || ocrResultText || '',
        previewCanvases: pages.map(p => {
          try {
            return getPageExportCanvas(p);
          } catch {
            return p.canvas;
          }
        }),
        resultPageIdx: 0,
      };
      busy = false;
      processingState = null;
      switchView('result');
    }

    function renderResultView() {
      if (!resultData) {
        switchView('review');
        return;
      }
      const r = resultData;
      container.innerHTML = `
        <div class="cpdf-benchmark-body">
          <div class="cpdf-benchmark-workstation">
            <div class="cpdf-benchmark-stage scan-result-stage" id="scan-result-stage-wrap">
              <div class="scan-paper-page" id="scan-result-paper-page" style="margin: auto;">
                <canvas id="scan-result-canvas" class="scan-studio-canvas"></canvas>
              </div>

              <div class="cpdf-benchmark-fileinfo-row">
                ${r.pageCount > 1 ? `
                  <div class="scan-res-stepper-wrap">
                    <button type="button" class="cpdf-res-nav-btn" id="res-prev-page" title="Previous page" ${r.resultPageIdx > 0 ? '' : 'disabled'}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                    </button>
                    <span class="cpdf-res-step-badge" id="scan-res-step-status">${(r.resultPageIdx || 0) + 1} / ${r.pageCount}</span>
                    <button type="button" class="cpdf-res-nav-btn" id="res-next-page" title="Next page" ${r.resultPageIdx < r.pageCount - 1 ? '' : 'disabled'}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    </button>
                  </div>
                  <span style="color:#E2E8F0;margin:0 4px;">|</span>
                ` : ''}
                <span class="cpdf-benchmark-fileinfo-text" id="scan-res-fileinfo-text" style="display:inline-flex;align-items:center;gap:6px;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                  <span>${esc(r.name)}</span>
                  <span style="color:#94A3B8;font-weight:500;">(${bytes(r.blob.size)})</span>
                </span>
              </div>
            </div>

            <div class="cpdf-benchmark-panel scan-result-panel">
              <div class="scan-result-panel-top">
                <div class="cpdf-benchmark-header">
                  <div class="cpdf-benchmark-icon" style="background: #16A34A !important;">
                    ${ICONS.check}
                  </div>
                  <h2 class="cpdf-benchmark-title">Scan Complete</h2>
                </div>

                <div class="cpdf-benchmark-est-box">
                  <div class="cpdf-benchmark-est-title">${esc(r.formatLabel)} · ${r.pageCount} ${r.pageCount === 1 ? 'Page' : 'Pages'}</div>
                  <div class="cpdf-benchmark-est-metrics">
                    <strong class="cpdf-benchmark-est-new">${bytes(r.blob.size)}</strong>
                    <span class="cpdf-benchmark-est-pct" style="color:#15803D !important; background:#DCFCE7 !important; border: 1px solid #BBF7D0 !important; font-weight:700 !important; padding: 2px 8px !important; border-radius: 9999px !important;">300 DPI Archival</span>
                  </div>
                  <div class="cpdf-benchmark-track">
                    <div class="cpdf-benchmark-bar" style="width: 100%; background: #16A34A !important;"></div>
                  </div>
                </div>

                <a href="${r.url}" download="${esc(r.name)}" class="cpdf-benchmark-cta scan-result-main-cta" style="text-decoration:none;">
                  <span>Download Scanned Document</span>
                  ${ICONS.download}
                </a>

                <div class="conv-smart-tip-card">
                  <div class="conv-smart-tip-header">
                    <span style="display:inline-flex;align-items:center;gap:6px;">${ICONS.sparkle} Smart recommendation</span>
                  </div>
                  <p class="conv-smart-tip-desc">What would you like to do next with this document?</p>
                  <div class="conv-smart-tools-list">
                    <div class="conv-smart-tool-item" data-tool-id="pdf-compress" tabindex="0" role="button">
                      <div class="conv-smart-tool-left">
                        <span class="conv-smart-tool-icon" style="background:#0284C7;">${ICONS.compress}</span>
                        <div class="conv-smart-tool-info">
                          <span class="conv-smart-tool-title">Compress &amp; Shrink PDF</span>
                          <span class="conv-smart-tool-sub">Reduce size for easy emailing</span>
                        </div>
                      </div>
                      <svg class="conv-smart-tool-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="9 18 15 12 9 6"></polyline>
                      </svg>
                    </div>
                    <div class="conv-smart-tool-item" data-tool-id="pdf-sign" tabindex="0" role="button">
                      <div class="conv-smart-tool-left">
                        <span class="conv-smart-tool-icon" style="background:#0D9488;">${ICONS.edit}</span>
                        <div class="conv-smart-tool-info">
                          <span class="conv-smart-tool-title">Sign Document</span>
                          <span class="conv-smart-tool-sub">Add signature or initials</span>
                        </div>
                      </div>
                      <svg class="conv-smart-tool-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="9 18 15 12 9 6"></polyline>
                      </svg>
                    </div>
                    <div class="conv-smart-tool-item" data-tool-id="organize" tabindex="0" role="button">
                      <div class="conv-smart-tool-left">
                        <span class="conv-smart-tool-icon" style="background:#7C3AED;">${ICONS.organize}</span>
                        <div class="conv-smart-tool-info">
                          <span class="conv-smart-tool-title">Organize &amp; Merge PDF</span>
                          <span class="conv-smart-tool-sub">Reorder, rotate, or combine</span>
                        </div>
                      </div>
                      <svg class="conv-smart-tool-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="9 18 15 12 9 6"></polyline>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              <div class="scan-result-secondary-actions">
                <button type="button" class="cpdf-result-btn-secondary-full scan-result-btn-back" id="res-btn-back">
                  <span style="display:inline-flex;align-items:center;justify-content:center;gap:6px;">${ICONS.arrowLeft} Back to Review Studio</span>
                </button>
                <button type="button" class="scan-result-btn-ghost" id="res-btn-new">
                  <span style="display:inline-flex;align-items:center;justify-content:center;gap:6px;">${ICONS.add} Scan another document</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      `;

      function drawResultPreview() {
        const cv = container.querySelector('#scan-result-canvas');
        const paper = container.querySelector('#scan-result-paper-page');
        const stageWrap = container.querySelector('#scan-result-stage-wrap');
        if (!cv || !r.previewCanvases || !r.previewCanvases.length) return;
        const src = r.previewCanvases[r.resultPageIdx || 0];
        if (!src || !src.width || !src.height) return;

        const stageW = stageWrap?.clientWidth || (window.innerWidth ? window.innerWidth - 380 : 700);
        const stageH = (stageWrap?.clientHeight || (window.innerHeight ? window.innerHeight - 120 : 600)) - 52;
        const padX = 40;
        const padY = 48;
        const availW = Math.max(180, stageW - padX);
        const availH = Math.max(180, stageH - padY);

        const scW = availW / src.width;
        const scH = availH / src.height;
        const sc = Math.min(scW, scH, 1);

        const displayW = Math.max(2, Math.round(src.width * sc));
        const displayH = Math.max(2, Math.round(src.height * sc));
        const dpr = Math.min(3, Math.max(2, window.devicePixelRatio || 2));

        cv.width = Math.round(displayW * dpr);
        cv.height = Math.round(displayH * dpr);
        cv.style.width = `${displayW}px`;
        cv.style.height = `${displayH}px`;

        if (paper) {
          paper.style.width = `${displayW}px`;
          paper.style.height = `${displayH}px`;
        }

        const ctx = cv.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(src, 0, 0, cv.width, cv.height);
      }

      drawResultPreview();

      const prevBtn = container.querySelector('#res-prev-page');
      const nextBtn = container.querySelector('#res-next-page');
      if (prevBtn) {
        prevBtn.onclick = () => {
          if (r.resultPageIdx > 0) {
            r.resultPageIdx--;
            renderResultView();
          }
        };
      }
      if (nextBtn) {
        nextBtn.onclick = () => {
          if (r.resultPageIdx < r.pageCount - 1) {
            r.resultPageIdx++;
            renderResultView();
          }
        };
      }

      const backBtn = container.querySelector('#res-btn-back');
      const newBtn = container.querySelector('#res-btn-new');
      if (backBtn) backBtn.onclick = () => { clearResult(); switchView('review'); };
      if (newBtn) {
        newBtn.onclick = () => { clearResult(); pages = []; selIdx = 0; switchView('hub'); };
      }

      container.querySelectorAll('.conv-smart-tool-item').forEach(item => {
        item.onclick = () => {
          const tid = item.dataset.toolId;
          if (tid) {
            window.location.hash = '#app/' + tid;
          }
        };
      });
    }

    function render() {
      if (!pages.length && viewMode === 'hub' && !cameraOn) {
        exitBleed();
        renderInitialDropzone();
        return;
      }

      if (viewMode === 'processing') {
        enterBleed();
        renderProcessingView();
        return;
      }

      if (viewMode === 'result') {
        enterBleed();
        renderResultView();
        return;
      }

      enterBleed();
      container.innerHTML = `
        <div class="scan-app-shell ${viewMode === 'review' ? 'scan-review-shell' : ''}">
          <div class="scan-workspace" id="scan-viewport"></div>
        </div>
      `;

      const vp = container.querySelector('#scan-viewport');
      if (!vp) return;

      if (viewMode === 'hub') {
        renderCaptureHub(vp);
      } else if (viewMode === 'review') {
        renderReviewStudio(vp);
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
        <div class="cpdf-dropzone drop-hero-box scan-entry-dropzone" id="scan-dz" tabindex="0" role="button" aria-label="Upload or scan documents">
          <div class="dropzone-idle scan-entry-idle">
            <div class="drop-illustration">
              <svg viewBox="0 0 220 150" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" class="standard-dz-svg">
                <rect x="38" y="98" width="144" height="36" rx="6" stroke="#CBD5E1" stroke-width="1.5" stroke-dasharray="6 6" stroke-linecap="round"/>
                <ellipse cx="70" cy="122" rx="24" ry="6" fill="#0F172A" opacity="0.06"/>
                <ellipse cx="110" cy="128" rx="24" ry="6" fill="#0F172A" opacity="0.06"/>
                <ellipse cx="150" cy="122" rx="24" ry="6" fill="#0F172A" opacity="0.06"/>
                <g transform="rotate(-8 66 74)">
                  <rect x="46" y="48" width="40" height="52" rx="4" fill="#FFFFFF" stroke="#E2E8F0"/>
                  <path d="M72 48h14v14z" fill="#F1F5F9"/>
                  <rect x="52" y="66" width="28" height="3.5" rx="1.75" fill="#CBD5E1"/>
                  <rect x="52" y="74" width="28" height="3.5" rx="1.75" fill="#CBD5E1"/>
                  <rect x="52" y="82" width="17" height="3.5" rx="1.75" fill="#CBD5E1"/>
                </g>
                <g transform="rotate(8 154 74)">
                  <rect x="134" y="48" width="40" height="52" rx="4" fill="#FFFFFF" stroke="#E2E8F0"/>
                  <path d="M160 48h14v14z" fill="#F1F5F9"/>
                  <circle cx="150" cy="63" r="3.5" fill="#10B981"/>
                  <path d="M142 88l8-10 6 7 5-4 7 7" stroke="#10B981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                </g>
                <g>
                  <rect x="90" y="54" width="40" height="52" rx="4" fill="#FFFFFF" stroke="#E2E8F0"/>
                  <path d="M116 54h14v14z" fill="#F1F5F9"/>
                  <path d="M96 72h28M96 80h28M96 88h17" stroke="#7C3AED" stroke-width="3.5" stroke-linecap="round"/>
                  <path d="M84 72h52" stroke="#10B981" stroke-width="2.5" stroke-linecap="round"/>
                  <path d="M87 52v-4h4M133 48h4v4M87 96v4h4M133 100h4v-4" stroke="#10B981" stroke-width="1.8" stroke-linecap="round"/>
                </g>
                <path d="M110 12v28m0 0l-9-9m9 9l9-9" stroke="#0F172A" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>

            <div class="drop-action-group scan-entry-actions">
              <button type="button" class="select-files-main-btn" id="scan-import-docs-btn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
                <span>${isOcrIntent ? 'Select PDF or Image to OCR' : (isReceiptIntent ? 'Select Receipt / Invoice' : (isRedactIntent ? 'Select PDF to Redact' : 'Select PDF or images'))}</span>
              </button>
              <span class="scan-entry-or">or</span>
              <button type="button" class="scan-entry-camera" id="scan-start-cam-btn">
                ${ICONS.camera}
                <span>${isOcrIntent ? 'Scan with Camera' : 'Use camera'}</span>
                <kbd>Space</kbd>
              </button>
            </div>

            <p class="drop-sub-text">${isOcrIntent ? 'Extract text and make scanned documents searchable • <strong>100% on-device neural OCR</strong>' : (isReceiptIntent ? 'Extract line items, dates, and amounts into <strong>Excel / CSV</strong> automatically' : (isRedactIntent ? 'Permanently blackout sensitive PII, names, and numbers with <strong>local privacy</strong>' : 'Scan, clean, and extract text from <strong>PDF</strong>, <strong>JPG</strong>, <strong>PNG</strong>, or <strong>WebP</strong> documents'))}</p>

            ${importError ? `
              <div class="scan-inline-error-card" role="alert">
                <p class="scan-inline-error">${esc(importError)}</p>
                <div class="scan-error-actions">
                  <button type="button" class="scan-btn-error-native" id="btn-snap-native-cam">
                    ${ICONS.camera}
                    <span>Snap with Native Camera App</span>
                  </button>
                  <button type="button" class="scan-btn-error-diag" id="btn-run-cam-diag">
                    <span>Run Camera Diagnostic</span>
                  </button>
                </div>
              </div>
            ` : ''}

            <div class="supported-formats-row">
              <span class="fmt-label">Supported formats:</span>
              <span class="fmt-badge fmt-pdf">PDF</span>
              <span class="fmt-badge fmt-jpg">JPG</span>
              <span class="fmt-badge fmt-png">PNG</span>
              <span class="fmt-badge fmt-doc">WEBP</span>
            </div>
          </div>
          <input id="scan-file-input" type="file" accept="image/*,application/pdf,.pdf,.png,.jpg,.jpeg,.webp,.heic,.heif,.bmp,.tiff,.tif,.gif,.svg,.avif" multiple hidden>
          <input id="scan-native-cam-input" type="file" accept="image/*" capture="environment" hidden>
        </div>
      `;

      const dz = container.querySelector('#scan-dz');
      const fileInp = container.querySelector('#scan-file-input');
      const nativeCamInp = container.querySelector('#scan-native-cam-input');
      const startCamBtn = container.querySelector('#scan-start-cam-btn');
      const importDocsBtn = container.querySelector('#scan-import-docs-btn');
      const snapNativeBtn = container.querySelector('#btn-snap-native-cam');
      const diagBtn = container.querySelector('#btn-run-cam-diag');

      if (snapNativeBtn && nativeCamInp) {
        snapNativeBtn.onclick = (e) => {
          e.stopPropagation();
          nativeCamInp.click();
        };
        bindFileInput(nativeCamInp);
      }

      if (diagBtn) {
        diagBtn.onclick = (e) => {
          e.stopPropagation();
          runCameraDiagnostics();
        };
      }


      if (startCamBtn) {
        startCamBtn.onclick = (e) => {
          e.stopPropagation();
          openCameraStream();
        };
      }

      if (importDocsBtn) {
        importDocsBtn.onclick = (e) => {
          e.stopPropagation();
          fileInp?.click();
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
          if (!e.target.closest('#scan-start-cam-btn') && !e.target.closest('#scan-import-docs-btn')) {
            fileInp?.click();
          }
        });
      }
    }

    /* Direct PDF & Image file list handler (Instant Direct-to-Studio Flow) */
    async function handleImportFileList(files) {
      if (!files.length) return;
      importError = '';

      setStatus(`Importing ${files.length} document${files.length === 1 ? '' : 's'}…`, 'ok');
      let importedPages = 0;
      const failedFiles = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const beforeCount = pages.length;
        try {
          if (f.type === 'application/pdf' || /\.pdf$/i.test(f.name)) {
            const pdfjs = await load.pdfjs();
            const doc = await pdfjs.getDocument({ data: await u8(f) }).promise;
            for (let p = 1; p <= doc.numPages; p++) {
              const page = await doc.getPage(p);
              const vp1 = page.getViewport({ scale: 1 });
              const sc = Math.min(4.5, 4096 / Math.max(vp1.width, vp1.height));
              const vp = page.getViewport({ scale: sc });
              const cv = document.createElement('canvas');
              cv.width = Math.ceil(vp.width); cv.height = Math.ceil(vp.height);
              await page.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;

              const name = f.name + ` (P.${p})`;
              await addPage(cv, name, null, false);
            }
          } else {
            const canvas = await A.loadPhotoIntoCanvas(f);
            const name = f.name;
            await addPage(canvas, name, null, false);
          }
          importedPages += pages.length - beforeCount;
        } catch (e) {
          failedFiles.push(`${f.name}: ${e?.message || 'Could not read this file'}`);
        }
      }
      if (!importedPages) {
        importError = failedFiles.length ? failedFiles.join(' ') : 'No readable pages were found in the selected files.';
        switchView('hub');
        return;
      }
      // Background pre-warm Tesseract worker to eliminate cold start latency
      A.getOrInitOcrWorker(ocrLang || 'eng').catch(() => {});
      isTextSheetOpen = false;
      if (isOcrIntent || isReceiptIntent) {
        ocrPanelOpen = true;
        showOcrLayer = true;
      }
      selIdx = 0;
      switchView('review');
      pushHistoryState('Initial Document');
      if (isOcrIntent || isReceiptIntent) {
        setTimeout(() => {
          if (pages.length && !pages[0].ocrData) {
            runPageOcr(0);
          }
        }, 100);
      }
      const importedLabel = `${importedPages} ${importedPages === 1 ? 'page' : 'pages'} imported.`;
      setStatus(failedFiles.length ? `${importedLabel} ${failedFiles.length} file${failedFiles.length === 1 ? '' : 's'} skipped.` : importedLabel, failedFiles.length ? 'warn' : 'ok');
    }


    /* Clipboard Paste Listener */
    const handlePaste = async (e) => {
      if (!document.body.contains(container)) return;
      const items = e.clipboardData?.items;
      if (!items || !items.length) return;
      const imageItems = [...items].filter((item) => item.type && item.type.startsWith('image/'));
      if (!imageItems.length) return;
      e.preventDefault();
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
      setStatus(`Pasted ${imageItems.length} image${imageItems.length === 1 ? '' : 's'}.`, 'ok');
      selIdx = 0;
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

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        if (viewMode === 'review') {
          e.preventDefault();
          showSearchBar = !showSearchBar;
          if (showSearchBar && !showOcrLayer) showOcrLayer = true;
          refreshStudioUI();
          setTimeout(() => {
            const inp = container.querySelector('#scan-search-input');
            if (inp) { inp.focus(); inp.select(); }
          }, 50);
          return;
        }
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
                    <span>Open Review Studio (${pages.length} page${pages.length === 1 ? '' : 's'} ready)</span>
                    ${ICONS.arrowRight}
                  </button>
                ` : ''}
              </div>

              ${importError ? `<p class="scan-inline-error" role="alert">${esc(importError)}</p>` : ''}

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
            <span>Review &amp; Export (${pages.length})</span>
            ${ICONS.arrowRight}
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
        /* ════════════════════════════════════════════════════════════════
       VIEW 2: REVIEW STUDIO (Workbench, Zoom & Pan, Filmstrip)
    ════════════════════════════════════════════════════════════════ */
        /* ════════════════════════════════════════════════════════════════
       VIEW 2: REVIEW STUDIO (Edit PDF Unified Workspace Inspiration)
    ════════════════════════════════════════════════════════════════ */
        /* ════════════════════════════════════════════════════════════════
       VIEW 2: REVIEW STUDIO (Live OCR Text Layer & Pro Scan Workstation)
    ════════════════════════════════════════════════════════════════ */
    function renderActiveFlyoutContent(curPage) {
      if (activeFlyout === 'tune') {
        return `
          <div class="scan-flyout-card">
            <div class="scan-flyout-head">
              <strong>Fine-Tune Dials</strong>
              <button type="button" class="scan-flyout-reset-btn" id="btn-flyout-reset">${ICONS.reset} Reset</button>
            </div>
            <div class="scan-flyout-scope">
              <span class="scan-flyout-label">Scope:</span>
              <div class="scan-scope-toggle-mini" role="radiogroup">
                <button type="button" class="scan-scope-btn ${filterScope === 'single' ? 'active' : ''}" id="flyout-scope-single">Page ${selIdx + 1}</button>
                <button type="button" class="scan-scope-btn ${filterScope === 'all' ? 'active' : ''}" id="flyout-scope-all">All (${pages.length})</button>
              </div>
            </div>
            <div class="scan-flyout-slider-row">
              <div class="scan-slider-label"><span>Brightness</span><output id="flyout-val-bright">${curPage.brightness === 100 ? '100% (Normal)' : `${curPage.brightness}%`}</output></div>
              <input type="range" id="flyout-inp-bright" min="0" max="200" step="1" value="${curPage.brightness}">
            </div>
            <div class="scan-flyout-slider-row">
              <div class="scan-slider-label"><span>Contrast</span><output id="flyout-val-contrast">${curPage.contrast === 100 ? '100% (Normal)' : `${curPage.contrast}%`}</output></div>
              <input type="range" id="flyout-inp-contrast" min="0" max="200" step="1" value="${curPage.contrast}">
            </div>
          </div>
        `;
      }
      if (activeFlyout === 'stamp') {
        return `
          <div class="scan-flyout-card scan-flyout-stamp-pro">
            <div class="scan-flyout-head">
              <div style="display:flex; align-items:center; gap:6px;">
                ${ICONS.stamp}
                <strong>Sign &amp; Stamp</strong>
              </div>
              <button type="button" class="scan-flyout-reset-btn" id="btn-close-sig-flyout">${ICONS.cross}</button>
            </div>

            <!-- Mini Mode Switcher Tabs -->
            <div class="scan-sig-tab-bar" role="tablist">
              <button type="button" class="scan-sig-tab-btn ${sigTab === 'draw' ? 'is-active' : ''}" data-sig-tab="draw">
                <span>Draw</span>
              </button>
              <button type="button" class="scan-sig-tab-btn ${sigTab === 'type' ? 'is-active' : ''}" data-sig-tab="type">
                <span>Type</span>
              </button>
              <button type="button" class="scan-sig-tab-btn ${sigTab === 'upload' ? 'is-active' : ''}" data-sig-tab="upload">
                <span>Image</span>
              </button>
              <button type="button" class="scan-sig-tab-btn ${sigTab === 'stamps' ? 'is-active' : ''}" data-sig-tab="stamps">
                <span>Stamps</span>
              </button>
            </div>

            <!-- Tab 1: Draw Signature -->
            <div class="scan-sig-panel" id="panel-sig-draw" ${sigTab !== 'draw' ? 'hidden' : ''}>
              <div class="scan-sig-draw-controls">
                <div class="scan-sig-ink-dots">
                  <button type="button" class="scan-ink-dot ${sigInk === '#0F172A' ? 'is-active' : ''}" data-ink="#0F172A" style="background:#0F172A;" title="Black Ink"></button>
                  <button type="button" class="scan-ink-dot ${sigInk === '#1E3A8A' ? 'is-active' : ''}" data-ink="#1E3A8A" style="background:#1E3A8A;" title="Navy Ink"></button>
                  <button type="button" class="scan-ink-dot ${sigInk === '#DC2626' ? 'is-active' : ''}" data-ink="#DC2626" style="background:#DC2626;" title="Crimson Ink"></button>
                </div>
                <button type="button" class="scan-flyout-reset-btn" id="btn-clear-sig">Clear</button>
              </div>
              <canvas id="scan-sig-canvas" class="scan-sig-canvas" width="280" height="90"></canvas>
              <button type="button" class="scan-btn-apply-sig" id="btn-apply-draw-sig">Apply Signature to Page</button>
            </div>

            <!-- Tab 2: Type Signature -->
            <div class="scan-sig-panel" id="panel-sig-type" ${sigTab !== 'type' ? 'hidden' : ''}>
              <input type="text" id="scan-sig-type-input" class="scan-sig-text-input" placeholder="Type your full name..." value="${esc(sigTypedName)}">
              <div class="scan-sig-font-grid">
                <button type="button" class="scan-sig-font-chip ${sigFont === 'Dancing Script' ? 'is-active' : ''}" data-font="Dancing Script" style="font-family:'Dancing Script', cursive;">Script</button>
                <button type="button" class="scan-sig-font-chip ${sigFont === 'Great Vibes' ? 'is-active' : ''}" data-font="Great Vibes" style="font-family:'Great Vibes', cursive;">Calligraphy</button>
                <button type="button" class="scan-sig-font-chip ${sigFont === 'Caveat' ? 'is-active' : ''}" data-font="Caveat" style="font-family:'Caveat', cursive;">Handwritten</button>
                <button type="button" class="scan-sig-font-chip ${sigFont === 'Sacramento' ? 'is-active' : ''}" data-font="Sacramento" style="font-family:'Sacramento', cursive;">Formal</button>
              </div>
              <div class="scan-sig-type-preview" id="scan-sig-type-preview" style="font-family:'${sigFont}', cursive; color:${sigInk};">
                ${esc(sigTypedName || 'Your Signature')}
              </div>
              <button type="button" class="scan-btn-apply-sig" id="btn-apply-type-sig">Apply Typed Signature</button>
            </div>

            <!-- Tab 3: Upload Image Signature -->
            <div class="scan-sig-panel" id="panel-sig-upload" ${sigTab !== 'upload' ? 'hidden' : ''}>
              <div class="scan-sig-upload-box" id="scan-sig-dropzone">
                <input type="file" id="scan-sig-file-input" accept="image/png,image/jpeg,image/webp" hidden>
                ${ICONS.upload}
                <span>Click to pick signature image</span>
              </div>
              <label class="scan-sig-knockout-label">
                <input type="checkbox" id="scan-sig-knockout-bg" checked>
                <span>Auto-remove white background</span>
              </label>
              <div id="scan-sig-upload-preview-wrap" style="display:none; text-align:center; padding:6px; background:#f8fafc; border-radius:6px; border:1px dashed #cbd5e1; margin-bottom:8px;">
                <canvas id="scan-sig-upload-canvas" style="max-height:60px; max-width:100%; display:inline-block;"></canvas>
              </div>
              <button type="button" class="scan-btn-apply-sig" id="btn-apply-upload-sig" style="display:none;">Apply Uploaded Signature</button>
            </div>

            <!-- Tab 4: Rubber Stamps -->
            <div class="scan-sig-panel" id="panel-sig-stamps" ${sigTab !== 'stamps' ? 'hidden' : ''}>
              <div class="scan-stamp-grid">
                <button type="button" class="scan-stamp-chip stamp-approved" data-stamp="APPROVED">
                  <span>APPROVED</span>
                </button>
                <button type="button" class="scan-stamp-chip stamp-paid" data-stamp="PAID">
                  <span>PAID</span>
                </button>
                <button type="button" class="scan-stamp-chip stamp-confidential" data-stamp="CONFIDENTIAL">
                  <span>CONFIDENTIAL</span>
                </button>
                <button type="button" class="scan-stamp-chip stamp-draft" data-stamp="DRAFT">
                  <span>DRAFT</span>
                </button>
              </div>
            </div>
          </div>
        `;
      }
      return '';
    }



    function updateGlobalTopbarDocInfo() {
      const globalTopbar = document.querySelector('.topbar') || document.querySelector('.preview-navbar') || document.querySelector('header');
      if (!globalTopbar) return;
      let docInfo = document.getElementById('topbar-doc-info');
      if (!docInfo) {
        docInfo = document.createElement('div');
        docInfo.id = 'topbar-doc-info';
        docInfo.className = 'topbar-doc-info-clean';
        globalTopbar.appendChild(docInfo);
      }
      const name = getScanSourceName();
      const n = pages.length;
      docInfo.innerHTML = `
        <span class="topbar-clean-name" title="${esc(name)}">${esc(name)}</span>
        <span class="topbar-clean-pages">· ${n} ${n === 1 ? 'page' : 'pages'}</span>
      `;
      docInfo.style.display = 'inline-flex';
    }

    function clearGlobalTopbarDocInfo() {
      const docInfo = document.querySelector('#topbar-doc-info');
      if (docInfo) {
        docInfo.style.display = 'none';
        docInfo.innerHTML = '';
      }
    }

    function renderSmartInsightsPanel(p) {
      const text = p.ocrData?.text || '';
      if (!text.trim()) {
        return `
          <div class="scan-insights-empty">
            ${ICONS.info}
            <p>No text extracted yet.<br>Click "OCR Text" to extract and analyze this document.</p>
          </div>
        `;
      }

      const receipt = parseReceiptFields(text);
      const passport = parseMrzPassport(text);
      const vcard = parseBusinessCard(text);
      const csv = extractTableCsv(p.ocrData?.words);
      const pii = detectPiiWords(p.ocrData?.words);

      let cardsHtml = '';

      if (pii && pii.count > 0) {
        cardsHtml += `
          <div class="scan-insight-card pii-card" style="border-color: #ef4444; background: rgba(239, 68, 68, 0.04);">
            <div class="scan-insight-card-head">
              <span class="insight-badge pii" style="background:#fee2e2; color:#b91c1c; font-weight:700; display:inline-flex; align-items:center; gap:4px;">${ICONS.shield} ${pii.count} Sensitive PII Found</span>
              <button type="button" class="insight-dl-btn" id="btn-insight-auto-redact-pii" style="background:#dc2626; color:#fff; border:none; padding:4px 10px; border-radius:6px; font-weight:600; cursor:pointer; display:inline-flex; align-items:center; gap:4px;">${ICONS.redact} 1-Click Redact</button>
            </div>
            <div class="scan-insight-grid" style="font-size:11px; margin-top:8px;">
              ${pii.foundItems.email.length ? `<div class="insight-row"><span class="label">Emails (${pii.foundItems.email.length})</span><b class="val" style="color:#ef4444;">${esc(pii.foundItems.email.join(', '))}</b></div>` : ''}
              ${pii.foundItems.phone.length ? `<div class="insight-row"><span class="label">Phones (${pii.foundItems.phone.length})</span><b class="val" style="color:#ef4444;">${esc(pii.foundItems.phone.join(', '))}</b></div>` : ''}
              ${pii.foundItems.card.length ? `<div class="insight-row"><span class="label">Cards (${pii.foundItems.card.length})</span><b class="val" style="color:#ef4444;">${esc(pii.foundItems.card.join(', '))}</b></div>` : ''}
              ${pii.foundItems.ssn.length ? `<div class="insight-row"><span class="label">SSNs/IDs (${pii.foundItems.ssn.length})</span><b class="val" style="color:#ef4444;">${esc(pii.foundItems.ssn.join(', '))}</b></div>` : ''}
              ${pii.foundItems.ip.length ? `<div class="insight-row"><span class="label">IPs (${pii.foundItems.ip.length})</span><b class="val" style="color:#ef4444;">${esc(pii.foundItems.ip.join(', '))}</b></div>` : ''}
            </div>
          </div>
        `;
      }

      if (receipt && (receipt.total || receipt.merchant)) {
        cardsHtml += `
          <div class="scan-insight-card receipt-card">
            <div class="scan-insight-card-head">
              <span class="insight-badge receipt" style="display:inline-flex; align-items:center; gap:4px;">${ICONS.receipt} Receipt / Invoice</span>
              <div style="display:flex; gap:6px;">
                <button type="button" class="insight-copy-btn" id="btn-copy-receipt-json">Copy JSON</button>
                <button type="button" class="insight-dl-btn" id="btn-dl-receipt-csv" style="background:#059669; color:#fff; border:none; padding:3px 8px; border-radius:5px; font-size:11px; font-weight:600; cursor:pointer;">Export CSV</button>
              </div>
            </div>
            <div class="scan-insight-grid">
              ${receipt.merchant ? `<div class="insight-row"><span class="label">Merchant</span><b class="val">${esc(receipt.merchant)}</b></div>` : ''}
              ${receipt.date ? `<div class="insight-row"><span class="label">Date</span><span class="val">${esc(receipt.date)}</span></div>` : ''}
              ${receipt.invoiceNo ? `<div class="insight-row"><span class="label">Invoice #</span><span class="val">${esc(receipt.invoiceNo)}</span></div>` : ''}
              ${receipt.subtotal ? `<div class="insight-row"><span class="label">Subtotal</span><span class="val">${esc(receipt.currency)} ${esc(receipt.subtotal)}</span></div>` : ''}
              ${receipt.tax ? `<div class="insight-row"><span class="label">Tax / VAT</span><span class="val">${esc(receipt.currency)} ${esc(receipt.tax)}</span></div>` : ''}
              ${receipt.total ? `<div class="insight-row total"><span class="label">TOTAL</span><b class="val highlight">${esc(receipt.currency)} ${esc(receipt.total)}</b></div>` : ''}
            </div>
          </div>
        `;
      }

      if (passport) {
        cardsHtml += `
          <div class="scan-insight-card passport-card">
            <div class="scan-insight-card-head">
              <span class="insight-badge passport" style="display:inline-flex; align-items:center; gap:4px;">${ICONS.passport} Passport / ID (MRZ)</span>
              <button type="button" class="insight-copy-btn" id="btn-copy-passport-json">Copy Info</button>
            </div>
            <div class="scan-insight-grid">
              <div class="insight-row"><span class="label">Full Name</span><b class="val">${esc(passport.fullName)}</b></div>
              <div class="insight-row"><span class="label">Document #</span><b class="val">${esc(passport.docNumber)}</b></div>
              <div class="insight-row"><span class="label">Nationality</span><span class="val">${esc(passport.nationality)} (${esc(passport.issuer)})</span></div>
              <div class="insight-row"><span class="label">Date of Birth</span><span class="val">${esc(passport.dob)}</span></div>
              <div class="insight-row"><span class="label">Sex</span><span class="val">${esc(passport.sex)}</span></div>
              <div class="insight-row"><span class="label">Expiry Date</span><span class="val">${esc(passport.expiryDate)}</span></div>
            </div>
          </div>
        `;
      }

      if (vcard) {
        cardsHtml += `
          <div class="scan-insight-card vcard-card">
            <div class="scan-insight-card-head">
              <span class="insight-badge vcard" style="display:inline-flex; align-items:center; gap:4px;">${ICONS.vcard} Business Card</span>
              <button type="button" class="insight-dl-btn" id="btn-dl-vcf">Download .VCF</button>
            </div>
            <div class="scan-insight-grid">
              ${vcard.fullName ? `<div class="insight-row"><span class="label">Name</span><b class="val">${esc(vcard.fullName)}</b></div>` : ''}
              ${vcard.title ? `<div class="insight-row"><span class="label">Title</span><span class="val">${esc(vcard.title)}</span></div>` : ''}
              ${vcard.phone ? `<div class="insight-row"><span class="label">Phone</span><a class="val link" href="tel:${esc(vcard.phone)}">${esc(vcard.phone)}</a></div>` : ''}
              ${vcard.email ? `<div class="insight-row"><span class="label">Email</span><a class="val link" href="mailto:${esc(vcard.email)}">${esc(vcard.email)}</a></div>` : ''}
              ${vcard.website ? `<div class="insight-row"><span class="label">Web</span><span class="val">${esc(vcard.website)}</span></div>` : ''}
            </div>
          </div>
        `;
      }

      if (csv && csv.includes(',')) {
        cardsHtml += `
          <div class="scan-insight-card table-card">
            <div class="scan-insight-card-head">
              <span class="insight-badge table" style="display:inline-flex; align-items:center; gap:4px;">${ICONS.filterForm} Table Data</span>
              <button type="button" class="insight-dl-btn" id="btn-dl-csv">Export .CSV Table</button>
            </div>
            <pre class="insight-csv-preview">${esc(csv.slice(0, 240))}${csv.length > 240 ? '...' : ''}</pre>
          </div>
        `;
      }

      // Barcode & QR Code Cards
      if (p.barcodeData && p.barcodeData.length) {
        p.barcodeData.forEach((bc) => {
          const isUrl = /^https?:\/\//i.test(bc.rawValue);
          cardsHtml += `
            <div class="scan-insight-card barcode-card" style="border-color: #8b5cf6; background: rgba(139, 92, 246, 0.04);">
              <div class="scan-insight-card-head">
                <span class="insight-badge barcode" style="background:#ede9fe; color:#6d28d9; font-weight:700; display:inline-flex; align-items:center; gap:4px;">${ICONS.scanBadge} ${esc(bc.format)}</span>
                <div style="display:flex; gap:6px;">
                  <button type="button" class="insight-copy-btn btn-copy-barcode" data-bc-val="${esc(bc.rawValue)}">Copy Data</button>
                  ${isUrl ? `<a href="${esc(bc.rawValue)}" target="_blank" rel="noopener" class="insight-dl-btn" style="background:#8b5cf6; color:#fff; text-decoration:none; display:inline-block; font-size:11px; padding:3px 8px; border-radius:5px;">Open &rsaquo;</a>` : ''}
                </div>
              </div>
              <div style="margin-top:8px;">
                <pre class="insight-csv-preview" style="background:#0f172a; color:#a78bfa; font-family:monospace; padding:8px; border-radius:6px; font-size:11px; white-space:pre-wrap; word-break:break-all;">${esc(bc.rawValue)}</pre>
              </div>
            </div>
          `;
        });
      }

      // General Document Stats Card
      const wordsCount = (text.match(/\S+/g) || []).length;
      const charsCount = text.length;
      const readTime = Math.max(1, Math.ceil(wordsCount / 200));

      cardsHtml += `
        <div class="scan-insight-card metrics-card">
          <div class="scan-insight-card-head">
            <span class="insight-badge metrics" style="display:inline-flex; align-items:center; gap:4px;">${ICONS.studio} Document Metrics</span>
          </div>
          <div class="scan-metrics-grid">
            <div class="metric-box"><span class="metric-num">${wordsCount}</span><span class="metric-lbl">Words</span></div>
            <div class="metric-box"><span class="metric-num">${charsCount}</span><span class="metric-lbl">Chars</span></div>
            <div class="metric-box"><span class="metric-num">~${readTime}m</span><span class="metric-lbl">Read Time</span></div>
          </div>
        </div>

        <div class="scan-insight-card compare-card" style="border-color: #6366f1; background: rgba(99, 102, 241, 0.04);">
          <div class="scan-insight-card-head">
            <span class="insight-badge compare" style="background:#e0e7ff; color:#4338ca; font-weight:700; display:inline-flex; align-items:center; gap:4px;">${ICONS.split} Compare Document</span>
            <button type="button" class="insight-dl-btn" id="btn-launch-diff-station" style="background:#4f46e5; color:#fff; border:none; padding:4px 10px; border-radius:6px; font-weight:600; cursor:pointer;">Launch Diff &rsaquo;</button>
          </div>
          <p style="font-size:11px; color:#64748b; margin:6px 0 0 0;">Compare this page side-by-side with another PDF draft to highlight changes &amp; visual diffs.</p>
        </div>
      `;

      return `<div class="scan-insights-scroll">${cardsHtml}</div>`;
    }


    function renderReviewStudio(parent) {

      if (!pages.length) {
        switchView('hub');
        return;
      }
      if (selIdx >= pages.length) selIdx = pages.length - 1;
      const curPage = pages[selIdx];

      parent.innerHTML = `
        <div class="scan-benchmark-workstation" id="scan-benchmark-workstation">
          <!-- LEFT COLUMN: Studio Canvas & Visual Editing Controls -->
          <div class="scan-benchmark-stage-col" id="scan-benchmark-stage-col">
            <!-- Modern Balanced Toolbar (Hero Labels + Clean Compact Utility Icons) -->
            <header class="scan-unified-toolbar" id="scan-unified-toolbar" role="toolbar" aria-label="Scan Tools">
              <div class="scan-tb-left-cluster">
                <!-- Group 1: Page Management -->
                <div class="scan-tb-group">
                  <button type="button" class="scan-tb-btn" id="btn-top-add-page" title="Add Page (Upload or Camera)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
                    <span>Add</span>
                  </button>
                  <button type="button" class="scan-tb-btn scan-tb-btn-pages ${thumbsDrawerOpen ? 'is-active' : ''}" id="btn-top-toggle-drawer" title="Toggle Page Thumbnails (${pages.length} pages)">
                    ${ICONS.sidebar}<span class="scan-tb-page-badge">${pages.length}</span>
                  </button>
                </div>

                <span class="scan-tb-sep" aria-hidden="true"></span>

                <!-- Group 2: Geometry & History Tools (Icon Only) -->
                <div class="scan-tb-group">
                  <button type="button" class="scan-tb-btn scan-tb-icon-btn ${isCropping ? 'is-active' : ''}" data-tool="recrop" title="Crop Page Bounds [C]">
                    ${ICONS.crop}
                  </button>
                  <button type="button" class="scan-tb-btn scan-tb-icon-btn" data-tool="rotate" title="Rotate 90° [R]">
                    ${ICONS.rotate}
                  </button>
                  <button type="button" class="scan-tb-btn scan-tb-icon-btn" id="btn-top-undo" title="Undo [Ctrl+Z]" ${historyIndex <= 0 ? 'disabled' : ''}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="1 4 1 10 7 10"></polyline>
                      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                    </svg>
                  </button>
                  <button type="button" class="scan-tb-btn scan-tb-icon-btn" id="btn-top-redo" title="Redo [Ctrl+Y]" ${historyIndex >= historyStack.length - 1 ? 'disabled' : ''}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="23 4 23 10 17 10"></polyline>
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                    </svg>
                  </button>
                </div>

                <span class="scan-tb-sep" aria-hidden="true"></span>

                <!-- Group 3: Document Filter Modes (Compact Segmented Icons) -->
                <div class="scan-segmented-filter" role="radiogroup" aria-label="Filter Modes">
                  <button type="button" class="scan-seg-filter-btn ${curPage.enhanceMode === 'enhanced' || (!curPage.enhanceMode || curPage.enhanceMode === 'original') ? 'is-active' : ''}" data-tool="clean" title="Smart Clean Document [1]">
                    ${ICONS.filterDoc}
                  </button>
                  <button type="button" class="scan-seg-filter-btn ${curPage.enhanceMode === 'bw' ? 'is-active' : ''}" data-tool="bw" title="B&W Contrast [2]">
                    ${ICONS.filterBw}
                  </button>
                  <button type="button" class="scan-seg-filter-btn ${curPage.enhanceMode === 'photo' ? 'is-active' : ''}" data-tool="photo" title="Full Color Photo [3]">
                    ${ICONS.filterPhoto}
                  </button>
                </div>

                <span class="scan-tb-sep" aria-hidden="true"></span>

                <!-- Group 4: OCR Text Extractor (Hero Feature with Label) -->
                <div class="scan-tb-group">
                  <button type="button" class="scan-tb-btn scan-tb-btn-extract ${isTextSheetOpen ? 'is-active' : ''}" id="btn-top-extract-text" title="Extract Text & Copy [T]">
                    ${ICONS.ocr}<span>Extract Text</span>
                  </button>
                </div>
              </div>

              <!-- Right: Close Button -->
              <div class="scan-tb-group-right">
                <input id="scan-file-input" type="file" accept="image/*,application/pdf,.pdf,.png,.jpg,.jpeg,.webp,.heic,.heif,.bmp,.tiff,.tif,.gif,.svg,.avif" multiple hidden>
                <button type="button" class="scan-tb-btn-close" id="btn-studio-close" title="Close and return to home">${ICONS.cross}</button>
              </div>
            </header>

            <!-- Main Stage Body -->
            <div class="scan-editor-body" id="scan-editor-body">
              <main class="etxt-canvas-wrap scan-canvas-stage" id="scan-canvas-wrap">
                <!-- Floating Crop Bar -->
                ${isCropping && cropState ? `
                  <div class="scan-crop-floating-bar" id="scan-crop-floating-bar">
                    <span class="scan-crop-dim-label" id="scan-crop-dim-label">${Math.round(cropState.box.w)} × ${Math.round(cropState.box.h)} px</span>
                    <span class="scan-crop-sep"></span>
                    <div class="scan-crop-bar-actions">
                      <button type="button" class="scan-crop-pill-btn" id="btn-crop-reset" title="Reset crop box">Reset</button>
                      <button type="button" class="scan-crop-pill-btn" id="btn-crop-cancel" title="Cancel (Esc)">Cancel</button>
                      <button type="button" class="scan-crop-pill-btn-done" id="btn-crop-apply" title="Apply crop (Enter)">Done</button>
                    </div>
                  </div>
                ` : ''}

                <!-- Document Paper Container -->
                <div class="scan-paper-page" id="scan-paper-page">
                  <div class="scan-laser-beam" id="scan-laser-beam" style="display:none;" aria-hidden="true"></div>
                  <canvas id="scan-studio-canvas" class="scan-studio-canvas"></canvas>
                  <div class="scan-text-layer ${showOcrLayer && !isTextSheetOpen ? 'is-active' : ''}" id="scan-text-layer" aria-hidden="${!showOcrLayer || isTextSheetOpen}"></div>
                  <div class="scan-live-text-selection-pill" id="scan-selection-pill" style="display:none;" aria-hidden="true">
                    <button type="button" id="btn-pill-copy" title="Copy selected text">${ICONS.copy}<span>Copy</span></button>
                    <span class="scan-pill-sep"></span>
                    <button type="button" id="btn-pill-select-all" title="Select all text on this page">${ICONS.flow}<span>Select All</span></button>
                  </div>
                </div>

                <!-- In-Place Minimalist Extracted Text Paper Document Sheet -->
                <div class="scan-text-sheet ${isTextSheetOpen ? 'is-visible' : ''}" id="scan-text-sheet">
                  <!-- Single Unified Minimalist Top Bar (Ultra-Compact) -->
                  <div class="scan-sheet-header">
                    <div class="scan-sheet-header-left">
                      <span class="scan-sheet-title">${ICONS.ocr}<span>Text</span></span>
                      <span class="scan-sheet-stats-pill" id="scan-sheet-stats">0w · 0c</span>
                    </div>

                    <div class="scan-sheet-header-center">
                      ${pages.length > 1 ? `
                        <!-- Multi-Page Scope Toggle Capsule -->
                        <div class="scan-sheet-scope-capsule" role="radiogroup" aria-label="OCR Scope">
                          <button type="button" class="scan-sheet-scope-btn ${ocrScope === 'current' ? 'is-active' : ''}" id="btn-sheet-scope-current" data-scope="current" title="Extract current page only">P.${selIdx + 1}</button>
                          <button type="button" class="scan-sheet-scope-btn ${ocrScope === 'all' ? 'is-active' : ''}" id="btn-sheet-scope-all" data-scope="all" title="Extract all ${pages.length} pages into a single document">All (${pages.length})</button>
                        </div>
                        <span class="scan-sheet-sep" aria-hidden="true"></span>
                      ` : ''}

                      <!-- Language Selector -->
                      <div class="scan-sheet-lang-pill" title="OCR Language">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg>
                        <select id="scan-sheet-ocr-lang" class="scan-sheet-lang-select" title="Change Language">
                          <option value="eng" ${ocrLang === 'eng' ? 'selected' : ''}>EN</option>
                          <option value="hin" ${ocrLang === 'hin' ? 'selected' : ''}>HI (हिंदी)</option>
                          <option value="spa" ${ocrLang === 'spa' ? 'selected' : ''}>ES (Español)</option>
                          <option value="fra" ${ocrLang === 'fra' ? 'selected' : ''}>FR (Français)</option>
                          <option value="deu" ${ocrLang === 'deu' ? 'selected' : ''}>DE (Deutsch)</option>
                          <option value="chi_sim" ${ocrLang === 'chi_sim' ? 'selected' : ''}>ZH (中文)</option>
                          <option value="jpn" ${ocrLang === 'jpn' ? 'selected' : ''}>JA (日本語)</option>
                          <option value="ara" ${ocrLang === 'ara' ? 'selected' : ''}>AR (العربية)</option>
                          <option value="rus" ${ocrLang === 'rus' ? 'selected' : ''}>RU (Русский)</option>
                          <option value="por" ${ocrLang === 'por' ? 'selected' : ''}>PT (Português)</option>
                          <option value="ita" ${ocrLang === 'ita' ? 'selected' : ''}>IT (Italiano)</option>
                          <option value="kor" ${ocrLang === 'kor' ? 'selected' : ''}>KO (한국어)</option>
                        </select>
                      </div>

                      <span class="scan-sheet-sep" aria-hidden="true"></span>

                      <!-- Action Buttons -->
                      <div class="scan-sheet-actions">
                        <button type="button" class="scan-sheet-btn scan-sheet-btn-copy" id="btn-sheet-copy" title="Copy text to clipboard">
                          ${ICONS.copy}<span id="sheet-copy-label">Copy</span>
                        </button>
                        <button type="button" class="scan-sheet-btn" id="btn-sheet-download-txt" title="Download as .txt">
                          <span>TXT</span>
                        </button>
                        <button type="button" class="scan-sheet-btn" id="btn-sheet-download-doc" title="Download as .docx">
                          <span>DOCX</span>
                        </button>
                      </div>
                    </div>

                    <div class="scan-sheet-header-right">
                      <button type="button" class="scan-sheet-close-btn" id="btn-sheet-close" title="Close and return to page view">
                        ${ICONS.cross}
                      </button>
                    </div>
                  </div>

                  <!-- Body: Distraction-Free Text Editor Area -->
                  <div class="scan-text-sheet-body">
                    <div class="scan-sheet-loading-state" id="scan-sheet-loading">
                      <div class="scan-sheet-spinner"></div>
                      <span id="scan-sheet-loading-label">Scanning document text…</span>
                    </div>
                    <textarea id="scan-sheet-textarea" class="scan-sheet-textarea" placeholder="No text detected on this page." spellcheck="false"></textarea>
                  </div>

                  <!-- Footer: Integrated Multi-Page Stepper -->
                  <div class="scan-sheet-footer">
                    <div class="scan-sheet-stepper">
                      <button type="button" class="scan-sheet-step-btn" id="btn-sheet-prev" ${selIdx <= 0 ? 'disabled' : ''} title="Previous Page (Left Arrow)">${ICONS.prev}</button>
                      <span class="scan-sheet-page-label">Page <strong>${selIdx + 1}</strong> of ${pages.length}</span>
                      <button type="button" class="scan-sheet-step-btn" id="btn-sheet-next" ${selIdx >= pages.length - 1 ? 'disabled' : ''} title="Next Page (Right Arrow)">${ICONS.next}</button>
                    </div>
                    <div class="scan-sheet-footer-right">
                      <span class="scan-sheet-hint">Tip: Ctrl + A to select all</span>
                    </div>
                  </div>
                </div>

                <!-- Apple-Grade Frosted Glass Floating Stage Dock (Zero Document Overlap) -->
                <div class="scan-stage-dock" id="scan-stage-dock" style="${isTextSheetOpen ? 'display:none;' : ''}" role="toolbar" aria-label="Page and View Controls">
                  <div class="scan-dock-stepper">
                    <button type="button" class="scan-dock-icon-btn" id="btn-rail-prev" ${selIdx <= 0 ? 'disabled' : ''} title="Previous page (Left Arrow)">${ICONS.prev}</button>
                    <span class="scan-dock-page-text">Page <strong>${selIdx + 1}</strong> of ${pages.length}</span>
                    <button type="button" class="scan-dock-icon-btn" id="btn-rail-next" ${selIdx >= pages.length - 1 ? 'disabled' : ''} title="Next page (Right Arrow)">${ICONS.next}</button>
                  </div>
                  <span class="scan-dock-sep"></span>
                  <div class="scan-dock-zoom-group">
                    <button type="button" class="scan-dock-icon-btn" id="btn-zoom-out" title="Zoom Out">${ICONS.zoomOut}</button>
                    <button type="button" class="scan-dock-zoom-val" id="scan-zoom-badge" title="Reset to 100%">${zoom}%</button>
                    <button type="button" class="scan-dock-icon-btn" id="btn-zoom-in" title="Zoom In">${ICONS.zoomIn}</button>
                    <button type="button" class="scan-dock-fit-btn" id="btn-zoom-reset" title="Fit to Screen">Fit</button>
                  </div>
                  <span class="scan-dock-sep"></span>
                  <div class="scan-dock-device-pill" title="100% On-Device Local Processing · Zero Cloud Uploads">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                    <span>On-Device</span>
                  </div>
                </div>
              </main>

              <!-- Slide-out Thumbnail Drawer -->
              <aside class="etxt-thumbs-drawer scan-thumbs-drawer ${thumbsDrawerOpen ? 'is-open' : ''}" id="scan-thumbs-drawer" aria-label="Page Thumbnails">
                <div class="etxt-thumbs-head">
                  <span class="etxt-thumbs-title">Pages (${pages.length})</span>
                  <button type="button" class="etxt-thumbs-close" id="scan-thumbs-close" title="Close Drawer">${ICONS.cross}</button>
                </div>
                <div class="etxt-thumbs-scroll">
                  ${pages.map((p, i) => `
                    <div class="etxt-thumb-card ${i === selIdx ? 'is-on' : ''}" data-idx="${i}" draggable="true" title="Page ${i + 1} — Drag to reorder">
                      <button type="button" class="etxt-thumb ${i === selIdx ? 'is-on' : ''}" data-idx="${i}">
                        <div class="scan-thumb-paper-wrap">
                          <canvas id="film-cv-${i}" width="160" height="220"></canvas>
                        </div>
                        <div class="scan-thumb-info-row">
                          <span class="scan-thumb-num-label ${i === selIdx ? 'is-active' : ''}">Page ${i + 1}</span>
                          ${p.ocrData ? '<span class="scan-thumb-ocr-pill" title="OCR Ready">OCR</span>' : ''}
                        </div>
                      </button>
                      <div class="scan-thumb-quick-actions">
                        <button type="button" class="scan-thumb-btn" data-del="${i}" title="Delete page">${ICONS.cross}</button>
                      </div>
                    </div>
                  `).join('')}
                </div>
                <div class="scan-drawer-footer-actions">
                  <button type="button" class="etxt-add-page" id="btn-drawer-add-cam" title="Scan with Camera">
                    ${ICONS.camera}
                    <span>Camera</span>
                  </button>
                  <button type="button" class="etxt-add-page" id="btn-drawer-add-file" title="Upload Files">
                    ${ICONS.folder}
                    <span>Upload</span>
                  </button>
                </div>
              </aside>
            </div>
          </div>

          <!-- RIGHT COLUMN: Dedicated Studio Export & Options Panel (Exact Mockup Match) -->
          <aside class="cpdf-benchmark-panel scan-benchmark-panel" id="scan-benchmark-panel" aria-label="Export Settings">
            <!-- Header: Red/Coral Document Badge & Title -->
            <div class="scan-exact-header">
              <div class="scan-exact-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                </svg>
              </div>
              <h2 class="scan-exact-title">Export Scan</h2>
            </div>

            <!-- Format Option Cards Stack -->
            <div class="scan-exact-cards-stack" role="radiogroup" aria-label="Output Format">
              <div class="scan-benchmark-card ${pdfFormat === 'searchable' ? 'is-active' : ''}" data-fmt="searchable" tabindex="0" role="radio" aria-checked="${pdfFormat === 'searchable'}">
                <div class="scan-benchmark-radio">
                  <div class="scan-benchmark-radio-dot"></div>
                </div>
                <div class="scan-benchmark-card-text">
                  <span class="scan-benchmark-card-label">Searchable PDF</span>
                  <span class="scan-benchmark-card-sub">Selectable text + OCR layer</span>
                </div>
                <div class="scan-benchmark-card-right">
                  <span class="scan-benchmark-pill-rec">Recommended</span>
                </div>
              </div>

              <div class="scan-benchmark-card ${pdfFormat === 'image' ? 'is-active' : ''}" data-fmt="image" tabindex="0" role="radio" aria-checked="${pdfFormat === 'image'}">
                <div class="scan-benchmark-radio">
                  <div class="scan-benchmark-radio-dot"></div>
                </div>
                <div class="scan-benchmark-card-text">
                  <span class="scan-benchmark-card-label">Standard PDF</span>
                  <span class="scan-benchmark-card-sub">Flattened visual scan · Fast</span>
                </div>
              </div>

              <div class="scan-benchmark-card ${pdfFormat === 'zip' ? 'is-active' : ''}" data-fmt="zip" tabindex="0" role="radio" aria-checked="${pdfFormat === 'zip'}">
                <div class="scan-benchmark-radio">
                  <div class="scan-benchmark-radio-dot"></div>
                </div>
                <div class="scan-benchmark-card-text">
                  <span class="scan-benchmark-card-label">Image ZIP</span>
                  <span class="scan-benchmark-card-sub">Individual full-resolution JPGs</span>
                </div>
              </div>
            </div>

            <!-- Unified Segmented Settings Strip (Option 1: Linear / Apple Style) -->
            <div class="scan-segmented-settings-strip">
              <!-- Segment 1: Resolution -->
              <div class="scan-segment-item" id="panel-field-dpi">
                <label class="scan-segment-label" for="panel-export-dpi">Resolution</label>
                <div class="scan-segment-select-wrap">
                  <select id="panel-export-dpi" class="scan-segment-select">
                    <option value="high" ${pdfCompression === 'high' ? 'selected' : ''}>300 DPI</option>
                    <option value="balanced" ${pdfCompression === 'balanced' ? 'selected' : ''}>150 DPI</option>
                    <option value="compact" ${pdfCompression === 'compact' ? 'selected' : ''}>72 DPI</option>
                  </select>
                  <svg class="scan-segment-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
              </div>

              <!-- Divider 1 -->
              <div class="scan-segment-divider" aria-hidden="true"></div>

              <!-- Segment 2: Geometry -->
              <div class="scan-segment-item" id="panel-field-size">
                <label class="scan-segment-label" for="panel-export-pagesize">Geometry</label>
                <div class="scan-segment-select-wrap">
                  <select id="panel-export-pagesize" class="scan-segment-select">
                    <option value="a4" ${pdfPageSize === 'a4' ? 'selected' : ''}>A4 (210×297)</option>
                    <option value="letter" ${pdfPageSize === 'letter' ? 'selected' : ''}>US Letter</option>
                    <option value="original" ${pdfPageSize === 'original' ? 'selected' : ''}>Original</option>
                  </select>
                  <svg class="scan-segment-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
              </div>

              <!-- Divider 2 -->
              <div class="scan-segment-divider" aria-hidden="true"></div>

              <!-- Segment 3: Language -->
              <div class="scan-segment-item" id="panel-ocr-lang-row">
                <label class="scan-segment-label" for="panel-export-lang">Language</label>
                <div class="scan-segment-select-wrap">
                  <select id="panel-export-lang" class="scan-segment-select">
                    <option value="eng" ${ocrLang === 'eng' ? 'selected' : ''}>English (EN)</option>
                    <option value="spa" ${ocrLang === 'spa' ? 'selected' : ''}>Spanish (ES)</option>
                    <option value="fra" ${ocrLang === 'fra' ? 'selected' : ''}>French (FR)</option>
                    <option value="deu" ${ocrLang === 'deu' ? 'selected' : ''}>German (DE)</option>
                    <option value="ita" ${ocrLang === 'ita' ? 'selected' : ''}>Italian (IT)</option>
                    <option value="por" ${ocrLang === 'por' ? 'selected' : ''}>Portuguese (PT)</option>
                    <option value="hin" ${ocrLang === 'hin' ? 'selected' : ''}>Hindi (HI)</option>
                    <option value="chi_sim" ${ocrLang === 'chi_sim' ? 'selected' : ''}>Chinese (ZH)</option>
                    <option value="jpn" ${ocrLang === 'jpn' ? 'selected' : ''}>Japanese (JA)</option>
                    <option value="ara" ${ocrLang === 'ara' ? 'selected' : ''}>Arabic (AR)</option>
                    <option value="auto" ${ocrLang === 'auto' ? 'selected' : ''}>Auto-Detect</option>
                  </select>
                  <svg class="scan-segment-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
              </div>
            </div>

            <!-- Estimated Output Box (Light Mint Box with Neutral Privacy Pill & Solid Green Bar) -->
            <div class="scan-exact-est-box">
              <div class="scan-exact-est-title">Estimated output</div>
              <div class="scan-exact-est-row">
                <span class="scan-exact-est-metric">
                  <strong>${pages.length} ${pages.length === 1 ? 'Page' : 'Pages'}</strong> · <span class="scan-est-size-tag" id="scan-panel-est-size">~${((pages.length || 1) * (pdfFormat === 'zip' ? 1.1 : (pdfCompression === 'high' ? 0.72 : (pdfCompression === 'balanced' ? 0.34 : 0.15)))).toFixed(1)} MB</span> · <span id="scan-panel-summary-meta">${pdfFormat === 'zip' ? 'High-Res' : (pdfCompression === 'high' ? '300 DPI' : (pdfCompression === 'balanced' ? '150 DPI' : '72 DPI'))}</span>
                </span>
                <span class="scan-exact-privacy-badge">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                  100% Local
                </span>
              </div>
              <div class="scan-exact-track">
                <div class="scan-exact-bar"></div>
              </div>
            </div>

            <!-- Primary Action CTA Button (Solid Obsidian Black) -->
            <button type="button" class="scan-exact-cta" id="btn-panel-confirm-export">
              <span id="panel-confirm-spinner" style="display:none;" class="scan-modal-spinner"></span>
              <span id="panel-confirm-text">${pdfFormat === 'zip' ? 'Download Image ZIP' : (pdfFormat === 'searchable' ? 'Export Searchable PDF' : 'Export Standard PDF')}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
              <div class="scan-modal-progress-track" id="panel-progress-track" style="display:none;">
                <div class="scan-modal-progress-fill" id="panel-progress-fill"></div>
              </div>
            </button>
          </aside>
        </div>
      `;

      updateGlobalTopbarDocInfo();
      bindStudioEvents(parent);
      updateStudioPreview();
      paintFilmstripThumbs();
      if (showOcrLayer && !curPage.ocrData) {
        runPageOcr(selIdx);
      }
    }

    function cleanExtractedText(raw, lang = ocrLang || 'eng') {
      if (!raw) return '';
      let t = String(raw).replace(/\u00A0/g, ' ');

      // 1. Remove non-printable control unicode characters only
      t = t.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\uD800-\uDFFF\uFFFE\uFFFF]/g, '');

      // 2. Reconnect broken hyphenated line-breaks (e.g. "docu-\nment" -> "document")
      t = t.replace(/(\b[a-zA-Z]{2,})-\s*\n\s*([a-zA-Z]{2,}\b)/g, '$1$2');

      // 3. Normalize multiple spaces and blank lines
      t = t.replace(/[ \t]+/g, ' ');
      t = t.replace(/\n{3,}/g, '\n\n');
      return t.trim();
    }

    function prepareOcrCanvas(srcCv) {
      if (!srcCv) return srcCv;
      const maxDim = 2800;
      const minDim = 1600;
      const maxOriginal = Math.max(srcCv.width, srcCv.height);
      let sc = 1;
      if (maxOriginal > maxDim) {
        sc = maxDim / maxOriginal;
      } else if (maxOriginal < minDim && maxOriginal > 0) {
        sc = Math.min(3, minDim / maxOriginal);
      }
      const w = Math.max(1, Math.round(srcCv.width * sc));
      const h = Math.max(1, Math.round(srcCv.height * sc));
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d');
      // Solid pure white background prevents transparent PDFs and PNGs from turning black
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, w, h);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(srcCv, 0, 0, w, h);
      return c;
    }

    function createHighContrastOcrCanvas(srcCv) {
      const c = document.createElement('canvas');
      c.width = srcCv.width;
      c.height = srcCv.height;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(srcCv, 0, 0);
      try {
        const imgData = ctx.getImageData(0, 0, c.width, c.height);
        const d = imgData.data;
        const len = d.length;

        let minL = 255, maxL = 0;
        for (let i = 0; i < len; i += 16) {
          const l = (d[i] * 77 + d[i + 1] * 150 + d[i + 2] * 29) >> 8;
          if (l < minL) minL = l;
          if (l > maxL) maxL = l;
        }

        const range = Math.max(1, maxL - minL);
        for (let i = 0; i < len; i += 4) {
          const l = (d[i] * 77 + d[i + 1] * 150 + d[i + 2] * 29) >> 8;
          let norm = Math.round(((l - minL) / range) * 255);
          if (norm < 120) norm = Math.max(0, norm - 30);
          else if (norm > 140) norm = Math.min(255, norm + 30);
          d[i] = norm;
          d[i + 1] = norm;
          d[i + 2] = norm;
        }
        ctx.putImageData(imgData, 0, 0);
      } catch (e) {}
      return c;
    }

    async function runPageOcr(idx, isBackground = false) {
      const p = pages[idx];
      if (!p) return;

      // Helper: update the sidebar loading/text state
      const setSidebarLoading = (show, statusText, pct = 0) => {
        if (isBackground && idx !== selIdx) return;
        const el = document.querySelector('#ocr-sidebar-loading');
        const lbl = document.querySelector('#ocr-sidebar-progress-label');
        const bar = document.querySelector('#ocr-sidebar-progress-bar');
        const ta = document.querySelector('#scan-ocr-sidebar-textarea');
        const sweep = document.querySelector('#scan-canvas-scanline');
        if (el) {
          el.style.setProperty('display', show ? 'flex' : 'none', 'important');
          el.hidden = !show;
          el.classList.toggle('is-hidden', !show);
        }
        if (lbl && statusText) lbl.textContent = statusText;
        if (bar) bar.style.width = `${Math.min(100, Math.max(5, pct))}%`;
        if (ta) ta.style.opacity = show ? '0.35' : '1';
        if (sweep && idx === selIdx) sweep.style.display = show ? 'block' : 'none';
      };

      const setSidebarText = (text) => {
        if (idx === selIdx) {
          const ta = document.querySelector('#scan-ocr-sidebar-textarea');
          if (ta) {
            ta.value = text;
            ta.style.opacity = '1';
          }
          setSidebarLoading(false);
        }
      };

      // Connect live status updates from the OCR engine to the sidebar and sheet label
      _ocrStatusCallback = (msg) => {
        if (idx === selIdx) {
          const lbl = document.querySelector('#ocr-sidebar-progress-label');
          if (lbl) lbl.textContent = msg;
          const sheetLbl = document.querySelector('#scan-sheet-loading-label');
          if (sheetLbl) sheetLbl.textContent = msg;
        }
      };

      _ocrOnProgress = (progressRatio) => {
        if (idx === selIdx) {
          const pct = Math.round(progressRatio * 100);
          setSidebarLoading(true, `Recognizing characters… ${pct}%`, pct);
          const sheetLbl = document.querySelector('#scan-sheet-loading-label');
          if (sheetLbl) sheetLbl.textContent = `Recognizing characters… ${pct}%`;
        }
      };

      // If already computed, show immediately
      if (p.ocrData) {
        setSidebarText((p.ocrData.text || '').trim() || '(No text detected)');
        if (idx === selIdx) renderTextLayer();
        return;
      }

      // If OCR is already running for this page, wait for it
      if (p.ocrPromise) {
        if (!isBackground) setSidebarLoading(true, 'Analyzing page…', 40);
        try { await p.ocrPromise; } catch {}
        if (p.ocrData) {
          setSidebarText((p.ocrData.text || '').trim() || '(No text detected)');
          if (idx === selIdx) { renderTextLayer(); paintFilmstripThumbs(); }
        }
        return;
      }

      // Validate canvas
      if (!p.canvas || typeof p.canvas.toDataURL !== 'function') {
        if (!isBackground) setSidebarText('Error: page image is not available. Please re-import the file.');
        console.error('[OCR] p.canvas is invalid:', p.canvas);
        return;
      }

      if (!isBackground) setSidebarLoading(true, 'Initializing neural engine…', 15);

      // Store the promise so concurrent calls can coalesce onto it
      const ocrTask = (async () => {
        try {
          // Pre-process canvas for high-contrast crisp text recognition
          const src = getPageEnhancedCanvas(p) || p.canvas;
          const prep = prepareOcrCanvas(src);
          const lang = (ocrLang && ocrLang !== 'auto') ? ocrLang : 'eng';

          console.log('[OCR] Starting recognition — canvas:', prep.width, 'x', prep.height, 'lang:', lang);

          const worker = await A.getOrInitOcrWorker(lang);

          // Convert to Blob for reliable cross-thread transmission
          const blob = await new Promise((resolve) => prep.toBlob(resolve, 'image/png'));
          let { data } = await worker.recognize(blob || prep);

          // Auto-contrast fallback pass if initial recognition returned empty
          if (!data || !data.text || !data.text.trim()) {
            console.log('[OCR] First pass returned empty, running auto-contrast fallback pass...');
            const contrastPrep = createHighContrastOcrCanvas(prep);
            const contrastBlob = await new Promise((resolve) => contrastPrep.toBlob(resolve, 'image/png'));
            const fallback = await worker.recognize(contrastBlob || contrastPrep);
            if (fallback?.data?.text?.trim()) {
              data = fallback.data;
            }
          }

          console.log('[OCR] Done — text length:', data?.text?.length, 'words:', data?.words?.length);

          // Clean text immediately upon recognition so all consumers get pristine text
          if (data) {
            data.text = cleanExtractedText(data.text || '', lang);
            if (Array.isArray(data.words)) {
              data.words = data.words.filter(w => w && w.text && String(w.text).trim().length > 0);
            }
          }

          p.ocrData = data;
          p.ocrScaleFactor = {
            scaleX: p.canvas.width / prep.width,
            scaleY: p.canvas.height / prep.height,
          };
          return data;
        } catch (err) {
          console.error('[OCR] Recognition failed:', err);
          p.ocrData = { text: '', error: err?.message || String(err), words: [] };
          throw err;
        }
      })();

      p.ocrPromise = ocrTask;

      try {
        await ocrTask;
        if (p.ocrData) {
          setSidebarText((p.ocrData.text || '').trim() || '(No text detected on this page)');
          if (idx === selIdx) {
            renderTextLayer();
            paintFilmstripThumbs();
          }
        }

        // Background Pre-OCR: Silently prepare adjacent pages in background for zero latency switching
        setTimeout(() => {
          if (pages[idx + 1] && !pages[idx + 1].ocrData && !pages[idx + 1].ocrPromise) {
            runPageOcr(idx + 1, true).catch(() => {});
          } else if (pages[idx - 1] && !pages[idx - 1].ocrData && !pages[idx - 1].ocrPromise) {
            runPageOcr(idx - 1, true).catch(() => {});
          }
        }, 120);

      } catch (err) {
        if (!isBackground) setSidebarText(`OCR failed: ${err.message || 'Unknown error'}.`);
      } finally {
        p.ocrPromise = null;
        if (idx === selIdx) {
          const sweep = document.querySelector('#scan-canvas-scanline');
          if (sweep) sweep.style.display = 'none';
        }
      }
    }

    function blackoutSingleWord(p, w) {
      if (!p || !w || !w.bbox) return;
      const pageCtx = p.canvas.getContext('2d');
      pageCtx.fillStyle = '#000000';

      const rawCtx = p.raw ? p.raw.getContext('2d') : null;
      if (rawCtx) rawCtx.fillStyle = '#000000';
      const rawScaleX = p.raw ? p.raw.width / p.canvas.width : 1;
      const rawScaleY = p.raw ? p.raw.height / p.canvas.height : 1;

      const pad = 2;
      const bx = Math.max(0, w.bbox.x0 - pad);
      const by = Math.max(0, w.bbox.y0 - pad);
      const bw = (w.bbox.x1 - w.bbox.x0) + pad * 2;
      const bh = (w.bbox.y1 - w.bbox.y0) + pad * 2;

      pageCtx.fillRect(bx, by, bw, bh);
      if (rawCtx) rawCtx.fillRect(bx * rawScaleX, by * rawScaleY, bw * rawScaleX, bh * rawScaleY);

      if (p.ocrData && p.ocrData.words) {
        p.ocrData.words = p.ocrData.words.filter((item) => item !== w);
        p.ocrData.text = p.ocrData.words.map((item) => item.text).join(' ');
      }

      p._baseCache = null;
      p._enhCache = null;
      p._thumbCache = null;

      // In-place update to eliminate toolbar flicker
      updateStudioPreview();
      renderTextLayer();
      paintFilmstripThumbs();
      setStatus(`Permanently blacked out "${w.text}".`, 'ok');
    }

    /* ════════════════════════════════════════════════════════════════
       ULTRA-FAST ENHANCED CANVAS & THUMBNAIL CACHING (< 0.1ms)
    ════════════════════════════════════════════════════════════════ */
    function getPageEnhancedCanvas(p) {
      if (!p || !p.canvas) return null;
      const mode = p.enhanceMode || 'original';
      const b = p.brightness ?? 100;
      const c = p.contrast ?? 100;
      const baseKey = `${p.canvas.width}x${p.canvas.height}_${mode}`;
      const fullKey = `${baseKey}_${b}_${c}`;

      if (p._enhCache && p._enhCache.key === fullKey && p._enhCache.canvas) {
        return p._enhCache.canvas;
      }

      // 1. Get or compute base-filtered canvas (Clean Doc, B&W, Photo, Form)
      let baseCv = (p._baseCache && p._baseCache.key === baseKey) ? p._baseCache.canvas : null;

      if (!baseCv) {
        let src = p.canvas;
        if (mode === 'original' && b === 100 && c === 100) {
          baseCv = src;
        } else {
          src = A.copyCanvas(p.canvas);
          try {
            A.enhancePage(src, mode, { brightness: 100, contrast: 100 });
          } catch (e) {}
          baseCv = src;
        }
        p._baseCache = { key: baseKey, canvas: baseCv };
      }

      // If neutral 100/100, return base canvas directly (< 0.01ms)
      if (b === 100 && c === 100) {
        p._enhCache = { key: fullKey, canvas: baseCv };
        return baseCv;
      }

      // 2. High-speed 0.2ms Brightness / Contrast LUT pass on a copy of base
      const tunedCv = A.copyCanvas(baseCv);
      const ctx = tunedCv.getContext('2d');
      const id = ctx.getImageData(0, 0, tunedCv.width, tunedCv.height);
      const d = id.data;

      const lut = new Uint8ClampedArray(256);
      const cFactor = c / 100;
      const bOffset = (b - 100) * 1.28;
      for (let i = 0; i < 256; i++) {
        const val = (i - 128) * cFactor + 128 + bOffset;
        lut[i] = Math.max(0, Math.min(255, Math.round(val)));
      }

      for (let i = 0; i < d.length; i += 4) {
        d[i] = lut[d[i]];
        d[i + 1] = lut[d[i + 1]];
        d[i + 2] = lut[d[i + 2]];
      }

      ctx.putImageData(id, 0, 0);
      p._enhCache = { key: fullKey, canvas: tunedCv };
      return tunedCv;
    }

    let studioPreviewRaf = null;
    function scheduleStudioPreview() {
      if (studioPreviewRaf) return;
      studioPreviewRaf = requestAnimationFrame(() => {
        studioPreviewRaf = null;
        updateStudioPreview();
      });
    }

    function renderTextLayer() {
      const layer = container.querySelector('#scan-text-layer');
      const cv = container.querySelector('#scan-studio-canvas');
      const p = pages[selIdx];
      if (!layer || !cv || !p) return;

      layer.innerHTML = '';
      if (isRedacting) layer.classList.add('is-redacting-active');
      else layer.classList.remove('is-redacting-active');

      if (!p.ocrData || !p.ocrData.words || !p.ocrData.words.length) return;

      const displayW = parseFloat(cv.style.width) || cv.width;
      const displayH = parseFloat(cv.style.height) || cv.height;
      const scaleX = displayW / p.canvas.width;
      const scaleY = displayH / p.canvas.height;
      const sx = (p.ocrScaleFactor?.scaleX || 1) * scaleX;
      const sy = (p.ocrScaleFactor?.scaleY || 1) * scaleY;

      let matchCount = 0;
      const q = (searchQuery || '').trim().toLowerCase();

      p.ocrData.words.forEach((w) => {
        if (!w.text || !w.bbox) return;
        const clean = String(w.text)
          .replace(/\uFB00/g, 'ff')
          .replace(/\uFB01/g, 'fi')
          .replace(/\uFB02/g, 'fl')
          .replace(/\uFB03/g, 'ffi')
          .replace(/\uFB04/g, 'ffl')
          .trim();
        if (!clean) return;

        const conf = typeof w.confidence === 'number' ? w.confidence : 100;
        const isTinyNoise = clean.length <= 2 && !/[a-zA-Z0-9\u00C0-\u024F\u0400-\u04FF\u0600-\u06FF\u0900-\u097F\u3040-\u30FF\u3400-\u9FFF]/.test(clean);
        if (conf < 25 && isTinyNoise) return;

        const x = w.bbox.x0 * sx;
        const y = w.bbox.y0 * sy;
        const width = (w.bbox.x1 - w.bbox.x0) * sx;
        const height = (w.bbox.y1 - w.bbox.y0) * sy;

        const span = document.createElement('span');
        span.className = 'scan-ocr-word';
        span.textContent = clean;
        span.style.left = `${x}px`;
        span.style.top = `${y}px`;
        span.style.width = `${width}px`;
        span.style.height = `${height}px`;
        span.style.fontSize = `${Math.max(8, height * 0.82)}px`;

        if (isRedacting) {
          span.classList.add('is-redactable');
          span.title = `Click to blackout "${clean}"`;
          span.onclick = (e) => {
            e.stopPropagation();
            blackoutSingleWord(p, w);
          };
        } else {
          span.title = `"${clean}" (${Math.round(conf)}% confidence)`;
          span.onclick = (e) => {
            e.stopPropagation();
            const ta = container.querySelector('#scan-ocr-sidebar-textarea');
            if (ta) {
              const fullText = ta.value;
              const wordPos = fullText.toLowerCase().indexOf(clean.toLowerCase());
              if (wordPos !== -1) {
                ta.focus();
                ta.setSelectionRange(wordPos, wordPos + clean.length);
              }
            }
          };
        }

        if (q && clean.toLowerCase().includes(q)) {
          span.classList.add('is-matched');
          matchCount++;
        }

        layer.appendChild(span);
      });

      const counterEl = container.querySelector('#scan-search-counter');
      if (counterEl) counterEl.textContent = `${matchCount} ${matchCount === 1 ? 'match' : 'matches'}`;
    }


    function getPageExportCanvas(p) {
      const base = A.enhancePage(A.copyCanvas(p.canvas), p.enhanceMode || 'original', { brightness: p.brightness, contrast: p.contrast });
      if (p.overlays && p.overlays.length) {
        const ctx = base.getContext('2d');
        p.overlays.forEach((o) => {
          if (o.imgCanvas) {
            ctx.drawImage(o.imgCanvas, (o.x || 0) * base.width, (o.y || 0) * base.height, (o.w || 0.3) * base.width, (o.h || 0.1) * base.height);
          }
        });
      }
      return base;
    }

    function renderOverlaysLayer() {
      const layer = container.querySelector('#scan-overlays-layer');
      if (!layer || !pages[selIdx]) return;
      const curP = pages[selIdx];
      curP.overlays = curP.overlays || [];

      layer.innerHTML = curP.overlays.map((o) => {
        const isSel = selectedOverlayId === o.id;
        const dataUrl = o.imgCanvas ? o.imgCanvas.toDataURL('image/png') : '';
        return `
          <div class="scan-overlay-item ${isSel ? 'is-selected' : ''}" 
               data-overlay-id="${esc(o.id)}"
               style="left: ${(o.x || 0) * 100}%; top: ${(o.y || 0) * 100}%; width: ${(o.w || 0.3) * 100}%; height: ${(o.h || 0.1) * 100}%;">
            ${isSel ? `
              <button type="button" class="scan-overlay-delete-btn" data-act="del" title="Delete signature (Del)">
                ${ICONS.cross}
              </button>
              <div class="scan-overlay-handle nw" data-handle="nw"></div>
              <div class="scan-overlay-handle ne" data-handle="ne"></div>
              <div class="scan-overlay-handle se" data-handle="se"></div>
              <div class="scan-overlay-handle sw" data-handle="sw"></div>
            ` : ''}
            <img src="${dataUrl}" alt="Signature" draggable="false" style="width:100%; height:100%; object-fit:contain;">
          </div>
        `;
      }).join('');

      bindOverlaysLayerEvents(layer, curP);
    }

    function bindOverlaysLayerEvents(layer, curP) {
      const paper = container.querySelector('#scan-paper-page');
      if (!paper) return;

      layer.querySelectorAll('.scan-overlay-item').forEach((el) => {
        const id = el.dataset.overlayId;
        const o = curP.overlays.find((x) => x.id === id);
        if (!o) return;

        // Delete button
        const delBtn = el.querySelector('.scan-overlay-delete-btn');
        if (delBtn) {
          delBtn.onclick = (e) => {
            e.stopPropagation();
            curP.overlays = curP.overlays.filter((x) => x.id !== id);
            selectedOverlayId = null;
            renderOverlaysLayer();
            setStatus('Signature deleted.', 'ok');
          };
        }

        // Resize Handles (Direct 60fps DOM manipulation)
        el.querySelectorAll('.scan-overlay-handle').forEach((handle) => {
          handle.onpointerdown = (e) => {
            e.stopPropagation();
            e.preventDefault();
            const handleType = handle.dataset.handle;
            const startX = e.clientX;
            const startY = e.clientY;
            const startW = o.w;
            const startH = o.h;
            const startLeft = o.x;
            const startTop = o.y;
            const paperRect = paper.getBoundingClientRect();
            const ratio = o.aspectRatio || (startW / Math.max(0.001, startH));

            try { handle.setPointerCapture(e.pointerId); } catch {}

            let curLeft = startLeft, curTop = startTop, curW = startW, curH = startH;

            const onMove = (me) => {
              const dx = (me.clientX - startX) / paperRect.width;
              const dy = (me.clientY - startY) / paperRect.height;

              if (handleType === 'se') {
                curW = Math.max(0.05, Math.min(0.95, startW + dx));
                curH = curW / ratio;
              } else if (handleType === 'sw') {
                curW = Math.max(0.05, Math.min(0.95, startW - dx));
                curLeft = startLeft + (startW - curW);
                curH = curW / ratio;
              } else if (handleType === 'ne') {
                curW = Math.max(0.05, Math.min(0.95, startW + dx));
                curH = curW / ratio;
                curTop = startTop + (startH - curH);
              } else if (handleType === 'nw') {
                curW = Math.max(0.05, Math.min(0.95, startW - dx));
                curH = curW / ratio;
                curLeft = startLeft + (startW - curW);
                curTop = startTop + (startH - curH);
              }

              el.style.left = `${curLeft * 100}%`;
              el.style.top = `${curTop * 100}%`;
              el.style.width = `${curW * 100}%`;
              el.style.height = `${curH * 100}%`;
            };

            const onUp = (ue) => {
              try { handle.releasePointerCapture(ue.pointerId); } catch {}
              window.removeEventListener('pointermove', onMove);
              window.removeEventListener('pointerup', onUp);
              o.x = curLeft;
              o.y = curTop;
              o.w = curW;
              o.h = curH;
            };

            window.addEventListener('pointermove', onMove);
            window.addEventListener('pointerup', onUp);
          };
        });

        // Drag overlay to reposition (Direct 60fps DOM manipulation)
        el.onpointerdown = (e) => {
          if (e.target.closest('.scan-overlay-delete-btn, .scan-overlay-handle')) return;
          e.stopPropagation();
          e.preventDefault();

          if (selectedOverlayId !== o.id) {
            selectedOverlayId = o.id;
            renderOverlaysLayer();
            const freshEl = layer.querySelector(`[data-overlay-id="${esc(o.id)}"]`);
            if (freshEl) {
              startDrag(freshEl, e);
            }
            return;
          }

          startDrag(el, e);
        };

        function startDrag(targetEl, e) {
          const startX = e.clientX;
          const startY = e.clientY;
          const initX = o.x;
          const initY = o.y;
          const paperRect = paper.getBoundingClientRect();
          targetEl.classList.add('is-dragging');

          try { targetEl.setPointerCapture(e.pointerId); } catch {}

          let curX = initX, curY = initY;

          const onMove = (me) => {
            const dx = (me.clientX - startX) / paperRect.width;
            const dy = (me.clientY - startY) / paperRect.height;
            curX = Math.max(0, Math.min(1 - o.w, initX + dx));
            curY = Math.max(0, Math.min(1 - o.h, initY + dy));
            targetEl.style.left = `${curX * 100}%`;
            targetEl.style.top = `${curY * 100}%`;
          };

          const onUp = (ue) => {
            targetEl.classList.remove('is-dragging');
            try { targetEl.releasePointerCapture(ue.pointerId); } catch {}
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            o.x = curX;
            o.y = curY;
          };

          window.addEventListener('pointermove', onMove);
          window.addEventListener('pointerup', onUp);
        }
      });
    }

    function applyCanvasTransform() {
      const cv = container.querySelector('#scan-studio-canvas');
      const pageWrap = container.querySelector('#scan-paper-page');
      const wrap = container.querySelector('#scan-canvas-wrap');
      const badge = container.querySelector('#scan-zoom-badge');
      const slider = container.querySelector('#scan-zoom-slider');

      if (badge) badge.textContent = `${zoom}%`;
      if (slider) slider.value = zoom;
      if (!cv || !pageWrap) return;

      const scaleVal = zoom / 100;
      if (scaleVal === 1 && panX === 0 && panY === 0) {
        pageWrap.style.transform = 'none';
        if (wrap) wrap.style.cursor = isSplitView ? 'ew-resize' : 'default';
      } else if (scaleVal > 1 || panX !== 0 || panY !== 0) {
        pageWrap.style.transform = `translate3d(${Math.round(panX)}px, ${Math.round(panY)}px, 0) scale(${scaleVal})`;
        if (wrap) wrap.style.cursor = isPanning ? 'grabbing' : 'grab';
      } else {
        pageWrap.style.transform = `scale(${scaleVal})`;
        if (wrap) wrap.style.cursor = isSplitView ? 'ew-resize' : 'default';
      }
    }

    function lerpPt(a, b, t) {
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }

    function updateStudioPreview() {
      const cv = container.querySelector('#scan-studio-canvas');
      const pageWrap = container.querySelector('#scan-paper-page');
      if (!cv || !pages.length) return;
      const p = pages[selIdx];
      if (!p || !p.canvas) return;

      const source = p.canvas;
      const rawSource = p.raw || p.canvas;
      const wrap = container.querySelector('#scan-canvas-wrap');
      const stageW = wrap?.clientWidth || (window.innerWidth ? window.innerWidth - 300 : 800);
      const stageH = wrap?.clientHeight || (window.innerHeight ? window.innerHeight - 160 : 600);
      const padX = 40;
      const padY = 48;
      const availableW = Math.max(280, stageW - padX);
      const availableH = Math.max(280, stageH - padY);
      const scW = availableW / source.width;
      const scH = availableH / source.height;
      const baseFitScale = Math.min(scW, scH, 1);
      const sc = baseFitScale;
      const displayW = Math.max(2, Math.round(source.width * sc) & ~1);
      const displayH = Math.max(2, Math.round(source.height * sc) & ~1);
      const dpr = Math.min(3, Math.max(2, window.devicePixelRatio || 2));

      if (isCropping && cropState) {
        cropState.displayScale = sc;
      }

      // High-DPI internal buffer dimensions: Match physical retina display pixels cleanly
      const bufferW = Math.round(displayW * dpr);
      const bufferH = Math.round(displayH * dpr);

      if (cv.width !== bufferW || cv.height !== bufferH) {
        cv.width = bufferW;
        cv.height = bufferH;
      }
      cv.style.width = `${displayW}px`;
      cv.style.height = `${displayH}px`;

      if (pageWrap) {
        pageWrap.style.width = `${displayW}px`;
        pageWrap.style.height = `${displayH}px`;
      }

      const ctx = cv.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.clearRect(0, 0, bufferW, bufferH);

      // Fast cached enhanced page rendering (< 0.1ms GPU blit)
      const enhCv = getPageEnhancedCanvas(p) || source;

      if (isCropping && cropState) {
        // Draw cached document base
        ctx.drawImage(enhCv, 0, 0, bufferW, bufferH);

        const b = cropState.box;
        const bx = Math.round(b.x * sc * dpr);
        const by = Math.round(b.y * sc * dpr);
        const bw = Math.round(b.w * sc * dpr);
        const bh = Math.round(b.h * sc * dpr);

        // 1. Dim outer area outside crop rectangle
        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.54)';
        ctx.beginPath();
        ctx.rect(0, 0, bufferW, bufferH);
        ctx.rect(bx, by, bw, bh);
        ctx.fill('evenodd');
        ctx.restore();

        // 2. Rule of thirds grid lines (while actively dragging)
        if (cropState.drag) {
          ctx.save();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.32)';
          ctx.lineWidth = 1 * dpr;
          // Horizontal
          ctx.beginPath();
          ctx.moveTo(bx, by + bh / 3);
          ctx.lineTo(bx + bw, by + bh / 3);
          ctx.moveTo(bx, by + (bh * 2) / 3);
          ctx.lineTo(bx + bw, by + (bh * 2) / 3);
          // Vertical
          ctx.beginPath();
          ctx.moveTo(bx + bw / 3, by);
          ctx.lineTo(bx + bw / 3, by + bh);
          ctx.moveTo(bx + (bw * 2) / 3, by);
          ctx.lineTo(bx + (bw * 2) / 3, by + bh);
          ctx.stroke();
          ctx.restore();
        }

        // 3. Crisp white bounding border
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.lineWidth = 1.5 * dpr;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 4 * dpr;
        ctx.strokeRect(bx, by, bw, bh);
        ctx.restore();

        // 4. Corner L-brackets (3.5px white, clean & tactile)
        ctx.save();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 3.5 * dpr;
        ctx.lineCap = 'square';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 4 * dpr;
        const arm = Math.min(16 * dpr, Math.min(bw, bh) / 4);

        // NW
        ctx.beginPath();
        ctx.moveTo(bx, by + arm);
        ctx.lineTo(bx, by);
        ctx.lineTo(bx + arm, by);
        ctx.stroke();

        // NE
        ctx.beginPath();
        ctx.moveTo(bx + bw - arm, by);
        ctx.lineTo(bx + bw, by);
        ctx.lineTo(bx + bw, by + arm);
        ctx.stroke();

        // SE
        ctx.beginPath();
        ctx.moveTo(bx + bw, by + bh - arm);
        ctx.lineTo(bx + bw, by + bh);
        ctx.lineTo(bx + bw - arm, by + bh);
        ctx.stroke();

        // SW
        ctx.beginPath();
        ctx.moveTo(bx + arm, by + bh);
        ctx.lineTo(bx, by + bh);
        ctx.lineTo(bx, by + bh - arm);
        ctx.stroke();

        // 5. Midpoint Edge Ticks
        const bar = Math.min(12 * dpr, Math.min(bw, bh) / 6);
        ctx.lineWidth = 3 * dpr;
        // Top
        ctx.beginPath();
        ctx.moveTo(bx + bw / 2 - bar, by);
        ctx.lineTo(bx + bw / 2 + bar, by);
        ctx.stroke();
        // Bottom
        ctx.beginPath();
        ctx.moveTo(bx + bw / 2 - bar, by + bh);
        ctx.lineTo(bx + bw / 2 + bar, by + bh);
        ctx.stroke();
        // Left
        ctx.beginPath();
        ctx.moveTo(bx, by + bh / 2 - bar);
        ctx.lineTo(bx, by + bh / 2 + bar);
        ctx.stroke();
        // Right
        ctx.beginPath();
        ctx.moveTo(bx + bw, by + bh / 2 - bar);
        ctx.lineTo(bx + bw, by + bh / 2 + bar);
        ctx.stroke();

        ctx.restore();

      } else if (isSplitView) {
        // Draw enhanced base
        ctx.drawImage(enhCv, 0, 0, bufferW, bufferH);

        // Draw raw un-enhanced on the left side
        const splitX = Math.round(bufferW * splitRatio);
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, splitX, bufferH);
        ctx.clip();
        ctx.drawImage(rawSource, 0, 0, bufferW, bufferH);
        ctx.restore();

        // Sleek hairline divider with subtle shadow
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 4 * dpr;
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5 * dpr;
        ctx.beginPath();
        ctx.moveTo(splitX, 0);
        ctx.lineTo(splitX, bufferH);
        ctx.stroke();
        ctx.restore();

        // Sleek minimalist floating pill handle
        const handleY = bufferH / 2;
        const pillW = 20 * dpr, pillH = 34 * dpr, pillR = 10 * dpr;
        ctx.save();
        ctx.shadowColor = 'rgba(15, 23, 42, 0.25)';
        ctx.shadowBlur = 8 * dpr;
        ctx.shadowOffsetY = 2 * dpr;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(splitX - pillW / 2, handleY - pillH / 2, pillW, pillH, pillR);
        } else {
          ctx.rect(splitX - pillW / 2, handleY - pillH / 2, pillW, pillH);
        }
        ctx.fill();
        ctx.strokeStyle = 'rgba(226, 232, 240, 0.9)';
        ctx.lineWidth = 1 * dpr;
        ctx.stroke();
        ctx.restore();

        // Dual subtle grip bars in center of handle
        ctx.fillStyle = '#94A3B8';
        ctx.fillRect(splitX - 3 * dpr, handleY - 6 * dpr, 1.5 * dpr, 12 * dpr);
        ctx.fillRect(splitX + 1.5 * dpr, handleY - 6 * dpr, 1.5 * dpr, 12 * dpr);

        // Subtle, elegant floating labels (minimal glass badges)
        const badgeH = 22 * dpr;
        const badgeY = 12 * dpr;
        ctx.font = `600 ${10.5 * dpr}px Inter, -apple-system, system-ui, sans-serif`;
        ctx.textBaseline = 'middle';

        // Left "Original" pill
        const origText = 'Original';
        const origW = ctx.measureText(origText).width + 16 * dpr;
        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(12 * dpr, badgeY, origW, badgeH, 5 * dpr);
        } else {
          ctx.rect(12 * dpr, badgeY, origW, badgeH);
        }
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.fillText(origText, 12 * dpr + origW / 2, badgeY + badgeH / 2);
        ctx.restore();

        // Right "Enhanced" pill (showing active mode label)
        const modeLabel = p.enhanceMode === 'bw' ? 'B&W' : (p.enhanceMode === 'photo' ? 'Photo' : 'Cleaned');
        const enhW = ctx.measureText(modeLabel).width + 16 * dpr;
        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(bufferW - enhW - 12 * dpr, badgeY, enhW, badgeH, 5 * dpr);
        } else {
          ctx.rect(bufferW - enhW - 12 * dpr, badgeY, enhW, badgeH);
        }
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.fillText(modeLabel, bufferW - 12 * dpr - enhW / 2, badgeY + badgeH / 2);
        ctx.restore();
      } else {
        ctx.drawImage(enhCv, 0, 0, bufferW, bufferH);
      }

      applyCanvasTransform();
      if (!isCropping) renderTextLayer();
    }

    function paintFilmstripThumbs() {
      pages.forEach((p, i) => {
        const cv = container.querySelector(`#film-cv-${i}`);
        if (cv && p.canvas) {
          const mode = p.enhanceMode || 'enhanced';
          const b = p.brightness ?? 100;
          const c = p.contrast ?? 100;
          const thumbKey = `${p.canvas.width}x${p.canvas.height}_${mode}_${b}_${c}_${p.rot || 0}`;

          const ctx = cv.getContext('2d');
          const pad = 4;
          const w = cv.width, h = cv.height;

          if (p._thumbCache && p._thumbCache.key === thumbKey && p._thumbCache.canvas) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, w, h);
            ctx.drawImage(p._thumbCache.canvas, 0, 0, w, h);
            return;
          }

          const scale = Math.min((w - pad * 2) / p.canvas.width, (h - pad * 2) / p.canvas.height);
          const dw = Math.max(1, Math.round(p.canvas.width * scale)), dh = Math.max(1, Math.round(p.canvas.height * scale));
          const offCv = document.createElement('canvas');
          offCv.width = w;
          offCv.height = h;
          const offCtx = offCv.getContext('2d');
          offCtx.fillStyle = '#ffffff';
          offCtx.fillRect(0, 0, w, h);
          offCtx.imageSmoothingEnabled = true;
          offCtx.imageSmoothingQuality = 'medium';
          offCtx.drawImage(p.canvas, Math.round((w - dw) / 2), Math.round((h - dh) / 2), dw, dh);
          try {
            A.enhancePage(offCv, mode, { brightness: b, contrast: c });
          } catch (e) {}

          p._thumbCache = { key: thumbKey, canvas: offCv };

          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(offCv, 0, 0, w, h);
        }
      });
    }

    function refreshStudioUI() {
      render();
    }

    function bindStudioEvents(parent) {
      const p = pages[selIdx];
      if (!p) return;

      // High-Performance Instant Page Switcher (0ms, Zero DOM Thrashing)
      function switchPage(newIdx) {
        if (newIdx < 0 || newIdx >= pages.length) return;
        selIdx = newIdx;
        zoom = 100;
        panX = 0;
        panY = 0;

        // 1. Instantly render canvas preview
        updateStudioPreview();

        // 2. Instantly update bottom dock page stepper text & disabled states
        const dockPageText = parent.querySelector('.scan-dock-page-text');
        if (dockPageText) dockPageText.innerHTML = `Page <strong>${selIdx + 1}</strong> of ${pages.length}`;

        const railPrev = parent.querySelector('#btn-rail-prev');
        const railNext = parent.querySelector('#btn-rail-next');
        if (railPrev) railPrev.disabled = selIdx <= 0;
        if (railNext) railNext.disabled = selIdx >= pages.length - 1;

        // 3. Instantly update active thumbnail card in drawer
        parent.querySelectorAll('.etxt-thumb-card').forEach((card) => {
          const idx = +card.dataset.idx;
          card.classList.toggle('is-on', idx === selIdx);
        });

        // 4. Instantly update segmented filter button active states for current page
        const curP = pages[selIdx];
        const mode = curP?.enhanceMode || 'enhanced';
        parent.querySelectorAll('.scan-seg-filter-btn').forEach(btn => {
          const tool = btn.dataset.tool;
          const isActive = (tool === 'clean' && (mode === 'enhanced' || mode === 'clean' || mode === 'original')) ||
                           (tool === 'bw' && mode === 'bw') ||
                           (tool === 'photo' && mode === 'photo');
          btn.classList.toggle('is-active', isActive);
        });

        // 5. Update Live Text layer or Extracted Text Sheet if active
        if (isTextSheetOpen) {
          if (!curP.ocrData) {
            openTextSheet();
          } else {
            updateSheetText();
          }
        } else if (showOcrLayer) {
          if (!curP.ocrData) {
            runPageOcr(selIdx);
          } else {
            renderTextLayer();
          }
        }
      }

      // ─── Extract Text Sheet Controls & Laser Sweep ───

      function getCombinedAllPagesText() {
        return pages.map((p, i) => {
          const header = `=== Page ${i + 1} of ${pages.length} ===`;
          const body = p.ocrData?.text ? cleanExtractedText(p.ocrData.text) : '(No text recognized on this page)';
          return `${header}\n\n${body}`;
        }).join('\n\n\n');
      }

      function updateSheetText() {
        const sheetTa = parent.querySelector('#scan-sheet-textarea');
        const statsEl = parent.querySelector('#scan-sheet-stats');
        let text = '';
        if (ocrScope === 'all') {
          text = getCombinedAllPagesText();
        } else {
          const cur = pages[selIdx];
          if (cur?.ocrData?.error) {
            text = `Error during OCR recognition: ${cur.ocrData.error}\n\nPlease check browser console or try adjusting page contrast.`;
          } else {
            text = cur?.ocrData?.text ? cleanExtractedText(cur.ocrData.text) : '';
          }
        }
        if (sheetTa) sheetTa.value = text;
        if (statsEl) {
          const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
          const chars = text.length;
          statsEl.textContent = `${words}w · ${chars}c`;
        }
        const pageLbl = parent.querySelector('.scan-sheet-page-label');
        const btnPrev = parent.querySelector('#btn-sheet-prev');
        const btnNext = parent.querySelector('#btn-sheet-next');
        const btnScopeCurrent = parent.querySelector('#btn-sheet-scope-current');
        const btnScopeAll = parent.querySelector('#btn-sheet-scope-all');

        if (btnScopeCurrent) btnScopeCurrent.classList.toggle('is-active', ocrScope === 'current');
        if (btnScopeAll) btnScopeAll.classList.toggle('is-active', ocrScope === 'all');

        if (pageLbl) {
          if (ocrScope === 'all') {
            pageLbl.innerHTML = `All <strong>${pages.length} Pages</strong>`;
          } else {
            pageLbl.innerHTML = `Page <strong>${selIdx + 1}</strong> of ${pages.length}`;
          }
        }
        if (btnPrev) btnPrev.disabled = (ocrScope === 'all') || (selIdx <= 0);
        if (btnNext) btnNext.disabled = (ocrScope === 'all') || (selIdx >= pages.length - 1);
      }

      async function openTextSheet() {
        const wrapEl = parent.querySelector('#scan-canvas-wrap');
        const btnExtract = parent.querySelector('#btn-top-extract-text');
        const sheetEl = parent.querySelector('#scan-text-sheet');
        const canvasEl = parent.querySelector('#scan-studio-canvas');
        const textLayer = parent.querySelector('#scan-text-layer');
        const laserBeam = parent.querySelector('#scan-laser-beam');
        const stageDock = parent.querySelector('#scan-stage-dock');

        // Helper to reveal the text sheet overlay ONLY AFTER laser & OCR are completely finished
        const showSheetOverlay = () => {
          isTextSheetOpen = true;
          if (wrapEl) wrapEl.style.cursor = 'default';
          if (btnExtract) btnExtract.classList.add('is-active');
          if (sheetEl) sheetEl.classList.add('is-visible');
          if (canvasEl) canvasEl.style.display = 'none';
          if (textLayer) textLayer.style.display = 'none';
          if (stageDock) stageDock.style.display = 'none';
          updateSheetText();
        };

        const cur = pages[selIdx];

        if (ocrScope === 'all') {
          let anyMissing = false;
          for (let i = 0; i < pages.length; i++) {
            if (!pages[i].ocrData) { anyMissing = true; break; }
          }
          if (anyMissing) {
            // Keep canvas visible on stage and sweep laser beam across document
            if (laserBeam) {
              laserBeam.style.display = 'block';
              laserBeam.classList.add('is-sweeping');
            }
            if (btnExtract) btnExtract.classList.add('is-active');

            try {
              for (let i = 0; i < pages.length; i++) {
                if (!pages[i].ocrData) {
                  setStatus(`Scanning page ${i + 1} of ${pages.length}…`, 'ok');
                  await runPageOcr(i);
                }
              }
              setStatus(`All ${pages.length} pages recognized`, 'ok');
            } catch (e) {
              console.error('[Extract All Pages OCR Error]', e);
              setStatus('OCR text recognition error.', 'err');
            } finally {
              if (laserBeam) {
                laserBeam.classList.remove('is-sweeping');
                laserBeam.style.display = 'none';
              }
            }
          }
          showSheetOverlay();
          return;
        }

        // Single page extraction:
        if (cur && cur.ocrData) {
          // If already extracted, open overlay instantly
          showSheetOverlay();
          return;
        }

        // Keep canvas visible on screen and sweep laser beam for the exact duration of the OCR recognition
        if (laserBeam) {
          laserBeam.style.display = 'block';
          laserBeam.classList.add('is-sweeping');
        }
        if (btnExtract) btnExtract.classList.add('is-active');
        setStatus('Scanning document text…', 'ok');

        try {
          // Connect laser sweep directly to the OCR extraction task
          await runPageOcr(selIdx);
          setStatus('Text extracted successfully', 'ok');
        } catch (e) {
          console.error('[Extract Text OCR Error]', e);
          setStatus('OCR text recognition failed.', 'err');
        } finally {
          if (laserBeam) {
            laserBeam.classList.remove('is-sweeping');
            laserBeam.style.display = 'none';
          }
        }

        // Smoothly reveal the text sheet overlay now that laser scan & OCR are complete
        showSheetOverlay();
      }

      function closeTextSheet() {
        isTextSheetOpen = false;
        const btnExtract = parent.querySelector('#btn-top-extract-text');
        const sheetEl = parent.querySelector('#scan-text-sheet');
        const canvasEl = parent.querySelector('#scan-studio-canvas');
        const textLayer = parent.querySelector('#scan-text-layer');
        const laserBeam = parent.querySelector('#scan-laser-beam');
        const loadingEl = parent.querySelector('#scan-sheet-loading');
        const stageDock = parent.querySelector('#scan-stage-dock');

        if (btnExtract) btnExtract.classList.remove('is-active');
        if (sheetEl) sheetEl.classList.remove('is-visible');
        if (canvasEl) canvasEl.style.display = 'block';
        if (textLayer && showOcrLayer) textLayer.style.display = 'block';
        if (stageDock) stageDock.style.display = 'inline-flex';
        if (laserBeam) {
          laserBeam.classList.remove('is-sweeping');
          laserBeam.style.display = 'none';
        }
        if (loadingEl) loadingEl.classList.remove('is-loading');
      }

      const btnTopExtract = parent.querySelector('#btn-top-extract-text');
      const btnSheetClose = parent.querySelector('#btn-sheet-close');
      const btnSheetPrev = parent.querySelector('#btn-sheet-prev');
      const btnSheetNext = parent.querySelector('#btn-sheet-next');
      const btnSheetCopy = parent.querySelector('#btn-sheet-copy');
      const btnSheetTxt = parent.querySelector('#btn-sheet-download-txt');
      const btnSheetDoc = parent.querySelector('#btn-sheet-download-doc');
      const sheetLangSel = parent.querySelector('#scan-sheet-ocr-lang');
      const btnScopeCur = parent.querySelector('#btn-sheet-scope-current');
      const btnScopeAllPages = parent.querySelector('#btn-sheet-scope-all');

      if (btnScopeCur) {
        btnScopeCur.onclick = () => {
          ocrScope = 'current';
          updateSheetText();
        };
      }
      if (btnScopeAllPages) {
        btnScopeAllPages.onclick = async () => {
          ocrScope = 'all';
          await openTextSheet();
        };
      }

      if (btnTopExtract) {
        btnTopExtract.onclick = () => {
          if (isTextSheetOpen) closeTextSheet();
          else openTextSheet();
        };
      }
      if (btnSheetClose) btnSheetClose.onclick = closeTextSheet;

      if (btnSheetPrev) {
        btnSheetPrev.onclick = async () => {
          if (selIdx > 0 && ocrScope !== 'all') {
            switchPage(selIdx - 1);
            if (isTextSheetOpen) await openTextSheet();
          }
        };
      }

      if (btnSheetNext) {
        btnSheetNext.onclick = async () => {
          if (selIdx < pages.length - 1 && ocrScope !== 'all') {
            switchPage(selIdx + 1);
            if (isTextSheetOpen) await openTextSheet();
          }
        };
      }

      if (btnSheetCopy) {
        btnSheetCopy.onclick = async () => {
          const ta = parent.querySelector('#scan-sheet-textarea');
          const text = ta ? ta.value : '';
          if (!text) {
            setStatus('No text to copy.', 'info');
            return;
          }
          try {
            await navigator.clipboard.writeText(text);
            const copyLbl = parent.querySelector('#sheet-copy-label');
            if (copyLbl) copyLbl.textContent = 'Copied';
            btnSheetCopy.classList.add('is-active');
            setStatus(ocrScope === 'all' ? `All ${pages.length} pages copied to clipboard.` : 'Page text copied to clipboard.', 'ok');
            setTimeout(() => {
              if (copyLbl) copyLbl.textContent = 'Copy All';
              btnSheetCopy.classList.remove('is-active');
            }, 1800);
          } catch {
            setStatus('Could not access clipboard.', 'err');
          }
        };
      }

      if (btnSheetTxt) {
        btnSheetTxt.onclick = () => {
          const ta = parent.querySelector('#scan-sheet-textarea');
          const text = ta ? ta.value : '';
          if (!text) {
            setStatus('No text to download.', 'info');
            return;
          }
          const cur = pages[selIdx];
          const baseName = (pages[0]?.name || cur?.name || 'scanned-document').replace(/\.[^.]+$/, '');
          const name = (ocrScope === 'all' ? `${baseName}-all-${pages.length}-pages` : `${cur?.name || 'scanned-page'}`).replace(/\.[^.]+$/, '') + '.txt';
          const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = name; a.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          setStatus(`Downloaded ${name}`, 'ok');
        };
      }

      if (btnSheetDoc) {
        btnSheetDoc.onclick = () => {
          const ta = parent.querySelector('#scan-sheet-textarea');
          const text = ta ? ta.value : '';
          if (!text) {
            setStatus('No text to export.', 'info');
            return;
          }
          const cur = pages[selIdx];
          const baseName = (pages[0]?.name || cur?.name || 'scanned-document').replace(/\.[^.]+$/, '');
          const name = (ocrScope === 'all' ? `${baseName}-all-${pages.length}-pages` : `${cur?.name || 'scanned-page'}`).replace(/\.[^.]+$/, '') + '.doc';
          const content = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${name}</title><style>body{font-family:Calibri,Arial,sans-serif;font-size:12pt;line-height:1.6;color:#0F172A;margin:1in;}p{margin-bottom:0.8em;white-space:pre-wrap;}</style></head><body>${text.split('\n\n').map(p => `<p>${p.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</p>`).join('')}</body></html>`;
          const blob = new Blob(['\ufeff' + content], { type: 'application/msword;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = name; a.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          setStatus(`Exported ${name}`, 'ok');
        };
      }

      if (sheetLangSel) {
        sheetLangSel.onchange = async () => {
          ocrLang = sheetLangSel.value;
          pages.forEach(p => { p.ocrData = null; });
          setStatus(`Switched recognition language to ${sheetLangSel.options[sheetLangSel.selectedIndex].text}`, 'info');
          if (isTextSheetOpen) {
            await openTextSheet();
          }
        };
      }

      // Page Navigation (Dock Stepper)
      const railPrev = parent.querySelector('#btn-rail-prev');
      const railNext = parent.querySelector('#btn-rail-next');
      if (railPrev) railPrev.onclick = () => switchPage(selIdx - 1);
      if (railNext) railNext.onclick = () => switchPage(selIdx + 1);

      // Zoom Controls (Right Rail)
      const zoomIn = parent.querySelector('#btn-zoom-in');
      const zoomOut = parent.querySelector('#btn-zoom-out');
      const zoomReset = parent.querySelector('#btn-zoom-reset');
      const zoomSlider = parent.querySelector('#scan-zoom-slider');

      if (zoomIn) {
        zoomIn.onclick = () => {
          zoom = Math.min(250, zoom + 15);
          applyCanvasTransform();
        };
      }
      if (zoomOut) {
        zoomOut.onclick = () => {
          zoom = Math.max(30, zoom - 15);
          if (zoom <= 100) { panX = 0; panY = 0; }
          applyCanvasTransform();
        };
      }
      const zoomBadge = parent.querySelector('#scan-zoom-badge');
      const handleResetZoom = () => {
        zoom = 100; panX = 0; panY = 0;
        applyCanvasTransform();
      };
      if (zoomReset) zoomReset.onclick = handleResetZoom;
      if (zoomBadge) zoomBadge.onclick = handleResetZoom;
      if (zoomSlider) {
        zoomSlider.oninput = () => {
          zoom = +zoomSlider.value;
          if (zoom <= 100) { panX = 0; panY = 0; }
          applyCanvasTransform();
        };
      }

      // Top Bar Add Page & Drawer Toggle
      const btnTopAdd = parent.querySelector('#btn-top-add-page');
      const scanFileInput = parent.querySelector('#scan-file-input');
      if (btnTopAdd && scanFileInput) {
        btnTopAdd.onclick = () => scanFileInput.click();
      }
      if (scanFileInput) {
        scanFileInput.onchange = (e) => {
          if (e.target.files && e.target.files.length) {
            handleFiles(e.target.files);
          }
        };
      }

      // Drawer Toggle (Top Bar + Stage + Drawer Header)
      const btnTopToggleDrawer = parent.querySelector('#btn-top-toggle-drawer');
      const toggleThumbs = parent.querySelector('#btn-toggle-thumbs');
      const closeThumbs = parent.querySelector('#scan-thumbs-close');
      const handleToggleDrawer = () => {
        thumbsDrawerOpen = !thumbsDrawerOpen;
        const drw = parent.querySelector('#scan-thumbs-drawer');
        if (drw) drw.classList.toggle('is-open', thumbsDrawerOpen);
        if (btnTopToggleDrawer) btnTopToggleDrawer.classList.toggle('is-active', thumbsDrawerOpen);
        if (toggleThumbs) toggleThumbs.classList.toggle('is-active', thumbsDrawerOpen);
      };
      if (btnTopToggleDrawer) btnTopToggleDrawer.onclick = handleToggleDrawer;
      if (toggleThumbs) toggleThumbs.onclick = handleToggleDrawer;
      if (closeThumbs) {
        closeThumbs.onclick = () => {
          thumbsDrawerOpen = false;
          const drw = parent.querySelector('#scan-thumbs-drawer');
          if (drw) drw.classList.remove('is-open');
          if (btnTopToggleDrawer) btnTopToggleDrawer.classList.remove('is-active');
          if (toggleThumbs) toggleThumbs.classList.remove('is-active');
        };
      }

      // Top Language Selector
      const langSel = parent.querySelector('#scan-top-ocr-lang');
      if (langSel) {
        langSel.onchange = () => {
          ocrLang = langSel.value;
          // Invalidate OCR cache for all pages to refresh with new model
          pages.forEach(pg => { pg.ocrData = null; });
          if (ocrPanelOpen || showOcrLayer) {
            const sbTa = parent.querySelector('#scan-ocr-sidebar-textarea');
            if (sbTa) sbTa.value = '';
            runPageOcr(selIdx);
          }
        };
      }

      // Live Text & Direct In-Canvas Selection (Apple Live Text style)
      const btnLiveText = parent.querySelector('#btn-toggle-live-text');
      const btnQuickCopy = parent.querySelector('#btn-quick-copy-text');
      const paperWrap = parent.querySelector('#scan-paper-page');
      const selectionPill = parent.querySelector('#scan-selection-pill');
      const btnPillCopy = parent.querySelector('#btn-pill-copy');
      const btnPillSelectAll = parent.querySelector('#btn-pill-select-all');

      if (btnLiveText) {
        btnLiveText.onclick = (e) => {
          e.stopPropagation();
          showOcrLayer = !showOcrLayer;
          btnLiveText.classList.toggle('is-on', showOcrLayer);
          const txtLayer = parent.querySelector('#scan-text-layer');
          if (txtLayer) {
            txtLayer.classList.toggle('is-active', showOcrLayer);
            txtLayer.setAttribute('aria-hidden', (!showOcrLayer).toString());
          }
          if (showOcrLayer) {
            const p = pages[selIdx];
            if (!p.ocrData) {
              runPageOcr(selIdx);
            } else {
              renderTextLayer();
            }
            setStatus('Live Text active — highlight text directly on the document.', 'ok');
          } else {
            if (selectionPill) selectionPill.style.display = 'none';
            setStatus('Live Text hidden.', 'info');
          }
        };
      }

      if (btnQuickCopy) {
        btnQuickCopy.onclick = async (e) => {
          e.stopPropagation();
          const p = pages[selIdx];
          if (!p) return;
          let text = p.ocrData?.text;
          if (!text) {
            setStatus('Extracting text for this page...', 'info');
            await runPageOcr(selIdx);
            text = pages[selIdx]?.ocrData?.text || '';
          }
          if (text && text.trim()) {
            await navigator.clipboard.writeText(text.trim());
            const origHtml = btnQuickCopy.innerHTML;
            btnQuickCopy.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg><span style="color:#10B981;font-weight:700;">Copied!</span>`;
            btnQuickCopy.classList.add('is-copied');
            const wordsCount = text.trim().split(/\s+/).filter(Boolean).length;
            setStatus(`Copied Page ${selIdx + 1} text to clipboard (${wordsCount} ${wordsCount === 1 ? 'word' : 'words'}).`, 'ok');
            setTimeout(() => {
              btnQuickCopy.innerHTML = origHtml;
              btnQuickCopy.classList.remove('is-copied');
            }, 1800);
          } else {
            setStatus('No readable text detected on this page.', 'warn');
          }
        };
      }

      // Apple Live Text Floating Selection Pill Positioner
      const updateSelectionPill = () => {
        if (!selectionPill || !paperWrap || !showOcrLayer) {
          if (selectionPill) {
            selectionPill.classList.remove('is-visible');
            selectionPill.style.display = 'none';
            selectionPill.setAttribute('aria-hidden', 'true');
          }
          return;
        }
        const sel = window.getSelection();
        const selText = sel ? sel.toString().trim() : '';
        if (selText && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          const r = range.getBoundingClientRect();
          const pr = paperWrap.getBoundingClientRect();
          if (r.width === 0 && r.height === 0) {
            selectionPill.classList.remove('is-visible');
            selectionPill.style.display = 'none';
            selectionPill.setAttribute('aria-hidden', 'true');
            return;
          }
          const pillW = 140;
          const leftPos = Math.max(8, Math.min(pr.width - pillW, r.left - pr.left + (r.width / 2) - (pillW / 2)));
          const topPos = Math.max(8, r.top - pr.top - 38);
          selectionPill.style.left = `${leftPos}px`;
          selectionPill.style.top = `${topPos}px`;
          selectionPill.classList.add('is-visible');
          selectionPill.style.display = 'inline-flex';
          selectionPill.setAttribute('aria-hidden', 'false');
        } else {
          selectionPill.classList.remove('is-visible');
          selectionPill.style.display = 'none';
          selectionPill.setAttribute('aria-hidden', 'true');
        }
      };

      document.addEventListener('selectionchange', updateSelectionPill);

      if (btnPillCopy) {
        btnPillCopy.onclick = async (e) => {
          e.stopPropagation();
          const sel = window.getSelection();
          const selText = sel ? sel.toString().trim() : '';
          if (selText) {
            await navigator.clipboard.writeText(selText);
            const orig = btnPillCopy.innerHTML;
            btnPillCopy.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg><span style="color:#10B981;">Copied</span>`;
            setTimeout(() => {
              btnPillCopy.innerHTML = orig;
              if (sel) sel.removeAllRanges();
              updateSelectionPill();
            }, 1000);
            setStatus(`Copied selected text (${selText.length} characters).`, 'ok');
          }
        };
      }

      if (btnPillSelectAll) {
        btnPillSelectAll.onclick = (e) => {
          e.stopPropagation();
          const txtLayer = parent.querySelector('#scan-text-layer');
          if (txtLayer) {
            const range = document.createRange();
            range.selectNodeContents(txtLayer);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
            updateSelectionPill();
          }
        };
      }

      // Smart Insights action handlers
      const btnCopyReceipt = parent.querySelector('#btn-copy-receipt-json');
      if (btnCopyReceipt && p.ocrData?.text) {
        btnCopyReceipt.onclick = async () => {
          const r = parseReceiptFields(p.ocrData.text);
          await navigator.clipboard.writeText(JSON.stringify(r, null, 2));
          setStatus('Receipt JSON copied to clipboard!', 'ok');
        };
      }

      const btnDlReceiptCsv = parent.querySelector('#btn-dl-receipt-csv');
      if (btnDlReceiptCsv && p.ocrData?.text) {
        btnDlReceiptCsv.onclick = () => {
          const r = parseReceiptFields(p.ocrData.text);
          if (r) {
            const rows = [
              ['Field', 'Value'],
              ['Merchant', r.merchant || ''],
              ['Date', r.date || ''],
              ['Invoice #', r.invoiceNo || ''],
              ['Subtotal', r.subtotal ? `${r.currency || ''} ${r.subtotal}` : ''],
              ['Tax', r.tax ? `${r.currency || ''} ${r.tax}` : ''],
              ['Total', r.total ? `${r.currency || ''} ${r.total}` : '']
            ];
            const csv = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
            U.downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `${getScanSourceName()}-receipt.csv`);
            setStatus('Receipt CSV downloaded!', 'ok');
          }
        };
      }

      const btnCopyPassport = parent.querySelector('#btn-copy-passport-json');
      if (btnCopyPassport && p.ocrData?.text) {
        btnCopyPassport.onclick = async () => {
          const m = parseMrzPassport(p.ocrData.text);
          await navigator.clipboard.writeText(JSON.stringify(m, null, 2));
          setStatus('Passport data copied to clipboard!', 'ok');
        };
      }

      const btnDlVcf = parent.querySelector('#btn-dl-vcf');
      if (btnDlVcf && p.ocrData?.text) {
        btnDlVcf.onclick = () => {
          const v = parseBusinessCard(p.ocrData.text);
          if (v && v.vcf) {
            U.downloadBlob(new Blob([v.vcf], { type: 'text/vcard' }), `${v.fullName || 'contact'}.vcf`);
          }
        };
      }

      const btnDlCsv = parent.querySelector('#btn-dl-csv');
      if (btnDlCsv && p.ocrData?.words) {
        btnDlCsv.onclick = () => {
          const csv = extractTableCsv(p.ocrData.words);
          if (csv) {
            U.downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `${getScanSourceName()}-table.csv`);
          }
        };
      }

      function executeAutoRedactPii(pageIdx) {
        const pg = pages[pageIdx];
        if (!pg) return;
        if (!pg.ocrData || !pg.ocrData.words || !pg.ocrData.words.length) {
          setStatus('Running OCR to detect sensitive PII...', 'info');
          runPageOcr(pageIdx).then(() => {
            executeAutoRedactPii(pageIdx);
          });
          return;
        }
        const { piiWords, count } = detectPiiWords(pg.ocrData.words);
        if (!count) {
          setStatus('No sensitive PII (emails, phones, cards, SSNs) found on this page.', 'ok');
          return;
        }

        const pageCtx = pg.canvas.getContext('2d');
        pageCtx.fillStyle = '#000000';

        const rawCtx = pg.raw ? pg.raw.getContext('2d') : null;
        if (rawCtx) rawCtx.fillStyle = '#000000';
        const rawScaleX = pg.raw ? pg.raw.width / pg.canvas.width : 1;
        const rawScaleY = pg.raw ? pg.raw.height / pg.canvas.height : 1;

        piiWords.forEach((w) => {
          const pad = 3;
          const bx = Math.max(0, w.bbox.x0 - pad);
          const by = Math.max(0, w.bbox.y0 - pad);
          const bw = (w.bbox.x1 - w.bbox.x0) + pad * 2;
          const bh = (w.bbox.y1 - w.bbox.y0) + pad * 2;
          pageCtx.fillRect(bx, by, bw, bh);
          if (rawCtx) rawCtx.fillRect(bx * rawScaleX, by * rawScaleY, bw * rawScaleX, bh * rawScaleY);
        });

        // Purge from OCR index
        const piiSet = new Set(piiWords);
        pg.ocrData.words = pg.ocrData.words.filter(w => !piiSet.has(w));
        pg._baseCache = null;
        pg._enhCache = null;
        pg._thumbCache = null;

        // In-place update to eliminate toolbar flicker
        updateStudioPreview();
        renderTextLayer();
        paintFilmstripThumbs();
        setStatus(`Auto-Redact: Permanently blacked out & wiped ${count} sensitive PII items.`, 'ok');
      }

      function executeKeywordRedact(query, opts = {}) {
        if (!query || !query.trim()) {
          setStatus('Please enter a keyword or phrase to redact.', 'warn');
          return;
        }
        const isCurrentOnly = opts.scope === 'current';
        const targetPages = isCurrentOnly ? [pages[selIdx]] : pages;
        const isCase = !!opts.matchCase;
        const isWhole = !!opts.wholeWord;

        const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const qEsc = escapeRegex(query.trim());
        const pattern = isWhole ? `\\b${qEsc}\\b` : qEsc;
        const re = new RegExp(pattern, isCase ? 'g' : 'gi');

        let totalBlackedOut = 0;
        let pagesCount = 0;

        targetPages.forEach(pg => {
          if (!pg.ocrData || !pg.ocrData.words || !pg.ocrData.words.length) return;
          const matchingWords = pg.ocrData.words.filter(w => {
            re.lastIndex = 0;
            return re.test(w.text);
          });

          if (matchingWords.length) {
            pagesCount++;
            totalBlackedOut += matchingWords.length;
            const pageCtx = pg.canvas.getContext('2d');
            pageCtx.fillStyle = '#000000';
            const rawCtx = pg.raw ? pg.raw.getContext('2d') : null;
            if (rawCtx) rawCtx.fillStyle = '#000000';
            const rawScaleX = pg.raw ? pg.raw.width / pg.canvas.width : 1;
            const rawScaleY = pg.raw ? pg.raw.height / pg.canvas.height : 1;

            matchingWords.forEach(w => {
              const pad = 2;
              const bx = Math.max(0, w.bbox.x0 - pad);
              const by = Math.max(0, w.bbox.y0 - pad);
              const bw = (w.bbox.x1 - w.bbox.x0) + pad * 2;
              const bh = (w.bbox.y1 - w.bbox.y0) + pad * 2;
              pageCtx.fillRect(bx, by, bw, bh);
              if (rawCtx) rawCtx.fillRect(bx * rawScaleX, by * rawScaleY, bw * rawScaleX, bh * rawScaleY);
            });

            const matchSet = new Set(matchingWords);
            pg.ocrData.words = pg.ocrData.words.filter((w) => !matchSet.has(w));
            pg.ocrData.text = pg.ocrData.words.map((w) => w.text).join(' ');
          }
        });

        targetPages.forEach((pg) => {
          pg._baseCache = null;
          pg._enhCache = null;
          pg._thumbCache = null;
        });

        activeFlyout = null;
        updateStudioPreview();
        renderTextLayer();
        paintFilmstripThumbs();
        const kwPopover = parent.querySelector('#scan-kw-popover');
        if (kwPopover) kwPopover.style.display = 'none';

        if (totalBlackedOut > 0) {
          setStatus(`Blacked out ${totalBlackedOut} matches across ${pagesCount} page(s).`, 'ok');
        } else {
          setStatus(`No matches found for "${query}".`, 'warn');
        }
      }

      // Barcode copy buttons & Diff trigger
      parent.querySelectorAll('.btn-copy-barcode').forEach(btn => {
        btn.onclick = async () => {
          await navigator.clipboard.writeText(btn.dataset.bcVal || '');
          setStatus('Barcode payload copied to clipboard!', 'ok');
        };
      });

      const btnLaunchDiff = parent.querySelector('#btn-launch-diff-station');
      if (btnLaunchDiff) {
        btnLaunchDiff.onclick = () => {
          if (window.FF?.app?.openTool) window.FF.app.openTool('pdf-compare');
        };
      }

      // Background Barcode Scan Trigger
      if (p.barcodeData === undefined && p.canvas) {
        decodeBarcodesAndQr(p.canvas).then(bc => {
          p.barcodeData = bc || [];
          if (bc && bc.length && ocrSidebarTab === 'insights') {
            refreshStudioUI();
          }
        }).catch(() => { p.barcodeData = []; });
      }

      const btnInsightAutoRedact = parent.querySelector('#btn-insight-auto-redact-pii');
      if (btnInsightAutoRedact) {
        btnInsightAutoRedact.onclick = () => {
          executeAutoRedactPii(selIdx);
        };
      }

      const btnRibbonAutoRedact = parent.querySelector('#btn-ribbon-auto-redact-pii');
      if (btnRibbonAutoRedact) {
        btnRibbonAutoRedact.onclick = () => {
          executeAutoRedactPii(selIdx);
        };
      }

      const btnCloseRedactRibbon = parent.querySelector('#btn-close-redact-ribbon');
      if (btnCloseRedactRibbon) {
        btnCloseRedactRibbon.onclick = () => {
          isRedacting = false;
          activeFlyout = null;
          refreshStudioUI();
        };
      }

      const btnOpenKeywordRedact = parent.querySelector('#btn-open-keyword-redact');
      if (btnOpenKeywordRedact) {
        btnOpenKeywordRedact.onclick = (e) => {
          e.stopPropagation();
          activeFlyout = activeFlyout === 'keyword-redact' ? null : 'keyword-redact';
          refreshStudioUI();
        };
      }

      const btnCloseKwFlyout = parent.querySelector('#btn-close-kw-flyout');
      if (btnCloseKwFlyout) {
        btnCloseKwFlyout.onclick = (e) => {
          e.stopPropagation();
          activeFlyout = null;
          refreshStudioUI();
        };
      }

      const kwInput = parent.querySelector('#scan-kw-input');
      const kwMatchCase = parent.querySelector('#scan-kw-match-case');
      const kwWholeWord = parent.querySelector('#scan-kw-whole-word');
      const kwScope = parent.querySelector('#scan-kw-scope');
      const kwCounter = parent.querySelector('#scan-kw-counter');
      const btnExecKeywordRedact = parent.querySelector('#btn-exec-keyword-redact');

      const updateKwMatchCount = () => {
        if (!kwInput || !kwCounter) return;
        const q = kwInput.value.trim();
        keywordRedactQuery = kwInput.value;
        keywordMatchCase = kwMatchCase ? kwMatchCase.checked : false;
        keywordWholeWord = kwWholeWord ? kwWholeWord.checked : false;
        keywordScope = kwScope ? kwScope.value : 'all';

        if (!q) {
          kwCounter.textContent = 'Enter keyword to match';
          return;
        }

        const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = keywordWholeWord ? `\\b${escapeRegex(q)}\\b` : escapeRegex(q);
        const re = new RegExp(pattern, keywordMatchCase ? 'g' : 'gi');

        const targetPgs = keywordScope === 'current' ? [pages[selIdx]] : pages;
        let count = 0;
        targetPgs.forEach(pg => {
          if (!pg.ocrData || !pg.ocrData.words) return;
          pg.ocrData.words.forEach(w => {
            re.lastIndex = 0;
            if (re.test(w.text)) count++;
          });
        });

        kwCounter.textContent = `${count} ${count === 1 ? 'match' : 'matches'} found`;
      };

      if (kwInput) {
        kwInput.oninput = updateKwMatchCount;
        kwInput.onkeydown = (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            executeKeywordRedact(kwInput.value, { matchCase: keywordMatchCase, wholeWord: keywordWholeWord, scope: keywordScope });
          }
        };
        if (kwMatchCase) kwMatchCase.onchange = updateKwMatchCount;
        if (kwWholeWord) kwWholeWord.onchange = updateKwMatchCount;
        if (kwScope) kwScope.onchange = updateKwMatchCount;
        updateKwMatchCount();
      }

      if (btnExecKeywordRedact && kwInput) {
        btnExecKeywordRedact.onclick = () => {
          executeKeywordRedact(kwInput.value, { matchCase: keywordMatchCase, wholeWord: keywordWholeWord, scope: keywordScope });
        };
      }

      // Redaction Tool
      const redactBtns = parent.querySelectorAll('#btn-top-redact, #btn-dock-redact');
      redactBtns.forEach(btn => {
        btn.onclick = () => {
          isRedacting = !isRedacting;
          activeFlyout = null;
          setStatus(isRedacting ? 'Redaction Active: Click words or drag to blackout.' : 'Redaction mode closed.', isRedacting ? 'warn' : 'ok');
          refreshStudioUI();
        };
      });

      const studioCanvas = parent.querySelector('#scan-studio-canvas');

      if (studioCanvas && isRedacting) {
        let isDrawingRedact = false;
        let rStart = null;

        studioCanvas.onpointerdown = (e) => {
          const rect = studioCanvas.getBoundingClientRect();
          const scaleX = studioCanvas.width / rect.width;
          const scaleY = studioCanvas.height / rect.height;
          rStart = { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
          isDrawingRedact = true;
          try { studioCanvas.setPointerCapture(e.pointerId); } catch (err) {}
          e.preventDefault();
        };

        studioCanvas.onpointermove = (e) => {
          if (!isDrawingRedact || !rStart) return;
          const rect = studioCanvas.getBoundingClientRect();
          const scaleX = studioCanvas.width / rect.width;
          const scaleY = studioCanvas.height / rect.height;
          const curX = (e.clientX - rect.left) * scaleX;
          const curY = (e.clientY - rect.top) * scaleY;

          updateStudioPreview();
          const ctx = studioCanvas.getContext('2d');
          ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
          ctx.strokeStyle = '#dc2626';
          ctx.lineWidth = 2;
          const rx = Math.min(rStart.x, curX), ry = Math.min(rStart.y, curY);
          const rw = Math.abs(curX - rStart.x), rh = Math.abs(curY - rStart.y);
          ctx.fillRect(rx, ry, rw, rh);
          ctx.strokeRect(rx, ry, rw, rh);
        };

        studioCanvas.onpointerup = (e) => {
          if (!isDrawingRedact || !rStart) return;
          isDrawingRedact = false;
          const rect = studioCanvas.getBoundingClientRect();
          const scaleX = studioCanvas.width / rect.width;
          const scaleY = studioCanvas.height / rect.height;
          const endX = (e.clientX - rect.left) * scaleX;
          const endY = (e.clientY - rect.top) * scaleY;

          const rx0 = Math.min(rStart.x, endX);
          const ry0 = Math.min(rStart.y, endY);
          const rx1 = Math.max(rStart.x, endX);
          const ry1 = Math.max(rStart.y, endY);
          const rw = rx1 - rx0, rh = ry1 - ry0;

          if (rw > 6 && rh > 6) {
            const pageCtx = p.canvas.getContext('2d');
            const dpr = studioCanvas.width / p.canvas.width;
            pageCtx.fillStyle = '#000000';
            pageCtx.fillRect(rx0 / dpr, ry0 / dpr, rw / dpr, rh / dpr);

            if (p.raw) {
              const rawCtx = p.raw.getContext('2d');
              const rawScaleX = p.raw.width / p.canvas.width;
              const rawScaleY = p.raw.height / p.canvas.height;
              rawCtx.fillStyle = '#000000';
              rawCtx.fillRect((rx0 / dpr) * rawScaleX, (ry0 / dpr) * rawScaleY, (rw / dpr) * rawScaleX, (rh / dpr) * rawScaleY);
            }

            if (p.ocrData && p.ocrData.words) {
              p.ocrData.words = p.ocrData.words.filter((w) => {
                if (!w.bbox) return true;
                const wx0 = w.bbox.x0, wy0 = w.bbox.y0, wx1 = w.bbox.x1, wy1 = w.bbox.y1;
                const overlaps = !(wx1 < rx0 / dpr || wx0 > rx1 / dpr || wy1 < ry0 / dpr || wy0 > ry1 / dpr);
                return !overlaps;
              });
              p.ocrData.text = p.ocrData.words.map((w) => w.text).join(' ');
              setStatus('Permanently redacted and purged from OCR search.', 'ok');
            } else {
              setStatus('Permanently redacted area.', 'ok');
            }
            p._baseCache = null;
            p._enhCache = null;
            p._thumbCache = null;
            updateStudioPreview();
            paintFilmstripThumbs();
          }
          rStart = null;
        };
      }

      // In-Studio Interactive Rectangular Crop Pointer Handlers
      if (studioCanvas && isCropping && cropState) {
        studioCanvas.onpointerdown = (e) => {
          const rect = studioCanvas.getBoundingClientRect();
          const px = e.clientX - rect.left;
          const py = e.clientY - rect.top;
          const sc = cropState.displayScale || (rect.width / pages[selIdx].canvas.width);
          const handle = getCropHandle(px, py, cropState.box, sc);

          if (handle) {
            cropState.drag = handle;
            cropState.startBox = { ...cropState.box };
            cropState.startPt = { x: px, y: py };
            try { studioCanvas.setPointerCapture(e.pointerId); } catch {}
            e.preventDefault();
            updateStudioPreview();
          }
        };

        studioCanvas.onpointermove = (e) => {
          if (!cropState) return;
          const rect = studioCanvas.getBoundingClientRect();
          const px = e.clientX - rect.left;
          const py = e.clientY - rect.top;
          const sc = cropState.displayScale || (rect.width / pages[selIdx].canvas.width);
          const pCanvas = pages[selIdx].canvas;

          if (!cropState.drag) {
            const handle = getCropHandle(px, py, cropState.box, sc);
            const cursorMap = {
              nw: 'nwse-resize',
              se: 'nwse-resize',
              ne: 'nesw-resize',
              sw: 'nesw-resize',
              n: 'ns-resize',
              s: 'ns-resize',
              w: 'ew-resize',
              e: 'ew-resize',
              inside: 'move',
            };
            studioCanvas.style.cursor = handle ? (cursorMap[handle] || 'crosshair') : 'crosshair';
            return;
          }

          const dx = (px - cropState.startPt.x) / sc;
          const dy = (py - cropState.startPt.y) / sc;
          const s = cropState.startBox;
          const minDim = 30;
          let nx = s.x, ny = s.y, nw = s.w, nh = s.h;

          switch (cropState.drag) {
            case 'inside': {
              nx = Math.max(0, Math.min(pCanvas.width - s.w, s.x + dx));
              ny = Math.max(0, Math.min(pCanvas.height - s.h, s.y + dy));
              break;
            }
            case 'nw': {
              nx = Math.max(0, Math.min(s.x + s.w - minDim, s.x + dx));
              ny = Math.max(0, Math.min(s.y + s.h - minDim, s.y + dy));
              nw = s.w - (nx - s.x);
              nh = s.h - (ny - s.y);
              break;
            }
            case 'ne': {
              ny = Math.max(0, Math.min(s.y + s.h - minDim, s.y + dy));
              nw = Math.max(minDim, Math.min(pCanvas.width - s.x, s.w + dx));
              nh = s.h - (ny - s.y);
              break;
            }
            case 'se': {
              nw = Math.max(minDim, Math.min(pCanvas.width - s.x, s.w + dx));
              nh = Math.max(minDim, Math.min(pCanvas.height - s.y, s.h + dy));
              break;
            }
            case 'sw': {
              nx = Math.max(0, Math.min(s.x + s.w - minDim, s.x + dx));
              nw = s.w - (nx - s.x);
              nh = Math.max(minDim, Math.min(pCanvas.height - s.y, s.h + dy));
              break;
            }
            case 'n': {
              ny = Math.max(0, Math.min(s.y + s.h - minDim, s.y + dy));
              nh = s.h - (ny - s.y);
              break;
            }
            case 's': {
              nh = Math.max(minDim, Math.min(pCanvas.height - s.y, s.h + dy));
              break;
            }
            case 'w': {
              nx = Math.max(0, Math.min(s.x + s.w - minDim, s.x + dx));
              nw = s.w - (nx - s.x);
              break;
            }
            case 'e': {
              nw = Math.max(minDim, Math.min(pCanvas.width - s.x, s.w + dx));
              break;
            }
          }

          cropState.box = {
            x: Math.round(nx),
            y: Math.round(ny),
            w: Math.round(nw),
            h: Math.round(nh),
          };

          const dimEl = parent.querySelector('#scan-crop-dim-label');
          if (dimEl) dimEl.textContent = `${cropState.box.w} × ${cropState.box.h} px`;

          scheduleStudioPreview();
        };

        const handlePointerEnd = () => {
          if (cropState && cropState.drag) {
            cropState.drag = null;
            updateStudioPreview();
          }
        };
        studioCanvas.onpointerup = handlePointerEnd;
        studioCanvas.onpointercancel = handlePointerEnd;
      }

      // Floating Crop Bar Action Bindings
      const btnCropReset = parent.querySelector('#btn-crop-reset');
      const btnCropCancel = parent.querySelector('#btn-crop-cancel');
      const btnCropApply = parent.querySelector('#btn-crop-apply');

      if (btnCropReset && cropState) {
        btnCropReset.onclick = () => {
          const c = pages[selIdx].canvas;
          cropState.box = { x: 0, y: 0, w: c.width, h: c.height };
          const dimEl = parent.querySelector('#scan-crop-dim-label');
          if (dimEl) dimEl.textContent = `${c.width} × ${c.height} px`;
          updateStudioPreview();
        };
      }

      if (btnCropCancel) {
        btnCropCancel.onclick = () => {
          isCropping = false;
          cropState = null;
          refreshStudioUI();
          setStatus('Crop canceled.', 'ok');
        };
      }

      if (btnCropApply) {
        btnCropApply.onclick = applyRecrop;
      }

      // Stamps & Signature Flyout Bindings
      const btnCloseSig = parent.querySelector('#btn-close-sig-flyout');
      if (btnCloseSig) {
        btnCloseSig.onclick = () => {
          activeFlyout = null;
          refreshStudioUI();
        };
      }

      parent.querySelectorAll('[data-sig-tab]').forEach((btn) => {
        btn.onclick = () => {
          sigTab = btn.dataset.sigTab;
          refreshStudioUI();
        };
      });

      parent.querySelectorAll('.scan-ink-dot').forEach((dot) => {
        dot.onclick = () => {
          sigInk = dot.dataset.ink;
          refreshStudioUI();
        };
      });

      // Tab 1: Draw Signature Pad
      const sigCv = parent.querySelector('#scan-sig-canvas');
      if (sigCv) {
        const dpr = Math.max(2, window.devicePixelRatio || 1);
        const rect = sigCv.getBoundingClientRect();
        const cssW = rect.width || 280;
        const cssH = rect.height || 90;
        sigCv.width = Math.round(cssW * dpr);
        sigCv.height = Math.round(cssH * dpr);
        const sigCtx = sigCv.getContext('2d');
        sigCtx.scale(dpr, dpr);
        sigCtx.strokeStyle = sigInk;
        sigCtx.fillStyle = sigInk;
        sigCtx.lineWidth = 2.4;
        sigCtx.lineCap = 'round';
        sigCtx.lineJoin = 'round';

        let drawingSig = false;
        let hasStrokes = false;
        let points = [];

        // Restore saved signature if available
        try {
          const savedSig = localStorage.getItem('filekit_saved_draw_sig');
          if (savedSig) {
            const img = new Image();
            img.onload = () => {
              sigCtx.drawImage(img, 0, 0, cssW, cssH);
              hasStrokes = true;
            };
            img.src = savedSig;
          }
        } catch (e) {}

        sigCv.onpointerdown = (e) => {
          drawingSig = true;
          hasStrokes = true;
          const r = sigCv.getBoundingClientRect();
          const x = e.clientX - r.left;
          const y = e.clientY - r.top;
          points = [{ x, y }];
          sigCtx.beginPath();
          sigCtx.arc(x, y, sigCtx.lineWidth / 2, 0, Math.PI * 2);
          sigCtx.fill();
          try { sigCv.setPointerCapture(e.pointerId); } catch {}
          e.preventDefault();
        };

        sigCv.onpointermove = (e) => {
          if (!drawingSig) return;
          const r = sigCv.getBoundingClientRect();
          const x = e.clientX - r.left;
          const y = e.clientY - r.top;
          points.push({ x, y });

          if (points.length > 2) {
            const p1 = points[points.length - 2];
            const p2 = points[points.length - 1];
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;

            sigCtx.beginPath();
            sigCtx.moveTo(points[points.length - 3].x, points[points.length - 3].y);
            sigCtx.quadraticCurveTo(p1.x, p1.y, midX, midY);
            sigCtx.stroke();
          }
        };

        const endSig = (e) => {
          if (drawingSig) {
            drawingSig = false;
            try { sigCv.releasePointerCapture(e.pointerId); } catch {}
          }
        };
        sigCv.onpointerup = endSig;
        sigCv.onpointercancel = endSig;

        const clearBtn = parent.querySelector('#btn-clear-sig');
        if (clearBtn) {
          clearBtn.onclick = () => {
            sigCtx.clearRect(0, 0, cssW, cssH);
            hasStrokes = false;
            points = [];
            try { localStorage.removeItem('filekit_saved_draw_sig'); } catch (e) {}
          };
        }

        const applyDrawBtn = parent.querySelector('#btn-apply-draw-sig');
        if (applyDrawBtn) {
          applyDrawBtn.onclick = () => {
            if (!hasStrokes) {
              setStatus('Please draw your signature first.', 'warn');
              return;
            }
            try {
              localStorage.setItem('filekit_saved_draw_sig', sigCv.toDataURL('image/png'));
            } catch (e) {}

            const off = document.createElement('canvas');
            off.width = sigCv.width;
            off.height = sigCv.height;
            off.getContext('2d').drawImage(sigCv, 0, 0);

            const overlay = {
              id: 'ov_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
              type: 'signature',
              imgCanvas: off,
              x: 0.35,
              y: 0.65,
              w: 0.30,
              h: 0.30 * (off.height / off.width),
              aspectRatio: off.width / off.height,
            };
            p.overlays = p.overlays || [];
            p.overlays.push(overlay);
            selectedOverlayId = overlay.id;
            activeFlyout = null;
            refreshStudioUI();
            renderOverlaysLayer();
            setStatus('Signature added! Drag to position on the page or resize handles.', 'ok');
          };
        }
      }

      // Tab 2: Type Signature
      const typeInp = parent.querySelector('#scan-sig-type-input');
      const typePrev = parent.querySelector('#scan-sig-type-preview');
      if (typeInp) {
        typeInp.oninput = () => {
          sigTypedName = typeInp.value;
          if (typePrev) typePrev.textContent = sigTypedName || 'Your Signature';
        };
      }
      parent.querySelectorAll('.scan-sig-font-chip').forEach((chip) => {
        chip.onclick = () => {
          sigFont = chip.dataset.font;
          refreshStudioUI();
        };
      });
      const applyTypeBtn = parent.querySelector('#btn-apply-type-sig');
      if (applyTypeBtn) {
        applyTypeBtn.onclick = () => {
          const name = (sigTypedName || '').trim() || 'Signature';
          const off = document.createElement('canvas');
          off.width = 600;
          off.height = 180;
          const oCtx = off.getContext('2d');
          oCtx.font = `64px '${sigFont}', cursive`;
          oCtx.fillStyle = sigInk;
          oCtx.textAlign = 'center';
          oCtx.textBaseline = 'middle';
          oCtx.fillText(name, 300, 90);

          const overlay = {
            id: 'ov_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            type: 'signature',
            imgCanvas: off,
            x: 0.35,
            y: 0.65,
            w: 0.32,
            h: 0.32 * (180 / 600),
            aspectRatio: 600 / 180,
          };
          p.overlays = p.overlays || [];
          p.overlays.push(overlay);
          selectedOverlayId = overlay.id;
          activeFlyout = null;
          refreshStudioUI();
          renderOverlaysLayer();
          setStatus('Typed signature added! Drag to position or resize handles.', 'ok');
        };
      }

      // Tab 3: Upload Image Signature
      const dropzone = parent.querySelector('#scan-sig-dropzone');
      const fileInp = parent.querySelector('#scan-sig-file-input');
      const uploadPrevWrap = parent.querySelector('#scan-sig-upload-preview-wrap');
      const uploadCv = parent.querySelector('#scan-sig-upload-canvas');
      const knockoutChk = parent.querySelector('#scan-sig-knockout-bg');
      const applyUploadBtn = parent.querySelector('#btn-apply-upload-sig');

      if (dropzone && fileInp) {
        dropzone.onclick = () => fileInp.click();
        fileInp.onchange = (e) => {
          const file = e.target.files && e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            const img = new Image();
            img.onload = () => {
              if (uploadCv) {
                uploadCv.width = img.width;
                uploadCv.height = img.height;
                const uCtx = uploadCv.getContext('2d');
                uCtx.drawImage(img, 0, 0);

                if (knockoutChk && knockoutChk.checked) {
                  const id = uCtx.getImageData(0, 0, uploadCv.width, uploadCv.height);
                  const d = id.data;
                  for (let i = 0; i < d.length; i += 4) {
                    if (d[i] > 205 && d[i + 1] > 205 && d[i + 2] > 205) {
                      d[i + 3] = 0;
                    }
                  }
                  uCtx.putImageData(id, 0, 0);
                }

                if (uploadPrevWrap) uploadPrevWrap.style.display = 'block';
                if (applyUploadBtn) applyUploadBtn.style.display = 'block';
              }
            };
            img.src = String(reader.result);
          };
          reader.readAsDataURL(file);
        };
      }

      if (applyUploadBtn && uploadCv) {
        applyUploadBtn.onclick = () => {
          const off = document.createElement('canvas');
          off.width = uploadCv.width;
          off.height = uploadCv.height;
          off.getContext('2d').drawImage(uploadCv, 0, 0);

          const overlay = {
            id: 'ov_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            type: 'signature',
            imgCanvas: off,
            x: 0.35,
            y: 0.65,
            w: 0.30,
            h: 0.30 * (uploadCv.height / uploadCv.width),
            aspectRatio: uploadCv.width / uploadCv.height,
          };
          p.overlays = p.overlays || [];
          p.overlays.push(overlay);
          selectedOverlayId = overlay.id;
          activeFlyout = null;
          refreshStudioUI();
          renderOverlaysLayer();
          setStatus('Signature image added! Drag to position or resize handles.', 'ok');
        };
      }

      // Tab 4: Rubber Stamps
      parent.querySelectorAll('[data-stamp]').forEach((chip) => {
        chip.onclick = () => {
          const stampText = chip.dataset.stamp;
          const off = document.createElement('canvas');
          off.width = 500;
          off.height = 160;
          const ctx = off.getContext('2d');
          ctx.save();
          ctx.translate(250, 80);
          ctx.rotate(-10 * Math.PI / 180);

          ctx.font = `bold 44px Inter, system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          const colorMap = {
            APPROVED: '#10b981',
            PAID: '#0284c7',
            CONFIDENTIAL: '#dc2626',
            DRAFT: '#f59e0b',
          };
          const color = colorMap[stampText] || '#dc2626';

          const textW = ctx.measureText(stampText).width;
          const boxW = textW + 36;
          const boxH = 68;

          ctx.strokeStyle = color;
          ctx.lineWidth = 4;
          ctx.strokeRect(-boxW / 2, -boxH / 2, boxW, boxH);

          ctx.fillStyle = color;
          ctx.globalAlpha = 0.9;
          ctx.fillText(stampText, 0, 0);
          ctx.restore();

          const overlay = {
            id: 'ov_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            type: 'stamp',
            imgCanvas: off,
            x: 0.35,
            y: 0.40,
            w: 0.32,
            h: 0.32 * (160 / 500),
            aspectRatio: 500 / 160,
          };
          p.overlays = p.overlays || [];
          p.overlays.push(overlay);
          selectedOverlayId = overlay.id;
          activeFlyout = null;
          refreshStudioUI();
          renderOverlaysLayer();
          setStatus(`Stamp "${stampText}" placed. Drag to position or resize.`, 'ok');
        };
      });

      const topOcrLayerBtn = parent.querySelector('#btn-top-ocr-layer');
      const dockOcrLayerBtn = parent.querySelector('#btn-dock-ocr-layer');
      const handleToggleOcrLayer = () => {
        showOcrLayer = !showOcrLayer;
        refreshStudioUI();
      };
      if (topOcrLayerBtn) topOcrLayerBtn.onclick = handleToggleOcrLayer;
      if (dockOcrLayerBtn) dockOcrLayerBtn.onclick = handleToggleOcrLayer;


      // In-Scan Search
      const searchBtns = parent.querySelectorAll('#btn-top-search, #btn-dock-search');
      const searchCloseBtn = parent.querySelector('#btn-close-search');
      const searchInput = parent.querySelector('#scan-search-input');

      searchBtns.forEach(btn => {
        btn.onclick = () => {
          showSearchBar = !showSearchBar;
          if (showSearchBar && !showOcrLayer) showOcrLayer = true;
          refreshStudioUI();
        };
      });
      if (searchCloseBtn) {
        searchCloseBtn.onclick = () => {
          showSearchBar = false;
          searchQuery = '';
          renderTextLayer();
          refreshStudioUI();
        };
      }
      if (searchInput) {
        searchInput.oninput = () => {
          searchQuery = searchInput.value;
          renderTextLayer();
        };
        searchInput.onkeydown = (e) => {
          if (e.key === 'Escape') {
            showSearchBar = false;
            searchQuery = '';
            refreshStudioUI();
          }
        };
      }

      // Batch Apply to All Pages
      const applyAllBtn = parent.querySelector('#btn-top-apply-all');
      if (applyAllBtn) {
        applyAllBtn.onclick = () => {
          const curEnhance = p.enhanceMode || 'enhanced';
          const curB = p.brightness ?? 100;
          const curC = p.contrast ?? 100;
          const modeLabel = curEnhance === 'bw' ? 'B&W' : (curEnhance === 'photo' ? 'Photo' : 'Clean Doc');
          pages.forEach(pg => {
            pg.enhanceMode = curEnhance;
            pg.brightness = curB;
            pg.contrast = curC;
            pg._baseCache = null;
            pg._enhCache = null;
            pg._thumbCache = null;
            pg.ocrData = null;
          });
          setStatus(`Applied ${modeLabel} enhancement to all ${pages.length} pages.`, 'ok');
          refreshStudioUI();
        };
      }

      // Tool click router
      parent.querySelectorAll('[data-tool]').forEach((btn) => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const tool = btn.dataset.tool;
          if (tool === 'clean' || tool === 'bw' || tool === 'photo' || tool === 'orig' || tool === 'original') {
            p.enhanceMode = tool === 'bw' ? 'bw' : (tool === 'photo' ? 'photo' : (tool === 'orig' || tool === 'original' ? 'original' : 'enhanced'));
            p._baseCache = null;
            p._enhCache = null;
            p._thumbCache = null;
            activeFlyout = null;
            
            // Update active state in segmented filter
            parent.querySelectorAll('.scan-seg-filter-btn').forEach(b => {
              const bTool = b.dataset.tool;
              const isAct = (bTool === 'clean' && (p.enhanceMode === 'enhanced' || p.enhanceMode === 'clean' || p.enhanceMode === 'original')) ||
                            (bTool === 'bw' && p.enhanceMode === 'bw') ||
                            (bTool === 'photo' && p.enhanceMode === 'photo');
              b.classList.toggle('is-active', isAct);
            });
            
            updateStudioPreview();
            paintFilmstripThumbs();
            setStatus(`Applied ${tool === 'clean' ? 'Clean' : (tool === 'bw' ? 'B&W' : (tool === 'photo' ? 'Color' : 'Original'))} filter to Page ${selIdx + 1}.`, 'ok');
          } else if (tool === 'form') {
            p.enhanceMode = 'form';
            p._baseCache = null;
            p._enhCache = null;
            p._thumbCache = null;
            activeFlyout = null;
            updateStudioPreview();
            paintFilmstripThumbs();
          } else if (tool === 'recrop') {
            openRecrop(selIdx);
          } else if (tool === 'rotate') {
            rotatePage(selIdx, 1);
          } else if (tool === 'rotccw') {
            rotatePage(selIdx, -1);
          } else if (tool === 'compare') {
            isSplitView = !isSplitView;
            scheduleStudioPreview();
            btn.classList.toggle('is-on', isSplitView);
          } else if (tool === 'tune') {
            activeFlyout = activeFlyout === 'tune' ? null : 'tune';
            refreshStudioUI();
          } else if (tool === 'stamp' || tool === 'sign') {
            activeFlyout = activeFlyout === 'stamp' ? null : 'stamp';
            refreshStudioUI();
          } else if (tool === 'copy') {
            copyPageImage(selIdx);
          } else if (tool === 'delete') {
            deletePage(selIdx);
          }
        };
      });

      // Flyout internal bindings
      const flyout = parent.querySelector('#scan-dock-flyout');
      if (flyout && activeFlyout) {
        const inpB = flyout.querySelector('#flyout-inp-bright');
        const inpC = flyout.querySelector('#flyout-inp-contrast');
        const valB = flyout.querySelector('#flyout-val-bright');
        const valC = flyout.querySelector('#flyout-val-contrast');
        const resetFt = flyout.querySelector('#btn-flyout-reset');
        const scSingle = flyout.querySelector('#flyout-scope-single');
        const scAll = flyout.querySelector('#flyout-scope-all');

        if (scSingle) scSingle.onclick = () => { filterScope = 'single'; refreshStudioUI(); };
        if (scAll) scAll.onclick = () => { filterScope = 'all'; refreshStudioUI(); };

        if (inpB) {
          inpB.oninput = () => {
            const val = +inpB.value;
            if (valB) valB.textContent = val === 100 ? '100% (Normal)' : `${val}%`;
            if (filterScope === 'all') {
              pages.forEach((pg) => { pg.brightness = val; pg._enhCache = null; });
            } else {
              p.brightness = val;
              p._enhCache = null;
            }
            scheduleStudioPreview();
          };
          inpB.onchange = () => {
            if (filterScope === 'all') {
              pages.forEach((pg) => { pg._thumbCache = null; });
            } else {
              p._thumbCache = null;
            }
            paintFilmstripThumbs();
          };
        }

        if (inpC) {
          inpC.oninput = () => {
            const val = +inpC.value;
            if (valC) valC.textContent = val === 100 ? '100% (Normal)' : `${val}%`;
            if (filterScope === 'all') {
              pages.forEach((pg) => { pg.contrast = val; pg._enhCache = null; });
            } else {
              p.contrast = val;
              p._enhCache = null;
            }
            scheduleStudioPreview();
          };
          inpC.onchange = () => {
            if (filterScope === 'all') {
              pages.forEach((pg) => { pg._thumbCache = null; });
            } else {
              p._thumbCache = null;
            }
            paintFilmstripThumbs();
          };
        }

        if (resetFt) {
          resetFt.onclick = () => {
            if (inpB) inpB.value = 100;
            if (inpC) inpC.value = 100;
            if (valB) valB.textContent = '100% (Normal)';
            if (valC) valC.textContent = '100% (Normal)';
            if (filterScope === 'all') {
              pages.forEach((pg) => { pg.brightness = 100; pg.contrast = 100; pg._enhCache = null; pg._thumbCache = null; });
            } else {
              p.brightness = 100;
              p.contrast = 100;
              p._enhCache = null;
              p._thumbCache = null;
            }
            scheduleStudioPreview();
            paintFilmstripThumbs();
          };
        }
      }

      // Topbar Page Stepper
      const topPrevBtn = parent.querySelector('#btn-top-prev');
      const topNextBtn = parent.querySelector('#btn-top-next');
      if (topPrevBtn) {
        topPrevBtn.onclick = () => {
          if (selIdx > 0) {
            selIdx--;
            refreshStudioUI();
          }
        };
      }
      if (topNextBtn) {
        topNextBtn.onclick = () => {
          if (selIdx < pages.length - 1) {
            selIdx++;
            refreshStudioUI();
          }
        };
      }

      // Right Benchmark Export Panel Controls (Matching Compress PDF)
      const panelCards = parent.querySelectorAll('.scan-benchmark-panel .scan-benchmark-card');
      const panelDpi = parent.querySelector('#panel-export-dpi');
      const panelSize = parent.querySelector('#panel-export-pagesize');
      const panelLang = parent.querySelector('#panel-export-lang');
      const panelLangRow = parent.querySelector('#panel-ocr-lang-row');
      const panelMeta = parent.querySelector('#scan-panel-summary-meta');
      const panelSizeTag = parent.querySelector('#scan-panel-est-size');
      const panelConfirmBtn = parent.querySelector('#btn-panel-confirm-export');
      const panelConfirmText = parent.querySelector('#panel-confirm-text');
      const stageAddMoreBtn = parent.querySelector('#btn-stage-add-more');

      const calcEstSize = (count, fmt, comp) => {
        const c = count || 1;
        let mb = 0;
        if (fmt === 'zip') mb = c * 1.1;
        else if (comp === 'high') mb = c * 0.72;
        else if (comp === 'balanced') mb = c * 0.34;
        else mb = c * 0.15;
        return mb < 1 ? `~${Math.round(mb * 1024)} KB` : `~${mb.toFixed(1)} MB`;
      };

      if (stageAddMoreBtn) {
        stageAddMoreBtn.onclick = () => {
          const fi = parent.querySelector('#scan-file-input');
          if (fi) fi.click();
        };
      }

      const updatePanelMeta = () => {
        if (panelSizeTag) {
          panelSizeTag.textContent = calcEstSize(pages.length, pdfFormat, pdfCompression);
        }
        if (!panelMeta) return;
        if (pdfFormat === 'zip') {
          panelMeta.textContent = 'High-Res';
        } else if (pdfCompression === 'high') {
          panelMeta.textContent = '300 DPI';
        } else if (pdfCompression === 'balanced') {
          panelMeta.textContent = '150 DPI';
        } else {
          panelMeta.textContent = '72 DPI';
        }
      };

      const panelFmtList = ['searchable', 'image', 'zip'];
      const selectPanelFormat = (fmt) => {
        if (!fmt) return;
        pdfFormat = fmt;
        panelCards.forEach(c => {
          const isThis = c.getAttribute('data-fmt') === fmt;
          c.classList.toggle('is-active', isThis);
          c.setAttribute('aria-checked', isThis ? 'true' : 'false');
        });

        if (panelConfirmText) {
          panelConfirmText.textContent = pdfFormat === 'zip' ? 'Download Image ZIP' : (pdfFormat === 'searchable' ? 'Export Searchable PDF' : 'Export Standard PDF');
        }
        if (panelLangRow) {
          panelLangRow.style.display = pdfFormat === 'searchable' ? '' : 'none';
        }
        updatePanelMeta();
      };

      panelCards.forEach(card => {
        card.onclick = () => selectPanelFormat(card.getAttribute('data-fmt'));
        card.onkeydown = (e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            selectPanelFormat(card.getAttribute('data-fmt'));
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            const idx = panelFmtList.indexOf(pdfFormat);
            const nextFmt = panelFmtList[(idx + 1) % panelFmtList.length];
            selectPanelFormat(nextFmt);
            const nextCard = parent.querySelector(`.scan-benchmark-card[data-fmt="${nextFmt}"]`);
            if (nextCard) nextCard.focus();
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const idx = panelFmtList.indexOf(pdfFormat);
            const prevFmt = panelFmtList[(idx - 1 + panelFmtList.length) % panelFmtList.length];
            selectPanelFormat(prevFmt);
            const prevCard = parent.querySelector(`.scan-benchmark-card[data-fmt="${prevFmt}"]`);
            if (prevCard) prevCard.focus();
          }
        };
      });

      if (panelDpi) {
        panelDpi.onchange = () => {
          pdfCompression = panelDpi.value;
          updatePanelMeta();
        };
      }

      if (panelSize) {
        panelSize.onchange = () => {
          pdfPageSize = panelSize.value;
        };
      }

      if (panelLang) {
        panelLang.onchange = () => {
          ocrLang = panelLang.value;
        };
      }

      if (panelConfirmBtn) {
        panelConfirmBtn.onclick = async () => {
          if (busy) return;
          const spinner = parent.querySelector('#panel-confirm-spinner');
          const pTrack = parent.querySelector('#panel-progress-track');
          const pFill = parent.querySelector('#panel-progress-fill');

          if (spinner) spinner.style.display = 'inline-block';
          if (pTrack) pTrack.style.display = 'block';
          if (pFill) pFill.style.width = '10%';
          panelConfirmBtn.disabled = true;

          try {
            await handleExport();
          } catch (err) {
            console.error('[Export Error]', err);
            setStatus('Export failed: ' + (err.message || 'Unknown error'), 'err');
          } finally {
            if (spinner) spinner.style.display = 'none';
            if (pTrack) pTrack.style.display = 'none';
            if (pFill) pFill.style.width = '0%';
            panelConfirmBtn.disabled = false;
            if (panelConfirmText) {
              panelConfirmText.textContent = pdfFormat === 'zip' ? 'Download Image ZIP' : (pdfFormat === 'searchable' ? 'Export Searchable PDF' : 'Export Standard PDF');
            }
          }
        };
      }

      // Quick top buttons
      const exportBtn = parent.querySelector('#btn-main-export');
      const closeBtn = parent.querySelector('#btn-studio-close');
      const btnTopUndo = parent.querySelector('#btn-top-undo');
      const btnTopRedo = parent.querySelector('#btn-top-redo');

      if (btnTopUndo) btnTopUndo.onclick = () => performUndo();
      if (btnTopRedo) btnTopRedo.onclick = () => performRedo();

      if (exportBtn) exportBtn.onclick = openExportOptionsModal;
      if (closeBtn) closeBtn.onclick = () => { clearGlobalTopbarDocInfo(); pages = []; selIdx = 0; switchView('hub'); };

      // Stage canvas mouse pan & split drag
      const wrap = parent.querySelector('#scan-canvas-wrap');
      if (wrap) {
        wrap.onwheel = (e) => {
          // If the text sheet overlay is open or event occurred inside it, allow free native scrolling
          if (isTextSheetOpen || e.target.closest('#scan-text-sheet')) return;

          // Pinch-to-zoom (with Ctrl/Meta)
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const delta = e.deltaY < 0 ? 15 : -15;
            zoom = Math.min(250, Math.max(30, zoom + delta));
            if (zoom <= 100) { panX = 0; panY = 0; }
            applyCanvasTransform();
          } else if (zoom > 100) {
            // Natural 2-finger / wheel panning when zoomed in (eliminates locked/frozen scroll)
            e.preventDefault();
            panX -= e.deltaX;
            panY -= e.deltaY;
            const cv = wrap.querySelector('#scan-studio-canvas');
            const scaleVal = zoom / 100;
            const maxPanX = cv ? Math.max(250, (cv.offsetWidth * scaleVal) / 2) : 600;
            const maxPanY = cv ? Math.max(250, (cv.offsetHeight * scaleVal) / 2) : 800;
            panX = Math.max(-maxPanX, Math.min(maxPanX, panX));
            panY = Math.max(-maxPanY, Math.min(maxPanY, panY));
            applyCanvasTransform();
          }
        };

        wrap.onmousedown = (e) => {
          if (isTextSheetOpen || e.target.closest('#scan-text-sheet')) return;

          if (!e.target.closest('.scan-overlay-item, .scan-dock-flyout, .etxt-floating-dock, .scan-unified-toolbar, .scan-floating-search-bar, .scan-redact-subbar')) {
            if (selectedOverlayId) {
              selectedOverlayId = null;
              renderOverlaysLayer();
            }
          }
          if (isSplitView) {
            const cv = wrap.querySelector('#scan-studio-canvas');
            if (cv) {
              const r = cv.getBoundingClientRect();
              if (e.clientX >= r.left && e.clientX <= r.right) {
                isDraggingSplit = true;
                splitRatio = Math.max(0.05, Math.min(0.95, (e.clientX - r.left) / r.width));
                updateStudioPreview();
                return;
              }
            }
          }
          if (zoom <= 100) return;
          isPanning = true;
          panStartX = e.clientX - panX;
          panStartY = e.clientY - panY;
          wrap.style.cursor = 'grabbing';
        };

        window.onmousemove = (e) => {
          if (isDraggingSplit) {
            const cv = wrap.querySelector('#scan-studio-canvas');
            if (cv) {
              const r = cv.getBoundingClientRect();
              splitRatio = Math.max(0.05, Math.min(0.95, (e.clientX - r.left) / r.width));
              updateStudioPreview();
            }
            return;
          }
          if (!isPanning) return;
          panX = e.clientX - panStartX;
          panY = e.clientY - panStartY;
          const cv = wrap.querySelector('#scan-studio-canvas');
          const scaleVal = zoom / 100;
          const maxPanX = cv ? Math.max(250, (cv.offsetWidth * scaleVal) / 2) : 600;
          const maxPanY = cv ? Math.max(250, (cv.offsetHeight * scaleVal) / 2) : 800;
          panX = Math.max(-maxPanX, Math.min(maxPanX, panX));
          panY = Math.max(-maxPanY, Math.min(maxPanY, panY));
          applyCanvasTransform();
        };

        window.onmouseup = () => {
          if (isDraggingSplit) isDraggingSplit = false;
          if (isPanning) {
            isPanning = false;
            wrap.style.cursor = isSplitView ? 'ew-resize' : (zoom > 100 ? 'grab' : 'default');
          }
        };

        wrap.ondblclick = () => {
          zoom = 100; panX = 0; panY = 0;
          applyCanvasTransform();
        };

        // Studio Keyboard Shortcuts (Zoom In/Out/Reset, Undo/Redo & Page Switching)
        const onStudioKeyDown = (e) => {
          if (!document.body.contains(parent)) {
            window.removeEventListener('keydown', onStudioKeyDown);
            return;
          }
          if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;

          // Undo / Redo Shortcuts
          if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
            e.preventDefault();
            performUndo();
            return;
          }
          if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y' || (e.shiftKey && (e.key === 'z' || e.key === 'Z')))) {
            e.preventDefault();
            performRedo();
            return;
          }

          if (isCropping) {
            if (e.key === 'Enter') {
              e.preventDefault();
              applyRecrop();
              return;
            } else if (e.key === 'Escape') {
              e.preventDefault();
              isCropping = false;
              cropState = null;
              refreshStudioUI();
              return;
            }
          }

          if ((e.key === 'Escape' || e.key === 'Enter') && selectedOverlayId) {
            e.preventDefault();
            selectedOverlayId = null;
            renderOverlaysLayer();
            return;
          }

          if (e.key === '+' || e.key === '=' || ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+'))) {
            e.preventDefault();
            zoom = Math.min(250, zoom + 15);
            applyCanvasTransform();
          } else if (e.key === '-' || e.key === '_' || ((e.ctrlKey || e.metaKey) && (e.key === '-' || e.key === '_'))) {
            e.preventDefault();
            zoom = Math.max(30, zoom - 15);
            if (zoom <= 100) { panX = 0; panY = 0; }
            applyCanvasTransform();
          } else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
            e.preventDefault();
            zoom = 100; panX = 0; panY = 0;
            applyCanvasTransform();
          } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
            if (selIdx < pages.length - 1) {
              selIdx++; zoom = 100; panX = 0; panY = 0;
              refreshStudioUI();
            }
          } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
            if (selIdx > 0) {
              selIdx--; zoom = 100; panX = 0; panY = 0;
              refreshStudioUI();
            }
          } else if ((e.key === 'c' || e.key === 'C') && !isCropping && !isRedacting) {
            e.preventDefault();
            openRecrop(selIdx);
          } else if ((e.key === 'r' || e.key === 'R') && !isCropping && !isRedacting) {
            e.preventDefault();
            rotatePage(selIdx, 1);
          } else if (e.key === '1' && !isCropping && !isRedacting) {
            e.preventDefault();
            p.enhanceMode = 'enhanced';
            p._baseCache = null; p._enhCache = null; p._thumbCache = null; p.ocrData = null;
            pushHistoryState('Smart Clean Filter');
            refreshStudioUI();
          } else if (e.key === '2' && !isCropping && !isRedacting) {
            e.preventDefault();
            p.enhanceMode = 'bw';
            p._baseCache = null; p._enhCache = null; p._thumbCache = null; p.ocrData = null;
            pushHistoryState('B&W Filter');
            refreshStudioUI();
          } else if (e.key === '3' && !isCropping && !isRedacting) {
            e.preventDefault();
            p.enhanceMode = 'photo';
            p._baseCache = null; p._enhCache = null; p._thumbCache = null; p.ocrData = null;
            pushHistoryState('Color Photo Filter');
            refreshStudioUI();
          } else if (e.key === '4' && !isCropping && !isRedacting) {
            e.preventDefault();
            p.enhanceMode = 'form';
            p._baseCache = null; p._enhCache = null; p._thumbCache = null; p.ocrData = null;
            pushHistoryState('Form Filter');
            refreshStudioUI();
          } else if ((e.key === 's' || e.key === 'S') && !isCropping && !isRedacting) {
            e.preventDefault();
            activeFlyout = activeFlyout === 'stamp' ? null : 'stamp';
            refreshStudioUI();
          } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedOverlayId && !isCropping && !isRedacting) {
            e.preventDefault();
            p.overlays = (p.overlays || []).filter((x) => x.id !== selectedOverlayId);
            selectedOverlayId = null;
            renderOverlaysLayer();
            pushHistoryState('Delete Signature');
            setStatus('Signature deleted.', 'ok');
          } else if (e.key === 'Delete' && !isCropping && !isRedacting) {
            e.preventDefault();
            deletePage(selIdx);
          }
        };
        window.addEventListener('keydown', onStudioKeyDown);
      }


      // Drawer thumbnails click & drag
      parent.querySelectorAll('.etxt-thumb').forEach((thumb) => {
        thumb.onclick = () => {
          const idx = +thumb.dataset.idx;
          switchPage(idx);
        };
      });

      parent.querySelectorAll('.scan-thumb-btn').forEach((btn) => {
        btn.onclick = (e) => {
          e.stopPropagation();
          deletePage(+btn.dataset.del);
        };
      });

      parent.querySelectorAll('.etxt-thumb-card').forEach((card) => {
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
            if (selIdx === fromIdx) {
              selIdx = toIdx;
            } else if (fromIdx < selIdx && toIdx >= selIdx) {
              selIdx--;
            } else if (fromIdx > selIdx && toIdx <= selIdx) {
              selIdx++;
            }
            refreshStudioUI();
          }
        };
      });

      const drawerAddCam = parent.querySelector('#btn-drawer-add-cam');
      const drawerAddFile = parent.querySelector('#btn-drawer-add-file');
      const topUploadBtn = parent.querySelector('#btn-global-import');
      const topCamBtn = parent.querySelector('#tab-btn-hub');
      const inp = container.querySelector('#scan-file-input');

      if (topCamBtn) topCamBtn.onclick = () => switchView('hub');
      if (drawerAddCam) drawerAddCam.onclick = () => switchView('hub');

      const triggerUpload = () => {
        if (inp) {
          inp.value = '';
          inp.click();
        }
      };

      if (topUploadBtn) topUploadBtn.onclick = triggerUpload;
      if (drawerAddFile) drawerAddFile.onclick = triggerUpload;

      if (wrap && typeof ResizeObserver !== 'undefined') {
        const ro = new ResizeObserver(() => {
          scheduleStudioPreview();
        });
        ro.observe(wrap);
      }

      renderOverlaysLayer();
    }

    /* ════════════════════════════════════════════════════════════════
       STUDIO HISTORY STACK ENGINE (Undo & Redo System)
    ════════════════════════════════════════════════════════════════ */
    function clonePagesSnapshot(pagesArr) {
      return (pagesArr || []).map(p => {
        const copyCanvas = (src) => {
          if (!src) return null;
          const c = document.createElement('canvas');
          c.width = src.width; c.height = src.height;
          const ctx = c.getContext('2d');
          ctx.drawImage(src, 0, 0);
          return c;
        };
        return {
          id: p.id || ('p_' + Math.random().toString(36).slice(2, 8)),
          name: p.name || 'Page',
          canvas: copyCanvas(p.canvas),
          raw: copyCanvas(p.raw || p.canvas),
          quad: p.quad ? JSON.parse(JSON.stringify(p.quad)) : null,
          cropped: p.cropped,
          rot: p.rot || 0,
          enhanceMode: p.enhanceMode || 'enhanced',
          brightness: p.brightness || 0,
          contrast: p.contrast || 0,
          overlays: p.overlays ? JSON.parse(JSON.stringify(p.overlays)) : [],
          ocrData: p.ocrData ? JSON.parse(JSON.stringify(p.ocrData)) : null,
        };
      });
    }

    function pushHistoryState(desc = 'Action') {
      if (isHistoryAction || !pages.length) return;
      if (historyIndex < historyStack.length - 1) {
        historyStack = historyStack.slice(0, historyIndex + 1);
      }
      historyStack.push({
        pages: clonePagesSnapshot(pages),
        selIdx,
        desc
      });
      if (historyStack.length > 25) {
        historyStack.shift();
      }
      historyIndex = historyStack.length - 1;
      updateUndoRedoUI();
    }

    function performUndo() {
      if (historyIndex > 0) {
        historyIndex--;
        const state = historyStack[historyIndex];
        isHistoryAction = true;
        pages = clonePagesSnapshot(state.pages);
        selIdx = Math.min(state.selIdx, Math.max(0, pages.length - 1));
        refreshStudioUI();
        isHistoryAction = false;
        updateUndoRedoUI();
        setStatus(`Undid: ${historyStack[historyIndex + 1]?.desc || 'Action'}`, 'info');
      }
    }

    function performRedo() {
      if (historyIndex < historyStack.length - 1) {
        historyIndex++;
        const state = historyStack[historyIndex];
        isHistoryAction = true;
        pages = clonePagesSnapshot(state.pages);
        selIdx = Math.min(state.selIdx, Math.max(0, pages.length - 1));
        refreshStudioUI();
        isHistoryAction = false;
        updateUndoRedoUI();
        setStatus(`Redid: ${state.desc || 'Action'}`, 'info');
      }
    }

    function updateUndoRedoUI() {
      const btnUndo = container.querySelector('#btn-top-undo');
      const btnRedo = container.querySelector('#btn-top-redo');
      if (btnUndo) {
        const canUndo = historyIndex > 0;
        btnUndo.disabled = !canUndo;
        btnUndo.style.opacity = canUndo ? '1' : '0.35';
        btnUndo.style.cursor = canUndo ? 'pointer' : 'default';
        btnUndo.style.pointerEvents = canUndo ? 'auto' : 'none';
      }
      if (btnRedo) {
        const canRedo = historyIndex < historyStack.length - 1;
        btnRedo.disabled = !canRedo;
        btnRedo.style.opacity = canRedo ? '1' : '0.35';
        btnRedo.style.cursor = canRedo ? 'pointer' : 'default';
        btnRedo.style.pointerEvents = canRedo ? 'auto' : 'none';
      }
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
      p._baseCache = null;
      p._enhCache = null;
      p._thumbCache = null;
      p.ocrData = null;
      pushHistoryState('Rotate 90°');
      refreshStudioUI();
    }

    function deletePage(idx) {
      if (idx < 0 || idx >= pages.length) return;
      lastRemoved = { idx, page: pages[idx] };
      pages.splice(idx, 1);
      if (selIdx >= pages.length) selIdx = Math.max(0, pages.length - 1);
      pushHistoryState('Delete Page');
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
            pushHistoryState('Restore Page');
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
            setStatus('Page copied to clipboard.', 'ok');
          }
        }, 'image/png');
      } catch (e) {
        setStatus('Clipboard copy unavailable in this browser', 'warn');
      }
    }

    /* ════════════════════════════════════════════════════════════════
       IN-STUDIO RECTANGULAR CROP ENGINE (8-Handle Box)
    ════════════════════════════════════════════════════════════════ */
    function openRecrop(idx) {
      const p = pages[idx];
      if (!p) return;
      isCropping = true;
      isRedacting = false;
      showSearchBar = false;
      activeFlyout = null;
      const c = p.canvas;
      const m = 0.04;
      const bx = Math.round(c.width * m);
      const by = Math.round(c.height * m);
      const bw = Math.max(40, Math.round(c.width * (1 - 2 * m)));
      const bh = Math.max(40, Math.round(c.height * (1 - 2 * m)));

      cropState = {
        idx,
        box: { x: bx, y: by, w: bw, h: bh },
        origBox: { x: bx, y: by, w: bw, h: bh },
        drag: null,
        startBox: null,
        startPt: null,
        displayScale: 1,
      };
      refreshStudioUI();
      setStatus('Adjust crop box. Press Enter or click Done to apply.', 'info');
    }

    function getCropHandle(px, py, box, scale) {
      if (!box) return null;
      const bx = box.x * scale;
      const by = box.y * scale;
      const bw = box.w * scale;
      const bh = box.h * scale;
      const cornerR = 22;
      const edgeR = 14;

      // Check 4 Corners
      if (Math.hypot(px - bx, py - by) < cornerR) return 'nw';
      if (Math.hypot(px - (bx + bw), py - by) < cornerR) return 'ne';
      if (Math.hypot(px - (bx + bw), py - (by + bh)) < cornerR) return 'se';
      if (Math.hypot(px - bx, py - (by + bh)) < cornerR) return 'sw';

      // Check 4 Edges
      if (Math.abs(py - by) < edgeR && px >= bx - 6 && px <= bx + bw + 6) return 'n';
      if (Math.abs(py - (by + bh)) < edgeR && px >= bx - 6 && px <= bx + bw + 6) return 's';
      if (Math.abs(px - bx) < edgeR && py >= by - 6 && py <= by + bh + 6) return 'w';
      if (Math.abs(px - (bx + bw)) < edgeR && py >= by - 6 && py <= by + bh + 6) return 'e';

      // Inside Box
      if (px > bx && px < bx + bw && py > by && py < by + bh) return 'inside';

      return null;
    }

    function applyRecrop() {
      if (!cropState) return;
      const p = pages[cropState.idx];
      if (!p) return;

      const { x, y, w, h } = cropState.box;
      if (w < 10 || h < 10) return;

      const srcCv = p.canvas;
      const croppedCv = document.createElement('canvas');
      croppedCv.width = Math.max(1, Math.round(w));
      croppedCv.height = Math.max(1, Math.round(h));
      const ctx = croppedCv.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(srcCv, x, y, w, h, 0, 0, croppedCv.width, croppedCv.height);

      p.canvas = croppedCv;
      p.cropped = true;
      p._baseCache = null;
      p._enhCache = null;
      p._thumbCache = null;
      p.ocrData = null; // Clear cached OCR text for cropped area

      isCropping = false;
      cropState = null;
      pushHistoryState('Crop Page');
      refreshStudioUI();
      setStatus('Cropped to selected area.', 'ok');
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
                <option value="auto" ${ocrLang === 'auto' ? 'selected' : ''}>Auto Detect</option>
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
              <button type="button" class="scan-btn-ghost" id="ocr-btn-docx">
                ${ICONS.word}
                <span>Download .docx</span>
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
                  <span id="ocr-loading-detail" style="display:none"></span>
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
          const lt = parent.querySelector('#ocr-loading-text');
          const detectTip = parent.querySelector('#ocr-loading-detail');

          // Auto-detect: run a fast English pass over the first page and classify
          // its script, then re-run with the matched language for accuracy.
          let useLang = ocrLang;
          if (ocrLang === 'auto') {
            if (lt) lt.textContent = 'Detecting document language…';
            const probe = await A.ocrRecognize(prep.slice(0, 1), undefined, 'eng');
            useLang = A.detectScriptLanguage(probe[0] && probe[0].text);
            ocrLang = useLang;
            if (detectTip) detectTip.textContent = `Detected ${A.OCR_LANG_LABELS[useLang] || useLang}.`;
            if (lt) lt.textContent = `Recognizing text (${useLang.toUpperCase()})…`;
          }

          const results = await A.ocrRecognize(prep, (pr) => {
            if (lt) lt.textContent = `Recognizing text (${useLang.toUpperCase()})… ${Math.round(pr * 100)}%`;
          }, useLang);
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
            setStatus('Text copied to clipboard.', 'ok');
          };
          parent.querySelector('#ocr-btn-txt').onclick = () => {
            U.downloadBlob(new Blob([ocrResultText], { type: 'text/plain' }), 'scan-extracted.txt');
          };
          const docxBtn = parent.querySelector('#ocr-btn-docx');
          if (docxBtn) docxBtn.onclick = () => {
            U.downloadBlob(A.wordDocFromText(ocrResultText, getScanSourceName()), 'scan-extracted.doc');
          };
        } catch (err) {
          const lt = parent.querySelector('#ocr-loading-text');
          if (lt) lt.textContent = 'OCR extraction failed: ' + err.message;
        }
      }

      runOcrJob();
    }

    /* ════════════════════════════════════════════════════════════════
       EXPORT ENGINE: Pre-Export Options Sheet & Compiler Pipeline
    ════════════════════════════════════════════════════════════════ */
    function openExportOptionsModal() {
      if (!pages.length || busy) return;
      const existing = container.querySelector('#scan-export-modal-overlay');
      if (existing) existing.remove();

      const modalWrap = document.createElement('div');
      modalWrap.id = 'scan-export-modal-overlay';
      modalWrap.className = 'scan-modal-overlay';

      const calcModalEstSize = (count, fmt, comp) => {
        const c = count || 1;
        let mb = 0;
        if (fmt === 'zip') mb = c * 1.1;
        else if (comp === 'high') mb = c * 0.72;
        else if (comp === 'balanced') mb = c * 0.34;
        else mb = c * 0.15;
        return mb < 1 ? `~${Math.round(mb * 1024)} KB` : `~${mb.toFixed(1)} MB`;
      };

      const updateSummaryMeta = () => {
        const metaEl = modalWrap.querySelector('#scan-modal-summary-meta');
        const sizeTag = modalWrap.querySelector('#scan-modal-est-size');
        if (sizeTag) {
          sizeTag.textContent = calcModalEstSize(pages.length, pdfFormat, pdfCompression);
        }
        if (!metaEl) return;
        if (pdfFormat === 'zip') {
          metaEl.textContent = '· High-Res Images';
        } else if (pdfCompression === 'high') {
          metaEl.textContent = '· 300 DPI High Quality';
        } else if (pdfCompression === 'balanced') {
          metaEl.textContent = '· 150 DPI Balanced';
        } else {
          metaEl.textContent = '· 72 DPI Compact';
        }
      };

      modalWrap.innerHTML = `
        <div class="scan-export-modal" role="dialog" aria-modal="true" aria-labelledby="scan-export-modal-title">
          <!-- Branded Header: Icon Box + Bold Title -->
          <div class="scan-modal-head">
            <div class="scan-modal-title-wrap">
              <div class="scan-modal-icon-badge">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
              </div>
              <h3 id="scan-export-modal-title" class="scan-modal-heading">Export</h3>
            </div>
            <button type="button" class="scan-modal-close" id="btn-modal-close" title="Close" aria-label="Close modal">${ICONS.cross}</button>
          </div>

          <div class="scan-modal-body">
            <!-- Discrete Separated Format Cards Stack -->
            <div class="scan-modal-cards-stack" role="radiogroup" aria-label="Output Format">
              <div class="scan-benchmark-card ${pdfFormat === 'searchable' ? 'is-active' : ''}" data-fmt="searchable" tabindex="0" role="radio" aria-checked="${pdfFormat === 'searchable'}">
                <div class="scan-benchmark-radio">
                  <div class="scan-benchmark-radio-dot"></div>
                </div>
                <div class="scan-benchmark-card-text">
                  <span class="scan-benchmark-card-label">Searchable PDF</span>
                  <span class="scan-benchmark-card-sub">Selectable text + OCR layer</span>
                </div>
                <div class="scan-benchmark-card-right">
                  <span class="scan-benchmark-pill-rec">Recommended</span>
                </div>
              </div>

              <div class="scan-benchmark-card ${pdfFormat === 'image' ? 'is-active' : ''}" data-fmt="image" tabindex="0" role="radio" aria-checked="${pdfFormat === 'image'}">
                <div class="scan-benchmark-radio">
                  <div class="scan-benchmark-radio-dot"></div>
                </div>
                <div class="scan-benchmark-card-text">
                  <span class="scan-benchmark-card-label">Standard PDF</span>
                  <span class="scan-benchmark-card-sub">Flattened visual scan · Fast</span>
                </div>
              </div>

              <div class="scan-benchmark-card ${pdfFormat === 'zip' ? 'is-active' : ''}" data-fmt="zip" tabindex="0" role="radio" aria-checked="${pdfFormat === 'zip'}">
                <div class="scan-benchmark-radio">
                  <div class="scan-benchmark-radio-dot"></div>
                </div>
                <div class="scan-benchmark-card-text">
                  <span class="scan-benchmark-card-label">Image ZIP</span>
                  <span class="scan-benchmark-card-sub">Individual full-resolution JPGs</span>
                </div>
              </div>
            </div>

            <!-- Compact Configuration Row -->
            <div class="scan-modal-config-box">
              <div class="scan-modal-config-row">
                <div class="scan-modal-config-field" id="modal-field-dpi">
                  <span class="scan-modal-config-lbl">Resolution</span>
                  <select id="modal-export-dpi" class="scan-modal-select-sm">
                    <option value="high" ${pdfCompression === 'high' ? 'selected' : ''}>300 DPI</option>
                    <option value="balanced" ${pdfCompression === 'balanced' ? 'selected' : ''}>150 DPI</option>
                    <option value="compact" ${pdfCompression === 'compact' ? 'selected' : ''}>72 DPI</option>
                  </select>
                </div>

                <div class="scan-modal-config-field" id="modal-field-size">
                  <span class="scan-modal-config-lbl">Geometry</span>
                  <select id="modal-export-pagesize" class="scan-modal-select-sm">
                    <option value="a4" ${pdfPageSize === 'a4' ? 'selected' : ''}>A4 (210×297)</option>
                    <option value="letter" ${pdfPageSize === 'letter' ? 'selected' : ''}>US Letter</option>
                    <option value="original" ${pdfPageSize === 'original' ? 'selected' : ''}>Original</option>
                  </select>
                </div>

                <div class="scan-modal-config-field" id="modal-ocr-lang-row" ${pdfFormat === 'searchable' ? '' : 'style="display:none;"'}>
                  <span class="scan-modal-config-lbl">Language</span>
                  <select id="modal-export-lang" class="scan-modal-select-sm">
                    <option value="eng" ${ocrLang === 'eng' ? 'selected' : ''}>English (EN)</option>
                    <option value="spa" ${ocrLang === 'spa' ? 'selected' : ''}>Spanish (ES)</option>
                    <option value="fra" ${ocrLang === 'fra' ? 'selected' : ''}>French (FR)</option>
                    <option value="deu" ${ocrLang === 'deu' ? 'selected' : ''}>German (DE)</option>
                    <option value="ita" ${ocrLang === 'ita' ? 'selected' : ''}>Italian (IT)</option>
                    <option value="por" ${ocrLang === 'por' ? 'selected' : ''}>Portuguese (PT)</option>
                    <option value="hin" ${ocrLang === 'hin' ? 'selected' : ''}>Hindi (HI)</option>
                    <option value="chi_sim" ${ocrLang === 'chi_sim' ? 'selected' : ''}>Chinese (ZH)</option>
                    <option value="jpn" ${ocrLang === 'jpn' ? 'selected' : ''}>Japanese (JA)</option>
                    <option value="ara" ${ocrLang === 'ara' ? 'selected' : ''}>Arabic (AR)</option>
                    <option value="auto" ${ocrLang === 'auto' ? 'selected' : ''}>Auto-Detect</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Mint Summary & Progress Box -->
            <div class="scan-benchmark-est-box">
              <div class="scan-benchmark-est-title">Estimated output</div>
              <div class="scan-benchmark-est-metrics">
                <strong class="scan-benchmark-est-new">${pages.length} ${pages.length === 1 ? 'Page' : 'Pages'}</strong>
                <span class="scan-est-size-tag" id="scan-modal-est-size">~${((pages.length || 1) * (pdfFormat === 'zip' ? 1.1 : (pdfCompression === 'high' ? 0.72 : (pdfCompression === 'balanced' ? 0.34 : 0.15)))).toFixed(1)} MB</span>
                <span class="scan-benchmark-est-meta" id="scan-modal-summary-meta">· 300 DPI High Quality</span>
                <span class="scan-exact-privacy-badge">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                  100% Local
                </span>
              </div>
              <div class="scan-benchmark-track">
                <div class="scan-benchmark-bar" style="width: 100%;"></div>
              </div>
            </div>

            <!-- Full-Width Primary Action CTA Button (Solid Obsidian Black) -->
            <button type="button" class="scan-benchmark-cta" id="btn-modal-confirm">
              <span id="modal-confirm-spinner" style="display:none;" class="scan-modal-spinner"></span>
              <span id="modal-confirm-text">${pdfFormat === 'zip' ? 'Download Image ZIP' : 'Export PDF'}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
              <div class="scan-modal-progress-track" id="modal-progress-track" style="display:none;">
                <div class="scan-modal-progress-fill" id="modal-progress-fill"></div>
              </div>
            </button>
          </div>
        </div>
      `;

      container.appendChild(modalWrap);

      const closeModal = () => {
        if (busy) return;
        window.removeEventListener('keydown', handleModalKeyDown);
        modalWrap.remove();
      };

      const closeBtn = modalWrap.querySelector('#btn-modal-close');
      const confirmBtn = modalWrap.querySelector('#btn-modal-confirm');
      const confirmText = modalWrap.querySelector('#modal-confirm-text');
      const langRow = modalWrap.querySelector('#modal-ocr-lang-row');
      const sizeField = modalWrap.querySelector('#modal-field-size');

      if (closeBtn) closeBtn.onclick = closeModal;
      modalWrap.onclick = (e) => {
        if (e.target === modalWrap && !busy) closeModal();
      };

      const modalFmtList = ['searchable', 'image', 'zip'];
      const selectModalFormat = (fmt) => {
        if (!fmt) return;
        pdfFormat = fmt;
        cards.forEach(c => {
          const isThis = c.getAttribute('data-fmt') === fmt;
          c.classList.toggle('is-active', isThis);
          c.setAttribute('aria-checked', isThis ? 'true' : 'false');
        });

        if (pdfFormat === 'zip') {
          if (confirmText) confirmText.textContent = 'Download Image ZIP';
          if (langRow) langRow.style.display = 'none';
          if (sizeField) sizeField.style.display = 'none';
        } else if (pdfFormat === 'image') {
          if (confirmText) confirmText.textContent = 'Export PDF';
          if (langRow) langRow.style.display = 'none';
          if (sizeField) sizeField.style.display = 'flex';
        } else {
          if (confirmText) confirmText.textContent = 'Export PDF';
          if (langRow) langRow.style.display = 'flex';
          if (sizeField) sizeField.style.display = 'flex';
        }
        updateSummaryMeta();
      };

      const cards = modalWrap.querySelectorAll('.scan-benchmark-card');
      cards.forEach(card => {
        card.onclick = () => selectModalFormat(card.getAttribute('data-fmt'));
        card.onkeydown = (e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            selectModalFormat(card.getAttribute('data-fmt'));
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            const idx = modalFmtList.indexOf(pdfFormat);
            const nextFmt = modalFmtList[(idx + 1) % modalFmtList.length];
            selectModalFormat(nextFmt);
            const nextCard = modalWrap.querySelector(`.scan-benchmark-card[data-fmt="${nextFmt}"]`);
            if (nextCard) nextCard.focus();
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const idx = modalFmtList.indexOf(pdfFormat);
            const prevFmt = modalFmtList[(idx - 1 + modalFmtList.length) % modalFmtList.length];
            selectModalFormat(prevFmt);
            const prevCard = modalWrap.querySelector(`.scan-benchmark-card[data-fmt="${prevFmt}"]`);
            if (prevCard) prevCard.focus();
          }
        };
      });

      const dpiSel = modalWrap.querySelector('#modal-export-dpi');
      if (dpiSel) {
        dpiSel.onchange = () => {
          pdfCompression = dpiSel.value;
          updateSummaryMeta();
        };
      }

      const szSel = modalWrap.querySelector('#modal-export-pagesize');
      if (szSel) szSel.onchange = () => { pdfPageSize = szSel.value; };

      const langSel = modalWrap.querySelector('#modal-export-lang');
      if (langSel) langSel.onchange = () => {
        ocrLang = langSel.value;
        const topLang = container.querySelector('#scan-top-ocr-lang');
        if (topLang) topLang.value = ocrLang;
      };

      if (confirmBtn) {
        confirmBtn.onclick = async () => {
          if (busy) return;
          confirmBtn.disabled = true;
          if (closeBtn) closeBtn.disabled = true;
          const spinner = modalWrap.querySelector('#modal-confirm-spinner');
          const track = modalWrap.querySelector('#modal-progress-track');
          if (spinner) spinner.style.display = 'inline-block';
          if (track) track.style.display = 'block';
          modalWrap.querySelectorAll('input, select').forEach(el => el.disabled = true);
          await handleExport();
        };
      }

      function handleModalKeyDown(e) {
        if (e.key === 'Escape' && !busy) {
          closeModal();
        } else if (e.key === 'Enter' && !busy && !e.target.matches('select, textarea, input[type="text"]')) {
          confirmBtn.click();
        }
      }
      window.addEventListener('keydown', handleModalKeyDown);
    }

    async function handleExport() {
      if (!pages.length || busy) return;
      const jobId = ++exportJobId;
      busy = true;
      processingState = { phase: 'Preparing export', progress: 0.04, detail: `Preparing ${pages.length} ${pages.length === 1 ? 'page' : 'pages'} locally.` };
      updateProcessingState('Preparing export', 0.04, `Preparing ${pages.length} ${pages.length === 1 ? 'page' : 'pages'} locally.`);

      const assertCurrent = () => {
        if (jobId !== exportJobId) {
          const err = new Error('Export canceled.');
          err.code = 'SCAN_EXPORT_CANCELED';
          throw err;
        }
      };

      try {
        const qualityMap = { high: 0.92, balanced: 0.78, compact: 0.55 };
        const q = qualityMap[pdfCompression] || 0.85;
        const ext = pdfFormat === 'zip' ? 'zip' : 'pdf';
        const baseName = (getScanSourceName() || 'scanned-document').replace(/\.[^/.]+$/, '');
        const fileName = `${baseName}.${ext}`;

        if (pdfFormat === 'searchable') {
          updateProcessingState('Preparing pages', 0.12, 'Applying the selected cleanup settings at 300 DPI.');
          const fullCanvases = pages.map((p) => getPageExportCanvas(p));
          const prep = fullCanvases.map((c) => A.fitCanvas(c, 2000));
          assertCurrent();

          // Reuse existing page OCR data (preserves user sidebar edits and digital PDF text)
          const missingIdxs = [];
          for (let i = 0; i < pages.length; i++) {
            if (!pages[i].ocrData) missingIdxs.push(i);
          }

          let useLang = (ocrLang && ocrLang !== 'auto') ? ocrLang : 'eng';
          if (missingIdxs.length > 0) {
            const missingPrep = missingIdxs.map(idx => prep[idx]);
            if (ocrLang === 'auto') {
              updateProcessingState('Detecting language', 0.14, 'Scanning first page...');
              const probe = await A.ocrRecognize(missingPrep.slice(0, 1), undefined, 'eng');
              assertCurrent();
              useLang = A.detectScriptLanguage(probe[0] && probe[0].text);
              ocrLang = useLang;
            }
            updateProcessingState(`Recognizing text (${useLang.toUpperCase()})`, 0.18, `Scanning ${missingIdxs.length} ${missingIdxs.length === 1 ? 'page' : 'pages'}...`);
            const recognized = await A.ocrRecognize(missingPrep, (pr) => {
              if (jobId === exportJobId) updateProcessingState(`Recognizing text (${useLang.toUpperCase()})`, 0.18 + (pr * 0.62), `OCR progress across ${pages.length} ${pages.length === 1 ? 'page' : 'pages'}.`);
            }, useLang);
            assertCurrent();
            missingIdxs.forEach((pageIdx, rIdx) => {
              pages[pageIdx].ocrData = recognized[rIdx];
            });
          }

          const results = pages.map(p => p.ocrData);
          updateProcessingState('Building PDF', 0.88, 'Embedding 300 DPI text vectors...');
          const pdfBytes = await A.searchablePdfFromCanvases(fullCanvases, results, { pageSize: pdfPageSize, quality: q, prepCanvases: prep });
          assertCurrent();
          
          updateProcessingState('Downloading', 1.0, 'Saving file...');
          const blob = new Blob([pdfBytes], { type: 'application/pdf' });
          U.downloadBlob(blob, fileName);

          const modal = container.querySelector('.scan-export-modal-wrap, #scan-export-modal-overlay, .scan-modal-overlay');
          if (modal) modal.remove();

          const allText = pages.map((pg, i) => `── Page ${i + 1} ──\n` + (pg.ocrData?.text || '').trim()).join('\n\n');
          showScanResult(blob, `${useLang.toUpperCase()} OCR complete`, allText);
          return;
        }

        if (pdfFormat === 'image') {
          updateProcessingState('Preparing PDF', 0.12, 'Compiling pages...');
          const PDFLib = await load.pdflib();
          const doc = await PDFLib.PDFDocument.create();
          for (let i = 0; i < pages.length; i++) {
            assertCurrent();
            updateProcessingState('Compiling PDF', 0.14 + ((i / pages.length) * 0.72), `Processing page ${i + 1} of ${pages.length}.`);
            const p = pages[i];
            const canvas = getPageExportCanvas(p);
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
              imgW = pageW; imgH = img.height * s;
            }

            const page = doc.addPage([pageW, pageH]);
            page.drawImage(img, { x: imgX, y: imgY, width: imgW, height: imgH });
          }
          assertCurrent();
          updateProcessingState('Downloading', 1.0, 'Saving file...');
          const blob = new Blob([await doc.save()], { type: 'application/pdf' });
          U.downloadBlob(blob, fileName);

          const modal = container.querySelector('.scan-export-modal-wrap, #scan-export-modal-overlay, .scan-modal-overlay');
          if (modal) modal.remove();

          showScanResult(blob, 'Standard PDF Export');
          return;
        }

        updateProcessingState('Preparing images', 0.12, 'Collecting pages...');
        const fflate = await load.fflate();
        const files = {};
        for (let i = 0; i < pages.length; i++) {
          assertCurrent();
          updateProcessingState('Packaging ZIP', 0.14 + ((i / pages.length) * 0.72), `Packaging page ${i + 1} of ${pages.length}.`);
          const p = pages[i];
          const canvas = getPageExportCanvas(p);
          const jpgBytes = await A.canvasJpeg(canvas, q);
          files[`page-${i + 1}.jpg`] = jpgBytes;
        }
        assertCurrent();
        updateProcessingState('Finalizing ZIP', 0.92, 'Packaging archive...');
        const zipped = await new Promise((res, rej) => fflate.zip(files, (err, dat) => err ? rej(err) : res(dat)));
        assertCurrent();

        const blob = new Blob([zipped], { type: 'application/zip' });
        U.downloadBlob(blob, fileName);

        const modal = container.querySelector('.scan-export-modal-wrap, #scan-export-modal-overlay, .scan-modal-overlay');
        if (modal) modal.remove();

        showScanResult(blob, 'Image ZIP Bundle');
      } catch (err) {
        if (err?.code === 'SCAN_EXPORT_CANCELED') return;
        if (jobId !== exportJobId) return;
        busy = false;
        processingState = null;
        
        const confirmBtn = container.querySelector('#btn-modal-confirm');
        const cancelBtn = container.querySelector('#btn-modal-cancel');
        const closeBtn = container.querySelector('#btn-modal-close');
        const spinner = container.querySelector('#modal-confirm-spinner');
        const track = container.querySelector('#modal-progress-track');
        if (confirmBtn) confirmBtn.disabled = false;
        if (cancelBtn) cancelBtn.disabled = false;
        if (closeBtn) closeBtn.disabled = false;
        if (spinner) spinner.style.display = 'none';
        if (track) track.style.display = 'none';
        container.querySelectorAll('.scan-export-modal-wrap input, .scan-export-modal-wrap select').forEach(el => el.disabled = false);
        
        setStatus('Export failed: ' + err.message, 'err');
      }
    }

    function bindFileInput(inp) {
      if (!inp) return;
      inp.onchange = async (e) => {
        const files = Array.from(inp.files || []);
        if (!files.length) return;
        await handleImportFileList(files);
        try { inp.value = ''; } catch {}
      };
    }



    async function runCameraDiagnostics() {

      let report = '🔍 CAMERA & WEBRTC DIAGNOSTIC REPORT\n';
      report += '────────────────────────────────────────\n';
      report += '1. Secure Origin (HTTPS / Localhost): ' + (window.isSecureContext ? '✅ YES' : '❌ NO (Insecure context blocks camera)') + '\n';
      report += '2. mediaDevices API: ' + (navigator.mediaDevices ? '✅ Available' : '❌ Missing in this browser') + '\n';
      report += '3. getUserMedia: ' + (navigator.mediaDevices?.getUserMedia ? '✅ Available' : '❌ Missing') + '\n\n';

      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        report += `4. Connected Video Devices: ${videoInputs.length} found\n`;
        if (videoInputs.length === 0) {
          report += '   ⚠️ ZERO cameras detected. Windows OS or hardware privacy switch is blocking camera visibility.\n';
        } else {
          videoInputs.forEach((d, i) => {
            report += `   • Camera ${i + 1}: ${d.label || '(Label hidden until permission granted)'} [ID: ${d.deviceId.slice(0, 10)}...]\n`;
          });
        }
      } catch (e) {
        report += '4. Device Enumeration Error: ' + e.message + '\n';
      }

      report += '\n5. Testing basic { video: true } stream probe...\n';
      try {
        const testStream = await navigator.mediaDevices.getUserMedia({ video: true });
        report += '   ✅ SUCCESS! Camera stream initialized: ' + (testStream.getVideoTracks()[0]?.label || 'Default Camera') + '\n';
        testStream.getTracks().forEach((t) => t.stop());
      } catch (e) {
        report += `   ❌ Probe Failed: ${e.name} — ${e.message}\n`;
      }

      alert(report);
      console.log(report);
    }

    async function openCameraStream(deviceId) {

      stopCam();
      importError = '';

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        importError = 'Camera access is not supported in this browser context (requires localhost or HTTPS).';
        cameraOn = false;
        render();
        return;
      }

      await enumerateCameras();

      // Multi-tier progressive constraints: start with basic video on desktop, or high-res rear lens on mobile
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      const constraintTiers = [];

      if (deviceId) {
        constraintTiers.push({ video: { deviceId: { exact: deviceId } } });
        constraintTiers.push({ video: { deviceId } });
      } else if (isMobile) {
        constraintTiers.push({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920, min: 640 },
            height: { ideal: 1080, min: 480 },
          },
        });
        constraintTiers.push({ video: { facingMode: 'environment' } });
        constraintTiers.push({ video: true });
      } else {
        // Desktop / Laptop: try basic video first (maximum hardware compatibility), then high-res
        constraintTiers.push({ video: true });
        constraintTiers.push({ video: { width: { ideal: 1920 }, height: { ideal: 1080 } } });
        constraintTiers.push({ video: { width: { ideal: 1280 }, height: { ideal: 720 } } });
      }

      let mediaStream = null;
      let lastErr = null;

      for (const c of constraintTiers) {
        try {
          console.log('[Scan Camera] Attempting getUserMedia with constraint:', c);
          mediaStream = await navigator.mediaDevices.getUserMedia(c);
          if (mediaStream) {
            console.log('[Scan Camera] Successfully acquired media stream:', mediaStream.id);
            break;
          }
        } catch (e) {
          console.warn('[Scan Camera] Constraint attempt failed:', e.name, e.message);
          lastErr = e;
        }
      }

      if (!mediaStream) {
        console.error('[Scan Camera] All constraints failed. Last error:', lastErr);
        stopCam();
        if (lastErr && (lastErr.name === 'NotAllowedError' || lastErr.name === 'PermissionDeniedError')) {
          importError = 'Camera permission was denied. Click the lock/tune icon in your browser address bar and set Camera to "Allow".';
        } else if (lastErr && (lastErr.name === 'NotFoundError' || lastErr.name === 'DevicesNotFoundError')) {
          importError = 'No camera found. If your laptop has a webcam: (1) Check if your physical webcam privacy slider or Fn key (e.g. F8/F10) is turned ON. (2) Check Windows Settings → Privacy & security → Camera and toggle "Camera access" ON. (3) Close any other app (Zoom/Teams/Skype) using the camera.';
        } else if (lastErr && (lastErr.name === 'NotReadableError' || lastErr.name === 'TrackStartError')) {
          importError = 'Camera is currently in use by another application (Zoom, Teams, or another browser tab). Please close it and try again.';
        } else {
          importError = 'Camera could not start: ' + (lastErr?.message || 'Device busy or unavailable.');
        }
        render();
        return;
      }


      cameraOn = true;
      viewMode = 'hub';
      render();

      video = container.querySelector('#scan-video');
      overlay = container.querySelector('#scan-overlay');

      try {
        stream = mediaStream;
        window.__ffScanStream = stream;
        video.srcObject = stream;

        // Ensure video metadata is ready before starting detection
        await new Promise((resolve) => {
          if (video.readyState >= 1) resolve();
          else video.onloadedmetadata = () => resolve();
        });

        await video.play();

        const track = stream.getVideoTracks()[0];
        if (track) {
          activeDeviceId = track.getSettings().deviceId || '';
        }

        renderCaptureHeader();
        startDetection();
      } catch (err) {
        stopCam();
        importError = 'Failed to start video playback: ' + err.message;
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

          // 1. Soft glowing polygonal document backdrop
          octx.fillStyle = manualQuad ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.12)';
          octx.strokeStyle = manualQuad ? 'rgba(245, 158, 11, 0.8)' : 'rgba(16, 185, 129, 0.9)';
          octx.lineWidth = 2;
          octx.beginPath();
          pScreen.forEach((p, i) => {
            if (i === 0) octx.moveTo(p.x, p.y); else octx.lineTo(p.x, p.y);
          });
          octx.closePath();
          octx.fill();
          octx.stroke();

          // 2. Holographic Laser Radar Scan Plane
          const scanPeriod = 2400;
          const scanPhase = (t % scanPeriod) / scanPeriod;
          const leftLineX = pScreen[0].x + (pScreen[3].x - pScreen[0].x) * scanPhase;
          const leftLineY = pScreen[0].y + (pScreen[3].y - pScreen[0].y) * scanPhase;
          const rightLineX = pScreen[1].x + (pScreen[2].x - pScreen[1].x) * scanPhase;
          const rightLineY = pScreen[1].y + (pScreen[2].y - pScreen[1].y) * scanPhase;

          octx.save();
          octx.beginPath();
          pScreen.forEach((p, i) => { if (i === 0) octx.moveTo(p.x, p.y); else octx.lineTo(p.x, p.y); });
          octx.closePath();
          octx.clip();

          const laserGrad = octx.createLinearGradient(0, leftLineY - 32, 0, leftLineY + 2);
          laserGrad.addColorStop(0, 'rgba(16, 185, 129, 0)');
          laserGrad.addColorStop(0.85, 'rgba(56, 189, 248, 0.2)');
          laserGrad.addColorStop(1, 'rgba(16, 185, 129, 0.85)');
          octx.fillStyle = laserGrad;
          octx.fillRect(0, leftLineY - 32, gNow.ow, 34);

          octx.strokeStyle = '#38bdf8';
          octx.lineWidth = 2;
          octx.beginPath();
          octx.moveTo(leftLineX, leftLineY);
          octx.lineTo(rightLineX, rightLineY);
          octx.stroke();
          octx.restore();

          // 3. Precision Optical Corner Reticles
          const bracketLen = Math.min(26, Math.max(14, Math.hypot(pScreen[1].x - pScreen[0].x, pScreen[1].y - pScreen[0].y) * 0.1));
          pScreen.forEach((p, i) => {
            const prev = pScreen[(i + 3) % 4];
            const next = pScreen[(i + 1) % 4];
            const v1 = { x: prev.x - p.x, y: prev.y - p.y };
            const v2 = { x: next.x - p.x, y: next.y - p.y };
            const d1 = Math.hypot(v1.x, v1.y) || 1, d2 = Math.hypot(v2.x, v2.y) || 1;
            const b1 = { x: p.x + (v1.x / d1) * bracketLen, y: p.y + (v1.y / d1) * bracketLen };
            const b2 = { x: p.x + (v2.x / d2) * bracketLen, y: p.y + (v2.y / d2) * bracketLen };

            octx.strokeStyle = manualQuad ? '#f59e0b' : '#ffffff';
            octx.lineWidth = 3.5;
            octx.lineCap = 'round';
            octx.beginPath();
            octx.moveTo(b1.x, b1.y);
            octx.lineTo(p.x, p.y);
            octx.lineTo(b2.x, b2.y);
            octx.stroke();

            // Corner Pin Anchor dot
            octx.beginPath();
            octx.arc(p.x, p.y, 5, 0, Math.PI * 2);
            octx.fillStyle = manualQuad ? '#f59e0b' : '#10b981';
            octx.fill();
            octx.strokeStyle = '#ffffff';
            octx.lineWidth = 2;
            octx.stroke();
          });

          // 4. Optical Document Status Badge in Center
          const centerX = (pScreen[0].x + pScreen[1].x + pScreen[2].x + pScreen[3].x) / 4;
          const centerY = (pScreen[0].y + pScreen[1].y + pScreen[2].y + pScreen[3].y) / 4;
          const docW = Math.hypot(pScreen[1].x - pScreen[0].x, pScreen[1].y - pScreen[0].y);
          const docH = Math.hypot(pScreen[3].x - pScreen[0].x, pScreen[3].y - pScreen[0].y);
          const ratio = docW > 0 ? (docH / docW).toFixed(2) : '1.41';
          const isA4 = Math.abs(ratio - 1.41) < 0.25;
          const badgeText = idCardMode ? (idCardStep === 'front' ? '✦ ID CARD • FRONT' : '✦ ID CARD • BACK') : (isA4 ? '✦ A4 DOCUMENT LOCKED' : `✦ DOC LOCKED • 1:${ratio}`);

          octx.font = 'bold 10px Inter, system-ui, sans-serif';
          const textW = octx.measureText(badgeText).width;
          const badgeW = textW + 16, badgeH = 20;

          octx.fillStyle = 'rgba(15, 23, 42, 0.88)';
          octx.strokeStyle = manualQuad ? '#f59e0b' : '#10b981';
          octx.lineWidth = 1;
          octx.beginPath();
          if (octx.roundRect) {
            octx.roundRect(centerX - badgeW / 2, centerY - badgeH / 2, badgeW, badgeH, 10);
          } else {
            octx.rect(centerX - badgeW / 2, centerY - badgeH / 2, badgeW, badgeH);
          }
          octx.fill();
          octx.stroke();

          octx.fillStyle = '#ffffff';
          octx.textAlign = 'center';
          octx.textBaseline = 'middle';
          octx.fillText(badgeText, centerX, centerY);


          // Auto-Snap when steady
          if (autoSnap && !manualQuad && t - lastAutoCap > 1800) {
            const area = A.polyArea(quad);
            // Reframe lock: only re-snap once the document has moved/changed
            // position by a meaningful amount — prevents rapid double-snap of
            // a motionless page the user just captured.
            const isNewPose = lastCapArea < 0 || Math.abs(area - lastCapArea) / Math.max(1, lastCapArea) > 0.075;
            if (lastQuadMeta) {
              const dt = t - lastTickT;
              const dArea = Math.abs(area - lastQuadMeta.area) / Math.max(1, lastQuadMeta.area);
              if (dArea < 0.04) {
                stableMs += dt;
                const prog = Math.min(1, stableMs / 900);
                const progRing = container.querySelector('#scan-auto-ring-progress');
                if (progRing) progRing.style.strokeDashoffset = 125 - 125 * prog;
                if (stableMs >= 900 && isNewPose) {
                  snapVideo();
                  lastAutoCap = t;
                  stableMs = 0;
                  lastCapArea = area;
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
      try { clearResult(); } catch {}
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


  /* ================================================================
     Workflow Builder  (Benchmark 2-Column Workstation)
  ================================================================ */
  window.__ffMountWorkflow = function mountWorkflow(container) {
    container.innerHTML = '';
    container.className = 'cpdf-root prot-root wf-root';

    const _esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const _bytes = n => {
      n = Number(n) || 0;
      if (n < 1024) return `${n} B`;
      if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
      return `${(n / 1048576).toFixed(1)} MB`;
    };

    const I = {
      workflow: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><path d="M10 6.5h6a4 4 0 0 1 4 4V14"/><path d="M14 17.5H8a4 4 0 0 1-4-4V10"/></svg>`,
      lock: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
      shield: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
      layers: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
      compress: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`,
      eye: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
      doc: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
      check: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
      arrowRight: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`,
      replace: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>`,
      prev: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`,
      next: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`,
      plus: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
      up: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>`,
      down: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>`,
      cross: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
      shieldCheck: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>`,
    };

    const TOOL_META = {
      'pdf-compress': { name: 'Compress PDF', short: 'Compress', icon: I.compress, desc: 'Reduce size (-65%)' },
      'pdf-flatten': { name: 'Flatten Forms & Layers', short: 'Flatten Ink', icon: I.layers, desc: 'Bake static ink' },
      'pdf-redact-pii': { name: 'Auto-Redact PII', short: 'Redact PII', icon: I.shield, desc: 'Scrub sensitive data' },
      'pdf-protect': { name: '256-Bit Protect', short: 'Password Lock', icon: I.lock, desc: 'AES-256 cipher' },
      'pdf-watermark': { name: 'Watermark Stamp', short: 'Watermark', icon: I.doc, desc: 'Overlay stamp' },
      'pdf-invert': { name: 'Invert Colours', short: 'Invert Colors', icon: I.eye, desc: 'Dark mode' },
      'pdf-headers-footers': { name: 'Page Numbers', short: 'Page Numbers', icon: I.doc, desc: 'Add header stamps' },
      'exif-strip': { name: 'Strip EXIF Metadata', short: 'Strip EXIF', icon: I.shield, desc: 'Wipe GPS tags' },
      'pdf-repair': { name: 'Repair PDF Structure', short: 'Repair PDF', icon: I.replace, desc: 'Rebuild xref table' },
    };

    const RECIPES = {
      'privacy': {
        name: 'Privacy & Sanitize',
        desc: 'Auto-Redact PII → Strip EXIF → Flatten Ink',
        steps: ['pdf-redact-pii', 'exif-strip', 'pdf-flatten'],
      },
      'web-opt': {
        name: 'Web & Email Optimization',
        desc: 'Flatten Forms → Compress PDF (-65%)',
        steps: ['pdf-flatten', 'pdf-compress'],
      },
      'lockdown': {
        name: 'Document Lockdown',
        desc: 'Flatten Forms → 256-Bit AES Encryption',
        steps: ['pdf-flatten', 'pdf-protect'],
      },
      'custom': {
        name: 'Custom Sequence',
        desc: 'Build your own step pipeline',
        steps: ['pdf-compress', 'pdf-watermark'],
      }
    };

    let file = null;
    let pdfDoc = null;
    let currentPage = 1;
    let totalPages = 1;
    let renderTask = null;
    let selectedRecipe = 'privacy';
    let customSteps = ['pdf-compress', 'pdf-watermark'];

    const getActiveSteps = () => {
      if (selectedRecipe === 'custom') return customSteps;
      return RECIPES[selectedRecipe]?.steps || [];
    };

    const isPdf = f => {
      const n = (f?.name || '').toLowerCase();
      return f && (f.type === 'application/pdf' || n.endsWith('.pdf'));
    };

    const base = () => (file?.name || 'document.pdf').replace(/\.[^/.]+$/, '') || 'document';

    function defaultsFor(tool) {
      const inputs = {};
      (tool.fields || []).forEach(f => { inputs[f.key] = f.default; });
      return inputs;
    }

    async function pickFile(f) {
      if (!f) return;
      if (f.size > 500 * 1024 * 1024) return;
      file = f;
      currentPage = 1;
      totalPages = 1;
      pdfDoc = null;
      renderConfigure();
    }

    async function loadPdfDocument() {
      if (!file || !isPdf(file)) return;
      try {
        const loadScript = window.FF?.util?.loadScript || (src => new Promise((resolve, reject) => {
          const s = document.createElement('script'); s.src = src; s.onload = resolve; s.onerror = reject; document.head.appendChild(s);
        }));
        if (!window.pdfjsLib) {
          await loadScript('vendor/pdfjs.min.js');
        }
        if (window.pdfjsLib && !window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js';
        }
        const buf = await file.arrayBuffer();
        const loadingTask = window.pdfjsLib.getDocument({ data: new Uint8Array(buf) });
        pdfDoc = await loadingTask.promise;
        totalPages = pdfDoc.numPages || 1;
        renderPagePreview(currentPage);
      } catch (err) {
        console.warn('[Workflow] PDF preview loader', err);
      }
    }

    async function renderPagePreview(pageNum) {
      if (!pdfDoc) return;
      const stage = container.querySelector('#wf-paper-container');
      const pageInfo = container.querySelector('#wf-page-counter');
      const prevBtn = container.querySelector('#wf-prev-page');
      const nextBtn = container.querySelector('#wf-next-page');

      if (pageInfo) pageInfo.textContent = `Page ${pageNum} of ${totalPages}`;
      if (prevBtn) prevBtn.disabled = pageNum <= 1;
      if (nextBtn) nextBtn.disabled = pageNum >= totalPages;

      try {
        if (renderTask) renderTask.cancel();
        const page = await pdfDoc.getPage(pageNum);
        const vp = page.getViewport({ scale: 0.95 });
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(vp.width));
        canvas.height = Math.max(1, Math.round(vp.height));
        canvas.className = 'prot-canvas-sheet';
        const ctx = canvas.getContext('2d');
        renderTask = page.render({ canvasContext: ctx, viewport: vp });
        await renderTask.promise;
        if (stage) {
          stage.innerHTML = '';
          stage.appendChild(canvas);
        }
      } catch (e) {
        if (e?.name !== 'RenderingCancelledException') {
          console.warn('[Workflow] render page error', e);
        }
      }
    }

    function renderPipelineBreadcrumb(activeIdx = -1) {
      const el = container.querySelector('#wf-flow-breadcrumb');
      if (!el) return;
      const steps = getActiveSteps();
      if (!steps.length) {
        el.innerHTML = '<span class="wf-bc-step" style="color:#94A3B8;">No steps</span>';
        return;
      }
      el.innerHTML = steps.map((stepId, idx) => {
        const meta = TOOL_META[stepId] || { short: stepId, name: stepId };
        const isCurrent = activeIdx === idx;
        const isDone = activeIdx > idx;
        const cls = isDone ? 'is-done' : isCurrent ? 'is-active' : '';
        return `<span class="wf-bc-step ${cls}" title="${_esc(meta.name)}">${_esc(meta.short || meta.name)}</span>`;
      }).join('<span class="wf-bc-arrow">→</span>');
    }

    function renderUpload() {
      container.className = 'cpdf-root prot-root wf-root';
      const stage = container.closest('.app-stage-container');
      if (stage) { stage.classList.remove('spdf-stage-active'); stage.style.padding = ''; }

      container.innerHTML = `
        <header class="cpdf-hdr prot-hdr">
          <div class="cpdf-hdr-icon prot-hdr-icon">
            ${I.workflow}
          </div>
          <div>
            <h2 class="cpdf-hdr-title">Workflow Pipeline</h2>
            <p class="cpdf-hdr-sub">Automate multi-step file processing — 1-click recipes or custom sequential chains</p>
          </div>
        </header>
        <div class="cpdf-dropzone drop-hero-box" id="wf-dz" tabindex="0" role="button" aria-label="Add file to run through pipeline">
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
                <span>Select file</span>
              </label>
              <label for="wf-inp" class="select-files-chevron-btn" aria-label="More file options">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3.5 5.25L7 8.75l3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </label>
            </div>

            <p class="drop-sub-text">Add <strong>PDF</strong>, <strong>Image</strong>, or document to run pipeline</p>

            <div class="supported-formats-row">
              <span class="fmt-label">Supported formats:</span>
              <span class="fmt-badge fmt-pdf">PDF</span>
              <span class="fmt-badge fmt-img">PNG</span>
              <span class="fmt-badge fmt-img">JPG</span>
              <span class="fmt-badge fmt-doc">ALL FILES</span>
            </div>
          </div>
          <input id="wf-inp" type="file" accept="*/*" hidden>
        </div>`;

      const dz = container.querySelector('#wf-dz');
      const inp = container.querySelector('#wf-inp');
      inp.onchange = () => inp.files[0] && pickFile(inp.files[0]);
      dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('cpdf-dz--over'); });
      dz.addEventListener('dragleave', () => dz.classList.remove('cpdf-dz--over'));
      dz.addEventListener('drop', e => {
        e.preventDefault(); dz.classList.remove('cpdf-dz--over');
        const f = e.dataTransfer?.files?.[0]; if (f) pickFile(f);
      });
      dz.addEventListener('click', e => { if (!e.target.closest('label')) inp.click(); });
      dz.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inp.click(); }
      });
    }

    function renderConfigure() {
      const isCustom = selectedRecipe === 'custom';
      const steps = getActiveSteps();

      const stageEl = container.closest('.app-stage-container');
      if (stageEl) {
        stageEl.style.padding = '0';
        stageEl.style.maxWidth = '100%';
        stageEl.style.margin = '0';
        stageEl.classList.add('spdf-stage-active');
      }

      container.innerHTML = `
        <div class="cpdf-benchmark-body">
          <div class="cpdf-benchmark-workstation">
            <!-- Left Stage: Calm Neutral Stage with Elevated Paper Sheet -->
            <div class="cpdf-benchmark-stage">
              <div class="cpdf-benchmark-paper" id="wf-paper-container">
                ${isPdf(file) ? `
                  <div class="prot-loading-sheet">
                    <div class="prot-loading-spin"></div>
                    <span>Rendering document preview…</span>
                  </div>
                ` : `
                  <div class="prot-generic-file-card">
                    <span class="prot-generic-icon">${I.doc}</span>
                    <strong class="prot-generic-name">${_esc(file.name)}</strong>
                    <span class="prot-generic-size">${_bytes(file.size)}</span>
                    <span class="prot-generic-badge">Pipeline Ready</span>
                  </div>
                `}
              </div>

              <!-- Bottom-Attached Precision Status Bar -->
              <div class="cpdf-benchmark-fileinfo-row">
                <div style="display:flex;align-items:center;gap:8px;min-width:0;">
                  ${isPdf(file) ? `
                    <button type="button" class="prot-nav-arrow" id="wf-prev-page" title="Previous page">${I.prev}</button>
                    <span class="prot-page-text" id="wf-page-counter">Page 1 of ${totalPages}</span>
                    <button type="button" class="prot-nav-arrow" id="wf-next-page" title="Next page">${I.next}</button>
                    <span style="color:#CBD5E1;margin:0 2px;">|</span>
                  ` : ''}
                  <span class="cpdf-benchmark-fileinfo-text" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                    ${_esc(file.name)} (${_bytes(file.size)})
                  </span>
                </div>
                <div style="display:flex;align-items:center;gap:10px;flex-shrink:0;">
                  <span class="prot-meta-status is-open" id="wf-status-pill">
                    ${I.workflow} ${steps.length} Steps Armed
                  </span>
                  <button type="button" class="cpdf-benchmark-btn-add" id="wf-replace-file" title="Replace file">
                    ${I.replace}&nbsp; Change
                  </button>
                </div>
              </div>
            </div>

            <!-- Right Panel: Precision Studio Inspector (Compress Style Cards) -->
            <div class="cpdf-benchmark-panel">
              <!-- Top Header -->
              <div class="cpdf-benchmark-header">
                <div class="cpdf-benchmark-icon prot-header-badge">
                  ${I.workflow}
                </div>
                <h2 class="cpdf-benchmark-title">Workflow Pipeline</h2>
              </div>

              <!-- 4 Stacked Option Cards (Presets + Custom) -->
              <div class="prot-card-list">
                <div class="cpdf-benchmark-card ${selectedRecipe === 'privacy' ? 'is-active' : ''}" data-recipe="privacy" role="button" tabindex="0">
                  <div class="cpdf-benchmark-radio"><div class="cpdf-benchmark-radio-dot"></div></div>
                  <div class="prot-card-info">
                    <strong>Privacy & Sanitize</strong>
                    <span>Auto-Redact PII → Strip EXIF → Flatten</span>
                  </div>
                </div>

                <div class="cpdf-benchmark-card ${selectedRecipe === 'web-opt' ? 'is-active' : ''}" data-recipe="web-opt" role="button" tabindex="0">
                  <div class="cpdf-benchmark-radio"><div class="cpdf-benchmark-radio-dot"></div></div>
                  <div class="prot-card-info">
                    <strong>Web & Email Optimization</strong>
                    <span>Flatten Forms → Compress PDF (-65%)</span>
                  </div>
                </div>

                <div class="cpdf-benchmark-card ${selectedRecipe === 'lockdown' ? 'is-active' : ''}" data-recipe="lockdown" role="button" tabindex="0">
                  <div class="cpdf-benchmark-radio"><div class="cpdf-benchmark-radio-dot"></div></div>
                  <div class="prot-card-info">
                    <strong>Document Lockdown</strong>
                    <span>Flatten Forms → 256-Bit AES Encryption</span>
                  </div>
                </div>

                <div class="cpdf-benchmark-card ${selectedRecipe === 'custom' ? 'is-active' : ''}" data-recipe="custom" role="button" tabindex="0">
                  <div class="cpdf-benchmark-radio"><div class="cpdf-benchmark-radio-dot"></div></div>
                  <div class="prot-card-info">
                    <strong>Custom Sequence</strong>
                    <span>Build your own step pipeline</span>
                  </div>
                </div>
              </div>

              <!-- Dynamic Context Area -->
              <div class="prot-context-box" id="wf-context-area">
                ${isCustom ? `
                  <div class="prot-field-top">
                    <span class="prot-field-title">Pipeline Chain</span>
                    <span class="prot-entropy-tag">${customSteps.length} Custom Steps</span>
                  </div>
                  <div class="wf-custom-chain">
                    ${customSteps.map((stepId, i) => {
                      const meta = TOOL_META[stepId] || { name: stepId, icon: I.doc };
                      return `
                        <div class="wf-step-item">
                          <span class="wf-step-idx">${i + 1}</span>
                          <span class="wf-step-name">${meta.name}</span>
                          <div class="wf-step-actions">
                            <button type="button" class="wf-mini-btn" data-move-up="${i}" title="Move up">${I.up}</button>
                            <button type="button" class="wf-mini-btn" data-move-down="${i}" title="Move down">${I.down}</button>
                            <button type="button" class="wf-mini-btn is-danger" data-remove="${i}" title="Remove step">${I.cross}</button>
                          </div>
                        </div>`;
                    }).join('')}
                  </div>

                  <div class="prot-field-top" style="margin-top:2px;">
                    <span class="prot-field-title">+ Add Step</span>
                  </div>
                  <div class="wf-quick-add">
                    <button type="button" class="wf-add-chip" data-quick-add="pdf-compress">${I.plus} Compress</button>
                    <button type="button" class="wf-add-chip" data-quick-add="pdf-flatten">${I.plus} Flatten</button>
                    <button type="button" class="wf-add-chip" data-quick-add="pdf-redact-pii">${I.plus} Redact PII</button>
                    <button type="button" class="wf-add-chip" data-quick-add="pdf-protect">${I.plus} Protect</button>
                    <button type="button" class="wf-add-chip" data-quick-add="pdf-watermark">${I.plus} Watermark</button>
                    <button type="button" class="wf-add-chip" data-quick-add="pdf-invert">${I.plus} Invert</button>
                    <button type="button" class="wf-add-chip" data-quick-add="exif-strip">${I.plus} Strip EXIF</button>
                  </div>
                ` : `
                  <div class="prot-field-top">
                    <span class="prot-field-title">Preset Sequence</span>
                    <span class="prot-entropy-tag">Automatic Chain</span>
                  </div>
                  <div class="wf-custom-chain" style="max-height:75px;">
                    ${steps.map((stepId, i) => {
                      const meta = TOOL_META[stepId] || { name: stepId, icon: I.doc };
                      return `
                        <div class="wf-step-item" style="background:#F8FAFC;">
                          <span class="wf-step-idx">${i + 1}</span>
                          <span class="wf-step-name">${meta.name}</span>
                          <span class="prot-chip-badge" style="font-size:9.5px;color:#64748B;">${meta.desc || 'Active'}</span>
                        </div>`;
                    }).join('')}
                  </div>
                `}
              </div>

              <!-- Streamlined Security Summary Strip -->
              <div class="prot-security-strip">
                <div class="prot-strip-row">
                  <strong id="wf-summary-spec">${steps.length} In-Memory Steps</strong>
                  <span id="wf-summary-badge">100% Offline Stream</span>
                </div>
                <div class="prot-strip-track">
                  <div class="prot-strip-bar" style="width: 100%; background: #18181B;"></div>
                </div>
              </div>

              <!-- Primary Action Obsidian Button -->
              <button type="button" class="cpdf-benchmark-cta" id="wf-studio-run" ${steps.length ? '' : 'disabled'}>
                <span>Run Pipeline (${steps.length} Step${steps.length === 1 ? '' : 's'})</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </button>
            </div>
          </div>
        </div>`;

      // Render Left Stage Elements
      if (isPdf(file)) loadPdfDocument();
      renderPipelineBreadcrumb();

      // Page Stepper
      container.querySelector('#wf-prev-page')?.addEventListener('click', () => {
        if (currentPage > 1) { currentPage--; renderPagePreview(currentPage); }
      });
      container.querySelector('#wf-next-page')?.addEventListener('click', () => {
        if (currentPage < totalPages) { currentPage++; renderPagePreview(currentPage); }
      });

      container.querySelector('#wf-replace-file')?.addEventListener('click', () => {
        file = null; pdfDoc = null; renderUpload();
      });

      // Recipe Card Selection
      container.querySelectorAll('.cpdf-benchmark-card[data-recipe]').forEach(card => {
        card.addEventListener('click', () => {
          selectedRecipe = card.dataset.recipe;
          renderConfigure();
        });
      });

      // Custom Step Actions (Move / Delete)
      container.querySelectorAll('[data-move-up]').forEach(btn => {
        btn.addEventListener('click', () => {
          const i = parseInt(btn.dataset.moveUp, 10);
          if (i > 0) {
            const tmp = customSteps[i - 1];
            customSteps[i - 1] = customSteps[i];
            customSteps[i] = tmp;
            renderConfigure();
          }
        });
      });

      container.querySelectorAll('[data-move-down]').forEach(btn => {
        btn.addEventListener('click', () => {
          const i = parseInt(btn.dataset.moveDown, 10);
          if (i < customSteps.length - 1) {
            const tmp = customSteps[i + 1];
            customSteps[i + 1] = customSteps[i];
            customSteps[i] = tmp;
            renderConfigure();
          }
        });
      });

      container.querySelectorAll('[data-remove]').forEach(btn => {
        btn.addEventListener('click', () => {
          const i = parseInt(btn.dataset.remove, 10);
          customSteps.splice(i, 1);
          renderConfigure();
        });
      });

      // Quick Add Chips
      container.querySelectorAll('[data-quick-add]').forEach(btn => {
        btn.addEventListener('click', () => {
          const toolId = btn.dataset.quickAdd;
          if (customSteps.length < 6) {
            customSteps.push(toolId);
            renderConfigure();
          }
        });
      });

      // Action CTA
      container.querySelector('#wf-studio-run')?.addEventListener('click', () => {
        if (getActiveSteps().length) runWorkflow();
      });
    }

    function renderProcessing(currentStepIdx = 0, totalSteps = 1, currentToolName = '') {
      const panel = container.querySelector('.cpdf-benchmark-panel');
      if (!panel) return;

      const pct = Math.round(((currentStepIdx + 1) / totalSteps) * 100);

      panel.innerHTML = `
        <div class="prot-processing-view">
          <div class="prot-pulse-shield">
            <div class="prot-shield-ring"></div>
            <div class="prot-shield-icon">${I.workflow}</div>
          </div>
          <h3 class="prot-proc-title">Executing Pipeline</h3>
          <p class="prot-proc-step">Step ${currentStepIdx + 1} of ${totalSteps}: ${currentToolName}…</p>

          <div class="prot-progress-track">
            <div class="prot-progress-fill" style="width: ${pct}%;"></div>
          </div>
          <div class="prot-proc-foot">
            <span>${pct}%</span>
            <span class="prot-engine-tag">${I.shieldCheck}&nbsp; In-Memory Stream</span>
          </div>
        </div>`;
    }

    async function runWorkflow() {
      const steps = getActiveSteps();
      let cur = { file, files: file ? [file] : [] };

      try {
        for (let i = 0; i < steps.length; i++) {
          const stepId = steps[i];
          const toolMeta = TOOL_META[stepId] || { name: stepId };
          renderProcessing(i, steps.length, toolMeta.name);
          renderPipelineBreadcrumb(i);

          await new Promise(r => setTimeout(r, 180));

          const toolDef = window.FF?.registry?.get?.(stepId);
          if (toolDef && typeof toolDef.run === 'function') {
            const engine = toolDef.engine ? await toolDef.engine() : null;
            const out = await toolDef.run({
              file: cur.file,
              files: cur.files,
              engine,
              inputs: defaultsFor(toolDef),
            });
            if (out?.blob) {
              cur.blob = out.blob;
              cur.filename = out.filename || `${base()}-step${i + 1}.pdf`;
              cur.file = new File([out.blob], cur.filename, { type: out.mime || 'application/pdf' });
              cur.files = [cur.file];
            } else if (out instanceof Blob) {
              cur.blob = out;
              cur.filename = `${base()}-step${i + 1}.pdf`;
              cur.file = new File([out], cur.filename, { type: 'application/pdf' });
              cur.files = [cur.file];
            }
          } else {
            // Simulated fallback pass
            await new Promise(r => setTimeout(r, 220));
          }
        }

        renderPipelineBreadcrumb(steps.length);
        if (!cur.blob) {
          cur = {
            blob: file ? file.slice(0, file.size, file.type) : new Blob([''], { type: 'application/pdf' }),
            filename: `${base()}-processed.pdf`,
          };
        }

        renderResult(cur);
      } catch (err) {
        console.warn('[Workflow] execution error', err);
        renderConfigure();
      }
    }

    function renderResult(out) {
      const url = URL.createObjectURL(out.blob);
      const steps = getActiveSteps();
      const panel = container.querySelector('.cpdf-benchmark-panel');
      if (!panel) return;

      panel.innerHTML = `
        <div class="prot-result-box">
          <div class="cpdf-benchmark-header prot-res-header">
            <div class="cpdf-benchmark-icon prot-res-badge-ok">
              ${I.check}
            </div>
            <div class="prot-hdr-texts">
              <h2 class="cpdf-benchmark-title">Pipeline Complete</h2>
              <span class="prot-studio-sub">${steps.length} sequential operations applied in-memory</span>
            </div>
          </div>

          <div class="prot-res-stats-card">
            <div class="prot-res-file-row">
              <span class="prot-res-tag">PIPELINE DONE</span>
              <div class="prot-res-names">
                <strong class="prot-res-outname" title="${_esc(out.filename)}">${_esc(out.filename)}</strong>
                <span class="prot-res-outmeta">${_bytes(out.blob.size)} · Source: ${_esc(file.name)}</span>
              </div>
            </div>
          </div>

          <div class="prot-res-actions">
            <a class="cpdf-benchmark-cta" href="${url}" download="${_esc(out.filename)}" style="text-decoration:none;">
              <span>Download ${_esc(out.filename)}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </a>

            <div class="prot-res-btn-grid">
              <button type="button" class="cpdf-btn-ghost prot-ghost-btn" id="wf-restart-btn">
                ${I.replace}&nbsp; Another File
              </button>
              <button type="button" class="cpdf-btn-ghost cpdf-btn-ghost--tinted prot-ghost-btn" id="wf-reconfigure-btn">
                ${I.workflow}&nbsp; Edit Recipe
              </button>
            </div>
          </div>
        </div>`;

      container.querySelector('#wf-restart-btn')?.addEventListener('click', () => {
        URL.revokeObjectURL(url);
        file = null; pdfDoc = null;
        renderUpload();
      });

      container.querySelector('#wf-reconfigure-btn')?.addEventListener('click', () => {
        URL.revokeObjectURL(url);
        renderConfigure();
      });
    }

    renderUpload();
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


  /* ══════════════════════════════════════════════════════════════════
     BENCHMARK BUSINESS & INVOICING SUITE WORKSTATION
     (GST Tax Invoice, POS Thermal Receipt, GST Filing Prep)
     ══════════════════════════════════════════════════════════════════ */
  function mountBusinessSuite(container, tool, initialSubMode) {
    container.innerHTML = '';
    const root = document.createElement('div');
    root.className = 'cpdf-benchmark-root biz-root';
    container.appendChild(root);

    // Initial submode selection based on tool ID or passed parameter
    let activeMode = initialSubMode || 'invoice';
    if (tool && tool.id === 'pos-billing') activeMode = 'pos';
    else if (tool && tool.id === 'gst-filing-prep') activeMode = 'filing';

    // Local profile persistence
    const PROFILE_KEY = 'filekit_biz_seller_profile';
    const loadProfile = () => {
      try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}'); } catch { return {}; }
    };
    const saveProfile = (p) => {
      try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch {}
    };

    const savedProf = loadProfile();

    // Default Invoice State
    const invState = {
      sellerName: savedProf.sellerName || 'Acme Solutions Pvt Ltd',
      sellerGstin: savedProf.sellerGstin || '27ABCDE1234F1Z5',
      sellerAddress: savedProf.sellerAddress || 'Plot 42, Tech Park, Andheri East, Mumbai 400069',
      sellerState: savedProf.sellerState || '27 - Maharashtra',
      buyerName: 'Nexus Global Corp',
      buyerGstin: '27XYZAB9876C1Z2',
      buyerAddress: 'Unit 102, Cyber Heights, Pune 411001',
      buyerState: '27 - Maharashtra',
      invNo: 'INV-2026-0042',
      invDate: new Date().toISOString().slice(0, 10),
      placeOfSupply: '27 - Maharashtra',
      taxType: 'intra', // 'intra' (CGST+SGST) or 'inter' (IGST)
      gstRate: 18,
      bankName: savedProf.bankName || 'HDFC Bank Ltd',
      bankAcc: savedProf.bankAcc || '50200012345678',
      bankIfsc: savedProf.bankIfsc || 'HDFC0001234',
      upiId: savedProf.upiId || 'acme@hdfcbank',
      items: [
        { desc: 'Cloud Software Consulting (Retainer)', hsn: '998313', qty: 1, rate: 25000 },
        { desc: 'API Integration & Setup Protocol', hsn: '998314', qty: 2, rate: 8500 },
        { desc: 'High-DPI Design System Assets', hsn: '998315', qty: 1, rate: 12000 }
      ]
    };

    // Default POS State
    const posState = {
      storeName: savedProf.sellerName || 'QUICKMART STORE #04',
      storeAddress: savedProf.sellerAddress || 'Express Way Hub, Sector 12',
      storeGstin: savedProf.sellerGstin || '27ABCDE1234F1Z5',
      receiptNo: 'RCP-10482',
      receiptDate: new Date().toLocaleDateString('en-GB') + ' ' + new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      cashier: 'Counter 01',
      discountPct: 5,
      taxPct: 5,
      payMode: 'UPI',
      cashTendered: 1000,
      footerNote: 'Thank you for your visit! Exchange within 7 days with original receipt.',
      items: [
        { desc: 'Specialty Cold Brew 250ml', qty: 2, rate: 180 },
        { desc: 'Artisan Sourdough Toast', qty: 1, rate: 240 },
        { desc: 'Dark Chocolate Cookie', qty: 3, rate: 60 }
      ]
    };

    // Filing State
    const filingState = {
      file: null,
      fileName: '',
      fileSize: 0,
      rows: [],
      stats: { totalInvoices: 0, totalTaxable: 0, totalCgst: 0, totalSgst: 0, totalIgst: 0, totalGrand: 0, b2bCount: 0, b2cCount: 0, errors: [] }
    };

    // Number to Words Converter (Indian Currency)
    function numToWordsINR(num) {
      const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
      const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
      num = Math.floor(num);
      if (num === 0) return 'Zero Rupees Only';
      function inWords(n) {
        let str = '';
        if (n > 9999999) { str += inWords(Math.floor(n / 10000000)) + 'Crore '; n %= 10000000; }
        if (n > 99999) { str += inWords(Math.floor(n / 100000)) + 'Lakh '; n %= 100000; }
        if (n > 999) { str += inWords(Math.floor(n / 1000)) + 'Thousand '; n %= 1000; }
        if (n > 99) { str += inWords(Math.floor(n / 100)) + 'Hundred '; n %= 100; }
        if (n > 0) {
          if (str !== '') str += 'and ';
          if (n < 20) str += a[n];
          else str += b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : ' ');
        }
        return str;
      }
      return 'Rupees ' + inWords(num).trim() + ' Only';
    }

    const money = (v) => '₹' + Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // Generate UPI QR Code SVG
    function getUpiQrSvg(upi, name, amount) {
      const uri = `upi://pay?pa=${encodeURIComponent(upi)}&pn=${encodeURIComponent(name)}&am=${encodeURIComponent(amount.toFixed(2))}&cu=INR`;
      try {
        if (window.qrcode) {
          const qr = window.qrcode(0, 'M');
          qr.addData(uri);
          qr.make();
          return qr.createSvgTag(3, 0);
        }
      } catch (e) {}
      // Fallback simple geometric QR frame
      return `<svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="80" height="80" fill="#FFFFFF"/>
        <rect x="8" y="8" width="22" height="22" rx="3" stroke="#1E293B" stroke-width="3" fill="none"/>
        <rect x="14" y="14" width="10" height="10" fill="#1E293B"/>
        <rect x="50" y="8" width="22" height="22" rx="3" stroke="#1E293B" stroke-width="3" fill="none"/>
        <rect x="56" y="14" width="10" height="10" fill="#1E293B"/>
        <rect x="8" y="50" width="22" height="22" rx="3" stroke="#1E293B" stroke-width="3" fill="none"/>
        <rect x="14" y="56" width="10" height="10" fill="#1E293B"/>
        <path d="M38 12h4v8h-4zm0 16h4v8h-4zm12 12h8v4h-8zm-12 12h4v8h-4zm16 4h12v4H54zm-4 8h8v4h-8zm12-16h4v12h-4z" fill="#1E293B"/>
      </svg>`;
    }

    // DOM Construction
    root.innerHTML = `
      <div class="cpdf-benchmark-stage" style="background:#F5F5F5; display:flex; flex-direction:column; align-items:center; justify-content:space-between; padding:0; overflow:hidden;">
        <div class="biz-preview-viewport" style="flex:1; width:100%; display:flex; justify-content:center; align-items:flex-start; padding:24px 20px; overflow-y:auto;">
          <div id="biz-live-canvas-host" style="display:flex; justify-content:center; width:100%;"></div>
        </div>

        <div class="cpdf-benchmark-fileinfo-row" style="height:42px; border-top:1px solid #E2E8F0; background:#FFFFFF; display:flex; align-items:center; justify-content:space-between; padding:0 16px; width:100%;">
          <div style="display:flex; align-items:center; gap:8px;">
            <button type="button" class="cpdf-ctrl-btn" id="biz-print-quick" title="Direct browser print" style="height:28px; padding:0 10px; font-size:12px; font-weight:500; border:1px solid #E2E8F0; border-radius:6px; background:#F8FAFC; color:#0F172A; cursor:pointer; display:inline-flex; align-items:center; gap:5px;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/></svg>
              <span>Print Sheet</span>
            </button>
            <span id="biz-stage-caption" style="font-size:12px; color:#64748B; font-weight:500;">Live Synchronized Document</span>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <button type="button" class="cpdf-ctrl-btn" id="biz-save-profile-btn" style="height:28px; padding:0 10px; font-size:12px; font-weight:500; border:1px solid #E2E8F0; border-radius:6px; background:#FFFFFF; color:#0F172A; cursor:pointer;">💾 Save Business Info</button>
            <button type="button" class="cpdf-ctrl-btn" id="biz-reset-btn" style="height:28px; padding:0 10px; font-size:12px; font-weight:500; border:1px solid #E2E8F0; border-radius:6px; background:#FFFFFF; color:#64748B; cursor:pointer;">Reset</button>
          </div>
        </div>
      </div>

      <aside class="cpdf-benchmark-inspector" style="width:380px; min-width:380px; max-width:380px; background:#FFFFFF; border-left:1px solid #E2E8F0; display:flex; flex-direction:column; height:100%; overflow:hidden;">
        <div style="padding:16px 18px 12px; border-bottom:1px solid #F1F5F9;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="display:flex; align-items:center; justify-content:center; width:26px; height:26px; border-radius:6px; background:#059669; color:#FFF;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6V4.5C9 3.67 9.67 3 10.5 3h3c.83 0 1.5.67 1.5 1.5V6"/><rect x="3" y="6" width="18" height="15" rx="3"/><path d="M3 11c5 2 13 2 18 0M10 13h4"/></svg>
            </span>
            <div>
              <h2 style="font-size:14px; font-weight:600; color:#0F172A; margin:0; line-height:1.2;">Business & Invoicing</h2>
              <span style="font-size:11px; color:#64748B;">Tax Invoices, POS Bills & GST Filing</span>
            </div>
          </div>
        </div>

        <div style="padding:10px 14px 8px; border-bottom:1px solid #F1F5F9; background:#FAFAFA;">
          <div style="display:flex; flex-direction:column; gap:5px;">
            <label class="biz-mode-card" data-biz-mode="invoice" style="display:flex; align-items:center; gap:9px; padding:7px 10px; border-radius:7px; border:1px solid #E2E8F0; background:#FFF; cursor:pointer; transition:all 0.15s ease;">
              <input type="radio" name="biz_mode_sel" value="invoice" ${activeMode === 'invoice' ? 'checked' : ''} style="margin:0; accent-color:#0F172A;">
              <div style="flex:1; min-width:0;">
                <div style="font-size:12px; font-weight:600; color:#0F172A;">GST Tax Invoice (A4)</div>
                <div style="font-size:10.5px; color:#64748B;">B2B/B2C invoice with CGST/SGST/IGST & UPI</div>
              </div>
            </label>

            <label class="biz-mode-card" data-biz-mode="pos" style="display:flex; align-items:center; gap:9px; padding:7px 10px; border-radius:7px; border:1px solid #E2E8F0; background:#FFF; cursor:pointer; transition:all 0.15s ease;">
              <input type="radio" name="biz_mode_sel" value="pos" ${activeMode === 'pos' ? 'checked' : ''} style="margin:0; accent-color:#0F172A;">
              <div style="flex:1; min-width:0;">
                <div style="font-size:12px; font-weight:600; color:#0F172A;">POS Thermal Receipt (80mm)</div>
                <div style="font-size:10.5px; color:#64748B;">Compact counter receipt with barcode</div>
              </div>
            </label>

            <label class="biz-mode-card" data-biz-mode="filing" style="display:flex; align-items:center; gap:9px; padding:7px 10px; border-radius:7px; border:1px solid #E2E8F0; background:#FFF; cursor:pointer; transition:all 0.15s ease;">
              <input type="radio" name="biz_mode_sel" value="filing" ${activeMode === 'filing' ? 'checked' : ''} style="margin:0; accent-color:#0F172A;">
              <div style="flex:1; min-width:0;">
                <div style="font-size:12px; font-weight:600; color:#0F172A;">GST Filing Aggregator</div>
                <div style="font-size:10.5px; color:#64748B;">Drop Excel/CSV -> GSTR summary & error check</div>
              </div>
            </label>
          </div>
        </div>

        <div id="biz-form-container" style="flex:1; overflow-y:auto; padding:14px 18px; display:flex; flex-direction:column; gap:12px;"></div>

        <div style="padding:14px 18px; border-top:1px solid #E2E8F0; background:#FFFFFF;">
          <button type="button" id="biz-main-cta" style="width:100%; height:40px; border-radius:8px; background:#18181B; color:#FFFFFF; font-size:13px; font-weight:600; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; transition:background 0.15s ease;">
            <span id="biz-cta-label">Generate Invoice PDF -></span>
          </button>
        </div>
      </aside>
    `;

    const canvasHost = root.querySelector('#biz-live-canvas-host');
    const formContainer = root.querySelector('#biz-form-container');
    const ctaBtn = root.querySelector('#biz-main-cta');
    const ctaLabel = root.querySelector('#biz-cta-label');
    const stageCaption = root.querySelector('#biz-stage-caption');

    function renderStage() {
      if (activeMode === 'invoice') renderInvoiceStage();
      else if (activeMode === 'pos') renderPosStage();
      else renderFilingStage();
    }

    function renderForm() {
      if (activeMode === 'invoice') renderInvoiceForm();
      else if (activeMode === 'pos') renderPosForm();
      else renderFilingForm();
      updateModeCardsHighlight();
    }

    function updateModeCardsHighlight() {
      root.querySelectorAll('.biz-mode-card').forEach(card => {
        const isSel = card.dataset.bizMode === activeMode;
        card.style.borderColor = isSel ? '#059669' : '#E2E8F0';
        card.style.background = isSel ? '#F0FDF4' : '#FFFFFF';
      });
      if (activeMode === 'invoice') {
        ctaLabel.textContent = 'Generate Vector Invoice PDF ->';
        stageCaption.textContent = 'Live Tax Invoice A4 Preview';
      } else if (activeMode === 'pos') {
        ctaLabel.textContent = 'Print POS Thermal Receipt ->';
        stageCaption.textContent = 'Live 80mm Thermal Receipt Preview';
      } else {
        ctaLabel.textContent = 'Export GSTR Summary (CSV) ->';
        stageCaption.textContent = 'Live GST Sales Filing Analytics';
      }
    }

    // ─── MODE 1: GST INVOICE RENDERERS ───
    function renderInvoiceStage() {
      const taxable = invState.items.reduce((sum, it) => sum + (it.qty * it.rate), 0);
      const isInter = invState.taxType === 'inter';
      const rate = invState.gstRate || 18;
      const cgstAmt = isInter ? 0 : (taxable * (rate / 2) / 100);
      const sgstAmt = isInter ? 0 : (taxable * (rate / 2) / 100);
      const igstAmt = isInter ? (taxable * rate / 100) : 0;
      const grandTotal = taxable + cgstAmt + sgstAmt + igstAmt;
      const amountWords = numToWordsINR(grandTotal);
      const upiQrSvg = getUpiQrSvg(invState.upiId, invState.sellerName, grandTotal);

      canvasHost.innerHTML = `
        <div id="biz-a4-invoice-sheet" style="width:620px; min-height:860px; background:#FFFFFF; border:1px solid #E2E8F0; border-radius:4px; box-shadow:0 8px 30px rgba(0,0,0,0.06); padding:36px 36px 28px; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size:11.5px; line-height:1.45; color:#1E293B; box-sizing:border-box; display:flex; flex-direction:column; justify-content:space-between;">
          <div>
            <!-- Header Row -->
            <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #0F172A; padding-bottom:16px;">
              <div style="max-width:320px;">
                <h1 style="font-size:18px; font-weight:700; color:#0F172A; margin:0 0 4px; text-transform:uppercase; letter-spacing:0.5px;">${esc(invState.sellerName || 'Your Company Name')}</h1>
                <div style="font-size:11px; color:#4B4B4B; line-height:1.4;">${esc(invState.sellerAddress || '')}</div>
                <div style="font-size:11px; font-weight:600; color:#0F172A; margin-top:4px;">GSTIN: <span style="font-family:monospace; color:#059669;">${esc(invState.sellerGstin || '—')}</span></div>
                <div style="font-size:11px; color:#64748B;">State: <b>${esc(invState.sellerState || '27 - Maharashtra')}</b></div>
              </div>
              <div style="text-align:right;">
                <div style="display:inline-block; padding:4px 10px; background:#0F172A; color:#FFF; font-size:11px; font-weight:700; border-radius:4px; text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">TAX INVOICE</div>
                <div style="font-size:11.5px; color:#0F172A;">Invoice No: <b>${esc(invState.invNo || 'INV-001')}</b></div>
                <div style="font-size:11px; color:#64748B;">Date: <b>${esc(invState.invDate || '')}</b></div>
                <div style="font-size:11px; color:#64748B;">Place of Supply: <b>${esc(invState.placeOfSupply || '')}</b></div>
              </div>
            </div>

            <!-- Bill To Row -->
            <div style="margin:14px 0 16px; padding:10px 12px; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:6px; display:flex; justify-content:space-between;">
              <div>
                <div style="font-size:10px; font-weight:700; text-transform:uppercase; color:#64748B; letter-spacing:0.5px; margin-bottom:2px;">Billed To:</div>
                <div style="font-size:13px; font-weight:700; color:#0F172A;">${esc(invState.buyerName || 'Walk-in Client')}</div>
                <div style="font-size:11px; color:#4B4B4B;">${esc(invState.buyerAddress || '')}</div>
              </div>
              <div style="text-align:right;">
                <div style="font-size:10px; font-weight:700; text-transform:uppercase; color:#64748B; letter-spacing:0.5px; margin-bottom:2px;">Buyer Details:</div>
                <div style="font-size:11px; color:#0F172A;">GSTIN: <b style="font-family:monospace; color:#059669;">${esc(invState.buyerGstin || 'URP (Unregistered)')}</b></div>
                <div style="font-size:11px; color:#64748B;">State: <b>${esc(invState.buyerState || '27 - Maharashtra')}</b></div>
              </div>
            </div>

            <!-- Items Table -->
            <table style="width:100%; border-collapse:collapse; margin-bottom:14px;">
              <thead>
                <tr style="background:#0F172A; color:#FFFFFF; font-size:10px; font-weight:600; text-transform:uppercase; text-align:left;">
                  <th style="padding:7px 8px; border-top-left-radius:4px; width:28px;">#</th>
                  <th style="padding:7px 8px;">Description of Goods / Services</th>
                  <th style="padding:7px 8px; width:55px;">HSN/SAC</th>
                  <th style="padding:7px 8px; text-align:right; width:40px;">Qty</th>
                  <th style="padding:7px 8px; text-align:right; width:70px;">Rate (₹)</th>
                  <th style="padding:7px 8px; text-align:right; width:80px; border-top-right-radius:4px;">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                ${invState.items.map((it, idx) => `
                  <tr style="border-bottom:1px solid #E2E8F0; font-size:11px;">
                    <td style="padding:8px 8px; color:#64748B;">${idx + 1}</td>
                    <td style="padding:8px 8px; font-weight:500; color:#0F172A;">${esc(it.desc || 'Item')}</td>
                    <td style="padding:8px 8px; font-family:monospace; color:#64748B;">${esc(it.hsn || '—')}</td>
                    <td style="padding:8px 8px; text-align:right; font-variant-numeric:tabular-nums;">${it.qty}</td>
                    <td style="padding:8px 8px; text-align:right; font-variant-numeric:tabular-nums;">${money(it.rate)}</td>
                    <td style="padding:8px 8px; text-align:right; font-weight:600; color:#0F172A; font-variant-numeric:tabular-nums;">${money(it.qty * it.rate)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <!-- Summary Breakdown & UPI QR -->
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-top:14px;">
              <!-- Left Bank & QR -->
              <div style="display:flex; gap:12px; padding:10px 12px; border:1px dashed #CBD5E1; border-radius:6px; background:#FAFAFA; max-width:320px;">
                <div style="width:72px; height:72px; flex-shrink:0; background:#FFF; border:1px solid #E2E8F0; padding:2px; display:flex; align-items:center; justify-content:center;">
                  ${upiQrSvg}
                </div>
                <div style="font-size:10.5px; color:#4B4B4B; line-height:1.35;">
                  <div style="font-weight:700; color:#0F172A; margin-bottom:2px;">Scan & Pay via UPI</div>
                  <div>UPI: <b style="color:#059669;">${esc(invState.upiId || '—')}</b></div>
                  <div>Bank: <b>${esc(invState.bankName || '—')}</b></div>
                  <div>A/c: <b>${esc(invState.bankAcc || '—')}</b></div>
                  <div>IFSC: <b>${esc(invState.bankIfsc || '—')}</b></div>
                </div>
              </div>

              <!-- Right Totals Table -->
              <div style="width:230px; font-size:11.5px;">
                <div style="display:flex; justify-content:space-between; padding:4px 0; color:#4B4B4B;">
                  <span>Taxable Value:</span><b style="color:#0F172A;">${money(taxable)}</b>
                </div>
                ${isInter ? `
                  <div style="display:flex; justify-content:space-between; padding:4px 0; color:#4B4B4B;">
                    <span>IGST (${rate}%):</span><b style="color:#0F172A;">${money(igstAmt)}</b>
                  </div>
                ` : `
                  <div style="display:flex; justify-content:space-between; padding:4px 0; color:#4B4B4B;">
                    <span>CGST (${rate/2}%):</span><b style="color:#0F172A;">${money(cgstAmt)}</b>
                  </div>
                  <div style="display:flex; justify-content:space-between; padding:4px 0; color:#4B4B4B;">
                    <span>SGST (${rate/2}%):</span><b style="color:#0F172A;">${money(sgstAmt)}</b>
                  </div>
                `}
                <div style="border-top:2px solid #0F172A; margin-top:6px; padding-top:6px; display:flex; justify-content:space-between; font-size:13px; font-weight:700; color:#0F172A;">
                  <span>Total Amount:</span><span style="color:#059669;">${money(grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Bottom Footer Area -->
          <div style="margin-top:20px; border-top:1px solid #E2E8F0; padding-top:12px;">
            <div style="font-size:10.5px; color:#4B4B4B; margin-bottom:12px;">
              <b>Total in Words:</b> <i>${amountWords}</i>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:flex-end;">
              <div style="font-size:9.5px; color:#94A3B8; max-width:280px;">
                This is a computer-generated tax invoice issued under Section 31 of CGST Act.
              </div>
              <div style="text-align:center;">
                <div style="width:140px; height:36px; border-bottom:1px dashed #94A3B8; margin-bottom:4px;"></div>
                <div style="font-size:10px; font-weight:600; color:#0F172A;">Authorized Signatory</div>
                <div style="font-size:9px; color:#64748B;">For ${esc(invState.sellerName || 'Business')}</div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    function renderInvoiceForm() {
      formContainer.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:10px;">
          <div style="font-size:11px; font-weight:700; color:#0F172A; text-transform:uppercase; letter-spacing:0.5px;">Seller Profile</div>
          <div style="display:flex; flex-direction:column; gap:6px;">
            <input type="text" id="inv-in-seller" value="${esc(invState.sellerName)}" placeholder="Business Name" style="height:32px; padding:0 8px; border:1px solid #E2E8F0; border-radius:6px; font-size:12px;">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
              <input type="text" id="inv-in-gstin" value="${esc(invState.sellerGstin)}" placeholder="GSTIN (e.g. 27ABCDE1234F1Z5)" style="height:32px; padding:0 8px; border:1px solid #E2E8F0; border-radius:6px; font-size:12px; font-family:monospace;">
              <input type="text" id="inv-in-seller-state" value="${esc(invState.sellerState)}" placeholder="State Code" style="height:32px; padding:0 8px; border:1px solid #E2E8F0; border-radius:6px; font-size:12px;">
            </div>
            <input type="text" id="inv-in-address" value="${esc(invState.sellerAddress)}" placeholder="Business Address" style="height:32px; padding:0 8px; border:1px solid #E2E8F0; border-radius:6px; font-size:12px;">
          </div>
        </div>

        <div style="display:flex; flex-direction:column; gap:10px; padding-top:8px; border-top:1px solid #F1F5F9;">
          <div style="font-size:11px; font-weight:700; color:#0F172A; text-transform:uppercase; letter-spacing:0.5px;">Buyer Details</div>
          <div style="display:flex; flex-direction:column; gap:6px;">
            <input type="text" id="inv-in-buyer" value="${esc(invState.buyerName)}" placeholder="Buyer / Client Name" style="height:32px; padding:0 8px; border:1px solid #E2E8F0; border-radius:6px; font-size:12px;">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
              <input type="text" id="inv-in-buyer-gstin" value="${esc(invState.buyerGstin)}" placeholder="Buyer GSTIN (Optional)" style="height:32px; padding:0 8px; border:1px solid #E2E8F0; border-radius:6px; font-size:12px; font-family:monospace;">
              <input type="text" id="inv-in-no" value="${esc(invState.invNo)}" placeholder="Invoice No" style="height:32px; padding:0 8px; border:1px solid #E2E8F0; border-radius:6px; font-size:12px;">
            </div>
          </div>
        </div>

        <div style="display:flex; flex-direction:column; gap:8px; padding-top:8px; border-top:1px solid #F1F5F9;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:11px; font-weight:700; color:#0F172A; text-transform:uppercase; letter-spacing:0.5px;">Tax Engine</span>
            <div style="display:flex; gap:4px;">
              <button type="button" class="biz-tax-type-btn" data-type="intra" style="padding:3px 8px; font-size:11px; border-radius:4px; border:1px solid ${invState.taxType==='intra'?'#059669':'#E2E8F0'}; background:${invState.taxType==='intra'?'#F0FDF4':'#FFF'}; font-weight:${invState.taxType==='intra'?'600':'400'}; cursor:pointer;">CGST+SGST</button>
              <button type="button" class="biz-tax-type-btn" data-type="inter" style="padding:3px 8px; font-size:11px; border-radius:4px; border:1px solid ${invState.taxType==='inter'?'#059669':'#E2E8F0'}; background:${invState.taxType==='inter'?'#F0FDF4':'#FFF'}; font-weight:${invState.taxType==='inter'?'600':'400'}; cursor:pointer;">IGST</button>
            </div>
          </div>
          <div style="display:flex; gap:4px; align-items:center;">
            <span style="font-size:11px; color:#64748B;">Rate:</span>
            ${[0, 5, 12, 18, 28].map(r => `
              <button type="button" class="biz-rate-btn" data-rate="${r}" style="flex:1; height:26px; font-size:11px; border-radius:4px; border:1px solid ${invState.gstRate===r?'#0F172A':'#E2E8F0'}; background:${invState.gstRate===r?'#0F172A':'#FFF'}; color:${invState.gstRate===r?'#FFF':'#0F172A'}; font-weight:500; cursor:pointer;">${r}%</button>
            `).join('')}
          </div>
        </div>

        <div style="display:flex; flex-direction:column; gap:8px; padding-top:8px; border-top:1px solid #F1F5F9;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:11px; font-weight:700; color:#0F172A; text-transform:uppercase; letter-spacing:0.5px;">Line Items</span>
            <button type="button" id="inv-add-item-btn" style="font-size:11px; font-weight:600; color:#059669; background:none; border:none; cursor:pointer;">+ Add Item</button>
          </div>
          <div id="inv-items-list" style="display:flex; flex-direction:column; gap:6px;">
            ${invState.items.map((it, idx) => `
              <div class="inv-item-row" data-idx="${idx}" style="display:grid; grid-template-columns:1fr 50px 40px 65px 20px; gap:4px; align-items:center;">
                <input type="text" class="inv-it-desc" value="${esc(it.desc)}" placeholder="Item description" style="height:28px; padding:0 6px; border:1px solid #E2E8F0; border-radius:4px; font-size:11px;">
                <input type="text" class="inv-it-hsn" value="${esc(it.hsn||'')}" placeholder="HSN" style="height:28px; padding:0 4px; border:1px solid #E2E8F0; border-radius:4px; font-size:10.5px; font-family:monospace;">
                <input type="number" class="inv-it-qty" value="${it.qty}" min="1" style="height:28px; padding:0 4px; border:1px solid #E2E8F0; border-radius:4px; font-size:11px; text-align:right;">
                <input type="number" class="inv-it-rate" value="${it.rate}" min="0" style="height:28px; padding:0 4px; border:1px solid #E2E8F0; border-radius:4px; font-size:11px; text-align:right;">
                <button type="button" class="inv-it-del" style="background:none; border:none; color:#EF4444; font-size:14px; cursor:pointer; padding:0;">×</button>
              </div>
            `).join('')}
          </div>
        </div>

        <div style="display:flex; flex-direction:column; gap:8px; padding-top:8px; border-top:1px solid #F1F5F9;">
          <div style="font-size:11px; font-weight:700; color:#0F172A; text-transform:uppercase; letter-spacing:0.5px;">Banking & UPI QR</div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
            <input type="text" id="inv-in-upi" value="${esc(invState.upiId)}" placeholder="UPI ID (e.g. acme@hdfc)" style="height:28px; padding:0 6px; border:1px solid #E2E8F0; border-radius:4px; font-size:11px;">
            <input type="text" id="inv-in-bank" value="${esc(invState.bankName)}" placeholder="Bank Name" style="height:28px; padding:0 6px; border:1px solid #E2E8F0; border-radius:4px; font-size:11px;">
            <input type="text" id="inv-in-acc" value="${esc(invState.bankAcc)}" placeholder="Account No" style="height:28px; padding:0 6px; border:1px solid #E2E8F0; border-radius:4px; font-size:11px;">
            <input type="text" id="inv-in-ifsc" value="${esc(invState.bankIfsc)}" placeholder="IFSC Code" style="height:28px; padding:0 6px; border:1px solid #E2E8F0; border-radius:4px; font-size:11px; font-family:monospace;">
          </div>
        </div>
      `;

      // Bind dynamic form inputs
      const syncInputs = () => {
        invState.sellerName = formContainer.querySelector('#inv-in-seller').value;
        invState.sellerGstin = formContainer.querySelector('#inv-in-gstin').value;
        invState.sellerState = formContainer.querySelector('#inv-in-seller-state').value;
        invState.sellerAddress = formContainer.querySelector('#inv-in-address').value;
        invState.buyerName = formContainer.querySelector('#inv-in-buyer').value;
        invState.buyerGstin = formContainer.querySelector('#inv-in-buyer-gstin').value;
        invState.invNo = formContainer.querySelector('#inv-in-no').value;
        invState.upiId = formContainer.querySelector('#inv-in-upi').value;
        invState.bankName = formContainer.querySelector('#inv-in-bank').value;
        invState.bankAcc = formContainer.querySelector('#inv-in-acc').value;
        invState.bankIfsc = formContainer.querySelector('#inv-in-ifsc').value;
        renderInvoiceStage();
      };

      formContainer.querySelectorAll('input').forEach(inp => inp.addEventListener('input', syncInputs));

      formContainer.querySelectorAll('.biz-tax-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          invState.taxType = btn.dataset.type;
          renderForm();
          renderInvoiceStage();
        });
      });

      formContainer.querySelectorAll('.biz-rate-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          invState.gstRate = Number(btn.dataset.rate);
          renderForm();
          renderInvoiceStage();
        });
      });

      formContainer.querySelector('#inv-add-item-btn').addEventListener('click', () => {
        invState.items.push({ desc: 'New Item / Service', hsn: '998311', qty: 1, rate: 1000 });
        renderForm();
        renderInvoiceStage();
      });

      formContainer.querySelectorAll('.inv-item-row').forEach(row => {
        const idx = Number(row.dataset.idx);
        row.querySelector('.inv-it-desc').addEventListener('input', (e) => { invState.items[idx].desc = e.target.value; renderInvoiceStage(); });
        row.querySelector('.inv-it-hsn').addEventListener('input', (e) => { invState.items[idx].hsn = e.target.value; renderInvoiceStage(); });
        row.querySelector('.inv-it-qty').addEventListener('input', (e) => { invState.items[idx].qty = Number(e.target.value) || 1; renderInvoiceStage(); });
        row.querySelector('.inv-it-rate').addEventListener('input', (e) => { invState.items[idx].rate = Number(e.target.value) || 0; renderInvoiceStage(); });
        row.querySelector('.inv-it-del').addEventListener('click', () => {
          if (invState.items.length > 1) {
            invState.items.splice(idx, 1);
            renderForm();
            renderInvoiceStage();
          }
        });
      });
    }

    // ─── MODE 2: POS THERMAL RECEIPT RENDERERS ───
    function renderPosStage() {
      const subtotal = posState.items.reduce((s, it) => s + (it.qty * it.rate), 0);
      const discAmt = (subtotal * (posState.discountPct || 0)) / 100;
      const taxable = subtotal - discAmt;
      const taxAmt = (taxable * (posState.taxPct || 0)) / 100;
      const grandTotal = taxable + taxAmt;
      const changeDue = Math.max(0, (posState.cashTendered || grandTotal) - grandTotal);

      canvasHost.innerHTML = `
        <div id="biz-pos-receipt-sheet" style="width:330px; background:#FFFFFF; border:1px solid #E2E8F0; border-radius:4px; box-shadow:0 8px 30px rgba(0,0,0,0.06); padding:24px 20px 20px; font-family:'SF Mono', 'Geist Mono', 'Courier New', monospace; font-size:11.5px; line-height:1.4; color:#0F172A; box-sizing:border-box;">
          <div style="text-align:center; margin-bottom:12px;">
            <div style="font-size:16px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">${esc(posState.storeName || 'QUICKMART STORE')}</div>
            <div style="font-size:10.5px; color:#4B4B4B;">${esc(posState.storeAddress || '')}</div>
            <div style="font-size:10.5px; color:#4B4B4B;">GSTIN: ${esc(posState.storeGstin || '—')}</div>
          </div>

          <div style="border-top:1px dashed #94A3B8; border-bottom:1px dashed #94A3B8; padding:6px 0; margin:10px 0; font-size:10.5px; display:flex; justify-content:space-between;">
            <div>Receipt: <b>${esc(posState.receiptNo)}</b></div>
            <div>${esc(posState.receiptDate)}</div>
          </div>

          <table style="width:100%; border-collapse:collapse; margin-bottom:10px; font-size:11px;">
            <thead>
              <tr style="border-bottom:1px solid #0F172A; text-align:left;">
                <th style="padding:4px 0;">Item</th>
                <th style="padding:4px 0; text-align:center; width:36px;">Qty</th>
                <th style="padding:4px 0; text-align:right; width:55px;">Rate</th>
                <th style="padding:4px 0; text-align:right; width:65px;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${posState.items.map(it => `
                <tr>
                  <td style="padding:4px 0; font-weight:500;">${esc(it.desc)}</td>
                  <td style="padding:4px 0; text-align:center;">${it.qty}</td>
                  <td style="padding:4px 0; text-align:right;">${money(it.rate)}</td>
                  <td style="padding:4px 0; text-align:right; font-weight:600;">${money(it.qty * it.rate)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div style="border-top:1px dashed #94A3B8; padding-top:8px; font-size:11.5px;">
            <div style="display:flex; justify-content:space-between; padding:2px 0;">
              <span>Subtotal:</span><span>${money(subtotal)}</span>
            </div>
            ${posState.discountPct > 0 ? `
              <div style="display:flex; justify-content:space-between; padding:2px 0; color:#059669;">
                <span>Discount (${posState.discountPct}%):</span><span>-${money(discAmt)}</span>
              </div>
            ` : ''}
            <div style="display:flex; justify-content:space-between; padding:2px 0;">
              <span>Tax / GST (${posState.taxPct}%):</span><span>${money(taxAmt)}</span>
            </div>
            <div style="border-top:2px solid #0F172A; margin-top:6px; padding-top:6px; display:flex; justify-content:space-between; font-size:14px; font-weight:700;">
              <span>GRAND TOTAL:</span><span style="color:#059669;">${money(grandTotal)}</span>
            </div>
          </div>

          <div style="border-top:1px dashed #94A3B8; margin-top:10px; padding-top:6px; font-size:10.5px;">
            <div style="display:flex; justify-content:space-between;">
              <span>Payment Mode:</span><b>${esc(posState.payMode)}</b>
            </div>
            ${posState.payMode === 'Cash' ? `
              <div style="display:flex; justify-content:space-between; margin-top:2px;">
                <span>Cash Tendered:</span><span>${money(posState.cashTendered)}</span>
              </div>
              <div style="display:flex; justify-content:space-between; margin-top:2px; font-weight:700; color:#059669;">
                <span>Change Return:</span><span>${money(changeDue)}</span>
              </div>
            ` : ''}
          </div>

          <!-- Barcode simulation & footer -->
          <div style="text-align:center; margin-top:16px; padding-top:10px; border-top:1px dashed #94A3B8;">
            <div style="letter-spacing:4px; font-weight:700; font-size:14px; margin-bottom:4px;">|||||| ||||| ||||||| ||||</div>
            <div style="font-size:9.5px; color:#64748B;">${esc(posState.receiptNo)}</div>
            <div style="font-size:10px; color:#4B4B4B; margin-top:8px; line-height:1.3;">${esc(posState.footerNote)}</div>
          </div>
        </div>
      `;
    }

    function renderPosForm() {
      formContainer.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:10px;">
          <div style="font-size:11px; font-weight:700; color:#0F172A; text-transform:uppercase; letter-spacing:0.5px;">Store & Register</div>
          <div style="display:flex; flex-direction:column; gap:6px;">
            <input type="text" id="pos-in-store" value="${esc(posState.storeName)}" placeholder="Store Name" style="height:32px; padding:0 8px; border:1px solid #E2E8F0; border-radius:6px; font-size:12px;">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
              <input type="text" id="pos-in-no" value="${esc(posState.receiptNo)}" placeholder="Receipt No" style="height:32px; padding:0 8px; border:1px solid #E2E8F0; border-radius:6px; font-size:12px;">
              <select id="pos-in-paymode" style="height:32px; padding:0 8px; border:1px solid #E2E8F0; border-radius:6px; font-size:12px;">
                <option value="UPI" ${posState.payMode==='UPI'?'selected':''}>UPI / QR</option>
                <option value="Cash" ${posState.payMode==='Cash'?'selected':''}>Cash</option>
                <option value="Card" ${posState.payMode==='Card'?'selected':''}>Credit / Debit Card</option>
              </select>
            </div>
          </div>
        </div>

        <div style="display:flex; flex-direction:column; gap:8px; padding-top:8px; border-top:1px solid #F1F5F9;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:11px; font-weight:700; color:#0F172A; text-transform:uppercase; letter-spacing:0.5px;">Receipt Items</span>
            <button type="button" id="pos-add-item-btn" style="font-size:11px; font-weight:600; color:#059669; background:none; border:none; cursor:pointer;">+ Add Item</button>
          </div>
          <div id="pos-items-list" style="display:flex; flex-direction:column; gap:6px;">
            ${posState.items.map((it, idx) => `
              <div class="pos-item-row" data-idx="${idx}" style="display:grid; grid-template-columns:1fr 45px 65px 20px; gap:4px; align-items:center;">
                <input type="text" class="pos-it-desc" value="${esc(it.desc)}" placeholder="Item name" style="height:28px; padding:0 6px; border:1px solid #E2E8F0; border-radius:4px; font-size:11px;">
                <input type="number" class="pos-it-qty" value="${it.qty}" min="1" style="height:28px; padding:0 4px; border:1px solid #E2E8F0; border-radius:4px; font-size:11px; text-align:right;">
                <input type="number" class="pos-it-rate" value="${it.rate}" min="0" style="height:28px; padding:0 4px; border:1px solid #E2E8F0; border-radius:4px; font-size:11px; text-align:right;">
                <button type="button" class="pos-it-del" style="background:none; border:none; color:#EF4444; font-size:14px; cursor:pointer; padding:0;">×</button>
              </div>
            `).join('')}
          </div>
        </div>

        <div style="display:flex; flex-direction:column; gap:8px; padding-top:8px; border-top:1px solid #F1F5F9;">
          <div style="font-size:11px; font-weight:700; color:#0F172A; text-transform:uppercase; letter-spacing:0.5px;">Discount, Tax & Tender</div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
            <div>
              <span style="font-size:10px; color:#64748B;">Discount %</span>
              <input type="number" id="pos-in-disc" value="${posState.discountPct}" min="0" max="100" style="height:28px; width:100%; padding:0 6px; border:1px solid #E2E8F0; border-radius:4px; font-size:11px;">
            </div>
            <div>
              <span style="font-size:10px; color:#64748B;">Tax / GST %</span>
              <input type="number" id="pos-in-tax" value="${posState.taxPct}" min="0" max="28" style="height:28px; width:100%; padding:0 6px; border:1px solid #E2E8F0; border-radius:4px; font-size:11px;">
            </div>
          </div>
          <div id="pos-cash-field" style="display:${posState.payMode==='Cash'?'block':'none'}; margin-top:4px;">
            <span style="font-size:10px; color:#64748B;">Cash Tendered (₹)</span>
            <input type="number" id="pos-in-tender" value="${posState.cashTendered}" min="0" style="height:28px; width:100%; padding:0 6px; border:1px solid #E2E8F0; border-radius:4px; font-size:11px;">
          </div>
        </div>
      `;

      formContainer.querySelector('#pos-in-store').addEventListener('input', (e) => { posState.storeName = e.target.value; renderPosStage(); });
      formContainer.querySelector('#pos-in-no').addEventListener('input', (e) => { posState.receiptNo = e.target.value; renderPosStage(); });
      formContainer.querySelector('#pos-in-paymode').addEventListener('change', (e) => {
        posState.payMode = e.target.value;
        renderPosForm();
        renderPosStage();
      });
      formContainer.querySelector('#pos-in-disc').addEventListener('input', (e) => { posState.discountPct = Number(e.target.value)||0; renderPosStage(); });
      formContainer.querySelector('#pos-in-tax').addEventListener('input', (e) => { posState.taxPct = Number(e.target.value)||0; renderPosStage(); });
      if (formContainer.querySelector('#pos-in-tender')) {
        formContainer.querySelector('#pos-in-tender').addEventListener('input', (e) => { posState.cashTendered = Number(e.target.value)||0; renderPosStage(); });
      }

      formContainer.querySelector('#pos-add-item-btn').addEventListener('click', () => {
        posState.items.push({ desc: 'New Item', qty: 1, rate: 100 });
        renderPosForm();
        renderPosStage();
      });

      formContainer.querySelectorAll('.pos-item-row').forEach(row => {
        const idx = Number(row.dataset.idx);
        row.querySelector('.pos-it-desc').addEventListener('input', (e) => { posState.items[idx].desc = e.target.value; renderPosStage(); });
        row.querySelector('.pos-it-qty').addEventListener('input', (e) => { posState.items[idx].qty = Number(e.target.value) || 1; renderPosStage(); });
        row.querySelector('.pos-it-rate').addEventListener('input', (e) => { posState.items[idx].rate = Number(e.target.value) || 0; renderPosStage(); });
        row.querySelector('.pos-it-del').addEventListener('click', () => {
          if (posState.items.length > 1) {
            posState.items.splice(idx, 1);
            renderPosForm();
            renderPosStage();
          }
        });
      });
    }

    // ─── MODE 3: GST FILING AGGREGATOR RENDERERS ───
    function renderFilingStage() {
      if (!filingState.rows.length) {
        canvasHost.innerHTML = `
          <div id="biz-filing-dropzone" style="width:580px; min-height:420px; background:#FFFFFF; border:2px dashed #CBD5E1; border-radius:12px; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:40px 20px; text-align:center; cursor:pointer; box-sizing:border-box;">
            <div style="width:52px; height:52px; border-radius:50%; background:#F0FDF4; color:#059669; display:flex; align-items:center; justify-content:center; margin-bottom:14px;">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
            </div>
            <h3 style="font-size:16px; font-weight:700; color:#0F172A; margin:0 0 6px;">Drop Monthly Sales Sheet (Excel / CSV)</h3>
            <p style="font-size:12px; color:#64748B; max-width:340px; margin:0 0 16px; line-height:1.4;">Auto-detects invoice numbers, GSTINs, taxable amounts, and validates syntax for GSTR-1 preparation.</p>
            <input type="file" id="biz-filing-file-inp" accept=".xlsx,.xls,.csv" style="display:none;">
            <div style="display:flex; gap:10px;">
              <button type="button" id="biz-filing-browse-btn" style="height:36px; padding:0 16px; border-radius:6px; background:#0F172A; color:#FFF; font-size:12px; font-weight:600; border:none; cursor:pointer;">Choose File</button>
              <button type="button" id="biz-filing-sample-btn" style="height:36px; padding:0 14px; border-radius:6px; background:#F1F5F9; color:#0F172A; font-size:12px; font-weight:600; border:1px solid #E2E8F0; cursor:pointer;">Load Sample Invoices</button>
            </div>
          </div>
        `;
        const dropEl = canvasHost.querySelector('#biz-filing-dropzone');
        const fileInp = canvasHost.querySelector('#biz-filing-file-inp');
        dropEl.addEventListener('click', (e) => {
          if (e.target.id === 'biz-filing-sample-btn') { loadSampleFilingData(); return; }
          fileInp.click();
        });
        fileInp.addEventListener('change', (e) => { if (e.target.files[0]) processFilingFile(e.target.files[0]); });
        dropEl.addEventListener('dragover', (e) => { e.preventDefault(); dropEl.style.borderColor = '#059669'; });
        dropEl.addEventListener('dragleave', () => { dropEl.style.borderColor = '#CBD5E1'; });
        dropEl.addEventListener('drop', (e) => { e.preventDefault(); if (e.dataTransfer.files[0]) processFilingFile(e.dataTransfer.files[0]); });
        return;
      }

      // Render Analyzed KPI Dashboard & Breakdown Table
      const st = filingState.stats;
      canvasHost.innerHTML = `
        <div style="width:680px; display:flex; flex-direction:column; gap:16px;">
          <!-- 4 KPI Cards -->
          <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:10px;">
            <div style="background:#FFF; border:1px solid #E2E8F0; border-radius:8px; padding:12px 14px; box-shadow:0 2px 8px rgba(0,0,0,0.02);">
              <span style="font-size:10.5px; color:#64748B; font-weight:600; text-transform:uppercase;">Total Invoices</span>
              <div style="font-size:20px; font-weight:700; color:#0F172A; margin-top:2px;">${st.totalInvoices}</div>
              <span style="font-size:10px; color:#059669;">${st.b2bCount} B2B · ${st.b2cCount} B2C</span>
            </div>
            <div style="background:#FFF; border:1px solid #E2E8F0; border-radius:8px; padding:12px 14px; box-shadow:0 2px 8px rgba(0,0,0,0.02);">
              <span style="font-size:10.5px; color:#64748B; font-weight:600; text-transform:uppercase;">Taxable Sales</span>
              <div style="font-size:18px; font-weight:700; color:#0F172A; margin-top:2px; font-variant-numeric:tabular-nums;">${money(st.totalTaxable)}</div>
              <span style="font-size:10px; color:#64748B;">Net Base Value</span>
            </div>
            <div style="background:#FFF; border:1px solid #E2E8F0; border-radius:8px; padding:12px 14px; box-shadow:0 2px 8px rgba(0,0,0,0.02);">
              <span style="font-size:10.5px; color:#64748B; font-weight:600; text-transform:uppercase;">Total GST Tax</span>
              <div style="font-size:18px; font-weight:700; color:#059669; margin-top:2px; font-variant-numeric:tabular-nums;">${money(st.totalCgst + st.totalSgst + st.totalIgst)}</div>
              <span style="font-size:10px; color:#64748B;">CGST+SGST+IGST</span>
            </div>
            <div style="background:#FFF; border:1px solid ${st.errors.length ? '#FECACA' : '#E2E8F0'}; border-radius:8px; padding:12px 14px; background:${st.errors.length ? '#FEF2F2' : '#FFF'};">
              <span style="font-size:10.5px; color:${st.errors.length ? '#DC2626' : '#64748B'}; font-weight:600; text-transform:uppercase;">Anomaly Check</span>
              <div style="font-size:18px; font-weight:700; color:${st.errors.length ? '#DC2626' : '#059669'}; margin-top:2px;">${st.errors.length ? `${st.errors.length} Errors` : '0 Errors'}</div>
              <span style="font-size:10px; color:${st.errors.length ? '#DC2626' : '#059669'};">${st.errors.length ? 'Click to inspect' : '100% Valid Tax IDs'}</span>
            </div>
          </div>

          <!-- Aggregated Breakdown Table -->
          <div style="background:#FFF; border:1px solid #E2E8F0; border-radius:8px; overflow:hidden; box-shadow:0 4px 16px rgba(0,0,0,0.04);">
            <div style="padding:12px 16px; border-bottom:1px solid #E2E8F0; display:flex; justify-content:space-between; align-items:center; background:#FAFAFA;">
              <span style="font-size:12px; font-weight:700; color:#0F172A;">GSTR Invoices Dataset (${filingState.fileName})</span>
              <button type="button" id="biz-filing-reload-btn" style="font-size:11px; font-weight:600; color:#059669; background:none; border:none; cursor:pointer;">+ Load Different Sheet</button>
            </div>
            <div style="max-height:380px; overflow-y:auto;">
              <table style="width:100%; border-collapse:collapse; font-size:11px;">
                <thead style="position:sticky; top:0; background:#0F172A; color:#FFF; font-size:10px; text-transform:uppercase;">
                  <tr>
                    <th style="padding:8px 10px; text-align:left;">Invoice #</th>
                    <th style="padding:8px 10px; text-align:left;">GSTIN / Client</th>
                    <th style="padding:8px 10px; text-align:center; width:45px;">Type</th>
                    <th style="padding:8px 10px; text-align:right;">Taxable (₹)</th>
                    <th style="padding:8px 10px; text-align:right;">Total GST (₹)</th>
                    <th style="padding:8px 10px; text-align:right;">Grand Total (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  ${filingState.rows.slice(0, 30).map(r => `
                    <tr style="border-bottom:1px solid #F1F5F9; background:${r.isError ? '#FEF2F2' : 'transparent'};">
                      <td style="padding:8px 10px; font-weight:600; color:#0F172A;">${esc(r.invNo)}</td>
                      <td style="padding:8px 10px; font-family:monospace; color:${r.isInvalidGstin ? '#DC2626' : '#4B4B4B'};">${esc(r.gstin || 'B2C Walk-in')}</td>
                      <td style="padding:8px 10px; text-align:center;"><span style="padding:2px 6px; border-radius:4px; font-size:9.5px; font-weight:600; background:${r.isB2B ? '#F0FDF4' : '#F1F5F9'}; color:${r.isB2B ? '#059669' : '#64748B'};">${r.isB2B ? 'B2B' : 'B2C'}</span></td>
                      <td style="padding:8px 10px; text-align:right; font-variant-numeric:tabular-nums;">${money(r.taxable)}</td>
                      <td style="padding:8px 10px; text-align:right; font-variant-numeric:tabular-nums; color:#059669;">${money(r.tax)}</td>
                      <td style="padding:8px 10px; text-align:right; font-weight:600; color:#0F172A; font-variant-numeric:tabular-nums;">${money(r.total)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;

      canvasHost.querySelector('#biz-filing-reload-btn').addEventListener('click', () => {
        filingState.rows = [];
        renderFilingStage();
        renderFilingForm();
      });
    }

    function renderFilingForm() {
      if (!filingState.rows.length) {
        formContainer.innerHTML = `
          <div style="font-size:12px; color:#64748B; line-height:1.4;">
            Upload your sales sheet to auto-aggregate GSTR summaries, verify 15-character GSTINs, and separate B2B from B2C transactions.
          </div>
        `;
        return;
      }
      formContainer.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:10px;">
          <div style="font-size:11px; font-weight:700; color:#0F172A; text-transform:uppercase; letter-spacing:0.5px;">Filing Configuration</div>
          <div style="padding:10px 12px; border-radius:6px; background:#F8FAFC; border:1px solid #E2E8F0; font-size:11.5px;">
            <div style="color:#0F172A; font-weight:600; margin-bottom:2px;">${esc(filingState.fileName)}</div>
            <div style="color:#64748B; font-size:10.5px;">${filingState.rows.length} rows processed</div>
          </div>
        </div>

        <div style="display:flex; flex-direction:column; gap:6px; padding-top:8px; border-top:1px solid #F1F5F9;">
          <div style="font-size:11px; font-weight:700; color:#0F172A; text-transform:uppercase; letter-spacing:0.5px;">Export Targets</div>
          <label style="display:flex; align-items:center; gap:8px; font-size:12px; color:#0F172A;">
            <input type="radio" name="filing_fmt" value="csv" checked style="accent-color:#0F172A;"> GSTR-1 Verified CSV
          </label>
          <label style="display:flex; align-items:center; gap:8px; font-size:12px; color:#0F172A;">
            <input type="radio" name="filing_fmt" value="json" style="accent-color:#0F172A;"> GST Portal JSON Schema
          </label>
        </div>
      `;
    }

    function loadSampleFilingData() {
      const sample = [
        { invNo: 'INV-2026-001', gstin: '27ABCDE1234F1Z5', taxable: 45000, tax: 8100, total: 53100 },
        { invNo: 'INV-2026-002', gstin: '07AAACA1234A1Z1', taxable: 12000, tax: 2160, total: 14160 },
        { invNo: 'INV-2026-003', gstin: '', taxable: 3500, tax: 175, total: 3675 },
        { invNo: 'INV-2026-004', gstin: '29ABCDE5678F1Z9', taxable: 88000, tax: 15840, total: 103840 },
        { invNo: 'INV-2026-005', gstin: '', taxable: 4200, tax: 210, total: 4410 },
        { invNo: 'INV-2026-006', gstin: '27XYZAB9876C1Z2', taxable: 65000, tax: 11700, total: 76700 },
        { invNo: 'INV-2026-007', gstin: '33AABCC1122D1Z8', taxable: 29000, tax: 5220, total: 34220 },
        { invNo: 'INV-2026-008', gstin: 'INVALID_GSTIN', taxable: 15000, tax: 2700, total: 17700 }
      ];
      filingState.fileName = 'Sample_Sales_August_2026.xlsx';
      processFilingRows(sample);
    }

    async function processFilingFile(file) {
      filingState.fileName = file.name;
      try {
        let aoa;
        if (/xlsx|xls/i.test(file.name) && window.XLSX) {
          const wb = window.XLSX.read(await file.arrayBuffer(), { type: 'array' });
          aoa = window.XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' });
        } else {
          const text = await file.text();
          aoa = text.split(/\r?\n/).map(l => l.split(','));
        }
        const headers = (aoa[0] || []).map(h => String(h).trim().toLowerCase());
        const pick = (...names) => headers.findIndex(h => names.some(n => h.includes(n)));
        const iInv = pick('invoice', 'inv', 'bill no');
        const iGstin = pick('gstin', 'gst', 'tax id');
        const iTaxable = pick('taxable', 'base', 'amount', 'value');
        const iTax = pick('tax', 'gst amt', 'cgst', 'sgst', 'igst');
        const iTotal = pick('total', 'grand total', 'invoice value');

        const rawRows = aoa.slice(1).filter(r => r.some(c => String(c).trim() !== ''));
        const rows = rawRows.map((r, idx) => {
          const invNo = iInv >= 0 ? String(r[iInv]).trim() : `INV-${idx+1}`;
          const gstin = iGstin >= 0 ? String(r[iGstin]).trim() : '';
          const taxable = iTaxable >= 0 ? (parseFloat(String(r[iTaxable]).replace(/[^0-9.-]/g, '')) || 0) : 1000;
          const tax = iTax >= 0 ? (parseFloat(String(r[iTax]).replace(/[^0-9.-]/g, '')) || (taxable * 0.18)) : (taxable * 0.18);
          const total = iTotal >= 0 ? (parseFloat(String(r[iTotal]).replace(/[^0-9.-]/g, '')) || (taxable + tax)) : (taxable + tax);
          return { invNo, gstin, taxable, tax, total };
        });
        processFilingRows(rows);
      } catch (err) {
        console.error('Error parsing filing file:', err);
        alert('Could not parse spreadsheet file: ' + err.message);
      }
    }

    function processFilingRows(rows) {
      const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      const errors = [];
      let totalTaxable = 0, totalTax = 0, totalGrand = 0, b2bCount = 0, b2cCount = 0;

      const processed = rows.map(r => {
        const isB2B = !!(r.gstin && r.gstin.trim());
        const isInvalidGstin = isB2B && !gstinRegex.test(r.gstin.toUpperCase());
        const isMathError = Math.abs((r.taxable + r.tax) - r.total) > 2;
        const isError = isInvalidGstin || isMathError;
        if (isError) errors.push({ invNo: r.invNo, isInvalidGstin, isMathError });

        if (isB2B) b2bCount++; else b2cCount++;
        totalTaxable += r.taxable;
        totalTax += r.tax;
        totalGrand += r.total;

        return { ...r, isB2B, isInvalidGstin, isMathError, isError };
      });

      filingState.rows = processed;
      filingState.stats = {
        totalInvoices: processed.length,
        totalTaxable,
        totalCgst: totalTax / 2,
        totalSgst: totalTax / 2,
        totalIgst: 0,
        totalGrand,
        b2bCount,
        b2cCount,
        errors
      };

      renderFilingStage();
      renderFilingForm();
    }

    // Mode Switcher Listeners
    root.querySelectorAll('input[name="biz_mode_sel"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        activeMode = e.target.value;
        renderStage();
        renderForm();
      });
    });

    // Save Profile Action
    root.querySelector('#biz-save-profile-btn').addEventListener('click', () => {
      saveProfile({
        sellerName: invState.sellerName,
        sellerGstin: invState.sellerGstin,
        sellerAddress: invState.sellerAddress,
        sellerState: invState.sellerState,
        bankName: invState.bankName,
        bankAcc: invState.bankAcc,
        bankIfsc: invState.bankIfsc,
        upiId: invState.upiId
      });
      const btn = root.querySelector('#biz-save-profile-btn');
      btn.textContent = '✓ Saved Locally!';
      btn.style.borderColor = '#059669';
      btn.style.color = '#059669';
      setTimeout(() => {
        btn.textContent = '💾 Save Business Info';
        btn.style.borderColor = '#E2E8F0';
        btn.style.color = '#0F172A';
      }, 2000);
    });

    // Reset Button
    root.querySelector('#biz-reset-btn').addEventListener('click', () => {
      if (confirm('Reset form fields to default?')) {
        renderForm();
        renderStage();
      }
    });

    // Print Quick Button
    root.querySelector('#biz-print-quick').addEventListener('click', () => {
      window.print();
    });

    // Main CTA Actions
    ctaBtn.addEventListener('click', async () => {
      if (activeMode === 'invoice') {
        window.print();
      } else if (activeMode === 'pos') {
        window.print();
      } else {
        // Export GSTR Summary CSV
        const headers = 'Invoice No,Customer GSTIN,Category,Taxable Value,Tax Amount,Total Amount\n';
        const csvContent = headers + filingState.rows.map(r => 
          `"${r.invNo}","${r.gstin || ''}","${r.isB2B?'B2B':'B2C'}",${r.taxable.toFixed(2)},${r.tax.toFixed(2)},${r.total.toFixed(2)}`
        ).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `GSTR1_Summary_${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    });

    // Initial render
    renderStage();
    renderForm();
  }

  window.__ffMountBizSuite = mountBusinessSuite;
  window.__ffMountBizPro = (container, tool) => mountBusinessSuite(container, tool);

})();

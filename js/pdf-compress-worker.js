/* FileKit PDF compression worker.
 *
 * Offloads the CPU-bound stream surgery (pdf-lib + fflate) and embedded-image
 * re-encoding (OffscreenCanvas) off the main thread so large PDFs don't freeze
 * the tab.
 *
 * pdf.js cannot run inside a Web Worker (its "fake worker" setup requires
 * `document`), so per-page rasterization stays on the main thread. This worker
 * owns the vector path: FlateDecode re-compression, embedded JPEG/Flate image
 * surgery, metadata handling, and the structural rebuild candidate.
 *
 * Protocol
 *   main -> worker : { type:'optimize', bytes:ArrayBuffer,
 *                      meta:{name,size,type}, config:{ base, tier,
 *                      stripMetadata, pdfDpi, pdfQuality, customBytes } }
 *   worker -> main : { type:'progress', frac, text }
 *                    { type:'done', result:{...} }
 *                    { type:'error', message }
 */
'use strict';

let PDFLib = null;
let fflate = null;

function ensureLibs(base) {
  if (!PDFLib) {
    importScripts(base + 'vendor/pdf-lib.min.js');
    PDFLib = self.PDFLib;
  }
  if (!fflate) {
    importScripts(base + 'vendor/fflate.js');
    fflate = self.fflate;
  }
  if (!PDFLib || !fflate) throw new Error('Failed to load PDF libraries in worker');
}

function progress(frac, text) {
  self.postMessage({ type: 'progress', frac, text });
}

/* ── OffscreenCanvas helpers ─────────────────────────────────────────────── */
async function canvasToBytes(canvas, type, quality) {
  const blob = await canvas.convertToBlob({ type, quality });
  return new Uint8Array(await blob.arrayBuffer());
}

async function decodeImage(bytes, mime) {
  const blob = new Blob([bytes], { type: mime || 'image/jpeg' });
  return await createImageBitmap(blob, { imageOrientation: 'from-image' });
}

/* High-quality (multi-step progressive) downscale to avoid the aliasing/softness
   a single large canvas drawImage step produces. */
function resizeTo(src, sw, sh, tw, th) {
  tw = Math.max(1, Math.round(tw));
  th = Math.max(1, Math.round(th));
  if (tw === sw && th === sh) return src;
  let cur = src, cw = sw, ch = sh;
  while (cw / 2 > tw && ch / 2 > th) {
    const nw = Math.max(1, Math.round(cw / 2));
    const nh = Math.max(1, Math.round(ch / 2));
    const c = new OffscreenCanvas(nw, nh);
    const cx = c.getContext('2d');
    cx.imageSmoothingEnabled = true;
    cx.imageSmoothingQuality = 'high';
    cx.drawImage(cur, 0, 0, nw, nh);
    cur = c; cw = nw; ch = nh;
  }
  const out = new OffscreenCanvas(tw, th);
  const ox = out.getContext('2d');
  ox.imageSmoothingEnabled = true;
  ox.imageSmoothingQuality = 'high';
  ox.drawImage(cur, 0, 0, tw, th);
  return out;
}

/* Ported from the main-thread engine: one-pass raster analysis for the
   content-aware (line-art vs photographic) decision. */
function analyzePageRaster(ctx2d) {
  try {
    const W = ctx2d.canvas.width, H = ctx2d.canvas.height;
    if (!W || !H || W * H > 40e6) return null;
    const d = ctx2d.getImageData(0, 0, W, H).data;
    const n = W * H;
    const step = n > 6e6 ? 2 : 1;
    const hist = new Uint32Array(256);
    let color = 0, black = 0, white = 0, other = 0;
    for (let i = 0; i < n; i += step) {
      const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const mx = r > g ? (r > b ? r : b) : (g > b ? g : b);
      const mn = r < g ? (r < b ? r : b) : (g < b ? g : b);
      if (mx - mn > 26) { color++; continue; }
      hist[Math.min(255, Math.round(lum))]++;
    }
    const totS = n / step;
    let sum = 0;
    for (let k = 0; k < 256; k++) sum += k * hist[k];
    let sumB = 0, wB = 0, maxVar = -1, threshold = 128;
    for (let k = 0; k < 256; k++) {
      wB += hist[k];
      if (wB === 0) continue;
      const wF = totS - wB;
      if (wF === 0) break;
      sumB += k * hist[k];
      const mB = sumB / wB, mF = (sum - sumB) / wF;
      const v = wB * wF * (mB - mF) * (mB - mF);
      if (v > maxVar) { maxVar = v; threshold = k; }
    }
    const margin = Math.max(24, (255 - threshold) * 0.12);
    for (let i = 0; i < n; i += step) {
      const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const mx = r > g ? (r > b ? r : b) : (g > b ? g : b);
      const mn = r < g ? (r < b ? r : b) : (g < b ? g : b);
      if (mx - mn > 26) continue;
      if (lum < threshold - margin) black++;
      else if (lum > threshold + margin) white++;
      else other++;
    }
    const tot = black + white + other + color;
    return { colorRatio: color / tot, otherRatio: other / tot, blackRatio: black / tot, threshold };
  } catch (e) { return null; }
}

/* ── TrueType font subsetting (retain-gids) ──────────────────────────────
   Trims unused glyph outlines out of an embedded TrueType program while
   KEEPING every original glyph ID (holes are left for unused glyphs). Because
   GIDs stay stable, the PDF's /Widths, /CIDToGIDMap and /ToUnicode remain
   valid — searchable text and metrics are preserved and no encoding/width
   rewriting is required. Only glyf/loca/head change; cmap, hmtx, post, name,
   OS/2, GSUB/GPOS are left untouched.

   Returns { bytes, kept, total } on success, or null when it is not safe to
   subset (CFF/OpenType, collections, no Unicode cmap, nothing dropped, or any
   parse error). Callers MUST keep the original font when null is returned. */
let _needFontSubset = true;
function readU16(b, o) { return (b[o] << 8) | b[o + 1]; }
function readI16(b, o) { const v = readU16(b, o); return v & 0x8000 ? v - 0x10000 : v; }
function readU32(b, o) { return (((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0); }
function writeU16(b, o, v) { b[o] = (v >> 8) & 0xff; b[o + 1] = v & 0xff; }
function writeU32(b, o, v) { b[o] = (v >>> 24) & 0xff; b[o + 1] = (v >>> 16) & 0xff; b[o + 2] = (v >>> 8) & 0xff; b[o + 3] = v & 0xff; }

function tableChecksum(data) {
  let sum = 0;
  const n = data.length;
  for (let i = 0; i < n; i += 4) {
    const b0 = data[i], b1 = i + 1 < n ? data[i + 1] : 0, b2 = i + 2 < n ? data[i + 2] : 0, b3 = i + 3 < n ? data[i + 3] : 0;
    sum = (sum + (((b0 << 24) >>> 0) + (b1 << 16) + (b2 << 8) + b3)) >>> 0;
  }
  return sum >>> 0;
}

function buildSfnt(tableMap) {
  const tags = Object.keys(tableMap);
  const numTables = tags.length;
  let maxPow2 = 1; while (maxPow2 * 2 <= numTables) maxPow2 *= 2;
  const searchRange = maxPow2 * 16;
  const entrySelector = Math.log2(maxPow2);
  const rangeShift = numTables * 16 - searchRange;
  let offset = 12 + numTables * 16;
  const recs = [];
  for (const tag of tags) {
    const data = tableMap[tag];
    offset += (4 - (offset % 4)) % 4;
    recs.push({ tag, data, offset, length: data.length, checksum: tableChecksum(data) });
    offset += data.length;
  }
  const out = new Uint8Array(offset);
  writeU32(out, 0, 0x00010000);
  writeU16(out, 4, numTables);
  writeU16(out, 6, searchRange);
  writeU16(out, 8, entrySelector);
  writeU16(out, 10, rangeShift);
  let o = 12;
  for (const r of recs) {
    out[o] = r.tag.charCodeAt(0) & 0xff; out[o + 1] = r.tag.charCodeAt(1) & 0xff;
    out[o + 2] = r.tag.charCodeAt(2) & 0xff; out[o + 3] = r.tag.charCodeAt(3) & 0xff;
    writeU32(out, o + 4, r.checksum);
    writeU32(out, o + 8, r.offset);
    writeU32(out, o + 12, r.length);
    o += 16;
  }
  for (const r of recs) out.set(r.data, r.offset);
  const headRec = recs.find((r) => r.tag === 'head');
  if (headRec) {
    writeU32(out, headRec.offset + 8, 0);
    const adj = (0xB1B0AFBA - tableChecksum(out)) >>> 0;
    writeU32(out, headRec.offset + 8, adj);
  }
  return out;
}

function cmapFormat4(b, o) {
  const segCount = readU16(b, o + 6) / 2;
  const endO = o + 14, startO = endO + segCount * 2 + 2, deltaO = startO + segCount * 2, rangeO = deltaO + segCount * 2;
  return (cp) => {
    if (cp > 0xFFFF) return 0;
    for (let i = 0; i < segCount; i++) {
      if (cp <= readU16(b, endO + i * 2)) {
        const start = readU16(b, startO + i * 2);
        if (cp < start) return 0;
        const delta = readI16(b, deltaO + i * 2);
        const range = readU16(b, rangeO + i * 2);
        if (range === 0) return (cp + delta) & 0xFFFF;
        const gi = rangeO + i * 2 + range + (cp - start) * 2;
        const g = readU16(b, gi);
        return g === 0 ? 0 : (g + delta) & 0xFFFF;
      }
    }
    return 0;
  };
}
function cmapFormat12(b, o) {
  const nGroups = readU32(b, o + 12);
  return (cp) => {
    for (let i = 0; i < nGroups; i++) {
      const g = o + 16 + i * 12;
      const start = readU32(b, g), end = readU32(b, g + 4), startGid = readU32(b, g + 8);
      if (cp >= start && cp <= end) return startGid + (cp - start);
    }
    return 0;
  };
}
function cmapFormat0(b, o) {
  const table = new Uint8Array(256);
  for (let i = 0; i < 256; i++) table[i] = b[o + 6 + i];
  return (cp) => (cp < 256 ? table[cp] : 0);
}
function parseCmap(b, cmap) {
  const o = cmap.offset;
  const numTables = readU16(b, o + 2);
  let best = null;
  for (let i = 0; i < numTables; i++) {
    const rec = o + 4 + i * 8;
    const platform = readU16(b, rec), encoding = readU16(b, rec + 2), off = readU32(b, rec + 4);
    const sub = o + off;
    const format = readU16(b, sub);
    if (format !== 4 && format !== 12 && format !== 0) continue;
    // Unicode-only: (3,10) full, (3,1) BMP, (0,*) Unicode. Symbol (3,0) skipped.
    const score = (platform === 3 && encoding === 10) ? 5 : (platform === 3 && encoding === 1) ? 4 : (platform === 0) ? 3 : 0;
    if (score > 0 && (!best || score > best.score)) best = { sub, format, score };
  }
  if (!best) return null;
  if (best.format === 4) return cmapFormat4(b, best.sub);
  if (best.format === 12) return cmapFormat12(b, best.sub);
  return cmapFormat0(b, best.sub);
}

function subsetTrueType(bytes, usedChars) {
  try {
    if (!usedChars || !usedChars.length) return null;
    const sig = readU32(bytes, 0);
    if (sig === 0x4F54544F || sig === 0x74746366) return null; // OTTO (CFF) / ttcf
    if (sig !== 0x00010000 && sig !== 0x74727565) return null; // sfnt / 'true'
    const numTables = readU16(bytes, 4);
    const tables = {};
    for (let i = 0; i < numTables; i++) {
      const o = 12 + i * 16;
      const tag = String.fromCharCode(bytes[o], bytes[o + 1], bytes[o + 2], bytes[o + 3]);
      tables[tag] = { offset: readU32(bytes, o + 8), length: readU32(bytes, o + 12) };
    }
    if (!tables.head || !tables.maxp || !tables.loca || !tables.glyf || !tables.cmap) return null;
    const numGlyphs = readU16(bytes, tables.maxp.offset + 4);
    if (!numGlyphs || numGlyphs > 65535) return null;
    const gidFor = parseCmap(bytes, tables.cmap);
    if (!gidFor) return null;

    const used = new Set();
    used.add(0);
    let mapped = 0;
    for (const cp of usedChars) {
      const g = gidFor(cp);
      if (g > 0 && g < numGlyphs) { if (!used.has(g)) mapped++; used.add(g); }
    }
    if (mapped === 0) return null;
    // Coverage gate: a font the document actually renders with should map a
    // meaningful share of the used characters. Fonts that map only a tiny
    // sliver (e.g. CID fonts whose cmap doesn't represent usage) are skipped,
    // because subsetting them from the global set could drop rendered glyphs.
    if (mapped < Math.max(3, Math.ceil(usedChars.length * 0.25))) return null;

    const i2lf = readI16(bytes, tables.head.offset + 50);
    const loca = new Uint32Array(numGlyphs + 1);
    for (let i = 0; i <= numGlyphs; i++) {
      loca[i] = i2lf === 0 ? readU16(bytes, tables.loca.offset + i * 2) * 2 : readU32(bytes, tables.loca.offset + i * 4);
    }

    // Keep composite glyph components (and their components) so kept glyphs render.
    const queue = Array.from(used);
    while (queue.length) {
      const gid = queue.pop();
      const s = tables.glyf.offset + loca[gid], e = tables.glyf.offset + loca[gid + 1];
      if (e - s < 10 || readI16(bytes, s) >= 0) continue;
      let o = s + 10;
      while (o + 4 <= e) {
        const flags = readU16(bytes, o); const cg = readU16(bytes, o + 2); o += 4;
        o += (flags & 0x0001) ? 4 : 2;
        if (flags & 0x0008) o += 2; else if (flags & 0x0040) o += 4; else if (flags & 0x0080) o += 8;
        if (cg < numGlyphs && !used.has(cg)) { used.add(cg); queue.push(cg); }
        if (!(flags & 0x0020)) break;
      }
    }

    if (used.size >= numGlyphs * 0.95) return null; // nothing meaningful to drop

    let total = 0;
    const chunks = [];
    const newLoca = new Uint32Array(numGlyphs + 1);
    for (let gid = 0; gid < numGlyphs; gid++) {
      newLoca[gid] = total;
      if (used.has(gid)) {
        const s = tables.glyf.offset + loca[gid], e = tables.glyf.offset + loca[gid + 1];
        if (e > s) { chunks.push(bytes.subarray(s, e)); total += e - s; }
      }
      const pad = (4 - (total % 4)) % 4;
      if (pad) { chunks.push(new Uint8Array(pad)); total += pad; }
    }
    newLoca[numGlyphs] = total;

    const newGlyf = new Uint8Array(total);
    let p = 0;
    for (const c of chunks) { newGlyf.set(c, p); p += c.length; }

    const useShort = total <= 0x1FFFE;
    const newLocaBuf = new Uint8Array((numGlyphs + 1) * (useShort ? 2 : 4));
    for (let i = 0; i <= numGlyphs; i++) {
      if (useShort) writeU16(newLocaBuf, i * 2, newLoca[i] / 2);
      else writeU32(newLocaBuf, i * 4, newLoca[i]);
    }

    const newHead = bytes.slice(tables.head.offset, tables.head.offset + tables.head.length);
    writeU16(newHead, 50, useShort ? 0 : 1);
    writeU32(newHead, 8, 0);

    const tableMap = {};
    for (const tag of Object.keys(tables)) {
      tableMap[tag] = bytes.slice(tables[tag].offset, tables[tag].offset + tables[tag].length);
    }
    tableMap.head = newHead;
    tableMap.glyf = newGlyf;
    tableMap.loca = newLocaBuf;

    const out = buildSfnt(tableMap);
    if (out.length >= bytes.length) return null;
    return { bytes: out, kept: used.size, total: numGlyphs };
  } catch (e) {
    return null;
  }
}

/* Lists which of `usedChars` are mapped to a non-zero glyph by a font's
   Unicode cmap (used for the document-level subsetting safety gate). */
function cmapMappedUsed(bytes, usedChars) {
  const out = [];
  try {
    const sig = readU32(bytes, 0);
    if (sig !== 0x00010000 && sig !== 0x74727565) return out;
    const numTables = readU16(bytes, 4);
    let cmap = null, maxp = null;
    for (let i = 0; i < numTables; i++) {
      const o = 12 + i * 16;
      const tag = String.fromCharCode(bytes[o], bytes[o + 1], bytes[o + 2], bytes[o + 3]);
      if (tag === 'cmap') cmap = { offset: readU32(bytes, o + 8) };
      else if (tag === 'maxp') maxp = { offset: readU32(bytes, o + 8) };
    }
    if (!cmap || !maxp) return out;
    const numGlyphs = readU16(bytes, maxp.offset + 4);
    const gidFor = parseCmap(bytes, cmap);
    if (!gidFor) return out;
    for (const cp of usedChars) {
      const g = gidFor(cp);
      if (g > 0 && g < numGlyphs) out.push(cp);
    }
  } catch (e) {}
  return out;
}

/* Complex scripts (Indic, Arabic, Hebrew, Thai, Khmer, …) shape text into
   glyphs that don't correspond to the cmap glyphs of their Unicode characters,
   so they cannot be subset safely from a Unicode character set. */
function isComplexScript(cp) {
  return (cp >= 0x0590 && cp <= 0x05FF) || (cp >= 0x0600 && cp <= 0x077F) ||
    (cp >= 0x08A0 && cp <= 0x08FF) || (cp >= 0x0900 && cp <= 0x0DFF) ||
    (cp >= 0x0E00 && cp <= 0x0FFF) || (cp >= 0x1000 && cp <= 0x109F) ||
    (cp >= 0x1780 && cp <= 0x17FF) || (cp >= 0x1800 && cp <= 0x18AF) ||
    (cp >= 0xFB50 && cp <= 0xFDFF) || (cp >= 0xFE70 && cp <= 0xFEFF);
}

/* True when the font carries a GSUB table (shaping/ligatures), in which case
   dropping unused glyphs could break a substitution target. */
function hasGsubTable(bytes) {
  try {
    const sig = readU32(bytes, 0);
    if (sig !== 0x00010000 && sig !== 0x74727565) return false;
    const numTables = readU16(bytes, 4);
    for (let i = 0; i < numTables; i++) {
      const o = 12 + i * 16;
      if (bytes[o] === 0x47 && bytes[o + 1] === 0x53 && bytes[o + 2] === 0x55 && bytes[o + 3] === 0x42) return true; // 'GSUB'
    }
  } catch (e) {}
  return false;
}

/* Copy the original trailer Info dict + XMP stream into a freshly created
   document (rebuild candidate) so preserved metadata isn't dropped. */
function copyPreservedMetadata(srcDoc, dstDoc) {
  try {
    const src = srcDoc.getInfoDict();
    const dst = dstDoc.getInfoDict();
    for (const [k, v] of src.entries()) dst.set(k, v);
  } catch (e) {}
  try {
    if (srcDoc.context.trailerInfo && srcDoc.context.trailerInfo.ID) {
      dstDoc.context.trailerInfo.ID = srcDoc.context.trailerInfo.ID;
    }
  } catch (e) {}
  try {
    const ref = srcDoc.catalog.get(PDFLib.PDFName.of('Metadata'));
    if (!ref) return;
    let st = ref;
    if (ref instanceof PDFLib.PDFRef) st = srcDoc.context.lookup(ref);
    if (!st || !st.contents) return;
    const filter = st.dict.get(PDFLib.PDFName.of('Filter'))?.asString?.();
    let raw = st.contents;
    if (filter === '/FlateDecode') raw = fflate.unzlibSync(raw);
    else if (filter) return;
    const stream = dstDoc.context.flateStream(raw);
    dstDoc.catalog.set(PDFLib.PDFName.of('Metadata'), dstDoc.context.register(stream));
  } catch (e) {}
}

async function optimize(rawBuf, meta, config) {
  const fileSize = (meta && meta.size) || rawBuf.byteLength;
  const tier = config.tier || 'balanced';
  const customBytes = config.customBytes || 0;

  // AES-256 cannot be re-serialized by pdf-lib -> report for passthrough.
  let encryptedAes256 = false;
  try {
    const headLen = Math.min(rawBuf.byteLength, 8 * 1024 * 1024);
    const head = new TextDecoder('latin1').decode(new Uint8Array(rawBuf.slice(0, headLen)));
    if (/\/Encrypt\b/.test(head) && /\/Filter\s*\/Standard/.test(head)) {
      const rm = head.match(/\/R\s+(\d+)/);
      const vm = head.match(/\/V\s+(\d+)/);
      if ((rm && +rm[1] >= 5) || (vm && +vm[1] >= 5)) encryptedAes256 = true;
    }
  } catch (e) {}

  progress(0.05, 'Analyzing PDF structure & vector streams…');

  let surgeryDoc = null;
  try {
    surgeryDoc = await PDFLib.PDFDocument.load(new Uint8Array(rawBuf.slice(0)), { updateMetadata: false });
  } catch (e) {
    return { loaded: false, signed: false, hasFormFields: false, aes256: encryptedAes256, replaced: 0 };
  }

  const context = surgeryDoc.context;
  const indirectObjects = context.enumerateIndirectObjects();

  const isSigned = (() => {
    try {
      const cat = surgeryDoc.catalog;
      const acroForm = cat.get(PDFLib.PDFName.of('AcroForm'));
      if (acroForm && acroForm instanceof PDFLib.PDFDict) {
        const sigFlags = acroForm.get(PDFLib.PDFName.of('SigFlags'));
        if (sigFlags && sigFlags.asNumber && (sigFlags.asNumber() & 1)) return true;
      }
      for (const [, obj] of indirectObjects) {
        const dict = obj.dict || (obj instanceof PDFLib.PDFRawStream ? obj.dict : null);
        if (dict && dict.get(PDFLib.PDFName.of('Type'))?.asString?.() === '/Sig') return true;
      }
    } catch (e) {}
    return false;
  })();

  if (isSigned) {
    return { loaded: true, signed: true, hasFormFields: false, aes256: encryptedAes256, replaced: 0 };
  }

  let hasFormFields = false;
  try {
    const acroRaw = surgeryDoc.catalog.get(PDFLib.PDFName.of('AcroForm'));
    let acro = acroRaw;
    if (acroRaw instanceof PDFLib.PDFRef) acro = context.lookup(acroRaw);
    if (acro && acro instanceof PDFLib.PDFDict) {
      const f = acro.get(PDFLib.PDFName.of('Fields'));
      if (f instanceof PDFLib.PDFArray) hasFormFields = f.size() > 0;
      else if (f) hasFormFields = true;
    }
  } catch (e) {}

  // Container bloat (always); document metadata only when opted in.
  try {
    const cat = surgeryDoc.catalog;
    cat.delete(PDFLib.PDFName.of('PieceInfo'));
    cat.delete(PDFLib.PDFName.of('SpiderInfo'));
    for (const pg of surgeryDoc.getPages()) {
      pg.node.delete(PDFLib.PDFName.of('Thumb'));
      pg.node.delete(PDFLib.PDFName.of('PieceInfo'));
    }
  } catch (e) {}
  if (config.stripMetadata) {
    try { surgeryDoc.catalog.delete(PDFLib.PDFName.of('Metadata')); } catch (e) {}
  }

  let surgeryReplaced = 0;

  // ── Re-compress non-image FlateDecode streams at Deflate level 9 ──
  for (const [, obj] of indirectObjects) {
    const dict = obj.dict || (obj instanceof PDFLib.PDFRawStream ? obj.dict : null);
    if (!dict) continue;
    const subtype = dict.get(PDFLib.PDFName.of('Subtype'));
    if (subtype && subtype.asString && subtype.asString() === '/Image') continue;
    const filter = dict.get(PDFLib.PDFName.of('Filter'));
    if (filter && filter.asString && filter.asString() === '/FlateDecode' && obj.contents && obj.contents.length > 40) {
      try {
        const unzipped = fflate.unzlibSync(obj.contents);
        const recompressed = fflate.zlibSync(unzipped, { level: 9 });
        if (recompressed.length < obj.contents.length) {
          obj.contents = recompressed;
          dict.set(PDFLib.PDFName.of('Length'), PDFLib.PDFNumber.of(recompressed.length));
        }
      } catch (e) {}
    }
  }

  // ── Embedded image surgery ──
  const imageObjects = [];
  for (const [ref, obj] of indirectObjects) {
    const dict = obj.dict || (obj instanceof PDFLib.PDFRawStream ? obj.dict : null);
    if (!dict) continue;
    const subtype = dict.get(PDFLib.PDFName.of('Subtype'));
    if (subtype && subtype.asString && subtype.asString() === '/Image') imageObjects.push({ ref, obj, dict });
  }

  if (imageObjects.length > 0) {
    const tierDpi = config.pdfDpi || (tier === 'maximum' ? 150 : tier === 'light' ? 300 : 200);
    let pageMaxPt = 792;
    try {
      const pgs = surgeryDoc.getPages();
      if (pgs.length) {
        const mb = pgs[0].getMediaBox();
        pageMaxPt = Math.max(Math.abs(mb.width), Math.abs(mb.height)) || pageMaxPt;
      }
    } catch (e) {}
    const maxDim = Math.max(600, Math.min(5000, Math.round(pageMaxPt / 72 * tierDpi)));
    let targetQuality = config.pdfQuality || (tier === 'maximum' ? 0.62 : tier === 'light' ? 0.92 : 0.80);
    if (tier === 'custom' && customBytes > 0) {
      const r = fileSize > 0 ? (customBytes / fileSize) : 0.5;
      targetQuality = Math.max(0.30, Math.min(0.85, 0.75 * Math.pow(r, 0.5)));
    }

    for (let imgIdx = 0; imgIdx < imageObjects.length; imgIdx++) {
      const { obj, dict } = imageObjects[imgIdx];
      progress(0.12 + (imgIdx / imageObjects.length) * 0.45, `Optimizing embedded stream ${imgIdx + 1}/${imageObjects.length}…`);
      const filter = dict.get(PDFLib.PDFName.of('Filter'))?.asString?.();
      const hasSMask = dict.has(PDFLib.PDFName.of('SMask')) || dict.has(PDFLib.PDFName.of('Mask'));

      // Case 1: DCTDecode (JPEG)
      if (filter === '/DCTDecode' && obj.contents && obj.contents.length > 300 &&
          !dict.has(PDFLib.PDFName.of('Decode'))) {
        try {
          const img = await decodeImage(obj.contents, 'image/jpeg');
          const origW = img.width, origH = img.height;
          let finalW = origW, finalH = origH;
          // Never resize a JPEG with an alpha SMask (mask dims must match).
          if (!hasSMask && Math.max(origW, origH) > maxDim * 1.15) {
            const sc = maxDim / Math.max(origW, origH);
            finalW = Math.max(1, Math.round(origW * sc));
            finalH = Math.max(1, Math.round(origH * sc));
          }
          const cvs = (finalW !== origW || finalH !== origH)
            ? resizeTo(img, origW, origH, finalW, finalH)
            : (() => {
                const c = new OffscreenCanvas(origW, origH);
                const cx = c.getContext('2d');
                cx.imageSmoothingEnabled = true;
                cx.imageSmoothingQuality = 'high';
                cx.drawImage(img, 0, 0);
                return c;
              })();
          if (img.close) img.close();
          const newBytes = await canvasToBytes(cvs, 'image/jpeg', targetQuality);
          if (newBytes.length < obj.contents.length) {
            obj.contents = newBytes;
            dict.set(PDFLib.PDFName.of('Width'), PDFLib.PDFNumber.of(finalW));
            dict.set(PDFLib.PDFName.of('Height'), PDFLib.PDFNumber.of(finalH));
            dict.set(PDFLib.PDFName.of('Length'), PDFLib.PDFNumber.of(newBytes.length));
            surgeryReplaced++;
          }
        } catch (e) {}
      }
      // Case 2: FlateDecode (lossless raster)
      else if (filter === '/FlateDecode' && obj.contents && obj.contents.length > 800) {
        const losslessReflate = () => {
          try {
            const rec = fflate.zlibSync(fflate.unzlibSync(obj.contents), { level: 9 });
            if (rec.length < obj.contents.length) {
              obj.contents = rec;
              dict.set(PDFLib.PDFName.of('Length'), PDFLib.PDFNumber.of(rec.length));
              surgeryReplaced++;
            }
          } catch (e) {}
        };
        try {
          const unzipped = fflate.unzlibSync(obj.contents);
          const wVal = dict.get(PDFLib.PDFName.of('Width'))?.asNumber?.() || 0;
          const hVal = dict.get(PDFLib.PDFName.of('Height'))?.asNumber?.() || 0;
          const bpc = dict.get(PDFLib.PDFName.of('BitsPerComponent'))?.asNumber?.() || 8;

          let cs = dict.get(PDFLib.PDFName.of('ColorSpace'));
          if (cs instanceof PDFLib.PDFRef) { try { cs = context.lookup(cs); } catch (e) {} }
          let comps = 0;
          if (cs instanceof PDFLib.PDFName) {
            const n = cs.asString();
            if (n === '/DeviceGray' || n === '/CalGray' || n === '/G') comps = 1;
            else if (n === '/DeviceRGB' || n === '/CalRGB' || n === '/RGB') comps = 3;
          } else if (cs instanceof PDFLib.PDFArray) {
            const first = cs.get(0);
            if (first && first.asString && first.asString() === '/ICCBased') {
              let icc = cs.get(1);
              if (icc instanceof PDFLib.PDFRef) { try { icc = context.lookup(icc); } catch (e) {} }
              const n = icc && icc.dict ? (icc.dict.get(PDFLib.PDFName.of('N'))?.asNumber?.() || 0) : 0;
              if (n === 1 || n === 3) comps = n;
            }
          }
          const hasDecode = dict.has(PDFLib.PDFName.of('Decode'));
          let predictor = 0;
          try {
            let dp = dict.get(PDFLib.PDFName.of('DecodeParms'));
            if (dp instanceof PDFLib.PDFRef) dp = context.lookup(dp);
            if (dp && dp.get) {
              const pr = dp.get(PDFLib.PDFName.of('Predictor'));
              predictor = pr && pr.asNumber ? (pr.asNumber() || 0) : 0;
            } else if (dp && dp.asNumber) {
              predictor = dp.asNumber() || 0;
            }
          } catch (e) {}
          const canConvert = !hasSMask && !hasDecode && predictor <= 1 && bpc === 8 && comps > 0 &&
            wVal > 10 && hVal > 10 && unzipped.length >= wVal * hVal * comps;

          let contentIsPhoto = false;
          if (canConvert) {
            try {
              const probeW = Math.min(wVal, 512);
              const probeH = Math.max(1, Math.round(hVal * probeW / wVal));
              const probe = new OffscreenCanvas(probeW, probeH);
              const pctx = probe.getContext('2d');
              const pid = pctx.createImageData(probeW, probeH);
              const stepX = wVal / probeW, stepY = hVal / probeH;
              for (let y = 0; y < probeH; y++) {
                const sy = Math.min(hVal - 1, Math.floor(y * stepY));
                for (let x = 0; x < probeW; x++) {
                  const sx = Math.min(wVal - 1, Math.floor(x * stepX));
                  const si = sy * wVal + sx;
                  const j = (y * probeW + x) * 4;
                  if (comps === 3) {
                    const o = si * 3;
                    pid.data[j] = unzipped[o]; pid.data[j + 1] = unzipped[o + 1]; pid.data[j + 2] = unzipped[o + 2];
                  } else {
                    const g = unzipped[si];
                    pid.data[j] = g; pid.data[j + 1] = g; pid.data[j + 2] = g;
                  }
                  pid.data[j + 3] = 255;
                }
              }
              pctx.putImageData(pid, 0, 0);
              const a = analyzePageRaster(pctx);
              if (a) contentIsPhoto = a.colorRatio > 0.02 || a.otherRatio > 0.12;
            } catch (e) { contentIsPhoto = false; }
          }

          if (!canConvert || !contentIsPhoto) {
            losslessReflate();
          } else {
            const cvs = new OffscreenCanvas(wVal, hVal);
            const cCtx = cvs.getContext('2d');
            const imgData = cCtx.createImageData(wVal, hVal);
            const d = imgData.data;
            if (comps === 3) {
              for (let i = 0, j = 0; i < wVal * hVal * 3; i += 3, j += 4) {
                d[j] = unzipped[i]; d[j + 1] = unzipped[i + 1]; d[j + 2] = unzipped[i + 2]; d[j + 3] = 255;
              }
            } else {
              for (let i = 0, j = 0; i < wVal * hVal; i++, j += 4) {
                const g = unzipped[i]; d[j] = g; d[j + 1] = g; d[j + 2] = g; d[j + 3] = 255;
              }
            }
            cCtx.putImageData(imgData, 0, 0);

            let finalW = wVal, finalH = hVal;
            if (Math.max(wVal, hVal) > maxDim * 1.15) {
              const sc = maxDim / Math.max(wVal, hVal);
              finalW = Math.max(1, Math.round(wVal * sc));
              finalH = Math.max(1, Math.round(hVal * sc));
            }
            let outCanvas = cvs;
            if (finalW !== wVal || finalH !== hVal) {
              outCanvas = resizeTo(cvs, wVal, hVal, finalW, finalH);
            }
            const newBytes = await canvasToBytes(outCanvas, 'image/jpeg', targetQuality);
            if (newBytes.length < obj.contents.length) {
              obj.contents = newBytes;
              dict.set(PDFLib.PDFName.of('Filter'), PDFLib.PDFName.of('DCTDecode'));
              dict.set(PDFLib.PDFName.of('ColorSpace'), PDFLib.PDFName.of('DeviceRGB'));
              dict.set(PDFLib.PDFName.of('BitsPerComponent'), PDFLib.PDFNumber.of(8));
              dict.set(PDFLib.PDFName.of('Width'), PDFLib.PDFNumber.of(finalW));
              dict.set(PDFLib.PDFName.of('Height'), PDFLib.PDFNumber.of(finalH));
              dict.set(PDFLib.PDFName.of('Length'), PDFLib.PDFNumber.of(newBytes.length));
              dict.delete(PDFLib.PDFName.of('DecodeParms'));
              dict.delete(PDFLib.PDFName.of('Decode'));
              dict.delete(PDFLib.PDFName.of('SMask'));
              dict.delete(PDFLib.PDFName.of('Mask'));
              surgeryReplaced++;
            }
          }
        } catch (e) {}
      }
    }
  }

  // ── Font subsetting: trim embedded TrueType programs to used glyphs ──
  // retain-gids keeps glyph IDs stable, so /Widths, /CIDToGIDMap and /ToUnicode
  // stay valid. Skipped for form documents (field values aren't visible to page
  // text extraction) and whenever the used-character set is unavailable.
  let fontsSubset = 0, fontsKept = 0, fontBytesBefore = 0, fontBytesAfter = 0;
  const usedChars = Array.isArray(config.usedChars)
    ? config.usedChars.filter((cp) => cp >= 0x20 && cp !== 0x7f)
    : [];
  if (!hasFormFields && usedChars.length) {
    // Collect unique embedded TrueType font programs.
    const fontStreams = [];
    const doneFonts = new Set();
    for (const [, obj] of indirectObjects) {
      const dict = obj.dict || (obj instanceof PDFLib.PDFRawStream ? obj.dict : null);
      if (!dict) continue;
      if (dict.get(PDFLib.PDFName.of('Type'))?.asString?.() !== '/FontDescriptor') continue;
      const ffRef = dict.get(PDFLib.PDFName.of('FontFile2'));
      if (!ffRef) continue;
      let ff = ffRef;
      try { if (ffRef instanceof PDFLib.PDFRef) ff = context.lookup(ffRef); } catch (e) { continue; }
      if (!ff || !ff.contents || !ff.dict) continue;
      const key = (ffRef && ffRef.toString) ? ffRef.toString() : ('ff' + fontStreams.length);
      if (doneFonts.has(key)) continue;
      doneFonts.add(key);
      try {
        const filter = ff.dict.get(PDFLib.PDFName.of('Filter'))?.asString?.();
        let raw;
        if (!filter) raw = ff.contents;
        else if (filter === '/FlateDecode') raw = fflate.unzlibSync(ff.contents);
        else continue;
        fontStreams.push({ raw, ff });
      } catch (e) {}
    }

    // Document-level safety gate: subsetting is only attempted when (a) the
    // document uses no complex script (Indic/Arabic/etc., whose rendered glyphs
    // can't be derived from Unicode) and (b) every used character maps to a
    // glyph in at least one embedded font. Otherwise glyph selection would be
    // unsafe, so it is disabled for the whole document.
    let subsetSafe = false;
    if (fontStreams.length && !usedChars.some(isComplexScript)) {
      const union = new Set();
      for (const { raw } of fontStreams) {
        try { for (const cp of cmapMappedUsed(raw, usedChars)) union.add(cp); } catch (e) {}
      }
      subsetSafe = union.size >= usedChars.length;
    }

    if (subsetSafe) {
      for (const { raw, ff } of fontStreams) {
        try {
          const sub = subsetTrueType(raw, usedChars);
          if (!sub) continue;
          const deflated = fflate.zlibSync(sub.bytes, { level: 9 });
          if (deflated.length >= ff.contents.length) continue;
          fontBytesBefore += ff.contents.length;
          ff.contents = deflated;
          ff.dict.set(PDFLib.PDFName.of('Filter'), PDFLib.PDFName.of('FlateDecode'));
          ff.dict.delete(PDFLib.PDFName.of('DecodeParms'));
          ff.dict.set(PDFLib.PDFName.of('Length'), PDFLib.PDFNumber.of(deflated.length));
          ff.dict.set(PDFLib.PDFName.of('Length1'), PDFLib.PDFNumber.of(sub.bytes.length));
          fontBytesAfter += deflated.length;
          fontsSubset++;
          fontsKept += sub.kept;
        } catch (e) {}
      }
      if (fontsSubset) progress(0.65, `Subsetting embedded fonts (${fontsSubset})…`);
    }
  }

  if (config.stripMetadata) {
    surgeryDoc.setTitle('');
    surgeryDoc.setAuthor('');
    surgeryDoc.setSubject('');
    surgeryDoc.setKeywords([]);
    surgeryDoc.setProducer('FileKit SqueezeCore');
    surgeryDoc.setCreator('FileKit SqueezeCore');
    // Remove the trailer /ID — a random per-save identifier some tools treat as
    // a hidden fingerprint ("hidden identifiers").
    try { delete surgeryDoc.context.trailerInfo.ID; } catch (e) {}
  }

  progress(0.7, 'Serializing optimized streams…');
  const optimizedBytes = await surgeryDoc.save({ useObjectStreams: true });

  // Structural rebuild candidate (garbage-collects unreferenced objects).
  let rebuildBytes = null;
  try {
    const numPages = surgeryDoc.getPageCount();
    if (numPages >= 1 && numPages <= 160) {
      progress(0.85, 'Rebuilding document structure…');
      const sOut = await PDFLib.PDFDocument.create({ updateMetadata: false });
      const idxs = [];
      for (let i = 0; i < numPages; i++) idxs.push(i);
      const pages = await sOut.copyPages(surgeryDoc, idxs);
      for (const pg of pages) sOut.addPage(pg);
      if (!config.stripMetadata) copyPreservedMetadata(surgeryDoc, sOut);
      const rb = await sOut.save({ useObjectStreams: true });
      if (rb.length < fileSize) rebuildBytes = rb;
    }
  } catch (e) {}

  return {
    loaded: true,
    signed: false,
    hasFormFields,
    aes256: encryptedAes256,
    replaced: surgeryReplaced,
    fontsSubset, fontsKept, fontBytesBefore, fontBytesAfter,
    surgeryBytes: optimizedBytes,
    surgerySmaller: optimizedBytes.length < fileSize,
    rebuildBytes
  };
}

self.onmessage = async (e) => {
  const msg = e.data;
  if (!msg || msg.type !== 'optimize') return;
  try {
    ensureLibs((msg.config && msg.config.base) || '');
    const result = await optimize(msg.bytes, msg.meta, msg.config || {});
    const transfer = [];
    if (result.surgeryBytes && result.surgeryBytes.buffer) transfer.push(result.surgeryBytes.buffer);
    if (result.rebuildBytes && result.rebuildBytes.buffer) transfer.push(result.rebuildBytes.buffer);
    self.postMessage({ type: 'done', result }, transfer);
  } catch (err) {
    self.postMessage({ type: 'error', message: String((err && err.message) || err) });
  }
};

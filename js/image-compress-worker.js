/* FileKit image compression worker.
 *
 * Offloads the CPU-bound decode/downsample/encode work off the main thread so
 * large images don't freeze the tab. Uses OffscreenCanvas + createImageBitmap.
 * The main thread keeps the cheap responsibilities: SVG minification, animated
 * GIF detection, HEIC decoding, and the flat-art indexed-PNG attempt.
 *
 * Protocol
 *   main -> worker : { type:'optimize', bytes:ArrayBuffer,
 *                      config:{ ext, maxDim, qWebp, qJpeg, customBytes, srcMime, originalBytes,
 *                               avif, avifQuality, avifSpeed } }
 *   worker -> main : { type:'done', result:{ bytes:Uint8Array|null, mime, outExt } }
 *                    { type:'error', message }
 *
 * Output extensions are derived from the encoder's actual blob MIME, not only
 * the requested type.
 */
'use strict';

async function canvasToBytes(canvas, requestedType, quality) {
  const blob = await canvas.convertToBlob({ type: requestedType, quality });
  if (!blob) throw new Error('Canvas encoding failed.');
  return { bytes: new Uint8Array(await blob.arrayBuffer()), mime: blob.type || requestedType };
}

function extForImageMime(mime, fallbackExt) {
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/avif') return 'avif';
  return fallbackExt;
}

/* AVIF encoder (jsquash/libaom, Apache-2.0, vendored under vendor/avif/).
   Loaded lazily and only used on the maximum tier. Input is straight RGBA
   ImageData; output keeps the smaller of AVIF vs the JPEG/WebP candidate. */
const AVIF_DEFAULTS = {
  quality: 50, qualityAlpha: -1, denoiseLevel: 0,
  tileColsLog2: 0, tileRowsLog2: 0, speed: 6, subsample: 1,
  chromaDeltaQ: false, sharpness: 0, tune: 0,
  enableSharpYUV: false, bitDepth: 8, lossless: false
};
let avifModulePromise = null;
async function getAvifModule() {
  if (!avifModulePromise) {
    avifModulePromise = (async () => {
      const [factory, wasmRes] = await Promise.all([
        import('../vendor/avif/avif_enc.js'),
        fetch('../vendor/avif/avif_enc.wasm')
      ]);
      if (!wasmRes.ok) throw new Error('AVIF wasm unavailable');
      const wasmBinary = new Uint8Array(await wasmRes.arrayBuffer());
      return factory.default({ wasmBinary, noInitialRun: true });
    })();
  }
  const mod = await avifModulePromise;
  if (!mod || typeof mod.encode !== 'function') throw new Error('AVIF encoder unavailable');
  return mod;
}
async function encodeAvif(imageData, opts) {
  const mod = await getAvifModule();
  const out = mod.encode(
    new Uint8Array(imageData.data.buffer, imageData.data.byteOffset, imageData.data.byteLength),
    imageData.width,
    imageData.height,
    { ...AVIF_DEFAULTS, ...opts }
  );
  if (!out) throw new Error('AVIF encoding failed.');
  return new Uint8Array(out.buffer ? out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength) : out);
}

/* MozJPEG encoder (jsquash/mozjpeg, Apache-2.0, vendored under vendor/mozjpeg/).
   Produces progressive JPEGs; raced against the canvas baseline JPEG with the
   smaller result kept. Quality is passed through 1:1 (0-100). */
const MOZJPEG_DEFAULTS = {
  quality: 75, baseline: false, arithmetic: false, progressive: true,
  optimize_coding: true, smoothing: 0, color_space: 3, quant_table: 3,
  trellis_multipass: false, trellis_opt_zero: false, trellis_opt_table: false,
  trellis_loops: 1, auto_subsample: true, chroma_subsample: 2,
  separate_chroma_quality: false, chroma_quality: 75
};
let mozjpegModulePromise = null;
async function getMozjpegModule() {
  if (!mozjpegModulePromise) {
    mozjpegModulePromise = (async () => {
      const [factory, wasmRes] = await Promise.all([
        import('../vendor/mozjpeg/mozjpeg_enc.js'),
        fetch('../vendor/mozjpeg/mozjpeg_enc.wasm')
      ]);
      if (!wasmRes.ok) throw new Error('MozJPEG wasm unavailable');
      const wasmBinary = new Uint8Array(await wasmRes.arrayBuffer());
      return factory.default({ wasmBinary, noInitialRun: true });
    })();
  }
  const mod = await mozjpegModulePromise;
  if (!mod || typeof mod.encode !== 'function') throw new Error('MozJPEG encoder unavailable');
  return mod;
}
async function encodeMozjpeg(imageData, opts) {
  const mod = await getMozjpegModule();
  const out = mod.encode(imageData.data, imageData.width, imageData.height, { ...MOZJPEG_DEFAULTS, ...opts });
  if (!out) throw new Error('MozJPEG encoding failed.');
  return new Uint8Array(out.buffer ? out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength) : out);
}

/* Progressive multi-step downscale (avoids single-step aliasing/softness). */
function renderResampled(img, origW, origH, targetW, targetH, isJpeg) {
  let curW = origW, curH = origH, cur = img;
  while (curW / 2 > targetW && curH / 2 > targetH) {
    const nw = Math.max(1, Math.round(curW / 2));
    const nh = Math.max(1, Math.round(curH / 2));
    const c = new OffscreenCanvas(nw, nh);
    const cx = c.getContext('2d');
    cx.imageSmoothingEnabled = true;
    cx.imageSmoothingQuality = 'high';
    cx.drawImage(cur, 0, 0, nw, nh);
    cur = c; curW = nw; curH = nh;
  }
  const out = new OffscreenCanvas(Math.max(1, targetW), Math.max(1, targetH));
  const ox = out.getContext('2d');
  ox.imageSmoothingEnabled = true;
  ox.imageSmoothingQuality = 'high';
  if (isJpeg) { ox.fillStyle = '#FFFFFF'; ox.fillRect(0, 0, out.width, out.height); }
  ox.drawImage(cur, 0, 0, targetW, targetH);
  return out;
}

async function optimize(bytes, config) {
  const srcMime = config.srcMime || 'image/jpeg';
  const srcBlob = new Blob([bytes], { type: srcMime });
  const img = await createImageBitmap(srcBlob, { imageOrientation: 'from-image' });
  const origW = img.width, origH = img.height;
  const ext = config.ext;

  let outMime = 'image/webp', outExt = 'webp';
  if (ext === 'jpg' || ext === 'jpeg') { outMime = 'image/jpeg'; outExt = 'jpg'; }
  const isJpeg = outMime === 'image/jpeg';
  const targetQuality = isJpeg ? config.qJpeg : config.qWebp;

  const baselineSize = (Number.isFinite(config.originalBytes) && config.originalBytes > 0)
    ? config.originalBytes
    : bytes.length;

  let selectedMime = outMime;
  let selectedExt = outExt;
  const adoptEncodedFormat = (encoded) => {
    if (encoded && (encoded.mime === 'image/jpeg' || encoded.mime === 'image/png' || encoded.mime === 'image/webp')) {
      selectedMime = encoded.mime;
      selectedExt = extForImageMime(encoded.mime, selectedExt);
    }
  };

  let best = null;
  let avifError = null;
  if (config.customBytes > 0) {
    // Three-pass target allocator: an initial quality probe, a quality-only
    // adjustment based on the square root of the size ratio, then (only if
    // still over target) one proportional dimension reduction. It tries to
    // approach the target; an exact byte count is not guaranteed.
    let curW = Math.min(2560, origW);
    let curH = Math.round(origH * (curW / origW));
    let cvs = renderResampled(img, origW, origH, curW, curH, isJpeg);
    const q = isJpeg ? 0.72 : 0.75;
    const b1 = await canvasToBytes(cvs, outMime, q);
    adoptEncodedFormat(b1);
    if (b1.bytes.length <= config.customBytes && b1.bytes.length >= config.customBytes * 0.85) {
      best = b1;
    } else {
      const q2 = Math.min(0.92, Math.max(0.18, q * Math.sqrt(config.customBytes / b1.bytes.length)));
      const b2 = await canvasToBytes(cvs, selectedMime, q2);
      adoptEncodedFormat(b2);
      if (b2.bytes.length <= config.customBytes) {
        best = b2;
      } else {
        const dimRatio = Math.min(0.92, Math.sqrt(config.customBytes / b2.bytes.length));
        curW = Math.max(320, Math.round(curW * dimRatio));
        curH = Math.max(240, Math.round(curH * dimRatio));
        cvs = renderResampled(img, origW, origH, curW, curH, isJpeg);
        best = await canvasToBytes(cvs, selectedMime, Math.max(0.20, q2 * 0.9));
        adoptEncodedFormat(best);
      }
    }
  } else {
    let w = origW, h = origH;
    const md = config.maxDim;
    if (w > md || h > md) {
      if (w > h) { h = Math.round(h * md / w); w = md; }
      else { w = Math.round(w * md / h); h = md; }
    }
    const cvs = renderResampled(img, origW, origH, w, h, isJpeg);
    best = await canvasToBytes(cvs, outMime, targetQuality);
    adoptEncodedFormat(best);
    // Race MozJPEG progressive against the canvas baseline JPEG.
    if (selectedMime === 'image/jpeg') {
      try {
        const id = cvs.getContext('2d').getImageData(0, 0, cvs.width, cvs.height);
        const mq = Math.max(1, Math.min(100, Math.round(targetQuality * 100)));
        const mz = await encodeMozjpeg(id, { quality: mq, chroma_quality: mq });
        if (mz.length < best.bytes.length) best = { bytes: mz, mime: 'image/jpeg' };
      } catch (e) { /* keep the canvas JPEG */ }
    }
    // Maximum tier: race lossy AVIF against the JPEG/WebP candidate.
    if (config.avif) {
      try {
        const id = cvs.getContext('2d').getImageData(0, 0, cvs.width, cvs.height);
        const q = Number.isFinite(config.avifQuality) ? config.avifQuality : 42;
        const av = await encodeAvif(id, {
          quality: q,
          qualityAlpha: q,
          speed: Number.isFinite(config.avifSpeed) ? config.avifSpeed : 6
        });
        if (av.length < best.bytes.length) {
          best = { bytes: av, mime: 'image/avif' };
          selectedMime = 'image/avif';
          selectedExt = 'avif';
        }
      } catch (e) { avifError = String((e && e.message) || e); /* keep the JPEG/WebP candidate */ }
    }
  }

  if (img.close) img.close();

  // An output must be smaller than the user's original file to count as
  // compression, regardless of the requested output format.
  const keepOriginal = !best || best.bytes.length >= baselineSize;
  return {
    bytes: keepOriginal ? null : best.bytes,
    mime: keepOriginal ? srcMime : selectedMime,
    outExt: keepOriginal ? ext : selectedExt,
    avifError
  };
}

self.onmessage = async (e) => {
  const msg = e.data;
  if (!msg || msg.type !== 'optimize') return;
  try {
    const result = await optimize(msg.bytes, msg.config || {});
    const transfer = result.bytes && result.bytes.buffer ? [result.bytes.buffer] : [];
    self.postMessage({ type: 'done', result }, transfer);
  } catch (err) {
    self.postMessage({ type: 'error', message: String((err && err.message) || err) });
  }
};

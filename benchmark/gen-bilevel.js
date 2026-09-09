/* Generate a bilevel-heavy "contract scan" PDF (no text layer — pure raster,
 * as a scanner produces) to exercise the Phase-3 1-bit mono path:
 *   pages 1-2 : black ink on white paper  (should encode as 1-bit mono)
 *   pages 3-4 : grayscale "photo" scan     (should stay JPEG)
 * Writes benchmark/samples/_bilevel_fixture.pdf */
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new', args: ['--no-sandbox', '--disable-gpu'],
  });
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:8000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 1500));
  const b64 = await page.evaluate(async (contractOnly) => {
    await window.FF.util.loadScript('vendor/pdf-lib.min.js');
    const { PDFDocument } = window.PDFLib;
    const doc = await PDFDocument.create();
    const W = 2480, H = 3508;

    function contractPage(tag) {
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const g = c.getContext('2d');
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#000000';
      // solid black "text lines" (blocks) — typical scanned contract
      let y = 90;
      for (let r = 0; r < 46; r++) {
        const indent = (r % 3) * 40 + 60;
        const len = W - indent - 40 - ((r * 137) % 300);
        const th = 7 + (r % 3);
        g.fillRect(indent, y, Math.max(80, len), th);
        y += 26 + ((r * 7) % 8);
      }
      g.font = 'bold 30px monospace';
      for (let s = 0; s < 12; s++) g.fillText(`${tag}  SAMPLE CONTRACT PAGE  ${s + 1}`, 90, 90 + s * 130);
      return c;
    }

    function photoPage() {
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const g = c.getContext('2d');
      const im = g.createImageData(W, H);
      for (let i = 0; i < im.data.length; i += 4) {
        const v = 40 + Math.floor(Math.sin(i / 9000) * 60 + Math.random() * 90);
        im.data[i] = im.data[i + 1] = im.data[i + 2] = Math.max(0, Math.min(255, v));
        im.data[i + 3] = 255;
      }
      g.putImageData(im, 0, 0);
      g.fillStyle = '#111'; g.font = 'bold 34px serif';
      for (let r = 0; r < 18; r++) g.fillText('PHOTO DOC ' + r, 80, 100 + r * 90);
      return c;
    }

    async function attachPage(canvas) {
      const jpeg = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.95));
      const img = await doc.embedJpg(new Uint8Array(await jpeg.arrayBuffer()));
      const pg = doc.addPage([612, 792]);
      const ratio = Math.min(612 / img.width, 792 / img.height);
      const dw = Math.round(img.width * ratio), dh = Math.round(img.height * ratio);
      pg.drawImage(img, { x: (612 - dw) / 2, y: (792 - dh) / 2, width: dw, height: dh });
      canvas.width = 0; canvas.height = 0;
    }
    await attachPage(contractPage('A'));
    await attachPage(contractPage('B'));
    if (!contractOnly) { await attachPage(photoPage()); await attachPage(photoPage()); }
    else { await attachPage(contractPage('C')); await attachPage(contractPage('D')); }
    const bytes = await doc.save();
    const chunk = [];
    for (let i = 0; i < bytes.length; i += 0x8000) chunk.push(String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)));
    return btoa(chunk.join(''));
  }, !!process.env.CONTRACT_ONLY);
  const out = path.join(__dirname, 'samples', '_bilevel_fixture.pdf');
  fs.writeFileSync(out, Buffer.from(b64, 'base64'));
  console.log('wrote', out, fs.statSync(out).size, 'bytes');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });

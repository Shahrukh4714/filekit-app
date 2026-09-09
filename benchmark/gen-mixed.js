/* Generate a MIXED PDF (page 1 = vector text, page 2 = scanned-style JPEG raster)
 * to exercise the Phase-2 hybrid optimizer. Writes benchmark/samples/_mixed_fixture.pdf */
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
  const b64 = await page.evaluate(async () => {
    await window.FF.util.loadScript('vendor/pdf-lib.min.js');
    const { PDFDocument, StandardFonts, rgb } = window.PDFLib;
    const doc = await PDFDocument.create();
    const helv = await doc.embedFont(StandardFonts.Helvetica);
    // page 1: real text (several paragraphs)
    const p1 = doc.addPage([612, 792]);
    for (let i = 0; i < 14; i++) {
      p1.drawText(`Vector text paragraph line ${i + 1} — fully selectable document text.`, { x: 60, y: 720 - i * 40, size: 12, font: helv, color: rgb(0, 0, 0) });
    }
    // page 2: raster "scan" content (grey noise -> JPEG)
    const c = document.createElement('canvas'); c.width = 1400; c.height = 900;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 1400, 900);
    const im = ctx.createImageData(1400, 900);
    for (let i = 0; i < im.data.length; i += 4) {
      const g = 220 + Math.round(Math.random() * 28);
      im.data[i] = g; im.data[i + 1] = g; im.data[i + 2] = g; im.data[i + 3] = 255;
    }
    ctx.putImageData(im, 0, 0);
    // draw some "scan marks"
    ctx.fillStyle = '#111'; ctx.font = 'bold 28px serif';
    for (let r = 0; r < 30; r++) ctx.fillText('RECORD 00' + r, 60, 90 + r * 26);
    const jpeg = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.92));
    const img = await doc.embedJpg(new Uint8Array(await jpeg.arrayBuffer()));
    const p2 = doc.addPage([612, 792]);
    const ratio = Math.min(612 / img.width, 792 / img.height);
    const dw = Math.round(img.width * ratio), dh = Math.round(img.height * ratio);
    p2.drawImage(img, { x: (612 - dw) / 2, y: (792 - dh) / 2, width: dw, height: dh });
    const bytes = await doc.save();
    let s = '';
    const chunk = [];
    for (let i = 0; i < bytes.length; i += 0x8000) chunk.push(String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)));
    s = chunk.join('');
    return btoa(s);
  });
  const out = path.join(__dirname, 'samples', '_mixed_fixture.pdf');
  fs.writeFileSync(out, Buffer.from(b64, 'base64'));
  console.log('wrote', out, fs.statSync(out).size, 'bytes');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });

/* "Admit-card" fixture: white page + black text + a small RED seal stamp and a
 * small GRAYSCALE passport photo. Old Strong binarized such pages to B&W.
 * Writes benchmark/samples/_card_color_fixture.pdf */
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
    const { PDFDocument } = window.PDFLib;
    const doc = await PDFDocument.create();
    const W = 2480, H = 3508;

    function cardPage() {
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const g = c.getContext('2d');
      g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
      // black text
      g.fillStyle = '#111';
      g.font = 'bold 42px monospace';
      for (let r = 0; r < 26; r++) g.fillText(`ADMIT CARD LINE ${r} — name & roll number .....`, 120, 140 + r * 118);
      // small grayscale passport photo (~2.5% of page)
      const px = 1700, py = 200, pw = 380, ph = 470;
      const img = g.createImageData(pw, ph);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = 30 + Math.floor(Math.sin(i / 400) * 50 + Math.random() * 80);
        img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.max(0, Math.min(255, v));
        img.data[i + 3] = 255;
      }
      g.putImageData(img, px, py);
      // small RED seal stamp (~0.6% of page)
      g.strokeStyle = '#D32F2F'; g.fillStyle = '#D32F2F';
      g.lineWidth = 8;
      const sx = 2200, sy = 2600, sr = 200;
      g.beginPath(); g.arc(sx, sy, sr, 0, Math.PI * 2); g.fillStyle = 'rgba(211,47,47,0.85)'; g.fill();
      g.strokeStyle = '#B71C1C'; g.lineWidth = 10; g.beginPath(); g.arc(sx, sy, sr, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#fff'; g.font = 'bold 34px monospace';
      g.fillText('SEAL', sx - 52, sy + 12);
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
    await attachPage(cardPage());
    await attachPage(cardPage());
    const bytes = await doc.save();
    const chunk = [];
    for (let i = 0; i < bytes.length; i += 0x8000) chunk.push(String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)));
    return btoa(chunk.join(''));
  });
  const out = path.join(__dirname, 'samples', '_card_color_fixture.pdf');
  fs.writeFileSync(out, Buffer.from(b64, 'base64'));
  console.log('wrote', out, fs.statSync(out).size, 'bytes');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
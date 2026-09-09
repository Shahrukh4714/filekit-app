/* Noisy "real scan" fixture: black ink on a gray gradient background with
 * speckle noise + halftone-ish texture — the case the old fixed-threshold
 * mono detector rejected but Otsu should now binarize. Also includes one
 * pure-grayscale "photo" page (no color) to exercise the gray-8 codec.
 * Writes benchmark/samples/_noisy_fixture.pdf */
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

    function noisyContractPage(tag) {
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const g = c.getContext('2d');
      // gray gradient paper with speckle noise + faint halftone dots
      const im = g.createImageData(W, H);
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4;
          const base = 225 - (y / H) * 34;
          const noise = (Math.random() * 34) - 17;
          const dot = ((x * 7 + y * 11) % 17 === 0) ? 14 : 0; // halftone-ish
          const v = Math.max(0, Math.min(255, base + noise - dot));
          im.data[i] = im.data[i + 1] = im.data[i + 2] = v;
          im.data[i + 3] = 255;
        }
      }
      g.putImageData(im, 0, 0);
      g.fillStyle = '#111';
      g.font = 'bold 30px monospace';
      for (let r = 0; r < 40; r++) {
        g.fillText(`${tag} NOISY SCAN ROW ${r} — signature area ..........`, 60, 90 + r * 82);
      }
      g.strokeStyle = '#222'; g.lineWidth = 4;
      g.strokeRect(60, 60, W - 120, H - 120);
      return c;
    }

    function grayPhotoPage() {
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const g = c.getContext('2d');
      const im = g.createImageData(W, H);
      for (let i = 0; i < im.data.length; i += 4) {
        const v = 30 + Math.floor(Math.sin(i / 7000) * 55 + Math.random() * 110);
        im.data[i] = im.data[i + 1] = im.data[i + 2] = Math.max(0, Math.min(255, v));
        im.data[i + 3] = 255;
      }
      g.putImageData(im, 0, 0);
      g.fillStyle = '#222'; g.font = 'bold 40px serif';
      for (let r = 0; r < 22; r++) g.fillText('GRAY PHOTO DOC ' + r, 80, 110 + r * 150);
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
    await attachPage(noisyContractPage('A'));
    await attachPage(noisyContractPage('B'));
    await attachPage(grayPhotoPage());
    const bytes = await doc.save();
    const chunk = [];
    for (let i = 0; i < bytes.length; i += 0x8000) chunk.push(String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)));
    return btoa(chunk.join(''));
  });
  const out = path.join(__dirname, 'samples', '_noisy_fixture.pdf');
  fs.writeFileSync(out, Buffer.from(b64, 'base64'));
  console.log('wrote', out, fs.statSync(out).size, 'bytes');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
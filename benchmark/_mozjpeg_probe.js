const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new', args: ['--no-sandbox', '--disable-gpu']
  });
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('[PAGEERROR]', String(e && e.message || e).slice(0, 200)));
  const file = path.join(__dirname, '..', 'assets', 'showcase_puppy.jpg');
  for (const tier of ['balanced', 'maximum']) {
    await page.goto('http://127.0.0.1:8000/index.html#app/compress', { waitUntil: 'domcontentloaded', timeout: 40000 });
    await new Promise(r => setTimeout(r, 2000));
    const input = await page.$('#app-tool-stage input[type=file]');
    await input.uploadFile(file);
    await new Promise(r => setTimeout(r, 1500));
    await page.evaluate((t) => document.querySelector(`.cpdf-benchmark-card[data-tier="${t}"]`)?.click(), tier);
    await new Promise(r => setTimeout(r, 1500));
    const t0 = Date.now();
    await page.evaluate(() => document.querySelector('#comp-studio-run')?.click());
    let done = false;
    for (let i = 0; i < 150; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const t = await page.evaluate(() => document.getElementById('app-tool-stage')?.textContent || '');
      if (/Compression Complete|Already Optimized/i.test(t)) { done = true; break; }
      if (/failed/i.test(t)) break;
    }
    const out = await page.evaluate(async () => {
      const h = window._ffLastResult;
      if (!h || !h.blob) return null;
      const bytes = new Uint8Array(await h.blob.arrayBuffer());
      // detect progressive JPEG: look for SOF2 marker FFC2 before SOS
      let progressive = null;
      if (bytes[0] === 0xff && bytes[1] === 0xd8) {
        let off = 2, found = null;
        while (off + 4 <= bytes.length) {
          if (bytes[off] !== 0xff) break;
          const mk = bytes[off + 1]; off += 2;
          if (mk === 0xd9 || mk === 0xda) break;
          if (mk === 0x01 || (mk >= 0xd0 && mk <= 0xd7)) continue;
          if (off + 2 > bytes.length) break;
          const ln = (bytes[off] << 8) | bytes[off + 1];
          if (ln < 2 || off + ln > bytes.length) break;
          if (mk === 0xc2) found = 'progressive';
          else if (mk === 0xc0 && found === null) found = 'baseline';
          off += ln;
        }
        progressive = found;
      }
      let decodable = false;
      try {
        const bmp = await createImageBitmap(new Blob([bytes], { type: h.blob.type }));
        decodable = true; if (bmp.close) bmp.close();
      } catch (e) {}
      return { bytes: bytes.length, type: h.blob.type, progressive, decodable };
    });
    console.log(tier.padEnd(8), 'secs=' + ((Date.now() - t0) / 1000).toFixed(1), JSON.stringify(out), 'done=' + done);
  }
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(2); });

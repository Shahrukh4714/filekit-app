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
  const root = path.join(__dirname, '..');
  const cases = [
    ['assets/showcase_puppy.jpg', 'maximum'],
    ['sim_larger_space.png', 'maximum'],
    ['benchmark/samples/_a_cmyk.jpg', 'balanced'],
    ['benchmark/samples/_a_16bit.png', 'balanced'],
    ['benchmark/samples/_a_anim.webp', 'balanced'],
  ];
  for (const [rel, tier] of cases) {
    const file = path.join(root, rel);
    const orig = fs.statSync(file).size;
    await page.goto('http://127.0.0.1:8000/index.html#app/compress', { waitUntil: 'domcontentloaded', timeout: 40000 });
    await new Promise(r => setTimeout(r, 2000));
    const input = await page.$('#app-tool-stage input[type=file]');
    await input.uploadFile(file);
    await new Promise(r => setTimeout(r, 1500));
    await page.evaluate((t) => document.querySelector(`.cpdf-benchmark-card[data-tier="${t}"]`)?.click(), tier);
    await new Promise(r => setTimeout(r, 1500));
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
      let decodable = false, dw = 0, dh = 0;
      try {
        const bmp = await createImageBitmap(new Blob([bytes], { type: h.blob.type }));
        decodable = true; dw = bmp.width; dh = bmp.height;
        if (bmp.close) bmp.close();
      } catch (e) {}
      return { bytes: bytes.length, type: h.blob.type, decodable, dw, dh };
    });
    const verdict = out && out.bytes === orig ? 'PRESERVED' : 'CHANGED';
    console.log((rel + ' [' + tier + ']').padEnd(42), 'orig=' + orig, 'out=' + (out ? out.bytes : '?'),
      'type=' + (out ? out.type : '?'), 'decodable=' + (out ? out.decodable : '?'), '=> ' + verdict, 'done=' + done);
  }
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(2); });

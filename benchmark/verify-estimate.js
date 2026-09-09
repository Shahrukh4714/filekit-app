/* Live estimate vs actual verification (Phase 6). Usage:
 *   node benchmark/verify-estimate.js <pdf-or-image>   (server on :8000) */
const puppeteer = require('puppeteer-core');
const path = require('path');

(async () => {
  const f = process.argv[2] || path.join(__dirname, 'samples', '120  RULES OF GRAMMAR.pdf');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new', args: ['--no-sandbox', '--disable-gpu'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  page.on('pageerror', e => console.log('[PAGEERROR]', e.message.slice(0, 160)));
  await page.goto('http://127.0.0.1:8000/#app/compress', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 1800));
  const input = await page.$('#app-tool-stage input[type=file]');
  await input.uploadFile(path.resolve(f));
  await new Promise(r => setTimeout(r, 3500)); // allow analysis probe to finish

  const readEst = () => page.evaluate(() => {
    const size = document.querySelector('#comp-est-new-size')?.textContent || '';
    const pct = document.querySelector('#comp-est-pct')?.textContent || '';
    return { size, pct };
  });

  const results = {};
  for (const tier of ['light', 'balanced', 'maximum']) {
    await page.evaluate((t) => document.querySelector(`.cpdf-benchmark-card[data-tier="${t}"]`)?.click(), tier);
    await new Promise(r => setTimeout(r, 600));
    results[tier] = await readEst();
  }
  // balanced actual
  await page.evaluate(() => document.querySelector('.cpdf-benchmark-card[data-tier="balanced"]')?.click());
  await new Promise(r => setTimeout(r, 300));
  await page.evaluate(() => document.querySelector('#comp-studio-run')?.click());
  let done = false;
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 1000));
    done = await page.evaluate(() => /Compression Complete/i.test(document.getElementById('app-tool-stage')?.textContent || ''));
    if (done) break;
  }
  const actual = done ? await page.evaluate(() => (window._ffLastResult && window._ffLastResult.resultBytes) || null) : null;
  console.log(JSON.stringify({ file: path.basename(f), orig: (require('fs').statSync(f).size), estimates: results, actualBalancedBytes: actual }, null, 2));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
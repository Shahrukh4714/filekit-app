/* Custom target-size convergence check (gap #4). Usage:
 *   node benchmark/verify-custom.js <pdf> <targetKB>   (server on :8000) */
const puppeteer = require('puppeteer-core');
const path = require('path');

(async () => {
  const f = process.argv[2] || path.join(__dirname, 'samples', '_noisy_fixture.pdf');
  const targetKB = Number(process.argv[3] || 3000);
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
  await new Promise(r => setTimeout(r, 3000));
  // select custom tier + set KB target
  await page.evaluate(async (tgt) => {
    document.querySelector('.cpdf-benchmark-card[data-tier="custom"]')?.click();
    await new Promise(r => setTimeout(r, 400));
    const inp = document.querySelector('#cpdf-target-val-inp');
    if (inp) { inp.value = String(tgt); inp.dispatchEvent(new Event('input')); }
    const sel = document.querySelector('#cpdf-target-unit-sel');
    if (sel && sel.value !== 'KB') { sel.value = 'KB'; sel.dispatchEvent(new Event('change')); }
  }, targetKB);
  await new Promise(r => setTimeout(r, 500));
  await page.evaluate(() => document.querySelector('#comp-studio-run')?.click());
  let done = false;
  for (let i = 0; i < 180; i++) {
    await new Promise(r => setTimeout(r, 1000));
    done = await page.evaluate(() => /Compression Complete/i.test(document.getElementById('app-tool-stage')?.textContent || ''));
    if (done) break;
  }
  const actual = done ? await page.evaluate(() => (window._ffLastResult && window._ffLastResult.resultBytes) || null) : null;
  const target = targetKB * 1024;
  const pct = actual ? Math.round((actual / target - 1) * 100) : null;
  console.log(JSON.stringify({ file: path.basename(f), target, actual, overshootPct: pct, pass: actual != null && actual <= target * 1.02 && actual >= target * 0.85 }, null, 2));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
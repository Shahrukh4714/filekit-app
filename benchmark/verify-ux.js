/* UX copy verification: tier labels + honest result badge/note. */
const puppeteer = require('puppeteer-core');
const path = require('path');

(async () => {
  const files = [
    path.join(__dirname, 'samples', '120  RULES OF GRAMMAR.pdf'),
    path.join(__dirname, 'samples', 'jaati pdf.pdf'),
  ];
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new', args: ['--no-sandbox', '--disable-gpu'],
  });
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('[PAGEERROR]', e.message.slice(0, 160)));
  const out = [];
  for (const f of files) {
    await page.goto('http://127.0.0.1:8000/#app/compress', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 1800));
    const input = await page.$('#app-tool-stage input[type=file]');
    await input.uploadFile(f);
    await new Promise(r => setTimeout(r, 3000));
    const labels = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('.cpdf-benchmark-card-label')].map(e => e.textContent.trim());
      const sub = [...document.querySelectorAll('.cpdf-benchmark-card-sub')].map(e => e.textContent.trim());
      const dz = document.querySelector('.cpdf-dropzone .drop-sub-text')?.textContent.trim() || '';
      return { labels: cards, sub, dz };
    });
    await page.evaluate(() => document.querySelector('.cpdf-benchmark-card[data-tier="balanced"]')?.click());
    await new Promise(r => setTimeout(r, 300));
    await page.evaluate(() => document.querySelector('#comp-studio-run')?.click());
    let done = false;
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 1000));
      done = await page.evaluate(() => /Complete|Already Optimized/i.test(document.getElementById('app-tool-stage')?.textContent || ''));
      if (done) break;
    }
    const result = await page.evaluate(() => {
      const t = document.getElementById('app-tool-stage')?.textContent || '';
      return {
        title: /Already Optimized/.test(t) ? 'AlreadyOptimized' : (/Compression Complete/.test(t) ? 'Complete' : '?'),
        note: (t.match(/Text stays selectable[^·]*|Nothing to save[^·]*|Scanned pages converted[^·]*/i) || [''])[0].trim(),
        badge: (t.match(/Perceptually lossless|Already optimal|High fidelity|Standard fidelity|Lossless · fonts subset/gi) || [''])[0] || '',
      };
    });
    out.push({ file: path.basename(f), labels: labels.labels, subs: labels.sub, dropzone: labels.dz, result });
  }
  console.log(JSON.stringify(out, null, 2));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
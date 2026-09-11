const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--window-size=1400,900']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  const logs = [];
  page.on('console', m => logs.push(`[${m.type()}] ${m.text().slice(0, 180)}`));
  page.on('pageerror', e => logs.push(`[PAGEERROR] ${e.message}`));

  const file = 'C:\\Users\\shahr\\Downloads\\Filekit1\\scratch_multi.pdf';

  const formats = await page.evaluate(() => {
    // placeholder
    return [];
  });

  await page.goto('http://127.0.0.1:8000/#app/convert', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 1500));
  const input = await page.$('#app-tool-stage input[type=file]');
  await input.uploadFile(file);
  await new Promise(r => setTimeout(r, 2500));

  const fmtList = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('#app-tool-stage [data-format], #app-tool-stage .conv-format-opt, #app-tool-stage .fmt-opt').forEach(el => {
      out.push({ id: el.dataset.format || el.dataset.id || el.id, label: (el.textContent || '').trim().slice(0, 30) });
    });
    return out;
  });
  console.log('FORMATS:', JSON.stringify(fmtList));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });

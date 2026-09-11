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
  page.on('console', m => logs.push(`[${m.type()}] ${m.text().slice(0, 200)}`));
  page.on('pageerror', e => logs.push(`[PAGEERROR] ${e.message}`));

  const files = [
    'C:\\Users\\shahr\\Downloads\\Filekit1\\test_sample.pdf',
    'C:\\Users\\shahr\\Downloads\\Filekit1\\scratch_test1.pdf',
    'C:\\Users\\shahr\\Downloads\\Filekit1\\scratch_multi.pdf'
  ];

  await page.goto('http://127.0.0.1:8000/#app/convert', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 1000));

  async function tryConvert(filePath) {
    await page.goto('http://127.0.0.1:8000/#app/convert', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 1500));
    const input = await page.$('#app-tool-stage input[type=file]');
    if (!input) return { file: filePath, err: 'no input' };
    await input.uploadFile(filePath);
    await new Promise(r => setTimeout(r, 2500));
    const cfgText = await page.evaluate(() => (document.getElementById('app-tool-stage')?.textContent || '').replace(/\s+/g, ' ').slice(0, 200));
    const btn = await page.evaluate(() => {
      const b = document.querySelector('#app-tool-stage .conv-studio-btn-convert, #app-tool-stage #conv-run-btn, #app-tool-stage button[class*=convert]');
      if (b) { b.click(); return b.textContent.trim().slice(0, 50); }
      return null;
    });
    if (!btn) return { file: filePath, cfg: cfgText, err: 'no convert button' };
    let status = 'timeout-60s';
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const st = await page.evaluate(() => {
        const s = document.getElementById('app-tool-stage');
        const t = (s?.textContent || '');
        return {
          done: /Conversion Complete|Converted|complete/i.test(t),
          err: /Could not|failed|Failed|error/i.test(t.slice(0, 1500)),
          pct: (t.match(/(\d+)%/g) || []).slice(-1)[0] || null
        };
      });
      if (st.done) { status = 'done'; break; }
      if (st.err) { status = 'error: ' + st.err; break; }
    }
    return { file: filePath, cfg: cfgText, status, btn };
  }

  for (const f of files) {
    const r = await tryConvert(f);
    console.log(JSON.stringify(r));
  }
  console.log('LOGS:', logs.filter(l => !/404/.test(l)).join('\n'));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });

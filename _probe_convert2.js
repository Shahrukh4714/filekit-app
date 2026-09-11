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
  page.on('console', m => logs.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', e => logs.push(`[PAGEERROR] ${e.message}`));

  await page.goto('http://127.0.0.1:8000/#app/convert', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 1000));

  const fileInput = await page.$('#app-tool-stage input[type=file]');
  await fileInput.uploadFile('C:\\Users\\shahr\\Downloads\\Filekit1\\test_sample.pdf');
  await new Promise(r => setTimeout(r, 2000));

  // Click the Convert button (default DOCX)
  const clicked = await page.evaluate(() => {
    const btn = document.querySelector('#app-tool-stage .conv-studio-btn-convert, #app-tool-stage #conv-run-btn, #app-tool-stage button[class*=convert]');
    if (!btn) return 'NO BTN';
    btn.click();
    return btn.textContent.trim().slice(0, 80);
  });
  console.log('CLICKED:', clicked);
  await new Promise(r => setTimeout(r, 15000));

  const after = await page.evaluate(() => {
    const stage = document.getElementById('app-tool-stage');
    return {
      text: (stage?.textContent || '').replace(/\s+/g, ' ').slice(0, 500),
      hasDownload: !!document.querySelector('#app-tool-stage a[download], #app-tool-stage [class*=result], #app-tool-stage [class*=download]'),
      errShown: /Could not|failed|Failed|error/i.test(stage?.textContent || '')
    };
  });
  console.log('AFTER CONVERT:', JSON.stringify(after, null, 2));
  await page.screenshot({ path: 'C:\\Users\\shahr\\AppData\\Local\\Temp\\opencode\\convert_after.png' });
  console.log('LOGS:\n' + logs.join('\n'));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });

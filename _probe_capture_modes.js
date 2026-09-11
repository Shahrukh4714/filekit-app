const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 980, deviceScaleFactor: 1.5 });
  await page.goto('http://127.0.0.1:8000/#app/convert', { waitUntil: 'networkidle2', timeout: 40000 });
  await new Promise(r => setTimeout(r, 2000));
  const fi = await page.$('#app-tool-stage input[type=file]');
  await fi.uploadFile('C:\\Users\\shahr\\Downloads\\Filekit1\\test_sample.pdf');
  await new Promise(r => setTimeout(r, 4500));
  const stage = await page.$('#app-tool-stage');
  await stage.screenshot({ path: 'snap_docx_modes.png' });
  console.log('saved snap_docx_modes.png');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
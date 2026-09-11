const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--window-size=1400,900']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  await page.goto('http://127.0.0.1:8000/#app/convert', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 1500));
  const input = await page.$('#app-tool-stage input[type=file]');
  await input.uploadFile('C:\\Users\\shahr\\Downloads\\Filekit1\\scratch_multi.pdf');
  await new Promise(r => setTimeout(r, 2500));
  const html = await page.evaluate(() => {
    const s = document.getElementById('app-tool-stage');
    return s.innerHTML.slice(0, 20000);
  });
  console.log(html);
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });

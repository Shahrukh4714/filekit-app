/* Screenshot the watermark studio. */
const puppeteer = require('puppeteer-core');
const path = require('path');
const PDF = path.resolve('benchmark/samples/_mixed_fixture.pdf');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: 'new', args: ['--no-sandbox'], defaultViewport: { width: 1440, height: 980 } });
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:8123/#app/edit', { waitUntil: 'networkidle2', timeout: 45000 });
  await page.waitForSelector('#etxt-inp', { timeout: 15000 });
  (await page.$('#etxt-inp')).uploadFile(PDF);
  await page.waitForSelector('.etxt-shell', { timeout: 30000 });
  await sleep(2200);
  await page.click('#etxt-tb-watermark');
  await sleep(800);
  await page.screenshot({ path: 'audit_screenshots/edit/wm-studio.png' });
  console.log('saved wm-studio.png');
  await browser.close();
})().catch((e) => { console.error('FATAL', e); process.exit(1); });

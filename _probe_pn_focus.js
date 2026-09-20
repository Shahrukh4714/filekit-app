/* Focused: start/skip/scope scheme. */
const puppeteer = require('puppeteer-core');
const path = require('path');
const PDF = path.resolve('benchmark/samples/_mixed_fixture.pdf');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: 'new', args: ['--no-sandbox'], defaultViewport: { width: 1440, height: 980 } });
  const page = await browser.newPage();
  page.on('console', (m) => { if (m.type() === 'error') console.log('ERR', m.text().slice(0, 180)); });
  await page.goto('http://127.0.0.1:8123/#app/edit', { waitUntil: 'networkidle2', timeout: 45000 });
  await page.waitForSelector('#etxt-inp', { timeout: 15000 });
  (await page.$('#etxt-inp')).uploadFile(PDF);
  await page.waitForSelector('.etxt-shell', { timeout: 30000 });
  await sleep(2000);

  await page.click('#etxt-tb-pagenum'); await sleep(500);
  await page.select('#etxt-pn-format', '{n}');
  await page.$eval('#etxt-pn-start', (el) => { el.value = '5'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.$eval('#etxt-pn-skip', (el) => { el.value = '1'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.select('#etxt-pn-scope', 'even'); await sleep(300);
  const draft = await page.evaluate(() => ({
    start: document.getElementById('etxt-pn-start')?.value,
    skip: document.getElementById('etxt-pn-skip')?.value,
    scope: document.getElementById('etxt-pn-scope')?.value,
    sample: document.getElementById('etxt-pn-sample')?.textContent,
  }));
  console.log('draft:', JSON.stringify(draft));
  await page.click('#etxt-pn-apply'); await sleep(500);
  await page.click('#etxt-tb-pagenum'); await sleep(400);
  const rows = await page.$$eval('#etxt-pn-list .etxt-wm-listrow', (r) => r.map((x) => x.textContent.replace(/\s+/g, ' ').trim()));
  console.log('rows:', JSON.stringify(rows));
  await page.keyboard.press('Escape'); await sleep(300);
  await page.$eval('#etxt-finish', (el) => el.click());
  let ready = false;
  for (let i = 0; i < 60; i++) { ready = await page.evaluate(() => !!document.getElementById('org-main-dl-btn')); if (ready) break; await sleep(500); }
  const items = await page.evaluate(async () => {
    if (!window.pdfjsLib) await window.FF.util.loadScript('vendor/pdfjs.min.js');
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js';
    const buf = new Uint8Array(await window._ffLastResult.blob.arrayBuffer());
    const doc = await window.pdfjsLib.getDocument({ data: buf }).promise;
    const out = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const tc = await (await doc.getPage(i)).getTextContent();
      out.push(tc.items.filter((it) => it.str && it.str.trim()).map((it) => it.str));
    }
    return out;
  });
  console.log('export items:', JSON.stringify(items));
  await browser.close();
})().catch((e) => { console.error('FATAL', e); process.exit(1); });

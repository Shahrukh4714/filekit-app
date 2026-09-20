/* Fast watermark smoke test (~45s): studio -> apply -> export -> verify text. */
const puppeteer = require('puppeteer-core');
const path = require('path');
const PDF = path.resolve('benchmark/samples/_mixed_fixture.pdf');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new', args: ['--no-sandbox'], defaultViewport: { width: 1440, height: 980 },
  });
  try {
    const page = await browser.newPage();
    await page.goto('http://127.0.0.1:8123/#app/edit', { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('#etxt-inp', { timeout: 15000 });
    (await page.$('#etxt-inp')).uploadFile(PDF);
    await page.waitForSelector('.etxt-shell', { timeout: 25000 });
    await sleep(1500);

    await page.click('#etxt-tb-watermark');
    await sleep(500);
    const studio = await page.evaluate(() => ({
      panel: !!document.getElementById('etxt-wm-panel'),
      draft: !!document.querySelector('.etxt-wm-item.is-draft'),
    }));
    await page.$eval('#etxt-wm-text', (el) => { el.value = 'SMOKE'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.click('#etxt-wm-apply');
    await sleep(400);
    await page.$eval('#etxt-finish', (el) => el.click());
    let ready = false;
    for (let i = 0; i < 40; i++) { ready = await page.evaluate(() => !!document.getElementById('org-main-dl-btn')); if (ready) break; await sleep(500); }
    const found = await page.evaluate(async () => {
      if (!window.pdfjsLib) await window.FF.util.loadScript('vendor/pdfjs.min.js');
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js';
      const buf = new Uint8Array(await window._ffLastResult.blob.arrayBuffer());
      const doc = await window.pdfjsLib.getDocument({ data: buf }).promise;
      const tc = await (await doc.getPage(1)).getTextContent();
      return tc.items.some((it) => /SMOKE/.test(it.str));
    });
    console.log(JSON.stringify({ studio, exportReady: ready, watermarkInPdf: found }));
    console.log(studio.panel && studio.draft && ready && found ? 'SMOKE PASS' : 'SMOKE FAIL');
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });

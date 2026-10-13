const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1024, height: 608 } });
  const page = await context.newPage();
  const testPdf = path.resolve('archive/tests/valid_sample.pdf');

  const toolsToTest = [
    { name: 'Rotate PDF', hash: '#app/pdf-rotate' },
    { name: 'Watermark PDF', hash: '#app/pdf-watermark' },
    { name: 'Page Numbers', hash: '#app/pdf-page-numbers' },
    { name: 'Crop PDF', hash: '#app/pdf-crop' },
    { name: 'Resize PDF', hash: '#app/pdf-resize' },
    { name: 'Redact PDF', hash: '#app/pdf-redact' },
    { name: 'Repair PDF', hash: '#app/pdf-repair' }
  ];

  for (const t of toolsToTest) {
    try {
      console.log(`Testing ${t.name} (${t.hash})...`);
      await page.goto(`http://localhost:8080/${t.hash}`, { waitUntil: 'domcontentloaded' });
      const inp = await page.waitForSelector('input[type="file"]', { state: 'attached', timeout: 5000 });
      if (inp) {
        await inp.setInputFiles(testPdf);
        await page.waitForTimeout(1500);

        const m = await page.evaluate(() => {
          const panel = document.querySelector('.cpdf-benchmark-panel, .scan-benchmark-panel');
          const inner = document.querySelector('.cpdf-benchmark-panel-inner');
          const card = document.querySelector('.scan-benchmark-card, .cpdf-benchmark-card');
          return {
            hasPanel: !!panel,
            panelWidth: panel ? Math.round(panel.getBoundingClientRect().width) : null,
            innerWidth: inner ? Math.round(inner.getBoundingClientRect().width) : null,
            cardWidth: card ? Math.round(card.getBoundingClientRect().width) : null
          };
        });
        console.log(`${t.name} Metrics:`, m);
        const shotName = t.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
        await page.screenshot({ path: path.resolve(`C:/Users/shahr/.gemini/antigravity/brain/80c805f2-df3c-45be-b8a4-c3bd90ba5692/audit_${shotName}.png`) });
      }
    } catch (err) {
      console.log(`Could not test ${t.name}:`, err.message);
    }
  }

  await browser.close();
})();

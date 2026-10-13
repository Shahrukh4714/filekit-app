const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1024, height: 608 } });
  const samplePdf = path.resolve('archive/tests/valid_sample.pdf');

  const tools = [
    { name: 'merge', id: '#mpdf-inp' },
    { name: 'split', id: '#spdf-inp' },
    { name: 'compress', id: '#cpdf-inp' }
  ];

  for (const t of tools) {
    console.log(`\n=== Checking #${t.name} ===`);
    await page.goto(`http://localhost:8080/#app/${t.name}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const inp = await page.locator(t.id);
    await inp.setInputFiles(samplePdf);
    await page.waitForTimeout(1500);

    const info = await page.evaluate(() => {
      const card = document.querySelector('.scan-benchmark-card.is-active');
      const radio = document.querySelector('.scan-benchmark-card.is-active .scan-benchmark-radio');
      const dot = document.querySelector('.scan-benchmark-card.is-active .scan-benchmark-radio-dot');
      if (!dot) return { error: 'No dot found' };
      const dotCs = window.getComputedStyle(dot);
      const radioCs = radio ? window.getComputedStyle(radio) : null;
      return {
        cardBorder: card ? window.getComputedStyle(card).borderColor : null,
        radioBorder: radioCs ? radioCs.borderColor : null,
        radioBackground: radioCs ? radioCs.backgroundColor : null,
        dotBackground: dotCs.backgroundColor,
        dotDisplay: dotCs.display,
        dotWidth: dotCs.width,
        dotHeight: dotCs.height
      };
    });
    console.log(`${t.name} computed:`, JSON.stringify(info, null, 2));
  }
  await browser.close();
})();

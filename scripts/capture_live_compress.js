const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 2600 } });
  
  try {
    await page.goto('http://localhost:8080/compress-pdf', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1500);

    const destPath = 'C:/Users/shahr/.gemini/antigravity/brain/48317dbb-5463-49bb-9623-8c54bbd7ae80/compress_pdf_live_smallpdf_parity.png';
    await page.screenshot({ path: destPath, fullPage: false });
    console.log('Saved live screenshot to:', destPath);

    // Also take a focused screenshot of just the editorial stories section
    const storiesElem = await page.$('.fk-seo-editorial-container, [aria-label*="Flexible PDF"]');
    // Scroll down to the editorial stories and take a screenshot
    await page.evaluate(() => {
      window.scrollTo(0, 750);
    });
    await page.waitForTimeout(500);
    const storiesDestPath = 'C:/Users/shahr/.gemini/antigravity/brain/48317dbb-5463-49bb-9623-8c54bbd7ae80/compress_pdf_stories_live.png';
    await page.screenshot({ path: storiesDestPath, fullPage: false });
    console.log('Saved stories screenshot to:', storiesDestPath);

  } catch(e) {
    console.error('Error taking screenshot:', e.message);
  } finally {
    await browser.close();
  }
})();

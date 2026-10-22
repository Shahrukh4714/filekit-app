const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 1800 } });
  const filePath = 'file:///' + path.resolve(__dirname, 'test_illustrations.html').replace(/\\/g, '/');
  await page.goto(filePath, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  
  const destPath = 'C:/Users/shahr/.gemini/antigravity/brain/48317dbb-5463-49bb-9623-8c54bbd7ae80/smallpdf_genre_illustrations_preview.png';
  await page.screenshot({ path: destPath, fullPage: true });
  console.log('Saved screenshot to:', destPath);
  await browser.close();
})();

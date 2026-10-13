const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/shahr/.gemini/antigravity/brain/80c805f2-df3c-45be-b8a4-c3bd90ba5692';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('Navigating to FileKit homepage...');
  await page.goto('http://localhost:8080/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Open tool via window.FF.app.openTool('image-upscale')
  console.log('Opening image-upscale via window.FF.app.openTool...');
  await page.evaluate(() => {
    if (window.FF && window.FF.app && window.FF.app.openTool) {
      window.FF.app.openTool('image-upscale');
    } else if (typeof window.openToolById === 'function') {
      window.openToolById('image-upscale');
    }
  });

  await page.waitForTimeout(2000);

  // Take screenshot of default portrait view
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'upscale_final_light.png') });
  console.log('Captured upscale_final_light.png');

  // Switch to Dark Theme
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'upscale_final_dark.png') });
  console.log('Captured upscale_final_dark.png');

  await browser.close();
  console.log('Verification finished successfully!');
})();

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const sampleImg = path.resolve('audit_screenshots/test_sample.png');
  const outDir = path.resolve('audit_screenshots/image_tools_ui');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const tools = [
    { id: 'image-resize', url: 'http://localhost:8080/#app/image-resize' },
    { id: 'image-crop', url: 'http://localhost:8080/#app/image-crop' },
    { id: 'image-rotate', url: 'http://localhost:8080/#app/image-rotate' },
    { id: 'image-watermark', url: 'http://localhost:8080/#app/image-watermark' },
    { id: 'image-blur', url: 'http://localhost:8080/#app/image-blur' },
    { id: 'resize-image-seo', url: 'http://localhost:8080/#resize-image' },
    { id: 'crop-image-seo', url: 'http://localhost:8080/#crop-image' },
    { id: 'rotate-image-seo', url: 'http://localhost:8080/#rotate-image' },
    { id: 'watermark-image-seo', url: 'http://localhost:8080/#watermark-image' }
  ];

  for (const t of tools) {
    console.log(`\nNavigating to ${t.url}...`);
    await page.goto(t.url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);

    const emptyShot = path.join(outDir, `${t.id}_empty.png`);
    await page.screenshot({ path: emptyShot });

    // Look for tool-specific file input inside the stage first
    let fileInput = await page.$('#app-tool-stage input[type="file"], .cpdf-dropzone input[type="file"], #tool-stage input[type="file"], #img-res-inp, #img-crop-inp, #img-rot-inp, #img-wm-inp');
    if (!fileInput) fileInput = await page.$('input[type="file"]');
    if (fileInput) {
      console.log(`  Uploading sample file for ${t.id}...`);
      await fileInput.setInputFiles(sampleImg);
      await page.waitForTimeout(2000);
      const activeShot = path.join(outDir, `${t.id}_active.png`);
      await page.screenshot({ path: activeShot });
    } else {
      console.log(`  No file input found for ${t.id}`);
    }
  }

  await browser.close();
  console.log('UI Inspection complete!');
})();

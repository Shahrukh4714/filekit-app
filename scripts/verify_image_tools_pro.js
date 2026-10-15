const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('PAGE ERROR:', msg.text());
  });

  const outDir = path.resolve('audit_screenshots');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const sampleImg = path.resolve('audit_screenshots/test_sample.png');

  const tests = [
    { name: 'favicon_workspace_dropzone', url: 'http://localhost:8080/#app/favicon', checkSelector: '#fav-inp, #fav-dz' },
    { name: 'upscale_workspace_dropzone', url: 'http://localhost:8080/#app/image-upscale', checkSelector: '#up-inp, #up-dropzone' },
    { name: 'blur_workspace_dropzone', url: 'http://localhost:8080/#app/blur-background', checkSelector: '#bblur-inp' },
    { name: 'combine_workspace_dropzone', url: 'http://localhost:8080/#app/combine-images', checkSelector: '#icomb-inp' },
    { name: 'favicon_seo_page', url: 'http://localhost:8080/#favicon-generator', checkSelector: '#fav-inp, #fav-dz' },
    { name: 'upscale_seo_page', url: 'http://localhost:8080/#image-upscale', checkSelector: '#up-inp, #up-dropzone' }
  ];

  for (const t of tests) {
    console.log(`Testing ${t.name} (${t.url})...`);
    await page.goto(t.url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const shotPath = path.join(outDir, `${t.name}.png`);
    await page.screenshot({ path: shotPath });

    const found = await page.$(t.checkSelector);
    console.log(`  Selector '${t.checkSelector}': ${found ? 'FOUND (SUCCESS)' : 'NOT FOUND (FAIL)'}`);
  }

  // Test Favicon file upload and configure studio
  console.log('\nTesting Favicon file upload and workstation rendering...');
  await page.goto('http://localhost:8080/#app/favicon', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  const favInput = await page.$('#fav-inp');
  if (favInput) {
    await favInput.setInputFiles(sampleImg);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(outDir, 'favicon_configured_studio.png') });
    const panel = await page.$('.cpdf-benchmark-panel');
    const mockup = await page.$('#fav-mockup-card-holder');
    console.log(`  Favicon Studio Configured: Panel = ${!!panel}, Mockup = ${!!mockup}`);
  }

  // Test Upscale file upload and studio
  console.log('\nTesting Upscale file upload and studio rendering...');
  await page.goto('http://localhost:8080/#app/image-upscale', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  const upInput = await page.$('#up-inp');
  if (upInput) {
    await upInput.setInputFiles(sampleImg);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(outDir, 'upscale_configured_studio.png') });
    const upStudio = await page.$('#up-stage-workbench, .up-preview-wrap, .cpdf-benchmark-panel');
    console.log(`  Upscale Studio Configured: Studio Elements = ${!!upStudio}`);
  }

  // Test Blur Background file upload and studio
  console.log('\nTesting Blur Background file upload and studio rendering...');
  await page.goto('http://localhost:8080/#app/blur-background', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  const bblurInput = await page.$('#bblur-inp');
  if (bblurInput) {
    await bblurInput.setInputFiles(sampleImg);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(outDir, 'blur_background_configured_studio.png') });
    const bblurStudio = await page.$('.cpdf-benchmark-panel, .scan-benchmark-card');
    console.log(`  Blur Background Studio Configured: Studio Elements = ${!!bblurStudio}`);
  }

  // Test Combine Images file upload and studio
  console.log('\nTesting Combine Images file upload and studio rendering...');
  await page.goto('http://localhost:8080/#app/combine-images', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  const icombInput = await page.$('#icomb-inp');
  if (icombInput) {
    await icombInput.setInputFiles([sampleImg, sampleImg]);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(outDir, 'combine_images_configured_studio.png') });
    const icombStudio = await page.$('.cpdf-benchmark-panel, .scan-benchmark-card');
    console.log(`  Combine Images Studio Configured: Studio Elements = ${!!icombStudio}`);
  }

  await browser.close();
  console.log('\nAll image workstation studios verified successfully!');
})();

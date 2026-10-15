const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  await page.goto('http://localhost:8080/#app', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  const toolIds = await page.evaluate(() => {
    return (window.FF?.registry?.all?.() || []).map(t => t.id);
  });

  console.log(`Found ${toolIds.length} tools registered in the runtime registry. Running full health audit...\n`);

  const errors = [];
  page.on('pageerror', err => {
    errors.push({ type: 'pageerror', message: err.message });
  });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push({ type: 'console.error', text: msg.text() });
    }
  });

  const results = [];

  for (let i = 0; i < toolIds.length; i++) {
    const id = toolIds[i];
    errors.length = 0;

    try {
      await page.goto(`http://localhost:8080/#app/${id}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(150);

      const check = await page.evaluate(() => {
        const stage = document.querySelector('.app-stage-container, #app-canvas, .tool-body, .cpdf-root, .org-shell, .spdf-shell');
        return {
          hasContent: stage && stage.children.length > 0,
          htmlLen: stage ? stage.innerHTML.length : 0
        };
      });

      if (errors.length > 0 || !check.hasContent) {
        console.log(`❌ Tool [${id}]: ${errors.length > 0 ? 'ERRORS' : 'EMPTY'}`);
        results.push({ id, status: 'FAIL', errors: [...errors], ...check });
      } else {
        results.push({ id, status: 'PASS' });
      }
    } catch (err) {
      console.log(`❌ Tool [${id}] CRASH:`, err.message);
      results.push({ id, status: 'CRASH', error: err.message });
    }
  }

  const failed = results.filter(r => r.status !== 'PASS');
  console.log('\n=============================================');
  console.log(`TOTAL AUDIT OF ALL ${toolIds.length} TOOLS: ${results.length - failed.length} PASSED, ${failed.length} FAILED`);
  console.log('=============================================\n');

  if (failed.length > 0) {
    console.log('Failed:', JSON.stringify(failed, null, 2));
  }

  await browser.close();
})();

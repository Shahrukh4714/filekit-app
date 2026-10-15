const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const registryRaw = fs.readFileSync(path.resolve('pdf_tools_registry.json'), 'utf8');
  const registry = JSON.parse(registryRaw);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  const errors = [];
  page.on('pageerror', err => {
    errors.push({ type: 'pageerror', message: err.message, stack: err.stack });
  });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push({ type: 'console.error', text: msg.text() });
    }
  });

  console.log(`Auditing all ${registry.length} registered tools for runtime errors...\n`);

  const results = [];

  for (let i = 0; i < registry.length; i++) {
    const tool = registry[i];
    const testUrl = `http://localhost:8080/#app/${tool.id}`;
    errors.length = 0; // reset errors

    try {
      await page.goto(testUrl, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(200);

      // Check if container rendered content
      const stateInfo = await page.evaluate(() => {
        const stage = document.querySelector('.app-stage-container, #app-canvas, .tool-body, .cpdf-root, .org-shell');
        const hasContent = stage && stage.children.length > 0;
        return {
          hasContent,
          htmlLength: stage ? stage.innerHTML.length : 0
        };
      });

      const hasErr = errors.length > 0;
      if (hasErr || !stateInfo.hasContent) {
        console.log(`❌ Tool [${tool.id}] (${tool.name}): ${hasErr ? 'ERRORS FOUND' : 'EMPTY STAGE'}`);
        if (hasErr) console.log('   Errors:', JSON.stringify(errors));
        results.push({ id: tool.id, name: tool.name, status: 'FAIL', errors: [...errors], ...stateInfo });
      } else {
        results.push({ id: tool.id, name: tool.name, status: 'PASS' });
      }
    } catch (e) {
      console.log(`❌ Tool [${tool.id}] (${tool.name}) crashed:`, e.message);
      results.push({ id: tool.id, name: tool.name, status: 'CRASH', error: e.message });
    }
  }

  const failed = results.filter(r => r.status !== 'PASS');
  console.log('\n=============================================');
  console.log(`AUDIT RESULTS: ${results.length - failed.length} PASSED, ${failed.length} FAILED`);
  console.log('=============================================\n');

  if (failed.length > 0) {
    console.log('Failed tools:', JSON.stringify(failed, null, 2));
  }

  await browser.close();
})();

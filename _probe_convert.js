const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--window-size=1400,900']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  const logs = [];
  page.on('console', m => logs.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', e => logs.push(`[PAGEERROR] ${e.message}`));
  page.on('requestfailed', r => logs.push(`[REQFAIL] ${r.url()} :: ${r.failure()?.errorText}`));

  await page.goto('http://127.0.0.1:8000/#app/convert', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 1500));

  const state = await page.evaluate(() => {
    const stage = document.getElementById('app-tool-stage');
    return {
      hash: location.hash,
      title: document.title,
      stageHTML: stage ? stage.innerHTML.slice(0, 300) : null,
      dropzone: !!document.querySelector('#conv-dz, .conv-dz, .ilovepdf-landing, .cpdf-dropzone'),
      bodyOverflow: document.body.style.overflow,
      topbarHidden: !!document.querySelector('.topbar')?.hidden,
      wtvHidden: document.getElementById('app-workspace-tool-view')?.hidden
    };
  });
  console.log('STATE:', JSON.stringify(state, null, 2));

  const dz = await page.$('#conv-dz, .conv-dz, .ilovepdf-landing, .cpdf-dropzone');
  if (dz) {
    const box = await dz.boundingBox();
    console.log('DZ BOX:', JSON.stringify(box));
    const fileInput = await page.$('#app-tool-stage input[type=file]');
    console.log('FILE INPUT PRESENT:', !!fileInput);
    if (fileInput) {
      await fileInput.uploadFile('C:\\Users\\shahr\\Downloads\\Filekit1\\test_sample.pdf');
      await new Promise(r => setTimeout(r, 4000));
      const after = await page.evaluate(() => {
        const stage = document.getElementById('app-tool-stage');
        return {
          hasError: /error|Error/.test(stage?.textContent?.slice(0, 2000) || ''),
          stageText: (stage?.textContent || '').replace(/\s+/g, ' ').slice(0, 600),
          fileRows: document.querySelectorAll('#app-tool-stage .conv-file-row, #app-tool-stage .file-row, #app-tool-stage [class*=file]').length
        };
      });
      console.log('AFTER UPLOAD:', JSON.stringify(after, null, 2));
    }
  }
  console.log('LOGS:\n' + logs.join('\n'));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });

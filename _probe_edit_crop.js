/* Edit tool crop studio probe — verify Organize-grade crop parity. */
const puppeteer = require('puppeteer-core');
const path = require('path');
const PDF = path.resolve(process.argv[2] || 'benchmark/samples/_mixed_fixture.pdf');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new', args: ['--no-sandbox', '--disable-gpu'],
    defaultViewport: { width: 1440, height: 980 },
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 220)); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + String(e.message).slice(0, 220)));
  await page.goto('http://127.0.0.1:8123/#app/edit', { waitUntil: 'networkidle2', timeout: 45000 });
  await page.waitForSelector('#etxt-inp', { timeout: 15000 });
  (await page.$('#etxt-inp')).uploadFile(PDF);
  await page.waitForSelector('.etxt-shell', { timeout: 30000 });
  await sleep(2500);

  const cropState = () => page.evaluate(() => {
    const box = document.querySelector('.etxt-crop-layer:not([hidden]) .org-crop-box');
    const bar = document.querySelector('#etxt-crop-hud .org-crop-floating-bar');
    const val = (n) => box ? box.style.getPropertyValue('--crop-' + n) : null;
    return {
      boxVisible: !!box,
      staticBox: !!box && box.classList.contains('is-static'),
      handles: document.querySelectorAll('.etxt-crop-layer:not([hidden]) .org-crop-handle').length,
      hud: !!bar,
      hudButtons: bar ? Array.from(bar.querySelectorAll('button')).map(b => b.textContent.trim()) : [],
      top: val('top'), right: val('right'), bottom: val('bottom'), left: val('left'),
      scrim: box ? getComputedStyle(box).boxShadow !== 'none' : false,
    };
  });

  console.log('[1] initial:', JSON.stringify(await cropState()));

  await page.$eval('#etxt-fzoom-slider', (el) => {
    el.value = '50';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await sleep(600);

  await page.$eval('#etxt-tb-crop', (el) => el.click());
  await sleep(600);
  const opened = await cropState();
  console.log('[2] crop mode:', JSON.stringify(opened));
  await page.screenshot({ path: 'audit_screenshots/edit/crop-studio.png' });

  // Drag SE handle inward by 120x90 px (grab the handle, not the box corner)
  const seHandle = await page.$('.etxt-crop-layer:not([hidden]) .org-crop-handle--se');
  const hb = await seHandle.boundingBox();
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
  await page.mouse.down();
  await page.mouse.move(hb.x + hb.width / 2 - 120, hb.y + hb.height / 2 - 90, { steps: 12 });
  await page.mouse.up();
  await sleep(500);
  console.log('[3] after SE drag:', JSON.stringify(await cropState()));
  await page.screenshot({ path: 'audit_screenshots/edit/crop-after-drag.png' });

  // Drag inside the box to move it
  const bb2 = (await (await page.$('.etxt-crop-layer:not([hidden]) .org-crop-box')).boundingBox());
  await page.mouse.move(bb2.x + bb2.width / 2, bb2.y + bb2.height / 2);
  await page.mouse.down();
  await page.mouse.move(bb2.x + bb2.width / 2 + 60, bb2.y + bb2.height / 2 + 40, { steps: 10 });
  await page.mouse.up();
  await sleep(500);
  console.log('[4] after move:', JSON.stringify(await cropState()));

  // Auto-detect
  await page.click('#etxt-crop-auto');
  await sleep(800);
  console.log('[5] after auto:', JSON.stringify(await cropState()));

  // Reset
  await page.click('#etxt-crop-reset');
  await sleep(400);
  console.log('[6] after reset:', JSON.stringify(await cropState()));

  // Redo a manual drag then Done
  const seH2 = await page.$('.etxt-crop-layer:not([hidden]) .org-crop-handle--se');
  const hb2 = await seH2.boundingBox();
  await page.mouse.move(hb2.x + hb2.width / 2, hb2.y + hb2.height / 2);
  await page.mouse.down();
  await page.mouse.move(hb2.x + hb2.width / 2 - 140, hb2.y + hb2.height / 2 - 110, { steps: 12 });
  await page.mouse.up();
  await sleep(400);
  await page.click('#etxt-crop-done');
  await sleep(800);
  const afterDone = await cropState();
  console.log('[7] after done:', JSON.stringify(afterDone));

  // Export and inspect the CropBox with pdf-lib
  await page.$eval('#etxt-finish', (el) => el.click());
  let ready = false;
  for (let i = 0; i < 60; i++) { ready = await page.evaluate(() => !!document.getElementById('org-main-dl-btn')); if (ready) break; await sleep(500); }
  const crop = await page.evaluate(async () => {
    const hook = window._ffLastResult;
    if (!hook || !hook.blob) return { hook: false };
    const L = window.PDFLib;
    const buf = new Uint8Array(await hook.blob.arrayBuffer());
    const doc = await L.PDFDocument.load(buf);
    const out = [];
    for (let i = 0; i < doc.getPageCount(); i++) {
      const p = doc.getPage(i);
      const media = p.getMediaBox();
      const cb = p.getCropBox();
      out.push({ page: i + 1, media: [media.width, media.height], crop: [Math.round(cb.x), Math.round(cb.y), Math.round(cb.width), Math.round(cb.height)] });
    }
    return { pages: out };
  });
  console.log('[8] export cropboxes:', JSON.stringify(crop));
  console.log('[9] errors:', errors.length ? errors : 'none');
  await page.close();

  // Cancel path
  const page2 = await browser.newPage();
  await page2.goto('http://127.0.0.1:8123/#app/edit', { waitUntil: 'networkidle2', timeout: 45000 });
  await page2.waitForSelector('#etxt-inp', { timeout: 15000 });
  (await page2.$('#etxt-inp')).uploadFile(PDF);
  await page2.waitForSelector('.etxt-shell', { timeout: 30000 });
  await sleep(2000);
  await page2.$eval('#etxt-tb-crop', (el) => el.click());
  await sleep(500);
  const seCancel = await page2.$('.etxt-crop-layer:not([hidden]) .org-crop-handle--se');
  const cb = await seCancel.boundingBox();
  await page2.mouse.move(cb.x + cb.width / 2, cb.y + cb.height / 2);
  await page2.mouse.down();
  await page2.mouse.move(cb.x + cb.width / 2 - 100, cb.y + cb.height / 2 - 80, { steps: 10 });
  await page2.mouse.up();
  await sleep(300);
  await page2.keyboard.press('Escape');
  await sleep(600);
  const cancelled = await page2.evaluate(() => ({
    hud: !!document.querySelector('#etxt-crop-hud'),
    box: !!document.querySelector('.etxt-crop-layer:not([hidden]) .org-crop-box'),
  }));
  console.log('[10] cancel path:', JSON.stringify(cancelled));
  await page2.close();

  await browser.close();
})().catch((e) => { console.error('FATAL', e); process.exit(1); });

/* Crop keyboard + undo check. */
const puppeteer = require('puppeteer-core');
const path = require('path');
const PDF = path.resolve('benchmark/samples/_mixed_fixture.pdf');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: 'new', args: ['--no-sandbox'], defaultViewport: { width: 1440, height: 980 } });
  const page = await browser.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 160)));
  await page.goto('http://127.0.0.1:8123/#app/edit', { waitUntil: 'networkidle2', timeout: 45000 });
  await page.waitForSelector('#etxt-inp', { timeout: 15000 });
  (await page.$('#etxt-inp')).uploadFile(PDF);
  await page.waitForSelector('.etxt-shell', { timeout: 30000 });
  await sleep(2000);
  await page.$eval('#etxt-tb-crop', (el) => el.click());
  await sleep(500);
  await page.click('#etxt-crop-auto');
  await sleep(700);
  await page.keyboard.press('Enter');
  await sleep(700);
  const s1 = await page.evaluate(() => ({
    hud: !!document.querySelector('#etxt-crop-hud'),
    box: !!document.querySelector('.etxt-crop-layer:not([hidden]) .org-crop-box'),
    isStatic: !!document.querySelector('.etxt-crop-layer:not([hidden]) .org-crop-box.is-static'),
    undoOff: document.getElementById('etxt-undo')?.disabled,
  }));
  await page.keyboard.down('Control'); await page.keyboard.press('KeyZ'); await page.keyboard.up('Control');
  await sleep(700);
  const s2 = await page.evaluate(() => ({
    box: !!document.querySelector('.etxt-crop-layer:not([hidden]) .org-crop-box'),
    isStatic: !!document.querySelector('.etxt-crop-layer:not([hidden]) .org-crop-box.is-static'),
  }));
  console.log('after Enter:', JSON.stringify(s1));
  console.log('after Ctrl+Z:', JSON.stringify(s2));

  // Stale-draft check: draft then tool shortcut, re-enter crop -> committed state
  await page.$eval('#etxt-tb-crop', (el) => el.click());
  await sleep(400);
  const hudInfo = await page.evaluate(() => ({ hud: !!document.querySelector('#etxt-crop-hud'), dims: document.querySelector('#etxt-crop-dims span')?.textContent }));
  console.log('hud before auto:', JSON.stringify(hudInfo));
  await page.click('#etxt-crop-auto');
  await sleep(900);
  const autoInfo = await page.evaluate(() => ({
    dims: document.querySelector('#etxt-crop-dims span')?.textContent,
    right: document.querySelector('.etxt-crop-layer:not([hidden]) .org-crop-box')?.style.getPropertyValue('--crop-right'),
    toast: Array.from(document.querySelectorAll('*')).filter((e) => /Could not detect/.test(e.textContent || '') && e.children.length === 0).length,
  }));
  console.log('after auto:', JSON.stringify(autoInfo));
  const draftBefore = autoInfo.right;
  // Letters must not hijack the crop draft.
  await page.keyboard.press('KeyE');
  await sleep(500);
  const stillCropping = await page.evaluate(() => !!document.querySelector('#etxt-crop-hud'));
  // Leaving via the Select button must drop the draft; re-entering shows committed state.
  await page.$eval('#etxt-tb-select', (el) => el.click());
  await sleep(500);
  await page.$eval('#etxt-tb-crop', (el) => el.click());
  await sleep(500);
  const draftAfter = await page.$eval('.etxt-crop-layer:not([hidden]) .org-crop-box', (b) => b.style.getPropertyValue('--crop-right'));
  console.log('key gating: stillCropping=' + stillCropping + (stillCropping ? ' OK' : ' FAIL'));
  console.log('stale-draft check: before=' + draftBefore + ' after=' + draftAfter + (draftAfter === '0%' ? ' OK' : ' FAIL'));
  await page.keyboard.press('Escape');
  await sleep(300);

  console.log('errors:', errors.length ? errors : 'none');
  await browser.close();
})().catch((e) => { console.error('FATAL', e); process.exit(1); });

/* Page-number studio probe — phases 1-3. */
const puppeteer = require('puppeteer-core');
const path = require('path');
const PDF = path.resolve('benchmark/samples/_mixed_fixture.pdf');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function openEditor(browser) {
  const page = await browser.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 220)); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + String(e.message).slice(0, 220)));
  await page.goto('http://127.0.0.1:8123/#app/edit', { waitUntil: 'networkidle2', timeout: 45000 });
  await page.waitForSelector('#etxt-inp', { timeout: 15000 });
  (await page.$('#etxt-inp')).uploadFile(PDF);
  await page.waitForSelector('.etxt-shell', { timeout: 30000 });
  await sleep(2200);
  return { page, errors };
}

const pnState = (page) => page.evaluate(() => {
  const draft = document.querySelector('.etxt-pn-item.is-draft');
  return {
    panel: !!document.getElementById('etxt-pn-panel'),
    draft: !!draft,
    draftText: draft ? draft.textContent : null,
    draftLeft: draft ? draft.style.left : null,
    draftTop: draft ? draft.style.top : null,
    ghosts: document.querySelectorAll('.etxt-pn-item.is-ghost').length,
    committed: document.querySelectorAll('.etxt-pn-item:not(.is-draft):not(.is-ghost)').length,
    sample: document.getElementById('etxt-pn-sample')?.textContent || null,
    listRows: document.querySelectorAll('#etxt-pn-list .etxt-wm-listrow').length,
    mx: document.getElementById('etxt-pn-mx')?.value,
    my: document.getElementById('etxt-pn-my')?.value,
  };
});

async function exportBlob(page) {
  await page.$eval('#etxt-finish', (el) => el.click());
  let ready = false;
  for (let i = 0; i < 60; i++) { ready = await page.evaluate(() => !!document.getElementById('org-main-dl-btn')); if (ready) break; await sleep(500); }
  if (!ready) throw new Error('export result never appeared');
  return page.evaluate(async () => Array.from(new Uint8Array(await window._ffLastResult.blob.arrayBuffer())));
}

async function extract(page, bytes) {
  return page.evaluate(async (arr) => {
    if (!window.pdfjsLib) await window.FF.util.loadScript('vendor/pdfjs.min.js');
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js';
    const doc = await window.pdfjsLib.getDocument({ data: new Uint8Array(arr).slice() }).promise;
    const pages = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const pg = await doc.getPage(i);
      const vp = pg.getViewport({ scale: 1 });
      const tc = await pg.getTextContent();
      pages.push({
        w: vp.width,
        items: tc.items.filter((it) => it.str && it.str.trim()).map((it) => ({ s: it.str, x: Math.round(it.transform[4]), y: Math.round(it.transform[5]) })),
      });
    }
    return pages;
  }, bytes);
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new', args: ['--no-sandbox', '--disable-gpu'],
    defaultViewport: { width: 1440, height: 980 },
  });
  const allErrors = [];

  // ── A. Studio basics + default export ──
  {
    const { page, errors } = await openEditor(browser);
    await page.click('#etxt-tb-pagenum');
    await sleep(600);
    console.log('[A1 studio]', JSON.stringify(await pnState(page)));

    await page.select('#etxt-pn-format', 'Page {n} of {p}');
    await sleep(300);
    await page.click('#etxt-pn-apply');
    await sleep(500);
    console.log('[A2 applied]', JSON.stringify(await pnState(page)));

    const bytes = await exportBlob(page);
    const pages = await extract(page, bytes);
    console.log('[A3 export]', JSON.stringify(pages.map((p) => ({ w: p.w, texts: p.items.map((i) => `${i.s}@${i.x},${i.y}`) }))));
    console.log('[A4 errors]', errors.length ? errors : 'none');
    allErrors.push(...errors);
    await page.close();
  }

  // ── B. Numerals, start/skip, scope, custom format, facing ──
  {
    const { page, errors } = await openEditor(browser);
    // Roman numerals, plain {n}
    await page.click('#etxt-tb-pagenum'); await sleep(500);
    await page.select('#etxt-pn-format', '{n}');
    await page.select('#etxt-pn-numeral', 'roman-lower');
    await sleep(300);
    await page.click('#etxt-pn-apply'); await sleep(400);
    // Start at 5, skip first page
    await page.click('#etxt-tb-pagenum'); await sleep(400);
    await page.$eval('#etxt-pn-start', (el) => { el.value = '5'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.$eval('#etxt-pn-skip', (el) => { el.value = '1'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.select('#etxt-pn-scope', 'even');
    await sleep(300);
    await page.click('#etxt-pn-apply'); await sleep(400);
    // Custom format
    await page.click('#etxt-tb-pagenum'); await sleep(400);
    await page.select('#etxt-pn-format', '__custom');
    await sleep(200);
    await page.$eval('#etxt-pn-custom', (el) => { el.value = '[ {n} ]'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.click('#etxt-pn-apply'); await sleep(400);
    // Facing pages right-aligned
    await page.click('#etxt-tb-pagenum'); await sleep(400);
    await page.select('#etxt-pn-format', '{n}');
    await page.select('#etxt-pn-numeral', 'arabic');
    await page.click('[data-pnzone="bottom,right"]');
    await page.$eval('#etxt-pn-facing', (el) => { el.checked = true; el.dispatchEvent(new Event('change', { bubbles: true })); });
    await sleep(300);
    await page.click('#etxt-pn-apply'); await sleep(400);

    const bytes = await exportBlob(page);
    const pages = await extract(page, bytes);
    console.log('[B export]', JSON.stringify(pages.map((p) => ({ w: p.w, nums: p.items.filter((i) => !/Vector text paragraph/.test(i.s)).map((i) => `${i.s}@${i.x}`) }))));
    console.log('[B errors]', errors.length ? errors : 'none');
    allErrors.push(...errors);
    await page.close();
  }

  // ── C. Drag margins, templates, multi-scheme, undo ──
  {
    const { page, errors } = await openEditor(browser);
    await page.$eval('#etxt-fzoom-slider', (el) => { el.value = '50'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    await sleep(600);
    await page.click('#etxt-tb-pagenum'); await sleep(600);
    const before = await pnState(page);
    const item = await page.$('.etxt-pn-item.is-draft');
    const ib = await item.boundingBox();
    await page.mouse.move(ib.x + ib.width / 2, ib.y + ib.height / 2);
    await page.mouse.down();
    await page.mouse.move(ib.x + ib.width / 2, ib.y + ib.height / 2 - 60, { steps: 10 });
    await page.mouse.up();
    await sleep(300);
    const after = await pnState(page);
    console.log('[C1 drag] margins', before.mx + '/' + before.my, '->', after.mx + '/' + after.my);

    // Template save
    await page.click('#etxt-pn-tpl-save'); await sleep(200);
    await page.$eval('#etxt-pn-tpl-name', (el) => { el.value = 'Audit PN'; });
    await page.click('#etxt-pn-tpl-save'); await sleep(300);
    const tplCount = await page.$$eval('#etxt-pn-tpl option', (o) => o.length);
    await page.click('#etxt-pn-cancel'); await sleep(300);
    await page.click('#etxt-tb-pagenum'); await sleep(400);
    await page.select('#etxt-pn-tpl', '0');
    await page.click('#etxt-pn-tpl-apply'); await sleep(400);
    const afterTpl = await pnState(page);
    console.log('[C2 template] options=', tplCount, 'margins=', afterTpl.mx + '/' + afterTpl.my, 'sample=', afterTpl.sample);
    await page.click('#etxt-pn-apply'); await sleep(400);

    // Second scheme (Roman on page 1 only)
    await page.click('#etxt-tb-pagenum'); await sleep(400);
    await page.select('#etxt-pn-format', '{n}');
    await page.select('#etxt-pn-numeral', 'roman-upper');
    await page.select('#etxt-pn-scope', 'range'); await sleep(200);
    await page.$eval('#etxt-pn-range', (el) => { el.value = '1'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.click('#etxt-pn-apply'); await sleep(400);
    await page.click('#etxt-tb-pagenum'); await sleep(400);
    const rows = await page.$$eval('#etxt-pn-list .etxt-wm-listrow', (r) => r.length);
    await page.keyboard.press('Escape'); await sleep(300);
    console.log('[C3 schemes] listRows=', rows);
    await page.keyboard.down('Control'); await page.keyboard.press('KeyZ'); await page.keyboard.up('Control');
    await sleep(500);
    const afterUndo = await page.evaluate(() => document.querySelectorAll('.etxt-pn-item:not(.is-draft):not(.is-ghost)').length);
    console.log('[C4 after undo committed]', afterUndo);

    const bytes = await exportBlob(page);
    const pages = await extract(page, bytes);
    console.log('[C5 export]', JSON.stringify(pages.map((p) => p.items.filter((i) => /^[IVXLCDM0-9P[\]]/.test(i.s)).map((i) => i.s))));
    console.log('[C6 errors]', errors.length ? errors : 'none');
    allErrors.push(...errors);
    await page.close();
  }

  console.log('TOTAL ERRORS:', allErrors.length ? allErrors.slice(0, 8) : 'none');
  await browser.close();
})().catch((e) => { console.error('FATAL', e); process.exit(1); });

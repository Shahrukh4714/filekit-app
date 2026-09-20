/* Edit tool audit round 3 — image inputs, insert popover, crop, find/replace persistence, export blob. */
const puppeteer = require('puppeteer-core');
const path = require('path');
const PDF = path.resolve('benchmark/samples/_mixed_fixture.pdf');
const JPG = path.resolve('assets/showcase_puppy.jpg');
const PNG16 = path.resolve('benchmark/samples/_a_16bit.png');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function openEditor(browser, filePath) {
  const page = await browser.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
  page.on('pageerror', (e) => errs.push('pageerror: ' + String(e.message).slice(0, 200)));
  await page.goto('http://127.0.0.1:8123/#app/edit', { waitUntil: 'networkidle2', timeout: 45000 });
  await page.waitForSelector('#etxt-inp', { timeout: 15000 });
  (await page.$('#etxt-inp')).uploadFile(filePath);
  let mounted = true;
  try { await page.waitForSelector('.etxt-shell', { timeout: 20000 }); } catch { mounted = false; }
  await sleep(2000);
  return { page, errs, mounted };
}
const wrapBox = async (page) => (await page.$('#etxt-canvas-wrap')).boundingBox();
async function drag(page, x1, y1, x2, y2) {
  await page.mouse.move(x1, y1); await page.mouse.down();
  await page.mouse.move(x2, y2, { steps: 14 }); await page.mouse.up(); await sleep(800);
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new', args: ['--no-sandbox', '--disable-gpu'],
    defaultViewport: { width: 1440, height: 980 },
  });

  // A. JPEG input
  {
    const { page, errs, mounted } = await openEditor(browser, JPG);
    const s = await page.evaluate(() => ({ shell: !!document.querySelector('.etxt-shell'), pages: document.querySelectorAll('.etxt-page').length }));
    console.log('[A jpg input] mounted=', mounted, JSON.stringify(s), 'errors=', errs.slice(0, 2));
    await page.screenshot({ path: 'audit_screenshots/edit/round3-jpg.png' });
    await page.close();
  }

  // B. 16-bit PNG input
  {
    const { page, errs, mounted } = await openEditor(browser, PNG16);
    const s = await page.evaluate(() => ({ shell: !!document.querySelector('.etxt-shell'), pages: document.querySelectorAll('.etxt-page').length, drop: !!document.getElementById('etxt-inp'), toast: document.querySelector('.ff-toast')?.textContent || '' }));
    console.log('[B 16bit png input] mounted=', mounted, JSON.stringify(s), 'errors=', errs.slice(0, 3));
    await page.screenshot({ path: 'audit_screenshots/edit/round3-png16.png' });
    await page.close();
  }

  // C. Insert popover: stamp + note
  {
    const { page, errs } = await openEditor(browser, PDF);
    await page.$eval('#etxt-tb-insert', (el) => el.click());
    await sleep(600);
    const pop = await page.evaluate(() => ({
      tool: document.getElementById('etxt-popover-flyout')?.dataset.tool || '',
      stampBtns: document.querySelectorAll('[data-pop-stamp]').length,
      noteBtn: !!document.getElementById('etxt-pop-add-note'),
      html: (document.getElementById('etxt-popover-flyout')?.innerHTML || '').slice(0, 160),
    }));
    console.log('[C insert popover]', JSON.stringify(pop));
    const stampBtn = await page.$('[data-pop-stamp]');
    if (stampBtn) { await stampBtn.click(); await sleep(900); }
    const afterStamp = await page.evaluate(() => Array.from(document.querySelectorAll('.etxt-annot-layer')).map((l) => l.children.length));
    await page.$eval('#etxt-tb-insert', (el) => el.click());
    await sleep(600);
    const noteBtn = await page.$('#etxt-pop-add-note');
    if (noteBtn) { await noteBtn.click(); await sleep(600); }
    const b = await wrapBox(page);
    await page.mouse.click(b.x + 300, b.y + 820);
    await sleep(900);
    const afterNote = await page.evaluate(() => Array.from(document.querySelectorAll('.etxt-annot-layer')).map((l) => l.children.length));
    console.log('[C insert] afterStamp=', JSON.stringify(afterStamp), 'afterNote=', JSON.stringify(afterNote), 'errors=', errs.slice(0, 2));
    await page.close();
  }

  // D. Crop: click crop, drag, re-open crop tab, apply
  {
    const { page, errs } = await openEditor(browser, PDF);
    await page.$eval('#etxt-tb-crop', (el) => el.click());
    await sleep(500);
    const b = await wrapBox(page);
    await drag(page, b.x + 300, b.y + 300, b.x + 700, b.y + 700);
    const afterDrag = await page.evaluate(() => ({
      popover: !!document.getElementById('etxt-popover-flyout'),
      apply: !!document.getElementById('etxt-pop-crop-apply'),
      cropLayer: !!document.querySelector('.etxt-crop-layer:not([hidden])'),
    }));
    await page.$eval('#etxt-tb-crop', (el) => el.click());
    await sleep(500);
    const reopened = await page.evaluate(() => ({ apply: !!document.getElementById('etxt-pop-crop-apply'), reset: !!document.getElementById('etxt-pop-crop-reset') }));
    const applyBtn = await page.$('#etxt-pop-crop-apply');
    if (applyBtn) { await applyBtn.click(); await sleep(900); }
    const afterApply = await page.evaluate(() => ({ dialog: document.getElementById('etxt-dlg')?.hidden, optbar: !!document.getElementById('etxt-optbar') }));
    console.log('[D crop] afterDrag=', JSON.stringify(afterDrag), 'reopened=', JSON.stringify(reopened), 'afterApply=', JSON.stringify(afterApply), 'errors=', errs.slice(0, 2));
    await page.close();
  }

  // E. Find & replace persistence: open as PDF -> switch to Edit mode -> inspect zone text
  {
    const { page, errs } = await openEditor(browser, PDF);
    await page.$eval('#etxt-find-replace', (el) => el.click());
    await sleep(500);
    await page.type('#etxt-fr-find', 'Vector', { delay: 8 });
    await page.type('#etxt-fr-repl', 'Raster', { delay: 8 });
    await page.click('#etxt-fr-ok');
    await sleep(6000);
    const status = await page.$eval('#etxt-fr-status', (el) => el.textContent).catch(() => '(none)');
    if (await page.$('#etxt-fr-pdf')) { await page.click('#etxt-fr-pdf'); await sleep(4500); }
    await page.$eval('.etxt-mode-tab[data-tool="edit-text"]', (el) => el.click()).catch(() => {});
    await sleep(3500);
    const titles = await page.evaluate(() => Array.from(document.querySelectorAll('.etxt-zone--text')).map(z => z.title).slice(0, 5));
    console.log('[E find-replace persist] status=', JSON.stringify(status), 'titles=', JSON.stringify(titles), 'errors=', errs.slice(0, 3));
    await page.close();
  }

  // F. Export blob inspection: watermark + page number -> export -> extract text from blob with pdf.js
  {
    const { page, errs } = await openEditor(browser, PDF);
    await page.$eval('#etxt-tb-watermark', (el) => el.click());
    await sleep(400);
    await page.click('#etxt-wm-apply');
    await sleep(1500);
    await page.$eval('#etxt-tb-pagenum', (el) => el.click());
    await sleep(400);
    const pnOk = await page.$('#etxt-pn-apply');
    if (pnOk) { await pnOk.click(); await sleep(1500); }
    await page.$eval('#etxt-finish', (el) => el.click());
    let ready = false;
    for (let i = 0; i < 60; i++) { ready = await page.evaluate(() => !!document.getElementById('org-main-dl-btn')); if (ready) break; await sleep(500); }
    const info = await page.evaluate(async () => {
      const hook = window._ffLastResult;
      if (!hook || !hook.blob) return { hook: false };
      const buf = new Uint8Array(await hook.blob.arrayBuffer());
      const lib = window.pdfjsLib;
      if (!lib) return { hook: true, size: buf.length, pdfjs: false };
      const doc = await lib.getDocument({ data: buf }).promise;
      let text = '';
      for (let p = 1; p <= Math.min(2, doc.numPages); p++) {
        const pg = await doc.getPage(p);
        const tc = await pg.getTextContent();
        text += tc.items.map((i) => i.str).join(' ') + ' | ';
      }
      return { hook: true, size: buf.length, pages: doc.numPages, hasConfidential: /CONFIDENTIAL/i.test(text), hasPageNum: /(^|\s)1(\s|$)/.test(text), sample: text.slice(0, 140) };
    });
    console.log('[F export blob]', JSON.stringify(info), 'errors=', errs.slice(0, 3));
    await page.close();
  }

  await browser.close();
})().catch((e) => { console.error('FATAL', e); process.exit(1); });

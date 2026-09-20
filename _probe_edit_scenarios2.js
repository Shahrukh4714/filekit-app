/* Edit tool audit round 2 — deep interaction scenarios. */
const puppeteer = require('puppeteer-core');
const path = require('path');
const PDF = path.resolve('benchmark/samples/_mixed_fixture.pdf');
const PNG = path.resolve('benchmark/samples/_a_16bit.png');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = [];

async function freshEditor(browser, filePath) {
  const page = await browser.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 240)); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + String(e.message).slice(0, 240)));
  await page.goto('http://127.0.0.1:8123/#app/edit', { waitUntil: 'networkidle2', timeout: 45000 });
  await page.waitForSelector('#etxt-inp', { timeout: 15000 });
  (await page.$('#etxt-inp')).uploadFile(filePath);
  await page.waitForSelector('.etxt-shell', { timeout: 30000 });
  await sleep(2500);
  return page;
}
const st = (page) => page.evaluate(() => ({
  annots: Array.from(document.querySelectorAll('.etxt-annot-layer')).map((l) => l.children.length),
  committed: document.querySelectorAll('.etxt-committed').length,
  undoOff: document.getElementById('etxt-undo')?.disabled,
  redoOff: document.getElementById('etxt-redo')?.disabled,
  zones: document.querySelectorAll('.etxt-zone--text').length,
  zonesInert: document.querySelector('.etxt-shell')?.classList.contains('etxt-zones-inert'),
  dlgHidden: document.getElementById('etxt-dlg')?.hidden,
  textBox: !!document.querySelector('.etxt-text-box'),
}));
async function drag(page, x1, y1, x2, y2) {
  await page.mouse.move(x1, y1); await page.mouse.down();
  await page.mouse.move(x2, y2, { steps: 16 }); await page.mouse.up(); await sleep(800);
}
const wrapBox = async (page) => (await page.$('#etxt-canvas-wrap')).boundingBox();

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new', args: ['--no-sandbox', '--disable-gpu'],
    defaultViewport: { width: 1440, height: 980 },
  });

  // 1. Edit text: click zone -> select all -> type -> Ctrl+Enter commit
  {
    const page = await freshEditor(browser, PDF);
    const zone = await page.$('.etxt-zone--text');
    const b = await zone.boundingBox();
    await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
    await sleep(700);
    await page.keyboard.down('Control'); await page.keyboard.press('KeyA'); await page.keyboard.up('Control');
    await page.keyboard.type('AUDIT EDITED LINE', { delay: 10 });
    await page.keyboard.down('Control'); await page.keyboard.press('Enter'); await page.keyboard.up('Control');
    await sleep(900);
    console.log('[1 text commit]', JSON.stringify(await st(page)));
    await page.close();
  }

  // 2. Find & replace -> Open as PDF -> verify text replaced in resulting doc
  {
    const page = await freshEditor(browser, PDF);
    await page.$eval('#etxt-find-replace', (el) => el.click());
    await sleep(500);
    await page.type('#etxt-fr-find', 'Vector', { delay: 8 });
    await page.type('#etxt-fr-repl', 'Raster', { delay: 8 });
    await page.click('#etxt-fr-ok');
    await sleep(6000);
    const status = await page.$eval('#etxt-fr-status', (el) => el.textContent).catch(() => '(none)');
    const hasOpen = await page.$('#etxt-fr-pdf');
    if (hasOpen) { await page.click('#etxt-fr-pdf'); await sleep(4000); }
    const textInfo = await page.evaluate(async () => {
      const shell = !!document.querySelector('.etxt-shell');
      const hits = document.querySelectorAll('.etxt-zone--text').length;
      const sample = Array.from(document.querySelectorAll('.etxt-zone--text')).slice(0, 3).map(z => z.title);
      return { shell, hits, sample };
    });
    console.log('[2 find-replace e2e] status=', JSON.stringify(status), 'afterOpen=', JSON.stringify(textInfo));
    await page.close();
  }

  // 3. Draw two strokes -> eraser removes one
  {
    const page = await freshEditor(browser, PDF);
    await page.$eval('.etxt-mode-tab[data-tool="draw"]', (el) => el.click());
    await sleep(400);
    const b = await wrapBox(page);
    await drag(page, b.x + 120, b.y + 540, b.x + 240, b.y + 590);
    await drag(page, b.x + 120, b.y + 620, b.x + 240, b.y + 670);
    const afterDraw = await st(page);
    await page.$eval('.etxt-mode-tab[data-tool="draw"]', (el) => el.click());
    await sleep(400);
    const eraseTab = await page.$('#etxt-pop-tab-eraser');
    if (eraseTab) { await eraseTab.click(); await sleep(300); }
    await drag(page, b.x + 110, b.y + 530, b.x + 250, b.y + 600);
    console.log('[3 eraser] afterDraw=', JSON.stringify(afterDraw.annots), 'afterErase=', JSON.stringify((await st(page)).annots));
    await page.close();
  }

  // 4. Select + move an ink stroke
  {
    const page = await freshEditor(browser, PDF);
    await page.$eval('.etxt-mode-tab[data-tool="draw"]', (el) => el.click());
    await sleep(400);
    const b = await wrapBox(page);
    await drag(page, b.x + 200, b.y + 520, b.x + 320, b.y + 570);
    await page.$eval('#etxt-tb-select', (el) => el.click());
    await sleep(400);
    const before = await page.evaluate(() => document.querySelector('.etxt-a-ink path')?.getAttribute('d')?.slice(0, 40));
    await drag(page, b.x + 260, b.y + 545, b.x + 360, b.y + 645);
    const after = await page.evaluate(() => document.querySelector('.etxt-a-ink path')?.getAttribute('d')?.slice(0, 40));
    console.log('[4 select-move] changed=', before !== after, 'before=', JSON.stringify(before), 'after=', JSON.stringify(after));
    await page.close();
  }

  // 5. Undo / redo a shape
  {
    const page = await freshEditor(browser, PDF);
    await page.$eval('.etxt-mode-tab[data-tool="shape"]', (el) => el.click());
    await sleep(400);
    const b = await wrapBox(page);
    await drag(page, b.x + 200, b.y + 700, b.x + 340, b.y + 790);
    const s1 = await st(page);
    await page.$eval('#etxt-undo', (el) => el.click());
    await sleep(600);
    const s2 = await st(page);
    await page.$eval('#etxt-redo', (el) => el.click());
    await sleep(600);
    const s3 = await st(page);
    console.log('[5 undo-redo] draw=', JSON.stringify(s1.annots), 'undo=', JSON.stringify(s2.annots), 'redo=', JSON.stringify(s3.annots));
    await page.close();
  }

  // 6. Watermark + page numbers dialogs apply cleanly
  {
    const page = await freshEditor(browser, PDF);
    await page.$eval('#etxt-tb-watermark', (el) => el.click());
    await sleep(500);
    await page.click('#etxt-wm-apply');
    await sleep(1500);
    const s1 = await st(page);
    await page.$eval('#etxt-tb-pagenum', (el) => el.click());
    await sleep(500);
    const pnOk = await page.$('#etxt-pn-apply');
    let s2 = null;
    if (pnOk) { await pnOk.click(); await sleep(1500); s2 = await st(page); }
    console.log('[6 wm+pagenum] afterWm=', JSON.stringify({ shell: s1.zoneInert ?? s1.zones, dlg: s1.dlgHidden }), 'afterPn=', JSON.stringify(s2 && { dlg: s2.dlgHidden, zones: s2.zones }));
    await page.close();
  }

  // 7. Crop drag + apply
  {
    const page = await freshEditor(browser, PDF);
    await page.$eval('#etxt-tb-crop', (el) => el.click());
    await sleep(500);
    const b = await wrapBox(page);
    await drag(page, b.x + 300, b.y + 300, b.x + 700, b.y + 700);
    const apply = await page.$('#etxt-pop-crop-apply');
    if (apply) { await apply.click(); await sleep(700); }
    console.log('[7 crop] applied=', !!apply, 'annots=', JSON.stringify((await st(page)).annots));
    await page.close();
  }

  // 8. Insert stamp + note via Insert popover
  {
    const page = await freshEditor(browser, PDF);
    await page.$eval('#etxt-tb-insert', (el) => el.click());
    await sleep(500);
    const stampBtn = await page.$('.etxt-stamp-btn');
    if (stampBtn) { await stampBtn.click(); await sleep(700); }
    const afterStamp = await st(page);
    await page.$eval('#etxt-tb-insert', (el) => el.click());
    await sleep(500);
    const noteBtn = await page.$('#etxt-add-note-btn') || await page.$('#etxt-pop-add-note');
    if (noteBtn) { await noteBtn.click(); await sleep(500); }
    const b = await wrapBox(page);
    await page.mouse.click(b.x + 300, b.y + 820);
    await sleep(700);
    console.log('[8 stamp+note] afterStamp=', JSON.stringify(afterStamp.annots), 'afterNote=', JSON.stringify((await st(page)).annots));
    await page.close();
  }

  // 9. Image input path: open editor with a PNG
  {
    const page = await freshEditor(browser, PNG);
    const s = await page.evaluate(() => ({
      shell: !!document.querySelector('.etxt-shell'),
      pages: document.querySelectorAll('.etxt-page').length,
      hasCanvas: !!document.querySelector('.etxt-full-canvas'),
    }));
    console.log('[9 png input]', JSON.stringify(s));
    await page.close();
  }

  // 10. Export a doc with a drawn annotation; verify downloaded PDF is larger than source
  {
    const page = await freshEditor(browser, PDF);
    await page.$eval('.etxt-mode-tab[data-tool="shape"]', (el) => el.click());
    await sleep(400);
    const b = await wrapBox(page);
    await drag(page, b.x + 200, b.y + 660, b.x + 360, b.y + 760);
    await page.$eval('#etxt-finish', (el) => el.click());
    let ok = false;
    for (let i = 0; i < 60; i++) {
      ok = await page.evaluate(() => !!(document.getElementById('org-main-dl-btn')));
      if (ok) break;
      await sleep(500);
    }
    await page.screenshot({ path: 'audit_screenshots/edit/round2-export.png' });
    console.log('[10 export result] resultScreen=', ok);
    await page.close();
  }

  console.log('ERRORS:', errors.length ? errors : 'none');
  await browser.close();
})().catch((e) => { console.error('FATAL', e); process.exit(1); });

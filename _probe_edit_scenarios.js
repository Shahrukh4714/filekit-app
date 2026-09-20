/* Clean per-scenario probe for the Edit tool — fresh page per scenario. */
const puppeteer = require('puppeteer-core');
const path = require('path');
const PDF = path.resolve('benchmark/samples/_mixed_fixture.pdf');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function freshEditor(browser, errors) {
  const page = await browser.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 200)); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + String(e.message).slice(0, 200)));
  await page.goto('http://127.0.0.1:8123/#app/edit', { waitUntil: 'networkidle2', timeout: 45000 });
  await page.waitForSelector('#etxt-inp', { timeout: 15000 });
  (await page.$('#etxt-inp')).uploadFile(PDF);
  await page.waitForSelector('.etxt-shell', { timeout: 30000 });
  await sleep(2500);
  return page;
}

const annotState = (page) => page.evaluate(() => ({
  layers: Array.from(document.querySelectorAll('.etxt-annot-layer')).map((l) => l.children.length),
  zones: document.querySelectorAll('.etxt-zone--text').length,
  dialogHidden: document.getElementById('etxt-dlg')?.hidden ?? null,
  backdropHidden: document.getElementById('etxt-dlg-backdrop')?.hidden ?? null,
  draft: document.querySelectorAll('.etxt-draft').length,
}));

async function drag(page, x1, y1, x2, y2) {
  await page.mouse.move(x1, y1);
  await page.mouse.down();
  await page.mouse.move(x2, y2, { steps: 16 });
  await page.mouse.up();
  await sleep(900);
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new', args: ['--no-sandbox', '--disable-gpu'],
    defaultViewport: { width: 1440, height: 980 },
  });
  const errors = [];
  const wrapBox = async (page) => (await page.$('#etxt-canvas-wrap')).boundingBox();

  // 1. Draw stroke in empty left margin with NO prior edit-text zones rendered
  {
    const page = await freshEditor(browser, errors);
    await page.$eval('.etxt-mode-tab[data-tool="draw"]', (el) => el.click());
    await sleep(500);
    const b = await wrapBox(page);
    console.log('[1 draw basic] before', JSON.stringify(await annotState(page)));
    await drag(page, b.x + 120, b.y + 560, b.x + 260, b.y + 630);
    console.log('[1 draw basic] after', JSON.stringify(await annotState(page)));
    await page.close();
  }

  // 2. Draw over text after edit-text zones exist
  {
    const page = await freshEditor(browser, errors);
    const b = await wrapBox(page);
    const before = await annotState(page);
    await page.$eval('.etxt-mode-tab[data-tool="draw"]', (el) => el.click());
    await sleep(500);
    console.log('[2 draw over text] zones-visible-in-draw', JSON.stringify(await annotState(page)));
    await drag(page, b.x + 400, b.y + 500, b.x + 560, b.y + 560);
    console.log('[2 draw over text] after', JSON.stringify(await annotState(page)));
    await page.close();
  }

  // 3. Shape drag
  {
    const page = await freshEditor(browser, errors);
    await page.$eval('.etxt-mode-tab[data-tool="shape"]', (el) => el.click());
    await sleep(500);
    const b = await wrapBox(page);
    await drag(page, b.x + 200, b.y + 700, b.x + 380, b.y + 800);
    console.log('[3 shape] after', JSON.stringify(await annotState(page)));
    await page.close();
  }

  // 4. Redact drag
  {
    const page = await freshEditor(browser, errors);
    await page.$eval('.etxt-mode-tab[data-tool="redact"]', (el) => el.click());
    await sleep(500);
    const b = await wrapBox(page);
    await drag(page, b.x + 300, b.y + 480, b.x + 520, b.y + 530);
    console.log('[4 redact] after', JSON.stringify(await annotState(page)));
    await page.close();
  }

  // 5. Escape closes watermark dialog?
  {
    const page = await freshEditor(browser, errors);
    await page.$eval('#etxt-tb-watermark', (el) => el.click());
    await sleep(600);
    const open = await annotState(page);
    await page.keyboard.press('Escape');
    await sleep(400);
    const after = await annotState(page);
    console.log('[5 esc closes dlg] open=', JSON.stringify(open.dialogHidden), 'afterEsc=', JSON.stringify(after.dialogHidden));
    await page.close();
  }

  // 6. Find & replace round-trip
  {
    const page = await freshEditor(browser, errors);
    await page.$eval('#etxt-find-replace', (el) => el.click());
    await sleep(600);
    const opened = await page.evaluate(() => ({
      hidden: document.getElementById('etxt-dlg')?.hidden,
      title: document.querySelector('#etxt-dlg .etxt-dlg-title')?.textContent,
    }));
    await page.type('#etxt-fr-find', 'Vector', { delay: 10 });
    await page.type('#etxt-fr-repl', 'Raster', { delay: 10 });
    await page.click('#etxt-fr-ok');
    await sleep(4000);
    const status = await page.$eval('#etxt-fr-status', (el) => el.textContent).catch(() => '(gone)');
    console.log('[6 find-replace] open=', JSON.stringify(opened), 'status=', JSON.stringify(status));
    await page.close();
  }

  // 7. Type tool placement
  {
    const page = await freshEditor(browser, errors);
    await page.$eval('.etxt-mode-tab[data-tool="type"]', (el) => el.click());
    await sleep(400);
    const b = await wrapBox(page);
    await page.mouse.click(b.x + 400, b.y + 800);
    await sleep(600);
    const typed = await page.evaluate(() => ({
      textBox: !!document.querySelector('.etxt-text-box'),
      microbar: !!document.querySelector('.etxt-inline-microbar'),
      annots: Array.from(document.querySelectorAll('.etxt-annot-layer')).map((l) => l.children.length),
    }));
    console.log('[7 type]', JSON.stringify(typed));
    await page.close();
  }

  // 8. Signature via modal: type name -> Place Signature
  {
    const page = await freshEditor(browser, errors);
    await page.$eval('.etxt-mode-tab[data-tool="sign"]', (el) => el.click());
    await sleep(700);
    const modal = await page.evaluate(() => ({
      dlgVisible: !document.getElementById('etxt-dlg')?.hidden,
      hasApply: !!document.getElementById('acrobat-sig-apply'),
      hasCancel: !!document.getElementById('acrobat-sig-cancel'),
    }));
    await page.click('#acrobat-sig-apply').catch(() => {});
    await sleep(900);
    const after = await page.evaluate(() => ({
      dlgHidden: document.getElementById('etxt-dlg')?.hidden,
      annots: Array.from(document.querySelectorAll('.etxt-annot-layer')).map((l) => l.children.length),
      activeTab: document.querySelector('.etxt-mode-tab.is-active')?.dataset.tool || '',
    }));
    console.log('[8 signature] modal=', JSON.stringify(modal), 'afterPlace=', JSON.stringify(after));
    await page.close();
  }

  console.log('ERRORS:', errors.length ? errors : 'none');
  await browser.close();
})().catch((e) => { console.error('FATAL', e); process.exit(1); });

/* Focused probe: find-replace dialog, sign modal, draw annotation rendering. */
const puppeteer = require('puppeteer-core');
const path = require('path');
const PDF = path.resolve('benchmark/samples/_mixed_fixture.pdf');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new', args: ['--no-sandbox', '--disable-gpu'],
    defaultViewport: { width: 1440, height: 980 },
  });
  const page = await browser.newPage();
  page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE-ERR:', m.text().slice(0, 300)); });
  page.on('pageerror', (e) => console.log('PAGE-ERR:', String(e.message).slice(0, 300)));

  await page.goto('http://127.0.0.1:8123/#app/edit', { waitUntil: 'networkidle2', timeout: 45000 });
  await page.waitForSelector('#etxt-inp', { timeout: 15000 });
  (await page.$('#etxt-inp')).uploadFile(PDF);
  await page.waitForSelector('.etxt-shell', { timeout: 30000 });
  await sleep(2500);

  const dump = async (label) => {
    const info = await page.evaluate(() => {
      const dlg = document.getElementById('etxt-dlg');
      const bd = document.getElementById('etxt-dlg-backdrop');
      return {
        dlgExists: !!dlg, dlgHidden: dlg ? dlg.hidden : null,
        bdExists: !!bd, bdHidden: bd ? bd.hidden : null,
        bdParent: bd ? bd.parentElement?.tagName : null,
        dlgTitle: dlg ? (dlg.querySelector('.etxt-dlg-title')?.textContent || '') : '',
        dlgHTML: dlg ? dlg.innerHTML.slice(0, 100) : '',
        annotLayers: Array.from(document.querySelectorAll('.etxt-annot-layer')).map((l) => ({ page: l.dataset.page, children: l.children.length, html: l.innerHTML.slice(0, 160) })),
      };
    });
    console.log(label, JSON.stringify(info, null, 1));
  };

  console.log('--- find-replace ---');
  await page.$eval('#etxt-find-replace', (el) => el.click());
  await sleep(800);
  await dump('after-find-click');
  await page.screenshot({ path: 'audit_screenshots/edit/focus-find.png' });

  console.log('--- sign tab ---');
  await page.keyboard.press('Escape');
  await sleep(200);
  await page.$eval('.etxt-mode-tab[data-tool="sign"]', (el) => el.click());
  await sleep(800);
  const signInfo = await page.evaluate(() => {
    const modal = document.querySelector('.etxt-sign-modal, .etxt-signature-modal, .sign-modal, #etxt-sign-modal, .etxt-sign-overlay');
    const anyModal = Array.from(document.querySelectorAll('body > div')).filter((d) => /sign/i.test(d.className || '')).map((d) => d.className);
    return {
      modalFound: !!modal, modalClass: modal?.className || '',
      modalVisible: modal ? !modal.hidden && getComputedStyle(modal).display !== 'none' : false,
      signDivs: anyModal,
      activeTab: document.querySelector('.etxt-mode-tab.is-active')?.dataset.tool || '',
      signTabClass: document.querySelector('.etxt-mode-tab[data-tool="sign"]')?.className || '',
    };
  });
  console.log('sign:', JSON.stringify(signInfo, null, 1));
  await page.screenshot({ path: 'audit_screenshots/edit/focus-sign.png' });
  await page.keyboard.press('Escape');
  await sleep(300);

  console.log('--- draw stroke (left of center) ---');
  await page.$eval('.etxt-mode-tab[data-tool="draw"]', (el) => el.click());
  await sleep(600);
  const b = await (await page.$('#etxt-canvas-wrap')).boundingBox();
  console.log('wrap box:', JSON.stringify(b));
  const pop = await page.evaluate(() => {
    const p = document.getElementById('etxt-popover-flyout');
    if (!p) return null;
    const r = p.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height, tool: p.dataset.tool || '' };
  });
  console.log('popover box:', JSON.stringify(pop));
  const sx = b.x + 120, sy = b.y + 560;
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  await page.mouse.move(sx + 130, sy + 70, { steps: 14 });
  await page.mouse.up();
  await sleep(800);
  await dump('after-draw');
  await page.screenshot({ path: 'audit_screenshots/edit/focus-draw.png' });

  await browser.close();
})().catch((e) => { console.error('FATAL', e); process.exit(1); });

/* Edit tool full audit harness.
 * Usage: node _probe_edit_audit.js [port] [pdf-path]
 * Loads the Edit tool, exercises every mode/tool/rail control, and reports
 * console errors, dead clicks, and state regressions with screenshots.
 */
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.argv[2] || 8123);
const PDF = path.resolve(process.argv[3] || 'benchmark/samples/_mixed_fixture.pdf');
const SHOT_DIR = path.resolve('audit_screenshots/edit');
const DL_DIR = path.resolve('scratch/audit_downloads');
fs.mkdirSync(SHOT_DIR, { recursive: true });
fs.mkdirSync(DL_DIR, { recursive: true });

if (!fs.existsSync(PDF)) { console.error('PDF not found: ' + PDF); process.exit(1); }
const report = { pdf: PDF, startedAt: new Date().toISOString(), steps: [], consoleErrors: [], pageErrors: [], warnings: [] };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => String(s).replace(/[^a-z0-9-]/gi, '_');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu'],
    defaultViewport: { width: 1440, height: 980, deviceScaleFactor: 1 },
  });
  const page = await browser.newPage();
  page.on('console', (m) => {
    const t = m.type();
    const text = m.text();
    if (t === 'error') report.consoleErrors.push(text);
    else if (t === 'warning' || t === 'warn') report.warnings.push(text);
  });
  page.on('pageerror', (e) => report.pageErrors.push(String(e.message || e)));

  const client = await page.createCDPSession();
  await client.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: DL_DIR });

  const shot = async (name) => { try { await page.screenshot({ path: path.join(SHOT_DIR, esc(name) + '.png') }); } catch { /* noop */ } };
  const errCount = () => report.consoleErrors.length + report.pageErrors.length;
  const step = async (name, fn) => {
    const before = errCount();
    const rec = { name, ok: true, newErrors: 0 };
    try {
      const note = await fn();
      if (note !== undefined && note !== null && note !== '') rec.note = String(note);
    } catch (e) {
      rec.ok = false;
      rec.error = String(e.message || e);
    }
    rec.newErrors = errCount() - before;
    report.steps.push(rec);
    await shot(name);
    console.log(`${rec.ok ? 'PASS' : 'FAIL'}  ${name}${rec.note ? '  — ' + rec.note : ''}${rec.error ? '  — ' + rec.error : ''}${rec.newErrors ? `  (+${rec.newErrors} err)` : ''}`);
  };
  const state = () => page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const pop = q('#etxt-popover-flyout');
    const dlg = q('#etxt-dlg');
    const backdrop = q('#etxt-dlg-backdrop');
    return {
      hasShell: !!q('.etxt-shell'),
      title: q('#app-workspace-title')?.textContent || '',
      pages: document.querySelectorAll('.etxt-page').length,
      modeTabs: Array.from(document.querySelectorAll('.etxt-mode-tab')).map((b) => ({ tool: b.dataset.tool, active: b.classList.contains('is-active') })),
      toolButtons: Array.from(document.querySelectorAll('.etxt-tool-icon-btn')).map((b) => ({ id: b.id, active: b.classList.contains('is-active'), disabled: b.disabled })),
      popover: pop ? { visible: !pop.hidden && getComputedStyle(pop).display !== 'none', tool: pop.dataset.tool || '', items: pop.querySelectorAll('button').length } : null,
      dialog: dlg && backdrop && !backdrop.hidden ? { visible: true, text: (dlg.textContent || '').slice(0, 120) } : { visible: false },
      zoomBadge: q('#etxt-fzoom-badge')?.textContent?.trim() || '',
      canvasTransform: q('#etxt-canvas')?.style.transform || '',
      drawerOpen: !!q('#etxt-thumbs-drawer')?.classList.contains('is-open'),
      pageBadge: q('.etxt-fzoom-page-badge')?.textContent?.trim() || '',
      annotCount: document.querySelectorAll('.etxt-annot-layer > *').length,
      textZones: document.querySelectorAll('.etxt-zone--text').length,
      zonesInert: !!q('.etxt-shell')?.classList.contains('etxt-zones-inert'),
      microbar: !!q('.etxt-inline-microbar'),
      textBox: !!q('.etxt-text-box'),
      resultScreen: !!q('#org-main-dl-btn'),
      scannedBanner: !!q('#etxt-scanned-banner') && !q('#etxt-scanned-banner').hidden,
    };
  });
  const click = async (sel, wait = 350) => {
    const el = await page.$(sel);
    if (!el) throw new Error(`missing selector ${sel}`);
    await el.click();
    await sleep(wait);
  };
  const closeAnyDialog = async () => {
    await page.evaluate(() => {
      const dlg = document.querySelector('.etxt-dialog:not([hidden])');
      if (!dlg) return;
      const cancel = dlg.querySelector('#acrobat-sig-cancel, #etxt-wm-cancel, #etxt-pn-cancel, #etxt-fm-cancel, #etxt-fr-cancel, #etxt-link-cancel');
      if (cancel) cancel.click();
    });
    await sleep(250);
  };

  try {
    await step('01-open-app', async () => {
      await page.goto(`http://127.0.0.1:${PORT}/#app/edit`, { waitUntil: 'networkidle2', timeout: 45000 });
      await page.waitForSelector('#etxt-inp', { timeout: 15000 });
      const s = await state();
      return `shell=${s.hasShell} title="${s.title}"`;
    });

    await step('02-upload-pdf', async () => {
      const inp = await page.$('#etxt-inp');
      await inp.uploadFile(PDF);
      await page.waitForSelector('.etxt-shell', { timeout: 30000 });
      await sleep(2500);
      const s = await state();
      if (!s.hasShell) throw new Error('editor shell did not mount');
      if (!s.pages) throw new Error('no .etxt-page rendered');
      return `pages=${s.pages} textZones=${s.textZones} scanned=${s.scannedBanner}`;
    });

    await step('03-initial-toolbar-state', async () => {
      const s = await state();
      const undo = s.toolButtons.find((b) => b.id === 'etxt-undo');
      const redo = s.toolButtons.find((b) => b.id === 'etxt-redo');
      if (undo && !undo.disabled) throw new Error('undo should start disabled');
      if (redo && !redo.disabled) throw new Error('redo should start disabled');
      const activeTabs = s.modeTabs.filter((m) => m.active).map((m) => m.tool);
      if (activeTabs.length !== 1) throw new Error('expected exactly 1 active mode tab, got ' + JSON.stringify(activeTabs));
      return `activeTab=${activeTabs[0]} zoom=${s.zoomBadge}`;
    });

    for (const tool of ['edit-text', 'type', 'draw', 'shape', 'redact']) {
      await step(`04-mode-${tool}`, async () => {
        await click(`.etxt-mode-tab[data-tool="${tool}"]`, 500);
        const s = await state();
        const tab = s.modeTabs.find((m) => m.tool === tool);
        if (!tab?.active) throw new Error(`tab ${tool} did not become active`);
        if (tool !== 'edit-text' && tool !== 'type') {
          if (tool !== 'shape' && !s.popover) throw new Error(`popover for ${tool} missing`);
        }
        return `popover=${s.popover ? s.popover.tool || 'open' : 'none'} zonesInert=${s.zonesInert}`;
      });
    }

    await step('04-mode-sign-modal', async () => {
      await click('.etxt-mode-tab[data-tool="sign"]', 700);
      const open = await page.evaluate(() => ({
        visible: !document.getElementById('etxt-dlg')?.hidden,
        isSig: !!document.querySelector('#acrobat-sig-apply'),
      }));
      await closeAnyDialog();
      if (!open.visible || !open.isSig) throw new Error('signature modal did not open');
      return 'signature modal opened + closed';
    });

    for (const [id, label, expectDialog] of [['etxt-tb-select', 'select', false], ['etxt-tb-crop', 'crop', false], ['etxt-tb-formfill', 'formfill', true]]) {
      await step(`05-tool-${label}`, async () => {
        await click(`#${id}`, 700);
        const s = await state();
        if (expectDialog && !s.dialog.visible) throw new Error(`${label} dialog did not open`);
        await closeAnyDialog();
        await page.keyboard.press('Escape');
        await sleep(150);
        return `dialog=${s.dialog.visible}`;
      });
    }

    await step('05-tool-watermark', async () => {
      await click('#etxt-tb-watermark', 700);
      const open = await page.evaluate(() => ({
        panel: !!document.getElementById('etxt-wm-panel'),
        draft: !!document.querySelector('.etxt-wm-item.is-draft'),
      }));
      if (!open.panel || !open.draft) throw new Error('watermark studio did not open');
      await page.keyboard.press('Escape');
      await sleep(300);
      const closed = await page.evaluate(() => !!document.getElementById('etxt-wm-panel'));
      if (closed) throw new Error('Escape did not close the watermark studio');
      return 'studio opened + escaped';
    });

    await step('05-tool-pagenum', async () => {
      await click('#etxt-tb-pagenum', 700);
      const open = await page.evaluate(() => ({
        panel: !!document.getElementById('etxt-pn-panel'),
        draft: !!document.querySelector('.etxt-pn-item.is-draft'),
      }));
      if (!open.panel || !open.draft) throw new Error('page-number studio did not open');
      await page.keyboard.press('Escape');
      await sleep(300);
      const closed = await page.evaluate(() => !!document.getElementById('etxt-pn-panel'));
      if (closed) throw new Error('Escape did not close the page-number studio');
      return 'studio opened + escaped';
    });

    await step('06-find-replace', async () => {
      await click('#etxt-find-replace', 600);
      const s = await state();
      if (!s.dialog.visible) throw new Error('find dialog did not open');
      await closeAnyDialog();
      return s.dialog.text.slice(0, 40);
    });

    await step('07-escape-closes-dialog', async () => {
      await click('#etxt-tb-formfill', 600);
      const s1 = await state();
      if (!s1.dialog.visible) throw new Error('form dialog did not open');
      await page.keyboard.press('Escape');
      await sleep(400);
      const s2 = await state();
      if (s2.dialog.visible) throw new Error('Escape did not close dialog');
      return 'esc closed dialog';
    });

    await step('08-insert-popover', async () => {
      await click('#etxt-tb-insert', 500);
      const s = await state();
      return `popover=${s.popover ? s.popover.tool || 'open' : 'none'}`;
    });

    await step('09-preview-toggle', async () => {
      await page.keyboard.press('Escape');
      await click('#etxt-preview-toggle', 500);
      const s1 = await state();
      await click('#etxt-preview-toggle', 500);
      const s2 = await state();
      return `transform1=${s1.canvasTransform} transform2=${s2.canvasTransform}`;
    });

    await step('10-zoom-controls', async () => {
      await click('#etxt-fzoom-in', 300);
      await click('#etxt-fzoom-in', 300);
      const s1 = await state();
      await click('#etxt-fzoom-out', 300);
      const s2 = await state();
      await click('#etxt-fzoom-reset', 300);
      const s3 = await state();
      return `in=${s1.zoomBadge} out=${s2.zoomBadge} reset=${s3.zoomBadge} tf=${s3.canvasTransform}`;
    });

    await step('11-zoom-slider', async () => {
      await page.$eval('#etxt-fzoom-slider', (el) => {
        el.value = '140';
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      });
      await sleep(400);
      const s = await state();
      return `badge=${s.zoomBadge} tf=${s.canvasTransform}`;
    });

    await step('12-fit-viewport', async () => {
      await click('#etxt-rail-fit', 400);
      const s = await state();
      return `badge=${s.zoomBadge}`;
    });

    await step('13-thumbs-drawer', async () => {
      await click('#etxt-rail-thumbs-toggle', 500);
      const s1 = await state();
      if (!s1.drawerOpen) throw new Error('drawer did not open');
      await click('#etxt-thumbs-close', 500);
      const s2 = await state();
      if (s2.drawerOpen) throw new Error('drawer did not close');
      return 'open/close ok';
    });

    await step('14-page-nav', async () => {
      const s0 = await state();
      if (s0.pages < 2) return `single page (${s0.pages}) — skipped`;
      await click('#etxt-fnav-next', 700);
      const s1 = await state();
      await click('#etxt-fnav-prev', 700);
      const s2 = await state();
      return `${s0.pageBadge} -> ${s1.pageBadge} -> ${s2.pageBadge}`;
    });

    await step('15-text-edit-open-editor', async () => {
      await click('.etxt-mode-tab[data-tool="edit-text"]', 400);
      const s = await state();
      if (!s.textZones) throw new Error('no text zones in edit mode');
      const zone = await page.$('.etxt-zone--text');
      const box = await zone.boundingBox();
      if (!box) throw new Error('text zone not visible');
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await sleep(600);
      const s2 = await state();
      if (!s2.microbar && !s2.textBox) throw new Error('editor/microbar did not open on text click');
      return `microbar=${s2.microbar} textBox=${s2.textBox} zonesInert=${s2.zonesInert}`;
    });

    await step('16-text-edit-commit', async () => {
      await page.evaluate(() => document.querySelector('.etxt-text-inner')?.focus());
      await page.keyboard.down('Control');
      await page.keyboard.press('KeyA');
      await page.keyboard.up('Control');
      await page.keyboard.type('AUDIT-EDIT', { delay: 12 });
      await page.keyboard.down('Control');
      await page.keyboard.press('Enter');
      await page.keyboard.up('Control');
      await sleep(700);
      const s = await state();
      const committed = await page.evaluate(() => document.querySelectorAll('.etxt-committed').length);
      if (!committed) throw new Error('commit produced no .etxt-committed box');
      const undo = s.toolButtons.find((b) => b.id === 'etxt-undo');
      if (undo?.disabled) throw new Error('undo still disabled after commit');
      return `committed=${committed}`;
    });

    await step('17-draw-stroke', async () => {
      await click('.etxt-mode-tab[data-tool="draw"]', 600);
      const b = await (await page.$('#etxt-canvas-wrap')).boundingBox();
      await page.mouse.move(b.x + 140, b.y + 660);
      await page.mouse.down();
      await page.mouse.move(b.x + 260, b.y + 720, { steps: 14 });
      await page.mouse.up();
      await sleep(700);
      const s = await state();
      if (!s.annotCount) throw new Error('draw stroke did not create annotation');
      if (!s.zonesInert) throw new Error('text zones should be inert in draw mode');
      return `annots=${s.annotCount} zonesInert=${s.zonesInert}`;
    });

    await step('18-draw-over-text', async () => {
      const b = await (await page.$('#etxt-canvas-wrap')).boundingBox();
      await page.mouse.move(b.x + 420, b.y + 500);
      await page.mouse.down();
      await page.mouse.move(b.x + 580, b.y + 560, { steps: 14 });
      await page.mouse.up();
      await sleep(700);
      const s = await state();
      if (s.annotCount < 2) throw new Error('drawing over text zone was swallowed (annots=' + s.annotCount + ')');
      return `annots=${s.annotCount}`;
    });

    await step('19-shape-drag', async () => {
      await page.keyboard.press('Escape');
      await click('.etxt-mode-tab[data-tool="shape"]', 600);
      const b = await (await page.$('#etxt-canvas-wrap')).boundingBox();
      await page.mouse.move(b.x + 200, b.y + 760);
      await page.mouse.down();
      await page.mouse.move(b.x + 360, b.y + 830, { steps: 12 });
      await page.mouse.up();
      await sleep(700);
      const s = await state();
      if (s.annotCount < 3) throw new Error('shape wasn\'t added, got ' + s.annotCount);
      return `annots=${s.annotCount}`;
    });

    await step('20-redact-drag', async () => {
      await page.keyboard.press('Escape');
      await click('.etxt-mode-tab[data-tool="redact"]', 600);
      const b = await (await page.$('#etxt-canvas-wrap')).boundingBox();
      await page.mouse.move(b.x + 420, b.y + 720);
      await page.mouse.down();
      await page.mouse.move(b.x + 620, b.y + 780, { steps: 12 });
      await page.mouse.up();
      await sleep(700);
      const s = await state();
      if (s.annotCount < 4) throw new Error('redaction box wasn\'t added, got ' + s.annotCount);
      return `annots=${s.annotCount}`;
    });

    await step('21-ui-undo-redo', async () => {
      await page.keyboard.press('Escape');
      await sleep(200);
      const before = await state();
      await click('#etxt-undo', 600);
      const after = await state();
      await click('#etxt-redo', 600);
      const redone = await state();
      return `annots ${before.annotCount} -> ${after.annotCount} -> ${redone.annotCount}`;
    });

    await step('22-export-save', async () => {
      await page.keyboard.press('Escape');
      await sleep(300);
      await click('#etxt-finish', 800);
      for (let i = 0; i < 60 && !(await state()).resultScreen; i++) await sleep(500);
      const s = await state();
      if (!s.resultScreen) throw new Error('result screen never appeared');
      return 'result screen rendered';
    });

    await step('23-download-file', async () => {
      const before = fs.readdirSync(DL_DIR).filter((f) => /\.pdf$/i.test(f)).length;
      await click('#org-main-dl-btn', 500);
      let dl = null;
      for (let i = 0; i < 40; i++) {
        const files = fs.readdirSync(DL_DIR).filter((f) => /\.pdf$/i.test(f));
        if (files.length > before) { dl = files[0]; break; }
        await sleep(500);
      }
      if (!dl) throw new Error('no PDF downloaded');
      const p = path.join(DL_DIR, dl);
      const buf = fs.readFileSync(p);
      if (!buf.slice(0, 5).toString().startsWith('%PDF')) throw new Error('downloaded file is not a valid PDF');
      return `${dl} (${buf.length} bytes)`;
    });

  } catch (e) {
    report.fatal = String(e.stack || e);
    console.error('FATAL', e);
  }

  report.finishedAt = new Date().toISOString();
  const out = path.resolve('scratch/edit_audit_report.json');
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  const fails = report.steps.filter((s) => !s.ok);
  console.log('\n══════════════════════════════════════════');
  console.log(`steps: ${report.steps.length}  fail: ${fails.length}  consoleErrors: ${report.consoleErrors.length}  pageErrors: ${report.pageErrors.length}  warnings: ${report.warnings.length}`);
  if (fails.length) console.log('FAILED STEPS:\n' + fails.map((f) => `  - ${f.name}: ${f.error}`).join('\n'));
  if (report.consoleErrors.length) console.log('CONSOLE ERRORS (first 12):\n' + report.consoleErrors.slice(0, 12).map((e) => '  ' + e.slice(0, 220)).join('\n'));
  if (report.pageErrors.length) console.log('PAGE ERRORS (first 12):\n' + report.pageErrors.slice(0, 12).map((e) => '  ' + e.slice(0, 220)).join('\n'));
  console.log('report: ' + out + '\nscreenshots: ' + SHOT_DIR);
  await browser.close();
})().catch((e) => { console.error('FATAL', e); process.exit(1); });

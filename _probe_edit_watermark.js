/* Watermark studio probe — Phases 1-3. */
const puppeteer = require('puppeteer-core');
const path = require('path');
const PDF = path.resolve('benchmark/samples/_mixed_fixture.pdf');
const IMG = path.resolve('assets/showcase_puppy.jpg');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function openEditor(browser, file) {
  const page = await browser.newPage();
  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 200));
    else if (/wm-gesture|wm-down/.test(m.text())) console.log('GESTURE', m.text().slice(0, 200));
  });
  page.on('pageerror', (e) => errors.push('pageerror: ' + String(e.message).slice(0, 200)));
  await page.goto('http://127.0.0.1:8123/#app/edit', { waitUntil: 'networkidle2', timeout: 45000 });
  await page.waitForSelector('#etxt-inp', { timeout: 15000 });
  (await page.$('#etxt-inp')).uploadFile(file);
  await page.waitForSelector('.etxt-shell', { timeout: 30000 });
  await sleep(2200);
  return { page, errors };
}

const wmState = (page) => page.evaluate(() => {
  const draft = document.querySelector('.etxt-wm-item.is-draft');
  const committed = document.querySelectorAll('.etxt-wm-item:not(.is-draft):not(.is-ghost)');
  return {
    panel: !!document.getElementById('etxt-wm-panel'),
    draft: !!draft,
    draftLeft: draft ? draft.style.left : null,
    draftTop: draft ? draft.style.top : null,
    draftFont: draft ? draft.style.fontSize : null,
    draftTransform: draft ? draft.style.transform : null,
    draftColor: draft ? draft.style.color : null,
    handles: document.querySelectorAll('.etxt-wm-handle').length,
    ghosts: document.querySelectorAll('.etxt-wm-item.is-ghost').length,
    committed: committed.length,
    listRows: document.querySelectorAll('.etxt-wm-listrow').length,
  };
});

async function exportBlob(page) {
  await page.$eval('#etxt-finish', (el) => el.click());
  let ready = false;
  for (let i = 0; i < 60; i++) { ready = await page.evaluate(() => !!document.getElementById('org-main-dl-btn')); if (ready) break; await sleep(500); }
  if (!ready) throw new Error('export result never appeared');
  return page.evaluate(async () => {
    const hook = window._ffLastResult;
    if (!hook || !hook.blob) return null;
    return Array.from(new Uint8Array(await hook.blob.arrayBuffer()));
  });
}

async function inspect(page, bytes) {
  return page.evaluate(async (arr) => {
    const L = window.PDFLib;
    const data = new Uint8Array(arr);
    const doc = await L.PDFDocument.load(data.slice());
    const out = { pages: doc.getPageCount(), contents: [], xobjects: [] };
    for (let i = 0; i < doc.getPageCount(); i++) {
      const p = doc.getPage(i);
      const c = p.node.Contents();
      const streams = c && c.asArray ? c.asArray() : [c];
      const first = streams[0];
      let txt = '';
      try { txt = String(await doc.context.lookup(first).getContents()); } catch { /* compressed */ }
      out.contents.push({ streams: streams.length, hasWmFont: /WmF\d/.test(txt), hasWmImage: /WmI\d/.test(txt) });
      let xo = null;
      try { xo = p.node.Resources() && p.node.Resources().lookup(L.PDFName.of('XObject')); } catch { /* noop */ }
      out.xobjects.push(xo && xo.keys ? xo.keys().length : 0);
    }
    return out;
  }, bytes);
}

async function extractText(page, bytes) {
  return page.evaluate(async (arr) => {
    if (!window.pdfjsLib) await window.FF.util.loadScript('vendor/pdfjs.min.js');
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js';
    const doc = await window.pdfjsLib.getDocument({ data: new Uint8Array(arr).slice() }).promise;
    const pages = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const pg = await doc.getPage(i);
      const tc = await pg.getTextContent();
      const items = tc.items.filter((it) => it.str && it.str.trim());
      pages.push({
        wm: items.filter((it) => /CONFIDENTIAL/.test(it.str)).length,
        first: items.find((it) => /CONFIDENTIAL/.test(it.str)) || null,
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

  // ── A. Studio basics, drag, apply, export text ──
  {
    const { page, errors } = await openEditor(browser, PDF);
    await page.click('#etxt-tb-watermark');
    await sleep(600);
    console.log('[A1 open studio]', JSON.stringify(await wmState(page)));

    await page.$eval('#etxt-wm-text', (el) => { el.value = 'CONFIDENTIAL'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.select('#etxt-wm-font', 'serif');
    await page.click('#etxt-wm-bold');
    await page.$eval('#etxt-wm-size', (el) => { el.value = '64'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.$eval('#etxt-wm-op', (el) => { el.value = '35'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.$eval('#etxt-wm-rot', (el) => { el.value = '-25'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.click('.etxt-wm-cell[data-wmpos="0,0"]');
    await sleep(400);
    const styled = await wmState(page);
    console.log('[A2 styled]', JSON.stringify(styled));

    // drag the draft on the page
    const item = await page.$('.etxt-wm-item.is-draft');
    const ib = await item.boundingBox();
    await page.mouse.move(ib.x + ib.width / 2, ib.y + ib.height / 2);
    await page.mouse.down();
    await page.mouse.move(ib.x + ib.width / 2 + 160, ib.y + ib.height / 2 + 120, { steps: 12 });
    await page.mouse.up();
    await sleep(400);
    const dragged = await wmState(page);
    console.log('[A3 dragged]', JSON.stringify({ left: dragged.draftLeft, top: dragged.draftTop }));

      const footRules = await page.evaluate(() => {
        const foot = document.querySelector('.etxt-wm-foot');
        const hits = [];
        const scan = (rules, media) => {
          for (const rule of rules) {
            if (rule.cssRules) { scan(rule.cssRules, rule.conditionText || media); continue; }
            if (!rule.selectorText) continue;
            try {
              if (foot.matches(rule.selectorText) && /display/.test(rule.style.cssText)) hits.push((media ? '@media ' + media + ' ' : '') + rule.selectorText + ' { ' + rule.style.cssText + ' }');
            } catch { /* noop */ }
          }
        };
        for (const sheet of document.styleSheets) {
          try { scan(sheet.cssRules, ''); } catch { /* noop */ }
        }
        return { hits: hits.slice(0, 12) };
      });
      console.log('[A3c foot rules]', JSON.stringify(footRules));
      const footDiag = await page.evaluate(() => {
        const foot = document.querySelector('.etxt-wm-foot');
        let ruleFound = false, ruleText = '';
        for (const s of document.styleSheets) {
          try {
            for (const r of s.cssRules) {
              if (r.cssText && r.cssText.includes('.etxt-wm-foot')) { ruleFound = true; ruleText = r.cssText.slice(0, 120); break; }
            }
          } catch { /* noop */ }
        }
        return {
          matches: foot ? foot.matches('.etxt-wm-foot') : null,
          attrs: foot ? foot.getAttributeNames() : null,
          ruleFound, ruleText,
          inlineDisplay: foot ? foot.style.display : null,
          computed: foot ? getComputedStyle(foot).display : null,
          sheets: document.styleSheets.length,
        };
      });
      console.log('[A3d foot diag]', JSON.stringify(footDiag));
      const btnInfo = await page.evaluate(() => {
        const p = document.getElementById('etxt-wm-panel');
        const b = document.querySelector('#etxt-wm-apply');
        const foot = document.querySelector('.etxt-wm-foot');
        const r = (el) => { const x = el && el.getBoundingClientRect(); return x && [Math.round(x.x), Math.round(x.y), Math.round(x.width), Math.round(x.height)]; };
        const cs = b && getComputedStyle(b);
        return {
          exists: !!b,
          panel: r(p), foot: r(foot),
          button: r(b),
          buttonCS: cs && { display: cs.display, height: cs.height, position: cs.position, flex: cs.flex, padding: cs.padding, visibility: cs.visibility, opacity: cs.opacity },
          buttonText: b && JSON.stringify(b.textContent),
          offset: b && [b.offsetWidth, b.offsetHeight],
          footHiddenAncestor: foot ? (foot.closest('[hidden]') ? foot.closest('[hidden]').className : null) : null,
          footComputed: foot && { display: getComputedStyle(foot).display, height: getComputedStyle(foot).height, position: getComputedStyle(foot).position },
          footOffset: foot && [foot.offsetWidth, foot.offsetHeight],
          footParent: foot && foot.parentElement.className,
        };
      });
    console.log('[A3b apply-btn]', JSON.stringify(btnInfo));
    await page.click('#etxt-wm-apply');
    await sleep(500);
    console.log('[A4 applied]', JSON.stringify(await wmState(page)));
    await page.screenshot({ path: 'audit_screenshots/edit/wm-applied.png' });

    const bytes = await exportBlob(page);
    const info = await inspect(page, bytes);
    const text = await extractText(page, bytes);
    console.log('[A5 export]', JSON.stringify({ info, text: text.map((t) => ({ wm: t.wm, x: t.first && Math.round(t.first.transform[4]), y: t.first && Math.round(t.first.transform[5]) })) }));
    console.log('[A6 errors]', errors.length ? errors : 'none');
    allErrors.push(...errors);
    await page.close();
  }

  // ── B. Scope (odd), tile, under-layer, templates, image ──
  {
    const { page, errors } = await openEditor(browser, PDF);

    // Odd-pages text watermark
    await page.click('#etxt-tb-watermark');
    await sleep(500);
    await page.$eval('#etxt-wm-text', (el) => { el.value = 'ODDSCOPE'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.select('#etxt-wm-scope', 'odd');
    await sleep(300);
    await page.click('#etxt-wm-apply');
    await sleep(400);

    // Tiled watermark
    await page.click('#etxt-tb-watermark');
    await sleep(500);
    await page.$eval('#etxt-wm-text', (el) => { el.value = 'TILED'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.select('#etxt-wm-mode', 'tile');
    await sleep(300);
    await page.click('#etxt-wm-apply');
    await sleep(400);

    // Under-layer watermark
    await page.click('#etxt-tb-watermark');
    await sleep(500);
    await page.$eval('#etxt-wm-text', (el) => { el.value = 'BEHIND'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.select('#etxt-wm-layer', 'under');
    await sleep(300);
    await page.click('#etxt-wm-apply');
    await sleep(400);

    // Template save + apply
    await page.click('#etxt-tb-watermark');
    await sleep(500);
    await page.$eval('#etxt-wm-text', (el) => { el.value = 'TPLWORD'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.$eval('#etxt-wm-op', (el) => { el.value = '50'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.click('#etxt-wm-tpl-save');
    await sleep(200);
    await page.$eval('#etxt-wm-tpl-name', (el) => { el.value = 'Audit template'; });
    await page.click('#etxt-wm-tpl-save');
    await sleep(300);
    const tplCount = await page.$$eval('#etxt-wm-tpl option', (o) => o.length);
    console.log('[B1 template saved] options=', tplCount);
    await page.click('#etxt-wm-cancel');
    await sleep(300);

    // Reopen, clear, apply the template
    await page.click('#etxt-tb-watermark');
    await sleep(400);
    await page.$eval('#etxt-wm-text', (el) => { el.value = 'CLEARED'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.$eval('#etxt-wm-op', (el) => { el.value = '10'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    const tplSelect = await page.$('#etxt-wm-tpl');
    if (tplSelect) await page.select('#etxt-wm-tpl', '0');
    await page.click('#etxt-wm-tpl-apply');
    await sleep(400);
    const tplApplied = await page.evaluate(() => ({
      text: document.getElementById('etxt-wm-text')?.value,
      op: document.getElementById('etxt-wm-op')?.value,
    }));
    console.log('[B1b template applied]', JSON.stringify(tplApplied));
    await page.click('#etxt-wm-cancel');
    await sleep(300);

    // Range + even scope watermarks
    await page.click('#etxt-tb-watermark');
    await sleep(400);
    await page.$eval('#etxt-wm-text', (el) => { el.value = 'RANGEWM'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.select('#etxt-wm-scope', 'range');
    await sleep(200);
    await page.$eval('#etxt-wm-range', (el) => { el.value = '2'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.click('#etxt-wm-apply');
    await sleep(400);
    await page.click('#etxt-tb-watermark');
    await sleep(400);
    await page.$eval('#etxt-wm-text', (el) => { el.value = 'EVENWM'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.select('#etxt-wm-scope', 'even');
    await page.click('#etxt-wm-apply');
    await sleep(400);
    // Reopen to count the applied-watermark list rows
    await page.click('#etxt-tb-watermark');
    await sleep(400);
    const listRows = await page.$$eval('.etxt-wm-listrow', (r) => r.length);
    console.log('[B1c list rows]', listRows);
    // Undo the last watermark
    await page.keyboard.press('Escape');
    await sleep(300);
    await page.keyboard.down('Control'); await page.keyboard.press('KeyZ'); await page.keyboard.up('Control');
    await sleep(500);
    const afterUndo = await page.evaluate(() => document.querySelectorAll('.etxt-wm-item:not(.is-draft):not(.is-ghost)').length);
    console.log('[B1d after undo committed previews]', afterUndo);

    const bytes = await exportBlob(page);
    const info = await inspect(page, bytes);
    const text = await extractText(page, bytes);
    console.log('[B2 export]', JSON.stringify({
      pages: info.pages,
      under: info.contents.map((c) => c.hasWmFont),
      streams: info.contents.map((c) => c.streams),
      pageText: text.map((t) => ({ tiled: (t.first ? 1 : 0), total: null })),
    }));
    // Count per-page occurrences of each marker
    const counts = await page.evaluate(async (arr) => {
      if (!window.pdfjsLib) await window.FF.util.loadScript('vendor/pdfjs.min.js');
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js';
      const doc = await window.pdfjsLib.getDocument({ data: new Uint8Array(arr).slice() }).promise;
      const out = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const tc = await (await doc.getPage(i)).getTextContent();
        const s = tc.items.map((it) => it.str).join(' ');
        out.push({
          odds: (s.match(/ODDSCOPE/g) || []).length,
          tiled: (s.match(/TILED/g) || []).length,
          behind: (s.match(/BEHIND/g) || []).length,
          range: (s.match(/RANGEWM/g) || []).length,
        });
      }
      return out;
    }, bytes);
    console.log('[B3 marker counts]', JSON.stringify(counts));
    console.log('[B4 errors]', errors.length ? errors : 'none');
    allErrors.push(...errors);
    await page.close();
  }

  // ── C. Handles rotate/resize, ghosts, image watermark ──
  {
    const { page, errors } = await openEditor(browser, PDF);
    await page.$eval('#etxt-fzoom-slider', (el) => { el.value = '50'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    await sleep(600);
    await page.click('#etxt-tb-watermark');
    await sleep(600);
    const before = await wmState(page);

    // rotate handle
    const rot = await page.$('.etxt-wm-handle--rot');
    const rb = await rot.boundingBox();
    await page.mouse.move(rb.x + rb.width / 2, rb.y + rb.height / 2);
    await page.mouse.down();
    await page.mouse.move(rb.x + 120, rb.y + 60, { steps: 10 });
    await page.mouse.up();
    await sleep(300);
    const rotVal = await page.$eval('#etxt-wm-rot', (el) => el.value);

    // resize handle — drag outward along the center→handle vector
    const draftItem = await page.$('.etxt-wm-item.is-draft');
    const dib = await draftItem.boundingBox();
    const dcx = dib.x + dib.width / 2, dcy = dib.y + dib.height / 2;
    const size = await page.$('.etxt-wm-handle--size');
    const sb = await size.boundingBox();
    const hx = sb.x + sb.width / 2, hy = sb.y + sb.height / 2;
    const vx = hx - dcx, vy = hy - dcy;
    const vlen = Math.hypot(vx, vy) || 1;
    const sizeBefore = await page.$eval('#etxt-wm-size', (el) => el.value);
    const hitInfo = await page.evaluate(({ x, y }) => {
      const el = document.elementFromPoint(x, y);
      return { at: el ? el.className || el.tagName : null };
    }, { x: hx, y: hy });
    console.log('[C1b size-handle]', JSON.stringify({ bbox: [Math.round(sb.x), Math.round(sb.y), Math.round(sb.width), Math.round(sb.height)], center: [Math.round(hx), Math.round(hy)], hit: hitInfo.at, item: [Math.round(dib.x), Math.round(dib.y), Math.round(dib.width), Math.round(dib.height)] }));
    await page.mouse.move(hx, hy);
    await page.mouse.down();
    await page.mouse.move(hx + (vx / vlen) * 90, hy + (vy / vlen) * 90, { steps: 12 });
    await page.mouse.up();
    await sleep(300);
    const sizeVal = await page.$eval('#etxt-wm-size', (el) => el.value);
    const after = await wmState(page);
    console.log('[C1 handles] rotation=', rotVal, 'size:', sizeBefore, '->', sizeVal, 'ghosts=', after.ghosts, 'handles=', before.handles);

    // image watermark
    await page.$eval('#etxt-wm-tab-image', () => {}).catch(() => {});
    await page.click('.etxt-wm-tab[data-wmtab="image"]');
    await sleep(300);
    const inp = await page.$('#etxt-wm-img-inp');
    await inp.uploadFile(IMG);
    await sleep(1200);
    const imgState = await page.evaluate(() => ({
      thumb: !document.getElementById('etxt-wm-thumb')?.hidden,
      imgItem: !!document.querySelector('.etxt-wm-item--img.is-draft'),
    }));
    console.log('[C2 image]', JSON.stringify(imgState));
    await page.click('#etxt-wm-apply');
    await sleep(500);
    const bytes = await exportBlob(page);
    const info = await inspect(page, bytes);
    console.log('[C3 image export]', JSON.stringify({ xobjects: info.xobjects }));
    await page.screenshot({ path: 'audit_screenshots/edit/wm-image.png' });
    console.log('[C4 errors]', errors.length ? errors : 'none');
    allErrors.push(...errors);
    await page.close();
  }

  console.log('TOTAL ERRORS:', allErrors.length ? allErrors.slice(0, 8) : 'none');
  await browser.close();
})().catch((e) => { console.error('FATAL', e); process.exit(1); });

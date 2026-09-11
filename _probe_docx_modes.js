const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  const logs = [];
  page.on('console', m => logs.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', e => logs.push(`[PAGEERROR] ${e.message}`));

  await page.goto('http://127.0.0.1:8000/#app/convert', { waitUntil: 'networkidle2', timeout: 40000 });
  await new Promise(r => setTimeout(r, 2500));

  const fileInput = await page.$('#app-tool-stage input[type=file]');
  if (!fileInput) { console.log('NO FILE INPUT'); await browser.close(); return; }
  await fileInput.uploadFile('C:\\Users\\shahr\\Downloads\\Filekit1\\test_sample.pdf');
  await new Promise(r => setTimeout(r, 4000));

  const uiCheck = await page.evaluate(() => {
    const modes = document.querySelector('#conv-docx-modes');
    return {
      modesPresent: !!modes,
      cards: modes ? [...modes.querySelectorAll('.conv-docx-mode-card')].map(c => c.dataset.mode + (c.classList.contains('active') ? ':active' : '')) : [],
      gearPresent: !!document.querySelector('#conv-gear-btn'),
      runLabel: document.querySelector('#conv-run .conv-btn-normal-content span')?.textContent
    };
  });
  console.log('UI CHECK:', JSON.stringify(uiCheck));

  const syncCheck = await page.evaluate(() => {
    const card = document.querySelector('#conv-docx-modes .conv-docx-mode-card[data-mode="exact"]');
    if (card) card.click();
    const sel = document.querySelector('#cfg-mode');
    const active = document.querySelector('#conv-docx-modes .conv-docx-mode-card.active')?.dataset.mode;
    return { selectSyncedTo: sel ? sel.value : null, activeCard: active };
  });
  console.log('SYNC CHECK:', JSON.stringify(syncCheck));

  const engineResults = await page.evaluate(async () => {
    const bytes = new Uint8Array(await (await fetch('test_sample.pdf')).arrayBuffer());
    const file = new File([bytes], 'test_sample.pdf', { type: 'application/pdf' });
    const reg = window.FF.registry.get('pdf-to-word');
    const out = {};
    for (const mode of ['editable', 'exact', 'picture']) {
      try {
        const r = await reg.run({ file, inputs: { mode }, onProgress: () => {} });
        const ab = new Uint8Array(await r.blob.arrayBuffer());
        const files = window.fflate.unzipSync(ab);
        const docXml = new TextDecoder().decode(files['word/document.xml']);
        out[mode] = {
          name: r.filename, size: ab.length, entries: Object.keys(files),
          hasTbx: docXml.includes('txbxContent'), hasAnchor: docXml.includes('<wp:anchor'),
          hasBlip: docXml.includes('<a:blip'), hasStyle: docXml.includes('w:pStyle'),
          hasTable: docXml.includes('<w:tbl>'), hasLink: docXml.includes('w:hyperlink'),
          hasSectPr: docXml.includes('<w:sectPr'),
          mediaCount: Object.keys(files).filter(k => k.startsWith('word/media/')).length,
          fontTable: files['word/fontTable.xml'] ? new TextDecoder().decode(files['word/fontTable.xml']).slice(0, 220) : null,
          err: null
        };
      } catch (e) {
        out[mode] = { ERR: String(e && e.message || e).slice(0, 200) };
      }
    }
    return out;
  });
  console.log('ENGINE RESULTS:', JSON.stringify(engineResults, null, 2));

  // Real-world PDF with an embedded font + ruled table: Chrome print-to-PDF.
  const docPage = await browser.newPage();
  await docPage.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
    body { font-family: Arial, Helvetica, sans-serif; margin: 40px; }
    h1 { font-size: 26px; }
    table { border-collapse: collapse; width: 100%; }
    td, th { border: 1px solid #666; padding: 8px; font-size: 12px; }
  </style></head><body>
    <h1>Quarterly Report</h1>
    <p>Acme Corp — Q3 revenue and expenses summary.</p>
    <table><tr><th>Item</th><th>Q3</th><th>Q4</th></tr>
    <tr><td>Revenue</td><td>120,000</td><td>145,000</td></tr>
    <tr><td>Costs</td><td>40,000</td><td>47,000</td></tr></table>
    <p>Notes prepared by finance. Confidential.</p>
  </body></html>`, { waitUntil: 'load' });
  const pdfBuffer = await docPage.pdf({ format: 'A4', printBackground: true });
  const pdfB64 = Buffer.from(pdfBuffer).toString('base64');
  console.log('RT PDF:', pdfBuffer.length, 'bytes, b64 len', pdfB64.length, 'head', pdfB64.slice(0, 8));
  await docPage.close();

  const fontTableResult = await page.evaluate(async ({ pdfB64 }) => {
    const bin = atob(pdfB64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const file = new File([bytes], 'report.pdf', { type: 'application/pdf' });
    const reg = window.FF.registry.get('pdf-to-word');
    const r = await reg.run({ file, inputs: { mode: 'editable' }, onProgress: () => {} });
    const ab = new Uint8Array(await r.blob.arrayBuffer());
    const files = window.fflate.unzipSync(ab);
    const docXml = new TextDecoder().decode(files['word/document.xml']);
    const ft = files['word/fontTable.xml'] ? new TextDecoder().decode(files['word/fontTable.xml']) : null;
    return {
      outputKB: Math.round(ab.length / 1024),
      fontEntries: Object.keys(files).filter(k => k.startsWith('word/font')) .map(k => k + ':' + Math.round(files[k].length / 1024) + 'KB'),
      fontTableOK: ft ? ft.includes('w:embedRegular') && ft.includes('fontKey') && ft.includes('w:font') : false,
      hasRfonts: docXml.includes('w:rFonts'),
      rfontsSample: (docXml.match(/<w:rFonts[^>]*>/g) || []).slice(0, 3),
      hasTable: docXml.includes('<w:tbl>'),
      hasHeading: docXml.includes('w:pStyle w:val="Heading'),
      mediaCount: Object.keys(files).filter(k => k.startsWith('word/media/')).length
    };
  }, { pdfB64 });
  console.log('FONT/TABLE RESULT:', JSON.stringify(fontTableResult, null, 2));

  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
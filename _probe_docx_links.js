const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu']
  });
  const page = await browser.newPage();
  const logs = [];
  page.on('console', m => logs.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', e => logs.push(`[PAGEERROR] ${e.message}`));
  await page.goto('http://127.0.0.1:8000/#app/convert', { waitUntil: 'networkidle2', timeout: 40000 });
  await new Promise(r => setTimeout(r, 1500));

  // PDF with internal + external links, a colspan table, borderless table
  const docPage = await browser.newPage();
  await docPage.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    table { border-collapse: collapse; width: 100%; }
    td, th { border: 1px solid #666; padding: 8px; font-size: 12px; }
    .b { border-collapse: separate; }
    .b td, .b th { border: none; }
  </style></head><body>
    <h1>Report</h1>
    <p><a href="https://example.com/external">External link</a> and <a href="#sec2">internal link</a> here.</p>
    <table><tr><th colspan="2">Merged Header</th><th>Value</th></tr>
    <tr><td>Revenue</td><td>120,000</td><td>+12%</td></tr>
    <tr><td>Costs</td><td>40,000</td><td>-4%</td></tr></table>
    <h2 id="sec2">Section Two</h2>
    <p>Target of the internal link. Lorem ipsum dolor sit amet.</p>
    <table class="b"><tr><th>Item</th><th>A</th><th>B</th></tr>
    <tr><td>Alpha</td><td>1</td><td>2</td></tr>
    <tr><td>Beta</td><td>3</td><td>4</td></tr></table>
  </body></html>`, { waitUntil: 'networkidle0' });
  const pdfBuf = await docPage.pdf({ format: 'A4', printBackground: true });
  await docPage.close();

  const res = await page.evaluate(async (b64) => {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const file = new File([bytes], 'links.pdf', { type: 'application/pdf' });
    const reg = window.FF.registry.get('pdf-to-word');
    const out = {};
    for (const mode of ['editable', 'picture']) {
      const r = await reg.run({ file, inputs: { mode }, onProgress: () => {} });
      const ab = new Uint8Array(await r.blob.arrayBuffer());
      const files = window.fflate.unzipSync(ab);
      const docXml = new TextDecoder().decode(files['word/document.xml']);
      out[mode] = {
        previewFlag: r.preview,
        externalHref: (docXml.match(/w:hyperlink[^>]*r:id[^>]*>/) || [])[0],
        internalAnchors: (docXml.match(/w:hyperlink w:anchor="[^"]*"/g) || []),
        bookmarkStarts: (docXml.match(/w:bookmarkStart[^>]*w:name="[^"]*"/g) || []),
        gridSpans: (docXml.match(/w:gridSpan[^>]*/g) || []).slice(0, 6),
        tblCount: (docXml.match(/<w:tbl>/g) || []).length,
        tblSamples: (docXml.match(/<w:tbl>[\s\S]{0,60}/g) || []).slice(0, 2),
        mediaCount: Object.keys(files).filter(k => k.startsWith('word/media/')).length
      };
    }
    return out;
  }, Buffer.from(pdfBuf).toString('base64'));
  console.log('LINKS/TABLE:', JSON.stringify(res, null, 2));

  // Preview render check: docx-preview + jszip load, renderAsync produces section.docx
  const prev = await page.evaluate(async (b64) => {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const reg = window.FF.registry.get('pdf-to-word');
    const r = await reg.run({ file: new File([bytes], 'preview.pdf', { type: 'application/pdf' }), inputs: { mode: 'editable' }, onProgress: () => {} });
    const root = document.createElement('div');
    root.className = 'docx-preview-container';
    document.body.appendChild(root);
    await window.FF.util.loadScript('vendor/jszip.min.js');
    if (!window.docx) await window.FF.util.loadScript('vendor/docx-preview.min.js');
    await window.docx.renderAsync(r.blob, root, null, { inWrapper: true, className: 'docx', breakPages: true });
    const sections = root.querySelectorAll('section.docx');
    const result = { previewLib: !!window.docx.renderAsync, sectionsRendered: sections.length, pageWidth: sections[0] ? Math.round(sections[0].offsetWidth) : 0, hasText: !!(sections[0] || '').textContent };
    document.body.removeChild(root);
    return result;
  }, Buffer.from(pdfBuf).toString('base64'));
  console.log('PREVIEW RENDER:', JSON.stringify(prev));
  console.log('LOGS:', logs.slice(-12).join('\n'));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
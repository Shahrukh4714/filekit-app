/* Verify the exported edited PDF: valid, text edit present, annotations present. */
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const DL_DIR = path.resolve('scratch/audit_downloads');
const file = fs.readdirSync(DL_DIR).filter((f) => /\.pdf$/i.test(f))[0];
(async () => {
  const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:8123/index.html', { waitUntil: 'networkidle2' });
  const info = await page.evaluate(async (name) => {
    const r = await fetch('scratch/audit_downloads/' + encodeURIComponent(name));
    const bytes = new Uint8Array(await r.arrayBuffer());
    if (!window.pdfjsLib) await window.FF.util.loadScript('vendor/pdfjs.min.js');
    const pdfjs = window.pdfjsLib;
    pdfjs.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js';
    const doc = await pdfjs.getDocument({ data: bytes }).promise;
    let text = '';
    for (let p = 1; p <= doc.numPages; p++) {
      const pg = await doc.getPage(p);
      const tc = await pg.getTextContent();
      text += tc.items.map((i) => i.str).join(' ') + '\n';
    }
    const pg1 = await doc.getPage(1);
    const annots = await pg1.getAnnotations();
    return {
      size: bytes.length,
      pages: doc.numPages,
      hasAuditEdit: /AUDIT-EDIT/.test(text),
      hasVector: /Vector/.test(text),
      annotSubtypes: annots.map((a) => a.subtype),
    };
  }, file);
  console.log(file, JSON.stringify(info));
  await browser.close();
})().catch((e) => { console.error('FATAL', e); process.exit(1); });

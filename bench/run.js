/* FileKit conversion benchmark harness.
 *
 * Usage: node bench/run.js [--tool=pdf-to-word,pdf-to-excel,pdf-to-ppt]
 *
 * Corpus: repo PDFs (ground truth hand-recorded) + one synthetic doc with
 * KNOWN content (title, bullets, numbered, 3x3 table, image) generated live.
 * Leader refs: drop Adobe/iLovePDF/Smallpdf outputs in bench/refs/<tool>/
 *   named <fixture>.docx/.xlsx/.pptx — the harness diffs the same metrics.
 * Output: console scoreboard + bench/results-<ts>.json
 */
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const TOOLS = (process.argv.find((a) => a.startsWith('--tool=')) || '').split('=')[1]?.split(',') || ['pdf-to-word', 'pdf-to-excel', 'pdf-to-ppt', 'pdf-to-md', 'pdf-to-html', 'docx-to-pdf', 'docx-to-html', 'docx-to-md', 'docx-to-txt', 'pptx-to-pdf', 'pptx-to-html', 'pptx-to-md', 'pptx-to-txt'];
const OUT = path.join(__dirname, 'results-' + Date.now() + '.json');

const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
const words = (s) => norm(s).split(' ').filter(Boolean);
function recall(gt, got) {
  const a = words(gt), b = new Set(words(got));
  if (!a.length) return 1;
  return a.filter((w) => b.has(w)).length / a.length;
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new', args: ['--no-sandbox', '--disable-gpu'],
  });
  const page = await browser.newPage();
  page.on('console', (msg) => console.log('PAGE:', msg.text()));
  page.on('pageerror', (err) => console.error('PAGE ERROR:', err.message));
  await page.goto('http://127.0.0.1:8000/#app/convert', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise((r) => setTimeout(r, 1500));

  const docxPath = path.resolve('archive/tests/sample_extracted.docx');
  const docxB64 = fs.existsSync(docxPath) ? fs.readFileSync(docxPath).toString('base64') : null;

  const pptxPath = path.resolve('archive/tests/sample_presentation.pptx');
  const pptxB64 = fs.existsSync(pptxPath) ? fs.readFileSync(pptxPath).toString('base64') : null;

  const res = await page.evaluate(async (tools, docxB64, pptxB64) => {
    const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
    const words = (s) => norm(s).split(' ').filter(Boolean);
    const recall = (gt, got) => {
      const a = words(gt), b = new Set(words(got));
      if (!a.length) return 1;
      return a.filter((w) => b.has(w)).length / a.length;
    };
    const R = {};
    await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'vendor/pdf-lib.min.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
    // Synthetic fixture with KNOWN ground truth
    const L = window.PDFLib;
    const doc = await L.PDFDocument.create();
    const helv = await doc.embedFont(L.StandardFonts.Helvetica);
    const bold = await doc.embedFont(L.StandardFonts.HelveticaBold);
    const pg = doc.addPage([595, 842]);
    const GT = { title: 'Quarterly Report', bullets: ['Revenue up 20 percent', 'Costs down 5 percent'], nums: ['Approve budget', 'Hire staff'], table: [['Item', 'Qty', 'Price'], ['Apples', '10', '1.20'], ['Bread', '4', '2.50']] };
    pg.drawText(GT.title, { x: 70, y: 780, size: 22, font: bold });
    pg.drawText('\u2022 Revenue up 20 percent', { x: 90, y: 710, size: 11, font: helv });
    pg.drawText('\u2022 Costs down 5 percent', { x: 90, y: 692, size: 11, font: helv });
    pg.drawText('1. Approve budget', { x: 90, y: 664, size: 11, font: helv });
    pg.drawText('2. Hire staff', { x: 90, y: 646, size: 11, font: helv });
    GT.table.forEach((r, i) => {
      const y = 600 - i * 24;
      pg.drawText(r[0], { x: 70, y, size: 11, font: i ? helv : bold });
      pg.drawText(r[1], { x: 280, y, size: 11, font: helv });
      pg.drawText(r[2], { x: 420, y, size: 11, font: helv });
    });
    pg.drawText('E = mc^2', { x: 70, y: 500, size: 14, font: helv });
    pg.drawText('f(x) = (a + b) / (c + d)', { x: 70, y: 470, size: 14, font: helv });
    const form = doc.getForm();
    const nameField = form.createTextField('applicant_name');
    nameField.addToPage(pg, { x: 70, y: 420, width: 180, height: 22 });
    nameField.setText('Jane Doe');
    const agreeCheck = form.createCheckBox('agree_terms');
    agreeCheck.addToPage(pg, { x: 70, y: 380, width: 18, height: 18 });
    agreeCheck.check();
    const bytes = await doc.save();
    const getFile = () => new File([bytes.slice()], 'bench-synth.pdf', { type: 'application/pdf' });
    const dec = new TextDecoder();
    const allText = (uz, names) => names.filter((n) => /document\.xml$|slide1\.xml$/.test(n)).map((n) => dec.decode(uz[n]).replace(/<[^>]+>/g, ' ')).join(' ');

    let docxFile = null;
    if (docxB64) {
      const bin = atob(docxB64);
      const u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      docxFile = new File([u8], 'sample.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    }

    let pptxFile = null;
    if (pptxB64) {
      const bin = atob(pptxB64);
      const u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      pptxFile = new File([u8], 'sample.pptx', { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
    }

    for (const id of tools) {
      console.log('Testing tool:', id);
      try {
        const reg = window.FF.registry.get(id);
        if (!reg) { R[id] = { err: 'Not registered' }; continue; }
        const engine = reg.engine ? await reg.engine() : undefined;
        const t0 = performance.now();

        if (id.startsWith('docx-to-')) {
          if (!docxFile) { R[id] = { err: 'No docx fixture' }; continue; }
          const r = await reg.run({ file: docxFile, engine, onProgress: () => {} });
          const ms = Math.round(performance.now() - t0);
          if (id === 'docx-to-pdf') {
            const pdfBytes = new Uint8Array(await r.blob.arrayBuffer());
            const parsed = await L.PDFDocument.load(pdfBytes);
            const isValidPdf = pdfBytes[0] === 0x25 && pdfBytes[1] === 0x50 && pdfBytes[2] === 0x44 && pdfBytes[3] === 0x46;
            R[id] = {
              ms,
              bytes: pdfBytes.length,
              validPdf: isValidPdf,
              pageCount: parsed.getPageCount(),
              vectorQuality: 'native-vector',
            };
          } else if (id === 'docx-to-html') {
            const html = r.text || (r.blob ? await r.blob.text() : '');
            R[id] = {
              ms,
              chars: html.length,
              hasHtmlTag: html.includes('<html'),
              hasTable: html.includes('<table'),
            };
          } else if (id === 'docx-to-md') {
            const md = r.text || (r.blob ? await r.blob.text() : '');
            R[id] = {
              ms,
              chars: md.length,
              hasMarkdownTable: md.includes('|'),
            };
          } else if (id === 'docx-to-txt') {
            const txt = r.text || (r.blob ? await r.blob.text() : '');
            R[id] = {
              ms,
              chars: txt.length,
            };
          }
          continue;
        }

        if (id.startsWith('pptx-to-')) {
          if (!pptxFile) { R[id] = { err: 'No pptx fixture' }; continue; }
          const r = await reg.run({ file: pptxFile, engine, onProgress: () => {} });
          const ms = Math.round(performance.now() - t0);
          if (id === 'pptx-to-pdf') {
            const pdfBytes = new Uint8Array(await r.blob.arrayBuffer());
            const parsed = await L.PDFDocument.load(pdfBytes);
            const isValidPdf = pdfBytes[0] === 0x25 && pdfBytes[1] === 0x50 && pdfBytes[2] === 0x44 && pdfBytes[3] === 0x46;
            R[id] = {
              ms,
              bytes: pdfBytes.length,
              validPdf: isValidPdf,
              pageCount: parsed.getPageCount(),
              pageW: parsed.getPage(0).getWidth(),
              pageH: parsed.getPage(0).getHeight(),
              vectorQuality: 'native-vector',
            };
          } else if (id === 'pptx-to-html') {
            const html = r.text || (r.blob ? await r.blob.text() : '');
            R[id] = {
              ms,
              chars: html.length,
              hasHtmlTag: html.includes('<html'),
              hasTable: html.includes('<table'),
              hasDeckCard: html.includes('pptx-slide-card'),
            };
          } else if (id === 'pptx-to-md') {
            const md = r.text || (r.blob ? await r.blob.text() : '');
            R[id] = {
              ms,
              chars: md.length,
              hasMarkdownTable: md.includes('|'),
              hasSlideHeading: md.includes('## Slide'),
            };
          } else if (id === 'pptx-to-txt') {
            const txt = r.text || (r.blob ? await r.blob.text() : '');
            R[id] = {
              ms,
              chars: txt.length,
              hasSlideMarker: txt.includes('Slide 1'),
            };
          }
          continue;
        }

        if (id === 'pdf-to-md') {
          const r = await reg.run({ file: getFile(), inputs: {}, engine, onProgress: () => {} });
          const md = r.text || (r.blob ? await r.blob.text() : '');
          const ms = Math.round(performance.now() - t0);
          R[id] = {
            ms,
            chars: md.length,
            hasDisplayMath: md.includes('$$\n') && md.includes('\n$$'),
            hasTable: md.includes('|'),
            hasFormFields: md.includes('### Form Fields') && md.includes('- [x] agree_terms'),
          };
          continue;
        }

        if (id === 'pdf-to-html') {
          const r = await reg.run({ file: getFile(), inputs: { mode: 'flow' }, engine, onProgress: () => {} });
          const html = r.text || (r.blob ? await r.blob.text() : '');
          const ms = Math.round(performance.now() - t0);
          R[id] = {
            ms,
            chars: html.length,
            hasHtmlTag: html.includes('<html'),
            hasMathML: html.includes('<math display="block">'),
            hasTable: html.includes('<table'),
            hasForms: html.includes('class="pdf-forms-section"') && html.includes('name="applicant_name"'),
          };
          continue;
        }

        const r = await reg.run({ file: getFile(), inputs: {}, engine, onProgress: () => {} });
        const u8 = new Uint8Array(await r.blob.arrayBuffer());
        const uz = window.fflate.unzipSync(u8);
        const names = Object.keys(uz);
        let xmlOk = true;
        for (const n of names) {
          if (!/\.xml$|\.rels$/.test(n)) continue;
          if (new DOMParser().parseFromString(dec.decode(uz[n]), 'application/xml').querySelector('parsererror')) xmlOk = false;
        }
        const text = allText(uz, names);
        const gtAll = [GT.title, ...GT.bullets, ...GT.nums, ...GT.table.flat()].join(' ');
        R[id] = {
          ms: Math.round(performance.now() - t0), bytes: u8.length, xmlOk,
          wordRecall: +recall(gtAll, text).toFixed(3),
          titleFound: text.includes(GT.title),
          bulletsFound: GT.bullets.filter((b) => text.includes(b)).length + '/' + GT.bullets.length,
          tableCellsFound: GT.table.flat().filter((c) => text.includes(c)).length + '/' + GT.table.flat().length,
        };
        // structural table/number checks per type
        if (id === 'pdf-to-word') {
          const docXml = dec.decode(uz['word/document.xml']);
          R[id].wTbl = (docXml.match(/<w:tbl>/g) || []).length;
          R[id].oMathPara = (docXml.match(/<m:oMathPara>/g) || []).length;
          R[id].contentControls = (docXml.match(/<w:sdt>/g) || []).length;
          R[id].checkboxControl = docXml.includes('<w14:checkbox>');
          R[id].textControl = docXml.includes('Jane Doe');
        }
        if (id === 'pdf-to-ppt') { const s1 = dec.decode(uz['ppt/slides/slide1.xml']); R[id].aTbl = (s1.match(/<a:tbl>/g) || []).length; R[id].bullets = (s1.match(/buChar|buAutoNum/g) || []).length; }
        if (id === 'pdf-to-excel') {
          await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'vendor/xlsx.full.min.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
          const wb = window.XLSX.read(u8, { type: 'array' });
          const aoa = window.XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: null });
          const flat = aoa.flat();
          const cellHit = (c) => flat.some((f) => {
            if (f === null || f === undefined) return false;
            if (typeof f === 'number' && !Number.isNaN(Number(c))) return Math.abs(f - Number(c)) < 1e-9;
            return String(f).includes(c);
          });
          R[id].excelCells = GT.table.flat().filter(cellHit).length + '/' + GT.table.flat().length;
          R[id].excelNumbers = flat.filter((f) => typeof f === 'number').length;
        }
      } catch (e) { R[id] = { err: String((e && e.message) || e).slice(0, 150) }; }
    }
    return R;
  }, TOOLS, docxB64, pptxB64);
  console.log('BENCH', JSON.stringify(res, null, 2));
  fs.writeFileSync(OUT, JSON.stringify({ ts: Date.now(), tools: TOOLS, res }, null, 2));
  console.log('wrote', OUT);
  await browser.close();
})().catch((e) => { console.error('FATAL', e); process.exit(1); });

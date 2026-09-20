/* Flat (non-AcroForm) form fixture with underlines and checkbox squares. */
const fs = require('fs');
const path = require('path');
const L = require(path.join(__dirname, 'vendor', 'pdf-lib.min.js'));

(async () => {
  const doc = await L.PDFDocument.create();
  const font = await doc.embedFont(L.StandardFonts.Helvetica);
  const page = doc.addPage([612, 792]);
  page.drawText('Flat Application Form', { x: 56, y: 730, size: 20, font });
  page.drawText('Name:', { x: 56, y: 680, size: 11, font });
  page.drawLine({ start: { x: 110, y: 676 }, end: { x: 420, y: 676 }, thickness: 1, color: L.rgb(0.2, 0.2, 0.2) });
  page.drawText('Email address:', { x: 56, y: 640, size: 11, font });
  page.drawText('________________________', { x: 160, y: 636, size: 11, font });
  page.drawText('Date:', { x: 56, y: 600, size: 11, font });
  page.drawLine({ start: { x: 110, y: 596 }, end: { x: 260, y: 596 }, thickness: 1, color: L.rgb(0.2, 0.2, 0.2) });
  page.drawRectangle({ x: 56, y: 556, width: 12, height: 12, borderWidth: 1.2, borderColor: L.rgb(0.2, 0.2, 0.2) });
  page.drawText('I agree to the terms', { x: 84, y: 560, size: 11, font });
  page.drawRectangle({ x: 56, y: 526, width: 12, height: 12, borderWidth: 1.2, borderColor: L.rgb(0.2, 0.2, 0.2) });
  page.drawText('Subscribe to updates', { x: 84, y: 530, size: 11, font });
  const bytes = await doc.save();
  const out = path.join(__dirname, 'benchmark', 'samples', '_flat_form_fixture.pdf');
  fs.writeFileSync(out, bytes);
  console.log('Wrote', out, bytes.length);
})().catch((e) => { console.error(e); process.exit(1); });

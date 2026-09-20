/* Generate a complete AcroForm fixture for the Edit tool forms work. */
const fs = require('fs');
const path = require('path');
const L = require(path.join(__dirname, 'vendor', 'pdf-lib.min.js'));

(async () => {
  const doc = await L.PDFDocument.create();
  const font = await doc.embedFont(L.StandardFonts.Helvetica);
  const page = doc.addPage([612, 792]);
  const page2 = doc.addPage([612, 792]);
  const form = doc.getForm();
  const label = (p, t, y) => p.drawText(t, { x: 56, y, size: 11, font });

  page.drawText('FileKit Form Fixture', { x: 56, y: 730, size: 20, font });

  label(page, 'Full name (required)', 680);
  const name = form.createTextField('full_name');
  name.addToPage(page, { x: 190, y: 672, width: 280, height: 20 });
  name.setFontSize(11);
  name.enableRequired();

  label(page, 'Notes (multiline)', 640);
  const notes = form.createTextField('notes');
  notes.addToPage(page, { x: 190, y: 580, width: 280, height: 52 });
  notes.enableMultiline();
  notes.setFontSize(10);

  label(page, 'ZIP (comb 5)', 550);
  const zip = form.createTextField('zip');
  zip.addToPage(page, { x: 190, y: 542, width: 110, height: 20 });
  zip.setMaxLength(5);
  zip.enableCombing();

  label(page, 'Readonly ID', 510);
  const ro = form.createTextField('readonly_id');
  ro.addToPage(page, { x: 190, y: 502, width: 160, height: 20 });
  ro.setText('AC-9931-X');
  ro.enableReadOnly();

  label(page, 'Subscribe', 460);
  const sub = form.createCheckBox('subscribe');
  sub.addToPage(page, { x: 190, y: 452, width: 18, height: 18 });

  label(page, 'Plan', 420);
  const plan = form.createRadioGroup('plan');
  plan.addOptionToPage('Starter', page, { x: 190, y: 408, width: 16, height: 16 });
  plan.addOptionToPage('Pro', page, { x: 300, y: 408, width: 16, height: 16 });
  plan.addOptionToPage('Enterprise', page, { x: 380, y: 408, width: 16, height: 16 });

  label(page, 'Country', 370);
  const country = form.createDropdown('country');
  country.setOptions(['India', 'United States', 'Germany', 'Japan']);
  country.addToPage(page, { x: 190, y: 362, width: 160, height: 20 });
  country.select('India');

  label(page, 'Skills (list, multi)', 320);
  const skills = form.createOptionList('skills');
  skills.setOptions(['JavaScript', 'TypeScript', 'Rust', 'Go', 'Python']);
  skills.enableMultiselect();
  skills.addToPage(page, { x: 190, y: 250, width: 160, height: 64 });

  page2.drawText('Page 2 — agreement', { x: 56, y: 730, size: 16, font });
  label(page2, 'Signature', 690);
  const agree = form.createCheckBox('agree_terms');
  agree.addToPage(page2, { x: 190, y: 682, width: 18, height: 18 });
  label(page2, 'Date', 650);
  const date = form.createTextField('date');
  date.addToPage(page2, { x: 190, y: 642, width: 140, height: 20 });

  const bytes = await doc.save({ updateFieldAppearances: true });
  const out = path.join(__dirname, 'benchmark', 'samples', '_form_fixture.pdf');
  fs.writeFileSync(out, bytes);
  console.log('Wrote', out, bytes.length, 'bytes');
})().catch((e) => { console.error(e); process.exit(1); });

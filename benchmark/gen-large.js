/* 60-page born-digital text PDF (embedded Helvetica subset-able) to time the
 * balanced tier — Phase 5 speed acceptance (~100pp <= 45s industry target). */
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new', args: ['--no-sandbox', '--disable-gpu'],
  });
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:8000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 1500));
  const b64 = await page.evaluate(async () => {
    await window.FF.util.loadScript('vendor/pdf-lib.min.js');
    const { PDFDocument, StandardFonts, rgb } = window.PDFLib;
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    for (let p = 1; p <= 60; p++) {
      const pg = doc.addPage([612, 792]);
      for (let i = 0; i < 34; i++) {
        pg.drawText(`Page ${p} line ${i + 1}: born-digital report content for parity timing measurement.`, { x: 60, y: 760 - i * 21, size: 10, font, color: rgb(0, 0, 0) });
      }
    }
    const bytes = await doc.save();
    const chunk = [];
    for (let i = 0; i < bytes.length; i += 0x8000) chunk.push(String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)));
    return btoa(chunk.join(''));
  });
  const out = path.join(__dirname, 'samples', '_large_60p.pdf');
  fs.writeFileSync(out, Buffer.from(b64, 'base64'));
  console.log('wrote', out, fs.statSync(out).size, 'bytes');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
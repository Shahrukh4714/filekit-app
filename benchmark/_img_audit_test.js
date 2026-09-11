const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

function u16be(v) { return [(v >> 8) & 255, v & 255]; }
function u32be(v) { return [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255]; }
function u32le(v) { return [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255]; }

// Minimal CMYK JPEG: SOI + SOF0(4 components) + SOS + EOI.
function cmykJpeg() {
  const comps = [];
  for (let i = 0; i < 4; i++) comps.push(i + 1, 0x11, 0);
  const sof = [0xff, 0xc0, 0x00, 0x14, 0x08, 0x00, 0x10, 0x00, 0x10, 0x04, ...comps];
  return Uint8Array.from([0xff, 0xd8, ...sof, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0xff, 0xd9]);
}

// Minimal 16-bit PNG: sig + IHDR(bitDepth 16) + IEND.
function png16bit() {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  const ihdrData = [...u32be(4), ...u32be(4), 16, 6, 0, 0, 0];
  const ihdr = [...u32be(13), ...[0x49, 0x48, 0x44, 0x52], ...ihdrData, ...u32be(0)];
  const iend = [...u32be(0), ...[0x49, 0x45, 0x4e, 0x44], ...u32be(0)];
  return Uint8Array.from([...sig, ...ihdr, ...iend]);
}

// Minimal animated WebP: RIFF/WEBP + VP8X(anim flag) + ANIM.
function animatedWebp() {
  const vp8xData = [0x02, 0, 0, 0, 3, 0, 0, 3, 0, 0]; // flags(anim), reserved, canvas 4x4 (1-based => 3)
  const vp8x = [...[0x56, 0x50, 0x38, 0x58], ...u32le(10), ...vp8xData];
  const animData = [0, 0, 0, 0, 0, 0];
  const anim = [...[0x41, 0x4e, 0x49, 0x4d], ...u32le(6), ...animData];
  const body = [...vp8x, ...anim];
  const riff = [...[0x52, 0x49, 0x46, 0x46], ...u32le(body.length + 4), ...[0x57, 0x45, 0x42, 0x50], ...body];
  return Uint8Array.from(riff);
}

const fixtures = [
  ['_a_cmyk.jpg', cmykJpeg()],
  ['_a_16bit.png', png16bit()],
  ['_a_anim.webp', animatedWebp()],
];
for (const [name, bytes] of fixtures) {
  fs.writeFileSync(path.join(__dirname, 'samples', name), Buffer.from(bytes));
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new', args: ['--no-sandbox', '--disable-gpu'],
  });
  const page = await browser.newPage();
  const cases = [
    ['benchmark/samples/_a_cmyk.jpg', 'expect PRESERVED'],
    ['benchmark/samples/_a_16bit.png', 'expect PRESERVED'],
    ['benchmark/samples/_a_anim.webp', 'expect PRESERVED'],
    ['assets/showcase_puppy.jpg', 'expect COMPRESSED'],
  ];
  for (const [rel, note] of cases) {
    const file = path.join(__dirname, '..', rel);
    const orig = fs.statSync(file).size;
    await page.goto('http://127.0.0.1:8000/index.html#app/compress', { waitUntil: 'domcontentloaded', timeout: 40000 });
    await new Promise(r => setTimeout(r, 2000));
    const input = await page.$('#app-tool-stage input[type=file]');
    await input.uploadFile(file);
    await new Promise(r => setTimeout(r, 1500));
    await page.evaluate(() => document.querySelector('.cpdf-benchmark-card[data-tier="balanced"]')?.click());
    await new Promise(r => setTimeout(r, 1500));
    await page.evaluate(() => document.querySelector('#comp-studio-run')?.click());
    let done = false;
    for (let i = 0; i < 80; i++) {
      await new Promise(r => setTimeout(r, 400));
      const t = await page.evaluate(() => document.getElementById('app-tool-stage')?.textContent || '');
      if (/Compression Complete|Already Optimized/i.test(t)) { done = true; break; }
    }
    const out = await page.evaluate(() => {
      const h = window._ffLastResult;
      return h && h.blob ? { bytes: h.blob.size, type: h.blob.type } : null;
    });
    const verdict = out && out.bytes === orig ? 'PRESERVED' : (out ? 'CHANGED' : '?');
    console.log(rel.padEnd(28), note.padEnd(20), 'orig=' + orig, 'out=' + (out ? out.bytes : '?'), 'type=' + (out ? out.type : '?'), '=> ' + verdict, 'done=' + done);
  }
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(2); });



const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'tools.js'), 'utf8');
const start = src.indexOf('const IMAGE_SOURCE_PROBE_BYTES');
const fstart = src.indexOf('function inspectRasterSource');
let depth = 0, end = -1;
for (let i = src.indexOf('{', fstart); i < src.length; i++) {
  if (src[i] === '{') depth++;
  else if (src[i] === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
}
const api = new Function(src.slice(start, end) + '\nreturn { inspectRasterSource };')();

function box(type, payload) {
  const size = 8 + payload.length;
  const b = Buffer.alloc(size);
  b.writeUInt32BE(size, 0);
  b.write(type, 4, 'ascii');
  Buffer.from(payload).copy(b, 8);
  return b;
}

function heicWith(hvcBitDepthMinus8) {
  const hvcc = Buffer.alloc(23);
  hvcc[17] = hvcBitDepthMinus8 & 0x07;
  const ipco = box('ipco', box('hvcC', hvcc));
  const iprp = box('iprp', ipco);
  const meta = box('meta', Buffer.concat([Buffer.alloc(4), iprp]));
  const ftyp = box('ftyp', Buffer.from('heic0000mif1heic', 'ascii'));
  return new Uint8Array(Buffer.concat([ftyp, meta]));
}

let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (detail ? ' -> ' + detail : '')); }
}

const hdr10 = api.inspectRasterSource(heicWith(2), 'heic');
check('10-bit HEIC is preserved', hdr10.preserve === true, JSON.stringify(hdr10));
check('reason names 10-bit HDR', /10-bit HDR/.test(hdr10.reason || ''), hdr10.reason);

const hdr8 = api.inspectRasterSource(heicWith(0), 'heic');
check('8-bit HEIC is not preserved', hdr8.preserve === false, JSON.stringify(hdr8));

console.log(`\nHEIC guard test: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

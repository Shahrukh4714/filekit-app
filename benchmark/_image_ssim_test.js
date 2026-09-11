const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'tools.js'), 'utf8');
const start = src.indexOf('function computeSsim');
if (start < 0) { console.error('computeSsim not found'); process.exit(1); }
let depth = 0, end = -1;
for (let i = src.indexOf('{', start); i < src.length; i++) {
  if (src[i] === '{') depth++;
  else if (src[i] === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
}
const computeSsim = new Function(src.slice(start, end) + '\nreturn computeSsim;')();

function fill(vals) { return Uint8Array.from(vals); }
let pass = 0, fail = 0;
function check(name, cond) { if (cond) { pass++; console.log('  ok   ' + name); } else { fail++; console.log('  FAIL ' + name); } }

const a = new Uint8Array(4096);
for (let i = 0; i < a.length; i++) a[i] = (i * 37) & 0xff;

const identical = computeSsim(a, a.slice());
check('identical planes => 1.0', Math.abs(identical - 1) < 1e-9);

const noise = a.slice();
for (let i = 0; i < noise.length; i++) noise[i] = (noise[i] + (i % 2 ? 3 : -3)) & 0xff;
const near = computeSsim(a, noise);
check('small perturbation stays high (>0.9)', near > 0.9);

const inverted = a.map(v => 255 - v);
const inv = computeSsim(a, inverted);
check('inverted plane is low (<0.5)', inv < 0.5);

const flat = new Uint8Array(a.length).fill(128);
check('two flat planes => 1.0', Math.abs(computeSsim(flat, flat.slice()) - 1) < 1e-9);
check('flat vs textured is low (<0.6)', computeSsim(flat, a) < 0.6);
check('empty planes => 1.0', computeSsim(new Uint8Array(0), new Uint8Array(0)) === 1);

console.log(`\nSSIM test: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

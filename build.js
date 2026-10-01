const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('═══════════════════════════════════════════════════════════');
console.log('  FileKit Production Asset Optimization & Minification     ');
console.log('═══════════════════════════════════════════════════════════\n');

const distJsDir = path.join(__dirname, 'dist', 'js');
const distCssDir = path.join(__dirname, 'dist', 'css');

fs.mkdirSync(distJsDir, { recursive: true });
fs.mkdirSync(distCssDir, { recursive: true });
if (fs.existsSync(path.join(__dirname, 'assets'))) {
  fs.cpSync(path.join(__dirname, 'assets'), path.join(__dirname, 'dist', 'assets'), { recursive: true });
}

const targets = [
  { in: 'js/app.js', out: 'dist/js/app.min.js' },
  { in: 'js/tools.js', out: 'dist/js/tools.min.js' },
  { in: 'js/tools-new.js', out: 'dist/js/tools-new.min.js' },
  { in: 'js/tools-premium.js', out: 'dist/js/tools-premium.min.js' },
  { in: 'js/tools-premium2.js', out: 'dist/js/tools-premium2.min.js' },
  { in: 'js/auth-license.js', out: 'dist/js/auth-license.min.js' },
  { in: 'css/styles.css', out: 'dist/css/styles.min.css' },
  { in: 'css/edit-pdf.css', out: 'dist/css/edit-pdf.min.css' },
  { in: 'css/organize-pdf.css', out: 'dist/css/organize-pdf.min.css' },
  { in: 'css/local-fonts.css', out: 'dist/css/local-fonts.min.css' }
];

let totalBefore = 0;
let totalAfter = 0;

for (const t of targets) {
  const inPath = path.join(__dirname, t.in);
  const outPath = path.join(__dirname, t.out);
  if (!fs.existsSync(inPath)) continue;

  const sizeBefore = fs.statSync(inPath).size;
  totalBefore += sizeBefore;

  execSync(`npx esbuild "${inPath}" --minify --outfile="${outPath}"`, { stdio: 'inherit' });
  const sizeAfter = fs.statSync(outPath).size;
  totalAfter += sizeAfter;

  const savings = ((1 - sizeAfter / sizeBefore) * 100).toFixed(1);
  console.log(`✓ ${t.in.padEnd(25)} ${(sizeBefore/1024).toFixed(1)} KB -> ${(sizeAfter/1024).toFixed(1)} KB (-${savings}%)`);
}

const totalSavings = ((1 - totalAfter / totalBefore) * 100).toFixed(1);
console.log('\n───────────────────────────────────────────────────────────');
console.log(`TOTAL PAYLOAD: ${(totalBefore/1024).toFixed(1)} KB -> ${(totalAfter/1024).toFixed(1)} KB (-${totalSavings}%)`);
console.log(`SAVINGS: ${((totalBefore - totalAfter)/1024).toFixed(1)} KB removed from initial bundle!`);
console.log('═══════════════════════════════════════════════════════════\n');

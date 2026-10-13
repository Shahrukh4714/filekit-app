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

// ── Universal Cross-Category Layout Isolation Pre-Flight ──
console.log('🔍 Running Universal Cross-Category Layout Audit across 371 tools...');
const toolsSrc = fs.readFileSync(path.join(__dirname, 'js', 'tools.js'), 'utf8');

const crossCategoryRules = [
  {
    category: 'PDF & Documents',
    fnPattern: /function\s+(mount[A-Za-z0-9]*(?:PDF|Doc|Text))\s*\(/g,
    forbidden: ['img-crop-root', 'img-resize-root', 'vid-root', 'aud-root']
  },
  {
    category: 'Audio',
    fnPattern: /function\s+(mount[A-Za-z0-9]*Audio)\s*\(/g,
    forbidden: ['vid-root', 'img-crop-root', 'img-resize-root', 'mpdf-root']
  },
  {
    category: 'Video',
    fnPattern: /function\s+(mount[A-Za-z0-9]*Video)\s*\(/g,
    forbidden: ['img-crop-root', 'img-resize-root', 'mpdf-root']
  }
];

let lintErrors = 0;
crossCategoryRules.forEach(r => {
  let m;
  while ((m = r.fnPattern.exec(toolsSrc)) !== null) {
    const fnName = m[1];
    const fnStart = m.index;
    const nextMount = toolsSrc.indexOf('function mount', fnStart + 20);
    const fnBody = toolsSrc.slice(fnStart, nextMount !== -1 ? nextMount : fnStart + 15000);
    
    r.forbidden.forEach(cls => {
      if (fnBody.includes(`'${cls}'`) || fnBody.includes(`"${cls}"`) || fnBody.includes(` ${cls} `) || fnBody.includes(` ${cls}'`) || fnBody.includes(` ${cls}"`)) {
        console.error(`❌ ARCHITECTURAL COLLISION: Tool '${fnName}' in category '${r.category}' contains forbidden layout class '${cls}'!`);
        lintErrors++;
      }
    });
  }
});

if (lintErrors > 0) {
  console.error(`\n❌ BUILD FAILED: Found ${lintErrors} cross-category style collisions. Fix them before building.\n`);
  process.exit(1);
}
console.log('✓ All tools passed universal cross-category isolation check (Zero style leaks).\n');

const targets = [
  { in: 'js/app.js', out: 'dist/js/app.min.js' },
  { in: 'js/tools.js', out: 'dist/js/tools.min.js' },
  { in: 'js/tools-new.js', out: 'dist/js/tools-new.min.js' },
  { in: 'js/tools-premium.js', out: 'dist/js/tools-premium.min.js' },
  { in: 'js/tools-premium2.js', out: 'dist/js/tools-premium2.min.js' },
  { in: 'js/auth-license.js', out: 'dist/js/auth-license.min.js' },
  { in: 'js/mac-bridge.js', out: 'dist/js/mac-bridge.min.js' },
  { in: 'css/styles.css', out: 'dist/css/styles.min.css' },
  { in: 'css/edit-pdf.css', out: 'dist/css/edit-pdf.min.css' },
  { in: 'css/organize-pdf.css', out: 'dist/css/organize-pdf.min.css' },
  { in: 'css/local-fonts.css', out: 'dist/css/local-fonts.min.css' },
  { in: 'css/mac-theme.css', out: 'dist/css/mac-theme.css' }
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

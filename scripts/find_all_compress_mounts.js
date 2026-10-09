const fs = require('fs');

const files = ['js/tools.js', 'js/tools-premium.js', 'js/tools-new.js'];

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  lines.forEach((l, i) => {
    if (l.includes('function mount') || l.includes('window.__ffMount')) {
      if (/compress|optimi|reduce|shrink|minify/i.test(l)) {
        console.log(`${f}:${i+1} -> ${l.trim()}`);
      }
    }
  });
});

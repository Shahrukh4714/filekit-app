const fs = require('fs');

['js/app.js', 'js/tools.js', 'js/tools-premium.js', 'js/tools-new.js'].forEach(f => {
  const c = fs.readFileSync(f, 'utf8');
  const lines = c.split('\n');
  lines.forEach((l, i) => {
    if (l.includes('function downloadBlob') || l.includes('downloadBlob =')) {
      console.log(`${f}:${i+1} -> ${l.trim()}`);
    }
  });
});

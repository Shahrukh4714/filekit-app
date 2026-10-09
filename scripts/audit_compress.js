const fs = require('fs');

const files = ['js/tools.js', 'js/tools-premium.js', 'js/tools-new.js', 'js/app.js'];

files.forEach(f => {
  if (!fs.existsSync(f)) return;
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (/tool\s*:\s*\{[^}]*compress/i.test(line) || /id\s*:\s*['"][^'"]*compress/i.test(line) || /mount.*compress/i.test(line)) {
      console.log(`${f}:${idx + 1} -> ${line.trim()}`);
    }
  });
});

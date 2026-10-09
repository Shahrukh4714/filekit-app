const fs = require('fs');
const js = fs.readFileSync('js/app.js', 'utf8');

const lines = js.split('\n');
lines.forEach((l, i) => {
  if (l.includes('data-footer-category') || l.includes('data-footer-link')) {
    console.log(`Line ${i + 1}: ${l.substring(0, 100)}`);
  }
});

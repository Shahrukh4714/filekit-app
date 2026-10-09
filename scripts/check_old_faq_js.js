const fs = require('fs');
const js = fs.readFileSync('js/app.js', 'utf8');

const matches = [...js.matchAll(/fk-faq/gi)];
console.log('Mentions of fk-faq in js/app.js:', matches.length);
matches.forEach(m => {
  const idx = m.index;
  console.log(js.substring(idx - 30, idx + 100));
});

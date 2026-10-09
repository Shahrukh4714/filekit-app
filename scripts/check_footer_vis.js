const fs = require('fs');
const js = fs.readFileSync('js/app.js', 'utf8');

const matches = [...js.matchAll(/footer/gi)];
console.log('Mentions of footer in js/app.js:');
matches.forEach(m => {
  const idx = m.index;
  console.log(js.substring(idx - 20, idx + 80).replace(/\n/g, ' '));
});

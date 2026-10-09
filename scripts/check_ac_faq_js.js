const fs = require('fs');
const js = fs.readFileSync('js/app.js', 'utf8');

const matches = [...js.matchAll(/fk-ac-faq/g)];
console.log('Mentions of fk-ac-faq in js/app.js:', matches.length);

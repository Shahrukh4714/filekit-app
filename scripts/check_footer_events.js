const fs = require('fs');
const js = fs.readFileSync('js/app.js', 'utf8');

const idx = js.indexOf('[data-category],[data-footer-category]');
console.log('Snippet around data-footer-category:');
console.log(js.substring(idx - 50, idx + 600));

const idx2 = js.indexOf('[data-footer-link]');
console.log('Snippet around data-footer-link:');
console.log(js.substring(idx2 - 50, idx2 + 600));

const fs = require('fs');
const js = fs.readFileSync('js/app.js', 'utf8');

const idx1 = js.indexOf('data-footer-category');
console.log('Snippet around data-footer-category:');
if (idx1 !== -1) console.log(js.substring(idx1 - 100, idx1 + 300));

const idx2 = js.indexOf('data-footer-link');
console.log('\nSnippet around data-footer-link:');
if (idx2 !== -1) console.log(js.substring(idx2 - 100, idx2 + 300));

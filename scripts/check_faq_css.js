const fs = require('fs');
const css = fs.readFileSync('css/styles.css', 'utf8');

const matches = [...css.matchAll(/\.fk-ac-faq-[a-zA-Z0-9_-]+\b/g)].map(m => m[0]);
const unique = [...new Set(matches)];
console.log('Unique fk-ac-faq classes in css/styles.css:', unique);

// Find where .fk-ac-faq-section is defined
const idx = css.indexOf('.fk-ac-faq-section');
console.log('css snippet around .fk-ac-faq-section:');
console.log(css.substring(idx, idx + 2000));

const fs = require('fs');
const css = fs.readFileSync('css/styles.css', 'utf8');

const start = css.indexOf('.fk-ac-faq-section');
const end = css.indexOf('/* ════════════', start);
console.log('fk-ac-faq CSS length:', end - start);
console.log(css.substring(start, start + 3000));

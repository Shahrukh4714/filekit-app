const fs = require('fs');
const css = fs.readFileSync('css/styles.css', 'utf8');

const idx = css.indexOf('.fk-section-eyebrow');
console.log('Index of .fk-section-eyebrow:', idx);
if (idx !== -1) {
  console.log(css.substring(idx, idx + 300));
}

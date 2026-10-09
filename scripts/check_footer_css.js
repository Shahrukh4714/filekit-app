const fs = require('fs');
const css = fs.readFileSync('css/styles.css', 'utf8');

const idx = css.indexOf('@media (max-width: 680px) {');
console.log(css.substring(idx, idx + 800));

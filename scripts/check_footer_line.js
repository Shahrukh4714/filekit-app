const fs = require('fs');
const css = fs.readFileSync('css/styles.css', 'utf8');

const idx = css.indexOf('.footer {');
console.log('Footer styles line number:', css.substring(0, idx).split('\n').length);
console.log('Snippet:\n', css.substring(idx, idx + 800));

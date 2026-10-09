const fs = require('fs');
const js = fs.readFileSync('js/app.js', 'utf8');

const idx = js.indexOf('function handleRoute() {');
console.log(js.substring(idx, idx + 1200));

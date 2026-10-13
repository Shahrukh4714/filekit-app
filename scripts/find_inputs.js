const fs = require('fs');
const s = fs.readFileSync('js/tools.js', 'utf8');
const regex = /<input[^>]*type=['"]file['"][^>]*>|<input[^>]*id=['"][^'"]+['"][^>]*type=['"]file['"][^>]*>/g;
const inputs = s.match(regex) || [];
console.log('Total file inputs:', inputs.length);
inputs.forEach(i => console.log(i));

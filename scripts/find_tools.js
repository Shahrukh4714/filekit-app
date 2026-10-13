const fs = require('fs');
const s = fs.readFileSync('js/tools.js', 'utf8');
const regex = /(?:window\.)?FF\.register\(\s*\{[\s\S]*?id:\s*['"]([^'"]+)['"]/g;
let m;
const tools = [];
while ((m = regex.exec(s)) !== null) {
  tools.push(m[1]);
}
console.log('Total tools registered:', tools.length);
console.log(tools);

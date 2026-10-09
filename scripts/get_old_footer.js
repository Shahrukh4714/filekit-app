const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');

const sIdx = content.indexOf('<footer class="footer"');
const eIdx = content.indexOf('</footer>', sIdx) + 9;
const oldFooter = content.substring(sIdx, eIdx);
console.log('Old Footer length:', oldFooter.length);
console.log('Old Footer starts with:', oldFooter.substring(0, 40));
console.log('Old Footer ends with:', oldFooter.substring(oldFooter.length - 40));

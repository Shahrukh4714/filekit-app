const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');

console.log('Includes \\r\\n?', content.includes('\r\n'));
const startStr = '<section class="fk-faq-section" id="faq-section">';
const sIdx = content.indexOf(startStr);
console.log('sIdx:', sIdx);
const eIdx = content.indexOf('</section>\r\n\r\n</main>', sIdx) !== -1 
  ? content.indexOf('</section>\r\n\r\n</main>', sIdx) + 10
  : content.indexOf('</section>\n\n</main>', sIdx) + 10;
console.log('eIdx:', eIdx);
const oldFaq = content.substring(sIdx, eIdx);
console.log('Old FAQ length:', oldFaq.length);
console.log('Old FAQ starts with:', oldFaq.substring(0, 50));
console.log('Old FAQ ends with:', oldFaq.substring(oldFaq.length - 50));

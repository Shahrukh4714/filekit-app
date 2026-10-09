const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');
const faqIdx = content.indexOf('id="faq-section"');
const nextIdx = content.indexOf('</main>', faqIdx);
console.log('FAQ section end snippet:\n', content.substring(nextIdx - 500, nextIdx + 50));

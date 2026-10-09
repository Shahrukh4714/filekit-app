const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');

const faqStart = content.indexOf('id="faq-section"');
console.log('FAQ section start index:', faqStart);
const faqTagStart = content.lastIndexOf('<section', faqStart);
const faqEnd = content.indexOf('</section>', faqStart) + 10;
console.log('FAQ section length:', faqEnd - faqTagStart);

const footerStart = content.indexOf('<footer class="footer"');
const footerEnd = content.indexOf('</footer>', footerStart) + 9;
console.log('Footer start index:', footerStart, 'length:', footerEnd - footerStart);

const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');

const lines = content.split('\n');
let faqLine = -1;
let footerLine = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('id="faq-section"')) faqLine = i + 1;
  if (lines[i].includes('<footer class="footer"')) footerLine = i + 1;
}
console.log('FAQ section line:', faqLine);
console.log('Footer line:', footerLine);

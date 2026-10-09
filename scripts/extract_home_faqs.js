const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');

const homeFaqMatch = content.match(/<section[^>]*id="faq-section"[^>]*>([\s\S]*?)<\/section>/i);
if (homeFaqMatch) {
  console.log('Homepage FAQ HTML:\n', homeFaqMatch[0]);
}

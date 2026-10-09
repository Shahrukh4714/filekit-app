const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');

const footerMatch = content.match(/<footer[\s\S]*?<\/footer>/i);
if (footerMatch) {
  console.log('Current footer HTML:\n', footerMatch[0]);
}

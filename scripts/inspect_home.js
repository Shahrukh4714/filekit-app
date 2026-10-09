const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');

const appViewPos = content.indexOf('id="app-view"');
const homeContent = content.substring(content.indexOf('id="home-view"'), appViewPos);

const secRe = /<section\b([^>]*)>([\s\S]*?)<\/section>/gi;
let m;
while ((m = secRe.exec(homeContent)) !== null) {
  const attrs = m[1];
  const inner = m[2];
  const h = inner.match(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/i);
  console.log(`SECTION attrs: ${attrs.trim()}`);
  if (h) console.log(`  Heading: ${h[1].replace(/<[^>]+>/g, '').trim().substring(0, 80)}`);
}

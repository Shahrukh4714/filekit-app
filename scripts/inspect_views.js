const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');

const footerMatches = [...content.matchAll(/<footer\b[^>]*>([\s\S]*?)<\/footer>/gi)];
console.log('Footer count:', footerMatches.length);
footerMatches.forEach((f, i) => {
  console.log(`Footer ${i+1}: length ${f[0].length}, preview: ${f[0].substring(0, 150)}...`);
});

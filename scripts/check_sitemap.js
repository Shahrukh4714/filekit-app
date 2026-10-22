const fs = require('fs');

const sitemap = fs.readFileSync('sitemap.xml', 'utf8');
console.log('Does sitemap contain compress-pdf?', sitemap.includes('/compress-pdf'));
if (sitemap.includes('/compress-pdf')) {
  const idx = sitemap.indexOf('/compress-pdf');
  console.log(sitemap.slice(idx - 50, idx + 150));
}

// How many total URLs in sitemap.xml?
const urls = sitemap.match(/<loc>[\s\S]*?<\/loc>/g) || [];
console.log('Total URLs in sitemap.xml:', urls.length);

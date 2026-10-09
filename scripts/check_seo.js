const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

console.log('Has json-ld?', html.includes('application/ld+json'));
const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/);
console.log('Title:', titleMatch ? titleMatch[1] : 'none');

const metaDesc = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
console.log('Meta description:', metaDesc ? metaDesc[1] : 'none');

// Find all meta tags
const metaTags = [...html.matchAll(/<meta\b[^>]*>/gi)].map(m => m[0]);
console.log('Total meta tags in <head>:', metaTags.length);
metaTags.forEach(m => console.log('  ', m));

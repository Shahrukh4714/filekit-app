const http = require('http');

http.get('http://localhost:8080/compress-pdf', (res) => {
  console.log('HTTP Status:', res.statusCode);
  console.log('Content-Type:', res.headers['content-type']);
  
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Total Raw HTML bytes received:', data.length);
    console.log('Contains <title>Compress PDF Online...?:', data.includes('Compress PDF Online — Reduce PDF File Size Free | FileKit'));
    console.log('Contains canonical https://filekit.cc/compress-pdf?:', data.includes('https://filekit.cc/compress-pdf'));
    console.log('Contains FAQPage schema?:', data.includes('"@type": "FAQPage"'));
    console.log('Contains 200 KB target portal limits?:', data.includes('200 KB'));
    console.log('Contains Quality Bar?:', data.includes('fk-seo-quality-bar'));
    console.log('Contains Smallpdf-genre SVGs?:', data.includes('fk_editorial_1') || data.includes('fk-seo-story-svg') || data.includes('Pastel Tilted Rounded Backplates'));
  });
}).on('error', (e) => {
  console.error('Error fetching:', e.message);
});

const https = require('https');
const fs = require('fs');

const url = 'https://smallpdf.com/compress-pdf';

https.get(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9'
  }
}, (res) => {
  let html = '';
  res.on('data', chunk => html += chunk);
  res.on('end', () => {
    console.log('Status code:', res.statusCode);
    console.log('HTML length:', html.length);
    fs.writeFileSync('scripts/smallpdf_compress_page.html', html, 'utf8');
    
    // Search for keywords related to free, limit, pro, subscription, pricing, trial
    const terms = ['free', 'pro', 'subscription', 'trial', 'limit', 'unlimited', 'pricing', 'plan'];
    terms.forEach(term => {
      let idx = 0;
      let count = 0;
      while ((idx = html.toLowerCase().indexOf(term, idx)) !== -1) {
        count++;
        if (count <= 3) {
          const snippet = html.slice(Math.max(0, idx - 40), Math.min(html.length, idx + 100)).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
          console.log(`[${term.toUpperCase()}] #${count}: ${snippet}`);
        }
        idx += term.length;
      }
      console.log(`Total ${term}: ${count}`);
    });
  });
}).on('error', e => console.error('Error fetching:', e.message));

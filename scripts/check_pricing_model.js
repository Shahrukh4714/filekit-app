const fs = require('fs');

const indexHtml = fs.readFileSync('index.html', 'utf8');
const appJs = fs.readFileSync('js/app.js', 'utf8');

console.log('=== Checking Pricing Terms in index.html ===');
const indexLines = indexHtml.split('\n');
indexLines.forEach((l, i) => {
  if (l.toLowerCase().includes('lifetime') || l.toLowerCase().includes('monthly') || l.toLowerCase().includes('subscription') || l.toLowerCase().includes('pricing')) {
    console.log('index.html line ' + (i+1) + ':', l.trim().slice(0, 140));
  }
});

console.log('=== Checking Pricing Terms in js/app.js ===');
const appLines = appJs.split('\n');
appLines.forEach((l, i) => {
  if (l.toLowerCase().includes('openpricingmodal') || l.toLowerCase().includes('pricing-card') || l.toLowerCase().includes('lifetime') && l.toLowerCase().includes('pro')) {
    console.log('js/app.js line ' + (i+1) + ':', l.trim().slice(0, 140));
  }
});

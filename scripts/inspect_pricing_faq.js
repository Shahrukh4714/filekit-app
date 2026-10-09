const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');

const pricingIdx = content.indexOf('id="pricing-view"');
const pricingHtml = content.substring(pricingIdx, content.indexOf('id="app-view"'));

// Find FAQ in pricingHtml
const faqMatches = [...pricingHtml.matchAll(/<section[^>]*class="([^"]*faq[^"]*)"[^>]*>([\s\S]*?)<\/section>/gi)];
console.log('Pricing FAQ section count:', faqMatches.length);
faqMatches.forEach((m, i) => {
  console.log(`\nPricing FAQ ${i+1}:`);
  console.log('Class:', m[1]);
  console.log('Snippet:\n', m[2].substring(0, 800));
});

const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');

// Homepage FAQ
const homeFaqMatch = content.match(/<section[^>]*id="faq-section"[^>]*>([\s\S]*?)<\/section>/i);
console.log('Homepage FAQ HTML snippet (first 1000 chars):');
if (homeFaqMatch) {
  console.log(homeFaqMatch[0].substring(0, 1000));
}

// Pricing FAQ
const pricingFaqMatch = content.match(/<section[^>]*class="fk-ac-faq-section"[^>]*>([\s\S]*?)<\/section>/i);
console.log('\n===================\nPricing FAQ HTML snippet (first 1500 chars):');
if (pricingFaqMatch) {
  console.log(pricingFaqMatch[0].substring(0, 1500));
}

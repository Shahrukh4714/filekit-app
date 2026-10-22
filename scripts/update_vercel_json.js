const fs = require('fs');
const path = require('path');

const vercelPath = path.join(__dirname, '..', 'vercel.json');
const vercel = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));

vercel.rewrites = [
  {
    source: "/compress-pdf",
    destination: "/compress-pdf/index.html"
  },
  {
    source: "/((?!compress-pdf|assets/|vendor/|dist/|css/|js/|.*\\.[a-zA-Z0-9]+$).*)",
    destination: "/index.html"
  }
];

fs.writeFileSync(vercelPath, JSON.stringify(vercel, null, 2) + '\n', 'utf8');
console.log('✓ Successfully updated vercel.json with explicit /compress-pdf rewrite rule!');

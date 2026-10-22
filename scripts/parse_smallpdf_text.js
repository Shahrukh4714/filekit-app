const fs = require('fs');

const html = fs.readFileSync('scripts/smallpdf_compress_page.html', 'utf8');

// Extract all FAQ questions and answers from Smallpdf's page
const faqRegex = /"Question","name":"([^"]+)","acceptedAnswer":\{"@type":"Answer","text":"([^"]+)"/g;
let m;
console.log('=== SMALLPDF FAQS ===');
while ((m = faqRegex.exec(html)) !== null) {
  console.log('\nQ:', m[1]);
  console.log('A:', m[2]);
}

// Extract any banner or note mentioning limits
const noteRegex = /(usage limits|pro features|free trial|free tool|daily limit|upgrade to pro|7-day free trial)[^.<>]{0,200}\./gi;
const notes = html.match(noteRegex) || [];
console.log('\n=== SMALLPDF MENTIONS OF LIMITS & PRO ===');
notes.slice(0, 10).forEach((n, i) => console.log(`${i+1}. ${n}`));

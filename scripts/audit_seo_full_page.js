const fs = require('fs');
const path = require('path');

// Read app.js and index.html
const appJs = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

console.log('====================================================');
console.log('   FULL PAGE SEO & FALSE POSITIVE DEEP AUDIT');
console.log('====================================================\n');

// 1. Audit ToolSeoEngine getCompressPdfSeoHtml
const startMarker = 'getCompressPdfSeoHtml() { return `';
const endMarker = '`; },';
const startIdx = appJs.indexOf(startMarker);
const endIdx = appJs.indexOf(endMarker, startIdx);
const compressSeoHtml = appJs.slice(startIdx, endIdx);

console.log('--- 1. COMPRESS PDF SEO HTML AUDIT ---');
console.log('Total characters in Compress SEO HTML:', compressSeoHtml.length);

// Extract all plain text
const textLines = compressSeoHtml
  .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, '\n')
  .split('\n')
  .map(l => l.trim())
  .filter(l => l.length > 0);

console.log('Total text lines:', textLines.length);

// Check for risky words
const riskyWords = [
  'hipaa', 'gdpr', 'lossless', 'perceptual', 'guarantee', 'military', 
  'certified', 'patent', 'zero loss', '100% reduction', 'delete after', 'cloud', 'server'
];

console.log('\n--- Scanning for risky terms in Compress SEO section ---');
riskyWords.forEach(word => {
  const matches = [];
  textLines.forEach((line, idx) => {
    if (line.toLowerCase().includes(word)) {
      matches.push(`Line ${idx}: "${line}"`);
    }
  });
  if (matches.length) {
    console.log(`[RISK: ${word.toUpperCase()}] (${matches.length} matches):`);
    matches.forEach(m => console.log('   ' + m));
  } else {
    console.log(`[CLEAN: ${word.toUpperCase()}] 0 matches`);
  }
});

// 2. Audit Headings hierarchy
console.log('\n--- 2. HEADING HIERARCHY CHECK ---');
const h1s = compressSeoHtml.match(/<h1[^>]*>[\s\S]*?<\/h1>/gi) || [];
const h2s = compressSeoHtml.match(/<h2[^>]*>[\s\S]*?<\/h2>/gi) || [];
const h3s = compressSeoHtml.match(/<h3[^>]*>[\s\S]*?<\/h3>/gi) || [];
const h4s = compressSeoHtml.match(/<h4[^>]*>[\s\S]*?<\/h4>/gi) || [];

console.log('H1 in SEO block:', h1s.length, h1s);
console.log('H2 in SEO block:', h2s.length, h2s.map(h => h.replace(/<[^>]+>/g, '').trim()));
console.log('H3 in SEO block:', h3s.length, h3s.map(h => h.replace(/<[^>]+>/g, '').trim()));
console.log('H4 in SEO block:', h4s.length, h4s.map(h => h.replace(/<[^>]+>/g, '').trim()));

// Also check index.html for H1 when tool is loaded
const indexH1Match = indexHtml.match(/<h1[^>]*id=["']fk-seo-h1["'][^>]*>([\s\S]*?)<\/h1>/i);
if (indexH1Match) {
  console.log('Primary Page H1 in index.html:', indexH1Match[0]);
}

// 3. Keyword Density Analysis for "compress pdf"
console.log('\n--- 3. KEYWORD DENSITY ANALYSIS ("compress pdf") ---');
const fullText = textLines.join(' ');
const totalWords = fullText.split(/\s+/).length;
const kwMatches = (fullText.match(/compress\s+pdf/gi) || []).length;
const density = ((kwMatches / totalWords) * 100).toFixed(2);
console.log(`Total words: ${totalWords}`);
console.log(`"compress pdf" occurrences: ${kwMatches}`);
console.log(`Keyword density: ${density}% (Recommended: 1% to 2.5%, Warning if > 3.5%)`);

// 4. Check index.html Global Schema and Metadata
console.log('\n--- 4. INDEX.HTML SCHEMA & META AUDIT ---');
const schemaRegex = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi;
let m;
let schemaCount = 0;
while ((m = schemaRegex.exec(indexHtml)) !== null) {
  schemaCount++;
  console.log(`Schema #${schemaCount}:`);
  try {
    const json = JSON.parse(m[1]);
    console.log('Valid JSON-LD schema found! Types:', json['@type'] || (json['@graph'] && json['@graph'].map(g => g['@type'])));
    // Check for HIPAA / GDPR / Fake reviews
    const str = JSON.stringify(json);
    ['hipaa', 'gdpr', 'aggregaterating', 'review', 'ratingvalue'].forEach(w => {
      if (str.toLowerCase().includes(w)) {
        console.log(`  -> Warning: Schema contains "${w}"`);
      }
    });
  } catch(e) {
    console.log('  -> Invalid JSON-LD schema:', e.message);
  }
}

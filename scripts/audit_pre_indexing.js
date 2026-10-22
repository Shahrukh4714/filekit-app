const fs = require('fs');
const path = require('path');

console.log('=== FILEKIT PRE-INDEXING AUDIT FOR GOOGLE SEARCH CONSOLE ===\n');

const htmlPath = path.join(__dirname, '..', 'compress-pdf', 'index.html');
if (!fs.existsSync(htmlPath)) {
  console.error('FAIL: compress-pdf/index.html does not exist!');
  process.exit(1);
}

const html = fs.readFileSync(htmlPath, 'utf8');

// 1. Meta Robots check
const hasNoIndex = /<meta[^>]*content=["'][^"']*noindex/i.test(html);
console.log('1. Meta Robots:');
console.log('   Has "noindex"?', hasNoIndex ? 'FAIL (blocked!)' : 'PASS (allow indexing)');

// 2. Title & Meta Description
const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
console.log('\n2. Search Snippet:');
console.log('   Title:', titleMatch ? titleMatch[1] : 'FAIL: None found');
console.log('   Title Length:', titleMatch ? titleMatch[1].length : 0, '(Recommended: 50-65 chars)');
console.log('   Description:', descMatch ? descMatch[1] : 'FAIL: None found');
console.log('   Description Length:', descMatch ? descMatch[1].length : 0, '(Recommended: 120-160 chars)');

// 3. Canonical Tag
const canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i);
console.log('\n3. Canonical Tag:');
console.log('   Canonical URL:', canonicalMatch ? canonicalMatch[1] : 'FAIL: None found');
const canonicalCorrect = canonicalMatch && canonicalMatch[1] === 'https://filekit.cc/compress-pdf';
console.log('   Correct URL (https://filekit.cc/compress-pdf)?', canonicalCorrect ? 'PASS' : 'FAIL');

// 4. OpenGraph & Social
const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
const ogDesc = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
const ogUrl = html.match(/<meta[^>]*property=["']og:url["'][^>]*content=["']([^"']+)["']/i);
console.log('\n4. Social Meta Tags:');
console.log('   og:title:', ogTitle ? ogTitle[1] : 'Missing');
console.log('   og:description:', ogDesc ? ogDesc[1] : 'Missing');
console.log('   og:url:', ogUrl ? ogUrl[1] : 'Missing');

// 5. JSON-LD Structured Data Schema Validation
console.log('\n5. Structured Data (JSON-LD):');
const schemaRegex = /<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi;
let schemaCount = 0;
let match;
while ((match = schemaRegex.exec(html)) !== null) {
  schemaCount++;
  try {
    const parsed = JSON.parse(match[1]);
    console.log(`   Schema #${schemaCount}: Valid JSON! Type: ${parsed['@type'] || (parsed['@graph'] ? 'Graph' : 'Unknown')}`);
    if (parsed['@graph']) {
      parsed['@graph'].forEach(item => {
        console.log(`     -> Graph Item: ${item['@type']} ("${item.name || ''}")`);
        if (item['@type'] === 'FAQPage') {
          console.log(`        Contains ${item.mainEntity?.length || 0} FAQ questions.`);
          item.mainEntity.forEach((q, idx) => {
            console.log(`        Q${idx+1}: ${q.name}`);
          });
        }
      });
    }
  } catch (err) {
    console.error(`   Schema #${schemaCount}: JSON PARSE ERROR:`, err.message);
  }
}

// 6. Heading Hierarchy (H1, H2, H3)
console.log('\n6. Heading Hierarchy:');
const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map(m => m[1].replace(/<[^>]+>/g, '').trim());
const h2s = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map(m => m[1].replace(/<[^>]+>/g, '').trim());
console.log(`   H1 Count: ${h1s.length} ${h1s.length === 1 ? 'PASS (Perfect single H1!)' : 'WARNING: Should have exactly 1 H1'}`);
h1s.forEach((h, i) => console.log(`     H1 #${i+1}: "${h}"`));
console.log(`   H2 Count: ${h2s.length}`);
h2s.slice(0, 5).forEach((h, i) => console.log(`     H2 #${i+1}: "${h}"`));

// 7. Assets Verification (Check if linked scripts and styles exist on disk)
console.log('\n7. Assets on Disk:');
const assetLinks = [...html.matchAll(/(?:href|src)=["'](\/dist\/[^"']+)["']/gi)].map(m => m[1].split('?')[0]);
let missingAssets = 0;
const checked = new Set();
for (const rel of assetLinks) {
  if (checked.has(rel)) continue;
  checked.add(rel);
  const diskPath = path.join(__dirname, '..', rel.slice(1));
  const exists = fs.existsSync(diskPath);
  if (!exists) {
    console.log(`   FAIL: Missing asset on disk: ${rel}`);
    missingAssets++;
  }
}
if (missingAssets === 0) {
  console.log(`   PASS: All ${checked.size} referenced /dist/ bundle files exist on disk!`);
}

// 8. Sitemap and Robots
console.log('\n8. Discovery & Crawling:');
const sitemap = fs.readFileSync(path.join(__dirname, '..', 'sitemap.xml'), 'utf8');
const inSitemap = sitemap.includes('https://filekit.cc/compress-pdf');
console.log('   In sitemap.xml?', inSitemap ? 'PASS' : 'FAIL');
const robots = fs.readFileSync(path.join(__dirname, '..', 'robots.txt'), 'utf8');
const robotsAllows = !robots.includes('Disallow: /compress-pdf') && !robots.includes('Disallow: /');
console.log('   Robots.txt allows?', robotsAllows ? 'PASS' : 'FAIL');

// 9. Vercel Clean Routing
const vercel = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'vercel.json'), 'utf8'));
const hasExplicitRoute = vercel.rewrites?.some(r => r.source === '/compress-pdf' && r.destination === '/compress-pdf/index.html');
console.log('\n9. Hosting / Routing Config:');
console.log('   Explicit /compress-pdf rewrite in vercel.json?', hasExplicitRoute ? 'PASS' : 'FAIL');

const fs = require('fs');
const path = require('path');
const { compressEditorialHtml } = require('./compress_seo_content.js');

const appJsPath = path.join(__dirname, '..', 'js', 'app.js');
let appJs = fs.readFileSync(appJsPath, 'utf8');

const startMarker = 'getCompressPdfSeoHtml() { return `';
const endMarker = '`; },';

const startIndex = appJs.indexOf(startMarker);
const endIndex = appJs.indexOf(endMarker, startIndex);

if (startIndex === -1 || endIndex === -1) {
  console.error('Markers not found! startIndex:', startIndex, 'endIndex:', endIndex);
  process.exit(1);
}

const newMethod = `getCompressPdfSeoHtml() { return \`${compressEditorialHtml}\`; },`;

appJs = appJs.slice(0, startIndex) + newMethod + appJs.slice(endIndex + endMarker.length);
fs.writeFileSync(appJsPath, appJs, 'utf8');
console.log('✓ Successfully updated js/app.js with commercial high-converting SEO copy!');

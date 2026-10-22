const fs = require('fs');
const path = require('path');

console.log('Checking for static HTML pages in root...');
const files = fs.readdirSync('.');
const htmlFiles = files.filter(f => f.endsWith('.html'));
console.log('HTML files in root:', htmlFiles);

if (fs.existsSync('compress-pdf')) {
  console.log('compress-pdf directory exists!');
} else {
  console.log('compress-pdf directory does NOT exist.');
}

const fs = require('fs');
const s = fs.readFileSync('js/tools.js', 'utf8');

const mStart = s.indexOf('function mountMergePDF');
const mEnd = s.indexOf('function mountSplitPDF');
const mCode = s.substring(mStart, mEnd);

console.log('--- Merge PDF search for radio/card ---');
mCode.split('\n').forEach((l, idx) => {
  if (l.includes('Sequential Order') || l.includes('Duplex') || l.includes('radio') || l.includes('dot') || l.includes('indicator') || l.includes('scan-benchmark-card')) {
    console.log((idx+1) + ': ' + l.trim());
  }
});

const sEnd = s.indexOf('function mountRotatePDF');
const sCode = s.substring(mEnd, sEnd);
console.log('--- Split PDF search for radio/card ---');
sCode.split('\n').forEach((l, idx) => {
  if (l.includes('Extract Pages') || l.includes('Split by Range') || l.includes('radio') || l.includes('dot') || l.includes('indicator') || l.includes('scan-benchmark-card')) {
    console.log((idx+1) + ': ' + l.trim());
  }
});

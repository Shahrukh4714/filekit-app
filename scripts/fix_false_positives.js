const fs = require('fs');
const path = require('path');

// 1. Update index.html
const indexHtmlPath = path.join(__dirname, '..', 'index.html');
let indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

const oldIndexText = 'Yes. Because files never leave your client device, FileKit is completely compliant with strict confidentiality policies, NDAs, HIPAA, and GDPR standards. Your data is never logged, stored, or inspected by third parties.';
const newIndexText = 'Yes. Because files never leave your client device and zero data is transmitted over the network, FileKit operates under a zero-knowledge architecture. Your documents are never uploaded, logged, or stored on remote servers, making FileKit safe for enterprise confidentiality, non-disclosure agreements (NDAs), and sensitive personal records.';

if (indexHtml.includes(oldIndexText)) {
  indexHtml = indexHtml.split(oldIndexText).join(newIndexText);
  fs.writeFileSync(indexHtmlPath, indexHtml, 'utf8');
  console.log('✓ Successfully updated index.html HIPAA/GDPR claims in schema and body text!');
} else {
  console.log('Notice: oldIndexText not found in index.html (already updated or modified)');
}

// 2. Update js/app.js
const appJsPath = path.join(__dirname, '..', 'js', 'app.js');
let appJs = fs.readFileSync(appJsPath, 'utf8');

// Fix 2a: Ultra-Fast Lossless PDF Optimization -> Intelligent In-Browser PDF Optimization
const oldH2 = 'Ultra-Fast Lossless PDF Optimization';
const newH2 = 'Intelligent In-Browser PDF Optimization';
if (appJs.includes(oldH2)) {
  appJs = appJs.split(oldH2).join(newH2);
  console.log('✓ Replaced "Ultra-Fast Lossless PDF Optimization" with "Intelligent In-Browser PDF Optimization"');
}

// Fix 2b: FAQ 1 perceptual compression algorithms
const oldFaq1 = 'No. FileKit uses perceptual compression algorithms. Vector text fonts remain completely sharp at any zoom level, while images are optimized to high-definition screen standards (150–300 DPI), eliminating unnecessary bloated pixel data without noticeable degradation.';
const newFaq1 = 'No. FileKit leaves your document\'s vector typography, serifs, and mathematical equations completely untouched. Only heavy embedded raster images are resampled to clean web/screen standards (150–300 DPI), while redundant internal PDF streams are deflated, keeping your text pin-sharp at any zoom level.';
if (appJs.includes(oldFaq1)) {
  appJs = appJs.replace(oldFaq1, newFaq1);
  console.log('✓ Replaced FAQ 1 perceptual compression algorithms claim');
}

// Fix 2c: FAQ 3 50MB-100MB down to 3MB-8MB over-promise
const oldFaq3 = 'Yes! This is one of the most common uses. FileKit easily compresses 50MB–100MB reports down to 3MB–8MB, making them instant to send via email, Slack, Teams, or WhatsApp.';
const newFaq3 = 'Yes! This is one of the most common use cases. PDFs bloated by high-resolution scans, photos, or uncompressed print assets can frequently be reduced by up to 80–90%, bringing multi-megabyte documents well under the 25MB threshold for Gmail, Outlook, Slack, and Teams.';
if (appJs.includes(oldFaq3)) {
  appJs = appJs.replace(oldFaq3, newFaq3);
  console.log('✓ Replaced FAQ 3 compression ratio claim with honest, qualified wording');
}

// Fix 2d: Line 9793 GDPR compliance in Merge PDF
const oldMergeGdpr = 'no remote servers, zero data logging, and 100% GDPR compliance.';
const newMergeGdpr = 'no remote servers, zero data logging, and complete privacy by design.';
if (appJs.includes(oldMergeGdpr)) {
  appJs = appJs.replace(oldMergeGdpr, newMergeGdpr);
  console.log('✓ Replaced unverified GDPR claim in Merge PDF');
}

// Fix 2e: Military-grade fluff in Protect PDF
appJs = appJs.split('military-grade 256-bit AES encryption').join('industry-standard 256-bit AES encryption (ISO 32000-2 compatible)');
appJs = appJs.split('Military-grade 256-bit AES encryption').join('Industry-standard 256-bit AES encryption');
appJs = appJs.split('MILITARY-GRADE SECURITY VAULT').join('CLIENT-SIDE SECURITY VAULT');
appJs = appJs.split("desc: 'Military-grade client-side encryption").join("desc: 'Industry-standard client-side AES encryption");

fs.writeFileSync(appJsPath, appJs, 'utf8');
console.log('✓ Successfully updated js/app.js!');

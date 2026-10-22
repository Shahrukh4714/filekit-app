const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, '..', 'js', 'app.js');
let appJs = fs.readFileSync(appJsPath, 'utf8');

const startMarker = '      <!-- Story 1: Smart Squeeze -->';
const endMarker = '      <!-- Step-by-Step How-To Section -->';

const startIndex = appJs.indexOf(startMarker);
const endIndex = appJs.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error('Markers not found! startIndex:', startIndex, 'endIndex:', endIndex);
  process.exit(1);
}

// Read the refined HTML from test_illustrations.html or generate_illustrations.js
const { execSync } = require('child_process');
const genPath = path.join(__dirname, 'generate_illustrations.js');

const svg1 = fs.readFileSync(path.join(__dirname, 'fk_editorial_1.svg'), 'utf8');
const svg2 = fs.readFileSync(path.join(__dirname, 'fk_editorial_2.svg'), 'utf8');
const svg3 = fs.readFileSync(path.join(__dirname, 'fk_editorial_3.svg'), 'utf8');

const newStoriesHtml = `      <!-- Story 1: Smart Squeeze -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; align-items: center; gap: 64px; margin-bottom: 96px;">
        <div>
          <h3 style="font-family: 'Outfit', sans-serif; font-size: 28px; font-weight: 800; color: #111827; letter-spacing: -0.025em; margin-bottom: 16px;">Reduce PDF File Size by up to 90%</h3>
          <p style="font-size: 15.5px; color: #4B5563; line-height: 1.7; margin-bottom: 14px;">Large PDF documents with high-resolution photos, full-page scans, and uncompressed data streams easily exceed email attachment limits (like Gmail's 25 MB threshold) and slow down web portals.</p>
          <p style="font-size: 15.5px; color: #4B5563; line-height: 1.7; margin-bottom: 20px;">FileKit removes unneeded metadata and applies in-browser stream recompression and image downsampling to dramatically shrink file size while keeping document layout intact.</p>
          <ul style="list-style: none; padding: 0; display: flex; flex-direction: column; gap: 12px; font-size: 14.5px; color: #374151;">
            <li style="display: flex; align-items: center; gap: 10px;">
              <span style="color: #10B981; font-weight: bold; font-size: 16px;">✓</span> <span><strong>Adaptive Resampling:</strong> Optimizes heavy images to crisp web standards (150–300 DPI).</span>
            </li>
            <li style="display: flex; align-items: center; gap: 10px;">
              <span style="color: #10B981; font-weight: bold; font-size: 16px;">✓</span> <span><strong>Structural Integrity:</strong> Retains hyperlinks, table of contents, and interactive form fields intact.</span>
            </li>
          </ul>
        </div>
        <div style="display: flex; align-items: center; justify-content: center;">
          <div style="width: 100%; max-width: 480px; display: block;">
            ${svg1}
          </div>
        </div>
      </div>

      <!-- Story 2: 100% Visual Clarity -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; align-items: center; gap: 64px; margin-bottom: 96px;">
        <div style="display: flex; align-items: center; justify-content: center; order: 1;">
          <div style="width: 100%; max-width: 480px; display: block;">
            ${svg2}
          </div>
        </div>
        <div style="order: 2;">
          <h3 style="font-family: 'Outfit', sans-serif; font-size: 28px; font-weight: 800; color: #111827; letter-spacing: -0.025em; margin-bottom: 16px;">Preserve Clean Text &amp; Sharp Images</h3>
          <p style="font-size: 15.5px; color: #4B5563; line-height: 1.7; margin-bottom: 14px;">Unlike low-quality tools that blindly turn entire documents into blurry, low-resolution scans, FileKit only targets oversized raster images. Your text and layout remain untouched.</p>
          <ul style="list-style: none; padding: 0; display: flex; flex-direction: column; gap: 12px; font-size: 14.5px; color: #374151;">
            <li style="display: flex; align-items: center; gap: 10px;">
              <span style="color: #10B981; font-weight: bold; font-size: 16px;">✓</span> <span><strong>Smart Image Resampling:</strong> Downsamples heavy photos and scans to optimal 150–300 DPI for web and email.</span>
            </li>
            <li style="display: flex; align-items: center; gap: 10px;">
              <span style="color: #10B981; font-weight: bold; font-size: 16px;">✓</span> <span><strong>Vector Text Preservation:</strong> Text remains selectable, searchable, and razor-sharp at any zoom level.</span>
            </li>
            <li style="display: flex; align-items: center; gap: 10px;">
              <span style="color: #10B981; font-weight: bold; font-size: 16px;">✓</span> <span><strong>Document Integrity:</strong> Retains bookmarks, internal hyperlinks, and form fields intact.</span>
            </li>
          </ul>
        </div>
      </div>

      <!-- Story 3: 100% In-Memory Privacy -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; align-items: center; gap: 64px; margin-bottom: 96px;">
        <div>
          <h3 style="font-family: 'Outfit', sans-serif; font-size: 28px; font-weight: 800; color: #111827; letter-spacing: -0.025em; margin-bottom: 16px;">Zero Server Uploads &amp; Complete Client-Side Privacy</h3>
          <p style="font-size: 15.5px; color: #4B5563; line-height: 1.7; margin-bottom: 14px;">Most online PDF services upload your confidential personal and business documents to remote cloud servers to process them. FileKit works differently.</p>
          <p style="font-size: 15.5px; color: #4B5563; line-height: 1.7; margin-bottom: 20px;">All compression is executed entirely inside your device's browser using local WebAssembly. Your files are never sent over the internet or saved to any third-party server &mdash; private by design.</p>
          <ul style="list-style: none; padding: 0; display: flex; flex-direction: column; gap: 12px; font-size: 14.5px; color: #374151;">
            <li style="display: flex; align-items: center; gap: 10px;">
              <span style="color: #10B981; font-weight: bold; font-size: 16px;">✓</span> <span><strong>100% Offline Capable:</strong> 0 bytes of your PDF data are ever transmitted across the network.</span>
            </li>
            <li style="display: flex; align-items: center; gap: 10px;">
              <span style="color: #10B981; font-weight: bold; font-size: 16px;">✓</span> <span><strong>Zero Queue Wait:</strong> Instant local processing powered directly by your device's multi-core CPU.</span>
            </li>
          </ul>
        </div>
        <div style="display: flex; align-items: center; justify-content: center;">
          <div style="width: 100%; max-width: 480px; display: block;">
            ${svg3}
          </div>
        </div>
      </div>\n\n`;

appJs = appJs.slice(0, startIndex) + newStoriesHtml + appJs.slice(endIndex);
fs.writeFileSync(appJsPath, appJs, 'utf8');
console.log('Successfully updated js/app.js with Smallpdf genre editorial illustrations!');

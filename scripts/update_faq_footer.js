const fs = require('fs');

let content = fs.readFileSync('index.html', 'utf8');

// 1. Replace FAQ section
const startStr = '<section class="fk-faq-section" id="faq-section">';
const sIdx = content.indexOf(startStr);
const endMarker = '</section>\r\n\r\n</main>';
const endMarkerLF = '</section>\n\n</main>';
let eIdx = content.indexOf(endMarker, sIdx);
if (eIdx !== -1) {
  eIdx += 10;
} else {
  eIdx = content.indexOf(endMarkerLF, sIdx) + 10;
}

if (sIdx === -1 || eIdx === -1) {
  console.error('Could not find FAQ section boundaries!');
  process.exit(1);
}

const newFaq = `<section class="fk-ac-faq-section page-width" id="faq-section">
  <div class="fk-ac-faq-container">
    <!-- Left Column: Sticky Title, Subtext & Contact -->
    <div class="fk-ac-faq-left">
      <span class="fk-section-eyebrow">HELP &amp; ANSWERS</span>
      <h2 class="fk-ac-faq-heading">Frequently asked questions</h2>
      <p class="fk-ac-faq-subheading">
        Everything you need to know about our local-first offline architecture, file privacy, and supported formats.
      </p>
      <div class="fk-ac-faq-support">
        <span>Can't find what you're looking for?</span>
        <a href="mailto:support@filekit.app" class="fk-ac-faq-link">
          <span>Contact our support team</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        </a>
      </div>
    </div>

    <!-- Right Column: Aceternity Divide-y Hairline Accordion -->
    <div class="fk-ac-faq-accordion">
      <details class="fk-ac-faq-item" name="fk-home-faq" open>
        <summary class="fk-ac-faq-summary">
          <span class="fk-ac-faq-icon-box" aria-hidden="true">
            <svg class="fk-ac-faq-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 5v14" class="fk-ac-faq-line-v"></path>
              <path d="M5 12h14"></path>
            </svg>
          </span>
          <span class="fk-ac-faq-question-text">What is FileKit?</span>
        </summary>
        <div class="fk-ac-faq-answer">
          <p>FileKit is a 100% private, browser-based file workstation. It empowers you to convert, compress, merge, split, edit, crop, and inspect files across PDFs, images, videos, audio, and documents directly on your device without installing software or creating an account.</p>
        </div>
      </details>

      <details class="fk-ac-faq-item" name="fk-home-faq">
        <summary class="fk-ac-faq-summary">
          <span class="fk-ac-faq-icon-box" aria-hidden="true">
            <svg class="fk-ac-faq-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 5v14" class="fk-ac-faq-line-v"></path>
              <path d="M5 12h14"></path>
            </svg>
          </span>
          <span class="fk-ac-faq-question-text">How does it run locally without uploading my files?</span>
        </summary>
        <div class="fk-ac-faq-answer">
          <p>FileKit is powered by modern WebAssembly (WASM) and native browser hardware acceleration. When you drop a file, the processing engine runs inside your browser's local sandbox memory. Zero bytes ever leave your device or touch a remote server.</p>
        </div>
      </details>

      <details class="fk-ac-faq-item" name="fk-home-faq">
        <summary class="fk-ac-faq-summary">
          <span class="fk-ac-faq-icon-box" aria-hidden="true">
            <svg class="fk-ac-faq-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 5v14" class="fk-ac-faq-line-v"></path>
              <path d="M5 12h14"></path>
            </svg>
          </span>
          <span class="fk-ac-faq-question-text">What formats does it support?</span>
        </summary>
        <div class="fk-ac-faq-answer">
          <p>FileKit supports dozens of formats across 6 core categories: PDFs, Images (PNG, JPG, WebP, AVIF, HEIC, SVG, GIF), Videos (MP4, WebM, MOV, GIF), Audio (MP3, WAV, AAC, FLAC, M4A), Documents (Word DOCX, Excel XLSX, PPTX, EPUB, TXT), and Archive bundles (ZIP, TAR).</p>
        </div>
      </details>

      <details class="fk-ac-faq-item" name="fk-home-faq">
        <summary class="fk-ac-faq-summary">
          <span class="fk-ac-faq-icon-box" aria-hidden="true">
            <svg class="fk-ac-faq-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 5v14" class="fk-ac-faq-line-v"></path>
              <path d="M5 12h14"></path>
            </svg>
          </span>
          <span class="fk-ac-faq-question-text">Can I use it for NDA, confidential, or sensitive files?</span>
        </summary>
        <div class="fk-ac-faq-answer">
          <p>Yes. Because files never leave your client device, FileKit is completely compliant with strict confidentiality policies, NDAs, HIPAA, and GDPR standards. Your data is never logged, stored, or inspected by third parties.</p>
        </div>
      </details>

      <details class="fk-ac-faq-item" name="fk-home-faq">
        <summary class="fk-ac-faq-summary">
          <span class="fk-ac-faq-icon-box" aria-hidden="true">
            <svg class="fk-ac-faq-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 5v14" class="fk-ac-faq-line-v"></path>
              <path d="M5 12h14"></path>
            </svg>
          </span>
          <span class="fk-ac-faq-question-text">Does it work fully offline?</span>
        </summary>
        <div class="fk-ac-faq-answer">
          <p>Yes! Once the page has loaded, our progressive service worker caches all essential conversion binaries. You can disconnect your Wi-Fi, turn on airplane mode, and continue working with all your file tools seamlessly.</p>
        </div>
      </details>

      <details class="fk-ac-faq-item" name="fk-home-faq">
        <summary class="fk-ac-faq-summary">
          <span class="fk-ac-faq-icon-box" aria-hidden="true">
            <svg class="fk-ac-faq-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 5v14" class="fk-ac-faq-line-v"></path>
              <path d="M5 12h14"></path>
            </svg>
          </span>
          <span class="fk-ac-faq-question-text">Is FileKit free, and are there file size caps?</span>
        </summary>
        <div class="fk-ac-faq-answer">
          <p>FileKit is 100% free with no forced subscriptions or hidden tiers. Since processing runs on your own device's CPU/GPU rather than costly cloud servers, you don't face arbitrary cloud size limits or wait in artificial upload queues.</p>
        </div>
      </details>

      <details class="fk-ac-faq-item" name="fk-home-faq">
        <summary class="fk-ac-faq-summary">
          <span class="fk-ac-faq-icon-box" aria-hidden="true">
            <svg class="fk-ac-faq-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 5v14" class="fk-ac-faq-line-v"></path>
              <path d="M5 12h14"></path>
            </svg>
          </span>
          <span class="fk-ac-faq-question-text">Do I need to install any software or extensions?</span>
        </summary>
        <div class="fk-ac-faq-answer">
          <p>None at all. FileKit runs in any standard modern web browser (Chrome, Safari, Firefox, Edge, Arc, Brave) across macOS, Windows, Linux, Chromebooks, iPads, and mobile devices.</p>
        </div>
      </details>
    </div>
  </div>
</section>`;

content = content.substring(0, sIdx) + newFaq + content.substring(eIdx);
console.log('Replaced FAQ successfully');

// 2. Replace Footer
const footerStart = content.indexOf('<footer class="footer"');
const footerEnd = content.indexOf('</footer>', footerStart) + 9;

if (footerStart === -1 || footerEnd === -1) {
  console.error('Could not find footer boundaries!');
  process.exit(1);
}

const newFooter = `<footer class="footer" role="contentinfo">
  <div class="footer-main page-width">
    <!-- Brand Pillar -->
    <div class="footer-brand">
      <div class="brand">
        <svg class="brand-icon" width="34" height="34" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="fk-footer-badge-shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="1.5" stdDeviation="2" flood-color="#1A1714" flood-opacity="0.12"/></filter>
            <linearGradient id="fk-footer-tile-bg" x1="24" y1="4" x2="24" y2="44" gradientUnits="userSpaceOnUse"><stop stop-color="#FFFFFF"/><stop offset="1" stop-color="#F8FAFC"/></linearGradient>
          </defs>
          <g filter="url(#fk-footer-badge-shadow)">
            <rect x="4" y="4" width="40" height="40" rx="10" fill="url(#fk-footer-tile-bg)"/>
            <rect x="4" y="4" width="40" height="40" rx="10" stroke="#CBD5E1" stroke-width="0.8"/>
            <rect x="18" y="10" width="12" height="12" rx="3.5" fill="#FF4D4D"/>
            <rect x="26" y="18" width="12" height="12" rx="3.5" fill="#FFC700"/>
            <rect x="18" y="26" width="12" height="12" rx="3.5" fill="#00E676"/>
            <rect x="10" y="18" width="12" height="12" rx="3.5" fill="#00B0FF"/>
            <rect x="20.5" y="20.5" width="7" height="7" rx="2" fill="#18181B" stroke="#FFFFFF" stroke-width="0.8"/>
          </g>
        </svg>
        <strong>FileKit</strong>
      </div>
      <p class="footer-desc">The 100% private, in-browser file workstation. Convert, compress, edit, and organize files locally with zero server uploads.</p>
      <div class="footer-status-pill">
        <span class="footer-status-dot"></span>
        <span>100% Local WASM Engine</span>
      </div>
    </div>

    <!-- Sitemap Column 1: PDF Tools -->
    <div class="footer-col">
      <strong>PDF Tools</strong>
      <a href="#app/category/PDF" data-footer-category="PDF">Merge PDF</a>
      <a href="#app/category/PDF" data-footer-category="PDF">Split PDF</a>
      <a href="#app/category/PDF" data-footer-category="PDF">Compress PDF</a>
      <a href="#app/category/PDF" data-footer-category="PDF">PDF to Word</a>
      <a href="#app/category/PDF" data-footer-category="PDF">Word to PDF</a>
      <a href="#app/category/PDF" data-footer-category="PDF">Sign PDF</a>
      <a href="#app/category/PDF" data-footer-category="PDF">Organize Pages</a>
    </div>

    <!-- Sitemap Column 2: Image & Vector -->
    <div class="footer-col">
      <strong>Image &amp; Media</strong>
      <a href="#app/category/Images" data-footer-category="Images">Convert Image</a>
      <a href="#app/category/Images" data-footer-category="Images">Compress Image</a>
      <a href="#app/category/Images" data-footer-category="Images">Crop &amp; Resize</a>
      <a href="#app/category/Images" data-footer-category="Images">WebP Converter</a>
      <a href="#app/category/Images" data-footer-category="Images">HEIC to JPG</a>
      <a href="#app/category/Images" data-footer-category="Images">Remove Background</a>
      <a href="#app/category/Images" data-footer-category="Images">SVG Vectorizer</a>
    </div>

    <!-- Sitemap Column 3: Video & Audio -->
    <div class="footer-col">
      <strong>Video &amp; Audio</strong>
      <a href="#app/category/Video" data-footer-category="Video">Compress Video</a>
      <a href="#app/category/Video" data-footer-category="Video">Convert Video</a>
      <a href="#app/category/Video" data-footer-category="Video">Video to GIF</a>
      <a href="#app/category/Audio" data-footer-category="Audio">Convert Audio</a>
      <a href="#app/category/Audio" data-footer-category="Audio">Extract MP3</a>
      <a href="#app/category/Audio" data-footer-category="Audio">Audio Waveform</a>
      <a href="#app/category/Archive" data-footer-category="Archive">ZIP Archive</a>
    </div>

    <!-- Sitemap Column 4: Platform & Trust -->
    <div class="footer-col">
      <strong>Platform</strong>
      <a href="#pricing" data-footer-link="pricing">Plans &amp; Pricing</a>
      <a href="#about" data-footer-link="about">About FileKit</a>
      <a href="#privacy" data-footer-link="privacy">Privacy &amp; Security</a>
      <a href="#terms" data-footer-link="terms">Terms of Service</a>
      <a href="#help" data-footer-link="help">Help &amp; FAQs</a>
      <a href="#shortcuts" data-footer-link="shortcuts">Keyboard Shortcuts (⌘K)</a>
    </div>
  </div>

  <!-- Bottom Legal & Architecture Bar -->
  <div class="footer-bottom page-width">
    <div class="footer-bottom-left">
      <span class="footer-copy">© 2026 FileKit Inc. All rights reserved.</span>
      <span class="footer-dot-sep">·</span>
      <span class="footer-arch-tag">Files never leave your device</span>
    </div>
    <div class="footer-bottom-links">
      <a href="#privacy" data-footer-link="privacy">Privacy</a>
      <span class="footer-dot-sep">·</span>
      <a href="#terms" data-footer-link="terms">Terms</a>
      <span class="footer-dot-sep">·</span>
      <a href="#help" data-footer-link="help">Support</a>
      <span class="footer-dot-sep">·</span>
      <a href="#shortcuts" data-footer-link="shortcuts">Shortcuts</a>
    </div>
  </div>
</footer>`;

content = content.substring(0, footerStart) + newFooter + content.substring(footerEnd);
console.log('Replaced Footer successfully');

fs.writeFileSync('index.html', content, 'utf8');
console.log('Successfully updated index.html');

const fs = require('fs');

console.log('═══════════════════════════════════════════════════════════');
console.log('  Restoring and Perfecting the Quality Bar & Dropzone      ');
console.log('═══════════════════════════════════════════════════════════');

// 1. UPDATE index.html
let html = fs.readFileSync('index.html', 'utf8');

const heroHeaderRegex = /<div class="fk-seo-hero-header">[\s\S]*?<\/div>/;

const newHeroHeader = `<div class="fk-seo-hero-header">
      <h1 class="fk-seo-hero-title" id="fk-seo-hero-title">Compress PDF</h1>
      <p class="fk-seo-hero-desc" id="fk-seo-hero-desc">Reduce file size while optimizing for maximal PDF quality.</p>
    </div>`;

if (heroHeaderRegex.test(html)) {
  html = html.replace(heroHeaderRegex, newHeroHeader);
  fs.writeFileSync('index.html', html, 'utf8');
  console.log('✓ index.html: Hero header updated with clean title and subtitle.');
} else {
  console.log('! index.html: heroHeaderRegex did not match.');
}

// 2. UPDATE js/tools.js (mountCompressPDF renderUpload)
let tools = fs.readFileSync('js/tools.js', 'utf8');

const oldRenderUploadRegex = /function renderUpload\(\) \{[\s\S]*?container\.innerHTML = `[\s\S]*?<\/div>`;[\s\S]*?const dz\s*=\s*container\.querySelector\('#cpdf-dz'\);/;

const newRenderUpload = `function renderUpload() {
      container.innerHTML = \`
        <div class="cpdf-dropzone drop-hero-box" id="cpdf-dz" tabindex="0" role="button" aria-label="Upload files to compress">
          <div class="cpdf-inset-border">
            <!-- 3 Stacked Documents Illustration (Spreadsheet, PDF, Presentation) -->
            <div class="cpdf-hero-icon-cluster">
              <svg width="100" height="64" viewBox="0 0 100 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <!-- Left Sheet: Spreadsheet / Table -->
                <g opacity="0.85" transform="translate(14, 6)">
                  <rect x="0" y="0" width="34" height="46" rx="3" stroke="#FFFFFF" stroke-width="1.6" fill="rgba(255,255,255,0.06)"/>
                  <line x1="6" y1="12" x2="28" y2="12" stroke="#FFFFFF" stroke-width="1.2"/>
                  <line x1="6" y1="20" x2="28" y2="20" stroke="#FFFFFF" stroke-width="1.2"/>
                  <line x1="6" y1="28" x2="28" y2="28" stroke="#FFFFFF" stroke-width="1.2"/>
                  <line x1="17" y1="12" x2="17" y2="36" stroke="#FFFFFF" stroke-width="1.2"/>
                </g>

                <!-- Right Sheet: Presentation / Pie Chart -->
                <g opacity="0.85" transform="translate(52, 6)">
                  <rect x="0" y="0" width="34" height="46" rx="3" stroke="#FFFFFF" stroke-width="1.6" fill="rgba(255,255,255,0.06)"/>
                  <circle cx="17" cy="24" r="9" stroke="#FFFFFF" stroke-width="1.4"/>
                  <path d="M17 15 V24 H26" stroke="#FFFFFF" stroke-width="1.4"/>
                </g>

                <!-- Center Sheet: Prominent PDF with Folded Corner -->
                <g transform="translate(32, 2)">
                  <path d="M 0 3 C 0 1.34 1.34 0 3 0 L 24 0 L 36 12 L 36 51 C 36 52.66 34.66 54 33 54 L 3 54 C 1.34 54 0 52.66 0 51 Z" fill="#DE3636" stroke="#FFFFFF" stroke-width="1.8"/>
                  <path d="M 24 0 V 12 H 36" stroke="#FFFFFF" stroke-width="1.8" fill="none"/>
                  <!-- PDF Red Badge Tag -->
                  <rect x="5" y="24" width="26" height="12" rx="2" fill="#FFFFFF"/>
                  <text x="18" y="33" fill="#DE3636" font-family="'Outfit', sans-serif" font-size="8.5" font-weight="900" text-anchor="middle" letter-spacing="0.05em">PDF</text>
                  <!-- Document content lines -->
                  <line x1="7" y1="42" x2="29" y2="42" stroke="#FFFFFF" stroke-width="1.4" stroke-linecap="round"/>
                  <line x1="7" y1="46" x2="22" y2="46" stroke="#FFFFFF" stroke-width="1.4" stroke-linecap="round"/>
                </g>
              </svg>
            </div>
            
            <!-- Compound Button [ 📄+ CHOOSE FILES | ▾ ] -->
            <div class="cpdf-hero-btn-wrap">
              <label for="cpdf-inp" class="cpdf-compound-btn" tabindex="0">
                <span class="cpdf-btn-main">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="12" y1="18" x2="12" y2="12"/>
                    <line x1="9" y1="15" x2="15" y2="15"/>
                  </svg>
                  <span>CHOOSE FILES</span>
                </span>
                <span class="cpdf-btn-divider"></span>
                <span class="cpdf-btn-caret">&#9662;</span>
              </label>
            </div>
            
            <p class="cpdf-hero-subtext">or drop files here</p>
          </div>
          <input id="cpdf-inp" type="file" accept="\${ACCEPT_STR}" multiple hidden>
        </div>\`;

      const dz  = container.querySelector('#cpdf-dz');`;

if (oldRenderUploadRegex.test(tools)) {
  tools = tools.replace(oldRenderUploadRegex, newRenderUpload);
  fs.writeFileSync('js/tools.js', tools, 'utf8');
  console.log('✓ js/tools.js: renderUpload dropzone updated.');
} else {
  console.log('! js/tools.js: oldRenderUploadRegex did not match.');
}

// 3. UPDATE js/app.js (Quality Bar with description and 3 checkmarks)
let app = fs.readFileSync('js/app.js', 'utf8');
const isCrlf = app.includes('\r\n');
const lines = app.split(/\r?\n/);

const startIdx = lines.findIndex(l => l.includes('fk-trust-pills-row') || l.includes('Centered 3-Pill Trust Bar'));
const endIdx = lines.findIndex((l, i) => i > startIdx && l.includes('<!-- Section 1: Introduction Title -->'));

if (startIdx !== -1 && endIdx !== -1) {
  const replacement = [
    '      <!-- Sub-Hero Quality & Trust Bar (Smallpdf Parity Craft) -->',
    '      <div class="fk-seo-quality-bar">',
    '        <div class="fk-quality-desc-col">',
    '          <p class="fk-quality-desc-text">',
    '            Quickly reduce PDF file size with our free online PDF compressor. 100% private in-browser WebAssembly processing with zero server uploads.',
    '          </p>',
    '        </div>',
    '        <div class="fk-quality-checks-col">',
    '          <div class="fk-quality-check-item">',
    '            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    '            <span>Fast compression in seconds</span>',
    '          </div>',
    '          <div class="fk-quality-check-item">',
    '            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    '            <span>Reduce file size without losing quality</span>',
    '          </div>',
    '          <div class="fk-quality-check-item">',
    '            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    '            <span>Zero cloud uploads &mdash; 100% private in device RAM</span>',
    '          </div>',
    '        </div>',
    '      </div>'
  ];

  lines.splice(startIdx, endIdx - startIdx, ...replacement);
  const joined = lines.join(isCrlf ? '\r\n' : '\n');
  fs.writeFileSync('js/app.js', joined, 'utf8');
  console.log('✓ js/app.js: Quality Bar restored and perfected with 2-column layout.');
} else {
  console.log('! js/app.js: Quality Bar indices not found.');
}

// 4. UPDATE css/styles.css
let css = fs.readFileSync('css/styles.css', 'utf8');

const oldStylesRegex = /\/\* ═══ FILEKIT SIGNATURE STUDIO: COMPRESS PDF DROPZONE ═══ \*\/[\s\S]*$/;

const refinedStyles = `/* ═══ FILEKIT REFINED CRAFT: COMPRESS PDF DROPZONE & QUALITY BAR ═══ */

/* Universal Page Font & Container Alignment */
.tool-page-wrap.theme-compress,
#seo-tool-view .theme-compress,
.theme-compress {
  max-width: 1100px !important;
  margin: 0 auto !important;
  padding: 0 24px !important;
  font-family: 'Outfit', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Hero Header: Title and Subtitle */
.fk-seo-hero-header {
  text-align: center !important;
  margin: 32px auto 26px !important;
  max-width: 820px !important;
}

.fk-seo-hero-title {
  font-family: 'Outfit', 'Plus Jakarta Sans', sans-serif !important;
  font-size: 42px !important;
  font-weight: 800 !important;
  color: #111827 !important;
  letter-spacing: -0.035em !important;
  line-height: 1.15 !important;
  margin: 0 0 10px 0 !important;
}

.fk-seo-hero-desc {
  font-family: 'Outfit', 'Plus Jakarta Sans', sans-serif !important;
  font-size: 17.5px !important;
  font-weight: 400 !important;
  color: #4B5563 !important;
  letter-spacing: -0.01em !important;
  line-height: 1.5 !important;
  margin: 0 auto !important;
  max-width: 640px !important;
}

/* ── LUMINOUS RUBY-VELVET DROPZONE CANVAS ── */
#seo-tool-view #stage .cpdf-dropzone,
#seo-tool-view .theme-compress .cpdf-dropzone,
.theme-compress #stage .cpdf-dropzone,
.theme-compress .cpdf-dropzone {
  background: linear-gradient(145deg, #E0353A 0%, #D3252A 50%, #C41C21 100%) !important;
  border: none !important;
  border-radius: 12px !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.22), 0 12px 36px -6px rgba(211, 37, 42, 0.32), 0 2px 6px rgba(0, 0, 0, 0.05) !important;
  max-width: 880px !important;
  width: 100% !important;
  min-height: 310px !important;
  max-height: none !important;
  height: auto !important;
  margin: 0 auto !important;
  padding: 12px !important;
  box-sizing: border-box !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: stretch !important;
  justify-content: center !important;
  cursor: pointer !important;
  position: relative !important;
  overflow: visible !important;
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease, filter 0.2s ease !important;
}

#seo-tool-view #stage .cpdf-dropzone:hover,
.theme-compress .cpdf-dropzone:hover {
  filter: brightness(1.02) !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.3), 0 16px 44px -6px rgba(211, 37, 42, 0.4), 0 4px 10px rgba(0, 0, 0, 0.08) !important;
  transform: translateY(-1.5px) !important;
}

/* Dragging Over Dynamic State */
.theme-compress .cpdf-dropzone.cpdf-dz--over {
  filter: brightness(1.05) !important;
  box-shadow: inset 0 0 0 2px #FFFFFF, 0 20px 50px rgba(211, 37, 42, 0.45) !important;
  transform: scale(1.008) !important;
}

/* Inset Delicate Dashed White Border */
.cpdf-inset-border {
  border: 1.5px dashed rgba(255, 255, 255, 0.62) !important;
  border-radius: 8px !important;
  padding: 44px 24px 38px !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  text-align: center !important;
  box-sizing: border-box !important;
  width: 100% !important;
  min-height: 286px !important;
  pointer-events: none !important;
}

/* 3 Stacked SVG Documents Illustration */
.cpdf-hero-icon-cluster {
  margin-bottom: 24px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  line-height: 0 !important;
}

.cpdf-hero-icon-cluster svg {
  overflow: visible !important;
  filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.14)) !important;
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
}

.theme-compress .cpdf-dropzone:hover .cpdf-hero-icon-cluster svg {
  transform: translateY(-2px) scale(1.02) !important;
}

/* Compound Action Pill: [ 📄+ CHOOSE FILES | ▾ ] */
.cpdf-hero-btn-wrap {
  margin-bottom: 15px !important;
  display: flex !important;
  justify-content: center !important;
}

.cpdf-compound-btn {
  display: inline-flex !important;
  align-items: stretch !important;
  background: #FFFFFF !important;
  border-radius: 8px !important;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.16), 0 1px 3px rgba(0, 0, 0, 0.08) !important;
  overflow: hidden !important;
  pointer-events: auto !important;
  cursor: pointer !important;
  transition: transform 0.15s ease, box-shadow 0.15s ease !important;
  user-select: none !important;
}

.cpdf-compound-btn:hover {
  transform: translateY(-1px) !important;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.22), 0 2px 5px rgba(0, 0, 0, 0.1) !important;
}

.cpdf-compound-btn:active {
  transform: translateY(1px) !important;
}

.cpdf-btn-main {
  background: transparent !important;
  border: none !important;
  color: #171717 !important;
  font-family: 'Outfit', 'Plus Jakarta Sans', sans-serif !important;
  font-size: 14.5px !important;
  font-weight: 700 !important;
  letter-spacing: 0.04em !important;
  text-transform: uppercase !important;
  padding: 14px 22px 14px 20px !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: 10px !important;
  cursor: pointer !important;
  line-height: 1 !important;
}

.cpdf-btn-divider {
  width: 1px !important;
  background: #E5E7EB !important;
  margin: 8px 0 !important;
}

.cpdf-btn-caret {
  background: transparent !important;
  border: none !important;
  padding: 0 16px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  cursor: pointer !important;
  color: #171717 !important;
  font-size: 13px !important;
  transition: background 0.15s ease !important;
}

.cpdf-compound-btn:hover .cpdf-btn-caret {
  background: #F3F4F6 !important;
}

/* Subtle 'or drop files here' Subtext */
.cpdf-hero-subtext {
  font-family: 'Outfit', 'Plus Jakarta Sans', sans-serif !important;
  font-size: 14.5px !important;
  font-weight: 500 !important;
  color: rgba(255, 255, 255, 0.95) !important;
  margin: 0 !important;
  letter-spacing: -0.01em !important;
  pointer-events: none !important;
}

/* ── SUB-HERO QUALITY & TRUST BAR ── */
.fk-seo-quality-bar {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 48px !important;
  max-width: 880px !important;
  margin: 36px auto 64px !important;
  padding: 0 12px !important;
  box-sizing: border-box !important;
}

.fk-quality-desc-col {
  flex: 1 !important;
  max-width: 460px !important;
}

.fk-quality-desc-text {
  font-family: 'Outfit', 'Plus Jakarta Sans', sans-serif !important;
  font-size: 15px !important;
  color: #4B5563 !important;
  line-height: 1.65 !important;
  margin: 0 !important;
  letter-spacing: -0.01em !important;
}

.fk-quality-checks-col {
  display: flex !important;
  flex-direction: column !important;
  gap: 12px !important;
  flex-shrink: 0 !important;
}

.fk-quality-check-item {
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
  font-family: 'Outfit', 'Plus Jakarta Sans', sans-serif !important;
  font-size: 14px !important;
  font-weight: 500 !important;
  color: #1F2937 !important;
  letter-spacing: -0.01em !important;
}

.fk-quality-check-item svg {
  flex-shrink: 0 !important;
}

@media (max-width: 820px) {
  .fk-seo-quality-bar {
    flex-direction: column !important;
    gap: 24px !important;
    align-items: flex-start !important;
    margin: 28px auto 48px !important;
  }
  .fk-quality-desc-col {
    max-width: 100% !important;
  }
  .cpdf-inset-border {
    padding: 32px 16px 28px !important;
    min-height: 240px !important;
  }
  .cpdf-btn-main {
    padding: 12px 16px !important;
    font-size: 13px !important;
  }
}
`;

if (oldStylesRegex.test(css)) {
  css = css.replace(oldStylesRegex, refinedStyles);
  console.log('✓ css/styles.css: Updated with refined craft styles.');
} else {
  css += '\n' + refinedStyles;
  console.log('✓ css/styles.css: Appended refined craft styles.');
}

fs.writeFileSync('css/styles.css', css, 'utf8');

console.log('═══════════════════════════════════════════════════════════');
console.log('  All Files Updated!                                       ');
console.log('═══════════════════════════════════════════════════════════');

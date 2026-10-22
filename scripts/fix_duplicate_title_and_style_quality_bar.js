const fs = require('fs');

console.log('═══════════════════════════════════════════════════════════');
console.log('  1. Removing duplicate H1 & header from index.html        ');
console.log('═══════════════════════════════════════════════════════════');

// 1. Fix index.html
let html = fs.readFileSync('index.html', 'utf8');
const isHtmlCrlf = html.includes('\r\n');
const htmlLines = html.split(/\r?\n/);

const headerStart = htmlLines.findIndex(l => l.includes('class="fk-seo-hero-header"'));
console.log('headerStart line:', headerStart + 1);

// Look for stage line
const stageLine = htmlLines.findIndex(l => l.includes('id="stage"'));
console.log('stageLine:', stageLine + 1);

// Replace everything between headerStart and stageLine with clean single header
const cleanHeaderLines = [
  '    <div class="fk-seo-hero-header">',
  '      <h1 class="fk-seo-hero-title" id="fk-seo-hero-title">Compress PDF</h1>',
  '      <p class="fk-seo-hero-desc" id="fk-seo-hero-desc">Reduce file size while optimizing for maximal PDF quality.</p>',
  '    </div>',
  ''
];

htmlLines.splice(headerStart, (stageLine - 1) - headerStart, ...cleanHeaderLines);
html = htmlLines.join(isHtmlCrlf ? '\r\n' : '\n');
fs.writeFileSync('index.html', html, 'utf8');
console.log('✓ index.html: Duplicate H1 removed. Clean single header in place.');

// 2. Update js/app.js: titleMap and section heading
console.log('═══════════════════════════════════════════════════════════');
console.log('  2. Updating titleMap and section heading in js/app.js   ');
console.log('═══════════════════════════════════════════════════════════');
let app = fs.readFileSync('js/app.js', 'utf8');

// Update titleMap so it doesn't overwrite with 'Compress PDF Files Online for Free'
app = app.replace(
  /'pdf-compress':\s*'Compress PDF Files Online for Free'/g,
  "'pdf-compress': 'Compress PDF'"
);
app = app.replace(
  /'compress':\s*'Compress PDF Files Online for Free'/g,
  "'compress': 'Compress PDF'"
);

// Update redundant Section 1 heading in getCompressPdfSeoHtml
app = app.replace(
  /<h2 style="font-family: 'Outfit', sans-serif; font-size: 32px; font-weight: 800; color: #0A0A0A; margin-bottom: 10px;">Compress PDF Files Online for Free<\/h2>/g,
  '<h2 style="font-family: \'Outfit\', sans-serif; font-size: 30px; font-weight: 800; color: #0A0A0A; margin-bottom: 10px;">Shrink PDF File Size, Preserve Visual Quality</h2>'
);

fs.writeFileSync('js/app.js', app, 'utf8');
console.log('✓ js/app.js: titleMap set to "Compress PDF", Section 1 heading deduplicated.');

// 3. Update css/styles.css for Quality Bar & Dropzone Polish
console.log('═══════════════════════════════════════════════════════════');
console.log('  3. Styling Quality Bar & Dropzone in css/styles.css     ');
console.log('═══════════════════════════════════════════════════════════');
let css = fs.readFileSync('css/styles.css', 'utf8');

const targetSectionRegex = /\/\* ═══ FILEKIT REFINED CRAFT: COMPRESS PDF DROPZONE & QUALITY BAR ═══ \*\/[\s\S]*$/;

const newStyles = `/* ═══ FILEKIT REFINED CRAFT: COMPRESS PDF DROPZONE & QUALITY BAR ═══ */

/* Universal Page Font & Container Alignment */
.tool-page-wrap.theme-compress,
#seo-tool-view .theme-compress,
.theme-compress {
  max-width: 1080px !important;
  margin: 0 auto !important;
  padding: 0 24px !important;
  font-family: 'Outfit', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Breadcrumbs Spacing */
#seo-tool-view .breadcrumbs {
  margin-top: 14px !important;
  margin-bottom: 18px !important;
}

/* Clean Hero Header Matching Smallpdf Parity */
.fk-seo-hero-header {
  text-align: center !important;
  margin: 16px auto 28px !important;
  max-width: 780px !important;
}

.fk-seo-hero-title {
  font-family: 'Outfit', 'Plus Jakarta Sans', sans-serif !important;
  font-size: 42px !important;
  font-weight: 800 !important;
  color: #111827 !important;
  letter-spacing: -0.03em !important;
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
  max-width: 620px !important;
}

/* ── LUMINOUS RUBY-VELVET DROPZONE CANVAS ── */
#seo-tool-view #stage .cpdf-dropzone,
#seo-tool-view .theme-compress .cpdf-dropzone,
.theme-compress #stage .cpdf-dropzone,
.theme-compress .cpdf-dropzone {
  background: linear-gradient(135deg, #DE3636 0%, #C91F26 100%) !important;
  border: none !important;
  border-radius: 12px !important;
  box-shadow: 0 10px 30px -4px rgba(201, 31, 38, 0.28), 0 2px 6px rgba(0, 0, 0, 0.04) !important;
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
  box-shadow: 0 16px 42px -4px rgba(201, 31, 38, 0.38), 0 4px 10px rgba(0, 0, 0, 0.06) !important;
  transform: translateY(-1.5px) !important;
}

/* Inset Delicate Dashed White Border */
.cpdf-inset-border {
  border: 1.5px dashed rgba(255, 255, 255, 0.6) !important;
  border-radius: 8px !important;
  padding: 42px 24px 36px !important;
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

/* ── SUB-HERO QUALITY & TRUST BAR (ELEGANT CONTAINER) ── */
.fk-seo-quality-bar {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 36px !important;
  max-width: 880px !important;
  margin: 28px auto 60px !important;
  padding: 20px 28px !important;
  background: #F9FAFB !important;
  border: 1px solid #E5E7EB !important;
  border-radius: 12px !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02) !important;
  box-sizing: border-box !important;
}

.fk-quality-desc-col {
  flex: 1 !important;
  max-width: 480px !important;
}

.fk-quality-desc-text {
  font-family: 'Outfit', 'Plus Jakarta Sans', sans-serif !important;
  font-size: 14.5px !important;
  color: #4B5563 !important;
  line-height: 1.65 !important;
  margin: 0 !important;
  letter-spacing: -0.01em !important;
}

.fk-quality-checks-col {
  display: flex !important;
  flex-direction: column !important;
  gap: 10px !important;
  flex-shrink: 0 !important;
}

.fk-quality-check-item {
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
  font-family: 'Outfit', 'Plus Jakarta Sans', sans-serif !important;
  font-size: 13.5px !important;
  font-weight: 600 !important;
  color: #1F2937 !important;
  letter-spacing: -0.01em !important;
}

.fk-quality-check-item svg {
  flex-shrink: 0 !important;
}

@media (max-width: 820px) {
  .fk-seo-quality-bar {
    flex-direction: column !important;
    gap: 20px !important;
    align-items: flex-start !important;
    margin: 24px auto 44px !important;
    padding: 18px 20px !important;
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

if (targetSectionRegex.test(css)) {
  css = css.replace(targetSectionRegex, newStyles);
  console.log('✓ css/styles.css: Replaced old craft section with polished styles.');
} else {
  css += '\n' + newStyles;
  console.log('✓ css/styles.css: Appended polished styles.');
}

fs.writeFileSync('css/styles.css', css, 'utf8');
console.log('═══════════════════════════════════════════════════════════');
console.log('  Done! Ready for build.                                   ');
console.log('═══════════════════════════════════════════════════════════');

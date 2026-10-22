const fs = require('fs');

console.log('--- Applying Full Smallpdf Parity & Sizing Fix ---');

let css = fs.readFileSync('css/styles.css', 'utf8');

// Target the SMALLPDF CRAFT PARITY block at the end of styles.css
const oldSectionMatch = /\/\* ═══ SMALLPDF CRAFT PARITY: COMPRESS PDF DROPZONE ═══ \*\/[\s\S]*$/;

const refinedStyles = `/* ═══ SMALLPDF CRAFT PARITY: COMPRESS PDF DROPZONE ═══ */

/* Universal Font & Wrapper for Compress PDF Page */
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

/* Hero Header Clean Spacing & Geometric Swiss Font (Matching Euclid Circular) */
.tool-page-wrap.theme-compress .fk-seo-hero-header,
#seo-tool-view .theme-compress .fk-seo-hero-header {
  text-align: center !important;
  margin: 36px auto 32px !important;
  max-width: 780px !important;
}

.tool-page-wrap.theme-compress .fk-seo-hero-title,
#seo-tool-view .theme-compress .fk-seo-hero-title,
#seo-tool-view .theme-compress h1 {
  font-family: 'Outfit', 'Plus Jakarta Sans', sans-serif !important;
  font-size: 42px !important;
  font-weight: 800 !important;
  color: #111827 !important;
  letter-spacing: -0.035em !important;
  line-height: 1.18 !important;
  margin: 0 0 12px 0 !important;
}

.tool-page-wrap.theme-compress .fk-seo-hero-desc,
#seo-tool-view .theme-compress .fk-seo-hero-desc,
#seo-tool-view .theme-compress .hero-subtitle {
  font-family: 'Outfit', 'Plus Jakarta Sans', sans-serif !important;
  font-size: 18px !important;
  font-weight: 400 !important;
  color: #4B5563 !important;
  letter-spacing: -0.01em !important;
  line-height: 1.5 !important;
  margin: 0 auto !important;
  max-width: 620px !important;
}

/* Solid Crimson Dropzone with Inset Dashed Border (Exact Smallpdf Sizing & Proportions) */
#seo-tool-view #stage .cpdf-dropzone,
#seo-tool-view .theme-compress .cpdf-dropzone,
.theme-compress #stage .cpdf-dropzone,
.theme-compress .cpdf-dropzone {
  background: #D9262E !important;
  border: none !important;
  border-radius: 12px !important;
  box-shadow: 0 10px 32px rgba(217, 38, 46, 0.22), 0 2px 8px rgba(0, 0, 0, 0.04) !important;
  max-width: 860px !important;
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
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease, background 0.2s ease !important;
}

#seo-tool-view #stage .cpdf-dropzone:hover,
.theme-compress .cpdf-dropzone:hover {
  background: #C71F27 !important;
  box-shadow: 0 14px 40px rgba(217, 38, 46, 0.28), 0 4px 12px rgba(0, 0, 0, 0.06) !important;
}

/* Inset Delicate Dashed White Border: Full, Balanced & Evenly Spaced */
.cpdf-inset-border {
  border: 1.5px dashed rgba(255, 255, 255, 0.6) !important;
  border-radius: 8px !important;
  padding: 46px 24px 42px !important;
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

/* 3 Stacked SVG Sheets Illustration */
.cpdf-hero-icon-cluster {
  margin-bottom: 24px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  line-height: 0 !important;
}

.cpdf-hero-icon-cluster svg {
  overflow: visible !important;
  filter: drop-shadow(0 6px 16px rgba(0, 0, 0, 0.12)) !important;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
}

.theme-compress .cpdf-dropzone:hover .cpdf-hero-icon-cluster svg {
  transform: translateY(-2px) scale(1.02) !important;
}

/* Compound Action Pill: [ 📄+ CHOOSE FILES | ▾ ] */
.cpdf-hero-btn-wrap {
  margin-bottom: 16px !important;
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
  color: rgba(255, 255, 255, 0.9) !important;
  margin: 0 !important;
  letter-spacing: -0.01em !important;
  pointer-events: none !important;
}

/* Clean Airy Trust Row Under Dropzone */
.fk-seo-trust-row {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 48px !important;
  margin: 36px auto 64px !important;
  padding: 0 16px !important;
  max-width: 860px !important;
}

.fk-trust-item {
  display: flex !important;
  align-items: center !important;
  gap: 12px !important;
  font-family: 'Outfit', 'Plus Jakarta Sans', sans-serif !important;
  font-size: 14.5px !important;
  font-weight: 600 !important;
  color: #374151 !important;
  letter-spacing: -0.01em !important;
}

.fk-trust-icon {
  width: 32px !important;
  height: 32px !important;
  border-radius: 50% !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  background: #EEF2F6 !important;
  flex-shrink: 0 !important;
}

@media (max-width: 768px) {
  #seo-tool-view #stage .cpdf-dropzone,
  .theme-compress .cpdf-dropzone {
    padding: 10px !important;
    border-radius: 10px !important;
    min-height: 250px !important;
  }
  .cpdf-inset-border {
    padding: 36px 16px 32px !important;
    min-height: 230px !important;
  }
  .cpdf-btn-main {
    padding: 12px 16px !important;
    font-size: 13px !important;
  }
  .fk-seo-trust-row {
    flex-direction: column !important;
    gap: 18px !important;
    margin: 28px auto 48px !important;
    align-items: flex-start !important;
    padding: 0 24px !important;
  }
}
`;

if (oldSectionMatch.test(css)) {
  css = css.replace(oldSectionMatch, refinedStyles);
  console.log('Replaced old section with refined styles.');
} else {
  css += '\n' + refinedStyles;
  console.log('Appended refined styles.');
}

fs.writeFileSync('css/styles.css', css, 'utf8');
console.log('css/styles.css updated successfully.');

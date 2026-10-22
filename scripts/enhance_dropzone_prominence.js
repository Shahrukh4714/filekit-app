const fs = require('fs');

// 1. Update css/styles.css
let css = fs.readFileSync('css/styles.css', 'utf8');

const sIdx = css.indexOf('/* ═══ SMALLPDF CRAFT PARITY: COMPRESS PDF DROPZONE ═══ */');
if (sIdx !== -1) {
  const newStyles = `/* ═══ SMALLPDF CRAFT PARITY: COMPRESS PDF DROPZONE ═══ */
.tool-page-wrap.theme-compress {
  max-width: 1000px !important;
  margin: 0 auto !important;
  padding: 0 20px !important;
}

/* Hero Header Clean Spacing */
.tool-page-wrap.theme-compress .fk-seo-hero-header {
  text-align: center;
  margin: 18px auto 28px;
}
.tool-page-wrap.theme-compress .fk-seo-hero-title {
  font-size: 38px !important;
  font-weight: 800 !important;
  color: #111827 !important;
  letter-spacing: -0.025em !important;
  margin: 0 !important;
}

/* Prominently Sized, Solid Crimson Dropzone */
.theme-compress .cpdf-dropzone,
.theme-compress #stage .cpdf-dropzone,
#seo-tool-view .theme-compress .cpdf-dropzone {
  background: #D9262E !important;
  border: 1px solid rgba(255, 255, 255, 0.18) !important;
  border-radius: 16px !important;
  box-shadow: 0 20px 42px -6px rgba(217, 38, 46, 0.32), 0 4px 12px rgba(0, 0, 0, 0.04) !important;
  max-width: 960px !important;
  width: 100% !important;
  min-height: 310px !important;
  margin: 0 auto !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 52px 32px !important;
  cursor: pointer !important;
  position: relative !important;
  outline: none !important;
  transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1) !important;
}

.theme-compress .cpdf-dropzone:hover {
  background: #CC1F27 !important;
  transform: translateY(-2px) !important;
  box-shadow: 0 26px 52px -8px rgba(204, 31, 39, 0.42), 0 6px 16px rgba(0, 0, 0, 0.06) !important;
}

/* Active Drag Over Feedback */
.theme-compress .cpdf-dropzone.cpdf-dz--over,
.theme-compress .cpdf-dropzone.drag-active {
  background: #B9171E !important;
  outline: 3px dashed rgba(255, 255, 255, 0.85) !important;
  outline-offset: -10px !important;
  transform: scale(1.008) !important;
}

.cpdf-hero-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  width: 100%;
}

.cpdf-hero-icon {
  color: #FFFFFF;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease;
}
.theme-compress .cpdf-dropzone:hover .cpdf-hero-icon {
  transform: translateY(-2px);
}

.cpdf-hero-choose-btn {
  background: #FFFFFF !important;
  color: #D9262E !important;
  font-family: inherit;
  font-size: 17px !important;
  font-weight: 700 !important;
  padding: 16px 40px !important;
  border-radius: 10px !important;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.16) !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: 12px !important;
  cursor: pointer !important;
  user-select: none !important;
  transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease !important;
}

.cpdf-hero-choose-btn:hover {
  background: #FFF8F8 !important;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2) !important;
  transform: translateY(-1px) !important;
}
.cpdf-hero-choose-btn:active {
  transform: translateY(1px) scale(0.99) !important;
}

.cpdf-hero-btn-arrow {
  font-size: 12px;
  opacity: 0.65;
  transition: transform 0.2s ease;
}

.cpdf-hero-subtext {
  color: rgba(255, 255, 255, 0.95) !important;
  font-size: 15px !important;
  font-weight: 500 !important;
  margin-top: 18px !important;
  margin-bottom: 0 !important;
  letter-spacing: 0.01em;
}

/* Aligned Trust Row Under Dropzone */
.fk-seo-trust-row {
  max-width: 960px !important;
  width: 100% !important;
  margin: 32px auto 90px !important;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 48px;
}
.fk-trust-left {
  flex: 1;
}
.fk-trust-left p {
  font-size: 15px;
  color: #4B5563;
  line-height: 1.65;
  margin: 0;
}
.fk-trust-right {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex-shrink: 0;
}
.fk-trust-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14.5px;
  font-weight: 500;
  color: #1F2937;
}

@media (max-width: 768px) {
  .theme-compress .cpdf-dropzone,
  .theme-compress #stage .cpdf-dropzone {
    min-height: 260px !important;
    padding: 36px 20px !important;
  }
  .cpdf-hero-choose-btn {
    padding: 14px 28px !important;
    font-size: 15.5px !important;
  }
  .fk-seo-trust-row {
    flex-direction: column;
    gap: 20px;
    margin-bottom: 50px !important;
  }
}
`;
  css = css.slice(0, sIdx) + newStyles;
  fs.writeFileSync('css/styles.css', css, 'utf8');
  console.log('✓ Updated css/styles.css with prominent, evenly sized dropzone');
}

// 2. Update icon in js/tools.js renderUpload to 52x52
let toolsJs = fs.readFileSync('js/tools.js', 'utf8');
const oldSvg = `<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">`;
const newSvg = `<svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round">`;
if (toolsJs.includes(oldSvg)) {
  toolsJs = toolsJs.replace(oldSvg, newSvg);
  fs.writeFileSync('js/tools.js', toolsJs, 'utf8');
  console.log('✓ Updated icon size in js/tools.js');
}

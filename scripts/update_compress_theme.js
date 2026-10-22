const fs = require('fs');

// 1. Update css/styles.css
let css = fs.readFileSync('css/styles.css', 'utf8');

// Replace theme variables
const oldVar = `.tool-page-wrap.theme-compress,
.tool-page-wrap.theme-yellow {
  --seo-accent: #EAB308;
  --seo-accent-hover: #CA8A04;
  --seo-accent-soft: #FEFCE8;
  --seo-accent-border: #FEF08A;
  --seo-accent-glow: rgba(234, 179, 8, 0.18);
}`;

const newVar = `.tool-page-wrap.theme-compress,
.tool-page-wrap.theme-yellow {
  --seo-accent: #E5252A;
  --seo-accent-hover: #DC2626;
  --seo-accent-soft: #FEF2F2;
  --seo-accent-border: #FECACA;
  --seo-accent-glow: rgba(229, 37, 42, 0.18);
}`;

css = css.replace(oldVar.replace(/\n/g, '\r\n'), newVar.replace(/\n/g, '\r\n'));
css = css.replace(oldVar, newVar);

// Replace dropzone styles
const oldDz = `.theme-compress .cpdf-dropzone,
.theme-compress #stage .cpdf-dropzone,
#seo-tool-view .theme-compress .cpdf-dropzone {
  background: #FACC15 !important;
  border: 1.5px solid #EAB308 !important;
  box-shadow: 0 14px 38px -6px rgba(234, 179, 8, 0.32), 0 4px 12px rgba(0, 0, 0, 0.04) !important;
  color: #0A0A0A !important;
  transform: none !important;
}
.theme-compress .cpdf-dropzone .cpdf-dz-headline,
.theme-compress .cpdf-dropzone .cpdf-dz-meta,
.theme-compress .cpdf-dropzone .cpdf-dz-cta {
  color: #0A0A0A !important;
}
.theme-compress .cpdf-dropzone .cpdf-dz-link {
  color: #854D0E !important;
  text-decoration: underline;
}
.theme-compress .cpdf-dropzone .select-files-main-btn,
.theme-compress .cpdf-dropzone .cpdf-dz-btn {
  background: #0A0A0A !important;
  color: #FFFFFF !important;
}
.theme-compress .cpdf-dropzone .select-files-main-btn:hover,
.theme-compress .cpdf-dropzone .cpdf-dz-btn:hover {
  background: #171717 !important;
  transform: none !important;
}`;

const newDz = `.theme-compress .cpdf-dropzone,
.theme-compress #stage .cpdf-dropzone,
#seo-tool-view .theme-compress .cpdf-dropzone {
  background: #E5252A !important;
  border: 2px dashed rgba(255, 255, 255, 0.45) !important;
  border-radius: 16px !important;
  box-shadow: 0 16px 38px -6px rgba(229, 37, 42, 0.28), 0 4px 12px rgba(0, 0, 0, 0.04) !important;
  color: #FFFFFF !important;
  transform: none !important;
  padding: 44px 28px !important;
}
.theme-compress .cpdf-dropzone .drop-title,
.theme-compress .cpdf-dropzone .cpdf-dz-headline,
.theme-compress .cpdf-dropzone .cpdf-dz-meta,
.theme-compress .cpdf-dropzone .cpdf-dz-cta {
  color: #FFFFFF !important;
  font-weight: 700 !important;
}
.theme-compress .cpdf-dropzone .drop-formats {
  color: rgba(255, 255, 255, 0.85) !important;
  font-size: 13px !important;
  margin-top: 10px !important;
}
.theme-compress .cpdf-dropzone .drop-illustration svg path,
.theme-compress .cpdf-dropzone .drop-illustration svg rect,
.theme-compress .cpdf-dropzone .drop-illustration svg line,
.theme-compress .cpdf-dropzone .drop-illustration svg circle {
  stroke: #FFFFFF !important;
}
.theme-compress .cpdf-dropzone .cpdf-dz-link {
  color: #FECACA !important;
  text-decoration: underline;
}
.theme-compress .cpdf-dropzone .select-files-main-btn,
.theme-compress .cpdf-dropzone .cpdf-dz-btn {
  background: #FFFFFF !important;
  color: #E5252A !important;
  font-weight: 700 !important;
  border-radius: 8px !important;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.14) !important;
  padding: 12px 28px !important;
  font-size: 15px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  transition: all 0.15s ease !important;
}
.theme-compress .cpdf-dropzone .select-files-main-btn:hover,
.theme-compress .cpdf-dropzone .cpdf-dz-btn:hover {
  background: #FFF5F5 !important;
  color: #DC2626 !important;
  transform: translateY(-1px) !important;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.18) !important;
}`;

css = css.replace(oldDz.replace(/\n/g, '\r\n'), newDz.replace(/\n/g, '\r\n'));
css = css.replace(oldDz, newDz);

fs.writeFileSync('css/styles.css', css, 'utf8');
console.log('Updated css/styles.css theme-compress to Signature Red!');

// 2. Update js/app.js getToolTheme
let appJs = fs.readFileSync('js/app.js', 'utf8');
const oldAppTheme = `return { task: 'compress', color: '#EAB308', hover: '#CA8A04', bg: '#FEFCE8', border: '#FEF08A', glow: 'rgba(234,179,8,0.25)', cardBorder: '#FEF9C3' };`;
const newAppTheme = `return { task: 'compress', color: '#E5252A', hover: '#DC2626', bg: '#FEF2F2', border: '#FECACA', glow: 'rgba(229,37,42,0.25)', cardBorder: '#FEE2E2' };`;

appJs = appJs.replace(oldAppTheme, newAppTheme);
fs.writeFileSync('js/app.js', appJs, 'utf8');
console.log('Updated js/app.js getToolTheme to Signature Red!');

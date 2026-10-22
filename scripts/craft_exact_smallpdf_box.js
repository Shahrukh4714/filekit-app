const fs = require('fs');

// 1. Update renderUpload in js/tools.js
let toolsJs = fs.readFileSync('js/tools.js', 'utf8');

const ruStart = toolsJs.indexOf('/* ── Step 1: Upload ─────────────────────────────── */');
if (ruStart !== -1) {
  const nextFn = toolsJs.indexOf('/* ── Step 2: Configure ── */', ruStart);
  if (nextFn !== -1) {
    const newRenderUpload = `/* ── Step 1: Upload ─────────────────────────────── */
    function renderUpload() {
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
                  <!-- Pie chart circle -->
                  <circle cx="17" cy="24" r="9" stroke="#FFFFFF" stroke-width="1.4"/>
                  <path d="M17 15 V24 H26" stroke="#FFFFFF" stroke-width="1.4"/>
                </g>

                <!-- Center Sheet: Prominent PDF with Folded Corner -->
                <g transform="translate(32, 2)">
                  <path d="M 0 3 C 0 1.34 1.34 0 3 0 L 24 0 L 36 12 L 36 51 C 36 52.66 34.66 54 33 54 L 3 54 C 1.34 54 0 52.66 0 51 Z" fill="#D9262E" stroke="#FFFFFF" stroke-width="1.8"/>
                  <path d="M 24 0 V 12 H 36" stroke="#FFFFFF" stroke-width="1.8" fill="none"/>
                  <!-- PDF Red Badge Tag -->
                  <rect x="5" y="24" width="26" height="12" rx="2" fill="#FFFFFF"/>
                  <text x="18" y="33" fill="#D9262E" font-family="'Outfit', 'Inter', sans-serif" font-size="8.5" font-weight="900" text-anchor="middle" letter-spacing="0.05em">PDF</text>
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

      const dz  = container.querySelector('#cpdf-dz');
      const inp = container.querySelector('#cpdf-inp');
      inp.onchange = () => { addFiles(inp.files); inp.value = ''; };
      dz.addEventListener('dragover',  e => { e.preventDefault(); dz.classList.add('cpdf-dz--over'); });
      dz.addEventListener('dragleave', ()  => dz.classList.remove('cpdf-dz--over'));
      dz.addEventListener('drop', e => {
        e.preventDefault(); dz.classList.remove('cpdf-dz--over');
        addFiles(e.dataTransfer?.files);
      });
      dz.addEventListener('click',   e => { if (!e.target.closest('label')) inp.click(); });
      dz.addEventListener('keydown', e => { if (e.key==='Enter'||e.key===' ') inp.click(); });
    }

    `;
    toolsJs = toolsJs.slice(0, ruStart) + newRenderUpload + toolsJs.slice(nextFn);
    fs.writeFileSync('js/tools.js', toolsJs, 'utf8');
    console.log('✓ Successfully updated renderUpload in js/tools.js with Compound Button and Inset Dashed Border');
  }
}

// 2. Update css/styles.css
let css = fs.readFileSync('css/styles.css', 'utf8');

const sIdx = css.indexOf('/* ═══ SMALLPDF CRAFT PARITY: COMPRESS PDF DROPZONE ═══ */');
if (sIdx !== -1) {
  const newStyles = `/* ═══ SMALLPDF CRAFT PARITY: COMPRESS PDF DROPZONE ═══ */
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Outfit:wght@500;600;700;800&display=swap');

.tool-page-wrap.theme-compress {
  max-width: 1040px !important;
  margin: 0 auto !important;
  padding: 0 20px !important;
  font-family: 'Plus Jakarta Sans', 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
}

/* Hero Header Clean Spacing & Geometric Font Matching Smallpdf */
.tool-page-wrap.theme-compress .fk-seo-hero-header {
  text-align: center;
  margin: 24px auto 32px;
}
.tool-page-wrap.theme-compress .fk-seo-hero-title {
  font-family: 'Plus Jakarta Sans', 'Outfit', sans-serif !important;
  font-size: 42px !important;
  font-weight: 800 !important;
  color: #171717 !important;
  letter-spacing: -0.03em !important;
  line-height: 1.15 !important;
  margin: 0 !important;
}

/* Solid Crimson Dropzone with Inset Dashed Border (Exact Smallpdf Replication) */
.theme-compress .cpdf-dropzone,
.theme-compress #stage .cpdf-dropzone,
#seo-tool-view .theme-compress .cpdf-dropzone {
  background: #D9262E !important;
  border: none !important;
  border-radius: 8px !important;
  box-shadow: 0 4px 16px rgba(217, 38, 46, 0.15) !important;
  max-width: 960px !important;
  width: 100% !important;
  margin: 0 auto !important;
  padding: 14px !important;
  box-sizing: border-box !important;
  cursor: pointer !important;
  position: relative !important;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
}

.theme-compress .cpdf-dropzone:hover {
  background: #C71F27 !important;
}

/* Inset Delicate Dashed White Border */
.cpdf-inset-border {
  border: 1px dashed rgba(255, 255, 255, 0.55);
  border-radius: 6px;
  padding: 44px 20px 36px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  width: 100%;
  box-sizing: border-box;
}

.cpdf-hero-icon-cluster {
  margin-bottom: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Compound Pill Button [ 📄+ CHOOSE FILES | ▾ ] */
.cpdf-hero-btn-wrap {
  margin-bottom: 14px;
}

.cpdf-compound-btn {
  background: #FFFFFF !important;
  border-radius: 6px !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.16) !important;
  display: inline-flex !important;
  align-items: center !important;
  padding: 0 !important;
  cursor: pointer !important;
  user-select: none !important;
  transition: transform 0.12s ease, box-shadow 0.12s ease, background 0.12s ease !important;
  overflow: hidden !important;
}

.cpdf-compound-btn:hover {
  background: #FAFAFA !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.22) !important;
  transform: translateY(-1px) !important;
}
.cpdf-compound-btn:active {
  transform: translateY(0px) scale(0.99) !important;
}

.cpdf-btn-main {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 13px 22px 13px 24px;
  font-family: 'Plus Jakarta Sans', 'Outfit', sans-serif !important;
  font-size: 13.5px !important;
  font-weight: 800 !important;
  letter-spacing: 0.06em !important;
  color: #171717 !important;
}

.cpdf-btn-divider {
  width: 1px;
  height: 24px;
  background: #E5E7EB;
}

.cpdf-btn-caret {
  padding: 13px 18px;
  font-size: 11px;
  color: #171717;
  opacity: 0.75;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cpdf-hero-subtext {
  color: rgba(255, 255, 255, 0.95) !important;
  font-family: 'Plus Jakarta Sans', 'Outfit', sans-serif !important;
  font-size: 14px !important;
  font-weight: 500 !important;
  margin: 0 !important;
  letter-spacing: 0.01em;
}

/* Under-Dropzone Trust Row (Exact Smallpdf Replication) */
.fk-seo-trust-row {
  max-width: 960px !important;
  width: 100% !important;
  margin: 32px auto 90px !important;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 50px;
}
.fk-trust-left {
  flex: 1.1;
}
.fk-trust-left p {
  font-family: 'Plus Jakarta Sans', 'Outfit', sans-serif !important;
  font-size: 15px !important;
  color: #374151 !important;
  line-height: 1.65 !important;
  margin: 0 0 8px 0 !important;
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
  gap: 12px;
  font-family: 'Plus Jakarta Sans', 'Outfit', sans-serif !important;
  font-size: 14.5px !important;
  font-weight: 500 !important;
  color: #1F2937 !important;
}
.fk-trust-item svg {
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .cpdf-inset-border {
    padding: 32px 14px 28px;
  }
  .cpdf-btn-main {
    padding: 11px 16px;
    font-size: 12.5px !important;
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
  console.log('✓ Updated css/styles.css with exact Smallpdf compound button, inset dashed border, and typography');
}

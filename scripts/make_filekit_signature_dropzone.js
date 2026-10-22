const fs = require('fs');

console.log('═══════════════════════════════════════════════════════════');
console.log('  Crafting FileKit Signature Studio Dropzone & Layout      ');
console.log('═══════════════════════════════════════════════════════════');

// 1. UPDATE index.html
let html = fs.readFileSync('index.html', 'utf8');

const heroHeaderRegex = /<div class="fk-seo-hero-header">[\s\S]*?<h1 class="fk-seo-hero-title"[^>]*>[\s\S]*?<\/h1>[\s\S]*?<\/div>/;

const newHeroHeader = `<div class="fk-seo-hero-header">
      <div class="fk-seo-badge-pill" id="fk-seo-badge-pill">
        <span class="fk-badge-dot"></span>
        <span id="fk-seo-badge-text">100% Private In-Browser WebAssembly</span>
      </div>
      <h1 class="fk-seo-hero-title" id="fk-seo-hero-title">Compress PDF Files Online for Free</h1>
      <p class="fk-seo-hero-desc" id="fk-seo-hero-desc">Reduce PDF file size up to 90% while preserving original text sharpness, images, and formatting. Zero cloud uploads &mdash; processed entirely in your browser.</p>
    </div>`;

if (heroHeaderRegex.test(html)) {
  html = html.replace(heroHeaderRegex, newHeroHeader);
  fs.writeFileSync('index.html', html, 'utf8');
  console.log('✓ index.html: Hero header updated with badge, H1, and subtitle.');
} else {
  console.log('! index.html: heroHeaderRegex did not match.');
}

// 2. UPDATE js/tools.js (mountCompressPDF renderUpload)
let tools = fs.readFileSync('js/tools.js', 'utf8');

const oldRenderUploadRegex = /function renderUpload\(\) \{[\s\S]*?container\.innerHTML = `[\s\S]*?<\/div>`;[\s\S]*?const dz\s*=\s*container\.querySelector\('#cpdf-dz'\);/;

const newRenderUpload = `function renderUpload() {
      container.innerHTML = \`
        <div class="cpdf-dropzone drop-hero-box fk-studio-dropzone" id="cpdf-dz" tabindex="0" role="button" aria-label="Upload files to compress">
          <div class="cpdf-inset-border">
            <!-- Proprietary FileKit Compression Visualizer -->
            <div class="cpdf-hero-icon-cluster">
              <div class="fk-compression-visualizer">
                <!-- Original Document Glyph -->
                <div class="fk-doc-card fk-doc-original">
                  <div class="fk-doc-badge">PDF</div>
                  <div class="fk-doc-lines">
                    <span></span><span></span><span></span>
                  </div>
                  <div class="fk-doc-size-tag">10 MB</div>
                </div>

                <!-- Animated Compression Vector Conduit -->
                <div class="fk-compress-conduit">
                  <div class="fk-conduit-arrow">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#E11D48" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M5 12h14"></path>
                      <path d="m13 18 6-6-6-6"></path>
                    </svg>
                  </div>
                  <span class="fk-conduit-pill">-88%</span>
                </div>

                <!-- Optimized Compact Document Glyph -->
                <div class="fk-doc-card fk-doc-optimized">
                  <div class="fk-doc-badge fk-badge-green">PDF</div>
                  <div class="fk-doc-lines">
                    <span></span><span></span>
                  </div>
                  <div class="fk-doc-size-tag fk-tag-green">1.2 MB</div>
                </div>
              </div>
            </div>
            
            <!-- Tactile Obsidian Action Button [ 📄+ SELECT PDF FILES | ▾ ] -->
            <div class="cpdf-hero-btn-wrap">
              <label for="cpdf-inp" class="cpdf-compound-btn fk-btn-obsidian" tabindex="0">
                <span class="cpdf-btn-main">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                  <span>SELECT PDF FILES</span>
                </span>
                <span class="cpdf-btn-divider"></span>
                <span class="cpdf-btn-caret">&#9662;</span>
              </label>
            </div>
            
            <p class="cpdf-hero-subtext">or drag &amp; drop PDF files here</p>
            <div class="cpdf-format-hint">
              <span class="cpdf-hint-pill">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                Instant Local RAM &bull; Up to 2 GB &bull; Zero Server Uploads
              </span>
            </div>
          </div>
          <input id="cpdf-inp" type="file" accept="\${ACCEPT_STR}" multiple hidden>
        </div>\`;

      const dz  = container.querySelector('#cpdf-dz');`;

if (oldRenderUploadRegex.test(tools)) {
  tools = tools.replace(oldRenderUploadRegex, newRenderUpload);
  fs.writeFileSync('js/tools.js', tools, 'utf8');
  console.log('✓ js/tools.js: mountCompressPDF renderUpload updated with FileKit signature visualizer.');
} else {
  console.log('! js/tools.js: oldRenderUploadRegex did not match.');
}

// 3. UPDATE js/app.js (getCompressPdfSeoHtml & openSeoToolPage)
let app = fs.readFileSync('js/app.js', 'utf8');

// Update getCompressPdfSeoHtml so it has an elegant 3-pill trust row directly under dropzone
const oldTrustRowMatch = /getCompressPdfSeoHtml\(\)\s*\{\s*return\s*`[\s\S]*?<!-- Sub-Hero Trust Bar[\s\S]*?<\/div>\s*<\/div>/;

const newTrustRow = `getCompressPdfSeoHtml() { return \`
      <!-- Centered 3-Pill Trust Bar (FileKit Signature Polish) -->
      <div class="fk-seo-trust-row fk-trust-pills-row">
        <div class="fk-trust-pill-card">
          <div class="fk-trust-pill-icon fk-icon-amber">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          </div>
          <div class="fk-trust-pill-content">
            <strong>Instant RAM Engine</strong>
            <span>Zero cloud queue times &bull; Local processing</span>
          </div>
        </div>

        <div class="fk-trust-pill-card">
          <div class="fk-trust-pill-icon fk-icon-green">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <div class="fk-trust-pill-content">
            <strong>100% Client-Side Privacy</strong>
            <span>Files never leave your computer</span>
          </div>
        </div>

        <div class="fk-trust-pill-card">
          <div class="fk-trust-pill-icon fk-icon-blue">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/></svg>
          </div>
          <div class="fk-trust-pill-content">
            <strong>Lossless Text &amp; Images</strong>
            <span>Adaptive vector &amp; DPI optimization</span>
          </div>
        </div>
      </div>\``;

if (oldTrustRowMatch.test(app)) {
  app = app.replace(oldTrustRowMatch, newTrustRow);
  fs.writeFileSync('js/app.js', app, 'utf8');
  console.log('✓ js/app.js: getCompressPdfSeoHtml updated with 3-pill trust row.');
} else {
  console.log('! js/app.js: oldTrustRowMatch did not match.');
}

// 4. UPDATE css/styles.css with FileKit Studio Dropzone Design System
let css = fs.readFileSync('css/styles.css', 'utf8');

const oldStylesRegex = /\/\* ═══ SMALLPDF CRAFT PARITY: COMPRESS PDF DROPZONE ═══ \*\/[\s\S]*$/;

const signatureStyles = `/* ═══ FILEKIT SIGNATURE STUDIO: COMPRESS PDF DROPZONE ═══ */

/* Universal Page Font & Container Alignment */
.tool-page-wrap.theme-compress,
#seo-tool-view .theme-compress,
.theme-compress {
  max-width: 1120px !important;
  margin: 0 auto !important;
  padding: 0 24px !important;
  font-family: 'Outfit', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Hero Header: Badge, H1, and Subtitle */
.fk-seo-hero-header {
  text-align: center !important;
  margin: 32px auto 28px !important;
  max-width: 820px !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
}

.fk-seo-badge-pill {
  display: inline-flex !important;
  align-items: center !important;
  gap: 8px !important;
  background: #FFF1F2 !important;
  border: 1px solid #FFE4E6 !important;
  color: #BE123C !important;
  font-family: 'Outfit', 'Plus Jakarta Sans', sans-serif !important;
  font-size: 13px !important;
  font-weight: 600 !important;
  letter-spacing: 0.02em !important;
  padding: 5px 14px !important;
  border-radius: 9999px !important;
  margin-bottom: 14px !important;
}

.fk-badge-dot {
  width: 7px !important;
  height: 7px !important;
  border-radius: 50% !important;
  background: #E11D48 !important;
  box-shadow: 0 0 0 3px rgba(225, 29, 72, 0.2) !important;
  animation: fk-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes fk-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(0.9); }
}

.fk-seo-hero-title {
  font-family: 'Outfit', 'Plus Jakarta Sans', sans-serif !important;
  font-size: 44px !important;
  font-weight: 800 !important;
  color: #0F172A !important;
  letter-spacing: -0.035em !important;
  line-height: 1.15 !important;
  margin: 0 0 12px 0 !important;
}

.fk-seo-hero-desc {
  font-family: 'Outfit', 'Plus Jakarta Sans', sans-serif !important;
  font-size: 17.5px !important;
  font-weight: 400 !important;
  color: #475569 !important;
  letter-spacing: -0.01em !important;
  line-height: 1.55 !important;
  margin: 0 auto !important;
  max-width: 660px !important;
}

/* ── FILEKIT SIGNATURE STUDIO DROPZONE CARD ── */
#seo-tool-view #stage .cpdf-dropzone,
#seo-tool-view .theme-compress .cpdf-dropzone,
.theme-compress #stage .cpdf-dropzone,
.theme-compress .cpdf-dropzone.fk-studio-dropzone {
  background: radial-gradient(ellipse 70% 50% at 50% -10%, rgba(225, 29, 72, 0.07) 0%, rgba(255, 255, 255, 0) 100%), #FFFFFF !important;
  border: 1px solid #E2E8F0 !important;
  border-radius: 20px !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03), 0 20px 45px -15px rgba(15, 23, 42, 0.08) !important;
  max-width: 880px !important;
  width: 100% !important;
  min-height: 330px !important;
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
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease, border-color 0.25s ease !important;
}

#seo-tool-view #stage .cpdf-dropzone:hover,
.theme-compress .cpdf-dropzone.fk-studio-dropzone:hover {
  border-color: #CBD5E1 !important;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.04), 0 25px 50px -12px rgba(15, 23, 42, 0.12) !important;
  transform: translateY(-2px) !important;
}

/* Dragging Over Dynamic State */
.theme-compress .cpdf-dropzone.cpdf-dz--over {
  border-color: #E11D48 !important;
  box-shadow: 0 0 0 4px rgba(225, 29, 72, 0.15), 0 25px 50px -12px rgba(225, 29, 72, 0.2) !important;
  transform: scale(1.01) !important;
}

/* Inner Tactile Drop Field */
.cpdf-inset-border {
  border: 1.5px dashed #CBD5E1 !important;
  border-radius: 14px !important;
  background: #F8FAFC !important;
  padding: 38px 24px 34px !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  text-align: center !important;
  box-sizing: border-box !important;
  width: 100% !important;
  min-height: 304px !important;
  pointer-events: none !important;
  transition: border-color 0.2s ease, background-color 0.2s ease !important;
}

.theme-compress .cpdf-dropzone:hover .cpdf-inset-border {
  border-color: #94A3B8 !important;
  background: #F9FAFB !important;
}

.theme-compress .cpdf-dropzone.cpdf-dz--over .cpdf-inset-border {
  border-color: #E11D48 !important;
  background: #FFF1F2 !important;
}

/* ── PROPRIETARY FILEKIT COMPRESSION VISUALIZER ── */
.fk-compression-visualizer {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 20px !important;
  margin-bottom: 24px !important;
}

.fk-doc-card {
  width: 58px !important;
  height: 72px !important;
  background: #FFFFFF !important;
  border: 1px solid #E2E8F0 !important;
  border-radius: 8px !important;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08) !important;
  padding: 8px 6px !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: space-between !important;
  position: relative !important;
  transition: transform 0.2s ease !important;
}

.theme-compress .cpdf-dropzone:hover .fk-doc-original {
  transform: translateY(-2px) rotate(-2deg) !important;
}

.theme-compress .cpdf-dropzone:hover .fk-doc-optimized {
  transform: translateY(-2px) rotate(2deg) !important;
}

.fk-doc-badge {
  background: #E11D48 !important;
  color: #FFFFFF !important;
  font-family: 'Outfit', sans-serif !important;
  font-size: 8.5px !important;
  font-weight: 800 !important;
  letter-spacing: 0.05em !important;
  padding: 2px 5px !important;
  border-radius: 3px !important;
}

.fk-doc-badge.fk-badge-green {
  background: #10B981 !important;
}

.fk-doc-lines {
  width: 100% !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 3px !important;
  padding: 0 4px !important;
  box-sizing: border-box !important;
}

.fk-doc-lines span {
  height: 2.5px !important;
  background: #E2E8F0 !important;
  border-radius: 2px !important;
  display: block !important;
}

.fk-doc-lines span:nth-child(1) { width: 100% !important; }
.fk-doc-lines span:nth-child(2) { width: 80% !important; }
.fk-doc-lines span:nth-child(3) { width: 60% !important; }

.fk-doc-size-tag {
  font-family: 'Outfit', monospace !important;
  font-size: 10px !important;
  font-weight: 700 !important;
  color: #64748B !important;
}

.fk-doc-size-tag.fk-tag-green {
  color: #059669 !important;
}

/* Compression Conduit */
.fk-compress-conduit {
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  gap: 4px !important;
}

.fk-conduit-arrow {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 32px !important;
  height: 32px !important;
  border-radius: 50% !important;
  background: #FFF1F2 !important;
  border: 1px solid #FFE4E6 !important;
  transition: transform 0.2s ease !important;
}

.theme-compress .cpdf-dropzone:hover .fk-conduit-arrow {
  transform: translateX(3px) !important;
}

.fk-conduit-pill {
  font-family: 'Outfit', sans-serif !important;
  font-size: 11px !important;
  font-weight: 800 !important;
  color: #E11D48 !important;
  background: #FFF1F2 !important;
  border: 1px solid #FFE4E6 !important;
  padding: 1px 7px !important;
  border-radius: 9999px !important;
  letter-spacing: -0.02em !important;
}

/* ── TACTILE OBSIDIAN ACTION BUTTON ── */
.cpdf-hero-btn-wrap {
  margin-bottom: 12px !important;
  display: flex !important;
  justify-content: center !important;
}

.cpdf-compound-btn.fk-btn-obsidian {
  display: inline-flex !important;
  align-items: stretch !important;
  background: #0F172A !important;
  color: #FFFFFF !important;
  border-radius: 10px !important;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.2), 0 1px 3px rgba(0, 0, 0, 0.1) !important;
  overflow: hidden !important;
  pointer-events: auto !important;
  cursor: pointer !important;
  transition: transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.18s ease, background-color 0.18s ease !important;
  user-select: none !important;
}

.cpdf-compound-btn.fk-btn-obsidian:hover {
  background: #1E293B !important;
  transform: translateY(-1.5px) !important;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.28), 0 2px 6px rgba(0, 0, 0, 0.12) !important;
}

.cpdf-compound-btn.fk-btn-obsidian:active {
  transform: translateY(1px) scale(0.98) !important;
}

.cpdf-btn-main {
  background: transparent !important;
  border: none !important;
  color: #FFFFFF !important;
  font-family: 'Outfit', 'Plus Jakarta Sans', sans-serif !important;
  font-size: 14.5px !important;
  font-weight: 700 !important;
  letter-spacing: 0.03em !important;
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
  background: rgba(255, 255, 255, 0.18) !important;
  margin: 9px 0 !important;
}

.cpdf-btn-caret {
  background: transparent !important;
  border: none !important;
  padding: 0 16px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  cursor: pointer !important;
  color: #94A3B8 !important;
  font-size: 13px !important;
  transition: background 0.15s ease, color 0.15s ease !important;
}

.cpdf-compound-btn.fk-btn-obsidian:hover .cpdf-btn-caret {
  background: rgba(255, 255, 255, 0.08) !important;
  color: #FFFFFF !important;
}

/* Secondary Subtext */
.cpdf-hero-subtext {
  font-family: 'Outfit', 'Plus Jakarta Sans', sans-serif !important;
  font-size: 14px !important;
  font-weight: 500 !important;
  color: #64748B !important;
  margin: 0 0 10px 0 !important;
  letter-spacing: -0.01em !important;
  pointer-events: none !important;
}

/* Format Hint Badge */
.cpdf-format-hint {
  pointer-events: none !important;
}

.cpdf-hint-pill {
  display: inline-flex !important;
  align-items: center !important;
  gap: 6px !important;
  font-family: 'Outfit', 'Plus Jakarta Sans', sans-serif !important;
  font-size: 11.5px !important;
  font-weight: 500 !important;
  color: #94A3B8 !important;
  background: #F1F5F9 !important;
  border: 1px solid #E2E8F0 !important;
  padding: 3px 10px !important;
  border-radius: 9999px !important;
}

/* ── 3-PILL BALANCED TRUST ROW DIRECTLY BELOW DROPZONE ── */
.fk-trust-pills-row {
  display: grid !important;
  grid-template-columns: repeat(3, 1fr) !important;
  gap: 20px !important;
  margin: 32px auto 64px !important;
  max-width: 880px !important;
  padding: 0 10px !important;
}

.fk-trust-pill-card {
  background: #FFFFFF !important;
  border: 1px solid #E2E8F0 !important;
  border-radius: 14px !important;
  padding: 16px 18px !important;
  display: flex !important;
  align-items: center !important;
  gap: 14px !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02) !important;
  transition: transform 0.2s ease, box-shadow 0.2s ease !important;
}

.fk-trust-pill-card:hover {
  transform: translateY(-1px) !important;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.06) !important;
}

.fk-trust-pill-icon {
  width: 38px !important;
  height: 38px !important;
  border-radius: 10px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  flex-shrink: 0 !important;
}

.fk-icon-amber { background: #FEF3C7 !important; color: #D97706 !important; }
.fk-icon-green { background: #DCFCE7 !important; color: #16A34A !important; }
.fk-icon-blue  { background: #DBEAFE !important; color: #2563EB !important; }

.fk-trust-pill-content {
  display: flex !important;
  flex-direction: column !important;
  text-align: left !important;
}

.fk-trust-pill-content strong {
  font-family: 'Outfit', 'Plus Jakarta Sans', sans-serif !important;
  font-size: 14px !important;
  font-weight: 700 !important;
  color: #0F172A !important;
  letter-spacing: -0.01em !important;
}

.fk-trust-pill-content span {
  font-family: 'Outfit', 'Plus Jakarta Sans', sans-serif !important;
  font-size: 12px !important;
  color: #64748B !important;
  margin-top: 2px !important;
}

@media (max-width: 820px) {
  .fk-trust-pills-row {
    grid-template-columns: 1fr !important;
    gap: 12px !important;
    margin: 24px auto 48px !important;
  }
  .fk-seo-hero-title {
    font-size: 32px !important;
  }
  .fk-seo-hero-desc {
    font-size: 15px !important;
  }
  .cpdf-inset-border {
    padding: 28px 16px 24px !important;
    min-height: 240px !important;
  }
  .cpdf-btn-main {
    padding: 12px 16px !important;
    font-size: 13px !important;
  }
}
`;

if (oldStylesRegex.test(css)) {
  css = css.replace(oldStylesRegex, signatureStyles);
  console.log('✓ css/styles.css: Replaced old Smallpdf styles with FileKit Signature Studio styles.');
} else {
  css += '\n' + signatureStyles;
  console.log('✓ css/styles.css: Appended FileKit Signature Studio styles.');
}

fs.writeFileSync('css/styles.css', css, 'utf8');

console.log('═══════════════════════════════════════════════════════════');
console.log('  All Files Updated Successfully! Running Build...        ');
console.log('═══════════════════════════════════════════════════════════');

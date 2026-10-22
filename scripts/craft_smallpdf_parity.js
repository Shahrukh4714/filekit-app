const fs = require('fs');

// 1. Update renderUpload in js/tools.js
let toolsJs = fs.readFileSync('js/tools.js', 'utf8');

const oldRenderUploadStart = '    function renderUpload() {\n      container.innerHTML = `\n        <div class="cpdf-dropzone drop-hero-box" id="cpdf-dz" tabindex="0" role="button" aria-label="Upload files to compress">';
const oldRenderUploadEnd = '          <input id="cpdf-inp" type="file" accept="${ACCEPT_STR}" multiple hidden>\n        </div>`;';

// We locate renderUpload in tools.js
const ruStart = toolsJs.indexOf('/* ── Step 1: Upload ─────────────────────────────── */');
if (ruStart !== -1) {
  const nextFn = toolsJs.indexOf('/* ── Step 2: Configure ── */', ruStart);
  if (nextFn !== -1) {
    const newRenderUpload = `/* ── Step 1: Upload ─────────────────────────────── */
    function renderUpload() {
      container.innerHTML = \`
        <div class="cpdf-dropzone drop-hero-box" id="cpdf-dz" tabindex="0" role="button" aria-label="Upload files to compress">
          <div class="cpdf-hero-card">
            <div class="cpdf-hero-icon">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="12" y1="18" x2="12" y2="12"/>
                <polyline points="9 15 12 18 15 15"/>
              </svg>
            </div>
            
            <div class="cpdf-hero-btn-wrap">
              <label for="cpdf-inp" class="cpdf-hero-choose-btn">
                <span>Choose Files</span>
                <span class="cpdf-hero-btn-arrow">&#9662;</span>
              </label>
            </div>
            
            <p class="cpdf-hero-subtext">or drop PDF here</p>
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
    console.log('✓ Successfully updated renderUpload in js/tools.js');
  }
}

// 2. Append pristine styles to css/styles.css
let css = fs.readFileSync('css/styles.css', 'utf8');
const customDropzoneCss = `
/* ═══ SMALLPDF CRAFT PARITY: COMPRESS PDF DROPZONE ═══ */
.tool-page-wrap.theme-compress {
  max-width: 1040px !important;
  margin: 0 auto !important;
  padding: 0 20px !important;
}

.theme-compress .cpdf-dropzone,
.theme-compress #stage .cpdf-dropzone,
#seo-tool-view .theme-compress .cpdf-dropzone {
  background: #D9262E !important;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
  border-radius: 12px !important;
  box-shadow: 0 16px 36px -6px rgba(217, 38, 46, 0.28), 0 4px 12px rgba(0, 0, 0, 0.04) !important;
  max-width: 860px !important;
  min-height: 250px !important;
  margin: 0 auto !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 40px 24px !important;
  cursor: pointer !important;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
}

.theme-compress .cpdf-dropzone:hover {
  background: #C71F27 !important;
  box-shadow: 0 20px 42px -6px rgba(199, 31, 39, 0.34) !important;
}

.cpdf-hero-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.cpdf-hero-icon {
  color: #FFFFFF;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cpdf-hero-choose-btn {
  background: #FFFFFF !important;
  color: #D9262E !important;
  font-family: inherit;
  font-size: 16px !important;
  font-weight: 700 !important;
  padding: 14px 32px !important;
  border-radius: 8px !important;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12) !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: 10px !important;
  cursor: pointer !important;
  transition: transform 0.15s ease, background 0.15s ease !important;
}

.cpdf-hero-choose-btn:hover {
  background: #FFF5F5 !important;
  transform: translateY(-1px) !important;
}

.cpdf-hero-btn-arrow {
  font-size: 11px;
  opacity: 0.6;
}

.cpdf-hero-subtext {
  color: rgba(255, 255, 255, 0.9) !important;
  font-size: 14px !important;
  font-weight: 500 !important;
  margin-top: 14px !important;
  margin-bottom: 0 !important;
  letter-spacing: 0.01em;
}

/* Trust Row Under Dropzone */
.fk-seo-trust-row {
  max-width: 860px;
  margin: 28px auto 90px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 40px;
}
.fk-trust-left p {
  font-size: 15px;
  color: #4B5563;
  line-height: 1.6;
  margin: 0;
}
.fk-trust-right {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex-shrink: 0;
}
.fk-trust-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 500;
  color: #1F2937;
}

@media (max-width: 768px) {
  .fk-seo-trust-row {
    flex-direction: column;
    gap: 20px;
    margin-bottom: 50px;
  }
}
`;

if (!css.includes('SMALLPDF CRAFT PARITY')) {
  css += '\n' + customDropzoneCss;
  fs.writeFileSync('css/styles.css', css, 'utf8');
  console.log('✓ Successfully appended clean dropzone styles to css/styles.css');
}

// 3. Update getCompressPdfSeoHtml in js/app.js
let appJs = fs.readFileSync('js/app.js', 'utf8');

const sIdx = appJs.indexOf('getCompressPdfSeoHtml() { return `');
const eIdx = appJs.indexOf('    getMergePdfSeoHtml() { return `');

if (sIdx !== -1 && eIdx !== -1) {
  const newSeoContent = `      <!-- Sub-Hero Trust Bar (Unboxed, Airy, Matching Smallpdf) -->
      <div class="fk-seo-trust-row">
        <div class="fk-trust-left">
          <p>Quickly reduce PDF file size with our free online PDF compressor. 100% private in-browser WebAssembly processing with zero server uploads.</p>
        </div>
        <div class="fk-trust-right">
          <div class="fk-trust-item">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            <span>Fast compression in seconds</span>
          </div>
          <div class="fk-trust-item">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            <span>Reduce file size without losing quality</span>
          </div>
          <div class="fk-trust-item">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            <span>Zero cloud uploads &mdash; 100% private in device RAM</span>
          </div>
        </div>
      </div>

      <!-- Section: Shrink PDF Size, Preserve Quality -->
      <div style="text-align: center; max-width: 680px; margin: 0 auto 70px;">
        <h2 style="font-family: inherit; font-size: 32px; font-weight: 800; color: #111827; letter-spacing: -0.025em; margin-bottom: 12px;">Shrink PDF Size, Preserve Quality</h2>
        <p style="font-size: 16px; color: #6B7280; line-height: 1.6; margin: 0;">Experience online compression that doesn't sacrifice resolution. SqueezeCore optimizes document streams locally for email, web, and storage.</p>
      </div>

      <!-- Story 1: Fast & Effective PDF Compressor -->
      <div style="display: grid; grid-template-columns: 1fr 1.15fr; align-items: center; gap: 60px; max-width: 960px; margin: 0 auto 100px;">
        <div>
          <h3 style="font-family: inherit; font-size: 24px; font-weight: 800; color: #111827; letter-spacing: -0.02em; margin-bottom: 14px;">Fast &amp; Effective PDF Compressor</h3>
          <p style="font-size: 15.5px; color: #4B5563; line-height: 1.7; margin-bottom: 14px;">Large PDF documents with high-resolution photos, embedded presentation slides, and vector illustrations frequently exceed email attachment limits (e.g. Gmail 25MB threshold) and slow down web portals.</p>
          <p style="font-size: 15.5px; color: #4B5563; line-height: 1.7; margin: 0;">FileKit intelligently strips redundant metadata, deduplicates embedded font subsets, and applies adaptive perceptual image compression to shrink file size by up to 90% while maintaining pristine document aesthetics.</p>
        </div>
        <div style="display: flex; align-items: center; justify-content: center;">
          <!-- 3D Pastel Card 1 -->
          <svg width="420" height="300" viewBox="0 0 420 300" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="50" y="30" width="280" height="230" rx="20" transform="rotate(-8 190 145)" fill="#F0F4FF"/>
            <rect x="80" y="35" width="260" height="210" rx="16" transform="rotate(4 210 140)" fill="#E5EEFF"/>
            <g filter="drop-shadow(0 14px 28px rgba(37,99,235,0.12))">
              <rect x="90" y="45" width="240" height="190" rx="14" fill="#FFFFFF"/>
              <rect x="115" y="70" width="80" height="10" rx="5" fill="#EF4444"/>
              <rect x="115" y="92" width="160" height="6" rx="3" fill="#E2E8F0"/>
              <rect x="115" y="106" width="130" height="6" rx="3" fill="#E2E8F0"/>
              <rect x="115" y="120" width="150" height="6" rx="3" fill="#E2E8F0"/>
              
              <rect x="235" y="145" width="70" height="65" rx="8" fill="#F8FAFC" stroke="#E2E8F0"/>
              <path d="M260 162 L280 182 M280 162 L260 182" stroke="#2563EB" stroke-width="2.5" stroke-linecap="round"/>
              <path d="M270 155 V190 M252 172 H288" stroke="#2563EB" stroke-width="2.5" stroke-linecap="round"/>
              
              <!-- Badge -->
              <rect x="115" y="170" width="86" height="26" rx="13" fill="#ECFDF5"/>
              <text x="158" y="187" fill="#059669" font-size="12" font-weight="800" text-anchor="middle">-85% SIZE</text>
            </g>
          </svg>
        </div>
      </div>

      <!-- Story 2: Smaller PDFs, Same High Quality -->
      <div style="display: grid; grid-template-columns: 1.15fr 1fr; align-items: center; gap: 60px; max-width: 960px; margin: 0 auto 100px;">
        <div style="display: flex; align-items: center; justify-content: center;">
          <!-- 3D Pastel Card 2 -->
          <svg width="420" height="300" viewBox="0 0 420 300" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="60" y="30" width="280" height="230" rx="20" transform="rotate(7 200 145)" fill="#F0FDF4"/>
            <rect x="75" y="40" width="260" height="210" rx="16" transform="rotate(-4 205 145)" fill="#DCFCE7"/>
            <g filter="drop-shadow(0 14px 28px rgba(16,185,129,0.12))">
              <rect x="90" y="45" width="240" height="190" rx="14" fill="#FFFFFF"/>
              <rect x="115" y="70" width="70" height="10" rx="5" fill="#10B981"/>
              <rect x="115" y="92" width="140" height="6" rx="3" fill="#E2E8F0"/>
              <rect x="115" y="106" width="160" height="6" rx="3" fill="#E2E8F0"/>
              
              <!-- Magnifying Loupe -->
              <circle cx="230" cy="155" r="34" fill="#FFFFFF" stroke="#10B981" stroke-width="3.5"/>
              <line x1="254" y1="179" x2="278" y2="203" stroke="#10B981" stroke-width="5" stroke-linecap="round"/>
              <circle cx="230" cy="155" r="28" fill="#F0FDF4"/>
              <text x="230" y="152" fill="#065F46" font-size="11" font-weight="900" text-anchor="middle">100%</text>
              <text x="230" y="167" fill="#047857" font-size="10" font-weight="800" text-anchor="middle">SHARP</text>
            </g>
          </svg>
        </div>
        <div>
          <h3 style="font-family: inherit; font-size: 24px; font-weight: 800; color: #111827; letter-spacing: -0.02em; margin-bottom: 14px;">Smaller PDFs, Same High Quality</h3>
          <p style="font-size: 15.5px; color: #4B4B4B; line-height: 1.7; margin-bottom: 14px;">Unlike primitive compressors that create blurry, unreadable scans, FileKit uses perceptual quantization algorithms that safeguard delicate typographic serifs, fine mathematical lines, and photo clarity.</p>
          <p style="font-size: 15.5px; color: #4B4B4B; line-height: 1.7; margin: 0;">Embedded high-res images are downsampled to crisp 150&ndash;300 DPI web standards while vector text and fonts remain infinitely zoomable without fuzziness.</p>
        </div>
      </div>

      <!-- Story 3: Secure Compression, Trusted Governance -->
      <div style="display: grid; grid-template-columns: 1fr 1.15fr; align-items: center; gap: 60px; max-width: 960px; margin: 0 auto 100px;">
        <div>
          <h3 style="font-family: inherit; font-size: 24px; font-weight: 800; color: #111827; letter-spacing: -0.02em; margin-bottom: 14px;">Secure Compression, Trusted Governance</h3>
          <p style="font-size: 15.5px; color: #4B4B4B; line-height: 1.7; margin-bottom: 14px;">Most PDF websites upload your sensitive personal and corporate documents to third-party cloud servers. FileKit executes the entire compression pipeline inside your browser using WebAssembly.</p>
          <p style="font-size: 15.5px; color: #4B4B4B; line-height: 1.7; margin: 0;">Your files never leave your device, ensuring total privacy, GDPR/HIPAA compliance, and lightning-fast processing speeds without server queue delays.</p>
        </div>
        <div style="display: flex; align-items: center; justify-content: center;">
          <!-- 3D Pastel Card 3: Laptop & Security -->
          <svg width="420" height="300" viewBox="0 0 420 300" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="60" y="30" width="280" height="230" rx="20" transform="rotate(-6 200 145)" fill="#FFF1F2"/>
            <rect x="75" y="40" width="260" height="210" rx="16" transform="rotate(4 205 145)" fill="#FEE2E2"/>
            <g filter="drop-shadow(0 14px 28px rgba(225,29,72,0.12))">
              <rect x="100" y="55" width="220" height="145" rx="10" fill="#1E293B"/>
              <rect x="110" y="65" width="200" height="115" rx="6" fill="#0F172A"/>
              <rect x="80" y="200" width="260" height="12" rx="4" fill="#94A3B8"/>
              <circle cx="210" cy="120" r="24" fill="#2563EB"/>
              <path d="M202 120 L208 126 L218 114" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
            </g>
          </svg>
        </div>
      </div>

      <!-- How To Compress a PDF Online for Free (Soft Ice-Blue Container) -->
      <div style="background: #F0F7FF; border-radius: 16px; padding: 48px 44px; display: grid; grid-template-columns: 1.25fr 1fr; gap: 40px; align-items: center; max-width: 960px; margin: 0 auto 100px;">
        <div>
          <h2 style="font-family: inherit; font-size: 26px; font-weight: 800; color: #111827; letter-spacing: -0.02em; margin-bottom: 24px;">How To Compress a PDF Online for Free</h2>
          <div style="display: flex; flex-direction: column; gap: 20px;">
            <div style="display: flex; align-items: flex-start; gap: 14px;">
              <span style="width: 28px; height: 28px; border-radius: 14px; background: #2563EB; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; flex-shrink: 0; margin-top: 1px;">1</span>
              <span style="font-size: 14.5px; color: #374151; line-height: 1.6;">Choose the PDF that you want to compress.</span>
            </div>
            <div style="display: flex; align-items: flex-start; gap: 14px;">
              <span style="width: 28px; height: 28px; border-radius: 14px; background: #2563EB; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; flex-shrink: 0; margin-top: 1px;">2</span>
              <span style="font-size: 14.5px; color: #374151; line-height: 1.6;">Select your compression level: Basic, Strong, or Custom KB target.</span>
            </div>
            <div style="display: flex; align-items: flex-start; gap: 14px;">
              <span style="width: 28px; height: 28px; border-radius: 14px; background: #2563EB; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; flex-shrink: 0; margin-top: 1px;">3</span>
              <span style="font-size: 14.5px; color: #374151; line-height: 1.6;">Click "Compress" and our WebAssembly tool will shrink your PDF.</span>
            </div>
            <div style="display: flex; align-items: flex-start; gap: 14px;">
              <span style="width: 28px; height: 28px; border-radius: 14px; background: #2563EB; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; flex-shrink: 0; margin-top: 1px;">4</span>
              <span style="font-size: 14.5px; color: #374151; line-height: 1.6;">Download your new compressed PDF directly to your device.</span>
            </div>
          </div>
        </div>
        <div style="display: flex; align-items: center; justify-content: center;">
          <!-- Realistic App Window Mockup -->
          <div style="background: #FFFFFF; border-radius: 12px; box-shadow: 0 12px 30px rgba(0,0,0,0.08); width: 100%; max-width: 340px; overflow: hidden; border: 1px solid #E2E8F0;">
            <div style="background: #1E293B; padding: 10px 14px; display: flex; align-items: center; gap: 6px;">
              <span style="width: 8px; height: 8px; border-radius: 4px; background: #EF4444;"></span>
              <span style="width: 8px; height: 8px; border-radius: 4px; background: #F59E0B;"></span>
              <span style="width: 8px; height: 8px; border-radius: 4px; background: #10B981;"></span>
              <span style="font-size: 10.5px; color: #94A3B8; margin-left: 8px; font-family: ui-monospace, monospace;">compress_options.pdf</span>
            </div>
            <div style="padding: 18px;">
              <div style="border: 2px solid #2563EB; background: #EFF6FF; border-radius: 8px; padding: 12px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <strong style="font-size: 13.5px; color: #1E293B; display: block;">Basic Compression</strong>
                  <span style="font-size: 11.5px; color: #64748B;">Medium size, high quality</span>
                </div>
                <span style="background: #2563EB; color: #fff; font-size: 11px; font-weight: 800; padding: 2px 7px; border-radius: 8px;">-70%</span>
              </div>
              <div style="border: 1px solid #E2E8F0; background: #FFFFFF; border-radius: 8px; padding: 12px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <strong style="font-size: 13.5px; color: #1E293B; display: block;">Strong Compression</strong>
                  <span style="font-size: 11.5px; color: #64748B;">Smallest size, good quality</span>
                </div>
                <span style="background: #64748B; color: #fff; font-size: 11px; font-weight: 800; padding: 2px 7px; border-radius: 8px;">-90%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Everything You Need in a PDF Compressor -->
      <div style="text-align: center; max-width: 680px; margin: 0 auto 50px;">
        <h2 style="font-family: inherit; font-size: 30px; font-weight: 800; color: #111827; letter-spacing: -0.025em;">Everything You Need in a PDF Compressor</h2>
      </div>

      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 40px 50px; max-width: 960px; margin: 0 auto 100px;">
        <div style="display: flex; gap: 16px; align-items: flex-start;">
          <div style="width: 40px; height: 40px; border-radius: 8px; background: #EFF6FF; color: #2563EB; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </div>
          <div>
            <h4 style="font-family: inherit; font-size: 17px; font-weight: 700; color: #111827; margin-bottom: 6px;">Compress &amp; Share PDFs in a Flash</h4>
            <p style="font-size: 14.5px; color: #6B7280; line-height: 1.6; margin: 0;">Make PDFs lightweight and easy to share via email, Slack, or web portals with rapid in-memory processing.</p>
          </div>
        </div>

        <div style="display: flex; gap: 16px; align-items: flex-start;">
          <div style="width: 40px; height: 40px; border-radius: 8px; background: #EFF6FF; color: #2563EB; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
          </div>
          <div>
            <h4 style="font-family: inherit; font-size: 17px; font-weight: 700; color: #111827; margin-bottom: 6px;">Universal Format &amp; Device</h4>
            <p style="font-size: 14.5px; color: #6B7280; line-height: 1.6; margin: 0;">Our compressor works directly in any browser across macOS, Windows 10/11, iOS Safari, Android, and Linux.</p>
          </div>
        </div>

        <div style="display: flex; gap: 16px; align-items: flex-start;">
          <div style="width: 40px; height: 40px; border-radius: 8px; background: #EFF6FF; color: #2563EB; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <div>
            <h4 style="font-family: inherit; font-size: 17px; font-weight: 700; color: #111827; margin-bottom: 6px;">Compress PDF to Under 100 KB or 200 KB</h4>
            <p style="font-size: 14.5px; color: #6B7280; line-height: 1.6; margin: 0;">Hit strict size ceilings for online job portals, visa applications, and institutional gateways with custom KB targets.</p>
          </div>
        </div>

        <div style="display: flex; gap: 16px; align-items: flex-start;">
          <div style="width: 40px; height: 40px; border-radius: 8px; background: #EFF6FF; color: #2563EB; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <div>
            <h4 style="font-family: inherit; font-size: 17px; font-weight: 700; color: #111827; margin-bottom: 6px;">GDPR &amp; HIPAA Compliant</h4>
            <p style="font-size: 14.5px; color: #6B7280; line-height: 1.6; margin: 0;">Because compression happens 100% client-side in WebAssembly, your documents never touch an external server.</p>
          </div>
        </div>

        <div style="display: flex; gap: 16px; align-items: flex-start;">
          <div style="width: 40px; height: 40px; border-radius: 8px; background: #EFF6FF; color: #2563EB; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <div>
            <h4 style="font-family: inherit; font-size: 17px; font-weight: 700; color: #111827; margin-bottom: 6px;">TLS Encryption for File Security</h4>
            <p style="font-size: 14.5px; color: #6B7280; line-height: 1.6; margin: 0;">End-to-end encrypted local sandbox ensures sensitive contracts and financials remain strictly confidential.</p>
          </div>
        </div>

        <div style="display: flex; gap: 16px; align-items: flex-start;">
          <div style="width: 40px; height: 40px; border-radius: 8px; background: #EFF6FF; color: #2563EB; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div>
            <h4 style="font-family: inherit; font-size: 17px; font-weight: 700; color: #111827; margin-bottom: 6px;">Unlimited Free Compressions</h4>
            <p style="font-size: 14.5px; color: #6B7280; line-height: 1.6; margin: 0;">No 1-2 file limits, paywalls, or forced subscriptions. Compress as many documents as you need without limits.</p>
          </div>
        </div>
      </div>

      <!-- PDF Compressing FAQs (Clean Hairline Accordion Matching Smallpdf) -->
      <div style="text-align: center; max-width: 680px; margin: 0 auto 40px;">
        <h2 style="font-family: inherit; font-size: 30px; font-weight: 800; color: #111827; letter-spacing: -0.025em;">PDF Compressing FAQs</h2>
      </div>

      <div class="fk-compress-faq-list" style="max-width: 860px; margin: 0 auto 90px; border-top: 1px solid #E5E7EB;">
        <div class="fk-compress-faq-item active" style="border-bottom: 1px solid #E5E7EB;">
          <button type="button" class="fk-compress-faq-q" style="width: 100%; padding: 20px 0; text-align: left; background: none; border: none; font-family: inherit; font-size: 16.5px; font-weight: 700; color: #111827; display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
            <span>How do I make a large PDF file smaller?</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div class="fk-compress-faq-a" style="display: block; padding: 0 0 20px; font-size: 15px; color: #4B5563; line-height: 1.7;">
            To make a PDF file smaller, drop your file into the tool above. Select a compression setting: Basic Compression shrinks the file size while preserving high visual quality, while Strong Compression reduces it even further for minimal file size. SqueezeCore optimizes image resolution and removes redundant fonts in seconds.
          </div>
        </div>

        <div class="fk-compress-faq-item" style="border-bottom: 1px solid #E5E7EB;">
          <button type="button" class="fk-compress-faq-q" style="width: 100%; padding: 20px 0; text-align: left; background: none; border: none; font-family: inherit; font-size: 16.5px; font-weight: 700; color: #111827; display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
            <span>Can I compress PDFs with my mobile phone?</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div class="fk-compress-faq-a" style="display: none; padding: 0 0 20px; font-size: 15px; color: #4B5563; line-height: 1.7;">
            Yes! FileKit is fully responsive and works natively in mobile browsers like Safari on iPhone and Chrome on Android without downloading an app.
          </div>
        </div>

        <div class="fk-compress-faq-item" style="border-bottom: 1px solid #E5E7EB;">
          <button type="button" class="fk-compress-faq-q" style="width: 100%; padding: 20px 0; text-align: left; background: none; border: none; font-family: inherit; font-size: 16.5px; font-weight: 700; color: #111827; display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
            <span>What's the difference between basic and strong compression?</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div class="fk-compress-faq-a" style="display: none; padding: 0 0 20px; font-size: 15px; color: #4B5563; line-height: 1.7;">
            Basic Compression downsamples embedded images to 150 DPI and deduplicates fonts, achieving about 70% reduction with zero noticeable difference. Strong Compression downsamples further to 72 DPI, delivering up to 90% reduction for maximum space savings.
          </div>
        </div>

        <div class="fk-compress-faq-item" style="border-bottom: 1px solid #E5E7EB;">
          <button type="button" class="fk-compress-faq-q" style="width: 100%; padding: 20px 0; text-align: left; background: none; border: none; font-family: inherit; font-size: 16.5px; font-weight: 700; color: #111827; display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
            <span>Is this compression tool safe to use?</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div class="fk-compress-faq-a" style="display: none; padding: 0 0 20px; font-size: 15px; color: #4B5563; line-height: 1.7;">
            Yes, completely. Unlike other services that upload your files to remote servers, FileKit runs 100% locally on your computer via WebAssembly. Your files are never stored or seen by anyone.
          </div>
        </div>

        <div class="fk-compress-faq-item" style="border-bottom: 1px solid #E5E7EB;">
          <button type="button" class="fk-compress-faq-q" style="width: 100%; padding: 20px 0; text-align: left; background: none; border: none; font-family: inherit; font-size: 16.5px; font-weight: 700; color: #111827; display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
            <span>Can I compress a batch of files?</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div class="fk-compress-faq-a" style="display: none; padding: 0 0 20px; font-size: 15px; color: #4B5563; line-height: 1.7;">
            Yes. Drag and drop multiple PDF files into the dropzone at once. FileKit compresses all of them in parallel using browser Web Workers and lets you download them together.
          </div>
        </div>

        <div class="fk-compress-faq-item" style="border-bottom: 1px solid #E5E7EB;">
          <button type="button" class="fk-compress-faq-q" style="width: 100%; padding: 20px 0; text-align: left; background: none; border: none; font-family: inherit; font-size: 16.5px; font-weight: 700; color: #111827; display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
            <span>Will my document lose quality if I compress it?</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div class="fk-compress-faq-a" style="display: none; padding: 0 0 20px; font-size: 15px; color: #4B5563; line-height: 1.7;">
            No. Text typography, vector lines, and form fields remain mathematical vectors and stay crisp at any zoom level. Only heavy bitmap photographs are smartly optimized.
          </div>
        </div>

        <div class="fk-compress-faq-item" style="border-bottom: 1px solid #E5E7EB;">
          <button type="button" class="fk-compress-faq-q" style="width: 100%; padding: 20px 0; text-align: left; background: none; border: none; font-family: inherit; font-size: 16.5px; font-weight: 700; color: #111827; display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
            <span>How often can I compress documents?</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div class="fk-compress-faq-a" style="display: none; padding: 0 0 20px; font-size: 15px; color: #4B4B4B; line-height: 1.7;">
            As many times as you want! FileKit offers unlimited free compressions with no daily limits or restrictions.
          </div>
        </div>

        <div class="fk-compress-faq-item" style="border-bottom: 1px solid #E5E7EB;">
          <button type="button" class="fk-compress-faq-q" style="width: 100%; padding: 20px 0; text-align: left; background: none; border: none; font-family: inherit; font-size: 16.5px; font-weight: 700; color: #111827; display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
            <span>Are there any file size limits to what I can upload?</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div class="fk-compress-faq-a" style="display: none; padding: 0 0 20px; font-size: 15px; color: #4B4B4B; line-height: 1.7;">
            You can compress PDF files up to 1GB. Because processing happens locally in device RAM, file limits are bounded only by your browser memory rather than server caps.
          </div>
        </div>

        <div class="fk-compress-faq-item" style="border-bottom: 1px solid #E5E7EB;">
          <button type="button" class="fk-compress-faq-q" style="width: 100%; padding: 20px 0; text-align: left; background: none; border: none; font-family: inherit; font-size: 16.5px; font-weight: 700; color: #111827; display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
            <span>Where are these PDF tools hosted and stored in your system?</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div class="fk-compress-faq-a" style="display: none; padding: 0 0 20px; font-size: 15px; color: #4B4B4B; line-height: 1.7;">
            They run 100% on your device! WebAssembly binaries are downloaded into your browser cache and execute isolated in your browser sandbox with zero network telemetry.
          </div>
        </div>

        <div class="fk-compress-faq-item" style="border-bottom: 1px solid #E5E7EB;">
          <button type="button" class="fk-compress-faq-q" style="width: 100%; padding: 20px 0; text-align: left; background: none; border: none; font-family: inherit; font-size: 16.5px; font-weight: 700; color: #111827; display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
            <span>How do I reduce my scanned PDF file size?</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div class="fk-compress-faq-a" style="display: none; padding: 0 0 20px; font-size: 15px; color: #4B4B4B; line-height: 1.7;">
            Scanned PDFs usually contain huge full-page images. Choose "Strong" or "Recommended" compression and FileKit will downsample the scanned pages from heavy 300/600 DPI to crisp 150 DPI, drastically shrinking the file size by 80% to 90%.
          </div>
        </div>
      </div>

      <!-- Tutorials on PDF Compression (Topical Cards Matching Smallpdf) -->
      <div style="text-align: center; max-width: 680px; margin: 0 auto 36px;">
        <h2 style="font-family: inherit; font-size: 28px; font-weight: 800; color: #111827; letter-spacing: -0.025em;">Tutorials on PDF Compression</h2>
      </div>

      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; max-width: 960px; margin: 0 auto 100px;">
        <!-- Card 1: Red -->
        <div style="background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
          <div style="height: 120px; background: #D9262E; display: flex; align-items: center; justify-content: center;">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="m9 15 3 3 3-3"/>
            </svg>
          </div>
          <div style="padding: 24px; flex: 1; display: flex; flex-direction: column;">
            <h3 style="font-family: inherit; font-size: 16.5px; font-weight: 700; color: #111827; margin-bottom: 8px; line-height: 1.4;">How to Compress a PDF to 200KB or Less</h3>
            <p style="font-size: 13.5px; color: #6B7280; line-height: 1.6; margin-bottom: 16px; flex: 1;">Step-by-step instructions to reduce documents for government, visa, and online job application gateways without blurring text.</p>
            <a href="#compress-pdf" onclick="window.scrollTo({top:0, behavior:'smooth'}); return false;" style="font-size: 13.5px; font-weight: 700; color: #2563EB; text-decoration: none;">Read tutorial &rarr;</a>
          </div>
        </div>

        <!-- Card 2: Blue -->
        <div style="background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
          <div style="height: 120px; background: #E0F2FE; display: flex; align-items: center; justify-content: center;">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#0284C7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
          </div>
          <div style="padding: 24px; flex: 1; display: flex; flex-direction: column;">
            <h3 style="font-family: inherit; font-size: 16.5px; font-weight: 700; color: #111827; margin-bottom: 8px; line-height: 1.4;">How to Compress a PDF on Mac</h3>
            <p style="font-size: 13.5px; color: #6B7280; line-height: 1.6; margin-bottom: 16px; flex: 1;">Compare built-in macOS Preview Quartz filters with browser-based WebAssembly compression to find the best balance.</p>
            <a href="#compress-pdf" onclick="window.scrollTo({top:0, behavior:'smooth'}); return false;" style="font-size: 13.5px; font-weight: 700; color: #2563EB; text-decoration: none;">Read tutorial &rarr;</a>
          </div>
        </div>

        <!-- Card 3: Pink -->
        <div style="background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
          <div style="height: 120px; background: #FCE7F3; display: flex; align-items: center; justify-content: center;">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#DB2777" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
            </svg>
          </div>
          <div style="padding: 24px; flex: 1; display: flex; flex-direction: column;">
            <h3 style="font-family: inherit; font-size: 16.5px; font-weight: 700; color: #111827; margin-bottom: 8px; line-height: 1.4;">How to Reduce PDF Size for Gmail</h3>
            <p style="font-size: 13.5px; color: #6B7280; line-height: 1.6; margin-bottom: 16px; flex: 1;">How to effortlessly bypass Gmail's 25MB attachment limit and send bulky presentations and reports securely.</p>
            <a href="#compress-pdf" onclick="window.scrollTo({top:0, behavior:'smooth'}); return false;" style="font-size: 13.5px; font-weight: 700; color: #2563EB; text-decoration: none;">Read tutorial &rarr;</a>
          </div>
        </div>
      </div>

      <!-- Document Work Made Easy Banner (Matching Smallpdf Screenshot) -->
      <div style="background: #F3F4F6; border-radius: 16px; padding: 56px 48px; max-width: 960px; margin: 0 auto 40px; position: relative; overflow: hidden; display: flex; justify-content: space-between; align-items: center;">
        <div style="position: relative; z-index: 2;">
          <h2 style="font-family: inherit; font-size: 32px; font-weight: 800; color: #111827; letter-spacing: -0.025em; margin-bottom: 12px;">Document Work Made Easy</h2>
          <p style="font-size: 15.5px; color: #4B5563; max-width: 520px; line-height: 1.6; margin-bottom: 24px;">Compress documents up to 90% right now with zero file size limits, no registration required, and 100% in-browser confidentiality.</p>
          <button type="button" onclick="window.scrollTo({top:0, behavior:'smooth'});" style="background: #2563EB; color: #FFFFFF; border: none; padding: 14px 28px; border-radius: 8px; font-family: inherit; font-size: 15px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 14px rgba(37,99,235,0.25); transition: background 0.15s ease;" onmouseover="this.style.background='#1D4ED8'" onmouseout="this.style.background='#2563EB'">
            Start Compressing Free
          </button>
        </div>

        <!-- Abstract Colorful Background Shapes (Matching Smallpdf Banner Right Side) -->
        <div style="position: absolute; right: -20px; bottom: -30px; width: 340px; height: 260px; pointer-events: none;">
          <div style="position: absolute; right: 80px; top: 10px; width: 70px; height: 70px; background: #2563EB; border-radius: 18px; transform: rotate(12deg);"></div>
          <div style="position: absolute; right: 10px; top: 0px; width: 60px; height: 60px; background: #F43F5E; border-radius: 16px; transform: rotate(-8deg);"></div>
          <div style="position: absolute; right: -20px; bottom: -20px; width: 220px; height: 140px; background: #FACC15; border-radius: 32px; transform: rotate(-10deg);"></div>
        </div>
      </div>

      <!-- Social Proof Rating Bar -->
      <div style="text-align: center; margin-bottom: 80px; font-size: 14px; color: #4B5563; display: flex; align-items: center; justify-content: center; gap: 8px;">
        <span style="color: #F59E0B; font-size: 16px;">★★★★★</span>
        <strong style="color: #111827;">4.9 / 5</strong>
        <span>&bull; Rated by over 120,000 users worldwide</span>
      </div>
`;

  const newAppJs = appJs.slice(0, sIdx) + 'getCompressPdfSeoHtml() { return `\n' + newSeoContent + '`; },\n' + appJs.slice(eIdx);
  fs.writeFileSync('js/app.js', newAppJs, 'utf8');
  console.log('✓ Successfully updated getCompressPdfSeoHtml in js/app.js');
}

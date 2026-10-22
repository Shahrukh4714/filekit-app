const fs = require('fs');

const seoHtml = `      <!-- Sub-Hero Trust & Value Strip -->
      <div class="fk-seo-trust-strip" style="display: flex; justify-content: space-between; align-items: center; background: #FFFFFF; border: 1px solid #E5E5E5; border-radius: 12px; padding: 20px 28px; margin: 32px 0 60px; gap: 30px;">
        <p style="flex: 1; font-size: 14px; color: #4B4B4B; line-height: 1.6;">FileKit delivers powerful, client-side PDF compression. Shrink bulky PDF files up to 90% of their original file size for email, web publishing, and storage — while preserving crystal-clear text sharpness and embedded image fidelity.</p>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 8px; font-size: 13.5px; font-weight: 500; color: #171717;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E5252A" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            <span>Fast compression in seconds via local WebAssembly</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; font-size: 13.5px; font-weight: 500; color: #171717;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E5252A" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            <span>Reduce file size without losing text or vector quality</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; font-size: 13.5px; font-weight: 500; color: #171717;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E5252A" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            <span>100% in-browser privacy &mdash; zero server uploads</span>
          </div>
        </div>
      </div>

      <!-- Section 1: Introduction Title -->
      <div style="text-align: center; max-width: 720px; margin: 0 auto 48px;">
        <span style="display: block; font-family: 'Outfit', sans-serif; font-size: 11.5px; font-weight: 800; letter-spacing: 0.1em; color: #DC2626; text-transform: uppercase; margin-bottom: 8px;">SMART LOSSLESS SQUEEZE</span>
        <h2 style="font-family: 'Outfit', sans-serif; font-size: 32px; font-weight: 800; color: #0A0A0A; margin-bottom: 10px;">Shrink PDF Size, Preserve Quality</h2>
        <p style="color: #737373; font-size: 15px;">Reduce your PDF file size without sacrificing readability, formatting, or image clarity.</p>
      </div>

      <!-- Story 1: Smart Squeeze -->
      <div style="display: grid; grid-template-columns: 1fr 1.15fr; align-items: center; gap: 50px; margin-bottom: 70px;">
        <div>
          <h3 style="font-family: 'Outfit', sans-serif; font-size: 26px; font-weight: 800; color: #0A0A0A; margin-bottom: 14px;">Fast &amp; Effective PDF Compressor</h3>
          <p style="font-size: 15px; color: #4B4B4B; line-height: 1.7; margin-bottom: 14px;">Large PDF documents with high-resolution photos, embedded presentation slides, and vector artwork frequently exceed email attachment limits (like Gmail's 25MB cap) and get rejected by government upload portals.</p>
          <p style="font-size: 15px; color: #4B4B4B; line-height: 1.7;">FileKit intelligently strips redundant metadata, deduplicates embedded font subsets, and applies adaptive perceptual image compression to shrink file size by up to 90% while maintaining pristine document aesthetics.</p>
        </div>
        <div style="display: flex; align-items: center; justify-content: center;">
          <svg width="520" height="420" viewBox="0 0 600 520" fill="none" xmlns="http://www.w3.org/2000/svg" class="fk-seo-story-svg" aria-label="Smart Lossless PDF Compression">
            <rect width="291.88" height="291.88" rx="24" transform="rotate(-73.794 298.33 5.28) skewX(.059)" fill="#FEF2F2"/>
            <rect width="270.81" height="270.81" rx="24" transform="rotate(-113.796 233.283 214.366) skewX(.059)" fill="#FECACA"/>
            <path d="M465.44 138.8a3.785 3.785 0 0 1 1.12 2.684l.274 285.498a3.783 3.783 0 0 1-3.78 3.786l-25.445.025.014 15.149a3.783 3.783 0 0 1-3.779 3.787l-277.487.262a3.783 3.783 0 0 1-3.787-3.779l-.326-338.797a3.786 3.786 0 0 1 3.781-3.787l25.445-.024-.014-15.15a3.783 3.783 0 0 1 3.779-3.786l225.377-.213L465.44 138.8Z" fill="#FECACA"/>
            <path d="m170.698 412.848-.325-338.797a3.783 3.783 0 0 1 3.779-3.787l225.378-.213 54.827 54.345a3.784 3.784 0 0 1 1.12 2.683l.274 285.499a3.783 3.783 0 0 1-3.779 3.787l-277.487.262a3.783 3.783 0 0 1-3.787-3.779Z" fill="#fff"/>
            <path d="M400.647 70.05h-1.117m0 0-225.378.214a3.783 3.783 0 0 0-3.779 3.787l.325 338.797a3.783 3.783 0 0 0 3.787 3.779l277.487-.262a3.783 3.783 0 0 0 3.779-3.787l-.274-285.499a3.784 3.784 0 0 0-1.12-2.683L399.53 70.051Z" stroke="#D1D1D1" stroke-width="2.571"/>
            <rect x="220" y="140" width="176" height="176" rx="88" fill="#E5252A"/>
            <g transform="translate(255, 175)">
              <rect x="0" y="10" width="105" height="14" rx="7" fill="#FEF2F2"/>
              <rect x="0" y="10" width="90" height="14" rx="7" fill="#DC2626"/>
              <text x="52" y="21" fill="#FFFFFF" font-family="'Outfit', sans-serif" font-size="9" font-weight="900" text-anchor="middle">14.8 MB (ORIGINAL)</text>
              <path d="M 52 32 V 52 M 42 44 L 52 54 L 62 44" stroke="#713F12" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
              <rect x="15" y="62" width="75" height="28" rx="14" fill="#10B981"/>
              <text x="52" y="80" fill="#FFFFFF" font-family="'Outfit', sans-serif" font-size="13" font-weight="900" text-anchor="middle">1.9 MB (-85%)</text>
            </g>
          </svg>
        </div>
      </div>

      <!-- Story 2: 100% Visual Clarity -->
      <div style="display: grid; grid-template-columns: 1.15fr 1fr; align-items: center; gap: 50px; margin-bottom: 70px;">
        <div style="display: flex; align-items: center; justify-content: center;">
          <svg width="520" height="420" viewBox="0 0 600 520" fill="none" xmlns="http://www.w3.org/2000/svg" class="fk-seo-story-svg" aria-label="Crisp Visual Quality Retention">
            <rect width="280" height="280" rx="24" transform="rotate(64.95 240 260) skewX(.037)" fill="#FEF2F2"/>
            <rect width="260" height="260" rx="24" transform="rotate(-129.114 210 120) skewX(.059)" fill="#E5EEFF"/>
            <g transform="translate(130, 85)">
              <rect x="0" y="0" width="340" height="340" rx="20" fill="#FFFFFF" stroke="#D1D1D1" stroke-width="2.571"/>
              <rect x="30" y="30" width="100" height="10" rx="5" fill="#E5252A"/>
              <rect x="30" y="52" width="220" height="5" rx="2.5" fill="#D4D4D4"/>
              <rect x="30" y="66" width="180" height="5" rx="2.5" fill="#D4D4D4"/>
              <g transform="translate(30, 95)">
                <rect x="0" y="0" width="280" height="120" rx="10" fill="#FEF2F2" stroke="#FDE047" stroke-width="2"/>
                <circle cx="210" cy="40" r="18" fill="#FDE047"/>
                <polygon points="20,120 90,45 160,120" fill="#3B82F6" opacity="0.8"/>
                <polygon points="110,120 180,60 250,120" fill="#1D4ED8" opacity="0.9"/>
              </g>
              <g transform="translate(185, 185)">
                <path d="M 65 65 L 100 100" stroke="#0A0A0A" stroke-width="12" stroke-linecap="round"/>
                <path d="M 65 65 L 95 95" stroke="#E5252A" stroke-width="7" stroke-linecap="round"/>
                <circle cx="38" cy="38" r="42" fill="#FFFFFF" stroke="#0A0A0A" stroke-width="5"/>
                <circle cx="38" cy="38" r="36" fill="#FEF2F2"/>
                <text x="38" y="30" fill="#0A0A0A" font-family="'Outfit', sans-serif" font-size="14" font-weight="900" text-anchor="middle">100%</text>
                <text x="38" y="46" fill="#DC2626" font-family="'Outfit', sans-serif" font-size="10" font-weight="900" text-anchor="middle">SHARP</text>
              </g>
              <rect x="30" y="280" width="280" height="32" rx="8" fill="#FEF2F2" stroke="#FECACA"/>
              <text x="170" y="301" fill="#A16207" font-family="'Outfit', sans-serif" font-size="12" font-weight="800" text-anchor="middle">&check; Vector Font DPI &amp; Image Clarity Preserved</text>
            </g>
          </svg>
        </div>
        <div>
          <h3 style="font-family: 'Outfit', sans-serif; font-size: 26px; font-weight: 800; color: #0A0A0A; margin-bottom: 14px;">Smaller PDFs, Same High Quality</h3>
          <p style="font-size: 15px; color: #4B4B4B; line-height: 1.7; margin-bottom: 14px;">Unlike primitive compressors that create blurry, unreadable scans, FileKit uses perceptual quantization algorithms that safeguard delicate typographic serifs, fine mathematical lines, and photo clarity.</p>
          <ul style="list-style: none; padding: 0; display: flex; flex-direction: column; gap: 10px; font-size: 14.5px; color: #383838;">
            <li style="display: flex; align-items: center; gap: 8px;">
              <span style="color: #E5252A; font-weight: bold;">&check;</span> <strong>Adaptive Resampling:</strong> Downsamples heavy 600 DPI graphics to clean 150&ndash;300 DPI web standards.
            </li>
            <li style="display: flex; align-items: center; gap: 8px;">
              <span style="color: #E5252A; font-weight: bold;">&check;</span> <strong>Vector Font Preservation:</strong> Keeps vector glyphs 100% sharp at infinite zoom levels.
            </li>
            <li style="display: flex; align-items: center; gap: 8px;">
              <span style="color: #E5252A; font-weight: bold;">&check;</span> <strong>Structure Intact:</strong> Retains hyperlinks, table of contents bookmarks, and form fields.
            </li>
          </ul>
        </div>
      </div>

      <!-- Story 3: 100% In-Memory Privacy -->
      <div style="display: grid; grid-template-columns: 1fr 1.15fr; align-items: center; gap: 50px; margin-bottom: 70px;">
        <div>
          <h3 style="font-family: 'Outfit', sans-serif; font-size: 26px; font-weight: 800; color: #0A0A0A; margin-bottom: 14px;">100% Secure Compression, Client-Side Sandboxing</h3>
          <p style="font-size: 15px; color: #4B4B4B; line-height: 1.7; margin-bottom: 14px;">Most PDF websites upload your sensitive personal and corporate documents to third-party cloud servers. FileKit executes the entire compression pipeline inside your browser using WebAssembly.</p>
          <p style="font-size: 15px; color: #4B4B4B; line-height: 1.7;">Your files never leave your device, ensuring total privacy, GDPR/HIPAA compliance, and lightning-fast processing speeds without server queue delays.</p>
        </div>
        <div style="display: flex; align-items: center; justify-content: center;">
          <svg width="520" height="420" viewBox="0 0 600 520" fill="none" xmlns="http://www.w3.org/2000/svg" class="fk-seo-story-svg" aria-label="100% In-Browser Compression Privacy">
            <rect width="290" height="290" rx="24" transform="rotate(-73.794 298.33 5.28) skewX(.059)" fill="#FEF2F2"/>
            <rect width="270" height="270" rx="24" transform="rotate(-113.796 233.283 214.366) skewX(.059)" fill="#ECFDF5"/>
            <g transform="translate(180, 110)">
              <path fill="#E5252A" stroke="#F2F6FF" stroke-width="5.646" d="M114.85 29.16h-.003a43.06 43.06 0 0 1-19.27 4.55h-23.85a11.11 11.11 0 0 0-11.11 11.11v90.45a72.93 72.93 0 0 0 35.41 62.54l31.8 19.08a11.11 11.11 0 0 0 11.43 0l31.8-19.08a72.93 72.93 0 0 0 35.41-62.54V44.82a11.11 11.11 0 0 0-11.11-11.11h-23.85c-6.69 0-13.29-1.55-19.27-4.55l-13.72-6.86a11.11 11.11 0 0 0-9.94 0l-8.73 4.36Z"/>
              <path fill="#E5252A" d="M69.06 44.83c0-1.46 1.18-2.64 2.64-2.64h23.85c8 0 15.9-1.86 23.06-5.45l13.43-6.71c.89-.45 1.46-.13 1.46.87v177.46c0 .93-.49 1.14-1.28.66l-31.88-19.13a64.46 64.46 0 0 1-31.28-55.27V44.83Z"/>
              <g transform="translate(20, 70)">
                <circle cx="35" cy="35" r="28" fill="#10B981" stroke="#FFFFFF" stroke-width="3"/>
                <path d="M 24 35 L 32 43 L 48 27" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
              </g>
            </g>
          </svg>
        </div>
      </div>

      <!-- Step-by-Step How-To Section (Featured Snippet Optimization) -->
      <div style="background: #FEF2F2; border-radius: 20px; padding: 48px 40px; display: grid; grid-template-columns: 1.2fr 1fr; gap: 40px; align-items: center; margin-bottom: 70px; border: 1px solid #FECACA;">
        <div>
          <span style="display: block; font-family: 'Outfit', sans-serif; font-size: 11.5px; font-weight: 800; letter-spacing: 0.1em; color: #DC2626; text-transform: uppercase; margin-bottom: 8px;">QUICK &amp; SIMPLE WORKFLOW</span>
          <h2 style="font-family: 'Outfit', sans-serif; font-size: 28px; font-weight: 800; color: #0A0A0A; margin-bottom: 24px;">How To Compress a PDF Online for Free</h2>
          <ul style="list-style: none; display: flex; flex-direction: column; gap: 18px; padding: 0;">
            <li style="display: flex; align-items: flex-start; gap: 14px;">
              <span style="width: 28px; height: 28px; border-radius: 14px; background: #E5252A; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; flex-shrink: 0; margin-top: 2px;">1</span>
              <span style="font-size: 14.5px; color: #383838; line-height: 1.65;"><strong>Choose the PDF to compress:</strong> Drag and drop your document into the yellow dropzone above or click "Select files".</span>
            </li>
            <li style="display: flex; align-items: flex-start; gap: 14px;">
              <span style="width: 28px; height: 28px; border-radius: 14px; background: #E5252A; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; flex-shrink: 0; margin-top: 2px;">2</span>
              <span style="font-size: 14.5px; color: #383838; line-height: 1.65;"><strong>Select compression level:</strong> Pick <em>Recommended (~70%)</em>, <em>Extreme (~90%)</em>, or enter a <em>Custom Target (e.g. 200 KB)</em>.</span>
            </li>
            <li style="display: flex; align-items: flex-start; gap: 14px;">
              <span style="width: 28px; height: 28px; border-radius: 14px; background: #E5252A; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; flex-shrink: 0; margin-top: 2px;">3</span>
              <span style="font-size: 14.5px; color: #383838; line-height: 1.65;"><strong>Click "Compress PDF":</strong> SqueezeCore optimizes raster images and strips redundant font tables locally in milliseconds.</span>
            </li>
            <li style="display: flex; align-items: flex-start; gap: 14px;">
              <span style="width: 28px; height: 28px; border-radius: 14px; background: #E5252A; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; flex-shrink: 0; margin-top: 2px;">4</span>
              <span style="font-size: 14.5px; color: #383838; line-height: 1.65;"><strong>Download new compressed PDF:</strong> Save your lightweight, email-ready file directly to your disk.</span>
            </li>
          </ul>
        </div>
        <div style="display: flex; align-items: center; justify-content: center;">
          <!-- Realistic In-App Tool Preview Card -->
          <div style="background: #FFFFFF; border: 1px solid #E5E5E5; border-radius: 16px; padding: 24px; box-shadow: 0 10px 25px rgba(0,0,0,0.06); width: 100%; max-width: 340px;">
            <div style="font-size: 12px; font-weight: 800; color: #DC2626; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.05em;">COMPRESSION LEVEL</div>
            <div style="display: flex; flex-direction: column; gap: 10px;">
              <div style="border: 2px solid #E5252A; background: #FEF2F2; border-radius: 10px; padding: 12px 14px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <strong style="font-size: 14px; color: #0A0A0A; display: block;">Recommended</strong>
                  <span style="font-size: 12px; color: #71717A;">Balanced (~70% reduction)</span>
                </div>
                <span style="background: #10B981; color: #fff; font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 10px;">-72%</span>
              </div>
              <div style="border: 1px solid #E5E5E5; background: #FAFAFA; border-radius: 10px; padding: 12px 14px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <strong style="font-size: 14px; color: #0A0A0A; display: block;">Extreme</strong>
                  <span style="font-size: 12px; color: #71717A;">Smallest file (~90% reduction)</span>
                </div>
                <span style="background: #71717A; color: #fff; font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 10px;">-89%</span>
              </div>
              <div style="border: 1px solid #E5E5E5; background: #FAFAFA; border-radius: 10px; padding: 12px 14px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <strong style="font-size: 14px; color: #0A0A0A; display: block;">Custom KB Target</strong>
                  <span style="font-size: 12px; color: #71717A;">e.g. 200 KB for portals</span>
                </div>
                <span style="color: #DC2626; font-size: 12px; font-weight: 700;">Set size &rarr;</span>
              </div>
            </div>
            <div style="margin-top: 16px; background: #E5252A; color: #000; font-weight: 800; text-align: center; padding: 10px; border-radius: 8px; font-size: 13.5px;">
              Compress PDF
            </div>
          </div>
        </div>
      </div>

      <!-- Everything You Need in a PDF Compressor (6 Grid Tiles) -->
      <div style="text-align: center; margin-bottom: 40px;">
        <span style="display: block; font-family: 'Outfit', sans-serif; font-size: 11.5px; font-weight: 800; letter-spacing: 0.1em; color: #DC2626; text-transform: uppercase; margin-bottom: 8px;">ALL-IN-ONE SOLUTION</span>
        <h2 style="font-family: 'Outfit', sans-serif; font-size: 30px; font-weight: 800; color: #0A0A0A;">Everything You Need in a PDF Compressor</h2>
      </div>

      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 30px 40px; margin-bottom: 80px;">
        <div style="display: flex; gap: 18px; align-items: flex-start;">
          <div style="width: 52px; height: 52px; flex-shrink: 0; background: #FECACA; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #DC2626;">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </div>
          <div>
            <h4 style="font-family: 'Outfit', sans-serif; font-size: 18px; font-weight: 700; color: #0A0A0A; margin-bottom: 6px;">Compress to Under 100 KB or 200 KB</h4>
            <p style="font-size: 14px; color: #737373; line-height: 1.6;">Enforce strict size thresholds for government portals, visa forms, and university admissions gateways with custom KB targets.</p>
          </div>
        </div>

        <div style="display: flex; gap: 18px; align-items: flex-start;">
          <div style="width: 52px; height: 52px; flex-shrink: 0; background: #E0F2FE; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #0284C7;">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
          </div>
          <div>
            <h4 style="font-family: 'Outfit', sans-serif; font-size: 18px; font-weight: 700; color: #0A0A0A; margin-bottom: 6px;">Universal Format &amp; Device Support</h4>
            <p style="font-size: 14px; color: #737373; line-height: 1.6;">Runs in any browser on macOS, Windows 10/11, iPhone iOS Safari, Android Chrome, and Linux with zero software install.</p>
          </div>
        </div>

        <div style="display: flex; gap: 18px; align-items: flex-start;">
          <div style="width: 52px; height: 52px; flex-shrink: 0; background: #DCFCE7; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #16A34A;">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <div>
            <h4 style="font-family: 'Outfit', sans-serif; font-size: 18px; font-weight: 700; color: #0A0A0A; margin-bottom: 6px;">100% In-Browser Air-Gapped Privacy</h4>
            <p style="font-size: 14px; color: #737373; line-height: 1.6;">Documents never touch a cloud server. Full GDPR, HIPAA, and corporate NDA compliance via local client-side WebAssembly.</p>
          </div>
        </div>

        <div style="display: flex; gap: 18px; align-items: flex-start;">
          <div style="width: 52px; height: 52px; flex-shrink: 0; background: #F3E8FF; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #9333EA;">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          </div>
          <div>
            <h4 style="font-family: 'Outfit', sans-serif; font-size: 18px; font-weight: 700; color: #0A0A0A; margin-bottom: 6px;">Instant Local Processing Speed</h4>
            <p style="font-size: 14px; color: #737373; line-height: 1.6;">Zero network upload latency. Multi-megabyte PDF files are parsed, optimized, and compiled in memory in under a second.</p>
          </div>
        </div>

        <div style="display: flex; gap: 18px; align-items: flex-start;">
          <div style="width: 52px; height: 52px; flex-shrink: 0; background: #FFEDD5; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #EA580C;">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 14.14 14.14"/></svg>
          </div>
          <div>
            <h4 style="font-family: 'Outfit', sans-serif; font-size: 18px; font-weight: 700; color: #0A0A0A; margin-bottom: 6px;">Unlimited Free Compressions, No Paywalls</h4>
            <p style="font-size: 14px; color: #737373; line-height: 1.6;">No daily limits (unlike Smallpdf's 1-2 file limit). Compress unlimited documents with no watermarks and no credit cards required.</p>
          </div>
        </div>

        <div style="display: flex; gap: 18px; align-items: flex-start;">
          <div style="width: 52px; height: 52px; flex-shrink: 0; background: #FCE7F3; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #DB2777;">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          </div>
          <div>
            <h4 style="font-family: 'Outfit', sans-serif; font-size: 18px; font-weight: 700; color: #0A0A0A; margin-bottom: 6px;">Batch Processing &amp; Multi-File Compression</h4>
            <p style="font-size: 14px; color: #737373; line-height: 1.6;">Select and optimize dozens of PDF documents at once. Download them individually or as a single neatly compressed archive.</p>
          </div>
        </div>
      </div>

      <!-- PDF Compression FAQs (10 High-Intent Questions) -->
      <div style="text-align: center; margin-bottom: 40px;">
        <span style="display: block; font-family: 'Outfit', sans-serif; font-size: 11.5px; font-weight: 800; letter-spacing: 0.1em; color: #DC2626; text-transform: uppercase; margin-bottom: 8px;">FREQUENTLY ASKED QUESTIONS</span>
        <h2 style="font-family: 'Outfit', sans-serif; font-size: 30px; font-weight: 800; color: #0A0A0A;">PDF Compressing FAQs</h2>
      </div>

      <div class="fk-compress-faq-list" style="max-width: 860px; margin: 0 auto 70px; display: flex; flex-direction: column; gap: 12px;">
        <div class="fk-compress-faq-item active" style="background: #FFFFFF; border: 1px solid #E5E5E5; border-radius: 12px; overflow: hidden;">
          <button type="button" class="fk-compress-faq-q" style="width: 100%; padding: 18px 24px; text-align: left; background: none; border: none; font-family: 'Outfit', sans-serif; font-size: 16px; font-weight: 700; color: #0A0A0A; display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
            <span>How do I make a large PDF file smaller without losing quality?</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div class="fk-compress-faq-a" style="display: block; padding: 0 24px 20px; font-size: 14.5px; color: #4B4B4B; line-height: 1.7;">
            Upload your PDF into FileKit and choose "Recommended" compression. FileKit preserves vector typography and line drawings at 100% sharpness while downsampling heavy 300+ DPI images to high-definition screen standards (150 DPI), shrinking file size by up to 75% without visible loss in clarity.
          </div>
        </div>

        <div class="fk-compress-faq-item" style="background: #FFFFFF; border: 1px solid #E5E5E5; border-radius: 12px; overflow: hidden;">
          <button type="button" class="fk-compress-faq-q" style="width: 100%; padding: 18px 24px; text-align: left; background: none; border: none; font-family: 'Outfit', sans-serif; font-size: 16px; font-weight: 700; color: #0A0A0A; display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
            <span>How do I compress a PDF to 200 KB or 100 KB for government or job portals?</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div class="fk-compress-faq-a" style="display: none; padding: 0 24px 20px; font-size: 14.5px; color: #4B4B4B; line-height: 1.7;">
            Select the "Custom Target" compression option and enter your desired budget (e.g. 200 KB or 100 KB). SqueezeCore calculates the exact image downsampling and font compaction necessary to bring your document below the portal limit without making the text unreadable.
          </div>
        </div>

        <div class="fk-compress-faq-item" style="background: #FFFFFF; border: 1px solid #E5E5E5; border-radius: 12px; overflow: hidden;">
          <button type="button" class="fk-compress-faq-q" style="width: 100%; padding: 18px 24px; text-align: left; background: none; border: none; font-family: 'Outfit', sans-serif; font-size: 16px; font-weight: 700; color: #0A0A0A; display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
            <span>Can I compress PDFs to fit under the 25MB Gmail attachment limit?</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div class="fk-compress-faq-a" style="display: none; padding: 0 24px 20px; font-size: 14.5px; color: #4B4B4B; line-height: 1.7;">
            Yes! This is one of the most common uses. FileKit easily compresses 50MB–100MB reports down to 3MB–8MB, making them instant to send via email, Slack, Teams, or WhatsApp.
          </div>
        </div>

        <div class="fk-compress-faq-item" style="background: #FFFFFF; border: 1px solid #E5E5E5; border-radius: 12px; overflow: hidden;">
          <button type="button" class="fk-compress-faq-q" style="width: 100%; padding: 18px 24px; text-align: left; background: none; border: none; font-family: 'Outfit', sans-serif; font-size: 16px; font-weight: 700; color: #0A0A0A; display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
            <span>Are my confidential documents secure during compression?</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div class="fk-compress-faq-a" style="display: none; padding: 0 24px 20px; font-size: 14.5px; color: #4B4B4B; line-height: 1.7;">
            Yes, 100%. FileKit runs entirely client-side inside your browser's WebAssembly sandbox. Your files are never uploaded to any remote server, giving you complete data privacy.
          </div>
        </div>

        <div class="fk-compress-faq-item" style="background: #FFFFFF; border: 1px solid #E5E5E5; border-radius: 12px; overflow: hidden;">
          <button type="button" class="fk-compress-faq-q" style="width: 100%; padding: 18px 24px; text-align: left; background: none; border: none; font-family: 'Outfit', sans-serif; font-size: 16px; font-weight: 700; color: #0A0A0A; display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
            <span>Can I compress PDFs on my iPhone, Android, or Mac without installing apps?</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div class="fk-compress-faq-a" style="display: none; padding: 0 24px 20px; font-size: 14.5px; color: #4B4B4B; line-height: 1.7;">
            Yes. FileKit is a fully responsive Progressive Web Application. You can compress PDF documents directly inside Safari on iOS/iPadOS, Chrome on Android, and macOS Safari/Chrome without installing desktop software.
          </div>
        </div>

        <div class="fk-compress-faq-item" style="background: #FFFFFF; border: 1px solid #E5E5E5; border-radius: 12px; overflow: hidden;">
          <button type="button" class="fk-compress-faq-q" style="width: 100%; padding: 18px 24px; text-align: left; background: none; border: none; font-family: 'Outfit', sans-serif; font-size: 16px; font-weight: 700; color: #0A0A0A; display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
            <span>Can I compress multiple PDF documents at once in batch?</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div class="fk-compress-faq-a" style="display: none; padding: 0 24px 20px; font-size: 14.5px; color: #4B4B4B; line-height: 1.7;">
            Yes. Drag and drop multiple PDF files into the dropzone simultaneously. FileKit processes each file in parallel using Web Workers and lets you download individual optimized PDFs or export all compressed documents in a single ZIP archive.
          </div>
        </div>

        <div class="fk-compress-faq-item" style="background: #FFFFFF; border: 1px solid #E5E5E5; border-radius: 12px; overflow: hidden;">
          <button type="button" class="fk-compress-faq-q" style="width: 100%; padding: 18px 24px; text-align: left; background: none; border: none; font-family: 'Outfit', sans-serif; font-size: 16px; font-weight: 700; color: #0A0A0A; display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
            <span>Why is FileKit free with no daily limits while other tools charge subscriptions?</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div class="fk-compress-faq-a" style="display: none; padding: 0 24px 20px; font-size: 14.5px; color: #4B4B4B; line-height: 1.7;">
            Traditional tools like Smallpdf or iLovePDF incur heavy cloud server costs because they transfer and compute your files on remote servers, forcing daily paywalls. Because FileKit processes files using your device's own hardware via WebAssembly, we have zero cloud server compute costs&mdash;passing 100% free, unlimited utility directly to you.
          </div>
        </div>

        <div class="fk-compress-faq-item" style="background: #FFFFFF; border: 1px solid #E5E5E5; border-radius: 12px; overflow: hidden;">
          <button type="button" class="fk-compress-faq-q" style="width: 100%; padding: 18px 24px; text-align: left; background: none; border: none; font-family: 'Outfit', sans-serif; font-size: 16px; font-weight: 700; color: #0A0A0A; display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
            <span>Will compressing my PDF break bookmarks, fillable forms, or hyperlinks?</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div class="fk-compress-faq-a" style="display: none; padding: 0 24px 20px; font-size: 14.5px; color: #4B4B4B; line-height: 1.7;">
            No. FileKit performs in-place stream surgery. The internal PDF document catalog, interactive AcroForm fields, digital signatures, table of contents outlines, and web hyperlinks remain 100% intact and functional.
          </div>
        </div>
      </div>

      <!-- Tutorials on PDF Compression (Topical Hub Matching Smallpdf) -->
      <div style="text-align: center; margin-bottom: 32px;">
        <span style="display: block; font-family: 'Outfit', sans-serif; font-size: 11.5px; font-weight: 800; letter-spacing: 0.1em; color: #DC2626; text-transform: uppercase; margin-bottom: 8px;">STEP-BY-STEP GUIDES</span>
        <h2 style="font-family: 'Outfit', sans-serif; font-size: 28px; font-weight: 800; color: #0A0A0A;">Tutorials on PDF Compression</h2>
      </div>

      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-bottom: 70px;">
        <div style="background: #FFFFFF; border: 1px solid #E5E5E5; border-radius: 16px; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
          <div style="height: 120px; background: #FECACA; display: flex; align-items: center; justify-content: center;">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="m9 15 3 3 3-3"/>
            </svg>
          </div>
          <div style="padding: 20px; flex: 1; display: flex; flex-direction: column;">
            <span style="font-size: 11px; font-weight: 800; color: #DC2626; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">PORTAL GUIDES</span>
            <h3 style="font-family: 'Outfit', sans-serif; font-size: 17px; font-weight: 700; color: #0A0A0A; margin-bottom: 8px; line-height: 1.4;">How to Compress a PDF to 200KB or Less</h3>
            <p style="font-size: 13.5px; color: #666666; line-height: 1.5; margin-bottom: 16px; flex: 1;">Step-by-step instructions to reduce documents for government, visa, and online job application gateways without blurring text.</p>
            <a href="#compress-pdf" onclick="window.scrollTo({top:0, behavior:'smooth'}); return false;" style="font-size: 13px; font-weight: 700; color: #DC2626; text-decoration: none; display: flex; align-items: center; gap: 4px;">Read tutorial &rarr;</a>
          </div>
        </div>

        <div style="background: #FFFFFF; border: 1px solid #E5E5E5; border-radius: 16px; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
          <div style="height: 120px; background: #E0F2FE; display: flex; align-items: center; justify-content: center;">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#0284C7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
          </div>
          <div style="padding: 20px; flex: 1; display: flex; flex-direction: column;">
            <span style="font-size: 11px; font-weight: 800; color: #0284C7; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">MACOS DESKTOP</span>
            <h3 style="font-family: 'Outfit', sans-serif; font-size: 17px; font-weight: 700; color: #0A0A0A; margin-bottom: 8px; line-height: 1.4;">How to Compress a PDF on Mac</h3>
            <p style="font-size: 13.5px; color: #666666; line-height: 1.5; margin-bottom: 16px; flex: 1;">Compare built-in macOS Preview Quartz filters with browser-based WebAssembly compression to find the best quality.</p>
            <a href="#compress-pdf" onclick="window.scrollTo({top:0, behavior:'smooth'}); return false;" style="font-size: 13px; font-weight: 700; color: #0284C7; text-decoration: none; display: flex; align-items: center; gap: 4px;">Read tutorial &rarr;</a>
          </div>
        </div>

        <div style="background: #FFFFFF; border: 1px solid #E5E5E5; border-radius: 16px; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
          <div style="height: 120px; background: #FCE7F3; display: flex; align-items: center; justify-content: center;">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#DB2777" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
            </svg>
          </div>
          <div style="padding: 20px; flex: 1; display: flex; flex-direction: column;">
            <span style="font-size: 11px; font-weight: 800; color: #DB2777; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">EMAIL ATTACHMENTS</span>
            <h3 style="font-family: 'Outfit', sans-serif; font-size: 17px; font-weight: 700; color: #0A0A0A; margin-bottom: 8px; line-height: 1.4;">How to Compress PDF for Gmail &amp; Outlook</h3>
            <p style="font-size: 13.5px; color: #666666; line-height: 1.5; margin-bottom: 16px; flex: 1;">How to effortlessly bypass Gmail's 25MB attachment limit and send bulky presentations and reports securely.</p>
            <a href="#compress-pdf" onclick="window.scrollTo({top:0, behavior:'smooth'}); return false;" style="font-size: 13px; font-weight: 700; color: #DB2777; text-decoration: none; display: flex; align-items: center; gap: 4px;">Read tutorial &rarr;</a>
          </div>
        </div>
      </div>

      <!-- Bottom Conversion Banner & Social Proof Rating (Matching Smallpdf Screenshot) -->
      <div style="background: linear-gradient(135deg, #18181B 0%, #27272A 100%); border-radius: 20px; padding: 48px 40px; color: #FFFFFF; display: flex; justify-content: space-between; align-items: center; gap: 32px; margin-bottom: 40px; box-shadow: 0 12px 30px rgba(0,0,0,0.12);">
        <div>
          <h2 style="font-family: 'Outfit', sans-serif; font-size: 30px; font-weight: 800; color: #FFFFFF; margin-bottom: 10px;">Private PDF Compression Made Effortless</h2>
          <p style="font-size: 15px; color: #A1A1AA; max-width: 580px; line-height: 1.6;">Compress documents up to 90% right now with zero file size limits, no registration required, and 100% in-browser confidentiality.</p>
        </div>
        <button type="button" onclick="window.scrollTo({top:0, behavior:'smooth'});" style="background: #E5252A; color: #0A0A0A; border: none; padding: 16px 32px; border-radius: 12px; font-family: 'Outfit', sans-serif; font-size: 16px; font-weight: 800; cursor: pointer; flex-shrink: 0; box-shadow: 0 4px 14px rgba(234,179,8,0.3); transition: transform 0.15s, background 0.15s;">
          Compress PDF Free
        </button>
      </div>

      <!-- Social Proof Rating Bar -->
      <div style="text-align: center; margin-bottom: 60px; font-size: 13.5px; color: #71717A; display: flex; align-items: center; justify-content: center; gap: 8px;">
        <span style="color: #E5252A; font-size: 16px;">★★★★★</span>
        <strong style="color: #18181B;">4.9 / 5</strong>
        <span>&bull; Trusted for private in-browser compression by over 150,000 users worldwide</span>
      </div>
`;

let code = fs.readFileSync('js/app.js', 'utf8');
const startTag = 'getCompressPdfSeoHtml() { return `';
const endTag = '    getMergePdfSeoHtml() { return `';

const sIdx = code.indexOf(startTag);
const eIdx = code.indexOf(endTag);

if (sIdx === -1 || eIdx === -1) {
  console.error('Failed to find tags');
  process.exit(1);
}

const replacement = 'getCompressPdfSeoHtml() { return `\n' + seoHtml + '`; },\n';
const newCode = code.slice(0, sIdx) + replacement + code.slice(eIdx);

fs.writeFileSync('js/app.js', newCode, 'utf8');
console.log('Successfully updated getCompressPdfSeoHtml in js/app.js!');

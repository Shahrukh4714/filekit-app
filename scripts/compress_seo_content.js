const fs = require('fs');
const path = require('path');

// Read the SVGs
const svg1 = fs.readFileSync(path.join(__dirname, 'fk_editorial_1.svg'), 'utf8');
const svg2 = fs.readFileSync(path.join(__dirname, 'fk_editorial_2.svg'), 'utf8');
const svg3 = fs.readFileSync(path.join(__dirname, 'fk_editorial_3.svg'), 'utf8');

// Commercial High-Converting SEO Content for Compress PDF
// Matching Smallpdf's exact transparency pattern for free limits + Pro / Lifetime options
const compressEditorialHtml = `
      <!-- Sub-Hero Quality & Trust Bar -->
      <div class="fk-seo-quality-bar">
        <div class="fk-quality-desc-col">
          <p class="fk-quality-desc-text">
            Quickly reduce PDF file size for email, web portals, and job applications. 100% private in-browser WebAssembly processing &mdash; zero files uploaded to any server.
          </p>
        </div>
        <div class="fk-quality-checks-col">
          <div class="fk-quality-check-item">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            <span>Hit strict upload limits (200 KB, 100 KB, 1 MB)</span>
          </div>
          <div class="fk-quality-check-item">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            <span>Sharp text &amp; clear photos preserved</span>
          </div>
          <div class="fk-quality-check-item">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            <span>Free to use &mdash; no signup needed</span>
          </div>
        </div>
      </div>

      <div style="text-align: center; margin-bottom: 56px;">
        <span style="display: block; font-family: 'Outfit', sans-serif; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; color: #DC2626; text-transform: uppercase; margin-bottom: 8px;">SMART CLIENT-SIDE OPTIMIZATION</span>
        <h2 style="font-family: 'Outfit', sans-serif; font-size: 32px; font-weight: 800; color: #111827; letter-spacing: -0.025em; margin-bottom: 12px;">Shrink PDF File Size, Keep Every Detail Sharp</h2>
        <p style="color: #4B5563; font-size: 16px; line-height: 1.6; margin: 0;">Reduce file size to pass Gmail limits and portal caps without blurry text or washed-out images.</p>
      </div>

      <!-- Story 1: Cut File Size by up to 90% -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; align-items: center; gap: 64px; margin-bottom: 96px;">
        <div>
          <h3 style="font-family: 'Outfit', sans-serif; font-size: 28px; font-weight: 800; color: #111827; letter-spacing: -0.025em; margin-bottom: 16px;">Cut File Size by up to 90%</h3>
          <p style="font-size: 15.5px; color: #4B5563; line-height: 1.7; margin-bottom: 14px;">Ever had Gmail reject a 26 MB report, or a job portal block your resume because it was over 200 KB? High-res phone scans and embedded slide decks add megabytes of hidden bulk to PDF documents.</p>
          <p style="font-size: 15.5px; color: #4B5563; line-height: 1.7; margin-bottom: 20px;">FileKit strips out unneeded background metadata and resamples heavy print graphics to clean screen resolution. A bloated 25 MB document easily drops down to 2.5 MB or less &mdash; ready to send in seconds.</p>
          <ul style="list-style: none; padding: 0; display: flex; flex-direction: column; gap: 12px; font-size: 14.5px; color: #374151;">
            <li style="display: flex; align-items: center; gap: 10px;">
              <span style="color: #10B981; font-weight: bold; font-size: 16px;">✓</span> <span><strong>Target Portal Limits:</strong> Easily compress documents to meet strict 200 KB, 100 KB, or 1 MB application limits.</span>
            </li>
            <li style="display: flex; align-items: center; gap: 10px;">
              <span style="color: #10B981; font-weight: bold; font-size: 16px;">✓</span> <span><strong>Fast Email Delivery:</strong> Drops heavy scans well below Gmail (25 MB) and Outlook (20 MB) attachment limits.</span>
            </li>
          </ul>
        </div>
        <div style="display: flex; align-items: center; justify-content: center;">
          <div style="width: 100%; max-width: 480px; display: block;">
            ${svg1}
          </div>
        </div>
      </div>

      <!-- Story 2: Read Every Line Clearly -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; align-items: center; gap: 64px; margin-bottom: 96px;">
        <div style="display: flex; align-items: center; justify-content: center; order: 1;">
          <div style="width: 100%; max-width: 480px; display: block;">
            ${svg2}
          </div>
        </div>
        <div style="order: 2;">
          <h3 style="font-family: 'Outfit', sans-serif; font-size: 28px; font-weight: 800; color: #111827; letter-spacing: -0.025em; margin-bottom: 16px;">Read Every Line Clearly at 100% Zoom</h3>
          <p style="font-size: 15.5px; color: #4B5563; line-height: 1.7; margin-bottom: 14px;">Cheap compression tools turn documents into fuzzy, unreadable scans. FileKit handles text and graphics differently.</p>
          <p style="font-size: 15.5px; color: #4B5563; line-height: 1.7; margin-bottom: 20px;">Vector text, typographic serifs, and mathematical formulas are left completely untouched in pure vector format. Only oversized raster photos are downsampled, so your letters look just as sharp on an iPhone, 4K monitor, or printed page.</p>
          <ul style="list-style: none; padding: 0; display: flex; flex-direction: column; gap: 12px; font-size: 14.5px; color: #374151;">
            <li style="display: flex; align-items: center; gap: 10px;">
              <span style="color: #10B981; font-weight: bold; font-size: 16px;">✓</span> <span><strong>True Vector Text:</strong> Fonts remain razor-sharp at infinite zoom &mdash; no jagged pixel edges or blurry letters.</span>
            </li>
            <li style="display: flex; align-items: center; gap: 10px;">
              <span style="color: #10B981; font-weight: bold; font-size: 16px;">✓</span> <span><strong>Document Structure Preserved:</strong> Table of contents links, bookmarks, form fields, and signatures stay clickable and intact.</span>
            </li>
          </ul>
        </div>
      </div>

      <!-- Story 3: Zero Server Uploads -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; align-items: center; gap: 64px; margin-bottom: 96px;">
        <div>
          <h3 style="font-family: 'Outfit', sans-serif; font-size: 28px; font-weight: 800; color: #111827; letter-spacing: -0.025em; margin-bottom: 16px;">Zero Server Uploads. True Client-Side Privacy.</h3>
          <p style="font-size: 15.5px; color: #4B5563; line-height: 1.7; margin-bottom: 14px;">Most online PDF compressors upload your contracts, tax filings, and bank statements to remote cloud servers. You never know who has access or how long copies sit on a server hard drive.</p>
          <p style="font-size: 15.5px; color: #4B5563; line-height: 1.7; margin-bottom: 20px;">FileKit runs the entire compression process right in your browser using WebAssembly. Your files never leave your computer or phone &mdash; zero bytes are sent across the internet.</p>
          <ul style="list-style: none; padding: 0; display: flex; flex-direction: column; gap: 12px; font-size: 14.5px; color: #374151;">
            <li style="display: flex; align-items: center; gap: 10px;">
              <span style="color: #10B981; font-weight: bold; font-size: 16px;">✓</span> <span><strong>Zero Network Traffic:</strong> Works offline once loaded. Disconnect your Wi-Fi and it still compresses files in your device RAM.</span>
            </li>
            <li style="display: flex; align-items: center; gap: 10px;">
              <span style="color: #10B981; font-weight: bold; font-size: 16px;">✓</span> <span><strong>Generous Free Use:</strong> Free daily use with no account required. Upgrade anytime to Monthly or a permanent $14 Lifetime License for unlimited heavy volume.</span>
            </li>
          </ul>
        </div>
        <div style="display: flex; align-items: center; justify-content: center;">
          <div style="width: 100%; max-width: 480px; display: block;">
            ${svg3}
          </div>
        </div>
      </div>

      <!-- Step-by-Step How-To Section -->
      <div style="background: #F8FAFC; border-radius: 16px; padding: 44px 38px; display: grid; grid-template-columns: 1.2fr 1fr; gap: 40px; align-items: center; margin-bottom: 70px; border: 1px solid #E2E8F0;">
        <div>
          <span style="display: block; font-family: 'Outfit', sans-serif; font-size: 11.5px; font-weight: 700; letter-spacing: 0.08em; color: #DC2626; text-transform: uppercase; margin-bottom: 8px;">SIMPLE 4-STEP WORKFLOW</span>
          <h2 style="font-family: 'Outfit', sans-serif; font-size: 28px; font-weight: 800; color: #111827; letter-spacing: -0.02em; margin-bottom: 24px;">How To Compress PDF Files Online</h2>
          <ul style="list-style: none; display: flex; flex-direction: column; gap: 16px; padding: 0;">
            <li style="display: flex; align-items: flex-start; gap: 14px;">
              <span style="width: 26px; height: 26px; border-radius: 50%; background: #0F172A; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; flex-shrink: 0; margin-top: 2px;">1</span>
              <span style="font-size: 14.5px; color: #4B5563; line-height: 1.6;"><strong>Drop your PDF:</strong> Drag your document into the dropzone above or click &ldquo;Choose Files&rdquo;.</span>
            </li>
            <li style="display: flex; align-items: flex-start; gap: 14px;">
              <span style="width: 26px; height: 26px; border-radius: 50%; background: #0F172A; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; flex-shrink: 0; margin-top: 2px;">2</span>
              <span style="font-size: 14.5px; color: #4B5563; line-height: 1.6;"><strong>Select compression strength:</strong> Choose Extreme (for 100KB&ndash;200KB portal limits), Recommended (balanced for web &amp; email), or Low (best for print fidelity).</span>
            </li>
            <li style="display: flex; align-items: flex-start; gap: 14px;">
              <span style="width: 26px; height: 26px; border-radius: 50%; background: #0F172A; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; flex-shrink: 0; margin-top: 2px;">3</span>
              <span style="font-size: 14.5px; color: #4B5563; line-height: 1.6;"><strong>Instant local processing:</strong> Your device's multi-core CPU optimizes the document in browser RAM in milliseconds.</span>
            </li>
            <li style="display: flex; align-items: flex-start; gap: 14px;">
              <span style="width: 26px; height: 26px; border-radius: 50%; background: #0F172A; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; flex-shrink: 0; margin-top: 2px;">4</span>
              <span style="font-size: 14.5px; color: #4B5563; line-height: 1.6;"><strong>Download smaller PDF:</strong> Instantly save your lightweight, email-ready PDF with zero server upload wait times.</span>
            </li>
          </ul>
        </div>
        <div style="display: flex; align-items: center; justify-content: center;">
          <svg width="380" height="260" viewBox="0 0 380 260" fill="none" xmlns="http://www.w3.org/2000/svg" class="fk-seo-workflow-preview">
            <rect width="380" height="260" rx="12" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1.5" filter="drop-shadow(0 4px 12px rgba(15,23,42,0.06))"/>
            <rect width="380" height="32" rx="12" fill="#F1F5F9"/>
            <circle cx="16" cy="16" r="4" fill="#CBD5E1"/>
            <circle cx="28" cy="16" r="4" fill="#CBD5E1"/>
            <circle cx="40" cy="16" r="4" fill="#CBD5E1"/>
            <text x="190" y="20" fill="#64748B" font-family="'Outfit', sans-serif" font-size="10.5" font-weight="700" text-anchor="middle">Universal Compress Pipeline</text>
            
            <g transform="translate(30, 56)">
              <rect width="80" height="80" rx="8" fill="#F8FAFC" stroke="#E2E8F0"/>
              <path d="M 28 32 H 52 V 56 H 28 Z" fill="#EF4444" opacity="0.15"/>
              <text x="40" y="48" fill="#DC2626" font-family="'Outfit', sans-serif" font-size="10" font-weight="800" text-anchor="middle">PDF</text>
              <text x="40" y="70" fill="#64748B" font-family="'Outfit', sans-serif" font-size="9" font-weight="600" text-anchor="middle">1. Drop File</text>
            </g>
            <path d="M 120 96 L 135 96" stroke="#94A3B8" stroke-width="2" stroke-linecap="round"/>
            
            <g transform="translate(145, 56)">
              <rect width="90" height="80" rx="8" fill="#F0FDF4" stroke="#DCFCE7"/>
              <circle cx="45" cy="40" r="16" fill="#10B981" opacity="0.15"/>
              <path d="M 39 40 L 43 44 L 51 36" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <text x="45" y="70" fill="#15803D" font-family="'Outfit', sans-serif" font-size="9" font-weight="700" text-anchor="middle">2. Local RAM</text>
            </g>
            <path d="M 245 96 L 260 96" stroke="#94A3B8" stroke-width="2" stroke-linecap="round"/>
            
            <g transform="translate(270, 56)">
              <rect width="80" height="80" rx="8" fill="#EFF6FF" stroke="#DBEAFE"/>
              <path d="M 40 32 V 48 M 34 42 L 40 48 L 46 42" stroke="#2563EB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <text x="40" y="70" fill="#1D4ED8" font-family="'Outfit', sans-serif" font-size="9" font-weight="700" text-anchor="middle">3. Download</text>
            </g>
            
            <g transform="translate(30, 160)">
              <rect width="320" height="74" rx="8" fill="#F8FAFC" stroke="#E2E8F0"/>
              <text x="14" y="24" fill="#0F172A" font-family="'Outfit', sans-serif" font-size="10.5" font-weight="700">Average Savings Benchmark</text>
              <rect x="14" y="34" width="292" height="10" rx="5" fill="#E2E8F0"/>
              <rect x="14" y="34" width="248" height="10" rx="5" fill="#10B981"/>
              <text x="14" y="58" fill="#15803D" font-family="'Outfit', sans-serif" font-size="10" font-weight="700">80% Typical Size Reduction</text>
              <text x="306" y="58" fill="#64748B" font-family="'Outfit', sans-serif" font-size="9.5" font-weight="600" text-anchor="end">Zero Wait Time</text>
            </g>
          </svg>
        </div>
      </div>

      <!-- Feature Grid: 6 Real Value Props -->
      <div style="text-align: center; margin-bottom: 48px;">
        <span style="display: block; font-family: 'Outfit', sans-serif; font-size: 11.5px; font-weight: 800; letter-spacing: 0.1em; color: #DC2626; text-transform: uppercase; margin-bottom: 8px;">BUILT FOR PRIVACY &amp; SPEED</span>
        <h2 style="font-family: 'Outfit', sans-serif; font-size: 30px; font-weight: 800; color: #0A0A0A;">Why Professionals &amp; Students Use FileKit</h2>
      </div>

      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 30px 40px; margin-bottom: 80px;">
        <div style="display: flex; gap: 18px; align-items: flex-start;">
          <div style="width: 52px; height: 52px; border-radius: 12px; background: #FEF2F2; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          </div>
          <div>
            <h4 style="font-family: 'Outfit', sans-serif; font-size: 18px; font-weight: 700; color: #0A0A0A; margin-bottom: 6px;">Instant WASM Speed</h4>
            <p style="font-size: 14px; color: #737373; line-height: 1.6;">Client-side WebAssembly processes large multi-megabyte PDFs in milliseconds with zero queue delay.</p>
          </div>
        </div>

        <div style="display: flex; gap: 18px; align-items: flex-start;">
          <div style="width: 52px; height: 52px; border-radius: 12px; background: #ECFDF5; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <div>
            <h4 style="font-family: 'Outfit', sans-serif; font-size: 18px; font-weight: 700; color: #0A0A0A; margin-bottom: 6px;">100% In-Browser Privacy</h4>
            <p style="font-size: 14px; color: #737373; line-height: 1.6;">Zero cloud uploads &mdash; documents are compressed locally in device RAM and never saved to any server.</p>
          </div>
        </div>

        <div style="display: flex; gap: 18px; align-items: flex-start;">
          <div style="width: 52px; height: 52px; border-radius: 12px; background: #F5F3FF; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </div>
          <div>
            <h4 style="font-family: 'Outfit', sans-serif; font-size: 18px; font-weight: 700; color: #0A0A0A; margin-bottom: 6px;">Preset Target Sizes</h4>
            <p style="font-size: 14px; color: #737373; line-height: 1.6;">Choose between Extreme (-90% for 100KB&ndash;200KB limits), Recommended (-80%), and Low compression.</p>
          </div>
        </div>

        <div style="display: flex; gap: 18px; align-items: flex-start;">
          <div style="width: 52px; height: 52px; border-radius: 12px; background: #EFF6FF; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
          </div>
          <div>
            <h4 style="font-family: 'Outfit', sans-serif; font-size: 18px; font-weight: 700; color: #0A0A0A; margin-bottom: 6px;">100% Visual Clarity</h4>
            <p style="font-size: 14px; color: #737373; line-height: 1.6;">Preserves original vector fonts, high-res photos, bookmarks, metadata, and form fields intact.</p>
          </div>
        </div>

        <div style="display: flex; gap: 18px; align-items: flex-start;">
          <div style="width: 52px; height: 52px; border-radius: 12px; background: #FFFBEB; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D97706" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
          </div>
          <div>
            <h4 style="font-family: 'Outfit', sans-serif; font-size: 18px; font-weight: 700; color: #0A0A0A; margin-bottom: 6px;">Universal Device Support</h4>
            <p style="font-size: 14px; color: #737373; line-height: 1.6;">Compress PDFs seamlessly on macOS, Windows, Linux, iOS, iPadOS, and Android web browsers.</p>
          </div>
        </div>

        <div style="display: flex; gap: 18px; align-items: flex-start;">
          <div style="width: 52px; height: 52px; border-radius: 12px; background: #FAF5FF; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9333EA" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/></svg>
          </div>
          <div>
            <h4 style="font-family: 'Outfit', sans-serif; font-size: 18px; font-weight: 700; color: #0A0A0A; margin-bottom: 6px;">Free Use &amp; Lifetime Pro Option</h4>
            <p style="font-size: 14px; color: #737373; line-height: 1.6;">Free daily usage without sign-up. Need unlimited volume or heavy batch processing? Upgrade to Monthly or a permanent $14 Lifetime License.</p>
          </div>
        </div>
      </div>

      <!-- Smallpdf-style Transparent Upgrade Notice Banner -->
      <div style="max-width: 860px; margin: 0 auto 60px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 16px; padding: 24px 28px; display: flex; align-items: center; justify-content: space-between; gap: 20px;">
        <div style="display: flex; align-items: center; gap: 16px;">
          <div style="width: 44px; height: 44px; border-radius: 10px; background: #EEF2FF; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          </div>
          <div>
            <div style="font-family: 'Outfit', sans-serif; font-size: 16px; font-weight: 700; color: #0F172A; margin-bottom: 2px;">Need unlimited batch compression?</div>
            <div style="font-size: 13.5px; color: #64748B;">Free usage limits apply for everyday tasks. Unlock unlimited processing with a Monthly plan or a $14 one-time Lifetime License.</div>
          </div>
        </div>
        <a href="#pricing" style="display: inline-flex; align-items: center; gap: 6px; background: #0F172A; color: #FFFFFF; font-family: 'Outfit', sans-serif; font-size: 13.5px; font-weight: 700; padding: 10px 20px; border-radius: 8px; text-decoration: none; white-space: nowrap; transition: background 0.2s;">
          <span>View Plans</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </a>
      </div>

      <!-- FAQ Section (Exact Smallpdf Model Pattern) -->
      <div style="text-align: center; margin-bottom: 40px;">
        <span style="display: block; font-family: 'Outfit', sans-serif; font-size: 11.5px; font-weight: 800; letter-spacing: 0.1em; color: #DC2626; text-transform: uppercase; margin-bottom: 8px;">FREQUENTLY ASKED QUESTIONS</span>
        <h2 style="font-family: 'Outfit', sans-serif; font-size: 30px; font-weight: 800; color: #0A0A0A;">PDF Compression FAQs</h2>
      </div>

      <div class="fk-compress-faq-list" style="max-width: 860px; margin: 0 auto 70px; display: flex; flex-direction: column; gap: 12px;">
        <!-- FAQ 1: Free vs Pro Limits (Smallpdf's exact #1 Question) -->
        <div class="fk-compress-faq-item active" style="background: #FFFFFF; border: 1px solid #E5E5E5; border-radius: 12px; overflow: hidden;">
          <button type="button" class="fk-compress-faq-q" style="width: 100%; padding: 18px 24px; text-align: left; background: none; border: none; font-family: 'Outfit', sans-serif; font-size: 16px; font-weight: 700; color: #0A0A0A; display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
            <span>Is FileKit's PDF compressor free to use?</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div class="fk-compress-faq-a" style="display: block; padding: 0 24px 20px; font-size: 14.5px; color: #4B4B4B; line-height: 1.7;">
            Yes! Our PDF compressor is free for everyday use without requiring any account creation or credit card. Note that generous daily usage limits apply for free users. For heavy power users who need unlimited daily compressions or bulk batch processing, we offer affordable Monthly subscriptions as well as a $14 permanent Lifetime License with no recurring fees.
          </div>
        </div>

        <div class="fk-compress-faq-item" style="background: #FFFFFF; border: 1px solid #E5E5E5; border-radius: 12px; overflow: hidden;">
          <button type="button" class="fk-compress-faq-q" style="width: 100%; padding: 18px 24px; text-align: left; background: none; border: none; font-family: 'Outfit', sans-serif; font-size: 16px; font-weight: 700; color: #0A0A0A; display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
            <span>Will compressing my PDF make the text blurry?</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div class="fk-compress-faq-a" style="display: none; padding: 0 24px 20px; font-size: 14.5px; color: #4B4B4B; line-height: 1.7;">
            No. FileKit does not rasterize your pages into low-resolution images. All vector typography, text fonts, and layout coordinates remain untouched, meaning your text stays pin-sharp even at 400% zoom. Only heavy embedded photos are resampled to balanced screen resolutions (150&ndash;300 DPI).
          </div>
        </div>

        <div class="fk-compress-faq-item" style="background: #FFFFFF; border: 1px solid #E5E5E5; border-radius: 12px; overflow: hidden;">
          <button type="button" class="fk-compress-faq-q" style="width: 100%; padding: 18px 24px; text-align: left; background: none; border: none; font-family: 'Outfit', sans-serif; font-size: 16px; font-weight: 700; color: #0A0A0A; display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
            <span>How do I compress a PDF to under 200 KB or 100 KB?</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div class="fk-compress-faq-a" style="display: none; padding: 0 24px 20px; font-size: 14.5px; color: #4B4B4B; line-height: 1.7;">
            For strict portal limits (like job boards, passport portals, or university admissions), select the Extreme compression level. This strips all redundant metadata and resamples images to 150 DPI, which typically reduces documents by 70% to 90%.
          </div>
        </div>

        <div class="fk-compress-faq-item" style="background: #FFFFFF; border: 1px solid #E5E5E5; border-radius: 12px; overflow: hidden;">
          <button type="button" class="fk-compress-faq-q" style="width: 100%; padding: 18px 24px; text-align: left; background: none; border: none; font-family: 'Outfit', sans-serif; font-size: 16px; font-weight: 700; color: #0A0A0A; display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
            <span>Can I compress a PDF on my phone?</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div class="fk-compress-faq-a" style="display: none; padding: 0 24px 20px; font-size: 14.5px; color: #4B4B4B; line-height: 1.7;">
            Yes. FileKit works seamlessly in mobile browsers on iOS (iPhone/iPad) and Android. Because processing happens locally in your browser memory, it does not waste mobile data uploading heavy files.
          </div>
        </div>

        <div class="fk-compress-faq-item" style="background: #FFFFFF; border: 1px solid #E5E5E5; border-radius: 12px; overflow: hidden;">
          <button type="button" class="fk-compress-faq-q" style="width: 100%; padding: 18px 24px; text-align: left; background: none; border: none; font-family: 'Outfit', sans-serif; font-size: 16px; font-weight: 700; color: #0A0A0A; display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
            <span>Are my files uploaded or stored on any server?</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div class="fk-compress-faq-a" style="display: none; padding: 0 24px 20px; font-size: 14.5px; color: #4B4B4B; line-height: 1.7;">
            There are no uploaded files! Unlike other websites that store your files on their servers for 1&ndash;2 hours, FileKit processes everything locally in your device's browser memory (RAM). The file never leaves your phone or computer.
          </div>
        </div>
      </div>
`;

// Export the HTML and write helper
module.exports = {
  compressEditorialHtml
};

console.log('Updated Smallpdf-parity commercial SEO content compiled successfully!');

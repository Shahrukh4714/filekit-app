const fs = require('fs');

let app = fs.readFileSync('js/app.js', 'utf8');

const targetRegex = /<!-- Sub-Hero Trust & Value Strip -->[\s\S]*?<div class="fk-seo-trust-strip"[\s\S]*?<\/div>\s*<\/div>/;

const newPills = `<!-- Centered 3-Pill Trust Bar (FileKit Signature Polish) -->
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
      </div>`;

if (targetRegex.test(app)) {
  app = app.replace(targetRegex, newPills);
  fs.writeFileSync('js/app.js', app, 'utf8');
  console.log('✓ Successfully replaced trust strip in js/app.js');
} else {
  console.log('! targetRegex did not match in js/app.js');
}

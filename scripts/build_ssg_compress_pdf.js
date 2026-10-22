const fs = require('fs');
const path = require('path');
const { compressEditorialHtml } = require('./compress_seo_content.js');

const rootDir = path.resolve(__dirname, '..');
const indexHtmlPath = path.join(rootDir, 'index.html');
const outDir = path.join(rootDir, 'compress-pdf');
const outFilePath = path.join(outDir, 'index.html');

// Read base index.html
let html = fs.readFileSync(indexHtmlPath, 'utf8');

// 1. Convert relative asset URLs to root-relative URLs so they work from /compress-pdf/
html = html.replace(/href="dist\//g, 'href="/dist/');
html = html.replace(/src="dist\//g, 'src="/dist/');
html = html.replace(/href="assets\//g, 'href="/assets/');
html = html.replace(/src="assets\//g, 'src="/assets/');

// 2. Replace SEO Title, Meta Description, and Canonical URL
const pageTitle = 'Compress PDF Online — Reduce PDF File Size Free | FileKit';
const metaDescription = 'Compress PDF files online for free to 200KB, 100KB, or email size without losing quality. 100% private in-browser compression with zero file uploads or signups.';
const canonicalUrl = 'https://filekit.cc/compress-pdf';

html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${pageTitle}</title>`);
html = html.replace(/<meta name="description" content="[^"]*"\s*\/?>/i, `<meta name="description" content="${metaDescription}"/>`);
html = html.replace(/<link rel="canonical" href="[^"]*"\s*\/?>/i, `<link rel="canonical" href="${canonicalUrl}"/>`);

// Replace Open Graph and Twitter metadata
html = html.replace(/<meta property="og:title" content="[^"]*"\s*\/?>/i, `<meta property="og:title" content="${pageTitle}"/>`);
html = html.replace(/<meta property="og:description" content="[^"]*"\s*\/?>/i, `<meta property="og:description" content="${metaDescription}"/>`);
html = html.replace(/<meta property="og:url" content="[^"]*"\s*\/?>/i, `<meta property="og:url" content="${canonicalUrl}"/>`);
html = html.replace(/<meta name="twitter:title" content="[^"]*"\s*\/?>/i, `<meta name="twitter:title" content="${pageTitle}"/>`);
html = html.replace(/<meta name="twitter:description" content="[^"]*"\s*\/?>/i, `<meta name="twitter:description" content="${metaDescription}"/>`);

// 3. Inject dedicated JSON-LD Structured Data for Compress PDF (WebApplication + FAQPage)
const compressSchema = `
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      "@id": "https://filekit.cc/compress-pdf#app",
      "name": "Compress PDF Online",
      "url": "https://filekit.cc/compress-pdf",
      "description": "${metaDescription}",
      "applicationCategory": "UtilitiesApplication",
      "operatingSystem": "All",
      "offers": {
        "@type": "Offer",
        "price": "0.00",
        "priceCurrency": "USD"
      }
    },
    {
      "@type": "FAQPage",
      "@id": "https://filekit.cc/compress-pdf#faq",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Is FileKit's PDF compressor free to use?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes! Our PDF compressor is free for everyday use without requiring any account creation or credit card. Note that generous daily usage limits apply for free users. For heavy power users who need unlimited daily compressions or bulk batch processing, we offer affordable Monthly subscriptions as well as a $14 permanent Lifetime License with no recurring fees."
          }
        },
        {
          "@type": "Question",
          "name": "Will compressing my PDF make the text blurry?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "No. FileKit does not rasterize your pages into low-resolution images. All vector typography, text fonts, and layout coordinates remain untouched, meaning your text stays pin-sharp even at 400% zoom. Only heavy embedded photos are resampled to balanced screen resolutions (150-300 DPI)."
          }
        },
        {
          "@type": "Question",
          "name": "How do I compress a PDF to under 200 KB or 100 KB?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "For strict portal limits (like job boards, passport portals, or university admissions), select the Extreme compression level. This strips all redundant metadata and resamples images to 150 DPI, which typically reduces documents by 70% to 90%."
          }
        },
        {
          "@type": "Question",
          "name": "Can I compress a PDF on my phone?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. FileKit works seamlessly in mobile browsers on iOS (iPhone/iPad) and Android. Because processing happens locally in your browser memory, it does not waste mobile data uploading heavy files."
          }
        },
        {
          "@type": "Question",
          "name": "Are my files uploaded or stored on any server?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "There are no uploaded files! Unlike other websites that store your files on their servers for 1-2 hours, FileKit processes everything locally in your device's browser memory (RAM). The file never leaves your phone or computer."
          }
        }
      ]
    }
  ]
}
</script>
`;

html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/i, compressSchema);

// 4. Configure view-home to be hidden and view-tool to be visible
html = html.replace('<main id="view-home">', '<main id="view-home" style="display: none;">');
html = html.replace('<main id="view-tool" style="display: none;">', '<main id="view-tool" style="display: block;">');

// 5. Update breadcrumb and hero header text (ensure 100% truthful, non-exaggerated claims)
html = html.replace('<strong aria-current="page" id="crumb-tool">Compress PDF</strong>', '<strong aria-current="page" id="crumb-tool">Compress PDF</strong>');
html = html.replace(
  /<p class="fk-seo-hero-desc" id="fk-seo-hero-desc">[\s\S]*?<\/p>/i,
  '<p class="fk-seo-hero-desc" id="fk-seo-hero-desc">Shrink your PDF to 200 KB, 100 KB, or email size without losing quality. Free, private, and fast &mdash; no email signup needed.</p>'
);

// 6. Demote hidden H1s from background views so Googlebot sees EXACTLY ONE unambiguous H1 on the page
html = html.replace(/<h1 class="hero-title">([\s\S]*?)<\/h1>/i, '<div class="hero-title" role="heading" aria-level="2">$1</div>');
html = html.replace(/<h1 class="fk-page-pricing-title">([\s\S]*?)<\/h1>/i, '<h2 class="fk-page-pricing-title">$1</h2>');
html = html.replace(/<h1 class="app-topbar-page-title"([^>]*)>([\s\S]*?)<\/h1>/i, '<span class="app-topbar-page-title"$1>$2</span>');

// 7. Pre-render the Hero Dropzone inside #stage
const preRenderedDropzone = `
    <div class="fk-seo-unified-dropzone-box" style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 880px; max-width: 94%; height: 310px; margin: 0 auto; background: linear-gradient(135deg, #DE3636 0%, #C91F26 100%); border-radius: 18px; box-shadow: 0 16px 40px -8px rgba(222, 54, 54, 0.32), 0 4px 14px rgba(0,0,0,0.06); cursor: pointer; position: relative; box-sizing: border-box; padding: 24px; transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);">
      <div style="position: absolute; inset: 12px; border: 1.5px dashed rgba(255, 255, 255, 0.6); border-radius: 12px; pointer-events: none;"></div>
      
      <!-- Document cluster icon -->
      <div style="margin-bottom: 18px; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <svg width="68" height="68" viewBox="0 0 68 68" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="10" y="8" width="34" height="44" rx="4" fill="#FFFFFF" fill-opacity="0.25" transform="rotate(-8 10 8)"/>
          <rect x="24" y="6" width="34" height="44" rx="4" fill="#FFFFFF" fill-opacity="0.4" transform="rotate(6 24 6)"/>
          <rect x="17" y="10" width="34" height="46" rx="5" fill="#FFFFFF" filter="drop-shadow(0 4px 10px rgba(0,0,0,0.15))"/>
          <rect x="24" y="20" width="20" height="2.5" rx="1.25" fill="#DE3636"/>
          <rect x="24" y="26" width="16" height="2" rx="1" fill="#E2E8F0"/>
          <rect x="24" y="31" width="20" height="2" rx="1" fill="#E2E8F0"/>
          <rect x="24" y="36" width="14" height="2" rx="1" fill="#E2E8F0"/>
          <rect x="23" y="41" width="22" height="10" rx="2" fill="#DE3636"/>
          <text x="34" y="48.5" fill="#FFFFFF" font-family="'Outfit', sans-serif" font-size="6.5" font-weight="800" text-anchor="middle">PDF</text>
        </svg>
      </div>

      <!-- Compound action button -->
      <div style="display: flex; align-items: center; margin-bottom: 14px; z-index: 2; pointer-events: auto;">
        <button type="button" class="fk-seo-choose-btn" style="display: inline-flex; align-items: center; gap: 8px; background: #FFFFFF; color: #111827; border: none; font-family: 'Outfit', sans-serif; font-size: 15px; font-weight: 700; padding: 13px 28px; border-radius: 9999px; box-shadow: 0 4px 16px rgba(0,0,0,0.14); cursor: pointer; letter-spacing: 0.02em;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
          <span>CHOOSE FILES</span>
          <span style="border-left: 1px solid #E5E7EB; padding-left: 8px; margin-left: 4px; display: inline-flex; align-items: center;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </span>
        </button>
      </div>

      <p style="margin: 0; color: #FFFFFF; font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 500; opacity: 0.9; letter-spacing: 0.01em; pointer-events: none;">or drop files here</p>
    </div>
`;

html = html.replace('<div class="stage" id="stage"></div>', `<div class="stage" id="stage">${preRenderedDropzone}</div>`);

// 8. Inject the full pre-rendered commercial editorial content into #fk-seo-dynamic-content
html = html.replace('<div id="fk-seo-dynamic-content"></div>', `<div id="fk-seo-dynamic-content">${compressEditorialHtml}</div>`);

// Create directory if not exists
fs.mkdirSync(outDir, { recursive: true });

// Write out pre-rendered index.html
fs.writeFileSync(outFilePath, html, 'utf8');

console.log('✓ Successfully pre-rendered static HTML at:', outFilePath);
console.log('  File size:', (fs.statSync(outFilePath).size / 1024).toFixed(1), 'KB');

const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const target = '</head>';
const schema = `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      "@id": "https://filekit.cc/#app",
      "name": "FileKit",
      "url": "https://filekit.cc/",
      "description": "100% private in-browser file workstation. Convert, compress, edit, and organize files locally via WebAssembly.",
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
      "@id": "https://filekit.cc/#faq",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What is FileKit?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "FileKit is a 100% private, browser-based file workstation. It empowers you to convert, compress, merge, split, edit, crop, and inspect files across PDFs, images, videos, audio, and documents directly on your device without installing software or creating an account."
          }
        },
        {
          "@type": "Question",
          "name": "How does it run locally without uploading my files?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "FileKit is powered by modern WebAssembly (WASM) and native browser hardware acceleration. When you drop a file, the processing engine runs inside your browser's local sandbox memory. Zero bytes ever leave your device or touch a remote server."
          }
        },
        {
          "@type": "Question",
          "name": "What formats does it support?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "FileKit supports dozens of formats across 6 core categories: PDFs, Images (PNG, JPG, WebP, AVIF, HEIC, SVG, GIF), Videos (MP4, WebM, MOV, GIF), Audio (MP3, WAV, AAC, FLAC, M4A), Documents (Word DOCX, Excel XLSX, PPTX, EPUB, TXT), and Archive bundles (ZIP, TAR)."
          }
        },
        {
          "@type": "Question",
          "name": "Can I use it for NDA, confidential, or sensitive files?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. Because files never leave your client device, FileKit is completely compliant with strict confidentiality policies, NDAs, HIPAA, and GDPR standards. Your data is never logged, stored, or inspected by third parties."
          }
        },
        {
          "@type": "Question",
          "name": "Does it work fully offline?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes! Once the page has loaded, our progressive service worker caches all essential conversion binaries. You can disconnect your Wi-Fi, turn on airplane mode, and continue working with all your file tools seamlessly."
          }
        },
        {
          "@type": "Question",
          "name": "Is FileKit free, and are there file size caps?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "FileKit is 100% free with no forced subscriptions or hidden tiers. Since processing runs on your own device's CPU/GPU rather than costly cloud servers, you don't face arbitrary cloud size limits or wait in artificial upload queues."
          }
        },
        {
          "@type": "Question",
          "name": "Do I need to install any software or extensions?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "None at all. FileKit runs in any standard modern web browser (Chrome, Safari, Firefox, Edge, Arc, Brave) across macOS, Windows, Linux, Chromebooks, iPads, and mobile devices."
          }
        }
      ]
    }
  ]
}
</script>\n</head>`;

html = html.replace('</head>', schema);
fs.writeFileSync('index.html', html, 'utf8');
console.log('Added schema successfully');

const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1200, height: 750 } });
  const samplePdf = path.resolve('archive/tests/valid_sample.pdf');
  const sampleImg = path.resolve('public/apple-touch-icon.png');

  const tools = [
    { name: 'Rotate PDF', hash: '#app/pdf-rotate', inputId: '#rpdf-inp', isPdf: true },
    { name: 'Watermark PDF', hash: '#app/pdf-watermark', inputId: '#wmark-inp', isPdf: true },
    { name: 'Page Numbers', hash: '#app/pdf-page-numbers', inputId: '#pnum-inp', isPdf: true },
    { name: 'Crop PDF', hash: '#app/pdf-crop', inputId: '#crop-inp', isPdf: true },
    { name: 'Resize PDF', hash: '#app/pdf-resize', inputId: '#resize-inp', isPdf: true },
    { name: 'Redact PDF', hash: '#app/pdf-redact', inputId: '#redact-inp', isPdf: true },
    { name: 'Repair PDF', hash: '#app/pdf-repair', inputId: '#repair-inp', isPdf: true },
    { name: 'Protect PDF', hash: '#app/pdf-protect', inputId: '#prot-inp', isPdf: true },
    { name: 'Flatten PDF', hash: '#app/pdf-flatten', inputId: '#flat-inp', isPdf: true },
    { name: 'Image Resize', hash: '#app/image-resize', inputId: '#img-resize-inp', isPdf: false },
    { name: 'Image Crop', hash: '#app/image-crop', inputId: '#img-crop-inp', isPdf: false }
  ];

  const results = [];

  for (const t of tools) {
    try {
      console.log(`\nTesting ${t.name} (${t.hash})...`);
      await page.goto(`http://localhost:8080/${t.hash}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);

      const inp = await page.$(t.inputId);
      if (!inp) {
        console.log(`Could not find ${t.inputId} on ${t.name}`);
        continue;
      }

      await inp.setInputFiles(t.isPdf ? samplePdf : sampleImg);
      await page.waitForTimeout(1800);

      const m = await page.evaluate(() => {
        // Find the right panel
        const panel = document.querySelector('.cpdf-benchmark-panel, .scan-benchmark-panel, .prot-panel, aside.cpdf-panel, aside');
        const inner = document.querySelector('.cpdf-benchmark-panel-inner, .conv-panel-inner, .prot-panel-inner');
        const cards = Array.from(document.querySelectorAll('.scan-benchmark-card, .cpdf-benchmark-card, .prot-card, .spdf-card, .wmark-card, .rpdf-card'));
        const card = cards.find(c => c.offsetParent !== null || c.getBoundingClientRect().width > 0) || cards[0];

        let panelComputed = null;
        let innerComputed = null;
        let cardComputed = null;

        if (panel) {
          const cs = window.getComputedStyle(panel);
          panelComputed = {
            width: Math.round(panel.getBoundingClientRect().width),
            justifyContent: cs.justifyContent,
            alignItems: cs.alignItems,
            display: cs.display
          };
        }

        if (inner) {
          const cs = window.getComputedStyle(inner);
          innerComputed = {
            width: Math.round(inner.getBoundingClientRect().width),
            maxWidth: cs.maxWidth,
            margin: cs.margin,
            justifyContent: cs.justifyContent
          };
        }

        if (card) {
          const cs = window.getComputedStyle(card);
          cardComputed = {
            width: Math.round(card.getBoundingClientRect().width),
            maxWidth: cs.maxWidth
          };
        }

        return {
          panel: panelComputed,
          inner: innerComputed,
          card: cardComputed
        };
      });

      console.log(`${t.name} Metrics:`, JSON.stringify(m, null, 2));
      results.push({ name: t.name, ...m });

      const shotName = t.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
      await page.screenshot({ path: path.resolve(`C:/Users/shahr/.gemini/antigravity/brain/80c805f2-df3c-45be-b8a4-c3bd90ba5692/audit_tool_${shotName}.png`) });
    } catch (err) {
      console.error(`Error auditing ${t.name}:`, err.message);
    }
  }

  console.log('\n=======================================');
  console.log('SUMMARY AUDIT RESULTS:');
  console.log(JSON.stringify(results, null, 2));
  console.log('=======================================');

  await browser.close();
})();

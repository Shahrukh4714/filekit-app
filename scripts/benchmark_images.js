const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

const rootDir = path.resolve(__dirname, '..');

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';
  const filePath = path.join(rootDir, reqPath);
  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  res.writeHead(200, {
    'Content-Type': contentType,
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp'
  });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(0, async () => {
  const port = server.address().port;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'load' });
  await page.waitForFunction(() => typeof window.__ffMountCompress === 'function');

  const detailedReport = await page.evaluate(async () => {
    const runs = [];

    const _b = (bytes) => {
      if (typeof bytes !== 'number') return String(bytes);
      if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
      if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
      return bytes + ' B';
    };

    function createPhotoCanvas(w, h, complexity = 'photo') {
      const cvs = document.createElement('canvas');
      cvs.width = w; cvs.height = h;
      const ctx = cvs.getContext('2d');
      if (complexity === 'photo') {
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, '#0F172A');
        grad.addColorStop(0.25, '#0284C7');
        grad.addColorStop(0.5, '#F43F5E');
        grad.addColorStop(0.75, '#EAB308');
        grad.addColorStop(1, '#10B981');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 300; i++) {
          ctx.fillStyle = `rgba(${i % 255}, ${(i * 3) % 255}, ${(i * 7) % 255}, 0.7)`;
          ctx.beginPath();
          ctx.arc((i * 137) % w, (i * 93) % h, (i % 40) + 10, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // UI Dashboard with sharp geometric cards
        ctx.fillStyle = '#F1F5F9';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#1E293B';
        ctx.fillRect(40, 40, w - 80, 80);
        ctx.fillStyle = '#6366F1';
        ctx.fillRect(40, 140, 300, 180);
        ctx.fillStyle = '#10B981';
        ctx.fillRect(360, 140, 300, 180);
        ctx.fillStyle = '#F59E0B';
        ctx.fillRect(680, 140, 300, 180);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 32px system-ui';
        ctx.fillText('Analytics Dashboard UI Preview', 60, 95);
      }
      return cvs;
    }

    const testContainer = document.createElement('div');
    document.body.appendChild(testContainer);

    async function runTestScenario({ file, tier, format, sizeLimit, customTargetKB }) {
      window._ffLastResult = null;
      window.__ffMountCompress(testContainer, { id: 'compress-pdf' });
      const addInp = testContainer.querySelector('#cpdf-inp');
      const dt = new DataTransfer();
      dt.items.add(file);
      addInp.files = dt.files;
      addInp.dispatchEvent(new Event('change', { bubbles: true }));

      await new Promise(r => setTimeout(r, 60));

      if (tier && tier !== 'balanced') {
        const tierEl = testContainer.querySelector(`[data-tier="${tier}"]`);
        if (tierEl) tierEl.click();
      }

      if (tier === 'custom' && customTargetKB) {
        const targetInp = testContainer.querySelector('#cpdf-target-val-inp');
        if (targetInp) {
          targetInp.value = String(customTargetKB);
          targetInp.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }

      if (format) {
        const fmtSel = testContainer.querySelector('#comp-strip-opt1');
        if (fmtSel) {
          fmtSel.value = format;
          fmtSel.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }

      if (sizeLimit) {
        const szSel = testContainer.querySelector('#comp-strip-opt2');
        if (szSel) {
          szSel.value = sizeLimit;
          szSel.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }

      await new Promise(r => setTimeout(r, 60));

      const runBtn = testContainer.querySelector('#comp-studio-run');
      runBtn.click();

      // Wait for completion and extract metrics
      return new Promise((res, rej) => {
        let count = 0;
        const interval = setInterval(() => {
          count++;
          if (window._ffLastResult) {
            clearInterval(interval);
            const r = window._ffLastResult;
            res({
              originalBytes: r.originalBytes,
              resultBytes: r.resultBytes,
              reductionPct: r.reductionPct,
              outMime: r.blob?.type || 'image/jpeg',
              outFilename: r.filename || '',
              qualityBadge: r.qualityBadge || ''
            });
          } else if (count > 120) {
            clearInterval(interval);
            rej(new Error('Timeout'));
          }
        }, 60);
      });
    }

    // 1. High-Res Photo (3200x2000 JPEG, 1.4 MB)
    const photoCvs = createPhotoCanvas(3200, 2000, 'photo');
    const photoBlob = await new Promise(r => photoCvs.toBlob(r, 'image/jpeg', 0.98));
    const photoFile = new File([photoBlob], 'travel-photo.jpg', { type: 'image/jpeg' });

    // 2. UI / Screenshot (1800x1200 Flat PNG)
    const uiCvs = createPhotoCanvas(1800, 1200, 'ui');
    const uiBlob = await new Promise(r => uiCvs.toBlob(r, 'image/png'));
    const uiFile = new File([uiBlob], 'app-dashboard.png', { type: 'image/png' });

    // 3. SVG Vector Logo
    let svgBody = '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">\n';
    svgBody += '  <!-- Generator: FileKit Vector Studio Engine -->\n';
    svgBody += '  <!-- Metadata comment block 1 -->\n';
    svgBody += '  <!-- Metadata comment block 2 -->\n';
    svgBody += '  <defs>\n    <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">\n';
    svgBody += '      <stop offset="0%" stop-color="#4F46E5" />\n      <stop offset="100%" stop-color="#06B6D4" />\n    </linearGradient>\n  </defs>\n';
    for (let i = 0; i < 80; i++) {
      svgBody += `  <rect x="${i * 8}" y="${i * 5}" width="120" height="70" rx="12" fill="url(#g1)" opacity="0.85" />\n`;
    }
    svgBody += '  <text x="400" y="300" font-family="system-ui" font-size="36" font-weight="900" fill="#FFFFFF" text-anchor="middle">FileKit Vector Graphic</text>\n</svg>';
    const svgFile = new File([new Blob([svgBody], { type: 'image/svg+xml' })], 'vector-art.svg', { type: 'image/svg+xml' });

    // Benchmark 1: JPEG Balanced Tier
    const r1 = await runTestScenario({ file: photoFile, tier: 'balanced' });
    runs.push({ name: '3200x2000 JPEG Photo → Balanced (Recommended)', input: _b(photoFile.size), output: _b(r1.resultBytes), saved: `${r1.reductionPct}%`, fmt: r1.outFilename });

    // Benchmark 2: JPEG Heavy / Maximum Tier
    const r2 = await runTestScenario({ file: photoFile, tier: 'maximum' });
    runs.push({ name: '3200x2000 JPEG Photo → Heavy (Maximum Savings)', input: _b(photoFile.size), output: _b(r2.resultBytes), saved: `${r2.reductionPct}%`, fmt: r2.outFilename });

    // Benchmark 3: JPEG 1080p Cap
    const r3 = await runTestScenario({ file: photoFile, tier: 'balanced', sizeLimit: '1920' });
    runs.push({ name: '3200x2000 JPEG Photo → 1080p Dimension Cap', input: _b(photoFile.size), output: _b(r3.resultBytes), saved: `${r3.reductionPct}%`, fmt: r3.outFilename });

    // Benchmark 4: JPEG 720p Cap
    const r4 = await runTestScenario({ file: photoFile, tier: 'balanced', sizeLimit: '1280' });
    runs.push({ name: '3200x2000 JPEG Photo → 720p Dimension Cap', input: _b(photoFile.size), output: _b(r4.resultBytes), saved: `${r4.reductionPct}%`, fmt: r4.outFilename });

    // Benchmark 5: JPEG Exact Target Size (100 KB)
    const r5 = await runTestScenario({ file: photoFile, tier: 'custom', customTargetKB: 100 });
    runs.push({ name: '3200x2000 JPEG Photo → Exact Target 100 KB', input: _b(photoFile.size), output: _b(r5.resultBytes), saved: `${r5.reductionPct}%`, fmt: r5.outFilename });

    // Benchmark 6: PNG UI to WebP Conversion
    const r6 = await runTestScenario({ file: uiFile, tier: 'balanced', format: 'webp' });
    runs.push({ name: '1800x1200 PNG Screenshot → Modern WebP', input: _b(uiFile.size), output: _b(r6.resultBytes), saved: `${r6.reductionPct}%`, fmt: r6.outFilename });

    // Benchmark 7: PNG UI to MMC Indexed PNG
    const r7 = await runTestScenario({ file: uiFile, tier: 'balanced', format: 'png' });
    runs.push({ name: '1800x1200 PNG Screenshot → MMC 8-bit Indexed PNG', input: _b(uiFile.size), output: _b(r7.resultBytes), saved: `${r7.reductionPct}%`, fmt: r7.outFilename });

    // Benchmark 8: SVG Vector Minification
    const r8 = await runTestScenario({ file: svgFile, tier: 'balanced', format: 'original' });
    runs.push({ name: 'SVG Vector Graphic → Direct Vector Minify', input: _b(svgFile.size), output: _b(r8.resultBytes), saved: `${r8.reductionPct}%`, fmt: r8.outFilename });

    return runs;
  });

  console.log('BENCHMARK_DATA:' + JSON.stringify(detailedReport));

  await browser.close();
  server.close();
  process.exit(0);
});

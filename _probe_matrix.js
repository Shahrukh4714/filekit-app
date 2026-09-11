const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--window-size=1400,900']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  const logs = [];
  page.on('console', m => logs.push(`[${m.type()}] ${m.text().slice(0, 160)}`));
  page.on('pageerror', e => logs.push(`[PAGEERROR] ${e.message}`));

  const fids = ['pdf-to-word:word-docx','pdf-to-excel:excel-xlsx','pdf-to-ppt:powerpoint-pptx','pdf-grayscale:grayscale-pdf-pdf','pdf-compress:compressed-pdf-pdf','pdf-to-html:html-html','pdf-extract-text:plain-text-txt','pdf-to-csv:csv-csv','pdf-summarize:summary-txt','pdf-to-md:markdown-md','pdf-to-json:structure-json-json','pdf-to-jpg:jpg-image-jpg','pdf-to-image:page-images-zip','pdf-to-webp:webp-page-images-zip','pdf-extract-images:extract-images-zip','pdf-to-epub:epub-ebook-epub','pdf-to-zip:zip-archive-zip'];

  async function reset() {
    await page.goto('http://127.0.0.1:8000/#app/convert', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 1500));
    const input = await page.$('#app-tool-stage input[type=file]');
    if (!input) throw new Error('no file input');
    await input.uploadFile('C:\\Users\\shahr\\Downloads\\Filekit1\\scratch_multi.pdf');
    await new Promise(r => setTimeout(r, 2500));
  }

  await reset();

  for (const fid of fids) {
    const clicked = await page.evaluate((fid) => {
      const item = document.querySelector(`.conv-studio-menu-item[data-fid="${fid}"]`);
      if (!item) return 'NO ITEM';
      item.click();
      const btn = document.getElementById('conv-run');
      if (!btn) return 'NO RUN BTN';
      const label = btn.querySelector('.conv-btn-normal-content span')?.textContent || '';
      btn.click();
      return label;
    }, fid);
    if (typeof clicked === 'string' && clicked.startsWith('NO')) { console.log(JSON.stringify({ fid, err: clicked })); continue; }

    let status = 'timeout-45s';
    let pct = null;
    for (let i = 0; i < 45; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const st = await page.evaluate(() => {
        const s = document.getElementById('app-tool-stage');
        const t = (s?.textContent || '');
        return {
          done: /Conversion Complete|converted successfully|Conversion result/i.test(t),
          err: /Could not|failed|Failed|error|Error/i.test(t.slice(0, 1200)),
          pct: (t.match(/(\d+)%/g) || []).slice(-1)[0] || null
        };
      });
      pct = st.pct || pct;
      if (st.done) { status = 'done'; break; }
      if (st.err) { status = 'ERROR'; break; }
    }
    console.log(JSON.stringify({ fid, status, pct }));
    await reset();
  }
  const realLogs = logs.filter(l => !/404/.test(l) && !/Indexing all PDF objects/.test(l));
  console.log('LOGS:', realLogs.slice(0, 30).join('\n'));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });

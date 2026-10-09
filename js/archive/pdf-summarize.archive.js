/* ═══════════════════════════════════════════════════════════════════════════
   ARCHIVED TOOL: Summarize PDF (`pdf-summarize`)
   Date Archived: 2026-10-09
   Reason: Archived for later redesign as an interactive AI / Studio Workstation
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * 1. Tool Metadata Registration (previously in js/tools-new.js):
 */
/*
R({
  id: 'pdf-summarize', category: 'PDF', name: 'Summarize PDF',
  description: 'Extractive summary built from the text layer — executive overview or key actionable highlights.',
  accepts: ['pdf'], maxBytes: 200e6,
  fields: [
    { key: 'mode', label: 'Summary Mode', type: 'select', default: 'executive', options: [
      { value: 'executive', label: 'Executive Summary (Metrics & Overview)' },
      { value: 'keypoints', label: 'Key Highlights & Action Points' }
    ] },
    { key: 'length', label: 'Summary length', type: 'select', default: 'medium', options: ['short', 'medium', 'long'] },
    OCR_LANG_FIELD
  ],
  async run({ file, inputs, onProgress }) {
    if (typeof window.convertPdfToSummary === 'function') {
      return window.convertPdfToSummary(file, inputs, onProgress);
    }
    throw new Error('PDF Summary engine is loading...');
  },
});
*/

/**
 * 2. Conversion Hub Card (previously in js/tools.js inside pdf convert hub cards):
 * T(M.web, 'Summary', 'TXT', 'txt', '#DC2626', 'pdf-summarize', 'Executive summary & key highlights', { mode: 'executive', length: 'medium' }),
 */

/**
 * 3. Router Mapping (previously in js/tools.js):
 * 'pdf-summarize': () => window.__ffMountConvert,
 */

/**
 * 4. Extractive Text Engine (previously convertPdfToSummary):
 */
async function convertPdfToSummary(file, inputs, onProgress) {
  const mode = (inputs && inputs.mode) || 'executive';
  const length = (inputs && inputs.length) || 'medium';
  const base = (file.name || 'document').replace(/\.[^/.]+$/, '');
  const pdfjs = await loadJs();
  const doc = await pdfjs.getDocument({ data: await u8(file) }).promise;
  const numPages = doc.numPages;

  let fullText = '';
  for (let p = 1; p <= numPages; p++) {
    onProgress?.((p / numPages) * 0.6, `Analyzing page ${p}/${numPages}`);
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    fullText += tc.items.map((it) => it.str).join(' ') + '\n';
  }

  const cleanText = fullText.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/\s+/g, ' ').trim();
  if (!cleanText) throw new Error('No selectable text found to summarize.');

  const sentences = cleanText.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.split(/\s+/).length >= 4);
  const words = cleanText.toLowerCase().match(/[a-z0-9']+/g) || [];
  const stopWords = new Set('the a an and or but of to in on for with as at by from is are was were be been being it its this that these those not no if then than so such which who whom whose what when where why how has have had do does did will would shall should can could may might must'.split(' '));

  const freqs = {};
  words.forEach((w) => { if (!stopWords.has(w)) freqs[w] = (freqs[w] || 0) + 1; });

  // Score sentences
  const scored = sentences.map((s, idx) => {
    const sWords = s.toLowerCase().match(/[a-z0-9']+/g) || [];
    let score = 0;
    sWords.forEach((w) => { score += freqs[w] || 0; });
    // Boost early sentences in the document
    const posBoost = Math.max(0.5, 1.3 - (idx / Math.max(1, sentences.length)));
    // Boost sentences containing numbers, dates or currency
    const hasData = /[\d$₹€£%]/.test(s) ? 1.25 : 1.0;
    return { s, idx, score: (score / Math.max(1, sWords.length)) * posBoost * hasData };
  }).sort((a, b) => b.score - a.score);

  const nSentences = length === 'short' ? 3 : (length === 'long' ? 9 : 5);
  const topSentences = scored.slice(0, nSentences).sort((a, b) => a.idx - b.idx).map((x) => x.s);

  const estReadingTimeMin = Math.max(1, Math.round(words.length / 200));
  const formatBytes = (bytes) => (bytes < 1048576 ? (bytes / 1024).toFixed(1) + ' KB' : (bytes / 1048576).toFixed(2) + ' MB');

  let outText = '';
  if (mode === 'keypoints') {
    outText = `KEY HIGHLIGHTS & ACTION POINTS: ${base}\n`;
    outText += `═`.repeat(60) + '\n\n';
    outText += `• Analyzed ${sentences.length} sentences across ${numPages} page(s)\n`;
    outText += `• Total Word Count: ${words.length} words (~${estReadingTimeMin} min read)\n\n`;
    outText += `TOP HIGHLIGHTS:\n\n`;
    topSentences.forEach((s, i) => {
      outText += `  ${i + 1}. ${s}\n\n`;
    });
  } else {
    outText = `EXECUTIVE SUMMARY: ${base}\n`;
    outText += `═`.repeat(60) + '\n\n';
    outText += `DOCUMENT ANALYTICS:\n`;
    outText += `• Pages: ${numPages} | Words: ${words.length} | Sentences: ${sentences.length}\n`;
    outText += `• Estimated Reading Time: ${estReadingTimeMin} minute(s)\n\n`;
    outText += `SUMMARY:\n\n` + topSentences.join('\n\n') + '\n';
  }

  const blob = new Blob([outText], { type: 'text/plain;charset=utf-8' });
  onProgress?.(1, 'Done');
  return {
    blob,
    filename: `${base}-summary.txt`,
    mime: 'text/plain',
    preview: 'text',
    text: outText.slice(0, 5000),
    metrics: {
      Mode: mode === 'executive' ? 'Executive Summary' : 'Key Highlights',
      Sentences: `${topSentences.length}/${sentences.length}`,
      Words: words.length,
      ReadingTime: `${estReadingTimeMin} min`,
      Size: formatBytes(blob.size),
    }
  };
}

// Export for future re-integration
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { convertPdfToSummary };
}

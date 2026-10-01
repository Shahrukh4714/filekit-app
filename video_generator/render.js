/**
 * Playwright + FFmpeg High Performance Video Renderer for FileKit Promo
 */

const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

async function renderVideo() {
  const FPS = 30; // 30 FPS produces crisp, ultra-smooth motion with fast render times
  const DURATION_SEC = 22.0;
  const TOTAL_FRAMES = Math.round(FPS * DURATION_SEC);
  const WIDTH = 1920;
  const HEIGHT = 1080;

  const htmlPath = path.resolve(__dirname, 'studio.html');
  const audioPath = path.resolve(__dirname, 'soundtrack.wav');
  const outputDir = path.resolve(__dirname, '../dist_video');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputMp4 = path.join(outputDir, 'filekit_promo_1080p.mp4');
  const outputGif = path.join(outputDir, 'filekit_promo_preview.gif');

  console.log(`====================================================`);
  console.log(`  FILEKIT PROMO VIDEO COMPOSITOR (Playwright + FFmpeg)`);
  console.log(`====================================================`);
  console.log(`Target: ${outputMp4}`);
  console.log(`Resolution: ${WIDTH}x${HEIGHT} @ ${FPS} FPS`);
  console.log(`Duration: ${DURATION_SEC}s (${TOTAL_FRAMES} frames)`);

  // Launch Playwright with optimized Chromium flags
  console.log('\nLaunching headless Chromium engine...');
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--disable-gpu-vsync',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--font-render-hinting=none',
    ]
  });

  const page = await browser.newPage({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
  });

  console.log(`Loading studio stage: file://${htmlPath}`);
  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000); // Allow fonts to settle

  // Spawn FFmpeg Process with MJPEG pipe for maximum throughput
  console.log('Spawning FFmpeg encoder pipeline...');
  const ffmpegArgs = [
    '-y',
    '-f', 'image2pipe',
    '-vcodec', 'mjpeg',
    '-r', `${FPS}`,
    '-i', '-',                       // Read MJPEG frames from stdin
    '-i', audioPath,                 // High quality WAV soundtrack
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '17',                    // Visually lossless
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '320k',
    '-shortest',
    '-movflags', '+faststart',
    outputMp4
  ];

  const ffmpeg = spawn('ffmpeg', ffmpegArgs, { stdio: ['pipe', 'inherit', 'inherit'] });

  ffmpeg.on('error', (err) => {
    console.error('FFmpeg error:', err);
  });

  const startTime = Date.now();
  console.log(`\nRendering ${TOTAL_FRAMES} frames at ${FPS} FPS...`);

  for (let frame = 0; frame < TOTAL_FRAMES; frame++) {
    const t = frame / FPS;

    // Advance timeline deterministically
    await page.evaluate((currTime) => {
      window.seekTime(currTime);
    }, t);

    // Capture ultra-crisp JPEG buffer (quality 95 is visually indistinguishable from PNG & 5x faster)
    const screenshotBuffer = await page.screenshot({
      type: 'jpeg',
      quality: 95,
      omitBackground: false,
    });

    // Write to FFmpeg stdin
    const canContinue = ffmpeg.stdin.write(screenshotBuffer);
    if (!canContinue) {
      await new Promise(resolve => ffmpeg.stdin.once('drain', resolve));
    }

    if (frame % 30 === 0 || frame === TOTAL_FRAMES - 1) {
      const pct = ((frame / TOTAL_FRAMES) * 100).toFixed(1);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const fpsRender = ((frame + 1) / ((Date.now() - startTime) / 1000) || 0).toFixed(1);
      process.stdout.write(`\r[Frame ${(frame + 1).toString().padStart(4, ' ')}/${TOTAL_FRAMES}] ${pct}% complete (${fpsRender} fps, ${elapsed}s elapsed)`);
    }
  }

  ffmpeg.stdin.end();

  console.log('\nFinalizing MP4 video stream...');
  await new Promise((resolve, reject) => {
    ffmpeg.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg exited with code ${code}`));
    });
  });

  await browser.close();

  const totalSec = ((Date.now() - startTime) / 1000).toFixed(1);
  const stats = fs.statSync(outputMp4);
  const fileSizeMb = (stats.size / (1024 * 1024)).toFixed(2);

  console.log(`\n====================================================`);
  console.log(`✨ PROMO VIDEO RENDER COMPLETE!`);
  console.log(`Output: ${outputMp4}`);
  console.log(`Size: ${fileSizeMb} MB`);
  console.log(`Total Render Time: ${totalSec}s`);
  console.log(`====================================================`);

  // Generate lightweight preview GIF
  console.log('\nGenerating preview GIF (800p 12fps)...');
  const gifProcess = spawn('ffmpeg', [
    '-y',
    '-i', outputMp4,
    '-vf', 'fps=12,scale=800:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse',
    '-t', '12',
    outputGif
  ], { stdio: 'inherit' });

  await new Promise(resolve => gifProcess.on('close', resolve));
  console.log(`✓ Preview GIF created at: ${outputGif}`);
}

renderVideo().catch((err) => {
  console.error('Fatal render error:', err);
  process.exit(1);
});

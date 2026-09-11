const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'tools.js'), 'utf8');
const start = src.indexOf('const MEDIA_VIDEO_CONTAINER');
const fstart = src.indexOf('function buildMediaPlans');
if (start < 0 || fstart < 0) { console.error('media plan helpers not found'); process.exit(1); }
let depth = 0, end = -1;
for (let i = src.indexOf('{', fstart); i < src.length; i++) {
  if (src[i] === '{') depth++;
  else if (src[i] === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
}
const { buildMediaPlans, parseMediaProbe } = new Function(src.slice(start, end) + '\nreturn { buildMediaPlans, parseMediaProbe };')();

let pass = 0, fail = 0;
function check(name, cond, detail) { if (cond) { pass++; console.log('  ok   ' + name); } else { fail++; console.log('  FAIL ' + name + (detail ? ' -> ' + detail : '')); } }
function args(plan) { return plan.args.join(' '); }
function plansFor(family, ext, tier, params, extra) {
  return buildMediaPlans(Object.assign({ family, ext, tier, params: params || {}, inName: 'input.' + ext }, extra || {}));
}

// Video → MP4 (H.264)
let p = plansFor('video', 'mp4', 'balanced', { videoBr: '750k', audioBr: '128k' });
let a = args(p[0]);
check('mp4/balanced uses libx264', a.includes('-c:v libx264'), a);
check('mp4/balanced CRF 27', a.includes('-crf 27'), a);
check('mp4/balanced AAC (libfdk)', a.includes('-c:a libfdk_aac -b:a 128k'), a);
check('mp4/balanced faststart', a.includes('-movflags +faststart'), a);
check('mp4/balanced scale caps at 720', a.includes('min(720'), a);
check('mp4/balanced out.mp4', p[0].out === 'out.mp4' && p[0].mime === 'video/mp4' && p[0].outExt === 'mp4');
check('mp4/balanced is a plan + fallback', p.length === 2);

// Video → MP4 Maximum (H.264; libx265 is unusable in the pthread-less core)
p = plansFor('video', 'mp4', 'maximum', { videoBr: '500k', audioBr: '96k' });
check('mp4/max uses libx264', args(p[0]).includes('-c:v libx264'));
check('mp4/max never uses libx265', !args(p[0]).includes('libx265'));
check('mp4/max CRF 31', args(p[0]).includes('-crf 31'));
check('mp4/max is primary + legacy fallback', p.length === 2 && args(p[1]).includes('-c:v libvpx '));

// Video → WebM
p = plansFor('video', 'webm', 'balanced', { audioBr: '128k' });
check('webm/balanced vp9', args(p[0]).includes('-c:v libvpx-vp9'));
check('webm/balanced opus', args(p[0]).includes('-c:a libopus'));
check('webm/balanced out.webm', p[0].outExt === 'webm' && p[0].mime === 'video/webm');
p = plansFor('video', 'webm', 'light', { audioBr: '192k' });
check('webm/light uses vp8 (libvpx)', /\-c:v libvpx(?!-vp9)/.test(args(p[0])), args(p[0]));

// Video custom without a target falls back to balanced CRF
p = plansFor('video', 'mp4', 'custom', { videoBr: '900k', audioBr: '128k' });
check('custom without target falls back to balanced CRF', args(p[0]).includes('-crf 27'), args(p[0]));

// Exact target-size video (true two-pass)
p = plansFor('video', 'mp4', 'custom', { videoBr: '750k', audioBr: '128k' }, { targetBytes: 2 * 1024 * 1024, duration: 60 });
const pArgs = (i) => p[0].passes[i].args.join(' ');
check('target plan is two-pass', Array.isArray(p[0].passes) && p[0].passes.length === 2);
check('target pass1 has -pass 1', pArgs(0).includes('-pass 1'));
check('target pass2 has -pass 2', pArgs(1).includes('-pass 2'));
check('target pass2 has AAC + faststart', pArgs(1).includes('-c:a libfdk_aac') && pArgs(1).includes('-movflags +faststart'));
check('target derives a bitrate (~143k)', /-b:v 143k/.test(pArgs(0)), pArgs(0));
p = plansFor('video', 'mp4', 'custom', { videoBr: '750k', audioBr: '128k' }, { targetBytes: 2 * 1024 * 1024, duration: 0 });
check('target w/o duration falls back to single-pass', !p[0].passes && args(p[0]).includes('-c:v libx264'));

// Audio codec matching
check('m4a → aac/m4a', (() => { const q = plansFor('audio', 'm4a', 'balanced', { audioBr: '128k' })[0]; return q.outExt === 'm4a' && q.mime === 'audio/mp4' && args(q).includes('libfdk_aac'); })());
check('ogg → opus/ogg', (() => { const q = plansFor('audio', 'ogg', 'balanced', { audioBr: '128k' })[0]; return q.outExt === 'ogg' && args(q).includes('libopus'); })());
check('mp3 → lame/mp3', (() => { const q = plansFor('audio', 'mp3', 'balanced', { audioBr: '128k' })[0]; return q.outExt === 'mp3' && args(q).includes('libmp3lame'); })());
check('wav → mp3 fallback codec', (() => { const q = plansFor('audio', 'wav', 'balanced', { audioBr: '128k' })[0]; return q.outExt === 'mp3' && args(q).includes('libmp3lame'); })());
check('audio has legacy mp3 fallback last', (() => { const q = plansFor('audio', 'm4a', 'balanced', { audioBr: '128k' }); return q[q.length - 1].outExt === 'mp3' && args(q[q.length - 1]).includes('libmp3lame'); })());

// --- source probe parsing ---
const probeText = [
  '  Duration: 00:00:04.02, start: 0.000000, bitrate: 7481 kb/s',
  '    Stream #0:0(und): Video: h264 (Constrained Baseline) (avc1 / 0x31637661), yuv420p, 1280x720 [SAR 1:1 DAR 16:9], 7442 kb/s, 30 fps, 30 tbr, 15360 tbn, 60 tbc (default)',
  '    Stream #0:1(und): Audio: aac (LC) (mp4a / 0x6134706D), 44100 Hz, mono, fltp, 73 kb/s (default)'
].join('\n');
const mi = parseMediaProbe(probeText);
check('probe duration', Math.abs(mi.duration - 4.02) < 0.01, String(mi.duration));
check('probe dims', mi.width === 1280 && mi.height === 720, mi.width + 'x' + mi.height);
check('probe fps', mi.fps === 30, String(mi.fps));
check('probe vcodec', mi.vcodec === 'h264', mi.vcodec);
check('probe acodec', mi.acodec === 'aac' && mi.aKbps === 73 && mi.hasAudio, mi.acodec + ' ' + mi.aKbps);
check('probe handles empty', parseMediaProbe('').duration === 0 && parseMediaProbe(null).hasAudio === false);

// --- probe-driven decisions ---
let q = plansFor('video', 'mp4', 'maximum', { audioBr: '128k' }, { probe: { fps: 60, acodec: 'aac', aKbps: 73 } });
check('fps capped to 30 only when source exceeds it', args(q[0]).includes('fps=30'), args(q[0]));
check('low-bitrate AAC is copied (no re-encode)', args(q[0]).includes('-c:a copy'), args(q[0]));
q = plansFor('video', 'mp4', 'balanced', { audioBr: '128k' }, { probe: { fps: 24, acodec: 'aac', aKbps: 73 } });
check('balanced never adds fps filter', !args(q[0]).includes('fps='), args(q[0]));
q = plansFor('video', 'mp4', 'balanced', { audioBr: '128k' }, { probe: { acodec: 'aac', aKbps: 200 } });
check('high-bitrate AAC is re-encoded at target', args(q[0]).includes('-c:a libfdk_aac -b:a 128k'), args(q[0]));
q = plansFor('video', 'webm', 'balanced', { audioBr: '128k' }, { probe: { acodec: 'opus', aKbps: 64 } });
check('low-bitrate Opus copied into WebM', args(q[0]).includes('-c:a copy'), args(q[0]));
q = plansFor('video', 'mp4', 'balanced', { audioBr: '128k' }, { probe: null });
check('no probe -> safe encode default', args(q[0]).includes('-c:a libfdk_aac'), args(q[0]));

// --- normalize, denoise, webm target ---
q = plansFor('audio', 'm4a', 'balanced', { audioBr: '128k' }, { normalize: true });
check('normalize adds loudnorm filter', args(q[0]).includes('-af loudnorm=I=-16:TP=-1.5:LRA=11'), args(q[0]));
q = plansFor('video', 'mp4', 'maximum', { audioBr: '96k' }, { probe: { acodec: 'aac', aKbps: 200 } });
check('heavy tier adds hqdn3d denoise', args(q[0]).includes('hqdn3d=1:1:2:2'), args(q[0]));
q = plansFor('video', 'mp4', 'balanced', { audioBr: '128k' }, { probe: { acodec: 'aac', aKbps: 200 } });
check('balanced tier has no denoise', !args(q[0]).includes('hqdn3d'), args(q[0]));
q = plansFor('video', 'webm', 'custom', { audioBr: '128k' }, { targetBytes: 200000, duration: 10, probe: { acodec: 'opus', aKbps: 64 } });
check('webm target is two-pass', Array.isArray(q[0].passes) && q[0].passes.length === 2 && q[0].passes[0].args.join(' ').includes('-pass 1'));
check('webm target copies efficient opus', q[0].passes[1].args.join(' ').includes('-c:a copy'));

console.log(`\nMedia plan test: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

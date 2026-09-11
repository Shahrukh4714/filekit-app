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
const { buildMediaPlans } = new Function(src.slice(start, end) + '\nreturn { buildMediaPlans };')();

let pass = 0, fail = 0;
function check(name, cond, detail) { if (cond) { pass++; console.log('  ok   ' + name); } else { fail++; console.log('  FAIL ' + name + (detail ? ' -> ' + detail : '')); } }
function args(plan) { return plan.args.join(' '); }
function plansFor(family, ext, tier, params) { return buildMediaPlans({ family, ext, tier, params: params || {}, inName: 'input.' + ext }); }

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

// Video custom bitrate
p = plansFor('video', 'mp4', 'custom', { videoBr: '900k', audioBr: '128k' });
check('custom uses -b:v 900k (no crf)', args(p[0]).includes('-b:v 900k') && !args(p[0]).includes('-crf'), args(p[0]));

// Audio codec matching
check('m4a → aac/m4a', (() => { const q = plansFor('audio', 'm4a', 'balanced', { audioBr: '128k' })[0]; return q.outExt === 'm4a' && q.mime === 'audio/mp4' && args(q).includes('libfdk_aac'); })());
check('ogg → opus/ogg', (() => { const q = plansFor('audio', 'ogg', 'balanced', { audioBr: '128k' })[0]; return q.outExt === 'ogg' && args(q).includes('libopus'); })());
check('mp3 → lame/mp3', (() => { const q = plansFor('audio', 'mp3', 'balanced', { audioBr: '128k' })[0]; return q.outExt === 'mp3' && args(q).includes('libmp3lame'); })());
check('wav → mp3 fallback codec', (() => { const q = plansFor('audio', 'wav', 'balanced', { audioBr: '128k' })[0]; return q.outExt === 'mp3' && args(q).includes('libmp3lame'); })());
check('audio has legacy mp3 fallback last', (() => { const q = plansFor('audio', 'm4a', 'balanced', { audioBr: '128k' }); return q[q.length - 1].outExt === 'mp3' && args(q[q.length - 1]).includes('libmp3lame'); })());

console.log(`\nMedia plan test: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

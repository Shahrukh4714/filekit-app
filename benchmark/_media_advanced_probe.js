/* Feasibility probe for "beyond industry" media features:
   two-pass target-size, EBU R128 loudnorm, fps reduction, denoise. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const dir = path.join(__dirname, '..', 'vendor', 'ffmpeg');
const samples = path.join(__dirname, 'samples');

globalThis.self = globalThis;
globalThis.require = require;
globalThis.importScripts = (...urls) => {
  for (const u of urls) vm.runInThisContext(fs.readFileSync(path.join(dir, path.basename(u)), 'utf8'), { filename: u });
};
vm.runInThisContext(fs.readFileSync(path.join(dir, 'ffmpeg-core.js'), 'utf8'), { filename: 'ffmpeg-core.js' });

function parseArgs(core, args) {
  const argv = core._malloc(args.length * 4);
  for (let j = 0; j < args.length; j++) {
    const sz = core.lengthBytesUTF8(args[j]) + 1;
    const buf = core._malloc(sz);
    core.stringToUTF8(args[j], buf, sz);
    core.setValue(argv + j * 4, buf, 'i32');
  }
  return { argc: args.length, argv };
}

(async () => {
  const wasmBinary = fs.readFileSync(path.join(dir, 'ffmpeg-core.wasm'));
  let logs = [];
  const Core = await createFFmpegCore({
    wasmBinary, mainScriptUrlOrBlob: path.join(dir, 'ffmpeg-core.js'),
    print: (m) => logs.push(String(m)), printErr: (m) => logs.push(String(m)),
    noInitialRun: true, noExitRuntime: true,
  });
  const main = Core.cwrap('main', 'number', ['number', 'number']);
  function ff(args, keepLogs) {
    logs = [];
    const p = parseArgs(Core, ['./ffmpeg', '-nostdin', '-y', '-hide_banner'].concat(args));
    let c = -1;
    try { c = main(p.argc, p.argv); } catch (e) { c = typeof e === 'number' ? e : (e && e.status != null ? e.status : -1); }
    if (!keepLogs) { /* keep for caller via closure */ }
    return c;
  }
  function size(n) { try { return Core.FS.readFile(n).length; } catch (e) { return -1; } }
  function unlink(n) { try { Core.FS.unlink(n); } catch (e) {} }
  function report(label, cond, extra) { console.log((cond ? '  ok   ' : '  FAIL ') + label + (extra ? '  ' + extra : '')); }

  // Build a 4s 720p30 source with a sine audio track.
  let c = ff(['-f', 'lavfi', '-i', 'testsrc2=s=1280x720:r=30', '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=44100', '-t', '4', '-pix_fmt', 'yuv420p', '-c:v', 'libx264', '-preset', 'ultrafast', '-c:a', 'aac', '-shortest', 'src.mp4']);
  const srcSize = size('src.mp4');
  console.log('source src.mp4: ' + srcSize + ' bytes (code=' + c + ')');
  report('generated source', srcSize > 0);

  // ---- Two-pass target-size ----
  const targetBytes = 150000; // ~150 KB
  const targetVideoBr = Math.max(50, Math.round((targetBytes * 8 / 4 - 64000) / 1000)) + 'k'; // (target bits/s - 64k audio)
  console.log('target ~' + targetBytes + ' bytes, video bitrate ' + targetVideoBr);
  c = ff(['-i', 'src.mp4', '-c:v', 'libx264', '-preset', 'veryfast', '-b:v', targetVideoBr, '-pass', '1', '-passlogfile', 'ffpass', '-an', '-f', 'null', 'p1.null'], true);
  report('pass 1 runs', c === 0, 'code=' + c + ' log=' + logs.slice(-2).join(' | ').slice(0, 160));
  const logFiles = Core.FS.readdir('.').filter((f) => /^ffpass/.test(f));
  report('pass 1 wrote a log', logFiles.length > 0, logFiles.join(','));
  c = ff(['-i', 'src.mp4', '-c:v', 'libx264', '-preset', 'veryfast', '-b:v', targetVideoBr, '-pass', '2', '-passlogfile', 'ffpass', '-c:a', 'libfdk_aac', '-b:a', '64k', '-movflags', '+faststart', 'out2pass.mp4']);
  const out2 = size('out2pass.mp4');
  report('pass 2 runs + output', c === 0 && out2 > 0, 'code=' + c + ' out=' + out2 + ' target=' + targetBytes);
  report('target-size accuracy within 25%', out2 > 0 && Math.abs(out2 - targetBytes) / targetBytes < 0.25);

  // ---- Loudness normalization (EBU R128) ----
  Core.FS.writeFile('a.m4a', new Uint8Array(fs.readFileSync(path.join(samples, '_test_audio.m4a'))));
  c = ff(['-i', 'a.m4a', '-vn', '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-c:a', 'libfdk_aac', '-b:a', '96k', 'norm.m4a']);
  report('loudnorm filter runs', c === 0 && size('norm.m4a') > 0, 'code=' + c + ' out=' + size('norm.m4a'));

  // ---- fps reduction ----
  c = ff(['-i', 'src.mp4', '-vf', 'fps=15', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '27', '-an', 'fps15.mp4']);
  report('fps filter runs', c === 0 && size('fps15.mp4') > 0, 'code=' + c + ' out=' + size('fps15.mp4') + ' (src video bytes ' + srcSize + ')');

  // ---- denoise ----
  c = ff(['-i', 'src.mp4', '-vf', 'hqdn3d=1.5:1.5:6:6,scale=-2:min(480\\,ih)', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28', '-an', 'dn.mp4']);
  report('hqdn3d + scale runs', c === 0 && size('dn.mp4') > 0, 'code=' + c + ' out=' + size('dn.mp4'));

  ['src.mp4', 'p1.null', 'out2pass.mp4', 'norm.m4a', 'fps15.mp4', 'dn.mp4', 'a.m4a'].forEach(unlink);
  logFiles.forEach(unlink);
})().catch((e) => { console.error('FATAL', e && e.stack || e); process.exit(2); });

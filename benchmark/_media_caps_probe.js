/* Dump the vendored ffmpeg core's capabilities (filters/encoders/muxers/bsfs)
   so features are designed against ground truth, not assumptions. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const dir = path.join(__dirname, '..', 'vendor', 'ffmpeg');

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
  function run(args) {
    logs = [];
    const p = parseArgs(Core, ['./ffmpeg', '-hide_banner'].concat(args));
    try { main(p.argc, p.argv); } catch (e) {}
    return logs.join('\n');
  }
  function show(title, text, keys) {
    console.log('\n=== ' + title + ' ===');
    const lines = text.split('\n');
    for (const l of lines) {
      const low = l.toLowerCase();
      if (keys.some((k) => low.includes(k))) console.log('  ' + l.trim().slice(0, 90));
    }
  }
  show('FILTERS', run(['-filters']), ['loudnorm', 'ebur128', 'hqdn3d', 'atadenoise', 'nlmeans', 'scale', 'fps', 'tblend', 'zscale', 'tonemap', 'scdet', 'select', 'setpts', 'atempo', 'aresample', 'dynaudnorm', 'compand', 'volume', 'deblock', 'unsharp', 'eq ']);
  show('VIDEO ENCODERS', run(['-encoders']), ['libx264', 'libx265', 'libvpx', 'libvpx-vp9', 'libwebp']);
  show('AUDIO ENCODERS', run(['-encoders']), ['libfdk_aac', 'libopus', 'libmp3lame', 'libvorbis', 'aac ', 'libwavpack']);
  show('MUXERS', run(['-muxers']), ['mp4', 'mov', 'webm', 'matroska', 'ipod', 'ogg', 'mp3', 'wav']);
  show('BITSTREAM FILTERS', run(['-bsfs']), ['h264_mp4toannexb', 'extract_extradata', 'vp9_superframe']);
})().catch((e) => { console.error('FATAL', e && e.stack || e); process.exit(2); });

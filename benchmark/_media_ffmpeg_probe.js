/* End-to-end media probe: loads the vendored ffmpeg core in Node and runs the
   exact arg lists produced by the app's buildMediaPlans, to verify codecs,
   filter syntax and muxers without a browser. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const dir = path.join(__dirname, '..', 'vendor', 'ffmpeg');
const samples = path.join(__dirname, 'samples');

// Extract buildMediaPlans from tools.js (same technique as the unit test).
const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'tools.js'), 'utf8');
const start = src.indexOf('const MEDIA_VIDEO_CONTAINER');
const fstart = src.indexOf('function buildMediaPlans');
let depth = 0, end = -1;
for (let i = src.indexOf('{', fstart); i < src.length; i++) {
  if (src[i] === '{') depth++;
  else if (src[i] === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
}
const { buildMediaPlans } = new Function(src.slice(start, end) + '\nreturn { buildMediaPlans };')();

globalThis.self = globalThis;
globalThis.require = require;
globalThis.importScripts = (...urls) => {
  for (const u of urls) {
    const p = path.join(dir, path.basename(u));
    vm.runInThisContext(fs.readFileSync(p, 'utf8'), { filename: p });
  }
};
vm.runInThisContext(fs.readFileSync(path.join(dir, 'ffmpeg-core.js'), 'utf8'), { filename: 'ffmpeg-core.js' });

function parseArgs(core, args) {
  const argc = args.length;
  const argv = core._malloc(argc * 4);
  for (let j = 0; j < argc; j++) {
    const s = args[j];
    const sz = core.lengthBytesUTF8(s) + 1;
    const buf = core._malloc(sz);
    core.stringToUTF8(s, buf, sz);
    core.setValue(argv + j * 4, buf, 'i32');
  }
  return { argc, argv };
}

(async () => {
  const wasmBinary = fs.readFileSync(path.join(dir, 'ffmpeg-core.wasm'));
  let logs = [];
  const Core = await createFFmpegCore({
    wasmBinary,
    mainScriptUrlOrBlob: path.join(dir, 'ffmpeg-core.js'),
    print: (m) => logs.push(String(m)),
    printErr: (m) => logs.push(String(m)),
    noInitialRun: true,
    noExitRuntime: true,
  });
  const main = Core.cwrap('main', 'number', ['number', 'number']);

  async function runCase(label, inputFile, family, ext, tier, params, extra) {
    const inName = 'input.' + ext;
    const plans = buildMediaPlans(Object.assign({ family, ext, tier, params: params || {}, inName }, extra || {}));
    const plan = plans[0];
    logs = [];
    Core.FS.writeFile(inName, new Uint8Array(fs.readFileSync(inputFile)));
    const passes = plan.passes || [{ args: plan.args, out: plan.out }];
    let code = 0;
    for (let i = 0; i < passes.length; i++) {
      const parsed = parseArgs(Core, ['./ffmpeg', '-nostdin', '-y', '-progress', 'pipe:1'].concat(passes[i].args));
      let c = -1;
      try { c = main(parsed.argc, parsed.argv); }
      catch (ex) { c = typeof ex === 'number' ? ex : (ex && ex.status != null ? ex.status : -1); }
      code = c;
      if (i < passes.length - 1) { try { Core.FS.unlink(passes[i].out); } catch (e) {} }
    }
    let outBytes = -1, ok = false;
    try { outBytes = Core.FS.readFile(plan.out).length; ok = true; } catch (e) { ok = false; }
    try { Core.FS.unlink(inName); } catch (e) {}
    try { Core.FS.unlink(plan.out); } catch (e) {}
    const inBytes = fs.statSync(inputFile).size;
    const tail = logs.filter((l) => /error|Error|not found|Invalid|failed|Unknown|No such|does not|Could not/i.test(l)).slice(-3);
    const verdict = ok && outBytes > 0 ? (outBytes < inBytes ? 'SMALLER' : 'larger') : 'FAILED';
    console.log(`\n[${label}] ${family}/${ext}/${tier} -> ${plan.out} code=${code} out=${outBytes} in=${inBytes} ${verdict}`);
    console.log('  args: ' + passes[passes.length - 1].args.join(' '));
    if (verdict === 'FAILED') console.log('  logs:\n    ' + logs.slice(-14).join('\n    '));
    else if (tail.length) console.log('  log: ' + tail.join(' | ').slice(0, 500));
    return ok && outBytes > 0;
  }

  const av = path.join(samples, '_test_av.mp4');
  const m4a = path.join(samples, '_test_audio.m4a');
  const mp3 = path.join(samples, '_test_audio.mp3');

  await runCase('video balanced mp4', av, 'video', 'mp4', 'balanced', { videoBr: '750k', audioBr: '128k' });
  await runCase('video maximum mp4', av, 'video', 'mp4', 'maximum', { videoBr: '500k', audioBr: '96k' });
  await runCase('video light mp4', av, 'video', 'mp4', 'light', { videoBr: '1M', audioBr: '192k' });
  await runCase('video balanced -> webm', av, 'video', 'webm', 'balanced', { videoBr: '750k', audioBr: '128k' });
  await runCase('audio maximum m4a', m4a, 'audio', 'm4a', 'maximum', { audioBr: '96k' });
  await runCase('audio balanced m4a', m4a, 'audio', 'm4a', 'balanced', { audioBr: '128k' });
  await runCase('audio balanced mp3', mp3, 'audio', 'mp3', 'balanced', { audioBr: '128k' });
  await runCase('video TARGET 150KB (2-pass)', av, 'video', 'mp4', 'custom', { videoBr: '750k', audioBr: '64k' }, { targetBytes: 60000, duration: 3.02 });

  // Verify resolution capping against a real 1080p source (the sample is 360p).
  function runArgs(args) {
    const parsed = parseArgs(Core, ['./ffmpeg', '-nostdin', '-y', '-progress', 'pipe:1'].concat(args));
    let c = -1;
    try { c = main(parsed.argc, parsed.argv); }
    catch (ex) { c = typeof ex === 'number' ? ex : (ex && ex.status != null ? ex.status : -1); }
    return c;
  }
  function dimsOf(name) {
    logs = [];
    runArgs(['-i', name]);
    const m = logs.join('\n').match(/(\d{3,5})x(\d{3,5})/);
    return m ? (m[1] + 'x' + m[2]) : '?';
  }
  let bigOk = false;
  try {
    logs = [];
    runArgs(['-f', 'lavfi', '-i', 'testsrc2=s=1920x1080:r=15', '-t', '2', '-pix_fmt', 'yuv420p', 'big.mp4']);
    bigOk = Core.FS.readFile('big.mp4').length > 0;
  } catch (e) { bigOk = false; }
  console.log('\n[scale cap] generated 1080p test clip: ' + bigOk);
  if (bigOk) {
    runArgs(['-i', 'big.mp4', '-map', '0:v:0', '-vf', 'scale=-2:min(720\\,ih)', '-pix_fmt', 'yuv420p', '-c:v', 'libx264', '-crf', '27', '-preset', 'veryfast', '-an', 'cap720.mp4']);
    runArgs(['-i', 'big.mp4', '-map', '0:v:0', '-vf', 'scale=-2:min(640\\,ih)', '-pix_fmt', 'yuv420p', '-c:v', 'libx264', '-crf', '31', '-preset', 'veryfast', '-an', 'cap640.mp4']);
    console.log('  source : ' + dimsOf('big.mp4') + '  (expect 1920x1080)');
    console.log('  cap720 : ' + dimsOf('cap720.mp4') + '  (expect 1280x720)');
    console.log('  cap640 : ' + dimsOf('cap640.mp4') + '  (expect ~1138x640)');
    ['big.mp4', 'cap720.mp4', 'cap640.mp4'].forEach((n) => { try { Core.FS.unlink(n); } catch (e) {} });
  }
})().catch((e) => { console.error('FATAL', e && e.stack || e); process.exit(2); });


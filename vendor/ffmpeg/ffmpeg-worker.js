/* FileKit ffmpeg worker — drives @ffmpeg/core-st (single-threaded) core.
   Protocol (main thread → worker):
     { type: 'init' }                       → { type: 'ready' } | { type: 'error', message }
     { type: 'run', id, inputs: [[name, ArrayBuffer]...], args, out }
                                            → { type: 'done', id, ok: true, data: ArrayBuffer, code }
                                            | { type: 'done', id, ok: false, error }
     FS-style helpers (for video-to-images):
     { type: 'writeFile', id, name, data }  → { type: 'done', id, ok: true }
     { type: 'exec', id, args }             → { type: 'done', id, ok: true, code }
     { type: 'listDir', id, path }          → { type: 'done', id, ok: true, entries: [{name}] }
     { type: 'readFile', id, name }         → { type: 'done', id, ok: true, data: ArrayBuffer }
     { type: 'deleteFile', id, name }       → { type: 'done', id, ok: true }
   'FFMPEG_END' is printed by the ffmpeg.wasm C wrapper when a command finishes.
   The core is created with an explicit wasmBinary so no locateFile/streaming
   MIME issues can occur. */
(function () {
  'use strict';
  var Core = null;
  var endResolve = null;
  var currentId = null;
  var durationSec = 0;

  function onOutput(message) {
    if (message === 'FFMPEG_END') {
      if (endResolve) { var r = endResolve; endResolve = null; r(); }
    }
  }

  // Parse ffmpeg's output for total duration (stderr "Duration:") and current
  // progress time. `-progress pipe:1` emits newline-terminated out_time_us
  // lines on stdout, which flush reliably (unlike the buffered \r progress).
  function parseProgress(text) {
    var d = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(text);
    if (d) { durationSec = (+d[1]) * 3600 + (+d[2]) * 60 + (+d[3]); return; }
    if (durationSec <= 0 || currentId == null) return;
    var sec = null;
    var us = /out_time_us=(\d+)/.exec(text);
    if (us) sec = (+us[1]) / 1e6;
    else {
      var t = /time=(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(text);
      if (t) sec = (+t[1]) * 3600 + (+t[2]) * 60 + (+t[3]);
    }
    if (sec == null) return;
    var frac = sec / durationSec;
    if (frac < 0) frac = 0; if (frac > 1) frac = 1;
    self.postMessage({ type: 'progress', id: currentId, frac: frac });
  }

  async function loadCore() {
    // ffmpeg-core.js is a classic script; importScripts defines createFFmpegCore
    // as a top-level var in this worker scope.
    importScripts('ffmpeg-core.js');
    if (typeof createFFmpegCore !== 'function') {
      throw new Error('ffmpeg core failed to load');
    }
    var wasmRes = await fetch('ffmpeg-core.wasm');
    var wasmBinary = await wasmRes.arrayBuffer();
    Core = await createFFmpegCore({
      wasmBinary: wasmBinary,
      mainScriptUrlOrBlob: 'ffmpeg-core.js',
      print: function (m) { self.postMessage({ type: 'log', message: String(m) }); onOutput(String(m)); parseProgress(String(m)); },
      printErr: function (m) { self.postMessage({ type: 'log', message: String(m) }); onOutput(String(m)); parseProgress(String(m)); },
      noInitialRun: true,
      noExitRuntime: true,
    });
    return Core;
  }

  function parseArgs(core, args) {
    var argc = args.length;
    var argv = core._malloc(argc * 4);
    for (var j = 0; j < argc; j++) {
      var s = args[j];
      var sz = core.lengthBytesUTF8(s) + 1;
      var buf = core._malloc(sz);
      core.stringToUTF8(s, buf, sz);
      core.setValue(argv + j * 4, buf, 'i32');
    }
    return { argc: argc, argv: argv };
  }

  async function runMain(args) {
    var main = Core.cwrap('main', 'number', ['number', 'number']);
    var parsed = parseArgs(Core, ['./ffmpeg', '-nostdin', '-y', '-progress', 'pipe:1'].concat(args || []));
    var done = new Promise(function (res) { endResolve = res; });
    var code = -1;
    try {
      code = main(parsed.argc, parsed.argv);
    } catch (ex) {
      // Emscripten throws ExitStatus when main calls exit(); that's normal.
      code = typeof ex === 'number' ? ex : (ex && ex.status != null ? ex.status : -1);
    }
    await done;
    return code;
  }

  self.onmessage = async function (e) {
    var msg = e.data;
    var id = msg.id;
    var post = function (obj, transfer) {
      obj.id = id;
      if (transfer && transfer.length) {
        self.postMessage(obj, transfer);
      } else if (obj.data && obj.data instanceof ArrayBuffer) {
        self.postMessage(obj, [obj.data]);
      } else {
        self.postMessage(obj);
      }
    };
    try {
      if (msg.type === 'init') {
        await loadCore();
        self.postMessage({ type: 'ready' });
        return;
      }
      if (!Core) await loadCore();

      if (msg.type === 'run') {
        for (var i = 0; i < msg.inputs.length; i++) {
          Core.FS.writeFile(msg.inputs[i][0], new Uint8Array(msg.inputs[i][1]));
        }
        currentId = id; durationSec = 0;
        var code = await runMain(msg.args || []);
        currentId = null;
        var data = Core.FS.readFile(msg.out);
        for (var k = 0; k < msg.inputs.length; k++) {
          try { Core.FS.unlink(msg.inputs[k][0]); } catch (e2) {}
        }
        try { Core.FS.unlink(msg.out); } catch (e3) {}
        post({ type: 'done', ok: true, code: code, data: data.buffer }, [data.buffer]);
        return;
      }

      if (msg.type === 'writeFile') {
        Core.FS.writeFile(msg.name, new Uint8Array(msg.data));
        post({ type: 'done', ok: true });
        return;
      }
      if (msg.type === 'exec') {
        var c = await runMain(msg.args || []);
        post({ type: 'done', ok: true, code: c });
        return;
      }
      if (msg.type === 'listDir') {
        var entries = [];
        try {
          var raw = Core.FS.readdir(msg.path || '/');
          for (var e2 = 0; e2 < raw.length; e2++) {
            if (raw[e2] !== '.' && raw[e2] !== '..') entries.push({ name: raw[e2] });
          }
        } catch (e4) {}
        post({ type: 'done', ok: true, entries: entries });
        return;
      }
      if (msg.type === 'readFile') {
        var d = Core.FS.readFile(msg.name);
        post({ type: 'done', ok: true, data: d.buffer });
        return;
      }
      if (msg.type === 'deleteFile') {
        try { Core.FS.unlink(msg.name); } catch (e5) {}
        post({ type: 'done', ok: true });
        return;
      }
    } catch (err) {
      post({ type: 'done', ok: false, error: String(err && err.message || err) });
    }
  };
})();

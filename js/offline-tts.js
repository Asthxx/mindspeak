// ==================== 内置离线语音（OfflineTTS） ====================
// 把 Piper 神经网络 TTS 搬进 WebView 里跑，解决"手机上没网、设备又没有英文系统语音
// 时彻底没声音"这个缺口。
//
// 资产分两层，别混为一谈：
//   ① 运行时（piper_phonemize.{js,wasm,data} + onnxruntime wasm + worker）
//      随 APK 发布，在 assets/vendor/piper/，不需要下载。
//      这部分约 29MB，是 fp32 VITS 之前必须付的固定成本——
//      尤其 onnxruntimeBase 会被 worker 原样当成 ort.env.wasm.wasmPaths 用，
//      onnxruntime 内部会自己去拼 `${base}ort-wasm-simd-threaded.wasm` 再 fetch 一次，
//      所以它必须是个真实可访问的 URL，不能塞 blob: —— 也就没法"下载后缓存"。
//   ② 语音模型（en_US-lessac-medium.onnx，60MB）首次使用时下载，
//      存 IndexedDB，之后完全离线。
//
// 合成协议：复用 piper-wasm@0.1.4 的 worker 消息协议。刻意没有直接用那个包的 api.js——
// 它 import 了包里并不存在的 ./expressions.js，装上去就是坏的；
// 而它 build/worker/piper_worker.js 是自包含的（getBlob 内联在头部），协议也简单，
// 自己包一层反而更可控（状态机、取消、队列都在我们手里）。
//
// worker 输入（postMessage）：
//   { kind:'init', input, speakerId, blobs, modelUrl, modelConfigUrl,
//     piperPhonemizeJsUrl, piperPhonemizeWasmUrl, piperPhonemizeDataUrl, onnxruntimeUrl }
// worker 输出（message）：
//   { kind:'output', input, file:Blob(WAV), duration, phonemes, phonemeIds }
//   { kind:'stderr', message }   { kind:'fetch', url, loaded, total }   { kind:'complete' }
(function () {
  var TAG = 'OfflineTTS';
  var log = function () {
    try { if (window.Logger && window.Logger.log) window.Logger.log.apply(window.Logger, arguments); } catch (e) {}
  };

  // ---- 语音清单 ----
  // key = 设置里持久化的 voiceName；label = 设置页下拉里显示的名字
  var VOICES = {
    '__offline_piper_us_lessac__': {
      model: 'en_US-lessac-medium',
      label: '内置离线音（Piper · 美音女声 Lessac）'
    }
  };
  var DEFAULT_VOICE = '__offline_piper_us_lessac__';
  var MODEL_BASE = (function () {
    // 模型文件的下载源。空 = 同源，走 server 的 /api/offline-voice/ 路由
    // （注意不是站点根：拼成根路径会 404，而失败表现只是"下载失败"四个字）；
    // APK 里页面是本地协议，必须在 api-config.js 的 OFFLINE_VOICE_BASE 填公网地址。
    var base = '';
    try { base = (window.MS && window.MS.OFFLINE_VOICE_BASE) || ''; } catch (e) {}
    if (base) return base.replace(/\/+$/, '') + '/';
    try { return location.origin + '/api/offline-voice/'; } catch (e) { return ''; }
  })();

  // ---- 状态 ----
  // unknown（未探测）→ idle（未下载）→ downloading → ready → failed
  var state = { status: 'unknown', progress: 0, error: '', voice: DEFAULT_VOICE };
  var listeners = [];
  var worker = null;
  var busy = false;            // 同一时刻只允许一次合成（worker 的 session 是共享的）
  var current = null;          // 当前这一次合成的请求（{text,rate,onend,onerror,progress}）
  var audio = null;            // 当前播放的 Audio，用于取消
  var dbPromise = null;

  function setStatus(status, extra) {
    var changed = state.status !== status;
    state.status = status;
    if (extra) {
      if ('progress' in extra) state.progress = extra.progress;
      if ('error' in extra) state.error = extra.error;
      if ('voice' in extra) state.voice = extra.voice;
    }
    if (changed || (extra && 'progress' in extra)) notify();
  }
  function notify() {
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](snapshot()); } catch (e) {}
    }
  }
  function snapshot() {
    return {
      status: state.status,
      progress: state.progress,
      error: state.error,
      voice: state.voice,
      voiceLabel: (VOICES[state.voice] || VOICES[DEFAULT_VOICE]).label
    };
  }

  // ---- IndexedDB：模型持久化 ----
  // 60MB 放 IndexedDB 完全没问题（Blob 是引用传递，不会整块进内存）。
  // 不用 localStorage：它是同步 API 且只吃字符串，60MB 会直接卡死主线程。
  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      var req = null;
      try { req = indexedDB.open('ms-offline-tts', 1); } catch (e) { reject(e); return; }
      if (!req) { reject(new Error('indexedDB unavailable')); return; }
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains('models')) db.createObjectStore('models');
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error || new Error('indexedDB open failed')); };
    });
    return dbPromise;
  }
  function idbGet(key) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction('models', 'readonly');
        var r = tx.objectStore('models').get(key);
        r.onsuccess = function () { resolve(r.result || null); };
        r.onerror = function () { reject(r.error); };
      });
    });
  }
  function idbPut(key, value) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction('models', 'readwrite');
        tx.objectStore('models').put(value, key);
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(tx.error); };
        tx.onabort = function () { reject(tx.error || new Error('tx abort')); };
      });
    });
  }

  // ---- 资源 URL ----
  // 运行时在同源 vendor 目录；模型在可配置的 MODEL_BASE。
  function vendorBase() {
    try {
      return new URL('assets/vendor/piper/', location.href).href;
    } catch (e) {
      return 'assets/vendor/piper/';
    }
  }

  // ---- 模型下载（带进度）----
  function downloadVoice(voiceKey, onProgress) {
    var v = VOICES[voiceKey] || VOICES[DEFAULT_VOICE];
    var modelUrl = MODEL_BASE + v.model + '.onnx';
    var cfgUrl = MODEL_BASE + v.model + '.onnx.json';
    return Promise.all([
      fetchWithProgress(modelUrl, onProgress),
      fetch(cfgUrl).then(function (r) {
        if (!r.ok) throw new Error('model config http ' + r.status);
        return r.blob();
      })
    ]).then(function (res) {
      var model = res[0], cfg = res[1];
      return idbPut(v.model, { model: model, cfg: cfg, at: Date.now() });
    });
  }
  function fetchWithProgress(url, onProgress) {
    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error('model http ' + res.status);
      var total = Number(res.headers.get('content-length')) || 0;
      if (!res.body || !res.body.getReader) {
        // 拿不到流（老 WebView）：退化成一次性下载，进度只报 0/100
        return res.blob().then(function (b) { if (onProgress) onProgress(1); return b; });
      }
      var reader = res.body.getReader();
      var chunks = [], loaded = 0;
      function pump() {
        return reader.read().then(function (r) {
          if (r.done) {
            var b = new Blob(chunks);
            if (onProgress) onProgress(1);
            return b;
          }
          chunks.push(r.value);
          loaded += r.value.length;
          if (onProgress) onProgress(total ? loaded / total : 0);
          return pump();
        });
      }
      return pump();
    });
  }

  // ---- worker ----
  function ensureWorker() {
    if (worker) return worker;
    worker = new Worker(vendorBase() + 'piper_worker.js');
    worker.addEventListener('message', onWorkerMessage);
    worker.addEventListener('error', function (e) {
      log(TAG, 'worker error: ' + (e && e.message));
      busy = false;
      if (current && current.onerror) current.onerror(new Error('worker-error'));
      current = null;
    });
    return worker;
  }
  function onWorkerMessage(ev) {
    var data = ev.data || {};
    if (current && data.kind === 'fetch' && data.url && data.url.indexOf('.onnx') !== -1) {
      // 模型下载进度（只有走了网络时才可能有值；命中 IndexedDB 时没有这一步）
      if (typeof data.loaded === 'number' && typeof data.total === 'number' && data.total) {
        current.progress = data.loaded / data.total;
      }
      return;
    }
    if (data.kind === 'output') {
      var cur = current;
      current = null;
      busy = false;
      if (!cur) return;
      play(cur, data.file, data.duration);
      return;
    }
    if (data.kind === 'stderr') {
      log(TAG, 'stderr: ' + data.message);
      var c2 = current;
      current = null;
      busy = false;
      if (c2 && c2.onerror) c2.onerror(new Error(String(data.message || 'piper stderr')));
    }
  }
  function play(cur, blob, duration) {
    try {
      stopAudio();
      var url = URL.createObjectURL(blob);
      audio = new Audio(url);
      // 语速：piper 的 lengthScale 写在模型配置里、worker 不透传，
      // 用 playbackRate 在播放端调，副作用是变速不变调，听感上完全够用。
      if (cur.rate && cur.rate !== 1) audio.playbackRate = cur.rate;
      audio.onended = function () {
        revoke(url);
        audio = null;
        if (cur.onend) cur.onend(duration || 0);
      };
      audio.onerror = function () {
        revoke(url);
        audio = null;
        if (cur.onerror) cur.onerror(new Error('audio-play-failed'));
      };
      var p = audio.play();
      if (p && p.catch) p.catch(function (err) {
        revoke(url);
        audio = null;
        if (cur.onerror) cur.onerror(err || new Error('audio-play-rejected'));
      });
    } catch (e) {
      if (cur.onerror) cur.onerror(e);
    }
  }
  function revoke(url) { try { URL.revokeObjectURL(url); } catch (e) {} }
  // 取消当前合成/播放并释放 worker。speak() 里也用它做"排队即抢占"，
  // 所以必须提在前面：speak 直接写 stop() 会 ReferenceError（那是对外 API 的方法名）。
  function stopAll() {
    stopAudio();
    busy = false;
    current = null;
    if (worker) { try { worker.terminate(); } catch (e) {} worker = null; }
  }
  function stopAudio() {
    if (audio) {
      try { audio.pause(); } catch (e) {}
      try { if (audio.src) revoke(audio.src); } catch (e) {}
      audio = null;
    }
  }

  // ---- 对外 API ----
  window.OfflineTTS = {
    TAG: TAG,
    voices: VOICES,
    defaultVoice: DEFAULT_VOICE,

    isOfflineVoice: function (name) {
      return !!VOICES[name];
    },
    onChange: function (cb) {
      if (typeof cb === 'function') listeners.push(cb);
      return cb;
    },
    status: function () { return snapshot(); },

    // 探测本地是否已有缓存模型。不联网，只读 IndexedDB。
    probe: function (voiceKey) {
      var key = (voiceKey || state.voice || DEFAULT_VOICE);
      var v = VOICES[key] || VOICES[DEFAULT_VOICE];
      state.voice = key;
      return idbGet(v.model).then(function (row) {
        if (row && row.model) { setStatus('ready', { voice: key, progress: 1 }); return true; }
        setStatus('idle', { voice: key, progress: 0 });
        return false;
      }).catch(function (e) {
        log(TAG, 'probe failed: ' + e);
        setStatus('idle', { voice: key, progress: 0 });
        return false;
      });
    },

    // 确保模型就位：已缓存 → ready；否则下载。可重复调用（下载中会复用同一次）。
    ensure: function (voiceKey, onProgress) {
      var self = this;
      var key = (voiceKey || state.voice || DEFAULT_VOICE);
      var v = VOICES[key] || VOICES[DEFAULT_VOICE];
      state.voice = key;
      if (state.status === 'ready' && state.voice === key) return Promise.resolve(true);
      if (state.status === 'downloading') return Promise.resolve(false);
      setStatus('downloading', { voice: key, progress: state.progress || 0, error: '' });
      return this.probe(key).then(function (has) {
        if (has) return true;
        return downloadVoice(key, function (p) {
          setStatus('downloading', { progress: p });
          if (onProgress) { try { onProgress(p); } catch (e) {} }
        });
      }).then(function () {
        setStatus('ready', { progress: 1, error: '' });
        return true;
      }).catch(function (e) {
        var msg = (e && e.message) || String(e);
        log(TAG, 'ensure failed: ' + msg);
        setStatus('failed', { error: msg });
        throw e;
      });
    },

    // 合成并播放。模型未就位时先 ensure（会触发下载）。
    speak: function (text, opts) {
      text = String(text || '').trim();
      if (!text) return Promise.resolve(false);
      opts = opts || {};
      var self = this;
      var key = opts.voice || state.voice || DEFAULT_VOICE;
      var v = VOICES[key] || VOICES[DEFAULT_VOICE];
      if (busy) { stopAll(); }
      return this.ensure(key).then(function () {
        return idbGet(v.model);
      }).then(function (row) {
        if (!row || !row.model) throw new Error('model missing');
        busy = true;
        var base = vendorBase();
        var cur = {
          text: text,
          rate: opts.rate || 1,
          onend: opts.onend,
          onerror: opts.onerror,
          progress: 0
        };
        current = cur;
        ensureWorker().postMessage({
          kind: 'init',
          input: text,
          speakerId: null,
          blobs: {
            // 模型与配置直接喂 Blob：worker 的 getBlob 优先用 blobs[url]，
            // 命中就不再走网络。URL 只当 key 用，随便给但必须稳定。
            [MODEL_BASE + v.model + '.onnx']: row.model,
            [MODEL_BASE + v.model + '.onnx.json']: row.cfg
          },
          modelUrl: MODEL_BASE + v.model + '.onnx',
          modelConfigUrl: MODEL_BASE + v.model + '.onnx.json',
          piperPhonemizeJsUrl: base + 'piper_phonemize.js',
          piperPhonemizeWasmUrl: base + 'piper_phonemize.wasm',
          piperPhonemizeDataUrl: base + 'piper_phonemize.data',
          onnxruntimeUrl: base
        });
        return true;
      }).catch(function (e) {
        busy = false;
        current = null;
        if (opts.onerror) { try { opts.onerror(e); } catch (e2) {} }
        return false;
      });
    },

    stop: function () {
      stopAll();
    },

    // 估算模型体积（设置页提示用）
    modelSizeMB: 60
  };
})();

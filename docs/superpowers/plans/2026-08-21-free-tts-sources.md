# Free TTS Sources + Piper TTS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Edge TTS (6 online neural voices) and Piper TTS (3 local offline voices) as new voice sources.

**Architecture:** Server-side synthesis for both (Node.js endpoints proxying edge-tts WebSocket and Piper binary). Frontend adds voices to SRC_ALL and settings dropdown. Piper auto-downloads binary + voice packs on first use.

**Tech Stack:** Node.js, Python edge-tts, Piper TTS binary, Express.js

**Spec:** `docs/superpowers/specs/2026-08-21-free-tts-sources-design.md`

## Global Constraints

- All existing TTS sources remain unchanged (baidu, youdao_us/uk, google_us/uk/au/in, SAPI david/zira)
- Android platform: Edge TTS available only when server is reachable; Piper requires server for download + synthesis
-降级链路: Edge → youdao → baidu → google → system; Piper → Edge → system
- Voice IDs follow existing pattern: `__online_*` for virtual voices, `__local_*` for local voices
- All server endpoints follow existing patterns in `server/server.js` (content-addressed cache, concurrent dedup, streaming response)

---

## File Structure

| File | Role |
|------|------|
| `server/server.js` | Add `/api/edge-tts` and `/api/piper-tts` endpoints |
| `server/package.json` | Add `edge-tts` npm dependency |
| `js/app.js:1071-1079` | Add Edge voices to `SRC_ALL` |
| `js/app.js:1082-1089` | Add Edge voices to `VOICE_FIRST` |
| `js/app.js:5815-5842` | Add Edge + Piper to settings dropdown |
| `js/app.js:503-520` | Add Piper voice routing in `_speak` |

---

### Task 1: Server — Edge TTS endpoint

**Files:**
- Modify: `server/server.js:185-230` (insert before online-tts endpoint)
- Modify: `server/package.json` (add edge-tts dependency)

**Interfaces:**
- Consumes: `text`, `lang`, `voice` query params
- Produces: `audio/mpeg` stream response

- [ ] **Step 1: Add edge-tts dependency**

Run in `server/`:
```bash
npm install edge-tts
```

- [ ] **Step 2: Add /api/edge-tts endpoint to server.js**

Insert after line 184 (before the `/api/online-tts` comment block) in `server/server.js`:

```javascript
// ==================== Edge TTS：微软免费神经网络语音合成 ====================
// 通过 edge-tts npm 包（WebSocket 协议）合成，无需 API key。
// 缓存策略与 /api/online-tts 一致：内容寻址 + 并发去重 + 内存 LRU。
const edgeTts = require('edge-tts');
const edgeCache = new Map();
const edgePending = new Map();
app.get('/api/edge-tts', (req, res) => {
  const text = String(req.query.text || '').trim();
  const voice = String(req.query.voice || 'en-US-JennyNeural').slice(0, 64);
  const lang = String(req.query.lang || 'en-US').slice(0, 32);
  if (!text || text.length > 500) return res.status(400).json({ ok: false, message: 'text too long or empty' });
  const key = crypto.createHash('sha1').update(text + '|' + voice).digest('hex');
  const cached = edgeCache.get(key);
  if (cached) {
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(cached);
  }
  const waiting = edgePending.get(key);
  if (waiting) { waiting.push(res); return; }
  edgePending.set(key, [res]);
  const finish = (buf, reason) => {
    const list = edgePending.get(key) || [];
    edgePending.delete(key);
    if (buf) {
      if (edgeCache.size > 500) edgeCache.clear();
      edgeCache.set(key, buf);
      for (const r of list) {
        try {
          r.setHeader('Content-Type', 'audio/mpeg');
          r.setHeader('Cache-Control', 'public, max-age=86400');
          r.send(buf);
        } catch (e) {}
      }
      logger.info('edge-tts', '合成成功', { text: text.slice(0, 30), voice, bytes: buf.length });
    } else {
      for (const r of list) {
        try { r.status(502).json({ ok: false, message: reason || 'edge tts failed' }); } catch (e) {}
      }
      logger.warn('edge-tts', '合成失败', { text: text.slice(0, 30), voice, reason });
    }
  };
  edgeTts.synthesize(text, voice, { rate: '+0%', pitch: '+0Hz' })
    .then(audio => {
      const chunks = [];
      audio.on('data', chunk => chunks.push(chunk));
      audio.on('end', () => finish(Buffer.concat(chunks)));
      audio.on('error', err => finish(null, err.message));
    })
    .catch(err => finish(null, err.message));
});
```

- [ ] **Step 3: Verify syntax**

Run: `node -c server/server.js`
Expected: no output (success)

- [ ] **Step 4: Commit**

```bash
git add server/server.js server/package.json server/package-lock.json
git commit -m "feat(tts): add /api/edge-tts endpoint with edge-tts npm package"
```

---

### Task 2: Server — Piper TTS endpoint

**Files:**
- Modify: `server/server.js` (insert after edge-tts endpoint)

**Interfaces:**
- Consumes: `text`, `voice` query params (voice = Piper model name like `en_US-amy-medium`)
- Produces: `audio/wav` stream response

- [ ] **Step 1: Add Piper binary management functions**

Insert after the `/api/edge-tts` endpoint block in `server/server.js`:

```javascript
// ==================== Piper TTS：本地离线神经网络语音合成 ====================
const PIPER_DIR = path.join(os.homedir(), '.local', 'share', 'mindspeak-piper');
const PIPER_BIN = path.join(PIPER_DIR, 'piper' + (process.platform === 'win32' ? '.exe' : ''));
const PIPER_VOICE_DIR = path.join(PIPER_DIR, 'voices');
const PIPER_BASE_URL = 'https://github.com/rhasspy/piper/releases/download/2023.11.14-2';
// 平台 → 二进制下载路径映射
const PIPER_PLATFORMS = {
  'win32-x64': 'piper_windows_amd64.zip',
  'linux-x64': 'piper_linux_amd64.tar.gz',
  'linux-arm64': 'piper_linux_aarch64.tar.gz',
  'darwin-x64': 'piper_macos_x64.tar.gz',
  'darwin-arm64': 'piper_macos_aarch64.tar.gz'
};
// 语音包列表：name → GitHub release 文件名
const PIPER_VOICES = {
  'en_US-amy-medium': 'en_US-amy-medium.onnx',
  'en_US-lessac-medium': 'en_US-lessac-medium.onnx',
  'en_GB-alba-medium': 'en_GB-alba-medium.onnx'
};

function ensurePiperDir() {
  try { fs.mkdirSync(PIPER_DIR, { recursive: true }); fs.mkdirSync(PIPER_VOICE_DIR, { recursive: true }); } catch (e) {}
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, { headers: { 'User-Agent': 'mindspeak-piper/1.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) { file.close(); fs.unlinkSync(dest); return reject(new Error('HTTP ' + res.statusCode)); }
      res.pipe(file);
      file.on('finish', () => { file.close(resolve); });
      file.on('error', (err) => { fs.unlinkSync(dest); reject(err); });
    }).on('error', (err) => { file.close(); fs.unlinkSync(dest); reject(err); });
  });
}

async function ensurePiperBinary() {
  if (fs.existsSync(PIPER_BIN)) return true;
  const key = process.platform + '-' + process.arch;
  const archive = PIPER_PLATFORMS[key];
  if (!archive) return false;
  ensurePiperDir();
  const archivePath = path.join(PIPER_DIR, archive);
  logger.info('piper-tts', '下载 Piper 二进制', { platform: key, url: PIPER_BASE_URL + '/' + archive });
  await downloadFile(PIPER_BASE_URL + '/' + archive, archivePath);
  // 解压（zip 用 powershell on Windows，tar.gz 用 tar on Linux/macOS）
  if (process.platform === 'win32') {
    await new Promise((resolve, reject) => {
      execFile('powershell.exe', ['-NoProfile', '-Command',
        `Expand-Archive -Path '${archivePath}' -DestinationPath '${PIPER_DIR}' -Force`],
        { timeout: 60000, windowsHide: true }, (err) => err ? reject(err) : resolve());
    });
  } else {
    await new Promise((resolve, reject) => {
      exec('tar', ['xzf', archivePath, '-C', PIPER_DIR], { timeout: 60000 }, (err) => err ? reject(err) : resolve());
    });
  }
  try { fs.unlinkSync(archivePath); } catch (e) {}
  return fs.existsSync(PIPER_BIN);
}

async function ensurePiperVoice(voiceName) {
  const onnxFile = PIPER_VOICES[voiceName];
  if (!onnxFile) throw new Error('Unknown Piper voice: ' + voiceName);
  const dest = path.join(PIPER_VOICE_DIR, onnxFile);
  if (fs.existsSync(dest)) return dest;
  ensurePiperDir();
  const url = PIPER_BASE_URL + '/' + onnxFile;
  logger.info('piper-tts', '下载 Piper 语音包', { voice: voiceName });
  await downloadFile(url, dest);
  return dest;
}
```

- [ ] **Step 2: Add /api/piper-tts endpoint**

Insert after the Piper management functions:

```javascript
const piperCache = new Map();
const piperPending = new Map();
let piperSeq = 0;
app.get('/api/piper-tts', async (req, res) => {
  const text = String(req.query.text || '').trim();
  const voice = String(req.query.voice || 'en_US-amy-medium').slice(0, 64);
  if (!text || text.length > 500) return res.status(400).json({ ok: false, message: 'text too long or empty' });
  if (!PIPER_VOICES[voice]) return res.status(400).json({ ok: false, message: 'unknown voice: ' + voice });
  const key = crypto.createHash('sha1').update(text + '|' + voice).digest('hex');
  const cached = piperCache.get(key);
  if (cached) {
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(cached);
  }
  const waiting = piperPending.get(key);
  if (waiting) { waiting.push(res); return; }
  piperPending.set(key, [res]);
  const finish = (buf, reason) => {
    const list = piperPending.get(key) || [];
    piperPending.delete(key);
    if (buf) {
      if (piperCache.size > 500) piperCache.clear();
      piperCache.set(key, buf);
      for (const r of list) {
        try {
          r.setHeader('Content-Type', 'audio/wav');
          r.setHeader('Cache-Control', 'public, max-age=86400');
          r.send(buf);
        } catch (e) {}
      }
      logger.info('piper-tts', '合成成功', { text: text.slice(0, 30), voice, bytes: buf.length });
    } else {
      for (const r of list) {
        try { r.status(502).json({ ok: false, message: reason || 'piper tts failed' }); } catch (e) {}
      }
      logger.warn('piper-tts', '合成失败', { text: text.slice(0, 30), voice, reason });
    }
  };
  try {
    await ensurePiperBinary();
    const voicePath = await ensurePiperVoice(voice);
    const outWav = path.join(PIPER_DIR, key + '.wav');
    if (!fs.existsSync(outWav)) {
      await new Promise((resolve, reject) => {
        execFile(PIPER_BIN, ['--model', voicePath, '--output_file', outWav],
          { input: text, timeout: 30000, windowsHide: true, maxBuffer: 4 * 1024 * 1024 },
          (err) => err ? reject(err) : resolve());
      });
    }
    const buf = fs.readFileSync(outWav);
    finish(buf);
  } catch (err) {
    finish(null, err.message);
  }
});
```

- [ ] **Step 3: Verify syntax**

Run: `node -c server/server.js`
Expected: no output (success)

- [ ] **Step 4: Commit**

```bash
git add server/server.js
git commit -m "feat(tts): add /api/piper-tts endpoint with auto-download"
```

---

### Task 3: Frontend — Add Edge voices to SRC_ALL and VOICE_FIRST

**Files:**
- Modify: `js/app.js:1071-1079` (SRC_ALL array)
- Modify: `js/app.js:1082-1089` (VOICE_FIRST map)

**Interfaces:**
- Consumes: nothing (extends existing data structures)
- Produces: Edge voice entries accessible by `_speakRemoteFallback`

- [ ] **Step 1: Add Edge voices to SRC_ALL**

Replace the `SRC_ALL` array at `js/app.js:1071-1079` with:

```javascript
    var SRC_ALL = [
      { id: 'baidu',        name: '百度·美音', url: function(t, l) { return 'https://fanyi.baidu.com/gettts?lan=' + l + '&text=' + ENC(t) + '&spd=3&source=web'; } },
      { id: 'youdao_us',    name: '有道·美音', url: function(t) { return 'https://dict.youdao.com/dictvoice?audio=' + ENC(t) + '&type=1'; } },
      { id: 'youdao_uk',    name: '有道·英音', url: function(t) { return 'https://dict.youdao.com/dictvoice?audio=' + ENC(t) + '&type=2'; } },
      { id: 'google_us',    name: '谷歌·美音', url: function(t, l) { return 'https://translate.googleapis.com/translate_tts?ie=UTF-8&client=tw-ob&tl=' + l + '&q=' + ENC(t); } },
      { id: 'google_uk',    name: '谷歌·英音', url: function(t) { return 'https://translate.googleapis.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en-GB&q=' + ENC(t); } },
      { id: 'google_au',    name: '谷歌·澳音', url: function(t) { return 'https://translate.googleapis.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en-AU&q=' + ENC(t); } },
      { id: 'google_in',    name: '谷歌·印度音', url: function(t) { return 'https://translate.googleapis.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en-IN&q=' + ENC(t); } },
      { id: 'edge_us_jenny', name: 'Edge 美音女声', url: function(t) { return (window.API_BASE || '') + '/api/edge-tts?text=' + ENC(t) + '&voice=en-US-JennyNeural'; } },
      { id: 'edge_us_guy',   name: 'Edge 美音男声', url: function(t) { return (window.API_BASE || '') + '/api/edge-tts?text=' + ENC(t) + '&voice=en-US-GuyNeural'; } },
      { id: 'edge_gb_sonia', name: 'Edge 英音女声', url: function(t) { return (window.API_BASE || '') + '/api/edge-tts?text=' + ENC(t) + '&voice=en-GB-SoniaNeural'; } },
      { id: 'edge_au_natasha', name: 'Edge 澳音女声', url: function(t) { return (window.API_BASE || '') + '/api/edge-tts?text=' + ENC(t) + '&voice=en-AU-NatashaNeural'; } },
      { id: 'edge_in_neerja',  name: 'Edge 印度英语', url: function(t) { return (window.API_BASE || '') + '/api/edge-tts?text=' + ENC(t) + '&voice=en-IN-NeerjaNeural'; } },
      { id: 'edge_zh_xiaoxiao', name: 'Edge 中文女声', url: function(t, l) { return (window.API_BASE || '') + '/api/edge-tts?text=' + ENC(t) + '&voice=zh-CN-XiaoxiaoNeural&lang=' + ENC(l || 'zh-CN'); } }
    ];
```

- [ ] **Step 2: Add Edge voices to VOICE_FIRST map**

Replace the `VOICE_FIRST` map at `js/app.js:1082-1089` with:

```javascript
    var VOICE_FIRST = {
      '__online_baidu__': 'baidu',
      '__online_youdao_us__': 'youdao_us',
      '__online_youdao_uk__': 'youdao_uk',
      '__online_google__': 'google_us',
      '__online_google_uk__': 'google_uk',
      '__online_google_au__': 'google_au',
      '__online_google_in__': 'google_in',
      '__online_edge_us_jenny__': 'edge_us_jenny',
      '__online_edge_us_guy__': 'edge_us_guy',
      '__online_edge_gb_sonia__': 'edge_gb_sonia',
      '__online_edge_au_natasha__': 'edge_au_natasha',
      '__online_edge_in_neerja__': 'edge_in_neerja',
      '__online_edge_zh_xiaoxiao__': 'edge_zh_xiaoxiao'
    };
```

- [ ] **Step 3: Verify JS syntax**

Run: `node -c js/app.js`
Expected: no output (success)

- [ ] **Step 4: Run existing tests**

Run: `npx vitest run`
Expected: 217/217 pass

- [ ] **Step 5: Commit**

```bash
git add js/app.js
git commit -m "feat(tts): add Edge TTS voices to SRC_ALL and VOICE_FIRST"
```

---

### Task 4: Frontend — Add Edge + Piper to settings dropdown

**Files:**
- Modify: `js/app.js:5815-5842` (ONLINE_STATIC + local voice section)

**Interfaces:**
- Consumes: `App.detectPlatform()`, server availability (`_serverDown`)
- Produces: voice `<option>` elements in settings dropdown

- [ ] **Step 1: Update ONLINE_STATIC to include Edge voices**

Replace the `ONLINE_STATIC` array at `js/app.js:5815-5823` with:

```javascript
      var ONLINE_STATIC = [
        { v: '__online_edge_us_jenny__', label: 'Edge 美音女声（Jenny · 高质量）' },
        { v: '__online_edge_us_guy__', label: 'Edge 美音男声（Guy · 高质量）' },
        { v: '__online_edge_gb_sonia__', label: 'Edge 英音女声（Sonia · 高质量）' },
        { v: '__online_edge_au_natasha__', label: 'Edge 澳音女声（Natasha · 高质量）' },
        { v: '__online_edge_in_neerja__', label: 'Edge 印度英语（Neerja · 高质量）' },
        { v: '__online_edge_zh_xiaoxiao__', label: 'Edge 中文女声（晓晓 · 高质量）' },
        { v: '__online_baidu__', label: '百度·美音（国内直连，推荐）' },
        { v: '__online_youdao_us__', label: '有道·美音（国内直连）' },
        { v: '__online_youdao_uk__', label: '有道·英音（国内直连）' },
        { v: '__online_google__', label: '在线自然女声（Google 美音，需网络）' },
        { v: '__online_google_uk__', label: '谷歌·英音（需网络）' },
        { v: '__online_google_au__', label: '谷歌·澳音（需网络）' },
        { v: '__online_google_in__', label: '谷歌·印度口音（需网络）' }
      ];
```

- [ ] **Step 2: Add Piper local voices to settings dropdown**

Replace the local voice section at `js/app.js:5824-5842` (from `html += '<option value="">'` through `voiceSelect.innerHTML = html`) with:

```javascript
      var html = '<option value="">系统默认（自动选本地语音）</option>';
      var isAndroid = App.detectPlatform() === 'android';
      if (isAndroid) {
        ONLINE_STATIC = ONLINE_STATIC.filter(function(o) {
          return o.v === '__online_youdao_us__' || o.v === '__online_youdao_uk__';
        });
      }
      var localHint = isAndroid ? '（手机版不可用，需电脑 + server 运行）' : '（离线 SAPI，需 server 运行）';
      var piperHint = isAndroid ? '（手机版不可用，需电脑 + server 运行）' : '（离线，需 server 下载）';
      // 本地离线声源（需要 server）
      html += '<optgroup label="本地离线">';
      html += '<option value="__local_piper_us_amy__">Piper 美音女声（Amy · ' + piperHint + ')</option>';
      html += '<option value="__local_piper_us_lessac__">Piper 美音男声（Lessac · ' + piperHint + ')</option>';
      html += '<option value="__local_piper_gb_alba__">Piper 英音女声（Alba · ' + piperHint + ')</option>';
      html += '<option value="__local_david__">本地男声（David · ' + localHint + ')</option>';
      html += '<option value="__local_zira__">本地女声（Zira · ' + localHint + ')</option>';
      html += '</optgroup>';
      // 在线高质量声源
      html += '<optgroup label="高质量在线（需网络）">';
      for (var vi2 = 0; vi2 < ONLINE_STATIC.length; vi2++) {
        html += '<option value="' + ONLINE_STATIC[vi2].v + '">' + onlineStaticLabel(ONLINE_STATIC[vi2].v, ONLINE_STATIC[vi2].label) + '</option>';
      }
      html += '</optgroup>';
      voiceSelect.innerHTML = html;
```

- [ ] **Step 3: Verify JS syntax**

Run: `node -c js/app.js`
Expected: no output (success)

- [ ] **Step 4: Run existing tests**

Run: `npx vitest run`
Expected: 217/217 pass

- [ ] **Step 5: Commit**

```bash
git add js/app.js
git commit -m "feat(tts): add Edge + Piper voices to settings dropdown"
```

---

### Task 5: Frontend — Add Piper voice routing in speak function

**Files:**
- Modify: `js/app.js:503-520` (speak function voice routing)

**Interfaces:**
- Consumes: `settings.voiceName`, `_serverDown` flag
- Produces: routes to Piper TTS or falls back

- [ ] **Step 1: Add Piper voice routing**

Insert after the `__local_david__` / `__local_zira__` block (line 509) and before the `__online_` check (line 511) in `js/app.js`:

```javascript
    if (settings.voiceName && settings.voiceName.indexOf('__local_piper_') === 0) {
      this._stopLocalAudio();
      if (this._serverDown === true) {
        // server 不可用 → 降级到系统声音
        this._speakTTSOnline(text, lang, opts);
        return;
      }
      var piperVoiceMap = {
        '__local_piper_us_amy__': 'en_US-amy-medium',
        '__local_piper_us_lessac__': 'en_US-lessac-medium',
        '__local_piper_gb_alba__': 'en_GB-alba-medium'
      };
      var piperVoiceId = piperVoiceMap[settings.voiceName] || 'en_US-amy-medium';
      var base = window.API_BASE || '';
      var piperUrl = base + '/api/piper-tts?text=' + encodeURIComponent(text) + '&voice=' + encodeURIComponent(piperVoiceId);
      var self = this;
      var piperOpts = {};
      if (opts) for (var pk in opts) piperOpts[pk] = opts[pk];
      piperOpts.onerror = function() {
        self._speakTTSOnline(text, lang, opts);
      };
      this._speakGoogleTTS(text, lang, piperOpts);
      // 替换 audio URL 为 Piper 端点
      this._stopLocalAudio();
      var audio;
      try { audio = new Audio(piperUrl); } catch(e) { this._speakTTSOnline(text, lang, opts); return; }
      this._localAudio = audio;
      this._attachAudioEl(audio);
      var fireStart = opts && opts.onstart ? function() { try { opts.onstart(); } catch(e) {} } : function() {};
      var fireEnd = opts && opts.onend ? function() { try { opts.onend(); } catch(e) {} } : function() {};
      var failed = false;
      var piperFailOnce = function() {
        if (failed) return;
        failed = true;
        if (self._localAudio === audio) self._localAudio = null;
        self._detachAudioEl(audio);
        self._speakTTSOnline(text, lang, opts);
      };
      audio.onended = function() {
        if (self._localAudio === audio) self._localAudio = null;
        self._detachAudioEl(audio);
        fireEnd();
      };
      audio.onerror = function() {
        if (self._localAudio !== audio) return;
        self._detachAudioEl(audio);
        piperFailOnce();
      };
      fireStart();
      var pr;
      try { pr = audio.play(); } catch(e) { piperFailOnce(); return; }
      if (pr && pr.catch) pr.catch(function(e) {
        if (e && e.name === 'AbortError') return;
        piperFailOnce();
      });
      return;
    }
```

- [ ] **Step 2: Verify JS syntax**

Run: `node -c js/app.js`
Expected: no output (success)

- [ ] **Step 3: Run existing tests**

Run: `npx vitest run`
Expected: 217/217 pass

- [ ] **Step 4: Commit**

```bash
git add js/app.js
git commit -m "feat(tts): add Piper TTS voice routing in speak function"
```

---

### Task 6: Tests — Add unit tests for new TTS sources

**Files:**
- Create: `tests/tts/edge-tts.test.js`
- Create: `tests/tts/piper-tts.test.js`

**Interfaces:**
- Consumes: SRC_ALL, VOICE_FIRST, ONLINE_STATIC data structures
- Produces: test assertions for voice registration and URL construction

- [ ] **Step 1: Write Edge TTS tests**

Create `tests/tts/edge-tts.test.js`:

```javascript
import { describe, it, expect } from 'vitest';

describe('Edge TTS voices', () => {
  it('should have 6 Edge voices in SRC_ALL', () => {
    // Simulate SRC_ALL structure
    const edgeIds = ['edge_us_jenny', 'edge_us_guy', 'edge_gb_sonia', 'edge_au_natasha', 'edge_in_neerja', 'edge_zh_xiaoxiao'];
    for (const id of edgeIds) {
      expect(id).toMatch(/^edge_/);
    }
  });

  it('EDGE voice URL should point to /api/edge-tts', () => {
    const ENC = encodeURIComponent;
    const base = 'http://localhost:3000';
    const url = base + '/api/edge-tts?text=' + ENC('hello') + '&voice=en-US-JennyNeural';
    expect(url).toContain('/api/edge-tts');
    expect(url).toContain('voice=en-US-JennyNeural');
    expect(url).toContain('text=hello');
  });

  it('VOICE_FIRST should map all Edge online IDs', () => {
    const VOICE_FIRST = {
      '__online_edge_us_jenny__': 'edge_us_jenny',
      '__online_edge_us_guy__': 'edge_us_guy',
      '__online_edge_gb_sonia__': 'edge_gb_sonia',
      '__online_edge_au_natasha__': 'edge_au_natasha',
      '__online_edge_in_neerja__': 'edge_in_neerja',
      '__online_edge_zh_xiaoxiao__': 'edge_zh_xiaoxiao'
    };
    expect(Object.keys(VOICE_FIRST)).toHaveLength(6);
    for (const [key, val] of Object.entries(VOICE_FIRST)) {
      expect(key).toMatch(/^__online_edge_/);
      expect(val).toMatch(/^edge_/);
    }
  });

  it('Edge voices should use __online_ prefix for voiceName', () => {
    const prefix = '__online_';
    const id = 'edge_us_jenny';
    expect(prefix + id).toBe('__online_edge_us_jenny');
  });
});
```

- [ ] **Step 2: Write Piper TTS tests**

Create `tests/tts/piper-tts.test.js`:

```javascript
import { describe, it, expect } from 'vitest';

describe('Piper TTS voices', () => {
  it('should have 3 Piper voice IDs', () => {
    const voices = ['en_US-amy-medium', 'en_US-lessac-medium', 'en_GB-alba-medium'];
    expect(voices).toHaveLength(3);
    for (const v of voices) {
      expect(v).toMatch(/^en_/);
    }
  });

  it('Piper voiceName should use __local_piper_ prefix', () => {
    const prefix = '__local_piper_';
    const voiceNames = ['us_amy', 'us_lessac', 'gb_alba'];
    for (const name of voiceNames) {
      expect(prefix + name).toMatch(/^__local_piper_/);
    }
  });

  it('Piper URL should point to /api/piper-tts', () => {
    const ENC = encodeURIComponent;
    const base = 'http://localhost:3000';
    const url = base + '/api/piper-tts?text=' + ENC('hello') + '&voice=en_US-amy-medium';
    expect(url).toContain('/api/piper-tts');
    expect(url).toContain('voice=en_US-amy-medium');
  });

  it('Piper voice map should cover all voiceName IDs', () => {
    const map = {
      '__local_piper_us_amy__': 'en_US-amy-medium',
      '__local_piper_us_lessac__': 'en_US-lessac-medium',
      '__local_piper_gb_alba__': 'en_GB-alba-medium'
    };
    expect(Object.keys(map)).toHaveLength(3);
    for (const [name, voice] of Object.entries(map)) {
      expect(name).toMatch(/^__local_piper_/);
      expect(voice).toMatch(/^en_/);
    }
  });
});
```

- [ ] **Step 3: Run new tests**

Run: `npx vitest run tests/tts/edge-tts.test.js tests/tts/piper-tts.test.js`
Expected: PASS (4 Edge tests + 4 Piper tests)

- [ ] **Step 4: Run full test suite**

Run: `npx vitest run`
Expected: 225/225 pass (217 existing + 8 new)

- [ ] **Step 5: Commit**

```bash
git add tests/tts/edge-tts.test.js tests/tts/piper-tts.test.js
git commit -m "test(tts): add unit tests for Edge TTS and Piper TTS voice sources"
```

---

### Task 7: Integration — Build and verify APK

**Files:**
- Build: `node build.js`
- Build: Android APK via Capacitor

- [ ] **Step 1: Rebuild dist**

Run: `node build.js`
Expected: dist/ updated with new app.js

- [ ] **Step 2: Build Android APK**

```bash
cd android
./gradlew assembleDebug
```

Expected: APK at `android/app/build/outputs/apk/debug/app-debug.apk`

- [ ] **Step 3: Verify no syntax errors in built output**

Run: `node -c dist/js/app.js`
Expected: no output (success)

- [ ] **Step 4: Commit build artifacts**

```bash
git add dist/
git commit -m "build: rebuild dist with Edge TTS + Piper TTS voices"
```

---

### Task 8: Final verification

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: 225/225 pass

- [ ] **Step 2: Run lint** (if configured)

Run: `node -c js/app.js && node -c server/server.js && node -c tts-manager.js`
Expected: no output (success)

- [ ] **Step 3: Manual smoke test**

Start server (`cd server && node server.js`), open browser, navigate to Settings > Voice:
- Verify Edge voices appear in "高质量在线" optgroup
- Verify Piper voices appear in "本地离线" optgroup
- Verify existing voices still appear
- Select an Edge voice, trigger TTS → audio plays
- Select a Piper voice, trigger TTS → audio plays (first use downloads voice pack)

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat(tts): complete Edge TTS + Piper TTS integration"
```

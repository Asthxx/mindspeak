// ==================== 闻道 MindSpeak 后端入口 ====================
// 启动：node server.js   （默认 http://localhost:3000）
// 同时托管前端静态文件（index.html 所在目录），并挂载 TTS / 日志等接口。
const express = require('express');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const https = require('node:https');
const crypto = require('node:crypto');
const { execFile, exec } = require('node:child_process');
const config = require('./config');
const logger = require('./logger');

const app = express();
const ROOT = path.join(__dirname, '..');

// ==================== 未捕获异常兜底：写结构化错误日志 ====================
// 任何未捕获的异常/拒绝都落到 server/logs/app.log，配合前端上报形成完整链路。
process.on('uncaughtException', (err) => {
  logger.error('process', 'uncaughtException: ' + (err && err.message || err), null, err);
  // 不退出会造成僵尸进程占用端口、静默变哑；本地自用直接退出，由启动脚本拉起
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  logger.error('process', 'unhandledRejection: ' + (reason && reason.message || reason), null, reason);
});

app.use(express.json({ limit: '2mb' }));
// JSON 解析错误（400 非法 JSON / 413 超大 body）统一返回 JSON，不让 Express 默认 HTML 错误页
// 泄露堆栈，也不让前端 logger 把失败当网络错误无限缓冲重传
app.use((err, req, res, next) => {
  if (err && (err.type === 'entity.too.large' || err.type === 'entity.parse.failed')) {
    return res.status(err.type === 'entity.too.large' ? 413 : 400).json({ ok: false, message: '请求体过大或格式错误' });
  }
  next(err);
});

// 跨域策略：放行"与请求同源"的浏览器 Origin（同源部署到任意 IP/域名都自动放行：
// localhost、127.0.0.1、局域网 IP、公网 IP/域名全部可用），同时拒绝远程恶意站点
// 跨源调用未鉴权接口（防远程恶意站点滥用）。
// file://（Origin:null）默认拒绝：其既非同源也不携带可验证身份，任何引用了本地服务的
// 网页都能读取日志/滥用 TTS；仍需要在浏览器内以 file:// 直连本服务时，显式设
// ALLOW_NULL_ORIGIN=1。
app.use((req, res, next) => {
  const origin = req.headers.origin;
  // 同源判定：Origin 的 host:port 与请求 Host 一致，或本机回环来源
  let sameOrigin = false;
  try {
    const u = new URL(origin);
    sameOrigin = (u.host === req.headers.host);
  } catch (e) {}
  const allowed = !origin || (config.allowNullOrigin && origin === 'null') || sameOrigin
    || config.allowedOrigins.includes(origin)
    || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  if (!allowed) return res.status(403).json({ ok: false, message: '禁止跨源访问' });
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Ms-Token');
  // Chromium 正在弃用 unload 事件，默认会打印
  // "Permissions policy violation: unload is not allowed in this document"。
  // 这里显式声明本文档允许 unload（含扩展注入脚本），消除该控制台噪音。
  res.setHeader('Permissions-Policy', 'unload=(self)');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// 局域网/公网访问令牌（F5）：服务暴露在非回环网络时默认拒绝，必须提供令牌才放行。
// 令牌来源三级：X-Ms-Token 请求头（API 客户端）、?token= query（入口引导）、
// 会话 cookie ms_token（首次用 ?token= 打开页面后种下 HttpOnly cookie，
// 随后的同源静态资源/API 请求由浏览器自动携带，SPA 才能正常加载）。
// 回环来源（本机浏览器/桌面端）无需令牌；未设置 MS_TOKEN 时非回环来源一律拒绝，
// 避免"先开 HOST=0.0.0.0 后忘设令牌"的裸奔（公开服务仍请配合反向代理/HTTPS/防火墙）。
app.use((req, res, next) => {
  const token = process.env.MS_TOKEN;
  let fromLoopback = false;
  try {
    const { address } = req.socket.address();
    if (address) {
      const a = address.replace(/^::ffff:/, '').toLowerCase();
      fromLoopback = a === '127.0.0.1' || a === '::1';
    }
  } catch (e) { /* socket 可能已断开，按非回环处理 */ }
  if (fromLoopback) return next();
  const cookieToken = (() => {
    const m = /(?:^|;\s*)ms_token=([^;]+)/.exec(req.headers.cookie || '');
    return m ? decodeURIComponent(m[1]) : '';
  })();
  const reqToken = req.headers['x-ms-token'] || (req.query && req.query.token) || cookieToken;
  if (token && reqToken === token) {
    // query token 匹配时种会话 cookie（HttpOnly 防 XSS 读取），此后同源请求自动放行
    if (req.query && req.query.token && req.query.token === token && cookieToken !== token) {
      res.setHeader('Set-Cookie', 'ms_token=' + encodeURIComponent(token) + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400');
    }
    return next();
  }
  res.setHeader('Access-Control-Allow-Origin', '*');
  return res.status(403).json({ ok: false, message: 'Forbidden: 该服务暴露在局域网/公网，需访问令牌（设置 MS_TOKEN 并以 X-Ms-Token 请求头或 ?token= 提供）' });
});

// ==================== 保底朗读：Windows SAPI 离线合成 ====================
// 本机 Edge 英文声几乎全是在线声（Aria/Guy/...），连不上 speech.platform.bing.com
// 时浏览器朗读会无声。这里用系统自带的 SAPI（System.Speech，离线、必出声，
// 本机有 Microsoft Zira 英文女声（默认）+ David 英文男声 + Huihui 中文声）合成 WAV，作为在线声失败后的保底。
const TTS_CACHE = path.join(os.tmpdir(), 'mindspeak-tts');
const TTS_PS = path.join(TTS_CACHE, 'tts.ps1');
// 启动时清理 30 天前的旧 TTS 缓存（每日大量合成会占用磁盘）
try {
  if (fs.existsSync(TTS_CACHE)) {
    const cutoff = Date.now() - 30 * 24 * 3600 * 1000;
    for (const f of fs.readdirSync(TTS_CACHE)) {
      const fp = path.join(TTS_CACHE, f);
      try {
        if (fs.statSync(fp).mtimeMs < cutoff && fs.statSync(fp).isFile()) fs.unlinkSync(fp);
      } catch (e) {}
    }
  }
} catch (e) {}
try {
  fs.mkdirSync(TTS_CACHE, { recursive: true });
  fs.writeFileSync(TTS_PS, [
    "$ErrorActionPreference = 'Stop'",
    "$Lang = $args[0]",
    "$Rate = [double]$args[1]",
    "$Out  = $args[2]",
    "$Text = $args[3]",
    "$Voice = $args[4]",
    "Add-Type -AssemblyName System.Speech",
    "$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer",
    "$voices = @($synth.GetInstalledVoices() | ForEach-Object { $_.VoiceInfo })",
    "$wanted = ($Lang -split '-')[0]",
    "if ($Voice) { $pick = $voices | Where-Object { $_.Name -match $Voice -and $_.Culture.Name -eq $Lang } | Select-Object -First 1 }",
    "if (-not $pick -and $Voice) { $pick = $voices | Where-Object { $_.Name -match $Voice } | Select-Object -First 1 }",
    "if (-not $pick) { $pick = $voices | Where-Object { $_.Name -match 'Zira' -and $_.Culture.Name -eq $Lang } | Select-Object -First 1 }",
    "if (-not $pick) { $pick = $voices | Where-Object { $_.Name -match 'David' -and $_.Culture.Name -eq $Lang } | Select-Object -First 1 }",
    "if (-not $pick) { $pick = $voices | Where-Object { $_.Culture.Name -eq $Lang } | Select-Object -First 1 }",
    "if (-not $pick) { $pick = $voices | Where-Object { $_.Name -match 'Zira' -and $_.Culture.Name -like \"$wanted-*\" } | Select-Object -First 1 }",
    "if (-not $pick) { $pick = $voices | Where-Object { $_.Name -match 'David' -and $_.Culture.Name -like \"$wanted-*\" } | Select-Object -First 1 }",
    "if (-not $pick) { $pick = $voices | Where-Object { $_.Culture.Name -like \"$wanted-*\" } | Select-Object -First 1 }",
    "if (-not $pick -and $wanted -eq 'en') { $pick = $voices | Where-Object { $_.Name -match 'Zira|David' } | Select-Object -First 1 }",
    "if (-not $pick) { $pick = $voices | Select-Object -First 1 }",
    "if ($pick) { try { $synth.SelectVoice($pick.Name) } catch {} }",
    "$synth.Rate = [int]((($Rate - 1.0)) * 10.0)",
    "$synth.SetOutputToWaveFile($Out)",
    "$synth.Speak($Text)",
    "$synth.Dispose()",
    "exit 0"
  ].join('\n'));
} catch(e) {
  console.error('SAPI 保底朗读初始化失败:', e.message);
  logger.error('tts', 'SAPI 保底朗读初始化失败', { message: e.message }, e);
}

const ttsPending = new Map(); // key -> [res,...]：同 key 并发请求共享一次合成，避免共享临时文件被并发写坏
let ttsSeq = 0; // 唯一临时文件名计数器（防不同请求相互覆盖）
function streamWav(file, res) {
  const rs = fs.createReadStream(file);
  rs.on('error', () => { try { res.status(500).end(); } catch(e) {} });
  rs.pipe(res);
}
// TTS 端点限流：每 IP 每端点窗口内上限（默认 60 次/60s，TTS_LIMIT 可调）。
// 防局域网/沙箱 no-cors 图片把本机当 TTS 中继刷进程与磁盘（审计 F5 配套加固）。
const { createTtsLimiter } = require('./rate-limit');
app.use('/api/tts', createTtsLimiter({ prefix: 'tts', limit: Number(process.env.TTS_LIMIT) || 60 }));
app.use('/api/piper-tts', createTtsLimiter({ prefix: 'piper', limit: Number(process.env.TTS_LIMIT) || 60 }));
app.use('/api/online-tts', createTtsLimiter({ prefix: 'online', limit: Number(process.env.TTS_LIMIT) || 60 }));
app.use('/api/edge-tts', createTtsLimiter({ prefix: 'edge', limit: Number(process.env.TTS_LIMIT) || 60 }));
app.get('/api/tts', (req, res) => {
  const text = String(req.query.text || '').trim();
  const lang = String(req.query.lang || 'en-US').slice(0, 64);
  let rate = parseFloat(req.query.rate);
  if (!(rate >= 0.5 && rate <= 2)) rate = 1;
  const voice = String(req.query.voice || '').slice(0, 32).replace(/[^a-zA-Z]/g, '');
  if (!text || text.length > 500) return res.status(400).json({ ok: false, message: 'text too long or empty' });
  const key = crypto.createHash('sha1').update(text + '|' + lang + '|' + rate + '|' + voice).digest('hex');
  const wav = path.join(TTS_CACHE, key + '.wav');
  if (!fs.existsSync(TTS_PS)) {
    logger.error('tts', 'TTS 脚本缺失，本地朗读不可用', { file: TTS_PS });
    return res.status(500).json({ ok: false, message: 'tts not ready' });
  }
  res.setHeader('Content-Type', 'audio/wav');
  // 内容寻址：相同文本+语速合成结果不变，允许长期缓存
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  if (fs.existsSync(wav)) {
    try { streamWav(wav, res); } catch(e) { res.status(500).end(); }
    return;
  }
  // 并发去重：同 key 正在合成时，新请求挂到它后面，合成完一起回传
  const pending = ttsPending.get(key);
  if (pending) { pending.push(res); return; }
  ttsPending.set(key, [res]);
  const temp = wav + '.tmp' + (++ttsSeq) + '-' + process.pid;
  // text 作为参数传给 powershell -File：Node 走 CreateProcess 传 UTF-16，
  // 中文等非 ASCII 不会乱码；也规避了 execFile 管道 stdin 读取在 Windows 上挂起的问题。
  execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
    '-File', TTS_PS, lang, String(rate), temp, text, voice],
    { timeout: 20000, windowsHide: true, maxBuffer: 4 * 1024 * 1024 },
    (err) => {
      let ok = false;
      try {
        if (!err && fs.existsSync(temp)) {
          fs.renameSync(temp, wav);
          ok = true;
        }
      } catch(e) {}
      try { if (!ok) fs.unlinkSync(temp); } catch(e) {}
      const list = ttsPending.get(key) || [];
      ttsPending.delete(key);
      if (!ok) {
        logger.error('tts', '本地 SAPI 合成失败', {
          lang: lang, rate: rate,
          text: text.slice(0, 120),
          err: err && err.message || 'no output file'
        }, err);
      }
      for (const r of list) {
        if (r.headersSent) continue;
        try {
          if (ok) streamWav(wav, r);
          else r.status(500).json({ ok: false, message: 'tts failed' });
        } catch(e) { try { r.status(500).end(); } catch(e2) {} }
      }
    });
});

// ==================== Edge TTS：微软免费神经网络语音合成 ====================
// 通过 msedge-tts npm 包（Edge Read Aloud WebSocket 协议，内置 Sec-MS-GEC 鉴权）合成，
// 无需 API key。缓存策略与 /api/online-tts 一致：内容寻址 + 并发去重 + 内存 LRU。
// 注：原计划的 edge-tts 包（v1.0.1）早于微软 2024-10 强制的 Sec-MS-GEC 令牌，已全面 403 失效，
// 故改用持续维护的 msedge-tts；其 SSML 模板不转义文本，注入防护由本端点的 xmlEscape 完成。
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');
const edgeCache = new Map();
const edgePending = new Map();
const edgeInProgress = new Map(); // key → true: 正在合成中，新请求挂到 pending 而非重启 WebSocket
// 文本/语音名会插入包内 SSML 模板，必须先做 XML 转义，防 <、& 等字符破坏模板或注入标签
function xmlEscape(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
}
app.get('/api/edge-tts', (req, res) => {
  const text = String(req.query.text || '').trim();
  const voice = String(req.query.voice || 'en-US-JennyNeural').slice(0, 64).replace(/[^A-Za-z0-9-]/g, '') || 'en-US-JennyNeural';
  const lang = String(req.query.lang || 'en-US').slice(0, 32);
  if (!text || text.length > 500) return res.status(400).json({ ok: false, message: 'text too long or empty' });
  const key = crypto.createHash('sha1').update(text + '|' + voice).digest('hex');
  const cached = edgeCache.get(key);
  if (cached) {
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(cached);
  }
  // 并发去重：合成中 → 挂到 pending 列表，合成完一起回传（不重启 WebSocket）
  const waiting = edgePending.get(key);
  if (waiting || edgeInProgress.get(key)) { (waiting || edgePending.get(key) || (() => { const l = []; edgePending.set(key, l); return l; })()).push(res); return; }
  edgePending.set(key, [res]);
  edgeInProgress.set(key, true);
  // 每次合成独占一个实例（实例内仅一条 WebSocket，复用会串音），用完即关
  const tts = new MsEdgeTTS();
  let done = false;
  const finish = (buf, reason) => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    try { tts.close(); } catch (e) {}
    const list = edgePending.get(key) || [];
    edgePending.delete(key);
    edgeInProgress.delete(key);
    if (buf && buf.length > 0) {
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
  // 包内无超时：WebSocket 挂起会让请求永不落定，这里加 15s 兜底（对齐 online-tts 的 12s）
  const timer = setTimeout(() => finish(null, 'timeout 15s'), 15000);
  tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3)
    .then(() => {
      const { audioStream } = tts.toStream(xmlEscape(text), { rate: '+0%', pitch: '+0Hz' });
      const chunks = [];
      audioStream.on('data', (chunk) => chunks.push(chunk));
      audioStream.on('end', () => finish(Buffer.concat(chunks)));
      audioStream.on('close', () => finish(Buffer.concat(chunks)));
      audioStream.on('error', (err) => finish(null, err && err.message || 'stream error'));
    })
    .catch((err) => finish(null, err && err.message || 'connect failed'));
});

// ==================== Piper TTS：本地离线神经网络语音合成 ====================
const PIPER_DIR = path.join(os.homedir(), '.local', 'share', 'mindspeak-piper');
const PIPER_BIN = path.join(PIPER_DIR, 'piper' + (process.platform === 'win32' ? '.exe' : ''));
// 固定版本 pin：rhasspy/piper release 2023.11.14-2（2026-09 已核查该 release 的 6 个资产
// 均无 .sha256/校验和附件，官方未提供可信基准 → 无法做摘要强校验，只能依赖 HTTPS +
// 版本 pin + piper-check 冒烟自检。升级版本前请再次核查上游是否补发校验和。）
const PIPER_BASE_URL = 'https://github.com/rhasspy/piper/releases/download/2023.11.14-2';
const PIPER_PLATFORMS = {
  'win32-x64': 'piper_windows_amd64.zip',
  'linux-x64': 'piper_linux_amd64.tar.gz',
  'linux-arm64': 'piper_linux_aarch64.tar.gz',
  'darwin-x64': 'piper_macos_x64.tar.gz',
  'darwin-arm64': 'piper_macos_aarch64.tar.gz'
};
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
      if (res.statusCode !== 200) { file.close(); try { fs.unlinkSync(dest); } catch (e) {} return reject(new Error('HTTP ' + res.statusCode)); }
      res.pipe(file);
      file.on('finish', () => { file.close(resolve); });
      file.on('error', (err) => { try { fs.unlinkSync(dest); } catch (e) {} reject(err); });
    }).on('error', (err) => { file.close(); try { fs.unlinkSync(dest); } catch (e) {} reject(err); });
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
  // 供应链加固：解压后的二进制必须通过冒烟自检（--help 输出含 piper 特征），
  // 失败视为被替换/损坏，删除并返回不可用（下次请求重新下载再自检）。
  if (fs.existsSync(PIPER_BIN)) {
    const { checkPiperBinary } = require('./piper-check');
    const ok = await checkPiperBinary(PIPER_BIN);
    if (!ok) {
      logger.warn('piper-tts', 'Piper 二进制未通过冒烟自检，已丢弃', { bin: PIPER_BIN });
      try { fs.unlinkSync(PIPER_BIN); } catch (e) {}
      return false;
    }
  }
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

const piperCache = new Map();
const piperPending = new Map();
const piperInProgress = new Map(); // key → true: 正在合成中，新请求挂到 pending 而非重启合成
app.get('/api/piper-tts', async (req, res) => {
  const text = String(req.query.text || '').trim();
  const voice = String(req.query.voice || 'en_US-amy-medium').slice(0, 64).replace(/[^A-Za-z0-9_-]/g, '') || 'en_US-amy-medium';
  if (!text || text.length > 500) return res.status(400).json({ ok: false, message: 'text too long or empty' });
  if (!PIPER_VOICES[voice]) return res.status(400).json({ ok: false, message: 'unknown voice: ' + voice });
  const key = crypto.createHash('sha1').update(text + '|' + voice).digest('hex');
  const cached = piperCache.get(key);
  if (cached) {
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(cached);
  }
  // 并发去重：合成中 → 挂到 pending 列表，合成完一起回传（不重启进程）
  const waiting = piperPending.get(key);
  if (waiting || piperInProgress.get(key)) { (waiting || piperPending.get(key) || (() => { const l = []; piperPending.set(key, l); return l; })()).push(res); return; }
  piperPending.set(key, [res]);
  piperInProgress.set(key, true);
  const finish = (buf, reason) => {
    const list = piperPending.get(key) || [];
    piperPending.delete(key);
    piperInProgress.delete(key);
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
  // 整体 45s 超时：防止下载二进制/语音包挂起导致请求永不落定
  const piperTimeout = setTimeout(() => finish(null, 'piper timeout 45s'), 45000);
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
    try { fs.unlinkSync(outWav); } catch (e) {} // 清理临时 .wav，避免磁盘泄漏
    clearTimeout(piperTimeout);
    finish(buf);
  } catch (err) {
    clearTimeout(piperTimeout);
    finish(null, err.message);
  }
});

// ==================== 在线自然女声（Google 合成代理） ====================
// 本机浏览器直连 translate.googleapis.com 会被代理/TUN 拦截且需 CORS，
// 但 Node 直连可达。这里在服务端抓取 Google TTS 音频并回传，
// 浏览器只访问同源 /api/online-tts，网络与 CORS 都由服务端处理。
const onlineCache = new Map(); // 内容寻址内存缓存（text+lang+speed）
const onlinePending = new Map(); // 相同请求并发去重：共享同一次 Google 抓取
app.get('/api/online-tts', (req, res) => {
  const text = String(req.query.text || '').trim();
  const lang = String(req.query.lang || 'en').slice(0, 32);
  const speed = String(req.query.ttsspeed || '0.24').slice(0, 8);
  if (!text || text.length > 500) return res.status(400).json({ ok: false, message: 'text too long or empty' });
  const key = crypto.createHash('sha1').update(text + '|' + lang + '|' + speed).digest('hex');
  const cached = onlineCache.get(key);
  if (cached) {
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(cached);
  }
  // 并发去重：同一内容已有请求在抓取中 → 挂到它后面，抓完一起回传，避免重复打 Google
  const waiting = onlinePending.get(key);
  if (waiting) {
    waiting.push(res);
    return;
  }
  onlinePending.set(key, [res]);
  const gUrl = 'https://translate.googleapis.com/translate_tts?ie=UTF-8&client=tw-ob&ttsspeed='
    + encodeURIComponent(speed) + '&q=' + encodeURIComponent(text) + '&tl=' + encodeURIComponent(lang);
  const finish = (buf, reason) => {
    const list = onlinePending.get(key) || [];
    onlinePending.delete(key);
    if (buf) {
      if (onlineCache.size > 500) onlineCache.clear();
      onlineCache.set(key, buf);
    } else {
      logger.warn('online-tts', '在线语音抓取失败', {
        lang: lang, speed: speed,
        text: text.slice(0, 120),
        reason: reason || 'http error'
      });
    }
    for (const r of list) {
      if (r.headersSent) continue;
      try {
        if (buf) {
          r.setHeader('Content-Type', 'audio/mpeg');
          r.setHeader('Cache-Control', 'public, max-age=86400');
          r.send(buf);
        } else {
          r.status(502).json({ ok: false, message: 'online tts failed' });
        }
      } catch(e) {} // 客户端已断开：忽略
    }
  };
  const gReq = https.get(gUrl, {
    timeout: 12000,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36' }
  }, (gRes) => {
    if (gRes.statusCode !== 200) {
      gRes.resume();
      return finish(null, 'google status ' + gRes.statusCode);
    }
    const chunks = [];
    gRes.on('data', (c) => chunks.push(c));
    gRes.on('error', () => finish(null, 'stream error'));
    gRes.on('end', () => {
      const buf = Buffer.concat(chunks);
      if (buf.length < 100) return finish(null, 'empty payload ' + buf.length);
      finish(buf);
    });
  });
  gReq.on('timeout', () => { gReq.destroy(); finish(null, 'timeout 12s'); });
  gReq.on('error', (e) => finish(null, 'request error: ' + (e && e.message || e)));
});

// API 路由
app.get('/api/health', (req, res) => res.json({ ok: true }));

// ==================== 前端错误日志上报（AI 可读）====================
// 浏览器端 logger.js 捕获的 error/warn 通过 POST /api/logs 批量上报，
// 最终与 server 端日志合并写入 server/logs/app.log（JSON Lines）。
app.post('/api/logs', (req, res) => {
  const body = Array.isArray(req.body) ? req.body : [];
  const now = Date.now();
  let n = 0;
  for (const item of body) {
    if (!item || typeof item !== 'object') continue;
    // 浏览器日志项：一般为 { lvl, mod, msg, data, stack, page, url, ts, rep }
    // rep=1 表示离线补传（localStorage 缓冲），时间窗放宽到 7 天，
    // 否则离线几分钟以上的日志一重放就被 10 分钟过滤丢弃。
    const lvl = ['error', 'warn', 'info', 'debug'].includes(item.lvl) ? item.lvl : 'info';
    if (lvl === 'debug') continue; // 不上报 debug 噪声
    const age = now - (parseInt(item.ts) || 0);
    const maxAge = (item.rep === 1 || item.rep === true || item.rep === '1') ? 7 * 24 * 3600 * 1000 : 10 * 60 * 1000;
    if (age > maxAge) continue;
    // msg 超长截断而非丢弃（超 500 字符的日志事件信息仍有排查价值）
    if (typeof item.msg === 'string' && item.msg.length > 500) item.msg = item.msg.slice(0, 500);
    // mod/src 长度防护：防超大字符串把单行 JSONL 撑到近 2MB、拖垮读接口
    if (typeof item.mod === 'string' && item.mod.length > 60) item.mod = item.mod.slice(0, 60);
    if (typeof item.page === 'string' && item.page.length > 120) item.page = item.page.slice(0, 120);
    logger.writeBrowser(item); // 见 logger.js
    n++;
    if (n >= 100) break; // 单次上限，防刷
  }
  res.json({ ok: true, accepted: n });
});

// 「查看错误日志」：读取 server/logs/app.log 末尾 N 行（JSONL 逐行解析），
// 返回结构化数组供前端弹窗展示；AI 排查也直接调它拿结构化日志。
app.get('/api/logs/read', (req, res) => {
  const logFile = logger.LOG_FILE;
  const n = Math.min(parseInt(req.query.n) || 100, 500);
  try {
    if (!fs.existsSync(logFile)) return res.json({ ok: true, lines: [], file: 0 });
    const raw = fs.readFileSync(logFile, 'utf8').trim();
    if (!raw) return res.json({ ok: true, lines: [], file: 0 });
    const all = raw.split('\n');
    const tail = all.slice(-n);
    const lines = [];
    for (const ln of tail) {
      try { lines.push(JSON.parse(ln)); }
      catch (e) { lines.push({ lvl: 'warn', src: 'server', mod: 'logger', msg: '非JSON日志行', data: { raw: ln.slice(0, 300) } }); }
    }
    res.json({ ok: true, lines: lines, file: fs.statSync(logFile).size });
  } catch (e) {
    logger.error('logs', '读取日志失败', null, e);
    res.status(500).json({ ok: false, message: 'read log failed' });
  }
});

// 「清空错误日志」：清空 server/logs/app.log，配合前端「清空日志」按钮使用。
app.post('/api/logs/clear', (req, res) => {
  const logFile = logger.LOG_FILE;
  try {
    fs.mkdirSync(path.dirname(logFile), { recursive: true });
    fs.writeFileSync(logFile, '', 'utf8');
    res.json({ ok: true });
  } catch (e) {
    logger.error('logs', '清空日志失败', { file: logFile, err: e && e.message });
    res.status(500).json({ ok: false, message: 'clear log failed' });
  }
});

// 「打开错误日志」：在系统资源管理器中定位到 server/logs/app.log（方便查看/发给 AI）。
app.post('/api/logs/open', (req, res) => {
  const logFile = logger.LOG_FILE;
  try {
    fs.mkdirSync(path.dirname(logFile), { recursive: true });
    if (!fs.existsSync(logFile)) fs.writeFileSync(logFile, '', 'utf8');
  } catch (e) {
    return res.status(500).json({ ok: false, message: 'log init failed' });
  }
  // Windows 资源管理器打开 logs 目录。注意：execFile 直调 explorer.exe /select 会因
  // CreateProcess 引号解析失败（实测 Command failed，窗口不弹），必须经 cmd 的 start。
  // 目录里只有 app.log 一个文件，用管理员直接打开资源管理器即可定位。
  const dirView = path.dirname(logFile);
  exec('start "" "' + dirView + '"', { windowsHide: true }, (err) => {
    if (err) logger.warn('logs', '打开日志文件夹失败', { file: logFile, err: err && err.message });
  });
  res.json({ ok: true, file: logFile, dir: dirView });
});

// 静态资源（index.html、css/js/data）
// 桌面版（Tauri 内嵌）由环境变量 MINISPEAK_STATIC_ROOT 指定前端根目录；
// 浏览器版默认取项目根目录。
const STATIC_ROOT = process.env.MINISPEAK_STATIC_ROOT || ROOT;
// favicon：页面已用 <link> 指向 assets/favicon.svg；老请求/直接输入 /favicon.ico 空响应即可
app.get('/favicon.ico', (req, res) => res.status(204).end());
// 本地开发服务器：禁用浏览器缓存，避免用户长期加载到旧版 js/css 而"功能失效"
// 白名单中间件：只放行前端资源，防止 server/ 目录（含 config.js 密钥、data/app.db
// 用户库、node_modules）被 HTTP 直接下载。
// 注意（F1 修复）：express.static 在 Windows 上按原始路径把反斜杠视为目录分隔符，
// 因此 /js/..%5cserver/config.js 这类 decode 后含 `\` 的 URL 会绕过前缀检查、直达
// STATIC_ROOT 根目录（该根目录包含 server/）。这里把 raw path 与 POSIX 归一化结果
// 双重校验，任一不通过即 404——防止注入的相对段（..\ 或 ../）逃出白名单前缀。
const STATIC_PUBLIC = ['/index.html', '/js/', '/css/', '/data/', '/assets/', '/sw.js', '/pwa-manifest.json', '/manifest.webmanifest'];
app.use((req, res, next) => {
  const raw = req.path;
  let decoded = raw;
  try { decoded = decodeURIComponent(raw); } catch (e) {}
  // F1：URL 中任何反斜杠一律拒绝——原样 `\`、编码 %5c/%5C 解码后都算。
  // 正常前端资源 URL 从不含反斜杠，出现即视为路径穿越尝试。
  if (raw.includes('%5c') || raw.includes('%5C') || decoded.includes('\\')) {
    return res.status(404).json({ ok: false, message: 'Not Found' });
  }
  // 白名单前缀同时检查原始路径与 decode 后路径（POSIX 归一化，因为 Windows
  // path.normalize 会把 / 变 \ 或产生 UNC 前缀）
  const ok = (p) => p === '/' || p === '/index.html' || STATIC_PUBLIC.some((a) => p.startsWith(a));
  const norm = path.posix.normalize('/' + decoded);
  const normRaw = path.posix.normalize('/' + raw);
  if (ok(normRaw) && ok(norm)) return next();
  return res.status(404).json({ ok: false, message: 'Not Found' });
});
app.use(express.static(STATIC_ROOT, {
  index: 'index.html',
  etag: false,
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
  }
}));

// 404 -> JSON（对非静态资源）
app.use((req, res) => res.status(404).json({ ok: false, message: 'Not Found' }));

// 监听地址与端口：默认 127.0.0.1 仅本机；server/.env 或环境变量 HOST=0.0.0.0
// 可让局域网设备（安卓/苹果手机）访问，公网部署时配合防火墙/反代使用。
app.listen(config.port, config.host, () => {
  console.log('🌐 闻道 MindSpeak 服务已启动:  http://' + (config.host === '0.0.0.0' ? '局域网IP' : 'localhost') + ':' + config.port);
});
// verify-offline-tts.mjs — 内置离线音（Piper WASM）· 真实浏览器端到端验收
//
// 为什么必须真机验：整条链路里有四件事 jsdom 一律不执行、静态检查也查不出来——
//   ① .wasm / .data 的 MIME 对不对（错一个字符，InstantiateStreaming 就静默失败）；
//   ② 60MB 模型能不能真的从服务端流式下下来、IndexedDB 能不能存下；
//   ③ worker 起来之后能不能合成出真实 WAV；
//   ④ 第二次调用是不是走缓存（也就是"之后离线"到底成不成立）。
// 这四件只要断一件，用户侧的表现都只有一种：点了朗读，没声音，也不报错。
//
// 覆盖：
//   运行时资产 MIME 与体积
//   设置页可达性（下拉归组 + 状态行）
//   首次 ensure()：下载进度递增 → ready
//   probe()：只读 IndexedDB 即命中（不联网）
//   speak()：产出 RIFF/WAVE 且字节数正常的音频
//   二次 ensure()：立即 ready（缓存生效）
//   移动端视口下状态行文案与类名
//
// 用法：node scripts/verify-offline-tts.mjs
//       SKIP_DOWNLOAD=1 跳过 60MB 下载段（只验资产与页面可达性）
import { spawn } from 'node:child_process';
import { existsSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = join(root, 'server', 'server.js');
const PORT = process.env.VOTT_PORT || '3189';
const DEBUG_PORT = '9678';
const BASE = `http://127.0.0.1:${PORT}/`;
const OUT = join(root, 'browser-shots', 'offline-tts');
mkdirSync(OUT, { recursive: true });

const SKIP_DOWNLOAD = process.env.SKIP_DOWNLOAD === '1';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const MOBILE_UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

const VOICE = '__offline_piper_us_lessac__';
const VENDOR = [
  ['piper_worker.js', /javascript/],
  ['piper_phonemize.js', /javascript/],
  ['piper_phonemize.wasm', /application\/wasm/],
  ['piper_phonemize.data', /octet-stream|application\/octet-stream/],
  ['ort.min.js', /javascript/],
  // 单线程 SIMD 构建：APK 下拿不到 SharedArrayBuffer，多线程那份不发布
  ['ort-wasm-simd.wasm', /application\/wasm/],
];

let pass = 0, fail = 0;
const check = (ok, label, extra) => {
  if (ok) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.log(`  ✗ ${label}${extra ? '  → ' + extra : ''}`); }
};
const section = t => console.log(`\n── ${t} ──`);

function findChrome() {
  // 优先 Playwright 缓存的 Chromium；没有时回退系统 Chrome/Edge，
  // 保证验收脚本在没装 Playwright 的机器上也能跑（2026-11-22）。
  const cache = join(process.env.LOCALAPPDATA ?? '', 'ms-playwright');
  if (existsSync(cache)) {
    for (const d of readdirSync(cache)) {
      if (!/^chromium-\d+/.test(d)) continue;
      for (const c of [join(cache, d, 'chrome-win64', 'chrome.exe'), join(cache, d, 'chrome-win', 'chrome.exe')]) {
        if (existsSync(c)) return c;
      }
    }
  }
  const roots = [process.env.ProgramFiles, process.env['ProgramFiles(x86)'], process.env.LOCALAPPDATA]
    .filter(Boolean);
  for (const root of roots) {
    for (const c of [
      join(root, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      join(root, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    ]) {
      if (existsSync(c)) return c;
    }
  }
  return null;
}

class Cdp {
  constructor(url) { this.url = url; this.ws = null; this.id = 0; this.pending = new Map(); }
  async open() {
    this.ws = new WebSocket(this.url);
    await new Promise((res, rej) => { this.ws.addEventListener('open', res, { once: true }); this.ws.addEventListener('error', rej); });
    this.ws.addEventListener('message', ev => this._onMsg(ev.data));
  }
  _onMsg(raw) {
    const m = JSON.parse(raw);
    if (m.id && this.pending.has(m.id)) { const { res, rej } = this.pending.get(m.id); this.pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); }
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((res, rej) => { this.pending.set(id, { res, rej }); this.ws.send(JSON.stringify({ id, method, params })); });
  }
  close() { try { this.ws.close(); } catch (e) {} }
}

async function evalJs(cdp, expr) {
  const r = await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'eval error');
  return r.result.value;
}

async function shot(cdp, name) {
  const r = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  writeFileSync(join(OUT, name + '.png'), Buffer.from(r.data, 'base64'));
}

let server, chrome, profile, cdp;
try {
  section('启动 server 与 Chromium');
  server = spawn(process.execPath, [ENTRY], { cwd: dirname(ENTRY), env: { ...process.env, PORT, HOST: '127.0.0.1' }, stdio: 'ignore' });
  let up = false;
  for (let i = 0; i < 80 && !up; i++) { await sleep(250); try { up = (await fetch(BASE + 'api/health')).ok; } catch (e) {} }
  check(up, `server 已在 ${BASE} 就绪`);
  if (!up) throw new Error('server 启动失败');

  const chromePath = findChrome();
  if (!chromePath) throw new Error('未找到 Chromium（ms-playwright 缓存）');
  profile = join(process.env.TEMP ?? '', 'ms-vott-' + Date.now());
  mkdirSync(profile, { recursive: true });
  // --mute-audio + 放行自动播放：无头环境没有声卡，不放行的话 audio.play() 会被拒绝，
  // 看起来像"合成失败"，其实是播放策略拦的。
  chrome = spawn(chromePath, [
    `--user-data-dir=${profile}`, `--remote-debugging-port=${DEBUG_PORT}`,
    '--no-first-run', '--no-proxy-server', '--no-default-browser-check', '--headless=new', '--disable-gpu',
    '--mute-audio', '--autoplay-policy=no-user-gesture-required',
    '--window-size=390,844', 'about:blank',
  ], { stdio: 'ignore' });

  let target = null;
  for (let i = 0; i < 60 && !target; i++) {
    await sleep(250);
    try {
      const list = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json();
      target = list.find(t => t.type === 'page');
    } catch (e) {}
  }
  if (!target) throw new Error('Chromium 未就绪');
  cdp = new Cdp(target.webSocketDebuggerUrl);
  await cdp.open();
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Network.enable');
  await cdp.send('Network.setUserAgentOverride', { userAgent: MOBILE_UA });
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true });
  check(true, 'Chromium + CDP 已连接（390×844 移动视口）');

  section('① 运行时资产：MIME 与体积');
  await cdp.send('Page.navigate', { url: BASE });
  await sleep(3500);
  // 注意：必须是 `(async () => { ...; return JSON.stringify(x); })()`，
  // 不能写成 `JSON.stringify((async () => ... )())` —— 后者 stringify 的是 Promise 对象，
  // 得到 "{}" 就返回了，awaitPromise 根本没东西可等，所有断言会以"missing"假红。
  const assets = JSON.parse(await evalJs(cdp, `(async () => {
    const out = {};
    for (const f of ${JSON.stringify(VENDOR.map(v => v[0]))}) {
      const r = await fetch('assets/vendor/piper/' + f);
      out[f] = { ok: r.ok, status: r.status, type: (r.headers.get('content-type') || '').toLowerCase(), len: Number(r.headers.get('content-length')) || 0 };
    }
    return JSON.stringify(out);
  })()`));
  for (const [f, re] of VENDOR) {
    const a = assets[f];
    check(!!a && a.ok && re.test(a.type), `${f} 可访问且 MIME 正确（${a ? a.type : 'n/a'}）`, a ? `status=${a.status} type=${a.type}` : 'missing');
    check(!!a && a.len > 0, `${f} 体积 ${a ? (a.len / 1024).toFixed(0) : '?'} KB`, a && a.len === 0 ? 'content-length 缺失（进度条会永远停在 0）' : '');
  }

  section('② 设置页可达性');
  const page = JSON.parse(await evalJs(cdp, `JSON.stringify((function () {
    window.app.showTab('settings');
    window.app.bindSettings();
    var sel = document.getElementById('voice-select');
    var opt = sel && sel.querySelector('option[value="${VOICE}"]');
    var g = opt && opt.closest('optgroup');
    var box = document.getElementById('offline-voice-status');
    return {
      hasOpt: !!opt,
      group: g ? g.getAttribute('label') : null,
      optText: opt ? opt.textContent : '',
      hasBox: !!box,
      boxText: box ? box.textContent.trim() : '',
      boxClass: box ? box.className : '',
      hasBtn: !!document.getElementById('btn-offline-voice-download'),
      offlineApi: !!window.OfflineTTS,
      isOffline: window.OfflineTTS ? window.OfflineTTS.isOfflineVoice('${VOICE}') : false,
      notOffline: window.OfflineTTS ? window.OfflineTTS.isOfflineVoice('__local_piper_us_lessac__') : true,
    };
  })())`));
  check(page.offlineApi, 'window.OfflineTTS 已挂载');
  check(page.isOffline === true, `isOfflineVoice 认得 ${VOICE}`);
  check(page.notOffline === false, '__local_* 不被误判为内置离线音');
  check(page.hasOpt, '下拉里有内置离线音选项');
  check(!!page.group && page.group.includes('内置离线') && page.group.includes('手机可用'),
    `归组正确：「${page.group}」`, page.group || 'no optgroup');
  check(page.hasBox && page.boxText.length > 0, `状态行有文案：「${page.boxText}」`);
  check(page.hasBtn, '下载按钮存在');
  await shot(cdp, '01-settings-status');

  if (!SKIP_DOWNLOAD) {
    section('③ 首次 ensure()：下载 60MB 并缓存');
    await evalJs(cdp, `(function () {
      window.__ov = { prog: [], done: false, err: null, t0: Date.now() };
      window.OfflineTTS.ensure('${VOICE}', function (p) { window.__ov.prog.push(p); })
        .then(function () { window.__ov.done = true; }, function (e) { window.__ov.err = String((e && e.message) || e); });
      return 'started';
    })()`);

    let st = null, last = -1, ticks = 0;
    for (let i = 0; i < 180; i++) {          // 最多 6 分钟（首轮要经服务端从上游取 60MB）
      await sleep(2000); ticks++;
      st = JSON.parse(await evalJs(cdp, `JSON.stringify({ ov: window.__ov, st: window.OfflineTTS.status() })`));
      const p = Math.round((st.st.progress || 0) * 100);
      if (p !== last) { last = p; process.stdout.write(`\r     下载进度 ${p}%   `); }
      if (st.ov.done || st.ov.err) break;
    }
    process.stdout.write('\n');
    check(!!st && st.ov.done === true, `ensure() 完成（status=${st && st.st.status}，用时约 ${ticks * 2}s）`, st && st.ov.err);
    check(!!st && st.st.status === 'ready', '状态机落到 ready', st && JSON.stringify(st.st));
    check(!!st && st.ov.prog.length > 0, `下载进度回调触发 ${st ? st.ov.prog.length : 0} 次（不是静默等死）`);
    const prog = st ? st.ov.prog : [];
    const rising = prog.length > 1 && prog[prog.length - 1] >= prog[0];
    check(prog.length < 2 || rising, '进度单调不回退', JSON.stringify(prog.slice(0, 5)));

    section('④ probe()：只读 IndexedDB 即命中（离线可用性的判据）');
    const probe = await evalJs(cdp, `window.OfflineTTS.probe().then(function (r) { return JSON.stringify({ hit: r, st: window.OfflineTTS.status() }); })`);
    const pr = JSON.parse(probe);
    check(pr.hit === true, 'probe() 命中本地缓存', JSON.stringify(pr));

    section('⑤ speak()：合成出真实 WAV');
    const sp = JSON.parse(await evalJs(cdp, `(async () => {
      // 合成产物只在 play() 里变成 blob: URL，没有对外暴露。这里拦住
      // URL.createObjectURL 直接把 Blob 本体留下 —— 不能靠 fetch(audio.src)：
      // 音频播完会 revokeObjectURL，等取证时 URL 已经失效，fetch 抛
      // "Failed to fetch"，看着像没合成出来，其实是取证太晚（真踩过）。
      var wavs = [];
      var origCreate = URL.createObjectURL.bind(URL);
      URL.createObjectURL = function (b) {
        var u = origCreate(b);
        try { if (b && b.type === 'audio/x-wav') wavs.push(b); } catch (e) {}
        return u;
      };
      var created = [];
      var Orig = window.Audio;
      window.Audio = function (src) { var a = new Orig(src); created.push(a); return a; };
      window.Audio.prototype = Orig.prototype;
      var res = { synthesized: false, played: false, err: null };
      await new Promise(function (done) {
        var settled = false;
        var finish = function () { if (!settled) { settled = true; done(); } };
        window.OfflineTTS.speak('Hello, this is an offline voice test.', {
          rate: 1,
          onend: function () { res.played = true; finish(); },
          onerror: function (e) { res.err = String((e && e.message) || e); finish(); }
        });
        var iv = setInterval(function () {
          if (!wavs.length) return;
          clearInterval(iv);
          wavs[0].arrayBuffer().then(function (buf) {
            var u8 = new Uint8Array(buf), dec = new TextDecoder();
            res.synthesized = true;
            res.riff = dec.decode(u8.subarray(0, 4));
            res.wave = dec.decode(u8.subarray(8, 12));
            res.bytes = u8.length;
          })['catch'](function (e) { res.fetchErr = String(e); })
            .then(function () { setTimeout(finish, 8000); });  // 再给播放留点时间
        }, 200);
        setTimeout(function () { clearInterval(iv); finish(); }, 120000);
      });
      window.Audio = Orig;
      URL.createObjectURL = origCreate;
      res.audioCount = created.length;
      res.st = window.OfflineTTS.status().status;
      return JSON.stringify(res);
    })()`));
    check(sp.synthesized === true, 'worker 合成出了音频 Blob', sp.fetchErr || sp.err || JSON.stringify(sp));
    check(sp.riff === 'RIFF' && sp.wave === 'WAVE', `产物是合法 WAV（${sp.riff}/${sp.wave}）`, JSON.stringify(sp));
    check((sp.bytes || 0) > 5000, `WAV 体积 ${(sp.bytes || 0)} 字节（不是空文件）`);
    check(sp.err === null, `播放未报错${sp.played ? '（onend 已触发）' : ''}`, sp.err || '');

    section('⑥ 二次 ensure()：立即 ready（缓存生效 = 之后离线）');
    const again = JSON.parse(await evalJs(cdp, `(async () => {
      var t0 = Date.now();
      var r = await window.OfflineTTS.ensure('${VOICE}');
      return JSON.stringify({ r: r, ms: Date.now() - t0, st: window.OfflineTTS.status().status });
    })()`));
    check(again.r === true && again.st === 'ready', '二次 ensure 直接命中缓存', JSON.stringify(again));
    check(again.ms < 3000, `耗时 ${again.ms}ms（若还在走网络不会这么快）`);

    section('⑦ 移动端视口下状态行');
    await evalJs(cdp, `window.app.showTab('settings'); window.app.bindSettings(); 'ok'`);
    await sleep(600);
    const st2 = JSON.parse(await evalJs(cdp, `JSON.stringify((function () {
      var box = document.getElementById('offline-voice-status');
      var r = box.getBoundingClientRect();
      var cs = getComputedStyle(box);
      return { text: box.textContent.trim(), cls: box.className, w: Math.round(r.width), fs: cs.fontSize, visible: r.width > 0 && r.height > 0 };
    })())`));
    check(st2.visible, `状态行在 390px 视口可见（宽 ${st2.w}px，字号 ${st2.fs}）`);
    check(/已就绪/.test(st2.text), `文案反映就绪：「${st2.text}」`);
    check(/offline-voice-ok/.test(st2.cls), `类名 ${st2.cls}`);
    check(parseFloat(st2.fs) >= 12, `字号 ${st2.fs} 不小于 12px`);
    await shot(cdp, '02-settings-ready-mobile');

    section('⑧ stop() 可安全调用');
    const stopped = await evalJs(cdp, `(function () { try { window.OfflineTTS.stop(); return 'ok'; } catch (e) { return String(e); } })()`);
    check(stopped === 'ok', 'stop() 不抛错', stopped);
  } else {
    console.log('  （SKIP_DOWNLOAD=1，已跳过下载/合成段）');
  }
} catch (e) {
  fail++;
  console.log('\n✗ 验收脚本异常：' + (e && e.stack || e));
} finally {
  try { cdp && cdp.close(); } catch (e) {}
  try { chrome && chrome.kill(); } catch (e) {}
  try { server && server.kill(); } catch (e) {}
  console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
  console.log(`截图：${OUT}`);
  process.exit(fail ? 1 : 0);
}

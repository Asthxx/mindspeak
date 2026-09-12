// verify-async-dcl.mjs - 能力测试弹窗慢修复的浏览器级验证
// 3G 限速（400KB/s / 300ms）+ 手机视口 + 全新 profile（无 SW/缓存）
// 指标：DOMContentLoaded 时刻 / 自动弹窗时刻 / 首页按钮可交互 / 测评守卫自动进 quiz
import { spawn } from 'node:child_process';
import { existsSync, readdirSync, mkdirSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, extname, join, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = join(root, 'server', 'server.js');
const PORT = process.env.VERIFY_PORT || '3000';
const DEBUG_PORT = process.env.VERIFY_DEBUG_PORT || '9444';
const BASE = `http://127.0.0.1:${PORT}/`;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const THROTTLE = { offline: false, latency: 300, downloadThroughput: 400 * 1024, uploadThroughput: 400 * 1024 };

function findChrome() {
  const cache = join(process.env.LOCALAPPDATA ?? '', 'ms-playwright');
  if (!existsSync(cache)) return null;
  for (const d of readdirSync(cache)) {
    if (!/^chromium-\d+/.test(d)) continue;
    for (const cand of [join(cache, d, 'chrome-win64', 'chrome.exe'), join(cache, d, 'chrome-win', 'chrome.exe')]) {
      if (existsSync(cand)) return cand;
    }
  }
  return null;
}

class Cdp {
  constructor(url) { this.url = url; this.ws = null; this.id = 0; this.pending = new Map(); this.handlers = new Map(); }
  async open() {
    this.ws = new WebSocket(this.url);
    await new Promise((res, rej) => {
      this.ws.addEventListener('open', res, { once: true });
      this.ws.addEventListener('error', () => rej(new Error('ws connect failed: ' + this.url)), { once: true });
    });
    this.ws.addEventListener('message', ev => this._onMsg(ev.data));
  }
  _onMsg(raw) {
    const msg = JSON.parse(raw);
    if (msg.id && this.pending.has(msg.id)) {
      const { res, rej } = this.pending.get(msg.id);
      this.pending.delete(msg.id);
      if (msg.error) rej(new Error(msg.error.message)); else res(msg.result);
      return;
    }
    if (msg.method) {
      const cbs = this.handlers.get(msg.method);
      if (cbs) cbs.forEach(cb => { try { cb(msg.params, msg.sessionId); } catch (e) {} });
    }
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id;
    return new Promise((res, rej) => {
      this.pending.set(id, { res, rej });
      this.ws.send(JSON.stringify({ id, method, params: params || {}, ...(sessionId ? { sessionId } : {}) }));
    });
  }
  on(method, cb) { if (!this.handlers.has(method)) this.handlers.set(method, []); this.handlers.get(method).push(cb); }
  close() { try { this.ws.close(); } catch (e) {} }
}

// dist 静态服务（node:http + zlib gzip），模拟 GitHub Pages 线上（单一 bundle.js + 自动压缩）
function serveDist() {
  const dir = resolve(root, 'dist');
  if (!existsSync(dir)) return null;
  const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg' };
  const gzExt = /\.(js|css|html|json|webmanifest|svg|txt)$/;
  const srv = createServer((req, res) => {
    let p;
    try { p = decodeURIComponent((req.url || '/').split('?')[0]); } catch (e) { p = '/'; }
    if (p.endsWith('/')) p += 'index.html';
    const fp = resolve(dir, '.' + p);
    if (fp !== dir && !fp.startsWith(dir + '\\') && !fp.startsWith(dir + '/')) { res.writeHead(403); res.end(); return; }
    let data;
    try { data = readFileSync(fp); } catch (e) { res.writeHead(404); res.end('nf'); return; }
    let out = data;
    const finish = () => {
      res.writeHead(200, { 'Content-Type': MIME[extname(fp)] || 'application/octet-stream', 'Content-Length': out.length, 'Cache-Control': 'no-store' });
      res.end(out);
    };
    if (/gzip/.test(req.headers['accept-encoding'] || '') && gzExt.test(p) && data.length > 1024) {
      zlib.gzip(data, (err, g) => { if (!err && g.length < data.length) { out = g; res.setHeader('Content-Encoding', 'gzip'); } finish(); });
    } else finish();
  });
  return new Promise(res => srv.listen(0, '127.0.0.1', () => res(srv)));
}

async function main() {
  // 1. server：源码版（server/server.js）或 dist 静态服务（VERIFY_DIST=1，贴近线上单 bundle）
  let server = null, base = BASE;
  if (process.env.VERIFY_DIST === '1') {
    server = await serveDist();
    if (!server) { console.log('FAIL dist 目录不存在，请先 node build.js'); process.exit(1); }
    base = `http://127.0.0.1:${server.address().port}/`;
  } else {
    let reuse = false;
    try { reuse = (await fetch(`http://127.0.0.1:${PORT}/api/health`)).ok; } catch (e) {}
    if (!reuse) {
      server = spawn(process.execPath, [ENTRY], { cwd: dirname(ENTRY), env: { ...process.env, PORT, HOST: '127.0.0.1' }, stdio: ['ignore', 'pipe', 'pipe'] });
      let up = false;
      for (let i = 0; i < 40 && !up; i++) { await sleep(250); try { up = (await fetch(`http://127.0.0.1:${PORT}/api/health`)).ok; } catch (e) {} }
      if (!up) { console.log('FAIL server not up'); server.kill(); process.exit(1); }
    }
  }

  // 2. chromium fresh profile
  const chromePath = findChrome();
  if (!chromePath) { console.log('FAIL no chromium'); server?.kill(); process.exit(1); }
  const profile = join(process.env.TEMP ?? '', 'ms-verify-' + Date.now());
  mkdirSync(profile, { recursive: true });
  const chrome = spawn(chromePath, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${profile}`, '--window-size=390,844', '--lang=zh-CN', 'about:blank'],
    { stdio: ['ignore', 'pipe', 'pipe'] });
  let dbg = null;
  for (let i = 0; i < 40 && !dbg; i++) { await sleep(200); try { const r = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`); dbg = await r.json(); } catch (e) {} }
  if (!dbg?.webSocketDebuggerUrl) { console.log('FAIL chromium debug unreachable'); chrome.kill(); server?.kill(); process.exit(1); }

  const cdp = new Cdp(dbg.webSocketDebuggerUrl);
  await cdp.open();
  await cdp.send('Target.setDiscoverTargets', { discover: true });
  const { targetInfos } = await cdp.send('Target.getTargets');
  const page = targetInfos.find(t => t.type === 'page');
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId: page.targetId, flatten: true });
  const S = sessionId;

  await cdp.send('Runtime.enable', {}, S);
  await cdp.send('Network.enable', {}, S);
  await cdp.send('Page.enable', {}, S);
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true }, S);
  await cdp.send('Network.emulateNetworkConditions', THROTTLE, S);

  const evalJs = async (expr) => {
    const r = await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, S);
    return r.exceptionDetails ? null : r.result?.value;
  };

  // 3. 导航（冷启动计时从 navigate 命令发出开始）
  const t0 = Date.now();
  await cdp.send('Page.navigate', { url: base }, S);

  // 轮询：弹窗出现时刻 / 词库就绪时刻；DCL 在滚动确认后取 performance timing
  let modalAt = null, modalId = null, libMs = null;
  for (let i = 0; i < 400 && (modalAt === null || libMs === null); i++) {
    await sleep(100);
    if (modalAt === null) {
      const m = await evalJs(`(() => { const list = Array.from(document.querySelectorAll('[id$="-modal"]')).filter(x => x && !x.classList.contains('hidden')); return list.length ? list[0].id : null; })()`);
      if (m) { modalAt = Date.now() - t0; modalId = m; }
    }
    if (libMs === null) {
      const ready = await evalJs(`typeof WORD_LIBRARY !== 'undefined' && !!WORD_LIBRARY.categories && WORD_LIBRARY.categories.length > 0`);
      if (ready) libMs = Date.now() - t0;
    }
  }

  // DCL：readyState 离开 loading 后取 timing（domContentLoadedEventEnd 是历史时刻，不受 load 影响）
  let dclMs2 = null;
  for (let i = 0; i < 100; i++) {
    const rs = await evalJs('document.readyState');
    if (rs !== 'loading') { dclMs2 = await evalJs('Math.round(performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart)'); break; }
    await sleep(100);
  }
  if (!dclMs2) dclMs2 = await evalJs('Math.round(performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart)');

  // 资源瀑布诊断：耗时资源排序
  const resDiag = await evalJs(`performance.getEntriesByType('resource').map(r => ({ n: r.name.split('/').pop(), s: Math.round(r.startTime), d: Math.round(r.duration) })).sort((a,b)=>b.d-a.d).slice(0,12)`);

  // 4. 按钮可交互：关闭引导弹窗（模拟用户点完引导）+ 点「能力测评」入口打开 assessment-modal
  const opened = await evalJs(`(async () => { const ob = document.getElementById('onboarding-modal'); if (ob) ob.classList.add('hidden'); const btn = document.getElementById('btn-assessment'); if (!btn) return 'NO_BTN'; btn.click(); await new Promise(r => setTimeout(r, 150)); const m = document.getElementById('assessment-modal'); if (!m) return 'NO_MODAL'; return m.classList.contains('hidden') ? 'HIDDEN' : 'OPEN'; })()`);

  // 5. 守卫验证：点「开始测评」→ 词库已就绪应直接进 quiz；若未就绪由守卫自动重试
  let quizAt = null;
  if (opened === 'OPEN') {
    await evalJs(`document.getElementById('btn-assessment-start').click()`);
    for (let i = 0; i < 60 && quizAt === null; i++) {
      await sleep(200);
      const inQuiz = await evalJs(`(() => { const q = document.querySelector('.assess-view-quiz'); return q && q.style.display !== 'none' ? true : false; })()`);
      if (inQuiz) { quizAt = Date.now() - t0; }
    }
  }

  const totalLib = await evalJs(`typeof WORD_LIBRARY !== 'undefined' && WORD_LIBRARY.categories ? WORD_LIBRARY.categories.map(c=>c.words?c.words.length:0).reduce((a,b)=>a+b,0) : 0`);

  // 6. 报告
  console.log('=== 3G 限速冷启动验证（修复后）===');
  console.log('DOMContentLoaded(timing):  ' + (dclMs2 === null ? '未观测到' : dclMs2 + ' ms'));
  console.log('自动弹窗(立即出现):        ' + (modalAt === null ? '未观测到' : modalAt + ' ms  → ' + modalId));
  console.log('词库数据就绪(WORD_LIBRARY): ' + (libMs === null ? '超时未就绪' : libMs + ' ms  → ' + totalLib + ' 词'));
  console.log('首页按钮打开测评弹窗:      ' + opened);
  console.log('「开始测评」进入 quiz:      ' + (quizAt === null ? '未进入(失败)' : quizAt + ' ms 自动进入(守卫/直通)'));
  console.log('--- 资源瀑布 Top12 (start,dur) ---');
  if (resDiag && resDiag.length) resDiag.forEach(r => console.log('  ' + r.n + '  +' + r.s + 'ms  ' + r.d + 'ms'));
  else console.log('  (无 resource timing)');

  const pass = dclMs2 !== null && dclMs2 < 6000 && modalAt !== null && modalAt < 5000 && opened === 'OPEN' && quizAt !== null;
  console.log('RESULT: ' + (pass ? 'PASS' : 'FAIL') + (dclMs2 < 6000 ? '' : ' (DCL 未达到预期)'));

  cdp.close(); try { chrome.kill(); } catch (e) {} try { if (server && server.kill) server.kill(); if (server && server.close) server.close(); } catch (e) {}
  process.exit(pass ? 0 : 1);
}

main().catch(e => { console.error('脚本错误:', e); process.exit(1); });
// probe-loading-costs.mjs — 候选异步路径的真实耗时实测（P1-1 前置）
//
// 为什么要先测：骨架屏只该出现在「确实存在可观测等待」的地方。
// 对一条 2ms 的同步渲染强塞骨架，制造的是闪烁而不是秩序感——那属于负优化，
// 而且会同时污染 aria-busy 语义（读屏用户会听到一个根本不存在的等待）。
// 本脚本用真实 Chromium 量出每个候选路径的耗时，作为「加 / 不加」的判断依据。
//
// 用法：node scripts/probe-loading-costs.mjs
// 输出：词库就绪窗口 + 各候选路径耗时中位数（ms）。阈值见 SLOW_MS。
import { spawn } from 'node:child_process';
import { existsSync, readdirSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = join(root, 'server', 'server.js');
const PORT = process.env.PL_PORT || '3131';
const DEBUG_PORT = '9471';
const BASE = `http://127.0.0.1:${PORT}/`;
const SLOW_MS = 80;   // 超过这个值，用户能感知到"顿一下"，值得上加载态
const sleep = ms => new Promise(r => setTimeout(r, ms));

function findChrome() {
  const cache = join(process.env.LOCALAPPDATA ?? '', 'ms-playwright');
  if (!existsSync(cache)) return null;
  for (const d of readdirSync(cache)) {
    if (!/^chromium-\d+/.test(d)) continue;
    for (const c of [join(cache, d, 'chrome-win64', 'chrome.exe'), join(cache, d, 'chrome-win', 'chrome.exe')]) {
      if (existsSync(c)) return c;
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
      this.ws.addEventListener('error', () => rej(new Error('ws fail')), { once: true });
    });
    this.ws.addEventListener('message', ev => this._onMsg(ev.data));
  }
  _onMsg(raw) {
    const m = JSON.parse(raw);
    if (m.id && this.pending.has(m.id)) {
      const { res, rej } = this.pending.get(m.id);
      this.pending.delete(m.id);
      m.error ? rej(new Error(m.error.message)) : res(m.result);
      return;
    }
    if (m.method && this.handlers.has(m.method)) this.handlers.get(m.method).forEach(cb => { try { cb(m.params); } catch (e) {} });
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

async function evalJs(cdp, S, expr, awaitPromise = true) {
  const r = await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise }, S);
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'eval error');
  return r.result.value;
}

// 每个候选路径独立测量：重复 N 次取中位数（避开冷启动噪声）。
// bench 是同步的（这些渲染路径都是同步 CPU 密集），n 次取中位即可。
const PROBE = `(function () {
  var bench = function (name, fn, n) {
    if (typeof fn !== 'function') return { skip: true, why: name + ' 不可用' };
    var xs = [];
    for (var i = 0; i < n; i++) {
      var t = performance.now();
      try { fn(); } catch (e) { return { error: String(e) }; }
      xs.push(performance.now() - t);
    }
    xs.sort(function (a, b) { return a - b; });
    return { median: +xs[Math.floor(xs.length / 2)].toFixed(2), min: +xs[0].toFixed(2), max: +xs[xs.length - 1].toFixed(2), n: n };
  };

  var out = { globals: {} };
  ['app', 'DashboardModule', 'AssessmentEngine', 'AiCoachModule', 'AiChatModule', 'DailyPlanModule'].forEach(function (k) {
    out.globals[k] = typeof window[k] !== 'undefined';
  });

  // 1. 测评生成试卷——报告点名的"整页过场"候选，最可能是真长任务
  var E = window.AssessmentEngine;
  out.createPaper = bench('createPaper', E && E.createPaper && function () {
    E.createPaper({ includePron: false });
  }, 5);
  if (E && E.createPaper) {
    try { out.paperQuestions = E.createPaper({ includePron: false }).questions.length; } catch (e) {}
  }

  // 2. 首页统计：computeStats 重算（词库引用变了才会重算，这里强制绕缓存不好做，故测 render）
  var D = window.DashboardModule;
  out.dashboardRender = bench('dashboardRender', D && D.render && function () { D.render(); }, 5);

  // 3. AI 建议渲染
  var C = window.AiCoachModule;
  out.aiCoachRender = bench('aiCoachRender', C && C.render && function () { C.render(); }, 5);

  // 4. 背单词重置一屏（renderWordList / renderCard 的最重入口）
  try {
    var W = window.app && window.app.wordModule;
    out.wordRender = bench('wordRender', W && W.renderCard && function () { W.renderCard(); }, 5);
  } catch (e) { out.wordRender = { error: String(e) }; }

  return out;
})()`;

let server, chrome, profile, cdp;
try {
  server = spawn(process.execPath, [ENTRY], {
    cwd: dirname(ENTRY), env: { ...process.env, PORT, HOST: '127.0.0.1' }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let up = false;
  for (let i = 0; i < 60 && !up; i++) {
    await sleep(250);
    try { up = (await fetch(`http://127.0.0.1:${PORT}/api/health`)).ok; } catch (e) {}
  }
  if (!up) throw new Error('server 启动失败');

  const chromePath = findChrome();
  if (!chromePath) throw new Error('未找到 Chromium');
  profile = join(process.env.TEMP ?? '', 'ms-probe-' + Date.now());
  mkdirSync(profile, { recursive: true });
  chrome = spawn(chromePath, [
    `--user-data-dir=${profile}`, `--remote-debugging-port=${DEBUG_PORT}`,
    '--no-first-run', '--no-default-browser-check', '--headless=new',
    '--disable-gpu', '--window-size=1440,900', 'about:blank',
  ], { stdio: ['ignore', 'pipe', 'pipe'] });

  let target = null;
  for (let i = 0; i < 60 && !target; i++) {
    await sleep(250);
    try {
      const list = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json();
      target = list.find(t => t.type === 'page');
    } catch (e) {}
  }
  if (!target) throw new Error('CDP 未就绪');

  cdp = new Cdp(target.webSocketDebuggerUrl);
  await cdp.open();
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');

  const navP = new Promise(res => { cdp.on('Page.loadEventFired', () => res()); });
  await cdp.send('Page.navigate', { url: BASE });
  await Promise.race([navP, sleep(20000)]);

  // 词库就绪窗口：这是唯一跨网络/跨设备的真实等待
  const libReady = await evalJs(cdp, null, `(async () => {
    const deadline = performance.now() + 20000;
    while (performance.now() < deadline) {
      const lib = window.WORD_LIBRARY;
      if (lib && lib.categories && lib.categories.length > 0) {
        let w = 0; lib.categories.forEach(c => { w += (c.words ? c.words.length : 0); });
        if (w > 0) return { ready: true, atMs: +performance.now().toFixed(0), words: w };
      }
      await new Promise(r => setTimeout(r, 50));
    }
    return { ready: false };
  })()`);

  console.log('\n=== 词库异步加载窗口 ===');
  if (libReady.ready) {
    console.log(`  词库就绪于页面加载后 ${libReady.atMs} ms（${libReady.words} 词）`);
    console.log(`  ${libReady.atMs > 500 ? '>> 存在真实等待窗口，值得上骨架/过场' : '>> 几乎同步就绪，本地环境无感知等待'}`);
  } else {
    console.log('  词库 20 秒内未就绪（异常）');
  }

  const perf = await evalJs(cdp, null, PROBE);
  console.log('\n=== 全局可用 ===');
  console.log('  ' + Object.entries(perf.globals).map(([k, v]) => `${k}=${v}`).join('  '));

  console.log(`\n=== 候选路径耗时（中位数 ms，阈值 ${SLOW_MS}） ===`);
  for (const [k, v] of Object.entries(perf)) {
    if (k === 'globals' || k === 'paperQuestions') continue;
    if (!v || typeof v !== 'object') { console.log(`  ${k.padEnd(18)} ${String(v)}`); continue; }
    if (v.skip) { console.log(`  ${k.padEnd(18)} 跳过（${v.why}）`); continue; }
    if (v.error) { console.log(`  ${k.padEnd(18)} ERROR: ${v.error}`); continue; }
    const verdict = v.median > SLOW_MS ? '慢 → 值得上加载态' : '快 → 不该加骨架';
    console.log(`  ${k.padEnd(18)} median ${String(v.median).padStart(7)}ms  (min ${v.min} / max ${v.max})   ${verdict}`);
  }
  if (perf.paperQuestions != null) console.log(`  ${'试卷题数'.padEnd(18)} ${perf.paperQuestions}`);
} finally {
  try { chrome?.kill(); } catch (e) {}
  try { server?.kill(); } catch (e) {}
  try { cdp?.close(); } catch (e) {}
  await sleep(300);
  try { if (profile) rmSync(profile, { recursive: true, force: true }); } catch (e) {}
}

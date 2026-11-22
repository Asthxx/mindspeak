// verify-loading.mjs — P1-1 三态加载体系的真实浏览器验收
//
// 为什么不能用单测代替：骨架是"看起来对不对"的东西。jsdom 没有布局、没有动画、
// 没有真实的 9.9MB 词库加载窗口，单测只能证明 DOM 结构，证明不了
// 「用户在等待期真的看到了骨架，而不是看到了 0 / 占位词」。
//
// 本脚本用 CDP 把词库脚本（data/all-data.js 等）的响应人为延迟 3 秒，
// 造出一个可观测的等待窗口（本地实测 603ms 太短，肉眼截不到），然后断言：
//   1. 等待期：#dash-total 与 #word-card 上有骨架 + aria-busy=true
//   2. 等待期：#dash-total 显示的是骨架而不是会把人误导的 0
//   3. 等待期：#current-word 仍可被 JS 取到（防止骨架实现搬走 DOM）
//   4. 就绪后：骨架被收掉，真实词库总量出现，aria-busy 清除
//   5. 降低动效偏好下：骨架不扫光
//
// 用法：node scripts/verify-loading.mjs
import { spawn } from 'node:child_process';
import { existsSync, readdirSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = join(root, 'server', 'server.js');
const PORT = process.env.VL_PORT || '3133';
const DEBUG_PORT = '9473';
const BASE = `http://127.0.0.1:${PORT}/`;
const OUT = join(root, 'audit-shots');
const LIB_DELAY_MS = 3000;   // 人为拉长词库窗口，让骨架可被观测/截图
const sleep = ms => new Promise(r => setTimeout(r, ms));

let pass = 0, fail = 0;
const check = (ok, label, extra) => {
  if (ok) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.log(`  ✗ ${label}${extra ? '  → ' + extra : ''}`); }
};

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
  constructor(url) { this.url = url; this.ws = null; this.id = 0; this.pending = new Map(); this.handlers = new Map(); }
  async open() {
    this.ws = new WebSocket(this.url);
    await new Promise((res, rej) => { this.ws.addEventListener('open', res, { once: true }); this.ws.addEventListener('error', rej, { once: true }); });
    this.ws.addEventListener('message', ev => this._onMsg(ev.data));
  }
  _onMsg(raw) {
    const m = JSON.parse(raw);
    if (m.id && this.pending.has(m.id)) { const { res, rej } = this.pending.get(m.id); this.pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); return; }
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

const SNAP = `JSON.stringify({
  libReady: !!(window.Loading && window.Loading.libraryReady()),
  onboardingGone: (function(){
    var m = document.getElementById('onboarding-modal');
    return !m || m.classList.contains('hidden') || getComputedStyle(m).display === 'none';
  })(),
  dashHasSkel: !!document.querySelector('#dash-total [data-skeleton]'),
  dashBusy: document.getElementById('dash-total')?.getAttribute('aria-busy') || '',
  dashText: (document.getElementById('dash-total')?.textContent || '').trim().slice(0, 20),
  cardHasSkel: !!document.querySelector('#word-card [data-skeleton]'),
  cardBusy: document.getElementById('word-card')?.getAttribute('aria-busy') || '',
  currentWordAlive: !!document.getElementById('current-word'),
  skelAnim: (function(){
    var l = document.querySelector('.skeleton-line');
    return l ? getComputedStyle(l).animationName : 'none';
  })(),
})`;

// 切到背单词页（骨架长在 #word-card 里，不切页看不到）
async function gotoWordTab(cdp) {
  await evalJs(cdp, null, `(function(){
    try {
      if (typeof showTab === 'function') { showTab('word'); return 'showTab'; }
      var el = document.querySelector('[data-tab="word"], [data-page="word"], #nav-word');
      if (el) { el.click(); return 'click'; }
      return 'noop';
    } catch (e) { return String(e); }
  })()`);
  await sleep(500);
}

// 局部放大：断言过了不等于长得对，必须真的看得见
async function clipShot(cdp, selector, file, pad = 12) {
  const box = await evalJs(cdp, null, `(function(){
    var el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return null;
    var r = el.getBoundingClientRect();
    return JSON.stringify({ x: Math.max(0, r.x - ${pad}), y: Math.max(0, r.y - ${pad}), w: r.width + ${pad} * 2, h: r.height + ${pad} * 2 });
  })()`);
  if (!box) return false;
  const b = JSON.parse(box);
  if (b.w < 4 || b.h < 4) return false;
  const { data } = await cdp.send('Page.captureScreenshot', {
    format: 'png', fromSurface: true,
    clip: { x: b.x, y: b.y, width: b.w, height: b.h, scale: 2 },
  });
  writeFileSync(join(OUT, file), Buffer.from(data, 'base64'));
  return true;
}

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
  profile = join(process.env.TEMP ?? '', 'ms-vloading-' + Date.now());
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

  // 人为延迟词库脚本：把本地 603ms 的窗口拉长到可观测
  await cdp.send('Fetch.enable', { patterns: [
    { urlPattern: '*all-data.js*' },
    { urlPattern: '*words-topup.js*' },
    { urlPattern: '*all-extra.js*' },
  ] });
  cdp.on('Fetch.requestPaused', async p => {
    setTimeout(async () => {
      try { await cdp.send('Fetch.continueRequest', { requestId: p.requestId }); } catch (e) {}
    }, LIB_DELAY_MS);
  });

  console.log('\n=== P1-1 三态加载体系 · 真实浏览器验收 ===');
  console.log(`（词库脚本响应人为延迟 ${LIB_DELAY_MS}ms，制造可观测的等待窗口）\n`);

  // 第一次导航只为落「已完成首访引导」标记：全新 profile 会弹引导弹窗把内容整块盖住，
  // 截图就变成了弹窗的截图（本脚本初版就栽在这）。
  await cdp.send('Page.navigate', { url: BASE });
  await sleep(4000);
  await evalJs(cdp, null, `(function(){ try { DataStore.setProgress('onboarding_done', true); return true; } catch(e){ return String(e); } })()`);

  // 第二次导航才是被观测的那次
  await cdp.send('Page.navigate', { url: BASE });
  await sleep(1600);   // > appearMs(200)，此时骨架应当已显形

  console.log('[等待期] 骨架应当已显形');
  const during = JSON.parse(await evalJs(cdp, null, SNAP));
  check(during.onboardingGone, '首访引导已跳过（否则截图会被弹窗盖住）');
  check(during.libReady === false, '等待期词库确实未就绪（窗口构造成功）');
  check(during.dashHasSkel, '「词库总量」位置显示骨架');
  check(during.dashBusy === 'true', '「词库总量」宿主带 aria-busy=true');
  check(!/^\d+$/.test(during.dashText), '「词库总量」不再显示会把"加载中"误导成"没词"的 0', `实际文本: "${during.dashText}"`);
  check(during.cardHasSkel, '背单词卡区显示骨架');
  check(during.cardBusy === 'true', '背单词卡区带 aria-busy=true');
  check(during.currentWordAlive, '骨架未搬走 DOM：#current-word 仍可取到（等待期点朗读/翻页不会崩）');

  const { data: shotDuring } = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  writeFileSync(join(OUT, 'loading-during.png'), Buffer.from(shotDuring, 'base64'));
  await clipShot(cdp, '#dash-total', 'loading-during-stats.png', 24);
  await gotoWordTab(cdp);
  await clipShot(cdp, '#word-card', 'loading-during-card.png');

  // 等词库落地
  await evalJs(cdp, null, `(async () => {
    const L = window.Loading;
    if (L && L.libraryReady()) return true;
    await new Promise(r => setTimeout(r, ${LIB_DELAY_MS + 12000}));
    return !!(L && L.libraryReady());
  })()`);
  await sleep(1500);

  console.log('\n[就绪后] 骨架应当被收掉，真值补上');
  const after = JSON.parse(await evalJs(cdp, null, SNAP));
  check(after.libReady === true, '词库已就绪');
  check(!after.dashHasSkel, '「词库总量」骨架已收掉');
  check(after.dashBusy === '', 'aria-busy 已清除');
  check(/^\d+$/.test(after.dashText), '「词库总量」显示真实数值', `实际文本: "${after.dashText}"`);
  check(Number(after.dashText) > 0, '真实数值 > 0（说明读到的是全量词库而非内置小词库）');
  check(!after.cardHasSkel, '背单词卡区骨架已收掉');
  check(after.currentWordAlive, '#current-word 仍然存在');

  const { data: shotAfter } = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  writeFileSync(join(OUT, 'loading-after.png'), Buffer.from(shotAfter, 'base64'));
  await clipShot(cdp, '#word-card', 'loading-after-card.png');

  console.log('\n[降低动效] 骨架不应扫光');
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await cdp.send('Fetch.enable', { patterns: [
    { urlPattern: '*all-data.js*' }, { urlPattern: '*words-topup.js*' }, { urlPattern: '*all-extra.js*' },
  ] });
  await cdp.send('Page.navigate', { url: BASE });
  await sleep(1600);
  const rm = JSON.parse(await evalJs(cdp, null, SNAP));
  check(rm.skelAnim === 'none', 'prefers-reduced-motion 下骨架静止', `animation-name: ${rm.skelAnim}`);

  console.log(`\n===== 结果：${pass} 通过 / ${fail} 失败 =====`);
  console.log('截图：audit-shots/loading-during*.png（等待期）· audit-shots/loading-after*.png（就绪后）');
} finally {
  try { chrome?.kill(); } catch (e) {}
  try { server?.kill(); } catch (e) {}
  try { cdp?.close(); } catch (e) {}
  await sleep(300);
  try { if (profile) rmSync(profile, { recursive: true, force: true }); } catch (e) {}
}
if (fail > 0) process.exitCode = 1;

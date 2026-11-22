// verify-routing.mjs — P1-7 轻量 hash 路由的真实浏览器验收
//
// 为什么必须真机验：hash / history 的语义只有真实浏览器才成立。
// jsdom 里 history.back() 的行为不可信——本脚本初版曾写进两条 jsdom 用例，
// 它们"立刻就通过了"，说明测的只是 jsdom 的实现而不是我们的代码。已删除。
//
// 本脚本用真实 Chromium 验证：
//   1. 切页写入 hash；hashchange 反向驱动页面
//   2. 刷新保持在当前页
//   3. 深链（直接打开 #/settings）直达目标页
//   4. 未知 hash 不把界面带偏
//   5. 浏览器后退 / 前进与页面导航打通
//
// 用法：node scripts/verify-routing.mjs
import { spawn } from 'node:child_process';
import { existsSync, readdirSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = join(root, 'server', 'server.js');
const PORT = process.env.VR_PORT || '3135';
const DEBUG_PORT = '9475';
const BASE = `http://127.0.0.1:${PORT}/`;
const OUT = join(root, 'audit-shots');
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
  hash: location.hash,
  tab: (window.app && window.app.currentTab) || '',
  activePage: (document.querySelector('.page.active') || {}).id || '',
  onboardingGone: (function(){
    var m = document.getElementById('onboarding-modal');
    return !m || m.classList.contains('hidden') || getComputedStyle(m).display === 'none';
  })(),
})`;

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
  profile = join(process.env.TEMP ?? '', 'ms-vroute-' + Date.now());
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

  console.log('\n=== P1-7 轻量 hash 路由 · 真实浏览器验收 ===\n');

  // 首次访问只为落「已完成首访引导」标记（全新 profile 会弹引导盖住页面）
  await cdp.send('Page.navigate', { url: BASE });
  await sleep(4000);
  await evalJs(cdp, null, `(function(){ try { DataStore.setProgress('onboarding_done', true); return true; } catch(e){ return String(e); } })()`);

  // ---- 1. 切页写 hash ----
  await cdp.send('Page.navigate', { url: BASE });
  await sleep(5000);
  let s = JSON.parse(await evalJs(cdp, null, SNAP));
  check(s.onboardingGone, '首访引导已跳过');
  check(s.tab === 'home' && s.hash === '#/home', '初始落在首页且 hash 同步', `tab=${s.tab} hash=${s.hash}`);

  await evalJs(cdp, null, `window.app.showTab('word'); 'ok'`);
  await sleep(600);
  s = JSON.parse(await evalJs(cdp, null, SNAP));
  check(s.hash === '#/word', '切页写入 hash', `hash=${s.hash}`);
  check(s.activePage === 'page-word', '目标页已激活', `active=${s.activePage}`);

  // ---- 2. 刷新保持 ----
  await cdp.send('Page.navigate', { url: BASE + '#/word' });
  await sleep(5000);
  s = JSON.parse(await evalJs(cdp, null, SNAP));
  check(s.tab === 'word', '刷新后仍停在原来的页面', `tab=${s.tab} hash=${s.hash}`);

  // ---- 3. 深链 ----
  // 注意：只改 hash 的 navigate 是**同文档跳转**，浏览器不会重载，应用也不会重新
  // 启动——那样测到的是 hashchange 分支而不是"深链打开"。必须带一个 query 参数
  // 强制真实文档加载（本脚本初版就是这么漏的，深链那条其实没验到）。
  await cdp.send('Page.navigate', { url: BASE + '?deeplink=1#/settings' });
  await sleep(5000);
  s = JSON.parse(await evalJs(cdp, null, SNAP));
  check(s.tab === 'settings' && s.activePage === 'page-settings', '深链直达目标页', `tab=${s.tab} active=${s.activePage}`);

  // ---- 4. 未知 hash ----
  await cdp.send('Page.navigate', { url: BASE + '?unknown=1#/not-a-real-page' });
  await sleep(5000);
  s = JSON.parse(await evalJs(cdp, null, SNAP));
  check(s.tab === 'home' && s.activePage === 'page-home', '未知 hash 不会把界面带偏', `tab=${s.tab} active=${s.activePage}`);

  // ---- 5. 浏览器前进 / 后退（此前是"已知限制"，现已打通）----
  // 原来切页一律 replaceState（不压历史条目），浏览器后退会直接退出应用。
  // 之所以那么做，是因为抽屉会 pushState 一个 {msDrawer} 占位、showTab 里还有一次
  // 异步的 history.back() 去回收它 —— 两者与 hashchange 反向驱动会互相打断
  // （实测"切了又弹回去"）。
  // 现在的做法：抽屉占位在切页时被**同步改写**成本页条目（不再 back()），
  // 冲突根源消失，于是切页可以放心地 pushState，浏览器前进/后退天然打通。
  //
  // 注意：这里必须断言"退到了**上一页**"，只断言"有激活页"是空跑
  // （本脚本上一版正是这么写的，改实现前它照样通过）。
  await cdp.send('Page.navigate', { url: BASE + '?nav=1' });
  await sleep(5000);
  await evalJs(cdp, null, `window.app.showTab('word'); 'ok'`);
  await sleep(700);
  await evalJs(cdp, null, `window.app.showTab('practice'); 'ok'`);
  await sleep(700);
  await evalJs(cdp, null, `window.app.showTab('settings'); 'ok'`);
  await sleep(700);
  const before = JSON.parse(await evalJs(cdp, null, SNAP));
  check(before.tab === 'settings', '前置状态：已依次切到设置页', `tab=${before.tab} hash=${before.hash}`);

  await evalJs(cdp, null, `history.back(); 'ok'`);
  await sleep(1200);
  const back1 = JSON.parse(await evalJs(cdp, null, SNAP));
  check(back1.tab === 'practice' && back1.activePage === 'page-practice',
    '浏览器后退一步回到「练习」页', `tab=${back1.tab} active=${back1.activePage} hash=${back1.hash}`);

  await evalJs(cdp, null, `history.back(); 'ok'`);
  await sleep(1200);
  const back2 = JSON.parse(await evalJs(cdp, null, SNAP));
  check(back2.tab === 'word' && back2.activePage === 'page-word',
    '再后退一步回到「背单词」页', `tab=${back2.tab} active=${back2.activePage} hash=${back2.hash}`);

  await evalJs(cdp, null, `history.forward(); 'ok'`);
  await sleep(1200);
  const fwd = JSON.parse(await evalJs(cdp, null, SNAP));
  check(fwd.tab === 'practice' && fwd.activePage === 'page-practice',
    '浏览器前进一步回到「练习」页', `tab=${fwd.tab} active=${fwd.activePage} hash=${fwd.hash}`);

  // 后退到栈底后不能把界面带崩（走到应用外的条目时也要有正常的页面）
  await evalJs(cdp, null, `history.back(); 'ok'`);
  await sleep(800);
  await evalJs(cdp, null, `history.back(); 'ok'`);
  await sleep(1200);
  const bottom = JSON.parse(await evalJs(cdp, null, SNAP));
  check(!!bottom.activePage && !!bottom.tab, '退到栈底后界面仍然完整（不会空白/错乱）',
    `tab=${bottom.tab} active=${bottom.activePage}`);

  const { data: shot } = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  writeFileSync(join(OUT, 'routing-final.png'), Buffer.from(shot, 'base64'));

  console.log(`\n===== 结果：${pass} 通过 / ${fail} 失败 =====`);
} finally {
  try { chrome?.kill(); } catch (e) {}
  try { server?.kill(); } catch (e) {}
  try { cdp?.close(); } catch (e) {}
  await sleep(300);
  try { if (profile) rmSync(profile, { recursive: true, force: true }); } catch (e) {}
}
if (fail > 0) process.exitCode = 1;

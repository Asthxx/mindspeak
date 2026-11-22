// verify-home.mjs — 首页优化后的定向验证（真实 Chromium + 真实服务）
// 校验点：控制台无错误 / h1 与跳转链接 / 统计卡 4 张且布局列数正确 /
//         进度条 aria 属性随渲染更新 / 快捷入口 12 个 / 移动端断点布局 / 装饰 SVG 已隐藏
import { spawn } from 'node:child_process';
import { existsSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = join(root, 'server', 'server.js');
const PORT = process.env.VERIFY_PORT || '3100';
const DEBUG_PORT = process.env.VERIFY_DEBUG_PORT || '9444';
const BASE = `http://localhost:${PORT}/`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const errors = [];

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
    await new Promise((res, rej) => {
      this.ws.addEventListener('open', res, { once: true });
      this.ws.addEventListener('error', () => rej(new Error('ws failed')), { once: true });
    });
    this.ws.addEventListener('message', ev => {
      const m = JSON.parse(ev.data);
      if (m.id && this.pending.has(m.id)) {
        const { res, rej } = this.pending.get(m.id); this.pending.delete(m.id);
        m.error ? rej(new Error(m.error.message)) : res(m.result); return;
      }
      if (m.method) {
        (this.handlers.get(m.method) || []).forEach(cb => { try { cb(m.params); } catch (e) {} });
        if (m.method === 'Runtime.exceptionThrown') errors.push('[exception] ' + (m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || ''));
        if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push('[console.error] ' + JSON.stringify(m.params.args?.map(a => a.value ?? a.description).slice(0, 2)));
      }
    });
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

const server = spawn(process.execPath, [ENTRY], {
  cwd: dirname(ENTRY), env: { ...process.env, PORT, HOST: '127.0.0.1' }, stdio: ['ignore', 'pipe', 'pipe'],
});
let up = false;
for (let i = 0; i < 40 && !up; i++) {
  await sleep(250);
  try { up = (await fetch(`http://127.0.0.1:${PORT}/api/health`)).ok; } catch (e) {}
}
if (!up) { console.log('FAIL: server 未启动'); server.kill(); process.exit(1); }

const chromePath = findChrome();
const profile = join(process.env.TEMP ?? '', 'ms-verify-' + Date.now());
mkdirSync(profile, { recursive: true });
const chrome = spawn(chromePath, [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${profile}`,
  '--window-size=1440,900', '--lang=zh-CN', 'about:blank'
], { stdio: ['ignore', 'pipe', 'pipe'] });

let dbg = null;
for (let i = 0; i < 40 && !dbg; i++) {
  await sleep(250);
  try { dbg = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`)).json(); } catch (e) {}
}
const cdp = new Cdp(dbg.webSocketDebuggerUrl);
await cdp.open();
const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
await cdp.send('Runtime.enable', {}, sessionId);
await cdp.send('Page.enable', {}, sessionId);
await cdp.send('Page.navigate', { url: BASE }, sessionId);
await sleep(5000);
// 关闭新手引导（onboarding 弹窗会挡住首页），标记完成后再刷新
await evalJs(`localStorage.setItem('onboarding_done','true'); localStorage.setItem('daily_goal','10'); 'ok'`);
await cdp.send('Page.navigate', { url: BASE }, sessionId);
await sleep(5000);

async function evalJs(expr) {
  const r = await cdp.send('Runtime.evaluate', {
    expression: expr, returnByValue: true, awaitPromise: true,
  }, sessionId);
  if (r.exceptionDetails) return { __error: r.exceptionDetails.text };
  return r.result.value;
}

const desktop = await evalJs(`(() => {
  const q = s => document.querySelector(s);
  const grid = q('.dash-stat-grid');
  const cs = grid ? getComputedStyle(grid) : null;
  return {
    h1: q('h1.logo') ? q('h1.logo').textContent.trim() : null,
    h1Count: document.querySelectorAll('h1').length,
    skipLink: !!q('a.skip-link[href="#main-content"]'),
    mainTabbable: q('#main-content') ? q('#main-content').getAttribute('tabindex') : null,
    navLabel: q('nav.sidebar') ? q('nav.sidebar').getAttribute('aria-label') : null,
    ariaCurrent: document.querySelector('.nav-btn[aria-current="page"]')?.dataset.tab || null,
    statCards: document.querySelectorAll('.dash-stat-card').length,
    statGridCols: cs ? cs.gridTemplateColumns.split(' ').length : null,
    cardWidths: [...document.querySelectorAll('.dash-stat-card')].map(c => Math.round(c.getBoundingClientRect().width)),
    onboardingGone: !document.querySelector('.onboarding-modal, #onboarding, .ob-modal') || getComputedStyle(document.querySelector('#modal-onboarding, .onboarding-overlay') || document.body).display === 'none',
    dashDate: q('#dash-date')?.textContent || '',
    quickBtns: document.querySelectorAll('#dash-quick .dash-quick-btn').length,
    tips: document.querySelectorAll('#dash-tips li').length,
    progressbars: [...document.querySelectorAll('[role="progressbar"]')].map(p => ({
      label: p.getAttribute('aria-label'), now: p.getAttribute('aria-valuenow')
    })),
    decorativeSvgsHidden: [...document.querySelectorAll('svg.icon')].every(s => s.getAttribute('aria-hidden') === 'true'),
    svgTotal: document.querySelectorAll('svg.icon').length,
    navGroupItems: document.querySelectorAll('.nav-group-items').length,
    androidCssLoaded: !!document.querySelector('link[href*="android.css"]'),
  };
})()`);

// 移动端断点
await cdp.send('Emulation.setDeviceMetricsOverride', {
  width: 390, height: 844, deviceScaleFactor: 2, mobile: true,
}, sessionId);
await sleep(1200);
const mobile = await evalJs(`(() => {
  const grid = document.querySelector('.dash-stat-grid');
  const card = document.querySelector('.dash-stat-card');
  const btn = document.querySelector('#dash-quick .dash-quick-btn');
  const r = el => { const b = el.getBoundingClientRect(); return { w: Math.round(b.width), h: Math.round(b.height) }; };
  return {
    cols: grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').length : null,
    card: card ? r(card) : null,
    quickBtn: btn ? r(btn) : null,
    overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
    scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth,
  };
})()`);

async function shot(name, w, h, mobileMode) {
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: !!mobileMode }, sessionId);
  await sleep(800);
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' }, sessionId);
  writeFileSync(join(root, 'test-screenshots', name), Buffer.from(data, 'base64'));
}
await shot('home-verify-desktop.png', 1440, 900, false);
await shot('home-verify-mobile.png', 390, 844, true);

console.log('=== 桌面端 ==='); console.log(JSON.stringify(desktop, null, 2));
console.log('=== 移动端 390px ==='); console.log(JSON.stringify(mobile, null, 2));
console.log('=== 控制台错误 ==='); console.log(errors.length ? errors.slice(0, 10) : '(none)');

cdp.close(); chrome.kill(); server.kill();
process.exit(0);

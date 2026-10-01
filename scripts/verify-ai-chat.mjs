// verify-ai-chat.mjs — AI 助手对话区阶段1（纯样式）落地后的定向验证
// 真实 Chromium + 真实服务，不做 jsdom 模拟：
//   1. 消息区不再是写死的 360px，随视口自适应且仍是唯一滚动容器
//   2. 用户气泡对比度浅/深双主题均达 WCAG AA 4.5:1（原浅 4.05:1 / 深 2.50:1）
//   3. AI 气泡文字不再落到 --text-base（该令牌是 1rem 字号，当颜色用会静默降级为继承色）
//   4. 移动端 390px 无横向滚动，消息间距收到 12px
//   5. 控制台零错误
// 运行：node scripts/verify-ai-chat.mjs
import { spawn } from 'node:child_process';
import { existsSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = join(root, 'server', 'server.js');
const PORT = process.env.VERIFY_PORT || '3101';
const DEBUG_PORT = process.env.VERIFY_DEBUG_PORT || '9445';
const BASE = `http://localhost:${PORT}/`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const errors = [];
const results = [];

function check(name, pass, detail) {
  results.push({ name, pass, detail });
}

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
if (!chromePath) { console.log('FAIL: 未找到 Chromium'); server.kill(); process.exit(1); }
const profile = join(process.env.TEMP ?? '', 'ms-verify-ai-' + Date.now());
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

async function evalJs(expr) {
  const r = await cdp.send('Runtime.evaluate', {
    expression: expr, returnByValue: true, awaitPromise: true,
  }, sessionId);
  if (r.exceptionDetails) return { __error: r.exceptionDetails.text };
  return r.result.value;
}

// 页面里通用的对比度工具（WCAG 2.1 相对亮度）
const CONTRAST_HELPER = `
window.__lum = function (str) {
  var m = String(str).match(/[\\d.]+/g) || [];
  var c = m.slice(0, 3).map(function (v) {
    var s = Number(v) / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
window.__ratio = function (a, b) {
  var l1 = window.__lum(a), l2 = window.__lum(b);
  var hi = Math.max(l1, l2), lo = Math.min(l1, l2);
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
};
`;

async function boot() {
  await cdp.send('Page.navigate', { url: BASE }, sessionId);
  await sleep(4500);
  await evalJs(`localStorage.setItem('onboarding_done','true'); localStorage.setItem('daily_goal','10'); 'ok'`);
  await cdp.send('Page.navigate', { url: BASE }, sessionId);
  await sleep(4500);
  await evalJs(CONTRAST_HELPER);
}

await boot();

// AI 对话卡片在 #page-ai（不是首页），先切过去；否则整页 display:none，量到的高度全是 0
const tabSwitched = await evalJs(`(() => {
  const b = document.querySelector('.nav-btn[data-tab="ai"]') || document.querySelector('.bottom-nav-btn[data-tab="ai"]');
  if (b) b.click();
  return !!b;
})()`);
if (!tabSwitched) { console.log('FAIL: 找不到 AI 页导航按钮'); }
await sleep(1500);

// ---- 发一条消息，让对话区有用户气泡 + AI 气泡 ----
await evalJs(`(() => {
  const el = document.querySelector('.ai-chat-card');
  if (el) el.scrollIntoView({ block: 'center' });
  const input = document.querySelector('#ai-chat-input');
  input.value = '解释单词 abandon';
  document.querySelector('#ai-chat-send').click();
  return 'sent';
})()`);
await sleep(2500);

const PROBE = `
(() => {
  const msgs = document.querySelector('#ai-chat-msgs');
  const user = document.querySelector('.ai-msg-user .ai-msg-bubble');
  const ai = document.querySelector('.ai-msg-ai .ai-msg-bubble');
  const cs = msgs ? getComputedStyle(msgs) : null;
  const cu = user ? getComputedStyle(user) : null;
  const ca = ai ? getComputedStyle(ai) : null;
  return {
    msgCount: document.querySelectorAll('#ai-chat-msgs .ai-msg').length,
    userMsgs: document.querySelectorAll('#ai-chat-msgs .ai-msg-user').length,
    botMsgs: document.querySelectorAll('#ai-chat-msgs .ai-msg-ai').length,
    theme: document.documentElement.getAttribute('data-theme'),
    msgs: cs ? { gap: cs.rowGap, overflowY: cs.overflowY, maxHeight: cs.maxHeight,
                 clientH: msgs.clientHeight, scrollH: msgs.scrollHeight } : null,
    userBubble: cu ? { bg: cu.backgroundColor, color: cu.color, padding: cu.padding,
                       ratio: window.__ratio(cu.backgroundColor, cu.color) } : null,
    aiBubble: ca ? { bg: ca.backgroundColor, color: ca.color, padding: ca.padding,
                     ratio: window.__ratio(ca.backgroundColor, ca.color) } : null,
    cardH: document.querySelector('.ai-chat-card') ? document.querySelector('.ai-chat-card').offsetHeight : null,
    cardDisplay: document.querySelector('.ai-chat-card') ? getComputedStyle(document.querySelector('.ai-chat-card')).display : null,
    pageActive: document.querySelector('.ai-chat-card') ? !!document.querySelector('.ai-chat-card').closest('.page.active') : null,
    overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
  };
})()`;

// ============ 1. 浅色 · 桌面 1440 ============
const light = await evalJs(PROBE);
check('浅色·对话已渲染（用户+AI 各至少 1 条）', light.userMsgs >= 1 && light.botMsgs >= 1, `user=${light.userMsgs} bot=${light.botMsgs}`);
check('浅色·AI 页已激活且卡片有实际高度', light.pageActive === true && light.cardH > 0, `active=${light.pageActive} cardH=${light.cardH}`);
check('浅色·消息区有可视高度', light.msgs && light.msgs.clientH > 0, `clientH=${light.msgs?.clientH} maxH=${light.msgs?.maxHeight}`);
check('浅色·用户气泡对比度 ≥4.5:1', light.userBubble && light.userBubble.ratio >= 4.5, `${light.userBubble?.ratio}:1  ${light.userBubble?.color} on ${light.userBubble?.bg}`);
check('浅色·AI 气泡对比度 ≥4.5:1', light.aiBubble && light.aiBubble.ratio >= 4.5, `${light.aiBubble?.ratio}:1  ${light.aiBubble?.color} on ${light.aiBubble?.bg}`);
check('浅色·AI 气泡文字色不是继承降级（应等于 --text #1A1A1A）',
  light.aiBubble && light.aiBubble.color === 'rgb(26, 26, 26)', light.aiBubble?.color);
check('浅色·消息区为滚动容器', light.msgs && light.msgs.overflowY === 'auto', light.msgs?.overflowY);
check('浅色·消息间距 16px', light.msgs && light.msgs.gap === '16px', light.msgs?.gap);
check('浅色·消息区高度不再写死 360px', light.msgs && light.msgs.maxHeight !== '360px', light.msgs?.maxHeight);
check('浅色·气泡内边距 12px 16px', light.userBubble && light.userBubble.padding === '12px 16px', light.userBubble?.padding);

async function shot(name, w, h, mobileMode) {
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: !!mobileMode }, sessionId);
  await sleep(600);
  await evalJs(`(() => { const el = document.querySelector('.ai-chat-card'); if (el) el.scrollIntoView({ block: 'center' }); return 1; })()`);
  await sleep(400);
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' }, sessionId);
  writeFileSync(join(root, 'test-screenshots', name), Buffer.from(data, 'base64'));
}
await shot('ai-chat-light-desktop.png', 1440, 900, false);

// ============ 2. 深色 · 桌面 1440 ============
await evalJs(`document.documentElement.setAttribute('data-theme','dark'); 'dark'`);
await sleep(900);
const dark = await evalJs(PROBE);
check('深色·用户气泡对比度 ≥4.5:1', dark.userBubble && dark.userBubble.ratio >= 4.5, `${dark.userBubble?.ratio}:1  ${dark.userBubble?.color} on ${dark.userBubble?.bg}`);
check('深色·AI 气泡对比度 ≥4.5:1', dark.aiBubble && dark.aiBubble.ratio >= 4.5, `${dark.aiBubble?.ratio}:1  ${dark.aiBubble?.color} on ${dark.aiBubble?.bg}`);
check('深色·AI 气泡文字色为深色主题正文 #E8E8E8',
  dark.aiBubble && dark.aiBubble.color === 'rgb(232, 232, 232)', dark.aiBubble?.color);
await shot('ai-chat-dark-desktop.png', 1440, 900, false);
await evalJs(`document.documentElement.setAttribute('data-theme','light'); 'light'`);

// ============ 3. 移动端 390 ============
await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true }, sessionId);
await sleep(1200);
const mobile = await evalJs(PROBE);
check('移动端·无横向滚动', mobile.overflowX === false, `scrollW>innerW = ${mobile.overflowX}`);
check('移动端·消息间距收到 12px', mobile.msgs && mobile.msgs.gap === '12px', mobile.msgs?.gap);
check('移动端·气泡内边距 10px 12px', mobile.userBubble && mobile.userBubble.padding === '10px 12px', mobile.userBubble?.padding);
check('移动端·用户气泡对比度 ≥4.5:1', mobile.userBubble && mobile.userBubble.ratio >= 4.5, `${mobile.userBubble?.ratio}:1`);
await shot('ai-chat-mobile.png', 390, 844, true);

// ============ 输出 ============
console.log('=== 浅色 1440 ==='); console.log(JSON.stringify(light, null, 2));
console.log('=== 深色 1440 ==='); console.log(JSON.stringify(dark, null, 2));
console.log('=== 移动端 390 ==='); console.log(JSON.stringify(mobile, null, 2));
console.log('=== 断言 ===');
let failed = 0;
for (const r of results) {
  if (!r.pass) failed++;
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}${r.detail !== undefined ? '  → ' + r.detail : ''}`);
}
console.log('=== 控制台错误 ==='); console.log(errors.length ? errors.slice(0, 10) : '(none)');
console.log(`\n${results.length - failed}/${results.length} 项通过`);

cdp.close(); chrome.kill(); server.kill();
process.exit(failed || errors.length ? 1 : 0);

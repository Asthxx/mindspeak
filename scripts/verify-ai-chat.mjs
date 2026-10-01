// verify-ai-chat.mjs — AI 助手对话区（v2 工作区）真实 Chromium 定向验证
// 覆盖：三栏骨架与断点 / 结构化回答卡 / 例句单独朗读 / 历史栏（新对话·搜索）/
//       设置抽屉 / 输入区（textarea 自适应·字数·发送态） / 浅深双主题对比度 / 控制台零错误
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
const check = (name, pass, detail) => results.push({ name, pass, detail });

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
  const r = await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, sessionId);
  if (r.exceptionDetails) return { __error: r.exceptionDetails.text + ' ' + (r.exceptionDetails.exception?.description || '') };
  return r.result.value;
}

const HELPERS = `
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
  return Math.round((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05) * 100) / 100;
};
window.__type = function (sel, text) {
  var el = document.querySelector(sel);
  if (!el) return 'no-el';
  el.value = text;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  return 'ok';
};
`;

async function boot() {
  await cdp.send('Page.navigate', { url: BASE }, sessionId);
  await sleep(4500);
  await evalJs(`localStorage.setItem('onboarding_done','true'); localStorage.setItem('daily_goal','10'); 'ok'`);
  await cdp.send('Page.navigate', { url: BASE }, sessionId);
  await sleep(4500);
  await evalJs(HELPERS);
  // AI 对话在 #page-ai（不是首页），先切过去，否则整页 display:none，量到的尺寸全是 0
  await evalJs(`(() => {
    var b = document.querySelector('.nav-btn[data-tab="ai"]') || document.querySelector('.bottom-nav-btn[data-tab="ai"]');
    if (b) b.click();
    return !!b;
  })()`);
  await sleep(1500);
}

await boot();

// ---------- 1. 骨架与断点 ----------
await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }, sessionId);
await sleep(800);
const shell = await evalJs(`(() => {
  var ws = document.querySelector('.ai-workspace');
  var cs = ws ? getComputedStyle(ws) : null;
  var ctx = document.querySelector('#ai-context-rail');
  return {
    workspace: !!ws,
    cols: cs ? cs.gridTemplateColumns.split(' ').length : null,
    historyVisible: !!document.querySelector('#ai-history-rail') && getComputedStyle(document.querySelector('#ai-history-rail')).display !== 'none',
    contextVisible: !!ctx && getComputedStyle(ctx).display !== 'none',
    wsHeight: ws ? Math.round(ws.getBoundingClientRect().height) : null,
    scrollBox: !!document.querySelector('#ai-msg-scroll'),
    textarea: document.querySelector('#ai-chat-input') ? document.querySelector('#ai-chat-input').tagName : null,
    drawer: !!document.querySelector('#ai-settings-drawer'),
  };
})()`);
check('骨架·工作区存在且有确定高度', shell.workspace && shell.wsHeight > 300, `h=${shell.wsHeight}`);
check('桌面 1440 为三栏', shell.cols === 3, `grid 列数=${shell.cols}`);
check('桌面·历史栏与上下文栏均可见', shell.historyVisible && shell.contextVisible, `hist=${shell.historyVisible} ctx=${shell.contextVisible}`);
check('输入区改为 textarea', shell.textarea === 'TEXTAREA', shell.textarea);
check('消息区为独立滚动容器', shell.scrollBox === true, `#ai-msg-scroll=${shell.scrollBox}`);
check('设置抽屉存在', shell.drawer === true, String(shell.drawer));

// ---------- 2. 发送并验证结构化回答卡 ----------
await evalJs(`window.__type('#ai-chat-input', '解释单词 abandon')`);
await sleep(300);
const sendEnabled = await evalJs(`!document.querySelector('#ai-chat-send').disabled`);
check('输入后发送键可用', sendEnabled === true, `可发送=${sendEnabled}`);
await evalJs(`document.querySelector('#ai-chat-send').click()`);
await sleep(2500);

const card = await evalJs(`(() => {
  var box = document.querySelector('#ai-chat-msgs');
  var ai = document.querySelectorAll('#ai-chat-msgs .ai-msg-ai');
  var last = ai[ai.length - 1];
  var user = document.querySelector('#ai-chat-msgs .ai-msg-user .ai-msg-bubble');
  var cu = user ? getComputedStyle(user) : null;
  return {
    msgCount: box.querySelectorAll('.ai-msg').length,
    answerCards: document.querySelectorAll('#ai-chat-msgs .ai-answer').length,
    lead: last && last.querySelector('.ai-answer-lead') ? last.querySelector('.ai-answer-lead').textContent.trim() : null,
    exCards: document.querySelectorAll('#ai-chat-msgs .ai-ex-card').length,
    exPlay: document.querySelectorAll('#ai-chat-msgs .ai-ex-card .play[data-speak]').length,
    actions: document.querySelectorAll('#ai-chat-msgs .ai-act').length,
    metaHasTime: !!document.querySelector('#ai-chat-msgs .ai-msg-meta'),
    userRatio: cu ? window.__ratio(cu.backgroundColor, cu.color) : null,
  };
})()`);
check('回答渲染为结构化卡片', card.answerCards >= 1, `.ai-answer×${card.answerCards}`);
check('结论行含单词', !!card.lead && /abandon/i.test(card.lead), card.lead);
check('例句卡可单独朗读', card.exCards >= 1 && card.exPlay >= 1, `卡片×${card.exCards} 朗读×${card.exPlay}`);
check('行动按钮已渲染', card.actions >= 1, `×${card.actions}`);
check('消息带角色名与时间', card.metaHasTime === true, String(card.metaHasTime));
check('浅色·用户气泡对比度 ≥4.5:1', card.userRatio >= 4.5, `${card.userRatio}:1`);

// 真点一次例句朗读，确认链路不报错
await evalJs(`(() => { var b = document.querySelector('#ai-chat-msgs .ai-ex-card .play'); if (b) b.click(); return !!b; })()`);
await sleep(600);

// ---------- 3. 输入区：自适应 / 字数 / 空态禁用 ----------
const composer1 = await evalJs(`(() => {
  var ta = document.querySelector('#ai-chat-input');
  return { h1: Math.round(ta.getBoundingClientRect().height), maxLen: ta.getAttribute('maxlength') };
})()`);
await evalJs(`window.__type('#ai-chat-input', '第一行\\n第二行\\n第三行')`);
await sleep(300);
const composer2 = await evalJs(`(() => {
  var ta = document.querySelector('#ai-chat-input');
  return {
    h2: Math.round(ta.getBoundingClientRect().height),
    counter: (document.querySelector('#ai-counter') || {}).textContent || '',
    sendDisabled: document.querySelector('#ai-chat-send').disabled,
  };
})()`);
check('textarea 随内容增高', composer2.h2 > composer1.h1, `${composer1.h1}px → ${composer2.h2}px`);
check('字数计数随输入更新', /\d+ \/ 1000/.test(composer2.counter), composer2.counter);
check('maxlength 提到 1000', composer1.maxLen === '1000', composer1.maxLen);
await evalJs(`window.__type('#ai-chat-input', '')`);
await sleep(300);
check('清空后发送键禁用', (await evalJs(`document.querySelector('#ai-chat-send').disabled`)) === true, '');

// ---------- 4. 设置抽屉 ----------
await evalJs(`document.querySelector('#ai-settings-toggle').click()`);
await sleep(700);
const drawer = await evalJs(`(() => {
  var d = document.querySelector('#ai-settings-drawer');
  return {
    open: d.classList.contains('open'),
    hidden: d.getAttribute('aria-hidden'),
    x: Math.round(d.getBoundingClientRect().left),
    switches: d.querySelectorAll('.ai-switch').length,
    clearBtn: !!d.querySelector('.ai-clear-chat'),
    scrim: document.querySelector('#ai-scrim').classList.contains('show'),
  };
})()`);
check('抽屉可打开', drawer.open === true && drawer.hidden === 'false', `open=${drawer.open} aria-hidden=${drawer.hidden}`);
check('抽屉滑入视口内', drawer.x < 1440 && drawer.x > 900, `left=${drawer.x}`);
check('抽屉内 4 个开关', drawer.switches === 4, `×${drawer.switches}`);
check('清空对话入口在抽屉内', drawer.clearBtn === true, String(drawer.clearBtn));
check('遮罩已显示', drawer.scrim === true, String(drawer.scrim));
await evalJs(`document.querySelector('#ai-sw-structured').click()`);
await sleep(400);
const swOff = await evalJs(`document.querySelector('#ai-sw-structured').getAttribute('aria-checked')`);
check('开关可切换并写入 aria-checked', swOff === 'false', `aria-checked=${swOff}`);
await evalJs(`document.querySelector('#ai-sw-structured').click()`);
await sleep(300);
await evalJs(`document.querySelector('#ai-drawer-close').click()`);
await sleep(600);
check('抽屉可关闭', (await evalJs(`document.querySelector('#ai-settings-drawer').classList.contains('open')`)) === false, '');

// ---------- 5. 历史栏 ----------
const hist1 = await evalJs(`document.querySelectorAll('#ai-hist-list .ai-hist-item').length`);
await evalJs(`document.querySelector('#ai-new-chat').click()`);
await sleep(900);
const hist2 = await evalJs(`(() => ({
  items: document.querySelectorAll('#ai-hist-list .ai-hist-item').length,
  msgs: document.querySelectorAll('#ai-chat-msgs .ai-msg').length,
}))()`);
check('历史栏列出会话', hist1 >= 1, `×${hist1}`);
check('新对话后历史条目增加', hist2.items >= hist1, `${hist1} → ${hist2.items}`);
check('新对话后消息区回到欢迎语', hist2.msgs >= 1 && hist2.msgs <= 2, `×${hist2.msgs}`);
await evalJs(`window.__type('#ai-hist-search', 'zzzz不存在')`);
await sleep(400);
check('搜索无匹配时列表清空', (await evalJs(`document.querySelectorAll('#ai-hist-list .ai-hist-item').length`)) === 0, '');
await evalJs(`window.__type('#ai-hist-search', '')`);
await sleep(400);

// ---------- 6. 深色主题对比度 ----------
// 先补一条消息：上一步「新对话」把消息区清了，否则量不到用户气泡
await evalJs(`window.__type('#ai-chat-input', '我学得怎么样')`);
await evalJs(`document.querySelector('#ai-chat-send').click()`);
await sleep(2200);
await evalJs(`document.documentElement.setAttribute('data-theme','dark')`);
await sleep(800);
const dark = await evalJs(`(() => {
  var u = document.querySelector('#ai-chat-msgs .ai-msg-user .ai-msg-bubble');
  var a = document.querySelector('#ai-chat-msgs .ai-msg-ai .ai-msg-bubble');
  var cu = u ? getComputedStyle(u) : null;
  var ca = a ? getComputedStyle(a) : null;
  return {
    user: cu ? { bg: cu.backgroundColor, color: cu.color, ratio: window.__ratio(cu.backgroundColor, cu.color) } : null,
    ai: ca ? { ratio: window.__ratio(ca.backgroundColor, ca.color) } : null,
  };
})()`);
check('深色·用户气泡对比度 ≥4.5:1', dark.user && dark.user.ratio >= 4.5, `${dark.user?.ratio}:1 ${dark.user?.color} on ${dark.user?.bg}`);
check('深色·AI 气泡对比度 ≥4.5:1', dark.ai && dark.ai.ratio >= 4.5, `${dark.ai?.ratio}:1`);

async function shot(name, w, h, mobileMode, theme) {
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: !!mobileMode }, sessionId);
  await evalJs(`document.documentElement.setAttribute('data-theme','${theme || 'light'}')`);
  await sleep(500);
  await evalJs(`(() => { var el = document.querySelector('.ai-workspace'); if (el) el.scrollIntoView({ block: 'center' }); return 1; })()`);
  await sleep(500);
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' }, sessionId);
  writeFileSync(join(root, 'test-screenshots', name), Buffer.from(data, 'base64'));
}
await shot('ai-chat-v2-light-desktop.png', 1440, 900, false, 'light');
await shot('ai-chat-v2-dark-desktop.png', 1440, 900, false, 'dark');

// ---------- 7. 断点 ----------
await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1100, height: 900, deviceScaleFactor: 1, mobile: false }, sessionId);
await sleep(700);
const two = await evalJs(`(() => ({
  cols: getComputedStyle(document.querySelector('.ai-workspace')).gridTemplateColumns.split(' ').length,
  ctx: getComputedStyle(document.querySelector('#ai-context-rail')).display,
}))()`);
check('1100px 收为两栏且隐藏上下文栏', two.cols === 2 && two.ctx === 'none', `cols=${two.cols} ctx=${two.ctx}`);

await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true }, sessionId);
await sleep(900);
const phone = await evalJs(`(() => {
  var rail = document.querySelector('#ai-history-rail');
  var cs = rail ? getComputedStyle(rail) : null;
  return {
    cols: getComputedStyle(document.querySelector('.ai-workspace')).gridTemplateColumns.split(' ').length,
    railPosition: cs ? cs.position : null,
    menuVisible: getComputedStyle(document.querySelector('#ai-hist-toggle')).display !== 'none',
    overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
  };
})()`);
check('390px 单栏', phone.cols === 1, `cols=${phone.cols}`);
check('窄屏历史栏转为浮层抽屉', phone.railPosition === 'fixed', phone.railPosition);
check('窄屏出现历史入口按钮', phone.menuVisible === true, String(phone.menuVisible));
check('390px 无横向滚动', phone.overflowX === false, String(phone.overflowX));
await evalJs(`document.querySelector('#ai-hist-toggle').click()`);
await sleep(700);
check('窄屏历史抽屉可打开', (await evalJs(`document.querySelector('#ai-history-rail').classList.contains('open')`)) === true, '');
await shot('ai-chat-v2-mobile.png', 390, 844, true, 'light');
await evalJs(`document.querySelector('#ai-scrim').click()`);
await sleep(500);

// ---------- 输出 ----------
console.log('=== 骨架 ==='); console.log(JSON.stringify(shell, null, 2));
console.log('=== 回答卡 ==='); console.log(JSON.stringify(card, null, 2));
console.log('=== 输入区 ==='); console.log(JSON.stringify({ composer1, composer2 }, null, 2));
console.log('=== 抽屉 ==='); console.log(JSON.stringify(drawer, null, 2));
console.log('=== 深色 ==='); console.log(JSON.stringify(dark, null, 2));
console.log('=== 断点 ==='); console.log(JSON.stringify({ two, phone }, null, 2));
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

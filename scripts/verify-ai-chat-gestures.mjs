/**
 * AI 助手 v3 新 DOM — 移动端真机手势验收（真实 Chromium + 触摸事件模拟）
 *
 * jsdom 与既有 verify-ai-chat.mjs 覆盖不到的三处时序/手势：
 *   1. 长按 500ms 唤出删除确认条后**抬手**，浏览器会补一次 click —— 确认条会不会
 *      刚滑出就被"点主体=收起"分支收掉（真机等于长按删除失效）
 *   2. 语音覆盖层的"上滑 72px 取消"：pointerdown → pointermove → pointerup 全链路，
 *      含 setPointerCapture（jsdom 不支持捕获，只能真机验）
 *   3. 语音发送走 _appendVoice + ask({skipUser}) —— 用户气泡是否恰好多一条
 *
 * 触摸靠 CDP Input.dispatchTouchEvent（会产生真实 pointer 事件），必须三件套齐上：
 *   手机 UA + setDeviceMetricsOverride({mobile:true}) + Emulation.setTouchEmulationEnabled
 *
 * 运行：node scripts/verify-ai-chat-gestures.mjs
 */
import { spawn } from 'node:child_process';
import { existsSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = join(root, 'server', 'server.js');
const PORT = process.env.GESTURE_PORT || '3102';
const DEBUG_PORT = String(9500 + Math.floor(Math.random() * 400));
const BASE = `http://localhost:${PORT}/`;
const shotDir = join(root, 'browser-shots', 'ai-gestures');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const errors = [];
const checks = [];
const ok = (name, cond, extra = '') => checks.push({ name, pass: !!cond, extra });

const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

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
      this.ws.addEventListener('error', () => rej(new Error('ws connect failed')), { once: true });
    });
    this.ws.addEventListener('message', (ev) => this._onMsg(ev.data));
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
      (this.handlers.get(msg.method) || []).forEach((cb) => { try { cb(msg.params); } catch (e) {} });
      if (msg.method === 'Runtime.exceptionThrown') {
        errors.push('[exception] ' + (msg.params.exceptionDetails?.exception?.description || msg.params.exceptionDetails?.text || '').slice(0, 300));
      }
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        errors.push('[console.error] ' + (msg.params.args || []).map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 200));
      }
    }
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id;
    return new Promise((res, rej) => {
      this.pending.set(id, { res, rej: (e) => rej(new Error(`${method}: ${e.message}`)) });
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
if (!up) { console.log('FAIL  server 未启动'); server.kill(); process.exit(1); }

const chromePath = findChrome();
if (!chromePath) { console.log('FAIL  未找到 Chromium'); server.kill(); process.exit(1); }
const profile = join(process.env.TEMP ?? '.', 'ms-gesture-' + Date.now());
mkdirSync(profile, { recursive: true });
mkdirSync(shotDir, { recursive: true });
const chrome = spawn(chromePath, [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${profile}`,
  '--window-size=430,900', '--lang=zh-CN', 'about:blank'
], { stdio: ['ignore', 'pipe', 'pipe'] });

let dbg = null;
for (let i = 0; i < 40 && !dbg; i++) {
  await sleep(250);
  try { dbg = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`)).json(); } catch (e) {}
}
if (!dbg?.webSocketDebuggerUrl) { console.log('FAIL  chromium 调试端口不可达'); chrome.kill(); server.kill(); process.exit(1); }

const cdp = new Cdp(dbg.webSocketDebuggerUrl);
await cdp.open();
const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
const { sessionId: S } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
await cdp.send('Runtime.enable', {}, S);
await cdp.send('Page.enable', {}, S);
await cdp.send('Network.enable', {}, S);   // 必须先启用，否则 setUserAgentOverride 报 Invalid parameters

async function evalJs(expr) {
  const r = await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, S);
  if (r.exceptionDetails) return { __error: r.exceptionDetails.text + ' ' + (r.exceptionDetails.exception?.description || '') };
  return r.result.value;
}
async function shot(name) {
  const r = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true }, S);
  writeFileSync(join(shotDir, name), Buffer.from(r.data, 'base64'));
}
// 触摸事件：touchEnd 必须传空 touchPoints，否则 CDP 报错
const touch = async (type, x, y) => {
  const params = {
    type,
    touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1, radiusX: 12, radiusY: 12, force: 1 }],
  };
  try {
    await cdp.send('Input.dispatchTouchEvent', params, S);
  } catch (e) {
    console.log('TOUCH-FAIL', JSON.stringify(params), e.message);
    throw e;
  }
};

/* ---------- 移动端三件套：缺 setTouchEmulationEnabled 则 (hover:none) 不匹配 ---------- */
await cdp.send('Network.setUserAgentOverride', { userAgent: IPHONE_UA }, S);
await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true }, S);
await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, S);
await cdp.send('Page.navigate', { url: BASE }, S);
await sleep(4500);
await evalJs(`localStorage.setItem('onboarding_done','true'); localStorage.setItem('daily_goal','10'); 'ok'`);
await cdp.send('Page.navigate', { url: BASE }, S);
await sleep(4500);

// 切到 AI 页（隐藏页尺寸全为 0，不切过去量到的都是假数）
await evalJs(`(() => {
  var b = document.querySelector('.nav-btn[data-tab="ai"]') || document.querySelector('.bottom-nav-btn[data-tab="ai"]');
  if (b) b.click();
  return !!b;
})()`);
await sleep(1500);

const pageOk = await evalJs(`({
  active: (document.querySelector('.page.active') || {}).id || null,
  hover: window.matchMedia('(hover: none)').matches,
  touch: 'ontouchstart' in window
})`);
ok('AI 页已激活（隐藏页尺寸为 0，必须先确认）', pageOk.active === 'page-ai', JSON.stringify(pageOk));
ok('触摸环境生效（(hover:none) 匹配 + ontouchstart）', pageOk.hover === true && pageOk.touch === true, JSON.stringify(pageOk));

// 无头 Chromium 没有可用的语音识别服务，注入哑实现让覆盖层能稳定停在录音态
await evalJs(`(() => {
  window.SpeechRecognition = function () {
    this.lang = ''; this.interimResults = false; this.maxAlternatives = 1;
    this.onresult = null; this.onerror = null; this.onend = null;
    this.start = function () {}; this.stop = function () {};
  };
  return 'stubbed';
})()`);

// 造一条可删除的归档会话：ask → _touchSession 生成 sessionId → _newSession 归档
const seeded = await evalJs(`(() => {
  var m = window.app && window.app.aiChatModule;
  if (!m) return { err: 'no-module' };
  m.ask('你好');
  m._newSession();
  return { sessions: m._sessions().length, sessionId: m._sessionId, hist: m._history().length };
})()`);
ok('已生成归档会话（_newSession 归档了上一轮）', seeded.sessions >= 1, JSON.stringify(seeded));
await sleep(800);

try {

/* ==================== 1. 历史栏长按删除 ==================== */
await evalJs(`document.getElementById('ai-hist-toggle').click()`);
await sleep(700);
const railOpen = await evalJs(`document.getElementById('ai-history-rail').classList.contains('open')`);
ok('历史抽屉可打开', railOpen === true);

const itemBox = await evalJs(`(() => {
  var it = document.querySelector('#ai-hist-list .ai-hist-item');
  if (!it) return null;
  var r = it.querySelector('.ai-hist-main').getBoundingClientRect();
  return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), h: Math.round(r.height) };
})()`);
ok('历史条目可定位', !!itemBox, JSON.stringify(itemBox));

const before = await evalJs(`({
  items: document.querySelectorAll('#ai-hist-list .ai-hist-item').length,
  sessions: (window.app.aiChatModule._sessions() || []).length
})`);

const hitTest = await evalJs(`(() => {
  var it = document.querySelector('#ai-hist-list .ai-hist-item');
  var r = it.getBoundingClientRect();
  var cx = Math.round(r.x + r.width / 2), cy = Math.round(r.y + r.height / 2);
  var el = document.elementFromPoint(cx, cy);
  var rail = document.getElementById('ai-history-rail');
  var scrim = document.getElementById('ai-scrim');
  var cs = (e) => (e ? getComputedStyle(e) : null);
  return {
    point: cx + ',' + cy,
    itemRect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
    hit: el ? (el.id || el.className || el.tagName) : null,
    hitInHist: !!(el && el.closest && el.closest('#ai-hist-list')),
    railZ: cs(rail) && cs(rail).zIndex, railPos: cs(rail) && cs(rail).position,
    scrimZ: cs(scrim) && cs(scrim).zIndex, scrimDisplay: cs(scrim) && cs(scrim).display,
    railRect: (function () { var q = rail.getBoundingClientRect(); return [Math.round(q.x), Math.round(q.y), Math.round(q.width), Math.round(q.height)]; })(),
    railTf: cs(rail) && cs(rail).transform, railVis: cs(rail) && cs(rail).visibility, railPe: cs(rail) && cs(rail).pointerEvents,
    scrimRect: (function () { var q = scrim.getBoundingClientRect(); return [Math.round(q.x), Math.round(q.y), Math.round(q.width), Math.round(q.height)]; })(),
    scrimPe: cs(scrim) && cs(scrim).pointerEvents,
    scrimParent: scrim.parentElement ? (scrim.parentElement.id || scrim.parentElement.className) : null,
    railWorkspaceParent: rail.parentElement ? (rail.parentElement.id || rail.parentElement.className) : null,
    ancRects: (function () {
      var out = {}, n = rail;
      while (n && n !== document.documentElement) {
        var q = n.getBoundingClientRect();
        out[n.id || n.className || n.tagName] = [Math.round(q.x), Math.round(q.y), Math.round(q.width), Math.round(q.height)]
          + ' ovf=' + getComputedStyle(n).overflow;
        n = n.parentElement;
      }
      return out;
    })(),
    vv: [window.innerWidth, window.innerHeight],
    // 层叠上下文链：z-index 跨上下文不可比，必须逐级找出是谁把它关住了
    chain: (function () {
      var out = [], n = rail;
      while (n && n !== document.documentElement) {
        var s = getComputedStyle(n);
        var creates = (s.position !== 'static' && s.zIndex !== 'auto')
          || (s.transform && s.transform !== 'none')
          || (s.opacity && Number(s.opacity) < 1)
          || (s.filter && s.filter !== 'none')
          || (s.isolation === 'isolate')
          || (s.willChange && /transform|opacity/.test(s.willChange))
          || (s.contain && /paint|layout|strict/.test(s.contain))
          || (s.animationName && s.animationName !== 'none' && s.animationPlayState === 'running');
        if (creates) out.push((n.id || n.className || n.tagName) + ' [z=' + s.zIndex + ' pos=' + s.position + ' tf=' + s.transform
          + ' anim=' + s.animationName + ' fill=' + s.animationFillMode
          + ' filter=' + s.filter + ' backdrop=' + s.backdropFilter + ' willChange=' + s.willChange
          + ' contain=' + s.contain + ' perspective=' + s.perspective + ' isolation=' + s.isolation + ']');
        n = n.parentElement;
      }
      return out;
    })()
  };
})()`);
// 真实事件命中由后面的"长按唤出确认条"证伪；elementFromPoint 在动画结束后的合成层
// 状态下会给出假阴性（报遮罩在上，但截图与真实触摸都证明抽屉在遮罩之上），不作判据。
ok('★抽屉压在遮罩之上（z-index 层叠契约：rail 85 > scrim 70）',
  Number(hitTest.railZ) > Number(hitTest.scrimZ) && hitTest.railRect[1] === 0 && hitTest.railRect[3] === 844,
  JSON.stringify(hitTest));

// 决定性实验：把入场动画显式关掉，看抽屉是否立刻回到视口定位
const exp = await evalJs(`(() => {
  var rail = document.getElementById('ai-history-rail');
  var ws = document.getElementById('ai-workspace'), pg = document.getElementById('page-ai');
  var m = function () { var q = rail.getBoundingClientRect(); return [Math.round(q.x), Math.round(q.y), Math.round(q.width), Math.round(q.height)]; };
  var out = { baseline: m() };
  ws.style.animation = 'none';            out.wsOff = m();
  ws.style.animation = '';
  if (pg) pg.style.animation = 'none';    out.pgOff = m();
  if (pg) pg.style.animation = '';
  ws.style.animation = 'none';
  if (pg) pg.style.animation = 'none';    out.bothOff = m();
  // 换成只动 opacity 的入场动画：若抽屉回到视口定位，说明只有 transform 类动画有害
  ws.style.animation = 'fadeIn .4s ease .03s';
  out.opacityOnly = m();
  ws.style.animation = 'none';
  out.hitAfter = (function () { var h = document.elementFromPoint(160, 400); return h ? (h.id || h.className) : null; })();
  return out;
})()`);
ok('★关闭入场动画后抽屉回到视口定位（证实元凶）', exp.bothOff[1] === 0 && exp.bothOff[3] === 844, JSON.stringify(exp));
ok('★仅关闭 .page.active > * 的动画即可修复（不必动 .page 自身）', exp.wsOff[1] === 0 && exp.wsOff[3] === 844, JSON.stringify(exp));

// 事件探针：长按链路到底走到了哪一步（真机手势排查的第一手依据）
await evalJs(`(() => {
  window.__probe = {};
  var box = document.getElementById('ai-hist-list');
  ['pointerdown','pointerup','pointercancel','pointerleave','pointermove','click','touchstart','touchmove','touchend'].forEach(function (t) {
    box.addEventListener(t, function () { window.__probe[t] = (window.__probe[t] || 0) + 1; }, true);
  });
  return 'instrumented';
})()`);

// 长按 700ms（阈值 500ms）
await touch('touchStart', itemBox.x, itemBox.y);
await sleep(700);
await shot('01-hist-longpress.png');
const lp = await evalJs(`(() => {
  var it = document.querySelector('#ai-hist-list .ai-hist-item');
  var cf = it && it.querySelector('.ai-hist-confirm');
  if (!cf) return { confirm: 0 };
  var ir = it.getBoundingClientRect(), cr = cf.getBoundingClientRect();
  return {
    confirm: document.querySelectorAll('#ai-hist-list .ai-hist-item.is-confirm').length,
    cfHeight: Math.round(cr.height),
    // 滑入判据：确认条底边与条目底边重合（收起时是 translateY(102%) 在条目下方）
    slidIn: Math.abs(cr.bottom - ir.bottom) < 2,
    yes: !!cf.querySelector(".ai-hc-yes"), no: !!cf.querySelector(".ai-hc-no"), probe: JSON.stringify(window.__probe)
  };
})()`);
ok('长按 500ms 唤出删除确认条', lp.confirm === 1, JSON.stringify(lp));
ok('确认条已滑入条目内（非停留在 translateY(102%)）', lp.slidIn === true, JSON.stringify(lp));
ok('确认条含「删除 / 取消」两个按钮', lp.yes === true && lp.no === true, JSON.stringify(lp));

// 抬手：浏览器会补一次 click，这正是 jsdom 测不出来的地方
await touch('touchEnd', itemBox.x, itemBox.y);
await sleep(500);
await shot('02-hist-after-release.png');
const afterRelease = await evalJs(`(() => {
  var it = document.querySelector('#ai-hist-list .ai-hist-item.is-confirm');
  var opened = document.querySelectorAll('#ai-hist-list .ai-hist-item.is-confirm').length;
  var railStill = document.getElementById('ai-history-rail').classList.contains('open');
  var cf = it && it.querySelector('.ai-hist-confirm');
  var slidIn = false;
  if (it && cf) slidIn = Math.abs(cf.getBoundingClientRect().bottom - it.getBoundingClientRect().bottom) < 2;
  return { opened: opened, railStill: railStill, slidIn: slidIn };
})()`);
ok('★抬手后确认条存活（未被补发的 click 收掉）', afterRelease.opened === 1 && afterRelease.slidIn === true, JSON.stringify(afterRelease));
ok('抬手后未被误判为「切换会话」', afterRelease.railStill === true, JSON.stringify(afterRelease));

// 点「取消」
const noBox = await evalJs(`(() => {
  var b = document.querySelector('#ai-hist-list .ai-hist-item.is-confirm .ai-hc-no');
  var r = b.getBoundingClientRect();
  return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), w: Math.round(r.width), h: Math.round(r.height) };
})()`);
ok('「取消」按钮触控区 ≥36px 高', noBox.h >= 36, `${noBox.w}×${noBox.h}`);
await touch('touchStart', noBox.x, noBox.y);
await touch('touchEnd', noBox.x, noBox.y);
await sleep(500);
const afterNo = await evalJs(`({
  opened: document.querySelectorAll('#ai-hist-list .ai-hist-item.is-confirm').length,
  sessions: (window.app.aiChatModule._sessions() || []).length
})`);
ok('点「取消」收起确认条且不删除', afterNo.opened === 0 && afterNo.sessions === before.sessions, JSON.stringify(afterNo));

// 再长按**已归档会话**（不是"当前对话"）→ 点「删除」。
// 删当前对话清的是 ai_chat_history，不进 ai_chat_sessions —— 断言 sessions 会假红。
const archBox = await evalJs(`(() => {
  var it = document.querySelector('#ai-hist-list .ai-hist-item:not(.is-current)');
  if (!it) return null;
  var r = it.querySelector('.ai-hist-main').getBoundingClientRect();
  return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
})()`);
ok('存在归档会话可删（当前对话不入 sessions 列表）', !!archBox, JSON.stringify(archBox));
await touch('touchStart', archBox ? archBox.x : itemBox.x, archBox ? archBox.y : itemBox.y);
await sleep(700);
await shot('03-hist-confirm-again.png');
// 必须先抬手再点确认条 —— 少这一步会留下悬空触点，后续 touchStart 全部失效
await touch('touchEnd', archBox ? archBox.x : itemBox.x, archBox ? archBox.y : itemBox.y);
await sleep(400);
const yesBox = await evalJs(`(() => {
  var b = document.querySelector('#ai-hist-list .ai-hist-item.is-confirm .ai-hc-yes');
  if (!b) return null;
  var r = b.getBoundingClientRect();
  return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
})()`);
ok('确认条再次唤出', !!yesBox);
if (yesBox) {
  await touch('touchStart', yesBox.x, yesBox.y);
  await touch('touchEnd', yesBox.x, yesBox.y);
  await sleep(800);
  await shot('04-hist-after-delete.png');
  const afterYes = await evalJs(`({
    items: document.querySelectorAll('#ai-hist-list .ai-hist-item').length,
    sessions: (window.app.aiChatModule._sessions() || []).length
  })`);
  ok('点「删除」真的删掉了会话', afterYes.sessions === before.sessions - 1, JSON.stringify({ before, afterYes }));
}
await evalJs(`document.getElementById('ai-scrim') && document.getElementById('ai-scrim').click()`);
await sleep(500);

/* ==================== 2. 语音覆盖层：上滑取消 ==================== */
// 输入区在首屏之下（页面内容 873px 起自 y=60），不滚进视口的话触摸点落在视口外，事件根本不会派发
// 用 instant：平滑滚动的惯性会把紧随其后的 touchStart 判成滚动手势并派发 pointercancel，
// 覆盖层刚打开就被关掉（表现为"按住麦克风没反应"）
await evalJs(`document.getElementById('ai-mic').scrollIntoView({ block: 'center', behavior: 'instant' })`);
await sleep(900);
const micBox = await evalJs(`(() => {
  var m = document.getElementById('ai-mic');
  if (!m) return null;
  var r = m.getBoundingClientRect();
  return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), w: Math.round(r.width), h: Math.round(r.height) };
})()`);
ok('麦克风滚动后位于视口内（0 ≤ y ≤ 844）', !!micBox && micBox.y > 0 && micBox.y < 844, JSON.stringify(micBox));
ok('麦克风按钮存在且可定位', !!micBox, JSON.stringify(micBox));
ok('麦克风触控区 ≥44px', !!micBox && micBox.w >= 44 && micBox.h >= 44, micBox ? `${micBox.w}×${micBox.h}` : '');

await evalJs(`(() => {
  window.__m = {};
  var m = document.getElementById('ai-mic');
  ['pointerdown','pointerup','pointercancel','pointermove','click','touchstart'].forEach(function (t) {
    m.addEventListener(t, function () { window.__m[t] = (window.__m[t] || 0) + 1; }, true);
  });
  return 'ok';
})()`);
await touch('touchStart', micBox.x, micBox.y);
await sleep(700);
await shot('05-voice-recording.png');
const micProbe = await evalJs(`({
  ev: JSON.stringify(window.__m),
  hitAtMic: (function () {
    var h = document.elementFromPoint(${micBox.x}, ${micBox.y});
    if (!h) return null;
    var d = function (e) { return e.tagName + (e.id ? '#' + e.id : '') + (e.getAttribute && e.getAttribute('class') ? '.' + e.getAttribute('class') : ''); };
    var path = [], n = h;
    while (n && path.length < 5) { path.push(d(n)); n = n.parentElement; }
    return path.join(' < ');
  })(),
  hasSR: !!(window.SpeechRecognition || window.webkitSpeechRecognition),
  voiceExists: !!document.getElementById('ai-voice'),
  bound: !!(window.app.aiChatModule && window.app.aiChatModule._voice)
})`);
// 注意：这里 hitAtMic 已是覆盖层（录音态已开），只能作为附带信息；真正的判据是事件计数
ok('诊断：麦克风收到 pointerdown（触摸链路打通）', /pointerdown/.test(micProbe.ev), JSON.stringify(micProbe));
const rec = await evalJs(`(() => {
  var ov = document.getElementById('ai-voice');
  var r = ov.getBoundingClientRect();
  return {
    open: ov.classList.contains('open'),
    ariaHidden: ov.getAttribute('aria-hidden'),
    pressed: document.getElementById('ai-mic').getAttribute('aria-pressed'),
    bars: document.querySelectorAll('#ai-voice-wave .wbar').length,
    timer: document.getElementById('ai-voice-timer').textContent,
    hint: document.getElementById('ai-voice-hint').textContent,
    covers: Math.round(r.width) >= 390 && Math.round(r.height) >= 400,
    sendDisabled: document.getElementById('ai-voice-send').disabled
  };
})()`);
ok('按住麦克风进入录音态', rec.open === true && rec.ariaHidden === 'false', JSON.stringify(rec));
ok('麦克风 aria-pressed 同步为 true', rec.pressed === 'true', rec.pressed);
ok('波形 30 条 + 计时走动', rec.bars === 30 && /^0:0[0-5]$/.test(rec.timer), `bars=${rec.bars} timer=${rec.timer}`);
ok('覆盖层铺满视口', rec.covers === true);
ok('无转写时发送键禁用', rec.sendDisabled === true);

// 上滑 90px（阈值 72px）→ 取消态
await touch('touchMove', micBox.x, micBox.y - 90);
await sleep(400);
await shot('06-voice-cancel-armed.png');
const cancelState = await evalJs(`({
  cancel: document.getElementById('ai-voice').classList.contains('is-cancel'),
  hint: document.getElementById('ai-voice-hint').textContent,
  cancelMode: window.app.aiChatModule._voice.cancelMode,
  ev: JSON.stringify(window.__m)
})`);
ok('上滑 90px（>72px 阈值）进入取消态', cancelState.cancel === true, JSON.stringify(cancelState));
ok('取消态提示文案切换', /取消发送/.test(cancelState.hint), cancelState.hint);

await touch('touchEnd', micBox.x, micBox.y - 90);
await sleep(600);
const afterCancel = await evalJs(`({
  open: document.getElementById('ai-voice').classList.contains('open'),
  cancel: document.getElementById('ai-voice').classList.contains('is-cancel'),
  pressed: document.getElementById('ai-mic').getAttribute('aria-pressed'),
  msgs: document.querySelectorAll('#ai-chat-msgs .ai-msg').length
})`);
ok('松手取消：覆盖层关闭且状态复位', afterCancel.open === false && afterCancel.cancel === false && afterCancel.pressed === 'false', JSON.stringify(afterCancel));

/* ==================== 3. 语音发送：只多一条用户气泡 ==================== */
const beforeSend = await evalJs(`({
  user: document.querySelectorAll('#ai-chat-msgs .ai-msg-user').length,
  voice: document.querySelectorAll('#ai-chat-msgs .ai-msg-voice').length
})`);
await touch('touchStart', micBox.x, micBox.y);
await sleep(500);
await evalJs(`(function(){ window.app.aiChatModule._voice.transcript = 'hello from gesture test'; return 'set'; })()`);
await sleep(200);
await shot('07-voice-transcript.png');
await touch('touchEnd', micBox.x, micBox.y);
await sleep(1200);
await shot('08-voice-bubble.png');
const afterSend = await evalJs(`({
  user: document.querySelectorAll('#ai-chat-msgs .ai-msg-user').length,
  voice: document.querySelectorAll('#ai-chat-msgs .ai-msg-voice').length,
  dur: (document.querySelector('#ai-chat-msgs .ai-voice-dur') || {}).textContent || '',
  tr: (document.querySelector('#ai-chat-msgs .ai-voice-tr') || {}).textContent || '',
  daySeps: document.querySelectorAll('#ai-chat-msgs .ai-day-sep').length
})`);
ok('语音气泡入列', afterSend.voice === beforeSend.voice + 1, JSON.stringify({ beforeSend, afterSend }));
ok('★用户气泡恰好 +1（skipUser 生效，未重复文本气泡）', afterSend.user === beforeSend.user + 1, JSON.stringify({ beforeSend, afterSend }));
ok('语音气泡带时长与转写', /^0:0\d$/.test(afterSend.dur) && afterSend.tr.indexOf('hello from gesture test') >= 0, JSON.stringify(afterSend));

/* ==================== 4. 全局：溢出与控制台 ==================== */
const overflow = await evalJs(`document.documentElement.scrollWidth <= 390`);
ok('390px 视口无横向溢出', overflow === true);
ok('全程无 console 错误 / 未捕获异常', errors.length === 0, errors.slice(0, 3).join(' | '));

} catch (e) {
  errors.push('[script] ' + e.message);
}

/* ---------- 输出 ---------- */
console.log('\n=== 断言 ===');
checks.forEach((c) => console.log(`${c.pass ? 'PASS' : 'FAIL'}  ${c.name}${c.extra ? '  → ' + c.extra : ''}`));
const failed = checks.filter((c) => !c.pass);
console.log(`\n${checks.length - failed.length}/${checks.length} 项通过`);
if (errors.length) { console.log('\n=== 控制台错误 ==='); errors.slice(0, 10).forEach((e) => console.log('  ' + e)); }
console.log(`\n截图目录：browser-shots/ai-gestures/`);

cdp.close(); chrome.kill(); server.kill();
process.exit(failed.length ? 1 : 0);

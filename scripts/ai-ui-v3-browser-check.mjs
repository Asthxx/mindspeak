/**
 * AI 助手移动端 UI v3 — 真实 Chromium 入口验证
 * jsdom 之外的第二道验证：真实引擎渲染 + 真实事件 + 截图。
 *   Pass A：手机视口 390×844（自动进入全屏模式）
 *     - 无 console 错误 / 未捕获异常
 *     - 主视图渲染（消息列表 / 真实计算样式 = 浅色令牌）
 *     - 发送流程 / 语音按住-发送流程 / 主题切换 / 历史 / 设置
 *     - 截图：浅色对话 / 深色对话 / 语音输入 / 历史会话 / 个人设置
 *   Pass B：桌面 1280×900 框预览截图（状态栏 + 灵动岛 + 设备框）
 * 运行：node scripts/ai-ui-v3-browser-check.mjs
 */
import { spawn } from 'node:child_process';
import { existsSync, readdirSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const htmlPath = join(root, 'ai-assistant-ui-v3-mobile.html');
const pageUrl = 'file:///' + encodeURI(htmlPath.replace(/\\/g, '/'));
const shotDir = join(root, 'browser-shots', 'v3-mobile');
const DEBUG_PORT = String(9444 + Math.floor(Math.random() * 500));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const errors = [];
const checks = [];
const ok = (name, cond, extra = '') => checks.push({ name, pass: !!cond, extra });

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
    }
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id;
    return new Promise((res, rej) => {
      this.pending.set(id, { res, rej });
      this.ws.send(JSON.stringify({ id, method, params: params || {}, ...(sessionId ? { sessionId } : {}) }));
    });
  }
  on(method, cb) {
    if (!this.handlers.has(method)) this.handlers.set(method, []);
    this.handlers.get(method).push(cb);
  }
  close() { try { this.ws.close(); } catch (e) {} }
}

async function main() {
  const chromePath = findChrome();
  if (!chromePath) { console.log('FAIL  未找到 ms-playwright Chromium 内核'); process.exit(1); }
  const profile = join(process.env.TEMP ?? '.', 'ms-v3-' + Date.now());
  mkdirSync(profile, { recursive: true });
  mkdirSync(shotDir, { recursive: true });
  const chrome = spawn(chromePath, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${profile}`,
    '--window-size=430,900', '--lang=zh-CN', 'about:blank'
  ], { stdio: ['ignore', 'pipe', 'pipe'] });

  let dbg = null;
  for (let i = 0; i < 40 && !dbg; i++) {
    await sleep(200);
    try { const r = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`); dbg = await r.json(); } catch (e) {}
  }
  if (!dbg?.webSocketDebuggerUrl) { console.log('FAIL  chromium debug endpoint unreachable'); chrome.kill(); process.exit(1); }

  const cdp = new Cdp(dbg.webSocketDebuggerUrl);
  await cdp.open();
  cdp.on('Runtime.consoleAPICalled', (p) => {
    if (p.type === 'error') errors.push('[console.error] ' + (p.args || []).map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 200));
  });
  await cdp.send('Target.setDiscoverTargets', { discover: true });
  let page = null;
  for (let i = 0; i < 30 && !page; i++) {
    await sleep(200);
    const { targetInfos } = await cdp.send('Target.getTargets');
    page = targetInfos.find((t) => t.type === 'page');
  }
  if (!page) { console.log('FAIL  未找到 page target'); chrome.kill(); process.exit(1); }
  const { sessionId: S } = await cdp.send('Target.attachToTarget', { targetId: page.targetId, flatten: true });
  await cdp.send('Runtime.enable', {}, S);
  await cdp.send('Page.enable', {}, S);

  const evalJs = async (expr) => {
    const r = await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, S);
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' + (r.exceptionDetails.exception?.description || ''));
    return r.result.value;
  };
  const shot = async (name) => {
    const r = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true }, S);
    const fs = await import('node:fs');
    fs.writeFileSync(join(shotDir, name), Buffer.from(r.data, 'base64'));
  };

  /* ============ Pass A：手机视口 ============ */
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true }, S);
  await cdp.send('Page.navigate', { url: pageUrl }, S);
  await sleep(900);

  ok('真实引擎无未捕获异常 / console 错误', errors.length === 0, errors.join(' | ').slice(0, 200));
  const render = await evalJs(`({
    msgs: document.querySelectorAll('#msgList .msg').length,
    answer: !!document.querySelector('.answer'),
    exCards: document.querySelectorAll('.ex-card').length,
    voiceBubble: !!document.querySelector('.bubble-voice'),
    chips: document.querySelectorAll('.chip').length,
    theme: document.documentElement.getAttribute('data-theme'),
    bodyBg: getComputedStyle(document.body).backgroundColor,
    frame: document.getElementById('device').getAttribute('data-frame') || 'frame',
    composerVisible: (() => { const r = document.querySelector('.composer').getBoundingClientRect(); return r.bottom <= 844 + 1 && r.top > 400; })()
  })`);
  ok('消息列表渲染（≥5 条，含结构化卡与语音气泡）', render.msgs >= 5 && render.answer && render.exCards === 2 && render.voiceBubble, JSON.stringify(render));
  ok('浅色令牌真实生效（画布 #F3F5F8）', render.bodyBg === 'rgb(243, 245, 248)', render.bodyBg);
  ok('窄屏自动进入全屏模式', render.frame === 'full', render.frame);
  ok('输入区位于单手拇指区（屏幕下半）', render.composerVisible === true);

  /* 发送流程 */
  await evalJs(`(() => {
    const t = document.getElementById('input');
    t.value = 'phoenix 怎么用？';
    t.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  const sendEnabled = await evalJs(`!document.getElementById('btnSend').disabled`);
  ok('输入后发送按钮启用', sendEnabled === true);
  await evalJs(`document.getElementById('btnSend').click()`);
  await sleep(150);
  const sent = await evalJs(`document.querySelectorAll('#msgList .msg.me').length`);
  ok('发送后用户气泡立即入列', sent === 3, `${sent} 条用户消息`);
  await sleep(1400);
  const replied = await evalJs(`!document.querySelector('#msgList .typing') && document.querySelectorAll('#msgList .msg').length === 7`);
  ok('AI 回复完成（打字占位消失，消息数 5→7）', replied === true);

  /* 语音流程：按住 → 转写 → 发送 */
  await evalJs(`(() => {
    const mic = document.getElementById('btnMic');
    mic.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, clientX: 300, clientY: 600 }));
  })()`);
  await sleep(500);
  const rec = await evalJs(`({
    open: document.getElementById('screenVoice').classList.contains('is-open'),
    timer: document.getElementById('voiceTimer').textContent,
    bars: document.querySelectorAll('#voiceWave .wbar').length,
    overlayTop: document.getElementById('screenVoice').getBoundingClientRect().top
  })`);
  ok('按住麦克风进入录音态', rec.open === true);
  ok('录音计时走动', /^0:0[0-2]$/.test(rec.timer), rec.timer);
  ok('录音波形 30 条', rec.bars === 30);
  await sleep(1300);
  const tr = await evalJs(`document.getElementById('voiceTranscript').textContent`);
  ok('实时转写出现', tr.indexOf('帮我把刚才那句') >= 0, tr.trim());
  await evalJs(`document.getElementById('btnVoiceSend').click()`);
  await sleep(1600);
  const voiceDone = await evalJs(`({
    closed: !document.getElementById('screenVoice').classList.contains('is-open'),
    bubbles: document.querySelectorAll('#msgList .bubble-voice').length,
    reply: document.body.innerText.indexOf('收到，我用 0.7') >= 0
  })`);
  ok('发送后覆盖层关闭且语音气泡入列', voiceDone.closed === true && voiceDone.bubbles === 2);
  ok('语音后 AI 有回复', voiceDone.reply === true);

  await shot('a1-chat-light.png');

  /* 深色主题 */
  await evalJs(`document.getElementById('btnThemeToggle').click()`);
  await sleep(500);
  const dark = await evalJs(`({
    theme: document.documentElement.getAttribute('data-theme'),
    bodyBg: getComputedStyle(document.body).backgroundColor,
    bubbleBg: getComputedStyle(document.querySelector('.msg.me .bubble')).backgroundColor,
    textColor: getComputedStyle(document.querySelector('.msg.me .bubble')).color
  })`);
  ok('深色主题生效（画布 #0D1319）', dark.theme === 'dark' && dark.bodyBg === 'rgb(13, 19, 25)', dark.bodyBg);
  ok('深色用户气泡翻转为浅蓝底深字', dark.bubbleBg === 'rgb(94, 143, 184)' && dark.textColor === 'rgb(14, 20, 27)', dark.bubbleBg + ' / ' + dark.textColor);
  await shot('a2-chat-dark.png');
  await evalJs(`document.getElementById('btnThemeToggle').click()`); /* 切回浅色 */
  await sleep(400);

  /* 语音输入界面截图 */
  await evalJs(`document.getElementById('btnMic').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 2, clientX: 300, clientY: 600 }))`);
  await sleep(900);
  await shot('a3-voice.png');
  await evalJs(`document.getElementById('btnVoiceCancel').click()`);
  await sleep(400);

  /* 历史会话 */
  await evalJs(`document.getElementById('btnHistory').click()`);
  await sleep(600);
  const hist = await evalJs(`({
    open: document.getElementById('screenHistory').classList.contains('is-open'),
    items: document.querySelectorAll('.hist-item').length,
    scrim: document.getElementById('scrim').classList.contains('show')
  })`);
  ok('历史抽屉打开（8 条会话 + 遮罩）', hist.open === true && hist.items === 8 && hist.scrim === true);
  await shot('a4-history.png');
  await evalJs(`document.getElementById('btnCloseHistory').click()`);
  await sleep(500);

  /* 个人设置 */
  await evalJs(`document.getElementById('btnSettings').click()`);
  await sleep(600);
  const set = await evalJs(`({
    open: document.getElementById('screenSettings').classList.contains('is-open'),
    groups: document.querySelectorAll('.set-group').length,
    segs: document.querySelectorAll('.seg').length,
    switches: document.querySelectorAll('.switch').length,
    slider: !!document.getElementById('rate')
  })`);
  ok('设置页打开（4 组 / 5 分段 / 3 开关 / 滑块）', set.open === true && set.groups === 4 && set.segs === 5 && set.switches === 3 && set.slider === true);
  await shot('a5-settings.png');

  /* 设置内切深色 + 字号 */
  await evalJs(`document.querySelector('.seg[data-seg="theme"] button[data-val="dark"]').click()`);
  await sleep(400);
  const dk2 = await evalJs(`document.documentElement.getAttribute('data-theme')`);
  ok('设置页主题分段联动', dk2 === 'dark');
  await shot('a6-settings-dark.png');
  await evalJs(`document.querySelector('.seg[data-seg="theme"] button[data-val="light"]').click()`);
  await evalJs(`document.getElementById('btnBackSettings').click()`);
  await sleep(500);

  /* ============ Pass B：桌面框预览 ============ */
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false }, S);
  await sleep(600);
  const framed = await evalJs(`({
    frame: document.getElementById('device').getAttribute('data-frame') || 'frame',
    island: getComputedStyle(document.querySelector('.island')).display,
    deviceW: document.getElementById('device').getBoundingClientRect().width
  })`);
  ok('桌面端恢复设备框预览（含灵动岛）', framed.frame === 'frame' && framed.island !== 'none' && Math.round(framed.deviceW) === 390, JSON.stringify(framed));
  await shot('b1-desktop-framed.png');

  /* ---------- 汇总 ---------- */
  const failed = checks.filter((c) => !c.pass);
  console.log(`\n真实 Chromium 验证：${checks.length - failed.length}/${checks.length} 通过（截图目录 browser-shots/v3-mobile/）\n`);
  checks.forEach((c) => console.log(`${c.pass ? 'PASS' : 'FAIL'}  ${c.name}${c.extra ? '  [' + c.extra + ']' : ''}`));
  if (errors.length) { console.log('\n运行期错误：'); errors.forEach((e) => console.log('  ' + e)); }
  cdp.close();
  chrome.kill();
  process.exit(failed.length || errors.length ? 1 : 0);
}

main().catch((e) => { console.log('FAIL  脚本异常: ' + (e && e.stack || e)); process.exit(1); });
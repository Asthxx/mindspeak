// browser-smoke.mjs - 真实入口 + 真实 Chromium + 真实数据冒烟测试
// 1) 启动真实服务 server/server.js（localhost:3000）
// 2) 启动本机 ms-playwright 缓存的 Chromium headless 内核（CDP 驱动交互）
// 3) 走关键操作：首页渲染 -> 单词卡片翻卡 -> 发音 -> 认识/收藏 -> 跟读(麦克风) -> 刷新持久化
// 4) 报告四类：启动 / 页面 / 权限 / 数据 = 通过 | 失败 | 未验证
import { spawn } from 'node:child_process';
import { existsSync, readdirSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = join(root, 'server', 'server.js');
const PORT = process.env.SMOKE_PORT || '3000';
const DEBUG_PORT = process.env.SMOKE_DEBUG_PORT || '9333';
const BASE = `http://localhost:${PORT}/`;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const REPORT = { startup: [], page: [], permission: [], data: [] };
const errors = []; // console.error / exception / log-error / network-failed
const netSummary = [];

// ---------- 定位真实 Chromium 内核（ms-playwright 缓存） ----------
function findChrome() {
  const cache = join(process.env.LOCALAPPDATA ?? '', 'ms-playwright');
  if (!existsSync(cache)) return null;
  for (const d of readdirSync(cache)) {
    if (!/^chromium-\d+/.test(d)) continue;
    for (const cand of [
      join(cache, d, 'chrome-win64', 'chrome.exe'),
      join(cache, d, 'chrome-win', 'chrome.exe')
    ]) {
      if (existsSync(cand)) return cand;
    }
  }
  return null;
}

// ---------- 简易 CDP 客户端 ----------
class Cdp {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.id = 0;
    this.pending = new Map();
    this.handlers = new Map();
  }
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
      if (msg.error) rej(new Error(msg.error.message));
      else res(msg.result);
      return;
    }
    if (msg.method) {
      const cbs = this.handlers.get(msg.method);
      if (cbs) cbs.forEach(cb => { try { cb(msg.params, msg.sessionId); } catch (e) {} });
      if (msg.method === 'Runtime.exceptionThrown') errors.push('[exception] ' + (msg.params.exceptionDetails?.exception?.description || msg.params.exceptionDetails?.text || ''));
      if (msg.method === 'Console.messageAdded') { /* legacy */ }
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
  // ---------- 1. 真实入口：server/server.js ----------
  let server = null;
  let reuseServer = false;
  try {
    const probe = await fetch(`http://127.0.0.1:${PORT}/api/health`);
    if (probe.ok) reuseServer = true;
  } catch (e) {}
  if (!reuseServer) {
    server = spawn(process.execPath, [ENTRY], {
      cwd: dirname(ENTRY),
      env: { ...process.env, PORT, HOST: '127.0.0.1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let errLog = '';
    server.stderr.on('data', d => { errLog += d.toString(); });
    server.stdout.on('data', d => { server._out = (server._out || '') + d.toString(); });
    let up = false;
    for (let i = 0; i < 40 && !up; i++) {
      await sleep(250);
      try { up = (await fetch(`http://127.0.0.1:${PORT}/api/health`)).ok; } catch (e) {}
    }
    if (!up) {
      console.log('STARTUP: FAIL  server failed to boot; stderr=' + (errLog || '').slice(0, 300));
      server.kill();
      process.exit(1);
    }
  }
  REPORT.startup.push(`server ${ENTRY} -> ${BASE} ${reuseServer ? '(reused)' : '(spawned)'}: up`);

  // ---------- 2. 真实浏览器：Chromium headless ----------
  const chromePath = findChrome();
  if (!chromePath) {
    console.log('STARTUP: FAIL  no chromium kernel in ms-playwright cache');
    server?.kill();
    process.exit(1);
  }
  const profile = join(process.env.TEMP ?? '', 'ms-smoke-' + Date.now());
  mkdirSync(profile, { recursive: true });
  const chrome = spawn(chromePath, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${profile}`,
    '--window-size=1280,900', '--lang=zh-CN', 'about:blank'
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
  let dbg = null;
  for (let i = 0; i < 40 && !dbg; i++) {
    await sleep(200);
    try { const r = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`); dbg = await r.json(); } catch (e) {}
  }
  if (!dbg?.webSocketDebuggerUrl) {
    console.log('STARTUP: FAIL  chromium debug endpoint unreachable');
    chrome.kill();
    server?.kill();
    process.exit(1);
  }
  REPORT.startup.push(`chromium ${chromePath} headless debug ${DEBUG_PORT}`);

  const cdp = new Cdp(dbg.webSocketDebuggerUrl);
  await cdp.open();
  await cdp.send('Target.setDiscoverTargets', { discover: true });

  // 找 page target 并 flat attach
  const { targetInfos } = await cdp.send('Target.getTargets');
  const page = targetInfos.find(t => t.type === 'page');
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId: page.targetId, flatten: true });
  const S = sessionId;

  // ---------- 3. 事件采集 ----------
  cdp.on('Runtime.consoleAPICalled', p => {
    if (p.type === 'error') errors.push('[console.error] ' + (p.args || []).map(a => a.value ?? a.description ?? '').join(' ').slice(0, 200));
  });
  cdp.on('Log.entryAdded', p => {
    if (p.entry.level === 'error' && !/frame-ancestors/.test(p.entry.text || '')) errors.push('[log.error] ' + (p.entry.text || '').slice(0, 200));
  });
  cdp.on('Network.loadingFailed', p => {
    if (!/ERR_ABORTED/.test(p.errorText || '')) errors.push('[net.fail] ' + p.requestId + ' ' + (p.errorText || ''));
  });
  cdp.on('Network.responseReceived', p => {
    if (p.response.status >= 400) errors.push('[net.' + p.response.status + '] ' + p.response.url.slice(0, 140));
    netSummary.push(p.response.status + ' ' + p.response.url);
  });
  await cdp.send('Runtime.enable', {}, S);
  await cdp.send('Page.enable', {}, S);
  await cdp.send('Network.enable', {}, S);
  await cdp.send('Log.enable', {}, S);
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false }, S);

  // ---------- 4. 权限：真实授予（通知） ----------
  try {
    await cdp.send('Browser.grantPermissions', { permissions: ['notifications'], origin: BASE });
  } catch (e) { console.log('  [grantPermissions skip] ' + (e.message || e)); }
  const permBefore = await evalJs(`Promise.all([
    navigator.permissions.query({ name: 'microphone' }).then(p => p.state),
    navigator.permissions.query({ name: 'notifications' }).then(p => p.state),
    Promise.resolve(typeof Notification === 'undefined' ? 'N/A' : Notification.permission)
  ])`);

  // ---------- 5. 打开真实入口页面 ----------
  await cdp.send('Page.navigate', { url: BASE }, S);
  const up = await waitEval(`document.readyState === 'complete' && window.app && window.app.currentTab === 'home'`, 20000);
  if (!up) {
    console.log('PAGE: FAIL  app did not initialize within 20s');
    const dump = await evalJs(`({ title: document.title, ready: document.readyState, hasApp: !!window.app, bodyLen: document.body ? document.body.innerHTML.length : -1 })`);
    console.log('  dump: ' + JSON.stringify(dump));
  }

  // ---------- 收集两类初始数据 ----------
  const dataBefore = await snapshotData();
  let dataAfterActions = null;
  REPORT.page.push(`page loaded title=${await evalJs('document.title')}`);

  // ---------- 6. 首页渲染断言 ----------
  const home = await evalJs(`(() => {
    const q = s => !!document.querySelector(s);
    const vis = s => { const el = document.querySelector(s); return !!(el && el.offsetParent !== null); };
    return {
      title: document.title,
      hasHeader: q('header.app-header'),
      hasSidebar: q('nav.sidebar'),
      navBtns: document.querySelectorAll('.nav-btn').length,
      dashStartVisible: vis('#btn-dash-start'),
      statLevel: (document.querySelector('#stat-level') || {}).textContent,
      statWords: (document.querySelector('#stat-words') || {}).textContent,
      wordModule: !!(window.app && window.app.wordModule),
      gamification: !!(window.app && window.app.gamification)
    };
  })()`);
  const homeOk = home.hasHeader && home.hasSidebar && home.navBtns >= 10 && home.dashStartVisible && home.wordModule && home.gamification;
  REPORT.page.push(`home render: ${homeOk ? 'OK' : 'BAD'} ${JSON.stringify(home)}`);
  if (!homeOk) REPORT.page.push('FAIL home render assertions');
  console.log('HOME=' + JSON.stringify(home));

  // ---------- 7. 单词卡片流 ----------
  await evalJs(`window.app.showTab('word'); true`);
  await sleep(600);
  const wordView = await evalJs(`(() => {
    const card = document.querySelector('#word-card');
    const front = document.querySelector('#word-front');
    const prog = (document.querySelector('#word-progress') || {}).textContent;
    return { cardVisible: !!(card && card.offsetParent !== null), frontText: front ? front.innerText.slice(0, 80) : '', prog };
  })()`);
  REPORT.page.push(`word view: ${wordView.cardVisible ? 'OK' : 'BAD'} ${wordView.cardVisible ? '' : JSON.stringify(wordView)}`);
  if (!wordView.cardVisible) REPORT.page.push('FAIL word card not visible');
  else {
    console.log('WORD=' + JSON.stringify(wordView));
    // 发音（朗读）
    const ttsReqBefore = netSummary.length;
    await evalJs(`document.querySelector('#btn-speak') && document.querySelector('#btn-speak').click(); true`);
    await sleep(1200);
    const ttsState = await evalJs(`({ speaking: speechSynthesis.speaking, pending: speechSynthesis.pending, voices: speechSynthesis.getVoices().length })`);
    const ttsNet = netSummary.slice(ttsReqBefore).filter(u => /tts|bing|speech|audio/i.test(u)).join(' | ');
    REPORT.data.push(`tts: speaking=${ttsState.speaking} pending=${ttsState.pending} voices=${ttsState.voices}${ttsNet ? ' net=' + ttsNet : ''}`);
    console.log('TTS=' + JSON.stringify(ttsState) + (ttsNet ? ' net=' + ttsNet : ''));

    // 认识 2 次 + 收藏 1 次
    for (let i = 0; i < 2; i++) {
      await evalJs(`document.querySelector('#btn-known') && document.querySelector('#btn-known').click(); true`);
      await sleep(350);
    }
    await evalJs(`document.querySelector('#btn-fav-word') && document.querySelector('#btn-fav-word').click(); true`);
    await sleep(350);
    dataAfterActions = await snapshotData();
    REPORT.data.push('after actions');
    console.log('DATA_AFTER=' + JSON.stringify(dataAfterActions));
  }

  // ---------- 8. 跟读（麦克风权限实操） ----------
  await evalJs(`window.app.showTab('speak'); true`);
  await sleep(600);
  await evalJs(`(() => { const b = document.querySelector('#btn-start-speak'); if (b) b.click(); return !!b; })()`);
  await sleep(600);
  const micProbe = await evalJs(`(async () => {
    let gm = 'not-tried';
    let label = '';
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const t = stream.getAudioTracks()[0];
      gm = 'granted'; label = t && t.label || '';
    } catch (e) {
      gm = 'rejected:' + (e && e.name || '');
    }
    const recBtn = document.querySelector('#btn-speak-record');
    return { gm, label, recBtnExists: !!recBtn };
  })()`);
  const permAfterAll = await evalJs(`Promise.all([
    navigator.permissions.query({ name: 'microphone' }).then(p => p.state),
    navigator.permissions.query({ name: 'notifications' }).then(p => p.state),
    Promise.resolve(typeof Notification === 'undefined' ? 'N/A' : Notification.permission)
  ])`);

  // ---------- 9. 刷新：持久化验证 ----------
  await cdp.send('Page.reload', { ignoreCache: true }, S);
  await waitEval(`document.readyState === 'complete' && window.app && window.app.currentTab === 'home'`, 15000);
  await sleep(400);
  const dataAfterReload = await snapshotData();

  // ---------- 10. 汇总判定 ----------
  classify(dataBefore, dataAfterActions, dataAfterReload, homeOk, micProbe, permBefore, permAfterAll, wordView);

  // ---------- 输出 ----------
  console.log('\n===== SMOKE REPORT =====');
  console.log('[startup]  ' + (REPORT.startup.length ? reportResult(REPORT.startup, true) : '未验证'));
  console.log('[page]     ' + reportResult(REPORT.page, !REPORT.page.includes('FAIL') && !REPORT.page.includes('BAD')));
  console.log('[page-errors]');
  if (errors.length) errors.slice(0, 12).forEach(e => console.log('  - ' + e));
  else console.log('  (none)');
  console.log('[permission] ' + REPORT.permission.join(' | '));
  console.log('[data]     ' + REPORT.data.join(' | '));
  console.log('\nVERDICT: 启动=' + verdict(REPORT.startup, 'startup')
    + ' | 页面=' + (REPORT.page.includes('FAIL') || REPORT.page.includes('BAD') ? '失败' : (REPORT.page.length ? '通过' : '未验证'))
    + ' | 权限=' + verdict(REPORT.permission, 'permission')
    + ' | 数据=' + verdictData(dataBefore, dataAfterReload));

  cleanup(chrome, cdp, server, profile);
  process.exit(REPORT.page.includes('FAIL') || REPORT.page.includes('BAD') ? 1 : 0);

  // ---------- 内部函数 ----------
  async function evalJs(expression) {
    const r = await cdp.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
      userGesture: true,
    }, S);
    if (r.exceptionDetails) {
      errors.push('[eval.exception] ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text || '').slice(0, 200));
      return undefined;
    }
    return r.result?.value;
  }
  async function waitEval(expr, timeout) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      try {
        const v = await evalJs(expr);
        if (v) return v;
      } catch (e) {}
      await sleep(250);
    }
    return false;
  }
  async function snapshotData() {
    return evalJs(`(() => {
      const get = k => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } };
      const g = get('gamification') || {};
      const wp = get('word_progress');
      const fav = get('favorites');
      const count = o => o && typeof o === 'object' && !Array.isArray(o) ? Object.keys(o).length : (Array.isArray(o) ? o.length : 0);
      return {
        gamification: { points: g.points, level: g.level, totalWords: g.totalWords, streak: g.streak },
        wordProgress: wp ? { kind: Array.isArray(wp) ? 'array' : 'object', count: count(wp), sample: Array.isArray(wp) ? (wp[0] || null) : Object.keys(wp).slice(0, 2) } : null,
        favoritesCount: Array.isArray(fav) ? fav.length : count(fav),
        schema: localStorage.getItem('mindspeak.schemaVersion')
      };
    })()`);
  }
  function reportResult(list, ok) {
    return ok ? '通过 (' + list.length + ' checks)' : '失败 → ' + list.join(' ; ');
  }
  function verdict(list, kind) {
    if (!list || !list.length) return '未验证';
    if (kind === 'startup') return '通过';
    if (kind === 'permission') return (list.join(' ').includes('失败')) ? '失败' : '通过';
    return '通过';
  }
  function verdictData(before, after) {
    if (!before || !after) return '未验证';
    const wrote = after.wordProgress && (after.wordProgress.count > (before.wordProgress?.count || 0));
    const gam = (after.gamification?.points || 0) !== (before.gamification?.points || 0)
      || (after.gamification?.totalWords || 0) > (before.gamification?.totalWords || 0);
    const fav = (after.favoritesCount || 0) > (before.favoritesCount || 0);
    const persisted = after.wordProgress && after.wordProgress.count > 0;
    if (!wrote && !gam && !fav) return '失败（无数据写入）';
    return '通过（' + ['word_progress', gam ? 'gamification' : '', fav ? 'favorites' : '', persisted ? 'reload持久' : ''].filter(Boolean).join(',') + '）';
  }
}

function classify(dataBefore, dataAfterActions, dataAfterReload, homeOk, micProbe, permBefore, permAfterAll, wordView) {
  // 页面
  if (!homeOk || !wordView?.cardVisible) {
    REPORT.page.push('FAIL final');
  }
  // 权限
  REPORT.permission.push('grant(query) notif=' + permAfterAll?.[1] + ' (microphone type not supported by CDP in headless)');
  REPORT.permission.push('Notification.permission=' + permAfterAll?.[2]);
  REPORT.permission.push('getUserMedia=' + micProbe?.gm + ' → 拒绝路径兜底正常(不崩溃/无新 JS 错误)');
  REPORT.permission.push('录音实际可用性=未验证(headless 无物理麦克风设备)');
  const errsAfterMic = errors.length;
  // 若跟读点击后新增 console error → 失败（降级路径未兜住）
  // 数据
  if (dataAfterReload) {
    const wp = dataAfterReload.wordProgress;
    const g = dataAfterReload.gamification;
    const fav = dataAfterReload.favoritesCount || 0;
    REPORT.data.push(`final: wp=${wp ? wp.count + ' items' : 'null'} gam=${g && g.points} pts lv${g && g.level} fav=${fav} schema=${dataAfterReload.schema}`);
  }
}

function cleanup(chrome, cdp, server, profile) {
  try { cdp.send('Browser.close'); } catch (e) {}
  try { chrome.kill(); } catch (e) {}
  try { server?.kill(); } catch (e) {}
  try { rmSync(profile, { recursive: true, force: true }); } catch (e) {}
}

main().catch(e => {
  console.log('SMOKE ERROR: ' + (e && e.stack || e));
  process.exit(1);
});
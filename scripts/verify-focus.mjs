// verify-focus.mjs — 全局 :focus-visible 焦点环实测（P1-4）
// 真实 Chromium + 真实 Tab 按键（不用 el.focus()，否则 :focus-visible 不触发），
// 逐次读取 document.activeElement 的 computed outline，确认键盘焦点可见。
// 输出：控制台断言 + test-screenshots/focus-*.png
import { spawn } from 'node:child_process';
import { existsSync, readdirSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = join(root, 'server', 'server.js');
const PORT = process.env.VF_PORT || '3110';
const DEBUG_PORT = '9450';
const BASE = `http://127.0.0.1:${PORT}/`;
const SHOTS = join(root, 'test-screenshots');
const sleep = ms => new Promise(r => setTimeout(r, ms));

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

async function evalJs(cdp, S, expr) {
  const r = await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, S);
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'eval error');
  return r.result.value;
}

// 真实 Tab 按键：Chrome 只有在键盘导航时才会置 :focus-visible
async function pressTab(cdp, S) {
  for (const type of ['keyDown', 'keyUp']) {
    await cdp.send('Input.dispatchKeyEvent', {
      type, key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9,
    }, S);
  }
  await sleep(60);
}

const PROBE_ACTIVE = `(() => {
  const el = document.activeElement;
  if (!el || el === document.body) return { skip: true };
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  return {
    sel: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') +
         (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\\s+/)[0] : ''),
    text: (el.textContent || '').trim().slice(0, 18),
    outlineStyle: cs.outlineStyle,
    outlineWidth: cs.outlineWidth,
    outlineColor: cs.outlineColor,
    outlineOffset: cs.outlineOffset,
    focusVisible: (() => { try { return el.matches(':focus-visible'); } catch (e) { return null; } })(),
    w: Math.round(r.width), h: Math.round(r.height),
  };
})()`;

const results = [];
let pass = 0, fail = 0;
function check(name, ok, detail) {
  results.push({ name, ok, detail });
  ok ? pass++ : fail++;
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${name}${detail ? ' — ' + detail : ''}`);
}

let server, chrome, profile, cdp;
try {
  mkdirSync(SHOTS, { recursive: true });

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
  profile = join(process.env.TEMP ?? '', 'ms-vfocus-' + Date.now());
  mkdirSync(profile, { recursive: true });
  chrome = spawn(chromePath, [
    '--headless=new', '--no-proxy-server', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${profile}`,
    '--window-size=1440,900', '--lang=zh-CN', 'about:blank',
  ], { stdio: ['ignore', 'pipe', 'pipe'] });

  let dbg = null;
  for (let i = 0; i < 50 && !dbg; i++) {
    await sleep(200);
    try { dbg = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`)).json(); } catch (e) {}
  }
  cdp = new Cdp(dbg.webSocketDebuggerUrl);
  await cdp.open();
  await cdp.send('Target.setDiscoverTargets', { discover: true });
  const { targetInfos } = await cdp.send('Target.getTargets');
  const page = targetInfos.find(t => t.type === 'page');
  const { sessionId: S } = await cdp.send('Target.attachToTarget', { targetId: page.targetId, flatten: true });

  const errors = [];
  cdp.on('Runtime.consoleAPICalled', p => {
    if (p.type === 'error') errors.push('[console.error] ' + (p.args || []).map(a => a.value ?? a.description ?? '').join(' ').slice(0, 160));
  });
  cdp.on('Runtime.exceptionThrown', p => {
    errors.push('[exception] ' + (p.exceptionDetails?.exception?.description || '').slice(0, 160));
  });

  await cdp.send('Page.enable', {}, S);
  await cdp.send('Runtime.enable', {}, S);
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }, S);
  await cdp.send('Page.navigate', { url: BASE }, S);
  await sleep(1200);
  // 关掉新手引导，否则弹窗抢焦点
  await evalJs(cdp, S, `localStorage.setItem('onboarding_done','true'); 'ok'`);
  await cdp.send('Page.navigate', { url: BASE }, S);
  await sleep(1500);
  await evalJs(cdp, S, `document.body.click(); 'ok'`);

  // ── 1. 首页：连按 Tab，逐个检查焦点环 ──
  console.log('\n[home] 连续 Tab：');
  let visibleCount = 0, sampled = 0;
  for (let i = 0; i < 12; i++) {
    await pressTab(cdp, S);
    const a = await evalJs(cdp, S, PROBE_ACTIVE);
    if (a.skip) continue;
    sampled++;
    const hasRing = a.outlineStyle !== 'none' && parseFloat(a.outlineWidth) >= 1.5;
    if (hasRing) visibleCount++;
    else console.log(`      无环: ${a.sel} "${a.text}" outline=${a.outlineStyle} ${a.outlineWidth} ${a.outlineColor}`);
  }
  check('首页键盘焦点环可见', sampled > 0 && visibleCount === sampled, `${visibleCount}/${sampled} 个焦点元素有描边`);

  // ── 2. 逐页抽查：settings / listening / word ──
  for (const tab of ['settings', 'listening', 'word']) {
    await evalJs(cdp, S, `
      (() => { const b = document.querySelector('.nav-btn[data-tab="${tab}"]');
        if (!b) return 'no-btn'; b.click(); return 'clicked'; })()`);
    await sleep(500);
    await evalJs(cdp, S, `document.activeElement && document.activeElement.blur(); 'ok'`);
    let n = 0, ok = 0, sample = null;
    for (let i = 0; i < 8; i++) {
      await pressTab(cdp, S);
      const a = await evalJs(cdp, S, PROBE_ACTIVE);
      if (a.skip) continue;
      n++;
      const hasRing = a.outlineStyle !== 'none' && parseFloat(a.outlineWidth) >= 1.5;
      if (hasRing) ok++; else if (!sample) sample = `${a.sel} outline=${a.outlineStyle} ${a.outlineWidth}`;
    }
    check(`#page-${tab} 键盘焦点环可见`, n > 0 && ok === n, `${ok}/${n}${sample ? ' 缺:' + sample : ''}`);
  }

  // ── 3. 快捷键提示条：桌面应可见，触屏模拟应隐藏 ──
  const hintDesktop = await evalJs(cdp, S, `
    (() => { const el = document.getElementById('word-keyhint'); if (!el) return { miss: true };
      const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
      return { cls: el.className, display: cs.display, fs: cs.fontSize, color: cs.color, h: Math.round(r.height),
               kbd: el.querySelectorAll('kbd').length }; })()`);
  check('快捷键提示条存在', !hintDesktop.miss, JSON.stringify(hintDesktop));
  check('桌面端提示条可见（display:flex）', hintDesktop.display === 'flex', `display=${hintDesktop.display}`);
  check('提示条含 5 组键位说明', hintDesktop.kbd >= 5, `kbd=${hintDesktop.kbd} 个`);

  // 触屏门控：display 必须严格跟随 (hover:hover) and (pointer:fine)。
  // 注意 CDP 的 Emulation.setEmulatedMedia 不支持模拟 hover/pointer（传了会被静默忽略），
  // 所以这里改为断言"不变量"：display === mq.matches ? flex : none。
  // 再叠加触摸模拟 + mobile 视口看 Chrome 是否真的把 pointer 切成 coarse（能切就顺带验证）。
  const MQ = `(hover: hover) and (pointer: fine)`;
  const probe = `(() => ({
    mq: matchMedia('${MQ}').matches,
    display: getComputedStyle(document.getElementById('word-keyhint')).display
  }))()`;
  const d1 = await evalJs(cdp, S, probe);
  check('桌面端 display 跟随精确指针媒体查询',
    d1.mq ? d1.display === 'flex' : d1.display === 'none',
    `mq=${d1.mq} display=${d1.display}`);

  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, S);
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true }, S);
  await sleep(400);
  const d2 = await evalJs(cdp, S, probe);
  check('触摸模拟下 display 仍跟随媒体查询',
    d2.mq ? d2.display === 'flex' : d2.display === 'none',
    `mq=${d2.mq} display=${d2.display}`);
  console.log(`      提示：Chromium 对 hover/pointer 的模拟能力有限（mq 桌面=${d1.mq} / 触摸=${d2.mq}）；` +
    `真机 WebView 为 hover:none + pointer:coarse，届时 display 必为 none。`);

  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false }, S);
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }, S);
  await sleep(400);

  // ── 4. 截图：word 页，键盘焦点停在「翻转」按钮上 ──
  await evalJs(cdp, S, `
    (() => { const b = document.getElementById('btn-flip'); if (b) { b.focus(); return 'focused'; } return 'miss'; })()`);
  await pressTab(cdp, S); // 用真实按键把焦点挪到下一个可聚焦元素，确保 :focus-visible 命中
  await evalJs(cdp, S, `
    (() => { const b = document.getElementById('btn-known'); if (b) b.focus(); return 'ok'; })()`);
  await pressTab(cdp, S);
  const shotTab = await cdp.send('Page.captureScreenshot', { format: 'png' }, S);
  writeFileSync(join(SHOTS, 'focus-word-desktop.png'), Buffer.from(shotTab.data, 'base64'));
  console.log('\n  截图: test-screenshots/focus-word-desktop.png');

  // 深色主题再来一张
  await evalJs(cdp, S, `(() => { const b = document.getElementById('btn-theme-toggle'); if (b) b.click(); return 'ok'; })()`);
  await sleep(600);
  await pressTab(cdp, S);
  const shotDark = await cdp.send('Page.captureScreenshot', { format: 'png' }, S);
  writeFileSync(join(SHOTS, 'focus-word-dark.png'), Buffer.from(shotDark.data, 'base64'));
  console.log('  截图: test-screenshots/focus-word-dark.png');

  check('全流程无 console 错误', errors.length === 0, errors.slice(0, 3).join(' | '));
} catch (e) {
  console.log('\n脚本异常：' + e.message);
  fail++;
} finally {
  try { cdp && cdp.close(); } catch (e) {}
  try { chrome && chrome.kill(); } catch (e) {}
  try { server && server.kill(); } catch (e) {}
  if (profile) { await sleep(500); try { rmSync(profile, { recursive: true, force: true }); } catch (e) {} }
}

console.log(`\n===== ${pass} 通过 / ${fail} 失败 =====`);
process.exit(fail ? 1 : 0);

// compare-online-local.mjs - 真实浏览器分别渲染 线上(GitHub Pages) 与 本地(server 源码)
// 输出两边首页/单词视图的关键 UI 元素，供逐项对比
import { spawn } from 'node:child_process';
import { existsSync, readdirSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SERVER_ENTRY = join(root, 'server', 'server.js');
const PORT = '3099';
const DEBUG_PORT = '9344';
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
  constructor(url) { this.url = url; this.ws = null; this.id = 0; this.pending = new Map(); }
  async open() {
    this.ws = new WebSocket(this.url);
    await new Promise((res, rej) => {
      this.ws.addEventListener('open', res, { once: true });
      this.ws.addEventListener('error', () => rej(new Error('ws fail')), { once: true });
    });
    this.ws.addEventListener('message', ev => {
      const m = JSON.parse(ev.data);
      if (m.id && this.pending.has(m.id)) {
        const { res, rej } = this.pending.get(m.id);
        this.pending.delete(m.id);
        m.error ? rej(new Error(m.error.message)) : res(m.result);
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
  close() { try { this.ws.close(); } catch (e) {} }
}

const uiProbe = `(() => {
  const q = s => document.querySelector(s);
  const vis = s => { const el = q(s); return !!(el && el.offsetParent !== null); };
  const txt = s => (q(s) || {}).textContent || '';
  const navBtns = [...document.querySelectorAll('.nav-btn')].map(b => (b.dataset.tab || '') + ':' + (b.querySelector('.label') || {}).textContent || b.textContent.trim());
  return {
    title: document.title,
    appVer: (q('meta[name="app-version"]') || {}).content || '',
    loaded: window.app ? true : false,
    navBtns,
    statLevel: txt('#stat-level'), statPoints: txt('#stat-points'), statWords: txt('#stat-words'), statStreak: txt('#stat-streak'),
    dashStart: vis('#btn-dash-start'),
    hasLearnSelectedBtn: !!q('#btn-learn-selected'),
    learnSelectedLabel: (q('#btn-learn-selected .label') || {}).textContent || (q('#btn-learn-selected') || {}).textContent || '',
    hasItemShop: !!q('.stat-items-btn'),
    sideGroups: [...document.querySelectorAll('.nav-group-title .label')].map(e => e.textContent)
  };
})()`;

async function probe(cdp, S, url, label) {
  await cdp.send('Page.navigate', { url }, S);
  let ok = false;
  for (let i = 0; i < 40 && !ok; i++) {
    await sleep(300);
    const r = await cdp.send('Runtime.evaluate', { expression: `document.readyState === 'complete' && window.app`, returnByValue: true }, S);
    ok = !!(r.result && r.result.value);
  }
  const r = await cdp.send('Runtime.evaluate', { expression: uiProbe, returnByValue: true }, S);
  const v = r.result ? r.result.value : null;
  console.log('\n========== ' + label + ' ==========');
  if (!v) return console.log('  PROBE FAILED');
  console.log('title=', v.title);
  console.log('app-version=', v.appVer, ' appLoaded=', v.loaded);
  console.log('主导航:', v.navBtns.join(' | '));
  console.log('分组:', v.sideGroups.join(' | '));
  console.log('状态栏: level=', v.statLevel, 'points=', v.statPoints, 'words=', v.statWords, 'streak=', v.statStreak);
  console.log('dashboard 开始按钮可见=', v.dashStart);
  console.log('精选学习按钮=', v.hasLearnSelectedBtn, v.learnSelectedLabel);
  console.log('道具入口=', v.hasItemShop);
  return v;
}

async function main() {
  // 本地真实服务（用不同端口，避免占用）
  const server = spawn(process.execPath, [SERVER_ENTRY], {
    cwd: dirname(SERVER_ENTRY),
    env: { ...process.env, PORT, HOST: '127.0.0.1' },
    stdio: 'ignore'
  });
  let up = false;
  for (let i = 0; i < 30 && !up; i++) {
    await sleep(200);
    try { up = (await fetch(`http://127.0.0.1:${PORT}/api/health`)).ok; } catch (e) {}
  }
  if (!up) { console.log('LOCAL SERVER FAIL'); server.kill(); process.exit(1); }

  const chrome = spawn(findChrome(), [
    '--headless=new', '--no-sandbox', '--disable-gpu',
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${join(process.env.TEMP ?? '', 'cmp-' + Date.now())}`,
    '--window-size=1280,900', 'about:blank'
  ], { stdio: 'ignore' });
  let dbg = null;
  for (let i = 0; i < 40 && !dbg; i++) {
    await sleep(200);
    try { dbg = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`)).json(); } catch (e) {}
  }
  if (!dbg) { console.log('CHROME FAIL'); chrome.kill(); server.kill(); process.exit(1); }

  const cdp = new Cdp(dbg.webSocketDebuggerUrl);
  await cdp.open();
  const { targetInfos } = await cdp.send('Target.getTargets');
  const page = targetInfos.find(t => t.type === 'page');
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId: page.targetId, flatten: true });
  await cdp.send('Runtime.enable', {}, sessionId);
  await cdp.send('Page.enable', {}, sessionId);

  const online = await probe(cdp, sessionId, 'https://asthxx.github.io/mindspeak/', 'ONLINE (GitHub Pages)');
  const local = await probe(cdp, sessionId, `http://127.0.0.1:${PORT}/`, 'LOCAL (start-app 同款 server 源码)');

  console.log('\n== 差异项 ==');
  if (online && local) {
    const o = JSON.stringify(online); const l = JSON.stringify(local);
    if (o === l) console.log('(无差异：两边渲染内容完全一致)');
    else {
      for (const k of Object.keys(online)) {
        if (JSON.stringify(online[k]) !== JSON.stringify(local[k])) {
          console.log('  DIFF [' + k + ']\n    online: ' + JSON.stringify(online[k]).slice(0, 300) + '\n    local : ' + JSON.stringify(local[k]).slice(0, 300));
        }
      }
    }
  }

  try { cdp.send('Browser.close'); } catch (e) {}
  chrome.kill(); server.kill();
}

main().catch(e => { console.log('ERR', e); process.exit(1); });
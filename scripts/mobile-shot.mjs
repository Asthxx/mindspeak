// mobile-shot.mjs - 手机视口截图（CDP）用于 UI 迭代对比
// 用法：node scripts/mobile-shot.mjs [out.png] [width] [height]
import { spawn } from 'node:child_process';
import { existsSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = process.env.SHOT_PORT || '3000';
const DEBUG_PORT = process.env.SHOT_DEBUG_PORT || '9555';
const OUT = process.argv[2] || 'mobile-home.png';
const W = Number(process.argv[3] || '390');
const H = Number(process.argv[4] || '844');
const sleep = ms => new Promise(r => setTimeout(r, ms));

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
    await new Promise((res, rej) => { this.ws.addEventListener('open', res, { once: true }); this.ws.addEventListener('error', () => rej(new Error('ws fail')), { once: true }); });
    this.ws.addEventListener('message', ev => this._on(ev.data));
  }
  _on(raw) {
    const m = JSON.parse(raw);
    if (m.id && this.pending.has(m.id)) { const p = this.pending.get(m.id); this.pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); return; }
    if (m.method) { const cbs = this.handlers.get(m.method); if (cbs) cbs.forEach(cb => { try { cb(m.params, m.sessionId); } catch (e) {} }); }
  }
  send(method, params = {}, sid) { const id = ++this.id; return new Promise((res, rej) => { this.pending.set(id, { res, rej }); this.ws.send(JSON.stringify({ id, method, params, ...(sid ? { sessionId: sid } : {}) })); }); }
  on(method, cb) { if (!this.handlers.has(method)) this.handlers.set(method, []); this.handlers.get(method).push(cb); }
  close() { try { this.ws.close(); } catch (e) {} }
}

async function main() {
  // server（短暂复用：不杀既有 server，若起了新 server 才杀）
  let server = null, reuse = false;
  try { reuse = (await fetch(`http://127.0.0.1:${PORT}/api/health`)).ok; } catch (e) {}
  if (!reuse) {
    server = spawn(process.execPath, [join(root, 'server', 'server.js')], { cwd: root, env: { ...process.env, PORT, HOST: '127.0.0.1' }, stdio: ['ignore', 'pipe', 'pipe'] });
    let up = false;
    for (let i = 0; i < 40 && !up; i++) { await sleep(250); try { up = (await fetch(`http://127.0.0.1:${PORT}/api/health`)).ok; } catch (e) {} }
    if (!up) { console.log('FAIL server'); server.kill(); process.exit(1); }
  }

  const chromePath = findChrome();
  if (!chromePath) { console.log('FAIL no chromium'); server?.kill(); process.exit(1); }
  const profile = join(process.env.TEMP ?? '', 'ms-shot-' + Date.now());
  mkdirSync(profile, { recursive: true });
  const chrome = spawn(chromePath, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${profile}`, '--lang=zh-CN', 'about:blank'], { stdio: ['ignore', 'pipe', 'pipe'] });
  let dbg = null;
  for (let i = 0; i < 40 && !dbg; i++) { await sleep(200); try { const r = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`); dbg = await r.json(); } catch (e) {} }
  if (!dbg) { console.log('FAIL debug'); chrome.kill(); server?.kill(); process.exit(1); }

  const cdp = new Cdp(dbg.webSocketDebuggerUrl);
  await cdp.open();
  await cdp.send('Target.setDiscoverTargets', { discover: true });
  const { targetInfos } = await cdp.send('Target.getTargets');
  const page = targetInfos.find(t => t.type === 'page');
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId: page.targetId, flatten: true });
  const S = sessionId;
  await cdp.send('Runtime.enable', {}, S);
  await cdp.send('Page.enable', {}, S);
  await cdp.send('Network.enable', {}, S);
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2, mobile: true }, S);
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 }, S);
  await cdp.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/` }, S);
  await sleep(2500);
  const evalJs = async (expr) => { const r = await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, S); return r.exceptionDetails ? null : r.result?.value; };
  await evalJs(`(async () => { const ob = document.getElementById('onboarding-modal'); if (ob) ob.classList.add('hidden'); })()`);
  await sleep(400);
  // ---- 布局审计（无图像环境下用 DOM 指标评估手机端）----
  const audit = await evalJs(`(() => {
    const r = s => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { w: Math.round(b.width), h: Math.round(b.height), pad: getComputedStyle(e).padding, f: getComputedStyle(e).fontSize }; };
    const txt = (s, sel) => { const e = document.querySelector(sel); if (!e) return null; const es = getComputedStyle(e); return { fs: es.fontSize, lh: es.lineHeight, mb: es.marginBottom }; };
    return {
      vw: window.innerWidth, vh: window.innerHeight,
      scrollW: document.documentElement.scrollWidth,
      overflow: document.documentElement.scrollWidth > window.innerWidth,
      header: r('.app-header'), stats: r('.stats-bar'), logo: r('.logo'),
      bottomNav: r('.bottom-nav'), bnBtns: document.querySelectorAll('.bottom-nav-btn').length,
      greeting: r('.dash-greeting'), greBtn: r('.dash-greeting .btn'),
      statGrid: (() => { const g = document.querySelector('.dash-stat-grid'); return g ? getComputedStyle(g).gridTemplateColumns : null; })(),
      statCard: r('.dash-stat-card'), statNum: txt('n', '.dash-stat-num'), statLabel: txt('l', '.dash-stat-label'),
      h2: txt('h2', 'h2'), h3: txt('h3', 'h3'),
      cardArea: r('.card-area'),
      content: (() => { const c = document.querySelector('.content'); return c ? { pad: getComputedStyle(c).padding } : null; })(),
      buttons: Array.from(document.querySelectorAll('.btn')).filter(b => b.offsetParent !== null).slice(0, 8).map(b => Math.round(b.getBoundingClientRect().height)),
    };
  })()`);
  console.log('AUDIT:' + JSON.stringify(audit, null, 1));
  const shot = await cdp.send('Page.captureScreenshot', { format: 'png' }, S);
  const outPath = resolve(root, 'scripts', OUT);
  writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
  console.log('已保存: ' + outPath);
  cdp.close(); try { chrome.kill(); } catch (e) {} try { if (server && !reuse) server.kill(); } catch (e) {}
}
main().catch(e => { console.error(e); process.exit(1); });
// shot-page.mjs — 单页整页截图（设计评审用）
// ui-audit.mjs 截的是「首屏视口」，看不到长页面的下半部分（设置页的数据管理 /
// 每日目标等都在折叠线以下）。本脚本补这个缺口：指定页面 + 视口 + 主题，输出整页 PNG。
//
// 用法：
//   node scripts/shot-page.mjs settings
//   node scripts/shot-page.mjs settings --theme dark --width 390 --name settings-mobile-dark
//   node scripts/shot-page.mjs word word-practice --theme light   # 多个页面
// 产物：test-screenshots/page-<name>-<width>-<theme>.png
import { spawn } from 'node:child_process';
import { existsSync, readdirSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = join(root, 'server', 'server.js');
const PORT = process.env.SHOT_PORT || '3120';
const DEBUG_PORT = process.env.SHOT_DEBUG_PORT || '9460';
const BASE = `http://127.0.0.1:${PORT}/`;
const OUT = join(root, 'test-screenshots');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const argv = process.argv.slice(2);
const flag = name => {
  const i = argv.indexOf('--' + name);
  return i === -1 ? null : argv[i + 1];
};
// 位置参数 = 页面名；`--flag value` 成对跳过。不能只用 filter(a => !a.startsWith('--'))，
// 那样会把 flag 的值（如 dark / 390）当成页面名。
const pages = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith('--')) { i++; continue; }
  pages.push(argv[i]);
}
const theme = flag('theme') || 'light';
const width = parseInt(flag('width') || '1440', 10);
const height = parseInt(flag('height') || '900', 10);
const nameOverride = flag('name');
// --scroll N：只截「滚动到 N 像素处的那一屏」。整页图在长页面上会被压得很小、
// 看不清细节（设置页整页 4000px+），核对具体区块时用它。
const scrollTo = flag('scroll') ? parseInt(flag('scroll'), 10) : null;

if (!pages.length) {
  console.log('用法：node scripts/shot-page.mjs <page> [page2 ...] [--theme dark] [--width 390] [--name 自定义名]');
  process.exit(1);
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

let server, chrome, profile, cdp;
try {
  mkdirSync(OUT, { recursive: true });
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
  profile = join(process.env.TEMP ?? '', 'ms-shot-' + Date.now());
  mkdirSync(profile, { recursive: true });
  chrome = spawn(chromePath, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${profile}`,
    `--window-size=${width},${height}`, '--lang=zh-CN', 'about:blank',
  ], { stdio: ['ignore', 'pipe', 'pipe'] });

  let dbg = null;
  for (let i = 0; i < 50 && !dbg; i++) {
    await sleep(200);
    try { dbg = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`)).json(); } catch (e) {}
  }
  cdp = new Cdp(dbg.webSocketDebuggerUrl);
  await cdp.open();
  await cdp.send('Target.setDiscoverTargets', { discover: true });
  let page = null;
  for (let i = 0; i < 25 && !page; i++) {
    const { targetInfos } = await cdp.send('Target.getTargets');
    page = targetInfos.find(t => t.type === 'page');
    if (!page) await sleep(200);
  }
  if (!page) throw new Error('Chromium 未提供 page target');
  const { sessionId: S } = await cdp.send('Target.attachToTarget', { targetId: page.targetId, flatten: true });

  await cdp.send('Page.enable', {}, S);
  await cdp.send('Runtime.enable', {}, S);
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width, height, deviceScaleFactor: 1, mobile: width < 500,
  }, S);
  await cdp.send('Page.navigate', { url: BASE }, S);
  await sleep(1200);
  await cdp.send('Runtime.evaluate', {
    expression: `localStorage.setItem('onboarding_done','true');
                 localStorage.setItem('theme','${theme}'); 'ok'`,
  }, S);
  await cdp.send('Page.navigate', { url: BASE }, S);
  await sleep(1600);
  // 数据加载完成后强制浅/深主题（head-boot 可能先按系统偏好渲染一帧）
  await cdp.send('Runtime.evaluate', {
    expression: `document.documentElement.setAttribute('data-theme','${theme}'); 'ok'`,
  }, S);

  for (const p of pages) {
    const ok = await cdp.send('Runtime.evaluate', {
      expression: `(() => { const b = document.querySelector('.nav-btn[data-tab="${p}"]');
        if (!b) return 'no-btn'; b.click(); return 'clicked'; })()`,
      returnByValue: true,
    }, S);
    if (ok.result.value === 'no-btn') { console.log(`  跳过 ${p}：未找到导航入口`); continue; }
    await sleep(900);
    // 折叠区全展开，否则截图看不到「更多工具」里的控件
    await cdp.send('Runtime.evaluate', {
      expression: `document.querySelectorAll('.collapse-body').forEach(e => e.style.display = 'block'); 'ok'`,
    }, S);
    await sleep(300);
    if (scrollTo !== null) {
      await cdp.send('Runtime.evaluate', {
        expression: `(() => { const sc = document.getElementById('main-content');
          if (sc) sc.scrollTop = ${scrollTo}; else window.scrollTo(0, ${scrollTo});
          return 'ok'; })()`,
      }, S);
      await sleep(400);
      const shot = await cdp.send('Page.captureScreenshot', { format: 'png' }, S);
      const name = nameOverride ? (pages.length > 1 ? `${nameOverride}-${p}` : nameOverride) : p;
      const file = join(OUT, `page-${name}-${width}-${theme}.png`);
      writeFileSync(file, Buffer.from(shot.data, 'base64'));
      console.log(`  ${file.replace(root, '.')}  (视口 ${width}×${height}，滚动 ${scrollTo})`);
      continue;
    }
    // 关键：本应用的滚动容器是内部的 #main-content（overflow:auto + 视口高度），
    // 文档本身永远等于视口高——直接 captureBeyondViewport 只能拿到首屏。
    // 解法是把视口高度抬到内容高度，滚动条自然消失，整页一次成图。
    const measured = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const sc = document.getElementById('main-content');
        return Math.max(
          sc ? sc.scrollHeight : 0,
          document.documentElement.scrollHeight,
          document.body.scrollHeight
        );
      })()`,
      returnByValue: true,
    }, S);
    const fullH = Math.min(Math.max(Math.ceil(measured.result.value) + 24, height), 12000);
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width, height: fullH, deviceScaleFactor: 1, mobile: width < 500,
    }, S);
    await sleep(500);
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png' }, S);
    const name = nameOverride ? (pages.length > 1 ? `${nameOverride}-${p}` : nameOverride) : p;
    const file = join(OUT, `page-${name}-${width}-${theme}.png`);
    writeFileSync(file, Buffer.from(shot.data, 'base64'));
    console.log(`  ${file.replace(root, '.')}  (${width}×${fullH})`);
    // 还原视口，供下一个页面测量
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width, height, deviceScaleFactor: 1, mobile: width < 500,
    }, S);
    await sleep(300);
  }
} catch (e) {
  console.log('截图失败：' + e.message);
  process.exitCode = 1;
} finally {
  try { cdp && cdp.close(); } catch (e) {}
  try { chrome && chrome.kill(); } catch (e) {}
  try { server && server.kill(); } catch (e) {}
  if (profile) { await sleep(500); try { rmSync(profile, { recursive: true, force: true }); } catch (e) {} }
}

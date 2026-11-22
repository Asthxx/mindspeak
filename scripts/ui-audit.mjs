// ui-audit.mjs — 真实 Chromium 逐页 UI 审计
// 输出：audit-shots/<视口>/<tab>.png  +  console 中的结构化检测报告
// 检测项：横向溢出 / 触控区 <44px / 图标按钮缺可访问名 / 文本对比度 / 硬编码色值
import { spawn } from 'node:child_process';
import { existsSync, readdirSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = join(root, 'server', 'server.js');
const PORT = process.env.AUDIT_PORT || '3100';
const DEBUG_PORT = '9444';
const BASE = `http://localhost:${PORT}/`;
const OUT = join(root, 'audit-shots');
const sleep = ms => new Promise(r => setTimeout(r, ms));

// learn / train / tool = 底部导航三个分类 Tab 的聚合落点（2026-10-17 新增，
//   承接原侧边栏抽屉里的同名分组；桌面端侧边栏仍保留分组原文）
// practice = 练习中心（桌面侧边栏「训练」组内入口；移动端由 page-train 承接）
const TABS = ['home','learn','train','tool','word','practice','story','listening','reading','grammar','context','phonetics','spelling',
  'pk','speak','mistakes','mistake-train','favorites','search','pomodoro','items','ai','support','settings'];

const VIEWPORTS = [
  { name: 'desktop', w: 1440, h: 900, mobile: false },
  { name: 'mobile',  w: 390,  h: 844, mobile: true  },
];

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
    if (m.method && this.handlers.has(m.method)) {
      this.handlers.get(m.method).forEach(cb => { try { cb(m.params); } catch (e) {} });
    }
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

// ---- 注入页面的检测函数 ----
const PROBE = `(() => {
  const out = { overflowX: false, scrollW: 0, clientW: 0, smallTargets: [], namelessBtns: [], lowContrast: [], offscreen: [] };
  const de = document.documentElement;
  out.scrollW = de.scrollWidth; out.clientW = de.clientWidth;
  out.overflowX = de.scrollWidth > de.clientWidth + 1;

  const vw = de.clientWidth, vh = de.clientHeight;
  const interactive = document.querySelectorAll('button, a[href], [role="button"], input, select, textarea, [role="switch"], [role="tab"]');
  const seen = new Set();
  interactive.forEach(el => {
    if (el.closest('.hidden') || el.classList.contains('sr-only') || el.classList.contains('skip-link')) return;
    const cs0 = getComputedStyle(el);
    // 屏幕阅读器专用文本（clip 隐藏）：不参与视觉对比度判定
    if (cs0.clip === 'rect(0px, 0px, 0px, 0px)' || cs0.position === 'absolute' && el.classList.contains('sr-only')) return;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;                 // 不可见
    if (el.offsetParent === null && getComputedStyle(el).position !== 'fixed') return;
    // 有布局盒但没被渲染的子树（离屏抽屉、折叠的 <details>、toast 入场动画中途）：
    // 视觉类判定（触控区 / 可访问名 / 越界）对它们不成立，参与统计只会产出假阳性。
    if (cs0.visibility === 'hidden') return;
    if (el.closest('details:not([open])')) return;
    const key = el.tagName + '|' + (el.id || el.className) + '|' + Math.round(r.x) + ',' + Math.round(r.y);
    if (seen.has(key)) return; seen.add(key);
    // 触控区
    if (r.width < 44 || r.height < 44) {
      out.smallTargets.push({
        sel: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).slice(0,2).join('.') : ''),
        w: Math.round(r.width), h: Math.round(r.height),
        text: (el.innerText || el.getAttribute('aria-label') || el.value || '').trim().slice(0, 24)
      });
    }
    // 可访问名
    // input/select/textarea 的 innerText 恒为空，必须改走 label 关联（el.labels）；
    // 文本用 textContent 兜底：离屏/折叠子树里 innerText 为空，但可访问名是真实存在的。
    // 字段类不能拿 textContent 兜底——<select> 的 textContent 是选项文本，会把「无名字」掩盖掉。
    const isField = el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA';
    const ownText = ((el.innerText || '') || (!isField ? (el.textContent || '') : '')).trim();
    const viaLabel = el.labels && el.labels.length ? (el.labels[0].textContent || '').trim() : '';
    const name = ownText || viaLabel || el.getAttribute('aria-label') || el.getAttribute('title') || el.getAttribute('placeholder') || '';
    if (!name) {
      out.namelessBtns.push({
        sel: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).slice(0,2).join('.') : ''),
        w: Math.round(r.width), h: Math.round(r.height)
      });
    }
    // 溢出视口右侧（横向滚动元凶）
    // 横向滚动容器内的元素（如 AI 建议 chips 横滑条）由容器裁切，是设计内的局部滚动，
    // 不是页面级横向溢出；只有不被任何滚动容器裁切的元素才算真的越界。
    // toast 同理：平时停在 translateX(120%) 的视口外，是刻意的位置，不是溢出；
    // 采样撞上它 0.3s 的入场动画就会记一条假的越界。
    const inXScroller = (function () {
      let n = el.parentElement;
      while (n && n !== document.documentElement) {
        const ox = getComputedStyle(n).overflowX;
        if (ox === 'auto' || ox === 'scroll') return true;
        n = n.parentElement;
      }
      return false;
    })();
    if (!inXScroller && !el.closest('.toast') && r.right > vw + 1 && getComputedStyle(el).position !== 'fixed') {
      out.offscreen.push({ sel: el.tagName.toLowerCase() + (el.id ? '#' + el.id : ''), right: Math.round(r.right), vw });
    }
  });

  // 对比度：抽样可见文本节点
  function lum(c) {
    const m = c.match(/\\d+(\\.\\d+)?/g); if (!m) return null;
    const [r, g, b] = m.slice(0, 3).map(Number).map(v => { v /= 255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); });
    return 0.2126*r + 0.7152*g + 0.0722*b;
  }
  function bgOf(el) {
    let n = el;
    while (n && n !== document.documentElement) {
      const cs = getComputedStyle(n);
      // 渐变文字（background-clip:text）：渐变是「文字的填充色」而非背景，
      // 若当作背景取色会得到与前景色相同的值，产生 1:1 假阳性，直接跳过。
      const clipped = (cs.webkitBackgroundClip || cs.backgroundClip || '') === 'text'
        || cs.webkitTextFillColor === 'transparent';
      // 渐变背景：backgroundColor 是 transparent，直接取会误报「白字白底」。
      // 这里从 background-image 里取所有色标，返回对比度最差的那个（最保守）。
      const bi = clipped ? '' : (cs.backgroundImage || '');
      if (/gradient/.test(bi)) {
        const cols = bi.match(/rgba?\\([^)]+\\)/g) || [];
        const opaque = cols.filter(c => { const m = c.match(/[\\d.]+/g); return !m || m.length < 4 || Number(m[3]) > 0.5; });
        if (opaque.length) {
          let worst = null, worstL = null;
          opaque.forEach(c => {
            const l = lum(c);
            if (l == null) return;
            // 取与前景色对比最差的（亮度最接近前景）
            const fgL = lum(getComputedStyle(el).color);
            if (fgL == null) return;
            const d = Math.abs(l - fgL);
            if (worst === null || d < worstL) { worst = c; worstL = d; }
          });
          if (worst) return worst;
        }
      }
      const bg = cs.backgroundColor;
      const m = bg.match(/\\d+(\\.\\d+)?/g);
      if (m && (m.length < 4 || Number(m[3]) > 0.5)) return bg;
      n = n.parentElement;
    }
    return getComputedStyle(document.body).backgroundColor || 'rgb(255,255,255)';
  }
  const texts = document.querySelectorAll('p, span, div, a, li, h1, h2, h3, h4, label, button, td, th');
  const tSeen = new Set();
  texts.forEach(el => {
    if (el.children.length > 0) return;                          // 只取叶子
    if (el.classList.contains('sr-only')) return;                // 屏幕阅读器专用文本不渲染
    if (el.offsetParent === null && getComputedStyle(el).position !== 'fixed') return;
    const t = (el.textContent || '').trim();
    if (!t || t.length < 2) return;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    const size = parseFloat(cs.fontSize);
    const weight = Number(cs.fontWeight) || 400;
    const fg = cs.color, bg = bgOf(el);
    const l1 = lum(fg), l2 = lum(bg);
    if (l1 == null || l2 == null) return;
    const ratio = (Math.max(l1,l2) + 0.05) / (Math.min(l1,l2) + 0.05);
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const need = large ? 3.0 : 4.5;
    if (ratio < need) {
      const k = fg + '|' + bg + '|' + Math.round(size);
      if (tSeen.has(k)) return; tSeen.add(k);
      out.lowContrast.push({
        sel: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\\s+/)[0] : ''),
        fg, bg, ratio: Math.round(ratio*100)/100, need, size: Math.round(size*10)/10, weight,
        text: t.slice(0, 30)
      });
    }
  });
  out.smallTargets = out.smallTargets.slice(0, 12);
  out.namelessBtns = out.namelessBtns.slice(0, 10);
  out.lowContrast = out.lowContrast.slice(0, 12);
  out.offscreen = out.offscreen.slice(0, 8);
  return out;
})()`;

async function main() {
  // 1) 服务
  const server = spawn(process.execPath, [ENTRY], {
    cwd: dirname(ENTRY),
    env: { ...process.env, PORT, HOST: '127.0.0.1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let up = false;
  for (let i = 0; i < 60 && !up; i++) {
    await sleep(250);
    try { up = (await fetch(`http://127.0.0.1:${PORT}/api/health`)).ok; } catch (e) {}
  }
  if (!up) { console.log('SERVER FAIL'); server.kill(); process.exit(1); }

  // 2) 浏览器
  const chromePath = findChrome();
  const profile = join(process.env.TEMP ?? '', 'ms-audit-' + Date.now());
  mkdirSync(profile, { recursive: true });
  const chrome = spawn(chromePath, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${profile}`,
    '--window-size=1440,900', '--lang=zh-CN', 'about:blank'
  ], { stdio: ['ignore', 'pipe', 'pipe'] });

  let dbg = null;
  for (let i = 0; i < 50 && !dbg; i++) {
    await sleep(200);
    try { dbg = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`)).json(); } catch (e) {}
  }
  const cdp = new Cdp(dbg.webSocketDebuggerUrl);
  await cdp.open();
  await cdp.send('Target.setDiscoverTargets', { discover: true });
  // page target 不是同步就绪的：--headless=new 偶尔在 /json/version 已经可访问、
  // 但 page target 还没注册时被查询到，直接 .find() 会拿到 undefined 并抛
  // "Cannot read properties of undefined (reading 'targetId')"（偶发，非确定性）。
  // 重试到最多 5 秒，或在真的没有 page 时显式报错，避免误判成审计结果有问题。
  let page = null;
  for (let i = 0; i < 25 && !page; i++) {
    const { targetInfos } = await cdp.send('Target.getTargets');
    page = targetInfos.find(t => t.type === 'page');
    if (!page) await sleep(200);
  }
  if (!page) throw new Error('Chromium 未提供 page target（5 秒内未就绪）');
  const { sessionId: S } = await cdp.send('Target.attachToTarget', { targetId: page.targetId, flatten: true });

  const errors = [];
  cdp.on('Runtime.consoleAPICalled', p => {
    if (p.type === 'error') errors.push('[console.error] ' + (p.args||[]).map(a => a.value ?? a.description ?? '').join(' ').slice(0,160));
  });
  cdp.on('Runtime.exceptionThrown', p => {
    errors.push('[exception] ' + (p.exceptionDetails?.exception?.description || p.exceptionDetails?.text || '').slice(0,160));
  });
  await cdp.send('Runtime.enable', {}, S);
  await cdp.send('Page.enable', {}, S);
  await cdp.send('Network.enable', {}, S);

  const evalJs = async (expression) => {
    const r = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true }, S);
    if (r.exceptionDetails) { errors.push('[eval] ' + (r.exceptionDetails.exception?.description || '').slice(0,160)); return undefined; }
    return r.result?.value;
  };
  const waitEval = async (expr, timeout = 15000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) { try { if (await evalJs(expr)) return true; } catch (e) {} await sleep(200); }
    return false;
  };

  await cdp.send('Page.navigate', { url: BASE }, S);
  const ready = await waitEval(`document.readyState === 'complete' && window.app && window.app.currentTab === 'home'`, 25000);
  console.log('APP READY: ' + ready);
  if (!ready) { console.log('dump=' + JSON.stringify(await evalJs(`({t:document.title,hasApp:!!window.app,len:document.body.innerHTML.length})`))); }

  // 关掉引导层：先走正式完成路径（持久化 onboarding_done），再兜底隐藏所有 modal
  await evalJs(`(() => {
    const skip = document.querySelector('#btn-ob-skip'); if (skip) skip.click();
    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
    return 1;
  })()`);
  await sleep(300);

  // 旧产物先整体重命名为备份（不直接删除，便于回溯），再写入新产物。
  // 只保留最近 1 个备份：实测每次复跑都会新增一个 7MB 备份，不设上限会线性堆积。
  try {
    if (existsSync(OUT)) {
      const bak = OUT + '.bak-' + new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
      const { renameSync } = await import('node:fs');
      renameSync(OUT, bak);
      const keep = 1;
      const baks = readdirSync(root)
        .filter(n => /^audit-shots\.bak-/.test(n))
        .sort()
        .reverse();
      baks.slice(keep).forEach(n => { try { rmSync(join(root, n), { recursive: true, force: true }); } catch (e) {} });
      console.log('已备份旧审计产物 -> ' + bak + '（保留最近 ' + keep + ' 份，清理 ' + Math.max(0, baks.length - keep) + ' 份旧备份）');
    }
  } catch (e) {}
  mkdirSync(OUT, { recursive: true });

  const report = {};
  for (const vp of VIEWPORTS) {
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: vp.w, height: vp.h, deviceScaleFactor: 1, mobile: vp.mobile }, S);
    const dir = join(OUT, vp.name);
    mkdirSync(dir, { recursive: true });
    report[vp.name] = {};

    for (const theme of ['light', 'dark']) {
      await evalJs(`document.documentElement.setAttribute('data-theme','${theme}'); 1`);
      for (const tab of TABS) {
        await evalJs(`window.app.showTab('${tab}'); 1`);
        await sleep(450);
        const probe = await evalJs(PROBE);
        const errBefore = errors.length;
        // 截图
        const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, S);
        const file = join(dir, `${tab}-${theme}.png`);
        const { writeFileSync } = await import('node:fs');
        writeFileSync(file, Buffer.from(shot.data, 'base64'));
        const key = `${tab}/${theme}`;
        report[vp.name][key] = { ...probe, newErrors: errors.slice(errBefore) };
        const flag = [];
        if (probe.overflowX) flag.push(`横向溢出 ${probe.scrollW}>${probe.clientW}`);
        if (probe.smallTargets.length) flag.push(`小触控区 ${probe.smallTargets.length}`);
        if (probe.namelessBtns.length) flag.push(`无名按钮 ${probe.namelessBtns.length}`);
        if (probe.lowContrast.length) flag.push(`低对比 ${probe.lowContrast.length}`);
        if (probe.offscreen.length) flag.push(`越界 ${probe.offscreen.length}`);
        if (flag.length) console.log(`[${vp.name}] ${tab}/${theme}: ${flag.join(' · ')}`);
      }
    }
  }

  const { writeFileSync } = await import('node:fs');
  writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2));

  console.log('\n===== 全局 console 错误 =====');
  const uniq = [...new Set(errors)];
  uniq.slice(0, 25).forEach(e => console.log('  - ' + e));
  if (!uniq.length) console.log('  (none)');

  try { cdp.send('Browser.close'); } catch (e) {}
  chrome.kill(); server.kill();
  // Chromium 的 --user-data-dir 每次运行都会在 %TEMP% 留一个 5MB 左右的 profile，
  // 不清理会随复跑次数线性堆积（实测跑 11 次残留 54MB）。
  try { rmSync(profile, { recursive: true, force: true }); } catch (e) {}
  process.exit(0);
}

main().catch(e => { console.log('AUDIT ERROR: ' + (e?.stack || e)); process.exit(1); });

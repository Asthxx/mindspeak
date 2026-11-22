// verify-bottom-nav.mjs — 底部导航三分类 Tab（学习/训练/工具）· 真实浏览器验收
//
// 背景：这三个入口原在侧边栏抽屉（可折叠分组标题，无路由），现集成到底部导航
// 成为 5 签（首页/学习/训练/工具/我的），落点为 #page-learn/#page-train/#page-tool
// 三个聚合页；侧边栏分组仅在移动端由 CSS 隐藏，桌面端保留原文。
//
// 为什么必须真机验：CSS 媒体查询（尤其横屏手机的 hover:none/pointer:coarse 组合）
// 与抽屉 transform 只有在真实浏览器里才成立，jsdom 一概不执行。
//
// 覆盖三个视口：
//   桌面 1440×900   —— 底部导航隐藏、侧边栏三分组原样、折叠行为保留
//   竖屏 390×844    —— 5 签可见可点、选中态、抽屉内无三分组、切页自动收抽屉
//   横屏 844×390    —— 底部导航不消失、药纶压缩、安全区、分组仍不回流抽屉
//   旋回竖屏        —— 高度复原（横竖屏来回切换都稳）
//
// 实测备忘（2026-10-17）：仅 setDeviceMetricsOverride(mobile:true) 不会让
// (hover:none) 匹配——必须叠加 Emulation.setTouchEmulationEnabled，否则横屏
// 分支在仿真里永远不生效，会给出"旋屏后导航消失"的假失败。
//
// 用法：node scripts/verify-bottom-nav.mjs
import { spawn } from 'node:child_process';
import { existsSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = join(root, 'server', 'server.js');
const PORT = process.env.VBN_PORT || '3188';
const DEBUG_PORT = '9677';
const BASE = `http://127.0.0.1:${PORT}/`;
const OUT = join(root, 'audit-shots');
// 产物目录常被当可再生缓存清掉，脚本必须能自建——
// 否则清理一次 audit-shots/ 之后，本脚本会以 ENOENT 崩在写第一张截图上，
// 看起来像"验收挂了"，其实是目录没了。
mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));

const ANDROID_UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

let pass = 0, fail = 0;
const check = (ok, label, extra) => {
  if (ok) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.log(`  ✗ ${label}${extra ? '  → ' + extra : ''}`); }
};

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
    await new Promise((res, rej) => { this.ws.addEventListener('open', res, { once: true }); this.ws.addEventListener('error', rej); });
    this.ws.addEventListener('message', ev => this._onMsg(ev.data));
  }
  _onMsg(raw) {
    const m = JSON.parse(raw);
    if (m.id && this.pending.has(m.id)) { const { res, rej } = this.pending.get(m.id); this.pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); }
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((res, rej) => { this.pending.set(id, { res, rej }); this.ws.send(JSON.stringify({ id, method, params })); });
  }
  close() { try { this.ws.close(); } catch (e) {} }
}

async function evalJs(cdp, expr) {
  const r = await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'eval error');
  return r.result.value;
}

// 页面状态快照（全部取计算值/实测值，不猜）
const SNAP = `JSON.stringify({
  hash: location.hash,
  tab: (window.app && window.app.currentTab) || '',
  activePage: (document.querySelector('.page.active') || {}).id || '',
  navDisplay: getComputedStyle(document.getElementById('bottom-nav')).display,
  navCount: document.querySelectorAll('.bottom-nav-btn').length,
  navLabels: [...document.querySelectorAll('.bottom-nav-btn span')].map(s => s.textContent),
  navRect: (function(){ var r = document.getElementById('bottom-nav').getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right) }; })(),
  navPos: getComputedStyle(document.getElementById('bottom-nav')).position,
  contentPadBottom: parseFloat(getComputedStyle(document.getElementById('main-content')).paddingBottom),
  groupDisplay: (function(){ var g = document.querySelector('.nav-group'); return g ? getComputedStyle(g).display : 'none-group'; })(),
  menuDisplay: getComputedStyle(document.getElementById('btn-menu')).display,
  sidebarOpen: document.querySelector('.sidebar').classList.contains('open'),
  drawerNavBtns: [...document.querySelectorAll('.sidebar .nav-btn')].filter(function(b){ return b.getClientRects().length > 0; }).length,
  activeTabLabel: (function(){ var b = document.querySelector('.bottom-nav-btn.active'); return b ? b.textContent.trim() : ''; })(),
  activeAria: (function(){ var b = document.querySelector('.bottom-nav-btn.active'); return b ? b.getAttribute('aria-current') : null; })(),
  hoverNone: matchMedia('(hover:none)').matches,
  pointerCoarse: matchMedia('(pointer:coarse)').matches,
  land: matchMedia('(orientation:landscape)').matches,
  // 「AI」Tab：与其余五个同款，顺序固定在「我的」之前
  aiTab: (function () {
    var btn = document.querySelector('.bottom-nav-btn[data-tab="ai"]');
    if (!btn) return null;
    var r = btn.getBoundingClientRect();
    var icon = btn.querySelector('.icon');
    var ir = icon ? icon.getBoundingClientRect() : null;
    var label = btn.querySelector('span');
    return {
      exists: true,
      w: Math.round(r.width), h: Math.round(r.height),
      top: Math.round(r.top), bottom: Math.round(r.bottom),
      left: Math.round(r.left), right: Math.round(r.right),
      iconW: ir ? Math.round(ir.width) : 0,
      label: label ? label.textContent : '',
      active: btn.classList.contains('active'),
      aria: btn.getAttribute('aria-current'),
      dataTab: document.documentElement.getAttribute('data-tab') || ''
    };
  })(),
})`;

// AI Tab 的文字/图标对比度（文字 4.5:1，图标属非文本 3:1）。
// 底色取药纶自身的背景——Tab 是栏内一员、没有独立底板，
// 这正是"和他们那些一样"的含义：不必为它另设一套配色，
// 于是它自动继承 .bottom-nav-btn 的 --text-tertiary / --sage-deep 令牌对。
// 未选中与选中两种状态都要量（选中态换成 sage-deep 字 + sage-surface 底）。
const AI_CONTRAST = `JSON.stringify((function () {
  function lum(c) {
    var m = String(c).match(/[\\d.]+/g) || [];
    var v = m.slice(0, 3).map(function (x) { x = Number(x) / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); });
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  }
  function ratio(a, b) {
    var l1 = lum(a), l2 = lum(b);
    return Math.round((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05) * 100) / 100;
  }
  var btn = document.querySelector('.bottom-nav-btn[data-tab="ai"]');
  var nav = document.getElementById('bottom-nav');
  var bg = getComputedStyle(nav).backgroundColor;
  var label = btn.querySelector('span');
  var icon = btn.querySelector('.icon');
  return {
    active: btn.classList.contains('active'),
    label: ratio(getComputedStyle(label).color, bg),
    icon: ratio(getComputedStyle(icon).color, bg)
  };
})())`;

const MEDIA = `JSON.stringify({
  w768: matchMedia('(max-width:768px)').matches,
  land: matchMedia('(orientation:landscape)').matches,
  h500: matchMedia('(max-height:500px)').matches,
  hoverNone: matchMedia('(hover:none)').matches,
  pointerCoarse: matchMedia('(pointer:coarse)').matches,
  landscapeRule: matchMedia('(orientation:landscape) and (max-height:500px) and (hover:none) and (pointer:coarse)').matches,
})`;

let server, chrome, profile, cdp;
try {
  server = spawn(process.execPath, [ENTRY], { cwd: dirname(ENTRY), env: { ...process.env, PORT, HOST: '127.0.0.1' }, stdio: 'ignore' });
  let up = false;
  for (let i = 0; i < 60 && !up; i++) { await sleep(250); try { up = (await fetch(BASE + 'api/health')).ok; } catch (e) {} }
  if (!up) throw new Error('server 启动失败');

  const chromePath = findChrome();
  if (!chromePath) throw new Error('未找到 Chromium');
  profile = join(process.env.TEMP ?? '', 'ms-vbn-' + Date.now());
  mkdirSync(profile, { recursive: true });
  chrome = spawn(chromePath, [`--user-data-dir=${profile}`, `--remote-debugging-port=${DEBUG_PORT}`, '--no-first-run', '--no-default-browser-check', '--headless=new', '--disable-gpu', '--window-size=1440,900', 'about:blank'], { stdio: 'ignore' });

  let target = null;
  for (let i = 0; i < 60 && !target; i++) { await sleep(250); try { const list = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json(); target = list.find(t => t.type === 'page'); } catch (e) {} }
  if (!target) throw new Error('CDP 未就绪');

  cdp = new Cdp(target.webSocketDebuggerUrl);
  await cdp.open();
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');

  // 真实手指点击：取元素中心坐标，派发鼠标按下/抬起
  const tap = async (selector) => {
    const pt = await evalJs(cdp, `(function(){ var el = document.querySelector(${JSON.stringify(selector)}); if(!el) return null; el.scrollIntoView({block:'center'}); var r = el.getBoundingClientRect(); return { x: r.left + r.width/2, y: r.top + r.height/2 }; })()`);
    if (!pt) throw new Error('tap 目标不存在：' + selector);
    for (const type of ['mousePressed', 'mouseReleased']) {
      await cdp.send('Input.dispatchMouseEvent', { type, x: pt.x, y: pt.y, button: 'left', clickCount: 1 });
    }
  };
  const shot = async (name) => {
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
    writeFileSync(join(OUT, name), Buffer.from(data, 'base64'));
  };
  // 等应用启动完成（数据文件 9.8MB，冷启动约 4-5s）
  const waitApp = async () => {
    for (let i = 0; i < 80; i++) {
      const ok = await evalJs(cdp, `!!(window.app && window.app.currentTab && document.querySelector('.page.active'))`);
      if (ok) { await sleep(400); return; }
      await sleep(250);
    }
    throw new Error('应用启动超时');
  };

  console.log('\n=== 底部导航三分类 Tab · 真实浏览器验收 ===\n');

  // 首次访问只为落「已完成首访引导」标记（全新 profile 会弹引导盖住页面）
  await cdp.send('Emulation.setUserAgentOverride', { userAgent: DESKTOP_UA });
  await cdp.send('Page.navigate', { url: BASE });
  await sleep(4000);
  await evalJs(cdp, `(function(){ try { DataStore.setProgress('onboarding_done', true); return true; } catch(e){ return String(e); } })()`);

  // ==================== 阶段 0 · 桌面 1440×900 ====================
  console.log('—— 桌面 1440×900（布局应保持原样）——');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, mobile: false, deviceScaleFactor: 1 });
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false });
  await cdp.send('Page.navigate', { url: BASE + '?v=desktop' });
  await waitApp();
  let s = JSON.parse(await evalJs(cdp, SNAP));

  check(s.navDisplay === 'none', '底部导航在桌面端隐藏', `display=${s.navDisplay}`);
  // AI 作为栏内一员，随底栏同一套开关隐藏——不再需要为它单独写一条 display:none
  check(!!s.aiTab && s.aiTab.h === 0, 'AI Tab 在桌面端随底栏一起隐藏（无独立开关）',
    `h=${s.aiTab && s.aiTab.h}`);
  check(s.groupDisplay === 'flex', '侧边栏三个分组在桌面端原样展示', `display=${s.groupDisplay}`);
  check(s.menuDisplay === 'none', '汉堡按钮在桌面端隐藏', `display=${s.menuDisplay}`);
  check(s.navLabels.length === 6 && s.navDisplay === 'none', '桌面端六个 Tab 均不可点（DOM 在、渲染被隐藏）',
    `labels=${JSON.stringify(s.navLabels)}`);

  // 桌面折叠分组行为保留（点组标题 → collapsed）
  await evalJs(cdp, `document.getElementById('group-train-title').click(); 'ok'`);
  await sleep(300);
  const collapsed = await evalJs(cdp, `document.getElementById('group-train').classList.contains('collapsed')`);
  check(collapsed, '桌面端分组折叠交互保留', 'collapsed=' + collapsed);
  await evalJs(cdp, `document.getElementById('group-train-title').click(); 'ok'`); // 复位
  await sleep(200);

  // 桌面侧边栏入口仍可跳转（DOM 未动的实证）
  await evalJs(cdp, `document.querySelector('.nav-btn[data-tab="word"]').click(); 'ok'`);
  await sleep(500);
  s = JSON.parse(await evalJs(cdp, SNAP));
  check(s.activePage === 'page-word', '桌面端侧边栏「背单词」仍可跳转', `active=${s.activePage}`);
  await shot('bottom-nav-desktop.png');

  // ==================== 阶段 1 · 竖屏 390×844 ====================
  console.log('\n—— 竖屏 390×844（Android UA + 触摸仿真）——');
  await cdp.send('Emulation.setUserAgentOverride', { userAgent: ANDROID_UA });
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, mobile: true, deviceScaleFactor: 3 });
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await cdp.send('Page.navigate', { url: BASE + '?v=mobile' });
  await waitApp();
  s = JSON.parse(await evalJs(cdp, SNAP));

  check(s.navDisplay === 'flex', '底部导航在竖屏显示', `display=${s.navDisplay}`);
  check(s.navCount === 6, '底部导航恰为 6 签（AI 入列）', `count=${s.navCount}`);
  check(JSON.stringify(s.navLabels) === JSON.stringify(['首页', '学习', '训练', '工具', 'AI', '我的']),
    '★6 签文案与顺序：首页/学习/训练/工具/AI/我的', JSON.stringify(s.navLabels));
  check(s.navLabels[4] === 'AI' && s.navLabels[5] === '我的',
    '★AI 紧贴「我的」之前（高频入口不必扫到栏尾）', JSON.stringify(s.navLabels));
  check(s.navPos === 'fixed', '底部导航固定定位', `position=${s.navPos}`);
  check(s.navRect.left === 12 && s.navRect.right === 378, '药纶左右各留 12px（竖屏安全区为 0）',
    `left=${s.navRect.left} right=${s.navRect.right}`);
  check(s.contentPadBottom >= s.navRect.h + 10, '内容区底部留白足够，不被药纶遮住',
    `pad=${s.contentPadBottom} navH=${s.navRect.h}`);
  check(s.menuDisplay === 'flex', '汉堡按钮在竖屏显示', `display=${s.menuDisplay}`);
  // 竖屏药纶高度基线必须在这里取——切到横屏后再取就拿到压缩值了
  // （初版脚本就是切了之后才取，横竖屏两条高度断言全成假失败）。
  const portraitNavH = s.navRect.h;
  const portraitPad = s.contentPadBottom;
  check(portraitNavH > 52, '竖屏药纶用平台原高度（Android 62px，未被横屏压缩规则误伤）', `h=${portraitNavH}`);

  // 点「学习」签（真实点击）→ 聚合页 + 选中态
  await tap('.bottom-nav-btn[data-tab="learn"]');
  await sleep(600);
  s = JSON.parse(await evalJs(cdp, SNAP));
  check(s.activePage === 'page-learn', '点「学习」进入学习聚合页', `active=${s.activePage}`);
  check(s.activeTabLabel.includes('学习'), '「学习」签高亮', `label=${s.activeTabLabel}`);
  check(s.activeAria === 'page', '「学习」签带 aria-current="page"', `aria=${s.activeAria}`);
  check(s.hash === '#/learn', '切页写入 hash（可分享/刷新保持）', `hash=${s.hash}`);

  await tap('.bottom-nav-btn[data-tab="train"]');
  await sleep(500);
  s = JSON.parse(await evalJs(cdp, SNAP));
  check(s.activePage === 'page-train' && s.activeTabLabel.includes('训练'), '点「训练」进入训练聚合页并高亮', `active=${s.activePage} label=${s.activeTabLabel}`);

  await tap('.bottom-nav-btn[data-tab="tool"]');
  await sleep(500);
  s = JSON.parse(await evalJs(cdp, SNAP));
  check(s.activePage === 'page-tool' && s.activeTabLabel.includes('工具'), '点「工具」进入工具聚合页并高亮', `active=${s.activePage} label=${s.activeTabLabel}`);

  // 聚合页内卡片 → 具体功能页（data-goto 委托）
  await tap('#page-tool .practice-btn[data-goto="pomodoro"]');
  await sleep(600);
  s = JSON.parse(await evalJs(cdp, SNAP));
  check(s.activePage === 'page-pomodoro', '聚合页卡片跳转具体功能页（番茄钟）', `active=${s.activePage}`);

  await tap('.bottom-nav-btn[data-tab="home"]');
  await sleep(500);
  s = JSON.parse(await evalJs(cdp, SNAP));
  check(s.activePage === 'page-home', '点「首页」回到首页', `active=${s.activePage}`);

  // ---- 「AI」Tab：与其余五个完全同款，顺序在「我的」之前 ----
  const ai = s.aiTab;
  check(!!ai && ai.exists, 'AI 是底栏里的一个 Tab（不再是贴上方的独立横条）', JSON.stringify(ai));
  check(!!ai && ai.label === 'AI', 'AI 签文案为「AI」（两字宽，与其余标签等长）', `label=${ai && ai.label}`);
  check(!!ai && ai.h >= 44, 'AI 签触控高度 ≥44px（Apple HIG 下限）', `h=${ai && ai.h}`);
  check(!!ai && ai.w >= 40, '★六等分后 AI 签仍有 ≥40px 可点宽度', `w=${ai && ai.w}`);
  check(!!ai && ai.iconW >= 18, 'AI 签图标 ≥18px（横屏压缩值）', `iconW=${ai && ai.iconW}`);
  check(!!ai && ai.top >= s.navRect.top && ai.bottom <= s.navRect.bottom,
    'AI 签垂直方向完整落在药纶内（不溢出、不贴边）',
    `tabTop=${ai && ai.top} tabBottom=${ai && ai.bottom} navTop=${s.navRect.top} navBottom=${s.navRect.bottom}`);
  check(!!ai && ai.left >= s.navRect.left && ai.right <= s.navRect.right,
    'AI 签水平方向落在药纶内', `tabLeft=${ai && ai.left} tabRight=${ai && ai.right}`);
  check(!!ai && !ai.active, '首页为当前页时 AI 签不抢占选中态', `active=${ai && ai.active}`);

  // 未选中态：继承 .bottom-nav-btn 的 --text-tertiary 令牌
  const cLight = JSON.parse(await evalJs(cdp, AI_CONTRAST));
  check(!cLight.active, '对比度取样时 AI 签确为未选中态', `active=${cLight.active}`);
  check(cLight.label >= 4.5, '浅色·AI 签文字对比度 ≥4.5:1', `${cLight.label}:1`);
  check(cLight.icon >= 3, '浅色·AI 签图标对比度 ≥3:1（非文本）', `${cLight.icon}:1`);

  // 深色主题下同一组令牌必须同样达标（深色会把 sage 系令牌整体翻亮）
  await evalJs(cdp, `document.documentElement.setAttribute('data-theme','dark')`);
  await sleep(300);
  const cDark = JSON.parse(await evalJs(cdp, AI_CONTRAST));
  check(cDark.label >= 4.5, '深色·AI 签文字对比度 ≥4.5:1', `${cDark.label}:1`);
  check(cDark.icon >= 3, '深色·AI 签图标对比度 ≥3:1（非文本）', `${cDark.icon}:1`);
  await evalJs(cdp, `document.documentElement.setAttribute('data-theme','light')`);
  await sleep(200);

  // 点 AI 签 → 直达 AI 对话页，且自身进入与其他五个一致的选中态
  await tap('.bottom-nav-btn[data-tab="ai"]');
  await sleep(700);
  s = JSON.parse(await evalJs(cdp, SNAP));
  check(s.activePage === 'page-ai', '★点 AI 签直达 AI 对话页', `active=${s.activePage}`);
  check(s.activeTabLabel.includes('AI'), 'AI 签高亮', `label=${s.activeTabLabel}`);
  check(s.activeAria === 'page', 'AI 签带 aria-current="page"（读屏可播报）', `aria=${s.activeAria}`);
  check(!!s.aiTab && s.aiTab.active && s.aiTab.aria === 'page',
    '★AI 签选中态与其余五个完全一致（同一套 class + aria 逻辑）', JSON.stringify(s.aiTab));
  check(s.navDisplay === 'flex', 'AI 页上底栏仍在（AI 已是栏内一员，不再需要让位）', `display=${s.navDisplay}`);
  check(s.hash === '#/ai', 'AI 页写入 hash（可分享/刷新保持）', `hash=${s.hash}`);
  await shot('nav-ai-tab-on-ai.png');

  // 选中态换成 sage-deep 字 + sage-surface 底，也要达标
  const cActive = JSON.parse(await evalJs(cdp, AI_CONTRAST));
  check(cActive.active, '选中态对比度取样时 AI 签确为选中', `active=${cActive.active}`);
  check(cActive.label >= 4.5, '浅色·AI 签选中态文字对比度 ≥4.5:1', `${cActive.label}:1`);

  // 离开 AI 页后选中态交还首页
  await tap('.bottom-nav-btn[data-tab="home"]');
  await sleep(600);
  s = JSON.parse(await evalJs(cdp, SNAP));
  check(s.activePage === 'page-home' && !!s.aiTab && !s.aiTab.active,
    '离开 AI 页后选中态回到首页', `active=${s.activePage} aiActive=${s.aiTab && s.aiTab.active}`);
  await shot('nav-ai-tab-home.png');

  // 深链直接落在 AI 页：选中态不能依赖"先经过别的页"才生效
  await evalJs(cdp, `location.hash = '#/ai'`);
  await sleep(800);
  s = JSON.parse(await evalJs(cdp, SNAP));
  check(s.activePage === 'page-ai' && !!s.aiTab && s.aiTab.active && s.aiTab.aria === 'page',
    '★深链直达 AI 页时 AI 签同样高亮', JSON.stringify(s.aiTab));
  await tap('.bottom-nav-btn[data-tab="home"]');
  await sleep(500);

  // 抽屉：三分组不再出现，其余入口保留
  await tap('#btn-menu');
  await sleep(700); // 等抽屉滑入过渡
  s = JSON.parse(await evalJs(cdp, SNAP));
  check(s.sidebarOpen, '汉堡可打开抽屉');
  check(s.groupDisplay === 'none', '抽屉内三个分组已隐藏（不再重复出现）', `display=${s.groupDisplay}`);
  check(s.drawerNavBtns === 4, '抽屉保留 4 个直接入口（首页/AI助手/设置/支持开发者）', `count=${s.drawerNavBtns}`);

  // 抽屉里选「设置」→ 切页且抽屉自动收起
  await tap('.sidebar .nav-btn[data-tab="settings"]');
  await sleep(700);
  s = JSON.parse(await evalJs(cdp, SNAP));
  check(s.activePage === 'page-settings', '抽屉内「设置」可跳转', `active=${s.activePage}`);
  check(!s.sidebarOpen, '选中后抽屉自动收起', 'open=' + s.sidebarOpen);
  await shot('bottom-nav-mobile.png');

  // ==================== 阶段 2 · 横屏 844×390（不重载，只改指标） ====================
  console.log('\n—— 横屏 844×390（同一文档，只改设备指标）——');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 844, height: 390, mobile: true, deviceScaleFactor: 3 });
  await sleep(700);
  const m = JSON.parse(await evalJs(cdp, MEDIA));
  check(m.landscapeRule, '横屏手机媒体条件命中（landscape + 矮屏 + 触屏）', JSON.stringify(m));
  s = JSON.parse(await evalJs(cdp, SNAP));

  check(s.navDisplay === 'flex', '旋到横屏后底部导航仍在（不消失）', `display=${s.navDisplay}`);
  check(s.navCount === 6, '横屏仍是 6 签', `count=${s.navCount}`);
  check(s.navLabels[4] === 'AI' && s.navLabels[5] === '我的', '横屏六签顺序不变', JSON.stringify(s.navLabels));
  check(s.navRect.h < portraitNavH, '横屏药纶高度压缩，给内容让路', `landscape=${s.navRect.h} portrait=${portraitNavH}`);
  check(s.navRect.left === 12 && s.navRect.right === 832, '横屏左右仍各留 12px（安全区为 0 时与竖屏一致）',
    `left=${s.navRect.left} right=${s.navRect.right}`);
  check(s.contentPadBottom < portraitPad && s.contentPadBottom >= s.navRect.h + 8,
    '横屏内容区留白随导航收缩且仍足够', `pad=${s.contentPadBottom} portraitPad=${portraitPad} navH=${s.navRect.h}`);
  check(s.navRect.bottom <= 390, '药纶不超出横屏视口底部', `bottom=${s.navRect.bottom}`);
  // 横屏下 AI 签仍在：它是栏内一员、不占额外高度，
  // 不再像独立横条那样需要为省空间而收起
  check(!!s.aiTab && s.aiTab.h > 0, '★横屏下 AI 签仍在（不额外占高，无需收起）', `h=${s.aiTab && s.aiTab.h}`);
  check(!!s.aiTab && s.aiTab.bottom <= 390, 'AI 签不超出横屏视口底部', `bottom=${s.aiTab && s.aiTab.bottom}`);

  // 横屏下点签仍可切页
  await tap('.bottom-nav-btn[data-tab="learn"]');
  await sleep(500);
  s = JSON.parse(await evalJs(cdp, SNAP));
  check(s.activePage === 'page-learn', '横屏下点「学习」仍可切页', `active=${s.activePage}`);

  // 横屏下抽屉：三分组仍不回流
  await tap('#btn-menu');
  await sleep(700);
  s = JSON.parse(await evalJs(cdp, SNAP));
  check(s.sidebarOpen && s.groupDisplay === 'none', '横屏抽屉内三个分组仍隐藏', `open=${s.sidebarOpen} group=${s.groupDisplay}`);
  await tap('#btn-menu'); // 收起
  await sleep(500);
  await shot('bottom-nav-landscape.png');

  // ==================== 阶段 3 · 旋回竖屏 390×844 ====================
  console.log('\n—— 旋回竖屏 390×844 ——');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, mobile: true, deviceScaleFactor: 3 });
  await sleep(700);
  s = JSON.parse(await evalJs(cdp, SNAP));
  check(s.navDisplay === 'flex', '旋回竖屏后底部导航仍在', `display=${s.navDisplay}`);
  check(s.navRect.h === portraitNavH, '竖屏药纶高度复原（横竖屏来回切换都稳）',
    `now=${s.navRect.h} portrait=${portraitNavH}`);

  console.log(`\n===== 结果：${pass} 通过 / ${fail} 失败 =====`);
  console.log(`截图：audit-shots/bottom-nav-{desktop,mobile,landscape}.png + nav-ai-tab-{on-ai,home}.png`);
} finally {
  try { chrome?.kill(); } catch (e) {}
  try { server?.kill(); } catch (e) {}
  try { cdp?.close(); } catch (e) {}
  await sleep(300);
  process.exitCode = fail ? 1 : 0;
}

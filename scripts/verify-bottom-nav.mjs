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
const sleep = ms => new Promise(r => setTimeout(r, ms));

const ANDROID_UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

let pass = 0, fail = 0;
const check = (ok, label, extra) => {
  if (ok) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.log(`  ✗ ${label}${extra ? '  → ' + extra : ''}`); }
};

function findChrome() {
  const cache = join(process.env.LOCALAPPDATA ?? '', 'ms-playwright');
  if (!existsSync(cache)) return null;
  for (const d of readdirSync(cache)) {
    if (!/^chromium-\d+/.test(d)) continue;
    for (const c of [join(d, 'chrome-win64', 'chrome.exe'), join(d, 'chrome-win', 'chrome.exe')]) {
      const p = join(cache, c);
      if (existsSync(p)) return p;
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
})`;

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
  check(s.groupDisplay === 'flex', '侧边栏三个分组在桌面端原样展示', `display=${s.groupDisplay}`);
  check(s.menuDisplay === 'none', '汉堡按钮在桌面端隐藏', `display=${s.menuDisplay}`);
  check(s.navLabels.length === 0 || s.navDisplay === 'none', '桌面端无底部签可点');

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
  check(s.navCount === 5, '底部导航恰为 5 签', `count=${s.navCount}`);
  check(JSON.stringify(s.navLabels) === JSON.stringify(['首页', '学习', '训练', '工具', '我的']),
    '5 签文案与顺序：首页/学习/训练/工具/我的', JSON.stringify(s.navLabels));
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
  check(s.navCount === 5, '横屏仍是 5 签', `count=${s.navCount}`);
  check(s.navRect.h < portraitNavH, '横屏药纶高度压缩，给内容让路', `landscape=${s.navRect.h} portrait=${portraitNavH}`);
  check(s.navRect.left === 12 && s.navRect.right === 832, '横屏左右仍各留 12px（安全区为 0 时与竖屏一致）',
    `left=${s.navRect.left} right=${s.navRect.right}`);
  check(s.contentPadBottom < portraitPad && s.contentPadBottom >= s.navRect.h + 8,
    '横屏内容区留白随导航收缩且仍足够', `pad=${s.contentPadBottom} portraitPad=${portraitPad} navH=${s.navRect.h}`);
  check(s.navRect.bottom <= 390, '药纶不超出横屏视口底部', `bottom=${s.navRect.bottom}`);

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
  console.log(`截图：audit-shots/bottom-nav-{desktop,mobile,landscape}.png`);
} finally {
  try { chrome?.kill(); } catch (e) {}
  try { server?.kill(); } catch (e) {}
  try { cdp?.close(); } catch (e) {}
  await sleep(300);
  process.exitCode = fail ? 1 : 0;
}

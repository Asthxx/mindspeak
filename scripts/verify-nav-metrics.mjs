// verify-nav-metrics.mjs — P2-7 / P2-8 / P3-6 / P3-7 的真实浏览器验收
//
// 为什么必须真机验：这四项里有三项是**布局与位置**的问题
// （分组在哪、开关在不在首屏、控件有没有被挤成两行），jsdom 没有布局，
// 单测只能证明"DOM 里有这个节点"，证明不了"用户第一眼看得到"。
//
// 用法：node scripts/verify-nav-metrics.mjs
import { spawn } from 'node:child_process';
import { existsSync, readdirSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = join(root, 'server', 'server.js');
const PORT = process.env.VN_PORT || '3137';
const DEBUG_PORT = '9477';
const BASE = `http://127.0.0.1:${PORT}/`;
const OUT = join(root, 'audit-shots');
const MOBILE = { width: 390, height: 844 };
const sleep = ms => new Promise(r => setTimeout(r, ms));

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
    await new Promise((res, rej) => { this.ws.addEventListener('open', res, { once: true }); this.ws.addEventListener('error', rej, { once: true }); });
    this.ws.addEventListener('message', ev => this._onMsg(ev.data));
  }
  _onMsg(raw) {
    const m = JSON.parse(raw);
    if (m.id && this.pending.has(m.id)) { const { res, rej } = this.pending.get(m.id); this.pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); return; }
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

async function evalJs(cdp, expr, awaitPromise = true) {
  const r = await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'eval error');
  return r.result.value;
}

async function clipShot(cdp, selector, file, pad = 14) {
  const box = await evalJs(cdp, `(function(){
    var el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return null;
    var r = el.getBoundingClientRect();
    return JSON.stringify({ x: Math.max(0, r.x - ${pad}), y: Math.max(0, r.y - ${pad}), w: r.width + ${pad} * 2, h: r.height + ${pad} * 2 });
  })()`);
  if (!box) return false;
  const b = JSON.parse(box);
  if (b.w < 4 || b.h < 4) return false;
  const { data } = await cdp.send('Page.captureScreenshot', {
    format: 'png', fromSurface: true,
    clip: { x: b.x, y: b.y, width: b.w, height: b.h, scale: 2 },
  });
  writeFileSync(join(OUT, file), Buffer.from(data, 'base64'));
  return true;
}

let server, chrome, profile, cdp;
try {
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
  profile = join(process.env.TEMP ?? '', 'ms-vnav-' + Date.now());
  mkdirSync(profile, { recursive: true });
  chrome = spawn(chromePath, [
    `--user-data-dir=${profile}`, `--remote-debugging-port=${DEBUG_PORT}`,
    '--no-first-run', '--no-default-browser-check', '--headless=new',
    '--disable-gpu', `--window-size=${MOBILE.width},${MOBILE.height}`, 'about:blank',
  ], { stdio: ['ignore', 'pipe', 'pipe'] });

  let target = null;
  for (let i = 0; i < 60 && !target; i++) {
    await sleep(250);
    try {
      const list = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json();
      target = list.find(t => t.type === 'page');
    } catch (e) {}
  }
  if (!target) throw new Error('CDP 未就绪');

  cdp = new Cdp(target.webSocketDebuggerUrl);
  await cdp.open();
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  // UA 必须一起覆盖：setDeviceMetricsOverride(mobile:true) 不会改 UA，
  // 而抽屉导航只在 App.detectPlatform() 判定为移动端时才装载 —— 不覆盖 UA 的话
  // 抽屉永远不会开，下面那条"抽屉内点击不被弹回"就成了空跑。
  await cdp.send('Emulation.setUserAgentOverride', {
    userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    platform: 'Linux armv8l',
  });
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: MOBILE.width, height: MOBILE.height, deviceScaleFactor: 2, mobile: true,
  });

  console.log('\n=== P2-7 / P2-8 / P3-6 / P3-7 · 真实浏览器验收（390×844）===\n');

  // 首访引导会盖住内容：先落标记再重载
  await cdp.send('Page.navigate', { url: BASE });
  await sleep(4000);
  await evalJs(cdp, `(function(){ try { DataStore.setProgress('onboarding_done', true); return true; } catch(e){ return String(e); } })()`);
  await cdp.send('Page.navigate', { url: BASE });
  await sleep(6000);

  // ---------- P2-7 侧边栏分组 ----------
  console.log('[P2-7] 侧边栏分组');
  await evalJs(cdp, `(function(){ document.getElementById('btn-menu') && document.getElementById('btn-menu').click(); return 1; })()`);
  await sleep(600);
  const nav = JSON.parse(await evalJs(cdp, `(function(){
    function tabsIn(id){
      var g = document.getElementById(id);
      if (!g) return null;
      return [].slice.call(g.querySelectorAll('.nav-btn')).map(function(b){ return b.dataset.tab; });
    }
    var t = tabsIn('group-tool-items') || tabsIn('group-tool');
    var r = tabsIn('group-train-items') || tabsIn('group-train');
    return JSON.stringify({
      hasGrow: !!document.getElementById('group-grow'),
      train: r, tool: t,
    });
  })()`));
  check(!nav.hasGrow, '「成长」单项目分组已取消');
  check(nav.train && nav.train.includes('pk'), '单词PK 在训练组', JSON.stringify(nav.train));
  check(nav.tool && nav.tool.includes('pomodoro'), '番茄钟在工具组', JSON.stringify(nav.tool));
  check(nav.tool && nav.tool.includes('items'), '主题商店在工具组', JSON.stringify(nav.tool));
  const { data: navShot } = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  writeFileSync(join(OUT, 'verify-nav-sidebar.png'), Buffer.from(navShot, 'base64'));

  // 开抽屉时点导航项：抽屉会 pushState 一个占位，回收它的 back() 会和 hash 路由互相干扰。
  // 真机实测过"切了又被弹回去"，这里把它钉死。
  console.log('\n[回归] 抽屉内点击导航项不被弹回');
  // 抽屉在上面 P2-7 那步已经打开了，这里**不能再点一次按钮** —— 它是开合开关，
  // 再点一下就把抽屉关掉，整条回归就成了空跑（本脚本初版正是这么错的）。
  await sleep(400);
  // 注意是 .sidebar（class），不是 #sidebar —— 抽屉元素没有 id，getElementById 永远拿到 null
  const drawerOpen = await evalJs(cdp, `!!document.querySelector('.sidebar.open')`);
  check(drawerOpen, '抽屉处于打开状态（占位 pushState 已生效）',
    await evalJs(cdp, `JSON.stringify(window.history.state)`));
  await evalJs(cdp, `(function(){
    var b = document.querySelector('#group-tool-items .nav-btn[data-tab="pomodoro"]')
         || document.querySelector('.nav-btn[data-tab="pomodoro"]');
    if (b) b.click();
    return 1;
  })()`);
  await sleep(900);
  const afterClick = JSON.parse(await evalJs(cdp, `(function(){
    var p = document.querySelector('.page.active');
    return JSON.stringify({ tab: window.app.currentTab, active: p ? p.id : 'none', hash: location.hash });
  })()`));
  check(afterClick.tab === 'pomodoro' && afterClick.active === 'page-pomodoro',
    '抽屉内点「番茄钟」后停在番茄钟页（没有被回退弹回去）',
    `tab=${afterClick.tab} active=${afterClick.active} hash=${afterClick.hash}`);
  await sleep(700);
  const settled = JSON.parse(await evalJs(cdp, `(function(){
    var p = document.querySelector('.page.active');
    return JSON.stringify({ tab: window.app.currentTab, active: p ? p.id : 'none', hash: location.hash });
  })()`));
  check(settled.active === 'page-pomodoro' && settled.hash === '#/pomodoro',
    '1.6 秒后依然稳定（不是延迟弹回）',
    `tab=${settled.tab} active=${settled.active} hash=${settled.hash}`);

  // ---------- 返回键第一档：关抽屉 ----------
  // 这条分支曾长期是死代码：_onBackPressed 用 getElementById('sidebar') 取抽屉，
  // 而抽屉的 id 是 sidebar-nav、class 才是 .sidebar —— 取到 null，于是抽屉开着
  // 按返回键不会被"关抽屉"接管，而是直接跳回首页。
  console.log('\n[回归] 返回键第一档：关抽屉');
  await evalJs(cdp, `window.app.showTab('word'); 1`);
  await sleep(700);
  await evalJs(cdp, `(function(){
    var s = document.querySelector('.sidebar');
    if (s && !s.classList.contains('open')) document.getElementById('btn-menu').click();
    return 1;
  })()`);
  await sleep(500);
  const drawerBack = JSON.parse(await evalJs(cdp, `(function(){
    var handled = window.app._onBackPressed();
    var st = window.history.state || {};
    return JSON.stringify({
      handled: handled,
      open: !!document.querySelector('.sidebar.open'),
      tab: window.app.currentTab,
      msDrawer: st.msDrawer || null,
    });
  })()`));
  check(drawerBack.handled === true, '返回键被"关抽屉"这一档接管', JSON.stringify(drawerBack));
  check(drawerBack.open === false, '抽屉已关闭', JSON.stringify(drawerBack));
  check(drawerBack.tab === 'word', '关抽屉不把页面切走（仍停在背单词页）', JSON.stringify(drawerBack));
  check(drawerBack.msDrawer === null, '占位条目已清掉（否则会吞掉一次返回键）', JSON.stringify(drawerBack));

  // ---------- P2-8 设置页首屏 ----------
  console.log('\n[P2-8] 设置页信息架构');
  const activeAfterSwitch = await evalJs(cdp, `(function(){
    var s = document.getElementById('sidebar'); if (s) s.classList.remove('open');
    window.app.showTab('settings');
    var p = document.querySelector('.page.active');
    return p ? p.id : 'none';
  })()`);
  check(activeAfterSwitch === 'page-settings', '设置页已真正激活（否则下面的首屏断言会空跑）', activeAfterSwitch);
  await sleep(1200);
  const set = JSON.parse(await evalJs(cdp, `(function(){
    var t = document.getElementById('toggle-active-recall');
    var strip = document.querySelector('.report-strip');
    var trend = document.getElementById('report-trend');
    var scroller = document.getElementById('main-content');
    var top = function(el){ if(!el) return null; return Math.round(el.getBoundingClientRect().top); };
    // 首屏可见性：开关必须落在视口前 70% 内（只判 "<视口高" 太宽松 ——
    // 刚好压在折线下方也算通过，但用户依然看不到）
    var firstVisible = Math.round(window.innerHeight * 0.7);
    var all = document.querySelectorAll('#page-settings .settings-group h3, #page-settings summary');
    var order = [].slice.call(all).map(function(h){ return h.textContent.trim().slice(0, 10); });
    return JSON.stringify({
      vh: window.innerHeight,
      firstVisible: firstVisible,
      stripH: strip ? Math.round(strip.getBoundingClientRect().height) : null,
      toggleTop: top(t),
      detailsTop: top(trend),
      detailsOpen: trend ? trend.hasAttribute('open') : null,
      order: order,
      scrollTop: scroller ? scroller.scrollTop : null,
    });
  })()`));
  check(set.stripH !== null && set.stripH < 110, '学习概览条压到一行（高度 <110px）', `实际 ${set.stripH}px`);
  check(set.toggleTop !== null && set.toggleTop < set.firstVisible,
    '第一个设置开关在首屏前 70%（无需滚动即可操作）',
    `开关 top=${set.toggleTop} / 阈值=${set.firstVisible}`);
  check(set.detailsOpen === false, '趋势与数据分析默认折叠', `open=${set.detailsOpen}`);
  const iLearn = set.order.indexOf('学习模式');
  const iData = set.order.indexOf('数据管理');
  check(iLearn === 0, '设置项排在记录类内容之前', '实际顺序：' + set.order.join(' > '));
  check(iData > iLearn && iData !== -1, '数据管理（破坏性操作）排在最后', '实际顺序：' + set.order.join(' > '));
  check(set.order[set.order.length - 1].includes('查看学习趋势'), '折叠区在页面末尾',
    '实际顺序：' + set.order.join(' > '));
  const { data: setShot } = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  writeFileSync(join(OUT, 'verify-settings-firstscreen.png'), Buffer.from(setShot, 'base64'));

  // ---------- P3-6 / P3-7 单词卡 ----------
  console.log('\n[P3-6 / P3-7] 跳转控件与进度环');
  await evalJs(cdp, `window.app.showTab('word'); 1`);
  await sleep(900);
  // 等词库就绪，否则卡数是 0，"总数同步"这条会假通过
  await evalJs(cdp, `(async function(){
    var L = window.Loading;
    if (L && L.libraryReady) { for (var i=0;i<40 && !L.libraryReady();i++) await new Promise(r=>setTimeout(r,500)); }
    return true;
  })()`);
  await sleep(1500);
  await evalJs(cdp, `(function(){ try { window.app.wordModule.showCurrentWord(); } catch(e){} return 1; })()`);
  await sleep(600);

  const w = JSON.parse(await evalJs(cdp, `(function(){
    var wrap = document.getElementById('word-jump-wrap');
    var total = document.getElementById('word-jump-total');
    var input = document.getElementById('word-jump-input');
    var ringText = document.getElementById('ring-text');
    var cap = document.getElementById('ring-caption');
    var bg = document.querySelector('.ring-bg');
    // 单行判据：所有子元素的垂直中心都在同一条水平线上（比 top 可靠 —— 输入框比文字高，
    // top 天然不同，用 top 会把正常控件误判成多行）
    var centers = [];
    if (wrap) {
      [].slice.call(wrap.children).forEach(function(c){
        var r = c.getBoundingClientRect();
        centers.push(Math.round(r.top + r.height / 2));
      });
    }
    var spread = centers.length ? Math.max.apply(null, centers) - Math.min.apply(null, centers) : 0;
    var wm = window.app.wordModule;
    var expected = 0;
    try { expected = wm.getCardWords().length; } catch(e){}
    return JSON.stringify({
      wrapH: wrap ? Math.round(wrap.getBoundingClientRect().height) : null,
      lines: 1,
      spread: spread,
      total: total ? total.textContent : null,
      expected: expected,
      max: input ? input.max : null,
      ringText: ringText ? ringText.textContent : null,
      caption: cap ? cap.textContent : null,
      bgStroke: bg ? getComputedStyle(bg).stroke : null,
    });
  })()`));
  check(w.spread <= 3 && w.wrapH !== null && w.wrapH <= 46, '跳转控件是单行整体（未被挤压换行）',
    `子元素中心离散=${w.spread}px 高度=${w.wrapH}px`);
  check(String(w.total) === String(w.expected), '总数位与实际卡数一致', `显示 ${w.total} / 实际 ${w.expected}`);
  check(Number(w.max) === Number(w.expected), '输入上限跟随总数', `max=${w.max}`);
  check(/%$/.test(w.ringText || ''), '环内显示百分比', `环内="${w.ringText}"`);
  check(/阶段|新词|已掌握|不认识/.test(w.caption || ''), '环下有说明行', `说明="${w.caption}"`);
  check(w.bgStroke && !/228,\s*232,\s*236/.test(w.bgStroke), '环轨道不再用 --border 色', `stroke=${w.bgStroke}`);
  await clipShot(cdp, '.card-area', 'verify-word-nav.png', 6);

  console.log(`\n===== 结果：${pass} 通过 / ${fail} 失败 =====`);
  console.log('截图：audit-shots/verify-*.png');
} finally {
  try { chrome?.kill(); } catch (e) {}
  try { server?.kill(); } catch (e) {}
  try { cdp?.close(); } catch (e) {}
  await sleep(300);
  try { if (profile) rmSync(profile, { recursive: true, force: true }); } catch (e) {}
}
if (fail > 0) process.exitCode = 1;

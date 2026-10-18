// verify-ai-mobile-layout.mjs — AI 页移动端布局定向验证
//
// 背景（2026-10-18）：用户反馈「AI 工具优化的还不是很好，适配一下手机端」。
// 截图复盘发现三个真问题：
//   ① 点开 AI Tab 只看得到 hero 和「学习概况」，输入框在第二屏——
//      .ai-workspace 是固定高度网格（min(76vh,760) / min-height:520），
//      塞进滚动文档后 composer 被顶出首屏；
//   ② 底部 toast 整块盖住消息操作栏（复制/朗读/重新生成）——
//      全局 88px 偏移只清掉了底栏，没算 composer 的高度；
//   ③ .ai-chat-msgs 被 max-height:45dvh 限死，消息区白白少用一截滚动空间。
//
// 修法：.content 在 AI 页改成弹性列（html[data-tab="ai"]），#page-ai 撑满剩余高度，
// 工作区 flex:1 自适应；composer 实测高度由 JS 写进 --ai-composer-h 供 toast 避让。
//
// 本脚本守住这些不回归。运行：node scripts/verify-ai-mobile-layout.mjs
import { spawn } from 'node:child_process';
import { existsSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = join(root, 'server', 'server.js');
const PORT = process.env.VAML_PORT || '3190';
const DEBUG_PORT = process.env.VAML_DEBUG_PORT || '9470';
const BASE = `http://127.0.0.1:${PORT}/`;
const OUT = join(root, 'audit-shots');
mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));

const IOS_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const ANDROID_UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

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
    await new Promise((res, rej) => {
      this.ws.addEventListener('open', res, { once: true });
      this.ws.addEventListener('error', () => rej(new Error('ws failed')), { once: true });
    });
    this.ws.addEventListener('message', ev => {
      const m = JSON.parse(ev.data);
      if (m.id && this.pending.has(m.id)) {
        const { res, rej } = this.pending.get(m.id); this.pending.delete(m.id);
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

// 页面状态快照：全部取实测值，不猜
const SNAP = `JSON.stringify((function(){
  var vw = window.innerWidth, vh = window.innerHeight;
  var content = document.getElementById('main-content');
  var composer = document.querySelector('.ai-composer');
  var hero = document.querySelector('#page-ai .ai-hero');
  var overview = document.getElementById('ai-overview');
  var scroll = document.getElementById('ai-msg-scroll');
  var nav = document.getElementById('bottom-nav');
  var toast = document.querySelector('.toast-container');
  function r(el){ if(!el) return null; var b = el.getBoundingClientRect(); return {t:Math.round(b.top),b:Math.round(b.bottom),l:Math.round(b.left),r:Math.round(b.right),w:Math.round(b.width),h:Math.round(b.height)}; }
  return {
    vw: vw, vh: vh,
    tab: document.documentElement.getAttribute('data-tab') || '',
    activePage: (document.querySelector('.page.active') || {}).id || '',
    contentScrollTop: content ? content.scrollTop : -1,
    contentScrollH: content ? content.scrollHeight : -1,
    contentClientH: content ? content.clientHeight : -1,
    docOverflowX: document.documentElement.scrollWidth > vw + 1,
    composer: r(composer),
    composerDisplay: composer ? getComputedStyle(composer).display : '',
    hero: r(hero),
    heroPDisplay: hero ? getComputedStyle(hero.querySelector('p')).display : '',
    overview: r(overview),
    overviewOpen: overview ? overview.open : null,
    msgScroll: r(scroll),
    msgScrollOverflow: scroll ? scroll.scrollHeight > scroll.clientHeight : false,
    nav: r(nav),
    navDisplay: nav ? getComputedStyle(nav).display : '',
    toast: r(toast),
    composerMetaDisplay: (function(){ var m = document.querySelector('.ai-composer-meta'); return m ? getComputedStyle(m).display : 'no-el'; })(),
    cssComposerH: getComputedStyle(document.documentElement).getPropertyValue('--ai-composer-h').trim(),
    cssNavH: getComputedStyle(document.documentElement).getPropertyValue('--nav-h').trim(),
    tabCount: document.querySelectorAll('.bottom-nav-btn').length
  };
})())`;

let server, chrome, profile, cdp, sessionId;
try {
  server = spawn(process.execPath, [ENTRY], { cwd: dirname(ENTRY), env: { ...process.env, PORT, HOST: '127.0.0.1' }, stdio: 'ignore' });
  let up = false;
  for (let i = 0; i < 60 && !up; i++) { await sleep(250); try { up = (await fetch(BASE + 'api/health')).ok; } catch (e) {} }
  if (!up) throw new Error('server 启动失败');

  const chromePath = findChrome();
  if (!chromePath) throw new Error('未找到 Chromium');
  profile = join(process.env.TEMP ?? '', 'ms-vaml-' + Date.now());
  chrome = spawn(chromePath, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${profile}`,
    '--lang=zh-CN', 'about:blank'
  ], { stdio: 'ignore' });

  let dbg = null;
  for (let i = 0; i < 40 && !dbg; i++) { await sleep(250); try { dbg = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`)).json(); } catch (e) {} }
  cdp = new Cdp(dbg.webSocketDebuggerUrl);
  await cdp.open();
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  ({ sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true }));
  await cdp.send('Runtime.enable', {}, sessionId);
  await cdp.send('Page.enable', {}, sessionId);

  const evalJs = async (expr) => {
    const r = await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, sessionId);
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  const shot = async (name) => {
    const r = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true }, sessionId);
    writeFileSync(join(OUT, name), Buffer.from(r.data, 'base64'));
  };
  // 移动三件套：手机 UA + mobile 指标 + 触摸仿真。缺任何一个都会让
  // (hover:none)/(pointer:coarse) 不匹配，横屏与触屏专属规则全部失联。
  const setMobile = async (w, h, ua) => {
    await cdp.send('Network.enable', {}, sessionId);
    if (ua) await cdp.send('Emulation.setUserAgentOverride', { userAgent: ua }, sessionId);
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, mobile: true, deviceScaleFactor: 2 }, sessionId);
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, sessionId);
  };

  // ==================== 启动 ====================
  console.log('=== AI 页移动端布局 · 真实 Chromium 验收 ===');
  await setMobile(390, 844, ANDROID_UA);
  await cdp.send('Page.navigate', { url: BASE + '?v=vaml' }, sessionId);
  await sleep(4000);
  await evalJs(`(() => { try { DataStore.setProgress('onboarding_done', true); } catch(e){} return 'ok'; })()`);
  await cdp.send('Page.navigate', { url: BASE + '?v=vaml2' }, sessionId);
  await sleep(4000);
  // 从首页点 AI 签进去（而不是直接改 hash）——要验的就是"点开 AI Tab 看到什么"
  await evalJs(`document.querySelector('.bottom-nav-btn[data-tab="ai"]').click(); 'ok'`);
  await sleep(900);

  // ==================== 阶段 0 · 竖屏 390×844 ====================
  console.log('\n—— 竖屏 390×844（Android UA + 触摸仿真）——');
  let s = JSON.parse(await evalJs(SNAP));
  check(s.activePage === 'page-ai' && s.tab === 'ai', '点 AI 签后停在 AI 页', `active=${s.activePage} tab=${s.tab}`);
  check(s.tabCount === 6, '底栏六签（AI 已入列）', `count=${s.tabCount}`);

  // —— 核心：composer 必须在首屏内 ——
  check(!!s.composer && s.composer.b <= s.vh, '★composer 完整落在首屏内（不用滚就能打字）',
    `composerBottom=${s.composer && s.composer.b} vh=${s.vh}`);
  check(s.contentScrollTop === 0, '★首屏无需滚动（scrollTop 为 0）', `scrollTop=${s.contentScrollTop}`);
  check(s.contentScrollH <= s.contentClientH + 2, '内容不溢出、没有出现滚动条',
    `scrollH=${s.contentScrollH} clientH=${s.contentClientH}`);
  check(!!s.composer && s.composerDisplay !== 'none', 'composer 未被隐藏', `display=${s.composerDisplay}`);

  // —— composer 不压底栏药丸 ——
  check(!!s.composer && !!s.nav && s.composer.b <= s.nav.t,
    'composer 底边不越过药丸顶边', `composerBottom=${s.composer && s.composer.b} navTop=${s.nav && s.nav.t}`);
  check(!!s.composer && s.nav.t - s.composer.b <= 12, 'composer 与药丸间距 ≤12px（不浪费首屏）',
    `gap=${s.nav && s.composer ? s.nav.t - s.composer.b : 'n/a'}`);

  // —— --ai-composer-h 实测同步 ——
  check(s.cssComposerH !== '' && Number(String(s.cssComposerH).replace('px','')) > 0,
    'JS 已把 composer 高度写进 --ai-composer-h', `css=${s.cssComposerH}`);
  check(s.cssComposerH !== '' && Math.abs(Number(String(s.cssComposerH).replace('px','')) - s.composer.h) <= 1,
    '--ai-composer-h 与实测高度一致（±1px）', `css=${s.cssComposerH} real=${s.composer && s.composer.h}`);

  // —— hero 压成紧凑条 ——
  check(!!s.hero && s.hero.h <= 72, 'hero 压成紧凑条（≤72px，原 ~110px）', `h=${s.hero && s.hero.h}`);
  check(s.heroPDisplay === 'none', 'hero 副标题在手机上隐藏（省出 ~30px 给对话）', `display=${s.heroPDisplay}`);
  check(!!s.hero && s.hero.r <= s.vw, 'hero 不横向溢出', `right=${s.hero && s.hero.r}`);

  // —— 概览折叠行保持薄 ——
  check(!!s.overview && s.overview.h <= 60, '「学习概况与建议」折叠行 ≤60px', `h=${s.overview && s.overview.h}`);
  check(s.overviewOpen === false, '窄屏默认收起概览（JS 同步生效）', `open=${s.overviewOpen}`);

  // —— 消息区拿到剩余高度 ——
  check(!!s.msgScroll && s.msgScroll.h >= 200, '消息滚动区拿到剩余高度（≥200px）', `h=${s.msgScroll && s.msgScroll.h}`);

  // —— meta 行聚焦才显示 ——
  check(s.composerMetaDisplay === 'none', '未聚焦时 composer-meta 整行隐藏（不占首屏）', `display=${s.composerMetaDisplay}`);
  await evalJs(`document.getElementById('ai-chat-input').focus(); 'ok'`);
  await sleep(300);
  s = JSON.parse(await evalJs(SNAP));
  check(s.composerMetaDisplay !== 'none', '聚焦后 meta 行显示（要看字数的人才看得到）', `display=${s.composerMetaDisplay}`);
  check(s.contentScrollTop === 0, '聚焦输入框不会把页面顶滚', `scrollTop=${s.contentScrollTop}`);

  check(!s.docOverflowX, '无横向溢出', `scrollWidth=${s.vw}`);

  // —— toast 避让 ——
  await evalJs(`window.Toast.show('朗读失败：浏览器在线语音不可用，本地发音服务也未启动', 'error'); 'ok'`);
  await sleep(400);
  s = JSON.parse(await evalJs(SNAP));
  check(!!s.toast && s.toast.b > 0, 'toast 已显示', JSON.stringify(s.toast));
  check(!!s.toast && !!s.composer && s.toast.b <= s.composer.t,
    '★toast 底边不进入 composer 区域（不盖住输入区）',
    `toastBottom=${s.toast && s.toast.b} composerTop=${s.composer && s.composer.t}`);
  check(!!s.toast && s.toast.t >= 0, 'toast 不超出视口顶部', `top=${s.toast && s.toast.t}`);
  await shot('ai-mobile-layout-portrait.png');

  // ==================== 阶段 1 · 深色主题 ====================
  console.log('\n—— 深色主题 390×844 ——');
  await evalJs(`document.documentElement.setAttribute('data-theme','dark'); 'ok'`);
  await sleep(400);
  s = JSON.parse(await evalJs(SNAP));
  check(s.activePage === 'page-ai' && !!s.composer && s.composer.b <= s.vh, '深色下 composer 仍在首屏',
    `bottom=${s.composer && s.composer.b}`);
  check(!s.docOverflowX, '深色下无横向溢出');
  await evalJs(`document.documentElement.setAttribute('data-theme','light'); 'ok'`);
  await sleep(300);

  // ==================== 阶段 2 · 窄屏 320×640 ====================
  console.log('\n—— 窄屏 320×640 ——');
  await setMobile(320, 640, ANDROID_UA);
  await sleep(700);
  s = JSON.parse(await evalJs(SNAP));
  check(!!s.composer && s.composer.b <= s.vh, '★320px 窄屏 composer 仍在首屏',
    `bottom=${s.composer && s.composer.b} vh=${s.vh}`);
  check(!s.docOverflowX, '320px 无横向溢出');
  check(s.contentScrollH <= s.contentClientH + 2, '320px 内容不溢出',
    `scrollH=${s.contentScrollH} clientH=${s.contentClientH}`);
  await shot('ai-mobile-layout-narrow.png');

  // ==================== 阶段 3 · 横屏 844×390 ====================
  console.log('\n—— 横屏 844×390（同一文档，只改指标）——');
  await setMobile(844, 390, ANDROID_UA);
  await sleep(700);
  s = JSON.parse(await evalJs(SNAP));
  check(!!s.composer && s.composer.b <= s.vh, '★横屏矮屏 composer 仍在首屏（横屏也要能打字）',
    `bottom=${s.composer && s.composer.b} vh=${s.vh}`);
  check(!!s.composer && !!s.nav && s.composer.b <= s.nav.t, '横屏下 composer 不压药丸',
    `composerBottom=${s.composer && s.composer.b} navTop=${s.nav && s.nav.t}`);
  check(!s.docOverflowX, '横屏无横向溢出');
  await shot('ai-mobile-layout-landscape.png');

  // ==================== 阶段 4 · 切页往返 ====================
  console.log('\n—— 切到首页再切回 AI（弹性布局要可逆）——');
  await setMobile(390, 844, ANDROID_UA);
  await sleep(700);
  await evalJs(`document.querySelector('.bottom-nav-btn[data-tab="home"]').click(); 'ok'`);
  await sleep(600);
  s = JSON.parse(await evalJs(SNAP));
  check(s.activePage === 'page-home', '能切到首页', `active=${s.activePage}`);
  check(s.contentScrollH > s.contentClientH, '首页恢复滚动（弹性布局没有外溢到别的页面）',
    `scrollH=${s.contentScrollH} clientH=${s.contentClientH}`);
  await evalJs(`document.querySelector('.bottom-nav-btn[data-tab="ai"]').click(); 'ok'`);
  await sleep(700);
  s = JSON.parse(await evalJs(SNAP));
  check(s.activePage === 'page-ai' && s.contentScrollH <= s.contentClientH + 2,
    '★切回 AI 页又回到"不滚动 + composer 在首屏"', `active=${s.activePage} scrollH=${s.contentScrollH}`);

  console.log(`\n===== 结果：${pass} 通过 / ${fail} 失败 =====`);
  console.log(`截图：audit-shots/ai-mobile-layout-{portrait,narrow,landscape}.png`);
} finally {
  try { chrome?.kill(); } catch (e) {}
  try { server?.kill(); } catch (e) {}
  try { cdp?.close(); } catch (e) {}
  await sleep(300);
  process.exitCode = fail ? 1 : 0;
}

// verify-reminders.mjs — 学习提醒（每日定时 + 番茄钟结束通知）· 真实浏览器验收
//
// 为什么必须真机验：三件事 jsdom 一律不执行、静态检查也查不出来 ——
//   ① 新加的「学习提醒」一组在手机视口下到底排得开不开、时间输入够不够大好点；
//   ② 深浅两套主题下文字对比度是否达标（新增控件没有历史审查记录）；
//   ③ 番茄钟真的走完一轮时，通知 + 弹窗 + 完成提示是不是都出现了。
//
// 覆盖：
//   移动端 390×844（浅/深）：控件可见、触控区 ≥44px、字号 ≥12px、无横向溢出、对比度
//   每日提醒：勾选 → 真的发起调度；改时间 → id 不变（否则会重复提醒）；关闭 → 取消同一条
//   权限被拒：开关自动回退 + 给出说明，不留一个"点了没反应"的死开关
//   番茄钟：倒计时归零 → 通知发出 + 对话框弹出 + 完成提示显示
//
// 用法：node scripts/verify-reminders.mjs
import { spawn } from 'node:child_process';
import { existsSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = join(root, 'server', 'server.js');
const PORT = process.env.VR_PORT || '3193';
const DEBUG_PORT = '9683';
const BASE = `http://127.0.0.1:${PORT}/`;
const OUT = join(root, 'browser-shots', 'reminders');
mkdirSync(OUT, { recursive: true });

const sleep = ms => new Promise(r => setTimeout(r, ms));
const MOBILE_UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

let pass = 0, fail = 0;
const check = (ok, label, extra) => {
  if (ok) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.log(`  ✗ ${label}${extra ? '  → ' + extra : ''}`); }
};
const section = t => console.log(`\n── ${t} ──`);

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
async function shot(cdp, name) {
  const r = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  writeFileSync(join(OUT, name + '.png'), Buffer.from(r.data, 'base64'));
}

// 页面里注入的可观测假插件（ Capacitor 在浏览器里不存在，只能这样验调用链）
const INSTALL_FAKE = `(function (permission) {
  var log = { schedule: [], cancel: [], createChannel: [] };
  var calls = { check: 0, request: 0 };   // 授权框到底弹了几次，必须能数出来
  window.__nlog = log;
  window.__ncalls = calls;
  window.Capacitor = { Platforms: { android: true }, Plugins: { LocalNotifications: {
    checkPermissions: function () { calls.check++; return Promise.resolve({ display: permission }); },
    requestPermissions: function () { calls.request++; return Promise.resolve({ display: permission }); },
    createChannel: function (c) { log.createChannel.push(c); return Promise.resolve(); },
    schedule: function (n) { log.schedule.push(n); return Promise.resolve(); },
    cancel: function (n) { log.cancel.push(n); return Promise.resolve(); },
    getPending: function () { return Promise.resolve({ notifications: [] }); }
  } } };
  return 'installed';
})`;

const CONTRAST = `JSON.stringify((function () {
  function lum(c) {
    var m = String(c).match(/[\\d.]+/g) || [];
    var v = m.slice(0, 3).map(function (x) { x = Number(x) / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); });
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  }
  function ratio(a, b) {
    var l1 = lum(a), l2 = lum(b);
    return Math.round((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05) * 100) / 100;
  }
  // 返回实际背景色 + 是谁提供的（id.class），不然"对比度不达标"没法定位是谁的锅
  function bgOf(el) {
    var n = el;
    while (n && n !== document.documentElement) {
      var c = getComputedStyle(n).backgroundColor;
      if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') {
        return { bg: c, from: (n.id ? '#' + n.id : '') + (n.className ? '.' + String(n.className).split(' ')[0] : '') };
      }
      n = n.parentElement;
    }
    return { bg: getComputedStyle(document.body).backgroundColor, from: 'body' };
  }
  var out = {};
  ['toggle-daily-reminder', 'daily-reminder-time', 'toggle-pomodoro-notify', 'reminder-permission-hint'].forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) { out[id] = null; return; }
    var r = el.getBoundingClientRect();
    var cs = getComputedStyle(el);
    var b = bgOf(el);
    out[id] = {
      contrast: ratio(cs.color, b.bg),
      color: cs.color, bg: b.bg, bgFrom: b.from,
      fs: parseFloat(cs.fontSize),
      w: Math.round(r.width), h: Math.round(r.height),
      visible: r.width > 0 && r.height > 0
    };
  });
  out.overflowX = document.documentElement.scrollWidth > window.innerWidth + 1;
  return out;
})())`;

let server, chrome, profile, cdp;
try {
  section('启动 server 与 Chromium');
  server = spawn(process.execPath, [ENTRY], { cwd: dirname(ENTRY), env: { ...process.env, PORT, HOST: '127.0.0.1' }, stdio: 'ignore' });
  let up = false;
  for (let i = 0; i < 80 && !up; i++) { await sleep(250); try { up = (await fetch(BASE + 'api/health')).ok; } catch (e) {} }
  check(up, `server 已在 ${BASE} 就绪`);
  if (!up) throw new Error('server 启动失败');

  const chromePath = findChrome();
  if (!chromePath) throw new Error('未找到 Chromium');
  profile = join(process.env.TEMP ?? '', 'ms-vr-' + Date.now());
  mkdirSync(profile, { recursive: true });
  chrome = spawn(chromePath, [`--user-data-dir=${profile}`, `--remote-debugging-port=${DEBUG_PORT}`, '--no-first-run',
    '--no-default-browser-check', '--headless=new', '--disable-gpu', '--mute-audio',
    '--autoplay-policy=no-user-gesture-required', '--window-size=390,844', 'about:blank'], { stdio: 'ignore' });

  let target = null;
  for (let i = 0; i < 60 && !target; i++) {
    await sleep(250);
    try {
      const list = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json();
      target = list.find(t => t.type === 'page');
    } catch (e) {}
  }
  if (!target) throw new Error('Chromium 未就绪');
  cdp = new Cdp(target.webSocketDebuggerUrl);
  await cdp.open();
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Network.enable');
  await cdp.send('Network.setUserAgentOverride', { userAgent: MOBILE_UA });
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true });
  check(true, 'Chromium + CDP 已连接（390×844 移动视口）');

  await cdp.send('Page.navigate', { url: BASE });
  await sleep(3500);

  // 用户诉求："允许通知的弹窗就弹出一次… 那些能力测试也只弹出一次"
  // 这两条都只能用真机验：要真的刷新一次页面，看它还弹不弹。
  section('⓪ 新手引导：首次弹，关掉后刷新不再弹');
  await sleep(1400);   // 引导是首屏渲染后 600ms 自动弹
  const ob1 = JSON.parse(await evalJs(cdp, `JSON.stringify((function () {
    var m = document.getElementById('onboarding-modal');
    return { shown: m ? !m.classList.contains('hidden') : false };
  })())`));
  check(ob1.shown === true, '首次打开会弹出新手引导（守卫不能过头）', JSON.stringify(ob1));
  await shot(cdp, '00-onboarding-first');

  const ob2 = JSON.parse(await evalJs(cdp, `(async () => {
    var btn = document.getElementById('btn-ob-close');
    if (btn) btn.click();
    await new Promise(function (r) { setTimeout(r, 300); });
    var m = document.getElementById('onboarding-modal');
    return JSON.stringify({
      hidden: m ? m.classList.contains('hidden') : true,
      seen: DataStore.getProgress('onboarding_seen', null),
      done: DataStore.getProgress('onboarding_done', null)
    });
  })()`));
  check(ob2.hidden === true, '点 × 后引导关闭', JSON.stringify(ob2));
  check(ob2.seen === true, '记为"看过"（onboarding_seen）', JSON.stringify(ob2));
  check(ob2.done !== true, '只是关掉不算走完（onboarding_done 不写）', JSON.stringify(ob2));

  // 强制整页重载（带 query 才是真重载，只改 hash 是同文档跳转）
  await cdp.send('Page.navigate', { url: BASE + '?again=1' });
  await sleep(3600);
  const ob3 = JSON.parse(await evalJs(cdp, `JSON.stringify((function () {
    var m = document.getElementById('onboarding-modal');
    return { shown: m ? !m.classList.contains('hidden') : false, seen: DataStore.getProgress('onboarding_seen', null) };
  })())`));
  check(ob3.seen === true, '刷新后"看过"标记仍在（真持久化）', JSON.stringify(ob3));
  check(ob3.shown === false, '刷新后引导没有再弹出来', JSON.stringify(ob3));
  await shot(cdp, '00-onboarding-after-reload');

  section('① 设置页「学习提醒」组：浅色 · 移动端');
  // 首次访问会弹新手引导，直接截图只会拍到遮罩 —— 测量仍是对真实 DOM 算的，
  // 但"看图确认视觉"就作废了。先标记完成再进设置页。
  await evalJs(cdp, `(function () {
    DataStore.setProgress('onboarding_done', true);
    var ob = document.getElementById('modal-onboarding');
    if (ob) ob.remove();
    window.app.showTab('settings');
    window.app.bindSettings();
    return 'ok';
  })()`);
  await sleep(500);
  let m = JSON.parse(await evalJs(cdp, CONTRAST));
  ['toggle-daily-reminder', 'daily-reminder-time', 'toggle-pomodoro-notify', 'reminder-permission-hint'].forEach(id => {
    const x = m[id];
    check(!!x && x.visible, `${id} 可见`, x ? JSON.stringify(x) : 'missing');
  });
  check(m['reminder-permission-hint'].contrast >= 4.5,
    `说明文字对比度 ${m['reminder-permission-hint'].contrast}:1 ≥ 4.5（AA）`);
  check(m['daily-reminder-time'].h >= 44, `时间输入高 ${m['daily-reminder-time'].h}px ≥ 44（好点）`);
  check(m['daily-reminder-time'].fs >= 12, `时间输入字号 ${m['daily-reminder-time'].fs}px ≥ 12`);
  check(m.overflowX === false, '设置页无横向溢出', m.overflowX ? 'scrollWidth 超出视口' : '');
  await shot(cdp, '01-settings-reminder-light');

  section('② 深色主题');
  // 必须走应用自己的 ThemeToggle.apply：手改 data-theme 属性只换掉文字令牌，
  // 背景还停在浅色（实测过：白底 + 深色文字令牌算出假的 2.98:1）。
  const themeNow = await evalJs(cdp, `(function(){ window.ThemeToggle.apply('dark'); return document.documentElement.getAttribute('data-theme'); })()`);
  console.log(`     （data-theme = ${themeNow}）`);
  await sleep(600);
  m = JSON.parse(await evalJs(cdp, CONTRAST));
  check(m['reminder-permission-hint'].contrast >= 4.5,
    `深色下说明文字对比度 ${m['reminder-permission-hint'].contrast}:1 ≥ 4.5`, JSON.stringify(m['reminder-permission-hint']));
  await shot(cdp, '02-settings-reminder-dark');
  await evalJs(cdp, `(function(){ window.ThemeToggle.apply('light'); return 'ok'; })()`);
  await sleep(300);

  section('③ 每日提醒：勾选 → 调度');
  await evalJs(cdp, INSTALL_FAKE + "('granted')");
  await evalJs(cdp, `window.app.bindSettings(); 'ok'`);
  const r1 = JSON.parse(await evalJs(cdp, `(async () => {
    var t = document.getElementById('daily-reminder-time');
    t.value = '07:30';
    t.dispatchEvent(new Event('change'));
    var tg = document.getElementById('toggle-daily-reminder');
    tg.checked = true;
    tg.dispatchEvent(new Event('change'));
    await new Promise(function (r) { setTimeout(r, 300); });
    var s = window.__nlog.schedule;
    return JSON.stringify({
      count: s.length,
      last: s.length ? s[s.length - 1].notifications[0] : null,
      hint: document.getElementById('reminder-permission-hint').textContent,
      checked: tg.checked
    });
  })()`));
  check(r1.count > 0, `发起了 ${r1.count} 次调度`, JSON.stringify(r1));
  check(!!r1.last && r1.last.schedule && r1.last.schedule.every === 'day', '调度类型是每天重复', JSON.stringify(r1.last));
  check(!!r1.last && r1.last.schedule.at.hour === 7 && r1.last.schedule.at.minute === 30,
    '时间取的是输入里的 07:30', JSON.stringify(r1.last && r1.last.schedule.at));
  check(/07:30/.test(r1.hint), `说明行反映出设定时间：「${r1.hint}」`);
  check(r1.checked === true, '开关保持开启');

  section('④ 改时间重复调度：id 必须不变（否则会重复提醒）');
  const r2 = JSON.parse(await evalJs(cdp, `(async () => {
    var t = document.getElementById('daily-reminder-time');
    t.value = '21:15';
    t.dispatchEvent(new Event('change'));
    await new Promise(function (r) { setTimeout(r, 300); });
    var ids = window.__nlog.schedule.map(function (s) { return s.notifications[0].id; });
    return JSON.stringify({ count: ids.length, unique: Array.from(new Set(ids)).length, lastAt: window.__nlog.schedule[window.__nlog.schedule.length-1].notifications[0].schedule.at });
  })()`));
  check(r2.unique === 1, `多次调度共用 1 个 id（实际 ${r2.unique} 个 / ${r2.count} 次）`, JSON.stringify(r2));
  check(r2.lastAt.hour === 21 && r2.lastAt.minute === 15, '新时间已生效', JSON.stringify(r2.lastAt));

  section('⑤ 关闭 → 取消的是同一条');
  const r3 = JSON.parse(await evalJs(cdp, `(async () => {
    var tg = document.getElementById('toggle-daily-reminder');
    tg.checked = false;
    tg.dispatchEvent(new Event('change'));
    await new Promise(function (r) { setTimeout(r, 300); });
    return JSON.stringify({
      cancels: window.__nlog.cancel.map(function (c) { return c.notifications[0].id; }),
      scheduledId: window.__nlog.schedule[0].notifications[0].id,
      hint: document.getElementById('reminder-permission-hint').textContent
    });
  })()`));
  check(r3.cancels.length > 0 && r3.cancels[0] === r3.scheduledId,
    `取消的 id 与调度的 id 一致（${r3.cancels[0]}）`, JSON.stringify(r3));
  check(/关闭/.test(r3.hint), `说明行提示已关闭：「${r3.hint}」`);

  section('⑥ 权限被拒 → 开关回退，不留死开关');
  await evalJs(cdp, INSTALL_FAKE + "('denied')");
  const r4 = JSON.parse(await evalJs(cdp, `(async () => {
    window.app.bindSettings();
    var tg = document.getElementById('toggle-daily-reminder');
    tg.checked = true;
    tg.dispatchEvent(new Event('change'));
    await new Promise(function (r) { setTimeout(r, 400); });
    return JSON.stringify({ checked: tg.checked, hint: document.getElementById('reminder-permission-hint').textContent });
  })()`));
  check(r4.checked === false, '权限被拒后开关自动关掉', JSON.stringify(r4));
  check(/权限/.test(r4.hint), `给出了解释：「${r4.hint}」`);

  section('⑦ 番茄钟走完一轮：通知 + 弹窗 + 完成提示');
  await evalJs(cdp, INSTALL_FAKE + "('granted')");
  const r5 = JSON.parse(await evalJs(cdp, `(async () => {
    window.__nlog.schedule.length = 0;
    var pm = window.app.pomodoroModule;
    pm.timeLeft = 2;
    pm.start();
    await new Promise(function (r) { setTimeout(r, 3200); });
    var immediate = window.__nlog.schedule.filter(function (s) { return !s.notifications[0].schedule; });
    var modal = document.getElementById('modal-confirm');
    return JSON.stringify({
      notifyCount: immediate.length,
      title: immediate.length ? immediate[0].notifications[0].title : '',
      modalShown: !!modal && getComputedStyle(modal).display !== 'none',
      modalTitle: (document.getElementById('confirm-title') || {}).textContent || '',
      msgShown: !document.getElementById('pomodoro-message').classList.contains('hidden'),
      msgText: document.getElementById('pomodoro-message').textContent
    });
  })()`));
  check(r5.notifyCount > 0, `番茄钟结束时发出了通知（${r5.notifyCount} 条）`, JSON.stringify(r5));
  check(/番茄钟/.test(r5.title), `通知标题是「${r5.title}」`);
  check(r5.modalShown === true, '同时弹出了完成对话框', JSON.stringify(r5));
  check(/番茄钟/.test(r5.modalTitle), `对话框标题是「${r5.modalTitle}」`);
  check(r5.msgShown === true && /专注完成/.test(r5.msgText), `完成提示已显示：「${r5.msgText}」`);
  await shot(cdp, '03-pomodoro-done');

  section('⑧ 关掉番茄钟通知后不再发，但完成提示照旧');
  const r6 = JSON.parse(await evalJs(cdp, `(async () => {
    var tg = document.getElementById('toggle-pomodoro-notify');
    tg.checked = false;
    tg.dispatchEvent(new Event('change'));
    window.__nlog.schedule.length = 0;
    var pm = window.app.pomodoroModule;
    pm.timeLeft = 2;
    pm.start();
    await new Promise(function (r) { setTimeout(r, 3200); });
    return JSON.stringify({
      count: window.__nlog.schedule.length,
      msgShown: !document.getElementById('pomodoro-message').classList.contains('hidden')
    });
  })()`));
  check(r6.count === 0, '关掉后不再发通知', JSON.stringify(r6));
  check(r6.msgShown === true, '完成提示仍然出现（通知失败也不能什么都不显示）');

  section('⑨ 授权框只问一次：已拒绝过就不再弹');
  await evalJs(cdp, INSTALL_FAKE + "('denied')");
  const r7 = JSON.parse(await evalJs(cdp, `(async () => {
    var tg = document.getElementById('toggle-daily-reminder');
    for (var i = 0; i < 3; i++) {
      tg.checked = true;
      tg.dispatchEvent(new Event('change'));
      await new Promise(function (r) { setTimeout(r, 120); });
    }
    return JSON.stringify({
      requestCount: window.__ncalls.request,
      checkCount: window.__ncalls.check,
      checked: tg.checked,
      hint: document.getElementById('reminder-permission-hint').textContent
    });
  })()`));
  check(r7.requestCount === 0, `连点 3 次开关，授权框一次都没弹（实际 ${r7.requestCount} 次）`, JSON.stringify(r7));
  check(r7.checkCount >= 1, '每次都先查了状态（不是靠猜）', JSON.stringify(r7));
  check(r7.checked === false, '开关回退为关，不留"开了却不生效"的假象', JSON.stringify(r7));
  check(/系统设置/.test(r7.hint), `提示引导去系统设置：「${r7.hint}」`);

  section('⑩ 从未问过（prompt）时，那唯一的一次会弹');
  await evalJs(cdp, INSTALL_FAKE + "('prompt')");
  const r8 = JSON.parse(await evalJs(cdp, `(async () => {
    var tg = document.getElementById('toggle-daily-reminder');
    tg.checked = true;
    tg.dispatchEvent(new Event('change'));
    await new Promise(function (r) { setTimeout(r, 200); });
    return JSON.stringify({ requestCount: window.__ncalls.request, checked: tg.checked });
  })()`));
  check(r8.requestCount === 1, `首次询问弹了 1 次（实际 ${r8.requestCount} 次）`, JSON.stringify(r8));
  check(r8.checked === false, '用户没授权 → 开关回退', JSON.stringify(r8));
} catch (e) {
  fail++;
  console.log('\n✗ 验收脚本异常：' + (e && e.stack || e));
} finally {
  try { cdp && cdp.close(); } catch (e) {}
  try { chrome && chrome.kill(); } catch (e) {}
  try { server && server.kill(); } catch (e) {}
  console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
  console.log(`截图：${OUT}`);
  process.exit(fail ? 1 : 0);
}

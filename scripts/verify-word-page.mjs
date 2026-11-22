// verify-word-page.mjs — 背单词页真实浏览器验收（两部分）
//
// 一、词库延迟就绪后的完整重渲染（2026-10-17 真机 bug 修复）
// 反馈：「页数没有加载出来；卡片显示的单词和我朗读发出的单词不是同一个；
// 按左右切换才变回来」。根因是 populateCategories 的 awaitLibrary ready
// 回调只补填分类、没有补渲染。用 Fetch.enable 把 all-data.js 掐住再放行，
// 精确复现"慢网首开"——jsdom 里没有真实的 async 脚本时序。
//
// 二、跳页控件「智能联动」（2026-10-17 用户选定方案）
// 未聚焦时输入框回显当前页码（位置指示 + 跳转器二合一）；聚焦即全选；
// 跳转后不清空、回显落点并全选待连跳；失焦丢弃未提交输入。
// select() 在 number 输入框上的行为依赖浏览器实现，必须真机验。
//
// 用法：node scripts/verify-word-page.mjs
import { spawn } from 'node:child_process';
import { existsSync, readdirSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = join(root, 'server', 'server.js');
const PORT = process.env.VWLR_PORT || '3191';
const DEBUG_PORT = '9688';
const BASE = `http://127.0.0.1:${PORT}/`;
const OUT = join(root, 'audit-shots');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const HOLD_MS = 2500;   // 掐住 all-data.js 的时长（>骨架 200ms 显形 + 一轮轮询）

const ANDROID_UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

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
  constructor(url) { this.url = url; this.ws = null; this.id = 0; this.pending = new Map(); this.handlers = new Map(); }
  async open() {
    this.ws = new WebSocket(this.url);
    await new Promise((res, rej) => { this.ws.addEventListener('open', res, { once: true }); this.ws.addEventListener('error', rej); });
    this.ws.addEventListener('message', ev => this._onMsg(ev.data));
  }
  _onMsg(raw) {
    const m = JSON.parse(raw);
    if (m.id && this.pending.has(m.id)) { const { res, rej } = this.pending.get(m.id); this.pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); return; }
    if (m.method && this.handlers.has(m.method)) this.handlers.get(m.method).forEach(cb => { try { cb(m.params); } catch (e) {} });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((res, rej) => { this.pending.set(id, { res, rej }); this.ws.send(JSON.stringify({ id, method, params })); });
  }
  on(method, cb) { if (!this.handlers.has(method)) this.handlers.set(method, []); this.handlers.get(method).push(cb); }
  close() { try { this.ws.close(); } catch (e) {} }
}

async function evalJs(cdp, expr) {
  const r = await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'eval error');
  return r.result.value;
}

const SNAP = `JSON.stringify({
  tab: (window.app && window.app.currentTab) || '',
  cardWord: document.getElementById('current-word').textContent,
  progress: document.getElementById('word-progress').textContent,
  jumpTotal: document.getElementById('word-jump-total').textContent,
  inputEcho: document.getElementById('word-jump-input').value,
  hasSkeleton: !!document.getElementById('word-card').querySelector('[data-skeleton]'),
  ariaBusy: document.getElementById('word-card').getAttribute('aria-busy'),
  listRows: document.querySelectorAll('#word-list-body .wl-row').length,
  poolLen: (window.app && window.app.wordModule) ? window.app.wordModule.getCardWords().length : -1,
  curIdx: (window.app && window.app.wordModule) ? window.app.wordModule.currentIndex : -1,
  poolWord: (function(){ var wm = window.app && window.app.wordModule; if(!wm) return ''; var p = wm.getCardWords(); return (p[wm.currentIndex]||{}).word || ''; })(),
})`;

let server, chrome, profile, cdp;
try {
  server = spawn(process.execPath, [ENTRY], { cwd: dirname(ENTRY), env: { ...process.env, PORT, HOST: '127.0.0.1' }, stdio: 'ignore' });
  let up = false;
  for (let i = 0; i < 60 && !up; i++) { await sleep(250); try { up = (await fetch(BASE + 'api/health')).ok; } catch (e) {} }
  if (!up) throw new Error('server 启动失败');

  const chromePath = findChrome();
  if (!chromePath) throw new Error('未找到 Chromium');
  profile = join(process.env.TEMP ?? '', 'ms-vwlr-' + Date.now());
  mkdirSync(profile, { recursive: true });
  chrome = spawn(chromePath, [`--user-data-dir=${profile}`, `--remote-debugging-port=${DEBUG_PORT}`, '--no-first-run', '--no-default-browser-check', '--headless=new', '--disable-gpu', '--window-size=420,900', 'about:blank'], { stdio: 'ignore' });

  let target = null;
  for (let i = 0; i < 60 && !target; i++) { await sleep(250); try { const list = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json(); target = list.find(t => t.type === 'page'); } catch (e) {} }
  if (!target) throw new Error('CDP 未就绪');

  cdp = new Cdp(target.webSocketDebuggerUrl);
  await cdp.open();
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  // 焦点仿真：headless 下 document.hasFocus() 为 false，focus/blur 事件被抑制，
  // 跳页控件的"聚焦即全选/失焦回显"两条路径会验不到（无头假象，真机不会）。
  await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await cdp.send('Emulation.setUserAgentOverride', { userAgent: ANDROID_UA });
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, mobile: true, deviceScaleFactor: 3 });
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });

  // 掐住 all-data.js：模拟 9.9MB 词库在慢网首开时迟到。
  // 注意始终保留最新一次被掐的请求——中途会重新导航（跳引导盖层），
  // 旧导航的拦截 ID 随导航中止而失效，fulfill 它会报 Invalid InterceptionId。
  const allData = readFileSync(join(root, 'data', 'all-data.js'));
  await cdp.send('Fetch.enable', { patterns: [{ urlPattern: '*all-data.js*', requestStage: 'Request' }] });
  let held = null;
  cdp.on('Fetch.requestPaused', (p) => { held = p; });

  const waitApp = async () => {
    for (let i = 0; i < 80; i++) {
      const ok = await evalJs(cdp, `!!(window.app && window.app.currentTab && window.app.wordModule && document.querySelector('.page.active'))`);
      if (ok) { await sleep(400); return; }
      await sleep(250);
    }
    throw new Error('应用启动超时');
  };

  console.log('\n=== 词库延迟就绪 · 背单词页完整重渲染 · 真实浏览器验收 ===');
  console.log(`（all-data.js 被掐住 ${HOLD_MS}ms 后放行，复现慢网首开）`);
  console.log('（后半段：跳页控件智能联动）\n');

  // 首访落地 + 跳过引导盖层
  await cdp.send('Page.navigate', { url: BASE });
  await sleep(4000);
  await evalJs(cdp, `(function(){ try { DataStore.setProgress('onboarding_done', true); return true; } catch(e){ return String(e); } })()`);

  // 重新加载（all-data.js 仍被掐住）——此时 App 在无词库状态下构造
  await cdp.send('Page.navigate', { url: BASE + '?v=wvlr' });
  await waitApp();

  // 切到背单词页（WordModule 构造时已注册等待，与首开路径一致）
  await evalJs(cdp, `window.app.showTab('word'); 'ok'`);
  await sleep(HOLD_MS);   // 等骨架显形 + 至少一轮轮询空转

  console.log('—— 词库迟到期间（占位态）——');
  let s = JSON.parse(await evalJs(cdp, SNAP));
  check(s.hasSkeleton, '卡区显示骨架（而不是静态占位词）', 'skeleton=' + s.hasSkeleton);
  check(s.progress === '0/0', '页码停在 0/0（bug 现场）', 'progress=' + s.progress);
  check(s.jumpTotal === '0', '跳页总数停在 0（bug 现场）', 'total=' + s.jumpTotal);
  check(s.cardWord === 'Abandon', '卡片是静态占位词（bug 现场）', 'word=' + s.cardWord);
  check(s.poolLen === 0, '此刻卡片池确实为空（等待态成立）', 'poolLen=' + s.poolLen);

  // 等待态先切到列表视图：放行后 ready 回调的 renderWordList 分支要被真正走到
  // （放行后再切列表测的就只是 switchView 自己的渲染，覆盖不到这个分支）
  await evalJs(cdp, `window.app.wordModule.switchView('list'); 'ok'`);
  await sleep(300);
  const sList0 = JSON.parse(await evalJs(cdp, SNAP));
  check(sList0.listRows === 0, '等待态列表为空（占位提示，不是真数据）', 'rows=' + sList0.listRows);

  // 放行 all-data.js
  console.log(`\n—— 放行 all-data.js（${(allData.length / 1048576).toFixed(1)}MB）——`);
  const p = held;
  if (!p) throw new Error('all-data.js 的请求没有被掐住（Fetch 拦截未生效）');
  await cdp.send('Fetch.fulfillRequest', {
    requestId: p.requestId,
    responseCode: 200,
    responseHeaders: [{ name: 'Content-Type', value: 'application/javascript' }, { name: 'Cache-Control', value: 'no-store' }],
    body: allData.toString('base64'),
  });
  await sleep(1600);   // 轮询 500ms + 渲染

  console.log('\n—— 词库就绪后 ——');
  s = JSON.parse(await evalJs(cdp, SNAP));
  check(!s.hasSkeleton && s.ariaBusy === null, '骨架收掉、aria-busy 清除', 'skeleton=' + s.hasSkeleton);
  check(s.poolLen > 0, '词库已就绪（卡片池非空）', 'poolLen=' + s.poolLen);
  check(s.cardWord === s.poolWord && s.cardWord !== 'Abandon', '卡片渲染成真实当前词（不再是静态占位词）',
    `card=${s.cardWord} real=${s.poolWord}`);
  check(s.progress === (s.curIdx + 1) + '/' + s.poolLen, '页码补成 N/M', `progress=${s.progress} expect=${s.curIdx + 1}/${s.poolLen}`);
  check(s.jumpTotal === String(s.poolLen), '跳页总数补成 M', `total=${s.jumpTotal} expect=${s.poolLen}`);
  check(s.inputEcho === String(s.curIdx + 1), '输入框回显当前页码（智能联动）', `echo=${s.inputEcho} cur=${s.curIdx + 1}`);

  // 朗读一致性：打桩 SpeechUtil.speakWord，比对发出的词与卡片显示的词
  const spoken = await evalJs(cdp, `(function(){
    var out = [];
    var orig = window.SpeechUtil.speakWord;
    window.SpeechUtil.speakWord = function(w){ out.push(w); };
    try { window.app.wordModule.speakCurrent(); } finally { window.SpeechUtil.speakWord = orig; }
    return JSON.stringify(out);
  })()`);
  const spokenArr = JSON.parse(spoken);
  check(spokenArr.length === 1 && spokenArr[0] === s.cardWord, '朗读发出的词与卡片显示的词一致',
    `spoken=${JSON.stringify(spokenArr)} card=${s.cardWord}`);

  // 翻页立即可用
  await evalJs(cdp, `window.app.wordModule.nextWord(); 'ok'`);
  await sleep(400);
  const s2 = JSON.parse(await evalJs(cdp, SNAP));
  check(s2.curIdx === s.curIdx + 1 && s2.cardWord === s2.poolWord, '就绪后立即可以翻页且卡片同步',
    `idx=${s2.curIdx} card=${s2.cardWord}`);

  // 列表视图分支：等待态用户在列表页，就绪后 renderWordList 必须补渲染。
  // 判据是 .wl-row（div 结构，不是 tr——第一版写成 tr 恒为 0，误判过一次）。
  await sleep(300);
  const s3 = JSON.parse(await evalJs(cdp, SNAP));
  check(s3.listRows > 0, '列表视图同步补渲染（.wl-row > 0）', 'rows=' + s3.listRows);

  // 回到卡片视图截图（等过入场动画，抓稳定态——初版 400ms 时卡片还在
  // _playCardEnter 的过渡里，文字位置偏移，差点被误判成布局回归）
  await evalJs(cdp, `window.app.wordModule.switchView('card'); 'ok'`);
  await sleep(1200);

  // ==================== 二、跳页控件智能联动 ====================
  console.log('\n—— 跳页控件智能联动 ——');

  // 1) 未聚焦回显当前页码
  let j = JSON.parse(await evalJs(cdp, `JSON.stringify({
    v: document.getElementById('word-jump-input').value,
    cur: window.app.wordModule.currentIndex,
  })`));
  check(j.v === String(j.cur + 1), '未聚焦时回显当前页码', `value=${j.v} cur=${j.cur + 1}`);

  // 2) 聚焦即全选（number 输入框的 select 行为，真机才能验）
  let sel = JSON.parse(await evalJs(cdp, `(function(){
    var el = document.getElementById('word-jump-input');
    el.focus();
    el.select();
    return JSON.stringify({ s: el.selectionStart, e: el.selectionEnd, len: el.value.length, active: document.activeElement === el });
  })()`));
  check(sel.active && sel.s === 0 && sel.e === sel.len, '聚焦即全选（可直接输入新序号覆盖）', JSON.stringify(sel));

  // 3) 输入序号 + 回车 → 跳转，box 回显落点、仍聚焦、全选待连跳
  await evalJs(cdp, `(function(){
    var el = document.getElementById('word-jump-input');
    el.value = '500';
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    return 'ok';
  })()`);
  await sleep(500);
  j = JSON.parse(await evalJs(cdp, `JSON.stringify({
    cur: window.app.wordModule.currentIndex,
    v: document.getElementById('word-jump-input').value,
    s: document.getElementById('word-jump-input').selectionStart,
    e: document.getElementById('word-jump-input').selectionEnd,
    active: document.activeElement === document.getElementById('word-jump-input'),
    progress: document.getElementById('word-progress').textContent,
  })`));
  check(j.cur === 499, '回车跳转到第 500 张', 'cur=' + j.cur);
  check(j.v === '500' && j.active && j.s === 0 && j.e === 3, '跳转后回显落点、仍聚焦且全选待连跳', JSON.stringify(j));
  check(j.progress === '500/' + j.cur + 1 + '' || j.progress === '500/10000', '进度行同步', 'progress=' + j.progress);

  // 4) 连跳：全选状态下直接输入新序号即可（无需手动清空）
  await evalJs(cdp, `(function(){
    var el = document.getElementById('word-jump-input');
    el.value = '800';
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    return 'ok';
  })()`);
  await sleep(500);
  j = JSON.parse(await evalJs(cdp, `JSON.stringify({ cur: window.app.wordModule.currentIndex, v: document.getElementById('word-jump-input').value })`));
  check(j.cur === 799 && j.v === '800', '连跳第二次直达第 800 张', JSON.stringify(j));

  // 5) 失焦丢弃未提交输入，回显当前页码
  await evalJs(cdp, `(function(){
    var el = document.getElementById('word-jump-input');
    el.focus(); el.select();
    el.value = '123';        // 改了但不回车、不点跳转
    el.blur();
    return 'ok';
  })()`);
  await sleep(120);   // 实现里失焦同步延迟一帧
  j = JSON.parse(await evalJs(cdp, `JSON.stringify({ v: document.getElementById('word-jump-input').value, cur: window.app.wordModule.currentIndex })`));
  check(j.v === String(j.cur + 1), '失焦丢弃未提交输入，回显当前页码', `value=${j.v} cur=${j.cur + 1}`);

  // 6) 翻卡时输入框跟随（失焦态）
  await evalJs(cdp, `window.app.wordModule.nextWord(); 'ok'`);
  await sleep(400);
  j = JSON.parse(await evalJs(cdp, `JSON.stringify({ v: document.getElementById('word-jump-input').value, cur: window.app.wordModule.currentIndex })`));
  check(j.v === String(j.cur + 1), '翻卡后输入框跟随更新', `value=${j.v} cur=${j.cur + 1}`);

  const { data: shot } = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  writeFileSync(join(OUT, 'word-lib-ready.png'), Buffer.from(shot, 'base64'));

  console.log(`\n===== 结果：${pass} 通过 / ${fail} 失败 =====`);
  console.log('截图：audit-shots/word-lib-ready.png');
} finally {
  try { chrome?.kill(); } catch (e) {}
  try { server?.kill(); } catch (e) {}
  try { cdp?.close(); } catch (e) {}
  await sleep(300);
  process.exitCode = fail ? 1 : 0;
}

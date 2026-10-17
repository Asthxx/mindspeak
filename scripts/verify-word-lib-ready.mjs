// verify-word-lib-ready.mjs — 词库延迟就绪后，背单词页完整重渲染的真实浏览器验收
//
// 背景（2026-10-17 真机反馈）：「页数没有加载出来；卡片显示的单词和我朗读发出
// 的单词不是同一个；按左右切换才变回来」。根因是 populateCategories 的
// awaitLibrary ready 回调只补填分类、没有补渲染。
//
// 为什么必须真机验：这条路径取决于 data/all-data.js（约 9.9MB，async）在
// App 构造之后才落地——jsdom 里没有真实的 async 脚本时序。本脚本用
// Fetch.enable 把 all-data.js 掐住 ~2.5s 再放行，精确复现"慢网首开"。
//
// 覆盖：
//   1. 词库迟到期间：卡区骨架、页码 0/0、跳页总数 0、卡片=静态占位词
//   2. 词库落地后：卡片=真实当前词、页码 N/M、跳页总数 M、输入上限同步
//   3. 朗读发出的词与卡片显示的词一致（speakCurrent 打桩监听）
//   4. 列表视图同步补渲染（renderWordList 分支）
//
// 用法：node scripts/verify-word-lib-ready.mjs
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
  jumpMax: document.getElementById('word-jump-input').max,
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

  console.log('\n=== 词库延迟就绪 · 背单词页完整重渲染 · 真实浏览器验收 ===\n');
  console.log(`（all-data.js 被掐住 ${HOLD_MS}ms 后放行，复现慢网首开）\n`);

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
  check(s.jumpMax === String(s.poolLen), '跳页输入上限同步', 'max=' + s.jumpMax);

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

  // 回到卡片视图截图
  await evalJs(cdp, `window.app.wordModule.switchView('card'); 'ok'`);
  await sleep(400);
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

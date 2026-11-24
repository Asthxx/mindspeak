// verify-card-motion.mjs — 单词卡翻转 / 切卡动效 / 移动端手势实测（P1-2、P1-3）
// 重点验证「3D 双面卡」这个改造最容易出的问题：.hidden 在这里只是状态标记，
// 若 display 覆盖规则失效，背面会被 display:none 挡住 → 卡片空白。
// 输出：控制台断言 + test-screenshots/card-*.png
import { spawn } from 'node:child_process';
import { existsSync, readdirSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = join(root, 'server', 'server.js');
const PORT = process.env.VC_PORT || '3130';
const DEBUG_PORT = '9470';
const BASE = `http://127.0.0.1:${PORT}/`;
const OUT = join(root, 'test-screenshots');
const sleep = ms => new Promise(r => setTimeout(r, ms));

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

async function evalJs(cdp, S, expr, awaitPromise = false) {
  const r = await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise }, S);
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'eval error');
  return r.result.value;
}

const results = [];
let pass = 0, fail = 0;
function check(name, ok, detail) {
  results.push({ name, ok, detail });
  ok ? pass++ : fail++;
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${name}${detail ? ' — ' + detail : ''}`);
}

// 页面内的合成触摸工具（真实 Chromium 支持 Touch/TouchEvent 构造器）
const TOUCH_HELPERS = `
  (() => {
    const card = document.getElementById('word-card');
    card.__t = (type, x, y) => {
      const t = new Touch({ identifier: 1, target: card, clientX: x, clientY: y });
      const empty = type === 'touchend' || type === 'touchcancel';
      card.dispatchEvent(new TouchEvent(type, {
        touches: empty ? [] : [t], targetTouches: empty ? [] : [t], changedTouches: [t],
        bubbles: true, cancelable: true,
      }));
    };
    return 'ready';
  })()`;

const SNAP = `(() => {
  const card = document.getElementById('word-card');
  const front = document.getElementById('word-front');
  const back = document.getElementById('word-back');
  const cs = getComputedStyle(card);
  const fs = getComputedStyle(front);
  const bs = getComputedStyle(back);
  const rhs = back.getBoundingClientRect();
  return {
    cardDisplay: cs.display,
    cardTransform: cs.transform,
    animName: cs.animationName,
    frontHidden: front.classList.contains('hidden'),
    backHidden: back.classList.contains('hidden'),
    frontDisplay: fs.display,
    backDisplay: bs.display,
    frontTransform: fs.transform,
    backTransform: bs.transform,
    frontTransition: fs.transitionProperty + ' ' + fs.transitionDuration,
    backTransition: bs.transitionProperty + ' ' + bs.transitionDuration,
    backVisibility: bs.backfaceVisibility,
    frontOpacity: fs.opacity,
    backOpacity: bs.opacity,
    backVisible: bs.display !== 'none' && rhs.width > 0 && rhs.height > 0 && Number(bs.opacity) > 0.5,
    // 「肉眼看到哪一面」的唯一可靠判据：卡片中心点的命中元素。
    // 只算 display/size/opacity 是不够的——背面可以被 rotateY(180deg) +
    // backface-visibility 隐藏，那时它的盒模型依然完整（本检查初版就漏了这一层）。
    topFace: (() => {
      const r = card.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      if (!hit || !hit.closest) return 'none';
      return hit.closest('#word-front') ? 'front' : (hit.closest('#word-back') ? 'back' : 'other');
    })(),
    frontW: Math.round(front.getBoundingClientRect().width),
    backW: Math.round(rhs.width),
    frontH: Math.round(front.getBoundingClientRect().height),
    backH: Math.round(rhs.height),
    word: document.getElementById('current-word').textContent,
    idx: window.app.wordModule.currentIndex,
  };
})()`;

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
  profile = join(process.env.TEMP ?? '', 'ms-card-' + Date.now());
  mkdirSync(profile, { recursive: true });
  chrome = spawn(chromePath, [
    '--headless=new', '--no-proxy-server', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${profile}`,
    '--window-size=1440,900', '--lang=zh-CN', 'about:blank',
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

  const errors = [];
  cdp.on('Runtime.consoleAPICalled', p => {
    if (p.type === 'error') errors.push('[console.error] ' + (p.args || []).map(a => a.value ?? a.description ?? '').join(' ').slice(0, 160));
  });
  cdp.on('Runtime.exceptionThrown', p => {
    errors.push('[exception] ' + (p.exceptionDetails?.exception?.description || '').slice(0, 160));
  });

  await cdp.send('Page.enable', {}, S);
  await cdp.send('Runtime.enable', {}, S);
  // ⚠️ headless Chromium 的 prefers-reduced-motion 默认就是 reduce！
  // 不显式覆盖的话，测到的是「降级后的静态样式」——动画本身根本没跑，
  // transform 与跟手位移全是空值（本脚本初版就因此连报两个假失败）。
  await cdp.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }],
  }, S);
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }, S);
  await cdp.send('Page.navigate', { url: BASE }, S);
  await sleep(1200);
  await evalJs(cdp, S, `localStorage.setItem('onboarding_done','true'); 'ok'`);
  await cdp.send('Page.navigate', { url: BASE }, S);
  await sleep(1600);
  await evalJs(cdp, S, `window.app.showTab('word'); 'ok'`);
  await sleep(700);
  await evalJs(cdp, S, TOUCH_HELPERS);

  // ── 1. 卡片结构：同格叠放，正面朝前 ──
  let s = await evalJs(cdp, S, SNAP);
  check('卡片改为 grid 同格叠放（两面尺寸一致）', s.cardDisplay === 'grid' && s.frontW === s.backW,
    `display=${s.cardDisplay} front=${s.frontW}px back=${s.backW}px`);
  check('初始态：正面朝前、背面被 .hidden 标记且不可见',
    s.frontHidden === false && s.backHidden === true && s.topFace === 'front',
    `frontHidden=${s.frontHidden} backHidden=${s.backHidden} topFace=${s.topFace}`);
  check('背面未被 display:none 吃掉（.hidden 覆盖规则生效）', s.backDisplay !== 'none', `backDisplay=${s.backDisplay}`);

  const frontShot = await cdp.send('Page.captureScreenshot', { format: 'png' }, S);
  writeFileSync(join(OUT, 'card-front.png'), Buffer.from(frontShot.data, 'base64'));

  // ── 2. 翻转：背面真的转到前面来 ──
  await evalJs(cdp, S, `document.getElementById('btn-flip').click(); 'ok'`);
  await sleep(40);
  const mid = await evalJs(cdp, S, SNAP);
  const midShot = await cdp.send('Page.captureScreenshot', { format: 'png' }, S);
  writeFileSync(join(OUT, 'card-flip-mid.png'), Buffer.from(midShot.data, 'base64'));
  await sleep(320);
  s = await evalJs(cdp, S, SNAP);
  check('翻转后：背面真的转到最前面（命中测试）',
    s.backHidden === false && s.backDisplay !== 'none' && s.topFace === 'back',
    `backHidden=${s.backHidden} display=${s.backDisplay} topFace=${s.topFace}`);
  check('翻转后：背面文字内容可读（非空白卡）',
    s.backW > 100 && s.backH > 100 && s.backVisible,
    `back ${s.backW}×${s.backH} opacity=${s.backOpacity}`);
  // 诊断信息：rotateY(0) 的计算值就是 none，所以只认「翻转途中出现过非 none」
  console.log(`      mid: front=${mid.frontTransform.slice(0, 24)}… back=${mid.backTransform.slice(0, 24)}… ` +
    `transition=${mid.backTransition}`);
  check('翻转过程中出现过 Y 轴旋转（非恒等 transform）',
    mid.frontTransform !== 'none' || mid.backTransform !== 'none',
    `mid front=${mid.frontTransform} back=${mid.backTransform}`);
  const backShot = await cdp.send('Page.captureScreenshot', { format: 'png' }, S);
  writeFileSync(join(OUT, 'card-back.png'), Buffer.from(backShot.data, 'base64'));

  // 翻回去
  await evalJs(cdp, S, `document.getElementById('btn-flip').click(); 'ok'`);
  await sleep(320);
  s = await evalJs(cdp, S, SNAP);
  check('再翻一次回到正面', s.frontHidden === false && s.backHidden === true && s.topFace === 'front',
    `topFace=${s.topFace}`);

  // ── 3. 评价 → 切卡入场动画方向 ──
  const watchAnim = (btnId) => `
    new Promise(res => {
      const card = document.getElementById('word-card');
      const seen = [];
      const mo = new MutationObserver(() => {
        const m = card.className.match(/card-in-\\w+/);
        if (m) seen.push(m[0]);
      });
      mo.observe(card, { attributes: true, attributeFilter: ['class'] });
      document.getElementById('${btnId}').click();
      setTimeout(() => { mo.disconnect(); res(seen.join(',')); }, 450);
    })`;

  const knownAnim = await evalJs(cdp, S, watchAnim('btn-known'), true);
  check('「认识」→ 新卡从右侧进入', knownAnim.includes('card-in-right'), `动画=${knownAnim || '(无)'}`);
  const forgotAnim = await evalJs(cdp, S, watchAnim('btn-forgot'), true);
  check('「不认识」→ 新卡从左侧进入', forgotAnim.includes('card-in-left'), `动画=${forgotAnim || '(无)'}`);

  // 按下态
  const pressed = await evalJs(cdp, S, `
    new Promise(res => {
      const btn = document.getElementById('btn-hesitate');
      let seen = false;
      const mo = new MutationObserver(() => { if (btn.classList.contains('is-pressed')) seen = true; });
      mo.observe(btn, { attributes: true, attributeFilter: ['class'] });
      btn.click();
      setTimeout(() => { mo.disconnect(); res(seen); }, 200);
    })`, true);
  check('评价按钮有按下态反馈（.is-pressed）', pressed === true, `seen=${pressed}`);

  // ── 4. 移动端手势：真实合成 Touch 事件 ──
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, S);
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true }, S);
  await sleep(500);
  await evalJs(cdp, S, TOUCH_HELPERS);

  const before = await evalJs(cdp, S, `window.app.wordModule.currentIndex`);
  // 左滑 → 下一个
  await evalJs(cdp, S, `(() => {
    const c = document.getElementById('word-card');
    c.__t('touchstart', 300, 400); c.__t('touchmove', 200, 402); c.__t('touchend', 200, 402);
    return 'ok'; })()`);
  await sleep(400);
  const afterLeft = await evalJs(cdp, S, `window.app.wordModule.currentIndex`);
  check('左滑 → 下一张', afterLeft === before + 1, `${before} → ${afterLeft}`);

  // 右滑 → 上一个
  await evalJs(cdp, S, `(() => {
    const c = document.getElementById('word-card');
    c.__t('touchstart', 100, 400); c.__t('touchmove', 200, 402); c.__t('touchend', 200, 402);
    return 'ok'; })()`);
  await sleep(400);
  const afterRight = await evalJs(cdp, S, `window.app.wordModule.currentIndex`);
  check('右滑 → 上一张', afterRight === before, `${afterLeft} → ${afterRight}`);

  // 上滑 → 翻转
  await evalJs(cdp, S, `(() => {
    const c = document.getElementById('word-card');
    c.__t('touchstart', 195, 500); c.__t('touchmove', 197, 420); c.__t('touchend', 197, 420);
    return 'ok'; })()`);
  await sleep(350);
  const afterUp = await evalJs(cdp, S, `document.getElementById('word-back').classList.contains('hidden')`);
  check('上滑 → 翻转（背面显示）', afterUp === false, `backHidden=${afterUp}`);

  // 轻点（无位移）不应误判成手势
  const idxBefore = await evalJs(cdp, S, `window.app.wordModule.currentIndex`);
  const flipBefore = await evalJs(cdp, S, `!document.getElementById('word-back').classList.contains('hidden')`);
  await evalJs(cdp, S, `(() => {
    const c = document.getElementById('word-card');
    c.__t('touchstart', 195, 460); c.__t('touchend', 195, 460);
    return 'ok'; })()`);
  await sleep(300);
  const idxAfter = await evalJs(cdp, S, `window.app.wordModule.currentIndex`);
  const flipAfter = await evalJs(cdp, S, `!document.getElementById('word-back').classList.contains('hidden')`);
  check('轻点（无位移）不触发手势', idxAfter === idxBefore && flipAfter === flipBefore,
    `idx ${idxBefore}→${idxAfter} flipped ${flipBefore}→${flipAfter}`);

  // 纵向滑动不应被当成横向手势（轴锁）
  const idxY0 = await evalJs(cdp, S, `window.app.wordModule.currentIndex`);
  await evalJs(cdp, S, `(() => {
    const c = document.getElementById('word-card');
    c.__t('touchstart', 195, 600); c.__t('touchmove', 190, 480); c.__t('touchend', 190, 480);
    return 'ok'; })()`);
  await sleep(300);
  const idxY1 = await evalJs(cdp, S, `window.app.wordModule.currentIndex`);
  check('纵向滑动不切卡（轴锁生效）', idxY0 === idxY1, `${idxY0} → ${idxY1}`);

  // 跟手位移：移动途中读 transform
  const dragging = await evalJs(cdp, S, `
    (() => {
      const c = document.getElementById('word-card');
      window.__dragging = (() => {
        c.__t('touchstart', 320, 400);
        c.__t('touchmove', 260, 401);
        return { transform: c.style.transform, opacity: c.style.opacity };
      })();
      c.__t('touchend', 260, 401);
      return window.__dragging;
    })()`);
  check('横滑过程中有跟手位移与淡出',
    dragging.transform.includes('translateX') && Number(dragging.opacity) < 1,
    JSON.stringify(dragging));

  const mobileShot = await cdp.send('Page.captureScreenshot', { format: 'png' }, S);
  writeFileSync(join(OUT, 'card-mobile.png'), Buffer.from(mobileShot.data, 'base64'));

  // ── 5. prefers-reduced-motion 降级 ──
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }, S);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] }, S);
  await sleep(400);
  const rm = await evalJs(cdp, S, `(() => {
    const f = getComputedStyle(document.getElementById('word-front'));
    return { transform: f.transform, transition: f.transitionProperty, duration: f.transitionDuration };
  })()`);
  check('降低动效偏好下：翻转降级为交叉淡化（无旋转、无 transform 过渡）',
    rm.transform === 'none' && !rm.transition.includes('transform'),
    JSON.stringify(rm));
  await cdp.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }],
  }, S);

  check('全流程无 console 错误', errors.length === 0, errors.slice(0, 3).join(' | '));
  console.log('\n  截图：test-screenshots/card-front.png / card-flip-mid.png / card-back.png / card-mobile.png');
} catch (e) {
  console.log('\n脚本异常：' + (e && e.message));
  fail++;
} finally {
  try { cdp && cdp.close(); } catch (e) {}
  try { chrome && chrome.kill(); } catch (e) {}
  try { server && server.kill(); } catch (e) {}
  if (profile) { await sleep(500); try { rmSync(profile, { recursive: true, force: true }); } catch (e) {} }
}

console.log(`\n===== ${pass} 通过 / ${fail} 失败 =====`);
process.exit(fail ? 1 : 0);

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '../..');
const read = p => readFileSync(resolve(root, p), 'utf8');

// 把 js/core/loading.js 装进当前 jsdom。
// 用 new Function 而不是 import：core 脚本是 IIFE + window 挂载的写法，
// 与 js/core/progress.js 的既有测试保持一致。
function loadLoading() {
  const src = read('js/core/loading.js');
  // eslint-disable-next-line no-new-func
  new Function('window', 'module', src)(window, { exports: {} });
  return window.Loading;
}

describe('三态加载体系 · 态 0：词库就绪判定', () => {
  beforeEach(() => { delete window.WORD_LIBRARY; });
  afterEach(() => { delete window.WORD_LIBRARY; });

  it('word library 未定义时判定为未就绪', () => {
    const L = loadLoading();
    expect(L.libraryReady()).toBe(false);
  });

  it('categories 为空数组时判定为未就绪', () => {
    window.WORD_LIBRARY = { categories: [] };
    const L = loadLoading();
    expect(L.libraryReady()).toBe(false);
  });

  it('categories 有内容时判定为就绪', () => {
    window.WORD_LIBRARY = { categories: [{ name: 'x', words: [{ word: 'a' }] }] };
    const L = loadLoading();
    expect(L.libraryReady()).toBe(true);
  });

  it('WORD_LIBRARY 存在但结构异常时不抛错，判定为未就绪', () => {
    window.WORD_LIBRARY = { categories: null };
    const L = loadLoading();
    expect(() => L.libraryReady()).not.toThrow();
    expect(L.libraryReady()).toBe(false);
  });
});

describe('三态加载体系 · 态 1：内联按钮 loading', () => {
  let L;

  beforeEach(() => {
    document.body.innerHTML = '';
    delete window.WORD_LIBRARY;
    L = loadLoading();
  });

  it('button() 把按钮置为忙态：禁用 + is-loading + aria-busy + 可访问的转圈', () => {
    document.body.innerHTML = '<button id="b">开始测评</button>';
    const btn = document.getElementById('b');

    L.button(btn, { label: '词库加载中…' });

    expect(btn.disabled).toBe(true);
    expect(btn.classList.contains('is-loading')).toBe(true);
    expect(btn.getAttribute('aria-busy')).toBe('true');
    expect(btn.textContent).toContain('词库加载中…');
    const spinner = btn.querySelector('.btn-spinner');
    expect(spinner, '缺少转圈元素').toBeTruthy();
    expect(spinner.getAttribute('aria-hidden')).toBe('true');
  });

  it('end() 完整还原原始内容，包括图标与按钮可用性', () => {
    document.body.innerHTML = '<button id="b"><svg class="icon"></svg> 开始测评</button>';
    const btn = document.getElementById('b');

    const handle = L.button(btn, { label: '等待中…' });
    handle.end();

    expect(btn.disabled).toBe(false);
    expect(btn.classList.contains('is-loading')).toBe(false);
    expect(btn.hasAttribute('aria-busy')).toBe(false);
    expect(btn.querySelector('svg'), '图标没有被还原').toBeTruthy();
    expect(btn.textContent).toContain('开始测评');
  });

  it('重复置忙不会把等待文案当成原始内容存起来', () => {
    document.body.innerHTML = '<button id="b">原始文案</button>';
    const btn = document.getElementById('b');

    L.button(btn, { label: '第一次' });
    L.button(btn, { label: '第二次' });
    L.buttonEnd(btn);

    expect(btn.textContent).toBe('原始文案');
  });

  it('按钮不存在时静默返回，不抛错', () => {
    expect(() => L.button(null, { label: 'x' })).not.toThrow();
    expect(() => L.buttonEnd(null)).not.toThrow();
  });
});

describe('三态加载体系 · 态 2：区块骨架', () => {
  let L;

  beforeEach(() => {
    document.body.innerHTML = '';
    delete window.WORD_LIBRARY;
    L = loadLoading();
  });

  it('skeleton() 插入指定行数的骨架，并给宿主标注 aria-busy', () => {
    document.body.innerHTML = '<div id="h"><span class="real">真内容</span></div>';
    const host = document.getElementById('h');

    L.skeleton(host, { variant: 'card', rows: 3 });

    expect(host.getAttribute('aria-busy')).toBe('true');
    const wrap = host.querySelector('[data-skeleton]');
    expect(wrap, '没有插入骨架节点').toBeTruthy();
    expect(wrap.getAttribute('role')).toBe('status');
    expect(wrap.getAttribute('aria-label')).toBeTruthy();
    expect(wrap.querySelectorAll('.skeleton-line').length).toBe(3);
    expect(wrap.classList.contains('skeleton--card')).toBe(true);
  });

  it('骨架不搬走 DOM：宿主内部的 id 节点始终可被取到', () => {
    // 这条对应真实风险：#word-card 里挂着 #current-word / #word-front，
    // 等待窗口最长 15s。若骨架实现把这些节点移进 DocumentFragment，
    // 用户在等待期点「朗读」「下一张」就会因取到 null 而抛错。
    document.body.innerHTML =
      '<div id="word-card"><div class="word-front" id="word-front">' +
      '<div id="current-word">Abandon</div></div></div>';
    const host = document.getElementById('word-card');

    L.skeleton(host, { variant: 'card', rows: 3 });

    expect(document.getElementById('word-front'), '#word-front 被搬走了').toBeTruthy();
    expect(document.getElementById('current-word'), '#current-word 被搬走了').toBeTruthy();
    expect(document.getElementById('current-word').textContent).toBe('Abandon');
    expect(host.classList.contains('is-skeleton'), '缺少隐藏原内容用的标记类').toBe(true);
  });

  it('swap:true 把纯文本内容移出，避免「0」与骨架同时显示', () => {
    // #dash-total 是 <b>0</b>——内容就是一个文本节点。
    // 文本节点不受 CSS display:none 影响，不 swap 会"骨架 + 0"并排出现。
    document.body.innerHTML = '<span class="dash-val"><b id="dash-total">0</b> 词</span>';
    const el = document.getElementById('dash-total');

    L.skeleton(el, { variant: 'inline', rows: 1, swap: true });

    expect(el.textContent.trim(), '数字 0 仍然显示在骨架旁边').not.toContain('0');
    expect(el.querySelector('[data-skeleton]')).toBeTruthy();
    expect(document.getElementById('dash-total'), '宿主自身被替换掉了').toBe(el);
  });

  it('skeletonEnd() 收掉骨架并把 swap 出去的原文回填', () => {
    document.body.innerHTML = '<b id="t">0</b>';
    const el = document.getElementById('t');
    L.skeleton(el, { variant: 'inline', rows: 1, swap: true });

    L.skeletonEnd(el);

    expect(el.querySelector('[data-skeleton]')).toBeNull();
    expect(el.textContent).toBe('0');
    expect(el.hasAttribute('aria-busy')).toBe(false);
    expect(el.classList.contains('is-skeleton')).toBe(false);
  });

  it('skeletonEnd() 对非 swap 宿主同样清干净标记，且不动原有子节点', () => {
    document.body.innerHTML = '<div id="h"><span id="inner">真内容</span></div>';
    const host = document.getElementById('h');
    L.skeleton(host, { variant: 'card' });

    L.skeletonEnd(host);

    expect(host.querySelector('[data-skeleton]')).toBeNull();
    expect(host.classList.contains('is-skeleton')).toBe(false);
    expect(host.hasAttribute('aria-busy')).toBe(false);
    expect(document.getElementById('inner').textContent).toBe('真内容');
  });

  it('skeletonClear() 只清骨架不回填（供「马上要整体重渲染」的场景）', () => {
    document.body.innerHTML = '<b id="t">0</b>';
    const el = document.getElementById('t');
    L.skeleton(el, { variant: 'inline', rows: 1, swap: true });

    L.skeletonClear(el);

    expect(el.querySelector('[data-skeleton]')).toBeNull();
    expect(el.textContent, '旧值被回填，会与下一帧的真实渲染打架').toBe('');
    expect(el.hasAttribute('aria-busy')).toBe(false);
  });

  it('重复 skeleton() 不叠加，且收态后原文只回填一次', () => {
    // 真实场景：dashboard 的 render 会被事件驱动反复触发，每次都会重挂骨架
    document.body.innerHTML = '<div id="h"><span id="inner">唯一内容</span></div>';
    const host = document.getElementById('h');

    L.skeleton(host, { variant: 'card' });
    L.skeleton(host, { variant: 'card' });

    expect(host.querySelectorAll('[data-skeleton]').length).toBe(1);

    L.skeletonEnd(host);
    expect(host.querySelectorAll('#inner').length, '原文被回填了多次').toBe(1);
  });
});

describe('三态加载体系 · 态 3：等待词库', () => {
  let L;

  beforeEach(() => {
    document.body.innerHTML = '';
    delete window.WORD_LIBRARY;
    L = loadLoading();
  });

  afterEach(() => {
    delete window.WORD_LIBRARY;
    vi.useRealTimers();
  });

  it('词库已就绪时立即回调，不挂定时器', () => {
    window.WORD_LIBRARY = { categories: [{ words: [{}] }] };
    let called = 0;

    L.awaitLibrary({ ready: function () { called++; } });

    expect(called).toBe(1);
  });
});

describe('三态加载体系 · 态 3：延迟显形与轮询', () => {
  let L;

  beforeEach(() => {
    document.body.innerHTML = '';
    delete window.WORD_LIBRARY;
    L = loadLoading();
  });

  afterEach(() => {
    delete window.WORD_LIBRARY;
    vi.useRealTimers();
  });

  it('快过 appearMs 的等待始终不画骨架（几十毫秒的命中不该闪一下）', () => {
    vi.useFakeTimers();
    const host = document.createElement('div');
    document.body.appendChild(host);
    let ready = 0;

    L.awaitLibrary({ host: host, appearMs: 200, pollMs: 100, ready: function () { ready++; } });

    vi.advanceTimersByTime(150);
    expect(host.querySelector('[data-skeleton]')).toBeNull();

    window.WORD_LIBRARY = { categories: [{ words: [{}] }] };
    vi.advanceTimersByTime(100);

    expect(host.querySelector('[data-skeleton]'), '等待已结束却画了骨架').toBeNull();
    expect(ready).toBe(1);
  });
});

describe('三态加载体系 · 态 3：慢等待的完整生命周期', () => {
  let L;

  beforeEach(() => {
    document.body.innerHTML = '';
    delete window.WORD_LIBRARY;
    L = loadLoading();
  });

  afterEach(() => {
    delete window.WORD_LIBRARY;
    vi.useRealTimers();
  });

  it('等待超过 appearMs 才显形，就绪后自动收掉骨架并回调一次', () => {
    vi.useFakeTimers();
    const host = document.createElement('div');
    document.body.appendChild(host);
    let ready = 0;

    L.awaitLibrary({ host: host, appearMs: 200, pollMs: 100, ready: function () { ready++; } });

    vi.advanceTimersByTime(250);
    expect(host.querySelector('[data-skeleton]'), '慢等待没有显形，用户会一直看空白').toBeTruthy();
    expect(host.getAttribute('aria-busy')).toBe('true');

    window.WORD_LIBRARY = { categories: [{ words: [{}] }] };
    vi.advanceTimersByTime(150);

    expect(host.querySelector('[data-skeleton]'), '就绪后骨架没收掉').toBeNull();
    expect(host.hasAttribute('aria-busy')).toBe(false);
    expect(ready, 'ready 回调次数不对').toBe(1);
  });
});

describe('三态加载体系 · 态 3：超时', () => {
  let L;

  beforeEach(() => {
    document.body.innerHTML = '';
    delete window.WORD_LIBRARY;
    L = loadLoading();
  });

  afterEach(() => {
    delete window.WORD_LIBRARY;
    vi.useRealTimers();
  });

  it('超时走 onTimeout，不再回调 ready，并收掉骨架', () => {
    vi.useFakeTimers();
    const host = document.createElement('div');
    document.body.appendChild(host);
    let timeout = 0, ready = 0;

    L.awaitLibrary({
      host: host, appearMs: 0, pollMs: 100, timeoutMs: 300,
      ready: function () { ready++; },
      onTimeout: function () { timeout++; },
    });
    vi.advanceTimersByTime(1000);

    expect(timeout).toBe(1);
    expect(ready, '超时后仍然回调了 ready').toBe(0);
    expect(host.querySelector('[data-skeleton]'), '超时后骨架没收掉').toBeNull();
    expect(host.hasAttribute('aria-busy')).toBe(false);
  });

  it('默认超时上限为 15s，与改造前的 30×500ms 重试预算一致', () => {
    vi.useFakeTimers();
    let timeout = 0;

    L.awaitLibrary({ appearMs: 0, pollMs: 500, onTimeout: function () { timeout++; } });

    vi.advanceTimersByTime(14000);
    expect(timeout, '不到 15s 就放弃了').toBe(0);

    vi.advanceTimersByTime(1500);
    expect(timeout).toBe(1);
  });
});

describe('三态加载体系 · 态 3：取消等待', () => {
  let L;

  beforeEach(() => {
    document.body.innerHTML = '';
    delete window.WORD_LIBRARY;
    L = loadLoading();
  });

  afterEach(() => {
    delete window.WORD_LIBRARY;
    vi.useRealTimers();
  });

  it('cancel() 之后不再回调 ready（用户提前离开当前页）', () => {
    vi.useFakeTimers();
    let ready = 0;

    const cancel = L.awaitLibrary({ appearMs: 0, pollMs: 100, ready: function () { ready++; } });
    cancel();

    window.WORD_LIBRARY = { categories: [{ words: [{}] }] };
    vi.advanceTimersByTime(1000);

    expect(ready, '已取消的等待仍然回调了 ready').toBe(0);
  });

  it('cancel() 会收掉已经显形的骨架', () => {
    vi.useFakeTimers();
    const host = document.createElement('div');
    document.body.appendChild(host);

    const cancel = L.awaitLibrary({ host: host, appearMs: 0, pollMs: 100 });
    vi.advanceTimersByTime(50);
    expect(host.querySelector('[data-skeleton]')).toBeTruthy();

    cancel();
    expect(host.querySelector('[data-skeleton]'), '取消后骨架留在页面上').toBeNull();
  });
});

describe('加载体系源码级守卫（P1-1 回归防线）', () => {
  const html = read('index.html');
  const buildJs = read('build.js');
  const bootstrap = read('tests/helpers/app-bootstrap.js');
  const designCss = read('css/design-system.css');
  const loadingJs = read('js/core/loading.js');
  const appJs = read('js/app.js');
  const dashJs = read('js/dashboard.js');
  const assessJs = read('js/assessment.js');

  it('骨架令牌在浅色与深色主题各有一份', () => {
    expect((designCss.match(/--skeleton-base:/g) || []).length).toBeGreaterThanOrEqual(2);
    expect((designCss.match(/--skeleton-highlight:/g) || []).length).toBeGreaterThanOrEqual(2);
  });

  it('默认藏法用 CSS 隐藏元素子节点，而不是搬动 DOM', () => {
    expect(designCss).toMatch(/\.is-skeleton\s*>\s*\*:not\(\[data-skeleton\]\)\s*\{\s*display:\s*none/);
  });

  it('卡片变体占同一网格格，避免被 align-content:center 推到卡底', () => {
    const rule = (designCss.match(/\.skeleton--card\s*\{[\s\S]*?\}/) || [''])[0];
    expect(rule, '缺少 .skeleton--card').toContain('grid-area: 1 / 1');
  });

  it('行内变体是 inline，不会把统计行撑成两行', () => {
    const rule = (designCss.match(/\.skeleton--inline\s*\{[\s\S]*?\}/) || [''])[0];
    expect(rule, '缺少 .skeleton--inline').toContain('inline-flex');
  });

  it('骨架动效尊重 prefers-reduced-motion', () => {
    expect(designCss).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*\.skeleton-line[^}]*animation:\s*none/);
  });

  it('js/core/loading.js 在三张加载表里都已注册，且排在所有业务模块之前', () => {
    const later = ['js/tts-manager.js', 'js/dashboard.js', 'js/assessment.js', 'js/app.js'];
    const posHtml = p => html.indexOf('<script src="' + p);
    const posOther = (src, p) => src.indexOf("'" + p + "'");

    expect(posHtml('js/core/loading.js'), 'index.html 未注册').toBeGreaterThan(-1);
    expect(posOther(buildJs, 'js/core/loading.js'), 'build.js 未注册').toBeGreaterThan(-1);
    expect(posOther(bootstrap, 'js/core/loading.js'), 'app-bootstrap 未注册').toBeGreaterThan(-1);

    for (const l of later) {
      expect(posHtml('js/core/loading.js'), 'index.html 顺序不对').toBeLessThan(posHtml(l));
      expect(posOther(buildJs, 'js/core/loading.js'), 'build.js 顺序不对').toBeLessThan(posOther(buildJs, l));
      expect(posOther(bootstrap, 'js/core/loading.js'), 'app-bootstrap 顺序不对').toBeLessThan(posOther(bootstrap, l));
    }
  });

  it('业务代码不得再自造词库重试轮询（必须走统一入口）', () => {
    expect(appJs, 'app.js 仍有 _wordTries 自造重试').not.toContain('_wordTries');
    // 不写死是 window.Loading 还是局部别名 L，断言的是"走了统一入口"这件事
    expect(appJs, 'app.js 未走 Loading.awaitLibrary').toMatch(/(?:Loading|L)\.awaitLibrary/);
    expect(dashJs, 'dashboard.js 未走 Loading.awaitLibrary').toMatch(/(?:Loading|L)\.awaitLibrary/);
  });

  it('「词库总量」不再直接 _setText 写入未就绪时的 0', () => {
    expect(dashJs).toContain('_setLibraryTotal');
    expect(dashJs).not.toMatch(/this\._setText\(this\.dom\.total,/);
  });

  it('测评等待按钮走统一入口', () => {
    expect(assessJs).toMatch(/L\.button\(btn/);
    expect(assessJs).toMatch(/L\.buttonEnd\(btn/);
  });

  it('不提供整页过场：实测 createPaper 仅 17.4ms，加遮罩只会闪烁', () => {
    // 这条守卫防止以后凭直觉给短任务盖全屏过场。
    // 需要过场时必须先用 scripts/probe-loading-costs.mjs 拿出实测数据。
    expect(loadingJs).not.toContain('pageVeil');
    expect(loadingJs).toMatch(/createPaper/);   // 结论要留在源码注释里
  });
});

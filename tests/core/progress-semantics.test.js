import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '../..');
const read = p => readFileSync(resolve(root, p), 'utf8');

const html = read('index.html');
const appJs = read('js/app.js');
const assessJs = read('js/assessment.js');
const styleCss = read('css/style.css');
const designCss = read('css/design-system.css');

// 把 js/core/progress.js 装进当前 jsdom
function loadProgressBar() {
  const src = read('js/core/progress.js');
  // eslint-disable-next-line no-new-func
  new Function('window', 'document', src)(window, document);
  return window.ProgressBar;
}

describe('进度条语义与配色（UI 审查 P1-6）', () => {
  let ProgressBar;

  beforeEach(() => {
    document.body.innerHTML = '';
    ProgressBar = loadProgressBar();
  });

  it('写入宽度，并同步 role=progressbar 轨道的 aria-valuenow / aria-valuetext', () => {
    document.body.innerHTML =
      '<div class="progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">' +
      '<div class="progress-fill" id="f"></div></div>';
    ProgressBar.set('f', 40);
    const fill = document.getElementById('f');
    const track = fill.parentNode;
    expect(fill.style.width).toBe('40%');
    expect(track.getAttribute('aria-valuenow')).toBe('40');
    expect(track.getAttribute('aria-valuetext')).toBe('40%');
  });

  it('支持直接传元素', () => {
    document.body.innerHTML =
      '<div role="progressbar"><div id="f"></div></div>';
    ProgressBar.set(document.getElementById('f'), 75);
    expect(document.getElementById('f').style.width).toBe('75%');
    expect(document.querySelector('[role="progressbar"]').getAttribute('aria-valuenow')).toBe('75');
  });

  it('越界值被夹回 0–100，非数字按 0 处理', () => {
    document.body.innerHTML = '<div role="progressbar"><div id="f"></div></div>';
    const fill = document.getElementById('f');
    ProgressBar.set(fill, -20);
    expect(fill.style.width).toBe('0%');
    ProgressBar.set(fill, 300);
    expect(fill.style.width).toBe('100%');
    ProgressBar.set(fill, NaN);
    expect(fill.style.width).toBe('0%');
    ProgressBar.set(fill, 'abc');
    expect(fill.style.width).toBe('0%');
  });

  it('aria-valuenow 只保留一位小数，避免脏值', () => {
    document.body.innerHTML = '<div role="progressbar"><div id="f"></div></div>';
    ProgressBar.set('f', 1 / 3 * 100);
    const now = document.querySelector('[role="progressbar"]').getAttribute('aria-valuenow');
    expect(now).toBe('33.3');
  });

  it('轨道没有 role=progressbar 时不报错，仍写宽度（兼容旧结构）', () => {
    document.body.innerHTML = '<div class="bar"><div id="f"></div></div>';
    expect(() => ProgressBar.set('f', 50)).not.toThrow();
    expect(document.getElementById('f').style.width).toBe('50%');
  });

  it('元素不存在时静默返回', () => {
    expect(() => ProgressBar.set('not-exist', 50)).not.toThrow();
    expect(() => ProgressBar.set(null, 50)).not.toThrow();
  });

  it('clear() 清零并把 valuetext 标为暂无数据', () => {
    document.body.innerHTML = '<div role="progressbar"><div id="f"></div></div>';
    ProgressBar.clear('f');
    const track = document.querySelector('[role="progressbar"]');
    expect(document.getElementById('f').style.width).toBe('0%');
    expect(track.getAttribute('aria-valuenow')).toBe('0');
    expect(track.getAttribute('aria-valuetext')).toBe('暂无数据');
  });
});

describe('进度条源码级守卫（P1-6 回归防线）', () => {
  it('index.html 里每个 .progress-bar 都必须带 role=progressbar 与 aria-valuenow', () => {
    // 允许跨行；逐个取出 <div class="progress-bar" ...> 开标签检查
    const tags = html.match(/<div class="progress-bar"[\s\S]*?>/g) || [];
    expect(tags.length).toBeGreaterThanOrEqual(7);
    for (const tag of tags) {
      expect(tag, '缺 role=progressbar：' + tag).toContain('role="progressbar"');
      expect(tag, '缺 aria-valuenow：' + tag).toContain('aria-valuenow');
      expect(tag, '缺 aria-label：' + tag).toContain('aria-label');
    }
  });

  it('.assess-progress-bar 与 .dc-progress-bar 同样带语义', () => {
    expect(html).toMatch(/class="assess-progress-bar"[^>]*role="progressbar"/);
    expect(html).toMatch(/class="dc-progress-bar"[^>]*role="progressbar"/);
  });

  it('业务代码不得再直接写 progress-fill 的 style.width（必须走 ProgressBar）', () => {
    expect(appJs).not.toMatch(/progress-fill'\)\.style\.width/);
    expect(assessJs).not.toMatch(/progress-fill'\)\.style\.width/);
    expect(appJs).toContain("ProgressBar.set('grammar-progress-fill'");
    expect(assessJs).toContain('ProgressBar.set(');
  });

  it('js/core/progress.js 必须在 app.js 之前加载（index.html 与 build.js 双侧对齐）', () => {
    const buildJs = read('build.js');
    expect(buildJs).toContain('js/core/progress.js');
    // 必须定位到真实的 <script src=...>，不能直接 indexOf('js/app.js')——
    // 正文注释里也会出现这个字符串，那样会定位到注释而不是标签（本测试初版就栽在这）。
    const scriptPos = p => html.indexOf('<script src="' + p);
    const progressPos = scriptPos('js/core/progress.js');
    const appPos = scriptPos('js/app.js');
    expect(progressPos, 'index.html 未引用 js/core/progress.js').toBeGreaterThan(-1);
    expect(appPos).toBeGreaterThan(-1);
    expect(progressPos).toBeLessThan(appPos);
  });

  it('所有进度填充都不得出现 --sage,var(--coral) 的"蓝→红"走向', () => {
    // coral 代表警告 / 到期 / 超时；用在进度填充上会被读成「越接近完成越糟糕」
    for (const [name, css] of [['style.css', styleCss], ['dashboard.css', read('css/dashboard.css')]]) {
      expect(css, name + ' 仍有 sage→coral 进度渐变').not.toContain('--sage),var(--coral)');
    }
    expect(html, 'index.html 内联进度条仍是 sage→coral').not.toContain('--sage),var(--coral)');
  });

  it('.progress-fill 必须是品牌色族内的单调走向', () => {
    const rule = (styleCss.match(/\.progress-fill\{[\s\S]*?\}/) || [''])[0];
    expect(rule).toContain('var(--sage)');
    expect(rule).toContain('var(--sage-deep)');
  });

  it('进度条轨道使用 --track 令牌，而不是暖色 border / 背景色', () => {
    expect(styleCss).toMatch(/\.progress-bar\{[^}]*background:var\(--track\)/);
    expect(styleCss).toMatch(/\.week-row-bar\{[^}]*background:var\(--track\)/);
    expect(designCss).toMatch(/--track:\s*#[0-9A-Fa-f]{6}/);   // 浅色主题
    // 深色主题里也要有一份
    expect((designCss.match(/--track:/g) || []).length).toBeGreaterThanOrEqual(2);
  });

  it('core 脚本在 index.html / build.js / app-bootstrap.js 三处都已注册且排在最前', () => {
    // 三张加载表（浏览器、打包、行为测试桩）必须同步。曾经新增 js/core/progress.js 时
    // 只改了前两处，结果 15 个练习类用例集体报 "ProgressBar is not defined"。
    // 只断言「core 必须早于所有模块」这一条真正有约束力的不变量——
    // 不去断言模块之间的相对顺序，因为 build.js 的 jsOrder 与 index.html 本来就不完全一致
    // （app.js 在 build.js 里排在 assessment.js 之前，在 index.html 里相反；实测无影响，
    //  因为两者都只在运行时互相引用，但这属于已知的存量差异，不在本测试的管辖范围）。
    const buildSrc = read('build.js');
    const bootstrap = read('tests/helpers/app-bootstrap.js');
    const coreFiles = ['js/core/store.js', 'js/core/progress.js'];
    const laterFiles = ['js/tts-manager.js', 'js/dashboard.js', 'js/assessment.js', 'js/app.js'];
    const posIn = (src, f, kind) => (kind === 'html'
      ? src.indexOf('<script src="' + f)
      : src.indexOf("'" + f + "'"));

    for (const f of [...coreFiles, ...laterFiles]) {
      expect(posIn(html, f, 'html'), f + ' 未在 index.html 注册').toBeGreaterThan(-1);
      expect(posIn(buildSrc, f, 'js'), f + ' 未在 build.js jsOrder 注册').toBeGreaterThan(-1);
      expect(posIn(bootstrap, f, 'js'), f + ' 未在 app-bootstrap MODULES 注册').toBeGreaterThan(-1);
    }
    for (const c of coreFiles) {
      for (const l of laterFiles) {
        expect(posIn(html, c, 'html'), `index.html 里 ${c} 必须早于 ${l}`)
          .toBeLessThan(posIn(html, l, 'html'));
        expect(posIn(buildSrc, c, 'js'), `build.js 里 ${c} 必须早于 ${l}`)
          .toBeLessThan(posIn(buildSrc, l, 'js'));
        expect(posIn(bootstrap, c, 'js'), `app-bootstrap.js 里 ${c} 必须早于 ${l}`)
          .toBeLessThan(posIn(bootstrap, l, 'js'));
      }
    }
  });

  it('设置页 7 天图表在零数据时走空状态，不画空胶囊', () => {
    expect(appJs).toContain('week-empty');
    expect(appJs).toMatch(/total\s*<=\s*0/);
  });
});

// 行为级测试：三态加载体系在业务模块上的接入（UI 审查 P1-1）
// 真实加载生产代码 + 真实 index.html DOM，用 bootstrapApp 驱动。
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { bootstrapApp } from '../helpers/app-bootstrap.js';

const sleep = ms => new Promise(r => setTimeout(r, ms));

describe('首页「词库总量」的加载态（P1-1）', () => {
  let savedCategories;

  beforeEach(async () => {
    vi.resetModules();
    await bootstrapApp();
    savedCategories = globalThis.WORD_LIBRARY.categories;
  });

  afterEach(() => {
    if (savedCategories) globalThis.WORD_LIBRARY.categories = savedCategories;
  });

  it('词库未就绪时不显示 0，而是显示骨架', () => {
    // 模拟 data/all-data.js（约 9.9MB）还没落地：此时 getLibraryTotal() 只能
    // 读到内置小词库，"词库总量 0 词"会把"加载中"误读成"这个 App 没词"。
    globalThis.WORD_LIBRARY.categories = [];
    window.app.dashboardModule.render();

    const el = document.getElementById('dash-total');
    expect(el.querySelector('[data-skeleton]'), '未就绪时没有骨架').toBeTruthy();
    expect(el.getAttribute('aria-busy')).toBe('true');
    expect(el.textContent.trim(), '未就绪时仍然写入了 0').not.toMatch(/^\d+$/);
  });

  it('词库就绪后自动收掉骨架并补上真实总量', async () => {
    globalThis.WORD_LIBRARY.categories = [];
    window.app.dashboardModule.render();
    const el = document.getElementById('dash-total');
    expect(el.querySelector('[data-skeleton]')).toBeTruthy();

    globalThis.WORD_LIBRARY.categories = savedCategories;   // 词库落地
    await sleep(800);                                       // 等一轮轮询（500ms）

    expect(el.querySelector('[data-skeleton]'), '就绪后骨架没收掉').toBeNull();
    expect(el.hasAttribute('aria-busy')).toBe(false);
    expect(el.textContent.trim(), '没有补上真实词库总量').toBe(String(savedCategories.reduce((n, c) => n + c.words.length, 0)));
  });
});

describe('背单词页等待词库时的加载态（P1-1）', () => {
  let savedCategories;

  beforeEach(async () => {
    vi.resetModules();
    await bootstrapApp();
    savedCategories = globalThis.WORD_LIBRARY.categories;
  });

  afterEach(() => {
    const wm = window.app && window.app.wordModule;
    if (wm && wm._libWaitHandle) { wm._libWaitHandle(); wm._libWaitHandle = null; }
    if (savedCategories) globalThis.WORD_LIBRARY.categories = savedCategories;
  });

  it('词库未就绪时卡区显示骨架，而不是静态占位词', async () => {
    // index.html 里 #current-word 的初始文案是硬编码的 "Abandon"。
    // 词库没到就把它当内容展示，用户会以为这就是今天要背的词。
    globalThis.WORD_LIBRARY.categories = [];
    window.app.wordModule.initUI();

    await sleep(300);   // 骨架延迟 200ms 显形（防闪烁），必须先等过这个窗口

    const card = document.getElementById('word-card');
    expect(card.querySelector('[data-skeleton]'), '卡区没有骨架').toBeTruthy();
    expect(card.getAttribute('aria-busy')).toBe('true');
    expect(document.getElementById('current-word'), '骨架把 #current-word 搬走了').toBeTruthy();
  });

  it('词库就绪后骨架收掉，卡片渲染出真实单词', async () => {
    globalThis.WORD_LIBRARY.categories = [];
    window.app.wordModule.initUI();
    await sleep(300);
    const card = document.getElementById('word-card');
    expect(card.querySelector('[data-skeleton]')).toBeTruthy();

    globalThis.WORD_LIBRARY.categories = savedCategories;
    await sleep(800);

    expect(card.querySelector('[data-skeleton]'), '就绪后骨架没收掉').toBeNull();
    expect(card.hasAttribute('aria-busy')).toBe(false);
    expect(document.getElementById('word-front').textContent.length, '卡片没有渲染内容').toBeGreaterThan(0);
  });
});

describe('测评等待词库时的按钮态（P1-1）', () => {
  beforeEach(async () => {
    vi.resetModules();
    await bootstrapApp();
  });

  it('置忙时按钮带 aria-busy，收态后清除', () => {
    const btn = document.getElementById('btn-assessment-start');
    expect(btn, 'index.html 里没有 #btn-assessment-start').toBeTruthy();

    window.app.assessmentModule._libraryBusy(true);
    expect(btn.getAttribute('aria-busy'), '只禁用不标注，读屏会读成"按钮坏了"').toBe('true');
    expect(btn.disabled).toBe(true);
    expect(btn.querySelector('.btn-spinner')).toBeTruthy();

    window.app.assessmentModule._libraryBusy(false);
    expect(btn.hasAttribute('aria-busy'), '收态后 aria-busy 没清').toBe(false);
    expect(btn.disabled).toBe(false);
  });

  it('收态后按钮文案恢复为原始内容', () => {
    const btn = document.getElementById('btn-assessment-start');
    const original = btn.innerHTML;

    window.app.assessmentModule._libraryBusy(true);
    window.app.assessmentModule._libraryBusy(false);

    expect(btn.textContent).not.toContain('词库加载中');
    expect(btn.innerHTML).toBe(original);
  });
});

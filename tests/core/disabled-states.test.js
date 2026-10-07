// 行为级测试：禁用态补全（UI 审查 P3-9 / P3-10）
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { bootstrapApp } from '../helpers/app-bootstrap.js';

describe('阅读页空状态的复选框（P3-9）', () => {
  let rm;

  beforeEach(async () => {
    vi.resetModules();
    await bootstrapApp();
    window.app.showTab('reading');
    rm = window.app.readingModule;
  });

  it('未选文章时三个复选框置为 disabled，不再渲染成可用态', () => {
    // 原来未选文章时这三个框是可点的，但点了没有任何效果（没有文章可作用）——
    // 这是"看起来能用、实际无效"的典型。
    for (const id of ['show-cn', 'show-vocab', 'show-answer']) {
      const el = document.getElementById(id);
      expect(el, '未找到 #' + id).toBeTruthy();
      expect(el.disabled, '#' + id + ' 未禁用').toBe(true);
    }
    const toggle = document.getElementById('r-toggle');
    expect(toggle, '未找到 #r-toggle').toBeTruthy();
    expect(toggle.classList.contains('is-disabled'), '容器没有降透明度的标记类').toBe(true);
  });

  it('选中文章后复选框恢复可用', () => {
    rm.filtered = [{ title: '测试文章', paragraphs: [{ en: 'Hello', cn: '你好' }] }];
    rm.loadArticle(0);

    for (const id of ['show-cn', 'show-vocab', 'show-answer']) {
      expect(document.getElementById(id).disabled, '#' + id + ' 仍是禁用态').toBe(false);
    }
    expect(document.getElementById('r-toggle').classList.contains('is-disabled')).toBe(false);
  });
});

describe('单词卡首末位的翻页按钮（P3-10）', () => {
  let wm;

  beforeEach(async () => {
    vi.resetModules();
    await bootstrapApp();
    window.app.showTab('word');
    wm = window.app.wordModule;
  });

  it('第一张时「上一个」禁用，最后一张时「下一个」禁用', () => {
    const prev = document.getElementById('prev-word');
    const next = document.getElementById('next-word');

    wm.currentIndex = 0;
    wm.showCurrentWord();
    expect(prev.disabled, '第一张时「上一个」未禁用').toBe(true);
    expect(prev.getAttribute('aria-disabled'), '缺 aria-disabled').toBe('true');
    expect(next.disabled, '第一张时「下一个」不该禁用').toBe(false);

    const last = wm.getCardWords().length - 1;
    wm.currentIndex = last;
    wm.showCurrentWord();
    expect(next.disabled, '最后一张时「下一个」未禁用').toBe(true);
    expect(next.getAttribute('aria-disabled'), '缺 aria-disabled').toBe('true');
    expect(prev.disabled, '最后一张时「上一个」不该禁用').toBe(false);
  });

  it('只有一张卡时两个按钮都禁用', () => {
    const prev = document.getElementById('prev-word');
    const next = document.getElementById('next-word');
    const realWords = wm.getCardWords.bind(wm);
    wm.getCardWords = function() { return [realWords()[0]]; };

    wm.currentIndex = 0;
    wm.showCurrentWord();

    expect(prev.disabled, '「上一个」未禁用').toBe(true);
    expect(next.disabled, '「下一个」未禁用').toBe(true);
  });
});

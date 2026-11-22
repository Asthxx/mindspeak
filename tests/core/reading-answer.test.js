// 行为级测试：阅读题作答（P0-1 回归网）
//
// 为什么要有这条：阅读选项按钮是 innerHTML 拼出来的，曾经带内联 onclick，
// 被 CSP（script-src 'self'）整条拦掉 —— 点击没有任何反应，而所有测试仍然全绿
// （jsdom 不执行 CSP，静态守卫又只扫 index.html）。这里直接点真实 DOM 按钮，
// 断言"整题被锁定 + 正确答案高亮 + 答错进错题本"，把这条链路钉住。
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { bootstrapApp } from '../helpers/app-bootstrap.js';

const ARTICLE = {
  title: '测试文章',
  difficulty: 'easy',
  paragraphs: [{ en: 'The cat sat on the mat.', cn: '猫坐在垫子上。' }],
  questions: [
    { question: '猫坐在哪里？', options: ['垫子上', '树上', '车里', '屋顶'], answer: 0, explanation: 'sat on the mat' },
    { question: '谁坐在垫子上？', options: ['狗', '猫', '鸟', '鱼'], answer: 1, explanation: 'The cat' }
  ]
};

describe('阅读题作答（CSP 下必须可用）', () => {
  let rm;

  beforeEach(async () => {
    vi.resetModules();
    await bootstrapApp();
    window.app.showTab('reading');
    rm = window.app.readingModule;
  });

  function loadArticle() {
    rm.filtered = [ARTICLE];
    rm.loadArticle(0);
  }

  it('选项按钮不再带内联 onclick（改由委托驱动）', () => {
    loadArticle();
    const btn = document.querySelector('#r-questions .reading-q .btn');
    expect(btn).toBeTruthy();
    expect(btn.getAttribute('onclick')).toBe(null);
    expect(btn.getAttribute('data-opt')).not.toBe(null);
  });

  it('点对：整题 4 个选项全部锁定，所选项高亮为 btn-correct', () => {
    loadArticle();
    const q1 = document.querySelectorAll('#r-questions .reading-q')[0];
    const btns = q1.querySelectorAll('.btn');
    expect(btns.length).toBe(4);

    btns[0].click();   // 正确答案

    for (const b of btns) {
      expect(b.disabled, '点完后该题仍有选项可点').toBe(true);
      expect(b.dataset.userAnswered).toBe('1');
    }
    expect(btns[0].classList.contains('btn-correct')).toBe(true);
    expect(btns[0].classList.contains('btn-wrong')).toBe(false);
  });

  it('点错：所选项标记 btn-wrong，正确项同时被点亮，并写入错题本', () => {
    loadArticle();
    const q1 = document.querySelectorAll('#r-questions .reading-q')[0];
    const btns = q1.querySelectorAll('.btn');

    btns[2].click();   // 错误选项

    expect(btns[2].classList.contains('btn-wrong')).toBe(true);
    expect(btns[0].classList.contains('btn-correct')).toBe(true);
    expect(btns[0].disabled).toBe(true);

    const mistakes = window.DataStore.getProgress('mistakes', []);
    expect(mistakes.length).toBe(1);
    expect(mistakes[0].source).toBe('reading');
    expect(mistakes[0].word).toBe('垫子上');   // 记的是正确选项文本
  });

  it('已锁定的题再点不会二次判分（错题本不会重复入账）', () => {
    loadArticle();
    const q1 = document.querySelectorAll('#r-questions .reading-q')[0];
    const btns = q1.querySelectorAll('.btn');

    btns[2].click();  // 先答错
    btns[1].click();  // 再点另一个（应被 disabled 拦掉）
    btns[2].click();  // 再点同一个

    const mistakes = window.DataStore.getProgress('mistakes', []);
    expect(mistakes.length).toBe(1);
    expect(btns[1].classList.contains('btn-wrong')).toBe(false);
  });

  it('两道题互不干扰：第二题仍可独立作答', () => {
    loadArticle();
    const qs = document.querySelectorAll('#r-questions .reading-q');
    qs[0].querySelectorAll('.btn')[0].click();
    const q2btns = qs[1].querySelectorAll('.btn');
    expect(q2btns[0].disabled, '答第一题把第二题也锁了').toBe(false);
    q2btns[1].click();  // 第二题正确答案
    expect(q2btns[1].classList.contains('btn-correct')).toBe(true);
  });
});

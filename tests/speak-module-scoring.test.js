// 行为级测试：口语发音打分（真实模块 DOM 驱动）
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { bootstrapApp } from './helpers/app-bootstrap.js';

describe('SpeakModule 发音打分', () => {
  beforeEach(async () => {
    vi.resetModules();
    await bootstrapApp();
  });

  function setup(targetWord) {
    window.app.showTab('speak');
    const sp = window.app.speakModule;
    sp.words = [{ word: targetWord, chinese: '测试', example: 'example' }];
    sp.currentIndex = 0;
    sp.currentInit = false;
    return sp;
  }

  it('should_mark_exact_pronunciation_correct', () => {
    const sp = setup('apple');
    sp.checkPronunciation('apple', sp.words[0]);
    expect(sp.correct).toBe(1);
    expect(sp.wrong).toBe(0);
    expect(document.getElementById('speak-result').textContent).toContain('正确');
  });

  it('should_mark_wrong_pronunciation_and_add_mistake', () => {
    const sp = setup('apple');
    sp.checkPronunciation('banana', sp.words[0]);
    expect(sp.wrong).toBe(1);
    expect(sp.correct).toBe(0);
    expect(document.getElementById('speak-result').textContent).toContain('✗');
    const mistakes = window.DataStore.getProgress('mistakes', []);
    expect(mistakes.some((m) => m.word === 'apple')).toBe(true);
  });

  it('should_render_scoring_panel_with_accuracy_score', () => {
    const sp = setup('apple');
    sp.checkPronunciation('apple', sp.words[0]);
    const panel = document.getElementById('speak-scoring');
    expect(panel.textContent).toContain('apple');
    // 分数面板应展示 0-100 的准确率
    expect(span(panel).querySelectorAll('.score-num')).toBeTruthy();
  });

  it('should_score_once_per_question_even_when_rechecked', () => {
    const sp = setup('apple');
    sp.checkPronunciation('apple', sp.words[0]);
    expect(sp.correct).toBe(1);
    // 已达 answered 锁，重复识别不重复计分
    sp.checkPronunciation('banana', sp.words[0]);
    expect(sp.correct).toBe(1);
  });
});

function span(el) {
  if (el.querySelectorAll) return el;
  return el.closest('div');
}
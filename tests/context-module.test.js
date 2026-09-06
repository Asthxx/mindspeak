// 行为级测试：语境填空（真实模块 DOM 驱动）
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { bootstrapApp } from './helpers/app-bootstrap.js';

describe('ContextModule 行为', () => {
  beforeEach(async () => {
    vi.resetModules();
    await bootstrapApp();
  });

  it('should_generate_blank_sentence_from_example', () => {
    window.app.showTab('context');
    const cm = window.app.contextModule;
    cm.start();
    expect(cm.exercises.length).toBeGreaterThan(0);
    const ex = cm.exercises[0];
    expect(ex.sentence).toContain('______');
    expect(ex.sentence).not.toContain(ex.answer); // 原文单词已被挖空
    expect(document.getElementById('context-sentence').textContent).toContain('______');
    expect(document.getElementById('context-hint').textContent).toContain('中文提示');
  });

  it('should_accept_correct_answer_and_report_success', () => {
    window.app.showTab('context');
    const cm = window.app.contextModule;
    cm.start();
    const answer = cm.exercises[0].answer;
    document.getElementById('context-answer').value = answer.toUpperCase();
    cm.submit();
    expect(cm.correct).toBe(1);
    expect(cm.wrong).toBe(0);
    expect(document.getElementById('context-result').textContent).toContain('正确');
  });

  it('should_mark_wrong_answer_and_reveal_translation', () => {
    window.app.showTab('context');
    const cm = window.app.contextModule;
    cm.start();
    const answer = cm.exercises[0].answer;
    document.getElementById('context-answer').value = 'totally-wrong';
    cm.submit();
    expect(cm.wrong).toBe(1);
    expect(cm.correct).toBe(0);
    expect(document.getElementById('context-result').textContent).toContain('正确答案');
    expect(document.getElementById('context-translation').classList.contains('hidden')).toBe(false);
    if (cm.exercises[0].wordObj) {
      const mistakes = window.DataStore.getProgress('mistakes', []);
      expect(mistakes.some((m) => m.word === answer)).toBe(true);
    }
  });

  it('should_advance_to_next_question_via_button', () => {
    window.app.showTab('context');
    const cm = window.app.contextModule;
    cm.start();
    const idx = cm.currentIndex;
    document.getElementById('btn-context-next').click();
    expect(cm.currentIndex).toBe(idx + 1);
  });

  it('should_show_score_percentage_after_finishing', () => {
    window.app.showTab('context');
    const cm = window.app.contextModule;
    cm.start();
    const total = cm.exercises.length;
    cm.correct = 0;
    cm.wrong = 0;
    // 直接推进到最后一题后触发 showScore
    for (let i = 0; i < total; i += 1) {
      cm.currentIndex = i;
      if (i < total - 1) cm.showQuestion();
    }
    cm.currentIndex = total;
    cm.showQuestion(); // 超出范围触发 showScore
    expect(document.getElementById('context-score-num').textContent).toMatch(/\d+%/);
  });
});
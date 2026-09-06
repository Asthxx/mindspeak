// 行为级测试：错题本 + 错词强化训练（真实模块 DOM 驱动）
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { bootstrapApp } from './helpers/app-bootstrap.js';

describe('Mistake 错题闭环', () => {
  beforeEach(async () => {
    vi.resetModules();
    await bootstrapApp();
  });

  function seedMistake() {
    const today = window.getLocalDateStr ? window.getLocalDateStr() : new Date().toISOString().slice(0, 10);
    window.DataStore.setProgress('mistakes', [{
      word: 'apple',
      chinese: '苹果',
      date: today,
      source: 'word',
      reviewed: false,
    }]);
    return today;
  }

  it('should_render_seeded_mistake_in_list', () => {
    seedMistake();
    window.app.showTab('mistake');
    const mm = window.app.mistakesModule;
    mm.renderList();
    expect(document.getElementById('mistake-list').textContent).toContain('apple');
  });

  it('should_mark_known_in_review_and_undo', () => {
    const today = seedMistake();
    window.app.showTab('mistake');
    const mm = window.app.mistakesModule;
    mm.startReview(); // 开启复习会话，_reviewMistakes 取未复习条目
    const unreviewedBefore = window.DataStore.getProgress('mistakes', []).filter((m) => !m.reviewed).length;
    expect(unreviewedBefore).toBe(1);
    mm.markKnown();
    let mistakes = window.DataStore.getProgress('mistakes', []);
    expect(mistakes.some((m) => m.word === 'apple' && m.reviewed && m.date === today)).toBe(true);
    // 未复习计数清零；列表渲染仍保留该词（掌握词展示）
    mm.renderList();
    expect(document.getElementById('ms-unreviewed').textContent).toBe('0');
    // undo 还原 reviewed 状态
    mm.undoLastKnown();
    mistakes = window.DataStore.getProgress('mistakes', []);
    expect(mistakes.find((m) => m.word === 'apple').reviewed).toBe(false);
    mm.renderList();
    expect(document.getElementById('ms-unreviewed').textContent).toBe('1');
  });

  it('should_train_mistake_word_and_mark_reviewed_on_correct', () => {
    seedMistake();
    window.app.showTab('mistakeTrain');
    const mt = window.app.mistakeTrainModule;
    mt.start();
    expect(mt.words.length).toBe(1);
    expect(mt.words[0].word).toBe('apple');
    document.getElementById('mt-answer').value = 'APPLE'; // 大小写容错
    mt.submit();
    expect(mt.correct).toBe(1);
    const mistakes = window.DataStore.getProgress('mistakes', []);
    expect(mistakes.find((m) => m.word === 'apple').reviewed).toBe(true);
    expect(document.getElementById('mt-result').textContent).toContain('正确');
  });

  it('should_keep_mistake_unreviewed_on_wrong_train_answer', () => {
    seedMistake();
    window.app.showTab('mistakeTrain');
    const mt = window.app.mistakeTrainModule;
    mt.start();
    document.getElementById('mt-answer').value = 'banana';
    mt.submit();
    expect(mt.wrong).toBe(1);
    const mistakes = window.DataStore.getProgress('mistakes', []);
    expect(mistakes.find((m) => m.word === 'apple').reviewed).toBe(false);
  });
});
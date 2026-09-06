// 行为级测试：词霸 PK 挑战（真实模块 DOM 驱动）
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { bootstrapApp } from './helpers/app-bootstrap.js';

describe('PKModule 行为', () => {
  beforeEach(async () => {
    vi.resetModules();
    await bootstrapApp();
  });

  function startGame() {
    window.app.showTab('pk');
    window.app.pkModule.startGame();
    return window.app.pkModule;
  }

  it('should_start_game_with_four_options_and_60s_timer', () => {
    const pk = startGame();
    expect(pk.points).toBe(0);
    expect(pk.correctCount).toBe(0);
    expect(pk.wrongCount).toBe(0);
    expect(document.querySelectorAll('#pk-options .pk-option-btn').length).toBe(4);
    expect(document.getElementById('pk-timer').textContent).toMatch(/^\d+$/);
    expect(pk.timeLeft).toBeGreaterThan(0);
    expect(pk.timeLeft).toBeLessThanOrEqual(60);
  });

  it('should_score_correct_answer_with_time_bonus', () => {
    const pk = startGame();
    // 当前题目答案 = words[currentIndex]，选项按钮 textContent 是词形
    const current = pk.words[pk.currentIndex];
    const correctBtn = Array.from(document.querySelectorAll('#pk-options .pk-option-btn'))
      .find((b) => b.textContent === current.word);
    expect(correctBtn).toBeTruthy();
    pk.checkAnswer(correctBtn, true, current);
    expect(pk.correctCount).toBe(1);
    expect(pk.points).toBeGreaterThanOrEqual(10);
    expect(document.getElementById('pk-result').textContent).toContain('正确');
    expect(pk.isEnded).toBe(false);
  });

  it('should_record_wrong_answer_and_add_mistake', () => {
    const pk = startGame();
    const current = pk.words[pk.currentIndex];
    const wrongBtn = Array.from(document.querySelectorAll('#pk-options .pk-option-btn'))
      .find((b) => b.textContent !== current.word);
    expect(wrongBtn).toBeTruthy();
    pk.checkAnswer(wrongBtn, false, current);
    expect(pk.wrongCount).toBe(1);
    const mistakes = window.DataStore.getProgress('mistakes', []);
    expect(mistakes.some((m) => m.word === current.word)).toBe(true);
  });
});
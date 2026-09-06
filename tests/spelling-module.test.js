// 行为级测试：拼写练习（真实模块 DOM 驱动）
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { bootstrapApp } from './helpers/app-bootstrap.js';

describe('SpellingModule 行为', () => {
  beforeEach(async () => {
    vi.resetModules();
    await bootstrapApp();
  });

  it('should_ask_cn_to_en_and_accept_correct_input', () => {
    window.app.showTab('spelling');
    const sp = window.app.spellingModule;
    document.getElementById('spelling-mode').value = 'cn2en';
    sp.start();
    expect(document.getElementById('spelling-prompt').textContent).toBeTruthy();
    const w = sp.words[0];
    document.getElementById('spelling-answer').value = w.word.toUpperCase(); // 大小写容错
    sp.submit();
    expect(sp.correct).toBe(1);
    expect(sp.wrong).toBe(0);
    expect(document.getElementById('spelling-result').textContent).toContain('正确');
  });

  it('should_mark_wrong_input_and_add_mistake', () => {
    window.app.showTab('spelling');
    const sp = window.app.spellingModule;
    document.getElementById('spelling-mode').value = 'cn2en';
    sp.start();
    const w = sp.words[0];
    document.getElementById('spelling-answer').value = 'zzz-not-answer';
    sp.submit();
    expect(sp.wrong).toBe(1);
    expect(sp.correct).toBe(0);
    expect(document.getElementById('spelling-result').textContent).toContain('正确答案');
    const mistakes = window.DataStore.getProgress('mistakes', []);
    expect(mistakes.some((m) => m.word === w.word)).toBe(true);
  });

  it('should_render_choice_question_for_en2cn_mode', () => {
    window.app.showTab('spelling');
    const sp = window.app.spellingModule;
    document.getElementById('spelling-mode').value = 'en2cn';
    sp.start();
    expect(document.querySelectorAll('#spelling-options .btn').length).toBeGreaterThanOrEqual(2);
    const w = sp.words[0];
    const correctBtn = Array.from(document.querySelectorAll('#spelling-options .btn'))
      .find((b) => b.textContent === w.chinese);
    expect(correctBtn).toBeTruthy();
    sp.checkOption(correctBtn, w.chinese, w.chinese);
    expect(sp.correct).toBe(1);
  });

  it('should_advance_next_question_after_submit', () => {
    window.app.showTab('spelling');
    const sp = window.app.spellingModule;
    document.getElementById('spelling-mode').value = 'cn2en';
    sp.start();
    const idx = sp.currentIndex;
    document.getElementById('spelling-answer').value = sp.words[idx].word;
    sp.submit();
    expect(document.getElementById('spelling-actions').style.display).toBe('block');
    document.getElementById('btn-spelling-next').click();
    expect(sp.currentIndex).toBe(idx + 1);
  });
});
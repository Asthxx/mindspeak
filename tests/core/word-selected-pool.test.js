// 行为级测试：精选学习模式下的「当前词」一致性（P1-1 回归网）
//
// 背景：卡片用 getCardWords()（精选后已过滤）显示，而朗读/收藏/精选按钮/主动回忆
// 曾经各自取 getCurrentWords()[currentIndex]（未过滤的全量分类池）。开启"只学精选"
// 后两池下标含义不同 → 听到的是别的词、收藏和错题记到别的词上，而且界面上看不出异常。
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { bootstrapApp } from '../helpers/app-bootstrap.js';

describe('精选模式的当前词一致性', () => {
  let wm;
  let picked;      // 被挑进精选的那个词（故意取分类里的第 3 个，而不是第 1 个）
  let fullFirst;   // 全量池第 0 个（旧实现会错取到它）

  beforeEach(async () => {
    vi.resetModules();
    await bootstrapApp();
    window.app.showTab('word');
    wm = window.app.wordModule;
    const all = wm.getCurrentWords();
    expect(all.length).toBeGreaterThan(2);
    fullFirst = all[0].word;
    picked = all[2].word;
    // 只勾这一个词，然后开"只学精选"
    window.DataStore.setProgress(wm._selectionKey(), [picked]);
    wm.learnSelectedOnly = true;
    window.DataStore.setProgress('learn_selected_only', true);
    wm.currentIndex = 0;
    wm.showCurrentWord();
  });

  it('卡片显示的就是精选池第一个词（不是全量池第一个）', () => {
    expect(wm.getCardWords().length).toBe(1);
    expect(document.getElementById('current-word').textContent).toBe(picked);
    expect(document.getElementById('current-word').textContent).not.toBe(fullFirst);
  });

  it('_currentCardWord 取到精选词，且与卡片显示一致', () => {
    const w = wm._currentCardWord();
    expect(w).toBeTruthy();
    expect(w.word).toBe(picked);
    expect(w.word).toBe(document.getElementById('current-word').textContent);
  });

  it('朗读读的是卡片词（不是全量池同下标的词）', () => {
    const spoken = [];
    const orig = window.SpeechUtil.speakWord;
    window.SpeechUtil.speakWord = (w) => { spoken.push(w); };
    try {
      wm.speakCurrent();
    } finally {
      window.SpeechUtil.speakWord = orig;
    }
    expect(spoken).toEqual([picked]);
  });

  it('收藏收藏的是卡片词', () => {
    wm.favoriteCurrent();
    const favs = window.DataStore.getProgress('favorites', []);
    expect(favs.map((f) => f.word)).toEqual([picked]);
  });

  it('复习阶段读的是卡片词的进度（而不是别的词）', () => {
    // 给"全量池第 0 个词"造一条高阶进度；卡片词仍是新词
    const otherKey = fullFirst + '-' + wm.currentCategoryIndex;
    const cardKey = picked + '-' + wm.currentCategoryIndex;
    wm.wordProgress[otherKey] = { reviewCount: 7, status: 'learning' };
    delete wm.wordProgress[cardKey];
    expect(wm.currentReviewCount()).toBe(0);

    wm.wordProgress[cardKey] = { reviewCount: 2, status: 'learning' };
    expect(wm.currentReviewCount()).toBe(2);
  });

  it('挑入精选按钮的状态跟着卡片词走（对已精选词显示 active）', () => {
    wm._syncSelectUI();
    const btn = document.getElementById('btn-select-word');
    expect(btn.classList.contains('active')).toBe(true);
    expect(btn.title).toContain('移除');
  });
});

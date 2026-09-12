// 练习取样修复：单词PK/听力/语境/跟读只抽「已学过」的词，杜绝未学词必错
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { bootstrapApp } from './helpers/app-bootstrap.js';

describe('练习取样 sampleLearnedWords', () => {
  beforeEach(async () => {
    vi.resetModules();
    await bootstrapApp();
  });

  function setProgress(records) {
    // 同时写 storage 与内存态（sampleLearnedWords 优先 wordModule.wordProgress）
    window.DataStore.setProgress('word_progress', records);
    window.app.wordModule.wordProgress = records;
  }

  it('should_only_sample_words_with_learning_record', () => {
    setProgress({ apple: { status: 'learning' }, cat: { status: 'mastered' } });
    const words = window.app.wordModule.categories[0].words; // 小学 5 词
    const picked = window.sampleLearnedWords(words, 20);
    expect(picked.length).toBe(2);
    const pickedWords = picked.map((w) => w.word).sort();
    expect(pickedWords).toEqual(['apple', 'cat']); // 未学 book/dog/egg 绝不掺入
  });

  it('should_return_all_learned_when_fewer_than_n', () => {
    setProgress({ apple: { status: 'new' } });
    const words = window.app.wordModule.categories[0].words;
    const picked = window.sampleLearnedWords(words, 20);
    expect(picked.length).toBe(1);
    expect(picked[0].word).toBe('apple');
  });

  it('should_return_empty_when_nothing_learned', () => {
    setProgress({});
    const words = window.app.wordModule.categories[0].words;
    expect(window.sampleLearnedWords(words, 20)).toEqual([]);
  });

  it('should_not_crash_on_bad_word_list_entries', () => {
    setProgress({ apple: { status: 'learning' } });
    const bad = [null, undefined, { word: '' }, { word: 'apple' }];
    const picked = window.sampleLearnedWords(bad, 10);
    expect(picked.length).toBe(1);
    expect(picked[0].word).toBe('apple');
  });
});

describe('练习模块接入已学过滤', () => {
  beforeEach(async () => {
    vi.resetModules();
    await bootstrapApp();
  });

  it('PK should_not_start_without_learned_words', () => {
    window.DataStore.setProgress('word_progress', {});
    window.app.wordModule.wordProgress = {};
    const pk = window.app.pkModule;
    // 分类下拉默认第一个选项（小学）
    document.getElementById('pk-category').value = '0';
    pk.startGame();
    expect(pk.words).toEqual([]);
    expect(pk.isRunning).toBe(false);
    const toastTexts = Array.from(document.querySelectorAll('.toast-message')).map((n) => n.textContent).join(' ');
    expect(toastTexts).toContain('还没有学过');
  });

  it('PK should_use_only_learned_words_on_start', () => {
    window.DataStore.setProgress('word_progress', { apple: { status: 'mastered' }, cat: { status: 'learning' } });
    window.app.wordModule.wordProgress = window.DataStore.getProgress('word_progress', {});
    const pk = window.app.pkModule;
    document.getElementById('pk-category').value = '0';
    pk.startGame();
    expect(pk.words.length).toBe(2);
    const words = pk.words.map((w) => w.word).sort();
    expect(words).toEqual(['apple', 'cat']);
    // 正常开局后应运行中
    expect(pk.isRunning).toBe(true);
    pk.endGame(); // 清掉 timer，避免测试泄漏
  });
});
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

  it('should_detect_learned_records_with_word_index_keys', () => {
    // 生产环境 markWord 写入的是 "word-分类序号" key（如 'apple-0'），纯词 key 是旧测试口径。
    // 必须同时识别两种，否则听力/PK/语境/跟读"只抽已学词"恒为空数组、无法开局。
    setProgress({ 'apple-0': { status: 'learning' }, 'cat-0': { status: 'mastered' } });
    const words = window.app.wordModule.categories[0].words; // 小学：apple/cat/book/dog/egg
    const picked = window.sampleLearnedWords(words, 20);
    expect(picked.map((w) => w.word).sort()).toEqual(['apple', 'cat']);
  });

  it('should_not_crash_on_bad_word_list_entries', () => {
    setProgress({ apple: { status: 'learning' } });
    const bad = [null, undefined, { word: '' }, { word: 'apple' }];
    const picked = window.sampleLearnedWords(bad, 10);
    expect(picked.length).toBe(1);
    expect(picked[0].word).toBe('apple');
  });

  it('should_prefer_words_reviewed_within_recent_days', () => {
    // 今天回顾 apple、8 天前回顾 book，窗口=7 天 → 必须优先 apple
    const todayStr = getTodayStr();
    setProgress({
      apple: { status: 'learning', lastReviewed: todayStr },
      book: { status: 'learning', lastReviewed: daysAgoStr(8) }
    });
    const words = window.app.wordModule.categories[0].words;
    // n=1 时窗口内只有一个 → 必出 apple（最近优先）
    const picked = window.sampleLearnedWords(words, 1);
    expect(picked.map((w) => w.word)).toEqual(['apple']);
    // n=2 时窗口补足更早(book)，仍绝不掺未学
    const picked2 = window.sampleLearnedWords(words, 2).map((w) => w.word).sort();
    expect(picked2).toEqual(['apple', 'book']);
  });

  it('should_fall_back_to_older_learned_without_mixing_unlearned', () => {
    // 全部已学都早于 7 天窗口 → 仍出更早已学词兜底（不空场、不掺未学）
    setProgress({
      apple: { status: 'learning', lastReviewed: daysAgoStr(20) },
      book: { status: 'learning', lastReviewed: daysAgoStr(9) }
    });
    const words = window.app.wordModule.categories[0].words;
    const picked = window.sampleLearnedWords(words, 3).map((w) => w.word).sort();
    expect(picked).toEqual(['apple', 'book']); // 兜底给全部更早已学，dog/egg 未学不入
  });

  it('should_return_empty_window_when_nothing_learned_recently_or_before', () => {
    setProgress({});
    const words = window.app.wordModule.categories[0].words;
    expect(window.sampleLearnedWords(words, 5)).toEqual([]);
  });
});

// 返回本地日期字符串 YYYY-MM-DD（与 app.js getLocalDateStr 一致）
function getTodayStr() {
  var d = new Date();
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}
function daysAgoStr(days) {
  var d = new Date();
  d.setDate(d.getDate() - days);
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

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
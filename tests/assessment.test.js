import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setupGlobals } from './helpers/mocks.js';

// assessment.js 依赖 DataStore、escapeHtml、safeBind 等全局函数
// 需要 mock 这些依赖
beforeEach(() => {
  setupGlobals();
  // mock DataStore
  globalThis.DataStore = {
    getDefaultWords: vi.fn(() => ({
      categories: [
        { stage: 1, name: '基础', words: [
          { word: 'hello', phonetic: '/həˈləʊ/', chinese: '你好' },
          { word: 'world', phonetic: '/wɜːld/', chinese: '世界' },
          { word: 'apple', phonetic: '/ˈæpl/', chinese: '苹果' },
          { word: 'book', phonetic: '/bʊk/', chinese: '书' },
          { word: 'cat', phonetic: '/kæt/', chinese: '猫' },
        ]},
        { stage: 3, name: '进阶', words: [
          { word: 'beautiful', phonetic: '/ˈbjuːtɪfl/', chinese: '美丽的' },
          { word: 'important', phonetic: '/ɪmˈpɔːtənt/', chinese: '重要的' },
        ]},
      ]
    })),
    getDefaultGrammar: vi.fn(() => [
      { type: 'choice', question: 'I ___ a student.', options: ['am', 'is', 'are', 'be'], answer: 0, explanation: 'I am' },
      { type: 'choice', question: 'She ___ to school.', options: ['go', 'goes', 'going', 'went'], answer: 1, explanation: '三单加s' },
    ]),
    getDefaultReading: vi.fn(() => []),
    getProgress: vi.fn(() => []),
    setProgress: vi.fn(),
  };
  // mock 全局函数
  globalThis.escapeHtml = (s) => String(s || '');
  globalThis.safeBind = () => {};
  globalThis.getLocalDateStr = () => '2026-08-20';
  globalThis.Toast = { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() };
});

// 动态导入 assessment.js
let AssessmentEngine;
beforeEach(async () => {
  vi.resetModules();
  await import('../js/assessment.js');
  AssessmentEngine = globalThis.AssessmentEngine;
});

describe('AssessmentEngine — grade() 评分', () => {
  it('should_calculate_score_correctly', () => {
    const answers = [
      { dim: 'vocab', correct: true, selected: '0' },
      { dim: 'vocab', correct: false, selected: '1' },
      { dim: 'grammar', correct: true, selected: '0' },
    ];
    const res = AssessmentEngine.grade(answers);
    expect(res.score).toBe(67); // 2/3 ≈ 67%
    expect(res.correct).toBe(2);
    expect(res.total).toBe(3);
  });

  it('should_exclude_skipped_from_total', () => {
    const answers = [
      { dim: 'vocab', correct: true, selected: '0' },
      { dim: 'vocab', correct: false, selected: '1' },
      { dim: 'vocab', correct: false, selected: 'skip' }, // 跳过
    ];
    const res = AssessmentEngine.grade(answers);
    // 跳过不计分：total=2, correct=1, score=50
    expect(res.total).toBe(2);
    expect(res.correct).toBe(1);
    expect(res.score).toBe(50);
  });

  it('should_handle_all_skipped', () => {
    const answers = [
      { dim: 'vocab', correct: false, selected: 'skip' },
      { dim: 'grammar', correct: false, selected: 'skip' },
    ];
    const res = AssessmentEngine.grade(answers);
    expect(res.total).toBe(0);
    expect(res.score).toBe(0);
    expect(res.level).toBe('newcomer');
  });

  it('should_identify_weak_dimension', () => {
    const answers = [
      { dim: 'vocab', correct: true, selected: '0' },
      { dim: 'vocab', correct: true, selected: '0' },
      { dim: 'vocab', correct: true, selected: '0' },
      { dim: 'grammar', correct: false, selected: '1' },
      { dim: 'grammar', correct: false, selected: '1' },
      { dim: 'grammar', correct: false, selected: '1' },
    ];
    const res = AssessmentEngine.grade(answers);
    expect(res.weakDim).toBe('grammar');
    expect(res.weakName).toBe('语法');
  });
});

describe('AssessmentEngine — _distractors() 共享池污染', () => {
  it('should_not_mutate_pool_across_calls', () => {
    // 连续调用两次 _distractors，检查是否返回不同的结果集（池未被污染）
    const r1 = AssessmentEngine._distractors('你好', 3);
    const r2 = AssessmentEngine._distractors('世界', 3);
    // 至少应该有不同的干扰项（因为 avoid 不同）
    // 关键：两次调用都不应抛错，且返回数组
    expect(Array.isArray(r1)).toBe(true);
    expect(Array.isArray(r2)).toBe(true);
    expect(r1.length).toBe(3);
    expect(r2.length).toBe(3);
  });

  // BUG: _distractors 的 partial Fisher-Yates 会修改 this._distractorPool 的顺序
  it('should_preserve_pool_order_after_multiple_calls', () => {
    // 先调用一次建立缓存池
    AssessmentEngine._distractors('你好', 3);
    // 记录池的快照（精确顺序）
    const poolBefore = AssessmentEngine._distractorPool.slice();
    // 再调用一次
    AssessmentEngine._distractors('世界', 3);
    const poolAfter = AssessmentEngine._distractorPool;
    // 池的顺序必须完全一致（不仅是元素集合）
    expect(poolAfter).toEqual(poolBefore);
  });
});

describe('AssessmentEngine — _sample() 边界', () => {
  it('should_return_all_when_pool_smaller_than_n', () => {
    const arr = [1, 2, 3];
    const result = AssessmentEngine._sample(arr, 5);
    expect(result.length).toBe(3); // 只能返回 3 个
  });

  it('should_return_empty_for_empty_pool', () => {
    expect(AssessmentEngine._sample([], 5)).toEqual([]);
  });

  it('should_return_n_elements', () => {
    const arr = [1, 2, 3, 4, 5];
    const result = AssessmentEngine._sample(arr, 3);
    expect(result.length).toBe(3);
  });
});

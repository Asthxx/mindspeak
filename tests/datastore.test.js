import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setupGlobals } from './helpers/mocks.js';

let ls;

beforeEach(async () => {
  ls = setupGlobals();
  ls._reset();

  globalThis.UserState = {
    get: vi.fn((key, fallback) => {
      if (key === 'daily_goal') return 10;
      if (key === 'mistakes') return [];
      return fallback;
    }),
    set: vi.fn(),
  };

  globalThis.WORD_LIBRARY = {
    categories: [{
      name: 'CET4',
      words: [
        { word: 'hello', phonetic: '/həˈloʊ/', pos: 'int.', chinese: '你好' },
        { word: 'world', phonetic: '/wɜːrld/', pos: 'n.', chinese: '世界' },
      ]
    }]
  };
  globalThis.GRAMMAR_DATA = [
    { id: 'g1', title: '时态', exercises: [] }
  ];
  globalThis.EXTRA_GRAMMAR = [
    { id: 'g2', title: '语态', exercises: [] }
  ];
  globalThis.EXTRA_READING = [{ title: 'Test Reading', content: '...' }];
  globalThis.READING_DATA = [];

  globalThis.escapeHtml = (s) => String(s || '');
  globalThis.getLocalDateStr = (d) => {
    d = d || new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  };
  globalThis.calculateStreak = vi.fn(() => 5);
  globalThis.Toast = { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() };
  globalThis.EventBus = { emit: vi.fn(), on: vi.fn(), off: vi.fn() };

  vi.resetModules();
  await import('../js/app.js');
});

describe('DataStore — getProgress / setProgress', () => {
  it('should_delegate_to_UserState', () => {
    DataStore.getProgress('daily_goal', 10);
    expect(globalThis.UserState.get).toHaveBeenCalledWith('daily_goal', 10);
  });

  it('should_set_via_UserState', () => {
    DataStore.setProgress('daily_goal', 20);
    expect(globalThis.UserState.set).toHaveBeenCalledWith('daily_goal', 20);
  });

  it('should_use_fallback_when_key_not_found', () => {
    globalThis.UserState.get = vi.fn((key, fallback) => fallback);
    const result = DataStore.getProgress('nonexistent', 'default');
    expect(result).toBe('default');
  });
});

describe('DataStore — getDefaultWords', () => {
  it('should_return_word_library_data', () => {
    const data = DataStore.getDefaultWords();
    expect(data.categories).toBeDefined();
    expect(data.categories.length).toBeGreaterThan(0);
  });

  it('should_return_first_category_words', () => {
    const data = DataStore.getDefaultWords();
    const words = data.categories[0].words;
    expect(words.length).toBe(2);
    expect(words[0].word).toBe('hello');
  });
});

describe('DataStore — getDefaultGrammar', () => {
  it('should_merge_grammar_data', () => {
    const data = DataStore.getDefaultGrammar();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(2);
  });
});

describe('DataStore — getDefaultReading', () => {
  it('should_return_reading_data', () => {
    const data = DataStore.getDefaultReading();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });
});

describe('DataStore — getNextReview', () => {
  it('should_return_future_date_string', () => {
    const result = DataStore.getNextReview('test-key', 0);
    // First review: interval is ebbinghausIntervals[0] = 1 day
    const today = getLocalDateStr();
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // Should be after today
    expect(result >= today).toBe(true);
  });

  it('should_increase_interval_with_more_reviews', () => {
    const r0 = DataStore.getNextReview('key', 0);
    const r2 = DataStore.getNextReview('key', 2);
    // More reviews → longer interval → later date
    expect(r2 >= r0).toBe(true);
  });

  it('should_use_half_interval_when_half_mode', () => {
    const full = DataStore.getNextReview('key', 3);
    const half = DataStore.getNextReview('key', 3, true);
    // Half mode should give an earlier or equal date
    expect(half <= full).toBe(true);
  });
});

describe('DataStore — getEbbinghausPlan', () => {
  it('should_return_array_of_plan_rows', () => {
    const plan = DataStore.getEbbinghausPlan();
    expect(Array.isArray(plan)).toBe(true);
    expect(plan.length).toBe(8); // 8 intervals
  });

  it('should_have_count_days_retention_fields', () => {
    const plan = DataStore.getEbbinghausPlan();
    plan.forEach(function(row) {
      expect(row.count).toBeDefined();
      expect(row.days).toBeDefined();
      expect(row.retention).toBeDefined();
    });
  });

  it('should_have_increasing_retention', () => {
    const plan = DataStore.getEbbinghausPlan();
    for (var i = 1; i < plan.length; i++) {
      expect(plan[i].retention).toBeGreaterThanOrEqual(plan[i - 1].retention);
    }
  });
});

describe('DataStore — getNextReview 边界', () => {
  it('should_clamp_at_max_interval', () => {
    // With reviewCount > ebbinghausIntervals.length, should clamp
    const result = DataStore.getNextReview('key', 100);
    expect(result).toBeDefined();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

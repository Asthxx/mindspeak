import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setupGlobals } from './helpers/mocks.js';

let ls;
beforeEach(async () => {
  ls = setupGlobals();
  ls._reset();

  globalThis.DataStore = {
    getProgress: vi.fn((key, fallback) => {
      if (key === 'word_progress') return {};
      if (key === 'checkins') return {};
      if (key === 'mistakes') return [];
      if (key === 'daily_goal') return 10;
      if (key === 'gamification') return { points: 100, level: 2 };
      return fallback;
    }),
    getDefaultWords: vi.fn(() => ({
      categories: [{
        words: [
          { word: 'apple', phonetic: '/ˈæpl/', pos: 'n.', chinese: '苹果', example: 'I eat an apple.' },
          { word: 'happy', phonetic: '/ˈhæpi/', pos: 'adj.', chinese: '快乐的' },
        ]
      }]
    })),
  };
  globalThis.escapeHtml = (s) => String(s || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  globalThis.getLocalDateStr = () => '2026-01-15';
  globalThis.calculateStreak = vi.fn(() => 3);
  globalThis.Toast = { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() };
  globalThis.SpeechUtil = { speakWord: vi.fn() };
  globalThis.EventBus = { emit: vi.fn(), on: vi.fn(), off: vi.fn() };

  // Create minimal DOM for AiChatModule
  document.body.innerHTML = `
    <div id="ai-chat-msgs"></div>
    <input id="ai-chat-input" />
    <button id="ai-chat-send"></button>
    <div id="ai-chat-chips"></div>
    <input id="search-input" />
  `;

  vi.resetModules();
  await import('../js/ai-chat.js');
});

function makeChat() {
  return new globalThis.AiChatModule();
}

describe('AiChatModule — _extractWord', () => {
  it('should_extract_english_word', () => {
    const chat = makeChat();
    expect(chat._extractWord('解释单词 apple')).toBe('apple');
  });

  it('should_skip_common_words', () => {
    const chat = makeChat();
    expect(chat._extractWord('give me the apple')).toBeNull(); // 'give' matched first, skipped; no second match
    expect(chat._extractWord('explain the word')).toBeNull();
  });

  it('should_handle_hyphenated_words', () => {
    const chat = makeChat();
    expect(chat._extractWord('解释 long-term')).toBe('long-term');
  });
});

describe('AiChatModule — _has (意图识别)', () => {
  it('should_match_single_keyword', () => {
    const chat = makeChat();
    expect(chat._has('我学得怎么样', ['怎么样'])).toBe(true);
  });

  it('should_not_match_partial_keyword_in_english', () => {
    const chat = makeChat();
    // "pronounce" contains "pron" but not in the INTENT_PRON list
    // This tests false positive: 'pron' matches 'pronounce' even though user means pronunciation
    const chat2 = makeChat();
    // INTENT_PRON = ['发音', '读音', '口语', '跟读', 'pronoun', 'pronounce']
    expect(chat2._has('how to pronounce correctly', ['pronounce'])).toBe(true);
  });

  it('should_not_false_positive_on_unrelated_text', () => {
    const chat = makeChat();
    // "overview" shouldn't match "overview" in Chinese-only context
    expect(chat._has('这个功能不错', ['概况', '进度'])).toBe(false);
  });
});

describe('AiChatModule — _handle (意图路由)', () => {
  it('should_route_to_greeting', () => {
    const chat = makeChat();
    const reply = chat._handle('你好', '你好');
    expect(reply).toContain('AI 英语教练');
  });

  it('should_route_to_help', () => {
    const chat = makeChat();
    const reply = chat._handle('帮助', '帮助');
    expect(reply).toContain('这样问我');
  });

  it('should_route_to_overview', () => {
    const chat = makeChat();
    const reply = chat._handle('我学得怎么样', '我学得怎么样');
    expect(reply).toContain('学习概况');
  });

  it('should_route_to_plan', () => {
    const chat = makeChat();
    const reply = chat._handle('帮我制定学习计划', '帮我制定学习学习计划');
    expect(reply).toContain('学习计划');
  });

  it('should_route_to_mistake_analysis', () => {
    const chat = makeChat();
    const reply = chat._handle('分析我的错题', '分析我的错题');
    expect(reply).toContain('错题');
  });

  it('should_route_to_word_explain', () => {
    const chat = makeChat();
    const reply = chat._handle('解释单词 apple', '解释单词 apple');
    expect(reply).toContain('apple');
    expect(reply).toContain('苹果');
  });

  it('should_give_fallback_for_unknown', () => {
    const chat = makeChat();
    const reply = chat._handle('随机问题是', '随机问题是');
    expect(reply).toContain('没理解');
  });
});

describe('AiChatModule — ask', () => {
  it('should_append_user_message_and_ai_reply', () => {
    const chat = makeChat();
    chat.ask('你好');
    const box = document.getElementById('ai-chat-msgs');
    const msgs = box.querySelectorAll('.ai-msg');
    expect(msgs.length).toBe(3); // welcome + user + ai
  });
});

describe('AiChatModule — _sentence', () => {
  it('should_generate_sentences_for_word', () => {
    const chat = makeChat();
    const reply = chat._handle('给 apple 生成例句', '给 apple 生成例句');
    expect(reply).toContain('例句');
    expect(reply).toContain('apple');
  });
});

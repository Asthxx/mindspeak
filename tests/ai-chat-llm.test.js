import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setupGlobals } from './helpers/mocks.js';

// 维度3/维度1 测试：NeuralEngine 双通道（LLM 优先 + 规则兜底）、限流、脱敏、转义；
// AiChatModule 意图升级（多信号评分/复合/多轮/新意图）。
let ls;
beforeEach(async () => {
  ls = setupGlobals();
  ls._reset();

  globalThis.DataStore = {
    getProgress: vi.fn((key, fallback) => {
      if (key === 'ai_chat_history') {
        try { const v = ls.getItem(key); return v ? JSON.parse(v) : []; } catch (e) { return []; }
      }
      if (key === 'word_progress') return {
        'apple-1': { status: 'mastered', nextReview: null },
        'banana-2': { status: 'learning', nextReview: '2026-01-15' }
      };
      if (key === 'checkins') return { '2026-01-13': 5, '2026-01-14': 5, '2026-01-15': 3 };
      if (key === 'mistakes') return [
        { source: 'spelling', word: 'peice' }, { source: 'spelling', word: 'freind' },
        { source: 'grammar', word: 'goed' }, { source: 'pk', word: 'happy' }
      ];
      if (key === 'daily_goal') return 10;
      if (key === 'gamification') return { points: 100, level: 2 };
      return fallback;
    }),
    setProgress: vi.fn((key, value) => {
      try { ls.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
    }),
    getDefaultWords: vi.fn(() => ({
      categories: [{ words: [
        { word: 'apple', phonetic: '/ˈæpl/', pos: 'n.', chinese: '苹果', example: 'I eat an apple.', example_cn: '我吃了一个苹果。' },
        { word: 'happy', phonetic: '/ˈhæpi/', pos: 'adj.', chinese: '快乐的', example: 'She feels happy.' }
      ] }]
    })),
  };
  globalThis.escapeHtml = (s) => String(s || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  globalThis.getLocalDateStr = () => '2026-01-15';
  globalThis.calculateStreak = vi.fn(() => 3);
  globalThis.Toast = { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() };
  globalThis.SpeechUtil = { speakWord: vi.fn() };
  globalThis.EventBus = { emit: vi.fn(), on: vi.fn(), off: vi.fn() };
  globalThis.API_BASE = 'http://localhost:3000';

  document.body.innerHTML = `
    <div id="ai-chat-msgs"></div>
    <input id="ai-chat-input" />
    <button id="ai-chat-send"></button>
    <div id="ai-chat-chips"></div>
    <input id="search-input" />
    <div class="ai-chat-card"><h3 class="ai-card-title"></h3></div>
  `;

  vi.resetModules();
  await import('../js/ai-chat.js');
});

function getNeural() { return globalThis.NeuralEngine; }
function makeChat() { return new globalThis.AiChatModule(); }

describe('NeuralEngine — 限流', () => {
  it('should_allow_up_to_10_calls_per_minute', () => {
    const N = getNeural();
    for (let i = 0; i < 10; i++) expect(N.allow()).toBe(true);
    expect(N.allow()).toBe(false);
  });

  it('should_reset_after_window_elapses', () => {
    const N = getNeural();
    for (let i = 0; i < 10; i++) N.allow();
    expect(N.allow()).toBe(false);
    // 用测试广播替换内部时间戳：直接把旧时间戳清掉模拟窗口滑动
    N.resetForTest();
    expect(N.allow()).toBe(true);
  });
});

describe('NeuralEngine — 脱敏聚合', () => {
  it('should_build_aggregate_stats_only', () => {
    const ctx = getNeural().getAgentContext();
    expect(ctx.mastered).toBe(1);
    expect(ctx.due).toBe(1);
    expect(ctx.streak).toBe(3);
    expect(ctx.weak).toBeDefined();
    const json = JSON.stringify(ctx);
    expect(json).not.toContain('peice');   // 不含错词明细
    expect(json).not.toContain('apple-1'); // 不含单个单词进度
    expect(json).not.toContain('banana');  // 不含词明细
  });
});

describe('NeuralEngine — 双通道与降级', () => {
  function mockFetch(impl) { globalThis.fetch = vi.fn(impl); }

  it('should_not_call_llm_for_local_intents', async () => {
    const N = getNeural();
    mockFetch(() => Promise.resolve({ ok: true, json: async () => ({ ok: true, text: 'x' }) }));
    if (N.isLLMIntent('overview') || N.isLLMIntent('mistakes') || N.isLLMIntent('plan') || N.isLLMIntent('pron') || N.isLLMIntent('review')) {
      const r = await N.ask('overview', '我学得怎么样');
      expect(r).toBeNull();
      expect(globalThis.fetch).not.toHaveBeenCalled();
    }
  });

  it('should_call_llm_for_explain_word_and_return_text', async () => {
    const N = getNeural();
    mockFetch(() => Promise.resolve({ ok: true, json: async () => ({ ok: true, text: 'abandon 意为“放弃”。', model: 'openai' }) }));
    const r = await N.ask('explain_word', '解释单词 abandon');
    expect(r).toContain('abandon');
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('should_return_null_when_fetch_fails', async () => {
    const N = getNeural();
    mockFetch(() => Promise.reject(new TypeError('Failed to fetch')));
    const r = await N.ask('explain_word', 'abandon');
    expect(r).toBeNull();
  });

  it('should_return_null_when_upstream_not_ok', async () => {
    const N = getNeural();
    mockFetch(() => Promise.resolve({ ok: true, json: async () => ({ ok: false, error: 'upstream' }) }));
    const r = await N.ask('sentence', 'happy');
    expect(r).toBeNull();
  });

  it('should_return_null_when_rate_limited', async () => {
    const N = getNeural();
    mockFetch(() => Promise.resolve({ ok: true, json: async () => ({ ok: true, text: 'x' }) }));
    N.resetForTest();
    for (let i = 0; i < 10; i++) await N.ask('chat', 'hi');
    const before = globalThis.fetch.mock.calls.length;
    const r = await N.ask('chat', 'hi again');
    expect(r).toBeNull();
    expect(globalThis.fetch.mock.calls.length).toBe(before); // 未发请求
  });

  it('should_timeout_after_3s', async () => {
    const N = getNeural();
    let aborted = false;
    mockFetch((url, opts) => new Promise((resolve, reject) => {
      opts.signal.addEventListener('abort', () => { aborted = true; reject(Object.assign(new Error('aborted'), { name: 'AbortError' })); });
      // 永不 resolve
    }));
    const started = Date.now();
    const r = await N.ask('chat', 'hi', { timeoutMs: 50 });
    const elapsed = Date.now() - started;
    expect(r).toBeNull();
    expect(aborted).toBe(true);
    expect(elapsed).toBeLessThan(2000);
  });

  it('should_escape_llm_text_and_convert_goto_marker', () => {
    const html = getNeural().toHtml('abandon 很棒 [跳转:word] <b>x</b>');
    expect(html).toContain('abandon');
    expect(html).not.toContain('<b>');
    expect(html).not.toContain('[跳转:word]');
    expect(html).toContain('data-goto="word"');
  });

  it('should_send_only_question_and_aggregate_in_messages', async () => {
    const N = getNeural();
    mockFetch(() => Promise.resolve({ ok: true, json: async () => ({ ok: true, text: 'ok' }) }));
    await N.ask('explain_word', '解释单词 apple');
    const [url, opts] = globalThis.fetch.mock.calls[0];
    expect(String(url)).toContain(globalThis.API_BASE + '/api/ai/chat');
    const body = JSON.parse(opts.body);
    expect(body.intent).toBe('explain_word');
    expect(Array.isArray(body.messages)).toBe(true);
    const content = body.messages[0].content;
    expect(content).toContain('解释单词 apple');
    expect(content).toContain('mastered');
    expect(content).not.toContain('apple-1');
  });
});

describe('NeuralEngine — ask 无需数据的普通调用', () => {
  it('should_export_neural_engine_on_window', () => {
    expect(getNeural()).toBeDefined();
    expect(typeof getNeural().allow).toBe('function');
    expect(typeof getNeural().ask).toBe('function');
    expect(typeof getNeural().getAgentContext).toBe('function');
  });
});

describe('AiChatModule — 意图升级（维度1）', () => {
  const flush = () => new Promise((res) => setTimeout(res, 20));

  function installFetch(impl) { globalThis.fetch = vi.fn(impl); }
  function lastAiBubble() {
    const divs = document.querySelectorAll('#ai-chat-msgs .ai-msg-ai .ai-msg-bubble');
    return divs.length ? divs[divs.length - 1].innerHTML : '';
  }

  it('should_follow_up_with_context_word', () => {
    const chat = makeChat();
    chat.ask('解释单词 apple');
    const r = chat.ask('那 happy 呢');
    expect(r).toContain('happy');
    expect(r).toContain('快乐的');
  });

  it('should_keep_last_context_for_example_follow_up', () => {
    const chat = makeChat();
    chat.ask('给 apple 生成例句');
    const r = chat.ask('happy 呢');
    expect(r).toContain('happy');
    expect(r).toContain('例句');
  });

  it('should_handle_compound_mistake_plan_intent', () => {
    const chat = makeChat();
    const r = chat.ask('分析我的错题并帮我制定学习计划');
    expect(r).toContain('错题');
    expect(r).toContain('计划');
  });

  it('should_llm_fallback_for_unknown_word_async', async () => {
    installFetch(() => Promise.resolve({ ok: true, json: async () => ({ ok: true, text: 'zzz 是一个虚拟词。[跳转:word]' }) }));
    const chat = makeChat();
    const r = chat.ask('解释单词 zzz');
    expect(r).toContain('未收录');
    await flush();
    const html = lastAiBubble();
    expect(html).toContain('虚拟词');
    expect(html).toContain('data-goto="word"');   // 跳转按钮已转义
    expect(html).not.toContain('[跳转:word]');
  });

  it('should_speak_button_on_llm_fallback', async () => {
    installFetch(() => Promise.resolve({ ok: true, json: async () => ({ ok: true, text: 'Hello there.' }) }));
    const chat = makeChat();
    chat.ask('解释单词 zzz');
    await flush();
    expect(lastAiBubble()).toContain('data-speak');
  });

  it('should_ask_llm_for_natural_sentences_when_requested', async () => {
    const fetcher = vi.fn((url) => {
      if (String(url).includes('/api/ai/health')) return Promise.resolve({ ok: true, json: async () => ({ ok: true, enabled: false }) });
      return Promise.resolve({ ok: true, json: async () => ({ ok: true, text: '自然例句' }) });
    });
    installFetch(fetcher);
    const chat = makeChat();
    const r = chat.ask('给 happy 生成更地道的例句');
    expect(r).toContain('happy');
    await flush();
    const chatCalls = fetcher.mock.calls.filter((c) => String(c[0]).includes('/api/ai/chat'));
    expect(chatCalls).toHaveLength(1);
    const body = JSON.parse(chatCalls[0][1].body);
    expect(body.intent).toBe('sentence');
  });

  it('should_compare_two_words_with_llm', async () => {
    const fetcher = vi.fn((url) => {
      if (String(url).includes('/api/ai/health')) return Promise.resolve({ ok: true, json: async () => ({ ok: true, enabled: false }) });
      return Promise.resolve({ ok: true, json: async () => ({ ok: true, text: 'apple 是苹果，banana 是香蕉。' }) });
    });
    installFetch(fetcher);
    const chat = makeChat();
    const r = chat.ask('apple 和 banana 有什么区别');
    expect(r).toContain('apple');
    expect(r).toContain('banana');
    await flush();
    const chatCalls = fetcher.mock.calls.filter((c) => String(c[0]).includes('/api/ai/chat'));
    expect(chatCalls).toHaveLength(1);
    const body = JSON.parse(chatCalls[0][1].body);
    expect(body.intent).toBe('compare');
  });

  it('should_translate_question_to_llm', async () => {
    const fetcher = vi.fn((url) => {
      if (String(url).includes('/api/ai/health')) return Promise.resolve({ ok: true, json: async () => ({ ok: true, enabled: false }) });
      return Promise.resolve({ ok: true, json: async () => ({ ok: true, text: '苹果 in English is “apple”.' }) });
    });
    installFetch(fetcher);
    const chat = makeChat();
    const r = chat.ask('苹果用英语怎么说');
    expect(r).toContain('翻译');
    await flush();
    const chatCalls = fetcher.mock.calls.filter((c) => String(c[0]).includes('/api/ai/chat'));
    expect(chatCalls).toHaveLength(1);
    const body = JSON.parse(chatCalls[0][1].body);
    expect(body.intent).toBe('translate');
  });

  it('should_encourage_user', () => {
    const chat = makeChat();
    const r = chat.ask('进步真大，鼓励一下我');
    expect(r).toContain('坚持');
  });

  it('should_give_memory_tips', () => {
    const chat = makeChat();
    const r = chat.ask('单词总是背了就忘怎么办');
    expect(r).toContain('技巧');
  });

  it('should_offer_practice_opening', () => {
    const chat = makeChat();
    const r = chat.ask('我想练口语');
    expect(r).toContain('口语');
  });

  it('should_keep_all_local_intents_synchronous', () => {
    const chat = makeChat();
    expect(typeof chat.ask('我学得怎么样')).toBe('string');
    expect(typeof chat.ask('帮我制定学习计划')).toBe('string');
    expect(typeof chat.ask('分析我的错题')).toBe('string');
    expect(typeof chat.ask('给我发音建议')).toBe('string');
    expect(typeof chat.ask('你好')).toBe('string');
  });
});

describe('NeuralEngine — 健康检查', () => {
  function mockFetch(impl) { globalThis.fetch = vi.fn(impl); }

  it('should_report_enabled_when_server_has_key', async () => {
    mockFetch(() => Promise.resolve({ ok: true, json: async () => ({ ok: true, enabled: true, model: 'openai', capacity: 20 }) }));
    const s = await getNeural().checkHealth();
    expect(s.ok).toBe(true);
    expect(s.enabled).toBe(true);
    expect(s.model).toBe('openai');
  });

  it('should_report_disabled_when_no_key', async () => {
    mockFetch(() => Promise.resolve({ ok: true, json: async () => ({ ok: true, enabled: false, model: 'openai', capacity: 20 }) }));
    const s = await getNeural().checkHealth();
    expect(s.enabled).toBe(false);
  });

  it('should_report_offline_when_fetch_fails', async () => {
    mockFetch(() => Promise.reject(new TypeError('Failed to fetch')));
    const s = await getNeural().checkHealth();
    expect(s.ok).toBe(false);
    expect(s.enabled).toBe(false);
  });
});

describe('AiChatModule — 在线状态徽章', () => {
  const flush = () => new Promise((res) => setTimeout(res, 20));

  it('should_show_online_badge_when_enabled', async () => {
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: true, json: async () => ({ ok: true, enabled: true, model: 'openai', capacity: 20 }) }));
    makeChat();
    await flush();
    const b = document.querySelector('.ai-status-badge');
    expect(b).toBeTruthy();
    expect(b.getAttribute('data-state')).toBe('on');
    expect(b.textContent).toContain('在线');
  });

  it('should_show_offline_badge_when_disabled', async () => {
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: true, json: async () => ({ ok: true, enabled: false, model: 'openai', capacity: 20 }) }));
    makeChat();
    await flush();
    const b = document.querySelector('.ai-status-badge');
    expect(b.getAttribute('data-state')).toBe('off');
    expect(b.textContent).toContain('离线');
  });
});

describe('AiChatModule — 清空对话', () => {
  function historyFromStorage() {
    try { return JSON.parse(ls.getItem('ai_chat_history') || '[]'); } catch (e) { return []; }
  }

  it('should_show_clear_button_with_history_count', () => {
    const chat = makeChat();
    chat.ask('解释单词 apple');
    const btn = document.querySelector('.ai-clear-chat');
    expect(btn).toBeTruthy();
    expect(btn.title).toContain('条');
  });

  it('should_clear_history_and_reset_to_welcome', () => {
    const chat = makeChat();
    chat.ask('解释单词 apple');
    const before = historyFromStorage();
    expect(before.length).toBeGreaterThan(0);
    document.querySelector('.ai-clear-chat').click();
    const after = historyFromStorage();
    expect(Array.isArray(after)).toBe(true);
    expect(after.length).toBe(0);
    const html = document.getElementById('ai-chat-msgs').innerHTML;
    expect(html).toContain('你好');
    expect(html).not.toContain('apple');
  });
});

describe('AiChatModule — UI/UX（维度4）', () => {
  const flush = () => new Promise((res) => setTimeout(res, 20));
  function installFetch(impl) { globalThis.fetch = vi.fn(impl); }
  function lastAiBubble() {
    const divs = document.querySelectorAll('#ai-chat-msgs .ai-msg-ai .ai-msg-bubble');
    return divs.length ? divs[divs.length - 1].innerHTML : '';
  }
  function historyFromStorage() {
    try { return JSON.parse(ls.getItem('ai_chat_history') || '[]'); } catch (e) { return []; }
  }

  it('should_store_history_after_ask', () => {
    const chat = makeChat();
    chat.ask('解释单词 apple');
    const h = historyFromStorage();
    expect(Array.isArray(h)).toBe(true);
    expect(h.length).toBeGreaterThan(0);
    expect(h[h.length - 1].role).toBe('ai');
  });

  it('should_trim_history_to_50', () => {
    const chat = makeChat();
    for (let i = 0; i < 55; i++) chat.ask(i % 2 ? '你好' : '我学得怎么样');
    const h = historyFromStorage();
    expect(h.length).toBeLessThanOrEqual(50);
  });

  it('should_restore_recent_history_on_welcome', () => {
    const chat = makeChat();
    chat.ask('解释单词 apple');
    // 模拟刷新：重建模块 → initUI → _welcome 恢复历史
    const chat2 = makeChat();
    const html = document.getElementById('ai-chat-msgs').innerHTML;
    expect(html).toContain('apple');
    expect(html).toContain('上次的对话');
  });

  it('should_show_typing_then_remove_and_render_llm', async () => {
    let resolveFetch;
    installFetch(() => new Promise((res) => { resolveFetch = res; }));
    const chat = makeChat();
    const r = chat.ask('解释单词 zzz');
    expect(document.querySelectorAll('.ai-typing').length).toBe(1);
    resolveFetch({ ok: true, json: async () => ({ ok: true, text: '虚拟词说明' }) });
    await flush();
    expect(document.querySelectorAll('.ai-typing').length).toBe(0);
    expect(lastAiBubble()).toContain('虚拟词说明');
  });

  it('should_update_chips_for_word_context', () => {
    const chat = makeChat();
    chat.ask('解释单词 happy');
    const chipText = document.getElementById('ai-chat-chips').textContent;
    expect(chipText).toContain('happy');
    expect(chipText).not.toContain('abandon');
  });
});
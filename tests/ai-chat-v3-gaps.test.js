/**
 * v3 接入遗留缺口的回归防线
 *
 * 这批用例针对的是"只有声明、没有落地"的隐性未完成项：
 *   - 语音气泡的元数据被 _storeHistory 静默丢弃（形参只有 3 个），刷新后退化成空白气泡
 *   - 语音发送走了 _appendVoice + ask，同一次发言变成两条用户气泡
 *   - 历史栏长按只加 is-confirm 类名，确认条根本没有渲染进 DOM
 *   - 确认条没有点击分支；长按抬手的 click 会直接切走会话
 *   - 删除"当前对话"时占位 id 'current' 匹配不到，弹了"已删除"却什么都没删
 *   - 实时对话从不插入日期分隔（_maybeDaySep 没人调用）
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setupGlobals } from './helpers/mocks.js';

let ls;
let store;

beforeEach(async () => {
  ls = setupGlobals();
  ls._reset();
  store = {};

  globalThis.DataStore = {
    getProgress: vi.fn((key, fallback) => (key in store ? store[key] : fallback)),
    setProgress: vi.fn((key, value) => { store[key] = value; }),
    getDefaultWords: vi.fn(() => ({
      categories: [{
        words: [
          { word: 'apple', phonetic: '/ˈæpl/', pos: 'n.', chinese: '苹果', example: 'I eat an apple.' },
          { word: 'happy', phonetic: '/ˈæpi/', pos: 'adj.', chinese: '快乐的' },
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

  document.body.innerHTML = `
    <div id="ai-chat-msgs"></div>
    <input id="ai-chat-input" />
    <button id="ai-chat-send"></button>
    <div id="ai-chat-chips"></div>
    <div id="ai-hist-list"></div>
    <input id="search-input" />
  `;

  vi.resetModules();
  await import('../js/ai-chat.js');
});

function makeChat() {
  return new globalThis.AiChatModule();
}
const userBubbles = () => document.querySelectorAll('#ai-chat-msgs .ai-msg-user').length;
const daySeps = () => document.querySelectorAll('#ai-chat-msgs .ai-day-sep').length;

// 直接驱动目标实例的委托方法，而不是 dispatch 到 document：
// 每个用例都会重新 import 并向同一个 jsdom document 再挂一个 click 委托，
// 叠加的旧实例会先处理同一次点击（先收起确认条），让后一个实例走到"切换会话"分支，
// 从而掩盖被测分支本身的行为。
function delegate(chat, el) {
  chat._onDocClick({ target: el, stopPropagation() {} });
}

describe('语音气泡 — 元数据落盘与恢复', () => {
  it('should_store_voice_meta_in_history', () => {
    const chat = makeChat();
    chat._appendVoice('0:03', 'hello world');
    const h = store['ai_chat_history'];
    expect(Array.isArray(h)).toBe(true);
    const last = h[h.length - 1];
    expect(last.role).toBe('user');
    expect(last.voice).toEqual({ dur: '0:03', transcript: 'hello world' });
  });

  it('should_restore_voice_bubble_after_reload', () => {
    const chat = makeChat();
    chat._appendVoice('0:04', 'good morning');
    // 重新构造 = 模拟刷新：_welcome 负责把历史恢复成气泡
    makeChat();
    const voice = document.querySelectorAll('#ai-chat-msgs .ai-msg-voice');
    expect(voice.length).toBe(1);
    expect(document.querySelector('#ai-chat-msgs .ai-voice-dur').textContent).toBe('0:04');
    expect(document.querySelector('#ai-chat-msgs .ai-voice-tr').textContent).toBe('good morning');
  });
});

describe('语音发送 — 不重复产生用户气泡', () => {
  it('should_not_duplicate_user_bubble_when_skipUser', () => {
    const chat = makeChat();
    chat._appendVoice('0:02', 'hi');
    const before = userBubbles();
    chat.ask('hi', { skipUser: true });
    expect(userBubbles()).toBe(before); // 语音气泡已经是这一轮的用户发言
  });

  it('should_add_user_bubble_for_normal_text_ask', () => {
    const chat = makeChat();
    const before = userBubbles();
    chat.ask('你好');
    expect(userBubbles()).toBe(before + 1);
  });
});

describe('日期分隔', () => {
  it('should_insert_once_per_day', () => {
    const chat = makeChat();
    expect(daySeps()).toBe(0);
    chat.ask('你好');
    expect(daySeps()).toBe(1);
    chat.ask('帮助');
    expect(daySeps()).toBe(1); // 同一天不重复插
  });

  it('should_insert_before_voice_bubble', () => {
    const chat = makeChat();
    chat._appendVoice('0:02', 'hi');
    expect(daySeps()).toBe(1);
  });
});

describe('历史栏 — 长按删除确认条', () => {
  it('should_render_confirm_bar_and_mark_current', () => {
    const chat = makeChat();
    chat._renderHistory();
    const item = document.querySelector('.ai-hist-item');
    expect(item).toBeTruthy();
    expect(item.classList.contains('is-current')).toBe(true);
    expect(item.querySelector('.ai-hist-confirm .ai-hc-yes')).toBeTruthy();
    expect(item.querySelector('.ai-hist-confirm .ai-hc-no')).toBeTruthy();
  });

  it('should_delete_session_when_confirm_yes_clicked', () => {
    const chat = makeChat();
    chat._sessionId = 's1';
    store['ai_chat_sessions'] = [{ id: 's1', title: '旧对话', ts: Date.now(), msgs: [] }];
    chat._renderHistory();
    const item = document.querySelector('.ai-hist-item');
    item.classList.add('is-confirm');
    delegate(chat, item.querySelector('.ai-hc-yes'));
    expect(store['ai_chat_sessions'].some((s) => s.id === 's1')).toBe(false);
  });

  it('should_dismiss_without_deleting_when_confirm_no_clicked', () => {
    const chat = makeChat();
    chat._sessionId = 's1';
    store['ai_chat_sessions'] = [{ id: 's1', title: '旧对话', ts: Date.now(), msgs: [] }];
    chat._renderHistory();
    const item = document.querySelector('.ai-hist-item');
    item.classList.add('is-confirm');
    delegate(chat, item.querySelector('.ai-hc-no'));
    expect(store['ai_chat_sessions'].some((s) => s.id === 's1')).toBe(true);
    expect(item.classList.contains('is-confirm')).toBe(false);
  });

  it('should_not_switch_session_while_confirm_bar_is_open', () => {
    const chat = makeChat();
    const spy = vi.spyOn(chat, '_loadSession');
    chat._renderHistory();
    const item = document.querySelector('.ai-hist-item');
    item.classList.add('is-confirm');
    delegate(chat, item.querySelector('.ai-hist-main'));
    expect(spy).not.toHaveBeenCalled();          // 确认条展开时点主体 = 收起
    expect(item.classList.contains('is-confirm')).toBe(false);
  });
});

describe('删除当前对话 — 占位 id 归一化', () => {
  it('should_clear_history_when_deleting_placeholder_current', () => {
    const chat = makeChat();
    chat._sessionId = null;
    chat._append('user', 'abc');
    expect(store['ai_chat_history'].length).toBeGreaterThan(0);
    chat._deleteSession('current');
    expect(store['ai_chat_history']).toEqual([]);
  });
});

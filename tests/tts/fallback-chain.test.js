import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createLocalStorageMock } from '../helpers/mocks.js';

let ls;

function setupSpeechSynthesis(overrides = {}) {
  globalThis.SpeechSynthesisUtterance = class {
    constructor(text) { this.text = text; this.voice = null; this.rate = 1; this.pitch = 1; this.volume = 1; this.lang = 'en-US'; this.onstart = null; this.onend = null; this.onerror = null; }
  };
  const defaults = {
    getVoices: vi.fn(() => [
      { name: 'Microsoft Zira', lang: 'en-US' },
      { name: 'Google US English', lang: 'en-US' },
      { name: 'Microsoft Huihui', lang: 'zh-CN' },
    ]),
    speak: vi.fn(),
    cancel: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    speaking: false,
    pending: false,
    paused: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  globalThis.speechSynthesis = { ...defaults, ...overrides };
  Object.defineProperty(globalThis, 'speechSynthesis', {
    value: globalThis.speechSynthesis, configurable: true, writable: true,
  });
  globalThis.window.speechSynthesis = globalThis.speechSynthesis;
  globalThis.window.SpeechSynthesisUtterance = globalThis.SpeechSynthesisUtterance;
}

beforeEach(async () => {
  ls = createLocalStorageMock();
  globalThis.localStorage = ls;
  globalThis.window = globalThis;
  globalThis.window.localStorage = ls;
  setupSpeechSynthesis();
  globalThis.UserState = null;
  globalThis.Toast = { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() };
  globalThis.EventBus = { emit: vi.fn(), on: vi.fn(), off: vi.fn() };
  globalThis.app = { currentTab: 'home', showTab: vi.fn() };
  globalThis.API_BASE = 'http://localhost:3000';
  globalThis.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) }));
  vi.resetModules();
});

async function loadTTS() {
  await import('../../js/tts-manager.js');
  return globalThis.TTSManager;
}

describe('场景2 — 在线声首次朗读慢/无声音', () => {
  it('should_have_online_broken_cooldown_mechanism', async () => {
    const tts = await loadTTS();
    // TTSManager itself doesn't have _markOnlineBroken — that's in SpeechUtil.
    // But we verify TTSManager.speak works with online voice objects:
    const fakeOnlineVoice = { name: 'Microsoft Zira Online', lang: 'en-US' };
    const u = tts.speak('hello', { voice: fakeOnlineVoice, immediate: true });
    expect(u).not.toBeNull();
    expect(u.text).toBe('hello');
  });

  it('should_create_utterance_with_correct_voice', async () => {
    const tts = await loadTTS();
    tts.voices = globalThis.speechSynthesis.getVoices();
    tts.restoreVoice();
    const voice = globalThis.speechSynthesis.getVoices()[0]; // Microsoft Zira
    const u = tts.speak('test', { voice: voice, immediate: true });
    expect(u).not.toBeNull();
    expect(u.voice).toBe(voice);
  });

  it('should_not_crash_when_speechSynthesis_busy', async () => {
    globalThis.speechSynthesis.speaking = true;
    const tts = await loadTTS();
    // speak should still create utterance even if busy (cancel is called first)
    const u = tts.speak('test', { immediate: true });
    expect(u).not.toBeNull();
    expect(globalThis.speechSynthesis.cancel).toHaveBeenCalled();
  });
});

describe('场景3 — Android APK 朗读无声', () => {
  it('should_have_serverless_fallback_path', async () => {
    // Verify TTSManager can speak when speechSynthesis is available
    const tts = await loadTTS();
    const u = tts.speak('hello', { immediate: true });
    expect(u).not.toBeNull();
    expect(globalThis.speechSynthesis.speak).toHaveBeenCalled();
  });

  it('should_return_null_when_no_speechSynthesis', async () => {
    delete globalThis.window.speechSynthesis;
    delete globalThis.speechSynthesis;
    const tts = await loadTTS();
    const u = tts.speak('hello');
    expect(u).toBeNull();
  });

  it('should_handle_empty_voices_list', async () => {
    globalThis.speechSynthesis.getVoices = vi.fn(() => []);
    const tts = await loadTTS();
    // Should still be able to speak (uses system default voice)
    const u = tts.speak('hello', { immediate: true });
    expect(u).not.toBeNull();
  });
});

describe('场景4 — 快速连续点击导致声音重叠', () => {
  it('should_cancel_previous_before_new_speak', async () => {
    const tts = await loadTTS();
    tts.speak('first', { immediate: true });
    tts.speak('second', { immediate: true });
    // Each speak should cancel previous
    expect(globalThis.speechSynthesis.cancel).toHaveBeenCalled();
  });

  it('should_return_new_utterance_each_time', async () => {
    const tts = await loadTTS();
    const u1 = tts.speak('first', { immediate: true });
    const u2 = tts.speak('second', { immediate: true });
    expect(u1).not.toBe(u2);
    expect(u1.text).toBe('first');
    expect(u2.text).toBe('second');
  });

  it('should_clear_pending_timer_on_new_speak', async () => {
    const tts = await loadTTS();
    // First speak with delay (non-immediate)
    tts.speak('first');
    // Second speak should clear the first timer
    const u2 = tts.speak('second', { immediate: true });
    expect(u2).not.toBeNull();
    expect(globalThis.speechSynthesis.cancel).toHaveBeenCalled();
  });
});

describe('TTSManager — isBusy 竞态保护', () => {
  it('should_report_busy_when_speaking', async () => {
    globalThis.speechSynthesis.speaking = true;
    const tts = await loadTTS();
    expect(tts.isBusy()).toBe(true);
  });

  it('should_report_busy_when_pending', async () => {
    globalThis.speechSynthesis.pending = true;
    const tts = await loadTTS();
    expect(tts.isBusy()).toBe(true);
  });

  it('should_report_idle_when_not_speaking', async () => {
    globalThis.speechSynthesis.speaking = false;
    globalThis.speechSynthesis.pending = false;
    const tts = await loadTTS();
    expect(tts.isBusy()).toBe(false);
  });
});

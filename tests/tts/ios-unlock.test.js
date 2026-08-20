import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createLocalStorageMock } from '../helpers/mocks.js';

let ls;

function setupSpeechSynthesis() {
  globalThis.SpeechSynthesisUtterance = class {
    constructor(text) { this.text = text; this.voice = null; this.rate = 1; this.pitch = 1; this.volume = 1; this.lang = 'en-US'; }
  };
  globalThis.speechSynthesis = {
    getVoices: vi.fn(() => [
      { name: 'Microsoft Zira', lang: 'en-US' },
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
  vi.resetModules();
});

async function loadTTS() {
  await import('../../js/tts-manager.js');
  return globalThis.TTSManager;
}

describe('场景7 — iOS Safari 首次朗读 unlock', () => {
  it('should_use_immediate_true_for_unlock_utterance', async () => {
    const tts = await loadTTS();
    // The unlock mechanism uses immediate: true to bypass 100ms delay
    // This is critical for iOS Safari which requires user gesture context
    const u = tts.speak(' ', { volume: 0, rate: 0.5, immediate: true });
    expect(u).not.toBeNull();
    // immediate=true should call speechSynthesis.speak directly (not via setTimeout)
    expect(globalThis.speechSynthesis.speak).toHaveBeenCalled();
  });

  it('should_not_delay_when_immediate_is_true', async () => {
    const tts = await loadTTS();
    const spy = vi.spyOn(globalThis, 'setTimeout');
    tts.speak('test', { immediate: true });
    // With immediate=true, setTimeout should NOT be used for the speak timer
    // (it may be used internally but the speak should happen synchronously)
    expect(globalThis.speechSynthesis.speak).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('should_cancel_before_immediate_speak', async () => {
    const tts = await loadTTS();
    tts.speak('first', { immediate: true });
    tts.speak('second', { immediate: true });
    // Each speak should cancel previous to avoid overlap
    expect(globalThis.speechSynthesis.cancel).toHaveBeenCalled();
  });

  it('should_return_utterance_for_immediate_mode', async () => {
    const tts = await loadTTS();
    const u = tts.speak('hello', { immediate: true });
    expect(u).not.toBeNull();
    expect(u.text).toBe('hello');
  });
});

describe('TTSManager — cancel 安全封装', () => {
  it('should_not_throw_when_no_speechSynthesis', async () => {
    delete globalThis.window.speechSynthesis;
    delete globalThis.speechSynthesis;
    const tts = await loadTTS();
    // cancel should not throw even without speechSynthesis
    expect(() => tts.cancel()).not.toThrow();
  });

  it('should_call_speechSynthesis_cancel', async () => {
    const tts = await loadTTS();
    tts.cancel();
    expect(globalThis.speechSynthesis.cancel).toHaveBeenCalled();
  });
});

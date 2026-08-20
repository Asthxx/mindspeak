import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createLocalStorageMock } from '../helpers/mocks.js';

let ls;

function setupSpeechSynthesis() {
  globalThis.SpeechSynthesisUtterance = class {
    constructor(text) { this.text = text; this.voice = null; this.rate = 1; this.pitch = 1; this.volume = 1; this.lang = 'en-US'; this.onstart = null; this.onend = null; this.onerror = null; }
  };
  globalThis.speechSynthesis = {
    getVoices: vi.fn(() => [
      { name: 'Microsoft Zira', lang: 'en-US' },
      { name: 'Google US English', lang: 'en-US' },
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
  globalThis.XMLHttpRequest = class {
    open() {}
    send() {}
    setRequestHeader() {}
  };
  vi.resetModules();
});

async function loadTTS() {
  await import('../../js/tts-manager.js');
  return globalThis.TTSManager;
}

describe('场景6 — 字母朗读不应输出 "Letter A"', () => {
  it('should_speak_bare_letter_not_prefixed', async () => {
    const tts = await loadTTS();
    // TTSManager.speak with letter text should use the bare letter
    const u = tts.speak('A', { immediate: true });
    expect(u).not.toBeNull();
    expect(u.text).toBe('A');
    // Must NOT be "Letter A"
    expect(u.text).not.toContain('Letter');
  });

  it('should_speak_lowercase_letter', async () => {
    const tts = await loadTTS();
    const u = tts.speak('a', { immediate: true });
    expect(u).not.toBeNull();
    expect(u.text).toBe('a');
    expect(u.text).not.toContain('Letter');
  });

  it('should_not_modify_letter_text_in_createUtterance', async () => {
    const tts = await loadTTS();
    const u = tts.createUtterance('Z');
    expect(u.text).toBe('Z');
    expect(u.text).not.toContain('Letter');
  });

  it('should_handle_all_26_letters', async () => {
    const tts = await loadTTS();
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (const letter of letters) {
      const u = tts.createUtterance(letter);
      expect(u.text).toBe(letter);
      expect(u.text).not.toContain('Letter');
    }
  });
});

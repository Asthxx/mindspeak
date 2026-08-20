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

describe('场景1 — 声音选择后不生效（Stale Cache Bug）', () => {
  it('should_use_new_voice_after_setVoice_without_settings_page', async () => {
    const tts = await loadTTS();
    tts.voices = globalThis.speechSynthesis.getVoices();
    tts.restoreVoice();

    // Simulate: user calls setVoice directly (not through settings page)
    tts.setVoice('Google US English');

    // The bug: TTSManager.voice changed, but if SpeechUtil._settings is cached,
    // getSettings().voiceName still returns the old value.
    // We verify that TTSManager.setVoice actually persists to tts_voice:
    expect(ls.getItem('tts_voice')).toBe('Google US English');

    // Now verify that the persisted value can be restored:
    const tts2 = await loadTTS();
    tts2.voices = globalThis.speechSynthesis.getVoices();
    tts2.restoreVoice();
    expect(tts2.voice).not.toBeNull();
    expect(tts2.voice.name).toBe('Google US English');
  });

  it('should_persist_voice_across_multiple_setVoice_calls', async () => {
    const tts = await loadTTS();
    tts.voices = globalThis.speechSynthesis.getVoices();

    tts.setVoice('Microsoft Zira');
    expect(ls.getItem('tts_voice')).toBe('Microsoft Zira');

    tts.setVoice('Google US English');
    expect(ls.getItem('tts_voice')).toBe('Google US English');

    tts.setVoice('Microsoft Zira');
    expect(ls.getItem('tts_voice')).toBe('Microsoft Zira');
  });

  it('should_sync_selectedVoice_and_tts_voice_keys', async () => {
    const tts = await loadTTS();
    tts.voices = globalThis.speechSynthesis.getVoices();

    tts.setVoice('Microsoft Zira');
    expect(ls.getItem('tts_voice')).toBe('Microsoft Zira');
    expect(ls.getItem('selectedVoice')).toBe('Microsoft Zira');

    tts.setVoice('Google US English');
    expect(ls.getItem('tts_voice')).toBe('Google US English');
    expect(ls.getItem('selectedVoice')).toBe('Google US English');
  });
});

describe('场景5 — 切换页面后朗读参数丢失', () => {
  it('should_keep_rate_persisted_after_init', async () => {
    ls.setItem('voice_rate', '1.5');
    const tts = await loadTTS();
    expect(tts.rate).toBe(1.5);
  });

  it('should_keep_pitch_persisted_after_init', async () => {
    ls.setItem('voice_pitch', '1.2');
    const tts = await loadTTS();
    expect(tts.pitch).toBe(1.2);
  });

  it('should_restore_rate_and_pitch_from_localStorage', async () => {
    ls.setItem('voice_rate', '2.0');
    ls.setItem('voice_pitch', '0.8');
    const tts = await loadTTS();
    expect(tts.rate).toBe(2.0);
    expect(tts.pitch).toBe(0.8);
  });
});

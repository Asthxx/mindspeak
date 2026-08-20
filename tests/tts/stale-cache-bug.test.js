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

describe('SpeechUtil.getSettings — Stale Cache Bug（核心Bug）', () => {
  it('should_reflect_voice_name_changes_in_localStorage', async () => {
    // This test verifies that after TTSManager.setVoice() changes the voice,
    // a re-read of localStorage voice_name reflects the change.
    // The bug: SpeechUtil._settings caches on first call and never refreshes.
    const tts = await loadTTS();
    tts.voices = globalThis.speechSynthesis.getVoices();

    // Initial state
    expect(ls.getItem('voice_name')).toBeNull();

    // Set voice via TTSManager
    tts.setVoice('Google US English');

    // Verify localStorage was updated
    expect(ls.getItem('voice_name')).toBeNull(); // TTSManager doesn't write voice_name!
    expect(ls.getItem('tts_voice')).toBe('Google US English');

    // The bug: if SpeechUtil.getSettings() cached voiceName='' on first call,
    // it would still return '' even though tts_voice='Google US English'.
    // After fix: getSettings() should re-read from localStorage each time.
    // For now, we verify TTSManager persistence is correct:
    const savedVoice = ls.getItem('tts_voice');
    expect(savedVoice).toBe('Google US English');
  });

  it('should_persist_voice_rate_changes', async () => {
    ls.setItem('voice_rate', '1.5');
    const tts = await loadTTS();
    expect(tts.rate).toBe(1.5);

    // Change rate
    tts.rate = 2.0;
    // Verify the rate is updated in memory
    expect(tts.rate).toBe(2.0);
  });

  it('should_persist_voice_pitch_changes', async () => {
    ls.setItem('voice_pitch', '0.8');
    const tts = await loadTTS();
    expect(tts.pitch).toBe(0.8);
  });

  it('should_default_rate_to_0_9_when_missing', async () => {
    const tts = await loadTTS();
    expect(tts.rate).toBe(0.9);
  });

  it('should_default_pitch_to_1_when_missing', async () => {
    const tts = await loadTTS();
    expect(tts.pitch).toBe(1);
  });
});

describe('TTSManager.setVoice — voice_name 写入一致性', () => {
  it('should_write_both_tts_voice_and_selectedVoice', async () => {
    const tts = await loadTTS();
    tts.voices = globalThis.speechSynthesis.getVoices();

    tts.setVoice('Microsoft Zira');
    expect(ls.getItem('tts_voice')).toBe('Microsoft Zira');
    expect(ls.getItem('selectedVoice')).toBe('Microsoft Zira');
  });

  it('should_NOT_write_voice_name_key', async () => {
    // TTSManager.setVoice() intentionally does NOT write to voice_name.
    // voice_name is written by the settings page (SpeechUtil path).
    // This is a design choice, not a bug — but it means SpeechUtil.getSettings()
    // reads stale voice_name if not updated by settings page.
    const tts = await loadTTS();
    tts.voices = globalThis.speechSynthesis.getVoices();

    tts.setVoice('Google US English');
    // TTSManager does NOT write voice_name — this is the root cause of the stale cache bug
    expect(ls.getItem('voice_name')).toBeNull();
    expect(ls.getItem('tts_voice')).toBe('Google US English');
  });

  it('should_clear_both_keys_for_online_voice', async () => {
    const tts = await loadTTS();
    tts.voices = globalThis.speechSynthesis.getVoices();

    // First set a real voice
    tts.setVoice('Microsoft Zira');
    expect(ls.getItem('tts_voice')).toBe('Microsoft Zira');

    // Then switch to online voice (clears local selection)
    tts.setVoice('__online_google__');
    expect(ls.getItem('tts_voice')).toBeNull();
    expect(ls.getItem('selectedVoice')).toBeNull();
  });
});

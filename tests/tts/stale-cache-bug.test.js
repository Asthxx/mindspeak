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

describe('SpeechUtil.getSettings - Stale Cache Bug', () => {
  it('should_reflect_voice_name_changes_in_localStorage', async () => {
    const tts = await loadTTS();
    tts.voices = globalThis.speechSynthesis.getVoices();

    expect(ls.getItem('voice_name')).toBeNull();

    tts.setVoice('Google US English');

    expect(ls.getItem('voice_name')).toBeNull();
    expect(ls.getItem('tts_voice')).toBe('Google US English');

    const savedVoice = ls.getItem('tts_voice');
    expect(savedVoice).toBe('Google US English');
  });

  it('should_persist_voice_rate_changes', async () => {
    ls.setItem('voice_rate', '1.5');
    const tts = await loadTTS();
    expect(tts.rate).toBe(1.5);

    tts.rate = 2.0;
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

describe('TTSManager.setVoice - voice_name persistence', () => {
  it('should_write_both_tts_voice_and_selectedVoice', async () => {
    const tts = await loadTTS();
    tts.voices = globalThis.speechSynthesis.getVoices();

    tts.setVoice('Microsoft Zira');
    expect(ls.getItem('tts_voice')).toBe('Microsoft Zira');
    expect(ls.getItem('selectedVoice')).toBe('Microsoft Zira');
  });

  it('should_NOT_write_voice_name_key', async () => {
    const tts = await loadTTS();
    tts.voices = globalThis.speechSynthesis.getVoices();

    tts.setVoice('Google US English');
    expect(ls.getItem('voice_name')).toBeNull();
    expect(ls.getItem('tts_voice')).toBe('Google US English');
  });

  it('should_persist_online_voice_name_for_routing', async () => {
    const tts = await loadTTS();
    tts.voices = globalThis.speechSynthesis.getVoices();

    tts.setVoice('Microsoft Zira');
    expect(ls.getItem('tts_voice')).toBe('Microsoft Zira');

    // Online voice: name persisted for TTSManager.speak() routing, voice object cleared
    tts.setVoice('__online_google__');
    expect(ls.getItem('tts_voice')).toBe('__online_google__');
    expect(ls.getItem('selectedVoice')).toBe('__online_google__');
    expect(tts.voice).toBeNull();
  });
});

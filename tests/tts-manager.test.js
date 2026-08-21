import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setupGlobals } from './helpers/mocks.js';

let ls;

beforeEach(async () => {
  ls = setupGlobals();
  ls._reset();

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

  globalThis.UserState = null;
  globalThis.Toast = { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() };
  globalThis.EventBus = { emit: vi.fn(), on: vi.fn(), off: vi.fn() };
  globalThis.app = { currentTab: 'home', showTab: vi.fn() };

  vi.resetModules();
  await import('../js/tts-manager.js');
});

describe('TTSManager — 声音恢复', () => {
  it('should_restore_voice_from_tts_voice_key', () => {
    localStorage.setItem('tts_voice', 'Microsoft Zira');
    var tts = globalThis.TTSManager;
    tts.voices = globalThis.speechSynthesis.getVoices();
    tts.restoreVoice();
    expect(tts.voice).not.toBeNull();
    expect(tts.voice.name).toBe('Microsoft Zira');
  });

  it('should_fallback_to_auto_pick_when_saved_not_found', () => {
    localStorage.setItem('tts_voice', 'NonExistentVoice');
    var tts = globalThis.TTSManager;
    tts.voices = globalThis.speechSynthesis.getVoices();
    tts.restoreVoice();
    expect(tts.voice).not.toBeNull();
  });

  it('should_ignore_online_voice_keys', () => {
    localStorage.setItem('tts_voice', '__online_google__');
    var tts = globalThis.TTSManager;
    tts.voices = globalThis.speechSynthesis.getVoices();
    tts.restoreVoice();
    expect(tts.voice === null || (tts.voice && tts.voice.name !== '__online_google__')).toBe(true);
  });
});

describe('TTSManager — setVoice', () => {
  it('should_set_voice_and_persist', () => {
    var tts = globalThis.TTSManager;
    tts.voices = globalThis.speechSynthesis.getVoices();
    var result = tts.setVoice('Google US English');
    expect(result).toBe(true);
    expect(tts.voice.name).toBe('Google US English');
    expect(localStorage.getItem('tts_voice')).toBe('Google US English');
  });

  it('should_return_false_for_unknown_voice', () => {
    var tts = globalThis.TTSManager;
    tts.voices = globalThis.speechSynthesis.getVoices();
    var result = tts.setVoice('NonExistentVoice');
    expect(result).toBe(false);
  });

  it('should_clear_voice_for_online_key', () => {
    var tts = globalThis.TTSManager;
    tts.voices = globalThis.speechSynthesis.getVoices();
    tts.setVoice('Microsoft Zira');
    var result = tts.setVoice('__online_google__');
    expect(result).toBe(false);
    expect(tts.voice).toBeNull();
    // 新行为：在线音色名称持久化到 localStorage（供 TTSManager.speak 路由），不再清除
    expect(localStorage.getItem('tts_voice')).toBe('__online_google__');
  });
});

describe('TTSManager — applyVoice', () => {
  it('should_apply_voice_rate_pitch_volume', () => {
    var tts = globalThis.TTSManager;
    var u = new SpeechSynthesisUtterance('test');
    tts.applyVoice(u, {});
    expect(u.rate).toBe(tts.rate);
    expect(u.pitch).toBe(tts.pitch);
    expect(u.volume).toBe(tts.volume);
  });

  it('should_override_with_opts', () => {
    var tts = globalThis.TTSManager;
    var u = new SpeechSynthesisUtterance('test');
    tts.applyVoice(u, { rate: 2.0, pitch: 0.5, volume: 0.8 });
    expect(u.rate).toBe(2.0);
    expect(u.pitch).toBe(0.5);
    expect(u.volume).toBe(0.8);
  });

  it('should_set_lang_from_voice', () => {
    var tts = globalThis.TTSManager;
    tts.voice = { name: 'Test', lang: 'en-GB' };
    var u = new SpeechSynthesisUtterance('test');
    tts.applyVoice(u, {});
    expect(u.lang).toBe('en-GB');
  });
});

describe('TTSManager — isBusy', () => {
  it('should_return_false_when_not_speaking', () => {
    var tts = globalThis.TTSManager;
    globalThis.speechSynthesis.speaking = false;
    globalThis.speechSynthesis.pending = false;
    expect(tts.isBusy()).toBe(false);
  });

  it('should_return_true_when_speaking', () => {
    var tts = globalThis.TTSManager;
    globalThis.speechSynthesis.speaking = true;
    expect(tts.isBusy()).toBe(true);
  });

  it('should_return_true_when_pending', () => {
    var tts = globalThis.TTSManager;
    globalThis.speechSynthesis.pending = true;
    expect(tts.isBusy()).toBe(true);
  });
});

describe('TTSManager — speak', () => {
  it('should_return_utterance', () => {
    var tts = globalThis.TTSManager;
    var u = tts.speak('hello', { immediate: true });
    expect(u).not.toBeNull();
    expect(u.text).toBe('hello');
  });

  it('should_call_speech_synthesis_speak', () => {
    var tts = globalThis.TTSManager;
    tts.speak('hello', { immediate: true });
    expect(globalThis.speechSynthesis.speak).toHaveBeenCalled();
  });

  it('should_return_null_when_no_speech_synthesis', () => {
    var saved = globalThis.window.speechSynthesis;
    delete globalThis.window.speechSynthesis;
    delete globalThis.speechSynthesis;
    var tts = globalThis.TTSManager;
    var result = tts.speak('hello');
    expect(result).toBeNull();
    globalThis.speechSynthesis = saved;
    globalThis.window.speechSynthesis = saved;
  });
});

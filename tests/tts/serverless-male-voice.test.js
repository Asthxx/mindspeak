import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createLocalStorageMock } from '../helpers/mocks.js';

let ls;

function setupSpeechSynthesis() {
  globalThis.SpeechSynthesisUtterance = class {
    constructor(text) { this.text = text; this.voice = null; this.rate = 1; this.pitch = 1; this.volume = 1; this.lang = 'en-US'; }
  };
  globalThis.speechSynthesis = {
    getVoices: vi.fn(() => [
      { name: 'Microsoft David', lang: 'en-US' },
      { name: 'Microsoft Zira', lang: 'en-US' },
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

function setupSpeechUtil(serverDown) {
  globalThis.SpeechUtil = {
    _serverDown: serverDown,
    _speakServerless: vi.fn(),
    _speakLocal: vi.fn(),
    _speakGoogleTTS: vi.fn(),
    _speakTTSOnline: vi.fn(),
    _stopLocalAudio: vi.fn(),
    _attachAudioEl: vi.fn(),
    _detachAudioEl: vi.fn(),
    _localAudio: null,
  };
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
  await import('../../js/tts-manager.js');
});

describe('网页版（无 server）选择男声', () => {
  it('should_use_system_male_voice_for_edge_guy_when_server_down', () => {
    setupSpeechUtil(true);
    ls.setItem('tts_voice', '__online_edge_us_guy__');
    var tts = globalThis.TTSManager;
    tts.voices = globalThis.speechSynthesis.getVoices();
    tts.speak('hello', { immediate: true });
    expect(globalThis.SpeechUtil._speakServerless).not.toHaveBeenCalled();
    expect(globalThis.speechSynthesis.speak).toHaveBeenCalled();
    var u = globalThis.speechSynthesis.speak.mock.calls[0][0];
    expect(u.voice && u.voice.name).toBe('Microsoft David');
  });

  it('should_use_system_male_voice_for_local_david_when_server_down', () => {
    setupSpeechUtil(true);
    ls.setItem('tts_voice', '__local_david__');
    var tts = globalThis.TTSManager;
    tts.voices = globalThis.speechSynthesis.getVoices();
    tts.speak('hello', { immediate: true });
    expect(globalThis.SpeechUtil._speakLocal).not.toHaveBeenCalled();
    expect(globalThis.speechSynthesis.speak).toHaveBeenCalled();
    var u = globalThis.speechSynthesis.speak.mock.calls[0][0];
    expect(u.voice && u.voice.name).toBe('Microsoft David');
  });

  it('should_use_system_male_voice_for_piper_lessac_when_server_down', () => {
    setupSpeechUtil(true);
    ls.setItem('tts_voice', '__local_piper_us_lessac__');
    var tts = globalThis.TTSManager;
    tts.voices = globalThis.speechSynthesis.getVoices();
    tts.speak('hello', { immediate: true });
    expect(globalThis.speechSynthesis.speak).toHaveBeenCalled();
    var u = globalThis.speechSynthesis.speak.mock.calls[0][0];
    expect(u.voice && u.voice.name).toBe('Microsoft David');
  });

  it('should_not_intercept_female_online_voice_when_server_down', () => {
    setupSpeechUtil(true);
    ls.setItem('tts_voice', '__online_edge_us_jenny__');
    var tts = globalThis.TTSManager;
    tts.voices = globalThis.speechSynthesis.getVoices();
    tts.speak('hello', { immediate: true });
    expect(globalThis.SpeechUtil._speakServerless).toHaveBeenCalled();
  });

  it('should_keep_local_david_route_when_server_available', () => {
    setupSpeechUtil(false);
    ls.setItem('tts_voice', '__local_david__');
    var tts = globalThis.TTSManager;
    tts.voices = globalThis.speechSynthesis.getVoices();
    tts.speak('hello', { immediate: true });
    expect(globalThis.SpeechUtil._speakLocal).toHaveBeenCalled();
  });

  it('should_fall_through_when_no_system_male_voice_available', () => {
    setupSpeechUtil(true);
    globalThis.speechSynthesis.getVoices = vi.fn(() => [
      { name: 'Microsoft Zira', lang: 'en-US' },
      { name: 'Microsoft Huihui', lang: 'zh-CN' },
    ]);
    ls.setItem('tts_voice', '__online_edge_us_guy__');
    var tts = globalThis.TTSManager;
    tts.voices = globalThis.speechSynthesis.getVoices();
    tts.speak('hello', { immediate: true });
    expect(globalThis.SpeechUtil._speakServerless).toHaveBeenCalled();
  });
});
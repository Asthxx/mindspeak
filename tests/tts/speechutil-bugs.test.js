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
  globalThis.window.Env = { getLocalBase: () => 'http://localhost:3000' };
  vi.resetModules();
  await import('../../js/tts-manager.js');
  await import('../../js/app.js');
});

describe('SpeechUtil.getSettings — Stale Cache Bug（核心Bug验证）', () => {
  it('should_return_fresh_voiceName_after_localStorage_change', () => {
    // BUG: Old code cached _settings on first call, never refreshed.
    // After fix: getSettings() re-reads from localStorage each time.
    const su = globalThis.SpeechUtil;
    expect(su).toBeDefined();

    // First call: voice_name is empty
    const s1 = su.getSettings();
    expect(s1.voiceName).toBe('');

    // Simulate settings page writing voice_name
    ls.setItem('voice_name', 'Google US English');

    // Second call: should return the NEW value, not cached old value
    const s2 = su.getSettings();
    expect(s2.voiceName).toBe('Google US English');
  });

  it('should_return_fresh_rate_after_localStorage_change', () => {
    const su = globalThis.SpeechUtil;
    ls.setItem('voice_rate', '1.5');
    const s = su.getSettings();
    expect(s.rate).toBe(1.5);

    ls.setItem('voice_rate', '2.0');
    const s2 = su.getSettings();
    expect(s2.rate).toBe(2.0);
  });

  it('should_return_fresh_pitch_after_localStorage_change', () => {
    const su = globalThis.SpeechUtil;
    ls.setItem('voice_pitch', '0.8');
    const s = su.getSettings();
    expect(s.pitch).toBe(0.8);

    ls.setItem('voice_pitch', '1.5');
    const s2 = su.getSettings();
    expect(s2.pitch).toBe(1.5);
  });

  it('should_return_fresh_instant_after_localStorage_change', () => {
    const su = globalThis.SpeechUtil;
    // Set serverDown so instant defaults to false
    su._serverDown = true;
    ls.setItem('voice_instant', '1');
    const s = su.getSettings();
    expect(s.instant).toBe(true);

    ls.setItem('voice_instant', '0');
    const s2 = su.getSettings();
    expect(s2.instant).toBe(false);
  });

  it('should_default_rate_to_0_9_when_missing', () => {
    const su = globalThis.SpeechUtil;
    const s = su.getSettings();
    expect(s.rate).toBe(0.9);
  });

  it('should_default_pitch_to_1_when_missing', () => {
    const su = globalThis.SpeechUtil;
    const s = su.getSettings();
    expect(s.pitch).toBe(1);
  });
});

describe('SpeechUtil._probeServer — Android Capacitor 检测', () => {
  it('should_set_serverDown_when_Capacitor_global_exists', () => {
    const su = globalThis.SpeechUtil;
    // Simulate Capacitor v3+ environment
    globalThis.window.Capacitor = { isNative: true };
    su._probedServer = false;
    su._probeServer();
    expect(su._serverDown).toBe(true);
    delete globalThis.window.Capacitor;
  });

  it('should_set_serverDown_when_Android_UA_detected', () => {
    const su = globalThis.SpeechUtil;
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36',
      configurable: true, writable: true,
    });
    su._probedServer = false;
    su._probeServer();
    expect(su._serverDown).toBe(true);
  });

  it('should_NOT_set_serverDown_on_desktop_without_Capacitor', async () => {
    const su = globalThis.SpeechUtil;
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      configurable: true, writable: true,
    });
    su._probedServer = false;
    // Mock fetch to return ok:true (server is running)
    globalThis.fetch = vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    }));
    su._probeServer();
    // Wait for async probe
    await new Promise(r => setTimeout(r, 100));
    expect(su._serverDown).toBe(false);
  });
});

describe('SpeechUtil — 更新设置后即时生效', () => {
  it('should_reflect_voiceName_after_updateSettings', () => {
    const su = globalThis.SpeechUtil;
    ls.setItem('voice_name', 'Microsoft Zira');
    const s = su.getSettings();
    expect(s.voiceName).toBe('Microsoft Zira');

    // Simulate settings page updating voice_name
    ls.setItem('voice_name', 'Google US English');
    const s2 = su.getSettings();
    expect(s2.voiceName).toBe('Google US English');
  });

  it('should_NOT_return_stale_cached_object', () => {
    const su = globalThis.SpeechUtil;
    const s1 = su.getSettings();
    const s2 = su.getSettings();
    // Each call should return a fresh object (or at least reflect current localStorage)
    expect(s1).not.toBe(s2); // Different object references
    expect(s1.voiceName).toBe(s2.voiceName); // Same values
  });
});

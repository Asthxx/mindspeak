import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createLocalStorageMock } from '../helpers/mocks.js';

let ls;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function setupSpeechSynthesis() {
  globalThis.SpeechSynthesisUtterance = class {
    constructor(text) { this.text = text; this.voice = null; this.rate = 1; this.pitch = 1; this.volume = 1; this.lang = 'en-US'; }
  };
  globalThis.speechSynthesis = {
    getVoices: vi.fn(() => [
      { name: 'Microsoft David', lang: 'en-US' },
      { name: 'Microsoft Zira', lang: 'en-US' },
      { name: 'Microsoft Ryan Online (Natural)', lang: 'en-US' },
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
  globalThis.window.Env = { getLocalBase: () => 'http://localhost:3000' };
  vi.resetModules();
  await import('../../js/tts-manager.js');
  await import('../../js/app.js');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('网页版（_serverDown=true）选择具体系统声音后的音色一致性', () => {
  it('should_speak_with_selected_system_voice_when_server_down', async () => {
    const su = globalThis.SpeechUtil;
    su._serverDown = true;
    ls.setItem('voice_name', 'Microsoft David');
    ls.setItem('tts_voice', 'Microsoft David');
    const remoteSpy = vi.spyOn(su, '_speakRemoteFallback');

    su.speak('hello', 'en-US');
    await sleep(160);

    // 用户明确选了 Microsoft David：必须用该声音朗读，不得落入远程并行抢播链
    expect(remoteSpy).not.toHaveBeenCalled();
    expect(globalThis.speechSynthesis.speak).toHaveBeenCalled();
    const u = globalThis.speechSynthesis.speak.mock.calls[0][0];
    expect(u.voice && u.voice.name).toBe('Microsoft David');
  });

  it('should_speak_with_selected_female_system_voice_when_server_down', async () => {
    const su = globalThis.SpeechUtil;
    su._serverDown = true;
    ls.setItem('voice_name', 'Microsoft Zira');
    ls.setItem('tts_voice', 'Microsoft Zira');
    const remoteSpy = vi.spyOn(su, '_speakRemoteFallback');

    su.speak('hello', 'en-US');
    await sleep(160);

    expect(remoteSpy).not.toHaveBeenCalled();
    expect(globalThis.speechSynthesis.speak).toHaveBeenCalled();
    const u = globalThis.speechSynthesis.speak.mock.calls[0][0];
    expect(u.voice && u.voice.name).toBe('Microsoft Zira');
  });

  it('should_use_selected_online_natural_voice_when_server_down', async () => {
    const su = globalThis.SpeechUtil;
    su._serverDown = true;
    ls.setItem('voice_name', 'Microsoft Ryan Online (Natural)');
    ls.setItem('tts_voice', 'Microsoft Ryan Online (Natural)');
    const remoteSpy = vi.spyOn(su, '_speakRemoteFallback');

    su.speak('hello', 'en-US');
    await sleep(160);

    // 在线 Natural 声也不应被远程并行抢源抢走：先按所选声朗读，失败才远程兜底
    expect(remoteSpy).not.toHaveBeenCalled();
    expect(globalThis.speechSynthesis.speak).toHaveBeenCalled();
    const u = globalThis.speechSynthesis.speak.mock.calls[0][0];
    expect(u.voice && u.voice.name).toBe('Microsoft Ryan Online (Natural)');
  });

  it('should_fall_back_to_remote_when_no_english_voice_and_server_down', async () => {
    const su = globalThis.SpeechUtil;
    su._serverDown = true;
    // 本设备没有任何英文语音（只有中文声），所选声也不可用
    globalThis.speechSynthesis.getVoices = vi.fn(() => [
      { name: 'Microsoft Huihui', lang: 'zh-CN' },
    ]);
    ls.setItem('voice_name', 'Microsoft Mark');
    ls.setItem('tts_voice', 'Microsoft Mark');
    // 模拟从未成功选择过任何系统声（TTSManager.voice 也未缓存英文声）
    globalThis.TTSManager.voice = null;
    const remoteSpy = vi.spyOn(su, '_speakRemoteFallback');

    su.speak('hello', 'en-US');
    await sleep(160);

    // 无英文声可用 → 网页版才落入远程兜底，保证不静默
    expect(remoteSpy).toHaveBeenCalled();
  });
});
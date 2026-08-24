import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupGlobals } from '../helpers/mocks.js';

// 手机上切换声音不生效的回归测试：
// 根因：Android 原生分支（tts-manager speak()）无条件拦截所有朗读，
// 而原生插件只支持 text/lang/rate、无法指定音色；按所选声音路由的逻辑
// 全在 _speakWeb，只有原生判定死亡后才可达 → 设置里切什么声都读同一个。
// 修复语义：仅当用户未显式选择声音（系统默认）时才允许原生快速路径；
// 显式选择了任何音色（虚拟 __online_/__local_piper_ 或具体系统音色）必须绕过原生。

let ls;

async function flushMicrotasks() {
  for (let i = 0; i < 8; i++) await Promise.resolve();
}

beforeEach(async () => {
  ls = setupGlobals();
  ls._reset();
  vi.useFakeTimers();

  globalThis.SpeechSynthesisUtterance = class {
    constructor(text) { this.text = text; this.voice = null; this.rate = 1; this.pitch = 1; this.volume = 1; this.lang = 'en-US'; }
  };
  globalThis.speechSynthesis = {
    getVoices: vi.fn(() => [{ name: 'Google US English', lang: 'en-US' }, { name: 'Microsoft Zira', lang: 'en-US' }]),
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
  globalThis.window.speechSynthesis = globalThis.speechSynthesis;
  globalThis.window.SpeechSynthesisUtterance = globalThis.SpeechSynthesisUtterance;
  globalThis.Logger = { log: vi.fn() };
  globalThis.UserState = null;
  globalThis.Toast = { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() };
  globalThis.EventBus = { emit: vi.fn(), on: vi.fn(), off: vi.fn() };

  globalThis.window.NativeTTSBridge = {
    available: true,
    speak: vi.fn(() => Promise.resolve(true)),
    stop: vi.fn(),
  };
  // SpeechUtil 路由桩：记录虚拟音色被路由到哪个远程路径
  globalThis.window.SpeechUtil = {
    _stopLocalAudio: vi.fn(),
    _attachAudioEl: vi.fn(),
    _detachAudioEl: vi.fn(),
    _speakServerless: vi.fn(),
    _speakGoogleTTS: vi.fn(),
    _speakLocal: vi.fn(),
    _serverDown: false,
  };

  vi.resetModules();
  await import('../../js/tts-manager.js');
});

afterEach(() => {
  vi.useRealTimers();
});

describe('显式选择的声音必须绕过原生引擎', () => {
  it('virtual_online_voice_bypasses_native_and_routes_to_remote', async () => {
    localStorage.setItem('tts_voice', '__online_edge_us_jenny__');
    var tts = globalThis.TTSManager;
    tts.speak('hello', { immediate: true });
    await flushMicrotasks();
    // 原生不得拦截：否则所选在线音色永远听不到
    expect(globalThis.window.NativeTTSBridge.speak).not.toHaveBeenCalled();
    // 必须按 voice_name 路由到远程合成路径
    expect(globalThis.window.SpeechUtil._speakServerless).toHaveBeenCalled();
  });

  it('piper_voice_bypasses_native', async () => {
    localStorage.setItem('tts_voice', '__local_piper_us_amy__');
    globalThis.window.Audio = vi.fn(function() { return { play: vi.fn(() => Promise.resolve()), onended: null, onerror: null }; });
    var tts = globalThis.TTSManager;
    tts.speak('hello', { immediate: true });
    await flushMicrotasks();
    expect(globalThis.window.NativeTTSBridge.speak).not.toHaveBeenCalled();
  });

  it('real_system_voice_bypasses_native_and_applies_to_utterance', async () => {
    localStorage.setItem('tts_voice', 'Microsoft Zira');
    var tts = globalThis.TTSManager;
    tts.restoreVoice(); // 模拟启动时恢复已存选择
    expect(tts.voice && tts.voice.name).toBe('Microsoft Zira');
    tts.speak('hello', { immediate: true });
    await flushMicrotasks();
    expect(globalThis.window.NativeTTSBridge.speak).not.toHaveBeenCalled();
    expect(globalThis.speechSynthesis.speak).toHaveBeenCalledTimes(1);
    expect(globalThis.speechSynthesis.speak.mock.calls[0][0].voice.name).toBe('Microsoft Zira');
  });

  it('default_no_selection_still_prefers_native_fast_path', async () => {
    localStorage.removeItem('tts_voice');
    localStorage.removeItem('selectedVoice');
    localStorage.removeItem('voice_name');
    var tts = globalThis.TTSManager;
    tts.speak('hello', { immediate: true });
    await flushMicrotasks();
    // 系统默认：保留原生快速路径（Android WebView 的 speechSynthesis 有已知问题）
    expect(globalThis.window.NativeTTSBridge.speak).toHaveBeenCalledTimes(1);
  });
});

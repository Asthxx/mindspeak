import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupGlobals } from '../helpers/mocks.js';

// Android 原生 TTS 降级链路回归测试：
// 根因：Java 端 onInit 失败只写 logcat，插件 Promise 仍立即 resolve，
// JS 直接 return {native:true} → 永久静音、无回调、无降级。

let ls;

// 微任务冲刷：等待 promise 链走完（fake timers 不影响微任务）
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
    getVoices: vi.fn(() => [{ name: 'Google US English', lang: 'en-US' }]),
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
  globalThis.app = { currentTab: 'home', showTab: vi.fn() };

  // 可控的桥接层：每个测试通过 nativeSpeakImpl 注入原生行为
  globalThis.nativeSpeakImpl = () => Promise.resolve(true);
  globalThis.window.NativeTTSBridge = {
    available: true,
    speak: vi.fn((text, lang, rate) => globalThis.nativeSpeakImpl(text, lang, rate)),
    stop: vi.fn(),
  };

  vi.resetModules();
  await import('../../js/tts-manager.js');
});

afterEach(() => {
  vi.useRealTimers();
});

describe('NativeTTS 降级 — 正常路径不受影响', () => {
  it('bridge_true_fires_onstart_without_web_fallback', async () => {
    var tts = globalThis.TTSManager;
    var onstart = vi.fn(), onend = vi.fn(), onerror = vi.fn();
    tts.speak('hello', { immediate: true, onstart, onend, onerror });
    await flushMicrotasks();
    expect(globalThis.window.NativeTTSBridge.speak).toHaveBeenCalled();
    expect(onstart).toHaveBeenCalledTimes(1);
    expect(onerror).not.toHaveBeenCalled();
    expect(globalThis.speechSynthesis.speak).not.toHaveBeenCalled();
    // 800ms 后补发 onend（原生无 onend 回调的近似值，保持既有行为）
    await vi.advanceTimersByTimeAsync(900);
    expect(onend).toHaveBeenCalledTimes(1);
    // 3s 确认窗口到期：短文本已合成播完 → 仅锁定会话链路，不重播、不补发错误
    await vi.advanceTimersByTimeAsync(2200);
    expect(onerror).not.toHaveBeenCalled();
    expect(onend).toHaveBeenCalledTimes(1);
    expect(globalThis.speechSynthesis.speak).not.toHaveBeenCalled();
    expect(tts._nativeDead).toBe(true);
  });

  it('bridge_sync_boolean_true_still_works', async () => {
    // 接口兼容：同步返回 true（旧式实现）也视为受理，且同样受 3s 确认窗口约束
    globalThis.nativeSpeakImpl = () => true;
    var tts = globalThis.TTSManager;
    var onstart = vi.fn(), onerror = vi.fn();
    tts.speak('hello', { immediate: true, onstart, onerror });
    await flushMicrotasks();
    expect(onstart).toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(3100);
    expect(tts._nativeDead).toBe(true); // 同步布尔同样只是"受理"，到期锁定 web
  });

  it('resolved_true_but_engine_dead_latches_at_3s_next_speak_straight_web', async () => {
    // 生产根因回归（审查 C1）：Java 无论引擎初始化成败都立即 resolve →
    // "受理成功"证明不了出声。首次朗读照发乐观回调；3s 到期锁定本会话；
    // 后续朗读完全绕开原生直达 web。
    globalThis.nativeSpeakImpl = () => Promise.resolve(true);
    var tts = globalThis.TTSManager;
    var onstart = vi.fn(), onend = vi.fn(), onerror = vi.fn();
    tts.speak('hello', { immediate: true, onstart, onend, onerror });
    await flushMicrotasks();
    expect(onstart).toHaveBeenCalledTimes(1);
    expect(globalThis.speechSynthesis.speak).not.toHaveBeenCalled(); // 尚在确认窗口内
    expect(globalThis.window.NativeTTSBridge.speak).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(3100); // 合成 onend(800ms) 先发 → 只锁不重播
    expect(tts._nativeDead).toBe(true);
    expect(onend).toHaveBeenCalledTimes(1);
    expect(onerror).not.toHaveBeenCalled();
    expect(globalThis.speechSynthesis.speak).not.toHaveBeenCalled();
    tts.speak('again', { immediate: true, onerror });
    await flushMicrotasks();
    expect(globalThis.window.NativeTTSBridge.speak).toHaveBeenCalledTimes(1); // 原生不再参与
    expect(globalThis.speechSynthesis.speak).toHaveBeenCalledWith(expect.objectContaining({ text: 'again' }));
  });

  it('resolved_true_long_text_cut_at_3s_degrades_with_web_replay', async () => {
    // 桥接迟到受理（>2.2s）：受理后合成 onend(800ms) 晚于 3s 看门狗 →
    // 到期时未确认播完 → 停原生、onerror、web 重播补救
    globalThis.nativeSpeakImpl = () => new Promise(function(resolve) {
      setTimeout(function() { resolve(true); }, 2600);
    });
    var tts = globalThis.TTSManager;
    var onstart = vi.fn(), onerror = vi.fn();
    tts.speak('a very long sentence that keeps playing past three seconds', { immediate: true, onstart, onerror });
    await vi.advanceTimersByTimeAsync(100);
    expect(onstart).not.toHaveBeenCalled(); // 插件尚未受理
    await vi.advanceTimersByTimeAsync(2600); // t=2700：刚受理，乐观回调照发
    expect(onstart).toHaveBeenCalledTimes(1);
    expect(globalThis.speechSynthesis.speak).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(400); // t=3100：看门狗(3000) 先于合成 onend(3400)
    expect(onerror).toHaveBeenCalledTimes(1);
    expect(onerror.mock.calls[0][0].error).toBe('native-unavailable');
    expect(globalThis.speechSynthesis.speak).toHaveBeenCalledTimes(1);
  });

  it('unavailable_bridge_skips_native_entirely', async () => {
    globalThis.window.NativeTTSBridge.available = false;
    var tts = globalThis.TTSManager;
    tts.speak('hello', { immediate: true });
    await flushMicrotasks();
    expect(globalThis.window.NativeTTSBridge.speak).not.toHaveBeenCalled();
    expect(globalThis.speechSynthesis.speak).toHaveBeenCalled();
  });
});

describe('NativeTTS 降级 — 明确失败立即切 web', () => {
  it('bridge_false_degrades_to_web_with_onerror', async () => {
    globalThis.nativeSpeakImpl = () => Promise.resolve(false);
    var tts = globalThis.TTSManager;
    var onerror = vi.fn();
    tts.speak('hello', { immediate: true, onerror });
    await vi.advanceTimersByTimeAsync(10);
    expect(onerror).toHaveBeenCalledTimes(1);
    expect(onerror.mock.calls[0][0].error).toBe('native-unavailable');
    expect(globalThis.speechSynthesis.speak).toHaveBeenCalledWith(expect.objectContaining({ text: 'hello' }));
  });

  it('bridge_reject_degrades_immediately_without_waiting_3s', async () => {
    globalThis.nativeSpeakImpl = () => Promise.reject(new Error('plugin boom'));
    var tts = globalThis.TTSManager;
    var onerror = vi.fn();
    tts.speak('hello', { immediate: true, onerror });
    await vi.advanceTimersByTimeAsync(10);
    expect(onerror).toHaveBeenCalled();
    expect(globalThis.speechSynthesis.speak).toHaveBeenCalled();
  });

  it('degrade_stops_native_before_web_speak', async () => {
    globalThis.nativeSpeakImpl = () => Promise.resolve(false);
    var tts = globalThis.TTSManager;
    tts.speak('hello', { immediate: true });
    await vi.advanceTimersByTimeAsync(10);
    expect(globalThis.window.NativeTTSBridge.stop).toHaveBeenCalled();
  });
});

describe('NativeTTS 降级 — 静默超时看门狗（核心 bug）', () => {
  it('silent_native_no_ack_degrades_after_3s', async () => {
    // 模拟 Java 引擎初始化卡死：Promise 永不 settle，无任何回音
    globalThis.nativeSpeakImpl = () => new Promise(function() {});
    var tts = globalThis.TTSManager;
    var onerror = vi.fn();
    tts.speak('hello', { immediate: true, onerror });
    await vi.advanceTimersByTimeAsync(2900);
    expect(onerror).not.toHaveBeenCalled();
    expect(globalThis.speechSynthesis.speak).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(200);
    expect(onerror).toHaveBeenCalledTimes(1);
    expect(globalThis.speechSynthesis.speak).toHaveBeenCalledWith(expect.objectContaining({ text: 'hello' }));
  });

  it('timeout_degrade_latches_native_dead_for_session', async () => {
    // 第一次朗读超时降级后，本会话后续朗读直接走 web，不再等原生
    globalThis.nativeSpeakImpl = () => new Promise(function() {});
    var tts = globalThis.TTSManager;
    tts.speak('first', { immediate: true });
    await vi.advanceTimersByTimeAsync(3100);
    expect(globalThis.speechSynthesis.speak).toHaveBeenCalledTimes(1);
    globalThis.speechSynthesis.speak.mockClear();
    tts.speak('second', { immediate: true });
    await vi.advanceTimersByTimeAsync(3100);
    expect(globalThis.window.NativeTTSBridge.speak).toHaveBeenCalledTimes(1); // 第二次不再进原生
    expect(globalThis.speechSynthesis.speak).toHaveBeenCalledTimes(1);
  });

  it('cancel_invalidates_pending_watchdog_no_zombie_speech', async () => {
    // 用户点停止后，挂起的看门狗不得再触发降级出声
    globalThis.nativeSpeakImpl = () => new Promise(function() {});
    var tts = globalThis.TTSManager;
    tts.speak('hello', { immediate: true });
    tts.cancel();
    await vi.advanceTimersByTimeAsync(4000);
    expect(globalThis.speechSynthesis.speak).not.toHaveBeenCalled();
  });

  it('newer_speak_invalidates_older_watchdog', async () => {
    // 连续朗读时，旧一次的超时降级不得打断新一次的播放
    globalThis.nativeSpeakImpl = () => new Promise(function() {});
    var tts = globalThis.TTSManager;
    tts.speak('one', { immediate: true });
    await vi.advanceTimersByTimeAsync(1000);
    tts.speak('two', { immediate: true });
    await vi.advanceTimersByTimeAsync(2500); // 距第一次 3.5s、第二次 2.5s
    // 第一次的看门狗已被第二次失效；此时只有第二次仍在窗口内
    expect(globalThis.speechSynthesis.speak).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(600); // 第二次到期 → 降级一次
    expect(globalThis.speechSynthesis.speak).toHaveBeenCalledTimes(1);
    expect(globalThis.speechSynthesis.speak.mock.calls[0][0].text).toBe('two');
  });
});

describe('NativeTTSBridge 单元 — Promise/超时包装', () => {
  beforeEach(async () => {
    vi.resetModules();
    delete globalThis.window.NativeTTSBridge;
    await import('../../js/nativetts-bridge.js');
    globalThis.window.NativeTTSBridge.init();
  });

  function mockPlugin(impl) {
    globalThis.window.Capacitor = {
      isNative: true,
      Plugins: { NativeTTS: { speak: vi.fn(impl), stop: vi.fn() } },
    };
    globalThis.window.NativeTTSBridge.init();
  }

  it('plugin_resolve_returns_true', async () => {
    mockPlugin(() => Promise.resolve());
    var p = globalThis.window.NativeTTSBridge.speak('hi', 'en-US', 1);
    expect(p && typeof p.then === 'function').toBe(true);
    await expect(p).resolves.toBe(true);
  });

  it('plugin_reject_returns_false', async () => {
    mockPlugin(() => Promise.reject(new Error('text is empty')));
    var p = globalThis.window.NativeTTSBridge.speak('', 'en-US', 1);
    await expect(p).resolves.toBe(false);
  });

  it('plugin_never_settles_times_out_false_after_3s', async () => {
    mockPlugin(() => new Promise(function() {}));
    var p = globalThis.window.NativeTTSBridge.speak('hi', 'en-US', 1);
    await vi.advanceTimersByTimeAsync(3100);
    await expect(p).resolves.toBe(false);
  });

  it('sync_throw_returns_false', async () => {
    mockPlugin(() => { throw new Error('not registered'); });
    var p = globalThis.window.NativeTTSBridge.speak('hi', 'en-US', 1);
    await expect(p).resolves.toBe(false);
  });

  it('unavailable_returns_false_immediately', async () => {
    globalThis.window.Capacitor = undefined;
    vi.resetModules();
    await import('../../js/nativetts-bridge.js');
    globalThis.window.NativeTTSBridge.init();
    var p = globalThis.window.NativeTTSBridge.speak('hi', 'en-US', 1);
    await expect(p).resolves.toBe(false);
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupGlobals } from '../helpers/mocks.js';

// Android 原生 TTS 链路回归测试。
//
// 历史背景（本轮修复的根因）：
//   Java 端 UtteranceProgressListener 的 onStart/onDone/onError 三个回调**只写 logcat，
//   从不外传**。JS 侧因此拿不到任何引擎反馈，只能靠"插件 resolve 后盲设 800ms 定时器
//   把 synthEnded 置真 + 3s 看门狗"来猜。而 800ms 那个假 onend 会让 3s 看门狗走到
//   "以为已经播完"分支，**跳过降级**——于是引擎初始化失败（插件照样 resolve）时
//   表现为彻底静音，且 _nativeDead 把本会话后续朗读全部赶到同样不出声的 web 链路。
//
// 修复后：Java 用 notifyListeners 外传 ttsStart/ttsDone/ttsError/ttsInitFailed，
// JS 只认真实事件，插件 resolve 不再等价于"出声了"。

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

  // 可控的桥接层：nativeSpeakImpl 注入原生"受理"行为，
  // emitNative() 注入 Java 端外传的引擎事件。
  // init() 刻意放在 tts-manager 导入之后再调 —— 与生产加载顺序一致
  // （tts-manager.js 先于 nativetts-bridge.js，构造时还看不到 bridge）。
  globalThis.__nativeHandlers = {};
  globalThis.nativeSpeakImpl = () => Promise.resolve(true);
  globalThis.window.NativeTTSBridge = {
    available: true,
    init: function () {
      if (globalThis.TTSManager && typeof globalThis.TTSManager._bindNativeEvents === 'function') {
        globalThis.TTSManager._bindNativeEvents();
      }
    },
    speak: vi.fn(function (text, lang, rate, id) {
      globalThis.__lastNativeId = id;
      return globalThis.nativeSpeakImpl(text, lang, rate, id);
    }),
    stop: vi.fn(),
    onEvent: vi.fn(function (name, cb) {
      (globalThis.__nativeHandlers[name] = globalThis.__nativeHandlers[name] || []).push(cb);
      return { remove: function () {} };
    }),
  };

  vi.resetModules();
  await import('../../js/tts-manager.js');
  globalThis.window.NativeTTSBridge.init();
});

afterEach(() => {
  vi.useRealTimers();
});

/** 取当前这次朗读的 utterance id（speak 第 4 个参数） */
function lastNativeId() {
  var calls = globalThis.window.NativeTTSBridge.speak.mock.calls;
  return calls.length ? calls[calls.length - 1][3] : '';
}

/** 模拟 Java 端 notifyListeners 外传事件；id 缺省用当前这次朗读的 */
function emitNative(name, data) {
  var d = data || {};
  if (!d.id) d.id = lastNativeId();
  (globalThis.__nativeHandlers[name] || []).forEach(function (cb) { cb(d); });
}

describe('原生 TTS — 真实回调驱动的正常路径', () => {
  it('start_then_done_fires_onstart_onend_without_degrading', async () => {
    var tts = globalThis.TTSManager;
    var onstart = vi.fn(), onend = vi.fn(), onerror = vi.fn();
    tts.speak('hello', { immediate: true, onstart, onend, onerror });
    await flushMicrotasks();
    expect(globalThis.window.NativeTTSBridge.speak).toHaveBeenCalled();
    // 受理 ≠ 出声：onstart 必须等真实 ttsStart
    expect(onstart).not.toHaveBeenCalled();
    expect(globalThis.speechSynthesis.speak).not.toHaveBeenCalled();

    emitNative('ttsStart');
    expect(onstart).toHaveBeenCalledTimes(1);

    emitNative('ttsDone');
    expect(onend).toHaveBeenCalledTimes(1);
    expect(onerror).not.toHaveBeenCalled();
    expect(globalThis.speechSynthesis.speak).not.toHaveBeenCalled();
    expect(tts._nativeDead).toBe(false);   // 原生健康，不锁死

    // 真实 onDone 之后再无任何迟到的降级
    await vi.advanceTimersByTimeAsync(5000);
    expect(globalThis.speechSynthesis.speak).not.toHaveBeenCalled();
    expect(tts._nativeDead).toBe(false);
  });

  it('onend_waits_for_real_done_not_a_blind_timer', async () => {
    // 旧实现里 onend 是受理后 800ms 无条件补发的。长文本（朗读全文/故事句）
    // 会被提前判定"播完"，UI 朗读态先于实际播放结束。
    var tts = globalThis.TTSManager;
    var onend = vi.fn();
    tts.speak('a rather long sentence that takes a while to finish speaking', { immediate: true, onend });
    await flushMicrotasks();
    emitNative('ttsStart');
    await vi.advanceTimersByTimeAsync(3000);   // 远超旧的 800ms 盲发点
    expect(onend).not.toHaveBeenCalled();
    emitNative('ttsDone');
    expect(onend).toHaveBeenCalledTimes(1);
  });

  it('long_utterance_is_not_cut_off_at_3s', async () => {
    // 旧看门狗在 3s 到期时若"未确认播完"就停原生 + 换 web 音色重头重播。
    // 现在只要真实 ttsStart 到过，确认看门狗立刻让位给完成看门狗。
    var tts = globalThis.TTSManager;
    var onstart = vi.fn(), onend = vi.fn(), onerror = vi.fn();
    var long = new Array(400).join('word ');   // 约 1600 字符
    tts.speak(long, { immediate: true, onstart, onend, onerror });
    await flushMicrotasks();
    emitNative('ttsStart');
    await vi.advanceTimersByTimeAsync(60000);  // 播放一分钟仍在继续
    expect(onerror).not.toHaveBeenCalled();
    expect(globalThis.speechSynthesis.speak).not.toHaveBeenCalled();
    expect(tts._nativeDead).toBe(false);
    emitNative('ttsDone');
    expect(onend).toHaveBeenCalledTimes(1);
  });
});

describe('原生 TTS — 假成功（"完全没声音"的生产根因）', () => {
  it('resolved_but_engine_never_starts_degrades_and_replays_on_web', async () => {
    // 生产根因：Java onInit 失败只写 logcat，插件 Promise 仍 resolve。
    // JS 若把 resolve 当"成功"就永远不出声。现在 3s 内收不到真实 ttsStart
    // 即判假成功 → 停原生 + onerror + 用 web 链路重读一遍。
    globalThis.nativeSpeakImpl = () => Promise.resolve(true);
    var tts = globalThis.TTSManager;
    var onstart = vi.fn(), onend = vi.fn(), onerror = vi.fn();
    tts.speak('hello', { immediate: true, onstart, onend, onerror });
    await flushMicrotasks();
    expect(globalThis.window.NativeTTSBridge.speak).toHaveBeenCalledTimes(1);
    expect(globalThis.speechSynthesis.speak).not.toHaveBeenCalled();   // 尚在确认窗口内

    await vi.advanceTimersByTimeAsync(3100);
    expect(tts._nativeDead).toBe(true);
    expect(onerror).toHaveBeenCalledTimes(1);
    expect(onerror.mock.calls[0][0].error).toBe('native-unavailable');
    expect(globalThis.window.NativeTTSBridge.stop).toHaveBeenCalled();
    expect(globalThis.speechSynthesis.speak).toHaveBeenCalledWith(expect.objectContaining({ text: 'hello' }));
    // 受理成功但从未出声 → 不应补发 onstart/onend（会骗 UI 说"读过了"）
    expect(onstart).not.toHaveBeenCalled();
    expect(onend).not.toHaveBeenCalled();
  });

  it('silent_plugin_never_settles_degrades_after_3s', async () => {
    globalThis.nativeSpeakImpl = () => new Promise(function () {});
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

  it('engine_reports_error_degrades_immediately_without_waiting_3s', async () => {
    var tts = globalThis.TTSManager;
    var onerror = vi.fn();
    tts.speak('hello', { immediate: true, onerror });
    await flushMicrotasks();
    emitNative('ttsError', { reason: 'engine-error' });
    await vi.advanceTimersByTimeAsync(10);
    expect(onerror).toHaveBeenCalledTimes(1);
    expect(onerror.mock.calls[0][0].reason).toBe('engine-error');
    expect(globalThis.speechSynthesis.speak).toHaveBeenCalledWith(expect.objectContaining({ text: 'hello' }));
    expect(tts._nativeDead).toBe(true);
  });

  it('init_failure_with_inflight_utterance_degrades_immediately', async () => {
    var tts = globalThis.TTSManager;
    var onerror = vi.fn();
    tts.speak('hello', { immediate: true, onerror });
    await flushMicrotasks();
    emitNative('ttsInitFailed', { reason: 'init-status--1' });
    await vi.advanceTimersByTimeAsync(10);
    expect(onerror).toHaveBeenCalledTimes(1);
    expect(globalThis.speechSynthesis.speak).toHaveBeenCalledWith(expect.objectContaining({ text: 'hello' }));
  });

  it('init_failure_without_inflight_locks_session_to_web', async () => {
    var tts = globalThis.TTSManager;
    emitNative('ttsInitFailed', { reason: 'init-status--1' });
    expect(tts._nativeDead).toBe(true);
    tts.speak('hello', { immediate: true });
    await flushMicrotasks();
    expect(globalThis.window.NativeTTSBridge.speak).not.toHaveBeenCalled();
    expect(globalThis.speechSynthesis.speak).toHaveBeenCalled();
  });
});

describe('原生 TTS — 明确失败立即切 web', () => {
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

  it('sync_false_degrades', async () => {
    globalThis.nativeSpeakImpl = () => false;
    var tts = globalThis.TTSManager;
    tts.speak('hello', { immediate: true });
    await flushMicrotasks();
    expect(globalThis.speechSynthesis.speak).toHaveBeenCalled();
    expect(tts._nativeDead).toBe(true);
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

describe('原生 TTS — 开始出声后卡住（只锁不重播）', () => {
  it('started_but_never_done_locks_session_without_replay', async () => {
    var tts = globalThis.TTSManager;
    var onstart = vi.fn(), onerror = vi.fn();
    tts.speak('hello', { immediate: true, onstart, onerror });
    await flushMicrotasks();
    emitNative('ttsStart');
    expect(onstart).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(10500);   // 短文本的完成上限是 10s 底噪
    expect(tts._nativeDead).toBe(true);
    expect(globalThis.window.NativeTTSBridge.stop).toHaveBeenCalled();
    // 已经播过一部分，不再换音色从头重播
    expect(globalThis.speechSynthesis.speak).not.toHaveBeenCalled();
    expect(onerror).not.toHaveBeenCalled();
    // 后续朗读直达 web
    globalThis.speechSynthesis.speak.mockClear();
    tts.speak('next', { immediate: true });
    await flushMicrotasks();
    expect(globalThis.window.NativeTTSBridge.speak).toHaveBeenCalledTimes(1);
    expect(globalThis.speechSynthesis.speak).toHaveBeenCalledWith(expect.objectContaining({ text: 'next' }));
  });
});

describe('原生 TTS — 会话令牌与事件路由', () => {
  it('cancel_invalidates_pending_watchdog_no_zombie_speech', async () => {
    globalThis.nativeSpeakImpl = () => new Promise(function () {});
    var tts = globalThis.TTSManager;
    tts.speak('hello', { immediate: true });
    tts.cancel();
    await vi.advanceTimersByTimeAsync(4000);
    expect(globalThis.speechSynthesis.speak).not.toHaveBeenCalled();
  });

  it('cancel_invalidates_late_engine_events', async () => {
    var tts = globalThis.TTSManager;
    var onstart = vi.fn(), onend = vi.fn();
    tts.speak('hello', { immediate: true, onstart, onend });
    await flushMicrotasks();
    tts.cancel();
    emitNative('ttsStart');
    emitNative('ttsDone');
    await vi.advanceTimersByTimeAsync(100);
    expect(onstart).not.toHaveBeenCalled();
    expect(onend).not.toHaveBeenCalled();
    expect(globalThis.speechSynthesis.speak).not.toHaveBeenCalled();
  });

  it('newer_speak_invalidates_older_watchdog', async () => {
    globalThis.nativeSpeakImpl = () => new Promise(function () {});
    var tts = globalThis.TTSManager;
    tts.speak('one', { immediate: true });
    await vi.advanceTimersByTimeAsync(1000);
    tts.speak('two', { immediate: true });
    await vi.advanceTimersByTimeAsync(2500);   // 距第一次 3.5s、第二次 2.5s
    expect(globalThis.speechSynthesis.speak).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(600);    // 第二次到期 → 只降级一次
    expect(globalThis.speechSynthesis.speak).toHaveBeenCalledTimes(1);
    expect(globalThis.speechSynthesis.speak.mock.calls[0][0].text).toBe('two');
  });

  it('stale_utterance_events_are_ignored', async () => {
    // 旧一次朗读的迟到回调不得作用到新的一次上
    var tts = globalThis.TTSManager;
    tts.speak('one', { immediate: true });
    await flushMicrotasks();
    var staleId = lastNativeId();
    tts.speak('two', { immediate: true });
    await flushMicrotasks();
    (globalThis.__nativeHandlers['ttsDone'] || []).forEach(function (cb) { cb({ id: staleId }); });
    await vi.advanceTimersByTimeAsync(100);
    expect(globalThis.speechSynthesis.speak).not.toHaveBeenCalled();
  });

  it('superseded_utterance_does_not_clobber_the_new_one', async () => {
    // 第一次假成功、第二次正常：第一次 3s 到期的降级不得把第二句盖掉
    globalThis.nativeSpeakImpl = () => Promise.resolve(true);
    var tts = globalThis.TTSManager;
    var onstart2 = vi.fn(), onend2 = vi.fn();
    tts.speak('one', { immediate: true });
    await flushMicrotasks();
    tts.speak('two', { immediate: true, onstart: onstart2, onend: onend2 });
    await flushMicrotasks();
    emitNative('ttsStart');            // 只作用于第二句
    expect(onstart2).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(3200);   // 第一次的看门狗到期
    expect(globalThis.speechSynthesis.speak).not.toHaveBeenCalled();
    emitNative('ttsDone');
    expect(onend2).toHaveBeenCalledTimes(1);
    expect(globalThis.speechSynthesis.speak).not.toHaveBeenCalled();
  });
});

describe('NativeTTSBridge 单元 — Promise/超时/事件订阅', () => {
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

  it('speak_passes_utterance_id_to_plugin', async () => {
    var spy = vi.fn(() => Promise.resolve());
    mockPlugin(spy);
    await globalThis.window.NativeTTSBridge.speak('hi', 'en-US', 1, 'ns1_123');
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ id: 'ns1_123' }));
  });

  it('plugin_reject_returns_false', async () => {
    mockPlugin(() => Promise.reject(new Error('text is empty')));
    var p = globalThis.window.NativeTTSBridge.speak('', 'en-US', 1);
    await expect(p).resolves.toBe(false);
  });

  it('plugin_never_settles_times_out_false_after_3s', async () => {
    mockPlugin(() => new Promise(function () {}));
    var p = globalThis.window.NativeTTSBridge.speak('hi', 'en-US', 1);
    await vi.advanceTimersByTimeAsync(3100);
    await expect(p).resolves.toBe(false);
  });

  it('sync_throw_returns_false', async () => {
    mockPlugin(() => { throw new Error('not registered'); });
    var p = globalThis.window.NativeTTSBridge.speak('hi', 'en-US', 1);
    await expect(p).resolves.toBe(false);
  });

  it('onEvent_subscribes_and_returns_handle', async () => {
    var handler = vi.fn();
    globalThis.window.Capacitor = {
      isNative: true,
      Plugins: { NativeTTS: { speak: vi.fn(() => Promise.resolve()), stop: vi.fn(), addListener: vi.fn(() => ({ remove: vi.fn() })) } },
    };
    globalThis.window.NativeTTSBridge.init();
    var h = globalThis.window.NativeTTSBridge.onEvent('ttsStart', handler);
    expect(h && typeof h.remove === 'function').toBe(true);
    expect(globalThis.window.Capacitor.Plugins.NativeTTS.addListener).toHaveBeenCalledWith('ttsStart', handler);
  });

  it('onEvent_returns_null_when_unavailable', async () => {
    globalThis.window.Capacitor = undefined;
    vi.resetModules();
    await import('../../js/nativetts-bridge.js');
    globalThis.window.NativeTTSBridge.init();
    expect(globalThis.window.NativeTTSBridge.onEvent('ttsStart', function () {})).toBeNull();
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

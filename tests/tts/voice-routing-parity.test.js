// 跟读/字母朗读与全站其余功能的声音统一守护
//
// 现象：切换声音后，仍有部分页面声音与其它页面不一致。
//
// 根因（已用运行时诊断证实）：存在两条独立的朗读路由实现——
//   A. SpeechUtil.speak()  app.js:606-675  —— 11 个功能走这条
//      （背单词/语法/阅读/听力/拼写/PK/错题本/收藏/番茄钟 + 试听/音标/例句/
//        故事/随声听/AI/测评，经 speakWord 内部转调）
//   B. TTSManager.speak()  tts-manager.js:297-380 —— 仅跟读(app.js:4855)
//      与字母朗读(app.js:826)走这条
//
// 在「系统默认」（用户未选音色，voice_name 为空）时两者必然分叉：
//   A: instant 恒等于 !(serverDown) → server 可达时走 _speakLocal（server SAPI）
//   B: _speakWeb 的 voice_name 路由整块被跳过（if (_vn && ...)），
//      直连 speechSynthesis 默认声 —— 与 A 不同的声音
//
// 目标：把 instant 决策收敛到单一事实来源（SpeechUtil），消除该分叉。
// 本文件只锁定「同一设置下两条入口落到同一终端」这一行为，不关心内部实现。
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { bootstrapApp } from '../helpers/app-bootstrap.js';

function setupSpeechSynthesis() {
  globalThis.SpeechSynthesisUtterance = class {
    constructor(text) { this.text = text; this.voice = null; this.rate = 1; this.pitch = 1; this.volume = 1; this.lang = 'en-US'; }
  };
  const synth = {
    getVoices: vi.fn(() => ([
      { name: 'Microsoft Zira Desktop', lang: 'en-US' },
      { name: 'Microsoft David Desktop', lang: 'en-US' },
    ])),
    speak: vi.fn(), cancel: vi.fn(), pause: vi.fn(), resume: vi.fn(),
    speaking: false, pending: false, paused: false,
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
  };
  Object.defineProperty(globalThis, 'speechSynthesis', { value: synth, configurable: true, writable: true });
  globalThis.window.speechSynthesis = synth;
  globalThis.window.SpeechSynthesisUtterance = globalThis.SpeechSynthesisUtterance;
  return synth;
}

// 埋点：记录本次朗读最终落到哪个终端发声方式
function instrument(su) {
  const trace = [];
  su._speakLocal = vi.fn(() => { trace.push('serverSAPI'); return { __traceOnly: true }; });
  su._speakTTSOnline = vi.fn(() => { trace.push('ttsOnline'); return { __traceOnly: true }; });
  su._speakServerless = vi.fn(() => { trace.push('serverless'); return { __traceOnly: true }; });
  su._speakGoogleTTS = vi.fn(() => { trace.push('google'); return { __traceOnly: true }; });
  su._stopLocalAudio = vi.fn();
  su._unlockAudio = vi.fn();
  return trace;
}

describe('跟读/字母朗读与全站声音统一', () => {
  let su, tm, synth;

  beforeEach(async () => {
    vi.resetModules();
    await bootstrapApp();
    su = globalThis.SpeechUtil;
    tm = globalThis.TTSManager;
    synth = setupSpeechSynthesis();
    // 隔离：清掉所有可能残留的音色选择，确保处于「系统默认」
    localStorage.clear();
    su._settings = null;
    tm.voice = null;
    tm._burstMode = null;
    tm._burstUntil = 0;
    tm._nativeDead = false;
    tm.cancel = vi.fn();
    if (globalThis.NativeTTSBridge) globalThis.NativeTTSBridge.available = false;
  });

  it('系统默认 + 本机 server 可达：两条入口应落到同一终端', async () => {
    su._serverDown = false;
    let trace = instrument(su);
    su.speak('apple', 'en-US');
    await new Promise((r) => setTimeout(r, 60));
    const viaSpeechUtil = trace.slice();

    trace = instrument(su);
    tm.speak('apple', { lang: 'en-US' });
    await new Promise((r) => setTimeout(r, 60));
    const viaTTSManager = trace.slice();

    expect(viaSpeechUtil.length, 'SpeechUtil.speak 应抵达某个终端').toBeGreaterThan(0);
    expect(viaTTSManager, 'TTSManager.speak 应与 SpeechUtil.speak 落到同一终端，实际为 ' + JSON.stringify(viaTTSManager)).toEqual(viaSpeechUtil);
  });

  it('系统默认 + 无 server：两条入口应落到同一终端', async () => {
    su._serverDown = true;
    let trace = instrument(su);
    su.speak('apple', 'en-US');
    await new Promise((r) => setTimeout(r, 60));
    const viaSpeechUtil = trace.slice();

    trace = instrument(su);
    tm.speak('apple', { lang: 'en-US' });
    await new Promise((r) => setTimeout(r, 60));
    const viaTTSManager = trace.slice();

    expect(viaSpeechUtil.length, 'SpeechUtil.speak 应抵达某个终端').toBeGreaterThan(0);
    expect(viaTTSManager, 'TTSManager.speak 应与 SpeechUtil.speak 落到同一终端，实际为 ' + JSON.stringify(viaTTSManager)).toEqual(viaSpeechUtil);
  });

  it('已选具体音色时行为不得被本修复改动（回归护栏）', async () => {
    localStorage.setItem('voice_name', '__local_zira__');
    su._serverDown = false;
    su._settings = null;
    let trace = instrument(su);
    tm.speak('apple', { lang: 'en-US' });
    await new Promise((r) => setTimeout(r, 60));
    // Zira 是显式选择的 server SAPI 音色，两条入口都应走 serverSAPI
    expect(trace, '显式选 Zira 时 TTSManager 应走 serverSAPI').toContain('serverSAPI');
  });
});
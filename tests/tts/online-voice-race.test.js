import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createLocalStorageMock } from '../helpers/mocks.js';

let ls;
let audioInstances;

function setupSpeechSynthesis() {
  globalThis.SpeechSynthesisUtterance = class {
    constructor(text) { this.text = text; this.voice = null; this.rate = 1; this.pitch = 1; this.volume = 1; this.lang = 'en-US'; }
  };
  globalThis.speechSynthesis = {
    getVoices: vi.fn(() => [{ name: 'Microsoft Zira', lang: 'en-US' }]),
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

class MockAudio {
  constructor(src) { this.src = src; this.currentTime = 0; this.ended = false; this.parentNode = null; this._playCount = 0; audioInstances.push(this); }
  play() { this._playCount++; return Promise.resolve(); }
  pause() {}
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
  globalThis.Audio = MockAudio;
  audioInstances = [];
  vi.resetModules();
  await import('../../js/tts-manager.js');
  await import('../../js/app.js');
});

describe('在线音色切换 — 显式选择音色不得被并行兜底抢播', () => {
  it('explicit Edge Guy should play Edge Guy, not once-faster youdao fallback', async () => {
    ls.setItem('voice_name', '__online_edge_us_guy__');
    const su = globalThis.SpeechUtil;
    su._speakServerless('hello', 'en-US', {});
    await new Promise(r => setTimeout(r, 20));

    const edgeInstances = audioInstances.filter(a => a.src.includes('/api/edge-tts'));
    expect(edgeInstances.length).toBeGreaterThan(0);

    // 模拟真实时序：谁先出声谁胜。线下兜底源（有道 CDN）通常比本地 edge-tts 合成更快，
    // 现存 bug 会让"切换 Edge 音色"最终播放的还是有道 —— 听起来永远是同一种声音。
    const trigger = audioInstances.find(a => a.src.includes('dict.youdao.com')) || audioInstances[0];
    if (trigger.onplay) trigger.onplay();
    await new Promise(r => setTimeout(r, 10));

    const playing = su._localAudio;
    expect(playing).toBeTruthy();
    expect(playing.src).toContain('/api/edge-tts');
    expect(playing.src).toContain('en-US-GuyNeural');
  });

  it('explicit Edge Jenny should play Edge Jenny', async () => {
    ls.setItem('voice_name', '__online_edge_us_jenny__');
    const su = globalThis.SpeechUtil;
    su._speakServerless('hello world', 'en-US', {});
    await new Promise(r => setTimeout(r, 20));

    const trigger = audioInstances.find(a => a.src.includes('dict.youdao.com')) || audioInstances[0];
    if (trigger.onplay) trigger.onplay();
    await new Promise(r => setTimeout(r, 10));

    expect(su._localAudio).toBeTruthy();
    expect(su._localAudio.src).toContain('/api/edge-tts');
    expect(su._localAudio.src).toContain('en-US-JennyNeural');
  });
});
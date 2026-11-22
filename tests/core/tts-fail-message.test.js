// 朗读失败文案与长度兜底（P3 文案项回归网）
//
// 旧文案在 server 明明可达、只是合成出错时也说「本地发音服务也未启动」，
// 用户照着提示去启动 server 纯属白折腾；也没区分「设备没联网」。
// 长度兜底：正常入口已按 460/180 分块，但任何新调用点直接传长文本时，
// 单块入口必须自己再分一次，别把必然 400 的请求发出去。
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { bootstrapApp } from '../helpers/app-bootstrap.js';

describe('朗读失败文案', () => {
  let S;
  const origOnLine = navigator.onLine;

  beforeEach(async () => {
    vi.resetModules();
    await bootstrapApp();
    S = window.SpeechUtil;
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', { value: origOnLine, configurable: true });
  });

  function setOnline(v) {
    Object.defineProperty(navigator, 'onLine', { value: v, configurable: true });
  }

  it('设备未联网：文案说明是网络问题，不是"服务没启动"', () => {
    setOnline(false);
    S._serverDown = false;
    const msg = S._ttsFailText('local');
    expect(msg).toContain('未联网');
    expect(msg).not.toContain('未启动');
  });

  it('server 可达但合成出错：明确说"服务暂时出错"，不再谎称本地服务未启动', () => {
    setOnline(true);
    S._serverDown = false;
    const msg = S._ttsFailText('local');
    expect(msg).toContain('服务暂时出错');
    expect(msg).not.toContain('未启动');
    expect(msg).not.toContain('node server');
  });

  it('无后端（网页版）：引导安装/切换系统语音', () => {
    setOnline(true);
    S._serverDown = true;
    expect(S._ttsFailText('local')).toContain('系统设置');
  });

  it('设备语音失败：给出"本机无英文语音 + 在线也不可用"的组合提示', () => {
    setOnline(true);
    S._serverDown = false;
    const msg = S._ttsFailText('device');
    expect(msg).toContain('本机无可用的英文语音');
    expect(msg).not.toContain('未启动');
  });

  it('离线兜底不可用时才弹 Toast，且用的是新文案', () => {
    setOnline(true);
    S._serverDown = false;
    const origFallback = S._tryOfflineFallback;
    const origError = window.Toast.error;
    const shown = [];
    S._tryOfflineFallback = () => false;
    window.Toast.error = (m) => shown.push(m);
    try {
      S._ttsLocalFail({});
    } finally {
      S._tryOfflineFallback = origFallback;
      window.Toast.error = origError;
    }
    expect(shown.length).toBe(1);
    expect(shown[0]).toContain('服务暂时出错');
  });

  it('noFailToast 时不弹（后台预热不能打扰用户）', () => {
    const origFallback = S._tryOfflineFallback;
    const origError = window.Toast.error;
    const shown = [];
    S._tryOfflineFallback = () => false;
    window.Toast.error = (m) => shown.push(m);
    try {
      S._ttsLocalFail({ noFailToast: true });
    } finally {
      S._tryOfflineFallback = origFallback;
      window.Toast.error = origError;
    }
    expect(shown).toEqual([]);
  });
});

describe('单块入口的长度兜底', () => {
  let S;
  beforeEach(async () => {
    vi.resetModules();
    await bootstrapApp();
    S = window.SpeechUtil;
    S._probedServer = true;
    S._serverDown = false;
  });

  it('_speakLocalOne 收到 >500 字符时转交分块入口，不直接发请求', () => {
    S._serverDown = false;   // 覆盖 bootstrap 里异步探测可能刚写回的 true
    const calls = [];
    const orig = S._speakLocal;
    S._speakLocal = (text, lang, opts) => { calls.push({ len: String(text).length, opts }); };
    try {
      S._speakLocalOne('x'.repeat(620), 'en-US', { tag: 1 });
    } finally { S._speakLocal = orig; }
    expect(calls.length).toBe(1);
    expect(calls[0].len).toBe(620);
    expect(calls[0].opts).toEqual({ tag: 1 });
  });

  it('_speakGoogleOne 收到 >200 字符时转交分块入口', () => {
    S._serverDown = false;
    const calls = [];
    const orig = S._speakGoogleTTS;
    S._speakGoogleTTS = (text) => { calls.push(String(text).length); };
    try {
      S._speakGoogleOne('y'.repeat(260), 'en-US', {});
    } finally { S._speakGoogleTTS = orig; }
    expect(calls).toEqual([260]);
  });

  it('分块入口产出的每一块都不超过 460，且不会回头再触发兜底', () => {
    S._serverDown = false;
    const seen = [];
    const origOne = S._speakLocalOne;
    // 用真实 _speakLocal：把单块实现换成记录器，就能看出是否出现"块→入口→块"的递归
    S._speakLocalOne = (text, lang, opts) => {
      seen.push(String(text).length);
      // 分块链靠 onend 推进：桩必须回调，否则只能看到第一块（这也正是链的行为）
      if (opts && opts.onend) opts.onend();
    };
    try {
      S._speakLocal('z '.repeat(400), 'en-US', {});
    } finally { S._speakLocalOne = origOne; }
    expect(seen.length).toBeGreaterThan(1);
    for (const n of seen) expect(n).toBeLessThanOrEqual(460);
  });
});

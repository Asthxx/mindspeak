// 行为级测试：长文本朗读分块（P1-2 回归网）
//
// 背景：/api/tts 单次 >500 字符直接 400，Google 代理 ~200 字符上限；而 _speakLocal /
// _speakGoogleTTS 旧实现把整段塞进一个请求 → 长文本（AI 回答朗读、整段例句）在所有
// "本地/在线音色"下必然失败，用户只看到"朗读失败"。
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { bootstrapApp } from '../helpers/app-bootstrap.js';

const LONG = Array.from({ length: 24 }, (_, i) => 'Sentence number ' + (i + 1) + ' is here.').join(' ');

describe('长文本朗读分块', () => {
  let S;

  beforeEach(async () => {
    vi.resetModules();
    await bootstrapApp();
    S = window.SpeechUtil;
    // jsdom 里没有后端，启动时的 _probeServer 会异步把 _serverDown 置 true（走远程路径）。
    // 本组测"有 server 时的本地 SAPI 分块"：先等那次探测失败落地，再显式标成可达，
    // 否则探测回调会在 beforeEach 之后把标记改回 true。
    S._probedServer = true;
    await new Promise((resolve) => setTimeout(resolve, 20));
    S._serverDown = false;
    expect(LONG.length).toBeGreaterThan(500);
  });

  // 用桩替换单块实现：记录每块文本，异步触发 onstart/onend 模拟真实播放
  function stubOne(prop, sink) {
    const orig = S[prop];
    S[prop] = function (text, lang, opts) {
      sink.push(text);
      setTimeout(() => {
        if (opts && opts.onstart) opts.onstart();
        if (opts && opts.onend) opts.onend();
      }, 0);
    };
    return () => { S[prop] = orig; };
  }

  it('本地 SAPI：按 ≤460 字符切块，逐块串行，onstart 一次、onend 一次', async () => {
    const calls = [];
    const restore = stubOne('_speakLocalOne', calls);
    let starts = 0;
    let ends = 0;
    try {
      await new Promise((resolve) => {
        S._speakLocal(LONG, 'en-US', {
          onstart: () => { starts++; },
          onend: () => { ends++; resolve(); }
        });
      });
    } finally { restore(); }

    expect(calls.length).toBeGreaterThan(1);
    for (const c of calls) expect(c.length).toBeLessThanOrEqual(460);
    // 内容不丢：所有块的单词序列拼起来应还原原文单词序列
    const words = calls.join(' ').split(/\s+/).filter(Boolean);
    expect(words).toEqual(LONG.split(/\s+/).filter(Boolean));
    expect(starts).toBe(1);
    expect(ends).toBe(1);
  });

  it('本地 SAPI：单块失败只跳过该块，不影响后续块与最终 onend', async () => {
    const calls = [];
    let ends = 0;
    const orig = S._speakLocalOne;
    S._speakLocalOne = function (text, lang, opts) {
      calls.push(text);
      setTimeout(() => {
        if (calls.length === 1) { opts.onerror(new Error('boom')); return; }  // 第一块失败
        opts.onend();
      }, 0);
    };
    try {
      await new Promise((resolve) => {
        S._speakLocal(LONG, 'en-US', { onend: () => { ends++; resolve(); } });
      });
    } finally { S._speakLocalOne = orig; }
    expect(calls.length).toBeGreaterThan(1);
    expect(ends).toBe(1);
  });

  it('Google：按 ≤180 字符切块', async () => {
    const calls = [];
    const restore = stubOne('_speakGoogleOne', calls);
    try {
      await new Promise((resolve) => {
        S._speakGoogleTTS(LONG, 'en-US', { onend: resolve });
      });
    } finally { restore(); }
    expect(calls.length).toBeGreaterThan(3);
    for (const c of calls) expect(c.length).toBeLessThanOrEqual(180);
  });

  it('新朗读会让旧链在下一块前退出（不会读完上一段剩余块）', async () => {
    const calls = [];
    let ends = 0;
    const orig = S._speakLocalOne;
    S._speakLocalOne = function (text, lang, opts) {
      calls.push(text);
      setTimeout(() => { if (opts && opts.onend) opts.onend(); }, 0);
    };
    try {
      S._speakLocal(LONG, 'en-US', { onend: () => { ends++; } });
      // 模拟用户紧接着又点了一次朗读：新朗读会让令牌自增
      S._speakChain = (S._speakChain || 0) + 1;
      await new Promise((resolve) => setTimeout(resolve, 40));
    } finally { S._speakLocalOne = orig; }
    expect(calls.length).toBe(1);   // 第二块开始前发现令牌变了 → 整链退出
    expect(ends).toBe(0);
  });
});

// 内置语音包的下载源（多候选回退）
//
// 背景：原实现只有一个源 —— location.origin + '/api/offline-voice/'。
//   · 桌面 + node server.js：能用
//   · GitHub Pages：503（静态站没有后端）
//   · APK（https://localhost）：无服务
// 于是网页版和 APK 里"内置语音包下载失败"是必然的。现在改为候选链：
//   显式配置 MS.OFFLINE_VOICE_BASE → 同源 /api/offline-voice/ → 站点托管镜像
// 逐个尝试，任一成功即用；全部失败才报错，并把每个源的失败原因带出来供排查。
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { bootstrapApp } from '../helpers/app-bootstrap.js';

const MIRROR = 'https://asthxx.github.io/mindspeak/voice/';

function fakeResponse(body, init) { return new Response(body, init); }

describe('离线语音包下载源', () => {
  let realFetch;
  beforeEach(async () => {
    vi.resetModules();
    await bootstrapApp();
    realFetch = window.fetch;
    window.MS.OFFLINE_VOICE_BASE = '';
  });
  afterEach(() => { window.fetch = realFetch; window.MS.OFFLINE_VOICE_BASE = ''; });

  it('默认候选链：同源接口在前，Pages 镜像在后', () => {
    const bases = window.OfflineTTS.modelBases();
    expect(bases[0]).toMatch(/\/api\/offline-voice\/$/);
    expect(bases[bases.length - 1]).toBe(MIRROR);
  });

  it('显式配置优先，且尾斜杠归一化', () => {
    window.MS.OFFLINE_VOICE_BASE = 'https://cdn.example.com/voice';
    expect(window.OfflineTTS.modelBases()[0]).toBe('https://cdn.example.com/voice/');
  });

  it('同源返回 503 时自动回退到镜像，两个文件都从镜像取', async () => {
    const calls = [];
    window.fetch = (url) => {
      const u = String(url);
      calls.push(u);
      if (u.includes('/api/offline-voice/')) return Promise.resolve(fakeResponse('', { status: 503 }));
      return Promise.resolve(fakeResponse('BINARY', { status: 200, headers: { 'Content-Type': 'application/octet-stream' } }));
    };
    const got = await window.OfflineTTS._fetchModelFrom(
      window.OfflineTTS.modelBases(), { model: 'en_US-lessac-medium' }, null);
    expect(got.base).toBe(MIRROR);
    expect(await got.model.text()).toBe('BINARY');
    expect(calls.some(u => u.includes('/api/offline-voice/'))).toBe(true);
    expect(calls.filter(u => u.startsWith(MIRROR)).length).toBe(2); // onnx + onnx.json
  });

  it('全部源失败：错误信息列出每个源与原因', async () => {
    window.fetch = () => Promise.resolve(fakeResponse('', { status: 503 }));
    let err = null;
    try {
      await window.OfflineTTS._fetchModelFrom(window.OfflineTTS.modelBases(), { model: 'en_US-lessac-medium' }, null);
    } catch (e) { err = e; }
    expect(err, '全失败必须抛错').toBeTruthy();
    expect(err.message).toContain('已尝试');
    expect(err.message).toContain('/api/offline-voice/');
    expect(err.message).toContain(MIRROR);
    expect(Array.isArray(err.attempts)).toBe(true);
    expect(err.attempts.length).toBe(window.OfflineTTS.modelBases().length);
  });

  it('网络异常（fetch 抛错）同样会回退，而不是直接失败', async () => {
    window.fetch = (url) => {
      const u = String(url);
      if (u.includes('/api/offline-voice/')) return Promise.reject(new TypeError('Failed to fetch'));
      return Promise.resolve(fakeResponse('OK', { status: 200 }));
    };
    const got = await window.OfflineTTS._fetchModelFrom(
      window.OfflineTTS.modelBases(), { model: 'en_US-lessac-medium' }, null);
    expect(got.base).toBe(MIRROR);
  });

  it('下载进度回调在回退后仍然可用（不因换源而丢失）', async () => {
    const progress = [];
    window.fetch = (url) => {
      const u = String(url);
      if (u.includes('/api/offline-voice/')) return Promise.resolve(fakeResponse('', { status: 404 }));
      // 镜像：无 body reader 的环境走 blob 分支，进度回调报 1
      return Promise.resolve(fakeResponse('OK', { status: 200, headers: { 'Content-Length': '2' } }));
    };
    await window.OfflineTTS._fetchModelFrom(
      window.OfflineTTS.modelBases(), { model: 'en_US-lessac-medium' }, p => progress.push(p));
    expect(progress.length).toBeGreaterThan(0);
    expect(progress[progress.length - 1]).toBe(1);
  });
});

describe('下载进度钳制', () => {
  it('body 字节数大于 Content-Length（压缩传输）时进度不超过 100%', async () => {
    vi.resetModules();
    await bootstrapApp();
    const realFetch = window.fetch;
    const progress = [];
    window.fetch = (url) => {
      const u = String(url);
      if (u.includes('/api/offline-voice/')) return Promise.resolve(new Response('', { status: 503 }));
      // 声称 2 字节，实际给 6 字节 —— 模拟解码后大于 content-length
      return Promise.resolve(new Response('ABCDEF', { status: 200, headers: { 'Content-Length': '2' } }));
    };
    try {
      await window.OfflineTTS._fetchModelFrom(
        window.OfflineTTS.modelBases(), { model: 'en_US-lessac-medium' }, p => progress.push(p));
      expect(Math.max(...progress), '进度不应超过 1').toBeLessThanOrEqual(1);
      expect(progress[progress.length - 1]).toBe(1);
    } finally { window.fetch = realFetch; }
  });
});

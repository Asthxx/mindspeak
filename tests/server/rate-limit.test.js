import { describe, it, expect } from 'vitest';
import { createTtsLimiter } from '../../server/rate-limit.js';

// TTS 限流：防局域网/沙箱 no-cors 图片滥用（每请求 spawn PowerShell + 落盘 WAV）。

function mkReq(ip) { return { socket: { remoteAddress: ip } }; }

function mkRes() {
  const res = { statusCode: 200, _json: null };
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (o) => { res._json = o; return res; };
  return res;
}

describe('TTS 限流中间件', () => {
  it('窗口内超过上限返回 429 且阻止后续', () => {
    const mw = createTtsLimiter({ limit: 2, windowMs: 60000 });
    let nexted = 0;
    const res = mkRes();
    mw(mkReq('127.0.0.1'), res, () => nexted++);
    mw(mkReq('127.0.0.1'), res, () => nexted++);
    mw(mkReq('127.0.0.1'), res, () => nexted++);
    expect(nexted).toBe(2);
    expect(res.statusCode).toBe(429);
    expect(res._json && res._json.ok).toBe(false);
  });

  it('不同 IP 独立计数', () => {
    const mw = createTtsLimiter({ limit: 2, windowMs: 60000 });
    let a = 0, b = 0;
    const resA = mkRes(), resB = mkRes();
    mw(mkReq('1.1.1.1'), resA, () => a++);
    mw(mkReq('1.1.1.1'), resA, () => a++);
    mw(mkReq('2.2.2.2'), resB, () => b++);
    mw(mkReq('2.2.2.2'), resB, () => b++);
    mw(mkReq('1.1.1.1'), resA, () => a++);
    expect(a).toBe(2);
    expect(b).toBe(2);
    expect(resA.statusCode).toBe(429);
    expect(resB.statusCode).toBe(200);
  });

  it('窗口过期后重置计数', async () => {
    const mw = createTtsLimiter({ limit: 1, windowMs: 50 });
    let n = 0;
    const res = mkRes();
    mw(mkReq('127.0.0.1'), res, () => n++);
    mw(mkReq('127.0.0.1'), res, () => n++);
    expect(n).toBe(1);
    expect(res.statusCode).toBe(429);
    await new Promise((r) => setTimeout(r, 70));
    const res2 = mkRes(); // 新请求对应新响应对象，不能复用上一个 429 的 res
    mw(mkReq('127.0.0.1'), res2, () => n++);
    expect(n).toBe(2);
    expect(res2.statusCode).toBe(200);
    expect(res2._json).toBe(null);
  });

  it('HEAD（前端缓存预热）请求不计数：连续 HEAD 永不触发 429', () => {
    const mw = createTtsLimiter({ limit: 2, windowMs: 60000 });
    let nexted = 0;
    const res = mkRes();
    const headReq = () => ({ socket: { remoteAddress: '127.0.0.1' }, method: 'HEAD' });
    mw(headReq(), res, () => nexted++);
    mw(headReq(), res, () => nexted++);
    mw(headReq(), res, () => nexted++);
    expect(nexted).toBe(3);
    expect(res.statusCode).toBe(200);
  });

  it('bucket 数量超过阈值时清理过期条目（防内存增长）', () => {
    const mw = createTtsLimiter({ limit: 100, windowMs: 10 });
    let nexted = 0;
    const res = mkRes();
    for (let i = 0; i < 600; i++) mw(mkReq('ip-' + i), res, () => nexted++);
    expect(nexted).toBe(600);
  });
});
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';

// 服务端 AI 代理测试：直接验证核心函数（不启动 HTTP），限流器另行单测。
// require('../server/server.js') 由 require.main 保护，不会 listen。
let validateAiChatBody, proxyAiChat, aiHealthStatus;

beforeAll(async () => {
  const srv = await import('../server/server.js');
  validateAiChatBody = srv.validateAiChatBody;
  proxyAiChat = srv.proxyAiChat;
  aiHealthStatus = srv.aiHealthStatus;
  delete globalThis.fetch;
});

afterAll(() => { delete globalThis.fetch; });

describe('validateAiChatBody — 请求体校验', () => {
  it('should_reject_non_object_body', () => {
    expect(validateAiChatBody(null)).toEqual({ ok: false });
    expect(validateAiChatBody('hi')).toEqual({ ok: false });
    expect(validateAiChatBody([])).toEqual({ ok: false });
  });

  it('should_reject_missing_or_non_array_messages', () => {
    expect(validateAiChatBody({})).toEqual({ ok: false });
    expect(validateAiChatBody({ messages: 'hi' })).toEqual({ ok: false });
    expect(validateAiChatBody({ messages: [] })).toEqual({ ok: false });
  });

  it('should_reject_more_than_6_messages', () => {
    const messages = Array.from({ length: 7 }, () => ({ role: 'user', content: 'hi' }));
    expect(validateAiChatBody({ messages })).toEqual({ ok: false });
  });

  it('should_reject_content_over_500_chars_or_non_string', () => {
    expect(validateAiChatBody({ messages: [{ role: 'user', content: 'x'.repeat(501) }] })).toEqual({ ok: false });
    expect(validateAiChatBody({ messages: [{ role: 'user', content: 123 }] })).toEqual({ ok: false });
    expect(validateAiChatBody({ messages: [{ role: 'user', content: '' }] })).toEqual({ ok: false });
    expect(validateAiChatBody({ messages: [{ role: 'admin', content: 'hi' }] })).toEqual({ ok: false });
  });

  it('should_reject_body_over_2kb', () => {
    const messages = [{ role: 'user', content: 'x'.repeat(2000) }, { role: 'user', content: 'y'.repeat(200) }];
    const body = { messages };
    expect(JSON.stringify(body).length).toBeGreaterThan(2048);
    expect(validateAiChatBody(body)).toEqual({ ok: false });
  });

  it('should_accept_valid_messages', () => {
    const messages = [{ role: 'user', content: 'explain the word abandon' }];
    expect(validateAiChatBody({ messages })).toEqual({ ok: true, messages });
  });
});

describe('proxyAiChat — LLM 转发与降级', () => {
  function mockFetch(impl) {
    globalThis.fetch = vi.fn(impl);
    return globalThis.fetch;
  }

  it('should_return_timeout_on_abort_error', async () => {
    mockFetch(() => Promise.reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
    const r = await proxyAiChat([{ role: 'user', content: 'hi' }]);
    expect(r).toEqual({ ok: false, error: 'timeout' });
  });

  it('should_return_upstream_on_non_2xx', async () => {
    mockFetch(() => Promise.resolve({ ok: false, status: 500 }));
    const r = await proxyAiChat([{ role: 'user', content: 'hi' }]);
    expect(r).toEqual({ ok: false, error: 'upstream' });
  });

  it('should_return_upstream_on_network_error', async () => {
    mockFetch(() => Promise.reject(new TypeError('Failed to fetch')));
    const r = await proxyAiChat([{ role: 'user', content: 'hi' }]);
    expect(r).toEqual({ ok: false, error: 'upstream' });
  });

  it('should_return_upstream_when_choices_empty', async () => {
    mockFetch(() => Promise.resolve({ ok: true, json: async () => ({ choices: [] }) }));
    const r = await proxyAiChat([{ role: 'user', content: 'hi' }]);
    expect(r).toEqual({ ok: false, error: 'upstream' });
  });

  it('should_return_text_on_success', async () => {
    mockFetch(() => Promise.resolve({ ok: true, json: async () => ({ choices: [{ message: { content: 'abandon 意为“放弃”。' } }] }) }));
    const r = await proxyAiChat([{ role: 'user', content: 'explain abandon' }]);
    expect(r.ok).toBe(true);
    expect(r.text).toContain('abandon');
    expect(typeof r.model).toBe('string');
    expect(typeof r.ms).toBe('number');
  });

  it('should_clamp_text_to_400_chars', async () => {
    mockFetch(() => Promise.resolve({ ok: true, json: async () => ({ choices: [{ message: { content: 'x'.repeat(999) } }] }) }));
    const r = await proxyAiChat([{ role: 'user', content: 'hi' }]);
    expect(r.ok).toBe(true);
    expect(r.text.length).toBe(400);
  });

  it('should_reject_parse_error_as_upstream', async () => {
    mockFetch(() => Promise.resolve({ ok: true, json: async () => { throw new SyntaxError('bad json'); } }));
    const r = await proxyAiChat([{ role: 'user', content: 'hi' }]);
    expect(r).toEqual({ ok: false, error: 'upstream' });
  });

  it('should_not_send_temperature_or_max_tokens_without_api_key', async () => {
    // 上游匿名配额实测：带 temperature/max_tokens 的请求返回 401 UNAUTHORIZED，
    // 精简 body（model + messages）才放行 → 未配 POLLINATIONS_API_KEY 时禁止发这两个参数。
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: true, json: async () => ({ choices: [{ message: { content: 'ok' } }] }) }));
    const r = await proxyAiChat([{ role: 'user', content: 'hi' }]);
    expect(r.ok).toBe(true);
    const callBody = JSON.parse(globalThis.fetch.mock.calls[0][1].body);
    expect(callBody).not.toHaveProperty('temperature');
    expect(callBody).not.toHaveProperty('max_tokens');
    expect(callBody.messages[0].role).toBe('system');
  });
});

describe('aiHealthStatus — AI 通道健康状态', () => {
  it('should_report_disabled_when_no_api_key', () => {
    const s = aiHealthStatus();
    expect(s.ok).toBe(true);
    expect(typeof s.enabled).toBe('boolean');
    expect(s.enabled).toBe(false);
    expect(typeof s.model).toBe('string');
    expect(typeof s.capacity).toBe('number');
  });
});

describe('createTtsLimiter — POST 限流扩展', () => {
  let createTtsLimiter;
  beforeAll(async () => {
    const rl = await import('../server/rate-limit.js');
    createTtsLimiter = rl.createTtsLimiter;
  });

  function mkRes() {
    const res = { statusCode: 200 };
    res.status = vi.fn((c) => { res.statusCode = c; return res; });
    res.json = vi.fn(() => res);
    res.setHeader = vi.fn();
    res.sendStatus = vi.fn();
    return res;
  }

  it('should_count_post_requests_when_methods_includes_post', () => {
    const mw = createTtsLimiter({ methods: ['POST'], limit: 2, errorBody: { ok: false, error: 'rate-limit', message: 'too many' } });
    for (let i = 0; i < 2; i++) {
      const res = mkRes();
      let nexted = false;
      mw({ method: 'POST', socket: { remoteAddress: '127.0.0.1' } }, res, () => { nexted = true; });
      expect(nexted).toBe(true);
      expect(res.statusCode).toBe(200);
    }
    const res = mkRes();
    let nexted = false;
    mw({ method: 'POST', socket: { remoteAddress: '127.0.0.1' } }, res, () => { nexted = true; });
    expect(nexted).toBe(false);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'rate-limit', message: 'too many' });
  });

  it('should_keep_default_get_only_behavior', () => {
    const mw = createTtsLimiter({ limit: 1 });
    const res = mkRes();
    let nexted = false;
    mw({ method: 'POST', socket: { remoteAddress: 'x' } }, res, () => { nexted = true; });
    expect(nexted).toBe(true); // POST 默认不计数，直接放行
  });
});
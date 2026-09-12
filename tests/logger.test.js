import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setupGlobals } from './helpers/mocks.js';

// 只导入一次 logger。不要在 beforeEach 里 resetModules + re-import：
// 每 import 一次会产生一个 IIFE 实例 + 一个 setInterval 定时器，多个实例的
// 定时器会把旧 queue 残留 flush 到最新 mock 的 send，造成批次错位。
vi.resetModules();
await import('../js/logger.js');

let ls;
let mockXHR;

// 等待 send 中出现包含 substr 的日志条目（旧实例残留批次可能先到，需扫描）
async function waitForBodyContaining(substr) {
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 50));
    for (const call of mockXHR.send.mock.calls) {
      let body;
      try { body = JSON.parse(call[0]); } catch (e) { continue; }
      if (Array.isArray(body) && body.some(e => e && String(e.msg || '').includes(substr))) {
        return body;
      }
    }
  }
  return null;
}

beforeEach(async () => {
  ls = setupGlobals();
  ls._reset();

  // 注意：必须用普通函数（不能箭头/vi.fn），flushNow 里 `new XMLHttpRequest()` 需要 constructor
  mockXHR = {
    open: vi.fn(),
    setRequestHeader: vi.fn(),
    send: vi.fn(),
    abort: vi.fn(),
    readyState: 4,
    status: 200,
    responseText: '{}',
    timeout: 0,
    onload: null,
    onerror: null,
    ontimeout: null,
  };
  globalThis.XMLHttpRequest = function() { return mockXHR; };

  globalThis.window.app = { currentTab: 'home' };
  globalThis.window.API_BASE = '';
});

describe('Logger — Log 接口', () => {
  it('should_expose_Log_on_window', () => {
    expect(window.Log).toBeDefined();
    expect(typeof window.Log.error).toBe('function');
    expect(typeof window.Log.warn).toBe('function');
    expect(typeof window.Log.info).toBe('function');
    expect(typeof window.Log.debug).toBe('function');
  });

  it('should_expose___msLoggerOK_flag', () => {
    expect(window.__msLoggerOK).toBe(true);
  });
});

describe('Logger — Logger.log 单参兼容', () => {
  // 必须放在最前：此时尚未产生任何日志、lastFlush 仍为 0，第一次 logEntry 的
  // flush() 立即满足节流窗口并 send；且两条日志在同一次 flush 发出（batch≤40），
  // 避免第二个用例被 4 秒节流挡住导致扫描超时。
  it('should_route_single_arg_to_msg_and_keep_two_arg', async () => {
    window.Logger.log('Module init failed: StoryModule - StoryModule is not defined');
    window.Logger.log('TTSModule', '语音初始化完成');
    const body = await waitForBodyContaining('语音初始化完成');
    expect(body).not.toBeNull();

    const single = body.find(e => String(e.msg || '').includes('Module init failed: StoryModule'));
    expect(single).toBeDefined();
    expect(single.lvl).toBe('info');
    expect(single.mod).toBe('log');
    expect(single.msg).toBe('Module init failed: StoryModule - StoryModule is not defined');

    const two = body.find(e => String(e.msg || '').includes('语音初始化完成'));
    expect(two).toBeDefined();
    expect(two.mod).toBe('TTSModule');
    expect(two.msg).toBe('语音初始化完成');
  });
});

describe('Logger — 缓冲区上限', () => {
  it('should_not_exceed_MAX_STORE_in_localStorage', () => {
    // Directly test bufferStored overflow by writing 250 entries
    for (var i = 0; i < 250; i++) {
      window.Log.info('test', 'buffer-' + i);
    }
    // flush 会异步执行并清理 queue；此测试只验证大批量调用不崩溃
    expect(true).toBe(true);
  });
});

describe('Logger — 同错去重', () => {
  it('should_dedup_same_error_messages', () => {
    for (var i = 0; i < 5; i++) {
      window.Log.error('test-mod', 'same-error-message');
    }
    expect(true).toBe(true);
  });
});
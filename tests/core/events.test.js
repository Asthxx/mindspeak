import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setupGlobals } from '../helpers/mocks.js';

let EventBus;
beforeEach(async () => {
  setupGlobals();
  vi.resetModules();
  await import('../../js/core/events.js');
  EventBus = globalThis.EventBus;
});

describe('EventBus — 基础发布/订阅', () => {
  it('should_call_listener_when_event_emitted', () => {
    const fn = vi.fn();
    EventBus.on('TEST', fn);
    EventBus.emit('TEST', { data: 1 });
    expect(fn).toHaveBeenCalledWith({ data: 1 });
  });

  it('should_not_call_listener_for_different_event', () => {
    const fn = vi.fn();
    EventBus.on('TEST_A', fn);
    EventBus.emit('TEST_B');
    expect(fn).not.toHaveBeenCalled();
  });

  it('should_support_chaining', () => {
    const result = EventBus.on('X', () => {});
    expect(result).toBe(EventBus);
  });
});

describe('EventBus — off() 取消订阅', () => {
  it('should_remove_specific_listener', () => {
    const fn = vi.fn();
    EventBus.on('TEST', fn);
    EventBus.off('TEST', fn);
    EventBus.emit('TEST');
    expect(fn).not.toHaveBeenCalled();
  });

  it('should_remove_all_listeners_for_event_when_no_fn', () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    EventBus.on('TEST', fn1);
    EventBus.on('TEST', fn2);
    EventBus.off('TEST');
    EventBus.emit('TEST');
    expect(fn1).not.toHaveBeenCalled();
    expect(fn2).not.toHaveBeenCalled();
  });
});

describe('EventBus — once() 一次性监听', () => {
  it('should_call_listener_only_once', () => {
    const fn = vi.fn();
    EventBus.once('TEST', fn);
    EventBus.emit('TEST', 'a');
    EventBus.emit('TEST', 'b');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('a');
  });

  // BUG: once() 注册的监听器无法在触发前取消
  it('should_allow_cancelling_once_before_it_fires', () => {
    const fn = vi.fn();
    const sub = EventBus.once('TEST', fn);
    // once() 当前返回 EventBus（链式调用），没有 cancel 方法
    // 期望：返回可取消的订阅对象
    expect(typeof sub).toBe('object');
    expect(typeof sub.cancel).toBe('function');
    sub.cancel();
    EventBus.emit('TEST');
    expect(fn).not.toHaveBeenCalled();
  });
});

describe('EventBus — MAX_PER_EVENT 溢出', () => {
  it('should_drop_oldest_listener_when_limit_exceeded', () => {
    const fns = [];
    // 注册 65 个监听器（MAX_PER_EVENT=64）
    for (let i = 0; i < 65; i++) {
      const fn = vi.fn();
      fns.push(fn);
      EventBus.on('TEST', fn);
    }
    EventBus.emit('TEST');
    // 第一个监听器（index 0）应该被丢弃
    expect(fns[0]).not.toHaveBeenCalled();
    // 其余 64 个应该被调用
    for (let i = 1; i < 65; i++) {
      expect(fns[i]).toHaveBeenCalledTimes(1);
    }
  });

  // BUG: 溢出时 shift() 丢弃旧监听器没有任何日志/通知
  it('should_log_when_listener_is_dropped', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    for (let i = 0; i < 65; i++) {
      EventBus.on('TEST', () => {});
    }
    // 期望：至少有一次警告日志
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe('EventBus — emit() 异常隔离', () => {
  it('should_not_break_other_listeners_when_one_throws', () => {
    const fn1 = vi.fn(() => { throw new Error('boom'); });
    const fn2 = vi.fn();
    EventBus.on('TEST', fn1);
    EventBus.on('TEST', fn2);
    EventBus.emit('TEST');
    expect(fn2).toHaveBeenCalled();
  });
});

describe('EventBus — listenerCount', () => {
  it('should_return_correct_count', () => {
    expect(EventBus.listenerCount('TEST')).toBe(0);
    EventBus.on('TEST', () => {});
    EventBus.on('TEST', () => {});
    expect(EventBus.listenerCount('TEST')).toBe(2);
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setupGlobals } from '../helpers/mocks.js';

let ls;
beforeEach(async () => {
  ls = setupGlobals();
  ls._reset();
  vi.resetModules();
  await import('../../js/core/store.js');
  // store.js 通过 IIFE 赋值到全局 window.UserState
  ls.setItem('mindspeak.schemaVersion', '0');
});

function US() { return globalThis.UserState; }

describe('UserState — 基础 CRUD', () => {
  it('should_set_and_get_value', () => {
    US().set('test_key', { a: 1 });
    expect(US().get('test_key')).toEqual({ a: 1 });
  });

  it('should_return_fallback_when_key_not_found', () => {
    expect(US().get('nonexistent', 'default')).toBe('default');
  });

  it('should_return_fallback_on_json_parse_error', () => {
    localStorage.setItem('corrupt_key', '{invalid json');
    expect(US().get('corrupt_key', 'fallback')).toBe('fallback');
  });

  it('should_remove_key', () => {
    US().set('to_delete', 42);
    US().remove('to_delete');
    expect(US().get('to_delete', null)).toBeNull();
  });
});

describe('UserState — set() 失败处理', () => {
  it('should_return_false_when_quota_exceeded', () => {
    const origSetItem = localStorage.setItem;
    localStorage.setItem = vi.fn(() => { throw new DOMException('QuotaExceededError', 'QuotaExceededError'); });
    const result = US().set('key', 'value');
    expect(result).toBe(false);
    localStorage.setItem = origSetItem;
  });
});

describe('UserState — update() 原子性', () => {
  it('should_return_updated_value_on_success', () => {
    US().set('counter', 10);
    const result = US().update('counter', (v) => v + 5);
    expect(result).toBe(15);
    expect(US().get('counter')).toBe(15);
  });

  it('should_return_fallback_when_key_not_found', () => {
    const result = US().update('missing', (v) => v || 0, 0);
    expect(result).toBe(0);
  });

  // BUG 测试：update() 在 set() 失败时仍返回新值
  it('should_indicate_failure_when_set_fails', () => {
    US().set('counter', 10);
    const origSetItem = localStorage.setItem;
    localStorage.setItem = vi.fn(() => { throw new DOMException('QuotaExceededError', 'QuotaExceededError'); });
    const result = US().update('counter', (v) => v + 5);
    // 当前实现返回 15（新值），但实际 localStorage 里还是 10
    // 期望：应该返回 null 表示失败
    expect(result).toBeNull();
    localStorage.setItem = origSetItem;
  });
});

describe('UserState — migrate() 幂等性', () => {
  it('should_run_migration_when_version_is_0', () => {
    ls.setItem('mindspeak.schemaVersion', '0');
    ls.setItem('gamification', JSON.stringify({ points: 'bad' }));
    const ver = US().migrate();
    expect(ver).toBe(1);
    const gami = JSON.parse(localStorage.getItem('gamification'));
    expect(gami.points).toBe(0);
  });

  it('should_not_rerun_migration_when_already_at_current_version', () => {
    ls.setItem('mindspeak.schemaVersion', '1');
    ls.setItem('gamification', JSON.stringify({ points: 50, level: 1, streak: 0, totalWords: 0, totalExercises: 0 }));
    const ver = US().migrate();
    expect(ver).toBe(1);
    const gami = JSON.parse(localStorage.getItem('gamification'));
    expect(gami.points).toBe(50);
  });

  // BUG 测试：schemaVersion 写入失败后 migrate 重复执行
  it('should_handle_schema_version_write_failure_gracefully', () => {
    ls.setItem('mindspeak.schemaVersion', '0');
    ls.setItem('gamification', JSON.stringify({ points: 100, level: 2, streak: 5, totalWords: 50, totalExercises: 100 }));
    const origSetRaw = US().setRaw;
    let callCount = 0;
    US().setRaw = vi.fn((key, value) => {
      if (key === 'mindspeak.schemaVersion') {
        callCount++;
        if (callCount <= 1) return false;
      }
      return origSetRaw(key, value);
    });
    US().migrate();
    US().migrate();
    const gami = JSON.parse(localStorage.getItem('gamification'));
    // 即使 schemaVersion 写入失败，gamification 的 points 100 不应被改成 0
    expect(gami.points).toBe(100);
    US().setRaw = origSetRaw;
  });
});

describe('UserState — reset() 全量清除', () => {
  it('should_clear_all_business_keys_when_no_args', () => {
    US().set('word_progress', { w1: 1 });
    US().set('mistakes', []);
    US().set('gamification', { points: 10 });
    US().reset();
    expect(US().get('word_progress', null)).toBeNull();
    expect(US().get('mistakes', null)).toBeNull();
    expect(US().get('gamification', null)).toBeNull();
  });

  it('should_clear_only_specified_keys', () => {
    US().set('word_progress', { w1: 1 });
    US().set('mistakes', []);
    US().reset(['word_progress']);
    expect(US().get('word_progress', null)).toBeNull();
    expect(US().get('mistakes')).toEqual([]);
  });
});

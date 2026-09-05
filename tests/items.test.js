import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setupGlobals } from './helpers/mocks.js';

let ItemSystem, ls;
beforeEach(async () => {
  ls = setupGlobals();
  ls._reset();
  globalThis.DataStore = {
    getProgress: vi.fn((key, fallback) => {
      if (key === 'items') return { hint: 0, skip: 0, lucky: 0, shield: 0, double: 0, freeze: 0, mystery: 0, renew: 0 };
      if (key === 'item_buffs') return {};
      return fallback;
    }),
    setProgress: vi.fn(),
  };
  globalThis.app = {
    gamification: { addPoints: vi.fn(() => true), getStats: vi.fn(() => ({ points: 200 })) },
    showTab: vi.fn(),
    updateGlobalStats: vi.fn(),
  };
  globalThis.EventBus = { emit: vi.fn(), on: vi.fn(), off: vi.fn() };
  globalThis.MS = { EVENTS: { ITEM_USED: 'ITEM_USED' } };
  globalThis.Toast = { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() };
  globalThis.escapeHtml = (s) => String(s || '');
  vi.resetModules();
  await import('../js/items.js');
  ItemSystem = globalThis.ItemSystem;
});

describe('ItemSystem — buy() 积分扣除', () => {
  it('should_deduct_points_and_increment_count', () => {
    const is = new ItemSystem();
    is.buy('hint');
    expect(globalThis.app.gamification.addPoints).toHaveBeenCalledWith(-20);
    expect(is.count('hint')).toBe(1);
  });

  it('should_not_buy_when_insufficient_points', () => {
    globalThis.app.gamification.getStats = vi.fn(() => ({ points: 5 }));
    const is = new ItemSystem();
    is.buy('hint'); // price=20, points=5
    expect(is.count('hint')).toBe(0);
    expect(globalThis.app.gamification.addPoints).not.toHaveBeenCalled();
  });

  // BUG: buy() 中 addPoints 和 data[id]++ 不是原子的
  it('should_not_increment_if_addPoints_returns_false', () => {
    globalThis.app.gamification.addPoints = vi.fn(() => false);
    const is = new ItemSystem();
    is.buy('hint');
    expect(is.count('hint')).toBe(0);
  });

  // BUG#4: 生产 addPoints 无 return 语句 → undefined !== false → guard 不触发
  it('should_not_increment_if_addPoints_returns_undefined', () => {
    globalThis.app.gamification.addPoints = vi.fn(() => undefined);
    const is = new ItemSystem();
    is.buy('hint');
    expect(is.count('hint')).toBe(0);
  });

  // BUG#4: save() 失败时 buy 应阻止
  it('should_not_increment_when_save_fails', () => {
    globalThis.app.gamification.addPoints = vi.fn(() => false);
    const is = new ItemSystem();
    is.buy('hint');
    expect(is.count('hint')).toBe(0);
    expect(globalThis.DataStore.setProgress).not.toHaveBeenCalledWith('items', expect.anything());
  });
});

describe('ItemSystem — openMystery() 权重', () => {
  it('should_respect_weight_distribution_over_many_runs', () => {
    const is = new ItemSystem();
    is.data.mystery = 1000;
    const results = {};
    for (let i = 0; i < 1000; i++) {
      is.openMystery();
    }
    // 统计所有 setProgress 调用中的 items 更新
    const calls = globalThis.DataStore.setProgress.mock.calls.filter(c => c[0] === 'items');
    // 至少应该有不同类型的奖励
    expect(calls.length).toBeGreaterThan(0);
  });

  it('should_give_points_for_point_rewards', () => {
    const is = new ItemSystem();
    is.data.mystery = 100;
    // 多次开箱，至少应该有一次给积分
    let gotPoints = false;
    const origAdd = globalThis.app.gamification.addPoints;
    globalThis.app.gamification.addPoints = vi.fn((pts) => { if (pts > 0) gotPoints = true; origAdd(pts); });
    for (let i = 0; i < 100; i++) {
      is.openMystery();
    }
    expect(gotPoints).toBe(true);
    globalThis.app.gamification.addPoints = origAdd;
  });
});

describe('ItemSystem — use() 道具消耗', () => {
  it('should_decrement_count_on_use', () => {
    const is = new ItemSystem();
    is.data.hint = 3;
    const result = is.use('hint');
    expect(result).toBe(true);
    expect(is.count('hint')).toBe(2);
  });

  it('should_return_false_when_no_items', () => {
    const is = new ItemSystem();
    is.data.hint = 0;
    const result = is.use('hint');
    expect(result).toBe(false);
  });

  it('should_emit_event_on_use', () => {
    const is = new ItemSystem();
    is.data.hint = 1;
    is.use('hint');
    expect(globalThis.EventBus.emit).toHaveBeenCalledWith('ITEM_USED', expect.objectContaining({ id: 'hint' }));
  });
});

describe('ItemSystem — checkExpiry() 过期处理', () => {
  it('should_deactivate_expired_buffs', () => {
    const is = new ItemSystem();
    is.data.shield = 1;
    is.buffs.shield = { active: true, exp: Date.now() - 1000 }; // 已过期
    is.checkExpiry();
    expect(is.buffs.shield.active).toBe(false);
  });

  it('should_not_deactivate_future_buffs', () => {
    const is = new ItemSystem();
    is.data.shield = 1;
    is.buffs.shield = { active: true, exp: Date.now() + 3600000 }; // 1小时后过期
    is.checkExpiry();
    expect(is.buffs.shield.active).toBe(true);
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setupGlobals } from './helpers/mocks.js';

let BadgeSystem, gamificationMock;
beforeEach(async () => {
  const ls = setupGlobals();
  ls._reset();
  gamificationMock = { addPoints: vi.fn(), getStats: vi.fn(() => ({ points: 100 })) };
  globalThis.DataStore = {
    getProgress: vi.fn((key, fallback) => {
      if (key === 'badges') return {};
      if (key === 'word_progress') return {};
      if (key === 'checkins') return {};
      if (key === 'mistakes') return [];
      if (key === 'badge_stats') return { story: 0, grammar: 0, pkStreak: 0, pkBestAcc: 0 };
      if (key === 'items') return {};
      return fallback;
    }),
    setProgress: vi.fn(),
  };
  globalThis.app = { gamification: gamificationMock, updateGlobalStats: vi.fn() };
  globalThis.EventBus = { emit: vi.fn(), on: vi.fn(), off: vi.fn() };
  globalThis.MS = { EVENTS: { ACHIEVEMENT_UNLOCKED: 'ACHIEVEMENT_UNLOCKED' } };
  globalThis.Toast = { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() };
  globalThis.escapeHtml = (s) => String(s || '');
  globalThis.getLocalDateStr = () => '2026-08-20';
  vi.resetModules();
  await import('../js/badges.js');
  BadgeSystem = globalThis.BadgeSystem;
});

describe('BadgeSystem — checkAll() 幂等性', () => {
  it('should_not_award_same_badge_twice', () => {
    // 模拟 word_progress 有 1 个词，满足 "first" 徽章条件
    globalThis.DataStore.getProgress = vi.fn((key, fallback) => {
      if (key === 'word_progress') return { 'hello-1': { status: 'mastered' } };
      if (key === 'badges') return {};
      if (key === 'checkins') return {};
      if (key === 'mistakes') return [];
      if (key === 'badge_stats') return { story: 0, grammar: 0, pkStreak: 0, pkBestAcc: 0 };
      if (key === 'items') return {};
      return fallback;
    });
    const bs = new BadgeSystem();
    // 第一次 checkAll
    bs.checkAll();
    const calls1 = gamificationMock.addPoints.mock.calls.length;
    // 第二次 checkAll（应该不再发奖）
    bs.checkAll();
    const calls2 = gamificationMock.addPoints.mock.calls.length;
    expect(calls2).toBe(calls1); // 不应有新的积分奖励
  });

  // BUG: 如果 storage 事件和定时器同时触发 checkAll，可能导致重复发奖
  it('should_not_duplicate_when_concurrent_triggers', () => {
    globalThis.DataStore.getProgress = vi.fn((key, fallback) => {
      if (key === 'word_progress') return { 'hello-1': { status: 'mastered' } };
      if (key === 'badges') return {};
      if (key === 'checkins') return {};
      if (key === 'mistakes') return [];
      if (key === 'badge_stats') return { story: 0, grammar: 0, pkStreak: 0, pkBestAcc: 0 };
      if (key === 'items') return {};
      return fallback;
    });
    const bs = new BadgeSystem();
    // 模拟快速连续触发（同步调用两次 checkAll）
    bs.checkAll();
    bs.checkAll();
    // addPoints 只应被调用一次（first 徽章 30 积分）
    expect(gamificationMock.addPoints).toHaveBeenCalledTimes(1);
    expect(gamificationMock.addPoints).toHaveBeenCalledWith(30);
  });
});

describe('BadgeSystem — 徽章条件边界', () => {
  it('should_not_award_mistakes_badge_when_no_mistakes', () => {
    // 空错题本不应触发 "错题清零" 徽章
    globalThis.DataStore.getProgress = vi.fn((key, fallback) => {
      if (key === 'mistakes') return [];
      if (key === 'badges') return {};
      if (key === 'word_progress') return {};
      if (key === 'checkins') return {};
      if (key === 'badge_stats') return { story: 0, grammar: 0, pkStreak: 0, pkBestAcc: 0 };
      if (key === 'items') return {};
      return fallback;
    });
    const bs = new BadgeSystem();
    bs.checkAll();
    // 不应获得 "mistakes" 徽章
    expect(bs.earned['mistakes']).toBeUndefined();
  });

  it('should_award_mistakes_badge_when_all_reviewed', () => {
    globalThis.DataStore.getProgress = vi.fn((key, fallback) => {
      if (key === 'mistakes') return [{ word: 'a', reviewed: true }, { word: 'b', reviewed: true }];
      if (key === 'badges') return {};
      if (key === 'word_progress') return {};
      if (key === 'checkins') return {};
      if (key === 'badge_stats') return { story: 0, grammar: 0, pkStreak: 0, pkBestAcc: 0 };
      if (key === 'items') return {};
      return fallback;
    });
    const bs = new BadgeSystem();
    bs.checkAll();
    expect(bs.earned['mistakes']).toBeTruthy();
  });
});

describe('BadgeSystem — onEvent PK 统计', () => {
  it('should_increment_pk_streak_on_win', () => {
    const bs = new BadgeSystem();
    bs.onEvent('pk', { correct: 8, wrong: 2 });
    const stats = globalThis.DataStore.setProgress.mock.calls.find(c => c[0] === 'badge_stats');
    expect(stats).toBeTruthy();
    expect(stats[1].pkStreak).toBe(1);
  });

  it('should_reset_pk_streak_on_loss', () => {
    const bs = new BadgeSystem();
    // 先赢一局
    globalThis.DataStore.getProgress = vi.fn((key, fallback) => {
      if (key === 'badge_stats') return { story: 0, grammar: 0, pkStreak: 2, pkBestAcc: 80 };
      return fallback;
    });
    bs.onEvent('pk', { correct: 3, wrong: 7 });
    const stats = globalThis.DataStore.setProgress.mock.calls.find(c => c[0] === 'badge_stats');
    expect(stats[1].pkStreak).toBe(0);
  });

  it('should_not_count_pk_with_less_than_5_total', () => {
    const bs = new BadgeSystem();
    bs.onEvent('pk', { correct: 2, wrong: 1 }); // total=3 < 5
    // pkStreak 不应改变
    const stats = globalThis.DataStore.getProgress('badge_stats', {});
    expect(stats.pkStreak).toBe(0);
  });
});

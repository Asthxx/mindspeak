import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setupGlobals } from '../helpers/mocks.js';

let recordActivity, ctx;
beforeEach(() => {
  setupGlobals();
  vi.clearAllMocks();
  // 复制 app.js:5794-5804 的 recordActivity 实现
  ctx = {
    gamification: { recordActivity: vi.fn() },
    dailyChallenge: { updateProgress: vi.fn() },
    badgeSystem: { checkAll: vi.fn() },
    updateGlobalStats: vi.fn(),
  };
  recordActivity = function(type, count, isNewWord, wordKey) {
    try {
      if (ctx.gamification) {
        var n = count || 1;
        for (var i = 0; i < n; i++) ctx.gamification.recordActivity(type);
      }
      if (ctx.dailyChallenge) ctx.dailyChallenge.updateProgress(type, count, isNewWord, wordKey);
      if (ctx.badgeSystem) ctx.badgeSystem.checkAll();
      ctx.updateGlobalStats();
    } catch(e) { console.error('[recordActivity] bridge failed:', e); }
  };
});

describe('recordActivity — 正常路径', () => {
  it('should_call_gamification_recordActivity', () => {
    recordActivity('word', 3);
    expect(ctx.gamification.recordActivity).toHaveBeenCalledTimes(3);
  });

  it('should_call_dailyChallenge_updateProgress', () => {
    recordActivity('word', 5, true, 'hello');
    expect(ctx.dailyChallenge.updateProgress).toHaveBeenCalledWith('word', 5, true, 'hello');
  });

  it('should_call_badgeSystem_checkAll', () => {
    recordActivity('word');
    expect(ctx.badgeSystem.checkAll).toHaveBeenCalled();
  });

  it('should_call_updateGlobalStats', () => {
    recordActivity('word');
    expect(ctx.updateGlobalStats).toHaveBeenCalled();
  });

  it('should_handle_missing_subsystems_gracefully', () => {
    ctx.gamification = null;
    ctx.dailyChallenge = null;
    ctx.badgeSystem = null;
    expect(() => recordActivity('word')).not.toThrow();
  });
});

// BUG#2: 桥接失败静默吞掉，无法诊断
describe('recordActivity — 错误传播', () => {
  it('should_log_when_gamification_throws', () => {
    ctx.gamification.recordActivity = vi.fn(() => { throw new Error('DB locked'); });
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    recordActivity('word');
    // 修复后期望：console.error 被调用，记录错误
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('[recordActivity]'),
      expect.any(Error)
    );
    spy.mockRestore();
  });

  it('should_not_break_caller_when_bridge_fails', () => {
    ctx.gamification.recordActivity = vi.fn(() => { throw new Error('fail'); });
    // 即使桥接失败，不应向调用方抛错（保持现有语义）
    expect(() => recordActivity('word')).not.toThrow();
  });
});

// 集成测试：学习闭环 —— 单词学习 → 打卡/进度落库 → 徽章解锁+积分 → 首页统计刷新
// 真实 DOM + 真实 app.js/dashboard.js/badges.js，经 bootstrapApp 加载
// 注意：word_progress 写入有 300ms 节流（app.js saveProgress），badge/dashboard 读 storage，
// 真实用户路径是学习后稍后查看 —— 测试在 learn() 后等待 flush 再断言，模拟真实时序。
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { bootstrapApp } from './helpers/app-bootstrap.js';

const today = () => {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const FLUSH = 350; // 覆盖 word_progress 300ms 节流窗口

async function learnOneWord() {
  window.app.showTab('word');
  document.getElementById('btn-known').click();
  await sleep(FLUSH);
}

describe('学习闭环集成', () => {
  beforeEach(async () => {
    vi.resetModules();
    await bootstrapApp();
  });

  it('should_learn_word_persist_progress_and_checkin', async () => {
    await learnOneWord();
    // word_progress 已落盘（storage），checkins 今日已打卡
    const wp = window.DataStore.getProgress('word_progress', {});
    const p = wp['apple-0'];
    expect(p).toBeTruthy();
    expect(p.lastReviewed).toBe(today());
    const checkins = window.DataStore.getProgress('checkins', {});
    expect(checkins[today()]).toBeGreaterThanOrEqual(1);
  });

  it('should_unlock_first_badge_and_award_points_once', async () => {
    const before = window.app.gamification.getStats().points;
    await learnOneWord();
    // recordActivity 内已触发 badgeSystem.checkAll()（app.js:5813），节流窗口过后 storage 已一致
    window.app.badgeSystem.checkAll();
    const earned = window.DataStore.getProgress('badges', {});
    expect(earned.first).toBe(today());
    // 幂等：再次 checkAll 不重复发奖（积分只加一次）
    const pointsAfterFirst = window.app.gamification.getStats().points;
    expect(pointsAfterFirst).toBeGreaterThan(before);
    window.app.badgeSystem.checkAll();
    expect(window.DataStore.getProgress('badges', {}).first).toBe(today());
    expect(window.app.gamification.getStats().points).toBe(pointsAfterFirst);
  });

  it('should_refresh_dashboard_after_learning', async () => {
    await learnOneWord();
    window.app.dashboardModule.render();
    expect(document.getElementById('dash-today').textContent).toBe('1');
    expect(document.getElementById('dash-new').textContent).toBe('1');
    expect(document.getElementById('dash-mastered').textContent).toBe('0');
    expect(document.getElementById('dash-streak').textContent).toBe('1');
  });

  it('should_emit_achievement_unlocked_event', async () => {
    let emitted = null;
    window.EventBus.on(window.MS.EVENTS.ACHIEVEMENT_UNLOCKED, (data) => { emitted = data; });
    await learnOneWord();
    window.app.badgeSystem.checkAll();
    expect(emitted).toBeTruthy();
    expect(emitted.id).toBe('first');
  });
});
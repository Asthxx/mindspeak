import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupGlobals } from './helpers/mocks.js';

// 维度2 测试：AiCoach 弱点模式+趋势 / 三级建议 / 每周报告 / 六维雷达
let ls;
beforeEach(async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-15T08:00:00'));
  ls = setupGlobals();
  ls._reset();

  globalThis.DataStore = {
    getProgress: vi.fn((key, fallback) => {
      if (key === 'word_progress') return {
        'apple-1': { status: 'mastered', nextReview: null, firstSeen: '2026-01-13', lastReviewed: '2026-01-15' },
        'banana-2': { status: 'learning', nextReview: '2026-01-15', firstSeen: '2026-01-15', lastReviewed: '2026-01-15' },
        'cat-3': { status: 'learning', nextReview: '2026-01-16', firstSeen: '2026-01-14', lastReviewed: '2026-01-14' }
      };
      if (key === 'checkins') return { '2026-01-08': 2, '2026-01-09': 1, '2026-01-10': 3, '2026-01-11': 2, '2026-01-12': 4, '2026-01-13': 5, '2026-01-14': 4, '2026-01-15': 3 };
      if (key === 'mistakes') return [
        { source: 'spelling', word: 'peice' }, { source: 'spelling', word: 'freind' },
        { source: 'grammar', word: 'goed' }, { source: 'pk', word: 'happy' }
      ];
      if (key === 'daily_goal') return 10;
      if (key === 'gamification') return { points: 100, level: 2 };
      return fallback;
    }),
    setProgress: vi.fn(() => true),
  };
  globalThis.escapeHtml = (s) => String(s || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  globalThis.getLocalDateStr = (d) => {
    if (d instanceof Date) {
      const pad = (x) => String(x).padStart(2, '0');
      return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    }
    return '2026-01-15';
  };
  globalThis.calculateStreak = vi.fn(() => 3);
  globalThis.Toast = { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() };
  globalThis.EventBus = { emit: vi.fn(), on: vi.fn(), off: vi.fn() };

  document.body.innerHTML = `
    <div class="ai-grid">
      <div class="ai-card"><div id="ai-ov-streak">0</div><div id="ai-ov-mastered">0</div><div id="ai-ov-week">0</div><div id="ai-ov-level">Lv.1</div><div id="ai-ov-points">0</div></div>
      <div class="ai-card"><div class="ai-weak" id="ai-weakness"></div></div>
      <div class="ai-card"><ul class="ai-tips" id="ai-tips"></ul></div>
      <div class="ai-card"><div class="ai-actions" id="ai-actions"></div></div>
    </div>
  `;

  vi.resetModules();
  await import('../js/ai-coach.js');
});

afterEach(() => {
  vi.useRealTimers();
});

function makeCoach() {
  return new globalThis.AiCoachModule();
}

describe('AiCoachModule — 渲染基础', () => {
  it('should_render_overview_stats', () => {
    makeCoach();
    expect(document.getElementById('ai-ov-streak').textContent).toBe('3');
    expect(document.getElementById('ai-ov-mastered').textContent).toBe('1');
    expect(document.getElementById('ai-ov-level').textContent).toContain('Lv.');

    // 本周 checkins（2026-01-09..15 共 22 词）
    expect(Number(document.getElementById('ai-ov-week').textContent)).toBeGreaterThan(0);
  });

  it('should_not_crash_on_empty_data', () => {
    globalThis.DataStore.getProgress.mockImplementation((key, fb) => fb);
    globalThis.calculateStreak.mockReturnValue(0);
    expect(() => makeCoach()).not.toThrow();
  });
});

describe('AiCoachModule — 弱点模式与趋势（维度2）', () => {
  it('should_show_weakness_pattern_description', () => {
    makeCoach();
    const html = document.getElementById('ai-weakness').innerHTML;
    expect(html).toContain('拼写');
    expect(html).toContain('音形');
  });

  it('should_show_7day_trend', () => {
    makeCoach();
    const html = document.getElementById('ai-weakness').innerHTML;
    expect(html).toContain('近 7 天');
  });
});

describe('AiCoachModule — 三级建议（维度2）', () => {
  it('should_tier_tips_urgent_when_due_heavy', () => {
    // 构造高待复习：5 个到期
    const wp = {};
    for (let i = 1; i <= 5; i++) wp['w' + i] = { status: 'learning', nextReview: '2026-01-15' };
    globalThis.DataStore.getProgress.mockImplementation((key, fb) => {
      if (key === 'word_progress') return wp;
      if (key === 'checkins') return { '2026-01-15': 3 };
      if (key === 'mistakes') return [];
      return fb;
    });
    makeCoach();
    const tips = Array.from(document.querySelectorAll('#ai-tips li')).map((li) => li.textContent).join('|');
    expect(tips).toContain('紧急');
  });

  it('should_tier_tips_encourage_when_streak_good', () => {
    globalThis.calculateStreak.mockReturnValue(9);
    const wp = { 'x-1': { status: 'mastered', nextReview: null, firstSeen: '2026-01-10', lastReviewed: '2026-01-15' } };
    globalThis.DataStore.getProgress.mockImplementation((key, fb) => {
      if (key === 'word_progress') return wp;
      if (key === 'checkins') return { '2026-01-09': 2, '2026-01-10': 2, '2026-01-11': 2, '2026-01-12': 2, '2026-01-13': 2, '2026-01-14': 2, '2026-01-15': 2 };
      if (key === 'mistakes') return [];
      return fb;
    });
    makeCoach();
    const tips = Array.from(document.querySelectorAll('#ai-tips li')).map((li) => li.textContent).join('|');
    expect(tips).toContain('鼓励');
  });
});

describe('AiCoachModule — 每周报告与雷达（维度2）', () => {
  it('should_render_weekly_report_with_trend', () => {
    makeCoach();
    const el = document.getElementById('ai-report');
    expect(el).not.toBeNull();
    const html = el.innerHTML;
    expect(html).toContain('本周');
    // 本周（近7天 01/09-01/15）22 词 vs 上周（01/05-01/11 前 7 天 8 词）→ 上升
    expect(html).toContain('22');
  });

  it('should_render_radar_with_six_axes', () => {
    makeCoach();
    const el = document.getElementById('ai-radar');
    expect(el).not.toBeNull();
    const svg = el.querySelector('svg');
    expect(svg).not.toBeNull();
    // 六边形网格层含 6 个多边形点
    expect(el.querySelectorAll('polygon').length).toBeGreaterThanOrEqual(6);
  });
});
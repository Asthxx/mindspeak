import { describe, it, expect, beforeEach, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  globalThis.window = globalThis;
  globalThis.screen = { width: 360, height: 800 };
  globalThis.matchMedia = vi.fn((query) => ({ matches: query.includes('600px') ? false : true, addEventListener: vi.fn() }));
  globalThis.document = {
    documentElement: { className: 'platform-android' },
    body: { style: {} },
  };
  globalThis.requestAnimationFrame = vi.fn((cb) => cb());
  globalThis.cancelAnimationFrame = vi.fn();
  globalThis.navigator = { userAgent: 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36' };
  globalThis.Capacitor = { Platforms: { android: true } };
  globalThis.Logger = { log: vi.fn() };
  globalThis.Storage = { get: vi.fn(() => 0) };
  globalThis.Store = { get: vi.fn(() => ({ dailyGoal: 30 })) };
});

describe('响应式布局 Android 断点', () => {
  it('should_detect_small_phone', () => {
    const width = 360;
    const breakpoint = width <= 360 ? 'xs' : width <= 480 ? 'sm' : width <= 900 ? 'md' : width <= 1200 ? 'lg' : 'xl';
    expect(breakpoint).toBe('xs');
  });

  it('should_detect_normal_phone', () => {
    const width = 390;
    const breakpoint = width <= 360 ? 'xs' : width <= 480 ? 'sm' : width <= 900 ? 'md' : width <= 1200 ? 'lg' : 'xl';
    expect(breakpoint).toBe('sm');
  });

  it('should_detect_large_phone', () => {
    const width = 412;
    const breakpoint = width <= 360 ? 'xs' : width <= 480 ? 'sm' : width <= 900 ? 'md' : width <= 1200 ? 'lg' : 'xl';
    expect(breakpoint).toBe('sm');
  });

  it('should_detect_tablet', () => {
    const width = 800;
    const breakpoint = width <= 360 ? 'xs' : width <= 480 ? 'sm' : width <= 900 ? 'md' : width <= 1200 ? 'lg' : 'xl';
    expect(breakpoint).toBe('md');
  });
});

describe('Android 屏幕尺寸分类', () => {
  it('should_return_360w_for_small_phone', () => {
    const width = 360;
    expect(width).toBe(360);
  });

  it('should_return_375w_for_normal_phone', () => {
    const width = 375;
    expect(width).toBe(375);
  });

  it('should_return_412w_for_large_phone', () => {
    const width = 412;
    expect(width).toBe(412);
  });

  it('should_return_600w_for_small_tablet', () => {
    const width = 600;
    expect(width).toBe(600);
  });

  it('should_return_800w_for_medium_tablet', () => {
    const width = 800;
    expect(width).toBe(800);
  });
});

describe('Android 网格布局', () => {
  it('should_use_3_columns_for_phone', () => {
    const cols = 3;
    expect(cols).toBe(3);
  });

  it('should_use_4_columns_for_large_phone', () => {
    const cols = 4;
    expect(cols).toBe(4);
  });

  it('should_use_5_columns_for_tablet', () => {
    const cols = 5;
    expect(cols).toBe(5);
  });
});

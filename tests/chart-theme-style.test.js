/**
 * 周图表主题色注入的回归防线
 *
 * ChartModule 把进度条渐变色写进 <style id="week-days-list-theme">，
 * 但 index.html 里从来没有这个元素，原实现只在"元素已存在"时才写入 —— 于是
 * .week-row-fill 只剩高度和圆角、没有 background，进度条整条透明。
 * 修复方式改为按需创建，这里守住"元素存在 + 真的写进了 background"。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { bootstrapApp } from './helpers/app-bootstrap.js';

function seedCheckins() {
  const pad = (n) => String(n).padStart(2, '0');
  const out = {};
  for (let i = 0; i < 3; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out[`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`] = 10 - i;
  }
  window.DataStore.setProgress('checkins', out);
}

describe('ChartModule — 周图表主题样式注入', () => {
  beforeEach(async () => {
    vi.resetModules();
    await bootstrapApp();
    seedCheckins();
    window.app.chartModule.render();
  });

  it('should_create_theme_style_element_on_demand', () => {
    const style = document.getElementById('week-days-list-theme');
    expect(style).toBeTruthy();
    expect(style.tagName).toBe('STYLE');
  });

  it('should_give_progress_bar_a_background', () => {
    const css = document.getElementById('week-days-list-theme').textContent;
    expect(css).toContain('.week-row-fill{background:');
    expect(document.querySelectorAll('.week-row-fill').length).toBeGreaterThan(0);
  });

  it('should_clear_theme_css_in_empty_state', () => {
    window.DataStore.setProgress('checkins', {});
    window.app.chartModule.render();
    expect(document.getElementById('week-days-list-theme').textContent).toBe('');
    expect(document.querySelector('.week-empty')).toBeTruthy();
  });
});

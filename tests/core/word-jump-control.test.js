// 跳页控件「智能联动」（2026-10-17 用户选定方案）
// 控件二合一：未聚焦时回显当前页码（位置指示 + 跳转器），聚焦即全选
// （可直接输入新序号覆盖），跳转后不清空、回显落点并全选待连跳；
// 失焦丢弃未提交输入。
// 选中的 select() 行为依赖浏览器实现，只在本文件覆盖值/焦点/跳转语义，
// 真实 Chromium 的 select 断言在 scripts/verify-word-page.mjs。
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { bootstrapApp } from '../helpers/app-bootstrap.js';

describe('跳页控件与当前卡片联动', () => {
  beforeEach(async () => {
    vi.resetModules();
    await bootstrapApp();
    window.app.showTab('word');
  });

  afterEach(() => {
    window.location.hash = '';
  });

  const input = () => document.getElementById('word-jump-input');
  const wm = () => window.app.wordModule;

  it('未聚焦时输入框回显当前页码', () => {
    expect(input().value, '进入页面后输入框没有回显当前页码').toBe(String(wm().currentIndex + 1));
  });

  it('翻卡后输入框跟随更新', () => {
    wm().nextWord();
    wm().nextWord();
    expect(input().value).toBe(String(wm().currentIndex + 1));
    wm().prevWord();
    expect(input().value).toBe(String(wm().currentIndex + 1));
  });

  it('切换词库后输入框回显新词库的当前位置', () => {
    wm().selectCategory('1');
    expect(input().value).toBe(String(wm().currentIndex + 1));
  });

  it('聚焦中输入不被翻卡覆盖（用户正在改数）', () => {
    const el = input();
    el.focus();
    el.value = '7';
    expect(document.activeElement, 'jsdom 里 focus 未生效，这条用例失去意义').toBe(el);
    wm().nextWord();
    expect(el.value, '聚焦态被翻卡冲掉了，用户输入丢失').toBe('7');
  });

  it('失焦后丢弃未提交输入，回显当前页码', async () => {
    const el = input();
    el.focus();
    el.value = '999';          // 输入了但没回车/没点跳转
    el.blur();
    // 实现里失焦同步延迟一帧（防 blur 先于 click 抹掉输入），这里等过它
    await new Promise(r => setTimeout(r, 30));
    expect(el.value, '未提交的输入没有丢弃').toBe(String(wm().currentIndex + 1));
  });

  it('跳转后不清空：值为落点页码', () => {
    const el = input();
    el.focus();
    el.value = '3';
    wm().jumpWord();
    expect(wm().currentIndex).toBe(2);
    expect(el.value, '跳转后输入框被清空（旧行为）或值不对').toBe('3');
  });

  it('越界输入夹到末页，并回显末页页码', () => {
    const el = input();
    el.focus();
    el.value = '99999';
    wm().jumpWord();
    const total = wm().getCardWords().length;
    expect(wm().currentIndex).toBe(total - 1);
    expect(el.value, '越界跳转后没有回显末页页码').toBe(String(total));
  });

  it('无效输入不跳转，保持原位', () => {
    const before = wm().currentIndex;
    const el = input();
    el.focus();
    el.value = '';             // number 输入框对非数字会 sanitize 成空
    wm().jumpWord();
    expect(wm().currentIndex).toBe(before);
  });

  it('回车与点按钮两条路径都跳转（绑定未互相破坏）', () => {
    const el = input();
    el.focus();
    el.value = '2';
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(wm().currentIndex, '回车路径失效').toBe(1);

    el.value = '4';
    document.getElementById('btn-jump-word').click();
    expect(wm().currentIndex, '按钮路径失效').toBe(3);
  });

  it('空池时输入框清空（不留误导性的旧序号）', () => {
    const el = input();
    el.value = '5';
    // 直接以空池调用同步（精选开关零勾选等场景会走到 showCurrentWord 的空池分支）
    wm()._syncJumpInput(0);
    expect(el.value, '空池时输入框仍留着旧序号').toBe('');
  });
});

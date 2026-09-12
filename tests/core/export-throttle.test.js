// 导出丢节流窗口修复（审查 P2 #5）：_collectBackup 必须读取 wordModule 内存态，
// 否则 saveProgress 的 300ms 节流窗口内未落盘的最新进度在导出时丢失。
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { bootstrapApp } from '../helpers/app-bootstrap.js';

describe('导出丢节流窗口 _collectBackup', () => {
  beforeEach(async () => {
    vi.resetModules();
    await bootstrapApp();
  });

  it('should_include_unflushed_word_progress_from_memory', () => {
    // 模拟节流窗口：内存态已有新记录，但 300ms 定时器未触发、localStorage 仍未落盘
    window.app.wordModule.wordProgress = { 'apple-5': { status: 'learning', nextReview: '2026-09-13' } };
    // 前提断言：这确实是一个"未落盘"状态（localStorage 里没有该记录）
    expect(Object.keys(window.DataStore.getProgress('word_progress', {}))).toEqual([]);
    const data = window.app._collectBackup(true);
    expect(data.wordProgress['apple-5'].status).toBe('learning');
  });
});
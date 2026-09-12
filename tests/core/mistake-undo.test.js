// 撤销"标记掌握"bug（审查 P2 #9）：undoLastKnown 用 localStorage 旧全表重建并整体覆盖
// wordModule.wordProgress，节流窗口内（300ms 未落盘）的新进度会被旧表一起冲掉。
// 修复方向：以内存态为基础、只还原本次真正动过的 key。
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { bootstrapApp } from '../helpers/app-bootstrap.js';

describe('错题撤销 undoLastKnown', () => {
  beforeEach(async () => {
    vi.resetModules();
    await bootstrapApp();
  });

function lastMarkedFor(records) {
    const mm = window.app.mistakesModule;
    window.app.mistakesModule._lastMarked = { word: 'apple', date: '2026-09-01', wpSnapshots: records };
  }

  it('should_restore_key_that_existed_only_in_memory', () => {
    // apple-0 刚被标记 mastered（还在 300ms 节流窗口内，localStorage 完全没有该记录）
    window.app.wordModule.wordProgress = { 'apple-0': { status: 'mastered', nextReview: '2026-09-13' } };
    lastMarkedFor([{ key: 'apple-0', snapshot: { status: 'learning', nextReview: '2026-09-20' } }]);
    window.app.mistakesModule.undoLastKnown();
    // 撤销应命中内存态记录并还原为 learning（而不是因 localStorage 无记录而静默失败）
    expect(window.app.wordModule.wordProgress['apple-0'].status).toBe('learning');
    expect(window.app.wordModule.wordProgress['apple-0'].nextReview).toBe('2026-09-20');
  });

  it('should_keep_other_unflushed_progress_when_undoing', () => {
    // cat-0 在节流窗口内从 learning 变为 mastered（内存态最新、未落盘）；
    // localStorage 里仍是 3 天前的旧 learning 记录。undo apple 时若拿旧表整体覆盖内存，
    // cat-0 会退回旧值——这是审查点描述的核心 bug。
    window.DataStore.setProgress('word_progress', {
      'cat-0': { status: 'learning', nextReview: '2026-09-09' }
    });
    window.app.wordModule.wordProgress = {
      'apple-0': { status: 'mastered', nextReview: '2026-09-13' },
      'cat-0': { status: 'mastered', nextReview: '2026-09-12' }
    };
    lastMarkedFor([{ key: 'apple-0', snapshot: { status: 'learning', nextReview: '2026-09-20' } }]);
    window.app.mistakesModule.undoLastKnown();
    expect(window.app.wordModule.wordProgress['cat-0'].status).toBe('mastered');
    expect(window.app.wordModule.wordProgress['apple-0'].status).toBe('learning');
  });
});
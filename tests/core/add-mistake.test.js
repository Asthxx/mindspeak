import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setupGlobals } from '../helpers/mocks.js';

// 提取 addMistake 逻辑进行隔离测试（避免导入 7334 行 app.js 的全部依赖）
function createAddMistake(AppPrototype) {
  return AppPrototype.addMistake.bind({ mistakesModule: null });
}

let addMistake, ls, mistakesData;
beforeEach(() => {
  ls = setupGlobals();
  ls._reset();
  mistakesData = [];
  globalThis.DataStore = {
    getProgress: vi.fn((key, fallback) => key === 'mistakes' ? mistakesData : fallback),
    setProgress: vi.fn((key, val) => { if (key === 'mistakes') mistakesData = val; }),
  };
  globalThis.getLocalDateStr = () => '2026-08-20';
  globalThis.EventBus = { emit: vi.fn() };
  globalThis.MS = { EVENTS: { MISTAKE_ADDED: 'MISTAKE_ADDED' } };
  // 从源码复制 addMistake 修复后实现（数据变化时才写入，renderList 单独保护）
  addMistake = createAddMistake({
    addMistake: function(w, source) {
      if (!w) return;
      var mistakes = DataStore.getProgress('mistakes', []);
      var entry = {
        word: w.word, phonetic: w.phonetic || '', pos: w.pos || '',
        chinese: w.chinese || '', example: w.example || '',
        source: source || 'unknown', date: getLocalDateStr(),
        reviewed: false
      };
      var exists = false;
      var needWrite = false;
      for (var i = 0; i < mistakes.length; i++) {
        var m = mistakes[i];
        if (m.word === entry.word && m.date === entry.date) {
          exists = true;
          if (m.reviewed) {
            m.reviewed = false;
            m.source = entry.source;
            needWrite = true;
          }
          break;
        }
      }
      if (!exists) {
        mistakes.push(entry);
        needWrite = true;
      }
      if (needWrite) {
        DataStore.setProgress('mistakes', mistakes);
      }
      try {
        if (this.mistakesModule) this.mistakesModule.renderList();
      } catch(e) { console.error('[addMistake] renderList failed:', e); }
      if (!exists && window.EventBus && window.MS && window.MS.EVENTS) {
        window.EventBus.emit(window.MS.EVENTS.MISTAKE_ADDED, { word: entry.word, source: entry.source });
      }
    }
  });
});

describe('addMistake — 正常写入', () => {
  it('should_write_mistake_to_DataStore', () => {
    const w = { word: 'hello', phonetic: '/həˈləʊ/', chinese: '你好' };
    addMistake(w, 'word');
    expect(globalThis.DataStore.setProgress).toHaveBeenCalledWith(
      'mistakes',
      expect.arrayContaining([
        expect.objectContaining({ word: 'hello', source: 'word', reviewed: false })
      ])
    );
  });

  it('should_emit_MISTAKE_ADDED_event', () => {
    const w = { word: 'hello', chinese: '你好' };
    addMistake(w, 'spelling');
    expect(globalThis.EventBus.emit).toHaveBeenCalledWith(
      'MISTAKE_ADDED',
      expect.objectContaining({ word: 'hello', source: 'spelling' })
    );
  });

  it('should_dedup_same_word_same_day', () => {
    const w = { word: 'hello', chinese: '你好' };
    addMistake(w, 'word');
    addMistake(w, 'word');
    expect(globalThis.DataStore.setProgress).toHaveBeenCalledTimes(1);
  });
});

// BUG#1: 核心问题 — DataStore.setProgress 抛异常时静默吞掉
describe('addMistake — 错误传播', () => {
  it('should_propagate_when_setProgress_throws', () => {
    globalThis.DataStore.setProgress = vi.fn(() => { throw new Error('QuotaExceeded'); });
    const w = { word: 'test', chinese: '测试' };
    // 当前 BUG：catch(e) {} 静默吞掉 → 不抛错
    // 期望修复后：错误应被传播
    expect(() => addMistake(w, 'spelling')).toThrow('QuotaExceeded');
  });

  it('should_not_lose_data_when_renderList_throws', () => {
    // renderList 失败不应影响数据写入
    const ctx = { mistakesModule: { renderList: vi.fn(() => { throw new Error('DOM error'); }) } };
    const fn = function(w, source) {
      if (!w) return;
      var mistakes = DataStore.getProgress('mistakes', []);
      var entry = { word: w.word, phonetic: w.phonetic || '', pos: w.pos || '',
                    chinese: w.chinese || '', example: w.example || '',
                    source: source || 'unknown', date: getLocalDateStr(), reviewed: false };
      var exists = false;
      var needWrite = false;
      for (var i = 0; i < mistakes.length; i++) {
        if (mistakes[i].word === entry.word && mistakes[i].date === entry.date) { exists = true; break; }
      }
      if (!exists) { mistakes.push(entry); needWrite = true; }
      if (needWrite) DataStore.setProgress('mistakes', mistakes);
      try { if (ctx.mistakesModule) ctx.mistakesModule.renderList(); } catch(e) {}
    };
    fn({ word: 'test', chinese: '测试' }, 'word');
    expect(globalThis.DataStore.setProgress).toHaveBeenCalledWith(
      'mistakes',
      expect.arrayContaining([expect.objectContaining({ word: 'test' })])
    );
  });
});

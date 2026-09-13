import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { setupGlobals } from '../helpers/mocks.js';

const HTML_PATH = resolve(__dirname, '../../index.html');
const html = readFileSync(HTML_PATH, 'utf8');

describe('数据脚本 async 化（手机打开就弹测评的根因修复）', () => {
  it('all-data/all-extra 应为 async（不再阻塞 DOMContentLoaded / App 初始化）', () => {
    expect(html).toMatch(/<script src="data\/all-data\.js" async[^>]*><\/script>/);
    expect(html).toMatch(/<script src="data\/all-extra\.js" async[^>]*><\/script>/);
    expect(html).not.toMatch(/data\/all-data\.js"[^>]*defer/);
    expect(html).not.toMatch(/data\/all-extra\.js"[^>]*defer/);
  });

  it('words-topup.js 仍须引用（补足各阶段至 10000 词，不可删）；async + 就绪重试守卫', () => {
    expect(html).toMatch(/<script src="data\/words-topup\.js" async[^>]*><\/script>/);
    const topup = readFileSync(resolve(__dirname, '../../data/words-topup.js'), 'utf8');
    expect(topup).toMatch(/typeof WORD_LIBRARY\s*===\s*"undefined"/);
    expect(topup).toMatch(/setTimeout\(run,\s*\d+\)/);
  });
});

describe('words-topup 回归——上轮误删独立标签导致词汇量 12万→6万', () => {
  it('先于 all-data 执行不抛错；词库就绪后自动补足至 10 万级以上', async () => {
    const sb = { window: {}, setTimeout };
    sb.window.window = sb.window;
    sb.self = sb.window;
    sb.globalThis = sb;
    vm.createContext(sb);
    const topup = readFileSync(resolve(__dirname, '../../data/words-topup.js'), 'utf8');
    // 顺序倒置：words-topup 先执行（WORD_LIBRARY 未定义）→ 只排重试，不抛错、不补词
    expect(() => vm.runInContext(topup, sb)).not.toThrow();
    await new Promise((r) => setTimeout(r, 30));
    vm.runInContext(readFileSync(resolve(__dirname, '../../data/all-data.js'), 'utf8'), sb);
    const base = countWords(sb.WORD_LIBRARY);
    expect(base).toBeLessThan(70000);
    // 等 ≥2 个重试周期（80ms×2）
    await new Promise((r) => setTimeout(r, 260));
    const full = countWords(sb.WORD_LIBRARY);
    expect(full).toBeGreaterThan(100000);
    expect(full - base).toBeGreaterThan(40000);
  });
});

function countWords(lib) {
  let t = 0;
  (lib.categories || []).forEach((c) => (t += c.words.length));
  return t;
}

describe('AssessmentModule.start — 词库未就绪（async 数据未到）守卫', () => {
  let startSpy;

  beforeEach(() => {
    vi.useFakeTimers();
    setupGlobals();
    // DataStore 提供空词库（模拟数据脚本尚未执行 endOfLoad）
    globalThis.DataStore = {
      getDefaultWords: vi.fn(() => ({ categories: [] })),
      getDefaultGrammar: vi.fn(() => []),
      getDefaultReading: vi.fn(() => []),
      getProgress: vi.fn(() => []),
      setProgress: vi.fn(),
    };
    globalThis.escapeHtml = (s) => String(s || '');
    globalThis.safeBind = () => {};
    globalThis.getLocalDateStr = () => '2026-08-20';
    globalThis.Toast = { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() };
    delete globalThis.WORD_LIBRARY;
    globalThis.WindowSpeechRecognition = undefined;
    vi.resetModules();
  });

  async function loadModule() {
    await import('../../js/assessment.js');
    return globalThis.AssessmentModule;
  }

  it('词库未就绪时 start 不报"词库数据为空"，提示加载中并安排重试', async () => {
    const AssessmentModule = await loadModule();
    const mod = new AssessmentModule();
    mod.start = mod.start.bind(mod);
    startSpy = vi.spyOn(mod, 'start').mockRestore ? vi.spyOn(mod, 'start') : null;
    // 直接绑定原型以确保递归调用可观测
    let calls = 0;
    const orig = AssessmentModule.prototype.start;
    AssessmentModule.prototype.start = function () {
      calls++;
      if (calls === 1) {
        orig.call(this);
        return;
      }
      return orig.call(this);
    };
    const inst = new AssessmentModule();
    inst.start();
    expect(globalThis.Toast.info).toHaveBeenCalledWith(expect.stringContaining('加载中'));
    expect(globalThis.Toast.error).not.toHaveBeenCalled();
    // 还有挂起的重试定时器
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    // 第二次触发时词库已就绪 → 不应再提示加载中（不再无谓重试）
    globalThis.WORD_LIBRARY = { categories: [{ stage: 1, name: 'x', words: [] }] };
    await vi.advanceTimersByTimeAsync(900);
    expect(calls).toBeGreaterThan(1);
  });
});
// 回归：词库延迟就绪后，背单词页必须补一次完整渲染
// 真机反馈（2026-10-17）：「页数没有加载出来；卡片显示的单词和我朗读发出的
// 单词不是同一个；按左右切换才变回来」。
// 根因：populateCategories 的 awaitLibrary ready 回调只补填分类、没有补渲染，
// 而 initUI 里的 showCurrentWord 是在空池状态下提前 return 的——于是卡片停在
// 静态占位词、#word-progress 与跳页总数停在 0/0 与 0，speakCurrent 读的却已是
// 真实当前词。按左右箭头会走 showCurrentWord，所以"切一下就好"。
//
// 本文件用 resetPageState 复现真机首开的真实 DOM 状态（静态占位态），
// 每一条断言在"不补渲染"的实现下都会失败（可证伪，不是陪衬）。
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { bootstrapApp, resetPageState } from '../helpers/app-bootstrap.js';

const sleep = ms => new Promise(r => setTimeout(r, ms));

describe('词库延迟就绪后背单词页的完整重渲染（回归）', () => {
  let savedCategories;

  beforeEach(async () => {
    vi.resetModules();
    await bootstrapApp();
    savedCategories = globalThis.WORD_LIBRARY.categories;
  });

  afterEach(() => {
    const wm = window.app && window.app.wordModule;
    if (wm && wm._libWaitHandle) { wm._libWaitHandle(); wm._libWaitHandle = null; }
    if (savedCategories) globalThis.WORD_LIBRARY.categories = savedCategories;
  });

  // 复现真机首开路径：重新挂载静态 DOM（卡片=占位词 Abandon、页码 0/0、
  // 跳页总数 0），再让词库"迟到"——populateCategories 走 awaitLibrary 等待分支。
  function simulateFirstOpenWithLateLibrary() {
    resetPageState();
    globalThis.WORD_LIBRARY.categories = [];
    window.app.wordModule.populateCategories();
  }

  it('词库迟到期间：卡片/页码/跳页总数停在占位态，卡区显示骨架', async () => {
    simulateFirstOpenWithLateLibrary();
    await sleep(300);   // 骨架 200ms 延迟显形（防闪烁），先等过这个窗口

    const card = document.getElementById('word-card');
    expect(card.querySelector('[data-skeleton]'), '卡区没有骨架').toBeTruthy();
    expect(card.getAttribute('aria-busy'), '等待态没有标 aria-busy').toBe('true');
    expect(document.getElementById('word-progress').textContent, '占位态页码不是 0/0').toBe('0/0');
    expect(document.getElementById('word-jump-total').textContent, '占位态跳页总数不是 0').toBe('0');
    expect(document.getElementById('current-word').textContent, '占位态卡片不是静态占位词').toBe('Abandon');
  });

  it('词库就绪后：卡片渲染真实当前词、页码 N/M、跳页总数 M', async () => {
    simulateFirstOpenWithLateLibrary();
    await sleep(300);
    globalThis.WORD_LIBRARY.categories = savedCategories;   // 词库落地
    await sleep(800);                                       // 等一轮轮询（500ms）

    const wm = window.app.wordModule;
    const pool = wm.getCardWords();
    expect(pool.length, '词库就绪后卡片池仍为空').toBeGreaterThan(0);

    const cur = pool[wm.currentIndex];
    const cardText = document.getElementById('current-word').textContent;
    expect(cardText, '就绪后卡片没有渲染成真实当前词（仍是静态占位词）').toBe(cur.word);
    expect(cardText, '就绪后卡片仍是静态占位词').not.toBe('Abandon');
    expect(document.getElementById('word-progress').textContent, '就绪后页码没有补上（仍是 0/0）')
      .toBe((wm.currentIndex + 1) + '/' + pool.length);
    expect(document.getElementById('word-jump-total').textContent, '就绪后跳页总数没有补上（仍是 0）')
      .toBe(String(pool.length));
    expect(document.getElementById('word-jump-input').max, '跳页输入上限没有同步').toBe(String(pool.length));
    expect(document.getElementById('word-card').querySelector('[data-skeleton]'), '就绪后骨架没收掉').toBeNull();
    expect(document.getElementById('word-card').getAttribute('aria-busy'), '就绪后 aria-busy 没清').toBe(null);
  });

  it('词库就绪后：朗读发出的词与卡片显示的词是同一个', async () => {
    simulateFirstOpenWithLateLibrary();
    await sleep(300);
    globalThis.WORD_LIBRARY.categories = savedCategories;
    await sleep(800);

    const wm = window.app.wordModule;
    const spoken = [];
    vi.spyOn(window.SpeechUtil, 'speakWord').mockImplementation(function(w) { spoken.push(w); });
    wm.speakCurrent();

    expect(spoken.length, 'speakCurrent 没有发声').toBe(1);
    expect(spoken[0], '朗读的词与卡片显示的词不一致（用户听的不是眼前这个词）')
      .toBe(document.getElementById('current-word').textContent);
  });

  it('词库就绪后：翻页按钮状态正确，立即可以左右翻页', async () => {
    simulateFirstOpenWithLateLibrary();
    await sleep(300);
    globalThis.WORD_LIBRARY.categories = savedCategories;
    await sleep(800);

    const wm = window.app.wordModule;
    // 恢复的位置是第 1 张（空存储）：上一张应置灰、下一张应可用
    expect(wm.currentIndex, '就绪后位置没恢复到存档值').toBe(0);
    expect(document.getElementById('prev-word').disabled, '首张时「上一张」没有置灰').toBe(true);
    expect(document.getElementById('next-word').disabled, '非末张时「下一张」应可用').toBe(false);

    wm.nextWord();
    expect(document.getElementById('current-word').textContent, '就绪后翻页不同步').toBe(wm.getCardWords()[1].word);
  });

  it('词库就绪后：统计卡同步刷新（不再是空数据态）', async () => {
    simulateFirstOpenWithLateLibrary();
    await sleep(300);
    globalThis.WORD_LIBRARY.categories = savedCategories;
    await sleep(800);

    const wm = window.app.wordModule;
    const total = wm.getCardWords().length;
    // renderStats 写 #ws-total / #ws-learning / #ws-mastered / #ws-due。
    // 注意别写成"元素不存在就跳过"的兜底断言——那等于没测（本项目踩过）。
    const wsTotal = document.getElementById('ws-total');
    expect(wsTotal, '统计卡缺少 #ws-total').toBeTruthy();
    expect(wsTotal.textContent, '就绪后统计卡总数没有刷新（停在静态值）').toBe(String(total));
  });
});

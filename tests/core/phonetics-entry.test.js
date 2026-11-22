// 音标学习页入口恢复（用户报告：功能"好像被删掉了"，找不到入口）
//
// 调查结论：页面 #page-phonetics、PhoneticModule（渲染/详情/朗读/进度）、
// 真实数据 48 个音标（元音 20 + 辅音 28）全部还在 —— 缺的是两处导航入口：
//   ① 桌面抽屉 #group-learn-items 里没有 data-tab="phonetics" 的按钮；
//   ② 移动端「学习」聚合页 #page-learn 没有 data-goto="phonetics" 的卡片
//      （移动端抽屉里的分组被 CSS 隐藏，分组页才是手机端的主路径）。
// 另有一处陈旧判断：导入数据后的刷新用的是 currentTab === 'phonetic'（旧名），
// 永远不会命中，导致音标页打开时导入备份不会刷新网格。
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { bootstrapApp } from '../helpers/app-bootstrap.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

describe('音标页入口（抽屉 + 学习聚合页）', () => {
  beforeEach(async () => {
    vi.resetModules();
    await bootstrapApp();
  });

  it('桌面抽屉的「学习」分组里有「音标」入口', () => {
    const btn = document.querySelector('#group-learn-items .nav-btn[data-tab="phonetics"]');
    expect(btn, '抽屉学习分组应有 data-tab=phonetics 的入口').toBeTruthy();
    expect(btn.querySelector('.label').textContent).toBe('音标');
  });

  it('点击抽屉入口 → 国际音标页激活、hash 写入 #/phonetics', () => {
    const btn = document.querySelector('#group-learn-items .nav-btn[data-tab="phonetics"]');
    btn.click();
    expect(document.getElementById('page-phonetics').classList.contains('active')).toBe(true);
    expect(document.querySelector('.page.active')).toBe(document.getElementById('page-phonetics'));
    expect(location.hash).toBe('#/phonetics');
  });

  it('移动端「学习」聚合页有音标卡片（data-goto=phonetics），文案说明 48 个音标', () => {
    const card = document.querySelector('#page-learn .practice-btn[data-goto="phonetics"]');
    expect(card, '学习聚合页应有音标卡片').toBeTruthy();
    expect(card.textContent).toContain('音标');
    expect(card.textContent).toContain('48');
  });

  it('点聚合页卡片 → 切到音标页（移动端主路径）', () => {
    const card = document.querySelector('#page-learn .practice-btn[data-goto="phonetics"]');
    card.click();
    expect(document.getElementById('page-phonetics').classList.contains('active')).toBe(true);
  });
});

describe('音标页行为（回归网：锁住已存在的模块行为，防止入口恢复时被改坏）', () => {
  beforeEach(async () => {
    vi.resetModules();
    await bootstrapApp();
  });

  it('进入音标页后网格按数据渲染，点卡片打开详情弹层', () => {
    window.app.showTab('phonetics');
    const cards = document.querySelectorAll('#phonetic-grid .ph-card');
    expect(cards.length).toBe(4);   // bootstrap stub：2 元音 + 2 辅音
    cards[0].click();
    const modal = document.getElementById('modal-phonetic-detail');
    expect(modal.classList.contains('hidden')).toBe(false);
    expect(document.getElementById('phd-symbol').textContent).toBeTruthy();
    expect(document.getElementById('phd-example-word').textContent).toBeTruthy();
  });

  it('详情弹层的「朗读」按钮会朗读该音标', () => {
    window.app.showTab('phonetics');
    document.querySelector('#phonetic-grid .ph-card').click();
    const spoken = [];
    const orig = window.SpeechUtil.speak;
    window.SpeechUtil.speak = function (text, lang) { spoken.push([text, lang]); };
    try {
      document.getElementById('phd-speak').click();
    } finally { window.SpeechUtil.speak = orig; }
    expect(spoken.length).toBe(1);
    expect(spoken[0][0]).toBe(document.getElementById('phd-symbol').textContent);
    expect(spoken[0][1]).toBe('en-US');
  });

  it('标记已掌握后进度更新并写回存储', () => {
    window.app.showTab('phonetics');
    document.querySelector('#phonetic-grid .ph-card').click();
    document.getElementById('phd-known').click();
    const sym = document.querySelector('#phonetic-grid .ph-card').dataset.symbol;
    const prog = window.DataStore.getProgress('phonetic_progress', {});
    expect(prog[sym] && prog[sym].mastered).toBe(true);
    expect(document.getElementById('ph-mastered').textContent).toBe('1');
  });
});

describe('数据未就绪时进入音标页（首开慢网场景）', () => {
  beforeEach(async () => {
    vi.resetModules();
    await bootstrapApp();
  });

  it('数据未到时进入音标页 → 走 awaitLibrary 等待，就绪后补渲染', () => {
    const saved = window.PHONETIC_DATA;
    window.PHONETIC_DATA = undefined;   // 模拟慢网：数据脚本还没注入
    const captured = [];
    const origAwait = window.Loading.awaitLibrary;
    window.Loading.awaitLibrary = function (opts) { captured.push(opts); return function cancel() {}; };
    try {
      window.app.showTab('phonetics');
      expect(captured.length, '数据未就绪应进入等待，而不是空网格永挂').toBe(1);
      expect(typeof captured[0].ready).toBe('function');
      // 数据到达：恢复并触发 ready 回调
      window.PHONETIC_DATA = saved;
      captured[0].ready();
      expect(document.querySelectorAll('#phonetic-grid .ph-card').length).toBe(4);
    } finally {
      window.Loading.awaitLibrary = origAwait;
    }
  });

  it('数据已就绪时进入音标页：直接渲染网格（不等待）', () => {
    const calls = [];
    const mod = window.app.phoneticModule;
    const orig = mod.renderGrid;
    mod.renderGrid = function () { calls.push(1); orig.apply(this, arguments); };
    window.app.showTab('phonetics');
    expect(calls.length, '数据就绪时应直接渲染').toBe(1);
    expect(document.querySelectorAll('#phonetic-grid .ph-card').length).toBe(4);
  });
});

describe('数据与守卫', () => {
  it('真实词库数据包含 48 个国际音标（元音 + 辅音），且每项可朗读', () => {
    const src = readFileSync(join(root, 'data', 'all-data.js'), 'utf8');
    const pd = new Function(src + '\n;return PHONETIC_DATA;')();
    expect(pd.vowels.length + pd.consonants.length).toBe(48);
    for (const p of pd.vowels.concat(pd.consonants)) {
      expect(typeof p.symbol).toBe('string');
      expect(p.symbol.length).toBeGreaterThan(0);
    }
  });

  it('导入数据后的刷新判断使用正确的 tab 名 phonetics（源码守卫）', () => {
    const src = readFileSync(join(root, 'js', 'app.js'), 'utf8');
    expect(src).toContain("self.currentTab === 'phonetics'");
    expect(src).not.toContain("self.currentTab === 'phonetic'");
  });

  it('审计脚本 TABS 覆盖 phonetics（避免视觉审计漏掉该页）', () => {
    const src = readFileSync(join(root, 'scripts', 'ui-audit.mjs'), 'utf8');
    expect(src).toMatch(/TABS = \[[^\]]*'phonetics'/);
  });
});

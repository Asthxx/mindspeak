// 行为级 + 源码级：侧边栏分组、设置页 IA、跳转控件、进度环（P2-7 / P2-8 / P3-6 / P3-7）
//
// 这里采用的方案与审查报告略有不同，差异与理由见 docs/ui-ux-review-20261001.md
// 的「修复记录 · 剩余 4 项」小节。
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { bootstrapApp } from '../helpers/app-bootstrap.js';

const root = resolve(__dirname, '../..');
const html = readFileSync(resolve(root, 'index.html'), 'utf8');

// 取某个 nav-group 内部的 data-tab 列表
function tabsIn(groupId) {
  const block = new RegExp('<div class="nav-group" id="' + groupId + '"[\\s\\S]*?\\n    </div>');
  const m = html.match(block);
  if (!m) return null;
  return [...m[0].matchAll(/class="nav-btn" data-tab="([a-z-]+)"/g)].map(x => x[1]);
}

describe('侧边栏分组语义（P2-7 · 最小搬迁方案）', () => {
  it('不再存在只有一个项目的「成长」分组', () => {
    expect(html).not.toContain('id="group-grow"');
  });

  it('单词PK 归入训练分组（它是训练/游戏，不是"学"）', () => {
    expect(tabsIn('group-train'), 'PK 不在训练组').toContain('pk');
    expect(tabsIn('group-learn'), 'PK 仍留在学习组').not.toContain('pk');
  });

  it('番茄钟归入工具分组（它是工具，不是训练）', () => {
    expect(tabsIn('group-tool'), '番茄钟不在工具组').toContain('pomodoro');
    expect(tabsIn('group-train'), '番茄钟仍在训练组').not.toContain('pomodoro');
  });

  it('主题商店并入工具分组，不再单独立组', () => {
    expect(tabsIn('group-tool'), '主题商店不在工具组').toContain('items');
  });

  it('每个分组至少 2 项——单项目分组等于没有分组', () => {
    for (const g of ['group-learn', 'group-train', 'group-tool']) {
      const tabs = tabsIn(g);
      expect(tabs, '分组 ' + g + ' 不存在').toBeTruthy();
      expect(tabs.length, '分组 ' + g + ' 只有 ' + tabs.length + ' 项：' + tabs.join(',')).toBeGreaterThanOrEqual(2);
    }
  });

  it('19 个入口一个都不能丢', () => {
    const all = [...html.matchAll(/class="nav-btn" data-tab="([a-z-]+)"/g)].map(x => x[1]);
    expect(all.length, '侧边栏入口总数变了：' + all.join(',')).toBe(19);
  });
});

describe('设置页信息架构（P2-8 · 压缩而非搬迁）', () => {
  const page = (html.match(/<section id="page-settings"[\s\S]*?<section id="page-support"/) || [''])[0];

  it('学习报告压成一行紧凑摘要条', () => {
    expect(page, '没有 report-strip').toContain('class="report-strip"');
  });

  it('7 天趋势图表默认折叠，不再占用首屏', () => {
    const details = (page.match(/<details[^>]*id="report-trend"[^>]*>/) || [''])[0];
    expect(details, '图表没有包进 <details>').toBeTruthy();
    expect(details, 'details 默认应是关闭的').not.toMatch(/\bopen\b/);
  });

  it('真正的设置开关排在 7 天图表之前（移动端首屏即可操作）', () => {
    const iToggle = page.indexOf('toggle-active-recall');
    const iChart = page.indexOf('week-days-list');
    expect(iToggle, '未找到设置开关').toBeGreaterThan(-1);
    expect(iChart, '未找到 7 天图表').toBeGreaterThan(-1);
    expect(iToggle, '设置开关仍排在 7 天图表之后，移动端要滚两屏才碰到').toBeLessThan(iChart);
  });
});

describe('一体化跳转控件（P3-6）', () => {
  beforeEach(async () => {
    vi.resetModules();
    await bootstrapApp();
  });

  it('控件是一个整体：「第 __ / 共 N 页」，不再有重复的「跳转」字样', () => {
    const wrap = document.getElementById('word-jump-wrap');
    expect(wrap, '缺少一体化容器 #word-jump-wrap').toBeTruthy();

    const input = document.getElementById('word-jump-input');
    expect(input, '缺少输入框').toBeTruthy();
    expect(input.placeholder, '输入框占位文案仍与按钮重复').not.toBe('跳转');

    const total = document.getElementById('word-jump-total');
    expect(total, '缺少总数位 #word-jump-total').toBeTruthy();
  });

  it('提交按钮有可访问名（只靠回车会变成不可发现的操作）', () => {
    const btn = document.getElementById('btn-jump-word');
    expect(btn, '缺少提交按钮').toBeTruthy();
    expect(btn.getAttribute('aria-label') || btn.getAttribute('title'), '按钮没有可访问名').toBeTruthy();
  });

  it('总数由代码写入，与实际卡数一致', () => {
    window.app.showTab('word');
    const wm = window.app.wordModule;
    wm.currentIndex = 0;
    wm.showCurrentWord();

    const total = document.getElementById('word-jump-total');
    expect(total.textContent, '总数没有同步').toBe(String(wm.getCardWords().length));
  });
});

describe('进度环的语义（P3-7）', () => {
  beforeEach(async () => {
    vi.resetModules();
    await bootstrapApp();
  });

  // 让当前词真的带有复习阶段，否则 stageText 为空、相关断言会假通过
  function withStage(wm, n) {
    const words = wm.getCardWords();
    const w = words[wm.currentIndex] || words[0];
    wm.wordProgress[w.word + '-' + wm.currentCategoryIndex] = { status: 'learning', reviewCount: n };
    wm.showCurrentWord();
  }

  it('环内文字是百分比——与环的填充量同语义', () => {
    window.app.showTab('word');
    window.app.wordModule.showCurrentWord();
    const text = document.getElementById('ring-text').textContent;
    expect(text, '环内仍是 "' + text + '"，不是百分比').toMatch(/%$/);
  });

  it('阶段数下移到环的说明行（有阶段数据时）', () => {
    window.app.showTab('word');
    const wm = window.app.wordModule;
    wm.currentIndex = 0;
    withStage(wm, 3);

    const cap = document.getElementById('ring-caption');
    expect(cap, '缺少 #ring-caption').toBeTruthy();
    expect(cap.textContent, '说明行没写阶段：' + cap.textContent).toMatch(/阶段\s*3\/8/);
  });

  it('#word-progress 只管位置，不再重复阶段（有阶段数据时）', () => {
    window.app.showTab('word');
    const wm = window.app.wordModule;
    wm.currentIndex = 0;
    withStage(wm, 3);

    const txt = document.getElementById('word-progress').textContent;
    expect(txt, '进度行应只显示位置').toMatch(/\d+\/\d+/);
    expect(txt, '进度行仍在显示阶段，与环说明重复').not.toMatch(/阶段/);
  });

  it('环轨道用 --track 而不是 --border（0% 时环必须看得见）', () => {
    const css = readFileSync(resolve(root, 'css/style.css'), 'utf8');
    const rule = (css.match(/\.ring-bg\s*\{[^}]*\}/) || [''])[0];
    expect(rule, '缺少 .ring-bg').toBeTruthy();
    expect(rule, '环轨道借用了边框色，0% 时几乎不可见').toMatch(/stroke:\s*var\(--track\)/);
  });
});

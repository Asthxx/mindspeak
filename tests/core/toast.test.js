// Toast 可用性（UI 审查 P2-9）：行为级 + 源码级守卫
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { bootstrapApp } from '../helpers/app-bootstrap.js';

const root = resolve(__dirname, '../..');
const read = p => readFileSync(resolve(root, p), 'utf8');

describe('Toast 可用性（P2-9）', () => {
  beforeEach(async () => {
    vi.resetModules();
    await bootstrapApp();
  });

  afterEach(() => {
    document.querySelectorAll('.toast-container').forEach(e => e.remove());
  });

  it('toast 可被手动关闭', () => {
    window.Toast.info('测试消息');
    const el = document.querySelector('.toast');
    expect(el, 'toast 没有渲染').toBeTruthy();

    const close = el.querySelector('[data-toast-close]');
    expect(close, 'toast 没有关闭按钮（3 秒的固定时长，长文案根本读不完）').toBeTruthy();

    close.click();
    expect(!el.isConnected || el.classList.contains('toast-hide'), '点了关闭没反应').toBe(true);
  });

  it('停留时长按字数自适应：长文案停留更久，且有上限', () => {
    const T = window.Toast;
    const short = T._durationFor('已保存');
    const long = T._durationFor('已保存'.repeat(20));

    expect(long, '长文案和短文案停留一样久').toBeGreaterThan(short);
    expect(short, '短文案停留太短').toBeGreaterThanOrEqual(1600);
    expect(T._durationFor('字'.repeat(500)), '超长文案没有上限').toBeLessThanOrEqual(8000);
  });

  it('拨动设置开关不再弹 toast（状态自明）', () => {
    const before = document.querySelectorAll('.toast').length;
    const t = document.getElementById('toggle-active-recall');
    expect(t, '未找到 #toggle-active-recall').toBeTruthy();

    t.checked = !t.checked;
    t.dispatchEvent(new Event('change'));

    expect(document.querySelectorAll('.toast').length, '开关还在弹 toast，5 个开关就是 5 条噪音')
      .toBe(before);
  });
});

describe('Toast 源码级守卫（P2-9 回归防线）', () => {
  const styleCss = read('css/style.css');
  const itemsJs = read('js/items.js');
  const appJs = read('js/app.js');

  it('单条 toast 必须可点击（容器 pointer-events:none，靠单条放开）', () => {
    expect(styleCss).toMatch(/\.toast\s*\{[^}]*pointer-events:\s*auto/);
  });

  it('移动端 toast 容器改到底部，不再压在页面标题区', () => {
    // 桌面是 top:80px;right:20px；移动端沿用会盖住标题。
    // 这条规则在 css/mobile.css（不在 style.css）——本测试初版查错了文件而假失败。
    const mobileCss = read('css/mobile.css');
    expect(mobileCss).toMatch(/\.toast-container[\s\S]{0,200}bottom:calc\(88px/);
  });

  it('切换主题不再弹 toast（整屏都变了，不需要再告知一次）', () => {
    expect(itemsJs).not.toMatch(/Toast\.success\('已启用/);
  });

  it('顶栏统计条不得再有"整块翻主色"的 hover（P1-8 已修，防回退）', () => {
    const rule = (styleCss.match(/\.stats-bar span:hover\s*\{[\s\S]*?\}/) || [''])[0];
    expect(rule, '缺少 .stats-bar span:hover 规则').toBeTruthy();
    expect(rule, 'hover 又改前景色了，会再次承诺"可点击"').not.toMatch(/color:/);
  });

  it('Toast 对外暴露 window.Toast，便于行为级测试驱动真实实现', () => {
    expect(appJs).toMatch(/window\.Toast\s*=\s*Toast/);
  });
});

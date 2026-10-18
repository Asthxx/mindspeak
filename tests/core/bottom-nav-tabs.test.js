// 底部导航分类 Tab（学习 / 训练 / 工具）+ AI Tab · 源码级 + 行为级
//
// 背景（2026-10-17）：这三个入口原在侧边栏抽屉里，是「可折叠分组标题」——
// 只有 nav-group-title，没有 data-tab、不路由。现集成到底部导航成为 6 签
// （首页 / 学习 / 训练 / 工具 / AI / 我的），落点为三个聚合页；侧边栏分组
// 仅在移动端由 CSS 隐藏，桌面端保留原文（DOM 不动）。
//
// AI Tab 的来历（2026-10-18）：先做成了贴在药丸上方的独立常驻横条
// （.nav-ai-bar），用户明确要求"放在导航栏下方、固定的、和他们那些一样"，
// 即作为栏内一员。横条及其全部专属规则（--nav-ai-reserve / --nav-h /
// AI 页自动隐藏 / 横屏收起）已删除，AI 改用时序在「我的」之前的第 5 个 Tab，
// 与其余五个共用同一套 class / 交互 / 选中态，零专属样式。
//
// 本文件守住五条边界：
//   1. 底部导航的标签 / 图标 / 路由与选中态机制不变（data-tab + showTab）；
//   2. AI 是栏内普通一员，没有专属类名、没有独立显隐开关、顺序固定在「我的」之前；
//   3. 三个聚合页完整承接侧边栏对应分组的子入口（一个都不能少）；
//   4. 侧边栏 DOM 未被改动（19 个 nav-btn 原样），桌面端行为不受影响；
//   5. 移动端 CSS 确实把分组藏进了抽屉、并覆盖横屏手机。
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { bootstrapApp } from '../helpers/app-bootstrap.js';

const root = resolve(__dirname, '../..');
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
const mobileCss = readFileSync(resolve(root, 'css/mobile.css'), 'utf8');

// 取侧边栏某个 nav-group 内部的 data-tab 列表（与 nav-and-metrics.test.js 同法）
function tabsIn(groupId) {
  const block = new RegExp('<div class="nav-group" id="' + groupId + '"[\\s\\S]*?\\n    </div>');
  const m = html.match(block);
  if (!m) return null;
  return [...m[0].matchAll(/class="nav-btn" data-tab="([a-z-]+)"/g)].map(x => x[1]);
}

// 取某个聚合页内部的 data-goto 列表
function gotosIn(pageId) {
  const block = new RegExp('<section id="' + pageId + '"[\\s\\S]*?\\n    </section>');
  const m = html.match(block);
  if (!m) return null;
  return [...m[0].matchAll(/data-goto="([a-z-]+)"/g)].map(x => x[1]);
}

const bottomNav = (html.match(/<nav class="bottom-nav"[\s\S]*?<\/nav>/) || [''])[0];

describe('底部导航结构（6 签 · 分类 Tab 承接侧边栏分组 + AI Tab）', () => {
  it('恰好 6 签，顺序为 首页/学习/训练/工具/AI/我的', () => {
    const tabs = [...bottomNav.matchAll(/data-tab="([a-z-]+)"/g)].map(x => x[1]);
    expect(tabs, '底部导航签数或顺序变了：' + tabs.join(',')).toEqual(['home', 'learn', 'train', 'tool', 'ai', 'settings']);
  });

  it('★AI 紧贴「我的」之前——高频入口不必扫到栏尾', () => {
    const tabs = [...bottomNav.matchAll(/data-tab="([a-z-]+)"/g)].map(x => x[1]);
    expect(tabs.indexOf('ai'), 'AI 不在底部导航里：' + tabs.join(',')).toBeGreaterThan(-1);
    expect(tabs.indexOf('ai'), 'AI 没有排在「我的」之前（现在是第 ' + (tabs.indexOf('ai') + 1) + ' 签）')
      .toBe(tabs.indexOf('settings') - 1);
  });

  it('文案与原侧边栏分组标题一致 + AI', () => {
    const labels = [...bottomNav.matchAll(/<span>([^<]+)<\/span>/g)].map(x => x[1]);
    expect(labels).toEqual(['首页', '学习', '训练', '工具', 'AI', '我的']);
  });

  it('三个分类 Tab 沿用原分组标题的图标（#i-book / #i-target / #i-list）', () => {
    expect(bottomNav, '「学习」Tab 的图标不是原分组那颗 #i-book')
      .toMatch(/data-tab="learn"[^>]*><svg[^>]*><use href="#i-book"/);
    expect(bottomNav, '「训练」Tab 的图标不是原分组那颗 #i-target')
      .toMatch(/data-tab="train"[^>]*><svg[^>]*><use href="#i-target"/);
    expect(bottomNav, '「工具」Tab 的图标不是原分组那颗 #i-list')
      .toMatch(/data-tab="tool"[^>]*><svg[^>]*><use href="#i-list"/);
  });

  it('AI Tab 用精灵图里既有的机器人图标（#i-robot，与 AI 会话头像同源）', () => {
    expect(bottomNav, 'AI Tab 的图标不是 #i-robot')
      .toMatch(/data-tab="ai"[^>]*><svg[^>]*><use href="#i-robot"/);
  });

  it('★AI 是栏内普通一员：无专属类名、无独立显隐开关', () => {
    // 曾是贴在上方的独立横条（.nav-ai-bar / #nav-ai-entry），
    // 那次实现留下了 4 类专属机制，现在必须一个都不在。
    // 注意断言要盯"声明/使用"而不是"字面出现"——mobile.css 里有一段注释
    // 专门说明这批名字已删除，按字面匹配会把解释性注释当成回归。
    expect(html, '又出现了 .nav-ai-bar 容器——AI 应该只是栏内一个 Tab')
      .not.toMatch(/class="nav-ai-bar"/);
    expect(html, '又出现了 #nav-ai-entry 按钮').not.toMatch(/id="nav-ai-entry"/);
    expect(mobileCss, '又出现了 .nav-ai-bar 的 display 开关')
      .not.toMatch(/\.nav-ai-bar\{display:none\}/);
    expect(mobileCss, '又出现了 --nav-ai-reserve 的变量声明')
      .not.toMatch(/--nav-ai-reserve\s*:/);
    expect(mobileCss, '又出现了 --nav-ai-reserve 的使用')
      .not.toMatch(/var\(--nav-ai-reserve/);
    // AI Tab 自身不许有任何专属规则——否则就不是"和他们那些一样"
    expect(mobileCss, 'AI Tab 出现了专属 CSS 规则')
      .not.toMatch(/bottom-nav-btn\[data-tab="ai"\]/);
  });

  it('AI Tab 与其余五个结构完全同构（同 class / 同 aria 属性位）', () => {
    const fullAi = (bottomNav.match(/<button[^>]*data-tab="ai"[\s\S]*?<\/button>/) || [''])[0];
    const fullHome = (bottomNav.match(/<button[^>]*data-tab="home"[\s\S]*?<\/button>/) || [''])[0];
    expect(fullAi, 'AI Tab 不是 button 元素').toMatch(/^<button type="button"/);
    expect(fullAi, 'AI Tab 没有 bottom-nav-btn 类').toMatch(/class="bottom-nav-btn/);
    // 同构：图标与文字两段式、aria-hidden + focusable=false 完全一致
    expect(fullAi).toMatch(/<svg class="icon" aria-hidden="true" focusable="false">/);
    expect(fullHome).toMatch(/<svg class="icon" aria-hidden="true" focusable="false">/);
    expect(fullAi).toMatch(/<\/svg><span>[^<]+<\/span><\/button>$/);
    expect(fullHome).toMatch(/<\/svg><span>[^<]+<\/span><\/button>$/);
    // AI 签不带 aria-current（首页才是默认当前页），但保留属性位
    expect(fullAi, 'AI 签不该预设 aria-current').not.toMatch(/aria-current/);
  });

  it('不再保留「背单词 / 练习」直达签——分类入口已上位，避免同页两套直达', () => {
    expect(bottomNav, '底部导航仍留着 data-tab="word"').not.toMatch(/data-tab="word"/);
    expect(bottomNav, '底部导航仍留着 data-tab="practice"').not.toMatch(/data-tab="practice"/);
  });

  it('选中态机制不变：仍是 bottom-nav-btn + data-tab + aria-current', () => {
    expect(bottomNav).toMatch(/class="bottom-nav-btn active" data-tab="home" aria-current="page"/);
  });
});

describe('三个聚合页完整承接侧边栏分组', () => {
  it('「学习」页 = 侧边栏「学习」分组全部 6 项', () => {
    expect(gotosIn('page-learn'), '没有 #page-learn 或入口不完整：' + JSON.stringify(gotosIn('page-learn')))
      .toEqual(tabsIn('group-learn'));
  });

  it('「训练」页 = 侧边栏「训练」分组去掉「练习中心」（聚合页套聚合页）', () => {
    const group = tabsIn('group-train');
    expect(gotosIn('page-train'), '没有 #page-train 或入口不完整：' + JSON.stringify(gotosIn('page-train')))
      .toEqual(group.filter(t => t !== 'practice'));
  });

  it('「工具」页 = 侧边栏「工具」分组全部 4 项', () => {
    expect(gotosIn('page-tool'), '没有 #page-tool 或入口不完整：' + JSON.stringify(gotosIn('page-tool')))
      .toEqual(tabsIn('group-tool'));
  });

  it('原 16 个子入口在移动端一个都没丢（三个聚合页 + 练习中心合计覆盖）', () => {
    const covered = new Set([...gotosIn('page-learn'), ...gotosIn('page-train'), ...gotosIn('page-tool')]);
    // 练习中心的 8 项里，听力/阅读/语法/语境已在学习页、拼写/错词强化/跟读/PK 已在训练页
    const practiceGotos = [...(html.match(/<section id="page-practice"[\s\S]*?<\/section>/) || [''])[0].matchAll(/data-goto="([a-z-]+)"/g)].map(x => x[1]);
    for (const t of practiceGotos) covered.add(t);
    const sidebarTabs = [...tabsIn('group-learn'), ...tabsIn('group-train'), ...tabsIn('group-tool')];
    // 唯一例外是「练习中心」（practice）本身：它是聚合页，8 个条目已全部被
    // 学习/训练两页覆盖（上面并入 covered 的正是这批），移动端不再单独给
    // 聚合页留一个入口——否则聚合页套聚合页。
    const mustCover = sidebarTabs.filter(t => t !== 'practice');
    const lost = mustCover.filter(t => !covered.has(t));
    expect(lost, '这些入口在移动端再也点不到了：' + lost.join(',')).toEqual([]);
  });

  it('聚合页复用练习中心的卡片体系与 data-goto 委托，零新增跳转逻辑', () => {
    for (const p of ['page-learn', 'page-train', 'page-tool']) {
      expect(html, p + ' 没有复用 .practice-grid 卡片体系').toMatch(new RegExp('<section id="' + p + '"[\\s\\S]*?class="practice-grid"'));
    }
  });
});

describe('侧边栏保持原样（桌面端不受影响）', () => {
  it('19 个 nav-btn 一个没动（分组仍在 DOM 里，仅移动端 CSS 隐藏）', () => {
    const all = [...html.matchAll(/class="nav-btn" data-tab="([a-z-]+)"/g)].map(x => x[1]);
    expect(all.length, '侧边栏入口总数变了：' + all.join(',')).toBe(19);
  });

  it('三个分组仍带折叠标题（桌面端折叠行为保留）', () => {
    expect(html).toContain('id="group-learn-title"');
    expect(html).toContain('id="group-train-title"');
    expect(html).toContain('id="group-tool-title"');
  });
});

describe('移动端 CSS：抽屉藏分组 + 横屏覆盖', () => {
  it('抽屉内隐藏三个分组（仅移动布局生效，桌面不受影响）', () => {
    expect(mobileCss, '缺少 .sidebar .nav-group 的移动端隐藏规则').toContain('.sidebar .nav-group{display:none}');
  });

  it('横屏手机也走移动布局（landscape + 矮屏 + 触屏，防桌面小窗口误入）', () => {
    expect(mobileCss, '主媒体查询没有扩展横屏条件——旋屏后底部导航会消失')
      .toMatch(/@media \(max-width:768px\),\s*\n\s*\(orientation:landscape\) and \(max-height:500px\) and \(hover:none\) and \(pointer:coarse\)\{/);
    expect(mobileCss, 'Toast 重定位没有覆盖横屏').toMatch(/bottom:calc\(72px \+ env\(safe-area-inset-bottom,0px\)\)/);
  });

  it('底部药纶适配左右安全区（横屏刘海屏）', () => {
    expect(mobileCss, '药纶没有按 safe-area-inset-left/right 收进')
      .toMatch(/left:calc\(12px \+ env\(safe-area-inset-left,0px\)\)/);
    expect(mobileCss).toMatch(/right:calc\(12px \+ env\(safe-area-inset-right,0px\)\)/);
  });
});

describe('Android 平台选中态配色（特异性陷阱守卫）', () => {
  // android-nav.css 是被 head-boot.js 按平台注入的（插在 mobile.css 之前），
  // 它这条规则特异性 (0,3,1) 高于 mobile.css 的 .bottom-nav-btn.active (0,2,1)，
  // 所以 Android 上选中态文字用什么色，由这一条说了算——mobile.css 写了不算。
  //
  // 2026-10-18 之前这里写的是 var(--primary, #5B82A6)，而 --primary 就是 var(--sage)：
  // 浅色主题下 #5B82A6 压在药纶白底上实测 4.05:1，不满足 WCAG AA 的 4.5:1；
  // 同时图标仍走 mobile.css 的 --sage-deep，导致同一颗 Tab 文字浅、图标深。
  it('选中态文字用 --sage-deep，不许用回 --primary', () => {
    const androidNav = readFileSync(resolve(root, 'css/android-nav.css'), 'utf8');
    const rule = (androidNav.match(/html\.platform-android \.bottom-nav-btn\.active\s*\{[^}]*\}/) || [''])[0];
    expect(rule, 'android-nav.css 里找不到 .bottom-nav-btn.active 规则').not.toBe('');
    expect(rule, '选中态又用回 --primary（解析成 --sage，白底仅 4.05:1，且与图标不同色）')
      .not.toMatch(/var\(--primary/);
    expect(rule, '选中态没有用 --sage-deep').toMatch(/var\(--sage-deep\)/);
  });

  it('不能靠删掉整条规则来"修"——.bottom-nav-btn 整块特异性仍高于 mobile.css', () => {
    // 删掉 .active 规则会让 mobile.css 的 (0,2,1) 接管，颜色是对了，
    // 但 android-nav.css 的 .bottom-nav-btn (0,2,1) 仍压着 mobile.css 的 (0,1,0)，
    // 按钮的 padding / min-height / color 会一起回退到 Android 旧值。
    // 所以正确解法是改令牌，不是删规则。这里把规则的存在性钉住。
    const androidNav = readFileSync(resolve(root, 'css/android-nav.css'), 'utf8');
    expect(androidNav, 'android-nav.css 的 .bottom-nav-btn.active 规则被整条删了')
      .toMatch(/html\.platform-android \.bottom-nav-btn\.active\s*\{/);
  });
});

describe('行为：三个分类 Tab 的跳转与选中态', () => {
  beforeEach(async () => {
    vi.resetModules();
    await bootstrapApp();
  });

  afterEach(() => {
    window.location.hash = '';
  });

  for (const [tab, label] of [['learn', '学习'], ['train', '训练'], ['tool', '工具'], ['ai', 'AI']]) {
    it('showTab("' + tab + '") 打开聚合页并点亮「' + label + '」签', () => {
      window.app.showTab('home');
      window.app.showTab(tab);

      expect(document.getElementById('page-' + tab).classList.contains('active'), tab + ' 页没有激活').toBe(true);
      expect(document.getElementById('page-home').classList.contains('active'), '首页没有随之关闭').toBe(false);

      const btn = document.querySelector('.bottom-nav-btn[data-tab="' + tab + '"]');
      expect(btn.classList.contains('active'), '「' + label + '」签没有高亮').toBe(true);
      expect(btn.getAttribute('aria-current'), '「' + label + '」签没有 aria-current').toBe('page');

      const others = [...document.querySelectorAll('.bottom-nav-btn')].filter(b => b !== btn);
      for (const b of others) {
        expect(b.classList.contains('active'), '签 ' + b.dataset.tab + ' 应熄灭').toBe(false);
        expect(b.getAttribute('aria-current'), '签 ' + b.dataset.tab + ' 应移除 aria-current').toBe(null);
      }
      expect(window.location.hash, '没有写 hash，刷新/分享回不到该页').toBe('#/' + tab);
    });
  }

  it('点击「学习」签即触发跳转（initNav 的 bottom-nav-btn 绑定生效）', () => {
    window.app.showTab('home');
    document.querySelector('.bottom-nav-btn[data-tab="learn"]').click();

    expect(window.app.currentTab, '点击没有切页').toBe('learn');
    expect(document.getElementById('page-learn').classList.contains('active')).toBe(true);
  });

  it('聚合页内卡片跳具体功能页（data-goto 委托对静态页面同样生效）', () => {
    window.app.showTab('learn');
    document.querySelector('#page-learn .practice-btn[data-goto="word"]').click();

    expect(window.app.currentTab, '卡片点击没有跳转').toBe('word');
    expect(document.getElementById('page-word').classList.contains('active')).toBe(true);
  });

  it('旧「练习中心」页仍可达（桌面侧边栏入口未动）', () => {
    window.app.showTab('practice');
    expect(document.getElementById('page-practice').classList.contains('active')).toBe(true);
  });

  it('hash 直达三个聚合页（深链 / 刷新保持）', async () => {
    window.location.hash = '#/train';
    await new Promise(r => setTimeout(r, 80));

    expect(window.app.currentTab, '深链 #/train 没有直达').toBe('train');
    expect(document.getElementById('page-train').classList.contains('active')).toBe(true);
  });
});

describe('行为：AI Tab 与其余五个同权', () => {
  beforeEach(async () => {
    vi.resetModules();
    await bootstrapApp();
  });

  afterEach(() => {
    window.location.hash = '';
  });

  it('showTab("ai") 打开 AI 页并点亮 AI 签，其余五签全灭', () => {
    window.app.showTab('home');
    window.app.showTab('ai');

    expect(document.getElementById('page-ai').classList.contains('active'), 'AI 页没有激活').toBe(true);
    expect(document.getElementById('page-home').classList.contains('active'), '首页没有随之关闭').toBe(false);

    const ai = document.querySelector('.bottom-nav-btn[data-tab="ai"]');
    expect(ai.classList.contains('active'), 'AI 签没有高亮').toBe(true);
    expect(ai.getAttribute('aria-current'), 'AI 签没有 aria-current').toBe('page');

    for (const b of document.querySelectorAll('.bottom-nav-btn')) {
      if (b === ai) continue;
      expect(b.classList.contains('active'), '签 ' + b.dataset.tab + ' 应熄灭').toBe(false);
      expect(b.getAttribute('aria-current'), '签 ' + b.dataset.tab + ' 应移除 aria-current').toBe(null);
    }
  });

  it('★站在 AI 页上底栏仍在——AI 已是栏内一员，不再需要"让位"', () => {
    // 旧实现是独立横条，在 AI 页要 display:none 并预留归零；
    // 成为 Tab 后这两个特殊分支都该消失，底栏与其他页面保持同一状态。
    // 注意：jsdom 不加载 CSS，算不出 display（拿到的 'block' 是 <nav> 的默认值），
    // 所以这里只断言 DOM 与状态，"真的没被隐藏"由源码守卫 + 真实浏览器验收兜底。
    window.app.showTab('ai');
    const nav = document.getElementById('bottom-nav');
    expect(nav, 'AI 页上底栏元素被移除').not.toBeNull();
    expect(document.querySelectorAll('.bottom-nav-btn').length, 'AI 页上签数变少').toBe(6);
    expect(document.documentElement.getAttribute('data-tab'), 'AI 页没有写 data-tab').toBe('ai');
    for (const b of document.querySelectorAll('.bottom-nav-btn')) {
      expect(b.style.display, '签 ' + b.dataset.tab + ' 被内联隐藏（绕过了样式表）').toBe('');
      expect(b.hasAttribute('hidden'), '签 ' + b.dataset.tab + ' 被 hidden 属性藏起来了').toBe(false);
    }
  });

  it('点击 AI 签即触发跳转（initNav 的通用 bottom-nav-btn 绑定，无专属分支）', () => {
    window.app.showTab('home');
    document.querySelector('.bottom-nav-btn[data-tab="ai"]').click();

    expect(window.app.currentTab, '点击没有切页').toBe('ai');
    expect(document.getElementById('page-ai').classList.contains('active')).toBe(true);
  });

  it('hash 直达 AI 页（深链 / 刷新保持）', async () => {
    window.location.hash = '#/ai';
    await new Promise(r => setTimeout(r, 80));

    expect(window.app.currentTab, '深链 #/ai 没有直达').toBe('ai');
    const ai = document.querySelector('.bottom-nav-btn[data-tab="ai"]');
    expect(ai.classList.contains('active'), '深链进来 AI 签没亮').toBe(true);
    expect(ai.getAttribute('aria-current')).toBe('page');
  });
});

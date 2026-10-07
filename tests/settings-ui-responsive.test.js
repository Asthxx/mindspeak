// settings-ui-responsive.test.js
// 设置页 UI 适配契约测试：锁定桌面/手机端适配规则与 Service Worker 缓存策略。
// 这些断言描述的是"用户刷新即可看到样式改动"的行为契约——
// 任何一处断言失败，都意味着对应的适配/缓存规则被意外移除。
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const styleCss = readFileSync(join(root, 'css', 'style.css'), 'utf8');
const mobileCss = readFileSync(join(root, 'css', 'mobile.css'), 'utf8');
const swJs = readFileSync(join(root, 'sw.js'), 'utf8');

// .dm-grid 块的边界：从容器开标签到行首缩进的闭合标签。
// 不要锚定「紧跟其后的那个元素」——P1-5 在它和自动保存块之间插入了解释性注释，
// 旧锚点 `<label class="auto-save-toggle">` 立刻失配（本节初版就栽在这）。
const DM_GRID_RE = /<div class="dm-grid">([\s\S]*?)\n\s*<\/div>/;

/** 提取 index.html 中数据管理组的 .dm-grid 块 */
function dmGridBlock() {
  const m = html.match(DM_GRID_RE);
  return m ? m[1] : '';
}

describe('设置页：桌面端适配（style.css）', () => {
  it('设置页内容限宽 860px 居中，宽屏不再拉满整行', () => {
    expect(styleCss).toMatch(/#page-settings\{max-width:860px;margin:0 auto\}/);
  });

  it('设置分组卡片有统一的 12px 组间距，最后一组不留边', () => {
    const groupRule = styleCss.match(/\.settings-group\{[^}]*\}/)?.[0] ?? '';
    expect(groupRule).toContain('margin-bottom:var(--sp-3)');
    expect(styleCss).toMatch(/\.settings-group:last-child\{margin-bottom:0\}/);
  });

  it('数据管理按钮为 3 列网格，保存按钮跨全行', () => {
    expect(styleCss).toMatch(/\.dm-grid\{[^}]*grid-template-columns:repeat\(3,1fr\)/);
    expect(styleCss).toMatch(/\.dm-grid \.btn-primary\{grid-column:1 \/ -1\}/);
  });

  it('勾选框与多行说明文字顶部对齐（4px 光学补偿），自动保存行保持居中', () => {
    expect(styleCss).toMatch(/\.settings-group label\{[^}]*align-items:flex-start/);
    expect(styleCss).toMatch(/\.settings-group label input\[type="checkbox"\]\{[^}]*margin-top:4px/);
    expect(styleCss).toMatch(/\.settings-group label\.auto-save-toggle\{align-items:center\}/);
  });

  it('朗读声音下拉框在桌面保持可读宽度', () => {
    expect(styleCss).toMatch(/\.settings-group #voice-select\{min-width:260px\}/);
    expect(styleCss).toMatch(/\.settings-group \.voice-field select\{min-width:180px\}/);
  });
});

describe('设置页：HTML 结构（index.html）', () => {
  it('数据管理的 7 个操作按钮全部包在 .dm-grid 网格容器内', () => {
    const block = dmGridBlock();
    expect(block).not.toBe('');
    for (const id of [
      'btn-save-progress', 'btn-export-data', 'btn-export-fav',
      'btn-export-mistakes', 'btn-import-data', 'btn-open-logs', 'btn-reset-data',
    ]) {
      expect(block, `缺少按钮 ${id}`).toContain(`id="${id}"`);
    }
    // 网格外不再残留这些按钮（防止双份 DOM）
    const htmlWithoutGrid = html.replace(DM_GRID_RE, '');
    expect(htmlWithoutGrid).not.toContain('id="btn-save-progress"');
  });

  it('朗读声音的三个字段使用 voice-field class，不再用行内样式', () => {
    for (const sel of ['voice-select', 'voice-rate', 'voice-pitch']) {
      const label = html.match(new RegExp(`<label class="voice-field">[\\s\\S]*?id="${sel}"`));
      expect(label, `${sel} 的 label 应带 voice-field class`).toBeTruthy();
    }
    // voice-select 不应有行内 style（宽度由 CSS 管理）
    expect(html).toMatch(/<select id="voice-select">\s*\n\s*<option value="">系统默认<\/option>/);
  });
});

describe('设置页：手机端适配（mobile.css）', () => {
  it('朗读声音字段在手机上改为上下排布、控件全宽', () => {
    expect(mobileCss).toMatch(/\.settings-group label\.voice-field\{flex-direction:column;align-items:stretch/);
    expect(mobileCss).toMatch(/\.settings-group label\.voice-field select\{width:100%;min-width:0\}/);
  });

  it('数据管理网格在手机上收为单列、按钮全宽', () => {
    expect(mobileCss).toMatch(/#page-settings \.dm-grid\{grid-template-columns:1fr\}/);
    expect(mobileCss).toMatch(/#page-settings \.dm-grid \.btn\{width:100%\}/);
  });

  it('设置组内直接子按钮（试听声音等）在手机上全宽', () => {
    expect(mobileCss).toMatch(/#page-settings \.settings-group > \.btn\{display:flex;width:100%;justify-content:center\}/);
  });
});

describe('设置页：保存模型统一为「改完即生效」（P1-5）', () => {
  const appJs = readFileSync(join(root, 'js', 'app.js'), 'utf8');

  it('「保存设置」按钮已移除，每日目标改为 input/change 即时落盘', () => {
    expect(html).not.toContain('btn-save-goal');
    // 精确匹配"元素内文案"，不要用 not.toContain('保存设置')——
    // 解释这段改动的 HTML 注释里也会出现这四个字，那会误报（本节初版就栽在这）。
    expect(html).not.toMatch(/>\s*保存设置\s*</);
    expect(appJs).not.toContain('btn-save-goal');
    expect(appJs).toContain("dailyGoalInput.addEventListener('change', commitDailyGoal)");
    // 输入过程有防抖，避免把「1」→「15」的中间态写进存储
    expect(appJs).toMatch(/setTimeout\(commitDailyGoal,\s*\d+\)/);
    expect(appJs).toContain('clearTimeout(dailyGoalTimer)');
  });

  it('每日目标仍是 setting-row 两列结构（标签在左、控件在右），并带说明文字位', () => {
    expect(html).toMatch(/<div class="setting-row">\s*<label class="setting-label" for="daily-goal">每日新词数量<\/label>/);
    expect(html).toMatch(/class="setting-row"[\s\S]*?<input type="number" id="daily-goal"/);
    expect(html).toMatch(/class="setting-help">改完立即生效/);
  });

  it('自动保存的说明文字不再包在勾选框的 label 里（点说明不会误切开关）', () => {
    // 外层必须是 div；勾选框与间隔输入各自拥有 label
    expect(html).toMatch(/<div class="auto-save-block">/);
    expect(html).toMatch(/<label class="auto-save-toggle" for="auto-save">/);
    expect(html).toMatch(/<label for="auto-save-interval">每\s*<input type="number" id="auto-save-interval"/);
    // 危险的旧结构：说明文字与输入框同处勾选框 label 内部
    expect(html).not.toMatch(/<label class="auto-save-toggle">[\s\S]*?id="auto-save-interval"[\s\S]*?<\/label>/);
    // 包裹用的 span 已删，对应 CSS 也要一起清掉
    expect(html).not.toContain('class="auto-save-interval"');
    expect(styleCss).not.toMatch(/\.auto-save-toggle \.auto-save-interval\{/);
  });

  it('间隔输入框的样式锚点已改为 .auto-save-block（跟着 DOM 迁移）', () => {
    expect(styleCss).toMatch(/\.auto-save-block #auto-save-interval\{/);
    expect(styleCss).toMatch(/\.auto-save-block \.auto-save-toggle\{margin:0\}/);
  });

  it('朗读声音的长说明改用 .setting-help，不再写行内 style', () => {
    expect(html).toMatch(/<p class="setting-help">可选<b>在线音色<\/b>/);
  });
});

describe('Service Worker：样式改动即时可见（sw.js）', () => {
  it('HTML/CSS/JS 走网络优先（缓存仅作离线回退），刷新即见改动', () => {
    // 存在"代码资源"判定：css/js/index.html
    expect(swJs).toMatch(/isCode/);
    // 缓存优先分支必须排除代码资源：isShell && !isCode && cached
    expect(swJs).toMatch(/isShell && !isCode && cached/);
    // 代码资源落到 network 分支（network 自带 catch(() => cached) 离线回退）
    expect(swJs).toMatch(/\.catch\(\(\) => cached\)/);
  });

  it('数据与静态大文件仍保持缓存优先（离线可用）', () => {
    expect(swJs).toMatch(/\/data\//);
    expect(swJs).toMatch(/\/assets\//);
  });
});

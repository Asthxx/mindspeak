import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

function extractFn(src, marker, nextMarker) {
  const start = src.indexOf(marker);
  expect(start, 'marker not found: ' + marker).toBeGreaterThan(-1);
  const rest = src.slice(start + 1);
  let end = rest.indexOf(nextMarker);
  return rest.slice(0, end === -1 ? rest.length : end);
}

// 存储型 XSS 修复回归：导入的备份 JSON 是唯一污染源，
// 渲染层 5 个汇点必须 escapeHtml，_sanitizeBackup 必须做类型收敛。

describe('XSS 汇点渲染层转义', () => {
  it('日历 title 属性拼接的 count 必须转义（PoC 已证实可利用）', () => {
    const body = extractFn(read('js/app.js'), 'CalendarModule.prototype.render', 'CalendarModule.prototype.makeupCheckin');
    expect(body).toContain('escapeHtml(count)');
  });

  it('统计周视图的 count 必须转义', () => {
    const body = extractFn(read('js/app.js'), 'ChartModule.prototype.render', 'return ChartModule');
    expect(body).toContain('escapeHtml(d.count)');
  });

  it('引导页计划视图：level/score/weakName/plan.lines 必须转义', () => {
    const body = extractFn(read('js/onboarding.js'), 'OnboardingModule.prototype._renderPlanView', 'OnboardingModule.prototype');
    expect(body).toContain('escapeHtml(lv)');
    expect(body).toContain('escapeHtml(res.score)');
    expect(body).toContain('escapeHtml(res.weakName)');
    expect(body).toContain('escapeHtml(l)');
  });

  it('引导页测评信息视图：done.score 必须转义', () => {
    const body = extractFn(read('js/onboarding.js'), 'OnboardingModule.prototype._renderAssessView', 'OnboardingModule.prototype._startAssessment');
    expect(body).toContain('escapeHtml(done.score)');
  });

  it('AI 学习计划的 weak.name 必须转义', () => {
    const body = extractFn(read('js/ai-chat.js'), 'AiChatModule.prototype._makePlan', 'AiChatModule.prototype._analyzeMistakes');
    expect(body).toContain('escapeHtml(weak.name)');
  });

  it('首页学习提示（dash-tips）：checkins 求和值必须转义（PoC 实测的第 6 个汇点）', () => {
    const body = extractFn(read('js/dashboard.js'), 'DashboardModule.prototype.renderTips', 'return DashboardModule');
    expect(body).toContain("escapeHtml(tip)");
  });
});

describe('_sanitizeBackup 深度清洗（导入数据类型收敛）', () => {
  const body = extractFn(read('js/app.js'), 'App.prototype._sanitizeBackup', 'App.prototype._applyBackup');

  it('checkins：日期键白名单 + 数值强制化', () => {
    expect(body).toMatch(/checkins/);
    expect(body).toMatch(/Number\(/);
    expect(body).toMatch(/\^\\d\{4\}-\\d\{2\}-\\d\{2\}\$/);
  });

  it('mistakes：source 白名单 + 文本字段截断', () => {
    expect(body).toMatch(/_SRC_OK|SRC_WHITELIST|sourceWhitelist/);
    expect(body).toMatch(/substring\(0,?\s*\d+\)|\.slice\(0,?\s*\d+\)/);
  });

  it('assessment：level 白名单 + score 数字化', () => {
    expect(body).toMatch(/newcomer/);
    expect(body).toMatch(/Number\(/);
  });
});

describe('Android 返回键：双击退出必须可达', () => {
  it('不得依赖 history.length（只增不减，导致退出分支不可达）', () => {
    const body = extractFn(read('js/app.js'), 'App.prototype._initAndroidBackHandler', 'App.prototype.showTab');
    expect(body).not.toMatch(/history\.length\s*>\s*1/);
    // 用当前历史条目的状态标记判断是否还有我们自己压入的记录
    expect(body).toMatch(/history\.state/);
    expect(body).toMatch(/msDrawer/);
  });
});

describe('引导关闭/跳过语义', () => {
  it('完成或跳过引导(_finish(true))必须持久化 onboarding_done', () => {
    const src = read('js/onboarding.js');
    const idx = src.indexOf('OnboardingModule.prototype._finish');
    expect(idx).toBeGreaterThan(-1);
    const body = src.slice(idx, idx + 400);
    expect(body).toMatch(/if\s*\(\s*completed\s*\)\s*DataStore\.setProgress\('onboarding_done',\s*true\)/);
  });

  it('X 关闭按钮不得标注"跳过引导"（其行为是临时关闭，标签误导用户）', () => {
    const html = read('index.html');
    const m = html.match(/id="btn-ob-close"[^>]*title="([^"]*)"/);
    expect(m, 'btn-ob-close title not found').toBeTruthy();
    expect(m[1]).not.toContain('跳过引导');
  });
});

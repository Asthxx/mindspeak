import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// 背单词页「艾宾浩斯遗忘曲线复习表」下线守护
//
// 该表是纯展示组件：把 Ebbinghaus 间隔表以 <table> 形式原样印在页面上，
// 下方 plan-note 复述一遍「自适应复习间隔」开关的语义。
// 用户要求删掉这块表格。
//
// 但要小心区分「展示」与「算法」：
//   必须保留 —— ebbinghausIntervals / ebbinghausRetention（复习排期与复习环的
//                保持率都依赖它）、getEbbinghausPlan（datastore.test.js 在用）、
//                复习环、#i-chart symbol（首页与底部导航仍在引用）
//   必须删除 —— .ebbinghaus-plan 容器、.plan-table、.plan-note、
//                renderEbbinghausPlan 及其两处调用
// 若误删间隔数据本身，背单词的复习排期会整体失效。

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const app = readFileSync(join(root, 'js/app.js'), 'utf8');

describe('艾宾浩斯复习表已从页面移除', () => {
  it('index.html 不再包含 ebbinghaus-plan 容器', () => {
    expect(html).not.toMatch(/ebbinghaus-plan/);
  });

  it('index.html 不再包含表格标题「艾宾浩斯遗忘曲线复习表」', () => {
    expect(html).not.toMatch(/艾宾浩斯遗忘曲线复习表/);
  });

  it('index.html 不再包含 plan-table 表头（复习次数/间隔天数/记忆保持率）', () => {
    expect(html).not.toMatch(/plan-table/);
    expect(html).not.toMatch(/记忆保持率/);
  });

  it('index.html 不再包含 plan-note 提示语', () => {
    expect(html).not.toMatch(/plan-note/);
  });

  it('不再保留空的 table 标签', () => {
    expect(html).not.toMatch(/<table class="plan-table">/);
  });
});

describe('renderEbbinghausPlan 渲染函数已移除', () => {
  it('函数定义已删除', () => {
    expect(app).not.toMatch(/function renderEbbinghausPlan/);
  });

  it('showCurrentWord 中的调用已删除', () => {
    // 删掉定义却留着调用会是 ReferenceError；两条都要清
    expect(app).not.toMatch(/renderEbbinghausPlan\(/);
  });

  it('不再向 .plan-table tbody 写 HTML', () => {
    expect(app).not.toMatch(/plan-table tbody/);
  });

  it('不再拼接「第N次…天…%」表格行', () => {
    expect(app).not.toMatch(/'第'\s*\+\s*row\.count\s*\+\s*'次'/);
  });
});

describe('复习算法数据未被误删', () => {
  it('ebbinghausIntervals 间隔表仍在', () => {
    expect(app).toMatch(/ebbinghausIntervals:\s*\[1,\s*2,\s*4,\s*7,\s*15,\s*30,\s*60,\s*120\]/);
  });

  it('ebbinghausRetention 保持率表仍在（复习环依赖）', () => {
    expect(app).toMatch(/ebbinghausRetention:\s*\[/);
  });

  it('getEbbinghausPlan 仍在（datastore.test.js 依赖）', () => {
    expect(app).toMatch(/getEbbinghausPlan:\s*function/);
  });

  it('复习排期仍按间隔表计算天数', () => {
    expect(app).toMatch(/ebbinghausIntervals\[idx\]/);
  });

  it('复习环仍用保持率画进度', () => {
    expect(app).toMatch(/ring-fill/);
  });
});

describe('无关资产未被波及', () => {
  it('#i-chart symbol 保留（首页 L287、底部导航 L1692 仍在用）', () => {
    expect(html).toMatch(/<symbol id="i-chart"/);
    const uses = html.match(/href="#i-chart"/g) || [];
    expect(uses.length, '删除表格后 i-chart 仍有其他引用者，不该删 symbol').toBeGreaterThanOrEqual(2);
  });

  it('自适应复习间隔开关保留（删的只是表格下方的说明句）', () => {
    expect(html).toMatch(/id="toggle-adaptive-review"/);
  });

  it('三个答题按钮保留（有点印象/认识/不认识）', () => {
    expect(html).toMatch(/id="btn-hesitate"/);
    expect(html).toMatch(/id="btn-known"/);
    expect(html).toMatch(/id="btn-forgot"/);
  });
});
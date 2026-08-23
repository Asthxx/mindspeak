import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const appJs = readFileSync(join(root, 'js', 'app.js'), 'utf8');

// ContextModule 未导出到 window（IIFE 私有），采用静态源断言
function extractMethod(name) {
  const marker = 'ContextModule.prototype.' + name;
  const start = appJs.indexOf(marker);
  expect(start, 'method not found: ' + name).toBeGreaterThan(-1);
  const m = appJs.slice(start + 1).match(/\n\s*ContextModule\.prototype\./);
  const end = m ? start + 1 + m.index : appJs.length;
  return appJs.slice(start, end);
}

describe('语境填空 开始练习按钮状态切换', () => {
  it('showQuestion 渲染题卡时隐藏 #btn-start-context', () => {
    const body = extractMethod('showQuestion');
    expect(body).toContain("getElementById('context-card')");
    expect(body).toContain("getElementById('btn-start-context')");
    expect(body).toMatch(/btn-start-context[\s\S]{0,80}style\.display\s*=\s*'none'/);
  });

  it('showScore 收起题卡时保持开始按钮隐藏（重练走"再来一轮"）', () => {
    const body = extractMethod('showScore');
    expect(body).toContain('context-card');
    expect(body).toContain('context-score');
    // 不允许 showScore 把开始按钮重新显示出来
    expect(body).not.toMatch(/btn-start-context[\s\S]{0,80}style\.display\s*=\s*'(block|''|inline)'/);
  });
});

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// 安全加固回归：审计报告「加固建议」第 2、3 条——两处 innerHTML 汇点补转义。

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

function extractFn(src, marker, nextMarker) {
  const start = src.indexOf(marker);
  expect(start, 'marker not found: ' + marker).toBeGreaterThan(-1);
  const rest = src.slice(start + 1);
  let end = rest.indexOf(nextMarker);
  return rest.slice(0, end === -1 ? rest.length : end);
}

describe('加固：日志弹窗 showErr 转义', () => {
  it('showErr 拼接的 msg 必须 escapeHtml（本地服务端口被占用时可能回显非预期片段）', () => {
    const body = extractFn(read('js/app.js'), 'function showErr(msg)', 'var summary');
    expect(body).toContain('escapeHtml(msg)');
  });
});

describe('加固：徽章日期渲染转义', () => {
  it('badges 渲染的 earned 值必须转义（纵深防御，防未来直写存储路径复活）', () => {
    const body = extractFn(read('js/badges.js'), 'BadgeSystem.prototype.render', 'return BadgeSystem');
    expect(body).toContain('escapeHtml(String(self.earned[b.id] || \'\'))');
  });
});
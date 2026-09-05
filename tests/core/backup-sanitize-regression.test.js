import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// 安全审计回归：F2 道具商店 XSS / F3 AI 概况 XSS / F6 徽章对象覆盖 / F7 背景图丢失。
// 沿用 xss-and-back.test.js 的"源码静态断言"模式：断言修复代码必须存在。

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

function extractFn(src, marker, nextMarker) {
  const start = src.indexOf(marker);
  expect(start, 'marker not found: ' + marker).toBeGreaterThan(-1);
  const rest = src.slice(start + 1);
  let end = rest.indexOf(nextMarker);
  return rest.slice(0, end === -1 ? rest.length : end);
}

describe('F2 道具商店存储型 XSS', () => {
  it('renderShop 拥有数量必须转义（数量来自可导入数据）', () => {
    const body = extractFn(read('js/items.js'), 'ItemSystem.prototype.renderShop', 'ItemSystem.prototype.updateGlobalUI');
    expect(body).toContain('escapeHtml(String(self.count(id)))');
  });

  it('_sanitizeBackup 对 items 做有限数字收敛（含 <img 注入串被化为 0）', () => {
    const body = extractFn(read('js/app.js'), 'App.prototype._sanitizeBackup', 'App.prototype._applyBackup');
    expect(body).toContain('sanitized.items = _items;');
  });
});

describe('F3 AI 概况存储型 XSS', () => {
  it('_overview 的等级与积分必须数字转义', () => {
    const body = extractFn(read('js/ai-chat.js'), 'AiChatModule.prototype._overview', 'AiChatModule.prototype._makePlan');
    expect(body).toContain('escapeHtml(String(level))');
    expect(body).toContain('escapeHtml(String(+gami.points || 0))');
  });

  it('_sanitizeBackup 对 gamification 做数字收敛', () => {
    const body = extractFn(read('js/app.js'), 'App.prototype._sanitizeBackup', 'App.prototype._applyBackup');
    expect(body).toContain('sanitized.gamification = _g;');
  });
});

describe('F6 徽章对象被数组默认值覆盖', () => {
  it('_backupFields 的 badges 默认必须是对象（数组会令徽章日期丢失/重置）', () => {
    const fields = extractFn(read('js/app.js'), 'App.prototype._backupFields', 'App.prototype._collectBackup');
    expect(fields).toContain("['badges','badges',{},false]");
    expect(fields).not.toContain("['badges','badges',[],false]");
  });

  it('_sanitizeBackup 对 badges 做日期白名单收敛', () => {
    const body = extractFn(read('js/app.js'), 'App.prototype._sanitizeBackup', 'App.prototype._applyBackup');
    expect(body).toContain('sanitized.badges = _badges;');
  });
});

describe('F7 自定义背景图导出/导入丢失', () => {
  it('_sanitizeBackup 必须完整保留 data:image dataURL（不经 1000 截断）', () => {
    const body = extractFn(read('js/app.js'), 'App.prototype._sanitizeBackup', 'App.prototype._applyBackup');
    expect(body).toContain("data.customBg.indexOf('data:image/') === 0");
  });
});
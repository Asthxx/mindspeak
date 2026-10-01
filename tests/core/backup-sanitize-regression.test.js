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

// F2 道具商店存储型 XSS 守护已随道具商店下线一并移除：
// 风险源头是 ItemSystem.prototype.renderShop 直接拼接 escapeHtml 之外的数量文本，
// 以及 _sanitizeBackup 里对 sanitized.items 的保留。两处代码均已删除
// （见 tests/core/items-shop-removed.test.js），风险向量不复存在。

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

  it('DataStore 读取 gamification 必须封顶（M1：localStorage 直写天文数字也只见到 999999/99）', () => {
    const store = read('js/core/store.js');
    expect(store).toContain('Math.min(Math.floor(parsed.points), 999999)');
    expect(store).toContain('Math.min(Math.floor(parsed.level), 99)');
  });
});

describe('F7 自定义背景图导出/导入丢失', () => {
  it('_sanitizeBackup 必须完整保留 data:image dataURL（不经 1000 截断）', () => {
    const body = extractFn(read('js/app.js'), 'App.prototype._sanitizeBackup', 'App.prototype._applyBackup');
    expect(body).toContain("data.customBg.indexOf('data:image/') === 0");
  });
});

describe('重置数据残留（审查 P3 #15）', () => {
  it('resetData 的 appKeys 必须包含精选开关与 AI 聊天历史', () => {
    const body = extractFn(read('js/app.js'), 'App.prototype.resetData', 'App.prototype._applyBackup');
    expect(body).toContain("'learn_selected_only'");
    expect(body).toContain("'ai_chat_history'");
  });

  it('resetData 必须按分类循环清除 selected_words_ 动态键', () => {
    const body = extractFn(read('js/app.js'), 'App.prototype.resetData', '// ==================== IndexedDB');
    expect(body).toContain("Storage.remove('selected_words_' + i);");
  });
});
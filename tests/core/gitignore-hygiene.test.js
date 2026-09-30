import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// .gitignore 回归：调试截图与会话过程文件不得污染 git status，
// 但仓库内合法的图标 PNG 必须保持可追踪（assets/、src-tauri/icons/）。
// 任何改动 .gitignore 的提交若弄错这两侧平衡，本文件会失败。

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

function isIgnored(relPath) {
  try {
    execFileSync('git', ['check-ignore', '-q', relPath], { cwd: root, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

describe('.gitignore — 调试产物必须忽略', () => {
  it.each([
    ['scripts/home-before.png', 'mobile-shot.mjs 输出的对比截图'],
    ['scripts/mobile-home.png', 'mobile-shot.mjs 输出的默认截图'],
    ['.workbuddy/_tdd.log', '会话过程日志'],
    ['.workbuddy/server.js.fixed.bak', '会话内临时备份'],
    ['.workbuddy/memory/2026-09-15.md', '会话记忆文件'],
  ])('必须忽略 %s（%s）', (p) => {
    expect(isIgnored(p), p + ' 未被忽略，会污染 git status').toBe(true);
  });
});

describe('.gitignore — 合法图标必须保持可追踪', () => {
  it.each([
    'assets/pwa/icon-192.png',
    'assets/pwa/icon-512.png',
    'assets/mindspeak-mobile.png',
    'src-tauri/icons/icon.png',
    'src-tauri/icons/StoreLogo.png',
  ])('不得忽略 %s（否则新增图标需 -f 强推）', (p) => {
    expect(isIgnored(p), p + ' 被误忽略，已跟踪图标将无法正常新增').toBe(false);
  });
});

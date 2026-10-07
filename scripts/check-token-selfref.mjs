// check-token-selfref.mjs — 扫描"令牌把自己定义成自己"这类致命错误
//
// 为什么需要：批量 hex→token 替换很容易连令牌定义行本身一起替换，
// 产出 `--sage-deep: var(--sage-deep);` 这种自引用。CSS 变量自引用是无效声明
// （计算值回退到 inherit），表现为"某个颜色整体失效"，但不会报任何错。
// 本脚本当初就是为排查这一问题而写，现固化为常规检查。
//
// 用法：node scripts/check-token-selfref.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cssDir = join(root, 'css');
const files = readdirSync(cssDir).filter(f => f.endsWith('.css'));

let bad = 0;
for (const f of files) {
  const lines = readFileSync(join(cssDir, f), 'utf8').split(/\r?\n/);
  lines.forEach((line, i) => {
    const m = line.match(/^\s*(--[a-z0-9-]+)\s*:\s*var\(\s*(--[a-z0-9-]+)\s*\)\s*;/i);
    if (m && m[1] === m[2]) {
      bad++;
      console.log(`  ✗ css/${f}:${i + 1}  ${m[1]}: var(${m[2]});   ← 自引用，该令牌会整体失效`);
    }
  });
}
console.log(bad ? `\n共 ${bad} 处自引用令牌` : '\n未发现自引用令牌 ✓');
process.exitCode = bad ? 1 : 0;

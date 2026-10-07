// check-css-duplicates.mjs — 扫描跨文件重复的选择器（P2-4b）
//
// 为什么需要：design-system.css 与 style.css 会定义同名组件，加载顺序
// （index.html:40→42）决定后者永远赢。于是 design-system.css 里的那份是**死代码**：
// 改它不生效，但没人知道 —— 设计交接时就会出现"我改了，页面没变"的反复。
// 本脚本列出跨文件重复的选择器，供人工判定该删哪一份。
//
// 用法：node scripts/check-css-duplicates.mjs
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// 只关心"组件库 vs 页面样式"这一对；同一文件内部重复不在本脚本范围
const PAIRS = [['design-system', 'style']];

function selectorsOf(file) {
  const s = readFileSync(file, 'utf8');
  const out = new Map();
  // 粗略剥离注释，避免注释里的示例被当成真规则
  const clean = s.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of clean.matchAll(/(^|\})\s*([^{}@]+)\{/g)) {
    const sel = m[2].split(',').map(x => x.trim()).filter(Boolean);
    for (const one of sel) {
      if (one.length > 60 || one.includes(':')) continue;   // 跳过伪类/复杂选择器
      if (!out.has(one)) out.set(one, 0);
      out.set(one, out.get(one) + 1);
    }
  }
  return out;
}

let total = 0;
for (const [a, b] of PAIRS) {
  const fa = join(root, 'css', a + '.css');
  const fb = join(root, 'css', b + '.css');
  if (!existsSync(fa) || !existsSync(fb)) continue;
  const sa = selectorsOf(fa);
  const sb = selectorsOf(fb);
  const dup = [...sa.keys()].filter(k => sb.has(k));
  console.log(`\n${a}.css 与 ${b}.css 同名选择器：${dup.length} 个（后者加载更晚，永远胜出）`);
  dup.slice(0, 40).forEach(k => console.log('  · ' + k));
  if (dup.length > 40) console.log(`  … 其余 ${dup.length - 40} 个略`);
  total += dup.length;
}
console.log(`\n合计 ${total} 个跨文件重复选择器`);

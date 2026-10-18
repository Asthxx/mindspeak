/**
 * 契约缺口检查（只读，不修改任何文件）
 *
 * 查两类"只有声明、没有落地"的隐形未完成项：
 *   1. JS 里 getElementById/querySelector('#x') 引用的 id，在 index.html 与所有 JS 模板串里都找不到
 *   2. JS 里产出的 class（className / class="..." / classList.add），在 css/*.css 里没有定义
 *
 * 用法：node scripts/check-contract-gaps.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

// ---- 收集 ----
const htmlFiles = ['index.html'];
const jsFiles = [];
const cssFiles = [];

function walk(dir, out, exts) {
  if (!fs.existsSync(path.join(ROOT, dir))) return;
  for (const f of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    if (f.isDirectory()) continue;
    if (exts.some((e) => f.name.endsWith(e))) out.push(`${dir}/${f.name}`);
  }
}
walk('js', jsFiles, ['.js']);
walk('css', cssFiles, ['.css']);

const html = htmlFiles.map(read).join('\n');

// index.html 里出现过的所有 id（含 JS 模板串里的，避免动态创建被误报）
const allJs = jsFiles.map(read).join('\n');
const htmlPlusTemplates = html + '\n' + allJs;

const idDefs = new Set();
for (const m of htmlPlusTemplates.matchAll(/\sid\s*=\s*["']([^"']+)["']/g)) idDefs.add(m[1]);
for (const m of htmlPlusTemplates.matchAll(/id\s*=\s*['"`]([^'"`$]+)['"`]/g)) idDefs.add(m[1]);

// CSS 里定义过的所有 class
const cssAll = cssFiles.map(read).join('\n');
const classDefs = new Set();
for (const m of cssAll.matchAll(/\.(-?[A-Za-z_][\w-]*)/g)) classDefs.add(m[1]);

// ---- 1. id 缺口 ----
const idRefs = new Map(); // id -> [文件]
for (const f of jsFiles) {
  const src = read(f);
  for (const m of src.matchAll(/getElementById\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    if (!idRefs.has(m[1])) idRefs.set(m[1], new Set());
    idRefs.get(m[1]).add(f);
  }
  for (const m of src.matchAll(/querySelector(?:All)?\(\s*['"]#([A-Za-z_][\w-]*)['"]/g)) {
    if (!idRefs.has(m[1])) idRefs.set(m[1], new Set());
    idRefs.get(m[1]).add(f);
  }
}
const idGaps = [...idRefs.entries()].filter(([id]) => !idDefs.has(id));

// ---- 2. class 缺口（只看 ai-* 前缀，避免全站噪声）----
const classRefs = new Map();
for (const f of jsFiles) {
  const src = read(f);
  const push = (cls) => {
    if (!/^ai-/.test(cls)) return;
    if (!classRefs.has(cls)) classRefs.set(cls, new Set());
    classRefs.get(cls).add(f);
  };
  for (const m of src.matchAll(/class\s*=\s*["'`]([^"'`$]*)["'`]/g)) {
    m[1].split(/\s+/).forEach(push);
  }
  for (const m of src.matchAll(/className\s*=\s*['"`]([^'"`$]*)['"`]/g)) {
    m[1].split(/\s+/).forEach(push);
  }
  for (const m of src.matchAll(/classList\.(?:add|toggle|remove)\(\s*['"]([^'"]+)['"]/g)) push(m[1]);
}
const classGaps = [...classRefs.entries()].filter(([c]) => !classDefs.has(c));

// ---- 3. index.html 里用到但 CSS 无定义的 class（渲染出来=裸元素）----
const htmlClassRefs = new Map();
for (const m of html.matchAll(/\sclass\s*=\s*["']([^"']+)["']/g)) {
  m[1].split(/\s+/).forEach((c) => {
    if (!c) return;
    if (!htmlClassRefs.has(c)) htmlClassRefs.set(c, 0);
    htmlClassRefs.set(c, htmlClassRefs.get(c) + 1);
  });
}
const htmlClassGaps = [...htmlClassRefs.entries()]
  .filter(([c]) => !classDefs.has(c))
  .sort((a, b) => b[1] - a[1]);

// ---- 报告 ----
console.log('=== 契约缺口检查 ===\n');
console.log(`扫描：${jsFiles.length} 个 js / ${cssFiles.length} 个 css / ${htmlFiles.length} 个 html\n`);

console.log(`【1】JS 引用但无处定义的 id：${idGaps.length}`);
idGaps.forEach(([id, files]) => console.log(`   - #${id}   ← ${[...files].join(', ')}`));

console.log(`\n【2】JS 产出但 CSS 无定义的 ai-* class：${classGaps.length}`);
classGaps.forEach(([c, files]) => console.log(`   - .${c}   ← ${[...files].join(', ')}`));

console.log(`\n【3】index.html 用到但 CSS 无定义的 class：${htmlClassGaps.length}`);
htmlClassGaps.forEach(([c, n]) => console.log(`   - .${c}   ×${n}`));

console.log('\n（id 缺口可能是动态创建，需人工确认；class 缺口通常是样式没写完）');

// 三张加载表一致性守卫（P2-7 那类"漏一张表集体报错"的根因）
//
// 项目有三处决定"哪些 JS 会被加载"：
//   ① index.html          —— 开发环境逐个 <script> 加载
//   ② build.js 的 jsOrder —— dist 的 bundle.js 拼接顺序
//   ③ tests/helpers 的 MODULES —— 测试环境的加载清单
// 任何新增模块只要漏掉其中一张，就会出现"本地能跑、测试全红"或"dist 缺模块"，
// 而报错通常长成「X is not defined」，与真正原因相距很远（本项目踩过多次）。
//
// 允许的差异（有意为之，写死在下面）：
//   - index.html 独有：head-boot.js（首帧引导，不进 bundle）、api-config.js（独立加载）
//   - jsOrder 独有：nativetts-bridge.js（Capacitor 原生桥，测试无 Capacitor 不需要）、
//                   android-ui-init.js（Android 专属 UI，测试里会污染 DOM）
//   - MODULES 独有：api-config.js（测试需先定义 window.MS）
// 注意：只校验"集合"，不校验顺序 —— 三处顺序历史不同但都满足"定义先于实例化"。
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

const INDEX_ONLY = ['js/head-boot.js', 'js/api-config.js'];
const BUNDLE_ONLY = ['js/nativetts-bridge.js', 'js/android-ui-init.js'];
const MODULES_ONLY = ['js/api-config.js'];

function uniq(list) { return Array.from(new Set(list)).sort(); }
function diff(a, b) { return a.filter(x => !b.includes(x)); }

describe('加载表一致性', () => {
  const html = read('index.html');
  const buildSrc = read('build.js');
  const bootSrc = read('tests/helpers/app-bootstrap.js');

  const inIndex = uniq([...html.matchAll(/<script src="(js\/[^"?]+\.js)/g)].map(m => m[1]));
  const orderBody = buildSrc.match(/(?:const|let|var)\s+jsOrder\s*=\s*\[([\s\S]*?)\];/)[1];
  const inOrder = uniq([...orderBody.matchAll(/'(js\/[^']+\.js)'/g)].map(m => m[1]));
  const modulesBody = bootSrc.match(/(?:const|let|var)\s+MODULES\s*=\s*\[([\s\S]*?)\];/)[1];
  const inModules = uniq([...modulesBody.matchAll(/'(js\/[^']+\.js)'/g)].map(m => m[1]));

  it('index.html 的脚本集合 = jsOrder − (head-boot/api-config)', () => {
    const expectIndex = uniq(inOrder.concat(INDEX_ONLY));
    const missingInIndex = diff(expectIndex, inIndex);
    const extraInIndex = diff(inIndex, expectIndex);
    expect(missingInIndex, '这些文件在 bundle 里但页面没加载（dev 会缺模块）').toEqual([]);
    expect(extraInIndex, '这些文件页面加载了但 bundle 没有（dist 会缺模块）').toEqual([]);
  });

  it('测试 MODULES = jsOrder − (原生桥/Android UI) + api-config', () => {
    const expectModules = uniq(inOrder.filter(f => !BUNDLE_ONLY.includes(f))
      .filter(f => !MODULES_ONLY.includes(f))
      .concat(MODULES_ONLY));
    const missingInTests = diff(expectModules, inModules);
    const extraInTests = diff(inModules, expectModules);
    expect(missingInTests, '这些文件测试不会加载（相关用例会报 X is not defined）').toEqual([]);
    expect(extraInTests, '测试加载了 jsOrder 里没有的文件').toEqual([]);
  });

  it('jsOrder 中的每个文件都真实存在（防拼写错误）', () => {
    const missing = inOrder.filter(f => !existsSync(join(root, f)));
    expect(missing, 'jsOrder 里存在不存在的路径').toEqual([]);
  });

  it('拆出的模块必须被三张表同时收录（防止只改一处）', () => {
    const mods = inOrder.filter(f => f.startsWith('js/modules/'));
    expect(mods.length, 'js/modules 下应已收录拆出的模块').toBeGreaterThan(0);
    for (const m of mods) {
      expect(inIndex, m + ' 未在 index.html 加载').toContain(m);
      expect(inModules, m + ' 未在测试 MODULES 中').toContain(m);
    }
  });
});

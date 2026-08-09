// 合并 data/*.js 词库脚本：把 index.html 里逐条引用的数据脚本按原顺序
// 合并为 data/all-data.js（词库/音标）+ data/all-extra.js（练习/语法/阅读），
// 并重写 index.html 的引用，减少 HTTP/1.1 下 70+ 个请求的 RTT 与 console 噪音。
// 用法：node merge-data.js（build.js 也会自动调用）
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname);

function mergeData() {
  const htmlPath = path.join(SRC, 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const tagRe = /<script\s+src="data\/([^"]+\.js)"[^>]*><\/script>/gi;
  const files = [];
  let m;
  const re = new RegExp(tagRe.source, 'gi');
  while ((m = re.exec(html))) files.push(m[1]);

  if (!files.length) {
    console.log('[merge-data] index.html 中未发现 data/*.js 引用，跳过');
    return { files: [], html };
  }
  if (files.indexOf('all-data.js') !== -1 || files.indexOf('all-extra.js') !== -1) {
    console.log('[merge-data] index.html 已引用合并产物，跳过（如需重合并先还原为逐条引用）');
    return { files, html };
  }

  // 分组：词库类（音标 + words-*）进 all-data.js；其余（练习/语法/阅读）进 all-extra.js
  const wordRe = /^(words-|phonetics)/;
  const allData = [];
  const allExtra = [];
  for (const f of files) {
    const fp = path.join(SRC, 'data', f);
    if (!fs.existsSync(fp)) { console.warn('[merge-data] 缺失文件，已跳过: ' + f); continue; }
    let content = fs.readFileSync(fp, 'utf8');
    if (!content.endsWith('\n')) content += '\n';
    (wordRe.test(f) ? allData : allExtra).push({ f, content });
  }

  function writeBundle(name, list) {
    if (!list.length) return;
    const header = '// ===== 由 merge-data.js 自动合并生成，请勿手工编辑 =====\n';
    const body = list.map(x => '// ---------------- ' + x.f + ' ----------------\n' + x.content).join('\n');
    fs.writeFileSync(path.join(SRC, 'data', name), header + body, 'utf8');
    console.log('[merge-data] 已生成 data/' + name + '（' + list.length + ' 个文件，' + Math.round(body.length / 1024) + ' KB）');
  }
  writeBundle('all-data.js', allData);
  writeBundle('all-extra.js', allExtra);

  // 重写 index.html：第一个 data 标签位置替换为合并产物，其余 data 标签删除
  let inserted = false;
  const newHtml = html.replace(tagRe, function() {
    if (!inserted) {
      inserted = true;
      return '<script src="data/all-data.js" defer></script>\n  <script src="data/all-extra.js" defer></script>\n  ';
    }
    return '';
  });
  fs.writeFileSync(htmlPath, newHtml, 'utf8');
  console.log('[merge-data] index.html 已改为引用 data/all-data.js + data/all-extra.js（原 ' + files.length + ' 个脚本 → 2 个）');
  return { files, html: newHtml };
}

if (require.main === module) {
  mergeData();
}

module.exports = { mergeData };

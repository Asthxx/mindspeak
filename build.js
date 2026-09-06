// 构建脚本：合并 JS + terser 混淆压缩（需 npm install terser --save-dev）
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname);
const DIST = path.join(SRC, 'dist');

// 先合并词库脚本（幂等：已合并过则跳过），再拷入 dist
require('./merge-data.js').mergeData();

const jsOrder = [
  'js/logger.js', // 前端错误日志必须最先加载：捕获其他所有脚本的错误
  'js/core/errors.js', // 统一错误处理（依赖 logger 的 window.Log）
  'js/core/events.js', // EventBus 事件总线（模块解耦）
  'js/core/store.js', // UserState 统一状态访问层（含幂等 migration）
  'js/tts-manager.js', // 全局统一 TTS 服务必须最先加载（其他文件都依赖 window.TTSManager）
  'js/nativetts-bridge.js', // Capacitor 原生 TTS 桥接层（Android 端由 tts-manager 调用）
  'js/android-ui-init.js', // Android UI 初始化（StatusBar、NavigationBar、触摸反馈、启动屏）
  'js/notification-manager.js', // Android 本地通知管理（学习提醒、复习调度）
  'js/responsive-layout.js', // 响应式断点布局（手机/平板/桌面自适应）
  'js/app.js',
  'js/badges.js',
  'js/daily-plan.js',
  'js/dashboard.js',
  'js/items.js',
  'js/listen-along.js',
  'js/story.js',
  'js/ai-chat.js',
  'js/ai-coach.js',
  'js/assessment.js',
  'js/onboarding.js',
];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function copyFile(src, dst) {
  ensureDir(path.dirname(dst));
  fs.copyFileSync(src, dst);
}

function copyDir(srcDir, dstDir, opts) {
  opts = opts || {};
  if (!fs.existsSync(dstDir)) fs.mkdirSync(dstDir, { recursive: true });
  for (const f of fs.readdirSync(srcDir)) {
    if (opts.whitelist && opts.whitelist.indexOf(f) === -1) continue;
    const sp = path.join(srcDir, f);
    const dp = path.join(dstDir, f);
    if (fs.statSync(sp).isDirectory()) copyDir(sp, dp, opts);
    else if (opts.filterConsole && /\.js$/.test(f)) {
      copyFileFiltered(sp, dp);
    } else copyFile(sp, dp);
  }
}

function copyFileFiltered(src, dst) {
  ensureDir(path.dirname(dst));
  const content = fs.readFileSync(src, 'utf8')
    .replace(/^\s*console\.(?:log|debug)\([^\n]*\);\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n');
  fs.writeFileSync(dst, content, 'utf8');
}

function toKB(n) { return (n / 1024).toFixed(1) + 'KB'; }

async function bundleJs(BUILD_TIME) {
  let combined = '// MindSpeak bundle 构建时间: ' + BUILD_TIME + '\n';
  for (const jsFile of jsOrder) {
    const fp = path.join(SRC, jsFile);
    if (fs.existsSync(fp)) combined += fs.readFileSync(fp, 'utf8') + '\n';
  }
  try {
    const terser = require('terser');
    const debugMode = process.env.MS_DEBUG === '1';
    if (debugMode) {
      console.log('[debug] skip terser, output unminified bundle');
      fs.writeFileSync(path.join(DIST, 'js', 'bundle.js'), combined, 'utf8');
    } else {
      const result = await terser.minify(combined, {
        compress: { drop_console: true, dead_code: true },
        mangle: true,
        output: { beautify: false },
      });
      if (result.error) {
        console.log('[warn] terser failed, plain concat:', result.error.message);
        fs.writeFileSync(path.join(DIST, 'js', 'bundle.js'), combined, 'utf8');
      } else {
        fs.writeFileSync(path.join(DIST, 'js', 'bundle.js'), result.code, 'utf8');
        console.log('[ok] JS 混淆压缩 (' + toKB(combined.length) + ' -> ' + toKB(result.code.length) + ')');
      }
    }
  } catch (e) {
    console.log('[info] terser 未安装，使用原始合并（代码可读但结构完整）');
    fs.writeFileSync(path.join(DIST, 'js', 'bundle.js'), combined, 'utf8');
  }
}

function buildStamp(BUILD_TIME) { return BUILD_TIME.replace(/[^0-9]/g, ''); }

function gatherReferencedData() {
  if (!fs.existsSync(path.join(SRC, 'data'))) return [];
  const html = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');
  const set = new Set();
  const re = /src="data\/([^"]+)"/g;
  let m;
  while ((m = re.exec(html))) set.add(m[1]);
  return Array.from(set);
}

async function build() {
  const BUILD_TIME = new Date().toISOString().replace('T', ' ').slice(0, 19);
  // 版本分离：版本号统一维护在根目录 VERSION 文件，构建时注入 dist/
  let VERSION = '0.0.0';
  try { VERSION = fs.readFileSync(path.join(SRC, 'VERSION'), 'utf8').trim(); } catch (e) {}
  const VER_TAG = 'v' + VERSION;
  ensureDir(DIST);
  ensureDir(path.join(DIST, 'css'));
  ensureDir(path.join(DIST, 'js'));
  ensureDir(path.join(DIST, 'assets'));
  ensureDir(path.join(DIST, 'data'));

  // ---- 0. 版本文件 ----
  fs.writeFileSync(path.join(DIST, 'version.txt'), VER_TAG + '\n构建时间: ' + BUILD_TIME + '\n', 'utf8');
  console.log('[ok] 版本 ' + VER_TAG + ' (' + BUILD_TIME + ')');

  // ---- 1. index.html 复制并更新路径 ----
  let html = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');
  // 移除 body 末尾所有业务 script 标签、收敛为 bundle.js；但保留 head 中独立加载的
  // js/api-config.js（API 配置必须在任何逻辑执行前就位，且不参与混淆）与
  // js/head-boot.js（首帧前引导：视口/主题/平台，CSP 收紧后不得内联，且不参与混淆）。
  html = html.replace(/<script src="js\/(?!api-config\.js|head-boot\.js)[^"]+\.js(?:\?[^"']*)?"><\/script>\s*/gi, '');
  // 全量源码 version 注入（版本分离）：dist/index.html 始终带当前 VERSION
  html = html.replace(/(<meta name="app-version" content=")[^"]*(")/i, '$1' + VER_TAG + '$2');
  const bStamp = buildStamp(BUILD_TIME);
  html = html.replace(/<\/body>/i,
    '<!-- MindSpeak dist 构建时间: ' + BUILD_TIME + ' 版本: ' + VER_TAG + ' -->\n<script src="js/bundle.js?v=' + bStamp + '"></script>\n</body>');
  fs.writeFileSync(path.join(DIST, 'index.html'), html, 'utf8');
  console.log('[ok] index.html -> dist/ (version: ' + VER_TAG + ')');

  // ---- 1.5 api-config（独立加载不进 bundle）：head 已引用，保持真实路径即可被 SW/PWA 缓存 ----
  copyFile(path.join(SRC, 'js', 'api-config.js'), path.join(DIST, 'js', 'api-config.js'));
  console.log('[ok] js/api-config.js -> dist/js/（独立加载，不进 bundle）');

  // ---- 1.6 head-boot（首帧前引导，独立加载不进 bundle）----
  copyFile(path.join(SRC, 'js', 'head-boot.js'), path.join(DIST, 'js', 'head-boot.js'));
  console.log('[ok] js/head-boot.js -> dist/js/（首帧引导，独立加载，不进 bundle）');

  // ---- 2. 复制 CSS ----
  const cssSrc = path.join(SRC, 'css');
  if (fs.existsSync(cssSrc)) copyDir(cssSrc, path.join(DIST, 'css'));
  console.log('[ok] css/ -> dist/css/');

  // ---- 3. 复制 assets ----
  const assetsSrc = path.join(SRC, 'assets');
  if (fs.existsSync(assetsSrc)) copyDir(assetsSrc, path.join(DIST, 'assets'));
  console.log('[ok] assets/ -> dist/assets/');

  // ---- 4. 复制 data（只拷 index.html 引用的合并产物，避免 70+ 个散词库冗余约12MB）----
  const dataSrc = path.join(SRC, 'data');
  if (fs.existsSync(dataSrc)) {
    const referenced = gatherReferencedData();
    copyDir(dataSrc, path.join(DIST, 'data'), { whitelist: referenced, filterConsole: true });
    console.log('[ok] data/ -> dist/data/（仅 ' + referenced.length + ' 个被引用文件，已过滤 console 日志）');
  }

  // ---- 5. 合并 JS + terser 混淆 ----
  await bundleJs(BUILD_TIME);

  // ---- 6. PWA：manifest + Service Worker（注入构建时间戳强制缓存刷新）----
  const stamp = buildStamp(BUILD_TIME);
  const swSource = fs.readFileSync(path.join(SRC, 'sw.js'), 'utf8');
  fs.writeFileSync(path.join(DIST, 'sw.js'), swSource.replace('__BUILD_STAMP__', stamp), 'utf8');
  copyFile(path.join(SRC, 'manifest.webmanifest'), path.join(DIST, 'pwa-manifest.json'));
  console.log('[ok] PWA manifest + sw.js (cache: mindspeak-v' + stamp + ')');
}

build().then(() => {
  console.log('');
  console.log('===== 构建完成 =====');
  console.log('dist/ 目录已生成，可以上传到 GitHub 公开仓库（只公开这 1 个文件夹）');
  console.log('或拖入 Vercel / Cloudflare Pages 一键部署');
}).catch(e => {
  console.error('[error] 构建失败:', e && e.message || e);
  process.exit(1);
});
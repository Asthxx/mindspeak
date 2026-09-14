// ==================== 桌面版资源打包 ====================
// 在 Tauri beforeBuildCommand / beforeDevCommand 阶段运行，负责：
//   1. 确保 dist/ 已构建（未构建则执行 node build.js）
//   2. 下载并放置 Node 运行时到 src-tauri/node-runtime/node(.exe)
//   3. 组装 src-tauri/resources/{node,server,static}
// Node 版本与平台按 CI 宿主自动匹配，下载结果缓存在 src-tauri/node-runtime/。
"use strict";
const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const { execSync } = require('child_process');

const NODE_VERSION = 'v22.14.0';
const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src-tauri');
const RES = path.join(SRC, 'resources');
const DIST = path.join(ROOT, 'dist');
const NODE_CACHE = path.join(SRC, 'node-runtime');

const distro = () => {
  const p = process.platform;
  const a = process.arch;
  const map = {
    'win32-x64': 'win-x64',
    'darwin-x64': 'darwin-x64',
    'darwin-arm64': 'darwin-arm64',
    'linux-x64': 'linux-x64',
    'linux-arm64': 'linux-arm64',
  };
  return map[`${p}-${a}`] || null;
};

function rmrf(p) { fs.rmSync(p, { recursive: true, force: true }); }
function cp(src, dest, filter) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    if (filter && !filter(e.name)) continue;
    const s = path.join(src, e.name);
    const d = path.join(dest, e.name);
    if (e.isDirectory()) {
      cp(s, d, filter);
    } else if (e.isSymbolicLink()) {
      // npm 会在 node_modules 里放指向包自身的环回符号链接（如 yuan-dao -> .），
      // 直接复制会 EPERM/死循环，这里跳过 symlink。
      continue;
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const req = https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        fs.rmSync(dest, { force: true });
        return download(res.headers.location, dest).then(resolve, reject);
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    });
    req.on('error', (e) => { fs.rmSync(dest, { force: true }); reject(e); });
  });
}

async function ensureNode() {
  const d = distro();
  if (!d) { console.warn('[desktop-pack] 不支持此平台，跳过 Node 下载'); return; }
  const nodeFile = path.join(NODE_CACHE, d === 'win-x64' ? 'node.exe' : 'node');
  if (fs.existsSync(nodeFile)) return nodeFile;

  fs.mkdirSync(NODE_CACHE, { recursive: true });
  const ext = d.startsWith('win-') ? 'zip' : 'tar.gz';
  const url = `https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-${d}.${ext}`;
  const archive = path.join(NODE_CACHE, `node-${d}.${ext}`);
  console.log('[desktop-pack] 下载 Node 运行时:', url);
  await download(url, archive);

  if (ext === 'zip') {
    execSync(`powershell -NoProfile -Command "Expand-Archive -Force -Path '${archive}' -DestinationPath '${NODE_CACHE}'"`);
    rmrf(path.join(NODE_CACHE, 'node-rt'));
    fs.renameSync(path.join(NODE_CACHE, `node-${NODE_VERSION}-${d}`), path.join(NODE_CACHE, 'node-rt'));
    fs.copyFileSync(path.join(NODE_CACHE, 'node-rt', 'node.exe'), nodeFile);
  } else {
    execSync(`tar -xzf "${archive}" -C "${NODE_CACHE}"`);
    fs.renameSync(path.join(NODE_CACHE, `node-${NODE_VERSION}-${d}`), path.join(NODE_CACHE, 'node-rt'));
    fs.copyFileSync(path.join(NODE_CACHE, 'node-rt', 'bin', 'node'), nodeFile);
    if (d.startsWith('linux-') || d.startsWith('darwin-')) {
      execSync(`chmod +x "${nodeFile}"`);
    }
  }
  rmrf(path.join(NODE_CACHE, 'node-rt'));
  rmrf(archive);
  console.log('[desktop-pack] Node 运行时就绪:', nodeFile);
  return nodeFile;
}

async function main() {
  if (!fs.existsSync(path.join(DIST, 'index.html'))) {
    console.log('[desktop-pack] dist 缺失，先执行构建...');
    execSync('node build.js', { cwd: ROOT, stdio: 'inherit' });
  }

  // CSP 对齐护栏：tauri.conf.json 的 csp 为 null（依赖页面自带 meta CSP 作为唯一进化源），
  // 桌面包从此失去 CSP。若未来 dist/index.html 的 meta CSP 被删除/放宽，必须在此拦截，
  // 否则桌面 WebView 会以无 CSP 状态运行。
  const cspHtml = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
  const cspMatch = /<meta http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(cspHtml);
  const csp = cspMatch ? cspMatch[1] : '';
  if (!cspMatch || !/script-src[^;]*'self'/.test(csp)
      || /script-src[^;]*'unsafe-inline'/.test(csp)
      || !/connect-src[^;]*http:\/\/127\.0\.0\.1:3000/.test(csp)
      || !/object-src[^;]*'none'/.test(csp)) {
    throw new Error('[desktop-pack] dist/index.html 缺少收紧的 meta CSP（需 script-src \'self\' 且无 unsafe-inline、connect-src 127.0.0.1:3000、object-src none），拒绝打包');
  }
  console.log('[desktop-pack] meta CSP 校验通过');

  // 1) Node 运行时
  const nodeFile = await ensureNode();

  // 2) 组装 resources
  rmrf(RES);
  fs.mkdirSync(RES, { recursive: true });

  cp(DIST, path.join(RES, 'static'));

  packServerResources(ROOT, RES);

  fs.mkdirSync(path.join(RES, 'node'), { recursive: true });
  if (nodeFile) fs.copyFileSync(nodeFile, path.join(RES, 'node', path.basename(nodeFile)));

  // 3) 收敛体积：删除日志/数据
  rmrf(path.join(RES, 'server', 'logs'));
  rmrf(path.join(RES, 'server', 'data'));

  // 审计 F-2.2 护栏：资源中不得残留任何密钥文件（与上方 CSP 校验同风格的构建期断言），
  // 一旦检出立即失败，防止密钥随发行版外流。
  assertNoSecretsInResources(RES);

  console.log('[desktop-pack] 资源组装完成');
}

// ==================== 审计 F-2.2：server 目录白名单复制 + 密钥断言 ====================
// 仅复制 server 目录的运行必需文件，排除 .env 等 dotfile 与本地配置，防止
// POLLINATIONS_API_KEY / MS_TOKEN 随桌面安装包分发。
const SERVER_KEEP = new Set([
  'server.js', 'config.js', 'logger.js', 'db.js', 'piper-check.js', 'rate-limit.js',
  'package.json', 'package-lock.json', 'node_modules',
]);

function packServerResources(rootDir, resDir) {
  const serverSrc = path.join(rootDir, 'server');
  const resServer = path.join(resDir, 'server');
  fs.mkdirSync(resServer, { recursive: true });
  for (const e of fs.readdirSync(serverSrc, { withFileTypes: true })) {
    if (!SERVER_KEEP.has(e.name)) continue;
    const s = path.join(serverSrc, e.name);
    const d = path.join(resServer, e.name);
    if (e.isDirectory()) cp(s, d); // 目录整体复制（node_modules 内部不套 filter）
    else if (e.isFile()) fs.copyFileSync(s, d);
  }
  const nodeModulesSrc = path.join(serverSrc, 'node_modules');
  if (!fs.existsSync(nodeModulesSrc)) {
    console.log('[desktop-pack] server node_modules 缺失，安装依赖...');
    execSync('npm install --omit=dev --no-audit --no-fund', { cwd: serverSrc, stdio: 'inherit' });
  }
  cp(nodeModulesSrc, path.join(resServer, 'node_modules'));
}

// 递归收集密钥类文件（.env 变体 / pem / key / p12 / jks / keystore）
function findSecretFiles(dir) {
  const leaked = [];
  (function walk(d) {
    let entries = [];
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch (e) { return; }
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/^\.env/.test(e.name) || /\.(pem|key|p12|jks|keystore)$/i.test(e.name)) leaked.push(p);
    }
  })(dir);
  return leaked;
}

function assertNoSecretsInResources(resDir) {
  const leaked = findSecretFiles(resDir);
  if (leaked.length) {
    throw new Error('[desktop-pack] 资源中检出密钥文件，拒绝打包: ' + leaked.join(', '));
  }
}

module.exports = { packServerResources, assertNoSecretsInResources, findSecretFiles, SERVER_KEEP };

// require.main 保护：被测试导入时不执行打包（导出的可测函数见文件末尾）
if (require.main === module) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
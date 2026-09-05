// ==================== 服务端配置 ====================
const fs = require('node:fs');
const path = require('node:path');

// 支持 server/.env（KEY=VALUE 每行一个）自动加载：与 README 常见习惯一致。
// 本版本无需邮箱/登录，仅读取 HOST / PORT / ALLOWED_ORIGINS 等非敏感项。
function loadEnvFile(envFile) {
  if (!envFile || !fs.existsSync(envFile)) return;
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (!m) continue;
    const key = m[1], val = m[2].replace(/^["']|["']$/g, '');
    if (!(key in process.env)) process.env[key] = val; // 环境变量优先，.env 不覆盖
  }
}
try {
  loadEnvFile(path.join(__dirname, '.env'));
} catch (e) {}

module.exports = {
  host: process.env.HOST || '127.0.0.1',   // 默认仅本机；局域网访问改为 0.0.0.0
  port: Number(process.env.PORT) || 3000,
  // 额外允许跨源的域名白名单，逗号分隔。例：GitHub Pages 域名
  // ALLOWED_ORIGINS=https://user.github.io,https://mydomain.com
  allowedOrigins: (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean),
  // 默认拒绝 Origin:null（沙箱 iframe / 隐私模式），避免无凭据 CORS 滥用；
  // 仅当需要通过 file:// 直连本地服务时可显式开启：ALLOW_NULL_ORIGIN=1
  allowNullOrigin: process.env.ALLOW_NULL_ORIGIN === '1' || process.env.ALLOW_NULL_ORIGIN === 'true'
};
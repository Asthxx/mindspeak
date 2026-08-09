// ==================== 服务端配置 ====================
// 填写你的发信邮箱配置（QQ 邮箱 / 163 邮箱等），或通过环境变量覆盖。
// 留空时进入"开发模式"：不真实发信，验证码打印在服务器控制台。
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');

// 敏感配置优先从项目外的私有目录读取（与 JWT 密钥同目录），
// 避免把邮箱授权码等凭据随项目一起发布/拷贝时泄露：
//   C:\Users\<当前用户>\.mindspeak\server.env
// 其次支持 server/.env（KEY=VALUE 每行一个）自动加载：与 README 常见习惯一致，
// 便于开发者本地调试；二者都缺失时使用系统环境变量。
function loadEnvFile(envFile) {
  if (!envFile || !fs.existsSync(envFile)) return 0;
  let loaded = 0;
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (!m) continue;
    const key = m[1], val = m[2].replace(/^["']|["']$/g, '');
    if (!(key in process.env)) { process.env[key] = val; loaded++; } // 环境变量优先，.env 不覆盖
  }
  return loaded;
}
try {
  const secureEnv = path.join(os.homedir(), '.mindspeak', 'server.env');
  const loaded = loadEnvFile(secureEnv); // ① 项目外私有凭据（生产部署）
  if (loaded > 0) {
    if (!process.env.JWT_SECRET && fs.existsSync(path.join(os.homedir(), '.mindspeak', 'jwt-secret'))) {
      process.env.JWT_SECRET = fs.readFileSync(path.join(os.homedir(), '.mindspeak', 'jwt-secret'), 'utf8').trim();
    }
  }
  loadEnvFile(path.join(__dirname, '.env')); // ② 项目内 .env（本地开发兜底）
} catch (e) {}

// JWT 密钥：优先环境变量；否则首次启动随机生成并持久化到用户主目录，
// 重启不失效；绝不把明文默认密钥写进仓库（避免被拿去伪造登录态）。
function resolveJwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  const dir = path.join(os.homedir(), '.mindspeak');
  const file = path.join(dir, 'jwt-secret');
  const legacy = path.join(os.tmpdir(), 'mindspeak-jwt-secret');
  try {
    if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8').trim();
    // 迁移：旧版密钥存在 %TEMP%/mindspeak-jwt-secret，沿用避免用户登录态失效
    if (fs.existsSync(legacy)) {
      const s = fs.readFileSync(legacy, 'utf8').trim();
      if (s) {
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(file, s, { mode: 0o600 });
        return s;
      }
    }
    fs.mkdirSync(dir, { recursive: true });
    const s = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(file, s, { mode: 0o600 });
    return s;
  } catch (e) {
    // 极端情况：持久化失败 → 每次重启换新密钥、全部登录态失效，必须显式告警
    console.error('[config] 警告：JWT 密钥持久化失败（' + (e && e.message || e)
      + '），本次为临时密钥，服务重启后所有登录将失效。请检查 ' + path.join(os.homedir(), '.mindspeak') + ' 目录权限');
    return crypto.randomBytes(32).toString('hex');
  }
}

module.exports = {
  host: process.env.HOST || '127.0.0.1',   // 默认仅本机；部署到云/局域网改为 0.0.0.0
  port: Number(process.env.PORT) || 3000,
  // 额外允许跨源的域名白名单，逗号分隔。例：GitHub Pages 域名
  // ALLOWED_ORIGINS=https://user.github.io,https://mydomain.com
  allowedOrigins: (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean),
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.163.com',  // 例: smtp.qq.com
    port: Number(process.env.SMTP_PORT) || 465,      // QQ/163 加密端口 465
    secure: true,                                    // 465 用 SSL
    // 凭据不写死在源码：通过环境变量 SMTP_USER / SMTP_PASS 提供。
    // 未配置时进入"开发模式"：不真实发信，验证码打印在服务器控制台。
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || ''                // 显示发件人，留空用 user
  },
  jwtSecret: resolveJwtSecret(),
  codeExpireMinutes: 10,        // 验证码有效期
  codeResendSeconds: 60         // 重发验证码间隔
};

// ==================== 后端 API 地址统一配置 ====================
// 所有模块通过 window.API_BASE 获取后端地址（登录/注册/验证码/TTS/日志等）。
// 本文件是唯一需要按部署环境修改的地方：
//   - 本机开发（file:// 打开）：自动指向 http://localhost:3000
//   - http/https 页面：默认同源（局域网 IP 或本机 server 打开时原样工作）
//   - 部署到 GitHub Pages 等公网站点：在 REMOTE_API 填你的后端 HTTPS 地址
//     （例如 Cloudflare Tunnel 地址 https://xxx.trycloudflare.com），
//     页面在 https://用户名.github.io 上也能正常调用后端接口。
window.API_BASE = (function () {
  // ★ 部署到 GitHub Pages / 公网时，把这里改成你的后端地址，例如：
  // var REMOTE_API = 'https://xxx.trycloudflare.com';
  var REMOTE_API = '';

  if (REMOTE_API) return REMOTE_API;
  if (location.protocol === 'file:') return 'http://localhost:3000';
  return location.origin; // http/https 页面默认同源，无需跨域
})();

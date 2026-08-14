// ==================== 后端 API 地址统一配置（唯一权威来源，P0-02） ====================
// 所有模块通过 window.API_BASE / window.Env 获取后端地址（TTS/日志/本地服务探测）。
// 本文件是唯一需要按部署环境修改的地方：
//   - 本机开发（file:// 打开）：自动指向 MS.LOCAL_API_BASE（http://localhost:3000）
//   - http/https 页面：默认同源（局域网 IP 或本机 server 打开时原样工作）
//   - 部署到 GitHub Pages 等公网站点：在 REMOTE_API 填你的后端 HTTPS 地址
//     （例如 Cloudflare Tunnel 地址 https://xxx.trycloudflare.com），
//     页面在 https://用户名.github.io 上也能正常调用后端接口。
window.MS = window.MS || {};

// 本机本地服务地址（file:// 离线模式 + 本地开发共用；本地服务探测也用它，禁止散落硬编码）
window.MS.LOCAL_API_BASE = 'http://localhost:3000';

window.API_BASE = (function () {
  // ★ 部署到 GitHub Pages / 公网时，把这里改成你的后端地址，例如：
  // var REMOTE_API = 'https://xxx.trycloudflare.com';
  var REMOTE_API = '';

  if (REMOTE_API) return REMOTE_API;
  if (location.protocol === 'file:') return window.MS.LOCAL_API_BASE;
  return location.origin; // http/https 页面默认同源，无需跨域
})();

// ==================== 环境封装：file:// 本地服务探测（P0-02） ====================
// 探测逻辑收敛到 Env.checkLocalServer，页面内不允许再散落 localhost 地址。
// 本地服务未启动时保持离线模式（单词/练习仍可用），不会报错。
window.Env = {
  getLocalBase: function() {
    return window.MS.LOCAL_API_BASE;
  },
  // 探测本地服务是否可用：可用回调 true，不可用回调 false（1.5s 超时）。
  // 非 file:// 环境直接回调 false（无需切换）。
  checkLocalServer: function(cb) {
    cb = cb || function() {};
    if (location.protocol !== 'file:') { cb(false); return; }
    var base = window.MS.LOCAL_API_BASE;
    var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = setTimeout(function() { if (ctrl) ctrl.abort(); }, 1500);
    fetch(base + '/api/health', {
      cache: 'no-store',
      signal: ctrl ? ctrl.signal : undefined
    }).then(function(r) {
      clearTimeout(timer);
      cb(!!(r && r.ok));
    }).catch(function() {
      clearTimeout(timer);
      cb(false);
    });
  }
};

// file:// 直接打开时：若本地服务已启动则自动切到本地服务地址（消除浏览器对 file:// 的
// "Unsafe attempt"安全提示，也能启用登录/朗读功能）；服务未启动则保持离线模式。
if (location.protocol === 'file:') {
  window.Env.checkLocalServer(function(ok) {
    if (ok) location.replace(window.Env.getLocalBase() + '/');
  });
}
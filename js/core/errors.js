// ==================== 统一错误处理（P1-03） ====================
// handleError(error, context)：
//   - 技术错误（含 stack）写入日志系统（window.Log → server 端落盘），生产环境据此追踪；
//   - UI 只显示用户友好提示，绝不直接展示 stack trace；
//   - 开发环境控制台可见，不静默吞错。
// 依赖：js/logger.js 的 window.Log；js/app.js 的 Toast（可选，存在时用于 UI 提示）。
window.MS = window.MS || {};

function isDevEnv() {
  try {
    var h = location.hostname || '';
    return location.protocol === 'file:' || h === 'localhost' || h === '127.0.0.1' || h === '::1';
  } catch (e) { return true; }
}
window.isDevEnv = isDevEnv;

window.handleError = function(error, context) {
  context = context || {};
  var err = (error instanceof Error) ? error : new Error(String(error == null ? '未知错误' : error));
  var module = context.module || 'app';
  var action = context.action || '';
  var msg = (action ? action + '失败：' : '') + (err.message || err.name || '未知错误');

  // 1. 技术日志（含 stack），生产环境据此追踪
  if (window.Log && window.Log.error) {
    try {
      window.Log.error(module, String(msg).slice(0, 300), {
        action: action, url: context.url || '', data: context.data
      }, err.stack);
    } catch (e) {}
  }

  // 2. 用户友好提示（不暴露 stack）
  if (context.notify !== false && typeof Toast !== 'undefined') {
    try {
      Toast.error(context.userMessage || ('操作未成功：' + (err.message || '请稍后重试')));
    } catch (e) {}
  }

  // 3. 开发环境控制台可见
  if (isDevEnv()) {
    try { console.error('[handleError][' + module + '] ' + msg, err); } catch (e) {}
  }
  return err;
};
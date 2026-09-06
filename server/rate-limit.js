// TTS 端点限流：滑动窗口按 (来源 IP + 端点前缀) 计数，超限 429。
// 防局域网/沙箱 no-cors 图片把本机当 TTS 中继刷进程与磁盘（审计 F5 配套加固）。
// 每个 TTS 端点独立窗口（/api/tts、/api/online-tts、/api/piper-tts），
// 正常学习朗读（背词/句子高频触发）默认窗口 60s/60 次足够；可 TTS_LIMIT 调整。
// 内存占用：bucket 随窗口过期自然失效；超过 1000 键时顺带清理过期项。

function createTtsLimiter(options) {
  const limit = (options && options.limit) || 60;
  const windowMs = (options && options.windowMs) || 60000;
  // 默认只对 GET 计数（TTS 端点全部 GET）；AI 代理端点传 methods:['POST'] 扩展。
  // 后端一个端点上同时存在 GET+POST 时（如 /api/ai/chat 的 OPTIONS 预检），
  // 传 methods:['POST','GET'] 即按端点合并计数。
  const methods = (options && options.methods) || ['GET'];
  // 超限响应体可定制（AI 端点返回结构化 {ok:false,error:'rate-limit'} 供前端降级）
  const errorBody = (options && options.errorBody) || { ok: false, message: '请求过于频繁，请稍后再试' };
  const buckets = new Map();
  return function ttsRateLimit(req, res, next) {
    const now = Date.now();
    // 未匹配的目标方法直接放行不计数（如 TTS 的 HEAD 预热、其他端点的预检）
    if (req.method && methods.indexOf(req.method) === -1) return next();
    var key = (req.socket && req.socket.remoteAddress || 'unknown');
    if (options && options.prefix) key += '|' + options.prefix;
    let b = buckets.get(key);
    if (!b || now - b.start >= windowMs) {
      if (!b) buckets.delete(key);
      b = { start: now, count: 0 };
      buckets.set(key, b);
    }
    b.count++;
    if (b.count > limit) return res.status(429).json(errorBody);
    if (buckets.size > 1000) {
      for (const [k, v] of buckets) {
        if (now - v.start >= windowMs) buckets.delete(k);
      }
    }
    next();
  };
}

module.exports = { createTtsLimiter };
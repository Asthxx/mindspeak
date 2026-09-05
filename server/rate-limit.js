// TTS 端点限流：滑动窗口按 (来源 IP + 端点前缀) 计数，超限 429。
// 防局域网/沙箱 no-cors 图片把本机当 TTS 中继刷进程与磁盘（审计 F5 配套加固）。
// 每个 TTS 端点独立窗口（/api/tts、/api/online-tts、/api/piper-tts），
// 正常学习朗读（背词/句子高频触发）默认窗口 60s/60 次足够；可 TTS_LIMIT 调整。
// 内存占用：bucket 随窗口过期自然失效；超过 1000 键时顺带清理过期项。

function createTtsLimiter(options) {
  const limit = (options && options.limit) || 60;
  const windowMs = (options && options.windowMs) || 60000;
  const buckets = new Map();
  return function ttsRateLimit(req, res, next) {
    const now = Date.now();
    // 前端 SpeechUtil.prefetch 用 HEAD 预热缓存（只促缓存、不出声），不占合成配额。
    // 只对触发合成的 GET 计数；HEAD/OPTIONS 直接放行。
    if (req.method && req.method !== 'GET') return next();
    var key = (req.socket && req.socket.remoteAddress || 'unknown');
    if (options && options.prefix) key += '|' + options.prefix;
    let b = buckets.get(key);
    if (!b || now - b.start >= windowMs) {
      if (!b) buckets.delete(key);
      b = { start: now, count: 0 };
      buckets.set(key, b);
    }
    b.count++;
    if (b.count > limit) return res.status(429).json({ ok: false, message: 'TTS 请求过于频繁，请稍后再试' });
    if (buckets.size > 1000) {
      for (const [k, v] of buckets) {
        if (now - v.start >= windowMs) buckets.delete(k);
      }
    }
    next();
  };
}

module.exports = { createTtsLimiter };
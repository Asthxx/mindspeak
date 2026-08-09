// ==================== 前端错误日志（AI 可读）====================
// 全局捕获 JS 错误 / 未处理 Promise / console.error / 网络失败，批量上报到本地
// server /api/logs，最终写入 server/logs/app.log（JSON Lines：每行一个 JSON，
// 字段 ts/lvl/src/mod/msg/data/stack/page/url，AI 按行解析即可定位问题）。
//
// 特性：
//  1. 最先加载（早于其他脚本），错误一个不漏；
//  2. 批量 + 同错去重（重复错误合并计 count）；
//  3. 离线缓冲：server 不可用时暂存 localStorage，下次加载自动补传；
//  4. 自身任何异常都静默吞掉，绝不影响业务。
// 业务主动记录：window.Log.error('tts', '语音失败', { text: 'hello' })。
(function() {
  'use strict';
  var MAX_QUEUE = 100;    // 内存待报队列上限
  var MAX_BATCH = 40;     // 单次上报条数上限（防止 body 超 server body 限制而 413 反复缓冲）
  var MAX_STORE = 200;    // localStorage 缓冲条数上限
  var FLUSH_MS = 4000;    // 批量上报间隔
  var sending = false;    // 上报进行中标志
  var inited = false;     // 只启动一次
  var STORE_KEY = '__ms_logs_v1';

  function getPage() {
    try {
      if (window.app && window.app.currentTab) return String(window.app.currentTab);
    } catch (e) {}
    try {
      var p = document.querySelector('.page.active');
      if (p && p.id) return String(p.id).replace(/^page-/, '');
    } catch (e) {}
    return '';
  }

  function safeString(a) {
    try {
      if (a instanceof Error) {
        return JSON.stringify({ message: a.message || '', stack: String(a.stack || '').slice(0, 2000) });
      }
      return JSON.stringify(a);
    } catch (e) {
      try { return String(a); } catch (e2) { return '[unserializable]'; }
    }
  }

  function addToQueue(entry) {
    if (queue.length >= MAX_QUEUE) queue.shift();
    queue.push(entry);
  }

  // 同型错误去重：mod+msg+stack前200相同 → 仅累加 count
  function pushUnique(entry) {
    var key = (entry.lvl || '') + '|' + (entry.mod || '') + '|' + (entry.msg || '')
      + '|' + String(entry.stack || '').slice(0, 200);
    for (var i = 0; i < queue.length; i++) {
      var q = queue[i];
      var qk = (q.lvl || '') + '|' + (q.mod || '') + '|' + (q.msg || '')
        + '|' + String(q.stack || '').slice(0, 200);
      if (qk === key) { q.count = (q.count || 1) + 1; return; }
    }
    addToQueue(entry);
  }

  // 保留待上报条目到 localStorage。flush 失败时需要传入该批次（batch），
  // 否则批次已从 queue 取出、失败后无处存放 → 日志静默丢失。
  function bufferStored(extra) {
    var stored = [];
    try { stored = JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); } catch (e) {}
    if (!Array.isArray(stored)) stored = [];
    var pending = Array.isArray(extra) ? extra : queue;
    stored = stored.concat(pending);
    if (stored.length > MAX_STORE) stored = stored.slice(-MAX_STORE);
    try { localStorage.setItem(STORE_KEY, JSON.stringify(stored)); } catch (e) {}
  }

  var queue = [];
  function flush() {
    if (Date.now() - lastFlush < FLUSH_MS) return;
    lastFlush = Date.now();
    // 让出主线程给真正出错的任务，避免本模块阻塞
    setTimeout(function() { flushNow(); }, 50);
  }
  var lastFlush = 0;
  function flushNow() {
    if (sending || !queue.length) return;
    var batch = queue.slice(0, MAX_BATCH);
    var rest = queue.slice(MAX_BATCH);
    queue = rest;
    sending = true;
    var body = JSON.stringify(batch);
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', (window.API_BASE || '') + '/api/logs', true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.timeout = 3000;
      xhr.onload = function() {
        sending = false;
        if (xhr.status < 200 || xhr.status >= 300) bufferStored(batch);
        else if (queue.length) flushNow(); // 批次上限拆分：继续发剩余
      };
      xhr.onerror = function() { sending = false; bufferStored(batch); };
      xhr.ontimeout = function() { sending = false; bufferStored(batch); };
      xhr.send(body);
    } catch (e) {
      sending = false;
      bufferStored(batch);
    }
  }

  // 补传上次服务不可用时缓存的日志（页面加载时执行一次）。
  // 加 rep 标记：server 对补传项放宽时间窗（见 server.js /api/logs），
  // 否则离线超过 10 分钟的日志重放时会被时间过滤丢弃，缓冲机制形同虚设。
  function replayStored() {
    var stored = [];
    try { stored = JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); } catch (e) {}
    if (!Array.isArray(stored) || !stored.length) return;
    try { localStorage.removeItem(STORE_KEY); } catch (e) {}
    for (var i = 0; i < stored.length; i++) {
      if (stored[i] && typeof stored[i] === 'object') stored[i].rep = 1;
    }
    for (var j = 0; j < stored.length; j++) queue.push(stored[j]);
    flushNow();
  }

  function logEntry(lvl, mod, msg, data, stack) {
    var e = { lvl: lvl, mod: mod || 'app', msg: String(msg || '').slice(0, 400), ts: Date.now() };
    // data 必须是可 JSON 序列化的简单值：Error/循环引用直接 JSON.stringify 会抛错，
    // 导致这一批日志整体丢失（xhr.send 抛异常 → bufferStored 里同样失败）。统一降级为文本。
    if (data !== undefined && data !== null) {
      if (typeof data === 'string') {
        e.data = data.slice(0, 1500);
      } else {
        try {
          var s = safeString(data);
          e.data = s.length > 1500 ? s.slice(0, 1500) + '…[truncated]' : s;
        } catch (e2) {
          e.data = '[不可序列化] ' + String(data);
        }
      }
    }
    if (stack) e.stack = String(stack).slice(0, 4000);
    e.page = getPage();
    pushUnique(e);
    flush();
  }

  function boot() {
    if (inited) return;
    inited = true;

    setInterval(function() {
      if (queue.length) flush();
    }, FLUSH_MS);

    // ---- 1. JS 全局错误 ----
    var winOnError = window.onerror;
    window.onerror = function(message, source, lineno, colno, err) {
      var msg = String(message || '').slice(0, 300);
      var stack = '';
      if (err && err.stack) stack = String(err.stack).slice(0, 3000);
      else if (source) stack = source + ':' + lineno + ':' + colno;
      logEntry('error', 'js', msg, { source: source, line: lineno, col: colno }, stack);
      if (typeof winOnError === 'function') {
        try { return winOnError.apply(window, arguments); } catch (e) {}
      }
      return false;
    };

    // ---- 2. 未处理的 Promise 拒绝 ----
    // 注意：index.html 里有 unhandledrejection preventDefault + __rejections 的兜底，
    // 这里在同一监听器里抓取一遍（preventDefault 仍会执行，不影响原行为）。
    window.addEventListener('unhandledrejection', function(ev) {
      if (!ev || !ev.reason) return;
      var r = ev.reason;
      var msg, stack = '';
      if (r instanceof Error) { msg = r.message; stack = r.stack || ''; }
      else if (r && typeof r === 'object') { msg = String(r.message || r.code || JSON.stringify(r)).slice(0, 300); }
      else msg = String(r);
      if (!msg) return;
      var data = null;
      if (r && r.config && r.config.url) data = { url: String(r.config.url).slice(0, 400) };
      logEntry('error', 'promise', msg.slice(0, 200), data, stack);
    });

    // ---- 3. console.error / console.warn ----
    var cons = window.console || {};
    ['error', 'warn'].forEach(function(k) {
      var orig = cons[k];
      if (typeof orig !== 'function') return;
      cons[k] = function() {
        var parts = [];
        for (var i = 0; i < arguments.length; i++) {
          var a = arguments[i];
          if (a instanceof Error) parts.push(a.message || a.name || 'Error');
          else if (a && typeof a === 'object') parts.push(a.message || JSON.stringify(a));
          else parts.push(String(a));
        }
        var text = parts.join(' | ').slice(0, 300);
        if (text) logEntry(k, 'console', text);
        try { return orig.apply(cons, arguments); } catch (e) {}
      };
    });

    // ---- 4. fetch 失败（server 未启动 / 网络断开） ----
    if (typeof window.fetch === 'function') {
      var origFetch = window.fetch;
      window.fetch = function(input, init) {
        var url = (typeof input === 'string') ? input : (input && input.url) || '';
        return origFetch.apply(this, arguments).catch(function(err) {
          logEntry('warn', 'network',
            'fetch失败: ' + url.slice(0, 200),
            { err: (err && err.message) || String(err), url: url.slice(0, 200) });
          throw err;
        });
      };
    }

    // ---- 5. 业务主动上报接口 ----
    window.Log = {
      error: function(mod, msg, data, stack) { logEntry('error', mod, msg, data, stack); },
      warn:  function(mod, msg, data) { logEntry('warn',  mod, msg, data); },
      info:  function(mod, msg, data) { logEntry('info',  mod, msg, data); },
      debug: function(mod, msg, data) { logEntry('debug', mod, msg, data); } // debug 不上报 server（见 server.js）
    };

    window.__msLoggerOK = true;

    // 最后：补传之前离线缓存的错误
    replayStored();
  }

  // DOM 未就绪时等就绪，其余情况直接启动（本脚本在 <head> 最先加载）
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
  // 兜底：任何原因没启动，3 秒后强制启动
  setTimeout(function() { if (!inited) boot(); }, 3000);
})();
// ==================== 结构化错误日志（AI 可读）====================
// 所有日志写入 server/logs/app.log（JSON Lines 格式：每行一个完整 JSON 对象，
// 不依赖换行转义，任何工具/AI 都可以按行解析）。
// 字段约定：
//   ts     ISO 时间（本地时区，带 offset，方便与用户操作时间对应）
//   lvl    error | warn | info | debug
//   src    server | browser
//   mod    模块/页面名（如 tts / online-tts / app）
//   msg    人类可读的一句话描述（尽量简短明确，AI 优先看它）
//   data   结构化附加信息（文本、语音名、接口、HTTP 状态码等，AI 依据它定位根因）
//   stack  错误堆栈（仅 error 级）
// 轮转策略：超过 MAX_BYTES 时重命名为 app.log.N 保留 N_KEEP 份，控制单文件大小，
// 避免 AI 读取时单行文件过大 / 日志无限膨胀。
const fs = require('node:fs');
const path = require('node:path');

const LOG_DIR = path.join(__dirname, 'logs');
const LOG_FILE = path.join(LOG_DIR, 'app.log');
const MAX_BYTES = 2 * 1024 * 1024; // 单文件 2MB
const N_KEEP = 3;                  // 保留 app.log.1 ~ app.log.3

function ensureDir() {
  try { fs.mkdirSync(LOG_DIR, { recursive: true }); } catch (e) {}
}

// 本地时区时间（带 UTC 偏移，如 "2026-08-08 16:33:44.123+08:00"）：
// AI 与用户都能直接对应当地时间，跨时区也能还原真实时刻。
function tsNow() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  const local = d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
    + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds())
    + '.' + String(d.getMilliseconds()).padStart(3, '0');
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? '+' : '-';
  const a = Math.abs(off);
  return local + sign + p(Math.floor(a / 60)) + ':' + p(a % 60);
}

// 转 JSON：过滤不可序列化字段（Error 单独展开）、截断超长字符串
function safeJson(data) {
  try {
    return JSON.stringify(data);
  } catch (e) {
    return JSON.stringify({ _unserializable: String(e && e.message || e) });
  }
}

function truncate(v, max) {
  if (typeof v !== 'string') return v;
  return v.length > max ? v.slice(0, max) + '...[truncated]' : v;
}

function normalizeError(err) {
  if (err instanceof Error) {
    return {
      message: String(err.message || ''),
      stack: String(err.stack || '')
    };
  }
  if (err && typeof err === 'object') {
    const o = {};
    for (const k of Object.keys(err)) {
      const v = err[k];
      o[k] = typeof v === 'function' ? undefined : truncate(v, 2000);
    }
    return o;
  }
  return String(err);
}

function rotateIfNeeded() {
  try {
    const st = fs.statSync(LOG_FILE);
    if (st.size < MAX_BYTES) return;
    // 轮转：app.log.2 -> app.log.3, app.log.1 -> app.log.2, app.log -> app.log.1
    for (let i = N_KEEP - 1; i >= 1; i--) {
      const from = LOG_FILE + '.' + i;
      const to = LOG_FILE + '.' + (i + 1);
      if (fs.existsSync(from)) fs.renameSync(from, to);
    }
    if (fs.existsSync(LOG_FILE)) fs.renameSync(LOG_FILE, LOG_FILE + '.1');
    // 轮转即旧文件已归档，重建新文件首行带版本标记，方便 AI 识别文件来源
    fs.writeFileSync(LOG_FILE, safeJson({
      ts: tsNow(), lvl: 'info', src: 'server', mod: 'logger',
      msg: 'log rotated to app.log.1'
    }) + '\n', { flag: 'a' });
  } catch (e) {}
}

function write(level, mod, msg, data, stack) {
  try {
    ensureDir();
    rotateIfNeeded();
    const entry = {
      ts: tsNow(),
      lvl: level,
      src: 'server',
      mod: String(mod || 'server'),
      msg: truncate(String(msg || ''), 500)
    };
    if (data !== undefined && data !== null) {
      // 对象 data 统一序列化后写入，防止单行 JSONL 无限膨胀（truncate 只截字符串）
      entry.data = typeof data === 'string' ? truncate(data, 4000) : truncate(safeJson(data), 4000);
    }
    if (stack) entry.stack = truncate(String(stack), 8000);
    fs.appendFileSync(LOG_FILE, safeJson(entry) + '\n', 'utf8');
    // 控制台同步输出错误级，方便直接看终端
    if (level === 'error') console.error('[LOG:' + mod + ']', msg);
  } catch (e) {
    // 日志本身失败不能抛到业务链路，只打终端
    console.error('[LOGGER-FAIL]', e && e.message || e);
  }
}

const logger = {
  error(mod, msg, data, err) {
    write('error', mod, msg, data, err ? normalizeError(err).stack : undefined);
  },
  warn(mod, msg, data) { write('warn', mod, msg, data); },
  info(mod, msg, data) { write('info', mod, msg, data); },
  debug(mod, msg, data) { write('debug', mod, msg, data); },
  // 浏览器上报的日志项：归一化成与 server 端一致的 JSONL 行（src=browser）。
  // 补传（rep=1）条目保留原始发生时间（item.ts 毫秒），落盘时间只用于实时上报。
  writeBrowser(item) {
    try {
      ensureDir();
      rotateIfNeeded();
      let ts = tsNow();
      const rawTs = parseInt(item.ts);
      if (item.rep === 1 && rawTs > 0) {
        const d = new Date(rawTs);
        const p = (n) => String(n).padStart(2, '0');
        const local = d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
          + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds())
          + '.' + String(d.getMilliseconds()).padStart(3, '0');
        const off = -d.getTimezoneOffset();
        ts = local + (off >= 0 ? '+' : '-') + p(Math.floor(Math.abs(off) / 60)) + ':' + p(Math.abs(off) % 60);
      }
      const entry = {
        ts: ts,
        lvl: item.lvl,
        src: 'browser',
        mod: truncate(String(item.mod || 'app'), 60), // mod 截断：防超大字符串撑爆单行 JSONL
        msg: truncate(String(item.msg || ''), 500)
      };
      const data = {};
      if (item.page) data.page = truncate(item.page, 60);
      if (item.url) data.url = truncate(item.url, 600);
      if (item.data !== undefined && item.data !== null) {
        // data 可能是任意对象/大对象：统一序列化后截断，防止单行 JSONL 无限膨胀
        data.context = truncate(safeJson(item.data), 3000);
      }
      if (Object.keys(data).length) entry.data = data;
      if (item.stack) entry.stack = truncate(String(item.stack), 8000);
      fs.appendFileSync(LOG_FILE, safeJson(entry) + '\n', 'utf8');
    } catch (e) {
      console.error('[LOGGER-FAIL]', e && e.message || e);
    }
  },
  LOG_FILE, LOG_DIR
};

module.exports = logger;

// ==================== UserState：统一用户学习状态访问层（P0-03 / P1-02） ====================
// 所有业务模块通过本层读取/修改本地数据，避免各模块各自维护一套状态导致不同步。
// - 兼容旧数据：现有 key 名即权威（与 localStorage 完全兼容，不删除旧 key、不改变含义）；
// - 统一 get / set / update / remove / reset / migrate；
// - 新增 mindspeak.schemaVersion 版本号，启动时执行幂等 migration；
// - 高频写入由调用方节流（如 word_progress 已有 300ms 节流），本层不额外加锁。
window.MS = window.MS || {};
window.UserState = (function() {
  'use strict';

  var SCHEMA_KEY = 'mindspeak.schemaVersion';
  var CURRENT_SCHEMA = 1;

  // 统一 key 常量（新代码从这里取，禁止散落字符串）
  var KEYS = {
    wordProgress: 'word_progress',
    mistakes: 'mistakes',
    checkins: 'checkins',
    favorites: 'favorites',
    gamification: 'gamification',
    dailyGoal: 'daily_goal',
    dailyChallenge: 'daily_challenge',
    dailyReviewPlan: 'daily_review_plan',
    adaptiveReview: 'adaptive_review',
    activeRecall: 'active_recall',
    items: 'items',
    itemBuffs: 'item_buffs',
    ownedThemes: 'owned_themes',
    appliedTheme: 'applied_theme',
    badges: 'badges',
    badgeStats: 'badge_stats',
    assessment: 'assessment',
    assessmentHistory: 'assessment_history',
    assessmentLastKeys: 'assessment_last_keys',
    phoneticProgress: 'phonetic_progress',
    pomodoroSessions: 'pomodoro_sessions',
    pomodoroMinutes: 'pomodoro_minutes',
    pkHistory: 'pk_history',
    wordCardPos: 'word_card_pos',
    wordCategoryIndex: 'word_category_index',
    theme: 'theme',
    themeColor: 'theme_color',
    customThemeColor: 'custom_theme_color',
    customBgOpacity: 'custom_bg_opacity',
    customVoice: 'custom_voice',
    voiceName: 'voice_name',
    voiceRate: 'voice_rate',
    voicePitch: 'voice_pitch',
    voiceInstant: 'voice_instant',
    ttsVoice: 'tts_voice',
    navCollapsed: 'nav_collapsed',
    onboardingDone: 'onboarding_done',
    reminderEnabled: 'reminder_enabled',
    reminderTime: 'reminder_time',
    autoSaveEnabled: 'auto_save_enabled',
    autoSaveInterval: 'auto_save_interval',
    lastSaveTime: 'last_save_time',
    backup: 'english_app_backup',
    schemaVersion: SCHEMA_KEY
  };

  // 读取并 JSON.parse；失败或不存在返回 fallback（与旧 Storage.getJSON 语义一致）
  function get(key, fallback) {
    try {
      var v = localStorage.getItem(key);
      if (v === null) return fallback;
      return JSON.parse(v);
    } catch (e) {
      return fallback;
    }
  }

  // JSON.stringify 后写入；配额超限给一次用户提示（与旧 Storage.setJSON 语义一致）
  function set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      try {
        if (window.Toast) window.Toast.error('存储空间已满，请导出数据后清理');
        else console.error('UserState: localStorage quota exceeded for', key);
      } catch (_e) {}
      return false;
    }
  }

  // 读取原始字符串；失败或不存在返回 fallback
  function getRaw(key, fallback) {
    try {
      var v = localStorage.getItem(key);
      return v === null ? (fallback == null ? '' : fallback) : v;
    } catch (e) {
      return fallback == null ? '' : fallback;
    }
  }

  // 写入原始字符串
  function setRaw(key, value) {
    try { localStorage.setItem(key, value); return true; } catch (e) { return false; }
  }

  // update(key, updater, fallback)：读取 → updater(旧值) → 写回，返回新值
  // set 失败（配额超限）时返回 null，调用方可据此知道写入未持久化
  function update(key, updater, fallback) {
    var cur = get(key, fallback);
    var next = typeof updater === 'function' ? updater(cur) : cur;
    var ok = set(key, next);
    return ok ? next : null;
  }

  function remove(key) {
    try { localStorage.removeItem(key); } catch (e) {}
  }

  // 清空指定 keys；未传则清空全部业务 key（供"重置所有数据"使用）
  function reset(keys) {
    var list;
    if (Array.isArray(keys)) {
      list = keys;
    } else {
      list = [];
      for (var k in KEYS) list.push(KEYS[k]);
    }
    list.forEach(function(key) { remove(key); });
  }

  function schemaVersion() {
    var v = getRaw(SCHEMA_KEY, '0');
    var n = parseInt(v, 10);
    return isNaN(n) ? 0 : n;
  }

  // 幂等 migration：每次启动运行，只把版本从低向高升级；重复运行无副作用。
  function migrate() {
    var ver = schemaVersion();
    var nextVer = ver;

    // ---- 第 1 版：初始化版本号 + 兜底保证核心数据结构可用 ----
    if (ver < 1) {
      var gami = get(KEYS.gamification, null);
      if (gami && typeof gami === 'object') {
        if (typeof gami.points !== 'number' || isNaN(gami.points)) gami.points = 0;
        if (typeof gami.level !== 'number') gami.level = Math.floor((gami.points || 0) / 100) + 1;
        if (typeof gami.streak !== 'number') gami.streak = 0;
        if (typeof gami.totalWords !== 'number') gami.totalWords = 0;
        if (typeof gami.totalExercises !== 'number') gami.totalExercises = 0;
        set(KEYS.gamification, gami);
      }
      nextVer = 1;
    }

    // ---- 未来版本在此追加：if (ver < 2) { ...; nextVer = 2; } ----

    if (nextVer > ver) setRaw(SCHEMA_KEY, String(nextVer));
    return nextVer;
  }

  // 词库进度内存优先读取：页面运行中 wordModule 内存态是最新的（写入有 300ms 节流），
  // 事件驱动的即时刷新用它可避免读到过期存储；无内存态时回落到 localStorage。
  function getWordProgress() {
    try {
      if (window.app && window.app.wordModule && window.app.wordModule.wordProgress) {
        return window.app.wordModule.wordProgress;
      }
    } catch (e) {}
    return get(KEYS.wordProgress, {});
  }

  return {
    KEYS: KEYS,
    get: get,
    set: set,
    getRaw: getRaw,
    setRaw: setRaw,
    update: update,
    remove: remove,
    reset: reset,
    migrate: migrate,
    getWordProgress: getWordProgress,
    SCHEMA_KEY: SCHEMA_KEY,
    CURRENT_SCHEMA: CURRENT_SCHEMA,
    schemaVersion: schemaVersion
  };
})();

// 启动时执行幂等 migration（不依赖 DOM，安全早跑）
window.UserState.migrate();
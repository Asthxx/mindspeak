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
  var CURRENT_SCHEMA = 2;

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
    pomodoroSoundEnabled: 'pomodoro_sound_enabled',
    pkHistory: 'pk_history',
    wordCardPos: 'word_card_pos',
    wordCategoryIndex: 'word_category_index',
    // 精选学习：全局开关 + 每分类勾选词（动态 key = selected_words_ + 分类索引）
    learnSelectedOnly: 'learn_selected_only',
    selectedWordsBase: 'selected_words_',
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
      var parsed = JSON.parse(v);
      // gamification 读取收敛（审计 M1）：localStorage 直写天文数字（不经过备份导入）时，
      // 渲染层也只见封顶值；level 固定 1-99、points 上限 999999，与 _sanitizeBackup 同口径。
      if (key === KEYS.gamification && parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        if (typeof parsed.points !== 'number' || !isFinite(parsed.points)) parsed.points = 0;
        else parsed.points = Math.min(Math.floor(parsed.points), 999999);
        if (typeof parsed.level !== 'number') parsed.level = Math.floor((parsed.points || 0) / 100) + 1;
        else parsed.level = Math.max(1, Math.min(Math.floor(parsed.level), 99));
        // 与 _sanitizeBackup 同口径（审计 M2）：streak/totalWords/totalExercises 也封顶，防 AI 概况/统计拼接大数字
        ['streak', 'totalWords', 'totalExercises'].forEach(function(k2) {
          var v2 = parsed[k2];
          if (v2 === undefined || v2 === null) return;
          if (typeof v2 !== 'number' || !isFinite(v2)) parsed[k2] = 0;
          else parsed[k2] = Math.min(Math.floor(v2), 999999);
        });
      }
      return parsed;
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

    // ---- 第 2 版：word_progress 数字时间戳 nextReview 归一为日期字符串 ----
    // 旧/导入数据可能把 nextReview 存成毫秒时间戳，与"YYYY-MM-DD"字典序比较会误判
    // due（全部判 due 或全部判非 due）。这里一次性转成日期字符串，运行期统计/复习列表
    // 与备份导入以外的路径都不用再担心脏数据口径。正常写入的日期字符串不受影响。
    if (ver < 2) {
      var wp = get(KEYS.wordProgress, null);
      if (wp && typeof wp === 'object' && !Array.isArray(wp)) {
        var wpChanged = false;
        for (var wk in wp) {
          var rec = wp[wk];
          if (rec && typeof rec === 'object' && typeof rec.nextReview === 'number') {
            // 非法时间戳（如 1e300 产生 Invalid Date）不得转成 "NaN-NaN-NaN"：
            // 否则 isDue 字典序比较永久判非 due，词从复习队列消失。同导入路径守卫（app.js）。
            var dNr = new Date(rec.nextReview);
            if (isNaN(dNr.getTime())) continue;
            rec.nextReview = fmtDate(dNr);
            wpChanged = true;
          }
        }
        if (wpChanged) set(KEYS.wordProgress, wp);
      }
      nextVer = 2;
    }

    if (nextVer > ver) setRaw(SCHEMA_KEY, String(nextVer));
    return nextVer;
  }

  // 本地日期字符串（YYYY-MM-DD）；与 app.js getLocalDateStr 同语义，供本层独立使用
  function fmtDate(d) {
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  // 统一"是否待复习"判断：兼容旧/导入数据的数字时间戳 nextReview → 转日期字符串再字典序比较。
  // 统计口径与复习列表/复习建议共用同一套防御，避免数字时间戳被字典序误判为全部 due 或全部非 due。
  function isDue(prog, todayStr) {
    if (!prog || !prog.nextReview || !todayStr || prog.status === 'mastered') return false;
    var nr = prog.nextReview;
    if (typeof nr === 'number') {
      var d = new Date(nr);
      if (isNaN(d.getTime())) return false;
      nr = fmtDate(d);
    } else {
      nr = String(nr).slice(0, 10);
    }
    return !!nr && nr <= todayStr;
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
    isDue: isDue,
    SCHEMA_KEY: SCHEMA_KEY,
    CURRENT_SCHEMA: CURRENT_SCHEMA,
    schemaVersion: schemaVersion
  };
})();

// 启动时执行幂等 migration（不依赖 DOM，安全早跑）
window.UserState.migrate();
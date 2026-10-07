// ==================== 首页 Dashboard（学习控制中心） ====================
// 数据来源：checkins / word_progress / gamification / mistakes / daily_goal，
// 复用 app.js 的 DataStore / calculateStreak / getLocalDateStr / safeBind / escapeHtml。
//
// 重构要点（性能 + 结构）：
//   1. 单次数据建模：原来 renderStats / renderTasks / renderTips 各自遍历一遍 word_progress
//      并各自解析一次 nextReview，一次 render 要全量扫 3 遍；现改为 computeStats() 一次算完，
//      三个渲染函数只消费结果。
//   2. 词库总量缓存：all-data.js 约 9.9MB / 12 万词，原来每次 render 都要
//      DataStore.getDefaultWords()（还会 map 出新数组）再累加全部分类的词数，
//      这是首屏最大的单项开销；改为按 WORD_LIBRARY 引用缓存，异步数据换引用时自动失效。
//   3. 渲染合并：一次学词会连发 WORD_LEARNED / POINTS_CHANGED / STREAK_CHANGED /
//      DAILY_PLAN_CHANGED 等事件，原来每个事件都同步 render 一次；改为 rAF 合并成 1 次。
//   4. 隐藏时不渲染：首页不是当前 tab 时跳过渲染，切回时由 showTab('home') 补一次。
//   5. 复用 UserState.isDue：删除两处内联的 nextReview 解析重复实现，统一口径。
var DashboardModule = (function () {
  'use strict';

  var QUICK_ENTRIES = [
    { tab: 'word', icon: 'translate', label: '背单词' },
    { tab: 'listening', icon: 'headphones', label: '听力' },
    { tab: 'reading', icon: 'article', label: '阅读' },
    { tab: 'grammar', icon: 'edit', label: '语法' },
    { tab: 'spelling', icon: 'spellcheck', label: '拼写' },
    { tab: 'speak', icon: 'mic', label: '跟读' },
    { tab: 'pk', icon: 'flip', label: 'PK对战' },
    { tab: 'mistakes', icon: 'error', label: '错题本' },
    { tab: 'favorites', icon: 'bookmark', label: '收藏' },
    { tab: 'story', icon: 'text', label: '故事' },
    { tab: 'pomodoro', icon: 'timer', label: '番茄钟' },
    { tab: 'ai', icon: 'robot', label: 'AI助手' }
  ];

  var WEEK_DAY_NAMES = ['日', '一', '二', '三', '四', '五', '六'];

  // 需要刷新首页统计的事件（一次操作会连发多个，故统一走合并渲染）。
  // 优先取 MS.EVENTS 常量，避免事件名改动后首页静默失效；拿不到时回落到同名字符串。
  var FALLBACK_EVENTS = [
    'WORD_LEARNED', 'WORD_REVIEWED', 'WORD_MASTERED', 'POINTS_CHANGED',
    'MISTAKE_ADDED', 'MISTAKE_RESOLVED', 'STREAK_CHANGED', 'DAILY_PLAN_CHANGED'
  ];
  var REFRESH_EVENTS = (function () {
    var E = window.MS && window.MS.EVENTS;
    if (!E) return FALLBACK_EVENTS;
    return FALLBACK_EVENTS.map(function (name) { return E[name] || name; });
  })();

  var DEFAULT_GOAL = 10;

  // ==================== 数据层（纯读取 + 计算，不碰 DOM） ====================

  function readCheckins() {
    return DataStore.getProgress('checkins', {}) || {};
  }

  // P0-03：优先内存进度（写入有 300ms 节流，事件驱动的即时刷新用内存态避免读到过期存储）
  function readProgress() {
    return (window.UserState && window.UserState.getWordProgress()) ||
      DataStore.getProgress('word_progress', {}) || {};
  }

  function readGoal() {
    var goal = Number(DataStore.getProgress('daily_goal', DEFAULT_GOAL));
    return (isFinite(goal) && goal >= 1) ? goal : DEFAULT_GOAL;
  }

  // 待复习判断：统一复用 UserState.isDue（已兼容数字时间戳 nextReview），
  // 不再在首页内联第二套解析逻辑，避免统计口径与复习列表不一致。
  function isDue(prog, today) {
    if (window.UserState && window.UserState.isDue) return window.UserState.isDue(prog, today);
    if (!prog || prog.status === 'mastered' || !prog.nextReview) return false;
    var nr = prog.nextReview;
    if (typeof nr === 'number') {
      var d = new Date(nr);
      if (isNaN(d.getTime())) return false;
      nr = getLocalDateStr(d);
    } else {
      nr = String(nr || '').slice(0, 10);
    }
    return !!nr && nr <= today;
  }

  // 词库总量：12 万词逐分类累加只做一次，结果按 WORD_LIBRARY 引用缓存。
  // all-data.js 是 async 加载的，加载完成后全局引用变化 → 缓存自动失效重算。
  var libraryTotalCache = { ref: null, total: 0 };
  function getLibraryTotal() {
    var lib = (typeof WORD_LIBRARY !== 'undefined' && WORD_LIBRARY) ? WORD_LIBRARY : null;
    if (lib === libraryTotalCache.ref) return libraryTotalCache.total;
    var cats = (lib && Array.isArray(lib.categories)) ? lib.categories : [];
    var total = 0;
    for (var i = 0; i < cats.length; i++) {
      var cat = cats[i];
      if (cat && cat.words) total += cat.words.length;
    }
    libraryTotalCache.ref = lib;
    libraryTotalCache.total = total;
    return total;
  }

  // 全量统计：一次遍历 word_progress 得出首页所有卡片需要的指标
  function computeStats() {
    var progress = readProgress();
    var checkins = readCheckins();
    var today = getLocalDateStr();
    var keys = Object.keys(progress);

    var learned = 0, mastered = 0, newCount = 0, dueCount = 0, doneCount = 0;
    for (var i = 0; i < keys.length; i++) {
      var p = progress[keys[i]];
      if (!p) continue;
      learned++;
      if (p.firstSeen === today) newCount++;
      if (p.lastReviewed === today) doneCount++;
      if (p.status === 'mastered') mastered++;
      else if (isDue(p, today)) dueCount++;
    }

    // 近 7 天学习量（含今天）
    var weekWords = 0;
    var now = new Date();
    for (var d = 0; d < 7; d++) {
      var day = new Date(now.getTime());
      day.setDate(day.getDate() - d);
      weekWords += checkins[getLocalDateStr(day)] || 0;
    }

    return {
      today: today,
      streak: calculateStreak(checkins),
      todayCount: checkins[today] || 0,
      weekWords: weekWords,
      learned: learned,
      mastered: mastered,
      newCount: newCount,
      dueCount: dueCount,
      doneCount: doneCount,
      goal: readGoal(),
      total: getLibraryTotal()
    };
  }

  // AI 建议文案（纯函数，便于单独调整与复用）
  function buildTips(stats) {
    var tips = [];
    if (stats.weekWords < 30) tips.push('本周学习量较少，建议每天至少学习 10 个单词');
    else tips.push('本周学习 ' + stats.weekWords + ' 词，状态不错，继续保持！');
    if (stats.mastered < 100) tips.push('已掌握 ' + stats.mastered + ' 词，坚持复习到 100 词即可解锁更稳定的记忆曲线');
    if (stats.streak < 3) tips.push('连续打卡 ' + stats.streak + ' 天，坚持每天学习效果更好');
    if (stats.streak >= 7) tips.push('连续打卡 ' + stats.streak + ' 天，习惯已养成，挑战更长连续纪录！');
    if (stats.dueCount > 0) tips.push('有 ' + stats.dueCount + ' 个单词待复习，先复习再学新词效率更高');
    if (!tips.length) tips.push('学习状态良好，继续保持！');
    return tips;
  }

  // ==================== 组件 ====================

  function DashboardModule() {
    var self = this;

    this._rafId = 0;
    this.dom = {};
    this._cacheDom();

    this._bindActions();
    this._renderQuickEntries();
    this._bindDelegation();

    // 首次立即渲染（首屏需要真实数据，不能等 rAF）
    this.render();

    // 其他 tab 写进度时刷新首页统计；切回本 tab 由 showTab('home') 渲染
    window.addEventListener('storage', function () { self.scheduleRender(); });

    // P0-04 事件驱动刷新：学习/积分/错题等数据变化时即时刷新首页统计（rAF 合并）
    if (window.EventBus) {
      REFRESH_EVENTS.forEach(function (name) {
        window.EventBus.on(name, function () { self.scheduleRender(); });
      });
    }

    // all-data.js（约 9.9MB）是 async 加载的，load 时词库才真正就位，
    // 此时「总词库」才由内置小词库变为全量 12 万词，需要补一次渲染。
    if (document.readyState === 'complete') this.scheduleRender();
    else window.addEventListener('load', function () { self.scheduleRender(); });

    // 后台切回前台时补一次（跨天 / 其它设备写入后数据可能已过期）
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) self.scheduleRender();
    });
  }

  // DOM 引用一次性缓存：原来每次 render 都要 getElementById 十余次
  DashboardModule.prototype._cacheDom = function () {
    var byId = function (id) { return document.getElementById(id); };
    this.dom = {
      page: byId('page-home'),
      date: byId('dash-date'),
      streak: byId('dash-streak'),
      mastered: byId('dash-mastered'),
      today: byId('dash-today'),
      due: byId('dash-due'),
      newCount: byId('dash-new'),
      goal: byId('dash-goal'),
      dueAnalysis: byId('dash-due-analysis'),
      doneAnalysis: byId('dash-done-analysis'),
      total: byId('dash-total'),
      totalMastered: byId('dash-total-mastered'),
      newBar: byId('dash-new-bar'),
      masterBar: byId('dash-master-bar'),
      tips: byId('dash-tips'),
      quick: byId('dash-quick')
    };
  };

  DashboardModule.prototype._bindActions = function () {
    var self = this;
    safeBind('btn-dash-start', 'click', function () { if (window.app) window.app.showTab('word'); });
    safeBind('btn-dash-review', 'click', function () {
      var a = window.app;
      if (!a) return;
      // P1-07：以"未掌握错题"数量判断路由——错题全部已掌握时直接去背单词，避免跳到空训练页
      var mistakes = DataStore.getProgress('mistakes', []) || [];
      var hasUnreviewed = mistakes.some(function (m) { return m && !m.reviewed; });
      a.showTab(hasUnreviewed ? 'mistake-train' : 'word');
    });
  };

  // 快捷入口：一次性生成，之后不再重建（按钮上直接带 data-goto，交由文档级委托处理）
  DashboardModule.prototype._renderQuickEntries = function () {
    var quick = this.dom.quick;
    if (!quick) return;
    quick.innerHTML = QUICK_ENTRIES.map(function (e) {
      return '<button type="button" class="btn dash-quick-btn" data-goto="' + e.tab + '">' +
        '<svg class="icon icon-sm" aria-hidden="true" focusable="false"><use href="#i-' + e.icon + '"/></svg> ' +
        escapeHtml(e.label) + '</button>';
    }).join('');
  };

  // 文档级委托：静态 + 动态（AI 回复按钮等）所有 data-goto 跳转统一生效，只注册一次
  var delegationBound = false;
  DashboardModule.prototype._bindDelegation = function () {
    if (delegationBound) return;
    delegationBound = true;
    document.addEventListener('click', function (ev) {
      var target = ev.target;
      var btn = (target && target.closest) ? target.closest('[data-goto]') : null;
      if (!btn || !window.app) return;
      var tab = btn.getAttribute('data-goto');
      if (tab) window.app.showTab(tab);
    });
  };

  // ==================== 渲染调度 ====================

  // 合并：连续多个事件 / 多次 storage 只触发一次真实渲染
  DashboardModule.prototype.scheduleRender = function () {
    if (this._rafId) return;
    var self = this;
    var raf = window.requestAnimationFrame;
    this._rafId = raf
      ? raf(function () { self._rafId = 0; self.renderIfVisible(); })
      : setTimeout(function () { self._rafId = 0; self.renderIfVisible(); }, 16);
  };

  // 只有首页可见时才渲染；不可见时留给 showTab('home') 补渲染
  DashboardModule.prototype.renderIfVisible = function () {
    if (this.isVisible()) this.render();
  };

  DashboardModule.prototype.isVisible = function () {
    var page = this.dom.page;
    return !page || page.classList.contains('active');
  };

  // ==================== 渲染 ====================

  DashboardModule.prototype.render = function () {
    // 一次建模，供下面所有卡片消费（原来三个函数各自全量扫描一遍进度）
    var stats = computeStats();
    this.renderDate();
    this.renderStatCards(stats);
    this.renderTaskCard(stats);
    this.renderTipsCard(stats);
  };

  DashboardModule.prototype.renderDate = function () {
    var now = new Date();
    this._setText(this.dom.date,
      now.getFullYear() + ' 年 ' + (now.getMonth() + 1) + ' 月 ' + now.getDate() +
      ' 日 星期' + WEEK_DAY_NAMES[now.getDay()]);
  };

  // 顶部四张统计卡
  DashboardModule.prototype.renderStatCards = function (stats) {
    this._setText(this.dom.streak, stats.streak);
    this._setText(this.dom.mastered, stats.mastered);
    this._setText(this.dom.today, stats.todayCount);
    this._setText(this.dom.due, stats.dueCount);
  };

  // 今日学习任务卡
  DashboardModule.prototype.renderTaskCard = function (stats) {
    this._setText(this.dom.newCount, stats.newCount);
    this._setText(this.dom.goal, stats.goal);
    this._setText(this.dom.dueAnalysis, stats.dueCount);
    this._setText(this.dom.doneAnalysis, stats.doneCount);
    this._setLibraryTotal(stats.total);
    this._setText(this.dom.totalMastered, stats.mastered);

    // 今日新学进度
    this._setBar(this.dom.newBar, stats.goal > 0
      ? Math.min(100, Math.round(stats.newCount / stats.goal * 100)) : 0);

    // 掌握进度条：用「已学过中掌握的比例」（分母为已建档进度数而非 12 万整库），
    // 避免 12 万词词库下 mastered/total ≈ 0% 看起来永远没进展
    var masteredPct = stats.learned > 0
      ? Math.min(100, Math.round(stats.mastered / stats.learned * 100)) : 0;
    this._setBar(this.dom.masterBar, masteredPct);
  };

  // AI 学习建议
  DashboardModule.prototype.renderTipsCard = function (stats) {
    var list = this.dom.tips;
    if (!list) return;
    var html = buildTips(stats).map(function (tip) {
      return '<li>' + escapeHtml(tip) + '</li>';
    }).join('');
    if (list.innerHTML !== html) list.innerHTML = html;   // 内容未变则不触发重排
  };

  // ==================== DOM 写入工具（值未变则不写，减少无谓重排） ====================

  // 「词库总量」必须区分「真的没有」和「还没到」（UI 审查 P1-1）。
  //
  // data/all-data.js 约 9.9MB 是 async 加载的；在它落地前 getLibraryTotal()
  // 只能读到内置小词库，算出来的 total 是 0。直接写进去，用户首屏看到的就是
  // 「词库总量 0 词」——一个把"加载中"误读成"这个 App 里没有词"的显示。
  DashboardModule.prototype._setLibraryTotal = function (total) {
    var el = this.dom.total;
    if (!el) return;
    var L = window.Loading;
    if (!L) { this._setText(el, total); return; }

    if (!L.libraryReady()) {
      // swap:true —— #dash-total 是 <b>0</b>，内容就是文本节点，
      // 不 swap 的话 CSS 隐藏对文本节点无效，会"0"和骨架并排显示
      L.skeleton(el, { variant: 'inline', rows: 1, swap: true });
      if (!this._libWaitHandle) {
        var self = this;
        this._libWaitHandle = L.awaitLibrary({
          ready: function () { self._libWaitHandle = null; self.render(); },
          onTimeout: function () {
            self._libWaitHandle = null;
            L.skeletonClear(el);
            self._setText(el, total);   // 超时就按真实值显示，不再假装还在加载
          },
        });
      }
      return;
    }
    L.skeletonClear(el);
    this._setText(el, total);
  };

  DashboardModule.prototype._setText = function (el, val) {
    if (!el) return;
    var text = String(val);
    if (el.textContent !== text) el.textContent = text;
    // 零值弱化（UI 审查 P0-5）：0 表示"还没有数据"，不该和有值数据一样顶着
    // 24px 粗体去争夺注意力 —— 色彩与字重只在"有值"时才承担强调语义。
    // 只作用于统计数字，避免误伤日期、说明文案等同样走 _setText 的元素。
    if (el.classList && el.classList.contains('dash-stat-num')) {
      el.classList.toggle('is-zero', Number(val) === 0);
    }
  };

  // 进度条：视觉宽度 + 无障碍数值同步更新（role=progressbar 由 HTML 声明）。
  // 逻辑统一在 js/core/progress.js，这里只是保留旧调用点，避免两处实现漂移。
  DashboardModule.prototype._setBar = function (fillEl, pct) {
    if (!fillEl) return;
    if (window.ProgressBar) return ProgressBar.set(fillEl, pct);
    fillEl.style.width = pct + '%';
  };

  return DashboardModule;
})();

if (typeof window !== 'undefined') window.DashboardModule = DashboardModule;

// ==================== 首页 Dashboard（学习控制中心） ====================
// 数据来源：checkins / word_progress / gamification / mistakes / daily_goal，
// 复用 app.js 的 DataStore / calculateStreak / getLocalDateStr / safeBind / escapeHtml / Toast。
var DashboardModule = (function() {
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

  function DashboardModule() {
    var self = this;
    this._el = function(id) { return document.getElementById(id); };
    safeBind('btn-dash-start', 'click', function() { if (window.app) window.app.showTab('word'); });
    safeBind('btn-dash-review', 'click', function() {
      var a = window.app;
      if (!a) return;
      // P1-07：以"未掌握错题"数量判断路由——错题全部已掌握时直接去背单词，避免跳到空训练页
      var mistakes = DataStore.getProgress('mistakes', []) || [];
      var hasUnreviewed = mistakes.some(function(m) { return m && !m.reviewed; });
      var tab = hasUnreviewed ? 'mistake-train' : 'word';
      a.showTab(tab);
    });
    var quick = this._el('dash-quick');
    if (quick) {
      quick.innerHTML = QUICK_ENTRIES.map(function(e) {
        return '<button class="btn dash-quick-btn" data-goto="' + e.tab + '"><svg class="icon icon-sm"><use href="#i-' + e.icon + '"/></svg> ' + e.label + '</button>';
      }).join('');
    }
    // 文档级委托：静态 + 动态（错题按钮等）所有 data-goto 跳转按钮统一生效
    document.addEventListener('click', function(ev) {
      var b = ev.target && ev.target.closest ? ev.target.closest('[data-goto]') : null;
      if (!b || !window.app) return;
      var tab = b.getAttribute('data-goto');
      if (tab) window.app.showTab(tab);
    });
    this.render();
    // 其他 tab 写进度时刷新首页统计；切回本 tab 由 showTab('home') 渲染
    window.addEventListener('storage', function() { self.render(); });
    // P0-04 事件驱动刷新：学习/积分/错题等数据变化时即时刷新首页统计
    if (window.EventBus && window.MS && window.MS.EVENTS) {
      var EVT = window.MS.EVENTS;
      var onStatChange = function() { self.render(); };
      [EVT.WORD_LEARNED, EVT.WORD_REVIEWED, EVT.WORD_MASTERED, EVT.POINTS_CHANGED,
       EVT.MISTAKE_ADDED, EVT.MISTAKE_RESOLVED, EVT.STREAK_CHANGED, EVT.DAILY_PLAN_CHANGED]
        .forEach(function(name) { window.EventBus.on(name, onStatChange); });
    }
  }

  DashboardModule.prototype.render = function() {
    this.renderHeader();
    this.renderStats();
    this.renderTasks();
    this.renderTips();
  };

  DashboardModule.prototype.renderHeader = function() {
    var el = this._el('dash-date');
    if (!el) return;
    var now = new Date();
    var week = ['日', '一', '二', '三', '四', '五', '六'][now.getDay()];
    el.textContent = now.getFullYear() + ' 年 ' + (now.getMonth() + 1) + ' 月 ' + now.getDate() + ' 日 星期' + week;
  };

  DashboardModule.prototype._getProgress = function() {
    // P0-03：优先内存进度（写入有 300ms 节流，事件驱动的即时刷新用内存态避免读到过期存储）
    return (window.UserState && window.UserState.getWordProgress()) || DataStore.getProgress('word_progress', {});
  };

  // 统计三卡：连续打卡 / 已掌握词汇 / 今日学习
  DashboardModule.prototype.renderStats = function() {
    var checkins = DataStore.getProgress('checkins', {});
    var progress = this._getProgress();
    var mastered = Object.keys(progress).filter(function(k) { return progress[k] && progress[k].status === 'mastered'; }).length;
    var today = getLocalDateStr();
    var todayCount = checkins[today] || 0;
    this._set('dash-streak', calculateStreak(checkins));
    this._set('dash-mastered', mastered);
    this._set('dash-today', todayCount);
  };

  // 今日任务卡：今日新学 X/Y、待复习、总词库与掌握进度
  DashboardModule.prototype.renderTasks = function() {
    var progress = this._getProgress();
    var t = getLocalDateStr();
    var newCount = 0, dueCount = 0, doneCount = 0, mastered = 0;
    Object.keys(progress).forEach(function(k) {
      var p = progress[k];
      if (!p) return;
      if (p.firstSeen === t) newCount++;
      if (p.status !== 'mastered' && p.nextReview && p.nextReview <= t) dueCount++;
      if (p.lastReviewed === t) doneCount++;
      if (p.status === 'mastered') mastered++;
    });
    var goal = DataStore.getProgress('daily_goal', 10) || 10;
    if (goal < 1) goal = 10;
    var cats = DataStore.getDefaultWords().categories || [];
    var total = 0;
    cats.forEach(function(cat) { if (cat && cat.words) total += cat.words.length; });
    this._set('dash-new', newCount);
    this._set('dash-goal', goal);
    this._set('dash-due', dueCount);
    this._set('dash-due-analysis', dueCount);
    this._set('dash-done-analysis', doneCount);
    this._set('dash-total', total);
    this._set('dash-total-mastered', mastered);
    var bar = this._el('dash-new-bar');
    if (bar) bar.style.width = Math.min(100, Math.round(newCount / goal * 100)) + '%';
    var mbar = this._el('dash-master-bar');
    // 掌握进度条：用「已学过中掌握的比例」（分母为已建档进度数而非 12 万整库），
    // 避免 12 万词词库下 mastered/total ≈ 0% 看起来永远没进展
    var learnedCount = Object.keys(this._getProgress()).length;
    var masteredPct = learnedCount > 0 ? Math.min(100, Math.round(mastered / learnedCount * 100)) : 0;
    if (mbar) mbar.style.width = masteredPct + '%';
  };

  // 7 天学习柱状图 / 薄弱能力分析已移入设置页「学习报告」（App.js AnalysisModule）。
  // **首页专注：突出「开始学习」+今日任务+AI 建议。

  // AI 学习建议：基于本周学习量 / 掌握量 / 连续打卡 / 薄弱项生成
  DashboardModule.prototype.renderTips = function() {
    var list = this._el('dash-tips');
    if (!list) return;
    var checkins = DataStore.getProgress('checkins', {});
    var progress = this._getProgress();
    var mastered = Object.keys(progress).filter(function(k) { return progress[k] && progress[k].status === 'mastered'; }).length;
    var now = new Date();
    var weekWords = 0;
    for (var i = 0; i < 7; i++) {
      var d = new Date(now);
      d.setDate(d.getDate() - i);
      weekWords += checkins[getLocalDateStr(d)] || 0;
    }
    var streak = calculateStreak(checkins);
    var tips = [];
    if (weekWords < 30) tips.push('本周学习量较少，建议每天至少学习 10 个单词');
    else tips.push('本周学习 ' + weekWords + ' 词，状态不错，继续保持！');
    if (mastered < 100) tips.push('已掌握 ' + mastered + ' 词，坚持复习到 100 词即可解锁更稳定的记忆曲线');
    if (streak < 3) tips.push('连续打卡 ' + streak + ' 天，坚持每天学习效果更好');
    if (streak >= 7) tips.push('连续打卡 ' + streak + ' 天，习惯已养成，挑战更长连续纪录！');
    var due = 0;
    var t = getLocalDateStr();
    Object.keys(progress).forEach(function(k) {
      var p = progress[k];
      if (p && p.status !== 'mastered' && p.nextReview && p.nextReview <= t) due++;
    });
    if (due > 0) tips.push('有 ' + due + ' 个单词待复习，先复习再学新词效率更高');
    if (tips.length === 0) tips.push('学习状态良好，继续保持！');
    list.innerHTML = tips.map(function(tip) { return '<li>' + escapeHtml(tip) + '</li>'; }).join('');
  };

  DashboardModule.prototype._set = function(id, val) {
    var el = this._el(id);
    if (el) el.textContent = val;
  };

  return DashboardModule;
})();

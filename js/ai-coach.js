// ==================== AI 助手（AI 英语教练） ====================
// 基于 checkins / word_progress / gamification / mistakes 生成学习概况、
// 能力诊断、AI 建议与今日行动。复用 app.js 的 DataStore / calculateStreak /
// getLocalDateStr / escapeHtml / Toast（构造时 window.app 尚未赋值，渲染时才可用）。
var AiCoachModule = (function() {
  var WEAK_SOURCES = [
    { key: 'word', name: '词汇' },
    { key: 'spelling', name: '拼写' },
    { key: 'grammar', name: '语法' },
    { key: 'reading', name: '阅读' },
    { key: 'listening', name: '听力' },
    { key: 'listen', name: '听力' },
    { key: 'context', name: '语境' },
    { key: 'pk', name: 'PK' },
    { key: 'speak', name: '口语' }
  ];

  function AiCoachModule() {
    this._el = function(id) { return document.getElementById(id); };
    this.render();
    // P0-04 事件驱动刷新：学习数据变化时若当前正显示 AI 页则重新生成概况/建议
    if (window.EventBus && window.MS && window.MS.EVENTS) {
      var self = this;
      var EVT = window.MS.EVENTS;
      var refresh = function() {
        try { if (window.app && window.app.currentTab === 'ai') self.render(); } catch (e) {}
      };
      [EVT.WORD_LEARNED, EVT.WORD_REVIEWED, EVT.WORD_MASTERED, EVT.POINTS_CHANGED,
       EVT.MISTAKE_ADDED, EVT.MISTAKE_RESOLVED, EVT.STREAK_CHANGED, EVT.ASSESSMENT_COMPLETED]
        .forEach(function(name) { window.EventBus.on(name, refresh); });
    }
  }

  AiCoachModule.prototype.render = function() {
    this.renderOverview();
    this.renderWeakness();
    this.renderTips();
    this.renderActions();
  };

  AiCoachModule.prototype._progress = function() {
    // P0-03：优先内存进度（写入有 300ms 节流，事件驱动的即时刷新用内存态避免读到过期存储）
    return (window.UserState && window.UserState.getWordProgress()) || DataStore.getProgress('word_progress', {});
  };

  AiCoachModule.prototype.renderOverview = function() {
    var checkins = DataStore.getProgress('checkins', {});
    var progress = this._progress();
    var mastered = Object.keys(progress).filter(function(k) { return progress[k] && progress[k].status === 'mastered'; }).length;
    var now = new Date();
    var weekWords = 0;
    for (var i = 0; i < 7; i++) {
      var d = new Date(now);
      d.setDate(d.getDate() - i);
      weekWords += checkins[getLocalDateStr(d)] || 0;
    }
    // 不能依赖 window.app.gamification（模块构造时尚未赋值），直接读存储 + 兜底推算
    var gami = DataStore.getProgress('gamification', {}) || {};
    var level = gami.level;
    if (!level && typeof gami.points === 'number') level = Math.floor(gami.points / 100) + 1;
    this._set('ai-ov-streak', calculateStreak(checkins));
    this._set('ai-ov-mastered', mastered);
    this._set('ai-ov-week', weekWords);
    this._set('ai-ov-level', 'Lv.' + (level || 1));
    this._set('ai-ov-points', gami.points || 0);
  };

  AiCoachModule.prototype.renderWeakness = function() {
    var wrap = this._el('ai-weakness');
    if (!wrap) return;
    var mistakes = DataStore.getProgress('mistakes', []);
    var bySource = {};
    mistakes.forEach(function(m) { if (m && m.source) bySource[m.source] = (bySource[m.source] || 0) + 1; });
    var rows = WEAK_SOURCES
      .map(function(s) { return { name: s.name, count: bySource[s.key] || 0 }; })
      .filter(function(r) { return r.count > 0; })
      .sort(function(a, b) { return b.count - a.count; })
      .slice(0, 3);
    if (!rows.length) {
      wrap.innerHTML = '<div class="ai-weak-empty"><svg class="icon"><use href="#i-thumb-up"/></svg> 暂无错题记录，各项能力均衡，继续保持！</div>';
      return;
    }
    var max = rows[0].count;
    wrap.innerHTML = rows.map(function(r) {
      var pct = Math.max(8, Math.round(r.count / max * 100));
      return '<div class="ai-weak-row">'
        + '<div class="ai-weak-head"><span>' + r.name + '</span><b>' + r.count + ' 题</b></div>'
        + '<div class="ai-weak-bar"><div class="ai-weak-fill" style="width:' + pct + '%"></div></div>'
        + '</div>';
    }).join('');
  };

  AiCoachModule.prototype.renderTips = function() {
    var list = this._el('ai-tips');
    if (!list) return;
    var checkins = DataStore.getProgress('checkins', {});
    var progress = this._progress();
    var t = getLocalDateStr();
    var mastered = 0, due = 0, todayNew = 0, todayDone = 0;
    Object.keys(progress).forEach(function(k) {
      var p = progress[k];
      if (!p) return;
      if (p.status === 'mastered') mastered++;
      if (p.status !== 'mastered' && p.nextReview && p.nextReview <= t) due++;
      if (p.firstSeen === t) todayNew++;
      if (p.lastReviewed === t) todayDone++;
    });
    var now = new Date();
    var weekWords = 0;
    for (var i = 0; i < 7; i++) {
      var d = new Date(now);
      d.setDate(d.getDate() - i);
      weekWords += checkins[getLocalDateStr(d)] || 0;
    }
    var streak = calculateStreak(checkins);
    var mistakes = DataStore.getProgress('mistakes', []);
    var tips = [];
    if (due > 0) tips.push('有 ' + due + ' 个单词进入复习周期，建议先完成复习再学新词，记忆效率更高');
    else if (todayNew === 0) tips.push('今日还没有学新词，打开背单词完成今日目标，保持记忆曲线不中断');
    if (todayDone > 0 && due === 0) tips.push('今日已复习 ' + todayDone + ' 词，复习任务清零，状态很好！');
    if (weekWords > 0 && weekWords < 30) tips.push('本周学习了 ' + weekWords + ' 词，低于 30 词目标线，建议每天至少学习 10 个新词');
    if (streak >= 3 && streak < 7) tips.push('已连续打卡 ' + streak + ' 天，再坚持 4 天即可解锁整周连续纪录');
    if (streak >= 7) tips.push('连续打卡 ' + streak + ' 天，学习习惯已稳固，尝试挑战 30 天目标');
    if (streak === 0) tips.push('从今天开始打卡，连续学习 3 天即可养成初步习惯');
    if (mistakes.length > 0) tips.push('错题本里有 ' + mistakes.length + ' 道错题，用错词强化针对性巩固薄弱项');
    if (mastered > 0 && mastered < 100) tips.push('已掌握 ' + mastered + ' 词，冲过 100 词大关后复习曲线会更稳定');
    if (mastered >= 100) tips.push('已掌握 ' + mastered + ' 词，词汇量稳步增长，可以开始挑战高级词库');
    if (tips.length === 0) tips.push('学习数据还很少，先背几个单词，教练马上就能为你出报告');
    list.innerHTML = tips.slice(0, 4).map(function(tip) { return '<li>' + tip + '</li>'; }).join('');
  };

  AiCoachModule.prototype.renderActions = function() {
    var wrap = this._el('ai-actions');
    if (!wrap) return;
    var mistakes = DataStore.getProgress('mistakes', []);
    var actions = [
      { tab: 'word', icon: 'translate', label: '去背单词' },
      { tab: 'word', icon: 'refresh', label: '开始复习' },
      { tab: 'listening', icon: 'headphones', label: '听力训练' },
      { tab: 'reading', icon: 'article', label: '阅读训练' }
    ];
    if (mistakes.length) {
      actions.splice(1, 0, { tab: 'mistake-train', icon: 'target', label: '错词强化' });
    }
    actions.push({ tab: 'settings', icon: 'analytics', label: '查看学习报告' });
    wrap.innerHTML = actions.map(function(a) {
      return '<button type="button" class="ai-action-btn" data-goto="' + a.tab + '">'
        + '<svg class="icon"><use href="#i-' + a.icon + '"/></svg> ' + a.label + '</button>';
    }).join('');
  };

  AiCoachModule.prototype._set = function(id, val) {
    var el = this._el(id);
    if (el) el.textContent = val;
  };

  return AiCoachModule;
})();

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

  var PATTERN_DESC = {
    'spelling': '音形混淆，常见元音/辅音对应不熟',
    'grammar': '语法结构不牢，时态/单复数易混',
    'listening': '听力辨音弱，建议慢速多听原声',
    'listen': '听力辨音弱，建议慢速多听原声',
    'reading': '阅读语义抓不准，先练句子主干',
    'pk': '反应与拼写准确率需加强',
    'word': '词义记忆不牢，多结合词组和语境',
    'speak': '口语表达生疏，跟读模仿最有效',
    'context': '语境推断弱，多结合上下文猜词'
  };
  var TIP_LEVEL = {
    urgent: { text: '紧急', cls: 'urgent' },
    prevent: { text: '预防', cls: 'prevent' },
    encourage: { text: '鼓励', cls: 'encourage' },
    normal: { text: '提示', cls: 'normal' }
  };

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
    this.renderReport();
    this.renderRadar();
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
      .map(function(s) { return { key: s.key, name: s.name, count: bySource[s.key] || 0 }; })
      .filter(function(r) { return r.count > 0; })
      .sort(function(a, b) { return b.count - a.count; })
      .slice(0, 3);
    if (!rows.length) {
      wrap.innerHTML = '<div class="ai-weak-empty"><svg class="icon"><use href="#i-thumb-up"/></svg> 暂无错题记录，各项能力均衡，继续保持！</div>';
      return;
    }
    var max = rows[0].count;
    var pattern = PATTERN_DESC[rows[0].key];
    var trend = this._mistakeTrend();
    var trendText;
    if (trend.state === 'down') trendText = '，较上周 <span class="ai-up">▼ 减少</span>';
    else if (trend.state === 'up') trendText = '，较上周 <span class="ai-down">▲ 增加</span>';
    else trendText = '，与上周持平';
    wrap.innerHTML = rows.map(function(r) {
      var pct = Math.max(8, Math.round(r.count / max * 100));
      return '<div class="ai-weak-row">'
        + '<div class="ai-weak-head"><span>' + r.name + '</span><b>' + r.count + ' 题</b></div>'
        + '<div class="ai-weak-bar"><div class="ai-weak-fill" style="width:' + pct + '%"></div></div>'
        + '</div>';
    }).join('')
      + (pattern ? '<div class="ai-weak-pattern">主要模式：' + pattern + '</div>' : '')
      + '<div class="ai-weak-trend">近 7 天错题 <b>' + trend.total + '</b> 道' + trendText + '</div>';
  };

  // 本周 vs 上周错题数（mistakes[].date；旧数据无 date 视为本周）
  AiCoachModule.prototype._mistakeTrend = function() {
    var mistakes = DataStore.getProgress('mistakes', []) || [];
    var now = new Date();
    var todayKey = getLocalDateStr();
    var week = 0, prev = 0;
    for (var i = 0; i < 7; i++) {
      var d = new Date(now); d.setDate(d.getDate() - i);
      var key = getLocalDateStr(d);
      var p = new Date(now); p.setDate(p.getDate() - 7 - i);
      var pkey = getLocalDateStr(p);
      mistakes.forEach(function(m) {
        if (!m) return;
        // 旧数据无日期 → 视为今天（更贴近"最近"的错题）
        var md = (m.date && String(m.date).slice(0, 10)) || todayKey;
        if (md === key) week++;
        else if (md === pkey) prev++;
      });
    }
    var state = week < prev ? 'down' : (week > prev ? 'up' : 'flat');
    return { total: week, prev: prev, state: state };
  };

  // 本周 vs 上周学习词数（checkins）
  AiCoachModule.prototype._weekTrend = function() {
    var checkins = DataStore.getProgress('checkins', {});
    var now = new Date();
    var week = 0, prev = 0;
    for (var i = 0; i < 7; i++) {
      var d = new Date(now); d.setDate(d.getDate() - i);
      week += checkins[getLocalDateStr(d)] || 0;
      var p = new Date(now); p.setDate(p.getDate() - 7 - i);
      prev += checkins[getLocalDateStr(p)] || 0;
    }
    return { total: week, prev: prev, up: week >= prev };
  };

  AiCoachModule.prototype._roots = function(mistakes, topN) {
    var counts = {};
    mistakes.forEach(function(m) { if (m && m.source) counts[m.source] = (counts[m.source] || 0) + 1; });
    return Object.keys(counts).map(function(s) { return { name: s, count: counts[s] }; })
      .sort(function(a, b) { return b.count - a.count; })
      .slice(0, topN || 3);
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
    // 三级建议：紧急(urgent) > 预防(prevent) > 鼓励(encourage)/提示(normal)
    var tips = [];
    if (due > 3) tips.push({ level: 'urgent', text: '有 ' + due + ' 个单词进入复习周期，先复习再学新词，不然会越积越多' });
    if (todayNew === 0) tips.push({ level: 'urgent', text: '今日还没有学新词，完成今日目标，保持记忆曲线不中断' });
    if (due > 0 && due <= 3) tips.push({ level: 'prevent', text: '有 ' + due + ' 个单词待复习，今天安排 10 分钟完成它们' });
    if (todayDone > 0 && due === 0) tips.push({ level: 'normal', text: '今日已复习 ' + todayDone + ' 词，复习任务清零，状态很好！' });
    if (weekWords > 0 && weekWords < 30) tips.push({ level: 'prevent', text: '本周学习了 ' + weekWords + ' 词，低于 30 词目标线，建议每天至少 10 个新词' });
    if (streak >= 3 && streak < 7) tips.push({ level: 'prevent', text: '已连续打卡 ' + streak + ' 天，再坚持 4 天解锁整周纪录' });
    if (streak >= 7) tips.push({ level: 'encourage', text: '连续打卡 ' + streak + ' 天，学习习惯已稳固，挑战 30 天目标吧' });
    if (streak > 0 && streak < 3) tips.push({ level: 'encourage', text: '已打卡 ' + streak + ' 天，连续 3 天即可养成初步习惯，就差一点点' });
    if (streak === 0) tips.push({ level: 'normal', text: '从今天开始打卡，连续学习 3 天即可养成初步习惯' });
    if (mistakes.length > 4) tips.push({ level: 'urgent', text: '错题本已有 ' + mistakes.length + ' 道错题，用错词强化针对性巩固' });
    else if (mistakes.length > 0) tips.push({ level: 'prevent', text: '错题本有 ' + mistakes.length + ' 道错题，抽空做一次错词强化' });
    if (mastered > 0 && mastered < 100) tips.push({ level: 'normal', text: '已掌握 ' + mastered + ' 词，冲过 100 词大关后复习更稳定' });
    if (mastered >= 100) tips.push({ level: 'encourage', text: '已掌握 ' + mastered + ' 词，词汇量稳步增长，可挑战高级词库' });
    if (tips.length === 0) tips.push({ level: 'normal', text: '学习数据还很少，先背几个单词，教练马上就能为你出报告' });
    var order = { urgent: 0, prevent: 1, encourage: 2, normal: 3 };
    tips.sort(function(a, b) { return (order[a.level] || 3) - (order[b.level] || 3); });
    list.innerHTML = tips.slice(0, 4).map(function(tip) {
      var meta = TIP_LEVEL[tip.level] || TIP_LEVEL.normal;
      return '<li class="ai-tip ai-tip-' + meta.cls + '"><span class="ai-tip-badge">' + meta.text + '</span> ' + tip.text + '</li>';
    }).join('');
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

  // 动态创建卡片容器（插入 .ai-grid 末尾），不修改 index.html 静态结构
  AiCoachModule.prototype._section = function(id, title, icon) {
    var el = this._el(id);
    if (el) return el;
    var grid = document.querySelector('.ai-grid');
    var card = document.createElement('div');
    card.className = 'ai-card ai-card-dynamic';
    card.id = id;
    card.innerHTML = '<h3 class="ai-card-title"><svg class="icon icon-sm icon-sage"><use href="#i-' + (icon || 'chart') + '"/></svg> ' + title + '</h3>'
      + '<div class="' + id + '-body"></div>';
    if (grid) grid.appendChild(card);
    else document.body.appendChild(card);
    return card;
  };

  AiCoachModule.prototype._sectionBody = function(id) {
    var el = this._el(id);
    if (!el) return null;
    var body = el.querySelector('.' + id + '-body');
    return body || el;
  };

  AiCoachModule.prototype.renderReport = function() {
    var wrap = this._section('ai-report', '每周学习报告', 'analytics');
    var body = this._sectionBody('ai-report');
    if (!wrap || !body) return;
    var trend = this._weekTrend();
    var progress = this._progress();
    var t = getLocalDateStr();
    var mastered = 0, due = 0;
    Object.keys(progress).forEach(function(k) {
      var p = progress[k];
      if (!p) return;
      if (p.status === 'mastered') mastered++;
      else if (p.nextReview && p.nextReview <= t) due++;
    });
    var mistakes = DataStore.getProgress('mistakes', []);
    var weak = this._roots(mistakes, 1)[0];
    var weakName = WEAK_SOURCES.reduce(function(acc, s) { return s.key === (weak && weak.name) ? s.name : acc; }, null) || (weak && weak.name) || '暂无';
    var delta = trend.total - trend.prev;
    var summary;
    if (trend.total === 0) summary = '本周还没有学习记录，从今天开始，先背 5 个词建立节奏。';
    else if (delta >= 10) summary = '本周投入明显提升，继续保持这样的节奏！';
    else if (delta < 0) summary = '本周投入较上周下降，别担心，安排一次 10 分钟复习就能找回状态。';
    else if (due > 5) summary = '积累了不少待复习词，本周优先清空复习队列。';
    else summary = '稳步前进，规律比冲量更重要。';
    body.innerHTML = '<div class="ai-report-grid">'
      + '<div class="ai-report-item"><b>' + trend.total + '</b><span>本周学习（词）</span></div>'
      + '<div class="ai-report-item ' + (delta >= 0 ? 'ai-report-up' : 'ai-report-down') + '"><b>' + (delta >= 0 ? '▲ +' : '▼ ') + Math.abs(delta) + '</b><span>较上周</span></div>'
      + '<div class="ai-report-item"><b>' + mastered + '</b><span>已掌握</span></div>'
      + '<div class="ai-report-item"><b>' + due + '</b><span>待复习</span></div>'
      + '<div class="ai-report-item"><b>' + mistakes.length + '</b><span>错题</span></div>'
      + '<div class="ai-report-item"><b>' + escapeHtml(weakName) + '</b><span>薄弱方向</span></div>'
      + '</div>'
      + '<div class="ai-report-summary">' + summary + '</div>';
  };

  // 六维能力雷达（SVG 六角图）
  AiCoachModule.prototype.renderRadar = function() {
    var wrap = this._section('ai-radar', '能力雷达', 'target');
    var body = this._sectionBody('ai-radar');
    if (!wrap || !body) return;
    body.innerHTML = this._radarSvg(this._radarScores());
  };

  AiCoachModule.prototype._radarScores = function() {
    var progress = this._progress();
    var t = getLocalDateStr();
    var mastered = 0, due = 0;
    Object.keys(progress).forEach(function(k) {
      var p = progress[k];
      if (!p) return;
      if (p.status === 'mastered') mastered++;
      else if (p.nextReview && p.nextReview <= t) due++;
    });
    var mistakes = DataStore.getProgress('mistakes', []);
    var err = { spelling: 0, grammar: 0, listening: 0, listen: 0, speak: 0, reading: 0, word: 0, context: 0, pk: 0 };
    mistakes.forEach(function(m) { if (m && m.source && err[m.source] !== undefined) err[m.source]++; });
    var clamp = function(v) { return Math.max(0, Math.min(10, Math.round(v * 10) / 10)); };
    return [
      { label: '词汇', score: clamp(mastered / 5) },
      { label: '复习', score: clamp(10 - due * 1.5) },
      { label: '拼写', score: clamp(10 - err.spelling * 3) },
      { label: '语法', score: clamp(10 - err.grammar * 3) },
      { label: '听力', score: clamp(10 - (err.listening + err.listen) * 3) },
      { label: '口语', score: clamp(10 - err.speak * 3) }
    ];
  };

  AiCoachModule.prototype._radarSvg = function(scores) {
    var cx = 200, cy = 110, R = 80;
    var n = scores.length;
    function pt(i, r) {
      var ang = -Math.PI / 2 + i * 2 * Math.PI / n;
      return (cx + r * Math.cos(ang)).toFixed(1) + ',' + (cy + r * Math.sin(ang)).toFixed(1);
    }
    var rings = [];
    for (var ring = 1; ring <= 6; ring++) {
      var r = R * ring / 6;
      var pts = [];
      for (var i = 0; i < n; i++) pts.push(pt(i, r));
      rings.push('<polygon points="' + pts.join(' ') + '" class="ai-radar-ring" />');
    }
    var data = scores.map(function(s, i) { return pt(i, R * s.score / 10); }).join(' ');
    var labels = scores.map(function(s, i) {
      var ang = -Math.PI / 2 + i * 2 * Math.PI / n;
      var lx = cx + (R + 26) * Math.cos(ang);
      var ly = cy + (R + 26) * Math.sin(ang) + 4;
      var anchor = Math.abs(Math.cos(ang)) < 0.3 ? 'middle' : (Math.cos(ang) > 0 ? 'start' : 'end');
      return '<text x="' + lx.toFixed(1) + '" y="' + ly.toFixed(1) + '" text-anchor="' + anchor + '" class="ai-radar-label">'
        + escapeHtml(s.label) + ' ' + s.score + '</text>';
    });
    return '<svg viewBox="0 0 400 230" class="ai-radar-svg" role="img" aria-label="能力雷达图">'
      + rings.join('') + '<polygon points="' + data + '" class="ai-radar-data" />' + labels.join('') + '</svg>';
  };

  AiCoachModule.prototype._set = function(id, val) {
    var el = this._el(id);
    if (el) el.textContent = val;
  };

  return AiCoachModule;
})();

if (typeof window !== 'undefined') window.AiCoachModule = AiCoachModule;

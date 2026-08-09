// ==================== 成就徽章墙 ====================
// 百词斩/多邻国同款思路：达成条件自动解锁徽章，配合积分体系发奖励。
// 依赖 app.js 提供的 DataStore / Toast / escapeHtml / safeBind
var BadgeSystem = (function() {
  var REWARD = 30;

  function today() { return getLocalDateStr(); }
  function getProgress() { return DataStore.getProgress('word_progress', {}); }
  function getCheckins() { return DataStore.getProgress('checkins', {}); }

  // 连续打卡天数（今天未打卡则从昨天起算，与 AnalysisModule 一致）
  function computeStreak(checkins) {
    var d = new Date();
    if (!(checkins[today()] > 0)) d.setDate(d.getDate() - 1);
    var streak = 0;
    while (checkins[getLocalDateStr(d)] > 0 && streak < 3660) {
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  }

  // 徽章配置：id / name / icon / desc / reward / check / progress
  var BADGES = [
    {
      id: 'first', name: '初出茅庐', icon: 'i-sparkle',
      desc: '累计学习过 1 个单词', reward: REWARD,
      check: function() { return Object.keys(getProgress()).length >= 1; },
      progress: function() { return { cur: Object.keys(getProgress()).length, max: 1 }; }
    },
    {
      id: 'learn100', name: '词汇新星', icon: 'i-book',
      desc: '累计学习 100 个单词', reward: REWARD,
      check: function() { return Object.keys(getProgress()).length >= 100; },
      progress: function() { return { cur: Object.keys(getProgress()).length, max: 100 }; }
    },
    {
      id: 'learn500', name: '词汇达人', icon: 'i-article',
      desc: '累计学习 500 个单词', reward: REWARD,
      check: function() { return Object.keys(getProgress()).length >= 500; },
      progress: function() { return { cur: Object.keys(getProgress()).length, max: 500 }; }
    },
    {
      id: 'master50', name: '小有所成', icon: 'i-check',
      desc: '掌握 50 个单词', reward: REWARD,
      check: function() {
        var p = getProgress(), n = 0;
        Object.keys(p).forEach(function(k) { if (p[k] && p[k].status === 'mastered') n++; });
        return n >= 50;
      },
      progress: function() {
        var p = getProgress(), n = 0;
        Object.keys(p).forEach(function(k) { if (p[k] && p[k].status === 'mastered') n++; });
        return { cur: n, max: 50 };
      }
    },
    {
      id: 'master200', name: '单词大师', icon: 'i-diamond',
      desc: '掌握 200 个单词', reward: REWARD,
      check: function() {
        var p = getProgress(), n = 0;
        Object.keys(p).forEach(function(k) { if (p[k] && p[k].status === 'mastered') n++; });
        return n >= 200;
      },
      progress: function() {
        var p = getProgress(), n = 0;
        Object.keys(p).forEach(function(k) { if (p[k] && p[k].status === 'mastered') n++; });
        return { cur: n, max: 200 };
      }
    },
    {
      id: 'streak7', name: '七日坚持', icon: 'i-fire',
      desc: '连续打卡 7 天', reward: REWARD,
      check: function() { return computeStreak(getCheckins()) >= 7; },
      progress: function() { return { cur: computeStreak(getCheckins()), max: 7 }; }
    },
    {
      id: 'streak30', name: '月度达人', icon: 'i-calendar',
      desc: '连续打卡 30 天', reward: REWARD,
      check: function() { return computeStreak(getCheckins()) >= 30; },
      progress: function() { return { cur: computeStreak(getCheckins()), max: 30 }; }
    },
    {
      id: 'days30', name: '学海无涯', icon: 'i-chart',
      desc: '累计学习 30 天', reward: REWARD,
      check: function() {
        var c = getCheckins(), n = 0;
        Object.keys(c).forEach(function(k) { if (c[k] > 0) n++; });
        return n >= 30;
      },
      progress: function() {
        var c = getCheckins(), n = 0;
        Object.keys(c).forEach(function(k) { if (c[k] > 0) n++; });
        return { cur: n, max: 30 };
      }
    },
    {
      id: 'pk3', name: '一战成名', icon: 'i-target',
      desc: '单词PK 连胜 3 局', reward: REWARD,
      check: function() { return getStats().pkStreak >= 3; },
      progress: function() { return { cur: getStats().pkStreak, max: 3 }; }
    },
    {
      id: 'pk90', name: '精准射手', icon: 'i-trophy',
      desc: '单词PK 单局准确率 ≥ 90%', reward: REWARD,
      check: function() { return getStats().pkBestAcc >= 90; },
      progress: function() { return { cur: getStats().pkBestAcc, max: 90 }; }
    },
    {
      id: 'mistakes', name: '错题清零', icon: 'i-error',
      desc: '错题本中的错题全部复习完成', reward: REWARD,
      check: function() {
        var m = DataStore.getProgress('mistakes', []);
        return m.length > 0 && m.every(function(x) { return x.reviewed; });
      },
      progress: function() {
        var m = DataStore.getProgress('mistakes', []);
        var done = m.filter(function(x) { return x.reviewed; }).length;
        return { cur: done, max: m.length };
      }
    },
    {
      id: 'story', name: '故事达人', icon: 'i-book',
      desc: '完成 1 次词文串学', reward: REWARD,
      check: function() { return getStats().story >= 1; },
      progress: function() { return { cur: getStats().story, max: 1 }; }
    },
    {
      id: 'grammar', name: '语法新秀', icon: 'i-edit',
      desc: '答对 10 道语法题', reward: REWARD,
      check: function() { return getStats().grammar >= 10; },
      progress: function() { return { cur: getStats().grammar, max: 10 }; }
    },
    {
      id: 'collector', name: '小有家底', icon: 'i-gift',
      desc: '同时拥有 5 种不同道具', reward: REWARD,
      check: function() {
        var items = DataStore.getProgress('items', {});
        return Object.keys(items).filter(function(k) { return items[k] > 0; }).length >= 5;
      },
      progress: function() {
        var items = DataStore.getProgress('items', {});
        return { cur: Object.keys(items).filter(function(k) { return items[k] > 0; }).length, max: 5 };
      }
    }
  ];

  function getStats() { return DataStore.getProgress('badge_stats', { story: 0, grammar: 0, pkStreak: 0, pkBestAcc: 0 }); }
  function saveStats(s) { DataStore.setProgress('badge_stats', s); }

  function BadgeSystem() {
    this.earned = DataStore.getProgress('badges', {});
    var self = this;
    // 延迟到 window.app 就绪后再做首次检查，保证积分奖励/Toast 能拿到应用引用
    setTimeout(function() { self.checkAll(); }, 200);
    // 其他 tab 修改进度/徽章后同步检查；本 tab 内变化由 onEvent / 导入数据 / 进入徽章页触发
    window.addEventListener('storage', function(e) {
      if (!e.key) return;
      if (e.key === 'word_progress' || e.key === 'checkins' || e.key === 'badge_stats' || e.key === 'badges') {
        self.earned = DataStore.getProgress('badges', self.earned);
        self.checkAll();
      }
    });
  }

  // 业务事件入口：story=词文串学 / grammar=答对语法题 / pk={correct,wrong}
  BadgeSystem.prototype.onEvent = function(evt, data) {
    var stats = getStats();
    if (evt === 'story') {
      stats.story = (stats.story || 0) + 1;
    } else if (evt === 'grammar') {
      stats.grammar = (stats.grammar || 0) + 1;
    } else if (evt === 'pk' && data) {
      var total = (data.correct || 0) + (data.wrong || 0);
      if (total >= 5) {
        if (data.correct > data.wrong) stats.pkStreak = (stats.pkStreak || 0) + 1;
        else stats.pkStreak = 0;
        var acc = Math.round(data.correct / total * 100);
        if (acc > (stats.pkBestAcc || 0)) stats.pkBestAcc = acc;
      }
    }
    saveStats(stats);
    this.checkAll();
  };

  BadgeSystem.prototype.checkAll = function() {
    var self = this;
    var changed = false;
    // 以 storage 为权威：导入旧备份/多标签并发时，若该徽章已被其它入口记录过则不再重复发奖
    var stored = DataStore.getProgress('badges', {});
    Object.keys(stored).forEach(function(id) { if (stored[id] && !self.earned[id]) self.earned[id] = stored[id]; });
    BADGES.forEach(function(b) {
      if (self.earned[b.id]) return;
      var ok = false;
      try { ok = b.check(); } catch(e) {}
      if (ok) {
        self.earned[b.id] = today();
        changed = true;
        if (window.app && window.app.gamification) {
          window.app.gamification.addPoints(b.reward);
        }
        Toast.success('🏅 获得成就「' + b.name + '」，奖励 ' + b.reward + ' 积分');
      }
    });
    if (changed) {
      DataStore.setProgress('badges', this.earned);
      if (window.app) window.app.updateGlobalStats();
      var page = document.getElementById('page-badges');
      if (page && page.classList.contains('active')) this.render();
    }
  };

  BadgeSystem.prototype.render = function() {
    var grid = document.getElementById('badge-grid');
    if (!grid) return;
    var self = this;
    var earnedCount = 0;
    BADGES.forEach(function(b) { if (self.earned[b.id]) earnedCount++; });
    var summary = document.getElementById('badge-summary');
    if (summary) {
      summary.textContent = '已获得 ' + earnedCount + ' / ' + BADGES.length + ' 枚徽章 · 每枚奖励 ' + REWARD + ' 积分';
    }
    grid.innerHTML = BADGES.map(function(b) {
      var isEarned = !!self.earned[b.id];
      var prog = '';
      try {
        var p = b.progress();
        if (p && p.max > 0) prog = '<div class="badge-progress"><div class="badge-progress-fill" style="width:' + Math.min(100, Math.round(p.cur / p.max * 100)) + '%"></div></div>'
          + '<div class="badge-prog-text">' + p.cur + ' / ' + p.max + '</div>';
      } catch(e) {}
      return '<div class="badge-card' + (isEarned ? ' earned' : ' locked') + '">'
        + '<div class="badge-icon"><svg class="icon"><use href="#' + b.icon + '"/></svg></div>'
        + '<div class="badge-name">' + escapeHtml(b.name) + '</div>'
        + '<div class="badge-desc">' + escapeHtml(b.desc) + '</div>'
        + (isEarned ? '<div class="badge-date">✓ ' + self.earned[b.id] + '</div>' : prog + '<div class="badge-date">未获得</div>')
        + '</div>';
    }).join('');
  };

  BadgeSystem.prototype.BADGES = BADGES;

  return BadgeSystem;
})();

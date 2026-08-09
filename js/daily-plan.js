// ==================== 每日学习计划 ====================
// 设置每日新词目标（设置页"每日学习目标"），背单词首页显示今日进度：
// 今日新学 X/Y + 待复习 B 词 + 已复习 C 词。
// 依赖 app.js 提供的 DataStore / safeBind
var DailyPlanModule = (function() {
  function today() { return getLocalDateStr(); }

  function DailyPlanModule() {
    var self = this;
    safeBind('btn-dp-goal', 'click', function() {
      if (window.app) window.app.showTab('settings');
    });
    this.render();
    // 其他 tab 写进度时刷新卡片；切回本 tab 由 showTab('word') 渲染
    window.addEventListener('storage', function() { self.render(); });
  }

  DailyPlanModule.prototype.render = function() {
    var card = document.getElementById('daily-plan-card');
    if (!card) return;
    var progress = DataStore.getProgress('word_progress', {});
    var t = today();
    var newCount = 0, dueCount = 0, doneCount = 0;
    Object.keys(progress).forEach(function(k) {
      var p = progress[k];
      if (p.firstSeen === t) newCount++;
      if (p.status !== 'mastered' && p.nextReview && p.nextReview <= t) dueCount++;
      if (p.lastReviewed === t) doneCount++;
    });
    var goal = DataStore.getProgress('daily_goal', 10) || 10;
    if (goal < 1) goal = 10;

    var el = document.getElementById('dp-goal-num');
    if (el) el.textContent = goal;
    var el6 = document.getElementById('dp-goal-num2');
    if (el6) el6.textContent = goal;
    var el2 = document.getElementById('dp-new');
    if (el2) el2.textContent = newCount;
    var el3 = document.getElementById('dp-new-bar');
    if (el3) el3.style.width = Math.min(100, Math.round(newCount / goal * 100)) + '%';
    var el4 = document.getElementById('dp-due');
    if (el4) el4.textContent = dueCount;
    var el5 = document.getElementById('dp-done');
    if (el5) el5.textContent = doneCount;
    var msg = document.getElementById('dp-msg');
    if (msg) {
      if (newCount >= goal) {
        msg.textContent = '✓ 今日新词目标已达成，继续加油！';
        msg.className = 'dp-msg dp-msg-done';
      } else {
        msg.textContent = '再学 ' + (goal - newCount) + ' 个新词就完成今日目标';
        msg.className = 'dp-msg';
      }
    }
  };

  return DailyPlanModule;
})();

// ==================== 新手引导模块（Phase 3） ====================
// 首次进入时弹出 4 步向导：欢迎 → 设定每日目标 → 摸底测评 → 生成学习计划 → 开始学习。
// 设计：
//   - 只对首次使用弹出（DataStore.onboarding_done 标记），可中途关闭、之后随时重开。
//   - 每日目标写入 DataStore.daily_goal（与设置页 daily-goal 同 key）。
//   - 测评复用 AssessmentModule（同弹窗体系），交卷后回到向导第 4 步生成计划。
//   - 未测评时在首页渲染「立即测一测」CTA，AI 教练页测评按钮复用同一入口。
// 复用：DataStore / Toast / safeBind / escapeHtml / getLocalDateStr / window.app。
var OnboardingModule = (function() {
  var STEP_NAMES = ['欢迎', '每日目标', '能力测评', '学习计划'];

  function OnboardingModule() {
    this._step = 0;
    this._assessmentRes = null;
    this.bindings();
    this.renderCTA();
    var self = this;
    // 等首屏渲染完成后自动弹出（首次使用时）。
    // 守卫：引导已在打开状态、或测评弹窗正打开时不打断，避免重置正在进行的引导步骤。
    setTimeout(function() {
      if (DataStore.getProgress('onboarding_done')) return;
      if (self._open) return;
      var am = document.getElementById('assessment-modal');
      if (am && !am.classList.contains('hidden')) return;
      self.show();
    }, 600);
  }

  OnboardingModule.prototype.bindings = function() {
    var self = this;
    safeBind('btn-ob-welcome-next', 'click', function() { self._goto(1); });
    safeBind('btn-ob-goal-back', 'click', function() { self._goto(0); });
    safeBind('btn-ob-goal-next', 'click', function() { self._saveGoal(); });
    safeBind('btn-ob-assess-back', 'click', function() { self._goto(1); });
    safeBind('btn-ob-assess-start', 'click', function() { self._startAssessment(); });
    safeBind('btn-ob-assess-skip', 'click', function() { self._skipAssessment(); });
    safeBind('btn-ob-plan-back', 'click', function() { self._goto(2); });
    safeBind('btn-ob-start', 'click', function() { self._finish(true); });
    safeBind('btn-ob-skip', 'click', function() { self._finish(true); });
    safeBind('btn-ob-close', 'click', function() { self._finish(false); }); // 误关不置完成，下次仍可重开引导
    var modal = document.getElementById('onboarding-modal');
    if (modal) modal.addEventListener('click', function(e) { if (e.target === modal) self._finish(false); });
    // 目标选项：点击选中；「自定义」展开输入框
    document.addEventListener('click', function(e) {
      var opt = e.target && e.target.closest ? e.target.closest('.ob-goal-opt') : null;
      if (opt) {
        document.querySelectorAll('.ob-goal-opt').forEach(function(o) { o.classList.remove('active'); });
        opt.classList.add('active');
        var c = document.getElementById('ob-goal-custom');
        if (c) { c.classList.add('hidden'); c.value = ''; }
        return;
      }
      if (e.target && e.target.closest && e.target.closest('#ob-goal-toggle-custom')) {
        var c2 = document.getElementById('ob-goal-custom');
        if (c2) {
          c2.classList.toggle('hidden');
          if (!c2.classList.contains('hidden')) { c2.focus(); c2.select(); }
          else { document.querySelectorAll('.ob-goal-opt').forEach(function(o) { o.classList.remove('active'); }); }
        }
      }
    });
    // 首页 CTA：未测评时点「立即测一测」直接进测评
    document.addEventListener('click', function(e) {
      var b = e.target && e.target.closest ? e.target.closest('[data-ob-assess]') : null;
      if (b) self._startAssessment();
    });
    // Esc 关闭引导：捕获阶段先于测评弹窗的 Esc 处理执行，能正确判断「测评是否开着」，
    // 从而避免一次 Esc 同时关掉两层弹窗（双弹窗时只关测评）。误关不置完成。
    document.addEventListener('keydown', function(e) {
      if (e.key !== 'Escape' || !self._open) return;
      var am = document.getElementById('assessment-modal');
      if (am && !am.classList.contains('hidden')) return;
      self._finish(false);
    }, true);
  };

  OnboardingModule.prototype.show = function() {
    var modal = document.getElementById('onboarding-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    this._open = true;
    this._step = 0;
    this._route(0);
  };

  OnboardingModule.prototype._hide = function() {
    this._open = false;
    var modal = document.getElementById('onboarding-modal');
    if (modal) modal.classList.add('hidden');
  };

  OnboardingModule.prototype._goto = function(step) {
    if (step < 0 || step > 3) return;
    this._step = step;
    this._route(step);
  };

  OnboardingModule.prototype._route = function(step) {
    var modal = document.getElementById('onboarding-modal');
    if (!modal) return;
    var views = modal.querySelectorAll('.ob-view');
    Array.prototype.forEach.call(views, function(v) { v.style.display = 'none'; });
    var target = modal.querySelector('.ob-view-' + step);
    if (target) target.style.display = 'block';
    var dots = modal.querySelectorAll('.ob-dot');
    Array.prototype.forEach.call(dots, function(d, i) { d.classList.toggle('active', i === step); });
    var title = modal.querySelector('#ob-step-title');
    if (title) title.textContent = '第 ' + (step + 1) + ' 步 · ' + STEP_NAMES[step];
    if (step === 2) this._renderAssessView();
    if (step === 3) this._renderPlanView();
  };

  // ---------- 第 2 步：每日目标 ----------
  OnboardingModule.prototype._saveGoal = function() {
    var checked = document.querySelector('.ob-goal-opt.active');
    var goal = checked ? parseInt(checked.getAttribute('data-goal'), 10) : 10;
    var custom = document.getElementById('ob-goal-custom');
    if (custom && !custom.classList.contains('hidden')) {
      var v = parseInt(custom.value, 10);
      if (!isNaN(v) && v >= 1 && v <= 100) goal = v;
    }
    if (isNaN(goal) || goal < 1) goal = 10;
    DataStore.setProgress('daily_goal', goal);
    var el = document.getElementById('daily-goal');
    if (el) el.value = goal;
    Toast.success('每日目标已设为 ' + goal + ' 词');
    this._goto(2);
  };

  // ---------- 第 3 步：摸底测评 ----------
  OnboardingModule.prototype._renderAssessView = function() {
    var box = document.getElementById('ob-assess-info');
    if (!box) return;
    var done = DataStore.getProgress('assessment', null);
    if (done && done.score !== undefined && done.level) {
      var lv = { newcomer: '零基础', beginner: '入门', basic: '基础', intermediate: '进阶', advanced: '挑战' }[done.level] || '入门';
      box.innerHTML = '你已完成过一次测评（能力等级：<b>' + lv + '</b>，得分 <b>' + escapeHtml(done.score) + '</b> 分）。可以重新测评获得最新数据。';
    } else {
      box.innerHTML = '通过 15 道题快速了解你的词汇 / 语法 / 听力 / 发音 / 阅读水平，测评结果将用于生成个性化学习计划。';
    }
  };

  OnboardingModule.prototype._startAssessment = function() {
    var a = window.app && window.app.assessmentModule;
    if (!a) { Toast.error('测评模块尚未就绪，请稍后再试'); return; }
    var self = this;
    // 交卷回调：记录结果（向导第 4 步用），测评结果页自行展示；
    // 仅当用户正处于引导第 3 步（能力测评）且引导未完成时，交卷后自动进入「学习计划」。
    // _step===2 守卫防止引导外部（AI 页/首页 CTA）发起的测评交卷后残留回调误跳步。
    a._onComplete = function(res) {
      self._assessmentRes = res;
      if (self._step === 2 && !DataStore.getProgress('onboarding_done')) self._goto(3);
    };
    a.open();
  };

  OnboardingModule.prototype._skipAssessment = function() {
    this._assessmentRes = null;
    // 跳过测评等同离开本步骤，同样清掉回调防误跳
    if (window.app && window.app.assessmentModule) window.app.assessmentModule._onComplete = null;
    this._goto(3);
  };

  // ---------- 第 4 步：学习计划 ----------
  OnboardingModule.prototype._renderPlanView = function() {
    var box = document.getElementById('ob-plan-box');
    if (!box) return;
    var res = this._assessmentRes || DataStore.getProgress('assessment', null);
    var goal = Number(DataStore.getProgress('daily_goal', 10));
    if (!isFinite(goal) || goal < 1) goal = 10;
    var lv = res ? { newcomer: '零基础', beginner: '入门', basic: '基础', intermediate: '进阶', advanced: '挑战' }[res.level] || res.level : '入门';
    if (res) {
      var plan = AssessmentEngine.buildPlan(res, goal);
      var weak = res.weakName ? '<div class="ob-plan-weak">薄弱项：' + escapeHtml(res.weakName) + '，建议优先强化</div>' : '';
      box.innerHTML = '<div class="ob-plan-title">你的能力等级：<b>' + escapeHtml(lv) + '</b>（综合 ' + escapeHtml(res.score) + ' 分）</div>'
        + '<ul class="ob-plan-list">' + plan.lines.map(function(l) { return '<li>' + escapeHtml(l) + '</li>'; }).join('') + '</ul>'
        + weak;
    } else {
      var plan2 = AssessmentEngine.buildPlan({ level: 'beginner', score: 0, vector: { vocab: 0, grammar: 0, listening: 0, pron: 0, reading: 0 }, weakDim: null, weakName: '', recommendName: '' }, goal);
      box.innerHTML = '<div class="ob-plan-title">先按通用计划开始，随时可以重新测评</div>'
        + '<ul class="ob-plan-list">' + plan2.lines.map(function(l) { return '<li>' + l + '</li>'; }).join('') + '</ul>';
    }
  };

  // ---------- 完成引导 ----------
  // completed=true：真正完成引导（进入首页/点了开始），标记 onboarding_done；
  // completed=false：仅关闭弹窗（误点遮罩/Esc/×），不标记完成，下次打开仍会重新展示
  OnboardingModule.prototype._finish = function(completed) {
    if (completed) DataStore.setProgress('onboarding_done', true);
    // 清掉可能残留的测评回调：防止引导外的测评交卷后误触发 _goto 跳步
    if (window.app && window.app.assessmentModule) window.app.assessmentModule._onComplete = null;
    this._hide();
    this.renderCTA();
    if (window.app) window.app.updateGlobalStats();
  };

  // 首页 CTA：常驻显示。未测评时「立即测一测」，测评过后改为「重新测评」并展示最近成绩。
  OnboardingModule.prototype.renderCTA = function() {
    var el = document.getElementById('dash-assessment-cta');
    if (!el) return;
    var done = DataStore.getProgress('assessment', null);
    var doneLv = done && done.score !== undefined;
    var title = el.querySelector('.dash-card-title');
    var desc = el.querySelector('p');
    var btn = el.querySelector('[data-ob-assess]');
    if (doneLv) {
      var lvName = { newcomer: '零基础', beginner: '入门', basic: '基础', intermediate: '进阶', advanced: '挑战' }[done.level] || '';
      if (title) title.innerHTML = '<svg class="icon icon-sm icon-sage"><use href="#i-target"/></svg> 更新你的水平报告';
      if (desc) desc.textContent = '上次测评 ' + done.score + ' 分' + (lvName ? '（' + lvName + '）' : '') + '，花 5-8 分钟重新测一次，看看进步与薄弱项变化';
      if (btn) btn.innerHTML = '<svg class="icon"><use href="#i-target"/></svg> 重新测评';
    } else {
      if (title) title.innerHTML = '<svg class="icon icon-sm icon-sage"><use href="#i-target"/></svg> 还不知道自己的水平？';
      if (desc) desc.textContent = '花 5-8 分钟做一次能力测评，了解词汇 / 语法 / 听力 / 发音 / 阅读水平，生成专属学习计划';
      if (btn) btn.innerHTML = '<svg class="icon"><use href="#i-target"/></svg> 立即测一测';
    }
    el.classList.remove('hidden');
  };

  // 供外部重开引导（设置页入口等）
  OnboardingModule.prototype.open = function() {
    this.show();
  };

  return OnboardingModule;
})();

if (typeof window !== 'undefined') {
  window.OnboardingModule = OnboardingModule;
}

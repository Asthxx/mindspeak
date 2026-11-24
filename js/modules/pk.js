// 单词PK模块（2026-11-24 从 js/app.js 拆出，纯移动、无逻辑改动）
// 依赖 DataStore / Toast / escapeHtml / SpeechUtil 等全局符号，由 app.js 及前置模块提供。
// ==================== 单词PK模块 ====================
var PKModule = (function() {
  function PKModule() {
    this.words = [];
    this.currentIndex = 0;
    this.correctCount = 0;
    this.wrongCount = 0;
    this.points = 0;
    this.timer = null;
    this.timeLeft = 60;
    this.isRunning = false;
    this.history = Storage.getJSON('pk_history', []) || [];
    this.initUI();
  }
  PKModule.prototype.initUI = function() {
    var self = this;
    this.populateCategories();
    safeBind('btn-start-pk', 'click', function() { self.startGame(); });
    safeBind('btn-pk-next', 'click', function() { self.nextQuestion(); });
    safeBind('btn-pk-retry', 'click', function() { self.startGame(); });
    safeBind('btn-clear-pk-history', 'click', function() { self.clearHistory(); });
    this.renderHistory();
  };
  PKModule.prototype.populateCategories = function() {
    var cats = DataStore.getDefaultWords().categories;
    var select = document.getElementById('pk-category');
    select.innerHTML = '';
    orderCategoriesForDisplay(cats).forEach(function(i) {
      var c = cats[i];
      if (!c || !c.words) return; // 防单分类数据损坏
      var opt = document.createElement('option');
      opt.value = i;
      opt.textContent = c.name + ' (' + c.words.length + ')';
      select.appendChild(opt);
    });
  };
PKModule.prototype.startGame = function() {
    // 上一局还在进行中就直接点"开始"：先结算旧局（写入历史、退回未用道具），
    // 否则已借用的护盾/双倍卡不退回、旧局成绩丢失
    if (this.isRunning && !this.isEnded) this.endGame();
    var catIdx = safeNumber(document.getElementById('pk-category').value, 0);
var cats = DataStore.getDefaultWords().categories;
    if (catIdx >= cats.length || !cats[catIdx] || !cats[catIdx].words) { Toast.warning('词库尚未加载，请稍后再试'); return; }
    this.customVoiceCancelPending = false;
    this.isEnded = false; // 重置结束标记，允许新一局正常结算
    this.categoryName = cats[catIdx].name;
    this.words = sampleLearnedWords(cats[catIdx].words, 20);
    if (!this.words.length) { Toast.warning('这个分类还没有学过的单词，先去背单词吧'); return; }
    this.currentIndex = 0;
    this.correctCount = 0;
    this.wrongCount = 0;
    this.points = 0;
    this.timeLeft = 60;
    this.isRunning = true;
    document.getElementById('pk-score').classList.add('hidden');
    document.getElementById('pk-card').style.display = '';
    if (this.timer) clearInterval(this.timer);
    this.startTimer();
    this.showQuestion();
  };
PKModule.prototype.startTimer = function() {
    var self = this;
    // 时间戳驱动：浏览器后台会节流 setInterval，若每秒递减则倒计时被拉长；
    // 记录截止时间，每次 tick 按真实时间差计算剩余秒数
    this._deadline = Date.now() + this.timeLeft * 1000;
    this.updateTimerDisplay();
    this.timer = setInterval(function() {
      var remain = Math.max(0, Math.round((self._deadline - Date.now()) / 1000));
      if (remain !== self.timeLeft) {
        self.timeLeft = remain;
        self.updateTimerDisplay();
      }
      if (self.timeLeft <= 0) self.endGame();
    }, 250);
  };
  PKModule.prototype.updateTimerDisplay = function() {
    document.getElementById('pk-timer').textContent = this.timeLeft;
    document.getElementById('pk-timer').style.color = this.timeLeft <= 10 ? 'var(--danger)' : 'var(--coral)';
  };
  PKModule.prototype.showQuestion = function() {
    if (this.currentIndex >= this.words.length || !this.isRunning) { this.endGame(); return; }
    var w = this.words[this.currentIndex];
    ProgressBar.set('pk-progress-fill', this.currentIndex / this.words.length * 100);
    document.getElementById('pk-prompt').textContent = w.chinese || '';
    document.getElementById('pk-result').classList.add('hidden');
    document.getElementById('pk-actions').style.display = 'none';
    var optionsEl = document.getElementById('pk-options');
    optionsEl.innerHTML = '';
    var pool = [w];
    var allWords = this.words;
    // 词库可能含重复 word：随机抽取永远命中已入池的词时池无法增长，加尝试上限防死循环
    var poolAttempts = 0;
    while (pool.length < 4 && pool.length < allWords.length && poolAttempts < 200) {
      poolAttempts++;
      var rand = allWords[Math.floor(Math.random() * allWords.length)];
      if (pool.every(function(p) { return p.word !== rand.word; })) pool.push(rand);
    }
    pool.sort(function() { return Math.random() - 0.5; });
    var self = this;
    pool.forEach(function(opt) {
      var btn = document.createElement('button');
      btn.className = 'pk-option-btn';
      btn.textContent = opt.word;
      btn.addEventListener('click', function() { self.checkAnswer(btn, opt.word === w.word, w); });
      optionsEl.appendChild(btn);
    });
  };
PKModule.prototype.checkAnswer = function(btn, isCorrect, w) {
    if (this.isEnded) return; // 已结算则忽略，防倒计时归零与答案点击同 tick 时重复入账
    var buttons = document.querySelectorAll('.pk-option-btn');
    buttons.forEach(function(b) { b.disabled = true; });
    var resultEl = document.getElementById('pk-result');
    resultEl.classList.remove('hidden');
    if (isCorrect) {
      btn.classList.add('correct');
      this.correctCount++;
      this.points += 10 + Math.floor(this.timeLeft / 10);
      resultEl.className = 'pk-result success';
      resultEl.textContent = '✓ 正确！';
      if (window.app) { window.app.recordActivity('pk', 1); window.app.markCheckin(1); }
    } else {
      btn.classList.add('wrong');
      this.wrongCount++;
      resultEl.className = 'pk-result error';
      resultEl.textContent = '✗ 正确答案：' + w.word;
      if (window.app) { window.app.addMistake(w, 'pk'); window.app.markCheckin(1); }
    }
    document.getElementById('pk-actions').style.display = 'block';
  };
  PKModule.prototype.nextQuestion = function() {
    // 防连点：双击"下一题"会连跳两题
    if (this._nextLock) return;
    this._nextLock = true;
    var self = this;
    setTimeout(function() { self._nextLock = false; }, 250);
    this.currentIndex++;
    this.showQuestion();
  };
  PKModule.prototype.endGame = function() {
    // 幂等守卫：计时归零与“最后一题点下一题”可能在同一 tick 双触发，
    // 防历史重复入账
    if (this.isEnded) return;
    this.isEnded = true;
    this.isRunning = false;
    if (this.timer) clearInterval(this.timer);
    document.getElementById('pk-card').style.display = 'none';
    document.getElementById('pk-score').classList.remove('hidden');
    var total = this.correctCount + this.wrongCount;
    var pct = total > 0 ? Math.round(this.correctCount / total * 100) : 0;
    document.getElementById('pk-score-num').textContent = pct + '%';
    document.getElementById('pk-correct-count').textContent = this.correctCount;
    document.getElementById('pk-wrong-count').textContent = this.wrongCount;
    document.getElementById('pk-points').textContent = this.points;
    // 写入历史记录并渲染
    this.saveHistory();
    this.renderHistory();
    if (window.app) window.app.recordActivity('pk');
  };
  // ── 历史记录：保存 / 渲染 / 单删 / 清空 ──
  PKModule.prototype.saveHistory = function() {
    var total = this.correctCount + this.wrongCount;
    var pct = total > 0 ? Math.round(this.correctCount / total * 100) : 0;
    var entry = {
      id: Date.now() + '-' + Math.floor(Math.random() * 10000),
      time: new Date().toLocaleString('zh-CN', { hour12: false }),
      category: this.categoryName || '--',
      correct: this.correctCount,
      wrong: this.wrongCount,
      points: this.points,
      accuracy: pct
    };
    this.history.unshift(entry);                   // 最新在前
    if (this.history.length > 20) this.history.length = 20;   // 最多 20 条
    Storage.setJSON('pk_history', this.history);
  };
  PKModule.prototype.renderHistory = function() {
    var listEl = document.getElementById('pk-history-list');
    var clearBtn = document.getElementById('btn-clear-pk-history');
    if (!listEl) return;
    if (!this.history || this.history.length === 0) {
      listEl.innerHTML = '<p style="color:var(--text-tertiary);font-size:0.9rem;text-align:center;padding:var(--sp-4) 0">暂无历史记录</p>';
      if (clearBtn) clearBtn.style.display = 'none';
      return;
    }
    var self = this;
    listEl.innerHTML = this.history.map(function(h) {
      var accColor = h.accuracy >= 80 ? 'var(--success)' : (h.accuracy >= 50 ? 'var(--coral)' : 'var(--danger)');
      return '<div class="pk-history-item" style="display:grid;grid-template-columns:1fr auto;gap:6px 12px;align-items:center;padding:var(--sp-3);border-bottom:1px solid var(--border);font-size:0.85rem">'
        + '<div style="color:var(--text-tertiary);font-size:0.8rem;min-width:0">' + escapeHtml(h.time) + '</div>'
        + '<button class="btn btn-sm btn-danger pk-del-btn" data-id="' + escapeHtml(String(h.id)) + '" style="padding:2px 10px;font-size:0.75rem">删除</button>'
        + '<div style="display:flex;flex-wrap:wrap;gap:var(--sp-2);align-items:center;min-width:0">'
        +   '<span style="color:var(--text-secondary);max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escapeHtml(h.category) + '</span>'
        +   '<span style="color:var(--success)">对 ' + escapeHtml(String(h.correct)) + '</span>'
        +   '<span style="color:var(--danger)">错 ' + escapeHtml(String(h.wrong)) + '</span>'
        +   '<span style="color:' + accColor + ';font-weight:600">' + escapeHtml(String(h.accuracy)) + '%</span>'
        +   '<span style="color:var(--sage)">' + escapeHtml(String(h.points)) + ' 分</span>'
        + '</div>'
        + '</div>';
    }).join('');
    if (clearBtn) clearBtn.style.display = 'inline-block';
    // 绑定每条删除按钮
    listEl.querySelectorAll('.pk-del-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        self.deleteHistory(btn.getAttribute('data-id'));
      });
    });
  };
  PKModule.prototype.deleteHistory = function(id) {
    this.history = this.history.filter(function(h) { return h.id !== String(id); });
    Storage.setJSON('pk_history', this.history);
    this.renderHistory();
  };
PKModule.prototype.clearHistory = function() {
    if (!this.history || this.history.length === 0) return;
    var self = this;
    ConfirmBox.confirm('确定清空所有 PK 历史记录吗？此操作不可撤销。', function() {
      self.history = [];
      Storage.setJSON('pk_history', self.history);
      self.renderHistory();
      Toast.success('历史记录已清空');
    }, { title: '清空历史记录', okText: '清空', danger: true });
  };
  return PKModule;
})();

// 独立文件必须显式挂到 window：ESM 导入时顶层 var 不会成为全局符号，
// 而 app.js 的 init() 用裸标识符构造实例（浏览器多 script 标签下同理需要）。
if (typeof window !== 'undefined') window.PKModule = PKModule;

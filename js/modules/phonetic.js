// 音标学习模块（2026-11-24 从 js/app.js 拆出，纯移动、无逻辑改动）
// 依赖 DataStore / Toast / escapeHtml / SpeechUtil 等全局符号，由 app.js 及前置模块提供。
// ==================== 音标学习模块 ====================
var PhoneticModule = (function() {
  function PhoneticModule() {
    this.phoneticProgress = DataStore.getProgress('phonetic_progress', {});
    this.initUI();
  }
  PhoneticModule.prototype.initUI = function() {
    var self = this;
    safeBind('phonetic-category', 'change', function() { self.renderGrid(); });
    safeBind('phd-close', 'click', function() { document.getElementById('modal-phonetic-detail').classList.add('hidden'); });
    safeBind('phd-speak', 'click', function() { self.speakDetail(); });
    safeBind('phd-known', 'click', function() { self.markMastered(); });
    this.renderGrid();
    this.updateStats();
  };
  // 按字母顺序展示（用户要求）：以 symbol 的 en 排序为准，同符号（极少）退化为按名称。
  // 只在展示层排序、返回副本 —— 数据源顺序不动，详情弹层查找与掌握度统计不受影响。
  PhoneticModule.prototype._sortSymbols = function(list) {
    return list.slice().sort(function(a, b) {
      var c = String(a.symbol).localeCompare(String(b.symbol), 'en');
      if (c !== 0) return c;
      return String(a.name || '').localeCompare(String(b.name || ''), 'en');
    });
  };
  // 进入音标页：数据就绪直接渲染；未就绪（首开慢网，data 脚本还在路上）挂起等待，
  // 就绪后补渲染。此前初始化时数据未到 → 网格空挂且之后无重渲染钩子，慢网下该页永远空白。
  PhoneticModule.prototype.onShow = function() {
    if (typeof PHONETIC_DATA !== 'undefined' && PHONETIC_DATA && PHONETIC_DATA.vowels && PHONETIC_DATA.vowels.length) {
      this.renderGrid();
      this.updateStats();
      return;
    }
    var self = this;
    if (this._libWaitCancel) { try { this._libWaitCancel(); } catch (e) {} this._libWaitCancel = null; }
    if (window.Loading && window.Loading.awaitLibrary) {
      this._libWaitCancel = window.Loading.awaitLibrary({
        ready: function() {
          self._libWaitCancel = null;
          self.renderGrid();
          self.updateStats();
        },
        onTimeout: function() {
          self._libWaitCancel = null;
          if (window.Toast) Toast.error('词库加载超时，音标数据未能就绪，请稍后重试');
        }
      });
    }
  };
  PhoneticModule.prototype.renderGrid = function() {
    if (typeof PHONETIC_DATA === 'undefined') return;
    var cat = document.getElementById('phonetic-category').value;
    var items = [];
    if (cat === 'all' || cat === 'vowels') items = items.concat(PHONETIC_DATA.vowels);
    if (cat === 'all' || cat === 'consonants') items = items.concat(PHONETIC_DATA.consonants);
    items = this._sortSymbols(items);
    var self = this;
    var grid = document.getElementById('phonetic-grid');
    grid.innerHTML = items.map(function(p) {
      var prog = self.phoneticProgress[p.symbol];
      var statusClass = prog && prog.mastered ? 'mastered' : (prog ? 'learning' : '');
      return '<div class="ph-card ' + statusClass + '" data-symbol="' + escapeHtml(p.symbol) + '">' +
        '<div class="ph-symbol">' + escapeHtml(p.symbol) + '</div>' +
        '<div class="ph-name">' + escapeHtml(p.name || '') + '</div>' +
        '<div class="ph-example">' + escapeHtml(p.example ? p.example.split(' ')[0] : '') + '</div>' +
      '</div>';
    }).join('');
    grid.querySelectorAll('.ph-card').forEach(function(card) {
      card.addEventListener('click', function() { self.showDetail(card.dataset.symbol); });
    });
  };
  PhoneticModule.prototype.showDetail = function(symbol) {
    if (typeof PHONETIC_DATA === 'undefined') return;
    var all = PHONETIC_DATA.vowels.concat(PHONETIC_DATA.consonants);
    var item = null;
    for (var i = 0; i < all.length; i++) { if (all[i].symbol === symbol) { item = all[i]; break; } }
    if (!item) return;
    this.currentSymbol = symbol;
    document.getElementById('phd-title').textContent = item.category + ' - ' + item.name;
    document.getElementById('phd-symbol').textContent = item.symbol;
    document.getElementById('phd-example-word').textContent = item.example || '';
    document.getElementById('phd-example-meaning').textContent = item.meaning || '';
    document.getElementById('phd-tip').textContent = item.tip || '';
    document.getElementById('modal-phonetic-detail').classList.remove('hidden');
  };
  PhoneticModule.prototype.speakDetail = function() {
    if (this.currentSymbol) SpeechUtil.speak(this.currentSymbol, 'en-US');
  };
  PhoneticModule.prototype.markMastered = function() {
    if (!this.currentSymbol) return;
    this.phoneticProgress[this.currentSymbol] = { mastered: true, date: getLocalDateStr() };
    DataStore.setProgress('phonetic_progress', this.phoneticProgress);
    this.renderGrid();
    this.updateStats();
    document.getElementById('modal-phonetic-detail').classList.add('hidden');
    Toast.success('已标记为已掌握');
    if (window.app) { window.app.recordActivity('exercise'); window.app.markCheckin(0); }
  };
  PhoneticModule.prototype.updateStats = function() {
    if (typeof PHONETIC_DATA === 'undefined') return;
    var all = PHONETIC_DATA.vowels.concat(PHONETIC_DATA.consonants);
    var total = all.length;
    var mastered = 0;
    var self = this;
    all.forEach(function(p) { if (self.phoneticProgress[p.symbol] && self.phoneticProgress[p.symbol].mastered) mastered++; });
    document.getElementById('ph-total').textContent = total;
    document.getElementById('ph-learning').textContent = total - mastered;
    document.getElementById('ph-mastered').textContent = mastered;
    document.getElementById('ph-progress').textContent = Math.round(mastered / total * 100) + '%';
  };
  return PhoneticModule;
})();

// 独立文件必须显式挂到 window：ESM 导入时顶层 var 不会成为全局符号，
// 而 app.js 的 init() 用裸标识符构造实例（浏览器多 script 标签下同理需要）。
if (typeof window !== 'undefined') window.PhoneticModule = PhoneticModule;

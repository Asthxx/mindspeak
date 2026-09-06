// ==================== 随声听模式 ====================
// 扇贝同款思路：选词库自动循环朗读单词，支持语速/间隔/重复/循环模式，
// 配合"听写模式"边听边默写。
// 依赖 app.js 提供的 DataStore / orderCategoriesForDisplay / escapeHtml / SpeechUtil / Toast / safeBind
var ListenAlongModule = (function() {
  var INTERVALS = { '2000': 2000, '3000': 3000, '4000': 4000 };
  var RATES = { '0.7': 0.7, '0.9': 0.9, '1.1': 1.1 };

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function ListenAlongModule() {
    this.words = [];
    this.index = 0;
    this.playing = false;
    this.repeat = 1;
    this.repeatLeft = 0;
    this.timer = null;
    this.seq = 0;
    this.correct = 0;
    this.wrong = 0;
    this.cats = DataStore.getDefaultWords().categories;
    this.bindEvents();
    this.populateCategory();
    this.buildList();
  }

  ListenAlongModule.prototype.bindEvents = function() {
    var self = this;
    safeBind('la-category', 'change', function() {
      // 切换词库先停播：递增 seq 使旧播放队列的定时期回调失效，
      // 否则旧词的 scheduleNext 会在新词库上用 words[0] 接着播
      if (self.playing) self.pause();
      self.buildList();
      self.renderCurrent(true);
    });
    safeBind('btn-la-play', 'click', function() { self.togglePlay(); });
    safeBind('btn-la-prev', 'click', function() {
      self.index = self.index <= 0 ? self.words.length - 1 : self.index - 1;
      self.repeatLeft = 0;
      self.renderCurrent(true);
      if (self.playing) self.speakSequence();
    });
    safeBind('btn-la-next', 'click', function() {
      self.index = (self.index + 1) % self.words.length;
      self.repeatLeft = 0;
      self.renderCurrent(true);
      if (self.playing) self.speakSequence();
    });
    safeBind('btn-la-show', 'click', function() { self.reveal(); });
    safeBind('btn-la-check', 'click', function() { self.checkAnswer(); });
    var input = document.getElementById('la-input');
    if (input) {
      input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') self.checkAnswer();
      });
    }
  };

  // 词库下拉（阶段0置顶，逻辑与背单词/拼写等一致）
  ListenAlongModule.prototype.populateCategory = function() {
    var sel = document.getElementById('la-category');
    if (!sel || !this.cats) return;
    var self = this;
    sel.innerHTML = '';
    orderCategoriesForDisplay(this.cats).forEach(function(i) {
      var cat = self.cats[i];
      if (!cat || !cat.words) return;
      var opt = document.createElement('option');
      opt.value = i;
      opt.textContent = cat.name + ' (' + cat.words.length + ' 词)';
      sel.appendChild(opt);
    });
    var cur = window.app && window.app.wordModule ? window.app.wordModule.currentCategoryIndex : 0;
    sel.value = String(cur);
  };

  ListenAlongModule.prototype.buildList = function() {
    var sel = document.getElementById('la-category');
    var idx = sel && sel.value !== '' ? parseInt(sel.value) : 0;
    var cat = this.cats && this.cats[idx];
    var shuffleBtn = document.getElementById('la-shuffle');
    this.words = cat && cat.words ? cat.words.slice() : [];
    if (shuffleBtn && shuffleBtn.checked) shuffle(this.words);
    this.index = 0;
    this.correct = 0;
    this.wrong = 0;
    var scoreEl = document.getElementById('la-score');
    if (scoreEl) scoreEl.textContent = '已答对 ' + 0 + ' · 答错 ' + 0;
    var totalEl = document.getElementById('la-total');
    if (totalEl) totalEl.textContent = '共 ' + this.words.length + ' 词';
  };

  ListenAlongModule.prototype.togglePlay = function() {
    if (this.playing) { this.pause(); return; }
    if (!this.words.length) {
      Toast.warning('该词库没有单词');
      return;
    }
    this.playing = true;
    document.getElementById('btn-la-play').innerHTML = '<svg class="icon"><use href="#i-pause"/></svg> 暂停';
    // 从暂停处续播：先渲染当前词，再从头播这个词
    this.renderCurrent(true);
    this.speakSequence();
  };

  ListenAlongModule.prototype.pause = function() {
    this.playing = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.seq++;
    TTSManager.cancel();
    // 暂停/离开时同时停掉 Google/本地 <audio> 与 Web Audio 正在播的声音，
    // 否则 pause 后在线女声还会继续响
    try { if (window.SpeechUtil && SpeechUtil._stopLocalAudio) SpeechUtil._stopLocalAudio(); } catch(e) {}
    var btn = document.getElementById('btn-la-play');
    if (btn) btn.innerHTML = '<svg class="icon"><use href="#i-play"/></svg> 播放';
  };

  // 离开页面时停止（showTab 调用）
  ListenAlongModule.prototype.stop = function() { this.pause(); };

  // 当前词的重复朗读序列：重复 N 次后进入下一个词
  // 用 step 校验防止 onend 与兜底定时器双重推进
  ListenAlongModule.prototype.speakSequence = function() {
    var self = this;
    if (!this.playing || !this.words.length) return;
    var w = this.words[this.index];
    var repeatSel = document.getElementById('la-repeat');
    var repeats = repeatSel ? (parseInt(repeatSel.value) || 1) : 1;
    var rateSel = document.getElementById('la-rate');
    var rate = rateSel ? (parseFloat(rateSel.value) || 0.9) : 0.9;
    var seq = ++this.seq;
    var step = 0;

    function finishStep() {
      if (!self.playing || seq !== self.seq) return;
      step++;
      if (step < repeats) runStep();
      else self.scheduleNext(seq);
    }
    function runStep() {
      if (!self.playing || seq !== self.seq) return;
      var myStep = step;
      // done 防双重推进：慢网下在线声朗读可能超过兜底定时器，onend 和兜底定时器
      // 会先后触发，若都执行 finishStep 会连跳两个词；用 done 保证每步只推进一次。
      var done = false;
      function finish() {
        if (done) return;
        done = true;
        finishStep();
      }
      try {
        SpeechUtil.speak(w.word, 'en-US', { rate: rate, onend: finish });
      } catch(e) {}
      // 兜底：onend 不触发时也继续（已执行的步骤不会重复推进）
      var duration = 700 + String(w.word).length * 140;
      self.timer = setTimeout(function() {
        if (!self.playing || seq !== self.seq) return;
        if (step !== myStep) return;
        finish();
      }, duration + 3000);
    }
    runStep();
  };

  // 按间隔进入下一个词（或按循环模式处理）
  ListenAlongModule.prototype.scheduleNext = function(seq) {
    var self = this;
    var intervalSel = document.getElementById('la-interval');
    var interval = intervalSel ? (INTERVALS[intervalSel.value] || 3000) : 3000;
    this.timer = setTimeout(function() {
      if (!self.playing || seq !== self.seq) return;
      self.next();
      self.speakSequence();
    }, interval + 400);
  };

  ListenAlongModule.prototype.next = function() {
    var modeSel = document.getElementById('la-mode');
    var mode = modeSel ? modeSel.value : 'loop';
    if (mode === 'single') {
      // 单曲循环：重复当前词
      this.repeatLeft = 0;
      return;
    }
    if (this.index >= this.words.length - 1) {
      if (mode === 'once') {
        // 播放一遍：播完即停
        this.pause();
        Toast.success('全部播放完毕');
        return;
      }
      this.index = 0;
    } else {
      this.index++;
    }
    this.renderCurrent(true);
  };

  ListenAlongModule.prototype.renderCurrent = function(hideAnswer) {
    var w = this.words[this.index];
    var wordEl = document.getElementById('la-word');
    var phEl = document.getElementById('la-phonetic');
    var cnEl = document.getElementById('la-chinese');
    var progEl = document.getElementById('la-progress');
    if (!w || !wordEl) return;
    wordEl.textContent = w.word;
    if (phEl) phEl.textContent = w.phonetic || '';
    if (cnEl) cnEl.textContent = w.chinese || '';
    if (progEl) progEl.textContent = '第 ' + (this.index + 1) + ' / ' + this.words.length + ' 词';
    if (hideAnswer) {
      wordEl.classList.remove('la-revealed');
      var mode = document.getElementById('la-write-mode');
      wordEl.classList.toggle('la-hidden-word', !!(mode && mode.checked));
      var input = document.getElementById('la-input');
      if (input) input.value = '';
      var fb = document.getElementById('la-feedback');
      if (fb) fb.textContent = '';
      this.answered = false;
      this.shown = false;
    }
  };

  // 显示答案（听写模式下揭开单词）
  ListenAlongModule.prototype.reveal = function() {
    var w = this.words[this.index];
    var wordEl = document.getElementById('la-word');
    if (!w || !wordEl) return;
    wordEl.classList.remove('la-hidden-word');
    wordEl.classList.add('la-revealed');
    this.shown = true;
    var fb = document.getElementById('la-feedback');
    if (fb) fb.textContent = '';
  };

  // 边听边默写：核对输入
  ListenAlongModule.prototype.checkAnswer = function() {
    var w = this.words[this.index];
    var input = document.getElementById('la-input');
    var fb = document.getElementById('la-feedback');
    if (!w || !input || !fb) return;
    if (this.answered) return;
    var user = input.value.trim().toLowerCase();
    if (!user) { Toast.warning('请输入听到的单词'); return; }
    this.answered = true;
    this.reveal();
    var correct = user === String(w.word).toLowerCase();
    if (correct) {
      this.correct++;
      fb.innerHTML = '<span style="color:var(--success)">✓ 正确！</span>';
    } else {
      this.wrong++;
      fb.innerHTML = '<span style="color:var(--danger)">✗ 正确答案：' + escapeHtml(w.word) + '</span>';
      if (window.app) window.app.addMistake(w, 'listening');
    }
    var scoreEl = document.getElementById('la-score');
    if (scoreEl) scoreEl.textContent = '已答对 ' + this.correct + ' · 答错 ' + this.wrong;
    // 暂停当前朗读，1.8 秒后自动进入下一个词
    var seq = ++this.seq;
    TTSManager.cancel();
    var self = this;
    setTimeout(function() {
      if (seq !== self.seq) return;
      if (self.playing) {
        self.next();
        self.speakSequence();
      } else {
        self.index = (self.index + 1) % self.words.length;
        self.renderCurrent(true);
      }
    }, 1800);
  };

  return ListenAlongModule;
})();

if (typeof window !== 'undefined') window.ListenAlongModule = ListenAlongModule;

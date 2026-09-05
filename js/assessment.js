// ==================== 能力测评模块（Phase 2 全量重做） ====================
// 目标：从现有数据（词库/语法/阅读 + TTS + 语音识别）抽 15 题，覆盖 5 维能力：
//   词汇 vocab / 语法 grammar / 听力 listening / 发音 pronunciation / 阅读 reading
// 输出：等级 + 5 维能力向量 + 推荐词库 + 薄弱项，落 DataStore.assessment，
//       供 onboarding（新手引导）与 AI 教练复用。
// 设计：
//   - 每题带 dim 归属，交卷按 dim 聚合正确率 → vector。
//   - 发音题用 webkitSpeechRecognition + speakScore（app.js:3369）评分，≥60 记对。
//   - 浏览器不支持语音识别时（createPaper({includePron:false})）自动降级为多出词汇/听力题。
//   - 复用 DataStore / Toast / escapeHtml / safeBind / SpeechUtil / TTSManager。
// 入口：AI 教练页「能力测评」按钮 + 首页 CTA + Onboarding 首次引导。
var AssessmentEngine = {
  DIMS: ['vocab', 'grammar', 'listening', 'pron', 'reading'],
  DIM_NAMES: { vocab: '词汇', grammar: '语法', listening: '听力', pron: '发音', reading: '阅读' },
  DIM_TABS: { vocab: 'word', grammar: 'grammar', listening: 'listening', pron: 'speak', reading: 'reading' },

  _sample: function(arr, n) {
    if (!arr || !arr.length) return [];
    // 只需抽 n 个：从池子里随机位置取样，避免对超大池（12 万词）做全量随机排序
    if (arr.length > n * 3) {
      var picked = [], seen = new Set();
      var guard = 0;
      while (picked.length < n && guard < 1000) {
        guard++;
        var i = Math.floor(Math.random() * arr.length);
        if (!seen.has(i)) { seen.add(i); picked.push(arr[i]); }
      }
      return picked;
    }
    var out = arr.slice().sort(function() { return Math.random() - 0.5; });
    return out.slice(0, n);
  },

  // 干扰项：从全词库中文释义里抽 n 个（排除目标中文），不足则兜底通用词。
  // 词库在运行时固定，首次构建后缓存整个「中文释义池」，避免每题重复遍历数万词。
  _distractors: function(avoid, n) {
    var cats = (DataStore.getDefaultWords().categories) || [];
    var count = 0;
    cats.forEach(function(c) { if (c && c.words) count += c.words.length; });
    if (!this._distractorPool || this._distractorPoolKey !== count) {
      var pool = [];
      var map = {};
      cats.forEach(function(c) {
        (c.words || []).forEach(function(w) {
          var t = w.chinese;
          // 用哈希去重代替 pool.indexOf：60k 词池下 indexOf 是 O(n²)（约 1.5s），
          // 这就是点击「开始测评」卡顿的根因。
          if (t && !map[t]) { map[t] = true; pool.push(t); }
        });
      });
      this._distractorPool = pool;
      this._distractorPoolKey = count;
    }
    var pool = this._distractorPool.slice(); // 总是操作副本，避免污染缓存池
    if (pool.length < n + 1) pool = pool.concat(['正确', '错误', '答案', '词汇', '短语']);
    var seen = {}, out = [];
    // 部分 Fisher-Yates：只需抽够 n 个不同的释义即可，不做全池随机排序。
    // 之前 pool.slice().sort(随机) 每次出卷都要排 60k 词全池（约 1.5s），点击「开始测评」卡顿的根因。
    var m = pool.length, guard = 0, limit = 0;
    while (out.length < n && guard < m && limit < 10000) {
      var idx = Math.floor(Math.random() * (m - guard));
      var val = pool[idx];
      pool[idx] = pool[m - 1 - guard];
      pool[m - 1 - guard] = val;
      guard++;
      limit++;
      if (val !== avoid && !seen[val]) { seen[val] = true; out.push(val); }
    }
    return out;
  },

  // 收集一个「按阶段排序」的非字母词池，用于词汇/听力/发音抽题。
  // 词库运行时固定，按总词数做失效键缓存，避免每次出卷重新排序数万词。
  _orderedWordPool: function() {
    var cats = (DataStore.getDefaultWords().categories) || [];
    var count = 0;
    cats.forEach(function(c) { if (c && c.words) count += c.words.length; });
    if (this._wordPool && this._wordPoolKey === count) return this._wordPool;
    var pool = [];
    var byStage = {};
    cats.slice()
      .sort(function(a, b) { return (a.stage || 99) - (b.stage || 99); })
      .forEach(function(c) {
        if (!c || c.stage === 0 || !c.words) return;
        (byStage[c.stage] = byStage[c.stage] || []);
        c.words.forEach(function(w) {
          if (w && w.word && w.chinese) {
            var e = { word: w.word, phonetic: w.phonetic || '', chinese: w.chinese, stage: c.stage || 99 };
            pool.push(e);
            byStage[c.stage].push(e);
          }
        });
      });
    this._wordPool = pool;
    this._wordPoolByStage = byStage;
    this._wordPoolKey = count;
    return pool;
  },

  // 按难度区间取词：stages 形如 [1,4]，取该区间的词，用于区分基础/进阶/挑战
  // 直接用按阶段分桶缓存拼结果，避免对 12 万词池反复全量 filter
  _wordsByStageRange: function(pool, lo, hi) {
    var buckets = this._wordPoolByStage;
    if (buckets) {
      var out = [];
      for (var st = lo; st <= hi; st++) {
        if (buckets[st]) for (var i = 0; i < buckets[st].length; i++) out.push(buckets[st][i]);
      }
      return out;
    }
    return pool.filter(function(w) { return w.stage >= lo && w.stage <= hi; });
  },

  // ==================== 出卷 ====================
  // opts: { includePron: bool }，返回 { questions:[...], meta:{...} }
  createPaper: function(opts) {
    opts = opts || {};
    var includePron = opts.includePron !== false;
    var pool = this._orderedWordPool();
    // 防御：词库为空时无法出卷，返回空卷（grade 会对空卷安全兜底为 newcomer/0 分）
    if (!pool.length) {
      return { questions: [], meta: { total: 0, dims: [], perDim: 3, hasPron: false } };
    }
    var dims = this.DIMS.filter(function(d) { return d !== 'pron' || includePron; });
    var questions = [];

    // 上次测评用过的题目 key（单词+中文 / 语法题面 / 阅读题面），本次出卷尽量避开，
    // 保证连续两次测评的题目尽可能不一样。
    var lastKeys = DataStore.getProgress('assessment_last_keys', []) || [];
    function isUsed(key) { return lastKeys.indexOf(key) !== -1; }
    function wkey(w) { return (w.word || '') + '\u0001' + (w.chinese || ''); }

    var self = this;

    // 词汇/听力共用词池，各抽 3 题：一易一中一难（对应基本/进阶/挑战）
    function wordQuestions(dim, usedWords) {
      var ranges = [[1, 2], [2, 4], [3, 99]];
      return ranges.map(function(rng, i) {
        var cand = self._wordsByStageRange(pool, rng[0], rng[1]).filter(function(w) {
          return !isUsed(wkey(w));
        });
        var picked = null;
        for (var k = 0; k < cand.length && !picked; k++) {
          var w = cand[k];
          var key = w.word + '\u0001' + w.chinese;
          if (usedWords.indexOf(key) === -1) { usedWords.push(key); picked = w; }
        }
        if (!picked) {
          var any = pool[i % pool.length];
          for (var kk = 0; kk < pool.length; kk++) {
            if (!isUsed(wkey(pool[kk]))) { any = pool[kk]; break; }
          }
          picked = { word: any.word, phonetic: any.phonetic, chinese: any.chinese, stage: any.stage };
          usedWords.push(picked.word + '\u0001' + picked.chinese);
        }
        var opts2 = self._distractors(picked.chinese, 3);
        opts2.push(picked.chinese);
        opts2 = opts2.sort(function() { return Math.random() - 0.5; });
        return {
          id: 'x',
          dim: dim,
          word: picked.word,
          phonetic: picked.phonetic,
          chinese: picked.chinese,
          options: opts2,
          answerIndex: opts2.indexOf(picked.chinese),
          stage: picked.stage
        };
      });
    }

    var usedWords = [];
    var vocabQs = wordQuestions('vocab', usedWords);
    var listenQs = wordQuestions('listening', usedWords);

    // 发音：选简单短词（2-6 字母，音节少便于识别），3 题；
    // 排除已在词汇/听力里用过的单词，避免同词在不同题型重复出现
    var pronQs = [];
    if (includePron) {
      var used = {};
      usedWords.forEach(function(k) { used[k] = 1; });
      var pronCond = function(w) {
        var n = String(w.word).length;
        return n >= 2 && n <= 6 && /^[a-z]+$/i.test(w.word) && w.stage >= 1 && w.stage <= 4
          && !used[w.word + '\u0001' + w.chinese];
      };
      var pronPool = pool.filter(function(w) {
        var n = String(w.word).length;
        return n >= 2 && n <= 6 && /^[a-z]+$/i.test(w.word) && w.stage >= 1 && w.stage <= 4
          && !used[w.word + '\u0001' + w.chinese] && !isUsed(wkey(w));
      });
      if (pronPool.length < 3) pronPool = pool.filter(pronCond);
      pronQs = this._sample(pronPool, 3).map(function(w) {
        return { id: 'x', dim: 'pron', word: w.word, phonetic: w.phonetic, chinese: w.chinese };
      });
    }

    // 语法：只用四选一选择题
    var grammarPool = (DataStore.getDefaultGrammar() || []).filter(function(ex) {
      return ex && ex.type === 'choice' && ex.options && ex.options.length === 4 && typeof ex.answer === 'number';
    });
    var grammarFresh = grammarPool.filter(function(ex) {
      return !isUsed('g:' + ex.question);
    });
    var grammarSrc = grammarFresh.length >= 3 ? grammarFresh : grammarPool;
    var grammarQs = this._sample(grammarSrc, 3).map(function(ex) {
      return {
        id: 'x', dim: 'grammar',
        question: ex.question, options: ex.options.slice(),
        answerIndex: ex.answer, explanation: ex.explanation || '', topic: ex.topic || ''
      };
    });
    // 语法数据不足时用词汇补位
    while (grammarQs.length < 3 && usedWords.length < 200) {
      grammarQs.push(wordQuestions('grammar', usedWords)[0]);
    }

    // 阅读：从阅读语料里抽 3 道题（可跨篇），题配短文节选
    var readingPool = [];
    (DataStore.getDefaultReading() || []).forEach(function(r) {
      if (!r || !r.questions) return;
      var excerpt = String(r.text || '').replace(/\s+/g, ' ').slice(0, 420);
      (r.questions || []).forEach(function(q) {
        if (q && q.question && q.options && q.options.length === 4 && typeof q.answer === 'number') {
          readingPool.push({ title: r.title || '', excerpt: excerpt, q: q });
        }
      });
    });
    var readingFresh = readingPool.filter(function(it) {
      return !isUsed('r:' + it.q.question);
    });
    var readingSrc = readingFresh.length >= 3 ? readingFresh : readingPool;
    var readingQs = this._sample(readingSrc, 3).map(function(it) {
      return {
        id: 'x', dim: 'reading',
        title: it.title, excerpt: it.excerpt,
        question: it.q.question, options: it.q.options.slice(),
        answerIndex: it.q.answer, explanation: it.q.explanation || ''
      };
    });
    // 阅读数据不足时用词汇补位
    while (readingQs.length < 3 && usedWords.length < 200) {
      readingQs.push(wordQuestions('reading', usedWords)[0]);
    }

    // 组装并按 dim 分组顺序排：vocab, grammar, listening, pron, reading（每维 3 题）
    var order = dims;
    var byDim = { vocab: vocabQs, grammar: grammarQs, listening: listenQs, pron: pronQs, reading: readingQs };
    order.forEach(function(d) {
      (byDim[d] || []).forEach(function(q) {
        q.id = questions.length;
        q.tier = questions.length < order.length * 1 ? 'basic' : (questions.length < order.length * 2 ? 'mid' : 'challenge');
        questions.push(q);
      });
    });

    var meta = {
      total: questions.length,
      dims: order,
      perDim: 3,
      hasPron: includePron && pronQs.length > 0
    };
    // 记录本卷用过的题，供下次出卷规避，实现「每次测评的题目不一样」
    var keys = questions.map(function(q) {
      if (q.dim === 'grammar') return 'g:' + q.question;
      if (q.dim === 'reading') return 'r:' + q.question;
      return wkey(q);
    });
    DataStore.setProgress('assessment_last_keys', keys.slice(0, 120));
    return { questions: questions, meta: meta };
  },

  // ==================== 交卷评分 ====================
  // answers: [{ dim, correct }]（发音题 correct 由 speakScore 运行期判定）
  grade: function(answers) {
    var total = 0, dimTotal = {}, dimCorrect = {};
    answers.forEach(function(a) {
      if (a.selected === 'skip') return; // 跳过题不计分（与「已跳过（不计分）」文案一致）
      var d = a.dim || 'vocab';
      total++;
      dimTotal[d] = (dimTotal[d] || 0) + 1;
      if (a.correct) dimCorrect[d] = (dimCorrect[d] || 0) + 1;
    });
    var vector = {};
    this.DIMS.forEach(function(d) {
      var t = dimTotal[d] || 0;
      vector[d] = t ? Math.round((dimCorrect[d] || 0) / t * 100) : 0;
    });
    var correct = answers.filter(function(a) { return a.correct; }).length;
    var score = total > 0 ? Math.round(correct / total * 100) : 0; // 全跳过时避免除零 NaN
    var level = score >= 85 ? 'advanced' : score >= 70 ? 'intermediate' : score >= 50 ? 'basic' : score >= 30 ? 'beginner' : 'newcomer';
    // 薄弱项：有数据且得分 < 70 的最低维度；全部达标则无薄弱项
    var weakDim = null, weakVal = 70;
    this.DIMS.forEach(function(d) {
      if (dimTotal[d] && vector[d] < weakVal) { weakVal = vector[d]; weakDim = d; }
    });
    var rec = this._recommend(level, vector);
    return {
      level: level,
      score: score,
      vector: vector,
      correct: correct,
      total: total,
      weakDim: weakDim,
      weakName: this.DIM_NAMES[weakDim] || '',
      recommendStage: rec ? rec.stage : null,
      recommendIndex: rec ? rec.index : null,
      recommendName: rec ? rec.name : '',
      date: getLocalDateStr ? getLocalDateStr() : (new Date().toISOString().slice(0, 10))
    };
  },

  // 按等级推荐词库（结合薄弱项所在维度调整起点）
  _recommend: function(level, vector) {
    var cats = DataStore.getDefaultWords().categories || [];
    if (!cats.length) return null;
    var pick = function(list) {
      if (!list.length) return null;
      var c = list[Math.floor(Math.random() * list.length)];
      return { stage: c.stage, index: cats.indexOf(c), name: c.name };
    };
    if (level === 'advanced') return pick(cats.filter(function(c) { return c.stage >= 4; }));
    if (level === 'intermediate') return pick(cats.filter(function(c) { return c.stage >= 2 && c.stage <= 3; }));
    if (level === 'basic') return pick(cats.filter(function(c) { return c.stage >= 1 && c.stage <= 2; }));
    return pick(cats.filter(function(c) { return c.stage === 0 || c.stage === 1; }));
  },

  // 给 onboarding / AI 教练生成一句个性化学习计划要点（规则版）
  buildPlan: function(res, dailyGoal) {
    var goal = dailyGoal || 10;
    var lines = [];
    var weak = res.weakName ? res.weakName + '能力较弱' : '各项能力较均衡';
    lines.push('建议每日新学 ' + goal + ' 个单词，配合复习保持记忆曲线');
    if (res.recommendName) lines.push('优先学习推荐词库：「' + res.recommendName + '」');
    if (res.weakDim === 'pron') lines.push('多开口跟读，用「口语练习」逐个纠音');
    else if (res.weakDim === 'listening') lines.push('每天做 1 组「听力训练」，先听大意再抠细节');
    else if (res.weakDim === 'grammar') lines.push('每天做几道「语法练习」，把错题收集进错题本');
    else if (res.weakDim === 'reading') lines.push('每周读 2 篇短文，遇到生词先猜再查');
    else if (res.weakDim === 'vocab' || res.weakDim) lines.push('重点扩充词汇量，每天复习昨天的生词');
    return { weak: weak, lines: lines };
  }
};

// ==================== 测评 UI（弹窗 + 作答 + 结果） ====================
var AssessmentModule = (function() {
  function AssessmentModule() {
    this._paper = null;
    this._cur = 0;
    this._answers = [];
    this._recognition = null;
    this._onComplete = null; // 交卷回调（onboarding 用）：function(result)
    this.bindings();
  }

  AssessmentModule.prototype.bindings = function() {
    var self = this;
    safeBind('btn-assessment', 'click', function() { self.open(); });
    safeBind('btn-assessment-start', 'click', function() { self.start(); });
    safeBind('btn-assessment-close', 'click', function() { self.close(); });
    safeBind('btn-assessment-again', 'click', function() { self.start(); });
    var modal = document.getElementById('assessment-modal');
    if (modal) {
      modal.addEventListener('click', function(e) { if (e.target === modal) self.close(); });
      var doneBtn = modal.querySelector('[data-assessment-close]');
      if (doneBtn) doneBtn.addEventListener('click', function() { self.close(); });
      var rc = modal.querySelector('[data-assessment-review-close]');
      if (rc) rc.addEventListener('click', function() { self._toggleReview(); });
    }
    document.addEventListener('keydown', function(e) { if (e.key === 'Escape' && self._open) self.close(); });
  };

  AssessmentModule.prototype.open = function() {
    var modal = document.getElementById('assessment-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    this._open = true;
    this._route('welcome');
  };

  AssessmentModule.prototype.close = function() {
    var modal = document.getElementById('assessment-modal');
    if (modal) modal.classList.add('hidden');
    this._open = false;
    this._stopListen();
    if (this._recognition) { try { this._recognition.abort(); } catch(e) {} this._recognition = null; }
  };

  AssessmentModule.prototype._stopListen = function() {
    try { if (window.TTSManager && window.TTSManager.cancel) window.TTSManager.cancel(); } catch(e) {}
  };

  AssessmentModule.prototype.start = function() {
    // 重新开卷前中止上一轮遗留在进行的语音识别，并清掉题号索引，
    // 否则旧识别结果异步返回时会把分数写进新试卷的错位题位上
    if (this._recognition) { try { this._recognition.stop(); } catch(e) {} this._recognition = null; }
    this._recIndex = undefined;
    this._finished = false;
    var includePron = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    var made = AssessmentEngine.createPaper({ includePron: includePron });
    if (!made.questions || !made.questions.length) {
      Toast.error('词库数据为空，无法生成测评，请稍后再试');
      return;
    }
    this._paper = made.questions;
    this._meta = made.meta;
    this._cur = 0;
    this._answers = this._paper.map(function(q) {
      return { dim: q.dim, correct: false, selected: '' };
    });
    this._route('quiz');
  };

  AssessmentModule.prototype._route = function(view, data) {
    var modal = document.getElementById('assessment-modal');
    if (!modal) return;
    var views = modal.querySelectorAll('.assess-view');
    Array.prototype.forEach.call(views, function(v) { v.style.display = 'none'; });
    var target = modal.querySelector('.assess-view-' + view);
    if (target) target.style.display = ''; // 恢复 CSS 默认（quiz 为 flex 纵向布局）
    if (view === 'quiz') this._renderQuestion();
    if (view === 'result' && data) this._renderResult(data);
  };

  AssessmentModule.prototype._curQ = function() { return this._paper ? this._paper[this._cur] : null; };

  AssessmentModule.prototype._progressUI = function() {
    var prog = document.getElementById('assess-progress-text');
    if (prog) prog.textContent = '第 ' + (this._cur + 1) + ' / ' + this._paper.length + ' 题';
    var fill = document.getElementById('assess-progress-fill');
    if (fill) fill.style.width = ((this._cur + 1) / this._paper.length * 100) + '%';
  };

  AssessmentModule.prototype._renderQuestion = function() {
    var q = this._curQ();
    var body = document.getElementById('assess-quiz-body');
    if (!q || !body) return;
    // 回到题目视图时收起答题卡，并恢复题目区显示
    var rv = document.getElementById('assess-review');
    if (rv) rv.classList.add('hidden');
    if (body) body.style.display = '';
    var self = this;
    this._progressUI();
    var ans = this._answers[this._cur];
    var dimName = AssessmentEngine.DIM_NAMES[q.dim] || '词汇';
    var answered = ans && ans.selected;
    var head = '<div class="assess-q-head"><svg class="icon"><use href="#i-target"/></svg>' + dimName + '能力 <span class="assess-tier">'
      + (q.tier === 'basic' ? '基础' : q.tier === 'mid' ? '进阶' : '挑战') + '</span></div>'
      + (answered ? '<span class="assess-q-answered">已作答' + (q.dim !== 'pron' ? ' · 可点击其他选项修改' : ' · 可重录') + '</span>' : '');

    if (q.dim === 'vocab' || q.dim === 'grammar' || q.dim === 'reading') {
      var main;
      if (q.dim === 'vocab') {
        main = '<div class="assess-q-word">' + escapeHtml(q.word) + '</div>'
          + '<div class="assess-q-phon">' + escapeHtml(q.phonetic || '') + '</div>'
          + '<div class="assess-q-prompt">请选择正确的释义：</div>';
      } else if (q.dim === 'grammar') {
        main = '<div class="assess-q-word" style="font-size:1.05rem;line-height:1.6">' + escapeHtml(q.question) + '</div>'
          + '<div class="assess-q-prompt">请选择正确的选项：</div>';
      } else {
        main = '<div class="assess-reading-title">' + escapeHtml(q.title || '阅读理解') + '</div>'
          + '<div class="assess-reading-excerpt">' + escapeHtml(q.excerpt) + '…</div>'
          + '<div class="assess-q-word" style="font-size:1.02rem">' + escapeHtml(q.question) + '</div>'
          + '<div class="assess-q-prompt">请选择正确选项：</div>';
      }
      body.innerHTML = head + main
        + '<div class="assess-options">'
        + (q.options || []).map(function(opt, i) {
          return '<button type="button" class="assess-option" data-idx="' + i + '"><span class="assess-opt-key">' + String.fromCharCode(65 + i) + '</span><span class="assess-opt-text">' + escapeHtml(opt) + '</span></button>';
        }).join('')
        + '</div>'
        + '<div class="assess-feedback hidden" id="assess-feedback"></div>';
      this._bindOptions(q);
      if (answered && answered !== 'skip') this._markAnswered(q, ans);
      this._renderNav();
      return;
    }

    if (q.dim === 'listening') {
      this._playWord(q.word);
      body.innerHTML = head
        + '<div class="assess-q-chinese">请听发音，选择对应的释义</div>'
        + '<div class="assess-options">'
        + (q.options || []).map(function(opt, i) {
          return '<button type="button" class="assess-option" data-idx="' + i + '"><span class="assess-opt-key">' + String.fromCharCode(65 + i) + '</span><span class="assess-opt-text">' + escapeHtml(opt) + '</span></button>';
        }).join('')
        + '</div>'
        + '<div class="assess-feedback hidden" id="assess-feedback"></div>';
      var playBtn = document.createElement('button');
      playBtn.type = 'button';
      playBtn.className = 'btn btn-sm';
      playBtn.style.marginBottom = 'var(--sp-3)';
      playBtn.innerHTML = '<svg class="icon"><use href="#i-volume"/></svg> 重听发音';
      playBtn.addEventListener('click', function() { self._playWord(q.word); });
      body.insertBefore(playBtn, body.querySelector('.assess-options'));
      this._bindOptions(q);
      if (answered && answered !== 'skip') this._markAnswered(q, ans);
      this._renderNav();
      return;
    }

    // 跟读评分题：听标准音 → 录音 → speakScore
    body.innerHTML = head
      + '<div class="assess-q-word">' + escapeHtml(q.word) + '</div>'
      + '<div class="assess-q-phon">' + escapeHtml(q.phonetic || '') + '</div>'
      + '<div class="assess-q-chinese" style="color:var(--text-secondary);font-size:0.95rem">' + escapeHtml(q.chinese || '') + '</div>'
      + '<div class="assess-pron-actions">'
      + '<button type="button" class="btn btn-sm" id="btn-assess-pron-play"><svg class="icon"><use href="#i-volume"/></svg> 听标准音</button>'
      + '<button type="button" class="btn btn-primary btn-sm" id="btn-assess-pron-record"><svg class="icon"><use href="#i-mic"/></svg> ' + (answered ? '重新朗读' : '开始朗读') + '</button>'
      + '</div>'
      + '<div class="assess-pron-result hidden" id="assess-pron-result"></div>'
      + '<div class="assess-pron-skip-row"><button type="button" class="btn btn-sm" id="btn-assess-pron-skip">发音题答不出？跳过</button></div>';
    var playBtn2 = document.getElementById('btn-assess-pron-play');
    if (playBtn2) playBtn2.addEventListener('click', function() { self._playWord(q.word); });
    var skipBtn = document.getElementById('btn-assess-pron-skip');
    if (skipBtn) skipBtn.addEventListener('click', function() {
      var a = self._answers[self._cur];
      a.selected = 'skip'; a.correct = false;
      self._showPronResult(false, '已跳过（不计分），将自动进入下一题');
      self._next();
    });
    var recBtn = document.getElementById('btn-assess-pron-record');
    if (recBtn) recBtn.addEventListener('click', function() { self._recordPron(q); });
    if (answered) {
      // 回看已答发音题：显示上次结果，保留「重新朗读 / 听标准音」按钮供修改
      var pr = document.getElementById('assess-pron-result');
      if (pr) {
        pr.classList.remove('hidden');
        if (ans.selected === 'skip') {
          pr.className = 'assess-pron-result assess-pron-mid';
          pr.innerHTML = '已跳过此题（不计分），可重新朗读作答';
        } else {
          pr.className = 'assess-pron-result ' + (ans.correct ? 'assess-pron-good' : 'assess-pron-mid');
          pr.innerHTML = (ans.correct ? '✓ 已通过' : '未达 60 分，可再次尝试') + '<div class="assess-pron-info">重新朗读后可覆盖本次成绩</div>';
        }
      }
    }
    this._renderNav();
  };

  // 绑定选择题选项点击（词汇/语法/阅读/听力通用）
  AssessmentModule.prototype._bindOptions = function(q) {
    var self = this;
    var body = document.getElementById('assess-quiz-body');
    if (!body) return;
    setTimeout(function() {
      var btns = body.querySelectorAll('.assess-option');
      Array.prototype.forEach.call(btns, function(b) {
        b.addEventListener('click', function() {
          self._pick(q, parseInt(b.getAttribute('data-idx'), 10));
        });
      });
    }, 0);
  };

  // 作答：记录答案 + 高亮对错 + 内联反馈（不自动跳题，由「下一题」推进）
  AssessmentModule.prototype._pick = function(q, idx) {
    // 防快速连点错位：绑定回调闭包里的 q 可能已是上一题（_bindOptions 用 setTimeout 绑定，
    // 连点时旧题的点击可能在新题渲染后到达），此处的 current question 必须与 q 一致才落笔
    if (this._curQ() !== q) return;
    if (!this._answers[this._cur]) return;
    var ans = this._answers[this._cur];
    ans.correct = idx === q.answerIndex;
    ans.selected = String(idx);
    this._markAnswered(q, ans);
    this._renderNav();
  };

  AssessmentModule.prototype._markAnswered = function(q, ans) {
    var body = document.getElementById('assess-quiz-body');
    if (!body) return;
    var idx = parseInt(ans.selected, 10);
    Array.prototype.forEach.call(body.querySelectorAll('.assess-option'), function(b, i) {
      b.classList.remove('selected', 'correct', 'wrong');
      if (i === q.answerIndex) b.classList.add('correct');
      if (i === idx && ans.correct) b.classList.add('selected');
      else if (i === idx && !ans.correct) b.classList.add('selected', 'wrong');
    });
    var fb = body.querySelector('.assess-feedback') || document.getElementById('assess-feedback');
    if (!fb) return;
    fb.classList.remove('hidden');
    var html;
    if (ans.correct) {
      html = '<div class="assess-fb assess-fb-ok"><svg class="icon"><use href="#i-check"/></svg> 回答正确</div>';
    } else {
      html = '<div class="assess-fb assess-fb-no"><svg class="icon"><use href="#i-error"/></svg> 正确答案：<b>' + escapeHtml((q.options || [])[q.answerIndex]) + '</b>'
        + (q.explanation ? '<div class="assess-fb-explain">' + escapeHtml(q.explanation) + '</div>' : '')
        + '</div>';
    }
    fb.innerHTML = html;
  };

  AssessmentModule.prototype._playWord = function(word) {
    if (!window.SpeechUtil) return;
    if (window.SpeechUtil.speakWord) window.SpeechUtil.speakWord(word);
    else window.SpeechUtil.speak(word, 'en-US');
  };

  AssessmentModule.prototype._recordPron = function(q) {
    if (!(window.SpeechRecognition || window.webkitSpeechRecognition)) {
      Toast.error('浏览器不支持语音识别');
      return;
    }
    var self = this;
    if (this._recognition) { try { this._recognition.stop(); } catch(e) {} this._recognition = null; }
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    var rec = new SR();
    this._recognition = rec;
    this._recIndex = this._cur; // 记住所属题号，防止结果返回时用户已跳题
    rec.lang = 'en-US';
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = function(event) {
      var transcript = event.results[0][0].transcript || '';
      self._scorePron(q, transcript);
    };
    rec.onerror = function(e) {
      Toast.error('语音识别失败' + (e.error ? '：' + e.error : ''));
      var b = document.getElementById('btn-assess-pron-record');
      if (b) b.disabled = false;
    };
    rec.onend = function() {
      if (self._recognition === rec) self._recognition = null;
      // 未出结果（超时/静音/提前结束）时恢复录音按钮，避免卡死在禁用态
      var b = document.getElementById('btn-assess-pron-record');
      if (b) b.disabled = false;
    };
    try {
      rec.start();
      var b = document.getElementById('btn-assess-pron-record');
      if (b) b.disabled = true;
      Toast.info('请开始朗读...');
    } catch(e) {
      Toast.error('无法启动语音识别');
      this._recognition = null;
      var b2 = document.getElementById('btn-assess-pron-record');
      if (b2) b2.disabled = false;
    }
  };

  AssessmentModule.prototype._showPronResult = function(ok, msg) {
    var box = document.getElementById('assess-pron-result');
    if (!box) return;
    box.classList.remove('hidden');
    box.className = 'assess-pron-result ' + (ok ? 'assess-pron-good' : 'assess-pron-mid');
    box.innerHTML = msg;
  };

  AssessmentModule.prototype._scorePron = function(q, transcript) {
    var spoken = speakNormalize(transcript);
    var targetW = speakNormalize(q.word);
    var isLetter = targetW.length === 1;
    var exact = isLetter
      ? (SPEAK_LETTER_PRON[spoken] === targetW || spoken === targetW)
      : (spoken === targetW);
    var res = speakScore(targetW, spoken, isLetter, exact);
    var idx = typeof this._recIndex === 'number' ? this._recIndex : this._cur;
    var ans = this._answers[idx] || this._answers[this._cur];
    ans.correct = res.score >= 60;
    ans.selected = 'spoken';
    if (idx === this._cur) {
      this._showPronResult(ans.correct,
        (ans.correct ? '<svg class="icon"><use href="#i-check"/></svg> 发音得分 <b>' + res.score + '</b> 分（通过）'
                      : '<svg class="icon"><use href="#i-error"/></svg> 得分 ' + res.score + ' 分（未达 60 分）')
          + (res.tips && res.tips.length ? '<div class="assess-pron-tips">' + escapeHtml(res.tips[0]) + '</div>' : '')
          + '<div class="assess-pron-info">可点击「重新朗读」再次尝试</div>');
    } else {
      Toast.info('第 ' + (idx + 1) + ' 题发音得分 ' + res.score + ' 分');
    }
    var rb = document.getElementById('btn-assess-pron-record');
    if (rb) rb.disabled = false;
    this._renderNav();
  };

  AssessmentModule.prototype._renderNav = function() {
    var nav = document.getElementById('assessment-nav');
    if (!nav) return;
    var self = this;
    var isLast = this._cur >= this._paper.length - 1;
    var answered = this._answers[this._cur] && this._answers[this._cur].selected;
    var q = this._curQ();
    var isPron = q && q.dim === 'pron';
    // pron 题不设「必须作答才能前进」门槛：麦克风不可用/不授权时也能跳过前进，避免卡死在当前页
    var disabled = (answered || isPron) ? '' : ' disabled';
    nav.innerHTML = '<button type="button" class="btn btn-sm" id="btn-assessment-prev"' + (this._cur === 0 ? ' disabled' : '') + '><svg class="icon"><use href="#i-chevron-left"/></svg>上一题</button>'
      + '<button type="button" class="btn btn-sm" id="btn-assessment-review"><svg class="icon"><use href="#i-list"/></svg>答题卡</button>'
      + (isLast
        ? '<button type="button" class="btn btn-primary btn-sm" id="btn-assessment-finish"' + disabled + '>交卷</button>'
        : '<button type="button" class="btn btn-primary btn-sm" id="btn-assessment-next"' + disabled + '>下一题<svg class="icon"><use href="#i-chevron-right"/></svg></button>');
    var p = document.getElementById('btn-assessment-prev');
    if (p) p.addEventListener('click', function() { self.prev(); });
    var r = document.getElementById('btn-assessment-review');
    if (r) r.addEventListener('click', function() { self._toggleReview(); });
    var n = document.getElementById('btn-assessment-next');
    if (n) n.addEventListener('click', function() { self.next(); });
    var f = document.getElementById('btn-assessment-finish');
    if (f) f.addEventListener('click', function() { self.finish(); });
  };

  // 答题卡：网格展示全卷作答状态，点击任意题号跳转回看/修改
  AssessmentModule.prototype._toggleReview = function() {
    var rv = document.getElementById('assess-review');
    var body = document.getElementById('assess-quiz-body');
    if (!rv || !body) return;
    var open = rv.classList.contains('hidden');
    rv.classList.toggle('hidden');
    body.style.display = open ? 'none' : '';
    if (open) this._renderReviewGrid();
  };

  AssessmentModule.prototype._renderReviewGrid = function() {
    var grid = document.getElementById('assess-review-grid');
    if (!grid) return;
    var self = this;
    var count = 0;
    grid.innerHTML = this._paper.map(function(q, i) {
      var a = self._answers[i];
      if (a && a.selected) count++;
      var cls = 'ar-num' + (a && a.selected ? ' done' : '') + (i === self._cur ? ' cur' : '');
      return '<button type="button" class="' + cls + '" data-r="' + i + '">' + (i + 1) + '</button>';
    }).join('');
    var countEl = document.getElementById('assess-review-count');
    if (countEl) countEl.textContent = count;
    var totalEl = document.getElementById('assess-review-total');
    if (totalEl) totalEl.textContent = this._paper.length;
    grid.querySelectorAll('[data-r]').forEach(function(b) {
      b.addEventListener('click', function() {
        var i = parseInt(b.getAttribute('data-r'), 10);
        self._cur = i;
        self._route('quiz');
      });
    });
  };

  AssessmentModule.prototype._move = function(dir) {
    if (this._nextLock) return; // 防连点：双击跳两题
    this._nextLock = true;
    var self = this;
    setTimeout(function() { self._nextLock = false; }, 250);
    var target = this._cur + dir;
    if (target >= 0 && target < this._paper.length) { this._cur = target; this._route('quiz'); }
  };

  AssessmentModule.prototype.next = function() {
    this._move(1);
  };

  AssessmentModule.prototype.prev = function() {
    this._move(-1);
  };

  AssessmentModule.prototype._next = function() {
    if (this._cur < this._paper.length - 1) { this._move(1); }
    else this.finish();
  };

  AssessmentModule.prototype.finish = function() {
    if (this._finished) return; // 幂等守卫：双击交卷/重复触发只入账一次
    this._finished = true;
    var self = this;
    var unanswered = [];
    this._answers.forEach(function(a, i) {
      if (a.selected) return;
      var q = self._paper[i];
      if (q && q.dim === 'pron') a.selected = 'skip'; // 未录的发音题自动按跳过（不计分）
      else unanswered.push(i + 1);
    });
    if (unanswered.length) {
      this._finished = false; // 未满足交卷条件时允许再次尝试
      Toast.warning('还有 ' + unanswered.length + ' 题未作答，请完成后再交卷');
      return;
    }
    var res = AssessmentEngine.grade(this._answers);
    res.date = res.date || (getLocalDateStr ? getLocalDateStr() : '');
    // 历史成绩：最新在前，保留最近 10 次，供结果页横向对比
    var hist = DataStore.getProgress('assessment_history');
    if (!Array.isArray(hist)) hist = []; // 防旧版/损坏数据存成非数组导致交卷崩溃
    hist.unshift({ date: res.date, score: res.score, level: res.level });
    if (hist.length > 10) hist.length = 10;
    DataStore.setProgress('assessment_history', hist);
    DataStore.setProgress('assessment', res);
    // P0-04 事件通知：测评完成（订阅方可刷新 AI 建议等）
    if (window.EventBus && window.MS && window.MS.EVENTS) {
      window.EventBus.emit(window.MS.EVENTS.ASSESSMENT_COMPLETED, { score: res.score, level: res.level, date: res.date });
    }
    this._route('result', res);
    if (this._onComplete) { var cb = this._onComplete; this._onComplete = null; cb(res); }
  };

    // 五维雷达图（SVG）
  AssessmentModule.prototype._radarSVG = function(vector) {
    var dims = AssessmentEngine.DIMS;
    var cx = 130, cy = 130, R = 95;
    var n = dims.length;
    function pt(i, r) {
      var ang = -Math.PI / 2 + i * 2 * Math.PI / n;
      return (cx + r * Math.cos(ang)).toFixed(1) + ',' + (cy + r * Math.sin(ang)).toFixed(1);
    }
    function poly(frac) {
      var p = [];
      for (var i = 0; i < n; i++) p.push(pt(i, R * frac));
      return p.join(' ');
    }
    var rings = [0.2, 0.4, 0.6, 0.8, 1].map(function(f) {
      return '<polygon points="' + poly(f) + '" fill="none" stroke="var(--border)" stroke-width="1"/>';
    }).join('');
    var axes = dims.map(function(d, i) {
      return '<line x1="130" y1="130" x2="' + pt(i, 1).split(',')[0] + '" y2="' + pt(i, 1).split(',')[1] + '" stroke="var(--border)" stroke-width="1"/>';
    }).join('');
    var labels = dims.map(function(d, i) {
      var p = pt(i, R * 1.18).split(',');
      var anchors = ['middle', 'start', 'middle', 'middle', 'end'];
      var anchor = anchors[i] || 'end';
      return '<text x="' + p[0] + '" y="' + p[1] + '" text-anchor="' + anchor + '" class="ar-label">' + AssessmentEngine.DIM_NAMES[d] + '</text>';
    }).join('');
    var dataPts = dims.map(function(d, i) {
      var v = Math.max(0, Math.min(100, vector[d] || 0));
      return pt(i, v / 100 * R);
    }).join(' ');
    return '<svg viewBox="0 0 260 260" role="img" aria-label="能力雷达图">'
      + rings + axes + labels
      + '<polygon points="' + dataPts + '" fill="rgba(124,157,255,0.20)" stroke="#7c9dff" stroke-width="2" stroke-linejoin="round"/>'
      + dims.map(function(d, i) {
          var v = vector[d] || 0;
          var p = pt(i, v / 100 * R).split(',');
          return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="3" fill="#7c9dff"/>';
        }).join('')
      + '</svg>';
  };

  AssessmentModule.prototype._renderResult = function(res) {
    var box = document.getElementById('assess-result-box');
    if (!box) return;
    var levelName = { newcomer: '零基础', beginner: '入门', basic: '基础', intermediate: '进阶', advanced: '挑战' }[res.level] || res.level;
    var vecHtml = AssessmentEngine.DIMS.map(function(d) {
      var v = res.vector[d] || 0;
      var color = v >= 80 ? 'var(--success)' : v >= 60 ? 'var(--sage-deep)' : v >= 40 ? 'var(--amber)' : 'var(--danger)';
      var isWeak = d === res.weakDim;
      return '<div class="assess-vec' + (isWeak ? ' assess-vec-weak' : '') + '">'
        + '<div class="assess-vec-head"><span>' + AssessmentEngine.DIM_NAMES[d] + (isWeak ? ' ⚠' : '') + '</span><b>' + v + '%</b></div>'
        + '<div class="assess-vec-bar"><div class="assess-vec-fill" style="width:' + v + '%;background:' + color + '"></div></div>'
        + '</div>';
    }).join('');
    // 与上一次测评对比（history[0] 为本次刚写入的最新记录，[1] 为上一次）
    var hist = DataStore.getProgress('assessment_history') || [];
    var prev = hist[1];
    var deltaHtml = '';
    if (prev && typeof prev.score === 'number') {
      var diff = res.score - prev.score;
      var dcls = diff > 0 ? 'assess-delta-up' : (diff < 0 ? 'assess-delta-down' : 'assess-delta-keep');
      var dsign = diff > 0 ? '+' : '';
      deltaHtml = '<div class="assess-delta ' + dcls + '">' + (diff === 0 ? '与上次持平' : '较上次 ' + dsign + diff + ' 分')
        + (prev.date ? ' <span>' + escapeHtml(prev.date) + '</span>' : '') + '</div>';
    }
    // 提升建议
    var plan = AssessmentEngine.buildPlan(res, 10);
    var tipLines = plan.lines.slice(0, 3).map(function(l) { return '<li>' + escapeHtml(l) + '</li>'; }).join('');
    box.innerHTML = '<div class="assess-result-cat">能力等级：<b>' + levelName + '</b></div>'
      + '<div class="assess-result-rate">综合得分 <b>' + res.score + '</b> 分（' + res.correct + '/' + res.total + ' 题正确）</div>'
      + deltaHtml
      + '<div class="assess-result-flex">'
      + '<div class="assess-radar">' + this._radarSVG(res.vector) + '</div>'
      + '<div class="assess-vecs">' + vecHtml + '</div>'
      + '</div>'
      + (tipLines ? '<div class="assess-tips"><div class="assess-tips-head"><svg class="icon"><use href="#i-bulb"/></svg> 提升建议</div><ul>' + tipLines + '</ul></div>' : '')
      + (res.recommendName ? '<div class="assess-rec">推荐词库：' + escapeHtml(res.recommendName) + '</div>' : '')
      + (res.weakName ? '<div class="assess-rec assess-rec-weak">薄弱项：' + res.weakName + '，可在对应模块针对性强化</div>' : '');
  };

  return AssessmentModule;
})();

if (typeof window !== 'undefined') {
  window.AssessmentEngine = AssessmentEngine;
  window.AssessmentModule = AssessmentModule;
}

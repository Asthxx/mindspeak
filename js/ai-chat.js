// ==================== AI 对话（AI Coach 对话式交互） ====================
// 任务四：在 #page-ai 内置对话区，用自然语言提问，AI 教练基于本机数据给出可执行答复。
// 能力：学习概况 / 制定学习计划 / 解释单词 / 生成例句 / 错题错误分析 / 发音建议 / 复习建议 / 帮助。
// 依赖 app.js 提供的 DataStore / calculateStreak / getLocalDateStr /
// escapeHtml / Toast / SpeechUtil，以及 window.app.showTab。
var AiChatModule = (function() {
  var EXAMPLE_TEMPLATES = {
    'n.': ['I bought a {w} yesterday.', 'The {w} is on the desk.', 'She showed me a {w} just now.'],
    'v.': ['I want to {w} every morning.', 'He decided to {w} with his friend.', 'We often {w} after class.'],
    'adj.': ['This is a {w} thing to do.', 'She feels {w} today.', 'That looks {w} to me.'],
    'adv.': ['He speaks very {w} in class.', 'She answered {w} without thinking.', 'It happened {w} last week.'],
    'pron.': ['That is {w}, I think.', 'Please give it to {w}.', '{W} is the one you need.'],
    'prep.': ['They sat {w} the window.', 'We met {w} the station.', 'He walked {w} the street.'],
    'conj.': ['I stayed up late {w} I finished my homework.', 'You can go now {w} you finish.', 'I will come {w} it is fine.'],
    'num.': ['There are {w} people in the room.', 'I need {w} more minutes.', 'It costs {w} dollars.']
  };
  var DEFAULT_TEMPLATES = ['I want to learn {w} today.', 'We often use {w} in daily life.', '{W} is an interesting word for me.'];

  var INTENT_GREET = ['你好', 'hi', 'hello', '在吗', '教练'];
  var INTENT_OVERVIEW = ['概况', '怎么样', '学习情况', '成绩', '进度', '报告', '状态', '数据', 'overview', 'status'];
  var INTENT_PLAN = ['计划', '规划', '安排', 'plan'];
  var INTENT_MISTAKE = ['错题', '错误', '薄弱', '弱点', '原因', '分析'];
  var INTENT_REVIEW = ['复习', '回顾', 'review', '艾宾浩斯'];
  var INTENT_PRON = ['发音', '读音', '口语', '跟读', 'pronoun', 'pronounce'];
  var INTENT_HELP = ['帮助', 'help', '怎么办', '能做什么'];

  function AiChatModule() {
    this._wordIndex = null;
    this.initUI();
  }

  AiChatModule.prototype.initUI = function() {
    var self = this;
    var send = document.getElementById('ai-chat-send');
    var input = document.getElementById('ai-chat-input');
    if (send) send.addEventListener('click', function() { self.sendFromInput(); });
    if (input) {
      input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') { e.preventDefault(); self.sendFromInput(); }
      });
    }
    // 快捷提问 chips
    var chipsBox = document.getElementById('ai-chat-chips');
    if (chipsBox) {
      var chips = [
        '我学得怎么样',
        '帮我制定学习计划',
        '分析我的错题',
        '解释单词 abandon',
        '给 happy 生成例句',
        '给我发音建议'
      ];
      chipsBox.innerHTML = chips.map(function(c) {
        return '<button type="button" class="ai-chip" data-q="' + escapeHtml(c) + '">' + escapeHtml(c) + '</button>';
      }).join('');
      chipsBox.querySelectorAll('.ai-chip').forEach(function(btn) {
        btn.addEventListener('click', function() {
          self.ask(btn.dataset.q);
        });
      });
    }
    // 文档级委托：对话里 data-speak 朗读 / data-prefill 预填查单词输入框
    // （data-goto 跳转已由 dashboard.js 全局委托处理）
    document.addEventListener('click', function(ev) {
      var b = ev.target && ev.target.closest ? ev.target.closest('[data-speak], [data-prefill]') : null;
      if (!b) return;
      if (b.getAttribute('data-speak')) {
        SpeechUtil.speakWord(b.getAttribute('data-speak'));
      }
      if (b.hasAttribute('data-prefill')) {
        var input = document.getElementById('search-input');
        if (input) input.value = b.getAttribute('data-prefill');
      }
    });
    this._welcome();
  };

  AiChatModule.prototype._welcome = function() {
    var box = document.getElementById('ai-chat-msgs');
    if (!box) return;
    box.innerHTML = '';
    this._append('ai', '你好，我是你的 AI 英语教练。我可以：<br>· 查看学习概况（如「我学得怎么样」）<br>· 制定学习计划（如「帮我制定学习计划」）<br>· 分析错题原因（如「分析我的错题」）<br>· 解释单词（如「解释单词 abandon」）<br>· 生成例句（如「给 happy 生成例句」）<br>· 发音建议（如「给我发音建议」）<br>直接输入你的问题，或点击下面的快捷提问。');
  };

  AiChatModule.prototype._msgBox = function() {
    return document.getElementById('ai-chat-msgs');
  };

  // 追加一条气泡：who = 'user' | 'ai'
  AiChatModule.prototype._append = function(who, html) {
    var box = this._msgBox();
    if (!box) return;
    var icon = who === 'user' ? 'i-user' : 'i-robot';
    var div = document.createElement('div');
    div.className = 'ai-msg ai-msg-' + who;
    div.innerHTML = '<div class="ai-msg-avatar"><svg class="icon"><use href="#' + icon + '"/></svg></div>'
      + '<div class="ai-msg-bubble">' + html + '</div>';
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
    return div;
  };

  AiChatModule.prototype.sendFromInput = function() {
    var input = document.getElementById('ai-chat-input');
    if (!input) return;
    var text = input.value.trim();
    if (!text) { Toast.warning('请输入一个问题'); return; }
    input.value = '';
    this.ask(text);
  };

  // 对外主入口：解析用户问题
  AiChatModule.prototype.ask = function(text) {
    text = String(text || '').trim();
    if (!text) return;
    this._append('user', escapeHtml(text));
    var lower = text.toLowerCase();
    var reply = this._handle(lower, text);
    this._append('ai', reply);
    return reply;
  };

  AiChatModule.prototype._handle = function(lower, original) {
    var word = this._extractWord(lower, original);
    // 1. 解释单词 / 是什么意思 / 怎么读（含英文词）
    if (word && this._has(lower, ['解释', '什么意思', 'meaning', 'explain', '这个单词', '单词']) && !this._has(lower, ['分析我的', '我的错题'])) {
      return this._explainWord(word, false);
    }
    // 2. 生成例句
    if (word && this._has(lower, ['例句', '造句', 'example', 'sentence', '生成'])) {
      return this._explainWord(word, true);
    }
    // 3. 错题分析
    if (this._has(lower, INTENT_MISTAKE)) return this._analyzeMistakes();
    // 4. 制定计划
    if (this._has(lower, INTENT_PLAN)) return this._makePlan();
    // 5. 复习建议
    if (this._has(lower, INTENT_REVIEW)) return this._reviewAdvice();
    // 6. 发音建议
    if (this._has(lower, INTENT_PRON)) return this._pronAdvice();
    // 7. 学习概况
    if (this._has(lower, INTENT_OVERVIEW)) return this._overview();
    // 8. 打招呼
    if (this._has(lower, INTENT_GREET)) return this._greeting();
    // 9. 帮助
    if (this._has(lower, INTENT_HELP)) return this._help();
    // 10. 兜底：提取到的单词默认解释，否则提醒
    if (word) return this._explainWord(word, false);
    return this._fallback();
  };

  AiChatModule.prototype._has = function(lower, keys) {
    if (typeof keys === 'string') return lower.indexOf(keys) !== -1;
    return keys.some(function(k) { return lower.indexOf(k) !== -1; });
  };

  // 从提问里提取英文单词（跳过介词/助词）
  AiChatModule.prototype._extractWord = function(text) {
    var m = text.match(/[a-zA-Z][a-zA-Z'\-]{1,39}/);
    var skip = ['i', 'my', 'me', 'you', 'the', 'a', 'an', 'for', 'to', 'of', 'and', 'give', '给我', 'what', 'how', 'please', 'learn', 'explain', 'explaination'];
    if (m) {
      var w = m[0].toLowerCase();
      if (skip.indexOf(w) === -1) return w;
    }
    return null;
  };

  // 加载全词库索引（词 -> 词条）
  AiChatModule.prototype._ensureIndex = function() {
    if (this._wordIndex) { var k = Object.keys(this._wordIndex); if (k.length) return this._wordIndex; }
    var index = {};
    var cats = DataStore.getDefaultWords().categories || [];
    cats.forEach(function(cat) {
      (cat.words || []).forEach(function(w) {
        var key = (w.word || '').toLowerCase();
        if (key && !index[key]) index[key] = w;
      });
    });
    this._wordIndex = index;
    return index;
  };

  // 解释单词 or 生成例句
  AiChatModule.prototype._explainWord = function(word, wantExample) {
    var index = this._ensureIndex();
    var entry = index[word];
    if (entry) {
      if (wantExample) return this._sentence(word, entry);
      if (window.app && window.app.searchModule) {
        // 顺便反馈给查单词页（仅定位，不改输入），可选优化
      }
      var mastered = this._isMastered(word);
      var statusText = mastered ? '你在单词进度中已标记该词为「已掌握」' : '该词尚未纳入你的掌握记录';
      // 整段一次性朗读：单词 + 例句连读，不再逐句分按钮
      var speakAll = entry.example ? entry.word + '. ' + entry.example : entry.word;
      var html = '<b>' + escapeHtml(entry.word) + '</b> <span class="ai-em">' + escapeHtml(entry.phonetic || '') + '</span>'
        + ' <span class="ai-em">' + escapeHtml(entry.pos || '') + '</span><br>'
        + '释义：' + escapeHtml(entry.chinese || '') + '<br>'
        + (entry.example ? '例句：<i>' + escapeHtml(entry.example) + '</i>'
            + (entry.example_cn ? '<br><span style="color:var(--text-secondary)">' + escapeHtml(entry.example_cn) + '</span>' : '') : '')
        + '<br><button type="button" class="ai-reply-btn" data-speak="' + escapeHtml(speakAll) + '">朗读全部</button>'
        + '<button type="button" class="ai-reply-btn" data-goto="search" data-prefill="' + escapeHtml(entry.word) + '">查单词页</button>'
        + '<br><span style="color:var(--text-secondary);font-size:var(--text-xs)">' + statusText + '</span>';
      return html;
    }
    return '抱歉，词库中没找到 <b>' + escapeHtml(word) + '</b>。可能是生词或未收录。<br>'
      + '<button type="button" class="ai-reply-btn" data-goto="search" data-prefill="' + escapeHtml(word) + '">在查单词页搜索</button>';
  };

  // 生成例句：优先用词库例句，否则按词性模板生成
  AiChatModule.prototype._sentence = function(word, entry) {
    var lines = [];
    if (entry.example) lines.push(entry.example);
    var pos = entry.pos || '';
    var tpl = EXAMPLE_TEMPLATES[pos] || DEFAULT_TEMPLATES;
    for (var i = 0; i < tpl.length && lines.length < 3; i++) {
      lines.push(tpl[i].replace(/\{w\}/g, word).replace(/\{W\}/g, word.charAt(0).toUpperCase() + word.slice(1)));
    }
    // 整段一次性朗读：全部例句连成一段（句号连接），一个按钮读完
    var joined = lines.map(function(l) { return l.replace(/[.!?…]+$/, ''); }).join('. ') + '.';
    var html = '为 <b>' + escapeHtml(word) + '</b> 生成例句：<br>'
      + lines.map(function(l, i) {
          return (i + 1) + '. <i>' + escapeHtml(l) + '</i>';
        }).join('<br>')
      + '<br><button type="button" class="ai-reply-btn" data-speak="' + escapeHtml(joined) + '">朗读全部</button>';
    return html;
  };

  AiChatModule.prototype._isMastered = function(word) {
    // key 是 "单词-词库序号"（如 long-term-1），单词本身可能含 "-"，不能无脑 split('-')[0]
    var progress = DataStore.getProgress('word_progress', {});
    var target = String(word).toLowerCase();
    return Object.keys(progress).some(function(k) {
      var m = /^(.*)-(\d+)$/.exec(k);
      if (!m || m[1].toLowerCase() !== target) return false;
      return progress[k] && progress[k].status === 'mastered';
    });
  };

  // 学习概况
  AiChatModule.prototype._overview = function() {
    var checkins = DataStore.getProgress('checkins', {});
    var progress = DataStore.getProgress('word_progress', {});
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
    var todayCount = checkins[t] || 0;
    var streak = calculateStreak(checkins);
    var gami = DataStore.getProgress('gamification', {}) || {};
    var level = gami.level || (parseInt(gami.points, 10) ? Math.floor(parseInt(gami.points, 10) / 100) + 1 : 1);
    return '你当前的学习概况：<br>'
      + '· 连续打卡 <b>' + streak + '</b> 天，今日已学 <b>' + todayCount + '</b> 词<br>'
      + '· 已掌握 <b>' + mastered + '</b> 词，今日新学 <b>' + todayNew + '</b>，今日已复习 <b>' + todayDone + '</b><br>'
      + '· 待复习 <b>' + due + '</b> 词（建议优先安排）<br>'
      + '· 当前等级 <b>Lv.' + level + '</b>，积分 <b>' + (gami.points || 0) + '</b><br><br>'
      + '<button type="button" class="ai-reply-btn" data-goto="home">看首页总览</button>'
      + '<button type="button" class="ai-reply-btn" data-goto="ai">刷新报告</button>';
  };

  // 制定学习计划
  AiChatModule.prototype._makePlan = function() {
    var checkins = DataStore.getProgress('checkins', {});
    var progress = DataStore.getProgress('word_progress', {});
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
    var goal = DataStore.getProgress('daily_goal', 10) || 10;
    if (goal < 1) goal = 10;
    var newLeft = Math.max(0, goal - todayNew);
    var mistakes = DataStore.getProgress('mistakes', []);
    var weak = this._roots(mistakes, 1)[0];
    var plan = [];
    if (due > 0) plan.push('① 先做 <b>艾宾浩斯复习</b>：今日待复习 <b>' + due + '</b> 词（建议 10-15 分钟）');
    if (newLeft > 0) plan.push('② 背单词：今天再学 <b>' + newLeft + '</b> 个新词即可完成今日目标 (' + (todayNew) + '/' + goal + ')');
    if (weak) plan.push('③ 专项强化：错题集中在「' + weak.name + '」，用错词强化练一练');
    plan.push('④ 番茄钟：用 25 分钟学习 + 5 分钟休息，效率更高');
    return '给你制定今日学习计划：<br><br>' + plan.join('<br>') + '<br><br>'
      + '<button type="button" class="ai-reply-btn" data-goto="word">立即去背单词</button>'
      + (due > 0 ? '<button type="button" class="ai-reply-btn" data-goto="word" data-mode="review">先复习</button>' : '');
  };

  // 错题分析
  AiChatModule.prototype._analyzeMistakes = function() {
    var mistakes = DataStore.getProgress('mistakes', []);
    if (!mistakes.length) {
      return '太棒了，目前错题本里没有错题！<br><button type="button" class="ai-reply-btn" data-goto="word">去背单词保持状态</button>';
    }
    var names = { 'word': '背单词', 'spelling': '拼写', 'grammar': '语法', 'reading': '阅读', 'listening': '听力', 'context': '语境填空', 'speak': '跟读', 'pk': '单词PK' };
    var weak = this._roots(mistakes, 3);
    var html = '共 <b>' + mistakes.length + '</b> 道错题，按来源统计：<br>'
      + weak.map(function(w) {
          return '· <b>' + escapeHtml(names[w.name] || w.name) + '</b>：' + w.count + ' 题' + (w.name === 'spelling' ? '（多为拼写易混，建议加强音形对应）' : '');
        }).join('<br>')
      + '<br><br>教练建议：优先处理「拼写」类错题，它们通常来自元音/辅音对应不熟。<br>'
      + '<button type="button" class="ai-reply-btn" data-goto="mistakes">打开错题本</button>'
      + '<button type="button" class="ai-reply-btn" data-goto="mistake-train">错词强化</button>';
    return html;
  };

  AiChatModule.prototype._roots = function(mistakes, topN) {
    var counts = {};
    mistakes.forEach(function(m) { if (m && m.source) counts[m.source] = (counts[m.source] || 0) + 1; });
    return Object.keys(counts).map(function(s) { return { name: s, count: counts[s] }; })
      .sort(function(a, b) { return b.count - a.count; })
      .slice(0, topN || 3);
  };

  // 复习建议
  AiChatModule.prototype._reviewAdvice = function() {
    var progress = DataStore.getProgress('word_progress', {});
    var t = getLocalDateStr();
    var due = [];
    Object.keys(progress).forEach(function(k) {
      var p = progress[k];
      if (p && p.status !== 'mastered' && p.nextReview && p.nextReview <= t) due.push(p);
    });
    if (!due.length) {
      return '目前没有待复习的单词，记忆曲线状态很好！<br><button type="button" class="ai-reply-btn" data-goto="word">学几个新词</button>';
    }
    return '今日待复习 <b>' + due.length + '</b> 词。按艾宾浩斯记忆曲线，越早复习效果越好。<br>'
      + '<button type="button" class="ai-reply-btn" data-goto="word" data-mode="review">开始复习</button>'
      + '<br><span style="color:var(--text-secondary);font-size:var(--text-xs)">提示：背单词卡片支持「待复习优先」排序。</span>';
  };

  // 发音建议
  AiChatModule.prototype._pronAdvice = function() {
    return '发音练习建议：<br>· 1. 先在「跟读练习」听标准发音，再模仿<br>'
      + '· 2. 注意重音位置与元音开口度<br>'
      + '· 3. 单个音素掌握后，再连读整句<br><br>'
      + '<button type="button" class="ai-reply-btn" data-goto="speak">去跟读练习</button>';
  };

  AiChatModule.prototype._greeting = function() {
    return '你好！我是你的 AI 英语教练。输入「帮助」查看我能帮你做什么。';
  };

  AiChatModule.prototype._help = function() {
    return '你可以这样问我：<br>· 我学得怎么样<br>· 帮我制定学习计划<br>· 分析我的错题<br>· 解释单词 + 单词<br>· 给某单词生成例句<br>· 给我发音建议<br>· 今天该复习哪些词';
  };

  AiChatModule.prototype._fallback = function() {
    return '我暂时没理解这个问题。你可以试试：<br>· 解释单词 apple<br>· 帮我制定学习计划<br>· 分析我的错题<br>· 我学得怎么样<br>· 给我发音建议';
  };

  return AiChatModule;
})();

if (typeof window !== 'undefined') window.AiChatModule = AiChatModule;
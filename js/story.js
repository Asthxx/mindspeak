// ==================== 词文串学 ====================
// 扇贝同款思路：把今日新学 + 待复习单词串成 2~3 段小短文，边读边巩固。
// 依赖 app.js 提供的 DataStore / escapeHtml / SpeechUtil / Toast / safeBind
var StoryModule = (function() {
  var MAX_WORDS = 10;
  var OPENERS = [
    { en: 'Today I learned some new English words. Let me share them with you in a short story.', cn: '今天我学了一些新的英语单词，用一个小故事分享给大家。' },
    { en: 'This morning, I opened my notebook and reviewed some words. Here is a little story about my day.', cn: '今天早上，我打开笔记本复习了一些单词。这是一个关于我一天的小故事。' },
    { en: 'Hello! I want to practice English today, so I made this story with the words I met.', cn: '你好！今天我想练习英语，所以用我遇到的单词编了这个小故事。' }
  ];
  var CLOSERS = [
    { en: 'That is all for today. I will remember these words and use them tomorrow.', cn: '今天就是这样啦。我会记住这些单词，明天继续使用它们。' },
    { en: 'What a nice day! Keep learning, and you will get better and better.', cn: '多么美好的一天！坚持学习，你会越来越棒。' },
    { en: 'Well, it is time to go. See you tomorrow, and keep going!', cn: '好啦，该说再见了。明天见，继续加油！' }
  ];

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }
  function randomOf(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function escapeReg(str) { return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  function StoryModule() {
    this.words = [];
    this.generated = false;
    this.bindEvents();
  }

  StoryModule.prototype.bindEvents = function() {
    var self = this;
    safeBind('btn-story-generate', 'click', function() { self.generate(); });
    safeBind('btn-story-reshuffle', 'click', function() { self.generate(true); });
    safeBind('btn-story-speak', 'click', function() { self.speakAll(); });
    var toggle = document.getElementById('story-toggle-cn');
    if (toggle) {
      toggle.addEventListener('change', function() {
        var box = document.getElementById('story-box');
        if (box) box.classList.toggle('show-cn', toggle.checked);
      });
    }
    var list = document.getElementById('story-word-list');
    if (list) {
      list.addEventListener('click', function(e) {
        var btn = e.target.closest ? e.target.closest('[data-speak]') : null;
        if (btn) SpeechUtil.speakWord(btn.getAttribute('data-speak'));
      });
    }
  };

  // 收集串学单词：今日新学(firstSeen=今天) > 待复习(nextReview<=今天) > 补充新词(无记录，优先当前词库)
  StoryModule.prototype.collectWords = function() {
    var progress = DataStore.getProgress('word_progress', {});
    var cats = DataStore.getDefaultWords().categories;
    var today = getLocalDateStr();
    var curIdx = window.app && window.app.wordModule ? window.app.wordModule.currentCategoryIndex : 0;
    var newToday = [], due = [], fresh = [];
    // 懒建「词库序号+单词 → 词对象」索引：后续新增/待复习词直接按 key 反查，
    // 避免每次都完整遍历 12 万词库
    if (!this._wIndex) {
      var idx = {};
      cats.forEach(function(c, ci) {
        if (!c || !c.words) return;
        c.words.forEach(function(w) { if (w && w.word) idx[ci + '\u0001' + String(w.word).toLowerCase()] = w; });
      });
      this._wIndex = idx;
    }
    // 1) 新增/待复习：只遍历已学过的 progress（远小于全词库）
    Object.keys(progress).forEach(function(k) {
      var p = progress[k];
      if (!p) return;
      var m = /^(.*)-(\d+)$/.exec(k);
      if (!m) return;
      var ci = parseInt(m[2], 10);
      var w = idx[ci + '\u0001' + String(m[1]).toLowerCase()];
      if (!w) return;
      if (p.firstSeen === today) newToday.push({ w: w, tag: 'new', ci: ci });
      else if (p.status !== 'mastered' && p.nextReview && p.nextReview <= today) due.push({ w: w, tag: 'due', ci: ci });
    });
    // 2) 陌生词：优先当前词库（可背全部），其他词库只采样前若干避免全库扫描 + 排除已学
    cats.forEach(function(cat, ci) {
      if (!cat || !cat.words) return;
      var isCur = ci === curIdx;
      var freshCount = 0;
      var limit = isCur ? 10000 : 100;
      for (var wi = 0; wi < cat.words.length && freshCount < limit; wi++) {
        var w = cat.words[wi];
        if (!w || !w.word) continue;
        var key = w.word + '-' + ci;
        if (progress[key]) continue; // 已学不算陌生
        fresh.push({ w: w, tag: 'fresh', ci: ci });
        freshCount++;
      }
    });
    shuffle(newToday);
    shuffle(due);
    var curFresh = fresh.filter(function(f) { return f.ci === curIdx; });
    var otherFresh = fresh.filter(function(f) { return f.ci !== curIdx; });
    shuffle(curFresh);
    shuffle(otherFresh);
    var picked = [];
    newToday.concat(due).forEach(function(item) { if (picked.length < MAX_WORDS) picked.push(item); });
    curFresh.concat(otherFresh).forEach(function(item) { if (picked.length < MAX_WORDS) picked.push(item); });
    return picked;
  };

  // 生成短文：开场句 + 每词一句 + 结尾句，拼成 2~3 段，目标词 <mark> 高亮，逐句附中文翻译
  StoryModule.prototype.generate = function(reshuffle) {
    if (this._generating) return; // 连点防抖：同步渲染完成前忽略重复触发，防成就重复计入
    this._generating = true;
    var self = this;
    setTimeout(function() { self._generating = false; }, 400);
    var picked = this.collectWords();
    this.words = picked;
    this.generated = true;
    var summaryEl = document.getElementById('story-summary');
    var box = document.getElementById('story-box');
    var wordsEl = document.getElementById('story-words');
    if (!box) return;
    var summary = { new: 0, due: 0, fresh: 0 };
    picked.forEach(function(p) { summary[p.tag]++; });
    if (summaryEl) {
      summaryEl.textContent = '本篇共 ' + picked.length + ' 个单词：今日新学 ' + summary.new + ' · 待复习 ' + summary.due + ' · 补充新词 ' + summary.fresh;
      summaryEl.classList.remove('hidden');
    }
    if (!picked.length) {
      box.innerHTML = '<p class="empty-tip" style="margin:0">暂时没有可串学的单词，先去「背单词」学习几个吧</p>';
      box.classList.remove('hidden');
      box.classList.add('show-cn');
      if (wordsEl) wordsEl.classList.add('hidden');
      return;
    }
    var lines = this.buildSentences(picked);
    var html = '';
    for (var i = 0; i < lines.length; i += 4) {
      html += '<div class="story-paragraph">' + lines.slice(i, i + 4).join('') + '</div>';
    }
    box.innerHTML = html;
    box.classList.remove('hidden');
    box.classList.add('show-cn');
    if (wordsEl) wordsEl.classList.remove('hidden');
    this.renderWordList();
    if (!reshuffle) Toast.success('短文生成完毕，共 ' + picked.length + ' 个单词');
    // 仅首次生成计入"故事达人"成就；"换一批"反复点不再刷成就
    if (!reshuffle && window.app && window.app.badgeSystem) window.app.badgeSystem.onEvent('story');
  };

  StoryModule.prototype.buildSentences = function(picked) {
    var lines = [this.buildLine(randomOf(OPENERS).en, randomOf(OPENERS).cn)];
    var self = this;
    picked.forEach(function(p) {
      var w = p.w;
      var en = w.example || 'I learned the word "' + w.word + '" today.';
      var cn = w.example_cn || '我今天学到了单词「' + w.word + '」，意思是' + w.chinese + '。';
      lines.push(self.buildLine(en, cn, w.word));
    });
    lines.push(this.buildLine(randomOf(CLOSERS).en, randomOf(CLOSERS).cn));
    return lines;
  };

  StoryModule.prototype.buildLine = function(en, cn, target) {
    var safeEn = escapeHtml(en);
    var safeCn = escapeHtml(cn);
    if (target) {
      safeEn = safeEn.replace(new RegExp('(' + escapeReg(target) + ')', 'i'), '<mark>$1</mark>');
    }
    return '<div class="story-line"><p class="story-en">' + safeEn + '</p><p class="story-cn">' + safeCn + '</p></div>';
  };

  StoryModule.prototype.renderWordList = function() {
    var el = document.getElementById('story-word-list');
    if (!el) return;
    var self = this;
    el.innerHTML = this.words.map(function(p) {
      var w = p.w;
      var tag = p.tag === 'new' ? '<span class="story-tag story-tag-new">今日新学</span>'
        : p.tag === 'due' ? '<span class="story-tag story-tag-due">待复习</span>'
        : '<span class="story-tag story-tag-fresh">补充新词</span>';
      return '<div class="story-word-row">'
        + '<button class="btn btn-sm btn-speak" data-speak="' + escapeHtml(w.word) + '" title="朗读"><svg class="icon"><use href="#i-volume"/></svg></button>'
        + '<div class="story-word-main"><span class="story-word">' + escapeHtml(w.word) + '</span>'
        + '<span class="story-phonetic">' + escapeHtml(w.phonetic || '') + '</span> '
        + '<span class="story-pos">' + escapeHtml(w.pos || '') + '</span>'
        + '<div class="story-chinese">' + escapeHtml(w.chinese || '') + '</div></div>'
        + tag + '</div>';
    }).join('');
  };

  StoryModule.prototype.speakAll = function() {
    if (!this.generated || !this.words.length) this.generate();
    var box = document.getElementById('story-box');
    if (!box) return;
    var texts = [];
    box.querySelectorAll('.story-en').forEach(function(el) { texts.push(el.textContent); });
    SpeechUtil.speak(texts.join(' '));
  };

  return StoryModule;
})();

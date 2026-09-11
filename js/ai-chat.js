// ==================== AI 对话（AI Coach 对话式交互） ====================
// 任务四：在 #page-ai 内置对话区，用自然语言提问，AI 教练基于本机数据给出可执行答复。
// 能力：学习概况 / 制定学习计划 / 解释单词 / 生成例句 / 错题错误分析 / 发音建议 / 复习建议 / 帮助。
// 依赖 app.js 提供的 DataStore / calculateStreak / getLocalDateStr /
// escapeHtml / Toast / SpeechUtil，以及 window.app.showTab。
// ---- NeuralEngine: unified AI entry (LLM first + rules fallback) ----
// LLM via server-side /api/ai/chat proxy (keyless). Offline/rate-limit/fail -> rule fallback.
// Privacy: only question text + aggregated stats are sent; never per-word details.
var NeuralEngine = (function() {
  var LLM_INTENTS = { 'explain_word': 1, 'sentence': 1, 'translate': 1, 'compare': 1, 'chat': 1, 'tips': 1, 'encourage': 1, 'practice': 1, 'motivation': 1, 'story': 1 };
  var LIMIT = 10;          // max LLM calls per minute
  var WINDOW_MS = 60000;
  var DEFAULT_TIMEOUT = 25000;
  var _calls = [];
  var _health = null;      // 最近一次 /api/ai/health 结果（null=未知，不拦截）
  var _healthAt = 0;       // 最近一次探测时间戳
  var HEALTH_PROBE_MS = 60000; // 离线确认后拦截上限；超时后放行一次“侦察”请求，额度恢复即自动切回

  function allow() {
    var now = Date.now();
    while (_calls.length && (now - _calls[0]) > WINDOW_MS) _calls.shift();
    if (_calls.length >= LIMIT) return false;
    _calls.push(now);
    return true;
  }

  function resetForTest() { _calls = []; _health = null; _healthAt = 0; }

  function isLLMIntent(intent) { return !!LLM_INTENTS[intent]; }

  function getAgentContext() {
    var result = { mastered: 0, due: 0, streak: 0, level: 1, points: 0, weak: [] };
    try {
      var ds = window.DataStore || {};
      var wp = (ds.getProgress && ds.getProgress('word_progress', {})) || {};
      var today = typeof window.getLocalDateStr === 'function' ? window.getLocalDateStr() : '';
      Object.keys(wp).forEach(function(id) {
        var p = wp[id] || {};
        if (p.status === 'mastered') result.mastered++;
        else if (p.status) {
          // nextReview 防御：兼容旧导入数据的时间戳数字 → 转为日期字符串再比较
          var nr = p.nextReview;
          if (typeof nr === 'number') nr = (typeof getLocalDateStr === 'function') ? getLocalDateStr(new Date(nr)) : '';
          else nr = String(nr || '').slice(0, 10);
          if (nr && today && nr <= today) result.due++;
        }
      });
      var g = (ds.getProgress && ds.getProgress('gamification', {})) || {};
      if (typeof g.points === 'number') result.points = g.points;
      if (typeof g.level === 'number') result.level = g.level;
      if (typeof window.calculateStreak === 'function') {
        var c = (ds.getProgress && ds.getProgress('checkins', {})) || {};
        result.streak = window.calculateStreak(c) || 0;
      }
      var m = (ds.getProgress && ds.getProgress('mistakes', [])) || [];
      var cnt = {};
      if (Array.isArray(m)) m.forEach(function(x) { var s = (x && x.source) || 'other'; cnt[s] = (cnt[s] || 0) + 1; });
      result.weak = Object.keys(cnt).sort(function(a, b) { return cnt[b] - cnt[a]; }).slice(0, 3);
    } catch (e) {}
    return result;
  }

  function ask(intent, text, opts) {
    opts = opts || {};
    var timeoutMs = opts.timeoutMs || DEFAULT_TIMEOUT;
    return new Promise(function(resolve) {
      var content = String(text || '').trim();
      if (!isLLMIntent(intent) || !content) return resolve(null);
      // 离线拦截（先于 allow()，离线不消耗限流额度）：server 明确无 key / 额度耗尽，
      // 且探测未过期 → 直接规则兜底；过期（HEALTH_PROBE_MS）后放行一次侦察请求，额度恢复自动切回。
      if (_health && _health.enabled === false && (Date.now() - _healthAt) < HEALTH_PROBE_MS) return resolve(null);
      if (!allow()) return resolve(null);
      // 服务端严格限制单条 content ≤500（含概况拼接）；超长截断避免整条被拒导致 LLM 丢池
      if (content.length > 400) content = content.slice(0, 400);
      var ctx = getAgentContext();
      content += '（我的学习概况：' + JSON.stringify(ctx) + '）';
      var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
      var done = false;
      var timer = setTimeout(function() { if (!done) { done = true; if (ctrl) ctrl.abort(); resolve(null); } }, timeoutMs);
      var base = (typeof window.API_BASE === 'string' ? window.API_BASE : '').replace(/\/$/, '');
      fetch(base + '/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent: intent, messages: [{ role: 'user', content: content }] }),
        signal: ctrl ? ctrl.signal : undefined
      }).then(function(r) {
        return r.json();
      }).then(function(d) {
        if (done) return;
        done = true; clearTimeout(timer);
        if (d && d.ok && typeof d.text === 'string') {
          resolve(d.text);
        } else {
          refreshHealth(); // 上游失败（含额度耗尽）：重新探测并同步徽章
          resolve(null);
        }
      }).catch(function() {
        if (done) return;
        done = true; clearTimeout(timer);
        refreshHealth();
        resolve(null);
      });
    });
  }

  // 重探测 health 并让 UI 徽章随最新状态刷新（失败时 _health 保持未知，不误判离线）
  // 复用单次 checkHealth 结果更新 badge，避免与 _aiStatus 重复发请求
  function refreshHealth() {
    checkHealth().then(function(s) {
      try {
        var m = window.app && window.app.aiChatModule;
        if (m && typeof m._aiStatus === 'function') m._aiStatus(s);
      } catch (e) {}
    });
  }

  function checkHealth() {
    return new Promise(function(resolve) {
      var base = (typeof window.API_BASE === 'string' ? window.API_BASE : '').replace(/\/$/, '');
      fetch(base + '/api/ai/health', { method: 'GET', headers: { 'Accept': 'application/json' } })
        .then(function(r) { return r.json(); })
        .then(function(d) {
          var s = {
            ok: !!(d && d.ok),
            enabled: !!(d && d.ok && d.enabled),
            model: d && typeof d.model === 'string' ? d.model : null,
            capacity: d && typeof d.capacity === 'number' ? d.capacity : 0,
            reason: d && (d.reason === 'quota' || d.reason === 'no-key') ? d.reason : null
          };
          _health = s;
          _healthAt = Date.now();
          resolve(s);
        })
        .catch(function() {
          _healthAt = Date.now(); // 探测失败视为未知：不覆盖已确认状态（瞬时网络问题不误判离线）
          resolve({ ok: false, enabled: false, model: null, capacity: 0 });
        });
    });
  }

  function toHtml(text) {
    var safe = typeof window.escapeHtml === 'function' ? window.escapeHtml(text) : String(text || '');
    return safe.replace(/\[跳转:([a-z-]+)\]/g, function(m, tab) {
      return ' <button class="ai-goto" data-goto="' + (window.escapeHtml ? window.escapeHtml(tab) : tab) + '">前往</button>';
    });
  }

  return { allow: allow, resetForTest: resetForTest, isLLMIntent: isLLMIntent, getAgentContext: getAgentContext, ask: ask, checkHealth: checkHealth, toHtml: toHtml };
})();
window.NeuralEngine = NeuralEngine;

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
  var INTENT_PRON = ['发音', '读音', '跟读', 'pronoun', 'pronounce'];
  var INTENT_HELP = ['帮助', 'help', '怎么办', '能做什么'];
  var INTENT_TRANSLATE = ['翻译', '用英语怎么说', '英文怎么说', '怎么说', 'translate', 'how to say', 'how do you say'];
  var INTENT_ENCOURAGE = ['鼓励', '夸夸', '夸我', '太棒', '真棒', '厉害', '坚持', '加油', '疲惫', '放弃', '坚持不下去', '好累'];
  var INTENT_TIPS = ['怎么背', '背单词', '记单词', '记忆技巧', '提高英语', '语感', '遗忘', '忘得快', '背了就忘', '技巧', '效率', '学习方法', '方法'];
  var INTENT_PRACTICE = ['口语', '陪练', '练对话', '对话练习', '跟我聊', 'practice', '跟我练习'];

  function AiChatModule() {
    this._wordIndex = null;
    this._ctx = { lastWord: null, lastIntent: null };
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
    // 快捷提问 chips（随多轮上下文动态变化）
    this._refreshChips();
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
    this._aiStatus();
    this._chatToolbar();
  };

  // 在线增强状态徽章：NeuralEngine 探测 /api/ai/health。
  // key 已配置且未耗尽 → 在线增强；无 key 或额度耗尽 → 离线模式（原因写入 title）。
  // 幂等：重复调用会替换旧徽章（LLM 失败后的 refreshHealth 会触发重画）。
  // 接受可选 prefetched（refreshHealth 已探测好的结果），避免重复发 health 请求。
  AiChatModule.prototype._aiStatus = function(prefetched) {
    var host = document.querySelector('.ai-chat-card .ai-card-title') || document.querySelector('.ai-chat-card h3');
    if (!host) return;
    var old = host.querySelector('.ai-status-badge');
    if (old) old.parentNode.removeChild(old);
    var badge = document.createElement('span');
    badge.className = 'ai-status-badge ai-status-off';
    badge.setAttribute('data-state', 'loading');
    badge.textContent = '…';
    host.appendChild(badge);
    function apply(s) {
      var on = !!(s && s.ok && s.enabled);
      var quota = !!(s && s.reason === 'quota');
      badge.className = 'ai-status-badge ' + (on ? 'ai-status-on' : 'ai-status-off');
      badge.setAttribute('data-state', on ? 'on' : 'off');
      badge.title = on ? '在线增强已启用（LLM 教学通道）'
        : (quota ? 'LLM 额度不足，暂用规则回复；额度恢复后自动切回' : '离线规则模式（未配置 LLM key）');
      badge.textContent = on ? '在线增强' : '离线模式';
    }
    if (prefetched) { apply(prefetched); }
    else { NeuralEngine.checkHealth().then(apply); }
  };

  AiChatModule.prototype._refreshChips = function() {
    var chipsBox = document.getElementById('ai-chat-chips');
    if (!chipsBox) return;
    var self = this;
    var list;
    var ctx = this._ctx || {};
    if (ctx.lastWord && (ctx.lastIntent === 'explain_word' || ctx.lastIntent === 'sentence')) {
      list = ['那 ' + ctx.lastWord + ' 呢', '给 ' + ctx.lastWord + ' 生成例句', '对比 ' + ctx.lastWord + ' 和 apple', '我学得怎么样'];
    } else {
      list = ['我学得怎么样', '帮我制定学习计划', '分析我的错题', '解释单词 abandon', '给 happy 生成例句', '给我发音建议'];
    }
    chipsBox.innerHTML = list.map(function(c) {
      return '<button type="button" class="ai-chip" data-q="' + escapeHtml(c) + '">' + escapeHtml(c) + '</button>';
    }).join('');
    chipsBox.querySelectorAll('.ai-chip').forEach(function(btn) {
      btn.addEventListener('click', function() {
        self.ask(btn.dataset.q);
      });
    });
  };

  AiChatModule.prototype._welcome = function() {
    var box = document.getElementById('ai-chat-msgs');
    if (!box) return;
    box.innerHTML = '';
    // 恢复上次对话最近两条
    var history;
    try { history = DataStore.getProgress('ai_chat_history', []) || []; } catch (e) { history = []; }
    if (Array.isArray(history) && history.length) {
      var recent = history.slice(-2);
      recent.forEach(function(m) {
        if (!m || !m.html) return;
        var who = m.role === 'user' ? 'user' : 'ai';
        var div = document.createElement('div');
        div.className = 'ai-msg ai-msg-' + who;
        div.innerHTML = '<div class="ai-msg-avatar"><svg class="icon"><use href="#' + (who === 'user' ? 'i-user' : 'i-robot') + '"/></svg></div>'
          + '<div class="ai-msg-bubble">' + m.html + '</div>';
        box.appendChild(div);
      });
      var sep = document.createElement('div');
      sep.className = 'ai-hist-sep';
      sep.textContent = '—— 以上是上次的对话 ——';
      box.appendChild(sep);
    }
    this._append('ai', '你好，我是你的 AI 英语教练。我可以：<br>· 查看学习概况（如「我学得怎么样」）<br>· 制定学习计划（如「帮我制定学习计划」）<br>· 分析错题原因（如「分析我的错题」）<br>· 解释单词（如「解释单词 abandon」）<br>· 生成例句（如「给 happy 生成例句」）<br>· 发音建议（如「给我发音建议」）<br>· 生词/翻译/对比/口语陪练（在线时由 AI 增强）<br>直接输入你的问题，或点击下面的快捷提问。', true);
  };

  AiChatModule.prototype._msgBox = function() {
    return document.getElementById('ai-chat-msgs');
  };

  // 追加一条气泡：who = 'user' | 'ai'，并写入会话历史（noStore=true 时仅渲染，如欢迎语）
  AiChatModule.prototype._append = function(who, html, noStore) {
    var box = this._msgBox();
    if (!box) return;
    var icon = who === 'user' ? 'i-user' : 'i-robot';
    var div = document.createElement('div');
    div.className = 'ai-msg ai-msg-' + who;
    div.innerHTML = '<div class="ai-msg-avatar"><svg class="icon"><use href="#' + icon + '"/></svg></div>'
      + '<div class="ai-msg-bubble">' + html + '</div>';
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
    if (!noStore) this._storeHistory(who, html);
    return div;
  };

  // 清空对话按钮：挂在对话卡片标题右侧，title 显示当前保留条数
  AiChatModule.prototype._chatToolbar = function() {
    var host = document.querySelector('.ai-chat-card .ai-card-title') || document.querySelector('.ai-chat-card h3');
    if (!host || host.querySelector('.ai-clear-chat')) return;
    var self = this;
    var count = 0;
    try { var h = DataStore.getProgress('ai_chat_history', []) || []; count = Array.isArray(h) ? h.length : 0; } catch (e) {}
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ai-clear-chat';
    btn.title = '已保留 ' + count + ' 条对话记录，点击清空';
    btn.textContent = '清空对话';
    btn.addEventListener('click', function() {
      self.clearHistory();
    });
    host.appendChild(btn);
  };

  AiChatModule.prototype.clearHistory = function() {
    try { DataStore.setProgress('ai_chat_history', []); } catch (e) {}
    var box = this._msgBox();
    if (box) {
      box.innerHTML = '';
      this._welcome();
    }
    var btn = document.querySelector('.ai-clear-chat');
    if (btn) btn.title = '对话记录已清空';
    if (typeof Toast === 'object' && Toast.success) Toast.success('对话已清空');
  };

  // 会话历史：localStorage ai_ 前缀，最多 50 条（含按钮的安全 HTML，全部插值均已转义）
  AiChatModule.prototype._storeHistory = function(who, html) {
    try {
      var key = 'ai_chat_history';
      var list = DataStore.getProgress(key, []) || [];
      if (!Array.isArray(list)) list = [];
      list.push({ role: who, html: html, ts: Date.now() });
      if (list.length > 50) list = list.slice(list.length - 50);
      DataStore.setProgress(key, list);
    } catch (e) {}
  };

  // 打字中气泡（不写入历史，完成时整体移除）
  AiChatModule.prototype._aiThinking = function() {
    var box = this._msgBox();
    if (!box) return null;
    var div = document.createElement('div');
    div.className = 'ai-msg ai-msg-ai';
    div.innerHTML = '<div class="ai-msg-avatar"><svg class="icon"><use href="#i-robot"/></svg></div>'
      + '<div class="ai-msg-bubble"><span class="ai-typing"><i></i><i></i><i></i></span></div>';
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
    this._refreshChips();
    return reply;
  };

  AiChatModule.prototype._handle = function(lower, original) {
    // 0. 多轮上下文：上轮在解释/例句，本轮只报新词（如「那 happy 呢」）
    var fu = this._tryFollowUp(lower, original);
    if (fu) return fu;

    var mistakeHit = this._has(lower, INTENT_MISTAKE);
    var planHit = this._has(lower, INTENT_PLAN);
    // 1. 复合意图：错题分析 + 制定计划 一次回复
    if (mistakeHit && planHit && this._has(lower, ['并', '和', '然后', '同时', '还有'])) {
      this._setCtx(null, 'compound');
      return this._analyzeMistakes() + '<br>—— 结合错题，给你建议 ——<br>' + this._makePlan();
    }
    var word = this._extractWord(lower, original);
    // 2. 单词对比：两个词 + 区别词
    if (this._has(lower, ['区别', '差别', '不同', 'difference', 'different']) && /[a-z]{2,}/i.test(lower)) {
      var pair = this._extractPair(lower);
      if (pair) {
        this._setCtx(pair[0], 'compare');
        return this._compare(pair[0], pair[1]);
      }
    }
    // 3. 解释单词 / 什么意思 / 怎么读（含英文词，排除纯错题请求）
    if (word && this._has(lower, ['解释', '什么意思', 'meaning', 'explain', '这个单词', '单词']) && !this._has(lower, ['分析我的', '我的错题'])) {
      this._setCtx(word, 'explain_word');
      return this._explainWord(word, false);
    }
    // 4. 生成例句（要求更地道/更多时同步秒回模板并异步请求 LLM 增强）
    if (word && this._has(lower, ['例句', '造句', 'example', 'sentence', '生成'])) {
      this._setCtx(word, 'sentence');
      var wantMore = this._has(lower, ['更', '地道', '自然', '高级', '复杂', '几个', '多条', '三', '3']);
      return this._explainWord(word, true, wantMore);
    }
    // 5. 错题分析
    if (mistakeHit) { this._setCtx(null, 'mistakes'); return this._analyzeMistakes(); }
    // 6. 制定计划
    if (planHit) { this._setCtx(null, 'plan'); return this._makePlan(); }
    // 7. 复习建议
    if (this._has(lower, INTENT_REVIEW)) { this._setCtx(null, 'review'); return this._reviewAdvice(); }
    // 8. 发音建议
    if (this._has(lower, INTENT_PRON)) { this._setCtx(null, 'pron'); return this._pronAdvice(); }
    // 9. 学习概况
    if (this._has(lower, INTENT_OVERVIEW)) { this._setCtx(null, 'overview'); return this._overview(); }
    // 10. 翻译
    if (this._has(lower, INTENT_TRANSLATE)) { this._setCtx(word, 'translate'); return this._translate(word, original); }
    // 11. 鼓励 / 表扬 / 情绪支持
    if (this._has(lower, INTENT_ENCOURAGE)) { this._setCtx(null, 'encourage'); return this._encourage(); }
    // 12. 学习技巧咨询
    if (this._has(lower, INTENT_TIPS)) { this._setCtx(null, 'tips'); return this._tips(); }
    // 13. 口语陪练开场
    if (this._has(lower, INTENT_PRACTICE)) { this._setCtx(null, 'practice'); return this._practice(); }
    // 14. 打招呼
    if (this._has(lower, INTENT_GREET)) { this._setCtx(null, 'greet'); return this._greeting(); }
    // 15. 帮助
    if (this._has(lower, INTENT_HELP)) { this._setCtx(null, 'help'); return this._help(); }
    // 16. 兜底：提取到的单词默认解释，否则提醒
    if (word) { this._setCtx(word, 'explain_word'); return this._explainWord(word, false); }
    return this._fallback();
  };

  AiChatModule.prototype._setCtx = function(word, intent) {
    this._ctx = this._ctx || {};
    this._ctx.lastWord = word || null;
    this._ctx.lastIntent = intent || null;
    return '';
  };

  // 多轮省略追问：上轮是解释/例句，本轮只提一个新词
  AiChatModule.prototype._tryFollowUp = function(lower, original) {
    var ctx = this._ctx;
    if (!ctx || (ctx.lastIntent !== 'explain_word' && ctx.lastIntent !== 'sentence')) return null;
    var m = /^(那|那么|还有|然后|顺便|再|也|刚才)?([a-z][a-z'\-]{1,39})\s*呢[?？.!]*$/.exec(lower);
    if (!m) return null;
    var w = m[2].toLowerCase();
    if (['i', 'my', 'me', 'you', 'the', 'a', 'an', 'for', 'to', 'of', 'and', 'what', 'how'].indexOf(w) !== -1) return null;
    var wantExample = ctx.lastIntent === 'sentence';
    this._setCtx(w, ctx.lastIntent);
    return this._explainWord(w, wantExample);
  };

  // 提取对比的两个英文词
  AiChatModule.prototype._extractPair = function(text) {
    var m = /([a-z][a-z'\-]{1,39})\s*(?:和|与|跟|及|vs\.?|or|to|against)\s*([a-z][a-z'\-]{1,39})/i.exec(text);
    if (!m) return null;
    var a = m[1].toLowerCase(), b = m[2].toLowerCase();
    var skip = ['i', 'my', 'me', 'you', 'the', 'a', 'an', 'for', 'to', 'of', 'and', 'what', 'how', 'please'];
    if (skip.indexOf(a) !== -1 || skip.indexOf(b) !== -1 || a === b) return null;
    return [a, b];
  };

  AiChatModule.prototype._compare = function(a, b) {
    var index = this._ensureIndex();
    function line(w) {
      var e = index[w];
      if (!e) return '<b>' + escapeHtml(w) + '</b>：词库暂未收录';
      return '<b>' + escapeHtml(e.word) + '</b> <span class="ai-em">' + escapeHtml(e.phonetic || '') + '</span> <span class="ai-em">' + escapeHtml(e.pos || '') + '</span>：' + escapeHtml(e.chinese || '');
    }
    this._llmAppend('compare', '对比英语单词 ' + a + ' 和 ' + b + ' 的用法区别，用中文回答，简洁');
    return '对比「' + escapeHtml(a) + '」与「' + escapeHtml(b) + '」：<br>' + line(a) + '<br>' + line(b)
      + '<br><span style="color:var(--text-secondary);font-size:var(--text-xs)">AI 正在补充具体区别…</span>';
  };

  // 异步 LLM 增强：打字中占位 → 成功后替换为 AI 气泡（含朗读按钮），失败静默（离线兜底已就位）
  AiChatModule.prototype._llmAppend = function(intent, prompt) {
    var self = this;
    var typing = self._aiThinking();
    NeuralEngine.ask(intent, prompt).then(function(text) {
      if (typing && typing.parentNode) typing.parentNode.removeChild(typing);
      if (!text || !self._msgBox()) return;
      var plain = String(text).replace(/<[^>]*>/g, ' ').replace(/\[跳转:[a-z-]+\]/g, '').replace(/\s+/g, ' ').trim();
      self._append('ai', NeuralEngine.toHtml(text)
        + (plain ? '<br><button type="button" class="ai-reply-btn" data-speak="' + escapeHtml(plain) + '">朗读</button>' : ''));
    });
  };

  AiChatModule.prototype._translate = function(word, original) {
    var q = String(original || '').trim() || word || '';
    this._llmAppend('translate', '请把"' + q + '"翻译成英语，并给出中文释义，简洁');
    return '正在为你翻译「' + escapeHtml(q) + '」…<br>'
      + '<span style="color:var(--text-secondary);font-size:var(--text-xs)">如未收到回复，可在查单词页直接搜索。</span>';
  };

  AiChatModule.prototype._encourage = function() {
    var streak = 0;
    try { streak = calculateStreak(DataStore.getProgress('checkins', {})) || 0; } catch (e) {}
    return '能坚持到这里已经很了不起！' + (streak > 0 ? '你已连续打卡 <b>' + streak + '</b> 天，习惯正在形成。' : '')
      + '英语学习是积累的过程，今天的每一次复习都会让明天的你更轻松。<br>'
      + '· 允许偶尔慢一点，但别停下来<br>'
      + '· 把目标拆小：今天先完成 <b>10 个词</b> 就够了<br><br>'
      + '<button type="button" class="ai-reply-btn" data-goto="word">现在背 10 个词</button>';
  };

  AiChatModule.prototype._tips = function() {
    return '提升记忆效果的实用技巧：<br>'
      + '· 1. 用句子记单词：别单背词义，放进例句里（对我说「给 happy 生成例句」）<br>'
      + '· 2. 间隔复习：按艾宾浩斯曲线复习，胜过一次猛背<br>'
      + '· 3. 音形对应：拼写错多就练「错词强化」，注意元音/辅音对应<br>'
      + '· 4. 少量多次：每天 10 个新词 + 复习旧词，优于一次 50 个<br><br>'
      + '<button type="button" class="ai-reply-btn" data-goto="word">开始今天的学习</button>';
  };

  AiChatModule.prototype._practice = function() {
    return '口语陪练开始！先从简单的自我介绍开始：<br>'
      + '我对你说一句英语，你用英语回答我：<br>'
      + '<i>"Hi! I\'m your AI coach. What is your favorite book?"</i><br>'
      + '你可以回：My favorite book is ...。<br>'
      + '想练特定话题就告诉我，比如「聊吃的」「练自我介绍」。<br><br>'
      + '<button type="button" class="ai-reply-btn" data-speak="Hi! I am your AI coach. What is your favorite book?">播放开场</button>';
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
  AiChatModule.prototype._explainWord = function(word, wantExample, wantMore) {
    var index = this._ensureIndex();
    var entry = index[word];
    if (entry) {
      if (wantExample) return this._sentence(word, entry, !!wantMore);
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
    // 未收录生词：先给离线兜底，同时尝试 LLM 解释（异步追加气泡，失败则静默）
    this._llmAppend(wantExample ? 'sentence' : 'explain_word', (wantExample ? '为单词 ' : '解释单词 ') + word);
    return '抱歉，词库中没找到 <b>' + escapeHtml(word) + '</b>。可能是生词或未收录。<br>'
      + '<button type="button" class="ai-reply-btn" data-goto="search" data-prefill="' + escapeHtml(word) + '">在查单词页搜索</button>';
  };

  // 生成例句：优先词库例句，否则按词性模板；wantMore 时异步请求 LLM 生成更地道的例句
  AiChatModule.prototype._sentence = function(word, entry, wantMore) {
    var lines = [];
    if (entry.example) lines.push(entry.example);
    var pos = entry.pos || '';
    var tpl = EXAMPLE_TEMPLATES[pos] || DEFAULT_TEMPLATES;
    for (var i = 0; i < tpl.length && lines.length < 3; i++) {
      lines.push(tpl[i].replace(/\{w\}/g, word).replace(/\{W\}/g, word.charAt(0).toUpperCase() + word.slice(1)));
    }
    // 整段一次性朗读：全部例句连成一段（句号连接），一个按钮读完
    var joined = lines.map(function(l) { return l.replace(/[.!?…]+$/, ''); }).join('. ') + '.';
    // 用户要求更地道的例句：模板先秒回，异步请求 LLM 补充
    if (wantMore) this._llmAppend('sentence', '为单词 ' + word + ' 生成 3 个更加地道自然的英语例句，每个附中文翻译，简洁');
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
      if (window.UserState && window.UserState.isDue) { if (window.UserState.isDue(p, t)) due++; }
      else if (p.status !== 'mastered' && p.nextReview && p.nextReview <= t) due++;
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
      + '· 当前等级 <b>Lv.' + escapeHtml(String(level)) + '</b>，积分 <b>' + escapeHtml(String(+gami.points || 0)) + '</b><br><br>'
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
      if (p.status !== 'mastered') {
        var nr = p.nextReview;
        if (typeof nr === 'number') nr = (typeof getLocalDateStr === 'function') ? getLocalDateStr(new Date(nr)) : '';
        else nr = String(nr || '').slice(0, 10);
        if (nr && t && nr <= t) due++;
      }
      if (p.firstSeen === t) todayNew++;
      if (p.lastReviewed === t) todayDone++;
    });
    var goal = Number(DataStore.getProgress('daily_goal', 10));
    if (!isFinite(goal) || goal < 1) goal = 10;
    var newLeft = Math.max(0, goal - todayNew);
    var mistakes = DataStore.getProgress('mistakes', []);
    var weak = this._roots(mistakes, 1)[0];
    var plan = [];
    if (due > 0) plan.push('① 先做 <b>艾宾浩斯复习</b>：今日待复习 <b>' + due + '</b> 词（建议 10-15 分钟）');
    if (newLeft > 0) plan.push('② 背单词：今天再学 <b>' + newLeft + '</b> 个新词即可完成今日目标 (' + (todayNew) + '/' + goal + ')');
    if (weak) plan.push('③ 专项强化：错题集中在「' + escapeHtml(weak.name) + '」，用错词强化练一练');
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
      if (p && p.status !== 'mastered' && p.nextReview) {
        if (window.UserState && window.UserState.isDue) { if (window.UserState.isDue(p, t)) due.push(p); }
        else if (p.nextReview <= t) due.push(p);
      }
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
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

  var DEFAULT_SETTINGS = { llm: true, structured: true, zh: true, autoSpeak: false, accent: 'en-US', rate: 1 };

  function AiChatModule() {
    this._wordIndex = null;
    this._ctx = { lastWord: null, lastIntent: null };
    this._card = null;                 // 最近一次回复的结构化卡片（供 _append 渲染）
    this._sessionId = null;
    this._settings = this._loadSettings();
    this.initUI();
  }

  AiChatModule.prototype.initUI = function() {
    var self = this;
    var send = document.getElementById('ai-chat-send');
    var input = document.getElementById('ai-chat-input');
    if (send) send.addEventListener('click', function() { self.sendFromInput(); });
    if (input) {
      // Enter 发送 / Shift+Enter 换行；isComposing 防止中文输入法回车被吞
      input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); self.sendFromInput(); }
      });
      input.addEventListener('input', function() { self._syncComposer(); });
    }
    this._bindWorkspace();
    // 快捷提问 chips（随多轮上下文动态变化）
    this._refreshChips();
    // 文档级委托：对话里 data-speak 朗读 / data-prefill 预填查单词输入框
    // （data-goto 跳转已由 dashboard.js 全局委托处理）
    document.addEventListener('click', function(ev) {
      self._onDocClick(ev);
    });
    this._welcome();
    this._aiStatus();
    this._chatToolbar();
    this._renderHistory();
    this._renderContext();
  };

  // ---- v2 工作区：历史栏 / 抽屉 / 滚动 / 输入区 / 语音 ----
  AiChatModule.prototype._bindWorkspace = function() {
    var self = this;
    var q = function(id) { return document.getElementById(id); };

    // 历史栏
    var btnNew = q('ai-new-chat');
    if (btnNew) btnNew.addEventListener('click', function() { self._newSession(); });
    var search = q('ai-hist-search');
    if (search) search.addEventListener('input', function() { self._renderHistory(search.value); });

    // 抽屉 / 历史抽屉 / 遮罩
    var tog = q('ai-settings-toggle');
    if (tog) tog.addEventListener('click', function() { self._toggleDrawer(); });
    var closeBtn = q('ai-drawer-close');
    if (closeBtn) closeBtn.addEventListener('click', function() { self._closeDrawer(); });
    var railTog = q('ai-hist-toggle');
    if (railTog) railTog.addEventListener('click', function() { self._toggleRail(); });
    var scrim = q('ai-scrim');
    if (scrim) scrim.addEventListener('click', function() { self._closeDrawer(); self._closeRail(); });
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') { self._closeDrawer(); self._closeRail(); }
    });

    // 设置项
    var self2 = this;
    [['ai-sw-llm', 'llm'], ['ai-sw-structured', 'structured'], ['ai-sw-zh', 'zh'], ['ai-sw-autospeak', 'autoSpeak']].forEach(function(pair) {
      var el = q(pair[0]);
      if (!el) return;
      el.setAttribute('aria-checked', String(!!self2._settings[pair[1]]));
      el.addEventListener('click', function() {
        var next = el.getAttribute('aria-checked') !== 'true';
        el.setAttribute('aria-checked', String(next));
        self2._settings[pair[1]] = next;
        self2._saveSettings();
        if (pair[1] === 'structured') {
          // 结构化开关影响的是「之后的回答」，历史气泡不重放（避免与已存 HTML 不一致）
          if (typeof Toast === 'object' && Toast.info) Toast.info(next ? '之后的回答将分区展示' : '之后的回答用纯文本展示');
        }
      });
    });
    var accent = q('ai-sel-accent');
    if (accent) {
      accent.value = this._settings.accent || 'en-US';
      accent.addEventListener('change', function() { self._settings.accent = accent.value; self._saveSettings(); });
    }
    var rate = q('ai-rate');
    if (rate) {
      rate.value = String(this._settings.rate || 1);
      var rv = q('ai-rate-val');
      if (rv) rv.textContent = parseFloat(rate.value).toFixed(1) + '×';
      rate.addEventListener('input', function() {
        self._settings.rate = parseFloat(rate.value);
        self._saveSettings();
        if (rv) rv.textContent = self._settings.rate.toFixed(1) + '×';
      });
    }
    var gotoSettings = q('ai-goto-settings');
    if (gotoSettings) gotoSettings.addEventListener('click', function() {
      self._closeDrawer();
      if (window.app && typeof window.app.showTab === 'function') window.app.showTab('settings');
    });

    // 「回到最新」：只有真实用户输入（滚轮/触摸/按键/拖滚动条）之后才允许出现。
    // 不用时间窗口区分程序滚动 —— 那种判据在快机器与虚拟时间下会失效，导致首屏误弹。
    var scroll = q('ai-msg-scroll');
    if (scroll) {
      ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach(function(evt) {
        scroll.addEventListener(evt, function() { self._userScrolled = true; }, { passive: true });
      });
      scroll.addEventListener('scroll', function() { if (self._userScrolled) self._updateJump(); }, { passive: true });
    }
    var jump = q('ai-jump-latest');
    if (jump) jump.addEventListener('click', function() { self._scrollToBottom(); });

    // 语音输入：无 Web Speech API 时按钮保持隐藏（不给出点不动的入口）
    var mic = q('ai-mic');
    var SR = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
    if (mic && SR) {
      mic.hidden = false;
      mic.addEventListener('click', function() { self._voiceInput(); });
    }
    this._syncComposer();
  };

  AiChatModule.prototype._syncComposer = function() {
    var input = document.getElementById('ai-chat-input');
    if (!input) return;
    // 自适应高度：40 → 132px
    if (input.tagName === 'TEXTAREA') {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 132) + 'px';
    }
    var send = document.getElementById('ai-chat-send');
    if (send) send.disabled = !input.value.trim();
    var counter = document.getElementById('ai-counter');
    if (counter) counter.textContent = input.value.length + ' / 1000';
  };

  // 在线增强状态徽章：NeuralEngine 探测 /api/ai/health。
  // key 已配置且未耗尽 → 在线增强；无 key 或额度耗尽 → 离线模式（原因写入 title）。
  // 幂等：重复调用会替换旧徽章（LLM 失败后的 refreshHealth 会触发重画）。
  // 接受可选 prefetched（refreshHealth 已探测好的结果），避免重复发 health 请求。
  AiChatModule.prototype._aiStatus = function(prefetched) {
    // v2 挂在对话头部标题右侧；旧 DOM（单测里只有 .ai-chat-card）时回退到原选择器
    var host = document.querySelector('.ai-conv-head .ai-card-title')
      || document.querySelector('.ai-chat-card .ai-card-title')
      || document.querySelector('.ai-chat-card h3');
    if (!host) return;
    var old = host.querySelector('.ai-status-badge');
    if (old) old.parentNode.removeChild(old);
    var badge = document.createElement('span');
    badge.className = 'ai-status-badge ai-status-off';
    badge.setAttribute('data-state', 'loading');
    badge.innerHTML = '<span class="led"></span>';
    badge.textContent = '…';
    host.appendChild(badge);
    function apply(s) {
      var on = !!(s && s.ok && s.enabled);
      var quota = !!(s && s.reason === 'quota');
      badge.className = 'ai-status-badge ' + (on ? 'ai-status-on' : 'ai-status-off');
      badge.setAttribute('data-state', on ? 'on' : 'off');
      badge.title = on ? '在线增强已启用（LLM 教学通道）'
        : (quota ? 'LLM 额度不足，暂用规则回复；额度恢复后自动切回' : '离线规则模式（未配置 LLM key）');
      // 先放状态灯，再挂文字：textContent 会覆盖 innerHTML，顺序反了灯就没了
      badge.innerHTML = '<span class="led"></span>';
      badge.appendChild(document.createTextNode(on ? '在线增强' : '离线模式'));
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

  var WELCOME_HTML = '你好，我是你的 AI 英语教练。我可以：<br>· 查看学习概况（如「我学得怎么样」）<br>· 制定学习计划（如「帮我制定学习计划」）<br>· 分析错题原因（如「分析我的错题」）<br>· 解释单词（如「解释单词 abandon」）<br>· 生成例句（如「给 happy 生成例句」）<br>· 发音建议（如「给我发音建议」）<br>· 生词/翻译/对比/口语陪练（在线时由 AI 增强）<br>直接输入你的问题，或点击下面的快捷提问。';
  var WELCOME_CARD = {
    lead: '你好，我是你的 AI 英语教练',
    summary: '用大白话问就行，比如「abandon 什么意思」「我今天该复习哪些词」。',
    tips: ['查看学习概况、制定计划、分析错题', '解释单词、生成例句、发音建议', '生词翻译 / 词义对比 / 口语陪练（在线增强时）'],
    actions: [
      { t: '我学得怎么样', i: 'i-analytics', p: true, q: '我学得怎么样' },
      { t: '制定学习计划', i: 'i-target', q: '帮我制定学习计划' },
      { t: '分析我的错题', i: 'i-spellcheck', q: '分析我的错题' }
    ]
  };

  // restoreAll=true 用于「切回某个历史会话」（展示该会话全部消息）；
  // 默认只恢复最近 2 条，避免刷新后一进来就被整屏历史淹没。
  AiChatModule.prototype._welcome = function(restoreAll) {
    var box = this._msgBox();
    if (!box) return;
    box.innerHTML = '';
    var self = this;
    // 恢复上次对话（结构化卡片一并恢复）
    var history = this._history();
    if (history.length) {
      var recent = restoreAll ? history : history.slice(-2);
      recent.forEach(function(m) {
        if (!m || !m.html) return;
        self._append(m.role === 'user' ? 'user' : 'ai', m.html, true, m.card || null);
      });
      var sep = document.createElement('div');
      sep.className = 'ai-hist-sep';
      sep.textContent = '—— 以上是上次的对话 ——';
      box.appendChild(sep);
    }
    this._append('ai', WELCOME_HTML, true, WELCOME_CARD);
  };

  AiChatModule.prototype._history = function() {
    try {
      var h = DataStore.getProgress('ai_chat_history', []) || [];
      return Array.isArray(h) ? h : [];
    } catch (e) { return []; }
  };

  AiChatModule.prototype._msgBox = function() {
    return document.getElementById('ai-chat-msgs');
  };

  // 追加一条气泡：who = 'user' | 'ai'，card 存在且开启结构化时渲染回答卡，否则用 html。
  // noStore=true 时仅渲染（欢迎语 / 历史恢复）。
  AiChatModule.prototype._append = function(who, html, noStore, card) {
    var box = this._msgBox();
    if (!box) return;
    var icon = who === 'user' ? 'i-user' : 'i-robot';
    var div = document.createElement('div');
    div.className = 'ai-msg ai-msg-' + who;
    var meta = '<div class="ai-msg-meta"><span class="who">' + (who === 'user' ? '我' : 'AI 教练') + '</span><span>' + this._hhmm() + '</span></div>';
    var inner = (card && this._settings.structured) ? this._answerHtml(card) : html;
    var actions = (who === 'ai')
      ? '<div class="ai-msg-actions">'
        + '<button type="button" data-act="copy"><svg class="icon" aria-hidden="true" focusable="false"><use href="#i-copy"/></svg> 复制</button>'
        + '<button type="button" data-act="speak"><svg class="icon" aria-hidden="true" focusable="false"><use href="#i-volume"/></svg> 朗读</button>'
        + '<button type="button" data-act="regen"><svg class="icon" aria-hidden="true" focusable="false"><use href="#i-refresh"/></svg> 重新生成</button>'
        + '</div>'
      : '';
    div.innerHTML = '<div class="ai-msg-avatar"><svg class="icon" aria-hidden="true" focusable="false"><use href="#' + icon + '"/></svg></div>'
      + '<div class="ai-msg-body">' + meta + '<div class="ai-msg-bubble">' + inner + '</div>' + actions + '</div>';
    box.appendChild(div);
    this._scrollToLatest();
    if (!noStore) this._storeHistory(who, html, card);
    return div;
  };

  // ---- 结构化回答卡渲染（对齐 v2 原型：结论 / 释义 / 例句 / 提示 / 行动） ----
  AiChatModule.prototype._answerHtml = function(card) {
    var zh = this._settings.zh !== false;
    var e = window.escapeHtml || function(s) { return String(s == null ? '' : s); };
    var h = '<div class="ai-answer">';
    if (card.lead) h += '<div class="ai-answer-lead">' + card.lead + '</div>';
    if (card.summary) h += '<div class="ai-answer-summary">' + card.summary + '</div>';
    if (card.defs && card.defs.length) {
      h += '<div class="ai-answer-sec"><span class="ai-sec-title">释义 / 要点</span>';
      card.defs.forEach(function(d, i) {
        h += '<div class="ai-def-item"><span class="idx">' + (i + 1) + '</span><span>'
          + '<span class="en" lang="en">' + e(d.en) + '</span>'
          + (zh && d.zh ? '<span class="zh">' + e(d.zh) + '</span>' : '')
          + '</span></div>';
      });
      h += '</div>';
    }
    if (card.examples && card.examples.length) {
      h += '<div class="ai-answer-sec"><span class="ai-sec-title">例句</span><div class="ai-ex-list">';
      card.examples.forEach(function(x) {
        h += '<div class="ai-ex-card"><span class="txt">'
          + '<span class="en" lang="en">' + e(x.en) + '</span>'
          + (zh && x.zh ? '<span class="zh">' + e(x.zh) + '</span>' : '')
          + '</span><button type="button" class="play" data-speak="' + e(x.en) + '" aria-label="朗读例句">'
          + '<svg class="icon" aria-hidden="true" focusable="false"><use href="#i-volume"/></svg></button></div>';
      });
      h += '</div></div>';
    }
    if (card.tips && card.tips.length) {
      h += '<div class="ai-answer-sec"><span class="ai-sec-title">提示</span><ul class="ai-tip-list">';
      card.tips.forEach(function(t) { h += '<li>' + e(t) + '</li>'; });
      h += '</ul></div>';
    }
    if (card.actions && card.actions.length) {
      h += '<div class="ai-answer-actions">';
      card.actions.forEach(function(a) {
        h += '<button type="button" class="ai-act' + (a.p ? ' primary' : '') + '"'
          + (a.q ? ' data-q="' + e(a.q) + '"' : '')
          + (a.goto ? ' data-goto="' + e(a.goto) + '"' : '')
          + (a.prefill ? ' data-prefill="' + e(a.prefill) + '"' : '')
          + (a.speak ? ' data-speak="' + e(a.speak) + '"' : '')
          + '><svg class="icon" aria-hidden="true" focusable="false"><use href="#' + (a.i || 'i-sparkle') + '"/></svg>'
          + e(a.t) + '</button>';
      });
      h += '</div>';
    }
    return h + '</div>';
  };

  AiChatModule.prototype._hhmm = function() {
    var d = new Date();
    return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  };

  // 清空对话按钮：v2 的真实入口在设置抽屉 #ai-clear-slot；
  // 旧 DOM 下回退到对话标题右侧（保持原有可点性）。
  AiChatModule.prototype._chatToolbar = function() {
    var host = document.getElementById('ai-clear-slot')
      || document.querySelector('.ai-conv-head .ai-card-title')
      || document.querySelector('.ai-chat-card .ai-card-title')
      || document.querySelector('.ai-chat-card h3');
    if (!host || host.querySelector('.ai-clear-chat')) return;
    var self = this;
    var count = this._history().length;
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
    // 当前会话若已归档，一并从历史栏移除
    var id = this._sessionId;
    if (id) {
      var list = this._sessions().filter(function(s) { return s.id !== id; });
      this._saveSessions(list);
    }
    var box = this._msgBox();
    if (box) {
      box.innerHTML = '';
      this._welcome();
    }
    var btn = document.querySelector('.ai-clear-chat');
    if (btn) btn.title = '对话记录已清空';
    this._renderHistory();
    if (typeof Toast === 'object' && Toast.success) Toast.success('对话已清空');
  };

  // 会话历史：localStorage ai_ 前缀，最多 50 条（含按钮的安全 HTML，全部插值均已转义）
  // card 为可选结构化卡片，恢复历史时用它重渲染，没有则回退 html。
  // 兼容：早期版本只存 {role,html,ts}，缺 sessionId 的一律归入当前会话。
  AiChatModule.prototype._storeHistory = function(who, html, card) {
    try {
      var key = 'ai_chat_history';
      var list = this._history();
      var item = { role: who, html: html, ts: Date.now() };
      if (card) item.card = card;
      list.push(item);
      if (list.length > 50) list = list.slice(list.length - 50);
      DataStore.setProgress(key, list);
      this._touchSession(list);
    } catch (e) {}
  };

  // 打字中气泡（不写入历史，完成时整体移除）
  AiChatModule.prototype._aiThinking = function() {
    var box = this._msgBox();
    if (!box) return null;
    var div = document.createElement('div');
    div.className = 'ai-msg ai-msg-ai';
    div.innerHTML = '<div class="ai-msg-avatar"><svg class="icon" aria-hidden="true" focusable="false"><use href="#i-robot"/></svg></div>'
      + '<div class="ai-msg-body"><div class="ai-msg-meta"><span class="who">AI 教练</span><span>正在输入</span></div>'
      + '<div class="ai-msg-bubble" style="padding:0"><span class="ai-typing"><i></i><i></i><i></i></span></div></div>';
    box.appendChild(div);
    this._scrollToLatest();
    return div;
  };

  AiChatModule.prototype.sendFromInput = function() {
    var input = document.getElementById('ai-chat-input');
    if (!input) return;
    var text = input.value.trim();
    if (!text) { if (typeof Toast === 'object' && Toast.warning) Toast.warning('请输入一个问题'); return; }
    input.value = '';
    this._syncComposer();
    this.ask(text);
  };

  // 对外主入口：解析用户问题
  AiChatModule.prototype.ask = function(text) {
    text = String(text || '').trim();
    if (!text) return;
    this._card = null;
    this._append('user', escapeHtml(text));
    var lower = text.toLowerCase();
    var reply = this._handle(lower, text);
    var card = this._card || null;
    this._card = null;
    this._append('ai', reply, false, card);
    this._refreshChips();
    this._renderHistory();
    if (card && this._settings.autoSpeak) this._speak(this._plain(reply));
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
    this._card = {
      lead: '对比「<span class="w" lang="en">' + escapeHtml(a) + '</span>」与「<span class="w" lang="en">' + escapeHtml(b) + '</span>」',
      defs: [a, b].map(function(w) {
        var e = index[w];
        return {
          en: e ? (e.word + (e.phonetic ? ' ' + e.phonetic : '')) : w,
          zh: e ? ((e.pos || '') + ' ' + (e.chinese || '')).trim() : '词库暂未收录'
        };
      }),
      summary: 'AI 正在补充具体用法区别…',
      actions: [{ t: '查 ' + a, i: 'i-search', goto: 'search', prefill: a }, { t: '查 ' + b, i: 'i-search', goto: 'search', prefill: b }]
    };
    return '对比「' + escapeHtml(a) + '」与「' + escapeHtml(b) + '」：<br>' + line(a) + '<br>' + line(b)
      + '<br><span style="color:var(--text-secondary);font-size:var(--text-xs)">AI 正在补充具体区别…</span>';
  };

  // 异步 LLM 增强：打字中占位 → 成功后替换为 AI 气泡（含朗读按钮），失败静默（离线兜底已就位）
  AiChatModule.prototype._llmAppend = function(intent, prompt) {
    var self = this;
    // 助手设置里关掉 LLM 增强后，不再发请求、也不再显示打字占位
    if (this._settings && this._settings.llm === false) return;
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
    this._card = {
      lead: '正在翻译「' + escapeHtml(q) + '」',
      summary: '在线增强开启时会由 AI 给出译文；否则可在查单词页直接搜索。',
      actions: [{ t: '去查单词页', i: 'i-search', p: true, goto: 'search', prefill: word || q }]
    };
    return '正在为你翻译「' + escapeHtml(q) + '」…<br>'
      + '<span style="color:var(--text-secondary);font-size:var(--text-xs)">如未收到回复，可在查单词页直接搜索。</span>';
  };

  AiChatModule.prototype._encourage = function() {
    var streak = 0;
    try { streak = calculateStreak(DataStore.getProgress('checkins', {})) || 0; } catch (e) {}
    this._card = {
      lead: '能坚持到这里已经很了不起！',
      summary: (streak > 0 ? ('你已连续打卡 ' + streak + ' 天，习惯正在形成。') : '')
        + '英语学习是积累的过程，今天的每一次复习都会让明天的你更轻松。',
      tips: ['允许偶尔慢一点，但别停下来', '把目标拆小：今天先完成 10 个词就够了'],
      actions: [{ t: '现在背 10 个词', i: 'i-book', p: true, goto: 'word' }]
    };
    return '能坚持到这里已经很了不起！' + (streak > 0 ? '你已连续打卡 <b>' + streak + '</b> 天，习惯正在形成。' : '')
      + '英语学习是积累的过程，今天的每一次复习都会让明天的你更轻松。<br>'
      + '· 允许偶尔慢一点，但别停下来<br>'
      + '· 把目标拆小：今天先完成 <b>10 个词</b> 就够了<br><br>'
      + '<button type="button" class="ai-reply-btn" data-goto="word">现在背 10 个词</button>';
  };

  AiChatModule.prototype._tips = function() {
    this._card = {
      lead: '提升记忆效果的实用技巧',
      tips: [
        '用句子记单词：别单背词义，放进例句里（对我说「给 happy 生成例句」）',
        '间隔复习：按艾宾浩斯曲线复习，胜过一次猛背',
        '音形对应：拼写错多就练「错词强化」，注意元音/辅音对应',
        '少量多次：每天 10 个新词 + 复习旧词，优于一次 50 个'
      ],
      actions: [{ t: '开始今天的学习', i: 'i-book', p: true, goto: 'word' }]
    };
    return '提升记忆效果的实用技巧：<br>'
      + '· 1. 用句子记单词：别单背词义，放进例句里（对我说「给 happy 生成例句」）<br>'
      + '· 2. 间隔复习：按艾宾浩斯曲线复习，胜过一次猛背<br>'
      + '· 3. 音形对应：拼写错多就练「错词强化」，注意元音/辅音对应<br>'
      + '· 4. 少量多次：每天 10 个新词 + 复习旧词，优于一次 50 个<br><br>'
      + '<button type="button" class="ai-reply-btn" data-goto="word">开始今天的学习</button>';
  };

  AiChatModule.prototype._practice = function() {
    var open = 'Hi! I am your AI coach. What is your favorite book?';
    this._card = {
      lead: '口语陪练开始',
      summary: '我对你说一句英语，你用英语回答我。',
      defs: [{ en: open, zh: '你最喜欢哪本书？' }],
      tips: ['想练特定话题就告诉我，比如「聊吃的」「练自我介绍」'],
      actions: [{ t: '播放开场', i: 'i-volume', p: true, speak: open }]
    };
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
      // 结构化卡片（v2）：结论行（词+音标+词性）/ 释义 / 例句 / 提示 / 行动
      this._card = {
        lead: '<span class="w" lang="en">' + escapeHtml(entry.word) + '</span>'
          + (entry.phonetic ? ' <span class="ipa">' + escapeHtml(entry.phonetic) + '</span>' : '')
          + (entry.pos ? ' <span class="pos">' + escapeHtml(entry.pos) + '</span>' : ''),
        defs: [{ en: entry.word, zh: entry.chinese || '' }],
        examples: entry.example ? [{ en: entry.example, zh: entry.example_cn || '' }] : [],
        tips: [statusText],
        actions: [
          { t: '朗读全部', i: 'i-volume', speak: speakAll },
          { t: '查单词页', i: 'i-search', goto: 'search', prefill: entry.word },
          { t: '生成更多例句', i: 'i-sparkle', q: '给 ' + entry.word + ' 生成例句' }
        ]
      };
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
    this._card = {
      lead: '词库里没有「' + escapeHtml(word) + '」',
      summary: '可能是生词或尚未收录。可以让我联网解释，或直接在查单词页搜索。',
      actions: [{ t: '在查单词页搜索', i: 'i-search', p: true, goto: 'search', prefill: word }]
    };
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
    this._card = {
      lead: '「<span class="w" lang="en">' + escapeHtml(word) + '</span>」的例句',
      examples: lines.map(function(l) { return { en: l, zh: '' }; }),
      actions: [
        { t: '朗读全部', i: 'i-volume', speak: joined },
        { t: '再要更地道的', i: 'i-refresh', q: '给 ' + word + ' 生成更地道的例句' }
      ]
    };
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
    this._card = {
      lead: '你的学习概况',
      defs: [
        { en: 'Streak ' + streak, zh: '连续打卡（天）' },
        { en: 'Mastered ' + mastered, zh: '已掌握词汇（今日新学 ' + todayNew + ' / 已复习 ' + todayDone + '）' },
        { en: 'Due ' + due, zh: '待复习（建议优先安排）' },
        { en: 'Level ' + escapeHtml(String(level)), zh: '当前等级 · 积分 ' + escapeHtml(String(+gami.points || 0)) }
      ],
      actions: [
        { t: '看首页总览', i: 'i-analytics', p: true, goto: 'home' },
        { t: '刷新报告', i: 'i-refresh', q: '我学得怎么样' }
      ]
    };
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
    this._card = {
      lead: '今日学习计划',
      summary: due > 0 ? ('先清掉 ' + due + ' 个待复习词，再补新词。') : '今天没有待复习的词，可以专心学新词。',
      tips: plan.map(function(p) { return p.replace(/<[^>]*>/g, ''); }),
      actions: [
        { t: '立即去背单词', i: 'i-book', p: true, goto: 'word' },
        { t: '用番茄钟', i: 'i-timer', goto: 'pomodoro' }
      ]
    };
    return '给你制定今日学习计划：<br><br>' + plan.join('<br>') + '<br><br>'
      + '<button type="button" class="ai-reply-btn" data-goto="word">立即去背单词</button>'
      + (due > 0 ? '<button type="button" class="ai-reply-btn" data-goto="word" data-mode="review">先复习</button>' : '');
  };

  // 错题分析
  AiChatModule.prototype._analyzeMistakes = function() {
    var mistakes = DataStore.getProgress('mistakes', []);
    if (!mistakes.length) {
      this._card = {
        lead: '错题本是空的',
        summary: '目前一道错题都没有，状态很好。',
        actions: [{ t: '去背单词保持状态', i: 'i-book', p: true, goto: 'word' }]
      };
      return '太棒了，目前错题本里没有错题！<br><button type="button" class="ai-reply-btn" data-goto="word">去背单词保持状态</button>';
    }
    var names = { 'word': '背单词', 'spelling': '拼写', 'grammar': '语法', 'reading': '阅读', 'listening': '听力', 'context': '语境填空', 'speak': '跟读', 'pk': '单词PK' };
    var weak = this._roots(mistakes, 3);
    this._card = {
      lead: '共 ' + mistakes.length + ' 道错题',
      tips: weak.map(function(w) {
        return (names[w.name] || w.name) + '：' + w.count + ' 题' + (w.name === 'spelling' ? '（多为拼写易混，建议加强音形对应）' : '');
      }),
      summary: '教练建议：优先处理「拼写」类错题，它们通常来自元音/辅音对应不熟。',
      actions: [
        { t: '打开错题本', i: 'i-list', p: true, goto: 'mistakes' },
        { t: '错词强化', i: 'i-spellcheck', goto: 'mistake-train' }
      ]
    };
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
      this._card = {
        lead: '目前没有待复习的单词',
        summary: '记忆曲线状态很好，可以开始学新词。',
        actions: [{ t: '学几个新词', i: 'i-book', p: true, goto: 'word' }]
      };
      return '目前没有待复习的单词，记忆曲线状态很好！<br><button type="button" class="ai-reply-btn" data-goto="word">学几个新词</button>';
    }
    this._card = {
      lead: '今日待复习 ' + due.length + ' 词',
      summary: '按艾宾浩斯记忆曲线，越早复习效果越好。',
      tips: ['背单词卡片支持「待复习优先」排序'],
      actions: [
        { t: '开始复习', i: 'i-refresh', p: true, goto: 'word' },
        { t: '看看学习计划', i: 'i-target', q: '帮我制定学习计划' }
      ]
    };
    return '今日待复习 <b>' + due.length + '</b> 词。按艾宾浩斯记忆曲线，越早复习效果越好。<br>'
      + '<button type="button" class="ai-reply-btn" data-goto="word" data-mode="review">开始复习</button>'
      + '<br><span style="color:var(--text-secondary);font-size:var(--text-xs)">提示：背单词卡片支持「待复习优先」排序。</span>';
  };

  // 发音建议
  AiChatModule.prototype._pronAdvice = function() {
    this._card = {
      lead: '发音练习建议',
      tips: [
        '先在「跟读练习」听标准发音，再模仿',
        '注意重音位置与元音开口度',
        '单个音素掌握后，再连读整句'
      ],
      actions: [{ t: '去跟读练习', i: 'i-mic', p: true, goto: 'speak' }]
    };
    return '发音练习建议：<br>· 1. 先在「跟读练习」听标准发音，再模仿<br>'
      + '· 2. 注意重音位置与元音开口度<br>'
      + '· 3. 单个音素掌握后，再连读整句<br><br>'
      + '<button type="button" class="ai-reply-btn" data-goto="speak">去跟读练习</button>';
  };

  AiChatModule.prototype._greeting = function() {
    this._card = {
      lead: '你好！我是你的 AI 英语教练',
      summary: '输入「帮助」查看我能帮你做什么。',
      actions: [{ t: '我能做什么', i: 'i-help', p: true, q: '帮助' }]
    };
    return '你好！我是你的 AI 英语教练。输入「帮助」查看我能帮你做什么。';
  };

  AiChatModule.prototype._help = function() {
    this._card = {
      lead: '你可以这样问我',
      tips: ['我学得怎么样', '帮我制定学习计划', '分析我的错题', '解释单词 + 单词', '给某单词生成例句', '给我发音建议', '今天该复习哪些词'],
      actions: [
        { t: '我学得怎么样', i: 'i-analytics', p: true, q: '我学得怎么样' },
        { t: '制定学习计划', i: 'i-target', q: '帮我制定学习计划' }
      ]
    };
    return '你可以这样问我：<br>· 我学得怎么样<br>· 帮我制定学习计划<br>· 分析我的错题<br>· 解释单词 + 单词<br>· 给某单词生成例句<br>· 给我发音建议<br>· 今天该复习哪些词';
  };

  AiChatModule.prototype._fallback = function() {
    this._card = {
      lead: '我暂时没理解这个问题',
      tips: ['解释单词 apple', '帮我制定学习计划', '分析我的错题', '我学得怎么样', '给我发音建议'],
      actions: [{ t: '看看我能做什么', i: 'i-help', p: true, q: '帮助' }]
    };
    return '我暂时没理解这个问题。你可以试试：<br>· 解释单词 apple<br>· 帮我制定学习计划<br>· 分析我的错题<br>· 我学得怎么样<br>· 给我发音建议';
  };

  // ==================== v2：设置 / 会话 / 交互 ====================

  AiChatModule.prototype._loadSettings = function() {
    var s = {};
    try {
      var raw = DataStore.getProgress('ai_assistant_settings', null);
      if (raw && typeof raw === 'object') s = raw;
    } catch (e) {}
    Object.keys(DEFAULT_SETTINGS).forEach(function(k) {
      if (typeof s[k] === 'undefined') s[k] = DEFAULT_SETTINGS[k];
    });
    return s;
  };

  AiChatModule.prototype._saveSettings = function() {
    try { DataStore.setProgress('ai_assistant_settings', this._settings); } catch (e) {}
  };

  // ---- 会话（历史栏）----
  // ai_chat_history 仍是「当前会话」，归档的会话快照存 ai_chat_sessions。
  // 这样既保住旧数据的读写语义，又能列出多条历史对话。
  AiChatModule.prototype._sessions = function() {
    try {
      var l = DataStore.getProgress('ai_chat_sessions', []) || [];
      return Array.isArray(l) ? l : [];
    } catch (e) { return []; }
  };

  AiChatModule.prototype._saveSessions = function(list) {
    try { DataStore.setProgress('ai_chat_sessions', list); } catch (e) {}
  };

  // 每次写入历史后同步会话标题（取第一条用户提问）与条数
  AiChatModule.prototype._touchSession = function(list) {
    if (!this._sessionId) this._sessionId = 's' + Date.now();
    var sessions = this._sessions();
    var cur = null, i;
    for (i = 0; i < sessions.length; i++) {
      if (sessions[i].id === this._sessionId) { cur = sessions[i]; break; }
    }
    var title = '新对话';
    for (i = 0; i < list.length; i++) {
      if (list[i] && list[i].role === 'user') { title = this._plain(list[i].html) || '新对话'; break; }
    }
    if (title.length > 18) title = title.slice(0, 18) + '…';
    if (!cur) {
      cur = { id: this._sessionId, title: title, ts: Date.now() };
      sessions.unshift(cur);
    } else {
      cur.title = title;
      cur.ts = Date.now();
    }
    if (sessions.length > 20) sessions = sessions.slice(0, 20);
    this._saveSessions(sessions);
  };

  AiChatModule.prototype._archiveCurrent = function() {
    var list = this._history();
    if (!list.length || !this._sessionId) return;
    var sessions = this._sessions();
    for (var i = 0; i < sessions.length; i++) {
      if (sessions[i].id === this._sessionId) { sessions[i].msgs = list; sessions[i].count = list.length; break; }
    }
    this._saveSessions(sessions);
  };

  AiChatModule.prototype._newSession = function() {
    this._archiveCurrent();
    try { DataStore.setProgress('ai_chat_history', []); } catch (e) {}
    this._sessionId = 's' + Date.now();
    var box = this._msgBox();
    if (box) { box.innerHTML = ''; this._welcome(); }
    this._refreshChips();
    this._renderHistory();
    this._closeRail();
    if (typeof Toast === 'object' && Toast.success) Toast.success('已开始新对话');
  };

  AiChatModule.prototype._loadSession = function(id) {
    if (!id || id === this._sessionId) return;
    this._archiveCurrent();
    var sessions = this._sessions();
    var target = null;
    for (var i = 0; i < sessions.length; i++) {
      if (sessions[i].id === id) { target = sessions[i]; break; }
    }
    if (!target) return;
    this._sessionId = id;
    try { DataStore.setProgress('ai_chat_history', target.msgs || []); } catch (e) {}
    var box = this._msgBox();
    if (box) { box.innerHTML = ''; this._welcome(true); }
    this._renderHistory();
  };

  AiChatModule.prototype._deleteSession = function(id) {
    if (!id) return;
    var self = this;
    var list = this._sessions().filter(function(s) { return s.id !== id; });
    this._saveSessions(list);
    if (id === this._sessionId) {
      this._sessionId = null;
      try { DataStore.setProgress('ai_chat_history', []); } catch (e) {}
      var box = this._msgBox();
      if (box) { box.innerHTML = ''; this._welcome(); }
    }
    this._renderHistory();
    if (typeof Toast === 'object' && Toast.success) Toast.success('已删除该对话');
  };

  AiChatModule.prototype._renderHistory = function(q) {
    var box = document.getElementById('ai-hist-list');
    if (!box) return;
    var e = window.escapeHtml || function(s) { return String(s == null ? '' : s); };
    var self = this;
    var cur = this._history();
    var items = [];
    // 当前会话永远排最前（即使还没发言，也要在列表里可见，否则「新对话」后像没反应）
    var title = '当前对话';
    for (var i = 0; i < cur.length; i++) {
      if (cur[i] && cur[i].role === 'user') { title = this._plain(cur[i].html) || title; break; }
    }
    items.push({ id: this._sessionId || 'current', title: title, ts: Date.now(), count: cur.length, current: true });
    this._sessions().forEach(function(s) {
      if (self._sessionId && s.id === self._sessionId) return;
      items.push({ id: s.id, title: s.title || '新对话', ts: s.ts || Date.now(), count: (s.msgs && s.msgs.length) || s.count || 0, current: false });
    });

    var kw = String(q || '').trim().toLowerCase();
    if (kw) items = items.filter(function(s) { return String(s.title).toLowerCase().indexOf(kw) > -1; });
    if (!items.length) { box.innerHTML = '<div class="ai-hist-empty">没有匹配的对话</div>'; return; }

    // 分组：今天 / 昨天 / 更早
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var groups = { '今天': [], '昨天': [], '更早': [] };
    items.forEach(function(s) {
      var day = new Date(s.ts || Date.now()); day.setHours(0, 0, 0, 0);
      var diff = Math.round((today - day) / 86400000);
      groups[diff <= 0 ? '今天' : (diff === 1 ? '昨天' : '更早')].push(s);
    });
    var html = '';
    ['今天', '昨天', '更早'].forEach(function(g) {
      if (!groups[g].length) return;
      html += '<div class="ai-hist-group">' + g + '</div>';
      groups[g].forEach(function(s) {
        html += '<div class="ai-hist-item" data-id="' + e(s.id) + '">'
          + '<button type="button" class="ai-hist-main" aria-current="' + (s.current ? 'true' : 'false') + '">'
          + '<span class="t">' + e(s.title) + '</span>'
          + (s.count ? '<span class="n">' + s.count + '</span>' : '')
          + '</button>'
          + '<button type="button" class="ai-hist-del" data-del="' + e(s.id) + '" aria-label="删除该对话">'
          + '<svg class="icon" aria-hidden="true" focusable="false"><use href="#i-delete"/></svg></button>'
          + '</div>';
      });
    });
    box.innerHTML = html;
  };

  // ---- 抽屉 / 历史抽屉 ----
  AiChatModule.prototype._openDrawer = function() {
    var d = document.getElementById('ai-settings-drawer');
    var scrim = document.getElementById('ai-scrim');
    var tog = document.getElementById('ai-settings-toggle');
    if (!d) return;
    d.classList.add('open');
    d.setAttribute('aria-hidden', 'false');
    if (scrim) scrim.classList.add('show');
    if (tog) tog.setAttribute('aria-expanded', 'true');
    var first = d.querySelector('.ai-switch');
    if (first && first.focus) first.focus();
  };

  AiChatModule.prototype._closeDrawer = function() {
    var d = document.getElementById('ai-settings-drawer');
    var scrim = document.getElementById('ai-scrim');
    var tog = document.getElementById('ai-settings-toggle');
    if (!d || !d.classList.contains('open')) return;
    d.classList.remove('open');
    d.setAttribute('aria-hidden', 'true');
    if (scrim && !this._railOpen()) scrim.classList.remove('show');
    if (tog) { tog.setAttribute('aria-expanded', 'false'); if (tog.focus) tog.focus(); }
  };

  AiChatModule.prototype._toggleDrawer = function() {
    var d = document.getElementById('ai-settings-drawer');
    if (!d) return;
    if (d.classList.contains('open')) this._closeDrawer(); else this._openDrawer();
  };

  AiChatModule.prototype._railOpen = function() {
    var r = document.getElementById('ai-history-rail');
    return !!(r && r.classList.contains('open'));
  };

  AiChatModule.prototype._openRail = function() {
    var r = document.getElementById('ai-history-rail');
    var scrim = document.getElementById('ai-scrim');
    var tog = document.getElementById('ai-hist-toggle');
    if (!r) return;
    r.classList.add('open');
    if (scrim) scrim.classList.add('show');
    if (tog) tog.setAttribute('aria-expanded', 'true');
  };

  AiChatModule.prototype._closeRail = function() {
    var r = document.getElementById('ai-history-rail');
    var scrim = document.getElementById('ai-scrim');
    var tog = document.getElementById('ai-hist-toggle');
    if (!r) return;
    r.classList.remove('open');
    if (tog) tog.setAttribute('aria-expanded', 'false');
    var d = document.getElementById('ai-settings-drawer');
    if (scrim && !(d && d.classList.contains('open'))) scrim.classList.remove('show');
  };

  AiChatModule.prototype._toggleRail = function() {
    if (this._railOpen()) this._closeRail(); else this._openRail();
  };

  // ---- 滚动定位 ----
  // 新消息：回答放得下就贴底；放不下则把回答顶部对齐可视区顶，
  // 保证 18px 的结论行第一眼可见（一律贴底会把最重要的信息藏在结尾）。
  AiChatModule.prototype._scrollToLatest = function() {
    var self = this;
    this._userScrolled = false;
    this._raf(function() {
      var s = document.getElementById('ai-msg-scroll');
      var box = self._msgBox();
      if (!s || !box) return;
      var last = box.lastElementChild;
      if (!last) return;
      var h = last.getBoundingClientRect().height;
      if (h <= s.clientHeight - 32) s.scrollTop = s.scrollHeight;
      else s.scrollTop += last.getBoundingClientRect().top - s.getBoundingClientRect().top - 16;
      var jump = document.getElementById('ai-jump-latest');
      if (jump) jump.hidden = true;
    });
  };

  AiChatModule.prototype._scrollToBottom = function() {
    var s = document.getElementById('ai-msg-scroll');
    if (s) s.scrollTop = s.scrollHeight;
    this._userScrolled = false;
    var jump = document.getElementById('ai-jump-latest');
    if (jump) jump.hidden = true;
  };

  AiChatModule.prototype._updateJump = function() {
    var s = document.getElementById('ai-msg-scroll');
    var btn = document.getElementById('ai-jump-latest');
    if (!s || !btn) return;
    btn.hidden = (s.scrollHeight - s.scrollTop - s.clientHeight) <= 80;
  };

  AiChatModule.prototype._raf = function(fn) {
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(fn);
    else setTimeout(fn, 16);
  };

  // ---- 点击委托 ----
  AiChatModule.prototype._onDocClick = function(ev) {
    var t = ev.target;
    if (!t || !t.closest) return;
    var self = this;

    // 历史项：删除 / 切换（容器 div + 两个并列 button，禁止嵌套可交互元素）
    var del = t.closest('[data-del]');
    if (del) { ev.stopPropagation(); this._deleteSession(del.getAttribute('data-del')); return; }
    var hist = t.closest('.ai-hist-item');
    if (hist) { this._loadSession(hist.getAttribute('data-id')); this._closeRail(); return; }

    // 快捷提问 / 回答里的行动按钮
    var askBtn = t.closest('.ai-act[data-q], .ai-chip[data-q]');
    if (askBtn) { this.ask(askBtn.getAttribute('data-q')); return; }

    // 消息级操作
    var act = t.closest('[data-act]');
    if (act) { this._msgAction(act.getAttribute('data-act'), act.closest('.ai-msg')); return; }

    // 原有：朗读 / 预填查单词页
    var b = t.closest('[data-speak], [data-prefill]');
    if (!b) return;
    if (b.getAttribute('data-speak')) this._speak(b.getAttribute('data-speak'));
    if (b.hasAttribute('data-prefill')) {
      var input = document.getElementById('search-input');
      if (input) input.value = b.getAttribute('data-prefill');
    }
  };

  AiChatModule.prototype._msgAction = function(kind, msgEl) {
    if (!msgEl) return;
    var bubble = msgEl.querySelector('.ai-msg-bubble');
    var text = bubble ? (bubble.textContent || '').trim() : '';
    if (kind === 'copy') {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function() {
          if (typeof Toast === 'object' && Toast.success) Toast.success('已复制');
        }, function() {
          if (typeof Toast === 'object' && Toast.error) Toast.error('复制失败');
        });
      } else if (typeof Toast === 'object' && Toast.info) {
        Toast.info('当前环境不支持一键复制');
      }
      return;
    }
    if (kind === 'speak') { this._speak(text); return; }
    if (kind === 'regen') { this._regen(msgEl); return; }
  };

  // 重新生成：找回该回答之前最近一条用户提问，删掉旧回答后重问
  AiChatModule.prototype._regen = function(msgEl) {
    var box = this._msgBox();
    if (!box) return;
    var nodes = [].slice.call(box.children);
    var i = nodes.indexOf(msgEl);
    var q = '';
    for (var j = i - 1; j >= 0; j--) {
      if (nodes[j].classList && nodes[j].classList.contains('ai-msg-user')) {
        var b = nodes[j].querySelector('.ai-msg-bubble');
        q = b ? (b.textContent || '').trim() : '';
        break;
      }
    }
    if (!q) {
      if (typeof Toast === 'object' && Toast.info) Toast.info('找不到可重新生成的问题');
      return;
    }
    if (msgEl.parentNode) msgEl.parentNode.removeChild(msgEl);
    this.ask(q);
  };

  AiChatModule.prototype._speak = function(text) {
    text = String(text || '').trim();
    if (!text) return;
    try {
      if (window.SpeechUtil && typeof SpeechUtil.speakWord === 'function') SpeechUtil.speakWord(text);
      else if (typeof SpeechUtil !== 'undefined' && typeof SpeechUtil.speak === 'function') SpeechUtil.speak(text);
    } catch (e) {}
  };

  AiChatModule.prototype._plain = function(html) {
    return String(html || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\[跳转:[a-z-]+\]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // ---- 语音输入（Web Speech API；不支持时按钮保持隐藏） ----
  AiChatModule.prototype._voiceInput = function() {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      if (typeof Toast === 'object' && Toast.info) Toast.info('当前环境不支持语音输入');
      return;
    }
    var self = this;
    var mic = document.getElementById('ai-mic');
    var rec;
    try { rec = new SR(); } catch (e) { return; }
    rec.lang = this._settings.accent || 'en-US';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    if (mic) mic.setAttribute('aria-pressed', 'true');
    rec.onresult = function(ev) {
      var text = (ev.results && ev.results[0] && ev.results[0][0]) ? ev.results[0][0].transcript : '';
      var input = document.getElementById('ai-chat-input');
      if (input && text) {
        input.value = (input.value ? input.value + ' ' : '') + text;
        self._syncComposer();
        if (input.focus) input.focus();
      }
    };
    rec.onerror = function() {
      if (typeof Toast === 'object' && Toast.info) Toast.info('没听清，再说一次');
    };
    rec.onend = function() { if (mic) mic.removeAttribute('aria-pressed'); };
    try { rec.start(); } catch (e) {}
  };

  // ---- 上下文栏（≥1280 显示）：复用首页已有的统计口径 ----
  AiChatModule.prototype._renderContext = function() {
    var statsBox = document.getElementById('ai-ctx-stats');
    if (!statsBox) return;
    var e = window.escapeHtml || function(s) { return String(s == null ? '' : s); };
    var s = { mastered: 0, due: 0, streak: 0, todayCount: 0, level: 1, points: 0 };
    try {
      var progress = DataStore.getProgress('word_progress', {}) || {};
      var t = getLocalDateStr();
      Object.keys(progress).forEach(function(k) {
        var p = progress[k];
        if (!p) return;
        if (p.status === 'mastered') s.mastered++;
        else if (window.UserState && window.UserState.isDue) { if (window.UserState.isDue(p, t)) s.due++; }
        else if (p.status && p.nextReview && p.nextReview <= t) s.due++;
      });
      var checkins = DataStore.getProgress('checkins', {}) || {};
      s.todayCount = checkins[t] || 0;
      s.streak = (typeof calculateStreak === 'function' ? calculateStreak(checkins) : 0) || 0;
      var g = DataStore.getProgress('gamification', {}) || {};
      s.points = +g.points || 0;
      s.level = g.level || (s.points ? Math.floor(s.points / 100) + 1 : 1);
    } catch (err) {}

    statsBox.innerHTML = [
      ['连续打卡（天）', s.streak],
      ['已掌握词汇', s.mastered],
      ['今日已学（词）', s.todayCount],
      ['等级 / 积分', 'Lv.' + s.level]
    ].map(function(pair) {
      return '<div class="ai-stat"><div class="v">' + e(String(pair[1])) + '</div><div class="l">' + e(pair[0]) + '</div></div>';
    }).join('');

    var tasksBox = document.getElementById('ai-ctx-tasks');
    if (tasksBox) {
      var goal = 10;
      try { goal = Number(DataStore.getProgress('daily_goal', 10)) || 10; } catch (err) {}
      var doneNew = s.todayCount >= goal;
      var doneSpeak = false;
      try {
        var sp = DataStore.getProgress('speak_sessions', []) || [];
        var td = getLocalDateStr();
        doneSpeak = Array.isArray(sp) && sp.some(function(x) { return String(x.date || x.ts || '').slice(0, 10) === td; });
      } catch (err) {}
      tasksBox.innerHTML = [
        ['复习待巩固词', s.due === 0],
        ['完成 1 组听力跟读', doneSpeak],
        ['达成今日目标 ' + s.todayCount + '/' + goal, doneNew]
      ].map(function(t) {
        return '<div class="ai-task" data-done="' + (t[1] ? 'true' : 'false') + '"><span class="box"></span>' + e(t[0]) + '</div>';
      }).join('');
    }

    var weakBox = document.getElementById('ai-ctx-weak');
    if (weakBox) {
      var names = { 'word': '背单词', 'spelling': '拼写', 'grammar': '语法', 'reading': '阅读', 'listening': '听力', 'context': '语境填空', 'speak': '跟读', 'pk': '单词PK' };
      var weak = [];
      try { weak = this._roots(DataStore.getProgress('mistakes', []) || [], 3); } catch (err) {}
      weakBox.innerHTML = weak.length
        ? weak.map(function(w) { return '<li>' + e(names[w.name] || w.name) + '：' + w.count + ' 题</li>'; }).join('')
        : '<li class="ai-ctx-empty">暂无错题记录</li>';
    }
  };

  return AiChatModule;
})();

if (typeof window !== 'undefined') window.AiChatModule = AiChatModule;
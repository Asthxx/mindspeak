// ==================== 安全工具 ====================
function safeBind(id, event, handler) {
  var el = document.getElementById(id);
  if (el) el.addEventListener(event, handler);
}
function safeQuery(selector, event, handler) {
  var el = document.querySelector(selector);
  if (el) el.addEventListener(event, handler);
}
function escapeHtml(str) {
  if (str == null) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function safeNumber(val, fallback) {
  var n = parseInt(val, 10);
  return isNaN(n) ? (fallback || 0) : n;
}
// 随机抽 n 个元素（部分 Fisher-Yates，只洗前 n 个，O(n)）。
// 12 万词词库下替代 slice().sort(random) 的全量排序，开局训练模块不再卡顿。
function shuffleSample(arr, n) {
  var len = arr.length;
  var k = Math.min(n, len);
  var i, j, tmp;
  for (i = 0; i < k; i++) {
    j = i + Math.floor(Math.random() * (len - i));
    tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  }
  return arr.slice(0, k);
}
// 本地日期字符串（YYYY-MM-DD）。全局统一用这个取"今天/某天"，
// 避免 toISOString 按 UTC 转日期导致东八区凌晨 0-8 点记到昨天。
function getLocalDateStr(d) {
  d = d || new Date();
  var y = d.getFullYear();
  var m = String(d.getMonth() + 1).padStart(2, '0');
  var day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

// 计算连续打卡天数：从今天往回数连续的 days（今天没学则从昨天起算），与徽章口径一致
function calculateStreak(checkins) {
  checkins = checkins || {};
  var d = new Date();
  if (!(checkins[getLocalDateStr(d)] > 0)) d.setDate(d.getDate() - 1);
  var streak = 0;
  while (checkins[getLocalDateStr(d)] > 0 && streak < 3660) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

// ==================== Toast 通知 ====================
var Toast = {
  container: null,
  init: function() {
    if (this.container) return;
    this.container = document.createElement('div');
    this.container.className = 'toast-container';
    document.body.appendChild(this.container);
  },
  show: function(message, type, duration) {
    this.init();
    type = type || 'info';
    duration = duration || 3000;
    var toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.innerHTML = '<span class="toast-message">' + escapeHtml(message) + '</span>';
    this.container.appendChild(toast);
    requestAnimationFrame(function() { toast.classList.add('toast-show'); });
    setTimeout(function() {
      toast.classList.remove('toast-show');
      toast.classList.add('toast-hide');
      setTimeout(function() { toast.remove(); }, 300);
    }, duration);
  },
success: function(msg) { this.show(msg, 'success'); },
  error: function(msg) { this.show(msg, 'error'); },
  warning: function(msg) { this.show(msg, 'warning'); },
  info: function(msg) { this.show(msg, 'info'); }
};

// ==================== 通用确认弹窗（替代 confirm/alert） ====================
// 微信 webview 等环境的原生 confirm()/alert() 行为不稳定（可能直接返回或无回调），
// 统一换成基于 .modal 的自定义确认框，回调式用法：
//   ConfirmBox.confirm('提示文字', function(){ /* 确认后执行 */ }, { title:'...', okText:'...', danger:true });
var ConfirmBox = {
  _ready: false,
  _cb: null,
  _onCancel: null,
  init: function() {
    if (this._ready) return;
    this._ready = true;
    var self = this;
    var el = document.createElement('div');
    el.className = 'modal hidden';
    el.id = 'modal-confirm';
    el.innerHTML =
      '<div class="modal-content" style="width:400px">' +
        '<h3 id="confirm-title">请确认</h3>' +
        '<div id="confirm-msg" style="font-size:0.95rem;color:var(--text-secondary);line-height:1.7"></div>' +
        '<div class="modal-actions" style="justify-content:flex-end">' +
          '<button type="button" class="btn" id="confirm-cancel">取消</button>' +
          '<button type="button" class="btn btn-primary" id="confirm-ok">确定</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(el);
    el.addEventListener('click', function(e) { if (e.target === el) self.close(false); });
    document.getElementById('confirm-cancel').addEventListener('click', function() { self.close(false); });
    document.getElementById('confirm-ok').addEventListener('click', function() { self.close(true); });
  },
  confirm: function(message, onOk, opts) {
    this.init();
    opts = opts || {};
    var msgEl = document.getElementById('confirm-msg');
    if (msgEl) msgEl.textContent = message;
    var titleEl = document.getElementById('confirm-title');
    if (titleEl) titleEl.textContent = opts.title || '请确认';
    var okBtn = document.getElementById('confirm-ok');
    if (okBtn) {
      okBtn.textContent = opts.okText || '确定';
      okBtn.classList.toggle('btn-danger', !!opts.danger);
    }
    this._onCancel = opts.onCancel || null;
    this._cb = onOk || null;
    document.getElementById('modal-confirm').classList.remove('hidden');
    var cancelBtn = document.getElementById('confirm-cancel');
    if (cancelBtn) cancelBtn.focus();
  },
  close: function(ok) {
    var el = document.getElementById('modal-confirm');
    if (el) el.classList.add('hidden');
    var cb = ok ? this._cb : this._onCancel;
    this._cb = null;
    this._onCancel = null;
    if (cb) cb();
  }
};

// ==================== 语音工具 ====================
// 全局统一 TTS 服务 = window.TTSManager（定义在 js/tts-manager.js，构建时最先合并）。
// 整个项目（背单词/听力/阅读/AI/跟读/试听/故事…）的朗读最终都经过 TTSManager，
// 禁止在本文件或其他文件直接调用 speechSynthesis.speak() / new SpeechSynthesisUtterance()。
// 全部统一改为 TTSManager.speak(text)（朗读/预热/解锁全部走 speak，时序细节在 TTSManager 内部）。
var SpeechUtil = {
  // iOS Safari 要求 speechSynthesis 必须在用户手势上下文里至少触发一次，
  // 否则后续即使 audio 也播不出。这里维护一个"user gesture 已解锁"标志，
  // 在第一次 click/touch 之后允许后续的自动播放调用真正发声。
  _unlocked: false,
  unlock: function() {
    var self = this;
    if (this._unlocked) return;
    try {
      // 触发一个空 utterance 以"激活"speechSynthesis；
      // 统一经 TTSManager.speak 朗读（会套用所选声音，顺带预热在线声连接）。
      // immediate=true：iOS Safari 必须在用户手势上下文里立即 speak，不能延迟 100ms。
      TTSManager.speak(' ', { volume: 0, rate: 0.5, immediate: true });
      this._unlocked = true;
    } catch(e) {}
  },
  // 朗读设置缓存：voice_name（预设声音名称）、voice_rate（语速）、voice_pitch（音调）、
  // instant（是否本地即时语音：不依赖在线连接，用 server SAPI 合成，几乎零延迟）
getSettings: function() {
    if (this._settings) return this._settings;
    // 即时语音默认值：只有用户没动过 voice_instant 时才做"自动探测"；
    // 本地有 server 时保持开（零延迟），GitHub Pages/手机等无后端环境自动关。
    var hasInstant = false;
    try { hasInstant = (window.localStorage.getItem('voice_instant') !== null); } catch(e) {}
    var instant;
    if (hasInstant) instant = Storage.get('voice_instant', '1') === '1';
    else instant = !(this._serverDown === true);
    this._settings = {
      voiceName: Storage.get('voice_name', ''),
      rate: parseFloat(Storage.get('voice_rate', '')) || 0.9,
      pitch: parseFloat(Storage.get('voice_pitch', '')) || 1,
      instant: instant,
      _defaultInstant: !hasInstant
    };
    return this._settings;
  },
  updateSettings: function(s) {
    this._settings = s;
  },
  // 探测本地 server 是否可达：/api/health 返回 200 且 ok=true。
  // 网页部署（GitHub Pages）/手机打开时，API_BASE 可能指向一个没有后端的站点，
  // 探测失败 → 自动把"即时语音"默认关掉、改走浏览器语音，避免每次朗读都弹红
  // "server 未运行"提示。用户手动开过即时语音则尊重用户选择不作改动。
  _probeServer: function() {
    if (this._probedServer) return;
    this._probedServer = true;
    var self = this;
    var base = window.API_BASE || '';
    if (!base) { this._serverDown = true; this._syncInstantDefault(); return; }
    var ctrl = null, to = null;
    try { if (typeof AbortController !== 'undefined') ctrl = new AbortController(); } catch(e) {}
    if (ctrl) to = setTimeout(function() {
      try { ctrl.abort(); } catch(e) {}
      self._serverDown = true;
      self._syncInstantDefault();
    }, 3000);
    var done = function() { if (to) clearTimeout(to); self._syncInstantDefault(); };
    try {
      fetch(base + '/api/health', { cache: 'no-store', signal: ctrl ? ctrl.signal : undefined })
        .then(function(r) {
          if (!r || !r.ok) { self._serverDown = true; return null; }
          return r.json();
        })
        .then(function(j) {
          if (j && typeof j.ok === 'boolean') self._serverDown = !j.ok;
          else self._serverDown = false;
          done();
        })
        .catch(function() { self._serverDown = true; done(); });
    } catch(e) { self._serverDown = true; done(); }
  },
  // 探测结果落地：仅影响"用户没手动设过"的默认即时语音开关；降级时轻提示一次
  _syncInstantDefault: function() {
    var s = this._settings;
    if (!s || !s._defaultInstant) return;
    var target = !(this._serverDown === true);
    if (s.instant === target) return;
    s.instant = target;
    var el = document.getElementById('voice-instant');
    if (el) el.checked = target;
    if (this._serverDown === true && !this._probeNotifyShown) {
      this._probeNotifyShown = true;
      if (window.Toast) Toast.warning('未检测到本地发音服务（localhost:3000），已自动切换为浏览器语音朗读');
    }
  },
  // 自定义发音映射（单词 → dataURL 音频），文件名即单词名；读一次后缓存
  getCustomVoice: function() {
    if (!this._customVoice) this._customVoice = Storage.getJSON('custom_voice', {});
    return this._customVoice;
  },
  speak: function(text, lang, opts) {
    // 单词（无空格）且有自定义录音 → 优先播真人录音（不依赖 speechSynthesis）
    var key = (text || '').trim().toLowerCase();
    var custom = this.getCustomVoice();
    // 校验录音值合法：只认 data:/blob:/http 开头的音频，避免 __PENDING__（批量录音还没下载完的占位）
    // 或损坏的 dataURL 走 audio.play() 静默失败导致"点了没声音"
    if (key && key.indexOf(' ') === -1 && custom[key]
        && typeof custom[key] === 'string' && /^(data:|blob:|https?:)/.test(custom[key])) {
      try {
TTSManager.cancel();
        this._stopLocalAudio();
        var audio = new Audio(custom[key]);
        this._localAudio = audio; // 登记到共享句柄：连续点击时 _stopLocalAudio 能停掉上一个，防叠加播放
        var that = this;
        if (opts && opts.onend) {
          audio.onended = function() { that._localAudio = null; if (opts.onend) opts.onend(); };
        } else {
          audio.onended = function() { that._localAudio = null; };
        }
        audio.onerror = function() { that._localAudio = null; };
        var pr = audio.play();
        // play() 是异步的：同步抛错或 Promise 拒绝都兜底走 speechSynthesis，绝不静默
        if (pr && pr.catch) pr.catch(function() { that._speakTTS(text, lang, opts); });
        return;
      } catch(e) {
        // 构造/播放同步失败 → 落到 speechSynthesis
      }
    }
    // 单个英文字母（A-Z）：统一经 SpeechUtil.speakLetter → 所选声音 TTS 裸读 "A"（在线优先）；
    // 未选任何声音时兜底 assets/letters/A.wav 字母音频资源。绝不输出 "Letter A" 组合文本。
    // 用户自己的录音仍优先（见上方 custom）；失败降级链由 speakLetter 内部保留。
    if (/^[a-z]$/.test(key) && /^en/i.test(String(lang || 'en-US'))) {
      this.speakLetter(key, opts);
      return;
    }
    this._speakTTS(text, lang, opts);
  },
  // 单个英文字母朗读（Alphabet / 26字母 / 拼写 / 音标共用）。
  // 链路：Alphabet → speakLetter → ①所选声音 TTS 裸读 "A"（在线优先）②assets/letters/A.wav 兜底。
  // 发音文本为裸字母（点击 A 只听 "A"），绝不输出 "Letter A"（TTS 会先读 Letter 再读 A）。
  // 架构：在线 Natural TTS（所选声音）→ 备用 Voice（attempt 换声重试 → Google 合成 → SAPI，不删降级）。
  // 日志：每次输出 [TTS LETTER] A / Voice: <来源>，用于核对发声内容就是当前字母。
  speakLetter: function(letter, opts) {
    var l = String(letter || '').trim();
    if (!/^[a-zA-Z]$/.test(l)) { this.speak(l, 'en-US', opts); return; }
    var up = l.toUpperCase();
    var self = this;
    // ①只要用户选过声音（当前 TTSManager 已选定 / 设置里存了声音名），26 个字母一律
    // 走 TTS 读成所选声音（在线优先：Aria 等 → 失败降级 Google → SAPI）。
    // 旧版 assets/letters/A.wav 是本地 SAPI(Zira) 预合成音，属"本地声音"：
    // 仅在没有选任何声音（纯默认/纯离线）时作为兜底字母音资源播放。
    var picked = false;
    try { if (TTSManager && TTSManager.voice) picked = true; } catch(e) {}
    if (!picked) {
      try { if (this.getSettings().voiceName) picked = true; } catch(e) {}
    }
    if (picked) { this._speakLetterTTS(up, opts); return; }
    // ②未选声音（默认场景）：存在 assets/letters/A.wav（标准字母音，A→/eɪ/、W→/ˈdʌbəljuː/）
    // 则播放；不存在/加载失败/播放失败 → ③TTS 裸读字母（所选声音）。
    var src = 'assets/letters/' + up + '.wav';
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('HEAD', src + '?t=' + Date.now());
      xhr.timeout = 2000;
      xhr.onreadystatechange = function() {
        if (xhr.readyState !== 4) return;
        if (xhr.status >= 200 && xhr.status < 400) self._playLetterAudio(up, src, opts);
        else self._speakLetterTTS(up, opts);
      };
      xhr.onerror = function() { self._speakLetterTTS(up, opts); };
      xhr.ontimeout = function() { self._speakLetterTTS(up, opts); };
      xhr.send(null);
    } catch(e) {
      // file:// 等同步抛错场景：直接走 TTS
      this._speakLetterTTS(up, opts);
    }
  },
  // ②播放字母音频资源（assets/letters/A.wav，仅未选声音时的兜底）；播放失败静默落 TTS，绝不静默无声
  _playLetterAudio: function(up, src, opts) {
    var self = this;
    var done = false;
    var toTTS = function() {
      if (done) return;
      done = true;
      self._speakLetterTTS(up, opts);
    };
    try {
      TTSManager.cancel();
      this._stopLocalAudio();
      var audio = new Audio(src);
      this._localAudio = audio;
      console.log('[TTS LETTER] ' + up);
      console.log('[TTS LETTER] Voice: 音频资源 ' + src);
      if (opts && opts.onend) audio.onended = function() {
        if (self._localAudio === audio) self._localAudio = null;
        try { opts.onend(); } catch(e) {}
      };
      audio.onerror = function() { if (self._localAudio === audio) self._localAudio = null; toTTS(); };
      var pr = audio.play();
      if (pr && pr.catch) pr.catch(function(e) {
        if (e && e.name === 'AbortError') return;
        if (self._localAudio === audio) self._localAudio = null;
        toTTS();
      });
    } catch(e) { toTTS(); }
  },
  // ②字母 TTS 兜底：发音文本就是裸字母 "A"（点击 A 只听 "A"），绝不拼接 "Letter A"。
  // 声音强制注入为当前所选（TTSManager.voice 唯一权威），不用浏览器默认声音。
  // 选中「在线自然女声（Google 合成）」时字母同样走 Google 在线合成。
  // 仅未选任何声音时，assets/letters/A.wav 字母音频资源优先。
_speakLetterTTS: function(up, opts) {
    var text = up;
    var o = {};
    if (opts) for (var k in opts) o[k] = opts[k];
    // 连读锁定（同 _speakTTS）：字母经 speakLetter 直通这里、不经过 _speakTTS，
    // 所以降级后整段连读同样保持同一音源，避免一段一个音色。
    var now = Date.now();
    if (this._burstMode && this._burstUntil && now < this._burstUntil) {
      this._burstUntil = now + 3000;
      if (this._burstMode === 'google') {
        console.log('[TTS LETTER] ' + up);
        console.log('[TTS LETTER] Voice: online-google (burst-locked)');
        this._speakGoogleTTS(text, 'en-US', o);
        return;
      }
      if (this._burstMode === 'local') {
        console.log('[TTS LETTER] ' + up);
        console.log('[TTS LETTER] Voice: local (burst-locked)');
        this._speakLocal(text, 'en-US', o);
        return;
      }
      if (this._burstMode === 'device') {
        console.log('[TTS LETTER] ' + up);
        console.log('[TTS LETTER] Voice: device-default (burst-locked)');
        this._speakServerless(text, 'en-US', o);
        return;
      }
    }
    // 选中「在线自然女声（Google 合成）」时，字母同样走 Google 在线合成（HTTPS），
    // 与单词朗读行为一致：选了什么声音，字母就听到什么声音。
    var settings = this.getSettings();
    if (settings.voiceName === '__online_google__') {
      console.log('[TTS LETTER] ' + up);
      console.log('[TTS LETTER] Voice: online-google');
      if (this._serverDown === true) this._speakServerless(text, 'en-US', o);
      else this._speakGoogleTTS(text, 'en-US', o);
      return;
    }
    var voice = null;
    try { if (TTSManager && TTSManager.voice) voice = TTSManager.voice; } catch(e) {}
    if (!voice) voice = this._pickVoice(settings.voiceName, null);
    var vName = (voice && voice.name) || 'system default';
    console.log('[TTS LETTER] ' + up);
    console.log('[TTS LETTER] Voice: ' + vName);
    // voice 注入：attempt 首次朗读优先用注入的声音，保证 utterance.voice 就是当前所选
    o.voice = voice;
    this._speakTTSOnline(text, 'en-US', o);
  },
  // 真正走 speechSynthesis 的朗读逻辑（自定义录音失败时的兜底也走这里）。
  // 本机 Edge 英文声几乎全是在线声（Aria/Guy/...），首次连接 speech.platform.bing.com
  // 慢的话要 6-10 秒，且偶发 synthesis-failed / 卡住不出声。策略：
  //  1. 页面加载时 primeVoices() 后台预热在线声连接，之后点击朗读约 200ms 出声；
  //  2. 以 onstart 事件为准判定"出声"：已预热（连接是温的）在线声 4s 内未 START
  //     即判定卡死，未预热（首次冷连接实测 6-10s）给 12s 宽限；本地离线声 4s。
  //     超时/报错 → cancel 清队列 → 换一个声音重试（最多 2 次），随后立即降级
  //     Google 合成/SAPI，绝不干等；
  //  3. 在线声真失败会进入 15s 冷却（_markOnlineBroken），期间后续点击跳过在线声
  //     立即出声；冷却过后重新尝试，网络恢复后自动回到所选在线音色，不会永久换声；
  //  4. 全部失败才 Toast 提示，绝不静默无声。
  _speakTTS: function(text, lang, opts) {
    var self = this;
    var settings = this.getSettings();
    // 上一次在线声朗读还挂在队列里没 START（连接慢/断线），用户又点了新朗读：
    // 直接判定在线声已坏（本会话不再尝试），本次立即走 Google 合成/SAPI 出声。
    // 健康连接经 prime 预热后 START 实测仅 ~360ms，4s 内没 START 基本就是连不上。
    // 不这样处理的话，每次点击都会重新走一遍 4s 超时，且被 _speakSeq 作废的旧尝试
    // 永远不会把 _onlineBroken 置位 → 多点几下就变成"永远没声音也无提示"。
    if (this._onlineAttemptActive && !this._onlineStarted) this._markOnlineBroken();
    // 手势内解锁音频：首次朗读即创建并 resume AudioContext，之后在线声超时兜底
    // 播放（不在手势内）时 Web Audio 也能出声
    this._unlockAudio();
    // 进任何非在线路径（Google 在线合成 / 本地 SAPI / 即时语音）前先 cancel 掉
    // 仍在播/排队的 speechSynthesis 在线声，避免旧在线声和新路径声音重叠（双声）。
    // 在线路径自身在 attempt() 里也会 cancel，这里统一处理不冲突。
    TTSManager.cancel();
    // 连读锁定：同一次连读（相邻点击 ≤3s）中途一旦降级到 Google/本地合成，
    // 整段连读都保持同一音源，避免"一段一个音色"（Aria→Google→Aria 来回横跳）。
    // 停顿超过 3s 视为读完一组，锁自动失效，恢复正常走所选在线声。
    var now = Date.now();
    if (this._burstMode && this._burstUntil && now < this._burstUntil) {
      var bm = this._burstMode;
      this._burstUntil = now + 3000;
      if (bm === 'google') { this._speakGoogleTTS(text, lang, opts); return; }
      if (bm === 'local') { this._speakLocal(text, lang, opts); return; }
      if (bm === 'device') { this._speakServerless(text, lang, opts); return; }
    }
    // 单个英文字母（A-Z 26 个字母）：统一经 speakLetter → TTSManager.speak 用所选声音读
    // （在线优先）。按需求改为与所选声音一致；失败降级（换声重试→Google→SAPI）在链路内保留。
    if (/^[a-zA-Z]$/.test(String(text || '').trim())
        && /^en/i.test(String(lang || 'en-US'))) {
      this.speakLetter(text, opts);
      return;
    }
// 「在线自然女声（Google 合成）」：本机网络 WSS 被掐、在线 speechSynthesis 必失败，
    // 该选项改用 HTTPS 合成（translate.googleapis.com，实测可达、天然女声）。
    if (settings.voiceName === '__online_google__') {
      this._stopLocalAudio();
      if (this._serverDown === true) {
        // 网页版（无 server）：Google 在线走 /api/online-tts 必 404，改用远程发音优先
        this._speakServerless(text, lang, opts);
      } else {
        this._speakGoogleTTS(text, lang, opts);
      }
      return;
    }
// 「本地即时语音」：不走在线引擎，直接用 server SAPI（离线、缓存后几乎零延迟）。
    // 点击即读；只有 server 不可用时才回退在线声，避免 file:// 没开 server 时完全静默。
    // 已探测到 server 不可达（_serverDown=true）→ 直接走在线音而不进 SAPI，
    // 避免每次点击都先把请求打到死端口上、等超时才降级。
    if (settings.instant && !(this._serverDown === true)) {
      this._stopLocalAudio();
      var instOpts = {};
      if (opts) for (var k in opts) instOpts[k] = opts[k];
      instOpts.noFailToast = true;
      instOpts.onerror = function() {
        // server 不可用 → 回退在线声；回退内部走 _speakTTSOnline（不再回到本分支）
        self._speakTTSOnline(text, lang, opts);
      };
      this._speakLocal(text, lang, instOpts);
      return;
    }
    this._speakTTSOnline(text, lang, opts);
  },
  // 在线/系统语音朗读（非即时）：走浏览器 speechSynthesis（在线 Natural 声 / 本地离线声）
  _speakTTSOnline: function(text, lang, opts) {
    var self = this;
    var settings = this.getSettings();
    if (!('speechSynthesis' in window)) {
      // 没有 speechSynthesis：直接落 SAPI 保底，能出声就不算失败
      this._stopLocalAudio();
      this._speakLocal(text, lang, opts);
      return;
    }
    this._stopLocalAudio();
    // 代次令牌：任何一次新的朗读都会使旧朗读的挂起重试/超时全部作废，
    // 防止上一次失败的 attempt 把用户刚点的新朗读 cancel 掉。
    this._speakSeq = (this._speakSeq || 0) + 1;
    var mySeq = this._speakSeq;
    // 预热成功过 → 在线连接已建立，重试可以宽松；没预热成功 → 在线大概率不可用，
    // 尽快（只留 1 次重试）落到 SAPI 保底，避免用户干等。
    var primedOk = (typeof window.__onlinePrimedAt === 'number' && window.__onlinePrimedAt > 0);
    var retryLeft = primedOk ? 2 : 1;
    var voiceWait = 3;
    var failedVoices = [];
    var attempt = function() {
      if (self._speakSeq !== mySeq) return;
      // voices 列表是异步加载的：未就绪时最多等 3 次（共约 2.4s），仍无则先裸 speak
      var voices;
      try { voices = window.speechSynthesis.getVoices() || []; } catch(e) { voices = []; }
      if (!voices.length && voiceWait > 0) { voiceWait--; setTimeout(attempt, 800); return; }
      // 网页部署（无 server）：voices 加载失败/没有英文声/在线声连不通时，
      // 一律交给系统默认语音（_speakDeviceVoice），不再请求 /api/*（那必然 404）
      var useDeviceVoice = (self._serverDown === true);
      // 选声：speakLetter 等注入的 opts.voice（当前所选声音）在首次朗读时优先，
      // 确保 utterance.voice 就是当前选择；失败重试时不再用注入的声音，改为依次跳过
      // failedVoices 换声。否则按 用户保存的 → 本地离线英文声 → 任一英文声 顺序选。
      var voice = (opts && opts.voice && !failedVoices.length) ? opts.voice : self._pickVoice(settings.voiceName, failedVoices);
      var online = voice ? self._isOnlineVoice(voice) : false;
      // 在线声刚失败（15s 冷却期内）：不再干等超时重试，直接落 HTTPS 在线合成
      // （Google 自然女声）保住"在线音色"，保证点击即出声，避免"多点几下就没声"。
      // 冷却期过后会重新尝试所选在线声——一旦网络恢复，自动回到用户选的音色。
      // 用 _onlineBrokenAt 时间戳而非永久标记，避免"一次连接慢就把用户选的声音
      // 永久换成别的音色"（切声音也不变）。
      if (online && typeof self._onlineBrokenAt === 'number' && (Date.now() - self._onlineBrokenAt < 15000)) {
        // 连读锁定：本段连读后续全部保持 Google 合成，冷却期过了也不在中途切回
        self._burstMode = 'google';
        self._burstUntil = Date.now() + 3000;
        self._speakGoogleTTS(text, lang, opts);
        return;
      }
      // 英文文本必须用英文声：本机没有英文声时 _pickLocalENVoice 会回退到"任意非在线声"
      // （实测回退成中文 Huihui），英文被中文声读 → 读不准。此时直接落本地 SAPI（Zira），
      // 离线、发音准确；在线英文声可用时不受影响。
var voiceEN = !!(voice && /^en/i.test(String(voice.lang || '')));
      if (!voiceEN && /^en/i.test(String(lang || 'en-US'))) {
        if (useDeviceVoice) {
          self._burstMode = 'device';
          self._burstUntil = Date.now() + 3000;
          self._speakServerless(text, lang, opts);
          return;
        }
        // 连读锁定：本段连读后续全部保持 SAPI 本地合成，避免中途换音色
        self._burstMode = 'local';
        self._burstUntil = Date.now() + 3000;
        self._speakLocal(text, lang, opts);
        return;
      }
      var started = false;
      var finished = false;
      var timeoutId = null;
      // 在线声尝试标记：供 _speakTTS 判断"上一次在线声挂起未 START"。只对在线声设置，
      // START/END/失败即清除；被新朗读作废的旧尝试因 _speakSeq 变化不会误清新尝试的标记。
      if (online) { self._onlineAttemptActive = true; self._onlineStarted = false; }
      var fail = function(reason) {
        if (finished || self._speakSeq !== mySeq) return;
        finished = true;
        self._onlineAttemptActive = false;
        if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
        // cancel 清队列：卡住/排队的朗读必须先清掉，否则下一次 speak 排不进去
        try {
          if (TTSManager.isBusy()) TTSManager.cancel();
        } catch(e) {}
        if (voice && failedVoices.indexOf(voice.name) === -1) failedVoices.push(voice.name);
        // 在线声真实失败（超时/synthesis-failed/异常）：本次直接落本地 SAPI，不再重试，
        // 并标记在线声 15s 内不可用——这段时间内后续点击一律跳过在线，立即出声。
        // 不是永久标记：冷却过后会重新尝试，网络恢复后自动回到用户选的在线音色。
        if (online) {
          self._markOnlineBroken();
          retryLeft = 0;
        }
        if (retryLeft > 0) {
          retryLeft--;
          // 等上一句彻底退出队列再重试，避开 Chromium cancel+speak 竞态吞掉本次朗读
          setTimeout(attempt, 400);
          return;
        }
        // 在线声失败 → 先试 HTTPS 在线合成（Google 自然女声）；连它都失败才落
        // server /api/tts（Windows SAPI）保底。只有连保底都失败才提示。绝不静默无声。
        // 连读锁定：降级后本段连读保持同一音源，避免中途换音色。
        if (useDeviceVoice) {
          // 网页版（无 server）：不再请求 /api/online-tts、/api/tts（必然 404），
          // 优先远程发音，远程失败交给浏览器系统默认语音兜底
          self._burstMode = 'device';
          self._burstUntil = Date.now() + 3000;
          self._speakServerless(text, lang, opts);
        } else if (online) {
          self._burstMode = 'google';
          self._burstUntil = Date.now() + 3000;
          self._speakGoogleTTS(text, lang, opts);
        } else {
          self._burstMode = 'local';
          self._burstUntil = Date.now() + 3000;
          self._speakLocal(text, lang, opts);
        }
      };
      var fireStart = opts && opts.onstart ? function() { try { opts.onstart(); } catch(e) {} } : function() {};
      var fireEnd = opts && opts.onend ? function() { try { opts.onend(); } catch(e) {} } : function() {};
      // 朗读回调（带代次守卫）：旧朗读/被换声打断的朗读，其事件一律忽略
      var cbStart = function() {
        if (finished || self._speakSeq !== mySeq) return;
        started = true;
        if (online) {
          self._onlineStarted = true;
          // 在线声成功出声 → 顺延 30s 保活计时，连接保持温热，下次点击不再冷连接
          self.scheduleKeepAlive();
        }
        if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
        fireStart();
      };
      var cbEnd = function() {
        if (finished || self._speakSeq !== mySeq) return;
        finished = true;
        self._onlineAttemptActive = false;
        if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
        fireEnd();
      };
      var cbError = function(e) {
        if (finished || self._speakSeq !== mySeq) return;
        // interrupted：被 cancel/换声打断，不算失败
        if (e && e.error === 'interrupted') return;
        fail((e && e.error) || 'synthesis-failed');
      };
      var u;
      try {
        // 统一经 TTSManager.speak 朗读（内部 cancel + 100ms 后 speak，套用全局
        // 声音/语速/音调/音量）；重试换声时用 voice 覆盖。返回 null = 同步失败。
        u = TTSManager.speak(text, {
          voice: voice,
          rate: (opts && opts.rate) || settings.rate || TTSManager.rate,
          pitch: settings.pitch || TTSManager.pitch,
          lang: voice ? (voice.lang || lang || 'en-US') : (lang || 'en-US'),
          onstart: cbStart,
          onend: cbEnd,
          onerror: cbError
        });
        if (!u) { fail('exception'); return; }
      } catch(e) {
        // voice 赋值抛错（Chromium 对过期/无效 voice 对象会抛 "Failed to convert"）→ 跳过该声音重试
        if (voice) failedVoices.push(voice.name);
        if (retryLeft > 0) { retryLeft--; setTimeout(attempt, 200); return; }
        Toast.error('朗读失败：当前声音不可用，请到「设置-朗读声音」换一个试试');
        return;
      }
      // 超时判定：已预热成功/保活中 → 在线连接是温的，2.5s 内没 START 判死（warm 后实测 ~360ms）；
      // 未预热（页面刚打开 10s 内的首次冷连接实测 1-6s）→ 给 6s 宽限，避免把只是
      // 连接慢的在线声误判成坏掉而降级成别的音色（用户选了在线声，就该尽量用它）。
      // 保活机制（scheduleKeepAlive 每 30s 预热）使"未预热"状态几乎只在页面刚加载时出现。
      timeoutId = setTimeout(function() {
        timeoutId = null;
        if (!started) fail('timeout');
      }, online ? (primedOk ? 2500 : 6000) : 4000);
    };
    attempt();
  },
  // 停止正在播放的 SAPI 保底音频（新朗读开始时调用，避免新旧声音重叠）
  _stopLocalAudio: function() {
    if (this._localAudio) {
      try { this._localAudio.pause(); this._localAudio.src = ''; } catch(e) {}
      this._localAudio = null;
    }
    // Web Audio 播放路径（file:// 下用）：停掉当前声源，并使未完成的异步播放失效
    if (this._waSrc) {
      try { this._waSrc.stop(); } catch(e) {}
      this._waSrc = null;
    }
    this._waSeq = (this._waSeq || 0) + 1;
  },
  // 保底朗读：在线声不可用/浏览器不支持 speechSynthesis 时，
  // 用本地 server /api/tts（Windows SAPI Microsoft Zira/Huihui，完全离线）
  // 合成 WAV 播放，确保"点击朗读一定有声音"。只有保底也失败才提示用户。
_speakLocal: function(text, lang, opts) {
    var self = this;
    // 网页部署（无 server）不得请求 /api/tts（必然 404）：走远程发音/系统语音兜底
    if (this._serverDown === true) {
      this._speakServerless(text, lang, opts);
      return;
    }
    var rate = (opts && opts.rate) || this.getSettings().rate || 0.9;
// 后端地址统一由 js/api-config.js 的 window.API_BASE 决定
    var base = window.API_BASE || '';
    var url = base + '/api/tts?text=' + encodeURIComponent(text)
      + '&lang=' + encodeURIComponent(lang || 'en-US')
      + '&rate=' + encodeURIComponent(rate);
    // file:// 页面下 Edge/Chrome 会拒绝 <audio> 加载 http://localhost 的音频
    // （MEDIA_ELEMENT_ERROR: Media load rejected by URL safety check），但 fetch()
    // 正常。改用 Web Audio（fetch → decodeAudioData → 播放）绕过该安全检查。
    if (location.protocol === 'file:') {
      this._unlockAudio();
      this._speakLocalWA(url, opts);
      return;
    }
    var audio;
    try { audio = new Audio(url); } catch(e) { this._ttsLocalFail(opts); return; }
    this._stopLocalAudio();
    this._localAudio = audio;
    var fireStart = opts && opts.onstart ? function() { try { opts.onstart(); } catch(e) {} } : function() {};
    var fireEnd = opts && opts.onend ? function() { try { opts.onend(); } catch(e) {} } : function() {};
    // 同一段音频只报一次失败：加载 onerror 和 play() 拒绝都可能触发，避免连弹两个 Toast
    var failed = false;
    var failOnce = function() {
      if (failed) return;
      failed = true;
      self._ttsLocalFail(opts);
    };
    audio.onended = function() {
      if (self._localAudio === audio) self._localAudio = null;
      fireEnd();
    };
    audio.onerror = function() {
      // 已被下一次点击取代（pause+清 src 会触发 onerror）→ 正常现象，不算失败
      if (self._localAudio !== audio) return;
      failOnce();
    };
    fireStart();
    // <audio>.play() 在非用户手势的异步回调里会被自动播放策略拒绝（NotAllowedError，
    // 例如在线声超时/失败后的降级播放）。同一段音频改用 Web Audio 播放：AudioContext
    // 已通过 _unlockAudio() 在手势内创建/解锁，异步播放不受自动播放策略限制。
    // 同步抛错（NotSupportedError 等）同样处理。绝不静默。
    var waFallback = function() {
      self._unlockAudio();
      self._speakLocalWA(url, opts);
    };
    var pr;
    try { pr = audio.play(); } catch(e) { waFallback(); return; }
    // play() 是异步的：Promise 拒绝（自动播放被拦/服务器未启动）也改走 Web Audio。
    // 被下一次点击的 pause 打断（AbortError）是正常现象，不算失败，不弹 Toast。
    if (pr && pr.catch) pr.catch(function(e) {
      if (e && e.name === 'AbortError') return;
      waFallback();
    });
  },
  // 在线自然女声（Google 合成）：浏览器直连 translate.googleapis.com 会被本机代理/TUN
  // 拦截（WSS 全灭）且需 CORS；Node 直连可达 → 由本地 server /api/online-tts 代理抓音频，
  // 浏览器只访问同源。选中 __online_google__ 时朗读走这里；在线声失败时也降级到这里。
  // 连代理都失败才落 server SAPI（_speakLocal）保底。
_speakGoogleTTS: function(text, lang, opts) {
    var self = this;
    // 网页部署（无 server）：在线女声走 /api/online-tts 必 404，走远程发音/系统语音兜底
    if (this._serverDown === true) { this._speakServerless(text, lang, opts); return; }
    this._stopLocalAudio();
    var tl = /^en/i.test(String(lang || 'en-US')) ? 'en' : (String(lang || 'en').split('-')[0] || 'en');
    // 语速设置映射到 Google 的 ttsspeed（实测 0.4+ 被钳制成同档，只有三档可用）：
    // 慢速(0.7)→0.1 最慢、标准(0.9)→0.24 自然、快速(1.1)→0.5 默认快档
    var rate = (opts && opts.rate) || this.getSettings().rate || 0.9;
    var ttsspeed = rate <= 0.75 ? '0.1' : (rate >= 1.05 ? '0.5' : '0.24');
// 后端地址统一由 js/api-config.js 的 window.API_BASE 决定
    var base = window.API_BASE || '';
    var url = base + '/api/online-tts?text=' + encodeURIComponent(text)
      + '&lang=' + encodeURIComponent(tl)
      + '&ttsspeed=' + encodeURIComponent(ttsspeed);
    // file:// 页面下 <audio> 拒绝加载 http://localhost（URL safety check），但 fetch() 正常
    if (location.protocol === 'file:') {
      this._unlockAudio();
      this._speakGoogleWA(url, text, lang, opts);
      return;
    }
    var audio;
    try { audio = new Audio(url); } catch(e) { this._speakLocal(text, lang, opts); return; }
    this._localAudio = audio;
    var fireStart = opts && opts.onstart ? function() { try { opts.onstart(); } catch(e) {} } : function() {};
    var fireEnd = opts && opts.onend ? function() { try { opts.onend(); } catch(e) {} } : function() {};
    var failed = false;
    var failOnce = function() {
      if (failed) return;
      failed = true;
      if (self._localAudio === audio) self._localAudio = null;
      self._speakLocal(text, lang, opts);
    };
    audio.onended = function() {
      if (self._localAudio === audio) self._localAudio = null;
      fireEnd();
    };
    audio.onerror = function() {
      if (self._localAudio !== audio) return;
      failOnce();
    };
    fireStart();
    // <audio>.play() 在非手势的异步回调里会被自动播放策略拒绝（NotAllowedError）：
    // 同一段音频改用 Web Audio 播放（AudioContext 已通过 _unlockAudio() 解锁）。
    // 同步抛错（NotSupportedError 等）同样处理。绝不静默。
    var waFallback = function() {
      self._unlockAudio();
      self._speakGoogleWA(url, text, lang, opts);
    };
    var pr;
    try { pr = audio.play(); } catch(e) { waFallback(); return; }
    // play() 是异步的：Promise 拒绝（自动播放被拦/服务器未启动）也改走 Web Audio。
    // 被下一次点击的 pause 打断（AbortError）是正常现象，不算失败，不弹 Toast。
    if (pr && pr.catch) pr.catch(function(e) {
      if (e && e.name === 'AbortError') return;
      waFallback();
    });
  },
  // file:// 下的在线女声：fetch 拿到 MP3 → decodeAudioData → Web Audio 播放。
  // 与 _speakGoogleTTS 的 <audio> 路径同样的语义；失败降级到 _speakLocal（SAPI）保底。
  _speakGoogleWA: function(url, text, lang, opts) {
    var self = this;
    this._stopLocalAudio();
    var seq = (this._waSeq || 0) + 1;
    this._waSeq = seq;
    var fireStart = opts && opts.onstart ? function() { try { opts.onstart(); } catch(e) {} } : function() {};
    var fireEnd = opts && opts.onend ? function() { try { opts.onend(); } catch(e) {} } : function() {};
    var failOnce = function() {
      if (seq !== self._waSeq) return;
      self._speakLocal(text, lang, opts);
    };
    fireStart();
    fetch(url)
      .then(function(r) { if (!r.ok) throw new Error('http ' + r.status); return r.arrayBuffer(); })
      .then(function(buf) {
        if (seq !== self._waSeq) return null;
        var ac = self._waGetCtx();
        if (!ac) throw new Error('no-audio-context');
        return ac.decodeAudioData(buf).then(function(audioBuf) {
          if (seq !== self._waSeq) return null;
          var src = ac.createBufferSource();
          src.buffer = audioBuf;
          src.connect(ac.destination);
          src.onended = function() {
            if (self._waSrc === src) self._waSrc = null;
            fireEnd();
          };
          self._waSrc = src;
          if (ac.state === 'suspended') { try { ac.resume(); } catch(e) {} }
          try { src.start(); } catch(e) {}
          return src;
        });
      })
      .catch(function() {
        if (seq !== self._waSeq) return;
        failOnce();
      });
  },
  // file:// 下的保底朗读：fetch 拿到 WAV → decodeAudioData → Web Audio 播放。
  // 与 <audio> 路径同样的语义：onstart/onend 回调、失败只报一次、可被新点击打断。
  _speakLocalWA: function(url, opts) {
    var self = this;
    this._stopLocalAudio();
    var seq = (this._waSeq || 0) + 1;
    this._waSeq = seq;
    var fireStart = opts && opts.onstart ? function() { try { opts.onstart(); } catch(e) {} } : function() {};
    var fireEnd = opts && opts.onend ? function() { try { opts.onend(); } catch(e) {} } : function() {};
    var failOnce = function() {
      if (seq !== self._waSeq) return;
      self._ttsLocalFail(opts);
    };
    fireStart();
    fetch(url)
      .then(function(r) { if (!r.ok) throw new Error('http ' + r.status); return r.arrayBuffer(); })
      .then(function(buf) {
        if (seq !== self._waSeq) return null;
        var ac = self._waGetCtx();
        if (!ac) throw new Error('no-audio-context');
        return ac.decodeAudioData(buf).then(function(audioBuf) {
          if (seq !== self._waSeq) return null;
          var src = ac.createBufferSource();
          src.buffer = audioBuf;
          src.connect(ac.destination);
          src.onended = function() {
            if (self._waSrc === src) self._waSrc = null;
            fireEnd();
          };
          self._waSrc = src;
          if (ac.state === 'suspended') { try { ac.resume(); } catch(e) {} }
          try { src.start(); } catch(e) {}
          return src;
        });
      })
      .catch(function() {
        if (seq !== self._waSeq) return;
        failOnce();
      });
  },
  // 取共享的 AudioContext；必须在用户点击等手势内创建/恢复（自动播放策略）
  _waGetCtx: function() {
    if (!this._waCtx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) { try { this._waCtx = new AC(); } catch(e) {} }
    }
    return this._waCtx || null;
  },
  // 手势内解锁音频：首次朗读时同步创建并恢复 AudioContext，之后再挂一次监听，
  // 这样即使用户在手势外触发播放（如在线声超时后的本地兜底）也能出声。
  _unlockAudio: function() {
    var self = this;
    if (this._waUnlocked) return;
    this._waUnlocked = true;
    var ac = this._waGetCtx();
    if (ac && ac.state !== 'running') { try { ac.resume(); } catch(e) {} }
    var resume = function() {
      var c = self._waGetCtx();
      if (c && c.state !== 'running') { try { c.resume(); } catch(e) {} }
    };
    document.addEventListener('pointerdown', resume, { once: true });
    document.addEventListener('keydown', resume, { once: true });
  },
  // 标记在线声当前不可用：15s 冷却期内后续点击跳过在线声（快速降级出声），
  // 冷却过后/切换声音/预热成功后都会重新尝试，绝不永久换掉用户选的在线音色。
_markOnlineBroken: function() {
    this._onlineBroken = true;
    this._onlineBrokenAt = Date.now();
  },
  // 设备默认语音兜底：不使用任何选定的 voice，直接把文本交给浏览器 speechSynthesis，
  // 由系统/浏览器默认引擎发声。用于"本地 server 不存在"的网页部署（GitHub Pages /
  // 手机直接访问等）：在线 speechSynthesis 声真连不上、或根本列不出 voices 时，
  // 不再把请求打到不存在的 /api/tts、/api/online-tts 上，而是让浏览器用自己的
  // 基础语音引擎读出来（绝大多数现代浏览器都能读英文）。全部设备语音也说不了
  // 才报错提示，绝不弹"server 未运行"误导网页版用户。
  _speakDeviceVoice: function(text, lang, opts) {
    var self = this;
    if (!('speechSynthesis' in window)) {
      this._deviceFail(opts);
      return;
    }
    this._stopLocalAudio();
    var settings = this.getSettings();
    var fireStart = opts && opts.onstart ? function() { try { opts.onstart(); } catch(e) {} } : function() {};
    var fireEnd = opts && opts.onend ? function() { try { opts.onend(); } catch(e) {} } : function() {};
    var u;
    try { u = new SpeechSynthesisUtterance(String(text || '')); } catch(e) { this._deviceFail(opts); return; }
    u.lang = /^en/i.test(String(lang || 'en-US')) ? 'en-US' : lang;
    u.rate = (opts && opts.rate) || this.getSettings().rate || 0.9;
    u.pitch = settings.pitch || 1;
    u.volume = settings.volume || 1;
    var started = false, finished = false;
    u.onstart = function() { started = true; fireStart(); };
    u.onend = function() { if (finished) return; finished = true; fireEnd(); };
    var failed = false, isFinal = (opts && opts._noRemoteRetry) === true;
    var deviceNext = function() {
      if (isFinal) { self._deviceFail(); return; }
      self._speakRemoteFallback(text, lang, opts);
    };
    u.onerror = function() {
      if (finished) return;
      finished = true;
      if (!failed) { failed = true; deviceNext(); }
    };
    try { window.speechSynthesis.cancel(); } catch(e) {}
    try { window.speechSynthesis.speak(u); } catch(e) { if (!finished) { finished = true; deviceNext(); } }
    // 无 voices 时浏览器可能不触发 onstart（依赖系统语音），给个较短保底超时，
    // 没出声就接远程在线发音兜底——保证手机/网页版点击必出声。
    setTimeout(function() {
      if (finished && !started) return;
      if (!started) { finished = true; deviceNext(); }
    }, 4500);
  },
  // 手机/网页版在线发音兜底：不依赖本机 TTS、不依赖本地 server，
  // 直接用浏览器 <audio> 播放远程发音接口的 MP3（浏览器可跨域播 <audio>，无需 CORS）。
  // 依次尝试：有道词典美音 → Google 翻译发音；任一成功即停，全部失败才真正报错。
  // 适用场景：手机系统无英文 TTS ⇨ speechSynthesis 无声；或 PC 网页版 server 未启动。
  _speakRemoteFallback: function(text, lang, opts) {
    var self = this;
    this._stopLocalAudio();
    var q = String(text || '').trim();
    if (!q) { this._deviceFail(opts); return; }
    var tl = /^en/i.test(String(lang || 'en-US')) ? 'en' : 'zh';
    var urls = [
      'https://dict.youdao.com/dictvoice?audio=' + encodeURIComponent(q) + '&type=1',
      'https://translate.googleapis.com/translate_tts?ie=UTF-8&client=tw-ob&tl=' + tl + '&q=' + encodeURIComponent(q)
    ];
    var seq = (this._waSeq || 0) + 1;
    this._waSeq = seq;
    var fireStart = opts && opts.onstart ? function() { try { opts.onstart(); } catch(e) {} } : function() {};
    var fireEnd = opts && opts.onend ? function() { try { opts.onend(); } catch(e) {} } : function() {};
    var done = false, started = false, i = 0;
    var tryNext = function() {
      if (seq !== self._waSeq) return;               // 已被新朗读打断
      if (done) return;
      if (i >= urls.length) { done = true; self._deviceFail(opts); return; }
      var url = urls[i++];
      var audio;
      try { audio = new Audio(url); } catch(e) { tryNext(); return; }
      self._localAudio = audio;
      audio.onplay = function() { if (!started) { started = true; fireStart(); } };
      audio.onended = function() {
        if (seq !== self._waSeq) return;
        if (self._localAudio === audio) self._localAudio = null;
        if (!done) { done = true; fireEnd(); }
      };
      audio.onerror = function() {
        if (self._localAudio === audio) self._localAudio = null;
        if (seq !== self._waSeq || done) return;
        tryNext();
      };
      var pr;
      try { pr = audio.play(); } catch(e) { if (!done) tryNext(); return; }
      if (pr && pr.catch) pr.catch(function(e) {
        if (e && e.name === 'AbortError') return;
        if (seq !== self._waSeq || done || started) return;
        tryNext();
      });
    };
    tryNext();
  },
  // 网页/手机版（_serverDown=true）的通用朗读入口：不依赖本地 server、
  // 不依赖浏览器有没有英文语音。
  // ① 优先：同步播远程发音 MP3（点按手势内立即出声——Google 的自动播放策略
  //    只放行"手势内发起的播放"，进了 setTimeout 的手势就作废了，iOS 尤甚）；
  // ② 远程失败 → 退回浏览器系统语音 speechSynthesis（设备有英文声时仍可出声）；
  // ③ 设备也失败 → 才真正 Toast 报错。绝不静默无声。
  _speakServerless: function(text, lang, opts) {
    var self = this;
    try { window.speechSynthesis.cancel(); } catch(e) {}
    this._stopLocalAudio();
    var o = {};
    if (opts) for (var k in opts) o[k] = opts[k];
    o.noFailToast = true; // 远程失败时先不弹 Toast，交给设备语音兜底
    o.onerror = function() {
      var d = {};
      if (opts) for (var k in opts) d[k] = opts[k];
      d._noRemoteRetry = true; // 设备语音失败不再递归远程，直接报错
      self._speakDeviceVoice(text, lang, d);
    };
    this._speakRemoteFallback(text, lang, o);
  },
  _deviceFail: function(opts) {
    this._stopLocalAudio();
    if (opts && opts.onerror) opts.onerror(new Error('device-voice-fail'));
    if (!(opts && opts.noFailToast)) {
      Toast.error('朗读失败：本机无可用的英文语音，在线发音服务也连接失败。请检查网络后重试，或到「设置-朗读声音」换一个声音');
    }
  },
  _ttsLocalFail: function(opts) {
    this._stopLocalAudio();
    if (opts && opts.onerror) opts.onerror(new Error('tts-local-fail'));
    // 即时语音模式下 server 不可用由调用方回退在线声，不弹 Toast
    if (!(opts && opts.noFailToast)) {
      if (this._serverDown === true) {
        // 网页版/无后端环境不提示"server 未运行"，引导用系统语音或换声音
        Toast.error('朗读失败：当前设备没有可用的英文语音，请到系统设置中安装/启用英文 TTS 语音，或到「设置-朗读声音」换一个声音');
      } else {
        Toast.error('朗读失败：浏览器在线语音不可用，本地发音服务也未启动。请确认 server 已运行（node server.js），或到「设置-朗读声音」换一个声音');
      }
    }
  },
  // 本地即时语音的预合成：翻卡/列词表时后台让 server 把即将点击的词先合成好
  // （HEAD 请求只触发 server 缓存，不下载音频、不出声）。勾选了「本地即时语音」
  // 后调用，确保点击即出声。并发限制 2，避免一次起太多 PowerShell 合成进程。
  prefetch: function(words) {
    var self = this;
    if (!this.getSettings().instant) return;
    if (!words || !words.length) return;
    var rate = this.getSettings().rate || 0.9;
    var lang = 'en-US';
    var base = window.API_BASE || '';
    if (!this._prefetchPool) this._prefetchPool = [];
    if (!this._prefetchSeen) this._prefetchSeen = {};
    for (var i = 0; i < words.length; i++) {
      var text = (words[i] == null ? '' : words[i]).toString().trim();
      if (!text || this._prefetchSeen[text]) continue;
      this._prefetchSeen[text] = 1;
      this._prefetchPool.push(text);
    }
    var running = 0;
    var next = function() {
      while (running < 2 && self._prefetchPool.length) {
        var t = self._prefetchPool.shift();
        running++;
        var url = base + '/api/tts?text=' + encodeURIComponent(t)
          + '&lang=' + encodeURIComponent(lang) + '&rate=' + encodeURIComponent(rate);
        fetch(url, { method: 'HEAD', cache: 'no-store' })
          .catch(function() {})
          .then(function() { running--; setTimeout(next, 50); });
      }
    };
    next();
  },
  // 把 skipName（单个名字或名字数组）归一化成查表对象，null/undefined 返回 null
  _skipSet: function(skipName) {
    if (!skipName) return null;
    var set = {};
    if (typeof skipName === 'string') { set[skipName] = 1; return set; }
    for (var i = 0; i < skipName.length; i++) set[skipName[i]] = 1;
    return set;
  },
  // 选声：全局 TTSManager 当前选中的声音（用户在下拉框切的）→ 用户保存的 →
  // 本地离线英文声 → 任一英文声（含在线 Natural 声）。skipName 为本次要跳过的
  // 坏声音（失败重试换声用，可为名字数组）。
  _pickVoice: function(savedName, skipName) {
    var voices;
    try { voices = window.speechSynthesis.getVoices() || []; } catch(e) { return null; }
    if (!voices.length) return null;
    var skip = this._skipSet(skipName);
    // 用户保存的选择（settings.voiceName）是权威来源：优先按它选声。
    // TTSManager.voice 只是缓存，可能在切换瞬间尚未同步（voices 列表异步加载时
    // setVoice 匹配失败会保留旧值）——若先返回它，用户切了声音读出来还是旧的。
    if (savedName) {
      for (var i = 0; i < voices.length; i++) {
        if (voices[i].name === savedName && !(skip && skip[voices[i].name])) return voices[i];
      }
    }
    // 所选声音在当前列表缺失（卸载/换浏览器）时才退回 TTSManager.voice 缓存
    if (TTSManager && TTSManager.voice) {
      var cur = TTSManager.voice;
      if (!(skip && skip[cur.name])) return cur;
    }
    var local = this._pickLocalENVoice(skipName);
    if (local) return local;
    return this._pickAnyENVoice(skipName);
  },
  // 任一英文声音（不要求离线）：语音列表里全是在线声时兜底用，保证选到英文音色
  _pickAnyENVoice: function(skipName) {
    var voices;
    try { voices = window.speechSynthesis.getVoices() || []; } catch(e) { return null; }
    var skip = this._skipSet(skipName);
    for (var i = 0; i < voices.length; i++) {
      if ((voices[i].lang || '').toLowerCase().indexOf('en') === 0
          && !(skip && skip[voices[i].name])) return voices[i];
    }
    return null;
  },
  // 单词朗读：26字母模块的字母词（单个字母）必须走 speakLetter（①assets/letters/A.wav 音频资源
  // ②TTSManager.speak("A") 裸字母，用所选声音）；禁止用 speak("A") 拼 "Letter A" 组合文本；
  // 其余单词走统一 speak 路径
  speakWord: function(word) {
    var w = String(word || '').trim();
    if (/^[a-zA-Z]$/.test(w)) { this.speakLetter(w); return; }
    this.speak(w, 'en-US');
  },
  // 判断是否在线/流式声音：Google 语音、含 Online/Natural/Neural 的声音会走服务器合成，
  // 每次点击朗读都有明显延迟；本地离线声音（如 Microsoft David/Zira）则几乎零延迟
  _isOnlineVoice: function(v) {
    var n = ((v && v.name) || '').toLowerCase();
    return n.indexOf('google') !== -1 || n.indexOf('online') !== -1
      || n.indexOf('natural') !== -1 || n.indexOf('neural') !== -1
      || n.indexOf('network') !== -1 || n.indexOf('stream') !== -1;
  },
  // 挑一个本地离线英文声音；一个都没有则回退任意非在线声音，再不行返回 null
  _pickLocalENVoice: function(skipName) {
    if (!('speechSynthesis' in window)) return null;
    var voices;
    try { voices = window.speechSynthesis.getVoices() || []; } catch(e) { return null; }
    if (!voices.length) return null;
    var skip = this._skipSet(skipName);
    var en = [];
    for (var i = 0; i < voices.length; i++) {
      if ((voices[i].lang || '').toLowerCase().indexOf('en') === 0) en.push(voices[i]);
    }
    var pool = en.length ? en : voices;
    for (var j = 0; j < pool.length; j++) {
      if (!(skip && skip[pool[j].name]) && !this._isOnlineVoice(pool[j])) return pool[j];
    }
    return null;
  },
  // 页面加载即预热 voices 列表 + 预热在线声连接。
  // 实测：本机 Edge 英文声全是 Online (Natural) 在线声。首次用在线声朗读，
  // 引擎要先连 speech.platform.bing.com，快则 6-8 秒、慢则直接 synthesis-failed；
  // 但若先用在线声说一个"空格"占位，连接在后台先建立，之后点击朗读只需 ~200ms。
  // 注意：voices 列表加载时间不固定（实测可超过 2s），必须轮询重试直到就绪，
  // 否则预热只试一次就静默放弃 → 首次点击朗读仍会无预热挂死。
  primeVoices: function(keepAlive) {
    if (!('speechSynthesis' in window)) return;
    var self = this;
    var prime = function() {
      var v = self._pickVoice(self.getSettings().voiceName, null);
      if (!v || !self._isOnlineVoice(v)) return;
      // 已有预热在排队/在播时不重复塞空格，避免队列堆满
      if (self._primingBusy) return;
      // 保活预热会 cancel 当前朗读：正在播放长句子（随声听/故事）时直接顺延到下一次，
      // 避免每 30s 打断真实朗读；页面加载时的首次预热此时尚无朗读，不受影响。
      if (keepAlive && TTSManager.isBusy()) return;
      // 本次会话已预热过（无论成功/失败/被打断）就不再重复预热：
      // 实测预热空格被真实朗读 cancel 后，若继续每 800ms 重新塞空格，
      // 会反复插队干扰正在播放的真实朗读（err:interrupted），导致"点了没声音"。
      // keepAlive=true（保活定时预热）除外：间隔 30s 一次，不会干扰真实朗读。
      if (self._primeDone && !keepAlive) return;
      self._primingBusy = true;
      try {
        var ps = new Date().getTime();
        var clear = function() { self._primingBusy = false; self._primeDone = true; };
        // 预热守卫：在线声首次连接慢（实测 6-8s），若网络差可能卡住永不触发
        // START/END/onerror，幽灵占用队列，之后所有真实朗读（包括 _speakTTS 的
        // cancel+重试）都排不进去，表现为"点击朗读没声音"。守卫只在预热确实
        // 没启动时复位忙碌标志；一旦 START 或已被真实朗读触发 interrupted，
        // 计时器即清除，绝不误 cancel 正在播的真实朗读。
        self._primeGuard = setTimeout(function() {
          self._primeGuard = null;
          clear();
        }, 15000);
// 统一经 TTSManager.speak 预热（内部 cancel + 100ms + speak，套用所选在线声音）
        var u = TTSManager.speak(' ', {
          voice: v,
          lang: 'en-US',
          rate: 0.9,
          volume: keepAlive ? 0 : 0.2, // 保活预热静音：万一在无朗读窗口被播到也不出声
  
          onstart: function() {
            if (self._primeGuard) { clearTimeout(self._primeGuard); self._primeGuard = null; }
            clear();
            // 预热成功 = 在线声验证可用：清掉之前的失败冷却，恢复用用户选的在线音色
            self._onlineBroken = false;
            self._onlineBrokenAt = undefined;
            window.__onlinePrimedAt = new Date().getTime() - ps;
          },
          onend: function() { if (self._primeGuard) { clearTimeout(self._primeGuard); self._primeGuard = null; } clear(); },
          onerror: function(e) { if (self._primeGuard) { clearTimeout(self._primeGuard); self._primeGuard = null; } window.__onlinePrimedAt = -1; if (!(e && e.error === 'interrupted')) self._markOnlineBroken(); clear(); }
        });
        if (!u) { if (self._primeGuard) { clearTimeout(self._primeGuard); self._primeGuard = null; } clear(); }
      } catch(e) { self._primingBusy = false; }
    };
    var tryPrime = function() {
      var voices;
      try { voices = window.speechSynthesis.getVoices() || []; } catch(e) { voices = []; }
      if (!voices.length) return false;
      prime();
      return true;
    };
    if (tryPrime()) return;
    // voices 异步加载：voiceschanged + 每 800ms 轮询兜底，最多 15s；
    // 预热尝试过一次（成功/失败/被打断）即停（_primeDone 或 __onlinePrimedAt 出现即代表已尝试过）。
    var check = function() {
      if (self._primeDone || window.__onlinePrimedAt !== undefined) { stop(); return true; }
      return tryPrime();
    };
    var stop = function() {
      clearInterval(timer);
      try { window.speechSynthesis.removeEventListener('voiceschanged', check); } catch(e) {}
    };
try { window.speechSynthesis.addEventListener('voiceschanged', check); } catch(e) {}
    var timer = setInterval(check, 800);
    setTimeout(stop, 15000);
  },
  // 在线声保活：Edge 闲置一段时间会回收在线语音的 WSS 连接，下次点击要重新冷连接
  // （实测 6-10s）甚至失败——正是"时好时坏/过一会儿又不行"的主因。
  // 策略：页面加载后每 30s 用静音空格在所选在线声下预热一次（keepAlive=true 绕过
  // _primeDone），让连接保持温热，点击朗读约 200-400ms 即出音；本地即时路径不启动。
  scheduleKeepAlive: function() {
    var self = this;
    if (self._keepAliveTimer) { clearTimeout(self._keepAliveTimer); }
    self._keepAliveTimer = setTimeout(function() {
      self._keepAliveTimer = null;
      if (!self.getSettings().instant) {
        try { if (document.hidden) { self.scheduleKeepAlive(); return; } } catch(e) {}
        self.primeVoices(true);
      }
      self.scheduleKeepAlive();
    }, 30000);
  }
};

// ==================== 数据存储 ====================
// 统一的 localStorage 包装：所有调用经此入口，统一 try/catch + JSON 序列化，
// 避免 12 处散落的 try 写法不一致 / 漏 try 裸调。
var Storage = {
  // 读取原始字符串；失败或不存在则返回 fallback
  get: function(key, fallback) {
    try {
      var v = localStorage.getItem(key);
      return v === null ? (fallback == null ? '' : fallback) : v;
    } catch(e) {
      return fallback == null ? '' : fallback;
    }
  },
  // 写入原始字符串；失败静默
  set: function(key, value) {
    try { localStorage.setItem(key, value); } catch(e) {}
  },
  // 读取并 JSON.parse；失败返回 fallback
  getJSON: function(key, fallback) {
    try {
      var v = localStorage.getItem(key);
      if (v === null) return fallback;
      return JSON.parse(v);
    } catch(e) { return fallback; }
  },
  // JSON.stringify 后写入；如配额超限不再静默，Toast 一次提示用户
  setJSON: function(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch(e) {
      // QuotaExceededError 时给一次提示
      try {
        if (window.Toast) Toast.error('存储空间已满，请导出数据后清理');
        else console.error('localStorage quota exceeded for', key);
      } catch(_e) {}
      return false;
    }
  },
  // 删除某个 key
  remove: function(key) {
    try { localStorage.removeItem(key); } catch(e) {}
  }
};

// ==================== 应用数据存储（业务封装） ====================
var DataStore = {
  getDefaultWords: function() {
    var lib = typeof WORD_LIBRARY !== 'undefined' && WORD_LIBRARY ? WORD_LIBRARY : {};
    // 统一归一化：categories 缺失/非数组、单分类缺 words 时全部兜底，防各模块 init 崩溃
    var cats = Array.isArray(lib.categories) ? lib.categories : [];
    cats = cats.map(function(c) { return (c && typeof c === 'object') ? c : { name: '未知分类', words: [] }; });
    return { categories: cats };
  },
  getDefaultGrammar: function() {
    var base = (typeof GRAMMAR_DATA !== 'undefined' && GRAMMAR_DATA) ? GRAMMAR_DATA : [];
    var list = Array.isArray(base) ? base : (base.grammar_exercises || []);
    if (typeof EXTRA_GRAMMAR !== 'undefined' && Array.isArray(EXTRA_GRAMMAR)) {
      var seen = {};
      list.forEach(function(ex) { seen[ex.id] = true; });
      EXTRA_GRAMMAR.forEach(function(ex) {
        if (!seen[ex.id]) {
          list.push(ex);
          seen[ex.id] = true;
        }
      });
    }
    return list;
  },
  getDefaultReading: function() {
    if (typeof EXTRA_READING !== 'undefined') return EXTRA_READING;
    return typeof READING_DATA !== 'undefined' ? READING_DATA : [];
  },
  getProgress: function(key, defaultVal) {
    return Storage.getJSON(key, defaultVal);
  },
  setProgress: function(key, val) {
    return Storage.setJSON(key, val);
  },
  // 艾宾浩斯遗忘曲线：复习次数 → 间隔天数 / 记忆保持率（与背单词页表格、复习环共用同一份数据）
  ebbinghausIntervals: [1, 2, 4, 7, 15, 30, 60, 120],
  ebbinghausRetention: [58, 72, 80, 85, 90, 93, 96, 100],
  getEbbinghausPlan: function() {
    var rows = [];
    for (var i = 0; i < this.ebbinghausIntervals.length; i++) {
      rows.push({ count: i + 1, days: this.ebbinghausIntervals[i], retention: this.ebbinghausRetention[i] });
    }
    return rows;
  },
  getNextReview: function(key, reviewCount, half) {
    // 防御：reviewCount 可能是 undefined/NaN/字符串（导入坏数据时），落到 0 避免下面 Math.min(undefined) → NaN → intervals[NaN]=undefined → setDate 抛 RangeError
    var rc = parseInt(reviewCount, 10);
    if (isNaN(rc) || rc < 0) rc = 0;
    var idx = Math.min(rc, this.ebbinghausIntervals.length - 1);
    var days = this.ebbinghausIntervals[idx];
    // 自适应模式："有点印象"按表间隔减半推进（至少 1 天）
    if (half) days = Math.max(1, Math.ceil(days / 2));
    var next = new Date();
    next.setDate(next.getDate() + days);
    return getLocalDateStr(next);
  }
};

// ==================== 主题切换 ====================
var ThemeToggle = {
  init: function() {
    var saved = Storage.get('theme', 'light');
    this.apply(saved);
    var btn = document.getElementById('btn-theme-toggle');
    if (btn) btn.addEventListener('click', function() { ThemeToggle.toggle(); });
  },
  apply: function(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    Storage.set('theme', theme);
  },
  toggle: function() {
    var current = document.documentElement.getAttribute('data-theme');
    var next = current === 'dark' ? 'light' : 'dark';
    this.apply(next);
    Toast.info(next === 'dark' ? '已切换到深色模式' : '已切换到浅色模式');
    // 明暗切换后，重新套用当前主题色（让 dark 下的派生色生效）
    ThemeColor.reapply();
  }
};

// ==================== 主题颜色 ====================
// 预设色包名 → 'sage' 用默认（不设 data-theme-color 属性），其余映射到 CSS 里的 [data-theme-color="..."]
var ThemeColor = {
  PRESETS: ['sage', 'blue', 'purple', 'rose', 'amber'],
  // 默认 sage 全套（用于 reset 与 HSL 派生的参照）
  DEFAULT_LIGHT: {
    sage:'#547A67', sageDeep:'#3D5C4D', sageMuted:'#7A9E8A',
    sageLight:'#E8F0EC', sageSurface:'#F2F7F4', sageHover:'#4A6B59'
  },
  DEFAULT_DARK: {
    sage:'#6BAF8B', sageDeep:'#8BC9A5', sageMuted:'#5A9A78',
    sageLight:'#1E2E25', sageSurface:'#1A2820', sageHover:'#7AC09A'
  },
  styleEl: null,

  init: function() {
    // 找到/创建承载自定义色的 <style>
    this.styleEl = document.getElementById('theme-color-style');
    if (!this.styleEl) {
      this.styleEl = document.createElement('style');
      this.styleEl.id = 'theme-color-style';
      document.head.appendChild(this.styleEl);
    }
    var self = this;

    // 5 个预设色按钮
    var btns = document.querySelectorAll('.theme-colors .color-btn[data-color]');
    btns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        var color = btn.getAttribute('data-color');
        if (color === 'custom') return; // 自定义走自己的入口
        self.applyPreset(color);
        self.setActiveButton(color);
      });
    });

    // 自定义色按钮：展开/收起拾取器面板
    var customBtn = document.getElementById('btn-custom-color');
    var picker = document.getElementById('custom-color-picker');
    if (customBtn && picker) {
      customBtn.addEventListener('click', function() {
        if (picker.classList.contains('hidden')) {
          picker.classList.remove('hidden');
          self.renderPreview(document.getElementById('custom-color-input').value);
        } else {
          picker.classList.add('hidden');
        }
      });
    }

    // 拾取器联动：选色 → 更新 hex 显示 + 实时预览
    var colorInput = document.getElementById('custom-color-input');
    var hexLabel = document.getElementById('custom-color-hex');
    if (colorInput && hexLabel) {
      colorInput.addEventListener('input', function() {
        hexLabel.textContent = colorInput.value.toUpperCase();
        self.renderPreview(colorInput.value);
      });
    }

    // “应用自定义颜色”
    safeBind('btn-apply-custom-color', 'click', function() {
      var hex = colorInput ? colorInput.value : '#547A67';
      self.applyCustom(hex);
      self.setActiveButton('custom');
      Toast.success('自定义颜色已应用');
    });

    // “恢复默认” → 回到 sage
    safeBind('btn-reset-custom-color', 'click', function() {
      self.applyPreset('sage');
      self.setActiveButton('sage');
      if (picker) picker.classList.add('hidden');
      Toast.info('已恢复默认主题色');
    });

    // 启动时还原上次选择
    var saved = Storage.get('theme_color', 'sage') || 'sage';
    if (saved === 'custom') {
      var savedHex = Storage.get('custom_theme_color', '#547A67') || '#547A67';
      this.applyCustom(savedHex);
      if (colorInput) colorInput.value = savedHex;
      if (hexLabel) hexLabel.textContent = savedHex.toUpperCase();
    } else {
      this.applyPreset(saved);
    }
    this.setActiveButton(saved);
  },
  // 应用预设色包：sage → 移除属性；其余 → 设置 data-theme-color
  applyPreset: function(color) {
    var root = document.documentElement;
    if (color === 'sage' || this.PRESETS.indexOf(color) === -1) {
      root.removeAttribute('data-theme-color');
    } else {
      root.setAttribute('data-theme-color', color);
    }
    // 清掉自定义色注入的样式（预设色由 CSS 接管）
    if (this.styleEl) this.styleEl.textContent = '';
    Storage.set('theme_color', color === 'sage' ? 'sage' : color);
  },
  // 应用自定义色：HSL 派生全套 sage 变量 + sidebar 变量，注入 <style>
  applyCustom: function(hex) {
    var root = document.documentElement;
    // 标识为 custom，但 data-theme-color 不指向任何预设，避免被 CSS 预设覆盖
    root.setAttribute('data-theme-color', 'custom');
    var light = this.deriveSagePack(hex, 'light');
    var dark  = this.deriveSagePack(hex, 'dark');
    var css = '';
    css += '[data-theme-color="custom"]{\n';
    css += '  --sage:' + light.sage + ';--sage-deep:' + light.sageDeep + ';--sage-muted:' + light.sageMuted + ';\n';
    css += '  --sage-light:' + light.sageLight + ';--sage-surface:' + light.sageSurface + ';--sage-hover:' + light.sageHover + ';\n';
    css += '  --sidebar-bg:' + light.sidebarBg + ';--sidebar-text:' + light.sidebarText + ';\n';
    css += '  --sidebar-active:' + light.sidebarActive + ';--sidebar-hover:' + light.sidebarHover + ';\n';
    css += '}\n';
    css += '[data-theme="dark"][data-theme-color="custom"]{\n';
    css += '  --sage:' + dark.sage + ';--sage-deep:' + dark.sageDeep + ';--sage-muted:' + dark.sageMuted + ';\n';
    css += '  --sage-light:' + dark.sageLight + ';--sage-surface:' + dark.sageSurface + ';--sage-hover:' + dark.sageHover + ';\n';
    css += '  --sidebar-bg:' + dark.sidebarBg + ';--sidebar-text:' + dark.sidebarText + ';\n';
    css += '  --sidebar-active:' + dark.sidebarActive + ';--sidebar-hover:' + dark.sidebarHover + ';\n';
    css += '}\n';
    if (this.styleEl) this.styleEl.textContent = css;
    Storage.set('theme_color', 'custom');
    Storage.set('custom_theme_color', hex);
  },
  // 明暗切换后调用：重新套用当前主题色（dark 派生色由 CSS 级联自动生效，这里主要是保险）
  reapply: function() {
    var saved = Storage.get('theme_color', 'sage') || 'sage';
    if (saved === 'custom') {
      var hex = Storage.get('custom_theme_color', '#547A67') || '#547A67';
      this.applyCustom(hex);
    } else {
      this.applyPreset(saved);
    }
  },
  // 高亮当前选中的按钮（sage 和 custom 都对应各自按钮）
  setActiveButton: function(color) {
    var btns = document.querySelectorAll('.theme-colors .color-btn[data-color]');
    btns.forEach(function(btn) {
      if (btn.getAttribute('data-color') === color) btn.classList.add('active');
      else btn.classList.remove('active');
    });
  },
  // 拾取器预览区：用 hex 派生 light 6 个变体，渲染 6 个 swatch
  renderPreview: function(hex) {
    var previewBox = document.getElementById('custom-color-preview');
    if (!previewBox) return;
    var pack = this.deriveSagePack(hex, 'light');
    var labels = ['主', '深', '淡', '浅', '面', '悬停'];
    var vals = [pack.sage, pack.sageDeep, pack.sageMuted, pack.sageLight, pack.sageSurface, pack.sageHover];
    previewBox.innerHTML = '';
    for (var i = 0; i < vals.length; i++) {
      var s = document.createElement('div');
      s.className = 'swatch';
      s.style.background = vals[i];
      s.textContent = labels[i];
      previewBox.appendChild(s);
    }
  },
  // ── 颜色数学：HEX ↔ HSL，并据此派生 sage 全包 ──
  hexToHsl: function(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
    var r = parseInt(hex.substr(0,2),16)/255;
    var g = parseInt(hex.substr(2,2),16)/255;
    var b = parseInt(hex.substr(4,2),16)/255;
    var max = Math.max(r,g,b), min = Math.min(r,g,b);
    var h = 0, s = 0, l = (max+min)/2;
    if (max !== min) {
      var d = max - min;
      s = l > 0.5 ? d/(2-max-min) : d/(max+min);
      switch(max) {
        case r: h = ((g-b)/d + (g<b?6:0)); break;
        case g: h = ((b-r)/d + 2); break;
        case b: h = ((r-g)/d + 4); break;
      }
      h *= 60;
    }
    return { h: h, s: s*100, l: l*100 };
  },
  hslToHex: function(h, s, l) {
    s /= 100; l /= 100;
    var c = (1 - Math.abs(2*l - 1)) * s;
    var x = c * (1 - Math.abs(((h/60) % 2) - 1));
    var m = l - c/2;
    var r=0, g=0, b=0;
    if (h < 60)        { r=c; g=x; b=0; }
    else if (h < 120)  { r=x; g=c; b=0; }
    else if (h < 180)  { r=0; g=c; b=x; }
    else if (h < 240)  { r=0; g=x; b=c; }
    else if (h < 300)  { r=x; g=0; b=c; }
    else               { r=c; g=0; b=x; }
    var toHex = function(v) { var n = Math.round((v+m)*255); var h = n.toString(16); return n < 16 ? '0'+h : h; };
    return '#' + toHex(r) + toHex(g) + toHex(b);
  },
  // 接收主色 hex + 模式（'light'/'dark'），派生 sage 全套 6 个变体
  // 策略：以主色 HSL 为基准，按经验比例给 sage-deep/muted/light/surface/hover 配深浅
  deriveSagePack: function(hex, mode) {
    var hsl = this.hexToHsl(hex);
    var H = hsl.h, S = hsl.s, L = hsl.l;
    // dark：把主色调亮一些、略降饱和以适配深背景
    // light：主色直接用 hex，其余按 60-30-10 设计派生
    var sage, sageDeep, sageMuted, sageLight, sageSurface, sageHover;
    var sidebarBg, sidebarText, sidebarActive, sidebarHover;
    if (mode === 'dark') {
      sage       = this.hslToHex(H, Math.min(S+5, 85), Math.min(L+10, 70));
      sageDeep   = this.hslToHex(H, Math.min(S+10,90), Math.min(L+20, 82));
      sageMuted  = this.hslToHex(H, Math.max(S-5, 30), L);
      sageLight  = this.hslToHex(H, Math.max(S-10,20), 14);
      sageSurface = this.hslToHex(H, Math.max(S-15,15), 10);
      sageHover  = this.hslToHex(H, Math.min(S+8,88), Math.min(L+18, 80));
      // sidebar 渐变：深色主题下更暗一点，文本更弱
      var sbTop = this.hslToHex(H, Math.max(S-10, 20), 7);
      var sbBot = this.hslToHex(H, Math.min(S, 70), 16);
      sidebarBg = 'linear-gradient(180deg,' + sbTop + ' 0%,' + sbBot + ' 100%)';
      sidebarText = 'rgba(255,255,255,0.6)';
      sidebarActive = 'rgba(255,255,255,0.16)';
      sidebarHover = 'rgba(255,255,255,0.06)';
    } else {
      sage       = this.hslToHex(H, S, L);
      sageDeep   = this.hslToHex(H, Math.min(S+5, 90), Math.max(L-12, 18));
      sageMuted  = this.hslToHex(H, Math.max(S-15, 25), Math.min(L+10, 78));
      sageLight  = this.hslToHex(H, Math.min(S+5, 60), 91);
      sageSurface = this.hslToHex(H, Math.max(S-10, 20), 96);
      sageHover  = this.hslToHex(H, Math.min(S+3, 90), Math.max(L-8, 22));
      // sidebar 渐变：浅色主题下用主色降到很暗的色作为渐变两端
      var sbTop2 = this.hslToHex(H, Math.min(S, 70), 16);
      var sbBot2 = this.hslToHex(H, Math.min(S, 80), 28);
      sidebarBg = 'linear-gradient(180deg,' + sbTop2 + ' 0%,' + sbBot2 + ' 100%)';
      sidebarText = 'rgba(255,255,255,0.9)';
      sidebarActive = 'rgba(255,255,255,0.2)';
      sidebarHover = 'rgba(255,255,255,0.1)';
    }
    return { sage: sage, sageDeep: sageDeep, sageMuted: sageMuted,
             sageLight: sageLight, sageSurface: sageSurface, sageHover: sageHover,
             sidebarBg: sidebarBg, sidebarText: sidebarText,
             sidebarActive: sidebarActive, sidebarHover: sidebarHover };
  }
};
// ==================== 键盘快捷键 ====================
var KeyboardShortcuts = {
  enabled: true,
  init: function() {
    this.enabled = DataStore.getProgress('shortcuts_enabled', true);
    document.addEventListener('keydown', function(e) {
      if (!KeyboardShortcuts.enabled) return;
      if (e.repeat) return; // 长按按键自动 repeat，拦截防止连评多卡
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      var app = window.app;
      if (!app || !app.wordModule) return;
      if (app.currentTab !== 'word' && app.currentTab !== undefined) return;
      var wm = app.wordModule;
      switch(e.code) {
        case 'Space': e.preventDefault(); wm.flipCard(); break;
        case 'ArrowLeft': e.preventDefault(); wm.prevWord(); break;
        case 'ArrowRight': e.preventDefault(); wm.nextWord(); break;
        case 'Digit1': case 'Numpad1': e.preventDefault(); wm.markWord('forgot'); break;
        case 'Digit2': case 'Numpad2': e.preventDefault(); wm.markWord('hesitate'); break;
        case 'Digit3': case 'Numpad3': e.preventDefault(); wm.markWord('known'); break;
      }
    });
  }
};

// ==================== 学习提醒 ====================
var LearningReminder = {
  timer: null,
  init: function() {
    var enabled = DataStore.getProgress('reminder_enabled', false);
    var time = DataStore.getProgress('reminder_time', '09:00');
    if (enabled) this.enable(time, true);
  },
  enable: function(time, silent) {
    if (this.timer) clearInterval(this.timer);
    var self = this;
    if (typeof time !== 'string' || time.indexOf(':') === -1) time = '09:00';
    var parts = time.split(':');
    var h = parseInt(parts[0]), m = parseInt(parts[1]);
    if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) {
      // 时间无效（例如导入备份写入空串）：清掉开启标志，避免永久卡在"已开启但无计时器"
      DataStore.setProgress('reminder_enabled', false);
      return;
    }
    DataStore.setProgress('reminder_enabled', true);
    DataStore.setProgress('reminder_time', time);
    this.timer = setInterval(function() {
      var now = new Date();
      if (now.getHours() === h && now.getMinutes() === m) {
        Toast.info('该学习啦！今天还没背单词哦');
      }
    }, 60000);
    if (!silent) Toast.success('提醒已开启，每天 ' + time);
  },
  disable: function(silent) {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    DataStore.setProgress('reminder_enabled', false);
    if (!silent) Toast.info('提醒已关闭');
  }
};
// ==================== 背单词模块 ====================
// 渲染艾宾浩斯遗忘曲线复习表：按当前单词复习次数高亮当前阶段；数据源与复习排期共用 DataStore
function renderEbbinghausPlan(activeCount) {
  var tbody = document.querySelector('.plan-table tbody');
  if (!tbody) return;
  var rc = parseInt(activeCount, 10);
  if (isNaN(rc) || rc < 0) rc = 0;
  var plan = DataStore.getEbbinghausPlan();
  var html = '';
  plan.forEach(function(row) {
    var cls = '';
    if (rc >= plan.length) cls = 'row-done';
    else if (row.count === rc) cls = 'row-current';
    else if (row.count < rc) cls = 'row-done';
    html += '<tr class="' + cls + '"><td>第' + row.count + '次</td><td>' + row.days + '天</td><td>' + row.retention + '%</td></tr>';
  });
  tbody.innerHTML = html;
}
// 分类下拉显示排序：阶段0(26个字母)置顶，其余按原顺序；返回真实索引数组
function orderCategoriesForDisplay(cats) {
  if (!cats || !cats.length) return []; // 词库损坏/未加载时防 TypeError 崩模块
  var order = [];
  var rest = [];
  for (var i = 0; i < cats.length; i++) {
    if (cats[i] && cats[i].stage === 0) order.push(i);
    else rest.push(i);
  }
  return order.concat(rest);
}
var WordModule = (function() {
function WordModule() {
    this.categories = [];
    this.currentCategoryIndex = 0;
    this.currentIndex = 0;
    this.wordProgress = {};
    this._statsCache = null; // { catIdx, mastered, due }：renderStats 热路径防重复全类遍历
    this.currentView = 'card';
    this.listPage = 1;
    this.searchQuery = '';
    this.searchFilter = 'all';
    this.loadProgress();
    this.initUI();
  }
  WordModule.prototype.initUI = function() {
    this.bindEvents();
    this.populateCategories();
    this.showCurrentWord();
    this.renderStats();
    renderEbbinghausPlan(this.currentReviewCount());
  };
  WordModule.prototype.bindEvents = function() {
    var self = this;
    safeBind('btn-flip', 'click', function() { self.flipCard(); });
    safeBind('btn-speak', 'click', function() { self.speakCurrent(); });
    safeBind('prev-word', 'click', function() { self.prevWord(); });
    safeBind('next-word', 'click', function() { self.nextWord(); });
    safeBind('btn-forgot', 'click', function() { self.markWord('forgot'); });
    safeBind('btn-hesitate', 'click', function() { self.markWord('hesitate'); });
    safeBind('btn-known', 'click', function() { self.markWord('known'); });
    safeBind('btn-fav-word', 'click', function() { self.favoriteCurrent(); });
    safeBind('word-category', 'change', function(e) { self.selectCategory(e.target.value); });
    safeBind('btn-add-word', 'click', function() { self.showAddModal(); });
    safeBind('btn-reset-card-pos', 'click', function() { self.resetCardPos(); });
    // 跳页输入：点“跳转”按钮或回车都直接跳到输入序号对应的卡片（1 基）
    safeBind('btn-jump-word', 'click', function() { self.jumpWord(); });
    var jumpInput = document.getElementById('word-jump-input');
    if (jumpInput) {
      jumpInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault(); self.jumpWord(); } });
    }
    safeBind('btn-cancel-add', 'click', function() { self.hideAddModal(); });
    safeBind('form-add-word', 'submit', function(e) { self.addWord(e); });
    safeBind('btn-view-card', 'click', function() { self.switchView('card'); });
    safeBind('btn-view-list', 'click', function() { self.switchView('list'); });
    safeBind('wl-prev', 'click', function() { self.listPrevPage(); });
    safeBind('wl-next', 'click', function() { self.listNextPage(); });
    // 列表视图底部跳页：点“跳转”按钮或回车都跳到输入页码
    safeBind('btn-wl-jump', 'click', function() { self.jumpListPage(); });
    var wlJumpInput = document.getElementById('wl-jump-input');
    if (wlJumpInput) {
      wlJumpInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault(); self.jumpListPage(); } });
    }
    safeBind('word-search', 'input', function(e) {
      self.searchQuery = e.target.value.toLowerCase();
      self.listPage = 1;
      self.renderWordList();
    });
    document.querySelectorAll('.filter-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        document.querySelectorAll('.filter-btn').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        self.searchFilter = btn.dataset.filter;
        self.listPage = 1;
        self.renderWordList();
      });
    });
  };
  WordModule.prototype.switchView = function(view) {
    this.currentView = view;
    document.getElementById('btn-view-card').classList.toggle('active', view === 'card');
    document.getElementById('btn-view-list').classList.toggle('active', view === 'list');
    document.querySelector('.card-area').classList.toggle('hidden', view !== 'card');
    document.getElementById('word-list').classList.toggle('hidden', view !== 'list');
    if (view === 'list') this.renderWordList();
  };
  WordModule.prototype.getFilteredWords = function() {
    var words = this.getCurrentWords();
    var self = this;
    var today = this.getToday();
    if (this.searchQuery) {
      words = words.filter(function(w) {
        return w.word.toLowerCase().indexOf(self.searchQuery) !== -1 ||
               (w.chinese && w.chinese.indexOf(self.searchQuery) !== -1);
      });
    }
    if (this.searchFilter !== 'all') {
      words = words.filter(function(w) {
        var key = w.word + '-' + self.currentCategoryIndex;
        var p = self.wordProgress[key];
        // 计算显示状态：新词没记录；已掌握/不认识按存储 status；否则看 nextReview 决定学习中 or 待复习
        var status;
        if (!p) {
          status = 'new';
        } else if (p.status === 'mastered') {
          status = 'mastered';
        } else if (p.status === 'failed') {
          status = 'failed';
        } else if (p.nextReview && p.nextReview <= today) {
          status = 'due';
        } else {
          status = 'learning';
        }
        return status === self.searchFilter;
      });
    }
    return words;
  };
  WordModule.prototype.renderWordList = function() {
    var words = this.getFilteredWords();
    var self = this;
    var pageSize = 20;
    var totalPages = Math.max(1, Math.ceil(words.length / pageSize));
    if (this.listPage > totalPages) this.listPage = totalPages;
    var start = (this.listPage - 1) * pageSize;
    var pageWords = words.slice(start, start + pageSize);
    var today = this.getToday();
    var tbody = document.getElementById('word-list-body');
    if (!words.length) {
      // 没有匹配的单词时给个明显提示，否则列表区空白看起来像过滤按钮坏了
      tbody.innerHTML = '<div style="padding:var(--sp-8) 0;text-align:center;color:var(--text-tertiary);font-size:0.9rem">该筛选下没有单词，试试别的过滤器</div>';
      document.getElementById('wl-page-info').textContent = '1/1';
      document.getElementById('wl-prev').disabled = true;
      document.getElementById('wl-next').disabled = true;
      return;
    }
    tbody.innerHTML = pageWords.map(function(w) {
      var key = w.word + '-' + self.currentCategoryIndex;
      var p = self.wordProgress[key];
      var status = '新词';
      var statusCls = 'status-new';
      if (p) {
        if (p.status === 'mastered') { status = '已掌握'; statusCls = 'status-mastered'; }
        else if (p.status === 'failed') { status = '不认识'; statusCls = 'status-failed'; }
        else if (p.nextReview && p.nextReview <= today) { status = '待复习'; statusCls = 'status-due'; }
        else { status = '学习中'; statusCls = 'status-learning'; }
      }
      return '<div class="wl-row">' +
        '<span class="wl-col wl-word">' + escapeHtml(w.word) + '</span>' +
        '<span class="wl-col wl-phonetic">' + escapeHtml(w.phonetic || '') + '</span>' +
        '<span class="wl-col wl-pos">' + escapeHtml(w.pos || '') + '</span>' +
        '<span class="wl-col wl-chinese">' + escapeHtml(w.chinese) + '</span>' +
        '<span class="wl-col wl-status"><span class="' + statusCls + '">' + status + '</span></span>' +
        '<span class="wl-col wl-action"><button class="btn btn-sm btn-speak wl-speak" data-word="' + escapeHtml(w.word) + '"><svg class="icon icon-sm"><use href="#i-volume"/></svg></button></span>' +
      '</div>';
    }).join('');
    tbody.querySelectorAll('.wl-speak').forEach(function(btn) {
      btn.addEventListener('click', function() { SpeechUtil.speakWord(btn.dataset.word); });
    });
    document.getElementById('wl-page-info').textContent = this.listPage + '/' + totalPages;
    document.getElementById('wl-prev').disabled = this.listPage <= 1;
    document.getElementById('wl-next').disabled = this.listPage >= totalPages;
    // 本地即时语音：后台预合成本页单词，点击即出声
    if (window.SpeechUtil) SpeechUtil.prefetch(pageWords.map(function(w) { return w.word; }));
  };
  WordModule.prototype.listPrevPage = function() { if (this.listPage > 1) { this.listPage--; this.renderWordList(); this.saveCardPos(); } };
  // 列表视图过滤后的总页数（pageSize=20），空结果算 1 页
  WordModule.prototype.getListTotalPages = function() {
    var words = this.getFilteredWords();
    return Math.max(1, Math.ceil(words.length / 20));
  };
  WordModule.prototype.listNextPage = function() {
    // 上界保护：算出过滤后总页数，越界不再增，避免 listPage 膨胀后被 saveCardPos 存坏
    var totalPages = this.getListTotalPages();
    if (this.listPage < totalPages) { this.listPage++; this.renderWordList(); this.saveCardPos(); }
  };
  // 列表视图按输入页码跳转：1 起，越界自动收夹到末页
  WordModule.prototype.jumpListPage = function() {
    var input = document.getElementById('wl-jump-input');
    if (!input) return;
    var words = this.getFilteredWords();
    var pageSize = 20;
    var totalPages = Math.max(1, Math.ceil(words.length / pageSize));
    var n = parseInt(input.value, 10);
    if (isNaN(n) || n < 1) { Toast.warning('请输入有效页码（≥1）'); return; }
    if (n > totalPages) { Toast.warning('超过总页数 ' + totalPages + '，已跳到末页'); n = totalPages; }
    this.listPage = n;
    this.renderWordList();
    this.saveCardPos();
    input.value = '';
  };
  WordModule.prototype.populateCategories = function() {
    var self = this;
    this.categories = DataStore.getDefaultWords().categories;
    if (!this.categories || this.categories.length === 0) {
      Toast.error('词库加载失败，请检查 data/ 文件是否齐全或刷新页面');
      this.categories = [];
    }
    this.categories.forEach(function(cat, i) {
      var custom = DataStore.getProgress('custom_words_' + i, null);
      if (custom && Array.isArray(custom) && custom.length > 0) {
        // 自定义词库是「内置 + 用户添加」的超集（无删除词功能）。
        // 直接整体替换会丢掉扩容后新增的内置词 → 与内置词库合并：
        // 内置词优先（可能带更新释义），custom 中不在内置里的才是用户自己加的，追加在末尾
        var byWord = {};
        (cat.words || []).forEach(function(w) { if (w && w.word) byWord[String(w.word).toLowerCase()] = true; });
        var merged = (cat.words || []).slice();
        custom.forEach(function(w) {
          if (!w || !w.word) return;
          var key = String(w.word).toLowerCase();
          if (!byWord[key]) {
            byWord[key] = true;
            merged.push(w);
          }
        });
cat.words = merged;
      } else {
        cat.words = Array.isArray(cat.words) ? cat.words.slice() : []; // 单分类缺 words 防崩
      }
    });
    var select = document.getElementById('word-category');
    select.innerHTML = '';
    orderCategoriesForDisplay(this.categories).forEach(function(i) {
      var opt = document.createElement('option');
      opt.value = i;
      opt.textContent = self.categories[i].name + ' (' + (self.categories[i].words || []).length + ')';
      select.appendChild(opt);
    });
    // 恢复上次选择的词库（阶段5 等），词库不存在时兜底回第一个
    var savedCategory = DataStore.getProgress('word_category_index', 0);
    if (this.categories[savedCategory]) select.value = savedCategory;
    if (select.value === '' && select.options.length) select.value = select.options[0].value;
    // 初次加载后恢复上次各词库翻到的位置
    var initialCategory = parseInt(select.value);
    if (isNaN(initialCategory) || !this.categories[initialCategory]) initialCategory = select.options.length ? parseInt(select.options[0].value) : 0;
    if (!isNaN(initialCategory)) {
      this.currentCategoryIndex = initialCategory;
      var saved = this.loadCardPos(initialCategory);
      var maxLen = (this.categories[initialCategory] || { words: [] }).words.length;
      this.currentIndex = (saved.index < maxLen) ? saved.index : 0;
      var totalPages = this.getListTotalPages();
      this.listPage = (saved.listPage && saved.listPage <= totalPages) ? saved.listPage : 1;
    }
  };
  WordModule.prototype.selectCategory = function(index) {
    this.currentCategoryIndex = parseInt(index);
    this._statsCache = null; // 切词库后统计缓存失效，下次渲染重新计算
    // 记住用户选择的词库，下次打开页面恢复
    DataStore.setProgress('word_category_index', this.currentCategoryIndex);
    // 切换词库时清掉旧词库的筛选上下文（搜索词、状态过滤），避免旧 filter 导致新词库页码越界
    this.searchQuery = '';
    this.searchFilter = 'all';
    var searchEl = document.getElementById('word-search');
    if (searchEl) searchEl.value = '';
    document.querySelectorAll('.filter-btn').forEach(function(b) { b.classList.toggle('active', b.dataset.filter === 'all'); });
    // 恢复上次翻到的位置 + 列表页码，越界按本词库页数钳制
    var saved = this.loadCardPos(this.currentCategoryIndex);
    var maxLen = (this.categories[this.currentCategoryIndex] || { words: [] }).words.length;
    this.currentIndex = (saved.index < maxLen) ? saved.index : 0;
    var totalPages = this.getListTotalPages();
    this.listPage = (saved.listPage && saved.listPage <= totalPages) ? saved.listPage : 1;
    this.renderStats();
    this.showCurrentWord();
    this.saveCardPos();
    if (this.currentView === 'list') this.renderWordList();
  };
  WordModule.prototype.getCurrentWords = function() {
    if (this.currentCategoryIndex >= this.categories.length) return [];
    return this.categories[this.currentCategoryIndex].words;
  };
  WordModule.prototype.showCurrentWord = function() {
    var words = this.getCurrentWords();
    if (!words.length) return;
    // 防御：currentIndex 越界（词库被外部缩短/边界场景）时归零，避免下面 words[currentIndex].word 抛错
    if (this.currentIndex < 0 || this.currentIndex >= words.length) this.currentIndex = 0;
    var w = words[this.currentIndex];
    document.getElementById('current-word').textContent = w.word;
    document.getElementById('current-phonetic').textContent = w.phonetic || '';
    document.getElementById('current-pos').textContent = w.pos || '';
    document.getElementById('current-chinese').textContent = w.chinese;
    document.getElementById('current-example').textContent = w.example || '';
    document.getElementById('current-example-cn').textContent = w.example_cn || '';
    var key = w.word + '-' + this.currentCategoryIndex;
    var p = this.wordProgress[key];
    var reviewCount = (p && p.reviewCount) ? p.reviewCount : 0;
    var isMastered = p && p.status === 'mastered';
    var stageText = '';
    if (p) {
      if (isMastered) stageText = ' | 已掌握';
      else if (p.status === 'failed') stageText = ' | 不认识';
      else if (reviewCount > 0) stageText = ' | 阶段' + reviewCount + '/8';
    }
    document.getElementById('word-progress').textContent = (this.currentIndex + 1) + '/' + words.length + stageText;
    // 复习表同步当前单词阶段：已掌握点亮最后一行，否则高亮 reviewCount 对应的第 N 次
    renderEbbinghausPlan(isMastered ? DataStore.ebbinghausIntervals.length : reviewCount);
    // 复习环显示当前阶段的记忆保持率（与复习表一致），替代原先的阶段数/8
    var retention = DataStore.ebbinghausRetention;
    var pct = isMastered ? 100 : (reviewCount > 0 ? retention[Math.min(reviewCount - 1, retention.length - 1)] : 0);
    if (isNaN(pct)) pct = 0;
    var ringFill = document.getElementById('ring-fill');
    var ringText = document.getElementById('ring-text');
    if (ringFill) ringFill.style.strokeDasharray = pct + ', 100';
    if (ringText) ringText.textContent = pct + '%';
    document.getElementById('word-front').classList.remove('hidden');
    document.getElementById('word-back').classList.add('hidden');
    // 新词展示：主动回忆的"已答对放行"状态复位，下一次翻牌重新考
    this._recallPassed = false;
    // 本地即时语音：后台预合成当前词 + 接下来几个词，点击即出声
    if (window.SpeechUtil) {
      var pf = [];
      for (var pi = this.currentIndex; pi < Math.min(this.currentIndex + 4, words.length); pi++) {
        pf.push(words[pi].word);
      }
      SpeechUtil.prefetch(pf);
    }
  };
  WordModule.prototype.flipCard = function() {
    // 主动回忆模式（先回忆再翻牌）：翻正面时先弹窗考当前单词，答对后本次翻牌直接放行
    var self = this;
    var frontHidden = document.getElementById('word-front').classList.contains('hidden');
    var recallOn = DataStore.getProgress('active_recall', false) === true;
    if (!frontHidden && recallOn && !this._recallPassed && window.app) {
      if (window.app.triggerRecall(this.getCurrentWords()[this.currentIndex])) return;
    }
    document.getElementById('word-front').classList.toggle('hidden');
    document.getElementById('word-back').classList.toggle('hidden');
  };
  WordModule.prototype.speakCurrent = function() {
    var words = this.getCurrentWords();
    if (!words.length) return;
    SpeechUtil.speakWord(words[this.currentIndex].word);
  };
  WordModule.prototype.favoriteCurrent = function() {
    var words = this.getCurrentWords();
    if (!words.length) return;
    var w = words[this.currentIndex];
    var favs = DataStore.getProgress('favorites', []);
    var exists = favs.some(function(f) { return f.word === w.word; });
    if (!exists) {
      favs.push({ word: w.word, phonetic: w.phonetic, pos: w.pos, chinese: w.chinese, example: w.example, example_cn: w.example_cn, category: this.currentCategoryIndex, source: 'manual' });
      DataStore.setProgress('favorites', favs);
      Toast.success('已收藏');
    } else {
      Toast.info('已在收藏夹中');
    }
  };
  WordModule.prototype.prevWord = function() { if (this.currentIndex > 0) { this.currentIndex--; this.showCurrentWord(); this.saveCardPos(); } };
  WordModule.prototype.nextWord = function() { var words = this.getCurrentWords(); if (this.currentIndex < words.length - 1) { this.currentIndex++; this.showCurrentWord(); this.saveCardPos(); } };
  // 按输入序号跳转：1 起，边界内合法即跳，越界 toast 提示
  WordModule.prototype.jumpWord = function() {
    var input = document.getElementById('word-jump-input');
    if (!input) return;
    var n = parseInt(input.value, 10);
    if (isNaN(n) || n < 1) { Toast.warning('请输入有效页码（≥1）'); return; }
    var words = this.getCurrentWords();
    if (!words.length) { Toast.info('当前词库无单词'); return; }
    if (n > words.length) { Toast.warning('超过总数 ' + words.length + '，已跳到末页'); n = words.length; }
    this.currentIndex = n - 1;  // 输入是 1 起，转成 0 基
    this.showCurrentWord();
    this.saveCardPos();
    input.value = '';
  };
  // ── 背单词翻页位置持久化：按词库存卡片位置 + 列表视图页码，刷新/切回继续上次的进度 ──
WordModule.prototype.saveCardPos = function() {
    // 内存缓存 map + 节流写盘：翻牌热路径不再每次读改写 localStorage
    if (!this._cardPosMap) {
      this._cardPosMap = Storage.getJSON('word_card_pos', {}) || {};
    }
    this._cardPosMap['c' + this.currentCategoryIndex] = { index: this.currentIndex, listPage: this.listPage };
    var self = this;
    if (this._cardPosTimer) clearTimeout(this._cardPosTimer);
    this._cardPosTimer = setTimeout(function() {
      self._cardPosTimer = null;
      Storage.setJSON('word_card_pos', self._cardPosMap);
    }, 500);
  };
  WordModule.prototype.loadCardPos = function(catIdx) {
    if (!this._cardPosMap) {
      this._cardPosMap = Storage.getJSON('word_card_pos', {}) || {};
    }
    var v = this._cardPosMap['c' + catIdx];
    if (v && typeof v === 'object') return { index: v.index || 0, listPage: v.listPage || 1 };
    // 兼容旧版（只存了数字的 currentIndex）
    if (typeof v === 'number') return { index: v, listPage: 1 };
    return { index: 0, listPage: 1 };
  };
  // 重置当前词库的翻页进度：清掉存储里的当前词库位置、跳回第 1 张、列表回到第 1 页
  WordModule.prototype.resetCardPos = function() {
    var map = Storage.getJSON('word_card_pos', {}) || {};
    delete map['c' + this.currentCategoryIndex];
    Storage.setJSON('word_card_pos', map);
    this.currentIndex = 0;
    this.listPage = 1;
    this.showCurrentWord();
    if (this.currentView === 'list') this.renderWordList();
    Toast.success('翻页进度已重置');
  };
  WordModule.prototype.markWord = function(action) {
    // 防重入锁：双击评价按钮/长按键盘会连评下一卡甚至末卡原地刷 reviewCount
    if (this._evalLock) return;
    this._evalLock = true;
    var self = this;
    setTimeout(function() { self._evalLock = false; }, 250);
    var words = this.getCurrentWords();
    if (!words.length) return;
    var w = words[this.currentIndex];
    var key = w.word + '-' + this.currentCategoryIndex;
    var today = this.getToday();
    // 记录旧状态用于统计缓存增量维护（避免翻牌热路径每次全量遍历当前分类）
    var oldProg = this.wordProgress[key];
    var oldMastered = !!(oldProg && oldProg.status === 'mastered');
    var oldDue = !!(oldProg && oldProg.status !== 'mastered' && oldProg.nextReview && oldProg.nextReview <= today);
    // 首次建档：记录 firstSeen（供词文串学识别"今日新学"）
    if (!oldProg) this.wordProgress[key] = { reviewCount: 0, status: 'learning', nextReview: this.getToday(), firstSeen: this.getToday() };
    var prog = this.wordProgress[key];
    var adaptive = DataStore.getProgress('adaptive_review', true) !== false;
    if (action === 'known') {
      prog.nextReview = DataStore.getNextReview(key, prog.reviewCount);
      prog.reviewCount++;
      prog.status = prog.reviewCount >= 8 ? 'mastered' : 'learning';
      if (prog.status === 'mastered') {
        var farDate = new Date();
        farDate.setDate(farDate.getDate() + 120);
        prog.nextReview = getLocalDateStr(farDate);
      }
} else if (action === 'hesitate') {
      prog.status = 'learning';
      // 与 known 一致：有点印象也照常递增（否则非自适应分支 count 永远不足 8，永不掌握）
      prog.reviewCount++;
      if (adaptive) {
        // 有点印象：按表间隔减半推进
        prog.nextReview = DataStore.getNextReview(key, prog.reviewCount, true);
      } else {
        var tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        prog.nextReview = getLocalDateStr(tomorrow);
      }
      // 累计 8 次即掌握，否则复习表永远 learning、统计对不上
      if (prog.reviewCount >= 8) {
        prog.status = 'mastered';
        var farDate = new Date();
        farDate.setDate(farDate.getDate() + 120);
        prog.nextReview = getLocalDateStr(farDate);
      }
    } else {
      prog.reviewCount = 0;
      prog.status = 'failed';
if (adaptive) {
        // 不认识：次日重来
        var nextDay = new Date();
        nextDay.setDate(nextDay.getDate() + 1);
        prog.nextReview = getLocalDateStr(nextDay);
      } else {
        // 非自适应：没学过/没掌握的词当天可再复习；但已掌握词遗忘后应次日重来，
        // 否则 nextReview=今天会导致当天无限循环复读
        if (oldMastered) {
          var nextDay = new Date();
          nextDay.setDate(nextDay.getDate() + 1);
          prog.nextReview = getLocalDateStr(nextDay);
        } else {
          prog.nextReview = this.getToday();
        }
      }
    }
prog.lastReviewed = today; // 供每日学习计划统计"今日已复习"
    this.saveProgress();
    // 增量维护统计缓存：mastered/due 只受本卡状态影响
    var cb = this._statsCache;
    if (cb && cb.catIdx === this.currentCategoryIndex && cb.valid) {
      var newMastered = prog.status === 'mastered';
      var newDue = !(prog.status === 'mastered') && prog.nextReview && prog.nextReview <= today;
      if (oldMastered !== newMastered) cb.mastered += newMastered ? 1 : -1;
      if (oldDue !== newDue) cb.due += newDue ? 1 : -1;
    } else if (cb && cb.catIdx === this.currentCategoryIndex) {
      cb.valid = false;
    }
this.renderStats();
    // 桥接游戏化系统 + 每日挑战 + 签到
    if (window.app) {
      // 首次建档（今日新学）透传 isNewWord，供每日挑战"学习新单词"任务按新词去重计数，
      // 防止仅靠复习旧词刷满"学习 N 个新单词"
      var isFirstSeenToday = !oldProg || prog.firstSeen === today;
      if (action === 'known' || action === 'hesitate') window.app.recordActivity('word', 1, isFirstSeenToday, key);
      if (action === 'known') window.app.markCheckin(1);
      else if (action === 'forgot') window.app.addMistake(w, 'word');
      // 每日学习计划卡片即时刷新
      if (window.app.dailyPlanModule) window.app.dailyPlanModule.render();
    }
    this.nextWord();
  };
  WordModule.prototype.getToday = function() { return getLocalDateStr(); };
  WordModule.prototype.currentReviewCount = function() {
    var words = this.getCurrentWords();
    if (!words.length) return 0;
    var w = words[this.currentIndex];
    var key = w.word + '-' + this.currentCategoryIndex;
    var p = this.wordProgress[key];
    return (p && p.reviewCount) ? p.reviewCount : 0;
  };
WordModule.prototype.renderStats = function() {
    var ci = this.currentCategoryIndex;
    var cache = this._statsCache;
    var today = this.getToday();
    var mastered, due, total;
    if (cache && cache.catIdx === ci && cache.valid && cache.today === today) {
      mastered = cache.mastered;
      due = cache.due;
      total = cache.total;
    } else {
      var words = this.getCurrentWords();
      var self = this;
      var m = 0, d = 0;
      for (var i = 0; i < words.length; i++) {
        var key = words[i].word + '-' + ci;
        var p = self.wordProgress[key];
        if (p && p.status === 'mastered') m++;
        else if (p && p.status !== 'mastered' && p.nextReview && p.nextReview <= today) d++;
      }
      mastered = m; due = d; total = words.length;
      this._statsCache = { catIdx: ci, mastered: m, due: d, total: words.length, today: today };
    }
    document.getElementById('ws-total').textContent = total;
    document.getElementById('ws-learning').textContent = Math.max(total - mastered, 0);
    document.getElementById('ws-mastered').textContent = mastered;
    document.getElementById('ws-due').textContent = due;
  };
  WordModule.prototype.saveProgress = function() {
    // 节流：连续翻拍的多次标记合并为一次 localStorage 写入（12 万词库下每次序列化开销大），
    // 离开页面前强制 flush
    var self = this;
    if (this._saveTimer) clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(function() {
      self._saveTimer = null;
      DataStore.setProgress('word_progress', self.wordProgress);
    }, 300);
  };
  WordModule.prototype.loadProgress = function() { this.wordProgress = DataStore.getProgress('word_progress', {}); this._statsCache = null; };
  WordModule.prototype.showAddModal = function() { document.getElementById('modal-add-word').classList.remove('hidden'); };
  WordModule.prototype.hideAddModal = function() { document.getElementById('modal-add-word').classList.add('hidden'); document.getElementById('form-add-word').reset(); };
  WordModule.prototype.addWord = function(e) {
    e.preventDefault();
    var word = document.getElementById('new-word').value.trim().toLowerCase();
    if (!word) return;
    var existingWords = this.categories[this.currentCategoryIndex].words.map(function(w) { return w.word.toLowerCase(); });
    if (existingWords.indexOf(word) !== -1) { Toast.warning('该单词已存在'); return; }
    var newW = {
      word: document.getElementById('new-word').value.trim(),
      phonetic: document.getElementById('new-phonetic').value.trim(),
      pos: document.getElementById('new-pos').value.trim(),
      chinese: document.getElementById('new-chinese').value.trim(),
      example: document.getElementById('new-example').value.trim(),
      example_cn: document.getElementById('new-example-cn').value.trim()
    };
this.categories[this.currentCategoryIndex].words.push(newW);
    // 只把「非内置词」的用户增量存为 custom_words，避免把整个（扩容后 1 万词）库塞进 localStorage
    var defWords = DataStore.getDefaultWords().categories[this.currentCategoryIndex];
    var defMap = {};
    (defWords && defWords.words || []).forEach(function(w) { if (w && w.word) defMap[String(w.word).toLowerCase()] = 1; });
    var extra = this.categories[this.currentCategoryIndex].words.filter(function(w) { return !defMap[String(w.word).toLowerCase()]; });
    DataStore.setProgress('custom_words_' + this.currentCategoryIndex, extra);
    if (window.app) {
      window.app._recallIndex = null; // 词库变更后主动回忆索引失效，下次重建
      if (window.app.readingModule) window.app.readingModule._wordIndex = null; // 阅读查词索引同理
      if (window.app.contextModule) window.app.contextModule._poolInvalid = true; // 例句池同理
    }
    this.populateCategories();
    document.getElementById('word-category').value = this.currentCategoryIndex;
    this.currentIndex = this.categories[this.currentCategoryIndex].words.length - 1;
    this.renderStats();
    this.showCurrentWord();
    this.hideAddModal();
    Toast.success('单词已添加');
  };
  // 离开页面/切走时强制 flush 节流中的 word_progress，避免最后 300ms 的翻卡进度丢失
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', function() {
      if (window.app && window.app.wordModule && window.app.wordModule._saveTimer && !window.__resettingData) {
        var wm = window.app.wordModule;
        clearTimeout(wm._saveTimer);
        wm._saveTimer = null;
        try { DataStore.setProgress('word_progress', wm.wordProgress); } catch(e) {}
      }
      if (window.app && window.app.wordModule && window.app.wordModule._cardPosTimer) {
        var wm2 = window.app.wordModule;
        clearTimeout(wm2._cardPosTimer);
        wm2._cardPosTimer = null;
        if (wm2._cardPosMap) { try { Storage.setJSON('word_card_pos', wm2._cardPosMap); } catch(e) {} }
      }
    });
    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'hidden' && window.app && window.app.wordModule && window.app.wordModule._saveTimer && !window.__resettingData) {
        var wm = window.app.wordModule;
        clearTimeout(wm._saveTimer);
        wm._saveTimer = null;
        try { DataStore.setProgress('word_progress', wm.wordProgress); } catch(e) {}
      }
    });
  }
  return WordModule;
})();
// ==================== 语法练习模块 ====================
var GrammarModule = (function() {
  function GrammarModule() {
    this.exercises = [];
    this.currentIndex = 0;
    this.correct = 0;
    this.wrong = 0;
    this.initUI();
  }
  GrammarModule.prototype.initUI = function() {
    var self = this;
    safeBind('btn-start-grammar', 'click', function() { self.start(); });
    safeBind('btn-next-grammar', 'click', function() { self.next(); });
    safeBind('btn-submit-answer', 'click', function() { self.submitFill(); });
    safeBind('btn-submit-transform', 'click', function() { self.submitTransform(); });
    safeBind('btn-submit-choice', 'click', function() { self.submitChoice(); });
  };
  GrammarModule.prototype.start = function() {
    var type = document.getElementById('grammar-type').value;
    var difficulty = document.getElementById('grammar-difficulty').value;
    var all = DataStore.getDefaultGrammar();
    var list = all && Array.isArray(all) ? all : (all && all.grammar_exercises ? all.grammar_exercises : []);
    this.exercises = list.filter(function(ex) {
      if (type !== 'all' && ex.type !== type) return false;
      if (difficulty !== 'all' && ex.difficulty !== difficulty) return false;
      return true;
    });
    this.exercises.sort(function() { return Math.random() - 0.5; });
    if (this.exercises.length > 20) this.exercises = this.exercises.slice(0, 20);
    this.currentIndex = 0;
    this.correct = 0;
    this.wrong = 0;
    this.selectedChoice = -1;
    document.getElementById('grammar-score').classList.add('hidden');
    this.showQuestion();
  };
  GrammarModule.prototype.showQuestion = function() {
    if (this.currentIndex >= this.exercises.length) { this.showScore(); return; }
    var ex = this.exercises[this.currentIndex];
    document.getElementById('grammar-progress-text').textContent = '第 ' + (this.currentIndex + 1) + '/' + this.exercises.length + ' 题';
    document.getElementById('grammar-progress-fill').style.width = ((this.currentIndex + 1) / this.exercises.length * 100) + '%';
    document.getElementById('gq-text').textContent = ex.question;
    document.getElementById('gq-options').innerHTML = '';
    document.getElementById('gq-input').style.display = 'none';
    document.getElementById('gq-transform').style.display = 'none';
    document.getElementById('gq-explanation').classList.add('hidden');
    document.getElementById('btn-next-grammar').style.display = 'none';
    document.getElementById('btn-submit-choice').style.display = 'none';
    this.selectedChoice = -1;
    this.answered = false;
    var self = this;
    if (ex.type === 'choice' && ex.options) {
      ex.options.forEach(function(opt, i) {
        var btn = document.createElement('button');
        btn.className = 'btn btn-sm';
        btn.textContent = opt;
        btn.addEventListener('click', function() { self.selectChoice(i); });
        document.getElementById('gq-options').appendChild(btn);
      });
    } else if (ex.type === 'fill_blank') {
      document.getElementById('gq-input').style.display = 'block';
      document.getElementById('gq-answer').value = '';
    } else if (ex.type === 'sentence_transform') {
      document.getElementById('gq-transform').style.display = 'block';
      document.getElementById('gq-transform-answer').value = '';
      document.getElementById('gq-transform-result').classList.add('hidden');
    }
  };
  GrammarModule.prototype.selectChoice = function(selected) {
    var buttons = document.querySelectorAll('#gq-options .btn');
    buttons.forEach(function(b) { b.classList.remove('btn-selected'); });
    if (buttons[selected]) buttons[selected].classList.add('btn-selected');
    this.selectedChoice = selected;
    document.getElementById('btn-submit-choice').style.display = 'inline-block';
  };
  GrammarModule.prototype.submitChoice = function() {
    if (this.answered) return;
    if (this.selectedChoice < 0) { Toast.warning('请先选择一个答案'); return; }
    this.answered = true;
    var buttons = document.querySelectorAll('#gq-options .btn');
    buttons.forEach(function(b) { b.disabled = true; });
    var ex = this.exercises[this.currentIndex];
    var selected = this.selectedChoice;
    if (selected === ex.answer) {
      if (buttons[selected]) buttons[selected].classList.add('btn-correct');
      this.correct++;
      if (window.app) { window.app.recordActivity('grammar', 1); window.app.markCheckin(1); if (window.app.badgeSystem) window.app.badgeSystem.onEvent('grammar'); }
    } else {
      if (buttons[selected]) buttons[selected].classList.add('btn-wrong');
      if (buttons[ex.answer]) buttons[ex.answer].classList.add('btn-correct');
      this.wrong++;
      // 语法题没有 word 字段，构造错题：word=答案（填空式判定），chinese=题干作为提示
      if (ex && window.app) { window.app.addMistake({ word: ex.correct_answer || ex.question, chinese: ex.question, example: ex.explanation || '' }, 'grammar'); window.app.markCheckin(1); }
    }
    document.getElementById('btn-submit-choice').style.display = 'none';
    this.showExplanation();
  };
  GrammarModule.prototype.submitFill = function() {
    if (this.answered) return;
    this.answered = true;
    var ex = this.exercises[this.currentIndex];
    var userAns = document.getElementById('gq-answer').value.trim().toLowerCase();
    if (userAns === ex.correct_answer.toLowerCase()) { this.correct++; Toast.success('正确！'); if (window.app) { window.app.recordActivity('grammar', 1); window.app.markCheckin(1); if (window.app.badgeSystem) window.app.badgeSystem.onEvent('grammar'); } }
    else {
      this.wrong++;
      Toast.error('错误！正确答案：' + ex.correct_answer);
      if (window.app) { window.app.addMistake({ word: ex.correct_answer || ex.question, chinese: ex.question, example: ex.explanation || '' }, 'grammar'); window.app.markCheckin(1); }
    }
    this.showExplanation();
  };
  GrammarModule.prototype.submitTransform = function() {
    if (this.answered) return;
    this.answered = true;
    var ex = this.exercises[this.currentIndex];
    var userAns = document.getElementById('gq-transform-answer').value.trim();
    var resultEl = document.getElementById('gq-transform-result');
    resultEl.classList.remove('hidden');
    if (userAns.toLowerCase() === ex.correct_answer.toLowerCase()) {
      resultEl.innerHTML = '<span style="color:var(--success)">✓ 正确！</span>';
      this.correct++;
      if (window.app) { window.app.recordActivity('grammar', 1); window.app.markCheckin(1); if (window.app.badgeSystem) window.app.badgeSystem.onEvent('grammar'); }
    } else {
      resultEl.innerHTML = '<span style="color:var(--danger)">✗ 正确答案：' + escapeHtml(ex.correct_answer) + '</span>';
      this.wrong++;
      if (window.app) { window.app.addMistake({ word: ex.correct_answer || ex.question, chinese: ex.question, example: ex.explanation || '' }, 'grammar'); window.app.markCheckin(1); }
    }
    this.showExplanation();
    document.getElementById('btn-next-grammar').style.display = 'inline-block';
  };
  GrammarModule.prototype.showExplanation = function() {
    var ex = this.exercises[this.currentIndex];
    document.getElementById('gq-explanation').classList.remove('hidden');
    document.getElementById('gq-exp-text').textContent = ex.explanation || '';
    var correctText = ex.correct_answer;
    if (!correctText && ex.type === 'choice' && ex.options && ex.options[ex.answer] !== undefined) {
      correctText = ex.options[ex.answer];
    }
    if (correctText === undefined) correctText = ex.answer;
    document.getElementById('gq-correct').textContent = '正确答案：' + correctText;
    document.getElementById('btn-next-grammar').style.display = 'inline-block';
  };
  GrammarModule.prototype.next = function() {
    // 防连点：双击跳两题
    if (this._nextLock) return;
    this._nextLock = true;
    var self = this;
    setTimeout(function() { self._nextLock = false; }, 250);
    this.currentIndex++;
    this.showQuestion();
  };
  GrammarModule.prototype.showScore = function() {
    document.getElementById('grammar-score').classList.remove('hidden');
    var total = this.correct + this.wrong;
    document.getElementById('final-score').textContent = total > 0 ? Math.round(this.correct / total * 100) : 0;
    document.getElementById('correct-count').textContent = this.correct;
    document.getElementById('wrong-count').textContent = this.wrong;
    if (window.app) window.app.recordActivity('grammar');
  };
  return GrammarModule;
})();

// ==================== 阅读训练模块 ====================
var ReadingModule = (function() {
  function ReadingModule() {
    this.articles = [];
    this.currentArticle = null;
    this.initUI();
  }
  ReadingModule.prototype.initUI = function() {
    var self = this;
    var select = document.getElementById('reading-select');
    var all = DataStore.getDefaultReading();
    this.articles = all;
    this.filtered = all;  // 难度过滤后的子集，渲染下拉和答题都基于它
    // 渲染文章下拉：默认全部，受难度筛选控制
    function renderOptions(list) {
      select.innerHTML = '<option value="">选择文章...</option>';
      list.forEach(function(a, i) {
        var opt = document.createElement('option');
        opt.value = i;
        opt.textContent = a.title;
        select.appendChild(opt);
      });
    }
    renderOptions(this.filtered);
    select.addEventListener('change', function() {
      if (this.value !== '') self.loadArticle(parseInt(this.value));
    });
    // 难度筛选下拉：按 article.difficulty 过滤，重新填文章下拉
    var diffSel = document.getElementById('reading-difficulty');
    if (diffSel) {
      diffSel.addEventListener('change', function() {
        var d = diffSel.value;
        self.filtered = (d === 'all' || !d) ? self.articles : self.articles.filter(function(a) { return a.difficulty === d; });
        renderOptions(self.filtered);
        // 切难度后清空阅读区
        document.getElementById('r-title').textContent = '选择一篇文章开始阅读';
        document.getElementById('r-text').innerHTML = '';
        document.getElementById('r-vocab').classList.add('hidden');
        document.getElementById('r-questions').classList.add('hidden');
      });
    }
    safeBind('show-cn', 'change', function() {
      document.querySelectorAll('.r-cn').forEach(function(el) { el.style.display = document.getElementById('show-cn').checked ? 'block' : 'none'; });
    });
    safeBind('show-vocab', 'change', function() {
      document.getElementById('r-vocab').classList.toggle('hidden', !document.getElementById('show-vocab').checked);
    });
    safeBind('show-answer', 'change', function() {
      if (document.getElementById('show-answer').checked) self.revealAnswers();
      else self.hideAnswers();
    });
    // 鼠标按下滑动选中文章文字 → 浮窗翻译
    var area = document.getElementById('reading-area');
    if (area) {
      area.addEventListener('mouseup', function(e) {
        self._handleSelection(e.clientX, e.clientY);
      });
      area.addEventListener('touchend', function(e) {
        var t = e.changedTouches && e.changedTouches[0];
        if (t) self._handleSelection(t.clientX, t.clientY);
      }, { passive: true });
    }
    // 点击别处（含开始新选区）隐藏浮窗
    document.addEventListener('mousedown', function(e) {
      var pop = document.getElementById('r-trans-popup');
      if (pop && !pop.classList.contains('hidden') && !pop.contains(e.target)) self._hidePopup();
    });
    // 滚动/缩放时收起浮窗，避免错位
    document.addEventListener('scroll', function() { self._hidePopup(); }, true);
    window.addEventListener('resize', function() { self._hidePopup(); });
  };
  // 加载全词库索引（词/短语 -> 词条），懒加载
  ReadingModule.prototype._ensureIndex = function() {
    if (this._wordIndex) return this._wordIndex;
    var index = {};
    var cats = DataStore.getDefaultWords().categories || [];
    cats.forEach(function(cat) {
      (cat.words || []).forEach(function(w) {
        var key = String(w.word || '').toLowerCase();
        if (key && !index[key]) index[key] = w;
      });
    });
    this._wordIndex = index;
    return index;
  };
  // 选区文本查词：整句 → 逐词缩短前缀 → 末词兜底（词库含 give up 等短语词条）
  ReadingModule.prototype._lookup = function(text) {
    var index = this._ensureIndex();
    var t = String(text || '').toLowerCase()
      .replace(/[^a-z0-9'\-\s]/g, ' ')
      .replace(/\s+/g, ' ').trim();
    if (!t) return null;
    var words = t.split(' ');
    if (words.length === 1) return index[t] ? { entry: index[t], matched: t } : null;
    for (var end = words.length; end >= 2; end--) {
      var key = words.slice(0, end).join(' ');
      if (index[key]) return { entry: index[key], matched: key };
    }
    var last = words[words.length - 1];
    if (index[last]) return { entry: index[last], matched: last };
    return null;
  };
  // 处理选区：纯英文才查词，结果显示在鼠标旁浮窗
  ReadingModule.prototype._handleSelection = function(x, y) {
    var sel = window.getSelection();
    if (!sel || sel.isCollapsed) { this._hidePopup(); return; }
    var text = String(sel.toString() || '').trim();
    if (!text || !/[a-zA-Z]/.test(text)) { this._hidePopup(); return; }
    var hit = this._lookup(text);
    var entry = hit ? hit.entry : null;
    var matched = hit ? hit.matched : '';
    var html;
    if (entry) {
      html = '<div class="rtp-head"><span class="rtp-word">' + escapeHtml(entry.word) + '</span>'
        + '<span class="rtp-phon">' + escapeHtml(entry.phonetic || '') + '</span>'
        + '<span class="rtp-pos">' + escapeHtml(entry.pos || '') + '</span></div>'
        + '<div class="rtp-cn">' + escapeHtml(entry.chinese || '') + '</div>'
        + (entry.example ? '<div class="rtp-ex"><i>' + escapeHtml(entry.example) + '</i>' + (entry.example_cn ? '<br><span>' + escapeHtml(entry.example_cn) + '</span>' : '') + '</div>' : '')
        + '<div class="rtp-actions">'
        + '<button type="button" class="btn btn-sm" data-speak="' + escapeHtml(entry.word) + '">朗读</button>'
        + '<button type="button" class="btn btn-sm" data-goto="search" data-prefill="' + escapeHtml(entry.word) + '">查单词页</button>'
        + '</div>';
      var normalized = text.toLowerCase().replace(/\s+/g, ' ').trim();
      if (matched !== normalized) {
        html = '<div class="rtp-partial">匹配到「' + escapeHtml(matched) + '」</div>' + html;
      }
    } else {
      html = '<div class="rtp-cn">词库中未收录「' + escapeHtml(text) + '」</div>'
        + '<div class="rtp-actions">'
        + '<button type="button" class="btn btn-sm" data-goto="search" data-prefill="' + escapeHtml(text) + '">在查单词页搜索</button>'
        + '</div>';
    }
    this._showPopup(html, x, y);
  };
  // 显示/定位浮窗（视口内夹紧），点击浮窗内按钮后自动收起
  ReadingModule.prototype._showPopup = function(html, x, y) {
    var pop = document.getElementById('r-trans-popup');
    if (!pop) {
      pop = document.createElement('div');
pop.id = 'r-trans-popup';
      pop.className = 'r-trans-popup hidden';
      pop.addEventListener('click', function() { this.classList.add('hidden'); });
      document.body.appendChild(pop);
    }
    pop.innerHTML = html;
    pop.classList.remove('hidden');
    var pad = 14;
    var left = x + pad;
    var top = y + pad;
    var rw = pop.offsetWidth;
    var rh = pop.offsetHeight;
    if (left + rw > window.innerWidth - 8) left = x - rw - pad;
    if (left < 8) left = 8;
    if (top + rh > window.innerHeight - 8) top = y - rh - pad;
    if (top < 8) top = 8;
pop.style.left = left + 'px';
    pop.style.top = top + 'px';
  };
  ReadingModule.prototype._hidePopup = function() {
    var pop = document.getElementById('r-trans-popup');
    if (pop) pop.classList.add('hidden');
  };
  ReadingModule.prototype.loadArticle = function(idx) {
    this._hidePopup();
    this.currentArticle = this.filtered[idx];
    var a = this.currentArticle;
    if (!a) return;
    document.getElementById('r-title').textContent = a.title;
    var html = '';
    // 段落优先用 a.paragraphs（含 {en,cn} 的对象数组），否则用 a.text 按 \n\n 切段，
    // 中文用平行的 paragraphs_cn 数组（数据文件的实际格式）；index 对不齐则跳过翻译不报错
    var paragraphs = a.paragraphs || (a.text ? a.text.split('\n\n') : []);
    var cnArr = a.paragraphs_cn || [];
    var showCnChecked = document.getElementById('show-cn') && document.getElementById('show-cn').checked;
    paragraphs.forEach(function(p, i) {
      var en = typeof p === 'string' ? p : (p.en || '');
      var cn = '';
      if (typeof p === 'object' && p.cn) cn = p.cn;            // paragraphs 对象数组带 cn
      else if (cnArr[i]) cn = cnArr[i];                        // paragraphs_cn 平行数组
      html += '<p>' + escapeHtml(en) + '</p>';
      // 中文翻译：跟随当前 show-cn 勾选状态显隐，而不是永远 display:none，否则勾了译文也看不见
      if (cn) html += '<p class="r-cn" style="color:var(--text-secondary)' + (showCnChecked ? '' : ';display:none') + '">' + escapeHtml(cn) + '</p>';
    });
    document.getElementById('r-text').innerHTML = html;
    if (a.vocabulary_notes && a.vocabulary_notes.length > 0) {
      var vocabHtml = '<h4>重点词汇</h4><ul>';
      a.vocabulary_notes.forEach(function(v) { vocabHtml += '<li><strong>' + escapeHtml(v.word) + '</strong> ' + escapeHtml(v.chinese) + '</li>'; });
      vocabHtml += '</ul>';
      document.getElementById('r-vocab').innerHTML = vocabHtml;
      // 跟随当前 show-vocab 勾选状态，换文章后重点词汇也能延续显示
      var showVocabChecked = document.getElementById('show-vocab') && document.getElementById('show-vocab').checked;
      document.getElementById('r-vocab').classList.toggle('hidden', !showVocabChecked);
    }
    if (a.questions && a.questions.length > 0) {
      var qHtml = '<h4>阅读理解</h4>';
      a.questions.forEach(function(q, i) {
        qHtml += '<div class="reading-q" data-q="' + i + '"><p>' + (i + 1) + '. ' + escapeHtml(q.question) + '</p>';
        q.options.forEach(function(opt, j) {
          // 给每题正确答案那个按钮加 data-correct="1"，方便"显示答案"按钮揭晓时定位
          qHtml += '<button class="btn btn-sm" data-correct="' + (j === q.answer ? 1 : 0) + '" onclick="window.app.readingModule.checkAnswer(' + i + ',' + j + ',this)">' + escapeHtml(opt) + '</button> ';
        });
        qHtml += '</div>';
      });
      document.getElementById('r-questions').innerHTML = qHtml;
      document.getElementById('r-questions').classList.remove('hidden');
      // 题区刚渲染：先确保没有任何 btn-correct 高亮残留（防止上次"显示答案"状态串到新题）
      // 注意：show-answer checkbox 不主动延续，撇过用户想再开启时勾一下即可，避免默认揭晓
      var showAnsChk = document.getElementById('show-answer');
      if (showAnsChk) showAnsChk.checked = false;
    } else {
      document.getElementById('r-questions').classList.add('hidden');
    }
  };
  // 显示答案：把每题的正确选项高亮成 btn-correct，并给所有未作答按钮加 btn-revealed 标记（区别于答题判分的 disabled）
  ReadingModule.prototype.revealAnswers = function() {
    var container = document.getElementById('r-questions');
    if (!container || !this.currentArticle) return;
    container.querySelectorAll('.reading-q').forEach(function(qBox) {
      qBox.querySelectorAll('.btn').forEach(function(b) {
        if (b.dataset.correct === '1') b.classList.add('btn-correct');
        // 用户自己答过的题：disabled 且有 btn-wrong 或 btn-correct（答题判分），不动
        var answeredByUser = b.classList.contains('btn-wrong') || b.dataset.userAnswered === '1';
        if (!answeredByUser && !b.disabled) {
          b.disabled = true;
          b.classList.add('btn-revealed');  // 用独立标记表示"是 reveal 模式锁的，不是答题锁的"
        }
      });
    });
  };
  // 隐藏答案：只清"reveal 模式"加的高亮和禁用（btn-revealed 标记的）；用户自己答过的题保留判分状态
  ReadingModule.prototype.hideAnswers = function() {
    var container = document.getElementById('r-questions');
    if (!container || !this.currentArticle) return;
    container.querySelectorAll('.reading-q').forEach(function(qBox) {
      var btns = qBox.querySelectorAll('.btn');
      var hasUserAnswer = Array.prototype.some.call(btns, function(b) {
        return b.classList.contains('btn-wrong') || b.dataset.userAnswered === '1';
      });
      if (!hasUserAnswer) {
        // 这题是纯 reveal 模式揭晓的：清掉揭晓高亮和禁用
        btns.forEach(function(b) {
          if (b.dataset.correct === '1') b.classList.remove('btn-correct');
          if (b.classList.contains('btn-revealed')) {
            b.classList.remove('btn-revealed');
            b.disabled = false;
          }
        });
      }
    });
  };
  ReadingModule.prototype.checkAnswer = function(qIdx, selected, btn) {
    var q = this.currentArticle.questions[qIdx];
    if (!q) return;
    var buttons = btn.parentElement.querySelectorAll('.btn');
    buttons.forEach(function(b) { b.disabled = true; b.dataset.userAnswered = '1'; });  // 标记"用户答过"，reveal/hide 不动这题
    if (selected === q.answer) {
      btn.classList.add('btn-correct');
      Toast.success('正确！');
      if (window.app) { window.app.recordActivity('reading'); window.app.markCheckin(1); }
    } else {
      btn.classList.add('btn-wrong');
      // 防御：q.answer 越界时不取高亮，避免 buttons[q.answer] 抛错；正常超出按用户点的那条错误高亮
      if (buttons[q.answer]) buttons[q.answer].classList.add('btn-correct');
      Toast.error('错误！');
      // 答错入错题本（之前阅读题答错从没进错题本）：用题干当 word、正确选项当中文、原文 explanation 当例句
      if (window.app) {
        var correctOpt = q.options && q.options[q.answer] ? q.options[q.answer] : '';
        window.app.addMistake({ word: correctOpt || q.question, chinese: q.question, example: q.explanation || '' }, 'reading');
        window.app.markCheckin(1);
      }
    }
  };
  return ReadingModule;
})();

// ==================== 听力训练模块 ====================
var ListeningModule = (function() {
  function ListeningModule() {
    this.words = [];
    this.currentIndex = 0;
    this.correct = 0;
    this.wrong = 0;
    this.mode = 'word';
    this.initUI();
  }
  ListeningModule.prototype.initUI = function() {
    var self = this;
    var catSelect = document.getElementById('listening-category');
    var cats = DataStore.getDefaultWords().categories;
    catSelect.innerHTML = '';
    orderCategoriesForDisplay(cats).forEach(function(i) {
      var opt = document.createElement('option');
      opt.value = i;
      opt.textContent = cats[i].name;
      catSelect.appendChild(opt);
    });
    safeBind('btn-start-listening', 'click', function() { self.start(); });
    safeBind('btn-listen', 'click', function() { self.playAudio(); });
    safeBind('btn-listening-submit', 'click', function() { self.submit(); });
    safeBind('btn-listening-next', 'click', function() { self.next(); });
    safeBind('btn-listening-retry', 'click', function() { self.start(); });
  };
  ListeningModule.prototype.start = function() {
this.mode = document.getElementById('listening-mode').value;
    var catIdx = safeNumber(document.getElementById('listening-category').value, 0);
    var cats = DataStore.getDefaultWords().categories;
    if (catIdx >= cats.length || !cats[catIdx] || !cats[catIdx].words) { Toast.warning('词库尚未加载，请稍后再试'); return; }
    this.words = shuffleSample(cats[catIdx].words, 20);
    this.currentIndex = 0;
    this.correct = 0;
    this.wrong = 0;
    document.getElementById('listening-score').classList.add('hidden');
    this.showQuestion();
  };
  ListeningModule.prototype.showQuestion = function() {
    if (this.currentIndex >= this.words.length) { this.showScore(); return; }
    var w = this.words[this.currentIndex];
    document.getElementById('listening-progress-text').textContent = '第 ' + (this.currentIndex + 1) + '/' + this.words.length + ' 题';
    document.getElementById('listening-progress-fill').style.width = ((this.currentIndex + 1) / this.words.length * 100) + '%';
    if (this.mode === 'sentence' && w.example) {
      var safeWord = String(w.word || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      var hint = w.example.replace(new RegExp('\\b' + safeWord + '\\b', 'gi'), '______');
      document.getElementById('listening-hint').textContent = hint;
    } else {
      document.getElementById('listening-hint').textContent = '';
    }
document.getElementById('listening-answer').value = '';
    document.getElementById('listening-result').classList.add('hidden');
    document.getElementById('listening-actions').style.display = 'none';
    this.answered = false; // 答完一题锁定，防重复提交重复计分
    var submitBtn = document.getElementById('btn-listening-submit');
    if (submitBtn) submitBtn.disabled = false;
    this.playAudio();
  };
  ListeningModule.prototype.playAudio = function() {
    if (this.words.length === 0) return;
    var w = this.words[this.currentIndex];
    SpeechUtil.speakWord(this.mode === 'sentence' && w.example ? w.example : w.word);
  };
ListeningModule.prototype.submit = function() {
    if (this.answered) return; // 作答锁：防连点/回车重复提交重复计分
    this.answered = true;
    var w = this.words[this.currentIndex];
    var userAns = document.getElementById('listening-answer').value.trim().toLowerCase();
    var resultEl = document.getElementById('listening-result');
    resultEl.classList.remove('hidden');
    var submitBtn = document.getElementById('btn-listening-submit');
    if (submitBtn) submitBtn.disabled = true;
    if (userAns === w.word.toLowerCase()) {
      resultEl.innerHTML = '<span style="color:var(--success)">✓ 正确！</span>';
      this.correct++;
      if (window.app) { window.app.recordActivity('listening', 1); window.app.markCheckin(1); }
    } else {
      resultEl.innerHTML = '<span style="color:var(--danger)">✗ 正确答案：' + escapeHtml(w.word) + '</span>';
      this.wrong++;
      if (window.app) { window.app.addMistake(w, 'listening'); window.app.markCheckin(1); }
    }
    document.getElementById('listening-actions').style.display = 'block';
  };
  ListeningModule.prototype.next = function() {
    // 防连点：双击跳两题
    if (this._nextLock) return;
    this._nextLock = true;
    var self = this;
    setTimeout(function() { self._nextLock = false; }, 250);
    this.currentIndex++;
    this.showQuestion();
  };
  ListeningModule.prototype.showScore = function() {
    document.getElementById('listening-score').classList.remove('hidden');
    var total = this.correct + this.wrong;
    document.getElementById('listening-score-num').textContent = total > 0 ? Math.round(this.correct / total * 100) + '%' : '0%';
    document.getElementById('listening-correct-count').textContent = this.correct;
    document.getElementById('listening-wrong-count').textContent = this.wrong;
    if (window.app) window.app.recordActivity('listening');
  };
  return ListeningModule;
})();
// ==================== 拼写测试模块 ====================
var SpellingModule = (function() {
  function SpellingModule() {
    this.words = [];
    this.currentIndex = 0;
    this.correct = 0;
    this.wrong = 0;
    this.mode = 'cn2en';
    this.initUI();
  }
  SpellingModule.prototype.initUI = function() {
    var self = this;
    var catSelect = document.getElementById('spelling-category');
    var cats = DataStore.getDefaultWords().categories;
    catSelect.innerHTML = '';
    orderCategoriesForDisplay(cats).forEach(function(i) {
      var opt = document.createElement('option');
      opt.value = i;
      opt.textContent = cats[i].name;
      catSelect.appendChild(opt);
    });
    safeBind('btn-start-spelling', 'click', function() { self.start(); });
    safeBind('btn-spelling-submit', 'click', function() { self.submit(); });
    safeBind('btn-spelling-next', 'click', function() { self.next(); });
    safeBind('btn-spelling-retry', 'click', function() { self.start(); });
    safeBind('spelling-answer', 'keypress', function(e) { if (e.key === 'Enter') self.submit(); });
  };
  SpellingModule.prototype.start = function() {
    this.mode = document.getElementById('spelling-mode').value;
    var catIdx = safeNumber(document.getElementById('spelling-category').value, 0);
    var cats = DataStore.getDefaultWords().categories;
    if (!cats || !cats.length || catIdx >= cats.length || !cats[catIdx] || !cats[catIdx].words) { Toast.warning('词库尚未加载，请稍后再试'); return; }
    this.words = cats[catIdx].words.slice().sort(function() { return Math.random() - 0.5; });
    if (this.words.length > 20) this.words = this.words.slice(0, 20);
    this.currentIndex = 0;
    this.correct = 0;
    this.wrong = 0;
    document.getElementById('spelling-score').classList.add('hidden');
    this.showQuestion();
  };
  SpellingModule.prototype.showQuestion = function() {
    if (this.currentIndex >= this.words.length) { this.showScore(); return; }
    var w = this.words[this.currentIndex];
    var self = this;
    document.getElementById('spelling-progress-text').textContent = '第 ' + (this.currentIndex + 1) + '/' + this.words.length + ' 题';
    document.getElementById('spelling-progress-fill').style.width = ((this.currentIndex + 1) / this.words.length * 100) + '%';
    if (this.mode === 'cn2en') {
      document.getElementById('spelling-prompt').textContent = w.chinese;
      document.getElementById('spelling-input-area').style.display = 'block';
      document.getElementById('spelling-options').style.display = 'none';
      document.getElementById('spelling-answer').value = '';
    } else if (this.mode === 'listen2en') {
      document.getElementById('spelling-prompt').textContent = '听发音写单词';
      document.getElementById('spelling-input-area').style.display = 'block';
      document.getElementById('spelling-options').style.display = 'none';
      document.getElementById('spelling-answer').value = '';
      SpeechUtil.speakWord(w.word);
    } else {
      document.getElementById('spelling-prompt').textContent = w.word;
      document.getElementById('spelling-input-area').style.display = 'none';
      document.getElementById('spelling-options').style.display = 'block';
      var options = [w.chinese];
      var allWords = this.words;
      // 防御：词库只有 2-3 个不同释义时 while 会死循环，加尝试次数上限
      var attempts = 0;
      while (options.length < 4 && attempts < 200 && options.length < allWords.length) {
        attempts++;
        var rand = allWords[Math.floor(Math.random() * allWords.length)].chinese;
        if (options.indexOf(rand) === -1) options.push(rand);
      }
      options.sort(function() { return Math.random() - 0.5; });
      var self = this;
      document.getElementById('spelling-options').innerHTML = '';
      options.forEach(function(opt) {
        var btn = document.createElement('button');
        btn.className = 'btn btn-sm';
        btn.textContent = opt;
        btn.addEventListener('click', function() { self.checkOption(btn, opt, w.chinese); });
        document.getElementById('spelling-options').appendChild(btn);
      });
    }
    document.getElementById('spelling-result').classList.add('hidden');
    document.getElementById('spelling-actions').style.display = 'none';
    this.answered = false;
    if (window.app && window.app.itemSystem) {
      window.app.itemSystem.renderToolbar('spelling-tools',
        (this.mode === 'en2cn' ? [{ id: 'lucky' }] : [{ id: 'hint' }]).concat([{ id: 'skip' }]),
        {
          hint: function() {
            var cw = self.words[self.currentIndex];
            if (!cw) return;
            var input = document.getElementById('spelling-answer');
            input.value = input.value || cw.word[0];
            Toast.info('提示：共 ' + cw.word.length + ' 个字母，首字母是 ' + cw.word[0]);
            input.focus();
          },
          skip: function() {
            self.next();
            if (window.app && window.app.gamification) {
              window.app.gamification.addPoints(5);
              Toast.success('跳过卡生效：跳过本题，+5 积分');
            } else {
              Toast.success('跳过卡生效：跳过本题');
            }
          },
          lucky: function() {
            var correct = self.words[self.currentIndex].chinese;
            var wrong = [];
            document.querySelectorAll('#spelling-options .btn').forEach(function(b) {
              if (b.textContent !== correct && wrong.length < 2) {
                wrong.push(b);
                b.disabled = true;
                b.classList.add('btn-disabled');
              }
            });
            Toast.success('幸运卡生效：已排除两个错误选项');
          }
        });
    }
  };
  SpellingModule.prototype.submit = function() {
    if (this.answered) return;
    this.answered = true;
    var w = this.words[this.currentIndex];
    var userAns = document.getElementById('spelling-answer').value.trim().toLowerCase();
    var resultEl = document.getElementById('spelling-result');
    resultEl.classList.remove('hidden');
    if (userAns === w.word.toLowerCase()) {
      resultEl.innerHTML = '<span style="color:var(--success)">✓ 正确！</span>';
      this.correct++;
      if (window.app) { window.app.recordActivity('spelling', 1); window.app.markCheckin(1); }
    } else {
      resultEl.innerHTML = '<span style="color:var(--danger)">✗ 正确答案：' + escapeHtml(w.word) + '</span>';
      this.wrong++;
      if (window.app) { window.app.addMistake(w, 'spelling'); window.app.markCheckin(1); }
    }
    document.getElementById('spelling-actions').style.display = 'block';
    document.getElementById('spelling-tools').style.display = 'none';
  };
  SpellingModule.prototype.checkOption = function(btn, selected, correct) {    if (this.answered) return;
    this.answered = true;
    var buttons = document.querySelectorAll('#spelling-options .btn');
    buttons.forEach(function(b) { b.disabled = true; });
    var resultEl = document.getElementById('spelling-result');
    resultEl.classList.remove('hidden');
    var w = this.words[this.currentIndex];
    if (selected === correct) {
      btn.classList.add('btn-correct');
      resultEl.innerHTML = '<span style="color:var(--success)">✓ 正确！</span>';
      this.correct++;
      if (window.app) { window.app.recordActivity('spelling', 1); window.app.markCheckin(1); }
    } else {
      btn.classList.add('btn-wrong');
      resultEl.innerHTML = '<span style="color:var(--danger)">✗ 正确答案：' + escapeHtml(correct) + '</span>';
      this.wrong++;
      if (w && window.app) { window.app.addMistake(w, 'spelling'); window.app.markCheckin(1); }
    }
    document.getElementById('spelling-actions').style.display = 'block';
    document.getElementById('spelling-tools').style.display = 'none';
  };
  SpellingModule.prototype.next = function() {
    // 防连点：双击跳两题
    if (this._nextLock) return;
    this._nextLock = true;
    var self = this;
    setTimeout(function() { self._nextLock = false; }, 250);
    this.currentIndex++;
    this.showQuestion();
  };  SpellingModule.prototype.showScore = function() {
    document.getElementById('spelling-score').classList.remove('hidden');
    var total = this.correct + this.wrong;
    document.getElementById('spelling-score-num').textContent = total > 0 ? Math.round(this.correct / total * 100) + '%' : '0%';
    document.getElementById('spelling-correct-count').textContent = this.correct;
    document.getElementById('spelling-wrong-count').textContent = this.wrong;
    if (window.app) window.app.recordActivity('spelling');
  };
  return SpellingModule;
})();

// ==================== 查单词模块 ====================
var SearchModule = (function() {
function SearchModule() {
    this.allWords = [];
    this._loaded = false;
    this.initUI();
  }
  SearchModule.prototype.initUI = function() {
    var self = this;
    // 懒加载：不阻塞启动（12 万词索引构建耗时），首次搜索时才全量构建
    safeBind('btn-search', 'click', function() { self.doSearch(); });
    safeBind('search-input', 'keypress', function(e) { if (e.key === 'Enter') self.doSearch(); });
  };
  SearchModule.prototype.ensureLoaded = function() {
    if (this._loaded) return;
    this._loaded = true;
    this.loadAllWords();
  };
  SearchModule.prototype.loadAllWords = function() {
    var cats = DataStore.getDefaultWords().categories;
    var seen = {};
    var self = this;
    cats.forEach(function(cat) {
      if (!cat || !cat.words) return; // 防单分类数据损坏导致搜索模块整体失效
      cat.words.forEach(function(w) {
        if (!w || !w.word) return;
        var key = w.word.toLowerCase();
        if (!seen[key]) {
          seen[key] = true;
          self.allWords.push({ word: w.word, phonetic: w.phonetic, pos: w.pos, chinese: w.chinese, example: w.example, example_cn: w.example_cn, category: cat.name });
        }
      });
    });
  };
SearchModule.prototype.doSearch = function() {
    this.ensureLoaded(); // 懒构建：首次搜索才建索引，不拖慢启动
    var raw = document.getElementById('search-input').value;
    var query = raw.trim().toLowerCase();
    if (!query) { Toast.warning('请输入关键词'); return; }
    var isLatin = /^[a-z'\- ]+$/.test(query);
    var scored = [];
    this.allWords.forEach(function(w) {
      var wordL = w.word.toLowerCase();
      var chnL = w.chinese.toLowerCase();
      var score = -1;
      if (isLatin) {
        // 英文：精确 > 前缀 > 包含 > 音标，同分按词长（短词优先）
        if (wordL === query) score = 100;
        else if (wordL.indexOf(query) === 0) score = 80;
        else if (wordL.indexOf(query) > 0) score = 60;
        else if (w.phonetic && w.phonetic.toLowerCase().indexOf(query) >= 0) score = 30;
      } else {
        if (chnL === query) score = 100;
        else if (chnL.indexOf(query) === 0) score = 80;
        else if (chnL.indexOf(query) > 0) score = 60;
      }
      if (score >= 0) scored.push({ w: w, score: score });
    });
    scored.sort(function(a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return a.w.word.length - b.w.word.length;
    });
    var results = scored.map(function(s) { return s.w; });
    this.renderResults(results, query);
  };
  SearchModule.prototype.renderResults = function(results, query) {
    var hint = document.getElementById('search-hint');
    var container = document.getElementById('search-results');
    hint.classList.add('hidden');
    container.classList.remove('hidden');
    if (results.length === 0) {
      container.innerHTML = '<div class="search-empty">未找到匹配的单词</div>';
      return;
    }
    var self = this;
    container.innerHTML = '<div class="search-count">找到 ' + results.length + ' 个结果</div>' +
      results.slice(0, 50).map(function(w) {
        var highlighted = self.highlight(w.word, query);
        return '<div class="search-item">' +
          '<div class="search-item-header">' +
            '<span class="search-word">' + highlighted + '</span>' +
            '<span class="search-phonetic">' + escapeHtml(w.phonetic || '') + '</span>' +
            '<span class="search-pos">' + escapeHtml(w.pos || '') + '</span>' +
            '<span class="search-category">' + escapeHtml(w.category) + '</span>' +
            '<button class="btn btn-sm btn-speak search-speak" data-word="' + escapeHtml(w.word) + '" title="朗读"><svg class="icon icon-sm"><use href="#i-volume"/></svg></button>' +
          '</div>' +
          '<div class="search-chinese">' + escapeHtml(w.chinese) + '</div>' +
          (w.example ? '<div class="search-example"><span class="en">' + escapeHtml(w.example) + '</span>' + (w.example_cn ? '<span class="cn">' + escapeHtml(w.example_cn) + '</span>' : '') + '</div>' : '') +
        '</div>';
      }).join('');
    container.querySelectorAll('.search-speak').forEach(function(btn) {
      btn.addEventListener('click', function() { SpeechUtil.speakWord(btn.dataset.word); });
    });
  };
  SearchModule.prototype.highlight = function(text, query) {
    var idx = text.toLowerCase().indexOf(query);
    if (idx === -1) return escapeHtml(text);
    var before = text.substring(0, idx);
    var match = text.substring(idx, idx + query.length);
    var after = text.substring(idx + query.length);
    return escapeHtml(before) + '<mark>' + escapeHtml(match) + '</mark>' + escapeHtml(after);
  };
  return SearchModule;
})();

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
  PhoneticModule.prototype.renderGrid = function() {
    if (typeof PHONETIC_DATA === 'undefined') return;
    var cat = document.getElementById('phonetic-category').value;
    var items = [];
    if (cat === 'all' || cat === 'vowels') items = items.concat(PHONETIC_DATA.vowels);
    if (cat === 'all' || cat === 'consonants') items = items.concat(PHONETIC_DATA.consonants);
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
    this.words = shuffleSample(cats[catIdx].words, 20);
    this.currentIndex = 0;
    this.correctCount = 0;
    this.wrongCount = 0;
    this.points = 0;
    this.shieldActive = false;
    this.doubleActive = false;
    this.shieldBorrowed = false;
    this.doubleBorrowed = false;
    this.shieldFromToolbar = false;
    this.doubleFromToolbar = false;
    if (window.app && window.app.itemSystem) {
      this.shieldBorrowed = window.app.itemSystem.borrowBuff('shield');
      this.doubleBorrowed = window.app.itemSystem.borrowBuff('double');
      this.shieldActive = this.shieldBorrowed;
      this.doubleActive = this.doubleBorrowed;
      if (this.shieldActive) Toast.info('护盾卡已自动生效：本局第一次答错不记错误');
      if (this.doubleActive) Toast.info('双倍卡已自动生效：本局结束积分翻倍');
    }
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
    document.getElementById('pk-progress-fill').style.width = (this.currentIndex / this.words.length * 100) + '%';
    document.getElementById('pk-prompt').textContent = w.chinese;
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
    if (window.app && window.app.itemSystem) {
      window.app.itemSystem.renderToolbar('pk-tools',
        [{ id: 'shield' }, { id: 'lucky' }, { id: 'freeze' }, { id: 'skip' }, { id: 'double' }],
        {
          shield: function() { self.shieldActive = true; self.shieldFromToolbar = true; Toast.success('护盾卡生效：本局下一次答错不记错误'); },
          lucky: function() {
            var wrong = [];
            document.querySelectorAll('#pk-options .pk-option-btn').forEach(function(b) {
              if (b.textContent !== w.word && wrong.length < 2) {
                wrong.push(b);
                b.disabled = true;
                b.classList.add('btn-disabled');
              }
            });
            Toast.success('幸运卡生效：已排除两个错误选项');
          },
          freeze: function() {
            self.timeLeft = Math.min(self.timeLeft + 15, 60);
            if (self._deadline) self._deadline += 15000;
            self.updateTimerDisplay();
            Toast.success('时间冻结卡生效：倒计时 +15 秒');
          },
          skip: function() {
            self.nextQuestion();
            if (window.app && window.app.gamification) {
              window.app.gamification.addPoints(5);
              Toast.success('跳过卡生效：跳过本题，+5 积分');
            } else {
              Toast.success('跳过卡生效：跳过本题');
            }
          },
          double: function() { self.doubleActive = true; self.doubleFromToolbar = true; Toast.success('双倍卡生效：本局结束积分翻倍'); }
        });
    }
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
    } else if (this.shieldActive) {
      this.shieldActive = false;
      if (this.shieldBorrowed && !this.shieldFromToolbar && window.app && window.app.itemSystem) {
        window.app.itemSystem.consumeBuff('shield');
      }
      btn.classList.add('wrong');
      resultEl.className = 'pk-result success';
      resultEl.textContent = '护盾抵挡！正确答案：' + w.word;
      Toast.success('护盾生效，本次不记错误');
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
    // 防双倍卡×4、护盾双退回、历史重复入账
    if (this.isEnded) return;
    this.isEnded = true;
    this.isRunning = false;
    if (this.timer) clearInterval(this.timer);
    if (this.doubleActive) {
      this.points *= 2;
      Toast.success('双倍卡生效：积分翻倍！');
      if (this.doubleBorrowed && window.app && window.app.itemSystem) {
        window.app.itemSystem.consumeBuff('double');
      }
    }
    if (this.shieldActive) {
      if (window.app && window.app.itemSystem) {
        if (this.shieldFromToolbar) {
          window.app.itemSystem.refund('shield');
          Toast.info('护盾卡本局未使用，已退回背包');
        } else {
          window.app.itemSystem.returnBuff('shield');
          Toast.info('护盾卡本局未使用，仍保留在背包，下次单词PK继续生效');
        }
      }
    }
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
    if (window.app && window.app.badgeSystem) {
      window.app.badgeSystem.onEvent('pk', { correct: this.correctCount, wrong: this.wrongCount });
    }
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
        + '<button class="btn btn-sm btn-danger pk-del-btn" data-id="' + h.id + '" style="padding:2px 10px;font-size:0.75rem">删除</button>'
        + '<div style="display:flex;flex-wrap:wrap;gap:var(--sp-2);align-items:center;min-width:0">'
        +   '<span style="color:var(--text-secondary);max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escapeHtml(h.category) + '</span>'
        +   '<span style="color:var(--success)">对 ' + h.correct + '</span>'
        +   '<span style="color:var(--danger)">错 ' + h.wrong + '</span>'
        +   '<span style="color:' + accColor + ';font-weight:600">' + h.accuracy + '%</span>'
        +   '<span style="color:var(--sage)">' + h.points + ' 分</span>'
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

// ==================== 语境填空模块 ====================
var ContextModule = (function() {
  function ContextModule() {
    this.exercises = [];
    this.currentIndex = 0;
    this.correct = 0;
    this.wrong = 0;
    this.initUI();
  }
  ContextModule.prototype.initUI = function() {
    var self = this;
    safeBind('btn-start-context', 'click', function() { self.start(); });
    safeBind('btn-context-submit', 'click', function() { self.submit(); });
    safeBind('btn-context-next', 'click', function() { self.next(); });
    safeBind('context-answer', 'keypress', function(e) { if (e.key === 'Enter') self.submit(); });
  };
ContextModule.prototype.start = function() {
    // 懒构建"有例句的词"缓存：12 万词词库下全库遍历+全量排序只在首次开局一次性做，
    // 后续开局 O(n) 抽样取 20 条，避免每次点开始都卡顿
    var cats = DataStore.getDefaultWords().categories;
    if (!this._pool || this._poolInvalid) {
      var i, pool = [];
      for (i = 0; i < cats.length; i++) {
        var cat = cats[i];
        if (!cat || !cat.words) continue; // 防单分类数据损坏
        for (var j = 0; j < cat.words.length; j++) {
          var w = cat.words[j];
          if (w && w.example) pool.push(w);
        }
      }
      this._pool = pool;
      this._poolInvalid = false;
    }
    var picked = shuffleSample(this._pool, 20);
    this.exercises = picked.map(function(w) {
      var sentence = w.example;
      var safeWord = String(w.word || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      var blank = sentence.replace(new RegExp('\\b' + safeWord + '\\b', 'i'), '______');
      return { sentence: blank, answer: w.word, chinese: w.chinese, translation: w.example_cn, wordObj: w };
    });
    this.currentIndex = 0;
    this.correct = 0;
    this.wrong = 0;
    document.getElementById('context-score').classList.add('hidden');
    this.showQuestion();
  };
  ContextModule.prototype.showQuestion = function() {
    if (this.currentIndex >= this.exercises.length) { this.showScore(); return; }
    var ex = this.exercises[this.currentIndex];
    document.getElementById('context-progress-text').textContent = '第 ' + (this.currentIndex + 1) + '/' + this.exercises.length + ' 题';
    document.getElementById('context-progress-fill').style.width = ((this.currentIndex + 1) / this.exercises.length * 100) + '%';
    document.getElementById('context-sentence').textContent = ex.sentence;
    document.getElementById('context-hint').textContent = '中文提示：' + ex.chinese;
    document.getElementById('context-translation').textContent = ex.translation;
    document.getElementById('context-translation').classList.add('hidden');
    document.getElementById('context-answer').value = '';
    document.getElementById('context-result').classList.add('hidden');
    document.getElementById('context-actions').style.display = 'none';
    document.getElementById('context-card').style.display = 'block';
    this.answered = false;
    if (window.app && window.app.itemSystem) {
      var self = this;
      window.app.itemSystem.renderToolbar('context-tools', [{ id: 'hint' }, { id: 'skip' }], {
        hint: function() {
          var ce = self.exercises[self.currentIndex];
          if (!ce) return;
          var input = document.getElementById('context-answer');
          input.value = input.value || ce.answer[0];
          Toast.info('提示：答案共 ' + ce.answer.length + ' 个字母，首字母是 ' + ce.answer[0]);
          input.focus();
        },
        skip: function() {
          self.next();
          if (window.app && window.app.gamification) {
            window.app.gamification.addPoints(5);
            Toast.success('跳过卡生效：跳过本题，+5 积分');
          } else {
            Toast.success('跳过卡生效：跳过本题');
          }
        }
      });
    }
  };
  ContextModule.prototype.submit = function() {
    if (this.answered) return;
    this.answered = true;
    var ex = this.exercises[this.currentIndex];
    var userAns = document.getElementById('context-answer').value.trim().toLowerCase();
    var resultEl = document.getElementById('context-result');
    resultEl.classList.remove('hidden');
    document.getElementById('context-translation').classList.remove('hidden');
    if (userAns === ex.answer.toLowerCase()) {
      resultEl.innerHTML = '<span style="color:var(--success)">✓ 正确！</span>';
      this.correct++;
      if (window.app) { window.app.recordActivity('words', 1); window.app.markCheckin(1); }
    } else {
      resultEl.innerHTML = '<span style="color:var(--danger)">✗ 正确答案：' + escapeHtml(ex.answer) + '</span>';
      this.wrong++;
      if (window.app && ex.wordObj) { window.app.addMistake(ex.wordObj, 'context'); window.app.markCheckin(1); }
    }
    document.getElementById('context-actions').style.display = 'block';
    document.getElementById('context-tools').style.display = 'none';
  };
  ContextModule.prototype.next = function() {
    // 防连点：双击跳两题
    if (this._nextLock) return;
    this._nextLock = true;
    var self = this;
    setTimeout(function() { self._nextLock = false; }, 250);
    this.currentIndex++;
    this.showQuestion();
  };
  ContextModule.prototype.showScore = function() {
    document.getElementById('context-card').style.display = 'none';
    document.getElementById('context-score').classList.remove('hidden');
    var total = this.correct + this.wrong;
    document.getElementById('context-score-num').textContent = total > 0 ? Math.round(this.correct / total * 100) + '%' : '0%';
    document.getElementById('context-correct-count').textContent = this.correct;
    document.getElementById('context-wrong-count').textContent = this.wrong;
  };
  return ContextModule;
})();

// ==================== 番茄钟模块 ====================
var PomodoroModule = (function() {
  function PomodoroModule() {
    this.timer = null;
    this.isRunning = false;
    this.sessions = DataStore.getProgress('pomodoro_sessions', 0);
    this.totalMinutes = DataStore.getProgress('pomodoro_minutes', 0);
    // 按 select 当前选中值初始化剩余秒数，让初始显示就是 MM:00 而不是 00:00
    var durSel = document.getElementById('pomodoro-duration');
    var minutes = durSel ? (parseInt(durSel.value) || 25) : 25;
    this.timeLeft = minutes * 60;
    this.initUI();
  }
  PomodoroModule.prototype.initUI = function() {
    var self = this;
    safeBind('btn-pomodoro-start', 'click', function() { self.toggle(); });
    safeBind('btn-pomodoro-reset', 'click', function() { self.reset(); });
    // 时长下拉切换：未运行时即时把显示更新为新时长（MM:00）；运行中需先确认是否放弃当前进度
    var durSel = document.getElementById('pomodoro-duration');
    if (durSel) {
      var prevDuration = durSel.value;  // 记下切换前的选中值，用户拒绝确认时还原它（而不是按 [15,60] 钳到错值）
      durSel.addEventListener('change', function() {
        var minutes = parseInt(durSel.value) || 25;
if (self.isRunning) {
          // 运行中切换：提示，否则把 timer 跑乱了
          ConfirmBox.confirm('正在专注中，切换时长会重置当前进度，确定吗？', function() {
            // 用户确认：清掉旧 timer，按新时长重新设 timeLeft
            if (self.timer) clearInterval(self.timer);
            self.timeLeft = minutes * 60;
            self.isRunning = false;
            self.updateDisplay();
            document.getElementById('btn-pomodoro-start').innerHTML = '<svg class="icon"><use href="#i-play"/></svg> 开始专注';
            prevDuration = durSel.value;  // 切换成功后更新基线
          }, {
            title: '切换专注时长',
            okText: '切换',
            danger: true,
            onCancel: function() {
              // 撤销选择：还原到切换前的那个 option（如 25 分钟），避免按 timeLeft 钳到 [15,60] 区间内的错误值
              durSel.value = prevDuration;
            }
          });
        } else {
          // 未运行：直接把显示改成新时长（MM:00），让用户看到自己的选择
          self.timeLeft = minutes * 60;
          self.updateDisplay();
          prevDuration = durSel.value; // 切换成功后更新基线
        }
      });
    }
    this.updateDisplay();
    this.updateStats();
  };
  PomodoroModule.prototype.toggle = function() { if (this.isRunning) this.pause(); else this.start(); };
PomodoroModule.prototype.start = function() {
    if (this.timer) clearInterval(this.timer);
    if (this.timeLeft <= 0) {
      var minutes = parseInt(document.getElementById('pomodoro-duration').value) || 25;
      this.timeLeft = minutes * 60;
    }
    this.isRunning = true;
    document.getElementById('btn-pomodoro-start').innerHTML = '<svg class="icon"><use href="#i-refresh"/></svg> 暂停';
    var self = this;
    // 时间戳驱动：后台节流 setInterval 会让每秒递减变慢，专注时长被拉长；
    // 改为记录截止时间，tick 时按真实差值取整
    this._deadline = Date.now() + this.timeLeft * 1000;
    this.timer = setInterval(function() {
      var remain = Math.max(0, Math.round((self._deadline - Date.now()) / 1000));
      if (remain !== self.timeLeft) {
        self.timeLeft = remain;
        self.updateDisplay();
      }
      if (self.timeLeft <= 0) self.complete();
    }, 250);
  };
  PomodoroModule.prototype.pause = function() {
    this.isRunning = false;
    if (this.timer) clearInterval(this.timer);
    this._deadline = 0;
    document.getElementById('btn-pomodoro-start').innerHTML = '<svg class="icon"><use href="#i-play"/></svg> 继续';
  };
  PomodoroModule.prototype.reset = function() {
    this.isRunning = false;
    if (this.timer) clearInterval(this.timer);
    // 重置后按当前选中时长回到 MM:00，而不是 00:00
    var minutes = parseInt(document.getElementById('pomodoro-duration').value) || 25;
    this.timeLeft = minutes * 60;
    this.updateDisplay();
    document.getElementById('btn-pomodoro-start').innerHTML = '<svg class="icon"><use href="#i-play"/></svg> 开始专注';
    document.getElementById('pomodoro-message').classList.add('hidden');
  };
  PomodoroModule.prototype.complete = function() {
    this.isRunning = false;
    if (this.timer) clearInterval(this.timer);
    this.sessions++;
    var minutes = parseInt(document.getElementById('pomodoro-duration').value) || 25;
    this.totalMinutes += minutes;
    DataStore.setProgress('pomodoro_sessions', this.sessions);
    DataStore.setProgress('pomodoro_minutes', this.totalMinutes);
    this.updateStats();
    var msgEl = document.getElementById('pomodoro-message');
    msgEl.classList.remove('hidden');
    msgEl.innerHTML = '🎉 专注完成！休息一下吧！';
    document.getElementById('btn-pomodoro-start').innerHTML = '<svg class="icon"><use href="#i-play"/></svg> 开始专注';
    // 完成后回到当前选中时长 MM:00，方便立即开下一轮
    this.timeLeft = minutes * 60;
    this.updateDisplay();
    Toast.success('番茄钟完成！');
    if (window.app) window.app.recordActivity('pomodoro');
  };
  PomodoroModule.prototype.updateDisplay = function() {
    var min = Math.floor(this.timeLeft / 60);
    var sec = this.timeLeft % 60;
    document.getElementById('pomodoro-display').textContent = String(min).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
  };
  PomodoroModule.prototype.updateStats = function() {
    document.getElementById('pomodoro-stats').textContent = '已完成 ' + this.sessions + ' 个番茄 · 累计 ' + this.totalMinutes + ' 分钟';
  };
  return PomodoroModule;
})();
// ==================== 收藏夹模块 ====================
var FavoritesModule = (function() {
  function FavoritesModule() { this.initUI(); }
  FavoritesModule.prototype.initUI = function() {
    var self = this;
    safeBind('btn-review-favorites', 'click', function() { self.startReview(); });
    safeBind('btn-clear-favorites', 'click', function() { self.clearAll(); });
    safeBind('btn-undo-fav', 'click', function() { self.undo(); });
    safeBind('fvr-know', 'click', function() { self.markKnown(); });
    safeBind('fvr-still-wrong', 'click', function() { self.markStillWrong(); });
    safeBind('fvr-close', 'click', function() { document.getElementById('modal-fav-review').classList.add('hidden'); });
    // 来源筛选下拉：切换后按 source 过滤收藏列表
    var favSourceSel = document.getElementById('fav-source');
    if (favSourceSel) {
      favSourceSel.addEventListener('change', function() {
        self.sourceFilter = favSourceSel.value;
        self.renderList();
      });
    }
    this.sourceFilter = favSourceSel ? favSourceSel.value : 'all';
    this.renderList();
  };
  FavoritesModule.prototype.renderList = function() {
    var self = this;
    var favs = DataStore.getProgress('favorites', []);
    if (this.sourceFilter && this.sourceFilter !== 'all') {
      favs = favs.filter(function(f) { return f.source === self.sourceFilter; });
    }
    var list = document.getElementById('fav-list');
    document.getElementById('fav-total').textContent = favs.length;
    var mastered = favs.filter(function(f) { return f.mastered; }).length;
    document.getElementById('fav-mastered').textContent = mastered;
    if (favs.length === 0) {
      list.innerHTML = '<p class="empty-tip">暂无收藏</p>';
      return;
    }
    list.innerHTML = favs.map(function(f, i) {
      return '<div class="fav-item">' +
        '<span class="fav-word">' + escapeHtml(f.word) + '</span>' +
        '<span class="fav-phonetic">' + escapeHtml(f.phonetic || '') + '</span>' +
        '<span class="fav-chinese">' + escapeHtml(f.chinese) + '</span>' +
        '<button class="btn btn-sm btn-speak fav-speak" data-word="' + escapeHtml(f.word) + '"><svg class="icon icon-sm"><use href="#i-volume"/></svg></button>' +
        '<button class="btn btn-sm btn-danger fav-del" data-word="' + escapeHtml(f.word) + '"><svg class="icon icon-sm"><use href="#i-delete"/></svg></button>' +
      '</div>';
    }).join('');
    // 朗读按钮用事件绑定而非内联 onclick：含撇号的单词（如 don't）不会导致 JS 语法错误
    list.querySelectorAll('.fav-speak').forEach(function(btn) {
      btn.addEventListener('click', function() { SpeechUtil.speakWord(btn.dataset.word); });
    });
    // 删除按钮同样按 word 定位（筛选视图下下标会错位，内联 onclick 传 index 会删错）
    list.querySelectorAll('.fav-del').forEach(function(btn) {
      btn.addEventListener('click', function() { self.remove(btn.dataset.word); });
    });
  };
  FavoritesModule.prototype.remove = function(word) {
    var favs = DataStore.getProgress('favorites', []);
    var idx = -1;
    for (var i = 0; i < favs.length; i++) { if (favs[i].word === word) { idx = i; break; } }
    if (idx < 0) return;
    this._lastRemoved = { item: favs[idx], word: favs[idx].word, idx: idx };
    favs.splice(idx, 1);
    DataStore.setProgress('favorites', favs);
    this.renderList();
    Toast.info('已取消收藏');
  };
  FavoritesModule.prototype.undo = function() {
    if (!this._lastRemoved) { Toast.warning('没有可撤销的操作'); return; }
    var favs = DataStore.getProgress('favorites', []);
    var removed = this._lastRemoved;
    // 用 word 重定位：若同词已存在（撤销期间又加了同名收藏）则不重复插，仅提示
    var exists = favs.some(function(f) { return f.word === removed.word; });
    if (!exists) {
      // 插回原位（数组可能被别处改动，长度变化时 clamp 到尾部）
      var at = Math.min(removed.idx, favs.length);
      favs.splice(at, 0, removed.item);
      DataStore.setProgress('favorites', favs);
      this.renderList();
      Toast.success('已撤销');
    } else {
      Toast.info('该单词已在收藏列表中，无需撤销');
    }
    this._lastRemoved = null;
  };
FavoritesModule.prototype.clearAll = function() {
    ConfirmBox.confirm('确定要清空所有收藏吗？', function() {
      DataStore.setProgress('favorites', []);
      this.renderList();
      Toast.info('已清空收藏');
    }.bind(this), { title: '清空收藏', okText: '清空', danger: true });
  };
  FavoritesModule.prototype.startReview = function() {
    var favs = DataStore.getProgress('favorites', []);
    if (favs.length === 0) { Toast.warning('收藏夹为空'); return; }
    this._reviewFavs = favs.slice().sort(function() { return Math.random() - 0.5; });
    this._reviewIdx = 0;
    this.showReviewItem();
    document.getElementById('modal-fav-review').classList.remove('hidden');
  };
  FavoritesModule.prototype.showReviewItem = function() {
    if (this._reviewIdx >= this._reviewFavs.length) {
      document.getElementById('modal-fav-review').classList.add('hidden');
      Toast.success('复习完成！');
      return;
    }
    var f = this._reviewFavs[this._reviewIdx];
    document.getElementById('fav-review-content').innerHTML =
      '<div style="font-size:2rem;font-weight:800;margin:16px 0">' + escapeHtml(f.word) + '</div>' +
      '<div style="color:var(--text-secondary)">' + escapeHtml(f.phonetic || '') + ' ' + escapeHtml(f.pos || '') + '</div>' +
      '<div style="font-size:1.2rem;margin:8px 0">' + escapeHtml(f.chinese) + '</div>';
  };
  FavoritesModule.prototype.markKnown = function() {
    var f = this._reviewFavs[this._reviewIdx];
    if (f) this.setMastered(f.word, true);
    this._reviewIdx++; this.showReviewItem();
  };
  FavoritesModule.prototype.markStillWrong = function() {
    var f = this._reviewFavs[this._reviewIdx];
    if (f) this.setMastered(f.word, false);
    this._reviewIdx++; this.showReviewItem();
  };
  FavoritesModule.prototype.setMastered = function(word, mastered) {
    var favs = DataStore.getProgress('favorites', []);
    for (var i = 0; i < favs.length; i++) {
      if (favs[i].word === word) { favs[i].mastered = mastered; break; }
    }
    DataStore.setProgress('favorites', favs);
    this.renderList();
  };
  return FavoritesModule;
})();

// ==================== 错题本模块 ====================
var MistakeModule = (function() {
  function MistakeModule() { this.initUI(); }
  MistakeModule.prototype.initUI = function() {
    var self = this;
safeBind('btn-review-mistakes', 'click', function() { self.startReview(); });
    safeBind('btn-clear-mistakes', 'click', function() { self.clearAll(); });
    safeBind('btn-undo-mistake', 'click', function() { self.undoLastKnown(); });
    safeBind('mr-know', 'click', function() { self.markKnown(); });
    safeBind('mr-still-wrong', 'click', function() { self.markStillWrong(); });
    safeBind('mr-close', 'click', function() { document.getElementById('modal-mistake-review').classList.add('hidden'); });
    // 来源筛选下拉：切换后按 source 过滤错题列表
    var mistakeSourceSel = document.getElementById('mistake-source');
    if (mistakeSourceSel) {
      mistakeSourceSel.addEventListener('change', function() {
        self.sourceFilter = mistakeSourceSel.value;
        self.renderList();
      });
    }
    this.sourceFilter = mistakeSourceSel ? mistakeSourceSel.value : 'all';
    this.renderList();
  };
  MistakeModule.prototype.renderList = function() {
    var self = this;
    var mistakes = DataStore.getProgress('mistakes', []);
    if (this.sourceFilter && this.sourceFilter !== 'all') {
      mistakes = mistakes.filter(function(m) { return m.source === self.sourceFilter; });
    }
    document.getElementById('ms-total').textContent = mistakes.length;
    var unreviewed = mistakes.filter(function(m) { return !m.reviewed; }).length;
    document.getElementById('ms-unreviewed').textContent = unreviewed;
    var mastered = mistakes.filter(function(m) { return m.reviewed; }).length;
    document.getElementById('ms-mastered').textContent = mastered;
    var list = document.getElementById('mistake-list');
    if (mistakes.length === 0) {
      list.innerHTML = '<p class="empty-tip">暂无错题，继续加油！</p>';
      return;
    }
    list.innerHTML = mistakes.map(function(m) {
      return '<div class="mistake-item">' +
        '<span class="mistake-word">' + escapeHtml(m.word) + '</span>' +
        '<span class="mistake-phonetic">' + escapeHtml(m.phonetic || '') + '</span>' +
        '<span class="mistake-chinese">' + escapeHtml(m.chinese) + '</span>' +
        '<span class="mistake-source">' + escapeHtml(m.source || '') + '</span>' +
      '</div>';
    }).join('');
  };
  MistakeModule.prototype.startReview = function() {
    var mistakes = DataStore.getProgress('mistakes', []);
    var unreviewed = mistakes.filter(function(m) { return !m.reviewed; });
    if (unreviewed.length === 0) { Toast.warning('没有需要复习的错题'); return; }
    this._reviewMistakes = unreviewed.sort(function() { return Math.random() - 0.5; });
    this._reviewIdx = 0;
    this.showReviewItem();
    document.getElementById('modal-mistake-review').classList.remove('hidden');
  };
  MistakeModule.prototype.showReviewItem = function() {
    if (this._reviewIdx >= this._reviewMistakes.length) {
      document.getElementById('modal-mistake-review').classList.add('hidden');
      this.renderList();
      Toast.success('错题复习完成！');
      return;
    }
    var m = this._reviewMistakes[this._reviewIdx];
    document.getElementById('mistake-review-content').innerHTML =
      '<div style="font-size:2rem;font-weight:800;margin:16px 0">' + escapeHtml(m.word) + '</div>' +
      '<div style="color:var(--text-secondary)">' + escapeHtml(m.phonetic || '') + ' ' + escapeHtml(m.pos || '') + '</div>' +
      '<div style="font-size:1.2rem;margin:8px 0">' + escapeHtml(m.chinese) + '</div>';
  };
MistakeModule.prototype.markKnown = function() {
    var m = this._reviewMistakes[this._reviewIdx];
    var mistakes = DataStore.getProgress('mistakes', []);
    var mi = -1;
    for (var i = 0; i < mistakes.length; i++) {
      if (mistakes[i].word === m.word && mistakes[i].date === m.date) { mistakes[i].reviewed = true; mi = i; break; }
    }
    DataStore.setProgress('mistakes', mistakes);
    // 同步背单词的数据：wordProgress 的 key 是 word-分类，错题只存了 word
    // 所以扫描所有 status==='failed' 且前缀匹配该词的条目，统一置为 mastered，避免错题本判掌握后背单词那边还显示"不认识"
    var wpTouched = [];
    try {
      var wp = DataStore.getProgress('word_progress', {});
      // key 形如 "word-分类序号"：精确匹配末尾数字，避免 "run" 误伤 "run-on"
      var wordRe = new RegExp('^' + String(m.word).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '-\\d+$');
      Object.keys(wp).forEach(function(k) {
        if (wordRe.test(k) && wp[k].status === 'failed') {
          wpTouched.push({ key: k, snapshot: JSON.parse(JSON.stringify(wp[k])) });
          wp[k].status = 'mastered';
          wp[k].reviewCount = Math.max(wp[k].reviewCount || 0, 8); // 与背单词 mastered 口径一致（reviewCount>=8）
          if (!wp[k].nextReview) wp[k].nextReview = getLocalDateStr();
        }
      });
      if (wpTouched.length && window.app && window.app.wordModule) {
        window.app.wordModule.wordProgress = wp;
        window.app.wordModule.saveProgress();
        window.app.wordModule.renderStats();
      }
    } catch(e) {}
    // 撤销快照：仅记录本次真正改动的条目（mi>=0），undo 时完整还原
    if (mi >= 0) {
      this._lastMarked = {
        word: mistakes[mi].word,
        date: mistakes[mi].date,
        wpSnapshots: wpTouched
      };
    }
    this._reviewIdx++;
    this.showReviewItem();
  };
  // 撤销上次"标记掌握"：还原错题 reviewed 状态 + word_progress 快照
  MistakeModule.prototype.undoLastKnown = function() {
    if (!this._lastMarked) { Toast.warning('没有可撤销的操作'); return; }
    var last = this._lastMarked;
    this._lastMarked = null;
    try {
      var mistakes = DataStore.getProgress('mistakes', []);
      for (var i = 0; i < mistakes.length; i++) {
        if (mistakes[i].word === last.word && mistakes[i].date === last.date) { mistakes[i].reviewed = false; break; }
      }
      DataStore.setProgress('mistakes', mistakes);
    } catch(e) {}
    try {
      var wp = DataStore.getProgress('word_progress', {});
      var changed = false;
      for (var j = 0; j < last.wpSnapshots.length; j++) {
        var s = last.wpSnapshots[j];
        if (wp[s.key]) { wp[s.key] = s.snapshot; changed = true; }
      }
      if (changed && window.app && window.app.wordModule) {
        window.app.wordModule.wordProgress = wp;
        window.app.wordModule.saveProgress();
        window.app.wordModule.renderStats();
      }
    } catch(e) {}
    this.renderList();
    Toast.success('已撤销上次标记');
  };
  MistakeModule.prototype.markStillWrong = function() { this._reviewIdx++; this.showReviewItem(); };
MistakeModule.prototype.clearAll = function() {
    ConfirmBox.confirm('确定要清空所有错题吗？', function() {
      DataStore.setProgress('mistakes', []);
      this.renderList();
      Toast.info('已清空错题本');
    }.bind(this), { title: '清空错题本', okText: '清空', danger: true });
  };
  return MistakeModule;
})();

// ==================== 跟读练习模块 ====================
// 语音识别把单个字母转成读音词（B→"be"、C→"see"、R→"are"），
// 判分前先做字母读音归一化，避免阶段0字母读对却打叉
var SPEAK_LETTER_PRON = {
  'a':'a','b':'b','c':'c','d':'d','e':'e','f':'f','g':'g','h':'h','i':'i',
  'j':'j','k':'k','l':'l','m':'m','n':'n','o':'o','p':'p','q':'q','r':'r',
  's':'s','t':'t','u':'u','v':'v','w':'w','x':'x','y':'y','z':'z',
  'be':'b','see':'c','dee':'d','eff':'f','gee':'g','aitch':'h','aych':'h',
  'eye':'i','jay':'j','kay':'k','el':'l','em':'m','en':'n','oh':'o','pee':'p',
  'cue':'q','are':'r','ess':'s','tee':'t','you':'u','vee':'v','ex':'x',
  'why':'y','zee':'z','zed':'z','double u':'w','doubleu':'w'
};
function speakNormalize(s) {
  return String(s || '').toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
}
// 编辑距离（Levenshtein）：发音评分按转写文本与目标词的字符差异算相似度
function speakLevenshtein(a, b) {
  var la = a.length, lb = b.length;
  if (!la) return lb;
  if (!lb) return la;
  var prev = new Array(lb + 1), cur = new Array(lb + 1);
  for (var j = 0; j <= lb; j++) prev[j] = j;
  for (var i = 1; i <= la; i++) {
    cur[0] = i;
    for (var j = 1; j <= lb; j++) {
      var cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    var tmp = prev; prev = cur; cur = tmp;
  }
  return prev[lb];
}
// 粗略音节数：按元音字母组统计，去掉词尾不发音 e（启发式，用于差异提示，非标准音标）
function countSyllablesApprox(word) {
  var s = String(word || '').toLowerCase().replace(/e\s*$/, '');
  var groups = s.match(/[aeiouy]+/g) || [];
  return Math.max(1, groups.length);
}
// 发音评分主函数：返回 { score 0-100, state 'high'/'mid'/'low', syllableHtml, tips }
function speakScore(targetW, spoken, isLetter, exact) {
  if (!spoken) {
    return { score: 0, state: 'low', syllableHtml: '', tips: ['没有识别到内容，请靠近麦克风重新朗读。'] };
  }
  var score, tips = [];
  if (exact) {
    score = isLetter ? 100 : 98;
  } else {
    var dist = speakLevenshtein(targetW, spoken);
    var maxLen = Math.max(targetW.length, spoken.length);
    var sim = maxLen > 0 ? 1 - dist / maxLen : 0;
    if (targetW.charAt(0) === spoken.charAt(0)) sim = Math.min(1, sim + 0.1);
    score = Math.round(40 + sim * 58);
    if (score < 30) score = 30;
    if (score > 95) score = 95;
  }
  var state = score >= 85 ? 'high' : (score >= 60 ? 'mid' : 'low');
  var tSyl = countSyllablesApprox(targetW);
  var sSyl = countSyllablesApprox(spoken);
  var syllableHtml;
  if (exact) {
    syllableHtml = '音节：' + tSyl + ' 个，完全正确';
  } else {
    syllableHtml = '音节：标准 ' + tSyl + ' 个，你说 ' + sSyl + ' 个'
      + (tSyl !== sSyl ? '（相差 ' + Math.abs(tSyl - sSyl) + ' 个）' : '');
  }
  if (exact) {
    tips.push('发音准确，与标准一致，继续保持！');
  } else {
    if (tSyl !== sSyl) tips.push('音节数不一致，慢速朗读，确保每个元音都发出来。');
    if (targetW.length !== spoken.length) tips.push('朗读长度与标准不一致，先听标准发音，逐音节跟读。');
    tips.push('注意重音位置，把单词拆成音节分别练习。');
    if (score >= 70) tips.push('已经很接近了，再读一遍就能拿高分！');
  }
  return { score: score, state: state, syllableHtml: syllableHtml, tips: tips };
}
var SpeakModule = (function() {
  function SpeakModule() {
    this.words = [];
    this.currentIndex = 0;
    this.correct = 0;
    this.wrong = 0;
    this.initUI();
  }
  SpeakModule.prototype.initUI = function() {
    var self = this;
    var catSelect = document.getElementById('speak-category');
    var cats = DataStore.getDefaultWords().categories;
    catSelect.innerHTML = '';
    orderCategoriesForDisplay(cats).forEach(function(i) {
      var opt = document.createElement('option');
      opt.value = i;
      opt.textContent = cats[i].name;
      catSelect.appendChild(opt);
    });
    safeBind('btn-start-speak', 'click', function() { self.start(); });
    safeBind('btn-speak-play', 'click', function() { self.playAudio(); });
    safeBind('btn-speak-record', 'click', function() { self.startRecord(); });
    safeBind('btn-speak-next', 'click', function() { self.next(); });
    safeBind('btn-speak-retry', 'click', function() { self.start(); });
  };
  SpeakModule.prototype.start = function() {
    var catIdx = safeNumber(document.getElementById('speak-category').value, 0);
    var cats = DataStore.getDefaultWords().categories;
    if (!cats || !cats.length || catIdx >= cats.length || !cats[catIdx] || !cats[catIdx].words) { Toast.warning('词库尚未加载，请稍后再试'); return; }
this.words = shuffleSample(cats[catIdx].words, 15);
    this.currentIndex = 0;
    this.correct = 0;
    this.wrong = 0;
    document.getElementById('speak-score').classList.add('hidden');
    this.showQuestion();
  };
  SpeakModule.prototype.showQuestion = function() {
    if (this.currentIndex >= this.words.length) { this.showScore(); return; }
    var w = this.words[this.currentIndex];
    document.getElementById('speak-progress-text').textContent = '第 ' + (this.currentIndex + 1) + '/' + this.words.length + ' 题';
    document.getElementById('speak-progress-fill').style.width = ((this.currentIndex + 1) / this.words.length * 100) + '%';
    document.getElementById('speak-word').textContent = w.word;
    document.getElementById('speak-phonetic').textContent = w.phonetic || '';
    document.getElementById('speak-chinese').textContent = w.chinese || '';
    document.getElementById('speak-result').classList.add('hidden');
    document.getElementById('speak-actions').style.display = 'none';
document.getElementById('speak-card').style.display = 'block';
    this.answered = false; // 每题重置作答锁，允许下一题正常计分
    // 每题重置评分面板
    var scoringEl = document.getElementById('speak-scoring');
    if (scoringEl) scoringEl.classList.add('hidden');
  };
  SpeakModule.prototype.playAudio = function() {
    if (this.words.length === 0) return;
    SpeechUtil.speakWord(this.words[this.currentIndex].word);
  };
  SpeakModule.prototype.startRecord = function() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      Toast.error('浏览器不支持语音识别');
      return;
    }
    // 释放上一次的识别器，避免连续点击报"already started"
    if (this.recognition) {
      try { this.recognition.stop(); } catch(e) {}
      this.recognition = null;
    }
    var self = this;
    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    // 捕获开始录音时的目标单词：录音结果异步返回，期间用户可能已点"下一题"，
    // 若用 this.words[this.currentIndex] 会把新一题的词拿去判分
    var target = this.words[this.currentIndex];
    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'en-US';
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.onresult = function(event) {
      var transcript = event.results[0][0].transcript;
      self.checkPronunciation(transcript, target);
    };
    this.recognition.onerror = function(e) {
      Toast.error('语音识别失败' + (e.error ? '：' + e.error : ''));
    };
    this.recognition.onend = function() {
      // 识别结束、释放实例
      if (self.recognition === this) self.recognition = null;
      var btn = document.getElementById('btn-speak-record');
      if (btn) btn.disabled = false;
    };
    try {
      this.recognition.start();
      var btn = document.getElementById('btn-speak-record');
      if (btn) btn.disabled = true;
      Toast.info('请开始朗读...');
    } catch(e) {
      Toast.error('无法启动语音识别，请稍后再试');
      this.recognition = null;
    }
  };
SpeakModule.prototype.checkPronunciation = function(transcript, target) {
    var w = target || this.words[this.currentIndex];
    var resultEl = document.getElementById('speak-result');
    if (!w || !w.word) {
      Toast.error('当前题目已结束，请重新开始');
      return;
    }
    resultEl.classList.remove('hidden');
    var spoken = speakNormalize(transcript);
    var targetW = speakNormalize(w.word);
    var isLetter = targetW.length === 1;
    var match = isLetter
      ? (SPEAK_LETTER_PRON[spoken] === targetW || spoken === targetW)
      : (spoken === targetW);
    // AI 发音评分：相似度/准确率打分 + 音节差异 + 改进建议 → 写入 #speak-scoring
    var res = speakScore(targetW, spoken, isLetter, match);
    this.renderScoring(res, spoken, targetW);
    // 作答锁：每题只计一次分，之后重录/再识别仅显示结果，不重复计分与记录
    if (this.answered) return;
    this.answered = true;
    if (match) {
      resultEl.innerHTML = '<span style="color:var(--success)">✓ 发音正确！' + (res.score >= 98 ? '满分' : '') + '</span>';
      this.correct++;
      if (window.app) { window.app.recordActivity('speak', 1); window.app.markCheckin(1); }
    } else {
      resultEl.innerHTML = '<span style="color:var(--danger)">✗ 你说的是：' + escapeHtml(transcript)
        + '</span>' + (res.score >= 70 ? '<span style="color:var(--amber)">（已接近，看下方建议再试一次）</span>' : '');
      this.wrong++;
      if (window.app) { window.app.addMistake(w, 'speak'); window.app.markCheckin(1); }
    }
    document.getElementById('speak-actions').style.display = 'block';
  };
  // 发音评分面板渲染：准确率分 / 你说-标准对照 / 进度条三色 / 音节差异 / 改进建议
  SpeakModule.prototype.renderScoring = function(res, spoken, targetW) {
    var panel = document.getElementById('speak-scoring');
    if (!panel) return;
    panel.classList.remove('hidden');
    var accEl = document.getElementById('ps-accuracy');
    if (accEl) accEl.textContent = res.score;
    var spokenEl = document.getElementById('ps-spoken');
    if (spokenEl) spokenEl.textContent = spoken || '（未识别到内容）';
    var targetEl = document.getElementById('ps-target');
    if (targetEl) targetEl.textContent = targetW;
    var fill = document.getElementById('ps-fill');
    if (fill) {
      fill.style.width = res.score + '%';
      fill.setAttribute('data-state', res.state);
    }
    var sylEl = document.getElementById('ps-syllable');
    if (sylEl) sylEl.innerHTML = res.syllableHtml;
    var tipsEl = document.getElementById('ps-tips');
    if (tipsEl) {
      tipsEl.innerHTML = '';
      res.tips.forEach(function(t) {
        var li = document.createElement('li');
        li.textContent = t;
        tipsEl.appendChild(li);
      });
    }
  };
  SpeakModule.prototype.next = function() {
    // 防连点：双击跳两题
    if (this._nextLock) return;
    this._nextLock = true;
    var self = this;
    setTimeout(function() { self._nextLock = false; }, 250);
    this.currentIndex++;
    this.showQuestion();
  };
  SpeakModule.prototype.showScore = function() {
    document.getElementById('speak-card').style.display = 'none';
    document.getElementById('speak-score').classList.remove('hidden');
    var total = this.correct + this.wrong;
    document.getElementById('speak-score-num').textContent = total > 0 ? Math.round(this.correct / total * 100) + '%' : '0%';
    document.getElementById('speak-correct-count').textContent = this.correct;
    document.getElementById('speak-wrong-count').textContent = this.wrong;
  };
  return SpeakModule;
})();

// ==================== 错词强化模块 ====================
var MistakeTrainModule = (function() {
  function MistakeTrainModule() {
    this.words = [];
    this.currentIndex = 0;
    this.correct = 0;
    this.wrong = 0;
    this.initUI();
  }
  MistakeTrainModule.prototype.initUI = function() {
    var self = this;
    safeBind('btn-start-mt', 'click', function() { self.start(); });
    safeBind('btn-mt-submit', 'click', function() { self.submit(); });
    safeBind('btn-mt-next', 'click', function() { self.next(); });
    safeBind('btn-mt-retry', 'click', function() { self.start(); });
    safeBind('btn-mt-speak', 'click', function() { self.speak(); });
    safeBind('mt-answer', 'keypress', function(e) { if (e.key === 'Enter') self.submit(); });
  };
  MistakeTrainModule.prototype.start = function() {
    var mistakes = DataStore.getProgress('mistakes', []);
    // 读来源下拉（HTML mt-source：all/spelling/grammar/listening），过滤未复习的错题
    var srcSel = document.getElementById('mt-source');
    var source = srcSel ? srcSel.value : 'all';
    this.words = mistakes.filter(function(m) {
      if (m.reviewed) return false;
      if (source && source !== 'all' && m.source !== source) return false;
      return true;
    });
    if (this.words.length === 0) {
      document.getElementById('mt-empty').classList.remove('hidden');
      document.getElementById('mt-card').style.display = 'none';
      return;
    }
    this.words.sort(function() { return Math.random() - 0.5; });
    this.currentIndex = 0;
    this.correct = 0;
    this.wrong = 0;
    document.getElementById('mt-complete').classList.add('hidden');
    document.getElementById('mt-empty').classList.add('hidden');
    this.showQuestion();
  };
  MistakeTrainModule.prototype.showQuestion = function() {
    if (this.currentIndex >= this.words.length) { this.showScore(); return; }
    var w = this.words[this.currentIndex];
    // 语法/阅读错题是"填空式"：题干长、答案短。兼容新旧两种存法
    // （旧: word=题干 chinese=答案；新: word=答案 chinese=题干），取短的当答案、长的当提示。
    var fill = (w.source === 'grammar' || w.source === 'reading');
    var target = fill && w.chinese && w.chinese.length < w.word.length ? w.chinese : w.word;
    var promptText = fill ? (target === w.chinese ? w.word : w.chinese) : (w.chinese || '');
    this._mtTarget = target;
    document.getElementById('mt-progress-text').textContent = '第 ' + (this.currentIndex + 1) + '/' + this.words.length + ' 题';
    document.getElementById('mt-progress-fill').style.width = ((this.currentIndex + 1) / this.words.length * 100) + '%';
    document.getElementById('mt-chinese').textContent = promptText;
    document.getElementById('mt-example').textContent = w.example || '';
    document.getElementById('mt-example').classList.toggle('hidden', !w.example);
    document.getElementById('mt-answer').value = '';
    document.getElementById('mt-result').classList.add('hidden');
    document.getElementById('mt-actions').style.display = 'none';
    document.getElementById('mt-card').style.display = 'block';
    this.answered = false;
  };
  MistakeTrainModule.prototype.submit = function() {
    if (this.answered) return;
    this.answered = true;
    var w = this.words[this.currentIndex];
    var target = this._mtTarget || w.word;
    var userAns = document.getElementById('mt-answer').value.trim().toLowerCase();
    var resultEl = document.getElementById('mt-result');
    resultEl.classList.remove('hidden');
    if (userAns === String(target).toLowerCase()) {
      resultEl.innerHTML = '<span style="color:var(--success)">✓ 正确！</span>';
      this.correct++;
      // 答对：把这条错题标 reviewed=true 回写 storage，否则错词永远在错题本里循环
      this.markReviewed(w);
    } else {
      resultEl.innerHTML = '<span style="color:var(--danger)">✗ 正确答案：' + escapeHtml(target) + '</span>';
      this.wrong++;
    }
    // 用 '' 清掉内联 display，让 CSS 类 .mt-actions（flex 居中）控制布局，
    // 之前写成 'block' 会覆盖类样式导致按钮错位
    document.getElementById('mt-actions').style.display = '';
  };
  // 把当前题对应的错题条目标记 reviewed=true 并存盘（按 word+date 唯一定位，沿用 addMistake 的去重键）
  MistakeTrainModule.prototype.markReviewed = function(w) {
    try {
      var mistakes = DataStore.getProgress('mistakes', []);
      var changed = false;
      for (var i = 0; i < mistakes.length; i++) {
        if (mistakes[i].word === w.word && mistakes[i].date === w.date && !mistakes[i].reviewed) {
          mistakes[i].reviewed = true;
          changed = true;
        }
      }
      if (changed) DataStore.setProgress('mistakes', mistakes);
    } catch(e) {}
  };
  MistakeTrainModule.prototype.speak = function() {
    if (this.words.length === 0) return;
    SpeechUtil.speakWord(this.words[this.currentIndex].word);
  };
  MistakeTrainModule.prototype.next = function() {
    // 防连点：双击跳两题
    if (this._nextLock) return;
    this._nextLock = true;
    var self = this;
    setTimeout(function() { self._nextLock = false; }, 250);
    this.currentIndex++;
    this.showQuestion();
  };
  MistakeTrainModule.prototype.showScore = function() {
    document.getElementById('mt-card').style.display = 'none';
    document.getElementById('mt-complete').classList.remove('hidden');
    var total = this.correct + this.wrong;
    document.getElementById('mt-score-num').textContent = total > 0 ? Math.round(this.correct / total * 100) + '%' : '0%';
    document.getElementById('mt-correct-count').textContent = this.correct;
    document.getElementById('mt-wrong-count').textContent = this.wrong;
  };
  return MistakeTrainModule;
})();
// ==================== 游戏化系统 ====================
var GamificationSystem = (function() {
  function GamificationSystem() {
    this.data = DataStore.getProgress('gamification', {
      points: 0, level: 1, streak: 0, lastActiveDate: null,
      totalWords: 0, totalExercises: 0, achievements: []
    });
  }
GamificationSystem.prototype.addPoints = function(amount) {
    this.data.points += amount;
    // 注意：不要在加积分时把 lastActiveDate 置为今天 —— 购买道具/领取奖励扣加分
    // 会先把当天"激活"，导致当天第一次 recordActivity 判 lastActiveDate===today
    // 而跳过 streak 累计。lastActiveDate 只由 recordActivity（有实际学习活动）统一维护。
    // 每 100 分升一级
    var newLevel = Math.floor(this.data.points / 100) + 1;
    if (newLevel > (this.data.level || 1)) {
      this.data.level = newLevel;
      Toast.success('🎉 升级到 Lv.' + newLevel + '！');
    }
    this.save();
    // 同步顶栏统计
    if (window.app) window.app.updateGlobalStats();
  };
  GamificationSystem.prototype.recordActivity = function(type) {
    // 兼容各模块上报的 type 字符串，统一归到两条总计数上
    if (type === 'word' || type === 'words') this.data.totalWords++;
    else if (type === 'exercise' || type === 'grammar' || type === 'reading' ||
             type === 'listening' || type === 'spelling' || type === 'speak' || type === 'pk') {
      this.data.totalExercises++;
    }
// 累计 streak：当天第一次有活动就把当天记作 active，与昨天比较是否连续
    var today = getLocalDateStr();
    if (this.data.lastActiveDate !== today) {
      var y = new Date();
      y.setDate(y.getDate() - 1);
      var yesterday = getLocalDateStr(y);
      if (this.data.lastActiveDate === yesterday) this.data.streak = (this.data.streak || 0) + 1;
      else this.data.streak = 1;
      this.data.lastActiveDate = today;
    }
    // 仅在连续打卡跨越阈值时 Toast 一下
    if (this.data.streak === 7 || this.data.streak === 30) {
      Toast.info('🎉 连续打卡 ' + this.data.streak + ' 天！');
    }
    this.addPoints(type === 'word' ? 5 : 10);
  };
  GamificationSystem.prototype.save = function() { DataStore.setProgress('gamification', this.data); };
  GamificationSystem.prototype.getStats = function() { return this.data; };
  return GamificationSystem;
})();


// ==================== 每日挑战 ====================
var DailyChallenge = (function() {
  function DailyChallenge() {
    this.data = DataStore.getProgress('daily_challenge', null);
    this._ensureToday();
    this.render();
  }
  // 跨日校验：任务只在生成它的那一天有效，更新/领奖前都要先归一到当天
  DailyChallenge.prototype._ensureToday = function() {
    var today = getLocalDateStr();
    if (!this.data || this.data.date !== today) {
      this.data = { date: today, tasks: this.generateTasks(), completed: [], claimed: false, counts: {}, newWords: [] };
      DataStore.setProgress('daily_challenge', this.data);
    }
    if (!this.data.counts) this.data.counts = {};
    if (!this.data.newWords) this.data.newWords = [];
  };
  DailyChallenge.prototype.generateTasks = function() {
    var allTasks = [
      { id: 'words_10', text: '学习10个新单词', type: 'words', target: 10 },
      { id: 'words_20', text: '学习20个新单词', type: 'words', target: 20 },
      { id: 'review_5', text: '复习5个单词', type: 'review', target: 5 },
      { id: 'review_10', text: '复习10个单词', type: 'review', target: 10 },
      { id: 'grammar_1', text: '完成1道语法题', type: 'grammar', target: 1 },
      { id: 'grammar_5', text: '完成5道语法题', type: 'grammar', target: 5 },
      { id: 'reading_1', text: '阅读1篇文章', type: 'reading', target: 1 },
      { id: 'listen_1', text: '完成1次听力训练', type: 'listening', target: 1 },
      { id: 'spell_1', text: '完成1次拼写测试', type: 'spelling', target: 1 },
      { id: 'speak_1', text: '完成1次跟读练习', type: 'speak', target: 1 },
      { id: 'pk_1', text: '完成1次单词PK', type: 'pk', target: 1 },
      { id: 'pomo_1', text: '完成1个番茄钟', type: 'pomodoro', target: 1 }
    ];
    allTasks.sort(function() { return Math.random() - 0.5; });
    return allTasks.slice(0, 3);
  };
  DailyChallenge.prototype.render = function() {
    var container = document.getElementById('dc-tasks');
    if (!container) return;
    var self = this;
    document.getElementById('dc-date').textContent = '今日挑战';
    document.getElementById('dc-reward').textContent = '奖励: +50 积分';
    container.innerHTML = this.data.tasks.map(function(t) {
      var done = self.data.completed.indexOf(t.id) >= 0;
      // 多目标任务显示当前进度 (X/target)，单次任务不显示
      var prog = '';
      if (!done && t.target > 1 && self.data.counts && self.data.counts[t.id]) {
        prog = '<span class="dc-prog">' + Math.min(self.data.counts[t.id], t.target) + '/' + t.target + '</span>';
      }
      return '<div class="dc-task ' + (done ? 'done' : '') + '">' +
        '<span class="dc-check">' + (done ? '✓' : '○') + '</span>' +
        '<span class="dc-text">' + t.text + '</span>' +
        prog +
      '</div>';
    }).join('');
    var completed = this.data.completed.length;
    var total = this.data.tasks.length;
    var pct = Math.round(completed / total * 100);
    document.getElementById('dc-progress-fill').style.width = pct + '%';
    document.getElementById('dc-progress-text').textContent = completed + '/' + total + ' 已完成';
    var claimBtn = document.getElementById('btn-claim-dc');
    if (claimBtn) {
      if (completed >= total && !this.data.claimed) {
        claimBtn.style.display = 'block';
        claimBtn.onclick = function() { self.claimReward(); };
      } else {
        claimBtn.style.display = 'none';
      }
    }
  };
DailyChallenge.prototype.updateProgress = function(type, count, isNewWord, wordKey) {
    var self = this;
    this._ensureToday();
    var n = count || 1;
    var types = (type === 'word' || type === 'words') ? ['words', 'review'] : [type];
    var changed = false;
    // 背单词首次建档=新词；语境填空本身就是新词学习。只有背单词复习旧词时不推进"学习新单词"。
    // 同日同一词只计一次"学习新单词"（按 wordKey 去重），防止当天反复复习刷满任务
    var freshWord = type === 'word' ? (isNewWord ? 1 : 0) : 1;
    this.data.tasks.forEach(function(t) {
      if (types.indexOf(t.type) < 0) return;
      if (self.data.completed.indexOf(t.id) >= 0) return;
      if (!self.data.counts) self.data.counts = {};
      if (t.type === 'words') {
        if (freshWord <= 0) return;
        if (wordKey && self.data.newWords.indexOf(wordKey) >= 0) return; // 同日去重
        if (wordKey) self.data.newWords.push(wordKey);
        self.data.counts[t.id] = (self.data.counts[t.id] || 0) + 1;
      } else {
        self.data.counts[t.id] = (self.data.counts[t.id] || 0) + n;
      }
      changed = true;
      if (self.data.counts[t.id] >= t.target) {
        self.data.completed.push(t.id);
        Toast.success('每日挑战完成：' + t.text);
      }
    });
    if (changed) {
      DataStore.setProgress('daily_challenge', this.data);
      this.render();
    }
  };
DailyChallenge.prototype.claimReward = function() {
    this._ensureToday();
    // 幂等 + 完成校验：已领取/未全部完成时拒绝，防止跨午夜误点白拿、双击连领、多 tab 重复领
    if (this.data.claimed) return;
    if (!this.data.completed || this.data.completed.length < (this.data.tasks || []).length) return;
    this.data.claimed = true;
    DataStore.setProgress('daily_challenge', this.data);
    if (window.app && window.app.gamification) {
      window.app.gamification.addPoints(50);
    }
    Toast.success('🎉 领取奖励：+50 积分！');
    this.render();
  };
  return DailyChallenge;
})();

// ==================== 打卡日历 ====================
var CalendarModule = (function() {
  function CalendarModule() {
    this.currentMonth = new Date().getMonth();
    this.currentYear = new Date().getFullYear();
    this.bindEvents();
    this.render();
  }
  CalendarModule.prototype.bindEvents = function() {
    var self = this;
    safeBind('cal-prev', 'click', function() {
      self.currentMonth--;
      if (self.currentMonth < 0) { self.currentMonth = 11; self.currentYear--; }
      self.render();
    });
    safeBind('cal-next', 'click', function() {
      self.currentMonth++;
      if (self.currentMonth > 11) { self.currentMonth = 0; self.currentYear++; }
      self.render();
    });
    // 补签：点击漏签(cal-missed)日期
    safeBind('calendar-grid', 'click', function(e) {
      var cell = e.target.closest ? e.target.closest('.cal-day.cal-missed') : null;
      if (cell) self.makeupCheckin(cell.getAttribute('data-date'));
    });
  };
  CalendarModule.prototype.render = function() {
    var checkins = DataStore.getProgress('checkins', {});
    var monthNames = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
    document.getElementById('cal-month-label').textContent = this.currentYear + '年' + monthNames[this.currentMonth];
    var grid = document.getElementById('calendar-grid');
    var firstDay = new Date(this.currentYear, this.currentMonth, 1).getDay();
    var daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
    var html = '';
    var dayNames = ['日','一','二','三','四','五','六'];
    dayNames.forEach(function(d) { html += '<div class="cal-header">' + d + '</div>'; });
    var today = getLocalDateStr();
    for (var i = 0; i < firstDay; i++) html += '<div class="cal-day empty"></div>';
    for (var d = 1; d <= daysInMonth; d++) {
      var dateStr = this.currentYear + '-' + String(this.currentMonth + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      var count = checkins[dateStr] || 0;
      var level = count === 0 ? 0 : (count <= 5 ? 1 : (count <= 15 ? 2 : 3));
      var isToday = dateStr === today;
      var missed = (!count && dateStr < today) ? ' cal-missed' : '';
      html += '<div class="cal-day cal-dot-' + level + (isToday ? ' today' : '') + missed + '" data-date="' + dateStr + '" title="' + dateStr + (missed ? '：漏签，点击可用补签卡补签' : ': ' + count + '词') + '">' + d + '</div>';
    }
    grid.innerHTML = html;
  };
  // 补签：消耗 1 张补签卡，把漏签日期记 1 词并刷新相关视图
  CalendarModule.prototype.makeupCheckin = function(dateStr) {
    if (!dateStr || dateStr >= getLocalDateStr()) return;
    var checkins = DataStore.getProgress('checkins', {});
    if (checkins[dateStr] > 0) return;
    var items = window.app && window.app.itemSystem;
    if (!items || items.count('renew') <= 0) {
      Toast.warning('没有补签卡，可到「道具商店」购买（30 积分/张）');
      return;
    }
    items.use('renew');
    checkins[dateStr] = (checkins[dateStr] || 0) + 1;
    DataStore.setProgress('checkins', checkins);
    this.render();
    Toast.success('已补签 ' + dateStr + '，补签卡 -1');
    if (window.app) {
      if (window.app.analysisModule) window.app.analysisModule.render();
      if (window.app.chartModule) window.app.chartModule.render();
      if (window.app.updateGlobalStats) window.app.updateGlobalStats();
    }
  };
  CalendarModule.prototype.markToday = function(count) {
    var checkins = DataStore.getProgress('checkins', {});
    var today = getLocalDateStr();
    checkins[today] = (checkins[today] || 0) + count;
    DataStore.setProgress('checkins', checkins);
    this.render();
  };
  return CalendarModule;
})();

// ==================== 学习图表 ====================
var ChartModule = (function() {
  function ChartModule() { this.render(); }
  ChartModule.prototype.render = function() {
    var canvas = document.getElementById('learning-chart');
    if (!canvas) return;
    // DPR 适配 + 按容器实际宽度绘制，避免拉伸模糊
    var dpr = window.devicePixelRatio || 1;
    var cssW = canvas.clientWidth || 600;
    var cssH = Math.round(cssW * 250 / 600);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    // 主题色：跟随亮/暗主题和自定义主题色
    var cs = getComputedStyle(document.documentElement);
    function color(name, fallback) { var v = cs.getPropertyValue(name).trim(); return v || fallback; }
    var sage = color('--sage', '#547A67');
    var sageDeep = color('--sage-deep', '#3D5C4D');
    var accent = color('--coral', '#FF8A65');
    var accentDeep = color('--coral-deep', '#E67A58');
    var textColor = color('--text', '#444');
    var textTertiary = color('--text-tertiary', '#8A8A8A');
    var gridColor = color('--border', '#E5E2DC');
    // 使用应用字体，文字更清晰；x 坐标取整避免半像素模糊
    var fontFamily = color('--font-primary', "'Inter', 'Microsoft YaHei', sans-serif");
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    function drawText(text, x, y, css, style) {
      ctx.font = css + ' ' + fontFamily;
      ctx.fillStyle = style;
      ctx.fillText(text, Math.round(x), Math.round(y));
    }

    var checkins = DataStore.getProgress('checkins', {});
    var days = [];
    var today = new Date();
    for (var i = 6; i >= 0; i--) {
      var d = new Date(today);
      d.setDate(d.getDate() - i);
      var dateStr = getLocalDateStr(d);
      days.push({ label: ['日','一','二','三','四','五','六'][d.getDay()], date: dateStr.slice(5), count: checkins[dateStr] || 0, isToday: i === 0 });
    }
    var total = days.reduce(function(s, x) { return s + x.count; }, 0);
    var totalEl = document.getElementById('chart-week-total');
    if (totalEl) totalEl.textContent = '近 7 天共 ' + total + ' 词';

    var padTop = 28, padBottom = 40;
    var chartTop = padTop, chartBottom = cssH - padBottom;
    var slotW = cssW / 7;
    var barW = Math.min(slotW * 0.42, 34);
    var maxCount = Math.max.apply(null, days.map(function(d) { return d.count; })) || 1;
    var maxBarH = chartBottom - chartTop - 4;

    // 圆角顶部柱体（兼容不支持 roundRect 的浏览器）
    function roundedTopBar(x, y, w, h, r) {
      if (h <= 0) return;
      r = Math.min(r, w / 2, h);
      ctx.beginPath();
      ctx.moveTo(x, y + h);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h);
      ctx.closePath();
    }

    days.forEach(function(d, i) {
      var cx = slotW * i + slotW / 2;
      var barH = d.count > 0 ? Math.max(4, (d.count / maxCount) * maxBarH) : 0;
      var y = chartBottom - barH;
      if (barH > 0) {
        var g = ctx.createLinearGradient(0, y, 0, chartBottom);
        if (d.isToday) { g.addColorStop(0, accent); g.addColorStop(1, accentDeep); }
        else { g.addColorStop(0, sage); g.addColorStop(1, sageDeep); }
        ctx.fillStyle = g;
        roundedTopBar(cx - barW / 2, y, barW, barH, 5);
        ctx.fill();
      } else {
        // 没学习的日子画一条浅色基线
        ctx.fillStyle = gridColor;
        roundedTopBar(cx - barW / 2, chartBottom - 3, barW, 3, 1.5);
        ctx.fill();
      }
      // 数值（0 不画，避免和基线挤在一起）
      if (d.count > 0) drawText(d.count, cx, y - 8, 'bold 16px', d.isToday ? accent : sage);
      // 星期（今天高亮）
      drawText(d.label, cx, cssH - 22, '14px', d.isToday ? accent : textTertiary);
      // 日期（今天显示"今天"）
      drawText(d.isToday ? '今天' : d.date, cx, cssH - 6, '13px', d.isToday ? accent : textColor);
    });

    // 空状态提示
    if (total === 0) {
      drawText('本周还没有学习记录，去背几个单词吧', cssW / 2, (chartTop + chartBottom) / 2, '16px', textTertiary);
    }
  };
  return ChartModule;
})();

// ==================== 学习数据分析 ====================
var AnalysisModule = (function() {
  function AnalysisModule() { this.render(); }
  AnalysisModule.prototype.render = function() {
    var checkins = DataStore.getProgress('checkins', {});
    var progress = DataStore.getProgress('word_progress', {});
    var wordProgress = DataStore.getProgress('word_progress', {});
    var totalWords = Object.keys(wordProgress).filter(function(k) { return wordProgress[k].status === 'mastered'; }).length;
    var learnedWords = Object.keys(wordProgress).filter(function(k) { return !!wordProgress[k].status; }).length;
    var today = getLocalDateStr();
    var todayCount = checkins[today] || 0;
    var streak = calculateStreak(checkins);
    document.getElementById('rpt-today').textContent = todayCount;
    document.getElementById('rpt-streak').textContent = streak;
    document.getElementById('rpt-total-words').textContent = totalWords;
    var totalDays = Object.keys(checkins).filter(function(k) { return checkins[k] > 0; }).length;
    document.getElementById('rpt-total-days').textContent = totalDays;
    this.renderAnalysis(checkins, totalWords, streak, learnedWords);
  };
  AnalysisModule.prototype.renderAnalysis = function(checkins, totalWords, streak, learnedWords) {
    var entries = Object.entries(checkins).sort(function(a, b) { return b[0].localeCompare(a[0]); });
    var weekWords = 0;
    var now = new Date();
    for (var i = 0; i < 7; i++) {
      var d = new Date(now);
      d.setDate(d.getDate() - i);
      var dateStr = getLocalDateStr(d);
      weekWords += checkins[dateStr] || 0;
    }
    document.getElementById('analysis-week').textContent = weekWords + ' 词';
    document.getElementById('analysis-week-desc').textContent = weekWords > 50 ? '表现优秀！' : '继续加油';
    var base = learnedWords || totalWords; // 掌握率分母=已学过词数（任一状态），而非固定 100
    var masteryRate = base > 0 ? Math.round(totalWords / base * 100) : 0;
    if (masteryRate > 100) masteryRate = 100;
    document.getElementById('analysis-mastery').textContent = masteryRate + '%';
    document.getElementById('analysis-mastery-desc').textContent = masteryRate > 50 ? '掌握良好' : '还需努力';
document.getElementById('analysis-best-time').textContent = '上午';
    document.getElementById('analysis-best-time-desc').textContent = '根据学习数据推测';
    // 薄弱环节：按错题来源统计（真实数据，替代原静态文案）
    var mistakeSrc = {
      word: { name: '词汇', icon: 'translate' },
      spelling: { name: '拼写', icon: 'spellcheck' },
      grammar: { name: '语法', icon: 'edit' },
      reading: { name: '阅读', icon: 'article' },
      listening: { name: '听力', icon: 'headphones' },
      listen: { name: '听力', icon: 'headphones' },
      context: { name: '语境', icon: 'text' },
      pk: { name: 'PK', icon: 'trophy' },
      speak: { name: '口语', icon: 'mic' }
    };
    var bySource = {};
    var mistakes = DataStore.getProgress('mistakes', []);
    mistakes.forEach(function(m) { if (m && m.source) bySource[m.source] = (bySource[m.source] || 0) + 1; });
    var topKey = null, topCnt = 0;
    Object.keys(bySource).forEach(function(k) {
      if (bySource[k] > topCnt) { topCnt = bySource[k]; topKey = k; }
    });
    if (topKey && mistakeSrc[topKey]) {
      document.getElementById('analysis-weak').textContent = mistakeSrc[topKey].name;
      document.getElementById('analysis-weak-desc').textContent = '错题 ' + topCnt + ' 题，建议针对性强化';
    } else {
      document.getElementById('analysis-weak').textContent = '—';
      document.getElementById('analysis-weak-desc').textContent = '暂无错题记录';
    }
    
    // 学习建议
    var tipsList = document.getElementById('analysis-tips-list');
    if (tipsList) {
      var tips = [];
      if (weekWords < 30) tips.push('本周学习量较少，建议每天至少学习10个单词');
      if ((learnedWords || totalWords) < 100) tips.push('词汇量较少，建议从基础词汇开始');
      if (streak < 3) tips.push('连续打卡天数较少，坚持每天学习效果更好');
      if (masteryRate < 30) tips.push('掌握率较低，建议多复习已学单词');
      if (tips.length === 0) tips.push('学习状态良好，继续保持！');
      tipsList.innerHTML = tips.map(function(t) { return '<li>' + t + '</li>'; }).join('');
    }
  };
  return AnalysisModule;
})();

// ==================== 智能复习计划 ====================
var SmartReview = (function() {
  function SmartReview() { this.render(); }
  SmartReview.prototype.render = function() {
    var progress = DataStore.getProgress('word_progress', {});
    var today = getLocalDateStr();
    var total = 0, due = 0;
    Object.keys(progress).forEach(function(key) {
      var p = progress[key];
      if (p && p.status !== 'mastered') {
        total++;
        if (p.nextReview && p.nextReview <= today) due++;
      }
    });
    var done = total - due;
    var pct = total > 0 ? Math.round(done / total * 100) : 0;
    var progressEl = document.getElementById('smart-review-progress');
    var barEl = document.getElementById('smart-review-bar');
    if (progressEl) progressEl.textContent = done + '/' + total + ' (' + pct + '%)';
    if (barEl) barEl.style.width = pct + '%';
  };
  return SmartReview;
})();
// ==================== 主应用 ====================
function App() {
  var self = this;
  function init(name, fn) { try { return fn(); } catch(e) { console.warn('Module init failed:', name, e.message); return null; } }
  this.wordModule = init('WordModule', function() { return new WordModule(); });
  this.storyModule = init('StoryModule', function() { return new StoryModule(); });
  this.phoneticModule = init('PhoneticModule', function() { return new PhoneticModule(); });
  this.speakModule = init('SpeakModule', function() { return new SpeakModule(); });
  this.spellingModule = init('SpellingModule', function() { return new SpellingModule(); });
  this.mistakesModule = init('MistakeModule', function() { return new MistakeModule(); });
  this.grammarModule = init('GrammarModule', function() { return new GrammarModule(); });
  this.readingModule = init('ReadingModule', function() { return new ReadingModule(); });
  this.listeningModule = init('ListeningModule', function() { return new ListeningModule(); });
  this.pkModule = init('PKModule', function() { return new PKModule(); });
  this.favoritesModule = init('FavoritesModule', function() { return new FavoritesModule(); });
  this.searchModule = init('SearchModule', function() { return new SearchModule(); });
  this.contextModule = init('ContextModule', function() { return new ContextModule(); });
  this.pomodoroModule = init('PomodoroModule', function() { return new PomodoroModule(); });
  this.mistakeTrainModule = init('MistakeTrainModule', function() { return new MistakeTrainModule(); });
  this.gamification = init('GamificationSystem', function() { return new GamificationSystem(); });
  this.dailyChallenge = init('DailyChallenge', function() { return new DailyChallenge(); });
  this.calendarModule = init('CalendarModule', function() { return new CalendarModule(); });
  this.chartModule = init('ChartModule', function() { return new ChartModule(); });
  this.analysisModule = init('AnalysisModule', function() { return new AnalysisModule(); });
  this.smartReview = init('SmartReview', function() { return new SmartReview(); });
  this.itemSystem = init('ItemSystem', function() { return new ItemSystem(); });
  this.themeShop = init('ThemeShop', function() { return new ThemeShop(); });
  this.listenAlongModule = init('ListenAlongModule', function() { return new ListenAlongModule(); });
  this.badgeSystem = init('BadgeSystem', function() { return new BadgeSystem(); });
  this.dailyPlanModule = init('DailyPlanModule', function() { return new DailyPlanModule(); });
  this.dashboardModule = init('DashboardModule', function() { return new DashboardModule(); });
  this.aiCoachModule = init('AiCoachModule', function() { return new AiCoachModule(); });
  this.aiChatModule = init('AiChatModule', function() { return new AiChatModule(); });
  this.assessmentModule = init('AssessmentModule', function() { return new AssessmentModule(); });
  this.onboardingModule = init('OnboardingModule', function() { return new OnboardingModule(); });
  this.initNav();
  this.currentTab = 'home';
  this.updateGlobalStats();
  this.bindSettings();
}
App.prototype.initNav = function() {
  var self = this;
  document.querySelectorAll('.nav-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      self.showTab(btn.dataset.tab);
    });
  });
  document.querySelectorAll('.stat-items-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      self.showTab('items');
    });
  });
  // 导航分组：标题点击折叠/展开（状态持久化），移动到隐藏域的同名按钮自动展开所在组
  this._navGroups = {};
  document.querySelectorAll('.nav-group').forEach(function(group) {
    var title = group.querySelector('.nav-group-title');
    var id = group.id || '';
    if (!title) return;
    title.addEventListener('click', function() {
      var collapsed = group.classList.toggle('collapsed');
      title.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      if (id) {
        var state = DataStore.getProgress('nav_collapsed', {}) || {};
        if (collapsed) state[id] = true; else delete state[id];
        DataStore.setProgress('nav_collapsed', state);
      }
    });
    self._navGroups[id] = group;
  });
// 恢复折叠状态
  var saved = DataStore.getProgress('nav_collapsed', {}) || {};
  document.querySelectorAll('.nav-group').forEach(function(group) {
    if (saved[group.id]) {
      group.classList.add('collapsed');
      var t = group.querySelector('.nav-group-title');
      if (t) t.setAttribute('aria-expanded', 'false');
    }
  });

  // ---- 移动端抽屉导航：汉堡按钮开合 + 遮罩关闭 + 选中后自动收起 ----
  this._initMobileDrawer();
};
App.prototype._initMobileDrawer = function() {
  var self = this;
  var sidebar = document.querySelector('.sidebar');
  var scrim = document.querySelector('.sidebar-scrim');
  var menuBtn = document.getElementById('btn-menu');
  this._drawerEls = { sidebar: sidebar, scrim: scrim, btn: menuBtn };
  if (!sidebar) return;
  var close = function() {
    sidebar.classList.remove('open');
    sidebar.setAttribute('data-open', 'false');
    if (scrim) scrim.classList.remove('show');
    if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
    if (this && this.completeQ) this.completeQ('.drawer-open');
  };
  if (menuBtn) menuBtn.addEventListener('click', function() {
    var isOpen = sidebar.classList.contains('open');
    if (isOpen) close();
    else {
      sidebar.classList.add('open');
      sidebar.setAttribute('data-open', 'true');
      if (scrim) scrim.classList.add('show');
      if (menuBtn) menuBtn.setAttribute('aria-expanded', 'true');
    }
  });
  if (scrim) scrim.addEventListener('click', close);
};
App.prototype.showTab = function(tab) {
  this.currentTab = tab;
  // 移动端：选中后自动收起抽屉导航
  if (this._drawerEls && this._drawerEls.sidebar) {
    this._drawerEls.sidebar.classList.remove('open');
    if (this._drawerEls.scrim) this._drawerEls.scrim.classList.remove('show');
  }
  document.querySelectorAll('.nav-btn').forEach(function(b) { b.classList.toggle('active', b.dataset.tab === tab); });
  document.querySelectorAll('.page').forEach(function(p) { p.classList.toggle('active', p.id === 'page-' + tab); });
  // 目标按钮所在的折叠分组自动展开
  var activeBtn = document.querySelector('.nav-btn[data-tab="' + tab + '"]');
  if (activeBtn) {
    var group = activeBtn.closest('.nav-group');
    if (group && group.classList.contains('collapsed')) {
      group.classList.remove('collapsed');
      var t = group.querySelector('.nav-group-title');
      if (t) t.setAttribute('aria-expanded', 'true');
      var state = DataStore.getProgress('nav_collapsed', {}) || {};
      if (group.id) { delete state[group.id]; DataStore.setProgress('nav_collapsed', state); }
    }
  }
  // 首页：进入时刷新数据
  if (tab === 'home' && this.dashboardModule) this.dashboardModule.render();
  // AI 助手：进入时刷新报告与建议
  if (tab === 'ai' && this.aiCoachModule) this.aiCoachModule.render();
  // 词文串学：首次进入自动生成一篇短文
  if (tab === 'story' && this.storyModule && !this.storyModule.generated) this.storyModule.generate();
// 成就徽章：进入时先检查有没有新解锁的，再刷新渲染
  if (tab === 'badges' && this.badgeSystem) { this.badgeSystem.checkAll(); this.badgeSystem.render(); }
  // 每日计划：进入背单词页刷新卡片
  if (tab === 'word' && this.dailyPlanModule) this.dailyPlanModule.render();
  // 道具页：进入时刷新背包/商店/主题（购买后积分可能变化）
  if (tab === 'items') {
    if (this.itemSystem) { this.itemSystem.renderBag(); this.itemSystem.renderShop(); }
    if (this.themeShop) this.themeShop.render();
  }
  // 设置页：进入时按实际宽度重绘图表（隐藏状态下宽高为 0）
  if (tab === 'settings') {
    if (this.chartModule) this.chartModule.render();
    if (this.analysisModule) this.analysisModule.render();
  }
  // 随声听：离开页面停止播放
  if (tab !== 'listen-along' && this.listenAlongModule) this.listenAlongModule.stop();
};
App.prototype.updateGlobalStats = function() {
  var gami = this.gamification.getStats();
  document.getElementById('stat-level').textContent = 'Lv.' + gami.level;
  document.getElementById('stat-points').textContent = gami.points;
  document.getElementById('stat-streak').textContent = calculateStreak(DataStore.getProgress('checkins', {}));
var progress = DataStore.getProgress('word_progress', {});
  var mastered = Object.keys(progress).filter(function(k) { var p = progress[k]; return p && p.status === 'mastered'; }).length;
  document.getElementById('stat-words').textContent = mastered;
};
// ==================== 主动回忆 ====================
App.prototype.triggerRecall = function(currentWord) {
  // 只在"主动回忆模式"开启时用
  if (!DataStore.getProgress('active_recall', false)) return false;
  var progress = DataStore.getProgress('word_progress', {});
  var today = getLocalDateStr();
  var cats = DataStore.getDefaultWords().categories || [];
  // 一次性建立「词库序号+单词 → 词对象」哈希，待复习只按已学进度反查，
  // 避免每次翻牌全量遍历词库（扩容后 12 万词）→ 卡顿
  if (!this._recallIndex) {
    var idx = {};
    var total = 0;
    cats.forEach(function(cat, ci) {
      if (cat && cat.words) total += cat.words.length;
      (cat.words || []).forEach(function(w) {
        if (!w || !w.word) return;
        idx[ci + '\u0001' + String(w.word).toLowerCase()] = w;
      });
    });
    this._recallIndex = idx;
    this._recallIndexCount = total;
  }
  var split = function(k) {
    // key 是 "单词-词库序号"（如 apple-3），但单词本身可能含 "-"（如 long-term）。
    // 从后往前尝试匹配词库序号，避免把单词内的连字符当成分隔符
    for (var p = k.lastIndexOf('-'); p > 0; p = k.lastIndexOf('-', p - 1)) {
      var tail = k.slice(p + 1);
      if (/^\d+$/.test(tail)) return { word: k.slice(0, p), ci: parseInt(tail, 10) };
    }
    return null;
  };
  var pool = [];
  var self = this;
  Object.keys(progress).forEach(function(k) {
    var p = progress[k];
    if (!p || p.status === 'mastered' || !p.nextReview || p.nextReview > today) return;
    var sp = split(k);
    if (!sp) return;
    var w = self._recallIndex[sp.ci + '\u0001' + String(sp.word).toLowerCase()];
    if (w) pool.push(w);
  });
  var pick = currentWord || null;
  if (!pick) pick = pool[Math.floor(Math.random() * pool.length)];
  if (!pick) {
    if (this.wordModule && this.wordModule.getCurrentWords().length) {
      var ws = this.wordModule.getCurrentWords();
      pick = ws[Math.floor(Math.random() * ws.length)];
    } else { return false; }
  }
  this._recallWord = pick;
  var modal = document.getElementById('modal-recall');
  if (!modal) return false;
  document.getElementById('recall-prompt').textContent = '看到这个释义，回忆出对应的英文单词：';
  document.getElementById('recall-meaning').textContent = this._recallWord.chinese || '';
  var input = document.getElementById('recall-input');
  if (input) { input.value = ''; input.focus(); }
  var result = document.getElementById('recall-result');
  if (result) result.classList.add('hidden');
  modal.classList.remove('hidden');
  return true;
};
App.prototype.showRecallAnswer = function() {
  if (!this._recallWord) return;
  var result = document.getElementById('recall-result');
  if (result) {
    result.classList.remove('hidden');
    result.style.background = 'var(--warning-light)';
    result.style.color = 'var(--text)';
    result.textContent = '答案：' + (this._recallWord.word || '');
  }
};
App.prototype.checkRecall = function() {
  if (!this._recallWord) return;
  var input = document.getElementById('recall-input');
  var result = document.getElementById('recall-result');
  if (!input) return;
  var userAns = input.value.trim().toLowerCase();
  if (!userAns) { Toast.warning('请输入答案'); return; }
  if (!result) return;
  result.classList.remove('hidden');
  if (userAns === (this._recallWord.word || '').toLowerCase()) {
    result.style.background = 'var(--success-light)';
    result.style.color = 'var(--success)';
    result.textContent = '✓ 正确！翻牌不再弹窗';
    // 答对：本次翻牌放行（避免关掉弹窗后翻牌又弹一次）
    if (this.wordModule) this.wordModule._recallPassed = true;
  } else {
    result.style.background = 'var(--danger-light)';
    result.style.color = 'var(--danger)';
    result.textContent = '✗ 正确答案：' + (this._recallWord.word || '');
  }
};
// ==================== 活动桥接（业务模块 → 游戏化 + 每日挑战 + 错题本 + 签到） ====================
App.prototype.recordActivity = function(type, count, isNewWord, wordKey) {
  try {
    if (this.gamification) {
      var n = count || 1;
      for (var i = 0; i < n; i++) this.gamification.recordActivity(type);
    }
    if (this.dailyChallenge) this.dailyChallenge.updateProgress(type, count, isNewWord, wordKey);
    if (this.badgeSystem) this.badgeSystem.checkAll();
    this.updateGlobalStats();
  } catch(e) { /* 桥接失败不影响业务 */ }
};
App.prototype.addMistake = function(w, source) {
  if (!w) return;
  try {
    var mistakes = DataStore.getProgress('mistakes', []);
    var entry = {
      word: w.word, phonetic: w.phonetic || '', pos: w.pos || '',
      chinese: w.chinese || '', example: w.example || '',
      source: source || 'unknown', date: getLocalDateStr(),
      reviewed: false
    };
    var exists = false;
    for (var i = 0; i < mistakes.length; i++) {
      var m = mistakes[i];
      if (m.word === entry.word && m.date === entry.date) {
        exists = true;
        // 当天再次答错：重置已复习标记，避免去重把"当天复发错题"吞掉
        if (m.reviewed) {
          m.reviewed = false;
          m.source = entry.source;
          DataStore.setProgress('mistakes', mistakes);
          if (this.mistakesModule) this.mistakesModule.renderList();
        }
        break;
      }
    }
    if (!exists) {
      mistakes.push(entry);
      DataStore.setProgress('mistakes', mistakes);
      if (this.mistakesModule) this.mistakesModule.renderList();
    }
  } catch(e) {}
};
App.prototype.markCheckin = function(count) {
  if (!count || count <= 0) return;
  try { if (this.calendarModule) this.calendarModule.markToday(count); } catch(e) {}
};
App.prototype.bindSettings = function() {
  var self = this;
  safeBind('btn-save-progress', 'click', function() { self.saveProgress(); });
  safeBind('btn-export-data', 'click', function() { self.exportData(); });
safeBind('btn-import-data', 'click', function() { self.importData(); });
  safeBind('btn-open-logs', 'click', function() { self.openLogs(); });
  // 事件委托兜底：即使旧缓存 HTML 里按钮绑定时序异常，点击同样生效
  // （但依赖按钮 ID 存在；HTML 必定包含该按钮，旧版也有）
  var settingsEl = document.getElementById('page-settings');
  var logBtn = document.getElementById('btn-open-logs');
  if (logBtn && !logBtn._logsBound) {
    logBtn._logsBound = true;
    logBtn.addEventListener('click', function() { self.openLogs(); });
  }
  safeBind('logs-refresh', 'click', function() { self.openLogs(); });
  safeBind('logs-close', 'click', function() {
    try { document.getElementById('modal-logs').classList.add('hidden'); } catch(e) {}
  });
  safeBind('btn-reset-data', 'click', function() { self.resetData(); });
  // 之前漏绑的设置页按钮（导出单词本/错题本、生成分享卡片、保存分享图片）
  safeBind('btn-export-fav', 'click', function() { self.exportFavorites(); });
  safeBind('btn-export-mistakes', 'click', function() { self.exportMistakes(); });
  safeBind('btn-share-card', 'click', function() { self.generateShareCard(); });
  safeBind('btn-download-card', 'click', function() { self.downloadShareCard(); });
  // 主动回忆模式开关：只持久化，下次背词页生效
  var recallToggle = document.getElementById('toggle-active-recall');
  if (recallToggle) {
    recallToggle.checked = DataStore.getProgress('active_recall', false) === true;
    recallToggle.addEventListener('change', function() {
      DataStore.setProgress('active_recall', recallToggle.checked);
      Toast.info(recallToggle.checked ? '已开启主动回忆模式' : '已关闭主动回忆模式');
    });
  }
  // 自适应复习间隔开关：认识=按表推进；有点印象=间隔减半；不认识=次日重来（关闭恢复固定间隔）
  var adaptiveToggle = document.getElementById('toggle-adaptive-review');
  if (adaptiveToggle) {
    adaptiveToggle.checked = DataStore.getProgress('adaptive_review', true) !== false;
    adaptiveToggle.addEventListener('change', function() {
      DataStore.setProgress('adaptive_review', adaptiveToggle.checked);
      Toast.info(adaptiveToggle.checked ? '已开启自适应复习间隔' : '已关闭自适应复习间隔（恢复固定艾宾浩斯间隔）');
    });
  }
  // 自动保存开关：开启后按自定义间隔自动备份进度（默认 5 分钟，范围 1-1440）
  var autoSaveToggle = document.getElementById('auto-save');
  var autoSaveIntervalInput = document.getElementById('auto-save-interval');
  var autoSaveTimer = null;
  function getAutoSaveMinutes() {
    var v = parseInt(autoSaveIntervalInput ? autoSaveIntervalInput.value : '5', 10);
    if (isNaN(v) || v < 1 || v > 1440) return 5;
    return v;
  }
  function startAutoSave() {
    if (autoSaveTimer) clearInterval(autoSaveTimer);
    autoSaveTimer = setInterval(function() {
      try { self.saveProgress(true); } catch(e) {}
    }, getAutoSaveMinutes() * 60 * 1000);
  }
  function stopAutoSave() {
    if (autoSaveTimer) { clearInterval(autoSaveTimer); autoSaveTimer = null; }
  }
  if (autoSaveToggle) {
    autoSaveToggle.checked = DataStore.getProgress('auto_save_enabled', true) !== false;
    if (autoSaveIntervalInput) autoSaveIntervalInput.value = DataStore.getProgress('auto_save_interval', 5);
    if (autoSaveToggle.checked) startAutoSave();
    autoSaveToggle.addEventListener('change', function() {
      var on = autoSaveToggle.checked;
      DataStore.setProgress('auto_save_enabled', on);
      if (on) { startAutoSave(); Toast.success('自动保存已开启（每 ' + getAutoSaveMinutes() + ' 分钟）'); }
      else { stopAutoSave(); Toast.info('自动保存已关闭'); }
    });
    if (autoSaveIntervalInput) {
      autoSaveIntervalInput.addEventListener('change', function() {
        var mins = getAutoSaveMinutes();
        this.value = mins;
        DataStore.setProgress('auto_save_interval', mins);
        if (autoSaveToggle.checked) startAutoSave();
        Toast.success('自动保存间隔已设为 ' + mins + ' 分钟');
      });
    }
  }
  // 朗读声音设置：预设声音（按系统 voices 归类男/女声）+ 语速，所有朗读统一生效
  var voiceSelect = document.getElementById('voice-select');
  var voiceRateSelect = document.getElementById('voice-rate');
  if (voiceSelect && ('speechSynthesis' in window)) {
    var voiceSettings = SpeechUtil.getSettings();
    // 存了具体声音 → 朗读必须用它：默认不进入「本地即时语音」（即时模式走 server SAPI，
    // 不认所选声音，会让"在线语音切换"失效——选了什么音色读出来都是本地声）
    if (voiceSettings.voiceName) {
      voiceSettings.instant = false;
      Storage.set('voice_instant', '0');
    }
    var MALE_KEYS = ['david','mark','guy','james','george','daniel','alex','fred','peter','steffan','michael','samuel','ryan','thomas','aaron','oliver','toby','will','william','sebastian','simon','steven','victor','paul','roman','male'];
    var FEMALE_KEYS = ['zira','aria','jenny','samantha','susan','hazel','heera','neerja','female','laura','linda','lisa','michelle','natasha','nicole','rachel','rebecca','ruby','sally','victoria','hannah','emma','olivia','ava','sophia','mia','charlotte','amelia','jessica','amy','kate','karen','sarah','anna','megan','julia','lily','grace','lucy','joanna','kimberly','libby','lydia','mary','millie','molly','niamh','piper','serena','sonia','tessa','tina','wendy'];
    function guessVoiceGender(v) {
      var n = (v.name || '').toLowerCase();
      for (var i = 0; i < MALE_KEYS.length; i++) if (n.indexOf(MALE_KEYS[i]) !== -1) return '男声';
      for (var j = 0; j < FEMALE_KEYS.length; j++) if (n.indexOf(FEMALE_KEYS[j]) !== -1) return '女声';
      return '';
    }
    function voiceLabel(v) {
      var lang = (v.lang || '').toUpperCase();
      var g = guessVoiceGender(v);
      return v.name + (g ? '（' + g + (lang ? ' · ' + lang : '') + '）' : (lang ? '（' + lang + '）' : ''));
    }
function fillVoiceOptions() {
      var voices = window.speechSynthesis.getVoices() || [];
      var cur = voiceSelect.value;
      var html = '<option value="">系统默认（自动选本地语音）</option>'
        + '<option value="__online_google__">在线自然女声（Google 合成，需网络）</option>';
      voiceSelect.innerHTML = html;
      var enVoices = [];
      for (var i = 0; i < voices.length; i++) {
        if ((voices[i].lang || '').toLowerCase().indexOf('en') === 0) enVoices.push(voices[i]);
      }
      var base = enVoices.length ? enVoices : voices;
      // 本地离线声音排前面，在线声音（Google / Online / Natural 等）放最后并标注，
      // 避免误选在线声后每次点击朗读都要走服务器合成而延迟
      var local = [], online = [];
      for (var m = 0; m < base.length; m++) {
        (SpeechUtil._isOnlineVoice(base[m]) ? online : local).push(base[m]);
      }
      var pool = local.concat(online);
      pool.sort(function(a, b) { return (a.name || '').localeCompare(b.name || ''); });
      for (var k = 0; k < pool.length; k++) {
        var opt = document.createElement('option');
        opt.value = pool[k].name;
        opt.textContent = voiceLabel(pool[k]) + (SpeechUtil._isOnlineVoice(pool[k]) ? '（在线，点击朗读会慢）' : '');
        voiceSelect.appendChild(opt);
      }
      if (cur) voiceSelect.value = cur;
      else if (voiceSettings.voiceName) voiceSelect.value = voiceSettings.voiceName;
    }
    fillVoiceOptions();
    // 探测本地 server 是否可达：不可达时自动关闭「本地即时语音」默认值，
    // 改用浏览器语音（修复 GitHub Pages/手机场景下朗读必弹"server 未运行"红错的根因）
    SpeechUtil._probeServer();
    // Chrome/Firefox 的 voices 列表是异步加载的，加载完成后重新填充
    window.speechSynthesis.onvoiceschanged = fillVoiceOptions;
    voiceSelect.addEventListener('change', function() {
      var name = this.value;
      voiceSettings.voiceName = name;
      Storage.set('voice_name', name);
      // 统一经 TTSManager 记录所选声音（localStorage tts_voice + 全局 voice），
      // 保证朗读/试听立即使用刚选的声音
      TTSManager.setVoice(name);
      // 选了具体声音 → 退出「本地即时语音」，让所选声音真正生效（朗读与试听都用它）；
      // 清掉本会话"在线不可用"标记，给新选择一次尝试机会。
if (name) {
        voiceSettings.instant = false;
        Storage.set('voice_instant', '0');
        if (voiceInstant) voiceInstant.checked = false;
        SpeechUtil._onlineBroken = false;
        SpeechUtil._onlineBrokenAt = undefined;
        // 切换声音是明确的用户意图：清掉旧链路的"在线尝试挂起"标记，
        // 否则 _speakTTS 开头判定上次在线声未 START 会直接 _markOnlineBroken，
        // 新选的在线声会在 15s 冷却内被跳过，表现成"切了在线声还是没声音/用旧声"
        SpeechUtil._onlineAttemptActive = false;
        SpeechUtil._onlineStarted = false;
        SpeechUtil._burstMode = null;
        SpeechUtil._burstUntil = 0;
      }
      SpeechUtil.updateSettings(voiceSettings);
      // 切换声音后重新预热新的在线声：primeVoices 每会话只预热一次（_primeDone），
      // 换声后必须重置，否则新声音冷连接，首次朗读会慢、甚至被超时降级成别的音色，
      // 表现为"切了声音没变化"。
      if (name) {
        if (SpeechUtil._primeGuard) { clearTimeout(SpeechUtil._primeGuard); SpeechUtil._primeGuard = null; }
        SpeechUtil._primeDone = false;
        SpeechUtil._primingBusy = false;
        SpeechUtil.primeVoices();
      }
      var chosen = null;
      try {
        var vs = window.speechSynthesis.getVoices() || [];
        for (var vi = 0; vi < vs.length; vi++) if (vs[vi].name === name) { chosen = vs[vi]; break; }
      } catch(e) {}
      if (name === '__online_google__') Toast.success('已切换为在线自然女声（Google 合成，需网络）');
      else if (!name) Toast.success('已切换为系统默认（自动选本地语音）');
      else if (chosen && SpeechUtil._isOnlineVoice(chosen)) Toast.success('已选择在线声音（首次朗读需联网加载，可能稍慢）');
      else if (chosen) Toast.success('已选择朗读声音');
      else Toast.success('已保存声音选择（当前设备暂无此声音，将自动选用可用语音）');
    });
  }
  // 「本地即时语音」开关：勾选后朗读改走 server SAPI（离线、几乎零延迟）
  var voiceInstant = document.getElementById('voice-instant');
  if (voiceInstant) {
    voiceInstant.checked = !!(voiceSettings && voiceSettings.instant);
    voiceInstant.addEventListener('change', function() {
      voiceSettings.instant = this.checked;
      Storage.set('voice_instant', this.checked ? '1' : '0');
      if (this.checked) {
        // 回到本地即时语音：清掉具体声音选择（SAPI 朗读不认所选声音，留着会误导）
        voiceSettings.voiceName = '';
        Storage.set('voice_name', '');
        TTSManager.setVoice('');
        if (voiceSelect) voiceSelect.value = '';
      }
      SpeechUtil.updateSettings(voiceSettings);
      Toast.success(this.checked ? '已切换为本地即时语音（零延迟，不依赖网络）' : '已切换为在线自然声（音色好，点击略有延迟）');
    });
  }
  if (voiceRateSelect) {
    voiceRateSelect.value = String(parseFloat(Storage.get('voice_rate', '')) || 0.9);
    voiceRateSelect.addEventListener('change', function() {
      Storage.set('voice_rate', this.value);
      var s = SpeechUtil.getSettings();
      s.rate = parseFloat(this.value) || 0.9;
      TTSManager.rate = s.rate;
      SpeechUtil.updateSettings(s);
    });
  }
  var voicePitchSelect = document.getElementById('voice-pitch');
  if (voicePitchSelect) {
    voicePitchSelect.value = String(parseFloat(Storage.get('voice_pitch', '')) || 1);
    voicePitchSelect.addEventListener('change', function() {
      Storage.set('voice_pitch', this.value);
      var s = SpeechUtil.getSettings();
      s.pitch = parseFloat(this.value) || 1;
      TTSManager.pitch = s.pitch;
      SpeechUtil.updateSettings(s);
    });
  }
  safeBind('btn-voice-test', 'click', function() {
    // 试听：必须用当前所选声音朗读。页面一律经 SpeechUtil.speak（内部最终走
    // TTSManager，切换后立即生效），禁止页面直接调 window.TTSManager.speak()
    SpeechUtil.speak('This is a voice test.', 'en-US');
  });
  // 自定义发音：上传录音（文件名即单词名），朗读该单词时优先播放
  var cvFileInput = document.getElementById('cv-file');
  var cvDirInput = document.getElementById('cv-file-dir');
  var cvList = document.getElementById('cv-list');
  if ((cvFileInput || cvDirInput) && cvList) {
    var customVoiceMap = SpeechUtil.getCustomVoice();
    var CV_BUDGET = 4 * 1024 * 1024; // dataURL 字符数的 0.75 为字节数，预算 4MB 音频
    function mapSize() {
      var total = 0;
      for (var k in customVoiceMap) total += customVoiceMap[k].length * 0.75;
      return total;
    }
    function saveCustomVoice() {
      if (!Storage.setJSON('custom_voice', customVoiceMap)) {
        // 配额失败：回退到原数据，保证列表一致
        SpeechUtil._customVoice = Storage.getJSON('custom_voice', {});
        customVoiceMap = SpeechUtil._customVoice;
        renderCVList();
        return false;
      }
      SpeechUtil._customVoice = customVoiceMap;
      return true;
    }
    function renderCVList() {
      var keys = Object.keys(customVoiceMap);
      cvList.innerHTML = '';
      if (!keys.length) {
        cvList.innerHTML = '<span style="font-size:0.8rem;color:var(--text-tertiary)">暂无自定义发音，可单独上传或用发音包批量导入</span>';
        return;
      }
      var used = Math.round(mapSize() / 1024);
      cvList.innerHTML = '<span style="font-size:0.78rem;color:var(--text-tertiary)">已导入 <b>' + keys.length + '</b> 个单词发音，共 ' + used + ' KB</span>';
      keys.sort();
      keys.forEach(function(w) {
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:var(--sp-2);background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-sm);padding:6px 10px;flex-wrap:wrap';
        var sizeKB = Math.round(customVoiceMap[w].length * 0.75 / 1024);
        row.innerHTML = '<span style="font-weight:600;font-size:0.9rem;flex:1;word-break:break-all">' + escapeHtml(w) + '</span>' +
          '<span style="font-size:0.72rem;color:var(--text-tertiary)">' + sizeKB + ' KB</span>' +
          '<button class="btn btn-sm" title="试听" data-act="play"><svg class="icon"><use href="#i-volume"/></svg></button>' +
          '<button class="btn btn-sm btn-danger" title="删除" data-act="del"><svg class="icon"><use href="#i-delete"/></svg></button>';
        row.querySelector('[data-act="play"]').addEventListener('click', function() {
          try { var a = new Audio(customVoiceMap[w]); a.play(); } catch(e) {}
        });
        row.querySelector('[data-act="del"]').addEventListener('click', function() {
          delete customVoiceMap[w];
          if (saveCustomVoice()) Toast.success('已删除 ' + w + ' 的录音');
          renderCVList();
        });
        cvList.appendChild(row);
      });
    }
    renderCVList();
    safeBind('btn-cv-add', 'click', function() { if (cvFileInput) cvFileInput.click(); });
    safeBind('btn-cv-dir', 'click', function() { if (cvDirInput) cvDirInput.click(); });
    // 批量导入发音包（文件夹）：按文件名自动映射，超出容量自动跳过
    function importAudioFiles(files, bulk) {
      if (!files || !files.length) return;
      var audioFiles = [];
      for (var i = 0; i < files.length; i++) {
        var f = files[i];
        if (f.type && f.type.indexOf('audio') === 0) audioFiles.push(f);
      }
      if (!audioFiles.length) { Toast.warning('文件夹里没有找到音频文件'); return; }
      var added = 0, skipped = 0, used = mapSize();
      audioFiles.forEach(function(f) {
        var word = f.name.replace(/\.[^.]+$/, '').trim().toLowerCase();
        if (!word || word.length > 60) { skipped++; return; }
        if (customVoiceMap[word]) { skipped++; return; }
        if (used + f.size > CV_BUDGET) { skipped++; return; }
        used += f.size;
        customVoiceMap[word] = '__PENDING__';
        added++;
      });
      if (!added) { Toast.warning('没有可导入的音频（已有相同单词或超出容量限制）'); return; }
      var pending = [];
      for (var k in customVoiceMap) if (customVoiceMap[k] === '__PENDING__') pending.push(k);
      var done = 0;
      var reader = new FileReader();
      function readNext() {
        if (done >= pending.length) {
          renderCVList();
          if (saveCustomVoice()) {
            Toast.success('成功导入 ' + added + ' 个发音' + (skipped ? '，跳过 ' + skipped + ' 个（重复或超出容量）' : ''));
          } else {
            renderCVList();
          }
          return;
        }
        var idx = done++;
        var word = pending[idx];
        var file = null;
        for (var i = 0; i < audioFiles.length; i++) {
          if (audioFiles[i].name.replace(/\.[^.]+$/, '').trim().toLowerCase() === word) { file = audioFiles[i]; break; }
        }
        if (!file) { readNext(); return; }
        var r2 = new FileReader();
        r2.onload = function() { customVoiceMap[word] = r2.result; readNext(); };
        r2.onerror = function() { delete customVoiceMap[word]; readNext(); };
        r2.readAsDataURL(file);
      }
      readNext();
    }
    if (cvFileInput) {
      cvFileInput.addEventListener('change', function() {
        var f = this.files && this.files[0];
        this.value = '';
        if (!f) return;
        if (f.size > 1024 * 1024) { Toast.warning('单文件不能超过 1MB'); return; }
        var word = f.name.replace(/\.[^.]+$/, '').trim().toLowerCase();
        if (!word) { Toast.warning('请把文件名改成单词名，如 hello.wav'); return; }
        var reader = new FileReader();
        reader.onload = function() {
          customVoiceMap[word] = reader.result;
          if (saveCustomVoice()) {
            renderCVList();
            Toast.success('已添加 ' + word + ' 的真人发音');
            SpeechUtil.speak(word);
          }
        };
        reader.readAsDataURL(f);
      });
    }
    if (cvDirInput) {
      cvDirInput.addEventListener('change', function() {
        var files = this.files;
        this.value = '';
        importAudioFiles(files, true);
      });
    }
  }
  safeBind('btn-save-goal', 'click', function() {
    var val = parseInt(document.getElementById('daily-goal').value);
    if (isNaN(val) || val < 1 || val > 100) { Toast.warning('请输入1-100之间的数字'); return; }
    DataStore.setProgress('daily_goal', val);
    Toast.success('每日目标已保存！');
  });
  var dailyGoal = DataStore.getProgress('daily_goal', 10);
  if (dailyGoal) document.getElementById('daily-goal').value = dailyGoal;

  // 主动回忆弹窗内的按钮
  safeBind('btn-recall-show', 'click', function() { self.showRecallAnswer(); });
  safeBind('btn-recall-check', 'click', function() { self.checkRecall(); });
  safeBind('recall-input', 'keypress', function(e) { if (e.key === 'Enter') self.checkRecall(); });
  var recallModal = document.getElementById('modal-recall');
  // 点击遮罩关闭弹窗
  if (recallModal) {
    recallModal.addEventListener('click', function(e) { if (e.target === recallModal) recallModal.classList.add('hidden'); });
  }

// 多 tab 数据同步：别的 tab 改了 localStorage 就重载相关模块的内存与视图，避免各自整表写回互相覆盖
  window.addEventListener('storage', function(e) {
    if (!e.key) return;
    try {
      if (e.key === 'word_progress' && self.wordModule) {
        // 竞态防护：本 tab 若有 300ms 节流中未落盘的标记，先 flush 落盘再重载。
        // 否则旧定时器会在重载后把（已换成对方数据的）内存原样写回，导致本 tab 的
        // 评价被静默吞掉。flush 保证"最后操作者胜"，不丢最近一次动作。
        if (self.wordModule._saveTimer) {
          clearTimeout(self.wordModule._saveTimer);
          self.wordModule._saveTimer = null;
          DataStore.setProgress('word_progress', self.wordModule.wordProgress);
        }
        self.wordModule.loadProgress(); // 内存以 storage 最新快照为准
        if (self.wordModule.currentView === 'list') self.wordModule.renderWordList();
        self.wordModule.renderStats();
      } else if (e.key === 'favorites' && self.favoritesModule) { self.favoritesModule.renderList(); }
      else if (e.key === 'mistakes' && self.mistakesModule) { self.mistakesModule.renderList(); }
      else if (e.key === 'gamification' && self.gamification) {
        // 必须重载内存数据再刷界面：否则旧 tab 用过期快照 addPoints 整表写回覆盖新积分
        self.gamification.data = DataStore.getProgress('gamification', self.gamification.data);
        self.updateGlobalStats();
      }
      else if (e.key === 'items' && self.itemSystem) {
        // 重读最新道具数据再刷新界面，避免本 tab 旧内存快照继续基于过期库存扣减
        self.itemSystem.data = DataStore.getProgress('items', self.itemSystem.data);
        self.itemSystem.renderBag();
        self.itemSystem.renderShop();
        self.itemSystem.updateGlobalUI();
      }
      else if (e.key === 'item_buffs' && self.itemSystem) {
        // reload 重读激活状态与库存，防止本 tab 过期快照把已消费/过期的 buff 复活
        self.itemSystem.reload();
      }
      else if (e.key === 'checkins') {
        if (self.calendarModule) self.calendarModule.render();
        if (self.chartModule) self.chartModule.render();
        self.updateGlobalStats();
      }
      else if (e.key === 'pomodoro_sessions' && self.pomodoroModule) {
        self.pomodoroModule.sessions = DataStore.getProgress('pomodoro_sessions', 0);
        self.pomodoroModule.totalMinutes = DataStore.getProgress('pomodoro_minutes', 0);
        self.pomodoroModule.updateStats();
      }
      else if ((e.key === 'badges' || e.key === 'badge_stats') && self.badgeSystem) { self.badgeSystem.render(); }
      else if (e.key === 'daily_challenge' && self.dailyChallenge) {
        // 重载任务数据再归一当天，防止旧 tab 整表写回把任务进度/已领取状态刷新掉
        self.dailyChallenge.data = DataStore.getProgress('daily_challenge', null);
        self.dailyChallenge._ensureToday();
        self.dailyChallenge.render();
      }
      else if (e.key === 'phonetic_progress' && self.phoneticModule) {
        // 音标进度以最新快照为准，旧 tab markMastered 整表写回会冲掉其它 tab 的新进度
        self.phoneticModule.phoneticProgress = DataStore.getProgress('phonetic_progress', {});
        if (self.currentTab === 'phonetic' && self.phoneticModule.renderGrid) self.phoneticModule.renderGrid();
      }
    } catch(err) { /* ignore */ }
  });
};
  // 备份字段表：[导出字段名, localStorage 键, 默认值, 是否大体积]。与 resetData 的清除列表对齐，
  // 保证导出→导入不丢任何进度（道具/徽章/番茄钟/每日挑战/自定义词库等此前全被漏掉）。
  // big 字段（wordProgress / customVoice）只在导出文件里出现：
  // 本地 english_app_backup 不重复存它们（word_progress / custom_voice 本就实时独立落盘，
  // 重复序列化会把 5MB 配额直接打爆，12 万词词库下必现 QuotaExceeded）。
  App.prototype._backupFields = [
    ['wordProgress','word_progress',{},true], ['favorites','favorites',[],false], ['mistakes','mistakes',[],false],
    ['gamification','gamification',{},false], ['phoneticProgress','phonetic_progress',{},false],
    ['pkHistory','pk_history',[],false], ['wordCardPos','word_card_pos',{},false], ['checkins','checkins',{},false],
    ['customVoice','custom_voice',{},true], ['voiceName','voice_name','',false], ['voiceRate','voice_rate','',false],
    ['voicePitch','voice_pitch','',false], ['voiceInstant','voice_instant','1',false],
    ['ownedThemes','owned_themes',{},false], ['appliedTheme','applied_theme','',false],
    ['dailyGoal','daily_goal',10,false], ['theme','theme','',false], ['themeColor','theme_color','',false],
    ['customThemeColor','custom_theme_color','',false], ['customBgOpacity','custom_bg_opacity',30,false],
    ['shortcutsEnabled','shortcuts_enabled','1',false], ['reminderEnabled','reminder_enabled',false,false],
    ['reminderTime','reminder_time','',false], ['autoSaveEnabled','auto_save_enabled','1',false],
    ['autoSaveInterval','auto_save_interval','',false], ['pomodoroSessions','pomodoro_sessions',0,false],
    ['pomodoroMinutes','pomodoro_minutes',0,false], ['activeRecall','active_recall','0',false],
    ['dailyReviewPlan','daily_review_plan',{},false], ['dailyChallenge','daily_challenge',null,false],
    ['adaptiveReview','adaptive_review',true,false], ['badges','badges',[],false], ['badgeStats','badge_stats',{},false],
    ['items','items',{},false], ['itemBuffs','item_buffs',{},false],
    ['assessment','assessment',null,false], ['assessmentHistory','assessment_history',[],false],
    ['assessmentLast','assessment_last_keys',[],false],
    ['wordCategoryIndex','word_category_index',0,false], ['onboardingDone','onboarding_done',false,false],
    ['navCollapsed','nav_collapsed',{},false], ['ttsVoice','tts_voice','',false]
  ];
// 收集全部进度数据（custom_words 单列成组；背景图在 IndexedDB，单独取）
// includeBig=true 用于导出文件（Blob 无配额限制，含 word_progress/custom_voice 全量）；
// includeBig=false 用于本地自动/手动保存 english_app_backup（只存小字段，避免双份超配额）
  App.prototype._collectBackup = function(includeBig) {
    var data = {};
    this._backupFields.forEach(function(f) { if (!includeBig && f[3]) return; data[f[0]] = DataStore.getProgress(f[1], f[2]); });
    var customWords = [];
    var cats = DataStore.getDefaultWords().categories || [];
    if (includeBig) {
      for (var i = 0; i < cats.length; i++) customWords.push(Storage.getJSON('custom_words_' + i, []));
    }
    data.customWords = customWords;
    return data;
  };
// 导入备份：字段名 → localStorage 键写回；custom_words 逐库写回；背景图写回 IDB
// 返回 false 表示 word_progress 等大字段写入失败（配额超限），供调用方提示真实结果
  App.prototype._applyBackup = function(data) {
    var ok = true;
    this._backupFields.forEach(function(f) {
      if (f[3]) return; // 大字段（word_progress/custom_voice）走下面的独立回写，避免导入时若不慎双写
      if (data[f[0]] !== undefined && data[f[0]] !== null) {
        if (DataStore.setProgress(f[1], data[f[0]]) === false) ok = false;
      }
    });
    if (data.wordProgress !== undefined && data.wordProgress !== null) {
      if (DataStore.setProgress('word_progress', data.wordProgress) === false) ok = false;
    }
    if (data.customVoice !== undefined && data.customVoice !== null) {
      if (DataStore.setProgress('custom_voice', data.customVoice) === false) ok = false;
    }
    if (Array.isArray(data.customWords)) {
      var cats = DataStore.getDefaultWords().categories || [];
      for (var i = 0; i < cats.length && i < data.customWords.length; i++) {
        if (Array.isArray(data.customWords[i]) && Storage.setJSON('custom_words_' + i, data.customWords[i]) === false) ok = false;
      }
    }
    if (data.customBg) {
      IDBStore.put('custom_bg', data.customBg).catch(function() {});
    }
    return ok;
  };
App.prototype.saveProgress = function() {
    var self = this;
    try {
      // 本地备份只存小字段大字段（word_progress/custom_voice）本来就实时落盘，
      // 避免 12 万词词库下 english_app_backup 双份超 5MB 配额
      Storage.setJSON('english_app_backup', self._collectBackup(false));
      self._afterSave();
    } catch(e) { Toast.warning('保存失败'); }
  };
  App.prototype._afterSave = function() {
    var now = new Date();
    var timeStr = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0') + ' ' + String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
    DataStore.setProgress('last_save_time', timeStr);
    var el = document.getElementById('save-time');
    if (el) el.textContent = '已保存: ' + timeStr;
    Toast.success('进度已保存');
  };
App.prototype.exportData = function() {
    var self = this;
    try {
      IDBStore.get('custom_bg').then(function(bg) {
        var data = self._collectBackup(true);
        data.customBg = bg || '';
        var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'english_app_backup_' + getLocalDateStr() + '.json';
        a.click();
        setTimeout(function() { URL.revokeObjectURL(url); }, 5000);
        Toast.success('数据已导出');
      }).catch(function() { Toast.error('导出失败'); });
    } catch(e) { Toast.error('导出失败'); }
  };
// 「打开错误日志」：拉取 server 日志并在应用内弹窗展示（含结构化字段，便于排查）。
  // 弹窗 DOM 完全由 JS 动态创建——不依赖 index.html 里是否已有日志弹窗节点，
  // 即使浏览器缓存了旧版 HTML，只要本文件（app.js）是新版，点击就一定能弹出窗口。
  // 本地服务未启动时弹窗内显示错误原因。
  App.prototype.openLogs = function() {
    var self = this;
    var modal = this._ensureLogsModal();
    function showErr(msg) {
      modal.classList.remove('hidden');
      var body = document.getElementById('logs-body');
      if (body) body.innerHTML = '<tr><td colspan="5" style="padding:48px;text-align:center;color:#c9405a">' + msg + '</td></tr>';
      var summary = document.getElementById('logs-summary');
      if (summary) summary.textContent = '读取失败';
    }
    try {
      // file:// 直接打开的页面没有 /api 基础路径：日志读接口统一走本机服务
var base = window.API_BASE || '';
      var fetchP = fetch(base + '/api/logs/read?n=300', { cache: 'no-store' })
        .then(function(r) {
          if (r && r.ok) return r.json();
          throw new Error('http ' + r.status);
        })
        .then(function(j) {
          if (!j || !j.ok) throw new Error('api not ok');
          self._logLines = j.lines || [];
          self._logFileSize = j.file || 0;
          self._renderLogs();
          modal.classList.remove('hidden');
        })
        .catch(function(e) {
          showErr('读取失败：本地服务未启动，请用启动脚本运行后重试' + (e && e.message ? '（' + e.message + '）' : ''));
        });
      if (fetchP && fetchP.catch) fetchP.catch(function() {});
    } catch(e) { showErr('日志打开失败'); }
  };
  // 动态创建日志窗口（只创建一次，之后复用）。仿桌面软件样式：
  // 标题栏 + 级别筛选工具栏 + 日志表格 + 底部状态栏。
  App.prototype._ensureLogsModal = function() {
    var el = document.getElementById('modal-logs');
    if (el) {
      if (document.getElementById('logs-copy-dyn')) return el;
      el.parentNode && el.parentNode.removeChild(el);
      el = null;
    }
    if (!this._logFilter) this._logFilter = 'all';
    el = document.createElement('div');
    el.id = 'modal-logs';
    el.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(8,12,10,0.6);backdrop-filter:blur(2px)';
    el.innerHTML =
      '<div style="width:min(1200px,96vw);height:90vh;max-height:960px;min-height:480px;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,0.5);display:flex;flex-direction:column;font-family:-apple-system,Segoe UI,Microsoft YaHei,sans-serif">'
      // 标题栏
      + '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 20px;background:#2f3b36;color:#fff;flex:0 0 auto">'
      + '<div style="display:flex;align-items:center;gap:10px;font-weight:600;font-size:1.05rem">'
      + '<span style="width:12px;height:12px;border-radius:50%;background:#f4635e;display:inline-block"></span>'
      + '<span>错误日志</span>'
      + '<span id="logs-summary" style="font-weight:400;font-size:0.8rem;color:rgba(255,255,255,0.7)"></span>'
      + '</div>'
      + '<div style="display:flex;gap:8px">'
      + '<button data-log-act="refresh" style="padding:6px 14px;border:none;border-radius:6px;background:rgba(255,255,255,0.18);color:#fff;cursor:pointer;font-size:0.8rem">刷新</button>'
      + '<button data-log-act="export" style="padding:6px 14px;border:none;border-radius:6px;background:rgba(255,255,255,0.18);color:#fff;cursor:pointer;font-size:0.8rem">导出日志</button>'
      + '<button data-log-act="export-json" style="padding:6px 14px;border:none;border-radius:6px;background:rgba(255,255,255,0.18);color:#fff;cursor:pointer;font-size:0.8rem">导出JSON</button>'
      + '<button data-log-act="copy" id="logs-copy-dyn" style="padding:6px 14px;border:none;border-radius:6px;background:rgba(255,255,255,0.18);color:#fff;cursor:pointer;font-size:0.8rem">复制日志</button>'
      + '<button data-log-act="close" style="padding:6px 14px;border:none;border-radius:6px;background:rgba(255,255,255,0.22);color:#fff;cursor:pointer;font-size:0.8rem">✕</button>'
      + '</div></div>'
      // 筛选工具栏
      + '<div style="display:flex;align-items:center;gap:8px;padding:10px 20px;background:#f8faf9;border-bottom:1px solid #e5e9e7;flex:0 0 auto;flex-wrap:wrap">'
      + '<span style="font-size:0.78rem;color:#8a938e;margin-right:4px">级别：</span>'
      + '<button data-log-filter="all" class="log-flt" style="padding:4px 12px;border:none;border-radius:14px;cursor:pointer;font-size:0.75rem;background:#2f3b36;color:#fff">全部</button>'
      + '<button data-log-filter="error" class="log-flt" style="padding:4px 12px;border:none;border-radius:14px;cursor:pointer;font-size:0.75rem;background:#fff;color:#c9405a;border:1px solid #ecc5c5">错误</button>'
      + '<button data-log-filter="warn" class="log-flt" style="padding:4px 12px;border:none;border-radius:14px;cursor:pointer;font-size:0.75rem;background:#fff;color:#b07d1f;border:1px solid #ecd9b3">警告</button>'
      + '<button data-log-filter="info" class="log-flt" style="padding:4px 12px;border:none;border-radius:14px;cursor:pointer;font-size:0.75rem;background:#fff;color:#3f7d5a;border:1px solid #c3ddcf">信息</button>'
      + '<button data-log-filter="debug" class="log-flt" style="padding:4px 12px;border:none;border-radius:14px;cursor:pointer;font-size:0.75rem;background:#fff;color:#8a938e;border:1px solid #dfe4e1">调试</button>'
      + '<span style="margin-left:auto;font-size:0.75rem;color:#a2aaa5">点击行可展开完整堆栈与数据</span>'
      + '</div>'
      // 表格区
      + '<div style="flex:1;overflow:auto;background:#fff" id="logs-scroll">'
      + '<table style="width:100%;font-size:0.84rem;border-collapse:collapse;font-family:Consolas,Menlo,monospace;table-layout:fixed;min-width:780px" id="logs-table">'
      + '<thead><tr id="logs-head" style="background:#eef2f0;color:#41504a;position:sticky;top:0;z-index:2">'
      + '<th style="padding:10px 14px;text-align:left;width:150px;font-weight:600">时间</th>'
      + '<th style="padding:10px 6px;text-align:left;width:60px;font-weight:600;white-space:nowrap">级别</th>'
      + '<th style="padding:10px 8px;text-align:left;width:86px;font-weight:600">来源</th>'
      + '<th style="padding:10px 8px;text-align:left;width:140px;font-weight:600">模块</th>'
      + '<th style="padding:10px 14px;text-align:left;font-weight:600">内容</th>'
      + '</tr></thead><tbody id="logs-body"></tbody></table></div>'
      // 底部状态栏
      + '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 20px;border-top:1px solid #e5e9e7;background:#f4f6f5;color:#8a938e;font-size:0.74rem;flex:0 0 auto;flex-wrap:wrap">'
      + '<span>完整日志文件：server\\logs\\app.log</span>'
      + '<span id="logs-foot"></span>'
      + '</div>'
      + '</div>';
    document.body.appendChild(el);
    var self2 = this;
    el.addEventListener('click', function(e) {
      var t = e.target;
      if (t === el) { el.classList.add('hidden'); return; }
      var act = t && t.getAttribute ? t.getAttribute('data-log-act') : null;
      if (act === 'refresh') { window.app && window.app.openLogs(); return; }
      if (act === 'copy') { self2._copyLogs(); return; }
      if (act === 'export') { self2._exportLogs(false); return; }
      if (act === 'export-json') { self2._exportLogs(true); return; }
      if (act === 'close') { el.classList.add('hidden'); return; }
      var flt = t && t.getAttribute ? t.getAttribute('data-log-filter') : null;
      if (flt) {
        self2._logFilter = flt;
        var btns = el.querySelectorAll('.log-flt');
        for (var i = 0; i < btns.length; i++) self2._styleFilterBtn(btns[i]);
        self2._renderLogs();
        return;
      }
      // 展开/收起详情行
      var tr = t && t.closest ? t.closest('tr[data-detail-id]') : null;
      if (tr) {
        var det = document.getElementById(tr.getAttribute('data-detail-id'));
        if (det) {
          det.style.display = (det.style.display === 'none' || !det.style.display) ? '' : 'none';
          if (det.style.display === '') {
            var scroll = document.getElementById('logs-scroll');
            var rect = tr.getBoundingClientRect();
            if (scroll && rect.bottom > scroll.getBoundingClientRect().bottom) {
              scroll.scrollTop += rect.bottom - scroll.getBoundingClientRect().bottom + 12;
            }
          }
        }
      }
    });
    return el;
  };
  App.prototype._styleFilterBtn = function(btn) {
    var on = (btn.getAttribute('data-log-filter') === this._logFilter);
    btn.style.background = on ? '#2f3b36' : '#fff';
    btn.style.color = on ? '#fff' : btn.getAttribute('data-log-filter') === 'error' ? '#c9405a' : btn.getAttribute('data-log-filter') === 'warn' ? '#b07d1f' : btn.getAttribute('data-log-filter') === 'info' ? '#3f7d5a' : '#8a938e';
    btn.style.border = on ? '1px solid #2f3b36' : '1px solid ' + (btn.getAttribute('data-log-filter') === 'error' ? '#ecc5c5' : btn.getAttribute('data-log-filter') === 'warn' ? '#ecd9b3' : btn.getAttribute('data-log-filter') === 'info' ? '#c3ddcf' : '#dfe4e1');
  };
  // 「导出日志」：导出为 .txt（人类阅读）或 .jsonl（AI 直接按行解析解析，每行一个结构化 JSON）
  App.prototype._exportLogs = function(asJson) {
    try {
      var lines = this._logLines || [];
      var filter = this._logFilter || 'all';
      if (filter !== 'all') {
        lines = lines.filter(function(l) { return String(l.lvl || 'info') === filter; });
      }
      if (!lines.length) { if (window.Toast) Toast.info('暂无日志可导出'); return; }
      var d = new Date();
      function pad(x) { return (x < 10 ? '0' : '') + x; }
      var stamp = d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '_' + pad(d.getHours()) + pad(d.getMinutes());
      var ext = asJson ? 'jsonl' : 'txt';
      var body = '';
      if (asJson) {
        // JSONL：每行一个完整日志对象，AI 可直接逐行 JSON.parse，字段同服务端 app.log
        var out = [];
        for (var i = lines.length - 1; i >= 0; i--) {
          var o = {
            ts: String(lines[i].ts || ''),
            lvl: String(lines[i].lvl || 'info'),
            src: String(lines[i].src || 'client'),
            mod: String(lines[i].mod || ''),
            msg: String(lines[i].msg || ''),
            page: String(lines[i].page || (location && location.pathname) || '')
          };
          if (lines[i].data) o.data = lines[i].data;
          if (lines[i].stack) o.stack = String(lines[i].stack);
          out.push(o);
        }
        body = out.map(function(x) { return JSON.stringify(x); }).join('\n');
      } else {
        var head = '闻道 MindSpeak 错误日志导出\n'
          + '导出时间：' + new Date().toLocaleString('zh-CN', { hour12: false }) + '\n'
          + '条目数量：' + lines.length + '\n'
          + '========================================\n\n';
        for (var j = lines.length - 1; j >= 0; j--) {
          var l = lines[j];
          var ts = String(l.ts || '').slice(0, 19);
          var lvl = String(l.lvl || 'info').toUpperCase();
          var mod = String(l.mod || '');
          var msg = String(l.msg || '');
          head += '[' + ts + '] [' + lvl + '] [' + mod + '] ' + msg + '\n';
          if (l.data !== undefined) {
            try { head += '  数据: ' + JSON.stringify(l.data) + '\n'; }
            catch (e) { head += '  数据: [不可序列化]\n'; }
          }
          if (l.stack) head += '  堆栈: ' + String(l.stack).replace(/\n/g, '\n        ') + '\n';
        }
        body = head;
      }
      var blob = new Blob([body], { type: 'text/plain;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'mindspeak_logs_' + stamp + '.' + ext;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function() { URL.revokeObjectURL(url); }, 3000);
      if (window.Toast) Toast.success('已导出 ' + lines.length + ' 条日志');
    } catch(e) { if (window.Toast) Toast.error('导出失败'); }
  };
  // 「复制日志」：把已加载的日志条目拼成纯文本复制进剪贴板
  App.prototype._copyLogs = function() {
    try {
      var lines = this._logLines || [];
      var filter = this._logFilter || 'all';
      if (filter !== 'all') {
        lines = lines.filter(function(l) { return String(l.lvl || 'info') === filter; });
      }
      var out = '';
      for (var i = lines.length - 1; i >= 0; i--) {
        var l = lines[i];
        var parts = [String(l.ts || '').slice(0, 19), String(l.lvl || ''), String(l.mod || '')];
        var msg = String(l.msg || '');
        if (l.data !== undefined) {
          try { msg += ' ' + JSON.stringify(l.data); }
          catch (e) { msg += ' [data不可序列化]'; }
        }
        if (l.stack) msg += ' ' + String(l.stack).replace(/\n/g, ' | ');
        parts.push(msg);
        out += parts.join(' | ') + '\n';
      }
      if (!out) { if (window.Toast) Toast.info('暂无日志'); return; }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(out).then(function() {
          if (window.Toast) Toast.success('日志已复制，直接粘贴给我即可');
        }).catch(function() { window.prompt('复制以下日志内容：', out); });
      } else {
        window.prompt('复制以下日志内容：', out);
      }
    } catch(e) { if (window.Toast) Toast.error('复制失败'); }
  };
  // 渲染日志表格：级别着色徽标、点击行展开完整 stack/data
  App.prototype._renderLogs = function() {
    var body = document.getElementById('logs-body');
    if (!body) return;
    var lines = this._logLines || [];
    var filter = this._logFilter || 'all';
    var summary = document.getElementById('logs-summary');
    var foot = document.getElementById('logs-foot');
    var shown = 0, errN = 0, warnN = 0;
    if (summary) {
      for (var si = 0; si < lines.length; si++) {
        var lv = String(lines[si].lvl || 'info');
        if (lv === 'error') errN++; else if (lv === 'warn') warnN++;
      }
      summary.textContent = '共 ' + lines.length + ' 条 · 错误 ' + errN + ' · 警告 ' + warnN + ' · 文件 ' + (this._logFileSize ? (this._logFileSize / 1024).toFixed(1) : 0) + ' KB';
    }
    if (foot) foot.textContent = '更新于 ' + new Date().toLocaleTimeString('zh-CN', { hour12: false });
    var colors = { error: ['#c9405a', '#fdeef0'], warn: ['#b07d1f', '#fdf6e3'], info: ['#3f7d5a', '#e9f5ee'], debug: ['#8a938e', '#f0f3f2'] };
    var out = '';
    var n = 0;
    for (var i = lines.length - 1; i >= 0; i--) {
      var l = lines[i];
      var lvl = String(l.lvl || 'info');
      if (filter !== 'all' && lvl !== filter) continue;
      var c = colors[lvl] || colors.info;
      var ts = String(l.ts || '').slice(0, 19);
      var src = String(l.src || '').slice(0, 10);
      var mod = String(l.mod || '').slice(0, 26);
      var msg = String(l.msg || '');
      var detail = '';
      if (l.stack) detail += (detail ? '<br>' : '') + '<div class="log-detail" style="margin-top:6px;padding:8px 10px;background:#f6f8f7;border-left:3px solid #d6ddda;border-radius:4px;white-space:pre-wrap;word-break:break-all;line-height:1.55">' + escapeHtml(l.stack) + '</div>';
      if (l.data !== undefined) {
        var dataJson = '';
        try { dataJson = JSON.stringify(l.data, null, 2); } catch (e) { dataJson = '[不可序列化]'; }
        detail += (detail ? '<br>' : '') + '<div class="log-detail" style="margin-top:6px;padding:8px 10px;background:#eef4f1;border-left:3px solid #3f7d5a;border-radius:4px;white-space:pre-wrap;word-break:break-all;line-height:1.55">' + escapeHtml(dataJson) + '</div>';
      }
      var rowId = 'log-det-' + n;
      out += '<tr data-row="1" data-detail-id="' + rowId + '" style="cursor:pointer;background:' + (lvl === 'error' ? '#fff7f8' : (n % 2 ? '#fbfcfb' : '#fff')) + ';border-top:1px solid #f0f3f1">'
        + '<td style="padding:10px 14px;white-space:nowrap;color:#8a938e">' + ts + '</td>'
        + '<td style="padding:10px 6px"><span style="display:inline-block;padding:2px 9px;border-radius:10px;background:' + c[1] + ';color:' + c[0] + ';font-weight:700;font-size:0.72rem;min-width:38px;text-align:center">' + lvl + '</span></td>'
        + '<td style="padding:10px 8px;color:#5a6560;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + escapeHtml(src) + '</td>'
        + '<td style="padding:10px 8px;color:#5a6560;word-break:break-all">' + escapeHtml(mod) + '</td>'
        + '<td style="padding:10px 14px;word-break:break-all;line-height:1.6">' + escapeHtml(msg)
        + (detail ? '<span style="color:#3f7d5a;font-size:0.72rem;margin-left:10px">▸ 详情</span>' : '')
        + '</td></tr>'
        + (detail ? '<tr id="' + rowId + '" style="display:none;background:#fff"><td colspan="5" style="padding:12px 14px 16px 14px;border-bottom:1px solid #eef1ef">' + detail + '</td></tr>' : '');
      n++;
    }
    body.innerHTML = out || '<tr><td colspan="5" style="padding:56px;text-align:center;color:#a2ab5">' + (filter === 'all' ? '暂无日志' : '该级别暂无日志') + '</td></tr>';
  };
  function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  App.prototype.importData = function() {
    var self = this;
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function(e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(ev) {
        try {
          var data = JSON.parse(ev.target.result);
          // 兼容旧备份：字段名与 _backupFields 的导出字段名一致，直接应用
if (data && typeof data === 'object' && (data.wordProgress || data.mistakes || data.favorites)) {
            var imported = self._applyBackup(data);
            self._recallIndex = null; // 词库进度可能变化，主动回忆索引失效重建
            if (self.readingModule) self.readingModule._wordIndex = null;
            if (self.aiChatModule) self.aiChatModule._wordIndex = null;
            if (self.contextModule) self.contextModule._poolInvalid = true;
            if (self.phoneticModule) {
              // 音标进度以导入快照为准，防后续 markMastered 整表写回冲掉导入值
              self.phoneticModule.phoneticProgress = DataStore.getProgress('phonetic_progress', {});
              if (self.phoneticModule.renderGrid) self.phoneticModule.renderGrid();
            }
            SpeechUtil._settings = null;
            SpeechUtil._customVoice = null;
            // 重新加载内存数据：避免旧内存里的 wordProgress 下一次翻牌时覆盖刚导入的新进度
            try {
              if (self.wordModule) {
                self.wordModule.loadProgress();
                self.wordModule.renderStats();
                self.wordModule.showCurrentWord();
              }
              if (self.mistakesModule && self.mistakesModule.renderList) self.mistakesModule.renderList();
            } catch(_e) {}
            // 其余模块的内存态同样必须重载：否则积分/道具/徽章/每日挑战等仍是旧值，
            // 下一次加积分/用道具/自动保存会把刚导入的数据整体覆盖回 localStorage
            try {
              if (self.gamification) self.gamification.data = DataStore.getProgress('gamification', self.gamification.data);
              if (self.itemSystem && self.itemSystem.reload) self.itemSystem.reload();
              if (self.badgeSystem) {
                self.badgeSystem.earned = DataStore.getProgress('badges', {});
                self.badgeSystem.render && self.badgeSystem.render();
              }
              if (self.dailyChallenge && self.dailyChallenge._ensureToday) {
                self.dailyChallenge.data = DataStore.getProgress('daily_challenge', null);
                self.dailyChallenge._ensureToday();
                self.dailyChallenge.render();
              }
              if (self.pomodoroModule) {
                self.pomodoroModule.sessions = DataStore.getProgress('pomodoro_sessions', 0);
                self.pomodoroModule.totalMinutes = DataStore.getProgress('pomodoro_minutes', 0);
                if (self.pomodoroModule.updateStats) self.pomodoroModule.updateStats();
              }
              if (self.calendarModule && self.calendarModule.render) self.calendarModule.render();
              if (self.chartModule && self.chartModule.render) self.chartModule.render();
            } catch(_e2) {}
            if (self.badgeSystem) self.badgeSystem.checkAll();
            if (self.updateGlobalStats) self.updateGlobalStats();
            if (imported) Toast.success('数据已导入');
            else Toast.error('导入不完整：存储空间不足，部分数据未写入（请先导出并清理存储）');
          } else {
            Toast.error('导入失败，文件格式错误');
          }
        } catch(err) { Toast.error('导入失败，文件格式错误'); }
      };
      reader.readAsText(file);
    };
    input.click();
  };
App.prototype.resetData = function() {
  ConfirmBox.confirm('确定要清除所有学习进度吗？此操作不可撤销！', function() {
    // 先取消翻牌节流中的延迟落盘并清空内存进度，防止 reload 时
    // beforeunload flush 把残留的 wordProgress 写回，造成重置不彻底
    if (window.app && window.app.wordModule) {
      if (window.app.wordModule._saveTimer) { clearTimeout(window.app.wordModule._saveTimer); window.app.wordModule._saveTimer = null; }
      if (window.app.wordModule._cardPosTimer) { clearTimeout(window.app.wordModule._cardPosTimer); window.app.wordModule._cardPosTimer = null; }
      if (window.app.wordModule.wordProgress) window.app.wordModule.wordProgress = {};
    }
    window.__resettingData = true;
    var appKeys = ['word_progress','mistakes','checkins','phonetic_progress','favorites','gamification','daily_goal','theme','theme_color','custom_theme_color','custom_bg','custom_bg_opacity','shortcuts_enabled','reminder_enabled','reminder_time','english_app_backup','last_save_time','auto_save_enabled','auto_save_interval','pomodoro_sessions','pomodoro_minutes','active_recall','daily_review_plan','pk_history','word_card_pos','daily_challenge','adaptive_review','badges','badge_stats','items','item_buffs','voice_name','voice_rate','voice_pitch','voice_instant','custom_voice','owned_themes','applied_theme','assessment','assessment_history','assessment_last_keys','word_category_index','onboarding_done','nav_collapsed','tts_voice','selectedVoice'];
    appKeys.forEach(function(k) { Storage.remove(k); });
    var _cats = DataStore.getDefaultWords().categories || [];
    for (var i = 0; i < _cats.length; i++) Storage.remove('custom_words_' + i);
    // 自定义背景图在 IndexedDB，一并清掉
    try { IDBStore.clear().catch(function() {}); } catch(e) {}
    location.reload();
  }, { title: '重置数据', okText: '重置', danger: true });
};

// ==================== IndexedDB 存储助手 ====================
// 自定义背景图等大体积数据存 IDB，避免撑爆 localStorage 的 5MB 配额
var IDBStore = {
  _db: null,
  open: function() {
    var self = this;
    if (this._db) return Promise.resolve(this._db);
    return new Promise(function(resolve, reject) {
      try {
        var req = indexedDB.open('MindSpeakStore', 1);
        req.onupgradeneeded = function() {
          var db = req.result;
          if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
        };
        req.onsuccess = function() { self._db = req.result; resolve(self._db); };
        req.onerror = function() { reject(req.error); };
      } catch(e) { reject(e); }
    });
  },
  get: function(key) {
    return this.open().then(function(db) {
      return new Promise(function(resolve, reject) {
        var req = db.transaction('kv', 'readonly').objectStore('kv').get(key);
        req.onsuccess = function() { resolve(req.result !== undefined ? req.result : null); };
        req.onerror = function() { reject(req.error); };
      });
    });
  },
  put: function(key, value) {
    return this.open().then(function(db) {
      return new Promise(function(resolve, reject) {
        var tx = db.transaction('kv', 'readwrite');
        tx.objectStore('kv').put(value, key);
        tx.oncomplete = function() { resolve(true); };
        tx.onerror = function() { reject(tx.error); };
        tx.onabort = function() { reject(tx.error || new Error('abort')); };
      });
    });
  },
  del: function(key) {
    return this.open().then(function(db) {
      return new Promise(function(resolve, reject) {
        var tx = db.transaction('kv', 'readwrite');
        tx.objectStore('kv').delete(key);
        tx.oncomplete = function() { resolve(true); };
        tx.onerror = function() { reject(tx.error); };
        tx.onabort = function() { reject(tx.error || new Error('abort')); };
      });
    });
  },
  clear: function() {
    return this.open().then(function(db) {
      return new Promise(function(resolve, reject) {
        var tx = db.transaction('kv', 'readwrite');
        tx.objectStore('kv').clear();
        tx.oncomplete = function() { resolve(true); };
        tx.onerror = function() { reject(tx.error); };
        tx.onabort = function() { reject(tx.error || new Error('abort')); };
      });
    });
  }
};

// ==================== 自定义背景 ====================
App.prototype.initCustomBg = function() {
  var bgFileInput = document.getElementById('bg-file-input');
  var bgPreviewImg = document.getElementById('bg-preview-img');
  var bgPreviewContainer = document.getElementById('bg-preview-container');
  var bgOpacityControl = document.getElementById('bg-opacity-control');
  var bgOpacitySlider = document.getElementById('bg-opacity-slider');
  var bgOpacityValue = document.getElementById('bg-opacity-value');
  var contentEl = document.querySelector('.content');

  // 折叠面板：“自定义背景”标题点击 → 展开/收起 body
  var bgCollapseHeader = document.getElementById('bg-collapse-header');
  var bgCollapseBody = document.getElementById('bg-collapse-body');
  if (bgCollapseHeader && bgCollapseBody) {
    bgCollapseHeader.addEventListener('click', function() {
      var isOpen = bgCollapseHeader.classList.toggle('open');
      bgCollapseBody.classList.toggle('open', isOpen);
    });
  }

  var savedBgOpacity = DataStore.getProgress('custom_bg_opacity', 30);
  bgOpacitySlider.value = savedBgOpacity;
  bgOpacityValue.textContent = savedBgOpacity + '%';
  // 背景图存 IndexedDB（不再占 localStorage 配额）。先从 IDB 读；读不到再读旧版
  // localStorage 里的残留并迁移过去。
  var that = this;
  IDBStore.get('custom_bg').then(function(idbBg) {
    var legacyBg = DataStore.getProgress('custom_bg', null);
    var bg = idbBg || legacyBg;
    if (!bg) return;
    if (legacyBg && !idbBg) {
      // 旧数据迁到 IDB，并清掉 localStorage 里的冗余
      IDBStore.put('custom_bg', legacyBg).catch(function() {});
      DataStore.setProgress('custom_bg', null);
    }
    that.applyCustomBg(bg, savedBgOpacity);
    bgPreviewImg.src = bg;
    bgPreviewContainer.style.display = 'block';
    bgOpacityControl.style.display = 'flex';
  }).catch(function() {});
  var self = this;
  safeBind('btn-select-bg', 'click', function() { bgFileInput.click(); });
  bgFileInput.addEventListener('change', function(e) {
    var file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { Toast.warning('请选择图片文件'); return; }
    if (file.size > 5 * 1024 * 1024) { Toast.warning('图片大小不能超过5MB'); return; }
    var reader = new FileReader();
    reader.onload = function(ev) {
      bgPreviewImg.src = ev.target.result;
      bgPreviewContainer.style.display = 'block';
      bgOpacityControl.style.display = 'flex';
    };
    reader.readAsDataURL(file);
  });
  safeBind('btn-apply-bg', 'click', function() {
    var bgData = bgPreviewImg.src;
    var opacity = parseInt(bgOpacitySlider.value);
    // 背景图存 IndexedDB（大图不再受 localStorage 5MB 配额限制）；透明度仍存 localStorage
    DataStore.setProgress('custom_bg_opacity', opacity);
    DataStore.setProgress('custom_bg', null);
    IDBStore.put('custom_bg', bgData).then(function() {
      self.applyCustomBg(bgData, opacity);
      Toast.success('背景已应用');
    }).catch(function() {
      Toast.warning('背景保存失败（浏览器存储不可用），请换一张更小的图片');
    });
  });
  safeBind('btn-remove-bg', 'click', function() {
    self.removeCustomBg();
    DataStore.setProgress('custom_bg', null);
    DataStore.setProgress('custom_bg_opacity', 30);
    IDBStore.del('custom_bg').catch(function() {});
    bgPreviewContainer.style.display = 'none';
    bgOpacityControl.style.display = 'none';
    bgFileInput.value = '';
    Toast.success('背景已移除');
  });
  bgOpacitySlider.addEventListener('input', function() {
    var opacity = parseInt(bgOpacitySlider.value);
    bgOpacityValue.textContent = opacity + '%';
    if (bgPreviewContainer.style.display !== 'none') {
      self.applyCustomBg(bgPreviewImg.src, opacity);
    }
  });
};
App.prototype.applyCustomBg = function(bgData, opacity) {
  var bodyEl = document.body;
  var sidebarEl = document.querySelector('.sidebar');
  var headerEl = document.querySelector('.app-header');
  var contentEl = document.querySelector('.content');
  bodyEl.style.backgroundImage = 'url(' + bgData + ')';
  bodyEl.style.backgroundSize = 'cover';
  bodyEl.style.backgroundPosition = 'center';
  bodyEl.style.backgroundRepeat = 'no-repeat';
  bodyEl.style.backgroundAttachment = 'fixed';
  // sidebar：换成半透明深色 + 毛玻璃模糊，让自定义背景图透出，同时保证白字可读
  if (sidebarEl) {
    sidebarEl.style.background = 'rgba(0,0,0,0.35)';
    sidebarEl.style.backdropFilter = 'blur(8px)';
    sidebarEl.style.webkitBackdropFilter = 'blur(8px)';
    sidebarEl.style.opacity = '';
    // 清掉旧版本可能残留的黑色 overlay（升级兼容）
    var oldSideOverlay = sidebarEl.querySelector('.bg-overlay');
    if (oldSideOverlay) oldSideOverlay.remove();
  }
  if (headerEl) headerEl.style.background = 'rgba(255,255,255,0.6)';
  contentEl.style.background = 'transparent';
  var overlay = contentEl.querySelector('.bg-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'bg-overlay';
    overlay.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;background:rgba(255,255,255,' + (opacity / 100) + ');pointer-events:none;z-index:0;';
    contentEl.prepend(overlay);
  } else {
    overlay.style.background = 'rgba(255,255,255,' + (opacity / 100) + ')';
  }
};
App.prototype.removeCustomBg = function() {
  var bodyEl = document.body;
  var sidebarEl = document.querySelector('.sidebar');
  var headerEl = document.querySelector('.app-header');
  var contentEl = document.querySelector('.content');
  bodyEl.style.backgroundImage = '';
  bodyEl.style.backgroundSize = '';
  bodyEl.style.backgroundPosition = '';
  bodyEl.style.backgroundRepeat = '';
  bodyEl.style.backgroundAttachment = '';
  if (headerEl) headerEl.style.background = '';
  contentEl.style.background = '';
  var overlay = contentEl.querySelector('.bg-overlay');
  if (overlay) overlay.remove();
  if (sidebarEl) {
    sidebarEl.style.background = '';
    sidebarEl.style.backdropFilter = '';
    sidebarEl.style.webkitBackdropFilter = '';
    sidebarEl.style.opacity = '';
    var sideOverlay = sidebarEl.querySelector('.bg-overlay');
    if (sideOverlay) sideOverlay.remove();
    // 清掉旧版本可能残留的 inline position，让 CSS 的 position:fixed 重新生效
    sidebarEl.style.position = '';
  }
};

// ==================== 分享卡片 ====================
App.prototype.generateShareCard = function() {
  var canvas = document.getElementById("share-canvas");
  var ctx = canvas.getContext("2d");
  var w = canvas.width, h = canvas.height;
  
  // 背景渐变
  var grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, "#547A67");
  grad.addColorStop(1, "#3d5a4a");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  
  // 装饰圆
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(350, 50, 80, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(50, 170, 60, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  
// 标题
  ctx.fillStyle = "#fff";
  ctx.font = "bold 20px sans-serif";
  ctx.fillText("闻道 MindSpeak", 20, 32);
  ctx.font = "12px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.fillText("每天 5 分钟，坚持学英语", 20, 52);

  // 分割线
  ctx.strokeStyle = "rgba(255,255,255,0.3)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(20, 62); ctx.lineTo(380, 62); ctx.stroke();
  
  // 统计数据
  var progress = DataStore.getProgress("word_progress", {});
  var mastered = Object.keys(progress).filter(function(k) { return progress[k].status === "mastered"; }).length;
  var gami = DataStore.getProgress("gamification", { points: 0, level: 1, streak: 0 });
  var mistakes = DataStore.getProgress("mistakes", []);
  var favs = DataStore.getProgress("favorites", []);
  
  ctx.font = "14px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.fillText("学习数据统计", 20, 70);
  
  ctx.font = "bold 28px sans-serif";
  ctx.fillStyle = "#fff";
  ctx.fillText(mastered + " 词", 20, 110);
  ctx.font = "14px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fillText("已掌握单词", 20, 130);
  
  ctx.font = "bold 28px sans-serif";
  ctx.fillStyle = "#fff";
  ctx.fillText("Lv." + gami.level, 150, 110);
  ctx.font = "14px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fillText("当前等级", 150, 130);
  
ctx.font = "bold 28px sans-serif";
  ctx.fillStyle = "#fff";
  ctx.fillText(calculateStreak(DataStore.getProgress("checkins", {})) + " 天", 280, 110);
  ctx.font = "14px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fillText("连续打卡", 280, 130);
  
  // 底部信息
  ctx.font = "12px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  var date = new Date().toLocaleDateString("zh-CN");
  ctx.fillText("生成日期: " + date + "  |  闻道 MindSpeak", 20, 185);
  
  // 显示预览
  document.getElementById("share-card-preview").style.display = "block";
  Toast.success("分享卡片已生成");
};

App.prototype.downloadShareCard = function() {
  var canvas = document.getElementById("share-canvas");
  var link = document.createElement("a");
  link.download = "english-learning-share-" + getLocalDateStr() + ".png";
  link.href = canvas.toDataURL("image/png");
  link.click();
  Toast.success("图片已保存");
};


// ==================== 导出单词本和错题本 ====================
App.prototype.exportFavorites = function() {
  try {
    var favs = DataStore.getProgress('favorites', []);
    if (favs.length === 0) { Toast.warning('收藏夹为空'); return; }
    var csv = '\u5e8f\u53f7,\u5355\u8bcd,\u97f3\u6807,\u8bcd\u6027,\u4e2d\u6587\u91ca\u4e49\n';
    favs.forEach(function(f, i) {
      csv += (i + 1) + ',"' + (f.word || '') + '","' + (f.phonetic || '') + '","' + (f.pos || '') + '","' + (f.chinese || '') + '"\n';
    });
    var bom = '\uFEFF';
    var blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = '\u5355\u8bcd\u672c_' + getLocalDateStr() + '.csv';
    a.click();
    URL.revokeObjectURL(url);
    Toast.success('\u5355\u8bcd\u672c\u5df2\u5bfc\u51fa');
  } catch(e) { Toast.error('\u5bfc\u51fa\u5931\u8d25'); }
};

App.prototype.exportMistakes = function() {
  try {
    var mistakes = DataStore.getProgress('mistakes', []);
    if (mistakes.length === 0) { Toast.warning('\u9519\u9898\u672c\u4e3a\u7a7a'); return; }
    var csv = '\u5e8f\u53f7,\u5355\u8bcd,\u97f3\u6807,\u8bcd\u6027,\u4e2d\u6587\u91ca\u4e49,\u6765\u6e90,\u65e5\u671f\n';
    mistakes.forEach(function(m, i) {
      csv += (i + 1) + ',"' + (m.word || '') + '","' + (m.phonetic || '') + '","' + (m.pos || '') + '","' + (m.chinese || '') + '","' + (m.source || '') + '","' + (m.date || '') + '"\n';
    });
    var bom = '\uFEFF';
    var blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = '\u9519\u9898\u672c_' + getLocalDateStr() + '.csv';
    a.click();
    URL.revokeObjectURL(url);
    Toast.success('\u9519\u9898\u672c\u5df2\u5bfc\u51fa');
  } catch(e) { Toast.error('\u5bfc\u51fa\u5931\u8d25'); }
};

// ==================== 启动应用 ====================
document.addEventListener('DOMContentLoaded', function() {
  ThemeToggle.init();
  ThemeColor.init();
  KeyboardShortcuts.init();
  LearningReminder.init();

  // 启动即探测本地 server 是否可达：决定网页版走系统语音、本机版走本地即时语音
  SpeechUtil._probeServer();

  // iOS Safari 需要在用户手势里激活 speechSynthesis，否则后续自动播放无声。
  // 在首屏任何一次 click/touchstart/keydown 之后调用一次 unlock 即可。
  function unlockSpeech() {
    SpeechUtil.unlock();
    document.removeEventListener('click', unlockSpeech, true);
    document.removeEventListener('touchstart', unlockSpeech, true);
    document.removeEventListener('keydown', unlockSpeech, true);
  }
  document.addEventListener('click', unlockSpeech, true);
  document.addEventListener('touchstart', unlockSpeech, true);
  document.addEventListener('keydown', unlockSpeech, true);
  // 全局统一 TTS 服务：window.TTSManager 已在 js/tts-manager.js 加载时自初始化
  // （加载声音列表 + 恢复用户选的声音），这里无需重复初始化，各导航页共用同一实例。
  // 页面加载即后台预热在线声连接：本机英文声几乎全是在线声，首次连接
  // speech.platform.bing.com 要 6-10 秒；预热成功后点击朗读约 200ms 出声。
  // 预热本身失败/卡住不影响使用，由 _speakTTS 的 cancel+换声重试兜底。
  // 勾选了「本地即时语音」则不预热（不走在线引擎）。
  // 保活：预热后每 30s 用静音空格再预热一次，防止 Edge 闲置回收在线连接
  // （回收后下次点击要重新冷连接 6-10s 甚至失败 → "时好时坏"）。
  if (!SpeechUtil.getSettings().instant) {
    SpeechUtil.primeVoices();
    SpeechUtil.scheduleKeepAlive();
  }

  // 例句点击朗读（原 HTML 内联 onclick 已移除，改在 JS 集中绑定）
  var exampleEl = document.getElementById('current-example');
  if (exampleEl) {
    exampleEl.addEventListener('click', function() {
      SpeechUtil.speak(this.textContent);
    });
  }
  // 语境填空“再来一轮”：转发到开始按钮
  var retryBtn = document.getElementById('btn-start-context-retry');
  var startBtn = document.getElementById('btn-start-context');
  if (retryBtn && startBtn) {
    retryBtn.addEventListener('click', function() { startBtn.click(); });
  }

  window.app = new App();
  window.app.initCustomBg();
});

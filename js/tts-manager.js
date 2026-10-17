// ==================== 统一 TTS 服务（TTSManager）====================
// 整个项目的朗读唯一入口。所有页面（背单词/听力/阅读/AI/跟读/试听/故事…）
// 最终都通过 TTSManager（= window.TTSManager，全局共享同一实例）朗读，
// 禁止在其他文件里直接调用 speechSynthesis.speak() / new SpeechSynthesisUtterance()。
// 保证"设置页选了什么声音，所有模块读出来就是什么声音"。
// 选中的声音持久化到 localStorage["tts_voice"]（兼容旧键 selectedVoice / voice_name）。
// 注意：class 声明会创建独立的词法绑定，会把全局的 TTSManager 遮成"类"而非"实例"，
// 所以类定义放进 IIFE，只把实例暴露为全局 TTSManager / window.TTSManager。
var TTSManager = (function() {
  class TTSManager {

    constructor() {
      this.voice = null;   // 当前选中的声音（null = 系统默认/自动）
      this.voices = [];    // 系统全部声音（getVoices 一次性加载，等待 voiceschanged）
      this.rate = 0.9;     // 语速（与设置页 voice_rate 同步，默认 0.9 与全项目一致）
      this.pitch = 1;      // 音调
      this.volume = 1;     // 音量
      this._ready = false;
      this._loaded = false;
      // 原生 TTS 降级状态：_nativeDead=本会话判定原生不可用；_nativeToken=当前原生朗读令牌；
      // _nativeCtx=当前这次朗读的上下文（真实回调按它路由）；两个看门狗分别盯
      // "引擎是否真的开始出声"与"开始后是否真的播完"。
      this._nativeDead = false;
      this._nativeToken = null;
      this._nativeCtx = null;
      this._nativeWatchdog = null;
      this._nativeDoneWatchdog = null;
      this._nativeBound = false;   // 引擎事件是否已订阅
      this._nativeSeq = 0;         // utterance id 自增序号
      this.init();
    }

    // 初始化：加载声音列表并恢复用户选择。
    // getVoices 首次调用可能返回空（Chrome/Edge/Firefox/Safari 都是异步加载），
    // 需要等 onvoiceschanged，再轮询兜底，最多 15s。
    init() {
      const self = this;
      if (!('speechSynthesis' in window)) return;

      let savedRate = '', savedPitch = '';
      try {
        savedRate = window.UserState ? window.UserState.getRaw('voice_rate', '') : localStorage.getItem('voice_rate');
        savedPitch = window.UserState ? window.UserState.getRaw('voice_pitch', '') : localStorage.getItem('voice_pitch');
      } catch (e) {}
      const r = parseFloat(savedRate || '');
      if (!isNaN(r)) this.rate = r;
      const p = parseFloat(savedPitch || '');
      if (!isNaN(p)) this.pitch = p;

      const load = () => {
        let v = [];
        try { v = window.speechSynthesis.getVoices() || []; } catch (e) {}
        if (v && v.length) {
          self.voices = v;
          self._loaded = true;
          self.restoreVoice();
          return true;
        }
        return false;
      };

      if (load()) { this._ready = true; return; }

      const onChanged = () => {
        if (load()) {
          try { window.speechSynthesis.removeEventListener('voiceschanged', onChanged); } catch (e) {}
          self._ready = true;
        }
      };
      try { window.speechSynthesis.addEventListener('voiceschanged', onChanged); } catch (e) {}
      const timer = setInterval(() => {
        if (self._loaded || load()) {
          clearInterval(timer);
          self._ready = true;
        }
      }, 300);
      setTimeout(() => clearInterval(timer), 15000);
    }

    // 恢复用户选择的声音：优先 tts_voice，其次旧键 selectedVoice / voice_name，
    // 都没有则按优先级自动选（Microsoft → Google → en-US 女声 → voices[0]）。
    restoreVoice() {
      let saved = null;
      try { saved = window.UserState ? window.UserState.getRaw('tts_voice', '') : localStorage.getItem('tts_voice'); } catch (e) {}
      if (!saved) { try { saved = window.UserState ? window.UserState.getRaw('selectedVoice', '') : localStorage.getItem('selectedVoice'); } catch (e) {} }
      if (!saved) { try { saved = window.UserState ? window.UserState.getRaw('voice_name', '') : localStorage.getItem('voice_name'); } catch (e) {} }
      if (saved && saved !== '__online_google__' && saved.indexOf('__online_') !== 0 && saved.indexOf('__local_piper_') !== 0) {
        const v = this._pickByName(saved);
        if (v) { this.voice = v; return; }
      }
      this.voice = this._autoPick();
    }

    _pickByName(name) {
      if (!name) return null;
      for (let i = 0; i < this.voices.length; i++) {
        if (this.voices[i].name === name) return this.voices[i];
      }
      return null;
    }

    // 挑一个系统英文男声（网页版男声源不可达时的男声兜底）；一个都没有返回 null。
    // 网页版（无 server）下 Edge 男声/本地 David/Piper 男声的合成源（/api/edge-tts、
    // /api/tts、/api/piper-tts）必然 404，旧链路会静默降级到有道/谷歌女声，
    // 表现"切了男声还是女声"。这里优先用系统男声保住"选了男声就是男声"。
    _pickMaleVoice() {
      let voices;
      try { voices = window.speechSynthesis.getVoices() || []; } catch (e) { return null; }
      const MALE = ['david','mark','guy','james','george','daniel','alex','fred','peter','steffan','michael','samuel','ryan','thomas','aaron','oliver','toby','will','william','sebastian','simon','steven','victor','paul','roman','male','lessac'];
      for (let i = 0; i < voices.length; i++) {
        const v = voices[i];
        if ((v.lang || '').toLowerCase().indexOf('en') !== 0) continue;
        const n = (v.name || '').toLowerCase();
        for (let m = 0; m < MALE.length; m++) if (n.indexOf(MALE[m]) !== -1) return v;
      }
      return null;
    }

    // 自动选声优先级：en-US 女声 → Microsoft → Google → voices[0]
    _autoPick() {
      if (!this.voices.length) return null;
      const en = [];
      for (let i = 0; i < this.voices.length; i++) {
        if ((this.voices[i].lang || '').toLowerCase().indexOf('en') === 0) en.push(this.voices[i]);
      }
      const pool = en.length ? en : this.voices;
      const FEMALE = ['aria','jenny','samantha','susan','hazel','zira','female','laura','linda','lisa','michelle','natasha','nicole','rachel','rebecca','sally','libby','priya','heather','hayley','sonia','joanna','kimberly','serena','tessa'];
      for (let m = 0; m < en.length; m++) {
        const n = (en[m].name || '').toLowerCase();
        if (/^en[-_]?us/i.test(String(en[m].lang || ''))) {
          for (let f = 0; f < FEMALE.length; f++) if (n.indexOf(FEMALE[f]) !== -1) return en[m];
        }
      }
      for (let j = 0; j < pool.length; j++) {
        if ((pool[j].name || '').toLowerCase().indexOf('microsoft') !== -1) return pool[j];
      }
      for (let k = 0; k < pool.length; k++) {
        if ((pool[k].name || '').toLowerCase().indexOf('google') !== -1) return pool[k];
      }
      return this.voices[0];
    }

    // 用户在下拉框切换声音：找到对应 voice 设为当前声音并持久化到 localStorage["tts_voice"]。
    // 切换时是否 cancel 正在播的声音由调用方决定（设置页会在切换后重新朗读）。
    setVoice(name) {
      // 虚拟在线音色（__online_* / __local_piper_*）不是真实 speechSynthesis voice：
      // 清除本地 speechSynthesis voice 对象（避免误用系统声音），
      // 但必须持久化 voice_name 到 localStorage，保证 TTSManager.speak() 能读到并路由。
      if (!name || (typeof name === 'string' && (name.indexOf('__online_') === 0 || name.indexOf('__local_piper_') === 0))) {
        this.voice = null;
        try {
          if (name) {
            if (window.UserState) {
              window.UserState.setRaw('tts_voice', name);
              window.UserState.setRaw('selectedVoice', name);
            } else {
              localStorage.setItem('tts_voice', name);
              localStorage.setItem('selectedVoice', name);
            }
          } else {
            if (window.UserState) {
              window.UserState.remove('tts_voice');
              window.UserState.remove('selectedVoice');
            } else {
              localStorage.removeItem('tts_voice');
              localStorage.removeItem('selectedVoice');
            }
          }
        } catch (e) {}
        console.log('[TTS] selected:', name || '(cleared)');
        return false;
      }
      const v = this._pickByName(name);
      if (v) {
        this.voice = v;
        try {
          if (window.UserState) {
            window.UserState.setRaw('tts_voice', v.name);
            window.UserState.setRaw('selectedVoice', v.name);
          } else {
            localStorage.setItem('tts_voice', v.name);
            localStorage.setItem('selectedVoice', v.name);
          }
        } catch (e) {}
        console.log('[TTS] selected:', v.name, '| lang:', v.lang);
        return true;
      }
      console.log('[TTS] selected no-match:', name);
      return false;
    }

    // 把当前声音/语速/音调/音量应用到 utterance；opts.voice/rate/pitch/volume/lang 可覆盖
    applyVoice(u, opts) {
      if (!u) return u;
      opts = opts || {};
      const v = opts.voice || this.voice || null;
      const lang = opts.lang || 'en-US';
      if (v) {
        try { u.voice = v; } catch (e) {}
        u.lang = v.lang || lang;
      } else {
        u.lang = lang;
      }
      u.rate = (opts && typeof opts.rate === 'number') ? opts.rate : this.rate;
      u.pitch = (opts && typeof opts.pitch === 'number') ? opts.pitch : this.pitch;
      u.volume = (opts && typeof opts.volume === 'number') ? opts.volume : this.volume;
      return u;
    }

    // 统一创建 utterance（全项目只准通过这里 new SpeechSynthesisUtterance）
    createUtterance(text, opts) {
      const u = new SpeechSynthesisUtterance(text || '');
      return this.applyVoice(u, opts || {});
    }

    // 从 localStorage 读取当前选中的 voice_name（兼容三个键名）
    _getVoiceName() {
      var vn = '';
      try { vn = window.UserState ? window.UserState.getRaw('tts_voice', '') : localStorage.getItem('tts_voice'); } catch (e) {}
      if (!vn) { try { vn = window.UserState ? window.UserState.getRaw('selectedVoice', '') : localStorage.getItem('selectedVoice'); } catch (e) {} }
      if (!vn) { try { vn = window.UserState ? window.UserState.getRaw('voice_name', '') : localStorage.getItem('voice_name'); } catch (e) {} }
      return vn || '';
    }

    // 统一朗读入口：cancel 旧声 → 用当前声音创建 utterance → 挂回调 → 100ms 后 speak。
    // 100ms 间隔用于避开 Chromium 的 cancel+speak 竞态（取消后立刻 speak 会吞掉本次朗读）；
    // opts.immediate=true 时立即 speak（iOS Safari 需在用户手势上下文内触发，不能延迟）。
    // opts.onerror 也会收到同步 speak 异常与原生降级事件。
    speak(text, opts) {
      opts = opts || {};
      const lang = (opts.lang || (this.voice && this.voice.lang) || 'en-US');
      const rate = (typeof opts.rate === 'number') ? opts.rate : this.rate;
      // Capacitor 原生 TTS 优先（Android WebView 的 speechSynthesis 有已知问题）。
      // 用户显式选择过声音（tts_voice 非空）时必须绕过原生引擎：
      // 原生插件只支持 text/lang/rate、无法指定音色，而本方法的原生分支
      // 优先于 _speakWeb 的 voice_name 路由——若放行拦截，手机上设置里
      // 选的任何音色（Piper/Edge/有道/具体系统声）都听不到，永远读系统
      // 引擎默认声。仅"系统默认（自动选本地语音）"才走原生快速路径。
      var _explicitVoice = '';
      try { _explicitVoice = this._getVoiceName(); } catch (_e) {}
      // _serverDown === false = 已确认本机 server 可达。此时原生引擎并非唯一
      // 出声通道（WebView 的 speechSynthesis 在 server 可达时也能工作），却会
      // 播出系统引擎的音色，与走 SpeechUtil 的其余 11 个功能（server SAPI）
      // 不同声 —— 即"换了声音仍有页面不统一"。故让路给全站统一路由。
      // 安全极性：只有「确认可达」(=== false) 才让路。=== true(无 server) 与
      // undefined(探测未完成) 一律保留原生 —— 那正是 Android WebView 语音不可用
      // （国产机无 Google TTS，见 app.js:409）时唯一能出声的通道，写反会导致静音。
      var _serverUp = !!(window.SpeechUtil && window.SpeechUtil._serverDown === false);
      var _useNative = !!(!_explicitVoice && window.NativeTTSBridge && window.NativeTTSBridge.available && this._nativeDead !== true && !_serverUp);
      if (_useNative) {
        try { window.NativeTTSBridge.stop(); } catch (_e) {}
        const self = this;
        const token = {};              // 会话令牌：新一轮 speak / cancel 使旧看门狗失效
        this._nativeToken = token;
        const uid = 'ns' + (++this._nativeSeq) + '_' + Date.now();
        const wctx = { token: token, uid: uid, text: text, rate: rate, opts: opts, started: false, finished: false };
        this._nativeCtx = wctx;
        this._bindNativeEvents();

        // 上一轮残留的看门狗先清掉：新一轮 speak 会把 _nativeCtx 顶掉，
        // 旧定时器若留着，到期时会误判到新的一次上。
        if (this._nativeWatchdog) { clearTimeout(this._nativeWatchdog); this._nativeWatchdog = null; }
        if (this._nativeDoneWatchdog) { clearTimeout(this._nativeDoneWatchdog); this._nativeDoneWatchdog = null; }

        // 确认看门狗：等 Java 端外传的真实 ttsStart。旧实现在插件 resolve 后
        // 盲设 800ms 定时器把 synthEnded 置真，导致 3s 看门狗到时"以为已播完"，
        // 跳过降级分支 —— 引擎初始化失败（插件仍 resolve）时表现为彻底静音。
        // 现在只有真实 ttsStart 能证明引擎在出声；3s 内没来就是假成功。
        // 注意闭包必须捕获 wctx 而不是读 this._nativeCtx：连续朗读时后者已是新的一次。
        this._nativeWatchdog = setTimeout(function() {
          if (wctx.started) return;              // 已出声，交给完成看门狗
          self._nativeDegrade(wctx, 'no-start-3s');
        }, 3000);

        let ok = null;
        try { ok = window.NativeTTSBridge.speak(text || '', lang, rate, uid); } catch (_err) { ok = false; }
        if (ok && typeof ok.then === 'function') {
          ok.then(function(res) {
            // 受理成功不发声学回调：onstart/onend 一律等真实 ttsStart/ttsDone。
            // 明确失败（含"插件 3s 完全不应答"）才立刻降级。
            if (!res) self._nativeDegrade(wctx, 'bridge-false');
          }, function(e) {
            self._nativeDegrade(wctx, 'bridge-error:' + ((e && e.message) || 'rejected'));
          });
        } else if (ok === true) {
          // 同步布尔受理（旧式实现），同样只等真实事件
        } else {
          this._nativeDegrade(wctx, 'sync-false');
        }
        return { native: true };
      }
      return this._speakWeb(text, opts);
    }

    // 订阅 Java 端外传的引擎事件（只订一次）。tts-manager.js 先于业务模块加载，
    // 但 Capacitor 插件桥是启动时就绪的，这里仍做惰性绑定 + available 复检，
    // 避免在非 Capacitor 环境（浏览器 / 测试）里空跑。
    _bindNativeEvents() {
      const b = window.NativeTTSBridge;
      if (!b || !b.available || typeof b.onEvent !== 'function') return;
      if (this._nativeBound) return;
      const self = this;
      this._nativeBound = true;
      b.onEvent('ttsStart', function(d) { self._onNativeEvent('start', d); });
      b.onEvent('ttsDone', function(d) { self._onNativeEvent('done', d); });
      b.onEvent('ttsError', function(d) { self._onNativeEvent('error', d); });
      b.onEvent('ttsInitFailed', function(d) {
        // 引擎初始化失败：在播的那次立刻降级；没有在播的则直接把本会话锁到 web
        if (self._nativeCtx) self._onNativeEvent('error', d || { reason: 'init-failed' });
        else self._nativeDead = true;
      });
    }

    _onNativeEvent(kind, data) {
      const ctx = this._nativeCtx;
      // 已被 cancel / 新一轮 speak 取代 → 迟到事件一律忽略
      if (!ctx || ctx.token !== this._nativeToken) return;
      // 只认当前这次朗读的 utterance id，旧 utterance 的迟到回调不掺和
      if (data && data.id && ctx.uid && data.id !== ctx.uid) return;
      if (ctx.finished) return;
      const opts = ctx.opts || {};
      if (kind === 'start') {
        if (ctx.started) return;
        ctx.started = true;
        if (this._nativeWatchdog) { clearTimeout(this._nativeWatchdog); this._nativeWatchdog = null; }
        if (opts.onstart) { try { opts.onstart(); } catch (_e) {} }
        // 已确认出声，改等真实 ttsDone。上限按文本长度与语速估算（含 10s 底噪），
        // 只为防引擎挂在半句上永不回调；正常朗读远早于它结束。
        const cap = Math.max(10000, Math.round(String(ctx.text || '').length * 220 / Math.max(0.5, ctx.rate || 1)));
        const self = this;
        this._nativeDoneWatchdog = setTimeout(function() {
          // 播过一部分但没等到 onDone：停掉原生、锁死本会话，不重播
          // （换音色从头再来比静默更吵，且这条路在有了真实回调后应极少触发）
          self._nativeDegrade(ctx, 'no-done', false);
        }, cap);
      } else if (kind === 'done') {
        ctx.finished = true;
        if (this._nativeWatchdog) { clearTimeout(this._nativeWatchdog); this._nativeWatchdog = null; }
        if (this._nativeDoneWatchdog) { clearTimeout(this._nativeDoneWatchdog); this._nativeDoneWatchdog = null; }
        this._nativeToken = null;
        this._nativeCtx = null;
        if (opts.onend) { try { opts.onend(); } catch (_e) {} }
      } else {
        this._nativeDegrade(ctx, (data && data.reason) || 'engine-error');
      }
    }

    // 判定原生不可用：停引擎、锁死本会话，并按需降级到 web 重播。
    // replay=false 用于"已播过一部分"的场景（只锁不补播）。
    _nativeDegrade(ctx, reason, replay) {
      if (!ctx || ctx.finished) return;
      ctx.finished = true;
      // 已被新一轮 speak 顶替：只记录"原生不可用"，绝不重播
      // （否则旧句子会把正在播的新一句盖掉）
      if (this._nativeToken !== ctx.token) { this._nativeDead = true; return; }
      const opts = ctx.opts || {};
      if (this._nativeWatchdog) { clearTimeout(this._nativeWatchdog); this._nativeWatchdog = null; }
      if (this._nativeDoneWatchdog) { clearTimeout(this._nativeDoneWatchdog); this._nativeDoneWatchdog = null; }
      this._nativeToken = null;
      this._nativeCtx = null;
      this._nativeDead = true;     // 本会话不再尝试原生
      try { window.NativeTTSBridge.stop(); } catch (_e) {}
      Logger.log('TTSManager', 'native TTS 不可用(' + reason + ')，本会话锁定 web TTS');
      if (replay === false) return;
      // 一次都没出声过才需要补救：停原生、报错、用 web 链路重新读一遍
      if (opts.onerror) { try { opts.onerror({ error: 'native-unavailable', reason: reason }); } catch (_e) {} }
      this._speakWeb(ctx.text, opts);
    }

    // web TTS 兜底链路：voice_name 路由（本地 SAPI / Piper / 在线音色）→ speechSynthesis。
    // 正常路径与原生降级共用，保证"设置页选了什么声音，降级后还是什么声音"。
    _speakWeb(text, opts) {
      // 注意：lang 必须在本作用域内解析。此前依赖打包拼接出的跨文件全局
      // （bundle 里恰有同名 var），单文件加载/测试环境下是 ReferenceError。
      var lang = (opts && opts.lang) || (this.voice && this.voice.lang) || 'en-US';
      // voice_name 路由：读取 localStorage 中用户选择的声音名，委托给 SpeechUtil 的对应路径。
      // 保证"设置页选了什么声音，所有入口（TTSManager.speak / SpeechUtil.speak / listen-along 等）
      // 都用该声音"。SpeechUtil 在运行时已就绪（tts-manager.js 先加载，speak() 后调用）。
      // 安全守卫：如果 opts.voice 已经是真实的 SpeechSynthesisVoice 对象（_speakTTSOnline
      // 等内部调用方注入的），说明调用方已经解析好了声音，跳过 voice_name 路由，
      // 直接走 speechSynthesis 用 opts.voice 播放，避免 Piper/online 失败 → _speakTTSOnline →
      // TTSManager.speak → 再次路由到同一个失败源的无限循环。
      var _vn = this._getVoiceName();
      var _hasRealVoice = !!(opts && opts.voice && typeof opts.voice === 'object' && opts.voice.name && typeof opts.voice.name === 'string');
      // 系统默认（用户未在设置里选音色，voice_name 为空）时，下面的 voice_name 路由
      // 整块被跳过，本方法直连 speechSynthesis 默认声；而其余功能走 SpeechUtil.speak，
      // 会按 instant（= !(serverDown)）走 server SAPI / 在线引擎。两条独立路由因此
      // 发出不同的声音，表现为"换了声音仍有页面不统一"（跟读 app.js:4855、字母朗读）。
      // 在此把 instant 决策交回 SpeechUtil，收敛到单一事实来源。
      //
      // fromSpeechUtil 守卫（防无限循环）：SpeechUtil._speakTTSOnline（app.js:826）
      // 会带着 onstart/onend/onerror 回调再次调用本方法；若此时再委托回 SpeechUtil，
      // 就成了 speak → _speakTTSOnline → speak 的死循环。该来源一律直连
      // speechSynthesis —— 那本就是 _speakTTSOnline 的最终兜底。
      if (!_vn && !_hasRealVoice && !(opts && opts.fromSpeechUtil) && window.SpeechUtil
          && typeof window.SpeechUtil.speak === 'function') {
        try { window.speechSynthesis.cancel(); } catch (_e) {}
        try { window.SpeechUtil._stopLocalAudio(); } catch (_e) {}
        return window.SpeechUtil.speak(text, lang, opts);
      }
      if (_vn && !_hasRealVoice && window.SpeechUtil) {
        var _su = window.SpeechUtil;
        // 网页版/无后端（_serverDown=true）+ 用户选择了依赖 server 的男声
        // （Edge 美音男声 Guy / 本地男声 David / Piper 男声 Lessac）：这些
        // 合成源（/api/edge-tts、/api/tts、/api/piper-tts）在无 server 时必然 404，
        // 旧链路静默降级到有道/谷歌【女声】兜底，表现"切了男声还是女声"。
        // 改为：设备有系统男声时直接用系统男声朗读；没有才走原降级链。
        if (_vn === '__online_edge_us_guy__' || _vn === '__local_david__' || _vn === '__local_piper_us_lessac__') {
          if (_su._serverDown === true) {
            var _mVoice = this._pickMaleVoice();
            if (_mVoice) {
              try { window.speechSynthesis.cancel(); } catch (_e) {}
              _su._stopLocalAudio();
              var _ov = {};
              if (opts) for (var _ko in opts) _ov[_ko] = opts[_ko];
              _ov.voice = _mVoice;
              var _mU = this.createUtterance(text, _ov);
              if (opts.onstart) _mU.onstart = opts.onstart;
              if (opts.onend) _mU.onend = opts.onend;
              if (opts.onerror) _mU.onerror = opts.onerror;
              try { window.speechSynthesis.speak(_mU); } catch (e) { if (_mU.onerror) { try { _mU.onerror(e); } catch (_e) {} } }
              return _mU;
            }
          }
        }
        // 本地男声/女声（David/Zira）→ server SAPI
        if (_vn === '__local_david__' || _vn === '__local_zira__') {
          var _lvo = {};
          if (opts) for (var _lk in opts) _lvo[_lk] = opts[_lk];
          _lvo.voice = _vn === '__local_zira__' ? 'zira' : 'david';
          try { window.speechSynthesis.cancel(); } catch (_e) {}
          _su._stopLocalAudio();
          _su._speakLocal(text, lang, _lvo);
          return;
        }
        // Piper 本地离线神经网络语音
        if (_vn.indexOf('__local_piper_') === 0) {
          try { window.speechSynthesis.cancel(); } catch (_e) {}
          _su._stopLocalAudio();
          if (_su._serverDown === true) { _su._speakTTSOnline(text, lang, opts); return; }
          var _piperMap = { '__local_piper_us_amy__': 'en_US-amy-medium', '__local_piper_us_lessac__': 'en_US-lessac-medium', '__local_piper_gb_alba__': 'en_GB-alba-medium' };
          var _piperId = _piperMap[_vn] || 'en_US-amy-medium';
          var _pBase = window.API_BASE || '';
          var _pUrl = _pBase + '/api/piper-tts?text=' + encodeURIComponent(text) + '&voice=' + encodeURIComponent(_piperId);
          var _pAudio;
          try { _pAudio = new Audio(_pUrl); } catch (e) { _su._speakTTSOnline(text, lang, opts); return; }
          _su._localAudio = _pAudio;
          _su._attachAudioEl(_pAudio);
          var _pFs = opts && opts.onstart ? function() { try { opts.onstart(); } catch(e) {} } : function() {};
          var _pFe = opts && opts.onend ? function() { try { opts.onend(); } catch(e) {} } : function() {};
          var _pFail = false;
          var _pFailOnce = function() { if (_pFail) return; _pFail = true; if (_su._localAudio === _pAudio) _su._localAudio = null; _su._detachAudioEl(_pAudio); _su._speakTTSOnline(text, lang, opts); };
          _pAudio.onended = function() { if (_su._localAudio === _pAudio) _su._localAudio = null; _su._detachAudioEl(_pAudio); _pFe(); };
          _pAudio.onerror = function() { if (_su._localAudio !== _pAudio) return; _su._detachAudioEl(_pAudio); _pFailOnce(); };
          _pFs();
          var _pr; try { _pr = _pAudio.play(); } catch (e) { _pFailOnce(); return; }
          if (_pr && _pr.catch) _pr.catch(function(e) { if (e && e.name === 'AbortError') return; _pFailOnce(); });
          return;
        }
        // 在线虚拟音色（__online_*）→ Google 合成 / 远程发音兜底
        if (_vn.indexOf('__online_') === 0) {
          try { window.speechSynthesis.cancel(); } catch (_e) {}
          _su._stopLocalAudio();
          if (_vn === '__online_google__' && !(_su._serverDown === true)) {
            _su._speakGoogleTTS(text, lang, opts);
          } else {
            _su._speakServerless(text, lang, opts);
          }
          return;
        }
      }
      if (!('speechSynthesis' in window)) return null;
      const u = this.createUtterance(text, opts);
      if (opts.onstart) u.onstart = opts.onstart;
      if (opts.onend) u.onend = opts.onend;
      if (opts.onerror) u.onerror = opts.onerror;
      const self = this;
      const fire = function() {
        try { if (window.speechSynthesis.paused) window.speechSynthesis.resume(); } catch (e) {}
        try {
          window.speechSynthesis.speak(u);
        } catch (e) {
          if (u.onerror) { try { u.onerror(e); } catch (_e) {} }
        }
      };
      try { window.speechSynthesis.cancel(); } catch (e) {}
      if (this._speakTimer) { clearTimeout(this._speakTimer); this._speakTimer = null; }
      if (opts.immediate) fire();
      else this._speakTimer = setTimeout(fire, 100);
      return u;
    }

    // 当前是否正在朗读/排队（Chromium 竞态保护用：只在真的在播/排队时才 cancel）。
    // 其余文件一律通过这里判断，不直接读 window.speechSynthesis.speaking/pending。
    isBusy() {
      if (!('speechSynthesis' in window)) return false;
      try { return !!(window.speechSynthesis.speaking || window.speechSynthesis.pending); } catch (e) { return false; }
    }

    // 统一停止当前朗读并清空队列（安全封装：内部判断 speechSynthesis 是否存在并吞掉异常）。
    // 所有"停止/打断朗读"的场景都必须走这里，禁止在 tts-manager.js 之外直接调 speechSynthesis.cancel()。
    cancel() {
      if (window.NativeTTSBridge && window.NativeTTSBridge.available) {
        // 使挂起的看门狗与在播上下文失效，避免 stop 之后降级逻辑又把声音"救活"
        this._nativeToken = null;
        this._nativeCtx = null;
        if (this._nativeWatchdog) { clearTimeout(this._nativeWatchdog); this._nativeWatchdog = null; }
        if (this._nativeDoneWatchdog) { clearTimeout(this._nativeDoneWatchdog); this._nativeDoneWatchdog = null; }
        try { window.NativeTTSBridge.stop(); } catch (_e) {}
      }
      if (!('speechSynthesis' in window)) return;
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }

    // 当前页面名（调试输出用）：SPA 多页面导航，取当前激活的 tab / page
    _currentPage() {
      try {
        if (window.app && window.app.currentTab) return window.app.currentTab;
      } catch (e) {}
      try {
        const p = document.querySelector('.page.active');
        if (p && p.id) return String(p.id).replace(/^page-/, '');
      } catch (e) {}
      return 'unknown';
    }
  }

  // 全局共享单例：导航切换页面不重新初始化，所有页面都用这一个实例
  return new TTSManager();
})();

window.TTSManager = TTSManager;

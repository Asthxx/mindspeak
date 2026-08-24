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
      // 原生 TTS 降级状态：_nativeDead=本会话判定原生不可用；_nativeToken/_nativeWatchdog=看门狗
      this._nativeDead = false;
      this._nativeToken = null;
      this._nativeWatchdog = null;
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
      // 可靠性对策（Java 端 onInit 失败只写 logcat、插件 Promise 无论引擎能否出声
      // 都立即 resolve —— "受理成功"证明不了"引擎可用"，直接信任会永久静音）：
      //   ① 桥接层把插件调用包成 Promise + 3s 超时，明确失败返回 false → 立即降级；
      //   ② 这里再加 3s 确认窗口：resolve 只算乐观受理（照发 onstart/onend 保持 UI 流程），
      //      到期一律判定原生不可用并锁定本会话走 web 链路。若合成 onend 已发出
      //      （短文本已播完）则不再重播，仅锁链路；否则停原生、触发 opts.onerror 并降级。
      //   ③ 代价：即使原生健康，每会话首次朗读最迟 3s 后也会切到 web 音色
      //      （解锁时的音量预热通常充当这次探测，用户基本无感知）——这是 JS 层
      //      无引擎回调可依赖时的唯一可靠判定方式。
      // 用户显式选择过声音（tts_voice 非空）时必须绕过原生引擎：
      // 原生插件只支持 text/lang/rate、无法指定音色，而本方法的原生分支
      // 优先于 _speakWeb 的 voice_name 路由——若放行拦截，手机上设置里
      // 选的任何音色（Piper/Edge/有道/具体系统声）都听不到，永远读系统
      // 引擎默认声。仅"系统默认（自动选本地语音）"才走原生快速路径。
      var _explicitVoice = '';
      try { _explicitVoice = this._getVoiceName(); } catch (_e) {}
      if (!_explicitVoice && window.NativeTTSBridge && window.NativeTTSBridge.available && this._nativeDead !== true) {
        try { window.NativeTTSBridge.stop(); } catch (_e) {}
        const self = this;
        const token = {};              // 会话令牌：新一轮 speak / cancel 使旧看门狗失效
        this._nativeToken = token;
        let synthEnded = false;        // 合成 onend 已发出（短文本视为播完，超时只锁不重播）
        const finishWatchdog = function() {
          if (self._nativeWatchdog) { clearTimeout(self._nativeWatchdog); self._nativeWatchdog = null; }
        };
        const succeed = function() {
          if (self._nativeToken !== token) return;
          if (opts.onstart) { try { opts.onstart(); } catch (_e) {} }
          if (opts.onend) { setTimeout(function() { synthEnded = true; try { opts.onend(); } catch (_e) {} }, 800); }
        };
        const degrade = function(reason) {
          if (self._nativeToken !== token) return;
          self._nativeToken = null;
          finishWatchdog();
          self._nativeDead = true;     // 本会话不再尝试原生
          try { window.NativeTTSBridge.stop(); } catch (_e) {}
          Logger.log('TTSManager', 'native TTS 不可用(' + reason + ')，本会话锁定 web TTS');
          if (!synthEnded) {
            // 未确认播完才需要补救出声；短文本已合成 onend 的仅锁定链路，避免重播
            if (opts.onerror) { try { opts.onerror({ error: 'native-unavailable', reason: reason }); } catch (_e) {} }
            self._speakWeb(text, opts);
          }
        };
        let ok = null;
        try { ok = window.NativeTTSBridge.speak(text || '', lang, rate); } catch (_err) { ok = false; }
        if (ok && typeof ok.then === 'function') {
          ok.then(function(res) {
            if (res) succeed();
            else degrade('bridge-false');
          }, function(e) {
            degrade('bridge-error:' + ((e && e.message) || 'rejected'));
          });
        } else if (ok === true) {
          succeed();                   // 同步布尔兼容（旧式实现）
        } else {
          degrade('sync-false');
        }
        // 3s 确认窗口对"已受理"的调用同样生效（同步布尔与 Promise 一视同仁）：
        // 同步明确失败的已在上面降级，无需再看门狗。
        if (ok === true || (ok && typeof ok.then === 'function')) {
          this._nativeWatchdog = setTimeout(function() { degrade('unconfirmed-3s'); }, 3000);
        }
        return { native: true };
      }
      return this._speakWeb(text, opts);
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
      if (_vn && !_hasRealVoice && window.SpeechUtil) {
        var _su = window.SpeechUtil;
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
        // 使挂起的原生看门狗失效，避免 stop 之后降级逻辑又把声音"救活"
        this._nativeToken = null;
        if (this._nativeWatchdog) { clearTimeout(this._nativeWatchdog); this._nativeWatchdog = null; }
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

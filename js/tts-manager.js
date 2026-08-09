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
        savedRate = localStorage.getItem('voice_rate');
        savedPitch = localStorage.getItem('voice_pitch');
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
      try { saved = localStorage.getItem('tts_voice'); } catch (e) {}
      if (!saved) { try { saved = localStorage.getItem('selectedVoice'); } catch (e) {} }
      if (!saved) { try { saved = localStorage.getItem('voice_name'); } catch (e) {} }
      if (saved && saved !== '__online_google__') {
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

    // 自动选声优先级：Microsoft → Google → en-US 女声 → voices[0]
    _autoPick() {
      if (!this.voices.length) return null;
      const en = [];
      for (let i = 0; i < this.voices.length; i++) {
        if ((this.voices[i].lang || '').toLowerCase().indexOf('en') === 0) en.push(this.voices[i]);
      }
      const pool = en.length ? en : this.voices;
      for (let j = 0; j < pool.length; j++) {
        if ((pool[j].name || '').toLowerCase().indexOf('microsoft') !== -1) return pool[j];
      }
      for (let k = 0; k < pool.length; k++) {
        if ((pool[k].name || '').toLowerCase().indexOf('google') !== -1) return pool[k];
      }
      const FEMALE = ['aria','jenny','samantha','susan','hazel','zira','female','laura','linda','lisa','michelle','natasha','nicole','rachel','rebecca','sally','libby','priya','heather','hayley','sonia','joanna','kimberly','serena','tessa'];
      for (let m = 0; m < en.length; m++) {
        const n = (en[m].name || '').toLowerCase();
        if (/^en[-_]?us/i.test(String(en[m].lang || ''))) {
          for (let f = 0; f < FEMALE.length; f++) if (n.indexOf(FEMALE[f]) !== -1) return en[m];
        }
      }
      return this.voices[0];
    }

    // 用户在下拉框切换声音：找到对应 voice 设为当前声音并持久化到 localStorage["tts_voice"]。
    // 切换时是否 cancel 正在播的声音由调用方决定（设置页会在切换后重新朗读）。
    setVoice(name) {
      if (!name || name === '__online_google__') {
        this.voice = null;
        try {
          localStorage.removeItem('tts_voice');
          localStorage.removeItem('selectedVoice');
        } catch (e) {}
        console.log('[TTS] selected cleared:', name);
        return false;
      }
      const v = this._pickByName(name);
      if (v) {
        this.voice = v;
        try {
          localStorage.setItem('tts_voice', v.name);
          localStorage.setItem('selectedVoice', v.name);
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

    // 统一朗读入口：cancel 旧声 → 用当前声音创建 utterance → 挂回调 → 100ms 后 speak。
    // 100ms 间隔用于避开 Chromium 的 cancel+speak 竞态（取消后立刻 speak 会吞掉本次朗读）；
    // opts.immediate=true 时立即 speak（iOS Safari 需在用户手势上下文内触发，不能延迟）。
    // opts.onerror 也会收到同步 speak 异常。
    speak(text, opts) {
      if (!('speechSynthesis' in window)) return null;
      opts = opts || {};
      const u = this.createUtterance(text, opts);
      if (opts.onstart) u.onstart = opts.onstart;
      if (opts.onend) u.onend = opts.onend;
      if (opts.onerror) u.onerror = opts.onerror;
      console.log('[TTS] playing:', u.voice ? u.voice.name : '(no voice)');
      // 每次播放统一输出页面与声音，便于核对：所有页面都必须读到同一个 TTSManager.voice
      console.log('[TTS DEBUG] page:', this._currentPage());
      console.log('[TTS DEBUG] voice:', u.voice ? u.voice.name : '(system default)');
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

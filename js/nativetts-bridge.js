/**
 * NativeTTS Bridge — Capacitor 原生语音合成桥接层
 * 调用 Android NativeTTS 插件，失败时静默回退到 web TTS（由 tts-manager 处理）
 */
(function() {
  var TAG = 'NativeTTSBridge';

  var NativeTTSBridge = {
    available: false,

    init: function() {
      try {
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.NativeTTS) {
          this.available = true;
          Logger.log(TAG, 'NativeTTS 可用');
          // 立刻替 tts-manager 订阅引擎事件。tts-manager.js 先于本文件加载，
          // 它构造时还看不到 bridge；若引擎在首次朗读之前就初始化失败，
          // 需要有人把 ttsInitFailed 送到它手上，否则要白白浪费第一次朗读才发现。
          try {
            if (window.TTSManager && typeof window.TTSManager._bindNativeEvents === 'function') {
              window.TTSManager._bindNativeEvents();
            }
          } catch (e2) {
            Logger.log(TAG, '绑定引擎事件失败: ' + e2.message);
          }
        } else {
          Logger.log(TAG, 'NativeTTS 不可用，使用 web TTS');
        }
      } catch(e) {
        Logger.log(TAG, 'NativeTTS 检测失败: ' + e.message);
      }
    },

    // 发音请求包装为 Promise<boolean>：
    //   true  = 插件受理；false = 明确失败（reject / 同步异常 / 3s 无应答超时）。
    // ⚠️ "受理"证明不了"出声"：Android 端引擎初始化失败时插件仍会 resolve。
    // 真正的出声证据是 ttsStart / ttsDone / ttsError 事件（Java 端已外传），
    // 由 tts-manager 订阅后判定；这里的 3s 只覆盖"插件完全不应答"的传输层死法。
    // id 由 JS 生成并原样带回，用于把引擎回调关联回具体一次朗读。
    speak: function(text, lang, rate, id) {
      if (!this.available) return Promise.resolve(false);
      var call;
      try {
        call = window.Capacitor.Plugins.NativeTTS.speak({
          text: text || '',
          lang: lang || 'zh-CN',
          rate: rate || 1.0,
          id: id || ''
        });
      } catch(e) {
        Logger.log(TAG, 'speak 失败: ' + e.message);
        return Promise.resolve(false);
      }
      return new Promise(function(resolve) {
        var settled = false;
        var timer = null;
        var done = function(ok, why) {
          if (settled) return;
          settled = true;
          if (timer) clearTimeout(timer);
          if (!ok) Logger.log(TAG, 'speak 未成功(' + why + ')');
          resolve(ok);
        };
        timer = setTimeout(function() { done(false, 'no-response-3s'); }, 3000);
        try {
          Promise.resolve(call).then(
            function() { done(true); },
            function(e) { done(false, (e && e.message) || 'rejected'); }
          );
        } catch(e) {
          done(false, e.message);
        }
      });
    },

    // 订阅 Java 端外传的引擎事件：ttsStart / ttsDone / ttsError / ttsInitFailed。
    // 回调收到的 data 形如 { id, reason }，id 与 speak() 传入的一致。
    // 返回 Capacitor 的 PluginListenerHandle（含 remove()），不可用时返回 null。
    onEvent: function(eventName, callback) {
      if (!this.available || typeof callback !== 'function') return null;
      var plugin;
      try {
        plugin = window.Capacitor.Plugins.NativeTTS;
        if (!plugin || typeof plugin.addListener !== 'function') return null;
        return plugin.addListener(eventName, callback);
      } catch(e) {
        Logger.log(TAG, 'onEvent 订阅失败(' + eventName + '): ' + e.message);
        return null;
      }
    },

    stop: function() {
      if (!this.available) return;
      try {
        window.Capacitor.Plugins.NativeTTS.stop();
      } catch(e) {
        Logger.log(TAG, 'stop 失败: ' + e.message);
      }
    }
  };

  window.NativeTTSBridge = NativeTTSBridge;
})();

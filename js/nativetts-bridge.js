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
        } else {
          Logger.log(TAG, 'NativeTTS 不可用，使用 web TTS');
        }
      } catch(e) {
        Logger.log(TAG, 'NativeTTS 检测失败: ' + e.message);
      }
    },

    // 发音请求包装为 Promise<boolean>：
    //   true  = 插件受理；false = 明确失败（reject / 同步异常 / 3s 无应答超时）。
    // 注意：Android 端引擎初始化失败时插件仍会正常 resolve（只写 logcat），
    // 这种"假成功"由 tts-manager 的 3s 看门狗兜底，这里只负责传输层的确定性失败。
    speak: function(text, lang, rate) {
      if (!this.available) return Promise.resolve(false);
      var call;
      try {
        call = window.Capacitor.Plugins.NativeTTS.speak({
          text: text || '',
          lang: lang || 'zh-CN',
          rate: rate || 1.0
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

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

    speak: function(text, lang, rate) {
      if (!this.available) return false;
      try {
        window.Capacitor.Plugins.NativeTTS.speak({
          text: text || '',
          lang: lang || 'zh-CN',
          rate: rate || 1.0
        });
        return true;
      } catch(e) {
        Logger.log(TAG, 'speak 失败: ' + e.message);
        return false;
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

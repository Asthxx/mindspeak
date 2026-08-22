(function() {
  var TAG = 'AndroidUIInit';

  var AndroidUIInit = {
    init: function() {
      if (!this._isAndroid()) return;
      this._initTouchFeedback();
      this._initSplash();
      this._initSwipeBack();
      if (window.Logger) {
        Logger.log(TAG, 'Android UI 初始化完成');
      }
    },

    _isAndroid: function() {
      return App.detectPlatform() === 'android';
    },

    _initTouchFeedback: function() {
      document.body.classList.add('md3-ripple');
      var items = document.querySelectorAll('.vocab-card, .theme-item, .setting-item');
      for (var i = 0; i < items.length; i++) {
        items[i].classList.add('item-pressed');
      }
    },

    _initSplash: function() {
      if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.SplashScreen) {
        window.Capacitor.Plugins.SplashScreen.hide();
      }
    },

    _initSwipeBack: function() {
      var self = this;
      var startX = 0;
      var startY = 0;
      var triggered = false;
      var threshold = 50; // 滑动距离阈值
      var edgeWidth = 30; // 左边缘检测宽度

      document.addEventListener('touchstart', function(e) {
        var touch = e.touches[0];
        startX = 0;
        startY = 0;
        triggered = false;
        if (touch.clientX < edgeWidth) {
          startX = touch.clientX;
          startY = touch.clientY;
        }
      }, { passive: true });

      document.addEventListener('touchmove', function(e) {
        if (startX === 0 || triggered) return;
        var touch = e.touches[0];
        var deltaX = touch.clientX - startX;
        var deltaY = Math.abs(touch.clientY - startY);

        // 水平滑动距离 > 垂直滑动距离，且在左边缘
        if (deltaX > threshold && deltaY < deltaX * 0.5) {
          triggered = true;
          e.preventDefault();
          self._handleSwipeBack();
        }
      }, { passive: false });

      document.addEventListener('touchend', function() {
        startX = 0;
        startY = 0;
        triggered = false;
      }, { passive: true });
    },

    _handleSwipeBack: function() {
      // 关闭当前页面/返回上级
      if (window.app && window.app.currentTab !== 'home') {
        window.app.showTab('home');
      }
    },
  };

  window.AndroidUIInit = AndroidUIInit;
})();

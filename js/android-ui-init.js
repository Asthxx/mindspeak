(function() {
  var TAG = 'AndroidUIInit';

  var AndroidUIInit = {
    init: function() {
      if (!this._isAndroid()) return;
      this._initStatusBar();
      this._initNavigationBar();
      this._initTouchFeedback();
      this._initSplash();
      Logger.log(TAG, 'Android UI 初始化完成');
    },

    _isAndroid: function() {
      return /android/i.test(navigator.userAgent);
    },

    _initStatusBar: function() {
      if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.StatusBar) {
        window.Capacitor.Plugins.StatusBar.setStyle({ style: 'LIGHT' });
        window.Capacitor.Plugins.StatusBar.setBackgroundColor({ color: '#FFFFFF' });
      }
    },

    _initNavigationBar: function() {
      if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.NavigationBar) {
        window.Capacitor.Plugins.NavigationBar.setStyle({ style: 'LIGHT' });
        window.Capacitor.Plugins.NavigationBar.setColor({ color: '#FFFFFF' });
      }
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
  };

  window.AndroidUIInit = AndroidUIInit;
})();

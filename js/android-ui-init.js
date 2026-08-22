(function() {
  var TAG = 'AndroidUIInit';

  var AndroidUIInit = {
    init: function() {
      if (!this._isAndroid()) return;
      this._initTouchFeedback();
      this._initSplash();
      this._initSwipeBack();
      this._initPullToRefresh();
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

    _initPullToRefresh: function() {
      var self = this;
      var startY = 0;
      var pulling = false;
      var thresholdReached = false;
      var refreshing = false;
      var pullThreshold = 80; // 触发刷新的下拉距离
      var wordPage = document.getElementById('page-word');

      if (!wordPage) return;

      wordPage.addEventListener('touchstart', function(e) {
        if (refreshing) return;
        if (window.scrollY === 0) {
          startY = e.touches[0].clientY;
          pulling = true;
          thresholdReached = false;
        }
      }, { passive: true });

      wordPage.addEventListener('touchmove', function(e) {
        if (!pulling) return;
        var deltaY = e.touches[0].clientY - startY;
        if (deltaY > 0 && deltaY < pullThreshold * 2) {
          thresholdReached = deltaY >= pullThreshold;
          // 显示下拉指示器
          self._showPullIndicator(deltaY / pullThreshold);
        }
      }, { passive: true });

      wordPage.addEventListener('touchend', function() {
        if (!pulling) return;
        pulling = false;
        if (thresholdReached) {
          refreshing = true;
          self._triggerRefresh();
          // 刷新中：指示器旋转一段时间后隐藏
          setTimeout(function() {
            self._hidePullIndicator();
            refreshing = false;
          }, 600);
        } else {
          self._hidePullIndicator();
        }
      }, { passive: true });
    },

    _showPullIndicator: function(progress) {
      var indicator = document.getElementById('pull-refresh-indicator');
      if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'pull-refresh-indicator';
        indicator.innerHTML = '<div class="pull-refresh-spinner"></div>';
        document.body.appendChild(indicator);
      }
      progress = Math.max(0, Math.min(progress, 1));
      indicator.style.opacity = progress;
      indicator.style.transform = 'translateY(' + (progress * 40 - 40) + 'px)';
    },

    _hidePullIndicator: function() {
      var indicator = document.getElementById('pull-refresh-indicator');
      if (indicator) {
        indicator.style.opacity = 0;
        indicator.style.transform = 'translateY(-40px)';
      }
    },

    _triggerRefresh: function() {
      // 触发学习页面刷新（showTab 内部会重新渲染每日计划）
      if (window.app && window.app.showTab) {
        window.app.showTab('word');
      }
    },
  };

  window.AndroidUIInit = AndroidUIInit;
})();

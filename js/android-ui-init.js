(function() {
  var TAG = 'AndroidUIInit';

  var AndroidUIInit = {
    init: function() {
      if (!this._isAndroid()) return;
      this._initTouchFeedback();
      this._initSplash();
      this._initSwipeBack();
      this._initPullToRefresh();
      this._initLongPress();
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

    _initLongPress: function() {
      var self = this;
      var longPressTimer = null;
      var longPressDuration = 500; // 长按时间(ms)

      document.addEventListener('touchstart', function(e) {
        var target = e.target;
        if (!target || !target.closest) return;
        // .vocab-card 为计划选择器，.word-card 为实际 DOM 中的单词卡
        var card = target.closest('.vocab-card, .word-card');
        if (!card) return;

        if (longPressTimer) clearTimeout(longPressTimer);
        longPressTimer = setTimeout(function() {
          longPressTimer = null;
          self._showCardMenu(card);
        }, longPressDuration);
      }, { passive: true });

      // 移动/抬起/取消都中止长按（移动视为滚动，不弹菜单）
      ['touchend', 'touchmove', 'touchcancel'].forEach(function(type) {
        document.addEventListener(type, function() {
          if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
          }
        }, { passive: true });
      });
    },

    _showCardMenu: function(card) {
      this._hideCardMenu();
      var self = this;
      var word = this._getCardWord(card);

      var menu = document.createElement('div');
      menu.className = 'long-press-menu';
      menu.innerHTML =
        '<div class="long-press-menu-item" data-action="favorite"><span class="icon">⭐</span><span>收藏</span></div>' +
        '<div class="long-press-menu-item" data-action="mistake"><span class="icon">❌</span><span>加入错词本</span></div>' +
        '<div class="long-press-menu-item" data-action="share"><span class="icon">📤</span><span>分享</span></div>';

      // 忽略长按抬起瞬间产生的点击，防止误触第一项
      var shownAt = Date.now();
      menu.addEventListener('click', function(e) {
        if (Date.now() - shownAt < 350) return;
        var item = e.target && e.target.closest ? e.target.closest('.long-press-menu-item') : null;
        if (!item) return;
        var action = item.getAttribute('data-action');
        self._hideCardMenu();
        self._handleCardAction(action, word);
      });

      // 先挂载再测量，保证定位时菜单高度准确
      document.body.appendChild(menu);

      // 定位菜单：覆盖卡片顶部区域，并整体夹在视口内
      // （卡片可能被滚动到折叠线下方/贴近屏幕边缘，fixed 坐标需夹取）
      var rect = card.getBoundingClientRect();
      var vw = window.innerWidth || 320;
      var vh = window.innerHeight || 480;
      var width = Math.min(rect.width || 260, 260);
      var left = rect.left + ((rect.width || width) - width) / 2;
      left = Math.max(8, Math.min(left, vw - width - 8));
      var top = Math.max(8, Math.min(rect.top + 24, vh - (menu.offsetHeight || 140) - 8));
      menu.style.position = 'fixed';
      menu.style.top = top + 'px';
      menu.style.left = left + 'px';
      menu.style.width = width + 'px';

      // 点击/触摸菜单外区域关闭
      setTimeout(function() {
        self._cardMenuOutsideHandler = function(e) {
          if (menu.contains(e.target)) return;
          self._hideCardMenu();
        };
        document.addEventListener('click', self._cardMenuOutsideHandler, true);
        document.addEventListener('touchstart', self._cardMenuOutsideHandler, true);
      }, 100);
    },

    _hideCardMenu: function() {
      var old = document.querySelector('.long-press-menu');
      if (old && old.parentNode) old.parentNode.removeChild(old);
      if (this._cardMenuOutsideHandler) {
        document.removeEventListener('click', this._cardMenuOutsideHandler, true);
        document.removeEventListener('touchstart', this._cardMenuOutsideHandler, true);
        this._cardMenuOutsideHandler = null;
      }
    },

    _getCardWord: function(card) {
      if (!card) return '';
      if (card.dataset && card.dataset.word) return card.dataset.word;
      var el = card.querySelector('[data-word]') ||
               card.querySelector('.word-main') ||
               card.querySelector('.vocab-word');
      if (!el && card.id === 'word-card') el = document.getElementById('current-word');
      return el ? ((el.textContent || '').trim()) : '';
    },

    _handleCardAction: function(action, word) {
      var app = window.app;
      if (!app) return;
      switch (action) {
        case 'favorite':
          // 复用学习页收藏逻辑（长按卡片即当前卡片单词）
          if (app.wordModule && app.wordModule.favoriteCurrent) {
            app.wordModule.favoriteCurrent();
          }
          break;
        case 'mistake':
          var w = null;
          if (app.wordModule && app.wordModule.getCurrentWords && typeof app.wordModule.currentIndex === 'number') {
            var words = app.wordModule.getCurrentWords();
            w = words[app.wordModule.currentIndex];
          }
          if (!w && word) w = { word: word };
          if (w && app.addMistake) {
            app.addMistake(w, 'word');
            if (window.Toast && Toast.success) Toast.success('已加入错词本');
          }
          break;
        case 'share':
          this._shareWord(word);
          break;
      }
    },

    _shareWord: function(word) {
      if (!word) return;
      var text = '我在 MindSpeak 学英语单词：' + word;
      if (navigator.share) {
        try { navigator.share({ title: 'MindSpeak 单词分享', text: text }).catch(function() {}); } catch (e) {}
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function() {
          if (window.Toast && Toast.success) Toast.success('已复制到剪贴板');
        }).catch(function() {});
      }
    },
  };

  window.AndroidUIInit = AndroidUIInit;
})();

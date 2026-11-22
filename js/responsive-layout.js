(function() {
  var TAG = 'ResponsiveLayout';

  // ⚠ 死代码标注（2026-11-22 第三轮审计）：window.ResponsiveLayout 目前全仓无消费方
  // （getColumns / isPhone / onBreakpointChange 均无人调用），但仍随 index.html 与
  // build.js 的 jsOrder 加载。下线需同步改 index.html / build.js / app-bootstrap
  // 三张加载表，属维护者决策 —— 此处仅标注，不在无关提交里私自删除。

  var ResponsiveLayout = {
    _currentBreakpoint: null,
    _listeners: [],

    init: function() {
      var self = this;
      this._detect();
      window.addEventListener('resize', function() {
        self._detect();
      });
      Logger.log(TAG, '初始化断点: ' + this._currentBreakpoint);
    },

    _detect: function() {
      var width = window.screen.width || window.innerWidth;
      var old = this._currentBreakpoint;

      if (width <= 360) {
        this._currentBreakpoint = 'xs';
      } else if (width <= 480) {
        this._currentBreakpoint = 'sm';
      } else if (width <= 900) {
        this._currentBreakpoint = 'md';
      } else if (width <= 1024) {
        this._currentBreakpoint = 'lg';
      } else {
        this._currentBreakpoint = 'xl';
      }

      if (old !== this._currentBreakpoint) {
        this._notifyListeners();
      }
    },

    getBreakpoint: function() {
      if (!this._currentBreakpoint) this._detect();
      return this._currentBreakpoint;
    },

    getColumns: function() {
      var bp = this.getBreakpoint();
      switch (bp) {
        case 'xs': return 3;
        case 'sm': return 4;
        case 'md': return 5;
        case 'lg': return 6;
        case 'xl': return 8;
        default: return 3;
      }
    },

    isPhone: function() {
      var bp = this.getBreakpoint();
      return bp === 'xs' || bp === 'sm';
    },

    isTablet: function() {
      var bp = this.getBreakpoint();
      return bp === 'md' || bp === 'lg';
    },

    onBreakpointChange: function(callback) {
      this._listeners.push(callback);
    },

    _notifyListeners: function() {
      var bp = this._currentBreakpoint;
      this._listeners.forEach(function(cb) {
        try { cb(bp); } catch(e) {}
      });
    },
  };

  window.ResponsiveLayout = ResponsiveLayout;
})();

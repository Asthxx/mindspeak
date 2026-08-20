(function() {
  var TAG = 'ResponsiveLayout';

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

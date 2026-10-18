(function() {
  var TAG = 'NotificationManager';
  var CHANNEL_ID = 'mindspeak-study';
  var CHANNEL_NAME = '学习提醒';
  // 固定 id：schedule 同一个 id 会覆盖旧的那条。
  // 早先用自增 id，每次重新调度（改时间、冷启动）都多生成一条每日提醒，
  // 结果是用户在同一时间收到 N 条一模一样的通知。这里两个用途各占一个固定 id。
  var DAILY_ID = 1001;
  var POMODORO_ID = 1002;

  var DAILY_TITLE = '该学英语啦';
  var DAILY_BODY = '今天的单词还等着你，来学 10 分钟吧';

  var NotificationManager = {
    _permissionGranted: false,
    _webTimer: null,

    init: function() {
      if (!this._isAndroid()) return;
      this._ensurePermission();
      this._createChannel();
    },

    _isAndroid: function() {
      try { return window.App && window.App.detectPlatform && window.App.detectPlatform() === 'android'; } catch (e) { return false; }
    },

    _plugin: function() {
      return (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications) || null;
    },

    // 环境是否具备通知能力：Android 走 Capacitor 本地通知，Web/桌面走浏览器 Notification。
    // 设置页据此决定"开关要不要禁用 + 提示文案怎么写"。
    isSupported: function() {
      if (this._plugin()) return true;
      return typeof Notification !== 'undefined' && typeof Notification.requestPermission === 'function';
    },

    // 同步读当前是否已授权。Android 侧依赖 init/requestPermission 时写下的结果；
    // 未探测过就是 false（调用方走 requestPermission 拿准确值）。
    hasPermission: function() {
      if (this._plugin()) return !!this._permissionGranted;
      return typeof Notification !== 'undefined' && Notification.permission === 'granted';
    },

    // 只在"从未询问过"(prompt) 时弹系统授权框：
    // 每次冷启动都直接 requestPermissions()，用户拒绝过后 Android 仍会再弹窗
    //（连拒两次才永久静默），表现为"清后台重开就又问一次"。先 checkPermissions：
    // 已授权静默通过；曾拒绝不再自动骚扰（用户可去系统设置开启）；仅首次询问。
    _ensurePermission: function() {
      var self = this;
      var P = this._plugin();
      if (!P) return;
      if (!P.checkPermissions) { this._requestPermission(P); return; } // 旧插件兼容回退
      P.checkPermissions().then(function(status) {
        if (status && status.display === 'granted') {
          self._permissionGranted = true;
          Logger.log(TAG, '通知权限已授予');
          return undefined;
        }
        if (status && status.display === 'denied') {
          self._permissionGranted = false;
          Logger.log(TAG, '通知权限此前被拒绝，不再自动询问');
          return undefined;
        }
        return P.requestPermissions().then(function(result) {
          self._permissionGranted = result.display === 'granted';
          Logger.log(TAG, '通知权限状态: ' + result.display);
        });
      }).catch(function(err) {
        Logger.log(TAG, '权限检查失败: ' + (err.message || err));
      });
    },

    _requestPermission: function(P) {
      var self = this;
      P = P || this._plugin();
      if (!P) return;
      P.requestPermissions().then(function(result) {
        self._permissionGranted = result.display === 'granted';
        Logger.log(TAG, '通知权限状态: ' + result.display);
      }).catch(function(err) {
        Logger.log(TAG, '权限请求失败: ' + (err.message || err));
      });
    },

    // 对外：用户主动打开开关时调用。Android 已授权时不会重复弹窗，
    // Web 端必须发生在用户手势里（点开关正好满足），否则 Chrome 会直接拒绝。
    // 只问一次的入口：先看当前状态，再决定要不要弹系统授权框。
    //   granted → 直接通过，不弹
    //   denied  → 用户已经明确拒绝过，**不再弹**（Android 上重复 requestPermissions
    //             会再弹一次，连拒两次才永久静默，非常招人烦）；交给调用方引导去系统设置
    //   prompt  → 从未问过，这是唯一该弹的一次
    requestPermission: function() {
      var self = this;
      var P = this._plugin();
      if (P) {
        if (!P.requestPermissions) return Promise.resolve(false);
        var query = P.checkPermissions ? P.checkPermissions() : Promise.resolve(null);
        return Promise.resolve(query).catch(function() { return null; }).then(function(status) {
          var d = status && status.display;
          self._permissionGranted = d === 'granted';
          if (d === 'granted') return true;
          if (d === 'denied') {
            Logger.log(TAG, '通知权限此前已被拒绝，本次不再弹窗');
            return false;
          }
          return P.requestPermissions().then(function(result) {
            self._permissionGranted = !!result && result.display === 'granted';
            Logger.log(TAG, '通知权限状态: ' + self._permissionGranted);
            return self._permissionGranted;
          }).catch(function(err) {
            Logger.log(TAG, '权限请求失败: ' + ((err && err.message) || err));
            return false;
          });
        });
      }
      if (typeof Notification === 'undefined' || !Notification.requestPermission) return Promise.resolve(false);
      // 浏览器侧同理：denied 之后再调 requestPermission 也拿不到授权，只会再弹一次
      if (Notification.permission === 'granted') { this._permissionGranted = true; return Promise.resolve(true); }
      if (Notification.permission === 'denied') { this._permissionGranted = false; return Promise.resolve(false); }
      try {
        // 旧版 API 是 callback 风格（返回 undefined），这里统一 Promise 化后
        // 再回读 Notification.permission，两种浏览器都拿得到准确结果。
        return Promise.resolve(Notification.requestPermission()).then(function() {
          self._permissionGranted = Notification.permission === 'granted';
          return self._permissionGranted;
        });
      } catch (e) {
        return Promise.resolve(false);
      }
    },

    _createChannel: function() {
      var P = this._plugin();
      if (!P || !P.createChannel) return;
      P.createChannel({
        id: CHANNEL_ID,
        name: CHANNEL_NAME,
        description: '每日学习提醒和番茄钟结束通知',
        importance: 4,
        visibility: 1,
      }).catch(function(err) {
        Logger.log(TAG, '创建通知渠道失败: ' + (err.message || err));
      });
    },

    // 立即发一条通知。主要给番茄钟用：App 退到后台时 setInterval 会被节流甚至挂起，
    // 只有系统通知能在那个时刻把人叫回来。
    notifyNow: function(title, body, opts) {
      opts = opts || {};
      var self = this;
      var P = this._plugin();
      if (P && P.schedule) {
        return P.schedule({
          notifications: [{
            id: opts.id || POMODORO_ID,
            title: title || '学习提醒',
            body: body || '',
            channelId: CHANNEL_ID,
            extra: opts.extra || null,
          }]
        }).then(function() {
          Logger.log(TAG, '即时通知已发出: ' + title);
          return true;
        }).catch(function(err) {
          Logger.log(TAG, '即时通知失败: ' + ((err && err.message) || err));
          return false;
        });
      }
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try {
          // tag 相同会替换上一条，避免番茄钟连开几轮后堆一排通知
          new Notification(title || '学习提醒', { body: body || '', tag: opts.tag || 'mindspeak' });
          return Promise.resolve(true);
        } catch (e) {
          return Promise.resolve(false);
        }
      }
      return Promise.resolve(false);
    },

    // 每日定时提醒。同一 id 重复调用 = 覆盖，不会产生多条。
    scheduleDaily: function(hour, minute) {
      var h = Math.max(0, Math.min(23, parseInt(hour, 10) || 0));
      var m = Math.max(0, Math.min(59, parseInt(minute, 10) || 0));
      var P = this._plugin();
      if (!P || !P.schedule) {
        // Web/桌面没有本地定时通知能力，退化成"页面开着时到点提醒一次"。
        this._startWebDaily(h, m);
        return Promise.resolve(false);
      }
      var self = this;
      return P.schedule({
        notifications: [{
          id: DAILY_ID,
          title: DAILY_TITLE,
          body: DAILY_BODY,
          channelId: CHANNEL_ID,
          schedule: { every: 'day', at: { hour: h, minute: m } },
          extra: { module: 'home' },
        }]
      }).then(function() {
        Logger.log(TAG, '每日提醒已调度: ' + h + ':' + (m < 10 ? '0' + m : m));
        return true;
      }).catch(function(err) {
        Logger.log(TAG, '调度失败: ' + ((err && err.message) || err));
        return false;
      });
    },

    cancelDaily: function() {
      var P = this._plugin();
      this._stopWebDaily();
      if (!P || !P.cancel) return Promise.resolve(false);
      return P.cancel({ notifications: [{ id: DAILY_ID }] })
        .then(function() { return true; })
        .catch(function(err) {
          Logger.log(TAG, '取消失败: ' + ((err && err.message) || err));
          return false;
        });
    },

    // ---- Web 降级：页面开着时到点提醒一次 ----
    // 浏览器没有"定时推送"能力，关掉页面就收不到；这里只在页面存活期间兜住，
    // 并且按日期去重，避免刷新一次弹一次。
    _startWebDaily: function(hour, minute) {
      var self = this;
      this._stopWebDaily();
      this._webTick(hour, minute);
      this._webTimer = setInterval(function() { self._webTick(hour, minute); }, 30000);
    },
    _stopWebDaily: function() {
      if (this._webTimer) { clearInterval(this._webTimer); this._webTimer = null; }
    },
    _webTick: function(hour, minute) {
      var now = new Date();
      // 给 2 分钟窗口：tick 是 30s 一次，精确判等会漏掉那一分钟
      if (now.getHours() !== hour) return;
      if (now.getMinutes() < minute || now.getMinutes() >= minute + 2) return;
      var key = 'ms_daily_reminder_sent_' + now.getFullYear() + '_' + (now.getMonth() + 1) + '_' + now.getDate();
      try {
        if (localStorage.getItem(key)) return;
        localStorage.setItem(key, '1');
      } catch (e) {}
      this.notifyNow(DAILY_TITLE, DAILY_BODY);
    },

    scheduleDailyReminder: function(hour, minute, title, body) {
      // 兼容旧签名：老调用点只给了文案，没有 daily id 语义。
      // 保留它以免别处还在用，但新代码一律走 scheduleDaily()。
      Logger.log(TAG, 'scheduleDailyReminder 已弃用，改用 scheduleDaily');
      if (title || body) {
        DAILY_TITLE = title || DAILY_TITLE;
        DAILY_BODY = body || DAILY_BODY;
      }
      return this.scheduleDaily(hour, minute);
    },

    cancelAll: function() {
      var P = this._plugin();
      if (!P) return;
      if (P.getPending) {
        P.getPending().then(function(result) {
          if (result.notifications && result.notifications.length > 0 && P.cancel) {
            var ids = result.notifications.map(function(n) { return { id: n.id }; });
            P.cancel({ notifications: ids });
          }
        }).catch(function(err) {
          Logger.log(TAG, '取消通知失败: ' + ((err && err.message) || err));
        });
      }
    },

    handleNotificationData: function(data) {
      if (!data || !data.module) return;
      Logger.log(TAG, '通知深度链接: ' + JSON.stringify(data));
      if (window.App && window.App.switchTab) {
        window.App.switchTab(data.module);
      }
    },
  };

  window.NotificationManager = NotificationManager;
})();

(function() {
  var TAG = 'NotificationManager';
  var CHANNEL_ID = 'mindspeak-study';
  var CHANNEL_NAME = '学习提醒';
  var _nextId = 1;

  var NotificationManager = {
    _permissionGranted: false,

    init: function() {
      if (!this._isAndroid()) return;
      this._ensurePermission();
      this._createChannel();
    },

    _isAndroid: function() {
      return App.detectPlatform() === 'android';
    },

    // 只在"从未询问过"(prompt) 时弹系统授权框：
    // 每次冷启动都直接 requestPermissions()，用户拒绝过后 Android 仍会再弹窗
    //（连拒两次才永久静默），表现为"清后台重开就又问一次"。先 checkPermissions：
    // 已授权静默通过；曾拒绝不再自动骚扰（用户可去系统设置开启）；仅首次询问。
    _ensurePermission: function() {
      var self = this;
      var P = (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications) || null;
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
      P = P || (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications);
      if (!P) return;
      P.requestPermissions().then(function(result) {
        self._permissionGranted = result.display === 'granted';
        Logger.log(TAG, '通知权限状态: ' + result.display);
      }).catch(function(err) {
        Logger.log(TAG, '权限请求失败: ' + (err.message || err));
      });
    },

    _createChannel: function() {
      if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications) {
        window.Capacitor.Plugins.LocalNotifications.createChannel({
          id: CHANNEL_ID,
          name: CHANNEL_NAME,
          description: '每日学习提醒和复习通知',
          importance: 4,
          visibility: 1,
        }).catch(function(err) {
          Logger.log(TAG, '创建通知渠道失败: ' + (err.message || err));
        });
      }
    },

    scheduleDailyReminder: function(hour, minute, title, body) {
      if (!window.Capacitor || !window.Capacitor.Plugins || !window.Capacitor.Plugins.LocalNotifications) {
        Logger.log(TAG, '非 Capacitor 环境，跳过通知调度');
        return;
      }
      if (!this._permissionGranted) {
        Logger.log(TAG, '通知权限未授予，跳过调度');
        return;
      }
      var self = this;
      var notifId = _nextId++;
      window.Capacitor.Plugins.LocalNotifications.schedule({
        notifications: [{
          id: notifId,
          title: title || '学习提醒',
          body: body || '该复习啦！',
          channelId: CHANNEL_ID,
          schedule: { every: 'day', at: { hour: hour || 8, minute: minute || 30 } },
        }]
      }).then(function() {
        Logger.log(TAG, '每日提醒已调度 (id=' + notifId + ')');
      }).catch(function(err) {
        Logger.log(TAG, '调度失败: ' + (err.message || err));
      });
    },

    cancelAll: function() {
      if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications) {
        window.Capacitor.Plugins.LocalNotifications.getPending().then(function(result) {
          if (result.notifications && result.notifications.length > 0) {
            var ids = result.notifications.map(function(n) { return { id: n.id }; });
            window.Capacitor.Plugins.LocalNotifications.cancel({ notifications: ids });
          }
        }).catch(function(err) {
          Logger.log(TAG, '取消通知失败: ' + (err.message || err));
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

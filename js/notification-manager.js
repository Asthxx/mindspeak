(function() {
  var TAG = 'NotificationManager';
  var CHANNEL_ID = 'mindspeak-study';
  var CHANNEL_NAME = '学习提醒';
  var _nextId = 1;

  var NotificationManager = {
    _permissionGranted: false,

    init: function() {
      if (!this._isAndroid()) return;
      this._requestPermission();
      this._createChannel();
    },

    _isAndroid: function() {
      return /android/i.test(navigator.userAgent);
    },

    _requestPermission: function() {
      var self = this;
      if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications) {
        window.Capacitor.Plugins.LocalNotifications.requestPermissions().then(function(result) {
          self._permissionGranted = result.display === 'granted';
          Logger.log(TAG, '通知权限状态: ' + result.display);
          if (!self._permissionGranted) {
            Logger.log(TAG, '通知权限被拒绝，提醒功能不可用');
          }
        }).catch(function(err) {
          Logger.log(TAG, '权限请求失败: ' + (err.message || err));
        });
      }
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

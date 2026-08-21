### Task 5.2: Implement Notification Manager

**Files:**
- Create: `js/notification-manager.js`
- Modified: `index.html` (add script tag)
- Modified: `js/app.js` (add NotificationManager.init() call)

- [ ] **Step 1: Create js/notification-manager.js**

```javascript
(function() {
  var TAG = 'NotificationManager';
  var CHANNEL_ID = 'mindspeak-study';
  var CHANNEL_NAME = '学习提醒';

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
        });
      }
    },

    scheduleDailyReminder: function(hour, minute, title, body) {
      if (!window.Capacitor || !window.Capacitor.Plugins || !window.Capacitor.Plugins.LocalNotifications) {
        Logger.log(TAG, '非 Capacitor 环境，跳过通知调度');
        return;
      }
      var self = this;
      window.Capacitor.Plugins.LocalNotifications.schedule({
        notifications: [{
          id: Date.now() % 100000,
          title: title || '学习提醒',
          body: body || '该复习啦！',
          channelId: CHANNEL_ID,
          schedule: { every: 'day', at: { hour: hour || 8, minute: minute || 30 } },
        }]
      }).then(function() {
        Logger.log(TAG, '每日提醒已调度');
      }).catch(function(err) {
        Logger.log(TAG, '调度失败: ' + (err.message || err));
      });
    },

    cancelAll: function() {
      if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications) {
        window.Capacitor.Plugins.LocalNotifications.getPending().then(function(result) {
          if (result.notifications && result.notifications.length > 0) {
            var ids = result.notifications.map(function(n) { return n.id; });
            window.Capacitor.Plugins.LocalNotifications.cancel({ notifications: ids.map(function(id) { return { id: id }; }) });
          }
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
```

- [ ] **Step 2: Add script tag to index.html**

Add before `</body>`:
```html
<script src="js/notification-manager.js"></script>
```

- [ ] **Step 3: Add init call in app.js**

Add after existing platform init:
```javascript
if (window.NotificationManager) {
  window.NotificationManager.init();
}
```

- [ ] **Step 4: Run full test suite**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add js/notification-manager.js index.html js/app.js
git commit -m "feat: add Android NotificationManager with scheduling and deep linking"
```

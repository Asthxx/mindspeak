### Task 7.2: Implement StatusBar/NavigationBar Init

**Files:**
- Create: `js/android-ui-init.js`
- Modified: `index.html` (add script tag)
- Modified: `css/mobile.css` (add Android-specific styles at bottom)

- [ ] **Step 1: Create js/android-ui-init.js**

```javascript
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
```

- [ ] **Step 2: Add Android-specific CSS to css/mobile.css**

Append at the end of the file:

```css
/* Android MD3 Adaptation */
.platform-android .vocab-card { border-radius: 12px; }
.platform-android .theme-item { border-radius: 16px; }
.platform-android .setting-item { border-radius: 8px; }

.md3-ripple { position: relative; overflow: hidden; }
.md3-ripple::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle, rgba(0,0,0,0.1) 10%, transparent 10%);
  transform: scale(10);
  opacity: 0;
  transition: transform 0.5s, opacity 1s;
}
.md3-ripple:active::after {
  transform: scale(0);
  opacity: 0.3;
  transition: 0s;
}

.item-pressed { transition: transform 0.1s; }
.item-pressed:active { transform: scale(0.98); }

.safe-area-top { padding-top: env(safe-area-inset-top, 24px); }
.safe-area-bottom { padding-bottom: env(safe-area-inset-bottom, 0px); }
```

- [ ] **Step 3: Add script tag to index.html**

Add before `</body>`:
```html
<script src="js/android-ui-init.js"></script>
```

- [ ] **Step 4: Run full test suite**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add js/android-ui-init.js css/mobile.css index.html
git commit -m "feat: add Android UI init with MD3 theme, status/nav bars, and touch feedback"
```

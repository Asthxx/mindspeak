### Task 3.2: Implement Back Button Handler in app.js

**Files:**
- Modified: `js/app.js`

- [ ] **Step 1: Read the relevant section of app.js**

Find the platform detection code (~line 5290) and the initialization section to understand where to add the back handler.

- [ ] **Step 2: Add `_initAndroidBackHandler` method**

Add after the platform detection block:

```javascript
_initAndroidBackHandler: function() {
  if (!window.Capacitor || !window.Capacitor.Plugins || !window.Capacitor.Plugins.App) return;
  var self = this;
  window.Capacitor.Plugins.App.addListener('backButton', function() {
    var sidebar = document.getElementById('sidebar');
    if (sidebar && sidebar.classList.contains('open')) {
      sidebar.classList.remove('open');
      return;
    }
    var modal = document.querySelector('.modal-overlay.active');
    if (modal) {
      modal.classList.remove('active');
      return;
    }
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    Toast.info('再按一次退出');
  });
},
```

- [ ] **Step 3: Call `_initAndroidBackHandler` in app initialization**

Find the app initialization block and add the call:

```javascript
// After platform detection
if (isAndroid || isCap || isCapGlobal) {
  self._initAndroidBackHandler();
}
```

- [ ] **Step 4: Run full test suite to verify no regressions**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add js/app.js
git commit -m "feat: add Android back button handler with priority chain"
```

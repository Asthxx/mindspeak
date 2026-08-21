## Task 7.2 Report: StatusBar/NavigationBar Init

**Status:** DONE

### Files Created/Modified

| File | Action | Lines |
|------|--------|-------|
| `js/android-ui-init.js` | Created | 42 lines |
| `css/mobile.css` | Appended | 26 lines added at end |
| `index.html` | Modified | Added `<script src="js/android-ui-init.js"></script>` before `</body>` |

### What Was Done

1. Created `js/android-ui-init.js` — IIFE exposing `window.AndroidUIInit` with methods:
   - `init()` — main entry, gates on Android UA
   - `_isAndroid()` — UA detection
   - `_initStatusBar()` — Capacitor StatusBar plugin (LIGHT style, white bg)
   - `_initNavigationBar()` — Capacitor NavigationBar plugin (LIGHT style, white bg)
   - `_initTouchFeedback()` — adds `md3-ripple` to body, `item-pressed` to interactive cards
   - `_initSplash()` — Capacitor SplashScreen.hide()

2. Appended Android MD3 CSS to `css/mobile.css` (lines 538–563):
   - `.platform-android` border-radius for vocab-card, theme-item, setting-item
   - `.md3-ripple` ripple animation (radial-gradient scale trick)
   - `.item-pressed` scale(0.98) feedback
   - `.safe-area-top` / `.safe-area-bottom` with `env()` fallbacks

3. Added `<script src="js/android-ui-init.js"></script>` before `</body>` in `index.html`

### Test Results

- **23 test files, 217 tests — all passing**
- No regressions; all existing tests unaffected

### Commit

`f8d10cb` — feat: add Android UI init with MD3 theme, status/nav bars, and touch feedback

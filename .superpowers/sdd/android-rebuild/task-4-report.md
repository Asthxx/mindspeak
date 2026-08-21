# Task 4 Report: Fix Android Module Bundling in build.js

## Status: COMPLETE

## Problem
Two existing Android adaptation modules were never included in `build.js` `jsOrder`, so they were never bundled into the APK:

1. `js/android-ui-init.js` — Android UI initialization (StatusBar, NavigationBar, touch feedback, splash)
2. `js/notification-manager.js` — Local notification scheduling and handling

## Changes
**File:** `build.js`

Added two entries to the `jsOrder` array immediately after `js/nativetts-bridge.js` (before `js/app.js`):

```javascript
  'js/nativetts-bridge.js', // Capacitor 原生 TTS 桥接层（Android 端由 tts-manager 调用）
  'js/android-ui-init.js', // Android UI 初始化（StatusBar、NavigationBar、触摸反馈、启动屏）
  'js/notification-manager.js', // Android 本地通知管理（学习提醒、复习调度）
  'js/app.js',
```

Load order rationale:
- Both modules load after the core stack (`logger` → `errors` → `events` → `store`) and TTS layer (`tts-manager` → `nativetts-bridge`)
- They load before `app.js` so their `window.*` APIs are available when app initialization runs

## Verification
- Confirmed both source files exist: `js/android-ui-init.js`, `js/notification-manager.js`
- `node --check build.js` → syntax OK
- Committed only `build.js`: `23d50e1 fix: add missing Android modules to build jsOrder`

## Notes
- No new notification-handler.js was created; existing `notification-manager.js` handles everything as instructed.
- Next build run will include both modules in the merged bundle.

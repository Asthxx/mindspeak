# Task 6 Report: Add Capacitor Skip to Service Worker

## Status: Complete

## Changes

Added a Capacitor environment detection check in `sw.js` fetch event handler (after the GET method check, before URL parsing):

```javascript
// Capacitor 环境跳过：origin 为 https://localhost 表示 Capacitor 打包环境
if (location.origin === 'https://localhost' && location.protocol === 'https:') return;
```

## Rationale

- In Capacitor, web assets are served from origin `https://localhost`. The SW previously cached all these resources, causing stale content after APK updates.
- Skipping SW caching in this environment lets Capacitor's own asset management handle offline capability.
- Note: the originally suggested `window.Capacitor` check was NOT used because `window` is unavailable in Service Worker context. Origin-based detection is the correct approach.

## Verification

- `node --check sw.js` — passed (no syntax errors)
- Committed as `da01720` — "fix: skip SW cache in Capacitor environment"

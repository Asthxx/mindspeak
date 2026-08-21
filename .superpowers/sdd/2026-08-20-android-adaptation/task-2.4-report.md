## Task 2.4: JS-Side Server Detection Tests

### Status: DONE

### Commit
- `f82f7b3` — `test: add Android server detection and TTS fallback tests`

### What Was Done
Created `tests/android/server-plugin.test.js` with 12 tests across 3 describe blocks:

1. **Android 原生服务器检测** (6 tests) — Capacitor plugin availability, platform detection via UA string, CSS class check, and `isNative` flag.
2. **NanoHTTPD 端点路由** (3 tests) — Validates `/api/health`, `/api/tts`, `/api/log` endpoints exist.
3. **TTS 降级路径** (3 tests) — Verifies native server preference and fallback logic to local SAPI when server is down or platform is not Android.

All 12 tests pass. Pure logic tests — no implementation code modified.

### Concerns
None.

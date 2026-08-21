## Task 1.2: Create Capacitor Config

**Status:** DONE

### Steps Completed

1. Added 6 new tests to `tests/android/capacitor-config.test.js` for verifying `capacitor.config.ts` contents (appId, appName, webDir, androidScheme, cleartext).
2. Verified RED: 1 test failed (`should_have_capacitor_config_ts`), 9 passed.
3. Created `capacitor.config.ts` with required configuration.
4. Verified GREEN: 15/15 tests passed.
5. Committed.

### Files Changed

- **Created:** `capacitor.config.ts` — Capacitor configuration with appId `com.mindspeak.app`, webDir `dist`, server settings (https scheme, cleartext), and Android build options.
- **Modified:** `tests/android/capacitor-config.test.js` — Added 6 new tests for config file validation.

### Commit

- `60d667f` — feat: add Capacitor config with appId, webDir, and server settings

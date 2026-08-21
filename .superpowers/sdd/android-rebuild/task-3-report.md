# Task 3 Report: Create NativeTTS Capacitor Plugin

**Status:** Complete
**Commit:** `5d1455f` — `feat: add NativeTTS Capacitor plugin (JS bridge + Java)`

## Files Created

| File | Purpose |
|------|---------|
| `android/app/src/main/java/com/asthxx/mindspeak/NativeTTS.java` | Capacitor plugin wrapping Android `TextToSpeech` (`speak` / `stop` / `getVoices`), with lazy init + pending-speech queue |
| `android/app/src/main/java/com/asthxx/mindspeak/NativeTTSPlugin.java` | Static `register(Bridge)` helper for plugin registration |
| `js/nativetts-bridge.js` | JS bridge layer; detects `window.Capacitor.Plugins.NativeTTS`, exposes `available` / `speak(text, lang, rate)` / `stop()`, silently returns false when unavailable so tts-manager falls back to web TTS |

## build.js Change

Added `'js/nativetts-bridge.js'` to the `jsOrder` array at **build.js:17**, immediately after `'js/tts-manager.js'` (both are TTS infrastructure; the bridge only depends on `logger.js`, which loads first, so ordering is safe).

## Verification

- `node --check js/nativetts-bridge.js` — passed
- `node --check build.js` — passed
- Java files cannot be compiled yet (`android/` Gradle project doesn't exist until `npx cap add android`); syntax reviewed manually.

## Deviations / Issues

1. **Fixed compile error in provided code:** The spec used `TextToSpeech.EngineParam.KEY_PARAM_UTTERANCE_ID`, but no `EngineParam` class exists in the Android SDK. Changed to `TextToSpeech.Engine.KEY_PARAM_UTTERANCE_ID` (the correct constant). Without this fix, the future Gradle build would fail.
2. **`onDestroy()` lifecycle (flagged, not changed):** `NativeTTS.onDestroy()` is a plain public method — Capacitor only calls `handleOnDestroy()` on plugins. As written, the TTS engine won't be shut down on activity destroy (minor resource leak). Recommend renaming to `@Override handleOnDestroy()` during Task 4/5 when MainActivity wiring happens.
3. **Plugin registration pending:** `NativeTTSPlugin.register(bridge)` must be invoked from `MainActivity` after `npx cap add android` creates it (or use Capacitor's `registerPlugin(NativeTTS.class)` inside `onCreate`). This is expected to be part of a later task.
4. **Commit scope:** Per instructions, `git add -A` was used, which also committed the pre-existing untracked reports from Tasks 1.2 and 2 plus `progress.md` changes in the same commit.

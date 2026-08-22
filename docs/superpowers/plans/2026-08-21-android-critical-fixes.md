# Android Critical Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 8 issues preventing the Android app from launching and running TTS correctly.

**Architecture:** Minimal surgical fixes to existing files — no restructuring, no new files.

**Tech Stack:** Vanilla JS, Capacitor 8, Java (Android), build.js bundler

**Spec:** Investigation results from 2026-08-21 Android debugging session (P1-P4 findings in conversation history)

## Global Constraints

- vanilla JS, zero framework
- `build.js` produces `dist/` for PWA and Android
- Non-ASCII project path requires `android.overridePathCheck=true`
- Capacitor 8 requires Java 17 (patched via `capacitor.build.gradle`)
- ES6 class (tts-manager.js) ships untranspiled — fine for Chrome 49+ (minSdkVersion=24)

---

### Task 1: Add `window.Logger` alias (CRITICAL — App never starts without this)

**Files:**
- Modify: `js/logger.js:217` (add alias after `window.Log` definition)

**Interfaces:**
- Produces: `window.Logger` pointing to same object as `window.Log`

- [ ] **Step 1: Add alias in logger.js**

After `window.Log = {` definition block closes, add:

```javascript
window.Logger = window.Log;
```

- [ ] **Step 2: Verify**

Run: `node build.js` — should succeed with no errors.

- [ ] **Step 3: Commit**

```bash
git add js/logger.js
git commit -m "fix: add window.Logger alias to resolve ReferenceError on Android boot"
```

---

### Task 2: Add `responsive-layout.js` to build (CRITICAL — Module missing from bundle)

**Files:**
- Modify: `build.js:11-31` (jsOrder array)

**Interfaces:**
- Produces: `responsive-layout.js` included in `bundle.js`

- [ ] **Step 1: Add to jsOrder**

In `build.js`, add `'js/responsive-layout.js'` to the `jsOrder` array after `'js/notification-manager.js'`:

```javascript
const jsOrder = [
  'js/logger.js',
  'js/core/errors.js',
  'js/core/events.js',
  'js/core/store.js',
  'js/tts-manager.js',
  'js/nativetts-bridge.js',
  'js/android-ui-init.js',
  'js/notification-manager.js',
  'js/responsive-layout.js',  // <-- ADD THIS LINE
  'js/app.js',
  // ... rest unchanged
];
```

- [ ] **Step 2: Verify build includes it**

Run: `node build.js` then check `dist/js/bundle.js` contains `ResponsiveLayout` or `_currentBreakpoint`.

- [ ] **Step 3: Commit**

```bash
git add build.js
git commit -m "fix: add responsive-layout.js to build jsOrder"
```

---

### Task 3: Wrap AndroidUIInit.init() in try/catch (IMPORTANT — Defensive)

**Files:**
- Modify: `js/app.js:7146`

**Interfaces:**
- Consumes: `window.AndroidUIInit` (from android-ui-init.js)
- Produces: Error in AndroidUIInit won't kill the rest of DOMContentLoaded handler

- [ ] **Step 1: Wrap in try/catch**

Replace:
```javascript
  if (window.AndroidUIInit) AndroidUIInit.init();
```

With:
```javascript
  try { if (window.AndroidUIInit) AndroidUIInit.init(); } catch(e) { console.error('AndroidUIInit failed:', e); }
```

- [ ] **Step 2: Commit**

```bash
git add js/app.js
git commit -m "fix: wrap AndroidUIInit.init() in try/catch to prevent boot failure"
```

---

### Task 4: Initialize NativeTTSBridge at boot (IMPORTANT — Bridge never activated)

**Files:**
- Modify: `js/app.js:7148` (after AndroidUIInit call, inside DOMContentLoaded)

**Interfaces:**
- Consumes: `window.NativeTTSBridge` (from nativetts-bridge.js, bundled)
- Produces: `NativeTTSBridge.available` set to `true` on Android if plugin exists

- [ ] **Step 1: Add init call**

After the AndroidUIInit try/catch block (Task 3), add:

```javascript
  try { if (window.NativeTTSBridge) NativeTTSBridge.init(); } catch(e) { console.error('NativeTTSBridge init failed:', e); }
```

- [ ] **Step 2: Commit**

```bash
git add js/app.js
git commit -m "fix: initialize NativeTTSBridge at boot for Android native TTS"
```

---

### Task 5: Fix NativeTTS.java lifecycle (IMPORTANT — TTS resource leak)

**Files:**
- Modify: `android/app/src/main/java/com/asthxx/mindspeak/NativeTTS.java:128-134`

**Interfaces:**
- Produces: TTS engine properly shut down when Activity is destroyed

- [ ] **Step 1: Replace onDestroy with handleOnDestroy**

Replace:
```java
    public void onDestroy() {
        if (tts != null) {
            tts.stop();
            tts.shutdown();
            tts = null;
        }
    }
```

With:
```java
    @Override
    protected void handleOnDestroy() {
        if (tts != null) {
            tts.stop();
            tts.shutdown();
            tts = null;
        }
    }
```

- [ ] **Step 2: Commit**

```bash
git add android/app/src/main/java/com/asthxx/mindspeak/NativeTTS.java
git commit -m "fix: use handleOnDestroy() for Capacitor Plugin lifecycle in NativeTTS"
```

---

### Task 6: Exclude Edge TTS on Android (IMPORTANT — Wasted latency)

**Files:**
- Modify: `js/app.js:1163` and `js/app.js:1204`

**Interfaces:**
- Consumes: `_isAndroidSrc` flag
- Produces: Edge sources excluded from Android candidate list

- [ ] **Step 1: Update Android filter at line 1163**

Replace:
```javascript
      DEFAULT_ORDER = DEFAULT_ORDER.filter(function(id) { return id === 'youdao_us' || id === 'youdao_uk' || id === 'edge_us_jenny'; });
```

With:
```javascript
      DEFAULT_ORDER = DEFAULT_ORDER.filter(function(id) { return id === 'youdao_us' || id === 'youdao_uk'; });
```

- [ ] **Step 2: Update Android parallel candidates at line 1204**

Replace:
```javascript
        ids = ids.filter(function(id) { return id === 'youdao_us' || id === 'youdao_uk' || id === 'edge_us_jenny'; });
```

With:
```javascript
        ids = ids.filter(function(id) { return id === 'youdao_us' || id === 'youdao_uk'; });
```

- [ ] **Step 3: Commit**

```bash
git add js/app.js
git commit -m "fix: exclude Edge TTS from Android remote fallback candidates (no server available)"
```

---

### Task 7: Check setLanguage return value in NativeTTS.java (MINOR)

**Files:**
- Modify: `android/app/src/main/java/com/asthxx/mindspeak/NativeTTS.java:91`

**Interfaces:**
- Produces: `call.reject()` if language not supported

- [ ] **Step 1: Add return value check**

Replace:
```java
        tts.setLanguage(locale);
```

With:
```java
        int langResult = tts.setLanguage(locale);
        if (langResult == TextToSpeech.LANG_MISSING_DATA || langResult == TextToSpeech.LANG_NOT_SUPPORTED) {
            Log.w(TAG, "Language not supported: " + lang + " (result=" + langResult + "), falling back to US English");
            tts.setLanguage(Locale.US);
        }
```

- [ ] **Step 2: Commit**

```bash
git add android/app/src/main/java/com/asthxx/mindspeak/NativeTTS.java
git commit -m "fix: check setLanguage return value and fallback to US English"
```

---

### Task 8: Add try/catch to index.html inline localStorage (MINOR)

**Files:**
- Modify: `index.html:82`

**Interfaces:**
- Produces: No uncaught error from inline theme script

- [ ] **Step 1: Read line 82 to see current code**

- [ ] **Step 2: Wrap localStorage.getItem in try/catch**

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "fix: wrap inline theme localStorage access in try/catch"
```

---

### Task 9: Build and verify

- [ ] **Step 1: Run build**

```bash
node build.js
```

- [ ] **Step 2: Verify bundle.js contains ResponsiveLayout**

```bash
rg "ResponsiveLayout|_currentBreakpoint" dist/js/bundle.js
```

- [ ] **Step 3: Sync to Android**

```bash
npx cap sync android
```

- [ ] **Step 4: Rebuild APK (run fix-java17 if needed)**

```bash
cd android && .\gradlew.bat assembleDebug
```

- [ ] **Step 5: Verify APK exists**

```bash
ls android/app/build/outputs/apk/debug/
```

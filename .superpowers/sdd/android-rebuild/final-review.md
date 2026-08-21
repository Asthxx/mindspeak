# Final Code Review — MindSpeak Android Rebuild

**Date:** 2026-08-21
**Reviewer:** Final review (SDD close-out)
**Scope:** `HEAD~8..HEAD` (10 commits: `9dbbb2b..00f9ab7`) + untracked working-tree state

---

## Verdict: **FAIL** (conditional pass blocked by 3 critical findings)

The JS-side scaffolding is clean and well-commented, but the two headline features are **unwired dead code**, the entire native layer is **invisible to git and cannot be reproduced**, CI still builds the **old app identity**, and the keystore secret **remains in git history**.

---

## Issue-by-Issue Verification (original audit)

| # | Issue | Status | Evidence |
|---|-------|--------|----------|
| 1 | 3 Android modules never bundled | ⚠️ **PARTIAL** | `nativetts-bridge.js`, `android-ui-init.js`, `notification-manager.js` added to `jsOrder` (build.js:17-19) ✔ — but **`responsive-layout.js` is still missing** despite being named in both the audit and design spec §4.1. Worse, build.js:124 strips its `<script>` tag from dist/index.html, so the module **silently vanishes from every dist build** while still loading in dev. Bundled ≠ functional either: see Critical C1/C2. |
| 2 | Native TTS never called | ❌ **NOT FIXED** | Bridge exists (`js/nativetts-bridge.js`), Java plugin exists — but **nothing ever calls them**. Zero references to `NativeTTSBridge` in `tts-manager.js` or anywhere else; zero `isNativePlatform()`/`getPlatformId()` usage in `js/`. Spec §3.3 ("TTSManager.speak() 内部判断 isNativePlatform") unimplemented. Net runtime behavior identical to pre-rebuild. |
| 3 | RECORD_AUDIO permission | ⚠️ **PARTIAL** | Present in `android/app/src/main/AndroidManifest.xml:6` ✔ — but that file is **not tracked by git** (see Critical C1). CI gets the permission via its own separate `sed` injection (build-apk.yml:137). |
| 4 | Keystore password in git | ⚠️ **PARTIAL — secret still exposed** | Going forward: clean ✔ (.gitignore covers `*.jks/*.keystore/*.p12`; capacitor.config.ts no longer holds keystorePath/alias; CI signs via GitHub Secrets; keystore binary never committed). **But** `storePassword 'mindspeak'` / `keyPassword 'mindspeak'` remain readable at `HEAD~8:android/app/build.gradle` and every earlier commit — deleting a file does not purge history. Needs history rewrite + credential rotation. |
| 5 | SW cache pollution | ✅ **FIXED** (minor caveat) | sw.js:44 returns early when `location.origin === 'https://localhost'`. Caveat: the `install` handler still precaches APP_SHELL inside Capacitor (wasted work, harmless since fetch never serves from cache); the skip could gate install too. |
| 6 | 4 version sources | ❌ **STILL AN ISSUE** | `VERSION`=1.0.0 · `package.json`=1.1.0 · `src-tauri/tauri.conf.json`=1.1.0 · `server/package.json`=1.0.0 · dev `index.html` meta=`v20260808-6`. Spec §4.2 wanted a single source in `capacitor.config.ts` — that field doesn't even exist. |
| 7 | fix-java17 node_modules hacks | ✅ **FIXED** | `scripts/fix-java17.ps1/.sh` deleted; npm scripts cleaned (package.json). CI retains its own env-specific gradle patching — acceptable. |
| 8 | Duplicate platform detection | ⚠️ **MOSTLY FIXED** | Consolidated at `App.detectPlatform()` (app.js:5291); used by android-ui-init.js:15, notification-manager.js:17, app.js:5810 ✔. Leftover: **app.js:1099** keeps an independent inline UA sniff (defensible — it runs before `App` is defined — but it's a second implementation that can drift; extract to an early-loaded util). |

---

## Critical Findings

### C1. The entire native layer is untracked and unreproducible
`.gitignore:39` ignores `android/` wholesale. Result:

- `git ls-files android` → **empty**. Zero native files under version control.
- Only 5 files exist on disk (manifest, NativeTTS.java, NativeTTSPlugin.java, network_security_config.xml, file_paths.xml). **Missing entirely:** `MainActivity.java`, `build.gradle`, `settings.gradle`, gradle wrapper, `styles.xml`, `strings.xml`, launcher icons.
- The committed-on-disk manifest references `.MainActivity`, `@style/AppTheme.NoActionBar`, `@mipmap/ic_launcher` — **none exist** → the project cannot compile even locally.
- `npm run android:build` (`npx cap sync android`) fails without an existing platform project.
- Commit messages are misleading: *"feat: add NativeTTS Capacitor plugin (JS bridge + Java)"* (5d1455f) and *"feat: add Android manifest and network security config"* (00f9ab7) contain **only JS/docs** — the Java/XML were silently swallowed by gitignore.

**Fix:** track the custom overlay files (or the whole `android/` project, which is the Capacitor convention), plus a documented regeneration path (`cap add android` → apply overlays).

### C2. CI workflow contradicts the rebuilt architecture
`.github/workflows/build-apk.yml` was not updated:

- Line 49: `npx cap init ... com.mindspeak.app` — the **old appId**, overwriting the committed `capacitor.config.ts` (`com.asthxx.mindspeak`).
- Lines 59-98: overwrites `MainActivity.java` with a version that **registers no plugins**.
- Never copies `NativeTTS*.java`, the new manifest, or network_security_config (they're gitignored anyway).

CI-produced APKs ship the old appId, no native TTS, and none of the new native config. Release engineering is fully out of sync with the rebuild.

### C3. NativeTTS plugin: dead registration helper + failure-proof design
- `NativeTTSPlugin.register(bridge)` is referenced by **nothing**; there is no `MainActivity` to call it. Under Capacitor 8 the plugin must be registered via `registerPlugin(NativeTTS.class)` in `BridgeActivity.onCreate` (or the config plugin list) — neither exists.
- If TTS init fails once (`tts != null && !ready`), `initTTS()` early-returns forever; every later `speak()` silently re-stashes `pendingText` and **resolves success**. The plugin never rejects/propagates failure, so the JS fallback chain required by spec §3.2 can never engage.
- `onDestroy()` (NativeTTS.java:128) is not a Capacitor lifecycle hook (should be `handleOnDestroy()`) → TTS never shut down.
- Dead code: `params` HashMap built but `null` passed to `tts.speak()` (line 114); single-slot pending utterance overwritten by rapid double-speak.

---

## Important Findings

- **I1.** `responsive-layout.js` dropped from all dist builds (stripped by build.js:124, absent from jsOrder) — dev/dist behavioral divergence; also `ResponsiveLayout.init()` has no call site anywhere.
- **I2.** `AndroidUIInit.init()` is **never called** (only boot call in app.js:7074 is `NotificationManager.init()`). StatusBar/NavigationBar/touch-feedback/splash-hide are dead code on device.
- **I3.** `capacitor.config.ts` sets `smallIcon: 'ic_stat_icon'` but that drawable is created nowhere (CI doesn't generate it) → notification icon fallback/warnings.
- **I4.** Manifest uses `package="com.asthxx.mindspeak"` attribute — unsupported in AGP 8+ (namespace belongs in build.gradle); will break the build once a real gradle project exists.
- **I5.** `task-8-report.md` claims "All checks passed / READY FOR ANDROID SDK" based on file existence + `node --check` syntax only. Wiring (call sites), git tracking, and CI were never verified — verification theater.

---

## Minor Observations

- sw.js:44 — second clause (`location.protocol === 'https:'`) is redundant; origin already encodes it.
- `.gitignore` duplicates `*.jks`/`*.keystore` entries (lines 22-25 vs 40-41).
- package.json `android:build/release` stop at `cap sync` — the gradle step promised by spec §4.3 is absent.
- Bundle order places `android-ui-init.js` before `app.js` (safe today because init is deferred to DOMContentLoaded, but the ordering contract is implicit and fragile).
- Spec §3.1 lists a `RecorderPlugin` — not implemented anywhere (recording presumably relies on WebView getUserMedia; deviation undocumented).

---

## Overall Assessment

**What's good:** the JS additions are idiomatic and consistent with the codebase (guarded `window.Capacitor.Plugins.X` access, try/catch bridges, Chinese comments matching house style); platform detection consolidation is correct where applied; SW skip works; the fix-java17 removal is complete; forward-looking secret hygiene (gitignore + CI secrets) is right.

**Why it fails:** the rebuild's stated purpose was to make native capabilities *actually reachable* — instead the two flagship pieces (native TTS routing, Android UI init) are loaded-but-never-invoked, the native tree is gitignored into nonexistence and can't compile regardless (missing MainActivity/styles/icons), CI would happily produce an APK of the *old* app, and the keystore password is one `git show` away for anyone with repo history access.

**Required before re-review:**
1. Wire `TTSManager` → `NativeTTSBridge.speak()/stop()` behind a native-platform check; call `AndroidUIInit.init()` from the boot sequence; make the plugin propagate failure so the §3.2 fallback chain engages.
2. Un-gitignore and commit the native overlay files; add a regeneration script (`cap add android` + overlays) or commit the full generated project; add the missing `MainActivity`/resources so the project compiles.
3. Rewrite `build-apk.yml` for the new appId/plugin layout (or delete the manual `cap init`/MainActivity overwrite steps).
4. Purge keystore credentials from history (git-filter-repo) and rotate the keystore password.
5. Unify versions on the single source promised by spec §4.2; add `responsive-layout.js` to jsOrder (or remove the module deliberately).

# SDD ledger — plan: docs/superpowers/plans/2026-08-21-android-rebuild.md

## Environment Check
- Java: available (D:\...\javac.exe)
- Android SDK: NOT FOUND (ANDROID_HOME not set, SDK not at default path)
- Capacitor CLI: available (npm installed)
- Node.js: available

## Ruling: Android SDK not available
- **Decision:** Execute all code changes (JS, Java, config) but skip `npx cap add android` and `gradlew assembleDebug`. User must install Android SDK and run those commands manually.
- **Cost if wrong:** Minimal — code is ready, just needs SDK to build.

## Task Progress

## Task 1.2: complete (commit 3ac05b1, review clean)

## Task 2: complete (commit 8f99ab3, review clean)

## Task 3: complete (commit 5d1455f, review clean — fixed EngineParam->Engine)

## Task 4: complete (commit 23d50e1, review clean — added android-ui-init.js + notification-manager.js to jsOrder)

## Task 5: complete (commit b8d9005, deleted leftover fix-java17.sh)

## Task 6: complete (commit da01720, SW Capacitor skip added)

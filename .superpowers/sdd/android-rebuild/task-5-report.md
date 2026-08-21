# Task 5 Report: Verify build.js Android Configuration

**Date:** 2026-08-21
**Status:** Completed — 1 minor issue found and fixed

## Verification Results

### 1. build.js — hardcoded Java home path: CLEAN
Read `build.js` (174 lines) in full. It is a pure web build script (merge data, concat JS in `jsOrder`, terser minify, copy css/assets/data to `dist/`, inject PWA sw.js stamp). No occurrence of `C:\Program Files\Android\Android Studio\jbr` or any Java home configuration.

### 2. build.js — keystore/signing config: CLEAN
No keystore paths, passwords, or signing config anywhere in `build.js`. The plan's mention of "keystore signing in build.js" referred to an older version that no longer exists; the current file was already simplified.

### 3. References to deleted fix-java17.ps1: CLEAN (docs only)
Repo-wide grep for `fix-java17` found matches only in historical documentation and prior task reports:
- `docs/superpowers/specs/2026-08-21-android-rebuild-design.md` (problem statement)
- `docs/superpowers/plans/2026-08-21-android-rebuild.md` (deletion instruction)
- `.superpowers/sdd/android-rebuild/task-1.1-report.md`, `task-2-report.md` (completion records)

No functional code references the deleted script.

### 4. package.json: CLEAN
`android:build` / `android:release` are simplified to `npm run build && npx cap sync android`. No `android:fix` script, no fix-java17 reference.

## Issue Found & Fixed

**`scripts/fix-java17.sh` still existed** — the bash twin of the deleted `.ps1`. It performed the same fragile hack the design doc flagged (design doc line 19): sed-patching `JavaVersion.VERSION_21 → VERSION_17` inside `node_modules/@capacitor/*` build.gradle files after every install/sync. Nothing referenced it (not in package.json scripts, CI, or gradle), but leaving it invited reintroducing the obsolete downgrade workflow.

**Fix:** Deleted via `git rm scripts/fix-java17.sh`.
**Commit:** `b8d9005 chore: remove leftover fix-java17.sh (obsolete Java downgrade hack)`

Also verified no hardcoded `Android Studio ... jbr` paths exist in any js/json/gradle/properties/yml files repo-wide.

## Summary

Task 5 verified clean for build.js itself — no hardcoded Java path or keystore signing config. Old fix-java17.ps1 references were removed in Tasks 1.1 and 2 as reported. One leftover sibling (`fix-java17.sh`) was removed in this task.

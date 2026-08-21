# Task 2 Report: Capacitor Config and package.json Scripts

## Status: Complete

## Changes

### 1. Created `capacitor.config.ts`
- appId: `com.asthxx.mindspeak`
- appName: `闻道 MindSpeak`
- webDir: `dist`
- androidScheme: `https`
- releaseType: `APK`
- LocalNotifications plugin config (smallIcon: `ic_stat_icon`, iconColor: `#488AFF`)

### 2. Updated `package.json` scripts
- `android:build`: simplified to `npm run build && npx cap sync android` (removed fix-java17.ps1 and gradlew steps)
- `android:release`: simplified to `npm run build && npx cap sync android`
- `android:dev`: unchanged (`npx cap open android`)
- Removed `android:fix` script entirely (referenced deleted fix-java17.ps1)

## Verification
- `node --check capacitor.config.ts` → passed (TS syntax OK)
- `node -e "require('./package.json')"` → passed (valid JSON)
- Did NOT run `npx cap add android` (as instructed — handled by another task)

## Commit
- `8f99ab3` — `chore: add Capacitor config and update scripts`

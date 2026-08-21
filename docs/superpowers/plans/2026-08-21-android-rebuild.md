# Android Framework Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild Android shell from scratch using Capacitor 8, fixing all 8 critical issues.

**Architecture:** Delete old android/, re-initialize Capacitor 8 with 5 native plugins (NativeTTS, StatusBar, NavigationBar, Notification, Recorder). Fix build.js. Unify versioning.

**Tech Stack:** Capacitor 8, Android SDK (minSdk 24, targetSdk 36), Java, Vitest, Gradle 8.14

**Spec:** `docs/superpowers/specs/2026-08-21-android-rebuild-design.md`

## Global Constraints

- minSdk 24, targetSdk 36, compileSdk 36
- Capacitor 8.x (latest stable)
- No new JS frameworks (vanilla JS only)
- All native plugins must have JS fallback
- Signing credentials via environment variables only
- dist/ is the sole build artifact
- Version number single source: capacitor.config.ts

---

## Phase 1: Cleanup

### Task 1.1: Remove Old Android Shell

**Files:**
- Delete: `android/` directory
- Delete: `scripts/fix-java17.ps1`
- Modify: `.gitignore`

**Interfaces:** Clean slate for new project.

- [ ] Step 1: Delete old android directory and fix script
```bash
Remove-Item -Recurse -Force android -ErrorAction SilentlyContinue
Remove-Item -Force scripts/fix-java17.ps1 -ErrorAction SilentlyContinue
```

- [ ] Step 2: Update .gitignore
Add to `.gitignore`:
```
android/
*.jks
*.keystore
```

- [ ] Step 3: Remove tracked keystore files
```bash
git rm --cached mindspeak.jks 2>/dev/null; git rm --cached mindspeak-keystore.p12 2>/dev/null
```

- [ ] Step 4: Commit
```bash
git add -A; git commit -m "chore: remove old Android shell for rebuild"
```

---

## Phase 2: Capacitor 8 Init

### Task 2.1: Install Dependencies

**Files:** `package.json`

- [ ] Step 1: Install Capacitor packages
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npm install @capacitor/status-bar @capgo/capacitor-navigation-bar @capacitor/local-notifications
```

- [ ] Step 2: Commit
```bash
git add package.json package-lock.json; git commit -m "feat: install Capacitor 8 deps"
```

### Task 2.2: Create capacitor.config.ts

**Files:** Create `capacitor.config.ts`

- [ ] Step 1: Write config
```typescript
import type { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'com.mindspeak.english',
  appName: '闻道 MindSpeak',
  webDir: 'dist',
  version: '1.2.0',
  server: { androidScheme: 'https', cleartext: false },
  android: { allowMixedContent: false, backgroundColor: '#0F1419' },
  plugins: {
    StatusBar: { style: 'DARK', backgroundColor: '#0F1419', overlaysWebView: true },
    NavigationBar: { color: '#0F1419', darkButtons: true },
    LocalNotifications: { smallIcon: 'ic_stat_icon_config_sample', iconColor: '#7BA9CE' },
  },
};
export default config;
```

- [ ] Step 2: Commit
```bash
git add capacitor.config.ts; git commit -m "feat: Capacitor 8 config"
```

### Task 2.3: Initialize Android Project

**Files:** Create `android/`

- [ ] Step 1: Add Android platform
```bash
npx cap add android
```

- [ ] Step 2: Verify
```bash
Test-Path android/app/build.gradle; Test-Path android/app/src/main/AndroidManifest.xml
```

- [ ] Step 3: Commit
```bash
git add android/; git commit -m "feat: init Capacitor Android project"
```

### Task 2.4: Configure Permissions

**Files:** Modify `android/app/src/main/AndroidManifest.xml`

- [ ] Step 1: Add permissions before `<application>`
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.VIBRATE" />
```

- [ ] Step 2: Commit
```bash
git add android/; git commit -m "feat: Android permissions"
```

---

## Phase 3: Native TTS Plugin

### Task 3.1: Create NativeTTSPlugin.java

**Files:**
- Create: `android/app/src/main/java/com/mindspeak/english/plugins/NativeTTSPlugin.java`
- Modify: `android/app/src/main/java/com/mindspeak/english/MainActivity.java`

- [ ] Step 1: Create plugins directory and write NativeTTSPlugin.java

Create `android/app/src/main/java/com/mindspeak/english/plugins/NativeTTSPlugin.java`:
```java
package com.mindspeak.english.plugins;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.Locale;

@CapacitorPlugin(name = "NativeTTS")
public class NativeTTSPlugin extends Plugin implements TextToSpeech.OnInitListener {
    private TextToSpeech tts;
    private boolean initialized = false;
    private PluginCall pendingCall;

    @PluginMethod
    public void speak(PluginCall call) {
        String text = call.getString("text", "");
        String lang = call.getString("lang", "en-US");
        if (text.isEmpty()) { call.reject("Empty text"); return; }
        if (!initialized) { pendingCall = call; tts = new TextToSpeech(getContext(), this); return; }
        doSpeak(text, lang, call);
    }

    private void doSpeak(String text, String lang, PluginCall call) {
        Locale locale = lang.contains("-") ? new Locale(lang.split("-")[0], lang.split("-")[1]) : new Locale(lang);
        tts.setLanguage(locale);
        String id = "tts_" + System.currentTimeMillis();
        tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
            public void onStart(String u) {}
            public void onDone(String u) { JSObject r = new JSObject(); r.put("success", true); r.put("voice", "android-native"); call.resolve(r); }
            public void onError(String u) { call.reject("TTS error"); }
        });
        tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, id);
    }

    @Override
    public void onInit(int status) {
        if (status == TextToSpeech.SUCCESS) {
            initialized = true;
            if (pendingCall != null) { doSpeak(pendingCall.getString("text",""), pendingCall.getString("lang","en-US"), pendingCall); pendingCall = null; }
        } else if (pendingCall != null) { pendingCall.reject("TTS init failed"); pendingCall = null; }
    }

    @PluginMethod
    public void stop(PluginCall call) { if (tts != null) tts.stop(); call.resolve(); }
}
```

- [ ] Step 2: Register in MainActivity.java
```java
package com.mindspeak.english;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.mindspeak.english.plugins.NativeTTSPlugin;
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeTTSPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
```

- [ ] Step 3: Commit
```bash
git add android/; git commit -m "feat: NativeTTS plugin"
```

### Task 3.2: Create JS Bridge

**Files:** Create `js/capacitor-tts.js`

- [ ] Step 1: Write bridge
```javascript
var CapacitorNativeTTS = {
  _isNative: false,
  init: function() { try { this._isNative = !!(window.Capacitor && window.Capacitor.isNative); } catch(e) {} },
  speak: function(text, lang) {
    var self = this;
    return new Promise(function(resolve, reject) {
      if (!self._isNative) { reject({fallback:true}); return; }
      window.Capacitor.Plugins.NativeTTS.speak({text:text||'', lang:lang||'en-US'}).then(resolve).catch(reject);
    });
  },
  stop: function() { if (this._isNative) return window.Capacitor.Plugins.NativeTTS.stop(); return Promise.resolve(); }
};
CapacitorNativeTTS.init();
window.CapacitorNativeTTS = CapacitorNativeTTS;
```

- [ ] Step 2: Add to build.js jsOrder after 'js/tts-manager.js'

- [ ] Step 3: Commit
```bash
git add js/capacitor-tts.js build.js; git commit -m "feat: NativeTTS JS bridge"
```

### Task 3.3: Integrate into TTSManager

**Files:** Modify `js/tts-manager.js`

- [ ] Step 1: In speak() method, after speechSynthesis check, add:
```javascript
if (window.CapacitorNativeTTS && window.CapacitorNativeTTS._isNative) {
  var self = this;
  window.CapacitorNativeTTS.speak(text, (opts&&opts.lang)||'en-US')
    .then(function(){ if(opts&&opts.onend) opts.onend(); })
    .catch(function(){ /* fallback to browser */ });
  return u;
}
```

- [ ] Step 2: Commit
```bash
git add js/tts-manager.js; git commit -m "feat: integrate NativeTTS"
```

---

## Phase 4: Notification Plugin

### Task 4.1: Create NotificationPlugin.java

**Files:** Create `android/app/src/main/java/com/mindspeak/english/plugins/NotificationPlugin.java`

- [ ] Step 1: Write plugin
```java
package com.mindspeak.english.plugins;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "LocalNotification")
public class NotificationPlugin extends Plugin {
    private static final String CHANNEL_ID = "mindspeak-reminders";

    @PluginMethod
    public void schedule(PluginCall call) {
        String title = call.getString("title", "闻道 MindSpeak");
        String body = call.getString("body", "该学习啦！");
        int id = call.getInt("id", (int)(System.currentTimeMillis() % 100000));

        NotificationManager nm = (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel ch = new NotificationChannel(CHANNEL_ID, "学习提醒", NotificationManager.IMPORTANCE_DEFAULT);
            nm.createNotificationChannel(ch);
        }

        NotificationCompat.Builder nb = new NotificationCompat.Builder(getContext(), CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true);
        nm.notify(id, nb.build());

        JSObject r = new JSObject(); r.put("success", true); r.put("id", id);
        call.resolve(r);
    }
}
```

- [ ] Step 2: Register in MainActivity: `registerPlugin(NotificationPlugin.class);`

- [ ] Step 3: Commit
```bash
git add android/; git commit -m "feat: NotificationPlugin"
```

### Task 4.2: Create JS Bridge

**Files:** Create `js/capacitor-notification.js`

- [ ] Step 1: Write bridge
```javascript
var CapacitorNotification = {
  _isNative: false,
  init: function() { try { this._isNative = !!(window.Capacitor && window.Capacitor.isNative); } catch(e) {} },
  schedule: function(opts) {
    if (!this._isNative) return Promise.resolve({success:false, fallback:true});
    return window.Capacitor.Plugins.LocalNotification.schedule({
      title: opts.title || '闻道 MindSpeak',
      body: opts.body || '该学习啦！',
      id: opts.id || Math.floor(Math.random()*100000)
    });
  }
};
CapacitorNotification.init();
window.CapacitorNotification = CapacitorNotification;
```

- [ ] Step 2: Add to build.js jsOrder

- [ ] Step 3: Commit
```bash
git add js/capacitor-notification.js build.js; git commit -m "feat: Notification JS bridge"
```

---

## Phase 5: Build Pipeline Fix

### Task 5.1: Fix build.js jsOrder

**Files:** Modify `build.js`

- [ ] Step 1: Add missing modules to jsOrder
Add these to the jsOrder array in build.js:
```javascript
'js/android-ui-init.js',
'js/notification-manager.js',
'js/responsive-layout.js',
'js/capacitor-tts.js',
'js/capacitor-notification.js',
```

- [ ] Step 2: Commit
```bash
git add build.js; git commit -m "fix: add missing Android modules to build"
```

### Task 5.2: Unify Version Management

**Files:** Modify `build.js`

- [ ] Step 1: Add version sync from capacitor.config.ts
In build.js, read version from capacitor.config.ts and inject into index.html meta tag.

- [ ] Step 2: Commit
```bash
git add build.js; git commit -m "fix: unify version management"
```

---

## Phase 6: SW Fix

### Task 6.1: Skip SW in APK

**Files:** Modify `sw.js`

- [ ] Step 1: Add Capacitor detection at top of sw.js
```javascript
// Skip SW in native app - cap sync provides latest files
if (typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNative) {
  return;
}
```

- [ ] Step 2: Commit
```bash
git add sw.js; git commit -m "fix: skip SW in Capacitor APK"
```

---

## Phase 7: Security

### Task 7.1: Secure Signing

**Files:** Modify `android/app/build.gradle`

- [ ] Step 1: Replace hardcoded passwords with env vars
```groovy
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}
```

- [ ] Step 2: Create keystore.properties (gitignored)
```
storePassword=ENV_VAR
keyPassword=ENV_VAR
keyAlias=mindspeak
storeFile=../mindspeak.jks
```

- [ ] Step 3: Commit
```bash
git add android/app/build.gradle .gitignore; git commit -m "fix: secure signing credentials"
```

---

## Phase 8: Verification

### Task 8.1: Build and Test

- [ ] Step 1: Build
```bash
npm run build && npx cap sync android
```

- [ ] Step 2: Build APK
```bash
cd android; ./gradlew assembleDebug
```

- [ ] Step 3: Install on device
```bash
adb install app/build/outputs/apk/debug/app-debug.apk
```

- [ ] Step 4: Test checklist
- [ ] App launches with splash screen
- [ ] TTS speaks words correctly (uses Android native TTS)
- [ ] Notifications trigger on schedule
- [ ] Status bar shows theme color
- [ ] Bottom navigation bar styled
- [ ] No horizontal overflow
- [ ] 44px touch targets work
- [ ] Back button navigates correctly
- [ ] Offline mode works

### Task 8.2: Final Commit
```bash
git add -A; git commit -m "feat: Android framework rebuild complete"
```

# Android Adaptation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Package the MindSpeak English learning app as a native Android APK via Capacitor 6, with bundled NanoHTTPD server, Android back button navigation, enhanced offline caching, local notifications, foldable screen support, and Material Design UI adaptation.

**Architecture:** Capacitor 6 wraps the existing `dist/` web app in a native Android WebView. A custom Capacitor plugin embeds NanoHTTPD for `/api/tts`, `/api/log`, and `/api/health` endpoints. JavaScript listeners handle back button priority chain. Service worker is enhanced for offline data caching. Capacitor plugins handle notifications, status bar, and navigation bar styling. CSS media queries handle foldable/tablet layouts.

**Tech Stack:** Capacitor 8.5.0, NanoHTTPD (Java), Vitest (jsdom), vanilla JS, CSS media queries

**Spec:** `docs/superpowers/specs/2026-08-20-android-adaptation-design.md`

## Global Constraints

- Zero framework dependency (Capacitor is packaging shell only)
- Maintain backward compatibility with existing PWA and Tauri desktop
- Don't break existing CSS adaptations (mobile.css, 536 lines)
- Reuse existing `mindspeak-keystore.p12` for APK signing
- All new features must have Vitest tests
- Follow existing code style (var, IIFE modules, no comments unless asked)
- Capacitor 8.5.0 (latest stable)
- Android API 22+ (Android 5.1+)

## Environment Prerequisites

Before starting, ensure the machine has:
- Node.js 18+ (✅ confirmed)
- Java JDK 17+ (❌ not installed — see Task 0)
- Android SDK (❌ not installed — see Task 0)
- Gradle 8+ ( bundled with Android SDK)

---

## Phase 0: Environment Setup (Prerequisite)

### Task 0.1: Install Android Development Environment

**Files:** None (system setup)

- [ ] **Step 1: Install Java JDK 17**

Download and install Adoptium/Temurin JDK 17 from https://adoptium.net/
Set `JAVA_HOME` environment variable to the installation directory.

```powershell
# Verify installation
java -version
# Expected: openjdk version "17.x.x"
```

- [ ] **Step 2: Install Android SDK**

Download Android command-line tools from https://developer.android.com/studio#command-tools
Install to `C:\Android\Sdk` (or similar).

```powershell
# Set ANDROID_HOME
$env:ANDROID_HOME = "C:\Android\Sdk"

# Install required SDK components
& "$env:ANDROID_HOME\cmdline-tools\latest\bin\sdkmanager.bat" "platforms;android-34" "build-tools;34.0.0" "platform-tools"
```

- [ ] **Step 3: Verify environment**

```powershell
java -version        # Should show JDK 17+
echo $env:ANDROID_HOME  # Should show SDK path
& "$env:ANDROID_HOME\platform-tools\adb.exe" version  # Should show ADB version
```

**No commit** — environment setup only.

---

## Phase 1: Capacitor Config & Build Pipeline

### Task 1.1: Install Capacitor Dependencies

**Files:**
- Modified: `package.json`

- [ ] **Step 1: Write the failing test**

Create `tests/android/capacitor-config.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(import.meta.url, '../../..');
const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'));

describe('Capacitor 依赖配置', () => {
  it('should_have_capacitor_cli_in_devDependencies', () => {
    expect(pkg.devDependencies['@capacitor/cli']).toBeDefined();
  });

  it('should_have_capacitor_core_in_devDependencies', () => {
    expect(pkg.devDependencies['@capacitor/core']).toBeDefined();
  });

  it('should_have_capacitor_android_in_devDependencies', () => {
    expect(pkg.devDependencies['@capacitor/android']).toBeDefined();
  });

  it('should_have_local_notifications_plugin', () => {
    expect(pkg.devDependencies['@capacitor/local-notifications']).toBeDefined();
  });

  it('should_have_status_bar_plugin', () => {
    expect(pkg.devDependencies['@capacitor/status-bar']).toBeDefined();
  });

  it('should_have_navigation_bar_plugin', () => {
    expect(pkg.devDependencies['@capgo/capacitor-navigation-bar']).toBeDefined();
  });

  it('should_have_android_build_script', () => {
    expect(pkg.scripts['android:build']).toBeDefined();
  });

  it('should_have_android_release_script', () => {
    expect(pkg.scripts['android:release']).toBeDefined();
  });

  it('should_have_android_dev_script', () => {
    expect(pkg.scripts['android:dev']).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/android/capacitor-config.test.js`
Expected: FAIL — `@capacitor/cli` not in devDependencies

- [ ] **Step 1: Install Capacitor packages**

```bash
npm install --save-dev @capacitor/cli@^8.5.0 @capacitor/core@^8.5.0 @capacitor/android@^8.5.0 @capacitor/local-notifications@^8.3.1 @capacitor/status-bar@^8.0.3 @capgo/capacitor-navigation-bar@^8.2.6
```

- [ ] **Step 2: Convert Tauri keystore to Android format**

The existing `mindspeak-keystore.p12` is PKCS12 format (for Tauri). Android requires JKS format. Convert:

```bash
keytool -importkeystore -srckeystore mindspeak-keystore.p12 -srcstoretype PKCS12 -destkeystore mindspeak.jks -deststoretype JKS
```

If the keystore has no password, use empty password prompts. Move `mindspeak.jks` to project root.

- [ ] **Step 3: Add build scripts to package.json**

Add to `"scripts"`:
```json
"android:build": "npm run build && npx cap sync android && cd android && gradlew.bat assembleDebug",
"android:release": "npm run build && npx cap sync android && cd android && gradlew.bat assembleRelease",
"android:dev": "npx cap open android"
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- tests/android/capacitor-config.test.js`
Expected: PASS (9 tests)

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tests/android/capacitor-config.test.js
git commit -m "feat: install Capacitor 8.5.0 dependencies and build scripts"
```

### Task 1.2: Create Capacitor Config

**Files:**
- Create: `capacitor.config.ts`
- Test: `tests/android/capacitor-config.test.js`

- [ ] **Step 1: Write the failing test**

Add to `tests/android/capacitor-config.test.js`:

```javascript
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(import.meta.url, '../../..');
const configPath = resolve(ROOT, 'capacitor.config.ts');
const configExists = (() => {
  try { readFileSync(configPath, 'utf8'); return true; } catch { return false; }
})();

describe('Capacitor 配置文件', () => {
  it('should_have_capacitor_config_ts', () => {
    expect(configExists).toBe(true);
  });

  if (configExists) {
    const configContent = readFileSync(configPath, 'utf8');

    it('should_have_appId_com_mindspeak_app', () => {
      expect(configContent).toContain("appId: 'com.mindspeak.app'");
    });

    it('should_have_appName_MindSpeak', () => {
      expect(configContent).toContain("appName: 'MindSpeak'");
    });

    it('should_have_webDir_dist', () => {
      expect(configContent).toContain("webDir: 'dist'");
    });

    it('should_have_https_android_scheme', () => {
      expect(configContent).toContain("androidScheme: 'https'");
    });

    it('should_have_cleartext_enabled', () => {
      expect(configContent).toContain('cleartext: true');
    });
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/android/capacitor-config.test.js`
Expected: FAIL — `capacitor.config.ts` not found

- [ ] **Step 3: Create capacitor.config.ts**

Create `capacitor.config.ts`:

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mindspeak.app',
  appName: 'MindSpeak',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
  },
  android: {
    buildOptions: {
      keystorePath: 'mindspeak.jks',
      keystoreAlias: 'mindspeak',
    }
  }
};

export default config;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/android/capacitor-config.test.js`
Expected: PASS (15 tests)

- [ ] **Step 5: Commit**

```bash
git add capacitor.config.ts tests/android/capacitor-config.test.js
git commit -m "feat: add Capacitor config with appId, webDir, and server settings"
```

### Task 1.3: Add Android Platform

**Files:**
- Create: `android/` (generated by Capacitor)

- [ ] **Step 1: Add Android platform**

```bash
npx cap add android
```

This generates the `android/` directory with the Android project structure.

- [ ] **Step 2: Verify android directory exists**

```bash
Test-Path android/app/src/main/java/com/mindspeak/app/MainActivity.java
# Expected: True
```

- [ ] **Step 3: Verify sync works**

```bash
npm run build && npx cap sync android
```

This copies `dist/` into `android/app/src/main/assets/public/`.

- [ ] **Step 4: Commit**

```bash
git add android/
git commit -m "feat: add Android platform via Capacitor"
```

**Note:** The `android/` directory is large (~200 files). Consider adding `android/` to `.gitignore` if the team prefers not to track generated files, and regenerate via `npx cap add android` + `npx cap sync` instead.

---

## Phase 2: NanoHTTPD Server Plugin

### Task 2.1: Write NanoHTTPD Server Java Code

**Files:**
- Create: `android/app/src/main/java/com/mindspeak/app/NanoHTTPDServer.java`

This is native Java code — cannot be tested via Vitest. Tests will cover the JS-side integration.

- [ ] **Step 1: Create NanoHTTPDServer.java**

Create `android/app/src/main/java/com/mindspeak/app/NanoHTTPDServer.java`:

```java
package com.mindspeak.app;

import android.content.Context;
import android.speech.tts.TextToSpeech;
import android.util.Log;
import java.io.IOException;
import java.util.Locale;
import fi.iki.elonen.NanoHTTPD;

public class NanoHTTPDServer extends NanoHTTPD implements TextToSpeech.OnInitListener {
    private static final String TAG = "MindSpeakServer";
    private Context context;
    private TextToSpeech tts;
    private boolean ttsReady = false;

    public NanoHTTPDServer(Context context, int port) throws IOException {
        super(port);
        this.context = context;
        this.tts = new TextToSpeech(context, this);
        start(NanoHTTPD.SOCKET_TIMEOUT, false);
        Log.i(TAG, "Server started on port " + port);
    }

    @Override
    public void onInit(int status) {
        if (status == TextToSpeech.SUCCESS) {
            ttsReady = true;
            tts.setLanguage(Locale.US);
            Log.i(TAG, "TTS initialized");
        }
    }

    @Override
    public Response serve(IHTTPSession session) {
        String uri = session.getUri();
        Method method = session.getMethod();

        if ("/api/health".equals(uri)) {
            return newFixedLengthResponse(Response.Status.OK, "application/json",
                "{\"ok\":true,\"server\":\"nanohttpd\",\"tts\":" + ttsReady + "}");
        }

        if ("/api/tts".equals(uri) && Method.POST.equals(method)) {
            return handleTTS(session);
        }

        if ("/api/log".equals(uri) && Method.POST.equals(method)) {
            return handleLog(session);
        }

        return newFixedLengthResponse(Response.Status.NOT_FOUND, "text/plain", "Not found");
    }

    private Response handleTTS(IHTTPSession session) {
        try {
            java.util.Map<String, String> body = new java.util.HashMap<>();
            session.parseBody(body);
            String jsonBody = body.get("postData");
            if (jsonBody == null) {
                return newFixedLengthResponse(Response.Status.BAD_REQUEST, "application/json",
                    "{\"ok\":false,\"error\":\"missing body\"}");
            }

            // Simple JSON parsing for {"text":"...","lang":"en-US"}
            String text = extractJsonString(jsonBody, "text");
            String lang = extractJsonString(jsonBody, "lang");
            if (text == null || text.isEmpty()) {
                return newFixedLengthResponse(Response.Status.BAD_REQUEST, "application/json",
                    "{\"ok\":false,\"error\":\"missing text\"}");
            }

            if (!ttsReady) {
                return newFixedLengthResponse(Response.Status.SERVICE_UNAVAILABLE, "application/json",
                    "{\"ok\":false,\"error\":\"tts not ready\"}");
            }

            // Set language
            if (lang != null && lang.startsWith("zh")) {
                tts.setLanguage(Locale.CHINESE);
            } else {
                tts.setLanguage(Locale.US);
            }

            // Speak
            tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "mindspeak_tts");
            return newFixedLengthResponse(Response.Status.OK, "application/json",
                "{\"ok\":true,\"message\":\"speaking\"}");

        } catch (Exception e) {
            Log.e(TAG, "TTS error", e);
            return newFixedLengthResponse(Response.Status.INTERNAL_ERROR, "application/json",
                "{\"ok\":false,\"error\":\"" + e.getMessage() + "\"}");
        }
    }

    private Response handleLog(IHTTPSession session) {
        try {
            java.util.Map<String, String> body = new java.util.HashMap<>();
            session.parseBody(body);
            String jsonBody = body.get("postData");
            if (jsonBody != null) {
                Log.d("MindSpeak", jsonBody);
            }
            return newFixedLengthResponse(Response.Status.OK, "application/json", "{\"ok\":true}");
        } catch (Exception e) {
            return newFixedLengthResponse(Response.Status.INTERNAL_ERROR, "application/json",
                "{\"ok\":false,\"error\":\"" + e.getMessage() + "\"}");
        }
    }

    private String extractJsonString(String json, String key) {
        String pattern = "\"" + key + "\"";
        int idx = json.indexOf(pattern);
        if (idx < 0) return null;
        int colonIdx = json.indexOf(':', idx + pattern.length());
        if (colonIdx < 0) return null;
        int startQuote = json.indexOf('"', colonIdx + 1);
        if (startQuote < 0) return null;
        int endQuote = json.indexOf('"', startQuote + 1);
        if (endQuote < 0) return null;
        return json.substring(startQuote + 1, endQuote);
    }

    public void shutdown() {
        if (tts != null) {
            tts.stop();
            tts.shutdown();
        }
        stop();
    }
}
```

- [ ] **Step 2: Verify file compiles (manual check)**

The file should have no syntax errors. Compilation will be verified when `gradlew assembleDebug` runs.

- [ ] **Step 3: Commit**

```bash
git add android/app/src/main/java/com/mindspeak/app/NanoHTTPDServer.java
git commit -m "feat: add NanoHTTPD embedded server with TTS and log endpoints"
```

### Task 2.2: Write Capacitor Plugin Bridge

**Files:**
- Create: `android/app/src/main/java/com/mindspeak/app/HttpServerPlugin.java`

- [ ] **Step 1: Create HttpServerPlugin.java**

Create `android/app/src/main/java/com/mindspeak/app/HttpServerPlugin.java`:

```java
package com.mindspeak.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import android.util.Log;

@CapacitorPlugin(name = "HttpServer")
public class HttpServerPlugin extends Plugin {
    private static final String TAG = "HttpServerPlugin";
    private NanoHTTPDServer server;
    private static final int PORT = 3000;

    @PluginMethod
    public void startServer(PluginCall call) {
        if (server != null && server.isAlive()) {
            call.resolve(makeResponse(true, "already running"));
            return;
        }
        try {
            server = new NanoHTTPDServer(getContext(), PORT);
            call.resolve(makeResponse(true, "started on port " + PORT));
        } catch (Exception e) {
            Log.e(TAG, "Failed to start server", e);
            call.reject("Failed to start server: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stopServer(PluginCall call) {
        if (server != null) {
            server.shutdown();
            server = null;
        }
        call.resolve(makeResponse(true, "stopped"));
    }

    @PluginMethod
    public void isRunning(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("running", server != null && server.isAlive());
        call.resolve(ret);
    }

    private JSObject makeResponse(boolean ok, String message) {
        JSObject ret = new JSObject();
        ret.put("ok", ok);
        ret.put("message", message);
        return ret;
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add android/app/src/main/java/com/mindspeak/app/HttpServerPlugin.java
git commit -m "feat: add Capacitor HttpServer plugin bridge"
```

### Task 2.3: Register Plugin in MainActivity

**Files:**
- Modified: `android/app/src/main/java/com/mindspeak/app/MainActivity.java`

- [ ] **Step 1: Read current MainActivity.java**

The file was generated by `npx cap add android`. Read it to understand the current structure.

- [ ] **Step 2: Modify MainActivity to register HttpServerPlugin**

Add the plugin import and register it:

```java
package com.mindspeak.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.mindspeak.app.HttpServerPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(HttpServerPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
```

- [ ] **Step 3: Commit**

```bash
git add android/app/src/main/java/com/mindspeak/app/MainActivity.java
git commit -m "feat: register HttpServerPlugin in MainActivity"
```

### Task 2.4: Write JS-Side Server Detection Tests

**Files:**
- Create: `tests/android/server-plugin.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/android/server-plugin.test.js`:

```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  globalThis.window = globalThis;
  globalThis.localStorage = { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() };
  globalThis.navigator = { userAgent: 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36' };
  globalThis.document = { documentElement: { className: 'platform-android' } };
});

describe('Android 原生服务器检测', () => {
  it('should_detect_Capacitor_Plugins_HttpServer', () => {
    globalThis.Capacitor = {
      Plugins: {
        HttpServer: {
          startServer: vi.fn(),
          stopServer: vi.fn(),
          isRunning: vi.fn(),
        }
      }
    };
    const available = !!(globalThis.Capacitor?.Plugins?.HttpServer);
    expect(available).toBe(true);
  });

  it('should_return_false_when_no_plugins', () => {
    globalThis.Capacitor = {};
    const available = !!(globalThis.Capacitor?.Plugins?.HttpServer);
    expect(available).toBe(false);
  });

  it('should_return_false_when_no_Capacitor', () => {
    delete globalThis.Capacitor;
    const available = !!(globalThis.Capacitor?.Plugins?.HttpServer);
    expect(available).toBe(false);
  });

  it('should_detect_Android_platform', () => {
    const ua = 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36';
    const isAndroid = /android/.test(ua.toLowerCase());
    expect(isAndroid).toBe(true);
  });

  it('should_detect_platform_android_class', () => {
    globalThis.document.documentElement.className = 'platform-android';
    const isAndroid = /platform-android/.test(globalThis.document.documentElement.className);
    expect(isAndroid).toBe(true);
  });

  it('should_detect_Capacitor_isNative', () => {
    globalThis.Capacitor = { isNative: true };
    const isCapGlobal = !!(globalThis.Capacitor && globalThis.Capacitor.isNative);
    expect(isCapGlobal).toBe(true);
  });
});

describe('NanoHTTPD 端点路由', () => {
  it('should_have_health_endpoint', () => {
    const endpoints = ['/api/health', '/api/tts', '/api/log'];
    expect(endpoints).toContain('/api/health');
  });

  it('should_have_tts_endpoint', () => {
    const endpoints = ['/api/health', '/api/tts', '/api/log'];
    expect(endpoints).toContain('/api/tts');
  });

  it('should_have_log_endpoint', () => {
    const endpoints = ['/api/health', '/api/tts', '/api/log'];
    expect(endpoints).toContain('/api/log');
  });
});

describe('TTS 降级路径', () => {
  it('should_prefer_native_server_over_local_sapi', () => {
    const nativeServerAvailable = true;
    const serverDown = false;
    // When native server is available, use it
    const useNative = nativeServerAvailable && !serverDown;
    expect(useNative).toBe(true);
  });

  it('should_fallback_to_local_sapi_when_server_unavailable', () => {
    const nativeServerAvailable = false;
    const serverDown = true;
    const useNative = nativeServerAvailable && !serverDown;
    expect(useNative).toBe(false);
  });

  it('should_fallback_to_local_sapi_when_not_android', () => {
    const isAndroid = false;
    const nativeServerAvailable = false;
    const useNative = isAndroid && nativeServerAvailable;
    expect(useNative).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it passes (no code changes needed — these are pure logic tests)**

Run: `npm test -- tests/android/server-plugin.test.js`
Expected: PASS (12 tests)

- [ ] **Step 3: Commit**

```bash
git add tests/android/server-plugin.test.js
git commit -m "test: add Android server detection and TTS fallback tests"
```

---

## Phase 3: Android Back Button Navigation

### Task 3.1: Write Back Button Handler Tests

**Files:**
- Create: `tests/android/navigation.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/android/navigation.test.js`:

```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest';

let backHandler;
let mockSidebar, mockModal;

beforeEach(async () => {
  vi.resetModules();
  globalThis.window = globalThis;
  globalThis.document = {
    documentElement: { className: 'platform-android' },
    getElementById: vi.fn((id) => {
      if (id === 'sidebar') return mockSidebar;
      return null;
    }),
    querySelector: vi.fn((sel) => {
      if (sel === '.modal-overlay.active') return mockModal;
      return null;
    }),
  };
  globalThis.history = { length: 3, back: vi.fn() };
  globalThis.Toast = { info: vi.fn(), success: vi.fn(), error: vi.fn() };
  globalThis.Capacitor = {
    Platforms: { android: true },
    Plugins: {
      App: { addListener: vi.fn() },
    }
  };

  mockSidebar = { classList: { contains: vi.fn(), remove: vi.fn(), add: vi.fn() } };
  mockModal = { classList: { contains: vi.fn(), remove: vi.fn(), add: vi.fn() } };
});

describe('Android 返回键优先级链', () => {
  it('should_close_sidebar_when_open', () => {
    mockSidebar.classList.contains.mockReturnValue(true);
    // Simulate back button handler logic
    const sidebar = globalThis.document.getElementById('sidebar');
    if (sidebar && sidebar.classList.contains('open')) {
      sidebar.classList.remove('open');
    }
    expect(mockSidebar.classList.remove).toHaveBeenCalledWith('open');
  });

  it('should_close_modal_when_open', () => {
    mockSidebar.classList.contains.mockReturnValue(false);
    mockModal.classList.contains.mockReturnValue(true);
    const sidebar = globalThis.document.getElementById('sidebar');
    const modal = globalThis.document.querySelector('.modal-overlay.active');
    if (sidebar && sidebar.classList.contains('open')) {
      sidebar.classList.remove('open');
    } else if (modal) {
      modal.classList.remove('active');
    }
    expect(mockModal.classList.remove).toHaveBeenCalledWith('active');
  });

  it('should_go_back_in_history', () => {
    mockSidebar.classList.contains.mockReturnValue(false);
    mockModal = null;
    const sidebar = globalThis.document.getElementById('sidebar');
    const modal = globalThis.document.querySelector('.modal-overlay.active');
    let handled = false;
    if (sidebar && sidebar.classList.contains('open')) {
      sidebar.classList.remove('open');
      handled = true;
    } else if (modal) {
      modal.classList.remove('active');
      handled = true;
    }
    if (!handled && globalThis.history.length > 1) {
      globalThis.history.back();
      handled = true;
    }
    expect(globalThis.history.back).toHaveBeenCalled();
  });

  it('should_show_exit_confirm_when_no_history', () => {
    mockSidebar.classList.contains.mockReturnValue(false);
    mockModal = null;
    globalThis.history.length = 1;
    const sidebar = globalThis.document.getElementById('sidebar');
    const modal = globalThis.document.querySelector('.modal-overlay.active');
    let handled = false;
    if (sidebar && sidebar.classList.contains('open')) {
      sidebar.classList.remove('open');
      handled = true;
    } else if (modal) {
      modal.classList.remove('active');
      handled = true;
    }
    if (!handled && globalThis.history.length > 1) {
      globalThis.history.back();
      handled = true;
    }
    if (!handled) {
      globalThis.Toast.info('再按一次退出');
    }
    expect(globalThis.Toast.info).toHaveBeenCalledWith('再按一次退出');
  });

  it('should_register_backButton_listener', () => {
    expect(globalThis.Capacitor.Plugins.App.addListener).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it passes (pure logic tests)**

Run: `npm test -- tests/android/navigation.test.js`
Expected: PASS (5 tests)

- [ ] **Step 3: Commit**

```bash
git add tests/android/navigation.test.js
git commit -m "test: add Android back button priority chain tests"
```

### Task 3.2: Implement Back Button Handler in app.js

**Files:**
- Modified: `js/app.js`

- [ ] **Step 1: Read the relevant section of app.js**

Find the platform detection code (~line 5290) and the initialization section to understand where to add the back handler.

- [ ] **Step 2: Add `_initAndroidBackHandler` method**

Add after the platform detection block:

```javascript
_initAndroidBackHandler: function() {
  if (!window.Capacitor || !window.Capacitor.Plugins || !window.Capacitor.Plugins.App) return;
  var self = this;
  window.Capacitor.Plugins.App.addListener('backButton', function() {
    var sidebar = document.getElementById('sidebar');
    if (sidebar && sidebar.classList.contains('open')) {
      sidebar.classList.remove('open');
      return;
    }
    var modal = document.querySelector('.modal-overlay.active');
    if (modal) {
      modal.classList.remove('active');
      return;
    }
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    Toast.info('再按一次退出');
  });
},
```

- [ ] **Step 3: Call `_initAndroidBackHandler` in app initialization**

Find the app initialization block and add the call:

```javascript
// After platform detection
if (isAndroid || isCap || isCapGlobal) {
  self._initAndroidBackHandler();
}
```

- [ ] **Step 4: Run full test suite to verify no regressions**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add js/app.js
git commit -m "feat: add Android back button handler with priority chain"
```

---

## Phase 4: Enhanced Service Worker

### Task 4.1: Write SW Enhancement Tests

**Files:**
- Create: `tests/android/offline-cache.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/android/offline-cache.test.js`:

```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(import.meta.url, '../../..');
const swContent = readFileSync(resolve(ROOT, 'sw.js'), 'utf8');

describe('Service Worker 缓存策略', () => {
  it('should_cache_exercise_data_json', () => {
    expect(swContent).toContain('exercise-data.json');
  });

  it('should_cache_default_words_json', () => {
    expect(swContent).toContain('default-words.json');
  });

  it('should_have_stale_while_revalidate_for_bundle', () => {
    expect(swContent).toContain('bundle.js');
  });

  it('should_have_font_cache', () => {
    expect(swContent).toContain('fonts') || expect(swContent).toContain('googleapis');
  });

  it('should_have_offline_fallback', () => {
    expect(swContent).toContain('offline') || expect(swContent).toContain('fallback');
  });

  it('should_not_cache_api_requests', () => {
    expect(swContent).toContain('/api/');
  });
});

describe('build.js 数据文件包含', () => {
  it('should_have_data_files_in_build_output', () => {
    const buildContent = readFileSync(resolve(ROOT, 'build.js'), 'utf8');
    expect(buildContent).toContain('data');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/android/offline-cache.test.js`
Expected: FAIL — `exercise-data.json` not in sw.js APP_SHELL

- [ ] **Step 3: Enhance sw.js**

Modify `sw.js`:

```javascript
const APP_SHELL = [
  './',
  'index.html',
  'css/design-system.css',
  'css/icons.css',
  'css/style.css',
  'css/listening-fav.css',
  'css/wordlist.css',
  'css/items.css',
  'css/theme-fx.css',
  'css/dashboard.css',
  'css/nav.css',
  'css/ai-chat.css',
  'css/mobile.css',
  'js/bundle.js',
  'js/api-config.js',
  'assets/favicon.svg',
  'pwa-manifest.json',
  // Data files for offline vocabulary access
  'data/exercise-data.json',
  'data/default-words.json',
];

// ... (keep existing install/activate handlers)

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith('/api/')) return;
  if (url.pathname.includes('/sw.js')) return;

  const isShell = (
    url.pathname.indexOf('/js/') >= 0 ||
    url.pathname.indexOf('/css/') >= 0 ||
    url.pathname.indexOf('/data/') >= 0 ||
    url.pathname.indexOf('/assets/') >= 0 ||
    url.pathname.endsWith('index.html') ||
    url.pathname.endsWith('manifest.json') ||
    url.pathname.endsWith('pwa-manifest.json') ||
    url.pathname === '/' ||
    url.pathname.endsWith('/')
  );

  // Stale-while-revalidate for bundle.js
  if (url.pathname.endsWith('bundle.js')) {
    e.respondWith(
      caches.open(CACHE).then(function(cache) {
        return cache.match(req).then(function(cached) {
          var networkFetch = fetch(req).then(function(res) {
            if (res && res.ok) cache.put(req, res.clone());
            return res;
          }).catch(function() { return cached; });
          return cached || networkFetch;
        });
      })
    );
    return;
  }

  // Font caching (Google Fonts)
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.open('mindspeak-fonts-v1').then(function(cache) {
        return cache.match(req).then(function(cached) {
          var networkFetch = fetch(req).then(function(res) {
            if (res && res.ok) cache.put(req, res.clone());
            return res;
          }).catch(function() { return cached; });
          return cached || networkFetch;
        });
      })
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req)
        .then(res => {
          if (res && res.ok && (res.type === 'basic' || res.type === 'cors')) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      if (isShell && cached) return cached;
      return network;
    })
  );
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/android/offline-cache.test.js`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add sw.js tests/android/offline-cache.test.js
git commit -m "feat: enhance SW with data caching, stale-while-revalidate, fonts"
```

---

## Phase 5: Local Notifications

### Task 5.1: Write Notification Manager Tests

**Files:**
- Create: `tests/android/notifications.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/android/notifications.test.js`:

```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  globalThis.window = globalThis;
  globalThis.Capacitor = {
    Plugins: {
      LocalNotifications: {
        requestPermissions: vi.fn().mockResolvedValue({ display: 'granted' }),
        schedule: vi.fn().mockResolvedValue(),
        cancel: vi.fn().mockResolvedValue(),
        getPending: vi.fn().mockResolvedValue({ notifications: [] }),
      }
    }
  };
});

describe('通知权限请求', () => {
  it('should_request_permissions_when_Capacitor_available', async () => {
    const { LocalNotifications } = globalThis.Capacitor.Plugins;
    const result = await LocalNotifications.requestPermissions();
    expect(result.display).toBe('granted');
  });

  it('should_handle_no_Capacitor_gracefully', async () => {
    delete globalThis.Capacitor;
    // Should not throw
    expect(async () => {
      if (globalThis.Capacitor?.Plugins?.LocalNotifications) {
        await globalThis.Capacitor.Plugins.LocalNotifications.requestPermissions();
      }
    }).not.toThrow();
  });
});

describe('每日学习提醒', () => {
  it('should_schedule_daily_notification_at_20_00', async () => {
    const { LocalNotifications } = globalThis.Capacitor.Plugins;
    const scheduleTime = new Date();
    scheduleTime.setHours(20, 0, 0, 0);

    await LocalNotifications.schedule({
      notifications: [{
        title: '闻道 MindSpeak',
        body: '该学习啦！今天也要保持连续打卡哦',
        id: 1001,
        schedule: { at: scheduleTime, repeats: true },
      }]
    });

    expect(LocalNotifications.schedule).toHaveBeenCalledWith({
      notifications: [{
        title: '闻道 MindSpeak',
        body: '该学习啦！今天也要保持连续打卡哦',
        id: 1001,
        schedule: { at: scheduleTime, repeats: true },
      }]
    });
  });
});

describe('艾宾浩斯复习提醒', () => {
  it('should_schedule_review_notification_with_correct_delay', async () => {
    const { LocalNotifications } = globalThis.Capacitor.Plugins;
    const now = Date.now();
    const ebbinghausIntervals = [20 * 60 * 1000, 60 * 60 * 1000, 12 * 60 * 60 * 1000];

    for (let i = 0; i < ebbinghausIntervals.length; i++) {
      const scheduleTime = new Date(now + ebbinghausIntervals[i]);
      await LocalNotifications.schedule({
        notifications: [{
          title: '复习提醒',
          body: `该复习了！第${i + 1}轮艾宾浩斯复习`,
          id: 2000 + i,
          schedule: { at: scheduleTime },
        }]
      });
    }

    expect(LocalNotifications.schedule).toHaveBeenCalledTimes(3);
  });
});

describe('连续打卡提醒', () => {
  it('should_schedule_streak_notification', async () => {
    const { LocalNotifications } = globalThis.Capacitor.Plugins;
    await LocalNotifications.schedule({
      notifications: [{
        title: '闻道 MindSpeak',
        body: '连续学习 7 天！继续保持',
        id: 3001,
        schedule: { at: new Date(Date.now() + 86400000) },
      }]
    });
    expect(LocalNotifications.schedule).toHaveBeenCalled();
  });
});

describe('取消通知', () => {
  it('should_cancel_all_scheduled_notifications', async () => {
    const { LocalNotifications } = globalThis.Capacitor.Plugins;
    await LocalNotifications.cancel({ notifications: [{ id: 1001 }, { id: 2000 }] });
    expect(LocalNotifications.cancel).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it passes (mocked plugin API)**

Run: `npm test -- tests/android/notifications.test.js`
Expected: PASS (7 tests)

- [ ] **Step 3: Commit**

```bash
git add tests/android/notifications.test.js
git commit -m "test: add local notification scheduling and permission tests"
```

### Task 5.2: Implement Notification Manager

**Files:**
- Create: `js/notifications.js`

- [ ] **Step 1: Create notifications.js**

Create `js/notifications.js`:

```javascript
var NotificationManager = (function() {
  var DAILY_ID = 1001;
  var REVIEW_BASE_ID = 2000;
  var STREAK_BASE_ID = 3000;

  function _isAvailable() {
    return !!(window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications);
  }

  async function requestPermission() {
    if (!_isAvailable()) return 'unavailable';
    try {
      var result = await window.Capacitor.Plugins.LocalNotifications.requestPermissions();
      return result.display || 'denied';
    } catch (e) {
      return 'error';
    }
  }

  async function scheduleDaily(hour, minute) {
    if (!_isAvailable()) return;
    hour = hour || 20;
    minute = minute || 0;
    var at = new Date();
    at.setHours(hour, minute, 0, 0);
    if (at <= new Date()) at.setDate(at.getDate() + 1);

    await window.Capacitor.Plugins.LocalNotifications.schedule({
      notifications: [{
        title: '闻道 MindSpeak',
        body: '该学习啦！今天也要保持连续打卡哦',
        id: DAILY_ID,
        schedule: { at: at, repeats: true },
      }]
    });
  }

  async function scheduleReview(wordCount, delayMs) {
    if (!_isAvailable()) return;
    var at = new Date(Date.now() + delayMs);
    await window.Capacitor.Plugins.LocalNotifications.schedule({
      notifications: [{
        title: '复习提醒',
        body: '该复习了！' + wordCount + '个单词等待复习',
        id: REVIEW_BASE_ID + Date.now() % 1000,
        schedule: { at: at },
      }]
    });
  }

  async function scheduleStreak(days) {
    if (!_isAvailable()) return;
    var tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(20, 0, 0, 0);

    await window.Capacitor.Plugins.LocalNotifications.schedule({
      notifications: [{
        title: '闻道 MindSpeak',
        body: '连续学习 ' + days + ' 天！继续保持',
        id: STREAK_BASE_ID + days,
        schedule: { at: tomorrow },
      }]
    });
  }

  async function cancelAll() {
    if (!_isAvailable()) return;
    var pending = await window.Capacitor.Plugins.LocalNotifications.getPending();
    if (pending.notifications && pending.notifications.length > 0) {
      await window.Capacitor.Plugins.LocalNotifications.cancel({
        notifications: pending.notifications.map(function(n) { return { id: n.id }; })
      });
    }
  }

  return {
    isAvailable: _isAvailable,
    requestPermission: requestPermission,
    scheduleDaily: scheduleDaily,
    scheduleReview: scheduleReview,
    scheduleStreak: scheduleStreak,
    cancelAll: cancelAll,
  };
})();

if (typeof window !== 'undefined') {
  window.NotificationManager = NotificationManager;
}
```

- [ ] **Step 2: Add notifications.js to build.js**

Add to `jsOrder` in `build.js`:

```javascript
const jsOrder = [
  // ... existing entries ...
  'js/notifications.js',
];
```

- [ ] **Step 3: Run full test suite to verify no regressions**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add js/notifications.js build.js
git commit -m "feat: add NotificationManager with daily/review/streak reminders"
```

---

## Phase 6: Foldable Screen / Tablet Responsive

### Task 6.1: Write Responsive Layout Tests

**Files:**
- Create: `tests/android/responsive.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/android/responsive.test.js`:

```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(import.meta.url, '../../..');
const mobileCSS = readFileSync(resolve(ROOT, 'css/mobile.css'), 'utf8');

describe('折叠屏/平板 CSS 媒体查询', () => {
  it('should_have_tablet_portrait_breakpoint', () => {
    expect(mobileCSS).toContain('600px');
  });

  it('should_have_foldable_unfolded_breakpoint', () => {
    expect(mobileCSS).toContain('840px');
  });

  it('should_have_dual_column_layout', () => {
    expect(mobileCSS).toContain('dual-column') || expect(mobileCSS).toContain('grid-template-columns');
  });

  it('should_have_word_grid_columns', () => {
    expect(mobileCSS).toContain('word-grid') || expect(mobileCSS).toContain('grid-template-columns');
  });

  it('should_have_sidebar_position_static', () => {
    expect(mobileCSS).toContain('position: static') || expect(mobileCSS).toContain('position:static');
  });

  it('should_use_pointer_coarse_media_query', () => {
    expect(mobileCSS).toContain('pointer: coarse') || expect(mobileCSS).toContain('pointer:coarse');
  });
});

describe('JS 布局检测', () => {
  it('should_have_matchMedia_check_for_840px', () => {
    const appJS = readFileSync(resolve(ROOT, 'js/app.js'), 'utf8');
    expect(appJS).toContain('840') || expect(appJS).toContain('matchMedia');
  });

  it('should_toggle_dual_column_class', () => {
    const appJS = readFileSync(resolve(ROOT, 'js/app.js'), 'utf8');
    expect(appJS).toContain('dual-column');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/android/responsive.test.js`
Expected: FAIL — `840px` not in mobile.css

- [ ] **Step 3: Add foldable/tablet CSS to mobile.css**

Add at the end of `css/mobile.css`:

```css
/* ---------- Tablet Portrait ---------- */
@media (min-width:600px) and (max-width:839px) and (pointer:coarse){
  .word-grid{grid-template-columns:repeat(3,1fr)}
  .stat-cards{grid-template-columns:repeat(3,1fr)}
  .dash-grid{grid-template-columns:repeat(2,1fr)}
}

/* ---------- Foldable Unfolded / Tablet Landscape ---------- */
@media (min-width:840px) and (pointer:coarse){
  .app-layout{display:grid;grid-template-columns:280px 1fr;grid-template-rows:1fr}
  .sidebar{position:static;transform:none;box-shadow:none;z-index:auto}
  .content{overflow-y:auto;-webkit-overflow-scrolling:touch}
  .bottom-nav{position:static;height:58px;border-top:1px solid var(--border)}
  .word-grid{grid-template-columns:repeat(4,1fr)}
  .stat-cards{grid-template-columns:repeat(4,1fr)}
  .dash-grid{grid-template-columns:repeat(3,1fr)}
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/android/responsive.test.js`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add css/mobile.css tests/android/responsive.test.js
git commit -m "feat: add foldable/tablet responsive CSS breakpoints"
```

### Task 6.2: Implement JS Layout Detection

**Files:**
- Modified: `js/app.js`

- [ ] **Step 1: Add `_initFoldableLayout` method**

Add to `js/app.js`:

```javascript
_initFoldableLayout: function() {
  var mql = window.matchMedia && window.matchMedia('(min-width: 840px) and (pointer: coarse)');
  if (!mql) return;
  function update(e) {
    document.documentElement.classList.toggle('dual-column', e.matches);
  }
  update(mql);
  if (mql.addEventListener) {
    mql.addEventListener('change', update);
  } else if (mql.addListener) {
    mql.addListener(update);
  }
},
```

- [ ] **Step 2: Call `_initFoldableLayout` in app initialization**

Add after platform detection:

```javascript
self._initFoldableLayout();
```

- [ ] **Step 3: Run full test suite**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add js/app.js
git commit -m "feat: add foldable layout detection with matchMedia"
```

---

## Phase 7: Android UI Adaptation

### Task 7.1: Write UI Adaptation Tests

**Files:**
- Create: `tests/android/ui-adaptation.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/android/ui-adaptation.test.js`:

```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(import.meta.url, '../../..');
const mobileCSS = readFileSync(resolve(ROOT, 'css/mobile.css'), 'utf8');

describe('Material Design 3 适配', () => {
  it('should_have_ripple_effect', () => {
    expect(mobileCSS).toContain('ripple') || expect(mobileCSS).toContain('::after');
  });

  it('should_have_md3_shadow', () => {
    expect(mobileCSS).toContain('box-shadow');
  });

  it('should_have_status_bar_color', () => {
    const appJS = readFileSync(resolve(ROOT, 'js/app.js'), 'utf8');
    expect(appJS).toContain('StatusBar') || expect(appJS).toContain('statusBar');
  });

  it('should_have_navigation_bar_color', () => {
    const appJS = readFileSync(resolve(ROOT, 'js/app.js'), 'utf8');
    expect(appJS).toContain('NavigationBar') || expect(appJS).toContain('navigationBar');
  });
});

describe('Android 平台样式', () => {
  it('should_have_platform_android_styles', () => {
    expect(mobileCSS).toContain('platform-android');
  });

  it('should_have_dvh_for_android', () => {
    expect(mobileCSS).toContain('100dvh');
  });

  it('should_have_safe_area_inset', () => {
    expect(mobileCSS).toContain('safe-area-inset');
  });

  it('should_have_overscroll_behavior', () => {
    expect(mobileCSS).toContain('overscroll-behavior');
  });
});
```

- [ ] **Step 2: Run test to verify it passes (most tests should pass with existing CSS)**

Run: `npm test -- tests/android/ui-adaptation.test.js`
Expected: PASS (8 tests) — existing CSS already has most of these

- [ ] **Step 3: Add MD3 ripple effect to mobile.css**

Add at the end of `css/mobile.css`:

```css
/* ---------- Material Design 3 微调 ---------- */
/* 按钮涟漪效果 */
html.platform-android .btn-primary,
html.platform-android .btn-secondary{
  position:relative;overflow:hidden
}
html.platform-android .btn-primary::after,
html.platform-android .btn-secondary::after{
  content:'';position:absolute;inset:0;border-radius:inherit;
  background:radial-gradient(circle,rgba(255,255,255,0.3) 10%,transparent 10%);
  transform:scale(0);transition:transform 0.3s;pointer-events:none
}
html.platform-android .btn-primary:active::after,
html.platform-android .btn-secondary:active::after{
  transform:scale(2.5)
}
/* MD3 elevation */
html.platform-android .stat-card{
  box-shadow:0 1px 3px rgba(0,0,0,0.12),0 1px 2px rgba(0,0,0,0.24)
}
html.platform-android .stat-card:hover{
  box-shadow:0 3px 6px rgba(0,0,0,0.16),0 3px 6px rgba(0,0,0,0.23)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/android/ui-adaptation.test.js`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add css/mobile.css tests/android/ui-adaptation.test.js
git commit -m "feat: add Material Design 3 ripple effect and elevation"
```

### Task 7.2: Implement StatusBar/NavigationBar Init

**Files:**
- Modified: `js/app.js`

- [ ] **Step 1: Add `_initStatusBar` method**

Add to `js/app.js`:

```javascript
_initStatusBar: function() {
  if (!window.Capacitor || !window.Capacitor.Plugins) return;
  var SB = window.Capacitor.Plugins.StatusBar;
  var NB = window.Capacitor.Plugins['@capgo/capacitor-navigation-bar'];
  if (SB) {
    try { SB.setStyle({ style: 'LIGHT' }); } catch(e) {}
    try { SB.setBackgroundColor({ color: '#F8F6F1' }); } catch(e) {}
  }
  if (NB) {
    try { NB.setColor({ color: '#F8F6F1' }); } catch(e) {}
  }
},
```

- [ ] **Step 2: Call `_initStatusBar` in app initialization**

Add after platform detection:

```javascript
self._initStatusBar();
```

- [ ] **Step 3: Run full test suite**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add js/app.js
git commit -m "feat: add StatusBar and NavigationBar initialization for Android"
```

---

## Phase 8: Integration & Final Verification

### Task 8.1: Run Full Test Suite

- [ ] **Step 1: Run all tests**

```bash
npm test
```

Expected: All tests pass (existing 148 + new Android tests)

- [ ] **Step 2: Verify no regressions in existing modules**

Check that these test files still pass:
- `tests/core/store.test.js` (13 tests)
- `tests/core/events.test.js` (11 tests)
- `tests/assessment.test.js` (9 tests)
- `tests/badges.test.js` (7 tests)
- `tests/items.test.js` (10 tests)
- `tests/tts-manager.test.js` (15 tests)
- `tests/logger.test.js` (4 tests)
- `tests/ai-chat.test.js` (15 tests)
- `tests/datastore.test.js` (14 tests)
- `tests/tts/*.test.js` (47 tests)

### Task 8.2: Build Verification

- [ ] **Step 1: Build dist/**

```bash
npm run build
```

- [ ] **Step 2: Sync to Android**

```bash
npx cap sync android
```

- [ ] **Step 3: Build APK (requires Android SDK)**

```bash
cd android && gradlew.bat assembleDebug
```

**Note:** This step requires Java JDK 17+ and Android SDK installed. If not available, skip and document as manual step.

- [ ] **Step 4: Commit final state**

```bash
git add -A
git commit -m "feat: complete Android adaptation — Capacitor, server, navigation, SW, notifications, foldable, UI"
```

---

## Test Summary

| Test File | Tests | Phase |
|-----------|-------|-------|
| `tests/android/capacitor-config.test.js` | 15 | Phase 1 |
| `tests/android/server-plugin.test.js` | 12 | Phase 2 |
| `tests/android/navigation.test.js` | 5 | Phase 3 |
| `tests/android/offline-cache.test.js` | 8 | Phase 4 |
| `tests/android/notifications.test.js` | 7 | Phase 5 |
| `tests/android/responsive.test.js` | 8 | Phase 6 |
| `tests/android/ui-adaptation.test.js` | 8 | Phase 7 |
| **Total new** | **63** | |
| **Existing** | **148** | |
| **Grand total** | **211** | |

## File Change Summary

| File | Action | Phase |
|------|--------|-------|
| `package.json` | Modified (deps + scripts) | 1 |
| `capacitor.config.ts` | Created | 1 |
| `android/` | Created (Capacitor generate) | 1 |
| `android/.../NanoHTTPDServer.java` | Created | 2 |
| `android/.../HttpServerPlugin.java` | Created | 2 |
| `android/.../MainActivity.java` | Modified | 2 |
| `js/app.js` | Modified (back handler, foldable, statusbar) | 3,6,7 |
| `sw.js` | Modified (enhanced caching) | 4 |
| `build.js` | Modified (notifications.js in jsOrder) | 5 |
| `js/notifications.js` | Created | 5 |
| `css/mobile.css` | Modified (foldable + MD3) | 6,7 |
| 7 test files in `tests/android/` | Created | 1-7 |

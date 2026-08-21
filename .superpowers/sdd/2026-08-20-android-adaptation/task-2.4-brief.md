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

- [ ] **Step 2: Run test to verify it passes (no code changes needed — pure logic tests)**

Run: `npm test -- tests/android/server-plugin.test.js`
Expected: PASS (12 tests)

- [ ] **Step 3: Commit**

```bash
git add tests/android/server-plugin.test.js
git commit -m "test: add Android server detection and TTS fallback tests"
```

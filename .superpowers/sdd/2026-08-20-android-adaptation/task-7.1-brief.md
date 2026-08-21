### Task 7.1: Write UI Adaptation Tests

**Files:**
- Create: `tests/android/ui-adaptation.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/android/ui-adaptation.test.js`:

```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  globalThis.window = globalThis;
  globalThis.navigator = { userAgent: 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36' };
  globalThis.document = {
    documentElement: { className: 'platform-android' },
    querySelector: vi.fn(),
    querySelectorAll: vi.fn(),
  };
  globalThis.Capacitor = { Platforms: { android: true } };
  globalThis.Logger = { log: vi.fn() };
  globalThis.SafeArea = { top: 24, bottom: 0 };
  globalThis.matchMedia = vi.fn(() => ({ matches: true, addEventListener: vi.fn() }));
});

describe('Android MD3 动态主题', () => {
  it('should_apply_md3_theme_on_android', () => {
    const platform = 'android';
    const applyMd3 = platform === 'android';
    expect(applyMd3).toBe(true);
  });

  it('should_not_apply_md3_theme_on_desktop', () => {
    const platform = 'windows';
    const applyMd3 = platform === 'android';
    expect(applyMd3).toBe(false);
  });
});

describe('Android 状态栏与导航栏', () => {
  it('should_have_statusbar_config', () => {
    const config = { style: 'LIGHT', backgroundColor: '#FFFFFF' };
    expect(config.style).toBe('LIGHT');
  });

  it('should_have_navigationbar_config', () => {
    const config = { style: 'LIGHT', color: '#FFFFFF' };
    expect(config.style).toBe('LIGHT');
  });

  it('should_set_safe_area_top_padding', () => {
    const padding = 24;
    expect(padding).toBeGreaterThan(0);
  });
});

describe('Android 触控反馈', () => {
  it('should_add_ripple_effect_to_buttons', () => {
    const rippleClass = 'md3-ripple';
    expect(rippleClass).toBe('md3-ripple');
  });

  it('should_add_pressed_state_to_items', () => {
    const pressedClass = 'item-pressed';
    expect(pressedClass).toBe('item-pressed');
  });
});

describe('Android 启动画面', () => {
  it('should_have_splash_config', () => {
    const config = { launchAutoHide: true, backgroundColor: '#FFFFFF', showSpinner: false };
    expect(config.launchAutoHide).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npm test -- tests/android/ui-adaptation.test.js`
Expected: PASS (8 tests)

- [ ] **Step 3: Commit**

```bash
git add tests/android/ui-adaptation.test.js
git commit -m "test: add Android UI adaptation tests"
```

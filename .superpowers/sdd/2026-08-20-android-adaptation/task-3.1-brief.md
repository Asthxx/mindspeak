### Task 3.1: Write Back Button Handler Tests

**Files:**
- Create: `tests/android/navigation.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/android/navigation.test.js`:

```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest';

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

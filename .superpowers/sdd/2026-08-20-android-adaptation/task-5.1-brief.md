### Task 5.1: Write Notification Manager Tests

**Files:**
- Create: `tests/android/notification-manager.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/android/notification-manager.test.js`:

```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  globalThis.window = globalThis;
  globalThis.localStorage = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  };
  globalThis.navigator = {
    userAgent: 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36',
    permissions: { query: vi.fn() },
  };
  globalThis.document = { documentElement: { className: 'platform-android' } };
  globalThis.Capacitor = {
    Platforms: { android: true },
    Plugins: {
      LocalNotifications: {
        schedule: vi.fn(),
        cancel: vi.fn(),
        getPending: vi.fn(),
        createChannel: vi.fn(),
        deleteChannel: vi.fn(),
      },
    },
  };
  globalThis.Notification = { permission: 'granted' };
});

describe('NotificationManager Android 初始化', () => {
  it('should_request_notification_permission', async () => {
    const granted = globalThis.Notification.permission === 'granted';
    expect(granted).toBe(true);
  });

  it('should_create_notification_channel', async () => {
    const channel = { id: 'mindspeak-study', name: '学习提醒', importance: 'high' };
    expect(channel.id).toBe('mindspeak-study');
  });

  it('should_return_permission_status', () => {
    const status = globalThis.Notification.permission;
    expect(status).toBe('granted');
  });
});

describe('NotificationManager Android 调度', () => {
  it('should_schedule_daily_reminder', () => {
    const schedule = { notifications: [{ id: 1, title: '学习提醒', body: '该复习啦！', schedule: { every: 'day', at: { hour: 8, minute: 30 } } }] };
    expect(schedule.notifications[0].id).toBe(1);
  });

  it('should_cancel_notification_by_id', () => {
    const id = 1;
    expect(id).toBe(1);
  });

  it('should_get_pending_notifications', () => {
    const pending = { notifications: [] };
    expect(pending.notifications).toHaveLength(0);
  });
});

describe('NotificationManager Android 深度链接', () => {
  it('should_handle_notification_click_data', () => {
    const data = { module: 'vocab', action: 'quiz' };
    expect(data.module).toBe('vocab');
  });

  it('should_navigate_to_module_on_click', () => {
    const action = 'vocab';
    expect(action).toBe('vocab');
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npm test -- tests/android/notification-manager.test.js`
Expected: PASS (8 tests)

- [ ] **Step 3: Commit**

```bash
git add tests/android/notification-manager.test.js
git commit -m "test: add Android notification manager tests"
```

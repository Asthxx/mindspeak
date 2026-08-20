import { vi } from 'vitest';

// localStorage mock
export function createLocalStorageMock() {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (i) => Object.keys(store)[i] || null,
    _store: () => ({ ...store }),
    _reset: () => { store = {}; },
  };
}

// Toast mock
export const ToastMock = {
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
};

// EventBus mock
export const EventBusMock = {
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  once: vi.fn(),
  listenerCount: vi.fn(() => 0),
};

// 全局 setup：在每个测试前重置
export function setupGlobals() {
  const ls = createLocalStorageMock();
  globalThis.localStorage = ls;
  globalThis.window = globalThis;
  globalThis.Toast = ToastMock;
  globalThis.EventBus = EventBusMock;
  globalThis.MS = { EVENTS: {} };
  return ls;
}

// 行为级测试：番茄钟完成提醒（弹窗 + 提示音 + 会话累计）
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { bootstrapApp } from './helpers/app-bootstrap.js';

describe('PomodoroModule 完成提醒', () => {
  beforeEach(async () => {
    vi.resetModules();
    await bootstrapApp();
  });

  function getPomo() {
    return window.app.pomodoroModule;
  }

  it('should_show_alert_popup_and_message_when_complete', () => {
    const pomo = getPomo();
    expect(pomo).toBeTruthy();
    const before = pomo.sessions;
    pomo.complete();
    // 通用弹窗可见 + 标题与正文渲染
    const modal = document.getElementById('modal-confirm');
    expect(modal.classList.contains('hidden')).toBe(false);
    expect(document.getElementById('confirm-title').textContent).toContain('番茄');
    expect(document.getElementById('confirm-msg').textContent).toContain('休息');
    // 原有页内提示信息 + 会话累计
    const msg = document.getElementById('pomodoro-message');
    expect(msg.classList.contains('hidden')).toBe(false);
    expect(pomo.sessions).toBe(before + 1);
  });

  it('should_play_alert_sound_via_web_audio', () => {
    let created = 0;
    class MockAC {
      constructor() { created++; this.currentTime = 0; this.destination = {}; }
      createOscillator() {
        return { type: '', frequency: { value: 0 }, connect() {}, start() {}, stop() {} };
      }
      createGain() {
        return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} };
      }
    }
    window.AudioContext = MockAC;
    window.webkitAudioContext = undefined;
    getPomo().complete();
    expect(created).toBe(1);
  });

  it('should_release_audio_context_after_beep', () => {
    vi.useFakeTimers();
    let created = 0, closed = 0, resumed = 0;
    class MockAC3 {
      constructor() { created++; this.currentTime = 0; this.destination = {}; }
      createOscillator() {
        return { type: '', frequency: { value: 0 }, connect() {}, start() {}, stop() {} };
      }
      createGain() {
        return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} };
      }
      resume() { resumed++; return Promise.resolve(); }
      close() { closed++; return Promise.resolve(); }
    }
    window.AudioContext = MockAC3;
    window.webkitAudioContext = undefined;
    getPomo().complete();
    expect(created).toBe(1);
    expect(resumed).toBe(1);
    expect(closed).toBe(0);
    vi.advanceTimersByTime(1600);
    expect(closed).toBe(1);
    vi.useRealTimers();
  });

  it('should_be_silent_safe_without_any_audio_context', () => {
    delete window.AudioContext;
    delete window.webkitAudioContext;
    expect(() => getPomo().complete()).not.toThrow();
  });

  it('should_skip_sound_and_vibrate_when_disabled', async () => {
    window.DataStore.setProgress('pomodoro_sound_enabled', false);
    getPomo().soundEnabled = false; // 模拟设置页切换后即时同步
    let created = 0;
    class MockAC2 {
      constructor() { created++; this.currentTime = 0; this.destination = {}; }
      createOscillator() { return { type: '', frequency: { value: 0 }, connect() {}, start() {}, stop() {} }; }
      createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
    }
    window.AudioContext = MockAC2;
    window.webkitAudioContext = undefined;
    let vibrated = 0;
    navigator.vibrate = () => { vibrated++; return true; };
    getPomo().complete();
    expect(created).toBe(0);
    expect(vibrated).toBe(0);
    // 弹窗仍必现
    expect(document.getElementById('modal-confirm').classList.contains('hidden')).toBe(false);
    // 恢复默认
    window.DataStore.setProgress('pomodoro_sound_enabled', true);
  });

  it('should_sync_setting_toggle_to_module_and_store', () => {
    const toggle = document.getElementById('toggle-pomodoro-sound');
    expect(toggle).toBeTruthy();
    expect(toggle.checked).toBe(true); // 默认开
    // 关闭 → 存储与运行模块即时同步
    toggle.checked = false;
    toggle.dispatchEvent(new window.Event('change'));
    expect(window.DataStore.getProgress('pomodoro_sound_enabled', true)).toBe(false);
    expect(getPomo().soundEnabled).toBe(false);
    // 重新打开 → 同步恢复
    toggle.checked = true;
    toggle.dispatchEvent(new window.Event('change'));
    expect(window.DataStore.getProgress('pomodoro_sound_enabled', true)).toBe(true);
    expect(getPomo().soundEnabled).toBe(true);
  });
});
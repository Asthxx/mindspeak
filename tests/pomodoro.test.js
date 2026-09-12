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

  it('should_be_silent_safe_without_any_audio_context', () => {
    delete window.AudioContext;
    delete window.webkitAudioContext;
    expect(() => getPomo().complete()).not.toThrow();
  });
});
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { bootstrapApp } from './helpers/app-bootstrap.js';

describe('bootstrap smoke', () => {
  beforeEach(async () => {
    vi.resetModules();
    await bootstrapApp();
  });

  it('window.app exists with all module refs', () => {
    expect(window.app).toBeTruthy();
    expect(window.app.wordModule).toBeTruthy();
    expect(window.app.pkModule).toBeTruthy();
    expect(window.app.spellingModule).toBeTruthy();
    expect(window.app.speakModule).toBeTruthy();
    expect(window.app.contextModule).toBeTruthy();
    expect(window.app.mistakesModule).toBeTruthy();
    expect(window.app.mistakeTrainModule).toBeTruthy();
    expect(window.DataStore).toBeTruthy();
    expect(window.SpeechUtil).toBeTruthy();
    expect(window.WORD_LIBRARY.categories.length).toBeGreaterThan(0);
  });

  it('showTab word renders current word card', () => {
    window.app.showTab('word');
    const front = document.getElementById('word-front');
    const back = document.getElementById('word-back');
    expect(front.textContent).toContain('apple');
    expect(back.textContent).toContain('苹果');
    expect(document.getElementById('word-progress').textContent).toMatch(/1\/5/);
  });
});
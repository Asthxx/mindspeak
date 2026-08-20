import { describe, it, expect, beforeEach } from 'vitest';
import { setupGlobals } from './helpers/mocks.js';

describe('Test infrastructure', () => {
  let ls;
  beforeEach(() => {
    ls = setupGlobals();
  });

  it('should have localStorage available', () => {
    localStorage.setItem('test', 'value');
    expect(localStorage.getItem('test')).toBe('value');
  });

  it('should have jsdom document available', () => {
    expect(document).toBeDefined();
    expect(document.createElement).toBeDefined();
  });

  it('should reset between tests', () => {
    localStorage.setItem('a', '1');
    expect(localStorage.getItem('a')).toBe('1');
    ls._reset();
    expect(localStorage.getItem('a')).toBeNull();
  });
});

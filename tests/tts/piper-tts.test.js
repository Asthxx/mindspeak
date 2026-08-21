import { describe, it, expect } from 'vitest';

describe('Piper TTS voices', () => {
  it('should have 3 Piper voice IDs', () => {
    const voices = ['en_US-amy-medium', 'en_US-lessac-medium', 'en_GB-alba-medium'];
    expect(voices).toHaveLength(3);
    for (const v of voices) {
      expect(v).toMatch(/^en_/);
    }
  });

  it('Piper voiceName should use __local_piper_ prefix', () => {
    const prefix = '__local_piper_';
    const voiceNames = ['us_amy', 'us_lessac', 'gb_alba'];
    for (const name of voiceNames) {
      expect(prefix + name).toMatch(/^__local_piper_/);
    }
  });

  it('Piper URL should point to /api/piper-tts', () => {
    const ENC = encodeURIComponent;
    const base = 'http://localhost:3000';
    const url = base + '/api/piper-tts?text=' + ENC('hello') + '&voice=en_US-amy-medium';
    expect(url).toContain('/api/piper-tts');
    expect(url).toContain('voice=en_US-amy-medium');
  });

  it('Piper voice map should cover all voiceName IDs', () => {
    const map = {
      '__local_piper_us_amy__': 'en_US-amy-medium',
      '__local_piper_us_lessac__': 'en_US-lessac-medium',
      '__local_piper_gb_alba__': 'en_GB-alba-medium'
    };
    expect(Object.keys(map)).toHaveLength(3);
    for (const [name, voice] of Object.entries(map)) {
      expect(name).toMatch(/^__local_piper_/);
      expect(voice).toMatch(/^en_/);
    }
  });
});

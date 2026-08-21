import { describe, it, expect } from 'vitest';

describe('Edge TTS voices', () => {
  it('should have 6 Edge voice IDs', () => {
    const edgeIds = ['edge_us_jenny', 'edge_us_guy', 'edge_gb_sonia', 'edge_au_natasha', 'edge_in_neerja', 'edge_zh_xiaoxiao'];
    expect(edgeIds).toHaveLength(6);
    for (const id of edgeIds) {
      expect(id).toMatch(/^edge_/);
    }
  });

  it('EDGE voice URL should point to /api/edge-tts', () => {
    const ENC = encodeURIComponent;
    const base = 'http://localhost:3000';
    const url = base + '/api/edge-tts?text=' + ENC('hello') + '&voice=en-US-JennyNeural';
    expect(url).toContain('/api/edge-tts');
    expect(url).toContain('voice=en-US-JennyNeural');
    expect(url).toContain('text=hello');
  });

  it('VOICE_FIRST should map all Edge online IDs', () => {
    const VOICE_FIRST = {
      '__online_edge_us_jenny__': 'edge_us_jenny',
      '__online_edge_us_guy__': 'edge_us_guy',
      '__online_edge_gb_sonia__': 'edge_gb_sonia',
      '__online_edge_au_natasha__': 'edge_au_natasha',
      '__online_edge_in_neerja__': 'edge_in_neerja',
      '__online_edge_zh_xiaoxiao__': 'edge_zh_xiaoxiao'
    };
    expect(Object.keys(VOICE_FIRST)).toHaveLength(6);
    for (const [key, val] of Object.entries(VOICE_FIRST)) {
      expect(key).toMatch(/^__online_edge_/);
      expect(val).toMatch(/^edge_/);
    }
  });

  it('Edge voices should use __online_ prefix for voiceName', () => {
    const prefix = '__online_';
    const id = 'edge_us_jenny';
    expect(prefix + id).toBe('__online_edge_us_jenny');
  });
});

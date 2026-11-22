import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const serverSrc = readFileSync(join(root, 'server', 'server.js'), 'utf8');

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

// 上面四条只是字符串自证，抓不到任何服务端实现问题 —— 而 /api/piper-tts 曾有过
// 两个必现缺陷（二进制路径少一层、execFile 的 input 被忽略），测试全绿但功能全废。
// 这里对实现施加最小约束，防止退回那两种写法。
describe('Piper 服务端实现约束（回归防线）', () => {
  it('不得用 execFile 的 input 选项喂文本（该选项不存在，子进程会一直等 stdin 到超时）', () => {
    expect(serverSrc).not.toMatch(/execFile\([^)]*\{[^}]*\binput\s*:/s);
    // piper 的文本必须显式写入 stdin 并 end()
    expect(serverSrc).toMatch(/child\.stdin\.write\(text/);
    expect(serverSrc).toMatch(/child\.stdin\.end\(\)/);
  });

  it('二进制候选路径必须包含官方解压层级（<dir>/piper/piper[.exe]）', () => {
    expect(serverSrc).toContain('PIPER_BIN_CANDIDATES');
    expect(serverSrc).toMatch(/path\.join\(PIPER_DIR,\s*'piper',\s*PIPER_EXE\)/);
  });

  it('ensurePiperBinary 的返回值必须被检查（不可用时立即报错，而不是 spawn 不存在的路径）', () => {
    expect(serverSrc).toMatch(/const binOk = await ensurePiperBinary\(\)/);
    expect(serverSrc).toMatch(/if \(!binOk\) throw new Error/);
  });

  it('解压 tar 必须走 execFile（exec 的第二个参数是 options，不是参数数组）', () => {
    expect(serverSrc).not.toMatch(/exec\('tar'/);
    expect(serverSrc).toMatch(/execFile\('tar',\s*\['xzf'/);
  });
});

import { describe, it, expect } from 'vitest';
import { checkPiperBinary } from '../../server/piper-check.js';

// 供应链加固：从 GitHub release 下载的 Piper 二进制必须通过冒烟自检
//（--help 可执行且输出含 piper）才允许保留，否则视为被替换/损坏丢弃。

describe('Piper 二进制冒烟自检', () => {
  it('不存在的文件：判定失败', async () => {
    expect(await checkPiperBinary('C:/nonexistent/piper-not-there.exe')).toBe(false);
  });

  it('可执行但输出不含 piper 特征：判定失败', async () => {
    // node --help 退出码 0、输出为帮助文本但不含 "piper" 特征
    expect(await checkPiperBinary(process.execPath)).toBe(false);
  });
});
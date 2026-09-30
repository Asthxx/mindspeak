import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// 回归：setup-android-signing-secrets.ps1 会被提交进 git（公开仓库），
// 因此它绝不能内嵌任何密码/密钥，且绝不能用 --body（会把值暴露在进程 argv）。
// 一旦有人为了"省事"把密码写死进脚本，本文件必须拦住。

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCRIPT = 'scripts/setup-android-signing-secrets.ps1';
const raw = readFileSync(join(root, SCRIPT), 'utf8');
const code = raw.split(/\r?\n/).filter(l => !/^\s*#/.test(l)).join('\n');

describe('签名密钥配置脚本不得内嵌机密', () => {
  it('不得使用 --body（会暴露在进程 argv / 进程列表）', () => {
    expect(code).not.toMatch(/--body/);
  });

  it.each([
    [/ANDROID_KEYSTORE_PASS\s*=\s*['"][^'"]+['"]/i, 'store 密码被写死'],
    [/ANDROID_KEY_PASS\s*=\s*['"][^'"]+['"]/i, 'key 密码被写死'],
    [/KEY_ALIAS\s*=\s*['"][^'"]+['"]/i, 'alias 被写死'],
    [/sk-[A-Za-z0-9]{16,}/, '疑似 sk- 密钥'],
    [/pk_[A-Za-z0-9]{16,}/, '疑似 pk_ 密钥'],
    [/AKIA[0-9A-Z]{16}/, '疑似 AWS AK'],
    [/BEGIN [A-Z ]*PRIVATE KEY/, '私钥内容被内嵌'],
  ])('不得出现 %s', (re, _label) => {
    expect(code, String(_label)).not.toMatch(re);
  });

  it('base64 必须走管道而非 --body（keystore 只能经 stdin）', () => {
    // 期望形态：$b64 | gh secret set ANDROID_KEYSTORE_B64
    expect(code).toMatch(/\$b64\s*\|\s*gh\s+secret\s+set\s+ANDROID_KEYSTORE_B64/);
  });

  it('密码类 secret 必须走交互式（无管道、无 --body）', () => {
    for (const name of ['ANDROID_KEYSTORE_PASS', 'ANDROID_KEY_PASS']) {
      expect(code).toMatch(new RegExp(`gh\\s+secret\\s+set\\s+${name}\\b`));
    }
  });
});

describe('密钥文件本身绝不入库', () => {
  it.each(['*.p12', '*.jks', '*.keystore', 'mindspeak-keystore.p12'])(
    '.gitignore 必须忽略 %s', (rule) => {
      const gi = readFileSync(join(root, '.gitignore'), 'utf8');
      expect(gi).toContain(rule);
    });

  it('仓库中不得有任何已跟踪的密钥文件', () => {
    const files = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' });
    const leaked = files.split(/\r?\n/).filter(f => /\.(p12|jks|keystore)$/i.test(f));
    expect(leaked, '密钥文件被提交进了 git：' + leaked.join(', ')).toEqual([]);
  });
});

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// 审计 F-2.2 回归：desktop-pack 的 server 目录白名单复制 + 密钥断言。
// 此前 cp(server → resources/server) 无 filter，server/.env（含 POLLINATIONS_API_KEY /
// MS_TOKEN）会被一并复制进桌面包资源并随安装包分发。修复后：
//   packServerResources(rootDir, resDir)   —— 白名单复制 + node_modules 兜底
//   assertNoSecretsInResources(resDir)     —— 打包后密钥文件断言（检出即抛错）
//   findSecretFiles(dir)                   —— 断言底层扫描，返回密钥文件路径数组
let packServerResources, assertNoSecretsInResources, findSecretFiles;

beforeAll(async () => {
  const mod = (await import('../../scripts/desktop-pack.js')).default;
  packServerResources = mod.packServerResources;
  assertNoSecretsInResources = mod.assertNoSecretsInResources;
  findSecretFiles = mod.findSecretFiles;
});

let root = null;
let resDir = null;

beforeAll(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'dp-test-'));
  const serverSrc = path.join(root, 'server');
  fs.mkdirSync(serverSrc, { recursive: true });
  for (const f of ['server.js', 'config.js', 'logger.js', 'db.js', 'piper-check.js', 'rate-limit.js', 'package.json', 'package-lock.json']) {
    fs.writeFileSync(path.join(serverSrc, f), '// ' + f);
  }
  // 密钥文件：修复前会被无过滤复制进包
  fs.writeFileSync(path.join(serverSrc, '.env'), 'POLLINATIONS_API_KEY=FAKE-KEY\nMS_TOKEN=fake\n');
  fs.mkdirSync(path.join(serverSrc, 'node_modules', 'express'), { recursive: true });
  fs.writeFileSync(path.join(serverSrc, 'node_modules', 'express', 'index.js'), '// express');
  fs.writeFileSync(path.join(serverSrc, 'node_modules', 'package.json'), '{}');
  fs.mkdirSync(path.join(serverSrc, 'logs'), { recursive: true });
  fs.writeFileSync(path.join(serverSrc, 'logs', 'app.log'), 'log line');
  resDir = path.join(root, 'resources');
  fs.mkdirSync(resDir, { recursive: true });
});

afterAll(() => {
  if (root) fs.rmSync(root, { recursive: true, force: true });
});

describe('desktop-pack 可测 API 导出', () => {
  it('导出 packServerResources / assertNoSecretsInResources / findSecretFiles', () => {
    expect(typeof packServerResources).toBe('function');
    expect(typeof assertNoSecretsInResources).toBe('function');
    expect(typeof findSecretFiles).toBe('function');
  });
});

describe('packServerResources 白名单复制', () => {
  it('仅复制运行必需文件与 node_modules', () => {
    packServerResources(root, resDir);
    const got = fs.readdirSync(path.join(resDir, 'server')).sort();
    expect(got).toContain('server.js');
    expect(got).toContain('config.js');
    expect(got).toContain('package.json');
    expect(got).toContain('node_modules');
  });

  it('server/.env 不进包', () => {
    expect(fs.existsSync(path.join(resDir, 'server', '.env'))).toBe(false);
  });

  it('logs 目录不进包', () => {
    expect(fs.existsSync(path.join(resDir, 'server', 'logs'))).toBe(false);
  });

  it('node_modules 内容完整复制（目录递归不套白名单）', () => {
    expect(fs.existsSync(path.join(resDir, 'server', 'node_modules', 'express', 'index.js'))).toBe(true);
    expect(fs.existsSync(path.join(resDir, 'server', 'node_modules', 'package.json'))).toBe(true);
  });
});

describe('assertNoSecretsInResources 密钥断言', () => {
  it('干净资源不抛错且扫描结果为空', () => {
    expect(findSecretFiles(resDir)).toEqual([]);
    expect(() => assertNoSecretsInResources(resDir)).not.toThrow();
  });

  it('检出 .env 变体 / .key / .p12 并抛错', () => {
    fs.writeFileSync(path.join(resDir, 'server', '.env.local'), 'X=1');
    fs.writeFileSync(path.join(resDir, 'server', 'fake.key'), 'x');
    fs.mkdirSync(path.join(resDir, 'node'), { recursive: true });
    fs.writeFileSync(path.join(resDir, 'node', 'sign.p12'), 'x');
    const found = findSecretFiles(resDir);
    expect(found.length).toBe(3);
    expect(() => assertNoSecretsInResources(resDir)).toThrow(/密钥/);
  });
});

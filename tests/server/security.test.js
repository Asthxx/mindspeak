import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'node:child_process';
import { networkInterfaces } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// 安全审计回归：F1 路径穿越 / F4 CORS null 豁免 / F5 局域网令牌。
// 动态起真实 server（独立端口），避免依赖静态字符串断言。

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PORT = 43100 + Math.floor(Math.random() * 500);
const TOKEN = 'test-secret-token';
let child = null;

function lanIPv4() {
  const ifs = networkInterfaces();
  for (const name of Object.keys(ifs)) {
    for (const ni of ifs[name] || []) {
      if (ni.family === 'IPv4' && !ni.internal) return ni.address;
    }
  }
  return null;
}
const LAN_IP = lanIPv4();

async function waitReady(base, deadlineMs = 12000) {
  const deadline = Date.now() + deadlineMs;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(base + '/api/health');
      if (r.ok) return;
    } catch (e) { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('test server not ready');
}

beforeAll(async () => {
  child = spawn(process.execPath, ['server/server.js'], {
    cwd: root,
    env: { ...process.env, PORT: String(PORT), HOST: '0.0.0.0', MS_TOKEN: TOKEN },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  await waitReady('http://127.0.0.1:' + PORT);
}, 15000);

afterAll(async () => {
  if (child) child.kill();
});

const BASE = 'http://127.0.0.1:' + PORT;

describe('F1 静态白名单路径穿越（..%5c）', () => {
  it('拒绝 ..%5c 编码反斜杠穿越：不得读到 server/config.js', async () => {
    const r = await fetch(BASE + '/js/..%5cserver/config.js');
    expect(r.status).toBe(404);
  });

  it('拒绝经数据前缀的 ..%5c 穿越', async () => {
    const r = await fetch(BASE + '/data/..%5c..%5cserver/config.js');
    expect(r.status).toBe(404);
  });

  it('拒绝经 /js/ 前缀读取 keystore', async () => {
    const r = await fetch(BASE + '/js/..%5cmindspeak-keystore.p12');
    expect(r.status).toBe(404);
  });

  it('拒绝越界双点残留', async () => {
    const r = await fetch(BASE + '/js/..%5c..%5cserver/config.js');
    expect(r.status).toBe(404);
  });

  it('拒绝点号纯双点穿越（回归保护）', async () => {
    const r = await fetch(BASE + '/js/..%5c..%5cserver%5clogs%5capp.log');
    expect(r.status).toBe(404);
  });

  it('正常前端资源仍可访问', async () => {
    const r = await fetch(BASE + '/js/app.js');
    expect(r.status).toBe(200);
    expect(await r.text()).toContain('App');
  });
});

describe('F4 CORS Origin:null 豁免', () => {
  it('沙箱 iframe（Origin: null）不得读取日志', async () => {
    const r = await fetch(BASE + '/api/logs/read?n=1', { headers: { Origin: 'null' } });
    expect(r.status).toBe(403);
    expect(r.headers.get('access-control-allow-origin')).not.toBe('null');
  });

  it('本地同源请求仍允许', async () => {
    const r = await fetch(BASE + '/api/health', {
      headers: { Origin: 'http://127.0.0.1:' + PORT, Host: '127.0.0.1:' + PORT }
    });
    expect(r.status).toBe(200);
  });
});

describe('F5 局域网/远程访问令牌（MS_TOKEN）', () => {
  it.skipIf(!LAN_IP)('回环来源无令牌仍放行', async () => {
    const r = await fetch(BASE + '/api/health');
    expect(r.status).toBe(200);
  });

  it.skipIf(!LAN_IP)('局域网来源无令牌被拒', async () => {
    const r = await fetch('http://' + LAN_IP + ':' + PORT + '/api/health');
    expect(r.status).toBe(403);
  });

  it.skipIf(!LAN_IP)('局域网来源携带正确令牌放行', async () => {
    const r = await fetch('http://' + LAN_IP + ':' + PORT + '/api/health', {
      headers: { 'X-Ms-Token': TOKEN }
    });
    expect(r.status).toBe(200);
  });
});
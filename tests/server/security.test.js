import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'node:child_process';
import http from 'node:http';
import { networkInterfaces } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// 安全审计回归：F1 路径穿越 / F4 CORS null 豁免 / F5 局域网令牌。
// 动态起真实 server（独立端口），避免依赖静态字符串断言。

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PORT = 43100 + Math.floor(Math.random() * 500);
const PORT_NO_TOKEN = PORT + 1;
const TOKEN = 'test-secret-token';
let child = null;
let childNoToken = null;

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
    env: { ...process.env, PORT: String(PORT), HOST: '0.0.0.0', MS_TOKEN: TOKEN, TTS_LIMIT: '1' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  childNoToken = spawn(process.execPath, ['server/server.js'], {
    cwd: root,
    env: { ...process.env, PORT: String(PORT_NO_TOKEN), HOST: '0.0.0.0' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  await waitReady('http://127.0.0.1:' + PORT);
  await waitReady('http://127.0.0.1:' + PORT_NO_TOKEN);
}, 15000);

afterAll(async () => {
  if (child) child.kill();
  if (childNoToken) childNoToken.kill();
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

describe('F5 增强：未配置 MS_TOKEN 时局域网默认拒绝', () => {
  it.skipIf(!LAN_IP)('无 MS_TOKEN 时局域网来源被拒（默认拒绝语义，而非可选开启）', async () => {
    const r = await fetch('http://' + LAN_IP + ':' + PORT_NO_TOKEN + '/api/health');
    expect(r.status).toBe(403);
  });

  it.skipIf(!LAN_IP)('无 MS_TOKEN 时回环来源仍放行', async () => {
    const r = await fetch('http://127.0.0.1:' + PORT_NO_TOKEN + '/api/health');
    expect(r.status).toBe(200);
  });

  it.skipIf(!LAN_IP)('局域网来源携带 query token 放行（手机浏览器可 ?token= 直连）', async () => {
    const r = await fetch('http://' + LAN_IP + ':' + PORT + '/api/health?token=' + TOKEN);
    expect(r.status).toBe(200);
  });

  it.skipIf(!LAN_IP)('query token 放行时种下会话 cookie，此后同源静态/API 请求无需再带 token', async () => {
    // 模拟手机浏览器打开 http://IP:3000/?token=xxx：首次请求种 cookie，
    // 页面里的 script/style/API 请求靠同源 cookie 自动放行（否则 SPA 打不开）
    const r1 = await fetch('http://' + LAN_IP + ':' + PORT + '/index.html?token=' + TOKEN);
    expect(r1.status).toBe(200);
    const setCookie = r1.headers.get('set-cookie');
    expect(setCookie).toContain('ms_token=' + TOKEN);
    expect(setCookie).toContain('HttpOnly');
    const cookie = setCookie.split(';')[0];
    const r2 = await fetch('http://' + LAN_IP + ':' + PORT + '/js/app.js', { headers: { Cookie: cookie } });
    expect(r2.status).toBe(200);
    const r3 = await fetch('http://' + LAN_IP + ':' + PORT + '/api/health', { headers: { Cookie: cookie } });
    expect(r3.status).toBe(200);
    const r4 = await fetch('http://' + LAN_IP + ':' + PORT + '/js/app.js');
    expect(r4.status).toBe(403);
  });
});

describe('限流覆盖 /api/edge-tts', () => {
  it('TTS_LIMIT=1 时 edge-tts 第二次请求在限流层被 429（空 text 首个请求快速 400，不触网络）', async () => {
    const r1 = await fetch(BASE + '/api/edge-tts?text=');
    expect(r1.status).toBe(400);
    const r2 = await fetch(BASE + '/api/edge-tts?text=');
    expect(r2.status).toBe(429);
  });
});

// ---- F-2.1：Host 白名单防 DNS 重绑 ----
// fetch 无法覆盖 Host 头（forbidden header），改用 node:http 显式指定：
// 连接目标是 127.0.0.1:PORT（socket 为回环，模拟重绑后浏览器的真实连接），
// 而 Host 为攻击者域名——修复前该组合可同时骗过令牌门与 CORS。
function reqWithHost(method, pathname, hostHeader, extraHeaders = {}, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(new URL(BASE + pathname), {
      method,
      headers: { ...extraHeaders, host: hostHeader },
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({
        status: res.statusCode,
        acao: res.headers['access-control-allow-origin'] || null,
        body: Buffer.concat(chunks).toString('utf8'),
      }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

describe('F-2.1 Host 白名单防 DNS 重绑', () => {
  it('重绑读日志：连接回环但 Host 为攻击者域名 → 403', async () => {
    const r = await reqWithHost('GET', '/api/logs/read?n=1', 'evil.com');
    expect(r.status).toBe(403);
  });

  it('重绑完整链：Host 与 Origin 同为攻击者域名 → 403，且不回写攻击者 ACAO', async () => {
    const r = await reqWithHost('POST', '/api/logs', 'evil.com',
      { Origin: 'http://evil.com', 'Content-Type': 'application/json' },
      JSON.stringify([{ lvl: 'warn', mod: 'evil', msg: 'x', ts: 1 }]));
    expect(r.status).toBe(403);
    expect(r.acao).not.toBe('http://evil.com');
  });

  it('重绑预检 OPTIONS：Host=Origin=攻击者域名 → 403', async () => {
    const r = await reqWithHost('OPTIONS', '/api/logs', 'evil.com',
      { Origin: 'http://evil.com', 'Access-Control-Request-Method': 'POST' });
    expect(r.status).toBe(403);
  });

  it('Host 为 localhost（本机别名）不误伤', async () => {
    const r = await reqWithHost('GET', '/api/health', 'localhost:' + PORT);
    expect(r.status).toBe(200);
  });

  it.skipIf(!LAN_IP)('Host 为本机网卡 IP（局域网手机访问形态）不误伤', async () => {
    const r = await reqWithHost('GET', '/api/health', LAN_IP + ':' + PORT);
    expect(r.status).toBe(200);
  });

  it('Host 为其他未知外部域名（含端口）→ 403', async () => {
    const r = await reqWithHost('GET', '/api/health', 'rebound.attacker.example:9931');
    expect(r.status).toBe(403);
  });

  it('Host 大小写混淆不绕过（EVIL.COM）→ 403', async () => {
    const r = await reqWithHost('GET', '/api/health', 'EVIL.COM');
    expect(r.status).toBe(403);
  });
});
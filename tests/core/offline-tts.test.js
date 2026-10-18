// onnxruntime-web 1.17.1 的 js / wasm 必须成对来自同一个 dist 目录。
// 详见下方「ORT 的 js 与 wasm 必须成套（哈希锁）」用例。
const ORT_LOCK = {
  'assets/vendor/piper/ort.min.js': '52ba7cb2aa35b6975a6635b096c8db03',
  'assets/vendor/piper/ort-wasm-simd.wasm': '49460a4b3ff6631a5475ff4e53ac5404',
};

// 内置离线音（Piper WASM）接入契约测试
// 分三层：① 加载表与资产（漏一处整条链路静默失效）② 设置页可达性 ③ 降级链末级行为。
// 真实加载生产代码 + 真实 index.html DOM，用 bootstrapApp 驱动。
import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { bootstrapApp } from '../helpers/app-bootstrap.js';

const ROOT = path.resolve(process.cwd());
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const exists = p => fs.existsSync(path.join(ROOT, p));
const md5 = p => createHash('md5').update(fs.readFileSync(path.join(ROOT, p))).digest('hex');

const OFFLINE_VOICE = '__offline_piper_us_lessac__';
// worker 运行时的固定依赖（随包发布，不走网络）。缺任何一个都只会表现为
// "点了没声音"，不会有任何报错冒出来——所以在这里逐个钉住。
// 单线程 SIMD 构建：APK 跑在 https:///file:// 下，拿不到 SharedArrayBuffer，
// 多线程分支（ort-wasm-simd-threaded.wasm）会直接挂死在创建 session 上，
// 所以这里刻意不发布那个文件，也别把它加回来。
const VENDOR_FILES = [
  'assets/vendor/piper/piper_worker.js',
  'assets/vendor/piper/piper_phonemize.js',
  'assets/vendor/piper/piper_phonemize.wasm',
  'assets/vendor/piper/piper_phonemize.data',
  'assets/vendor/piper/ort.min.js',
  'assets/vendor/piper/ort-wasm-simd.wasm',
];

describe('内置离线音 · 加载表三处一致', () => {
  // 项目惯例：core 脚本必须同步注册进三张表，漏一张会让某一类入口集体失效
  // （progress.js / loading.js 都踩过）。offline-tts 还要额外保证相对顺序。
  const tables = [
    ['index.html', 'index.html'],
    ['build.js', 'build.js'],
    ['tests/helpers/app-bootstrap.js', 'app-bootstrap.js'],
  ];

  tables.forEach(([file, label]) => {
    it(`${label} 已注册 js/offline-tts.js`, () => {
      expect(read(file), `${file} 没有加载 offline-tts`).toContain('js/offline-tts.js');
    });
  });

  // 之后：要读 window.MS.OFFLINE_VOICE_BASE；之前：app.js 的降级链末级要调它。
  // 注意：不能用裸 'js/app.js' 做锚点 —— index.html 的注释里也提到过它，
  // indexOf 会命中注释，顺序断言得到的是假结果。按各自文件的真实写法取锚点。
  const anchors = {
    'index.html': f => 'src="js/' + f,
    'tests/helpers/app-bootstrap.js': f => "'js/" + f,
  };
  Object.keys(anchors).forEach(file => {
    it(`${file}：api-config → offline-tts → app.js 顺序正确`, () => {
      const src = read(file);
      const at = f => src.indexOf(anchors[file](f));
      expect(at('api-config.js'), '找不到 api-config').toBeGreaterThan(0);
      expect(at('offline-tts.js'), 'offline-tts 排在 api-config 之前，读不到 OFFLINE_VOICE_BASE')
        .toBeGreaterThan(at('api-config.js'));
      expect(at('app.js'), 'offline-tts 排在 app.js 之后，降级链会拿到 undefined')
        .toBeGreaterThan(at('offline-tts.js'));
    });
  });

  it('build.js jsOrder：offline-tts 在 app.js 之前（api-config 单独拷贝，不进 bundle）', () => {
    const src = read('build.js');
    const iOff = src.indexOf("'js/offline-tts.js'");
    const iApp = src.indexOf("'js/app.js'");
    expect(iOff, 'jsOrder 里找不到 offline-tts').toBeGreaterThan(0);
    expect(iApp, 'jsOrder 里 offline-tts 排在 app.js 之后').toBeGreaterThan(iOff);
    // api-config 不进 bundle，是独立拷贝的：确认它确实被单独处理，而不是漏了
    expect(src).toMatch(/copyFile\(path\.join\(SRC,\s*'js',\s*'api-config\.js'\)/);
  });

  it('bootstrap 后 OfflineTTS 与 window.app 同时可用', async () => {
    // 这是本轮真实踩过的坑：offline-tts 一旦在加载期抛错，DOMContentLoaded 的
    // try/catch 会把异常吞掉，表现为 window.app 建不起来、127 条用例集体变红，
    // 而错误堆栈里完全看不到 offline-tts 的影子。
    vi.resetModules();
    await bootstrapApp();
    expect(window.OfflineTTS, 'OfflineTTS 未挂载').toBeTruthy();
    expect(window.app, '加载 offline-tts 后 window.app 未建立').toBeTruthy();
  });
});

describe('内置离线音 · 运行时资产随包发布', () => {
  VENDOR_FILES.forEach(f => {
    it(`${f} 存在`, () => {
      expect(exists(f), `${f} 缺失：离线音会静默无声（无任何报错）`).toBe(true);
    });
  });

  it('worker 强制单线程（多线程在 WebView 里拿不到 SharedArrayBuffer）', () => {
    const src = read('assets/vendor/piper/piper_worker.js');
    // 原版写的是 navigator.hardwareConcurrency：多线程要 SAB，而 SAB 只在
    // COOP/COEP 跨源隔离下可用，APK 里给不了 —— 表现为永远没有 output、也不报错。
    expect(src, 'numThreads 被改回多线程了').toMatch(/ort\.env\.wasm\.numThreads\s*=\s*1\s*;/);
    expect(src).not.toMatch(/numThreads\s*=\s*navigator\.hardwareConcurrency/);
  });

  it('ORT 的 js 与 wasm 必须成套（哈希锁）', () => {
    // 真实踩过的坑：ort.min.js 取自 cdnjs、wasm 取自 npm，两者都是 1.17.1 却不是
    // 同一份构建 —— 症状是 ort.InferenceSession.create() 里 _malloc 抛
    // "memory access out of bounds"，而且只在加载 60MB 模型那一刻才出现，
    // 静态检查和"版本号一致"都查不出来。只能靠哈希把两者锁成一套：
    // 要升级就一起换，改完把这里的两个值一起更新。
    for (const [f, h] of Object.entries(ORT_LOCK)) {
      expect(md5(f), `${f} 变了 —— ${f.includes('.wasm') ? 'wasm' : 'js'} 必须与它的搭档一起替换`).toBe(h);
    }
  });

  it('assets/vendor/piper 未被 .gitignore 忽略', () => {
    // 29MB 的 wasm/data 是最容易被"清理大文件"顺手排除的东西，一旦被忽略，
    // 打包机 checkout 出来就没有运行时，离线音在真机上永远起不来。
    expect(read('.gitignore')).not.toMatch(/assets\/vendor/);
  });

  it('build.js 会把整个 assets/ 拷进 dist（含 piper 运行时）', () => {
    const src = read('build.js');
    expect(src).toMatch(/copyDir\(assetsSrc,\s*path\.join\(DIST,\s*'assets'\)\)/);
  });
});

describe('内置离线音 · 设置页可达', () => {
  let html;
  beforeEach(() => { html = read('index.html'); });

  it('有状态行和下载按钮', () => {
    expect(html).toContain('id="offline-voice-status"');
    expect(html).toContain('id="btn-offline-voice-download"');
  });

  it('下拉里提供该音色，且归在「内置离线（手机可用）」组', async () => {
    // 归组是刻意的：同页还有一组「本地离线」是"需电脑 + server 运行"的，
    // 混在一起会被读成"手机版不可用"，与它的真实能力相反。
    vi.resetModules();
    await bootstrapApp();
    const sel = document.getElementById('voice-select');
    expect(sel, '找不到 voice-select').toBeTruthy();
    window.app.bindSettings();
    const opt = sel.querySelector(`option[value="${OFFLINE_VOICE}"]`);
    expect(opt, '下拉里没有内置离线音选项').toBeTruthy();
    const group = opt.closest('optgroup');
    expect(group, '该选项没有 optgroup').toBeTruthy();
    expect(group.getAttribute('label')).toContain('内置离线');
    expect(group.getAttribute('label')).toContain('手机可用');
  });

  it('状态行会渲染出可读文案（不是占位符原样）', async () => {
    vi.resetModules();
    await bootstrapApp();
    window.app.bindSettings();
    const box = document.getElementById('offline-voice-status');
    expect(box.textContent.trim().length, '状态行是空的').toBeGreaterThan(0);
  });
});

// 朗读链（_speakTTS / _deviceFail / _ttsLocalFail）全部挂在 SpeechUtil 上，
// 不是 App 实例 —— app.js 用的是 App.prototype.x = ... 逐个赋值，
// 而 SpeechUtil 是一个巨大的对象字面量。离线兜底方法自然也该在 SpeechUtil 上。
describe('内置离线音 · 识别与降级', () => {
  let su;
  beforeEach(async () => {
    vi.resetModules();
    await bootstrapApp();
    su = window.SpeechUtil;
    expect(su, 'window.SpeechUtil 未挂载').toBeTruthy();
  });

  it('三个兜底方法都挂在 SpeechUtil 上', () => {
    expect(typeof su._speakOfflineVoice).toBe('function');
    expect(typeof su._tryOfflineFallback).toBe('function');
  });

  it('isOfflineVoice 只认内置音，系统/在线音色一律不算', () => {
    expect(window.OfflineTTS.isOfflineVoice(OFFLINE_VOICE)).toBe(true);
    expect(window.OfflineTTS.isOfflineVoice('')).toBe(false);
    expect(window.OfflineTTS.isOfflineVoice('Microsoft Zira - English')).toBe(false);
    // __local_* 是"需 server 运行"的那组，绝不能被误判成内置离线
    expect(window.OfflineTTS.isOfflineVoice('__local_piper_us_lessac__')).toBe(false);
    expect(window.OfflineTTS.isOfflineVoice('__online_google__')).toBe(false);
  });

  it('没有待读文本时不接管失败流程', () => {
    // 加了离线兜底之后，不能让原本"朗读失败"的 Toast 反而消失
    su._currentSpeakText = '';
    expect(su._tryOfflineFallback({})).toBe(false);
  });

  it('不支持离线音的环境（无 Worker/IndexedDB）不接管，交回原有失败提示', () => {
    const saved = window.OfflineTTS;
    window.OfflineTTS = undefined;
    try {
      su._currentSpeakText = 'hello';
      expect(su._tryOfflineFallback({})).toBe(false);
    } finally {
      window.OfflineTTS = saved;
    }
  });

  it('下载中时接管，且不再重复触发一次下载', () => {
    const saved = window.OfflineTTS;
    window.OfflineTTS = {
      status: () => ({ status: 'downloading', progress: 0.4, voice: OFFLINE_VOICE }),
      ensure: () => { throw new Error('不该在下载中再次 ensure'); },
      speak: () => { throw new Error('不该在下载中合成'); },
    };
    try {
      su._currentSpeakText = 'hello';
      expect(su._tryOfflineFallback({})).toBe(true);
    } finally {
      window.OfflineTTS = saved;
    }
  });

});

// 状态行是设置页里唯一能解释"这个音为什么没声音 / 要下多久"的地方。
// 它走的是模块级 renderOfflineVoiceStatus()（fillVoiceOptions 是模块级函数、
// 里面的 self 是 window.self，拿不到实例），所以只能从 DOM 结果反推。
describe('内置离线音 · 状态行渲染', () => {
  const cases = [
    ['ready', 'offline-voice-ok', /已就绪/],
    ['downloading', 'offline-voice-busy', /正在下载/],
    ['failed', 'offline-voice-err', /失败/],
    ['idle', /^setting-help offline-voice-status$/, /尚未下载/],
  ];

  cases.forEach(([status, cls, textRe]) => {
    it(`${status} → 类名 ${cls} + 对应文案`, async () => {
      vi.resetModules();
      await bootstrapApp();
      window.OfflineTTS = {
        status: () => ({ status, progress: 0.5, error: '网络错误', voice: OFFLINE_VOICE }),
        probe: () => Promise.resolve(status === 'ready'),
        onChange: () => {},
        isOfflineVoice: n => n === OFFLINE_VOICE,
      };
      window.app.bindSettings();
      const box = document.getElementById('offline-voice-status');
      expect(box.className, `${status} 状态类名不对`).toMatch(cls);
      expect(box.textContent, `${status} 状态文案不对`).toMatch(textRe);
    });
  });

});

describe('内置离线音 · 服务端分发契约', () => {
  const src = read('server/server.js');

  it('PIPER_VOICE_DIR 有定义', () => {
    // 曾经只有使用处、没有声明 → ReferenceError 被 catch 成 502，
    // 现象是"模型永远下不下来"，日志里看不出是变量名拼错。
    expect(src).toMatch(/const\s+PIPER_VOICE_DIR\s*=/);
  });

  it('分发路由带白名单，不接受任意文件名', () => {
    expect(src).toContain("'/api/offline-voice/:file'");
    expect(src).toMatch(/en_\[A-Z\]\{2\}-\[a-z0-9_\]\+-medium\\?\.onnx/);
  });

  it('响应带 Content-Length（前端下载进度依赖它）', () => {
    expect(src).toMatch(/Content-Length/);
  });
});

// 行为级测试引导：真实加载生产代码（jsdom + 完整 index.html DOM + 轻量数据 stub）。
// 用法（每个测试文件）：
//   beforeEach(async () => { vi.resetModules(); await bootstrapApp(); });
//   // 之后可用 window.app / window.SpeechUtil / window.DataStore / document 驱动真实行为
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { vi } from 'vitest';

// 注意：必须用 fileURLToPath 解码 import.meta.url —— URL.pathname 会把中文路径 percent-encode，
// 导致 fs 读取失败被静默吞掉后 DOM 挂载为空（曾致 App 构造 getElementById 为 null）。
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function readProject(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

// 无配额内存版 localStorage mock
function createLsMock() {
  const lsStore = {};
  return {
    getItem: (k) => (k in lsStore ? lsStore[k] : null),
    setItem: (k, v) => { lsStore[k] = String(v); },
    removeItem: (k) => { delete lsStore[k]; },
    clear: () => { for (const k of Object.keys(lsStore)) delete lsStore[k]; },
    get length() { return Object.keys(lsStore).length; },
    key: (i) => Object.keys(lsStore)[i] || null,
    _store: () => ({ ...lsStore }),
    _reset: () => { for (const k of Object.keys(lsStore)) delete lsStore[k]; },
  };
}

// 每次调用都换全新空 store —— 实现用例级存储隔离（否则跨用例残留 word_progress/word_card_pos 等）
export function installFreshStorage() {
  const ls = createLsMock();
  try {
    Object.defineProperty(globalThis, 'localStorage', { value: ls, configurable: true, writable: true });
  } catch (e) {
    globalThis.localStorage = ls;
  }
  return ls;
}

// jsdom 缺失的浏览器 API
export function installPolyfills() {
  // node 22+ 自带实验性 localStorage（未开 --localstorage-file 时 undefined 或小配额），
  // vitest4 jsdom 环境下 localStorage 也不稳定 —— 统一替换为无配额内存版，避免 UserState 写入被吞
  if (!globalThis.localStorage || typeof globalThis.localStorage.clear !== 'function') {
    installFreshStorage();
  }
  // ESM 隔离：浏览器里 Toast 是 app.js 顶层全局 var（普通 script 语义），
  // 其他模块（dashboard/badges 等独立文件）直接引用 Toast —— ESM import 下不可见，需补全局桩
  if (!globalThis.Toast) {
    globalThis.Toast = { success() {}, error() {}, warning() {}, info() {} };
  }
  if (!globalThis.matchMedia) {
    globalThis.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() {} });
  }
  if (!globalThis.ResizeObserver) {
    globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  }
  if (!globalThis.IntersectionObserver) {
    globalThis.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } };
  }
  if (!globalThis.HTMLCanvasElement || typeof globalThis.HTMLCanvasElement.prototype.getContext !== 'function') {
    // 分享卡片测试需要 canvas 上下文；jsdom 默认无。提供最小 2D 上下文桩。
    const ctxStub = {
      fillStyle: '', strokeStyle: '', font: '', textAlign: '', lineWidth: 0, globalAlpha: 1,
      fillRect() {}, clearRect() {}, beginPath() {}, arc() {}, fill() {}, stroke() {}, closePath() {},
      moveTo() {}, lineTo() {}, rect() {}, fillText() {}, scale() {}, drawImage() {}, save() {}, restore() {},
      measureText(t) { return { width: String(t).length * 8 }; },
    };
    if (!globalThis.HTMLCanvasElement) {
      class FakeCanvas {
        getContext() { return ctxStub; }
        toDataURL() { return 'data:image/png;base64,stub'; }
        toBlob(cb) { cb(null); }
      }
      globalThis.HTMLCanvasElement = FakeCanvas;
    } else {
      const g = globalThis.HTMLCanvasElement.prototype.getContext;
      // 不覆盖——仅当 getContext 缺失时补桩
      if (typeof g !== 'function') globalThis.HTMLCanvasElement.prototype.getContext = () => ctxStub;
    }
  }
  // 测试环境默认 fetch 桩：不触网
  globalThis.fetch = globalThis.__testFetch || vi.fn(() => Promise.reject(new Error('fetch-stub')));
}

// 把真实 index.html 的 <body> 内容挂进 jsdom DOM（去掉全部 script，避免 jsdom 拉取外部资源）
export function mountIndexHtml() {
  let html;
  try { html = readProject('index.html'); } catch (e) { html = ''; }
  const clean = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  const bodyMatch = clean.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyHtml = bodyMatch ? bodyMatch[1] : '';
  document.body.innerHTML = bodyHtml;
}

// 轻量数据 stub：结构与真实 words-data.js 一致，但只含少量样本
export function installStubData() {
  const w = (word, phonetic, pos, chinese, example, example_cn) => ({ word, phonetic, pos, chinese, example, example_cn });
  globalThis.WORD_LIBRARY = {
    categories: [
      { name: '小学', words: [
        w('apple', '/ˈæp.əl/', 'n.', '苹果', 'I eat an apple.', '我吃了一个苹果。'),
        w('book', '/bʊk/', 'n.', '书', 'This is a book.', '这是一本书。'),
        w('cat', '/kæt/', 'n.', '猫', 'The cat sleeps.', '猫在睡觉。'),
        w('dog', '/dɔːɡ/', 'n.', '狗', 'The dog runs.', '狗在跑。'),
        w('egg', '/eɡ/', 'n.', '鸡蛋', 'I like eggs.', '我喜欢鸡蛋。'),
      ]},
      { name: 'CET4', words: [
        w('abandon', '/əˈbændən/', 'v.', '放弃', 'Never abandon hope.', '永不放弃希望。'),
        w('ability', '/əˈbɪləti/', 'n.', '能力', 'He has the ability.', '他有这个能力。'),
        w('absolute', '/ˈæbsəluːt/', 'adj.', '绝对的', 'Absolute truth.', '绝对的真理。'),
        w('absorb', '/əbˈzɔːrb/', 'v.', '吸收', 'Plants absorb water.', '植物吸收水分。'),
        w('academic', '/ˌækəˈdemɪk/', 'adj.', '学术的', 'Academic research.', '学术研究。'),
      ]},
    ],
  };
  globalThis.PHONETIC_DATA = {
    vowels: [
      { symbol: 'i:', example: 'see', note: '长元音' },
      { symbol: 'æ', example: 'cat', note: '短元音' },
    ],
    consonants: [
      { symbol: 'θ', example: 'think', note: '清辅音' },
      { symbol: 'ð', example: 'this', note: '浊辅音' },
    ],
  };
  globalThis.EXTRA_READING = [{
    title: 'My Day',
    content: 'I get up early every morning. I eat an apple and read a book. The cat sleeps near the window.',
    words: ['apple', 'book', 'cat', 'day', 'morning'],
  }];
  globalThis.GRAMMAR_DATA = [
    { id: 'g1', title: '时态', type: 'choice', exercises: [
      { q: 'She ___ to school.', options: ['go', 'goes', 'going'], answer: 1 },
    ]},
  ];
  globalThis.EXTRA_GRAMMAR = [];
  globalThis.READING_DATA = [];
}

// 按浏览器真实加载顺序导入全部模块（顺序敏感：logger → store → tts → app）
const MODULES = [
  'js/logger.js',
  'js/core/errors.js',
  'js/core/events.js',
  'js/core/store.js',
  'js/api-config.js',
  'js/tts-manager.js',
  'js/story.js',
  'js/badges.js',
  'js/listen-along.js',
  'js/daily-plan.js',
  'js/items.js',
  'js/dashboard.js',
  'js/ai-coach.js',
  'js/ai-chat.js',
  'js/assessment.js',
  'js/onboarding.js',
  'js/notification-manager.js',
  'js/app.js',
  'js/responsive-layout.js',
];

let loadedOnce = false;

// 监听 document DOMContentLoaded：记录 handler 引用，供触发本轮新注册的 listener
function ensureDocumentListenerCapture() {
  if (globalThis.__dclListeners) return;
  globalThis.__dclListeners = [];
  const origAdd = document.addEventListener.bind(document);
  document.addEventListener = function (type, handler, opts) {
    if (type === 'DOMContentLoaded') globalThis.__dclListeners.push(handler);
    return origAdd(type, handler, opts);
  };
}

export async function bootstrapApp(opts = {}) {
  installPolyfills();
  installFreshStorage(); // 每次用例全新存储，隔离跨用例残留
  // ESM import 不会把 app.js 顶层 function App(){} 挂到 window（普通 script 才会）。
  // 但 notification-manager.js:17/_isAndroid 与 app.js:5469 都引用全局 App —— 与既有
  // tests/ui/notification-permission.test.js:32 同一解法：注入平台桩（jsdom 非 android）。
  if (!globalThis.App) {
    globalThis.App = { detectPlatform: () => 'web' };
  }
  if (opts.keepDom !== true) mountIndexHtml();
  installStubData();
  ensureDocumentListenerCapture();
  const beforeLen = globalThis.__dclListeners.length; // 跳过前几轮累积的旧 listener
  for (const m of MODULES) {
    await import('../../' + m);
  }
  loadedOnce = true;
  if (opts.triggerReady !== false) {
    // 只触发本轮新注册的 DOMContentLoaded listener，避免旧 listener（旧模块闭包）
    // 在当前 DOM 上重复 new App() / safeBind，污染新实例的事件绑定
    const fresh = globalThis.__dclListeners.slice(beforeLen);
    for (const h of fresh) {
      try { h.call(document, new Event('DOMContentLoaded')); } catch (e) { /* 单模块初始化失败不中断其余 */ }
    }
  }
  return window;
}

export function resetPageState() {
  window.localStorage.clear();
  window.location.hash = '';
  mountIndexHtml();
}
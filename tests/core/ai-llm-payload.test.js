// AI 请求体与打字气泡顺序（P3 回归网）
//
// 1) 服务端限制单条 content ≤500；客户端旧实现先截 400 再拼 ~120 字学习概况，
//    正文稍长就整条 400 被拒 → LLM 静默失效（只回规则答案，用户毫无察觉）。
// 2) 「正在输入」占位在 _handle 期间就先插入了，规则答复后插入 → 打字气泡停在
//    答复上方，读起来像"先给答案再思考"。
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { bootstrapApp } from '../helpers/app-bootstrap.js';

describe('AI 请求体长度', () => {
  let origFetch;
  beforeEach(async () => {
    vi.resetModules();
    await bootstrapApp();
    origFetch = window.fetch;
  });
  afterEach(() => { window.fetch = origFetch; });

  it('超长提问 + 概况拼接后仍 ≤500（不再被服务端 400 拒掉）', async () => {
    let sent = null;
    window.fetch = (url, init) => {
      if (String(url).indexOf('/api/ai/chat') !== -1) {
        sent = JSON.parse(init.body);
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ok: true, text: '好的' }) });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ok: true }) });
    };
    const long = '解释单词 ' + 'a'.repeat(1200);
    const r = await window.NeuralEngine.ask('explain_word', long);
    expect(r).toBe('好的');
    expect(sent).toBeTruthy();
    const content = sent.messages[0].content;
    expect(content.length).toBeLessThanOrEqual(500);
    expect(content).toContain('学习概况');       // 概况没被截掉
    expect(content.startsWith('解释单词')).toBe(true);
    // 服务端还有总 body ≤2048 的业务约束
    expect(JSON.stringify(sent).length).toBeLessThanOrEqual(2048);
  });
});

describe('AI 打字气泡顺序', () => {
  let chat, box, origFetch, pendingResolve;
  beforeEach(async () => {
    vi.resetModules();
    await bootstrapApp();
    window.app.showTab('ai');
    chat = window.app.aiChatModule;
    expect(chat).toBeTruthy();
    // 消息容器是 #ai-chat-msgs；#ai-msg-scroll 是外层滚动区（容易拿错）
    box = chat._msgBox();
    expect(box).toBeTruthy();
    origFetch = window.fetch;
    pendingResolve = null;
    window.fetch = (url) => {
      if (String(url).indexOf('/api/ai/chat') !== -1) {
        return new Promise((resolve) => {
          pendingResolve = () => resolve({ ok: true, status: 200, json: () => Promise.resolve({ ok: true, text: 'LLM 补充例句' }) });
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ok: true }) });
    };
  });
  afterEach(() => { window.fetch = origFetch; });

  it('「正在输入」排在本轮规则答复之后，而不是压在上面', async () => {
    chat._settings.llm = true;
    // 用词库里不存在的词：只有这条分支才会异步请求 LLM（库内词直接给本地卡片）
    chat.ask('解释单词 quizzacious');
    const kids = Array.from(box.children);
    expect(kids.length).toBeGreaterThanOrEqual(3);   // 用户 + 答复 + 打字占位
    const last = kids[kids.length - 1];
    expect(last.querySelector('.ai-typing'), '打字占位应在最后').toBeTruthy();
    const prev = kids[kids.length - 2];
    expect(prev.classList.contains('ai-msg-ai')).toBe(true);
    expect(prev.querySelector('.ai-typing')).toBe(null);
  });

  it('LLM 返回后移除占位并追加一条新气泡', async () => {
    chat._settings.llm = true;
    chat.ask('解释单词 quizzacious');
    expect(pendingResolve).toBeTypeOf('function');
    pendingResolve();
    await new Promise((r) => setTimeout(r, 30));
    expect(box.querySelector('.ai-typing')).toBe(null);
    const kids = Array.from(box.children);
    expect(kids[kids.length - 1].textContent).toContain('LLM 补充例句');
  });
});

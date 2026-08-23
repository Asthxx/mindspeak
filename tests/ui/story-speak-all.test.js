import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const src = readFileSync(join(root, 'js', 'story.js'), 'utf8');

// StoryModule 为 IIFE 私有（经典脚本顶层 var 不挂 window 场景下不可达），采用静态源断言
function extractMethod(name) {
  const marker = 'StoryModule.prototype.' + name;
  const start = src.indexOf(marker);
  expect(start, 'method not found: ' + name).toBeGreaterThan(-1);
  const m = src.slice(start + 1).match(/\n\s*StoryModule\.prototype\./);
  const end = m ? start + 1 + m.index : src.length;
  return src.slice(start, end);
}

describe('词文串学 朗读全文 流式分块', () => {
  const body = extractMethod('speakAll');

  it('长文本必须经 _chunkRemoteText 切块后逐块朗读（禁止整篇一次性 speak）', () => {
    expect(body).toContain('_chunkRemoteText');
    // 必须存在接力调度函数（onend 驱动的逐块播放）
    expect(body).toMatch(/speakNext|function\s+\w*[Nn]ext/);
    expect(body).toContain('onend');
  });

  it('朗读期间按钮要有状态反馈，结束后恢复', () => {
    expect(body).toContain('btn-story-speak');
    expect(body).toContain('disabled');
  });

  it('朗读中再次点击应停止（代次守卫防旧链路续播）', () => {
    expect(body).toMatch(/_speakSeqId/);
    expect(body).toMatch(/TTSManager\.cancel|_stopLocalAudio/);
  });
});

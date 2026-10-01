import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// 设置页「分享学习成果」下线守护
//
// 决策记录：
//   删除设置页整块生成分享卡片功能（生成分享卡片 → canvas 预览 → 保存图片）。
//   该功能是纯装饰性的：卡片内容（已掌握词数 / 等级 / 连续天数）已由
//   首页统计卡与学习报告页更完整地呈现，属于重复且无独立价值。
//
// 与 Android 长按分享单词（android-ui-init.js 的 _shareWord → navigator.share）
// 完全是两个功能：后者走系统分享面板分享单个单词，本次不动。
//
// 与 i-carousel 图标、getLocalDateStr / calculateStreak 的关系：
//   i-carousel 还被背单词页 btn-view-card（卡片/列表视图切换）使用，
//   两个日期函数被复习算法、备份导出、CSV 导出等大量调用，
//   都必须保留，不能连坐删除。

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => readFileSync(join(root, rel), 'utf8');

const app = read('js/app.js');
const html = read('index.html');
const android = read('js/android-ui-init.js');
const story = read('js/story.js');

describe('设置页「分享学习成果」UI 已移除', () => {
  it('index.html 不含该区块标题', () => {
    expect(html, '「分享学习成果」标题应删除').not.toContain('分享学习成果');
  });

  it('index.html 不含生成分享卡片按钮', () => {
    expect(html, 'btn-share-card 应删除').not.toContain('btn-share-card');
  });

  it('index.html 不含预览容器与 canvas', () => {
    expect(html, 'share-card-preview 应删除').not.toContain('share-card-preview');
    expect(html).not.toContain('share-canvas');
  });

  it('index.html 不含保存图片按钮', () => {
    expect(html, 'btn-download-card 应删除').not.toContain('btn-download-card');
  });

  it('index.html 不再出现分享卡片相关文案', () => {
    expect(html, '「生成分享卡片」文案应删除').not.toMatch(/生成分享卡片|保存图片/);
  });
});

describe('分享卡片逻辑已移除', () => {
  it('app.js 不再定义 generateShareCard', () => {
    expect(app, 'generateShareCard 应删除').not.toMatch(/generateShareCard/);
  });

  it('app.js 不再定义 downloadShareCard', () => {
    expect(app, 'downloadShareCard 应删除').not.toMatch(/downloadShareCard/);
  });

  it('app.js 不再绑定分享卡片按钮', () => {
    expect(app, '分享卡片按钮绑定应删除').not.toMatch(/btn-share-card|btn-download-card/);
  });

  it('app.js 不再保留「分享卡片」分区注释', () => {
    expect(app, '分享卡片分区注释应删除').not.toContain('分享卡片');
  });
});

describe('Android 长按分享单词必须完整保留（不同功能）', () => {
  it('_shareWord 与 navigator.share 仍在', () => {
    expect(android, '长按分享单词是独立功能，应保留').toMatch(/_shareWord/);
    expect(android).toMatch(/navigator\.share/);
  });

  it('长按菜单里的「分享」项仍在', () => {
    expect(android).toContain('data-action="share"');
    expect(android, '长按分享文案应保留').toContain('分享');
  });
});

describe('不得连坐删除共享资源', () => {
  it('i-carousel 图标定义仍在（背单词卡片视图按钮要用）', () => {
    expect(html, 'i-carousel sprite 应保留').toContain('<symbol id="i-carousel"');
  });

  it('背单词页 btn-view-card 卡片视图切换仍在', () => {
    expect(html, 'btn-view-card 是视图切换，与分享卡片无关').toContain('btn-view-card');
  });

  it('getLocalDateStr 与 calculateStreak 仍在（复习/备份/CSV 都用）', () => {
    expect(app, 'getLocalDateStr 被大量调用，应保留').toMatch(/function getLocalDateStr/);
    expect(app, 'calculateStreak 被首页统计用，应保留').toMatch(/function calculateStreak/);
    expect(app, '两函数应仍导出到 window').toContain('window.getLocalDateStr = getLocalDateStr');
  });

it('CSV 导出功能不受影响', () => {
expect(app, 'CSV 辅助是独立功能，应保留').toMatch(/CSV 辅助/);
expect(app, 'csvEscape 应保留').toMatch(/function csvEscape/);
expect(app, '单词本/错题本 CSV 导出应保留').toMatch(/\.csv'/);
});

  it('story.js 的英文学习文案里的 share 不受影响', () => {
    expect(story, 'story.js 是学习内容，不是分享功能').toMatch(/share/);
  });
});

describe('不得留下悬空 DOM 引用', () => {
  // 删除 canvas 后若仍有代码 getElementById('share-canvas').getContext(...)
  // 会抛 TypeError（null.getContext），整页设置页初始化就崩
  it('app.js 无任何 share-canvas 的 DOM 取用', () => {
    expect(app, '不得再取用已删除的 share-canvas').not.toMatch(/getElementById\(\s*["']share-/);
  });

  it('app.js 无任何 share-card-preview 的 DOM 取用', () => {
    expect(app, '不得再取用已删除的 share-card-preview').not.toMatch(/share-card-preview/);
  });
});
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// 成就徽章系统已整体下线：本文件锁定"不得复活"的边界。
// 生产改动会让下列断言失败 → 若失败，说明有人重新引入了徽章功能。

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

describe('成就徽章系统已下线 — 模块', () => {
  it('js/badges.js 源文件必须已删除', () => {
    expect(existsSync(join(root, 'js', 'badges.js'))).toBe(false);
  });

  it('js/badges.js 不得再被 index.html 引用', () => {
    expect(read('index.html')).not.toContain('js/badges.js');
  });

  it('js/badges.js 不得再进构建清单', () => {
    expect(read('build.js')).not.toContain("'js/badges.js'");
  });

  it('window.BadgeSystem 全局不得存在', () => {
    expect(read('js/app.js')).not.toContain('BadgeSystem');
  });
});

describe('成就徽章系统已下线 — 页面与入口', () => {
  it('index.html 不得保留徽章页面容器', () => {
    const html = read('index.html');
    expect(html).not.toContain('id="page-badges"');
    expect(html).not.toContain('id="badge-grid"');
    expect(html).not.toContain('id="badge-summary"');
  });

  it('侧栏与底栏不得保留 data-tab="badges" 入口', () => {
    const html = read('index.html');
    expect(html).not.toContain('data-tab="badges"');
  });

  it('不得残留徽章墙渲染目标 id（DOM 已无处可挂载）', () => {
    expect(read('js/app.js')).not.toContain("getElementById('badge-grid')");
    expect(read('js/app.js')).not.toContain("getElementById('badge-summary')");
  });
});

describe('成就徽章系统已下线 — 业务桥接', () => {
  it('app.js 不得再持有 badgeSystem 实例或调用其方法', () => {
    const app = read('js/app.js');
    expect(app).not.toContain('badgeSystem');
  });

  it('PK / 语法 / 词文串学不得再派发徽章事件', () => {
    expect(read('js/app.js')).not.toContain("onEvent('grammar')");
    expect(read('js/app.js')).not.toContain("onEvent('pk'");
    expect(read('js/story.js')).not.toContain("onEvent('story')");
  });

  it('记录学习活动后不再触发徽章检查', () => {
    const app = read('js/app.js');
    expect(app).not.toContain('badgeSystem.checkAll');
  });

  it('ACHIEVEMENT_UNLOCKED 事件常量已下线', () => {
    expect(read('js/core/events.js')).not.toContain('ACHIEVEMENT_UNLOCKED');
  });
});

describe('成就徽章系统已下线 — 样式', () => {
  it('style.css 不得保留徽章墙专用样式', () => {
    const css = read('css/style.css');
    expect(css).not.toContain('.badge-card');
    expect(css).not.toContain('.badge-grid');
    expect(css).not.toContain('.badge-summary');
    expect(css).not.toContain('.badge-progress');
    expect(css).not.toContain('.badge-date');
    expect(css).not.toContain('.badge-desc');
  });

  it('mobile.css 不得保留徽章墙断点覆盖', () => {
    const css = read('css/mobile.css');
    expect(css).not.toContain('.badge-grid');
    expect(css).not.toContain('.badge-card');
    expect(css).not.toContain('.badge-progress-fill');
  });
});

describe('成就徽章系统已下线 — 数据', () => {
  it('备份字段表与导入消毒不再处理徽章', () => {
    const app = read('js/app.js');
    expect(app).not.toContain("['badges','badges',{},false]");
    expect(app).not.toContain("['badgeStats','badge_stats',{},false]");
    expect(app).not.toContain('sanitized.badges');
  });

  it('已下线但仍需清理的历史 localStorage key', () => {
    // 移除功能后，老用户浏览器里仍留着 badges/badge_stats；重置路径必须能清掉，
    // 否则孤儿数据永久驻留。这里锁定 appKeys 仍包含它们。
    const app = read('js/app.js');
    const reset = app.slice(app.indexOf('App.prototype.resetData'));
    expect(reset).toContain("'badges'");
    expect(reset).toContain("'badge_stats'");
  });
});

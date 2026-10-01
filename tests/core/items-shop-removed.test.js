import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// 道具商店下线守护（Q1=A：只删道具，主题商店保留）
//
// 决策记录：
//   Q1 只删道具商店，ThemeShop 保留 —— 页面改名「主题商店」+ 换导航图标
//   Q2 玩法一并删除 —— PK 的护盾/双倍增益、新签到续签、三个模块的工具栏道具按钮
//        全部移除。理由：ItemSystem 的存在意义就是道具经济，留"免费道具"空壳
//        会让 PK 规则变得含糊（玩家不知道为什么赢）。
//
// 与徽章下线的处理一致：'items' / 'item_buffs' 保留在 resetData 的清除列表里，
// 用于清理旧用户 localStorage 残留，否则道具数据会永久滞留在用户机器上。

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => readFileSync(join(root, rel), 'utf8');

const items = read('js/items.js');
const app = read('js/app.js');
const html = read('index.html');

describe('ItemSystem 道具系统已移除', () => {
  it('js/items.js 不再定义 ItemSystem', () => {
    expect(items, 'ItemSystem 道具系统应已删除').not.toMatch(/function\s+ItemSystem/);
    expect(items).not.toMatch(/ItemSystem\.prototype/);
  });

  it('js/app.js 不再持有 itemSystem 实例', () => {
    expect(app, 'app.js 不应再引用 itemSystem').not.toMatch(/itemSystem/);
  });

  it('PK 玩法的道具增益（护盾/双倍）已移除', () => {
    expect(app, 'PK 借增益应移除').not.toMatch(/borrowBuff|consumeBuff|returnBuff/);
  });

  it('新签到的续签道具已移除', () => {
    expect(app, '新签到续签道具应移除').not.toMatch(/items\.use\(\s*['"]renew['"]/);
  });

  it('模块工具栏的道具按钮已移除', () => {
    expect(app, 'renderToolbar 应移除').not.toMatch(/itemSystem\.renderToolbar/);
  });
});

describe('道具商店 UI 已移除', () => {
  it('index.html 不含道具商城容器', () => {
    expect(html, '道具商城容器应删除').not.toContain('item-shop-grid');
  });

  it('index.html 不含道具商店标题文案', () => {
    expect(html, '道具商城/道具商城标题应删除').not.toMatch(/道具商城|道具商店/);
  });

  it('导航不再使用 i-shop 商店图标', () => {
    expect(html, '导航应换掉 i-shop 图标').not.toMatch(/xlink:href="#i-shop"/);
  });

  it('顶栏道具数量徽标已移除', () => {
    expect(html, '顶栏道具计数应移除').not.toContain('stat-items');
  });
});

describe('ThemeShop 主题商店必须完整保留（Q1=A）', () => {
  it('js/items.js 仍定义 ThemeShop', () => {
    expect(items, 'ThemeShop 必须保留').toMatch(/function\s+ThemeShop/);
    expect(items).toMatch(/ThemeShop\.prototype/);
  });

  it('index.html 仍保留主题商店容器', () => {
    expect(html).toContain('theme-shop-grid');
  });

  it('页面与导航标题为「主题商店」', () => {
    expect(html, '页面应改名为主题商店').toContain('主题商店');
  });

  it('主题相关备份字段仍保留', () => {
    expect(app, 'owned_themes 备份字段必须保留').toContain('owned_themes');
    expect(app).toContain('applied_theme');
  });
});

describe('旧道具数据仍可被清理（用户数据卫生）', () => {
  it('resetData 仍清除 items 与 item_buffs', () => {
    const reset = app.match(/App\.prototype\.resetData[\s\S]{0,2000}/);
    expect(reset, '未找到 resetData').toBeTruthy();
    expect(reset[0], 'resetData 需保留 items 以清理旧用户残留').toContain("'items'");
    expect(reset[0]).toContain("'item_buffs'");
  });

  it('备份字段表不再导出 items / item_buffs', () => {
    const fields = app.match(/App\.prototype\._backupFields = \[[\s\S]*?\];/);
    expect(fields, '未找到 _backupFields').toBeTruthy();
    expect(fields[0], '道具不应再进备份').not.toContain("['items'");
    expect(fields[0]).not.toContain("['itemBuffs'");
  });
});

describe('无残留文件', () => {
  it('道具商城专用样式类已从 css/items.css 移除', () => {
    const css = read('css/items.css');
    expect(css, 'item-shop-grid 样式应删除').not.toContain('item-shop-grid');
  });
});

describe('不得留下悬空 DOM 引用', () => {
  // 工具栏容器删除后，app.js 里隐藏它们的 getElementById(...).style 会抛
  // TypeError（null.style）。这类"删了元素忘了删调用"必须一起清干净。
  it('index.html 不再含道具工具栏容器', () => {
    expect(html, 'item-tools 容器应删除').not.toContain('item-tools');
  });

  it('app.js 不再查询已删除的工具栏元素', () => {
    expect(app, '不应再 getElementById 已删元素').not.toMatch(
      /getElementById\(\s*'(spelling-tools|context-tools|pk-tools|item-bag|item-shop-grid)'\s*\)/
    );
  });

  it('app.js 不再隐藏已删除的工具栏', () => {
    expect(app).not.toMatch(/(spelling-tools|context-tools|pk-tools)['"]\)\.style\.display/);
  });

  it('index.html 不再含 stat-items 徽标绑定目标', () => {
    expect(app, 'stat-items-btn 选择器应删除').not.toContain('stat-items-btn');
  });
});

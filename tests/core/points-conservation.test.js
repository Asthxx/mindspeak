import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// 积分守恒守护：addPoints 必须拒绝导致负余额的扣减
//
// 缺陷：GamificationSystem.prototype.addPoints 直接 `this.data.points += amount`，
// 无任何下限校验；且 `return saved` 返回的是"存盘是否成功"，
// 与"业务上是否允许这次扣减"完全无关。
// 后果：
//   1) 10 积分调用 addPoints(-30) → points 变成 -20，并被 save() 落盘
//   2) 任何 `if (!gami.addPoints(-x)) return;` 形式的余额守卫形同虚设
//      —— true 只表示"写进 localStorage 了"，不表示"用户付得起"
// 现状：补签（app.js）与主题商店（js/items.js）都靠调用方各自 pre-check，
//      这属于"约定式安全"，一旦某处漏写 pre-check 就会直接资损。
//
// 修复契约：
//   * 扣减导致 points < 0 时，整笔回滚（不落盘、不发事件），返回 false
//   * 余额充足时扣减成功，返回 true
//   * 任何路径下 points 不得为负

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const src = readFileSync(join(root, 'js/app.js'), 'utf8');

function extractAddPoints() {
  const start = src.indexOf('GamificationSystem.prototype.addPoints = function');
  expect(start, '未找到 addPoints').toBeGreaterThan(-1);
  let depth = 0, i = src.indexOf('{', start), end = -1;
  for (let j = i; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') { depth--; if (depth === 0) { end = j; break; } }
  }
  return src.slice(start, end + 1);
}

const body = extractAddPoints();

describe('addPoints 源码结构（静态断言）', () => {
  it('必须在累加前做余额校验', () => {
    expect(body, '需存在扣减前的余额校验').toMatch(/points\s*<|<\s*0|insufficient|余额|不足/);
  });

  it('不得先无条件累加再校验（必须先判断后累加）', () => {
    const addIdx = body.indexOf('this.data.points += amount');
    const checkIdx = body.search(/points\s*<\s*0|<\s*0|余额|不足/);
    expect(addIdx, '未找到累加点').toBeGreaterThan(-1);
    expect(checkIdx, '未找到余额校验').toBeGreaterThan(-1);
    expect(checkIdx, '余额校验必须出现在累加之前').toBeLessThan(addIdx);
  });

  it('扣减失败时必须提前 return false（不改余额、不落盘）', () => {
    expect(body, '余额不足分支需显式 return false').toMatch(/return\s+false/);
  });
});

describe('addPoints 运行时行为（真实执行）', () => {
  let G, savedCalls;

  beforeEach(() => {
    savedCalls = [];
    global.window = {
      EventBus: { emit: () => {} },
      MS: { EVENTS: { POINTS_CHANGED: 'p', LEVEL_UP: 'l' } },
      app: { updateGlobalStats: () => {} },
    };
    global.DataStore = {
      getProgress: (k, d) => d,
      setProgress: (k, v) => { savedCalls.push([k, JSON.parse(JSON.stringify(v))]); return true; },
    };
    global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
    global.Toast = { success: () => {}, warning: () => {}, info: () => {}, error: () => {} };

    // 抽取 addPoints 定义并挂到测试对象上，不加载整个 app.js
    const fn = new Function('return ' + body.replace(/GamificationSystem\.prototype\.addPoints\s*=\s*function/, 'function'));
    G = { data: { points: 0, level: 1, streak: 0, totalWords: 0, totalExercises: 0 }, save() { return DataStore.setProgress('gamification', this.data); } };
    G.addPoints = fn();
  });

  it('余额充足时扣减成功', () => {
    G.data.points = 100;
    const ok = G.addPoints(-30);
    expect(ok, '余额充足应返回 true').toBe(true);
    expect(G.data.points).toBe(70);
  });

  it('余额不足时返回 false', () => {
    G.data.points = 10;
    const ok = G.addPoints(-30);
    expect(ok, '余额不足必须返回 false').toBe(false);
  });

  it('余额不足时 points 不得为负', () => {
    G.data.points = 10;
    G.addPoints(-30);
    expect(G.data.points, '不得出现负积分').toBeGreaterThanOrEqual(0);
  });

  it('余额不足时不得落盘（避免把半笔账写进 localStorage）', () => {
    G.data.points = 10;
    G.addPoints(-30);
    expect(savedCalls.length, '不应写盘').toBe(0);
  });

  it('恰好扣到 0 视为成功', () => {
    G.data.points = 30;
    const ok = G.addPoints(-30);
    expect(ok, '扣到 0 应成功').toBe(true);
    expect(G.data.points).toBe(0);
  });

  it('正数加分始终成功；积分封顶 999999（与读取层同口径，避免 Lv.10000 与 Lv.99 打架）', () => {
    G.data.points = 999999;
    const ok = G.addPoints(500);
    expect(ok, '正数加分不应被拒绝').toBe(true);
    // 原来是"可超过 999999"（1000499）—— 但 UserState.get 读取时会把 points 夹到 999999、
    // level 夹到 99，于是同一份数据在内存里是 Lv.10000、刷新后变 Lv.99。
    // 现在写入侧就饱和，保证"points ≤ 999999 且 level ≤ 99"始终成立。
    expect(G.data.points).toBe(999999);
    expect(G.data.level).toBeLessThanOrEqual(99);
  });

  it('积分为 0 时扣减被拒', () => {
    G.data.points = 0;
    expect(G.addPoints(-1)).toBe(false);
    expect(G.data.points).toBe(0);
  });
});

describe('调用方余额守卫是真实的（不是形同虚设）', () => {
  const itemsSrc = readFileSync(join(root, 'js/items.js'), 'utf8');

  it('主题商店购买依赖 addPoints 返回值', () => {
    expect(itemsSrc).toMatch(/addPoints\(-t\.price\)/);
  });

  it('主题商店仍有独立的 points 不足 pre-check', () => {
    expect(itemsSrc, '主题商店需保留 pre-check').toMatch(/points\s*<\s*t\.price/);
  });

  // pre-check 必须读真实余额来源（getStats().points），不能读 GamificationSystem
  // 实例上的 points —— 后者根本不存在，恒为 undefined，守卫永远不触发
  // （补签就是这么栽的，见下面两条）。主题商店统一走 _points() 取数，
  // 与渲染侧的按钮置灰判定共用同一入口，避免两处算法漂移。
  it('主题商店的 pre-check 读真实余额来源（getStats），而非实例上的 undefined', () => {
    expect(itemsSrc, '需经 getStats 取真实余额').toMatch(/getStats\(\)/);
    expect(itemsSrc, '不得直接读 gamification 实例上的 points').not.toMatch(/gamification\.points/);
  });

  it('补签仍校验 30 积分门槛', () => {
    expect(src, '补签需保留余额检查').toMatch(/gami\.points\s*<\s*30/);
  });

  // 补签的余额守卫读错了对象：gami 是 GamificationSystem 实例，
  // 它身上根本没有 points 属性（真实状态在 gami.data.points / getStats().points）。
  // 于是 `gami.points < 30` 恒等于 `undefined < 30` → false，守卫永远不触发。
  // 历史上靠 addPoints 也拦不住（addPoints 当时无下限校验），等于零校验放行。
  it('补签的守卫必须读真实余额来源（getStats/data），而非实例上的 undefined', () => {
    const i = src.indexOf('CalendarModule.prototype.makeupCheckin');
    expect(i, '未找到 makeupCheckin').toBeGreaterThan(-1);
const fn = src.slice(i, i + 900);

    // 1) 余额数据源必须来自 getStats()/data，而非系统实例上的 undefined 属性
    expect(
      fn,
      '补签必须通过 getStats() 取真实余额'
    ).toMatch(/gamification\.getStats\(\)/);
    expect(
      fn,
      'getStats() 赋值目标 gami 之后不应再出现 gami.points 的裸实例读取'
    ).not.toMatch(/if\s*\(\s*!gami\s*\|\|\s*gami\.points/);

    // 2) 门槛比较必须存在，且写成能同时拦住 NaN 的形式
    const threshold = fn.match(/!(?:\s*\(?\s*gami\.points\s*>=\s*30\s*\)?|gami\.points\s*<\s*30)/);
    expect(threshold, '未找到 30 积分门槛比较').toBeTruthy();
    expect(
      threshold[0],
      '裸 `gami.points < 30` 在 points 为 NaN 时会误判放行，需用 !(x >= 30) 形式'
    ).toMatch(/!|>= 30/);

    // 3) 扣减必须打在系统实例上（gami 已被换成纯数据 stats）
    expect(
      fn,
      '扣减需回到 gamification 实例上调用'
    ).toMatch(/gamification\.addPoints\(-30\)/);
    expect(fn, '不能对 stats 纯数据调用 addPoints').not.toMatch(/\bgami\.addPoints\(/);
  });

  it('GamificationSystem 实例上没有 points 属性（只有 data.points）', () => {
    const s = src.indexOf('GamificationSystem.prototype.addPoints');
    expect(src.slice(s - 4000, s), '实例不应定义 points getter').not.toMatch(
      /Object\.defineProperty\([^)]*GamificationSystem[^)]*['"]points['"]/
    );
  });
});
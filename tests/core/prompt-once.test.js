// 「只弹一次」守卫：通知授权框 + 新手引导
//
// 用户诉求原话："允许通知的弹窗就弹出一次允许或不允许，然后那些能力测试也只弹出一次"。
// 两条都要能被证伪 —— 所以断言的不是"有没有标记"，而是"到底有没有再弹"。
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { bootstrapApp } from '../helpers/app-bootstrap.js';

function fakePlugin(permission) {
  const calls = { check: 0, request: 0 };
  return {
    calls,
    checkPermissions: () => { calls.check++; return Promise.resolve({ display: permission }); },
    requestPermissions: () => { calls.request++; return Promise.resolve({ display: permission }); },
    createChannel: () => Promise.resolve(),
    schedule: () => Promise.resolve(),
    cancel: () => Promise.resolve(),
    getPending: () => Promise.resolve({ notifications: [] }),
  };
}

describe('通知授权框：只问一次', () => {
  afterEach(() => { delete window.Capacitor; });

  it('从未问过（prompt）→ 弹那唯一的一次', async () => {
    vi.resetModules();
    await bootstrapApp();
    const p = fakePlugin('prompt');
    window.Capacitor = { Platforms: { android: true }, Plugins: { LocalNotifications: p } };
    const ok = await window.NotificationManager.requestPermission();
    expect(p.calls.request, '首次应该弹一次').toBe(1);
    expect(ok).toBe(false);
  });

  it('已经拒绝过（denied）→ 不再弹，直接返回未授权', async () => {
    vi.resetModules();
    await bootstrapApp();
    const p = fakePlugin('denied');
    window.Capacitor = { Platforms: { android: true }, Plugins: { LocalNotifications: p } };
    const ok = await window.NotificationManager.requestPermission();
    // 关键断言：Android 上重复 requestPermissions 会再弹一次系统框，
    // 用户拒绝过就该彻底闭嘴，只引导去系统设置。
    expect(p.calls.request, '已拒绝还在弹授权框').toBe(0);
    expect(p.calls.check, '应该先查一次状态').toBe(1);
    expect(ok).toBe(false);
  });

  it('已授权（granted）→ 不弹，直接通过', async () => {
    vi.resetModules();
    await bootstrapApp();
    const p = fakePlugin('granted');
    window.Capacitor = { Platforms: { android: true }, Plugins: { LocalNotifications: p } };
    const ok = await window.NotificationManager.requestPermission();
    expect(p.calls.request, '已授权还弹框').toBe(0);
    expect(ok).toBe(true);
  });

  it('反复点开关也不会把授权框弹第二次（denied 场景）', async () => {
    vi.resetModules();
    await bootstrapApp();
    const p = fakePlugin('denied');
    window.Capacitor = { Platforms: { android: true }, Plugins: { LocalNotifications: p } };
    window.app.bindSettings();
    const tg = document.getElementById('toggle-daily-reminder');
    for (let i = 0; i < 3; i++) {
      tg.checked = true;
      tg.dispatchEvent(new Event('change'));
      await new Promise(r => setTimeout(r, 30));
    }
    expect(p.calls.request, '点三次开关弹了 ' + p.calls.request + ' 次').toBe(0);
    expect(tg.checked, '权限被拒，开关不该停在开启').toBe(false);
  });
});

describe('新手引导：看过就不再自动弹', () => {
  beforeEach(async () => {
    vi.resetModules();
    await bootstrapApp();
  });

  it('主动关掉（×/点遮罩）→ 记为"看过"，完成标记不写', () => {
    const ob = window.app.onboardingModule;
    expect(ob, 'onboardingModule 未挂载').toBeTruthy();
    ob._finish(false);
    expect(window.DataStore.getProgress('onboarding_seen', null), '关掉后应记 seen').toBe(true);
    expect(window.DataStore.getProgress('onboarding_done', null), '只是关掉不该算走完').not.toBe(true);
  });

  it('完整走完 → 只写完成标记', () => {
    const ob = window.app.onboardingModule;
    ob._finish(true);
    expect(window.DataStore.getProgress('onboarding_done', null)).toBe(true);
  });

  it('关过之后再进应用，引导不会自己弹出来', async () => {
    const ob = window.app.onboardingModule;
    ob._finish(false);           // 模拟用户随手关掉
    ob._hide();
    // 重新构造一次（等价于下次冷启动），等过自动弹的 600ms 延迟
    new window.OnboardingModule();
    await new Promise(r => setTimeout(r, 900));
    const modal = document.getElementById('onboarding-modal');
    expect(modal.classList.contains('hidden'), '关掉了还自动弹出来').toBe(true);
  });

  it('从未看过 → 首次会弹（守卫不能过头把首启引导也挡掉）', async () => {
    const modal = document.getElementById('onboarding-modal');
    window.app.onboardingModule.show();
    expect(modal.classList.contains('hidden'), '首次也不弹就过头了').toBe(false);
  });
});

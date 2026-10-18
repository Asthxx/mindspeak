// 学习提醒（每日定时 + 番茄钟结束通知）行为测试
//
// 为什么单独立一份：tests/android/notification-manager.test.js 里那 8 条是字面量断言
//（自己造一个对象再断言它的字段），实现改坏了照样绿。这里全部走真实 NotificationManager
// + 真实 app 实例，只把 Capacitor 插件换成可观测的假对象。
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { bootstrapApp } from '../helpers/app-bootstrap.js';

// 可观测的假插件：记录每次调用的参数
function fakePlugin(permission = 'granted') {
  const log = { schedule: [], cancel: [], createChannel: [] };
  return {
    log,
    checkPermissions: () => Promise.resolve({ display: permission }),
    requestPermissions: () => Promise.resolve({ display: permission }),
    createChannel: c => { log.createChannel.push(c); return Promise.resolve(); },
    schedule: n => { log.schedule.push(n); return Promise.resolve(); },
    cancel: n => { log.cancel.push(n); return Promise.resolve(); },
    getPending: () => Promise.resolve({ notifications: [] }),
  };
}

function installPlugin(permission) {
  const p = fakePlugin(permission);
  window.Capacitor = { Platforms: { android: true }, Plugins: { LocalNotifications: p } };
  return p;
}

describe('学习提醒 · 设置页控件', () => {
  beforeEach(async () => {
    vi.resetModules();
    await bootstrapApp();
    window.app.bindSettings();
  });

  it('三个控件都在，且时间输入有可访问名与说明关联', () => {
    expect(document.getElementById('toggle-daily-reminder')).toBeTruthy();
    expect(document.getElementById('daily-reminder-time')).toBeTruthy();
    expect(document.getElementById('toggle-pomodoro-notify')).toBeTruthy();
    const t = document.getElementById('daily-reminder-time');
    expect(t.getAttribute('aria-describedby')).toBe('reminder-permission-hint');
    // label 用 for 关联，屏幕阅读器才读得出"提醒时间"
    const lab = document.querySelector('label[for="daily-reminder-time"]');
    expect(lab, '时间输入没有关联的 label').toBeTruthy();
  });

  it('番茄钟结束通知默认开启，每日提醒默认关闭', () => {
    expect(document.getElementById('toggle-pomodoro-notify').checked).toBe(true);
    expect(document.getElementById('toggle-daily-reminder').checked).toBe(false);
  });
});

describe('学习提醒 · 每日定时调度', () => {
  let plugin;
  beforeEach(async () => {
    vi.resetModules();
    await bootstrapApp();
    plugin = installPlugin('granted');
    window.app.bindSettings();
  });
  afterEach(() => { delete window.Capacitor; });

  it('打开开关 → 按设定时间调度一条每日重复通知', async () => {
    const t = document.getElementById('daily-reminder-time');
    t.value = '07:30';
    const tg = document.getElementById('toggle-daily-reminder');
    tg.checked = true;
    tg.dispatchEvent(new Event('change'));
    await new Promise(r => setTimeout(r, 50));

    expect(plugin.log.schedule.length, '没有发起调度').toBeGreaterThan(0);
    const n = plugin.log.schedule[plugin.log.schedule.length - 1].notifications[0];
    expect(n.schedule.every).toBe('day');
    expect(n.schedule.at.hour).toBe(7);
    expect(n.schedule.at.minute).toBe(30);
    // 深度链接字段：点了通知要能回到首页
    expect(n.extra && n.extra.module).toBeTruthy();
  });

  it('重复调度用同一个 id —— 否则改一次时间就多一条每日提醒', async () => {
    const tg = document.getElementById('toggle-daily-reminder');
    tg.checked = true;
    tg.dispatchEvent(new Event('change'));
    await new Promise(r => setTimeout(r, 50));
    const t = document.getElementById('daily-reminder-time');
    t.value = '09:00';
    t.dispatchEvent(new Event('change'));
    await new Promise(r => setTimeout(r, 50));

    const ids = plugin.log.schedule.map(s => s.notifications[0].id);
    expect(ids.length).toBeGreaterThan(1);
    expect(new Set(ids).size, '两次调度用了不同 id，会产生重复提醒').toBe(1);
  });

  it('关闭开关 → 取消的是每日提醒那一条', async () => {
    const tg = document.getElementById('toggle-daily-reminder');
    tg.checked = true;
    tg.dispatchEvent(new Event('change'));
    await new Promise(r => setTimeout(r, 50));
    tg.checked = false;
    tg.dispatchEvent(new Event('change'));
    await new Promise(r => setTimeout(r, 50));

    expect(plugin.log.cancel.length).toBeGreaterThan(0);
    const cancelledIds = plugin.log.cancel.map(c => c.notifications[0].id);
    expect(new Set(cancelledIds).size).toBe(1);
    // 取消的必须就是调度过的那个 id，不然通知永远关不掉
    const scheduledId = plugin.log.schedule[0].notifications[0].id;
    expect(cancelledIds[0]).toBe(scheduledId);
  });

  it('开关状态落盘，重进设置页能还原', async () => {
    const tg = document.getElementById('toggle-daily-reminder');
    tg.checked = true;
    tg.dispatchEvent(new Event('change'));
    await new Promise(r => setTimeout(r, 50));
    // 写进了 DataStore（不是只在内存里勾了一下）
    expect(window.DataStore.getProgress('daily_reminder_enabled', null), '开关没有落盘').toBe(true);
    // 重进一次设置页（bindSettings 会重跑），开关应从存储还原成开，而不是回到默认关
    window.app.bindSettings();
    expect(document.getElementById('toggle-daily-reminder').checked, '重进设置页没还原开关').toBe(true);
  });
});

describe('学习提醒 · 权限未授予时', () => {
  afterEach(() => { delete window.Capacitor; });

  it('拒绝授权后开关自动回退为关，并给出提示', async () => {
    vi.resetModules();
    await bootstrapApp();
    installPlugin('denied');
    window.app.bindSettings();

    const tg = document.getElementById('toggle-daily-reminder');
    tg.checked = true;
    tg.dispatchEvent(new Event('change'));
    await new Promise(r => setTimeout(r, 80));

    expect(tg.checked, '权限被拒还留着开启状态，用户会以为设好了').toBe(false);
    const hint = document.getElementById('reminder-permission-hint');
    expect(hint.textContent).toMatch(/权限/);
  });
});

describe('番茄钟结束通知', () => {
  let plugin;
  beforeEach(async () => {
    vi.resetModules();
    await bootstrapApp();
    plugin = installPlugin('granted');
    window.app.bindSettings();
  });
  afterEach(() => { delete window.Capacitor; });

  it('计时归零时发出一条通知（后台也能收到）', async () => {
    const pm = window.app.pomodoroModule;
    expect(pm, 'pomodoroModule 未挂载').toBeTruthy();
    document.getElementById('pomodoro-duration').value = '25';
    pm.timeLeft = 1;
    pm.start();
    await new Promise(r => setTimeout(r, 1600));   // 等倒计时走到 0

    const immediate = plugin.log.schedule.filter(s => !s.notifications[0].schedule);
    expect(immediate.length, '番茄钟结束时没有发通知').toBeGreaterThan(0);
    expect(immediate[0].notifications[0].title).toMatch(/番茄钟/);
  });

  it('关掉「番茄钟结束通知」后不再发，但提示音/震动开关不受影响', async () => {
    const tg = document.getElementById('toggle-pomodoro-notify');
    tg.checked = false;
    tg.dispatchEvent(new Event('change'));

    const pm = window.app.pomodoroModule;
    pm.timeLeft = 1;
    pm.start();
    await new Promise(r => setTimeout(r, 1600));

    expect(plugin.log.schedule.length, '关掉了还在发通知').toBe(0);
    // 关通知 ≠ 关声音：两个开关各自独立
    expect(document.getElementById('toggle-pomodoro-sound').checked).toBe(true);
  });

  it('结束时仍然弹出提示（通知失败也不能什么都不出现）', async () => {
    const pm = window.app.pomodoroModule;
    pm.timeLeft = 1;
    pm.start();
    await new Promise(r => setTimeout(r, 1600));
    const msg = document.getElementById('pomodoro-message');
    expect(msg.classList.contains('hidden'), '完成提示没显示').toBe(false);
  });
});

describe('环境不支持时不留死开关', () => {
  it('没有 Capacitor 也没有 Notification API → 勾上会被自动关掉并说明原因', async () => {
    vi.resetModules();
    await bootstrapApp();
    const savedNotif = window.Notification;
    delete window.Notification;
    delete window.Capacitor;
    try {
      window.app.bindSettings();
      const tg = document.getElementById('toggle-daily-reminder');
      tg.checked = true;
      tg.dispatchEvent(new Event('change'));
      await new Promise(r => setTimeout(r, 50));
      expect(tg.checked).toBe(false);
      expect(document.getElementById('reminder-permission-hint').textContent).toMatch(/不支持/);
    } finally {
      if (savedNotif) window.Notification = savedNotif;
    }
  });
});

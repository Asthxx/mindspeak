// ==================== EventBus：轻量事件总线（P0-04） ====================
// 模块间解耦：业务模块不再直接互相调用，改为发布 / 订阅事件。
// 不引入任何框架；同步分发；单个监听器异常不阻断其它监听器，
// 且异常会输出到控制台并写入日志（不静默吞错）。
window.MS = window.MS || {};

// 统一事件名（UPPER_SNAKE_CASE）
window.MS.EVENTS = {
  WORD_LEARNED: 'WORD_LEARNED',                 // 学了一个新词（今日首次建档）
  WORD_REVIEWED: 'WORD_REVIEWED',               // 复习了一个词（认识/有点印象/不认识）
  WORD_MASTERED: 'WORD_MASTERED',               // 一个词进入"已掌握"状态
  MISTAKE_ADDED: 'MISTAKE_ADDED',               // 新增一条错题
  MISTAKE_RESOLVED: 'MISTAKE_RESOLVED',         // 一条错题被标记为已掌握
  POINTS_CHANGED: 'POINTS_CHANGED',             // 积分变化
  LEVEL_UP: 'LEVEL_UP',                         // 等级提升
  STREAK_CHANGED: 'STREAK_CHANGED',             // 连续打卡变化
  DAILY_PLAN_CHANGED: 'DAILY_PLAN_CHANGED',     // 每日学习计划/目标变化
  ITEM_USED: 'ITEM_USED',                       // 道具使用/消耗
  ACHIEVEMENT_UNLOCKED: 'ACHIEVEMENT_UNLOCKED', // 解锁成就徽章
  ASSESSMENT_COMPLETED: 'ASSESSMENT_COMPLETED', // 能力测评完成
  SETTINGS_CHANGED: 'SETTINGS_CHANGED'          // 设置变化
};

window.EventBus = (function() {
  'use strict';
  var listeners = {};
  var MAX_PER_EVENT = 64;

  function on(name, fn) {
    if (!name || typeof fn !== 'function') return window.EventBus;
    var arr = listeners[name] = listeners[name] || [];
    arr.push(fn);
    if (arr.length > MAX_PER_EVENT) arr.shift();
    return window.EventBus;
  }

  function off(name, fn) {
    if (!name) return window.EventBus;
    if (!fn) { delete listeners[name]; return window.EventBus; }
    var arr = listeners[name];
    if (!arr) return window.EventBus;
    for (var i = arr.length - 1; i >= 0; i--) {
      if (arr[i] === fn) arr.splice(i, 1);
    }
    return window.EventBus;
  }

  function once(name, fn) {
    var wrapper = function(data) {
      off(name, wrapper);
      fn(data);
    };
    return on(name, wrapper);
  }

  function emit(name, data) {
    var arr = listeners[name];
    if (!arr || !arr.length) return;
    // 拷贝一份：允许监听器内 on/off 而不影响本次分发
    var copy = arr.slice();
    for (var i = 0; i < copy.length; i++) {
      try {
        copy[i](data);
      } catch (e) {
        // 单个监听器异常不阻断其它监听器；异常可见，不静默吞掉
        var err = (e instanceof Error) ? e : new Error(String(e == null ? 'unknown' : e));
        console.error('[EventBus] listener error for "' + name + '":', err && err.message || err);
        if (window.Log && window.Log.error) {
          try { window.Log.error('eventbus', 'listener error: ' + name, err && err.message || String(err), err && err.stack); } catch (_e) {}
        }
      }
    }
  }

  function listenerCount(name) {
    return (listeners[name] || []).length;
  }

  return {
    on: on,
    off: off,
    once: once,
    emit: emit,
    listenerCount: listenerCount
  };
})();
// progress.js — 进度条统一写入（P1-6）
//
// 为什么要有这个文件：进度条的「视觉宽度」和「无障碍数值」必须同源更新。
// 改造前有 8 个模块各自写 `document.getElementById('xx-progress-fill').style.width = ...`，
// 全部只改了视觉那一半。读屏用户读到的 aria-valuenow 会永远停在 HTML 里的初始值。
//
// 用法：ProgressBar.set('grammar-progress-fill', 40);
//       ProgressBar.set(fillEl, 40);              // 也可直接传元素
// 约定：轨道元素（fill 的父节点）带 role="progressbar" 时才会写 aria 属性，
//       没有 role 的旧结构不会报错，只是不做无障碍播报。
(function () {
  'use strict';

  function resolve(fill) {
    if (!fill) return null;
    if (typeof fill === 'string') return document.getElementById(fill);
    return fill;
  }

  var ProgressBar = {
    // fill: 元素或元素 id；pct: 0-100（超出范围会被夹回，非数字按 0 处理）
    set: function (fill, pct) {
      var el = resolve(fill);
      if (!el || !el.style) return;

      var v = Number(pct);
      if (!isFinite(v)) v = 0;
      v = Math.max(0, Math.min(100, v));

      var width = v + '%';
      if (el.style.width !== width) el.style.width = width;      // 宽度用全精度，视觉更准
      el.classList.toggle('is-empty', v <= 0);

      var track = el.parentNode;
      if (!track || !track.getAttribute || track.getAttribute('role') !== 'progressbar') return;

      // aria-valuenow 是「给机器读的数」，一位小数足够；避免 33.33333333333333% 这种脏值
      var shown = String(Math.round(v * 10) / 10);
      if (track.getAttribute('aria-valuenow') !== shown) {
        track.setAttribute('aria-valuenow', shown);
        track.setAttribute('aria-valuetext', shown + '%');
      }
    },

    // 把填充清零并把轨道标记为空态（供「零数据」场景使用）
    clear: function (fill) {
      ProgressBar.set(fill, 0);
      var el = resolve(fill);
      if (el && el.parentNode && el.parentNode.getAttribute
          && el.parentNode.getAttribute('role') === 'progressbar') {
        el.parentNode.setAttribute('aria-valuetext', '暂无数据');
      }
    },
  };

  if (typeof window !== 'undefined') window.ProgressBar = ProgressBar;
  if (typeof module !== 'undefined' && module.exports) module.exports = ProgressBar;
})();

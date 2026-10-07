// loading.js — 三态加载体系统一入口（UI 审查 P1-1）
//
// 三个标准态：
//   1. 内联按钮 loading  Loading.button(btn, {label})
//   2. 区块骨架          Loading.skeleton(host, {variant, rows})
//   3. 等待词库          Loading.awaitLibrary({...})   ← 唯一的真实长等待
//
// 关于「整页过场」：审查报告原本建议给「能力测评生成试卷」加整页过场，
// 但 scripts/probe-loading-costs.mjs 实测 createPaper 中位数仅 17.4ms——
// 给 17ms 的任务盖全屏遮罩只会制造一次闪烁。故本文件不提供整页过场，
// 需要过场时必须先拿实测数据证明该路径确实超过 ~500ms。
(function () {
  'use strict';

  // ==================== 词库就绪判定 ====================

  // WORD_LIBRARY 由 data/all-data.js 等 async 注入（约 9.9MB）。
  // 用 typeof 判定不会在未声明时抛 ReferenceError。
  function libraryReady() {
    try {
      if (typeof WORD_LIBRARY === 'undefined' || !WORD_LIBRARY) return false;
      var cats = WORD_LIBRARY.categories;
      return !!(cats && cats.length > 0);
    } catch (e) {
      return false;
    }
  }

  // ==================== 态 1：内联按钮 loading ====================

  var ORIG_HTML_ATTR = 'data-loading-orig';

  function button(btn, opts) {
    opts = opts || {};
    if (!btn || !btn.setAttribute) return { end: function () {} };
    var label = opts.label || '处理中…';

    // 幂等：重复调用不覆盖已保存的原始 HTML，否则第二次存下的就是"第一次"，
    // 收态后按钮会永远停在等待文案上
    if (btn.getAttribute(ORIG_HTML_ATTR) === null) {
      btn.setAttribute(ORIG_HTML_ATTR, btn.innerHTML);
    }
    btn.classList.add('is-loading');
    btn.disabled = true;
    // aria-busy：只禁用不标注，读屏用户听到的是"这个按钮坏了"，而不是"正在忙"
    btn.setAttribute('aria-busy', 'true');
    btn.innerHTML = '<span class="btn-spinner" aria-hidden="true"></span> ' + label;

    return { end: function () { buttonEnd(btn); } };
  }

  function buttonEnd(btn) {
    if (!btn || !btn.setAttribute) return;
    btn.classList.remove('is-loading');
    btn.disabled = false;
    btn.removeAttribute('aria-busy');
    var orig = btn.getAttribute(ORIG_HTML_ATTR);
    if (orig !== null) {
      btn.innerHTML = orig;
      btn.removeAttribute(ORIG_HTML_ATTR);
    }
  }

  // ==================== 态 2：区块骨架 ====================

  var SKEL_ATTR = 'data-skeleton';

  function skeleton(host, opts) {
    opts = opts || {};
    if (!host || !host.appendChild) return { end: function () {} };
    var variant = opts.variant || 'text';
    var rows = opts.rows || 3;
    var doc = host.ownerDocument;

    // 幂等：先收掉同一宿主上的旧骨架。宿主会被事件驱动的 render 反复重挂骨架，
    // 不先收会一层层叠起来（实测两次调用就得到 2 个骨架块）。
    skeletonEnd(host);

    // 两种藏法：
    //   默认只加 class，由 CSS 隐藏元素子节点——不搬动 DOM，保住内部 id 节点。
    //   swap:true 才把子节点搬进 fragment——仅用于内容为纯文本的宿主
    //   （#dash-total 这类 <b>0</b>），文本节点不受 display 影响，不搬会叠显示。
    if (opts.swap) {
      var frag = doc.createDocumentFragment();
      while (host.firstChild) frag.appendChild(host.firstChild);
      host._skeletonStore = frag;
    } else {
      host.classList.add('is-skeleton');
    }

    var wrap = doc.createElement('div');
    wrap.className = 'skeleton skeleton--' + variant;
    wrap.setAttribute(SKEL_ATTR, '');
    // role=status：读屏会播报一次"内容加载中"，而不是让用户对着空白猜
    wrap.setAttribute('role', 'status');
    wrap.setAttribute('aria-label', opts.label || '内容加载中');

    for (var i = 0; i < rows; i++) {
      var line = doc.createElement('span');
      line.className = 'skeleton-line';
      line.setAttribute('aria-hidden', 'true');
      wrap.appendChild(line);
    }

    host.appendChild(wrap);
    host.setAttribute('aria-busy', 'true');

    return { end: function () { skeletonEnd(host); } };
  }

  function skeletonEnd(host) {
    if (!host || !host.setAttribute) return;
    removeSkeletonNodes(host);
    var frag = host._skeletonStore;
    if (frag) {
      if (frag.firstChild) host.appendChild(frag);
      try { delete host._skeletonStore; } catch (e) { host._skeletonStore = null; }
    }
    host.classList.remove('is-skeleton');
    host.removeAttribute('aria-busy');
  }

  // 只清骨架、不回填旧内容——用于"下一帧马上要整体重渲染"的场景，
  // 回填旧值会与真实渲染打架（一帧内闪一次旧数字）
  function skeletonClear(host) {
    if (!host || !host.setAttribute) return;
    removeSkeletonNodes(host);
    try { delete host._skeletonStore; } catch (e) { host._skeletonStore = null; }
    host.classList.remove('is-skeleton');
    host.removeAttribute('aria-busy');
  }

  function removeSkeletonNodes(host) {
    var nodes = host.querySelectorAll('[' + SKEL_ATTR + ']');
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].parentNode) nodes[i].parentNode.removeChild(nodes[i]);
    }
  }

  // ==================== 态 3：等待词库 ====================

  // 词库是本项目唯一跨设备、跨网络的长等待（本地实测 603ms，慢机/慢网首开可达数秒）。
  // 返回 cancel()：调用后不再触发 ready（例如用户提前离开了当前页）。
  function awaitLibrary(opts) {
    opts = opts || {};
    var appearMs = opts.appearMs == null ? 200 : opts.appearMs;
    var pollMs = opts.pollMs == null ? 500 : opts.pollMs;
    // 15s 与改造前 app.js populateCategories 的重试预算对齐（30 次 × 500ms）。
    // 语音/网络环境再慢也不该让用户无限等下去——到点就如实报错。
    var timeoutMs = opts.timeoutMs == null ? 15000 : opts.timeoutMs;

    if (libraryReady()) {
      if (opts.ready) opts.ready();
      return function () {};
    }

    var dead = false;
    var appearTimer = null;
    var pollTimer = null;
    var handles = [];

    function stopTimers() {
      if (appearTimer) clearTimeout(appearTimer);
      if (pollTimer) clearTimeout(pollTimer);
      appearTimer = null;
      pollTimer = null;
    }

    function endHandles() {
      for (var i = 0; i < handles.length; i++) handles[i].end();
      handles = [];
    }

    function finish(ok) {
      dead = true;
      stopTimers();
      endHandles();
      if (ok !== false && opts.ready) opts.ready();
    }

    // 延迟显形：只有等待确实超过 appearMs 才让用户看到加载态。
    // 词库命中本地缓存时几十毫秒就到位，立刻画骨架再立刻收掉 = 一次闪烁。
    appearTimer = setTimeout(function () {
      appearTimer = null;
      if (dead || libraryReady()) return;
      if (opts.button) handles.push(button(opts.button.el, opts.button));
      if (opts.host) handles.push(skeleton(opts.host, opts.skeleton || {}));
      if (opts.onAppear) opts.onAppear();
    }, appearMs);

    var t0 = Date.now();
    (function step() {
      if (dead) return;
      if (libraryReady()) { finish(true); return; }
      if (Date.now() - t0 >= timeoutMs) {
        if (opts.onTimeout) opts.onTimeout();
        finish(false);
        return;
      }
      pollTimer = setTimeout(step, pollMs);
    })();

    return function cancel() {
      if (dead) return;
      dead = true;
      stopTimers();
      endHandles();
    };
  }

  var Loading = {
    libraryReady: libraryReady,
    button: button,
    buttonEnd: buttonEnd,
    skeleton: skeleton,
    skeletonEnd: skeletonEnd,
    skeletonClear: skeletonClear,
    awaitLibrary: awaitLibrary,
  };

  if (typeof window !== 'undefined') window.Loading = Loading;
  if (typeof module !== 'undefined' && module.exports) module.exports = Loading;
})();

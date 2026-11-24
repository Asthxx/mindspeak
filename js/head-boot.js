// ==================== head-boot.js · 首帧前引导 ====================
// CSP 收紧（script-src 'self'，移除 unsafe-inline）后，index.html 不再允许内联脚本，
// 原 5 段内联引导逻辑在 2026-09-05 全部提取至此。必须 **同步** 加载（不得 defer/async），
// 且放在页面逻辑（js/ 业务脚本）之前，保证首帧主题/视口/平台 class 先于 CSS 生效。

// ---------- 1. 视口兜底（兼容不依赖手机型号，原内联 L6） ----------
// 部分 Android WebView / Capacitor 打包会以"桌面宽视口"（约 980px）渲染页面，
// 导致 @media(max-width:768px) 手机布局不生效。检测逻辑：屏幕物理宽度 ÷ 设备像素比
// = 设备逻辑宽；若页面布局视口远大于它，则判定宽视口异常，重设 viewport meta 并整页
// 重载（仅一次，防死循环）。
(function(){
  try {
    var dpr = window.devicePixelRatio || 1;
    var screenCssW = (window.screen.width || 0) / dpr;      // 手机屏幕的逻辑宽度（如 360/375/412）
    var vw = window.innerWidth;                              // 当前布局视口宽度
    var isTouch = 'ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0;
    // 手机触屏设备，但布局视口异常宽（≥2 倍屏幕逻辑宽），判定为宽视口 bug
    if (isTouch && screenCssW > 200 && screenCssW < 550 && vw > screenCssW * 1.5) {
      var vp = document.querySelector('meta[name="viewport"]');
    // 防死循环标记必须跨 reload 存活：window 变量在 location.reload() 后随新 window
    // 归零；一旦宿主环境固定视口（CDP 仿真 / 某些 ROM），条件在重载后依旧成立 →
    // 每 ~16ms 重导航一次的无限循环（2026-11-24 headless 实测 4 秒 14392 个请求）。
    // sessionStorage 按 tab 存活，语义正好是「本 tab 只修一次」。
    if (vp && !window.__viewportFixed && !(function(){try{return sessionStorage.getItem("__vp_fixed_once");}catch(e){return "1";}})()) {
        try { sessionStorage.setItem('__vp_fixed_once', '1'); } catch (e) {}   // 跨 reload 防重入
        vp.setAttribute('content', 'width=' + Math.round(screenCssW) + ', initial-scale=1.0, viewport-fit=cover, shrink-to-fit=no');
        // 加标记类：即使重载后 CSS 媒体查询仍不生效，也走 forced-mobile 兜底
        document.documentElement.classList.add('forced-mobile');
        window.location.reload();
      }
    }
  } catch (e) {}
})();

// ---------- 2. 未处理 Promise 拒绝缓冲（原内联 L51） ----------
// 全局兜底（P0-01）：不再调用 e.preventDefault()——浏览器默认的 "Uncaught (in promise) ..."
// 输出保留，开发环境控制台可排查真实错误；生产环境由 js/logger.js 的 unhandledrejection
// 监听把错误写入日志系统（服务器端落盘）。window.__rejections 仅作为排查缓冲，不作为唯一出口。
window.addEventListener('unhandledrejection', function(e) {
  try {
    window.__rejections = window.__rejections || [];
    if (window.__rejections.length < 50) window.__rejections.push(String((e && e.reason) || ''));
  } catch (err) {}
});

// ---------- 3. 主题防闪烁（原内联 L83） ----------
// 在页面渲染前应用主题，防止深色模式闪烁。
// 注意：localStorage 里的 theme 是「用户选择」（light/dark/system 三态），而 CSS 只认
// data-theme="light|dark"。此前把 'system' 原样写进 data-theme —— 没有任何 CSS 规则
// 匹配它，首帧就只能落到默认亮色，直到 DOMContentLoaded 后 ThemeToggle 解析完才切深色
// （实测 21ms→199ms 闪白）。这里必须当场把 'system' 解析成实际生效值。
(function() {
  var mode = 'system';
  try {
    var saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark' || saved === 'system') mode = saved;
  } catch(e) {}
  var resolved = mode;
  if (mode === 'system') {
    try {
      resolved = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
    } catch(e) { resolved = 'light'; }
  }
  document.documentElement.setAttribute('data-theme', resolved);
  // 原始三态单独存一份，供调试/将来按模式写样式（不要再从 data-theme 反推）
  document.documentElement.setAttribute('data-theme-mode', mode);
})();

// ---------- 4. 平台检测 + Android 语音预热（原内联 L95） ----------
// iOS / Android 分别加 class，供 CSS 针对性适配（与 js/app.js App.detectPlatform 一致，
// 此处提前执行避免 platform CSS 延迟生效闪屏）。
(function(){
  var ua=(navigator.userAgent||'').toLowerCase();
  var isIOS=/iphone|ipad|ipod/.test(ua)||(/macintosh/.test(ua)&&navigator.maxTouchPoints>1);
  var isAndroid=/android/.test(ua);
  // 平板判定：UA 提示或短边>=700px（与横竖屏无关——横屏手机短边~390px 不会误判）
  var isTablet=isAndroid&&(/tablet|pad/.test(ua)||Math.min(window.innerWidth,window.innerHeight)>=700);
  var html=document.documentElement;
  if(isIOS){html.classList.add('platform-ios');html.setAttribute('data-platform','ios');}
  else if(isAndroid&&isTablet){html.classList.add('platform-android','platform-tablet');html.setAttribute('data-platform','tablet');}
  else if(isAndroid){html.classList.add('platform-android');html.setAttribute('data-platform','android');}
  // Android WebView 声音预热：Android 的 speechSynthesis 必须"加载语音列表"才可出声
  //（getVoices 首次返回空，要等 voiceschanged），且首次点击会激活音频输出通道。
  // 这里提前注册一次 voiceschanged + 首次手势触发一次加载，保证后续 TTS 立即有声。
  if (isAndroid && 'speechSynthesis' in window) {
    var _warm = function() {
      try {
        var v = window.speechSynthesis.getVoices() || [];
        if (v && v.length) {
          document.removeEventListener('touchstart', _warm, true);
          document.removeEventListener('click', _warm, true);
          try { window.speechSynthesis.cancel(); } catch(e) {}
          var u = new SpeechSynthesisUtterance(' ');
          u.volume = 0; u.rate = 0.5;
          try { window.speechSynthesis.speak(u); } catch(e) {}
        }
      } catch(e) {}
    };
    document.addEventListener('touchstart', _warm, true);
    document.addEventListener('click', _warm, true);
    try { window.speechSynthesis.getVoices(); } catch(e) {}
  }
})();

// ---------- 4b. Android 专用样式按需注入（首屏减 3 个阻塞请求） ----------
// android.css / android-nav.css / android-animations.css 的所有规则都以
// html.platform-android 为前缀，非 Android 平台加载后不产生任何视觉效果，
// 却要付出 3 次请求 + CSSOM 解析成本。这里复用上面已算好的 isAndroid 判定，
// 只在真正需要的平台插入 <link>；插入位置在 mobile.css 之前，保持原有层叠顺序。
(function(){
  // 直接读第 4 段已经打好的平台 class，避免重复 UA 解析
  if (true) return; // [临时实验：禁用 android.css 注入]
  if (!document.documentElement.classList.contains('platform-android')) return;
  var files = ['css/android.css', 'css/android-nav.css', 'css/android-animations.css'];
  var anchor = document.querySelector('link[href*="css/mobile.css"]');
  for (var i = 0; i < files.length; i++) {
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = files[i];
    if (i === 0) link.id = 'android-css';   // 保留原 id，便于调试/排查
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(link, anchor);
    else document.head.appendChild(link);
  }
})();

// ---------- 5. PWA 离线缓存注册（原内联 L1968） ----------
// 仅在 HTTPS / localhost 环境注册（file:// 直接打开时跳过）。
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  window.addEventListener('load', function() {
    // 不能把 location.search 拼到 sw.js 后面：SW 以脚本 URL 为注册键，
    // 带上 ?w=768 这类查询串后每个变体都是一台新 SW，导航/回退/分享链接
    // 都会触发一轮"注册→install→skipWaiting→claim"，在文档加载中途换装，
    // 表现为页面被截断（DCL 永不触发）。改用 updateViaCache:'none' 保证发版即更新。
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(function(err) {
      if (window.__log) window.__log('[sw] register failed: ' + err);
    });
  });
}
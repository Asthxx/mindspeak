# CHANGELOG · 迭代记录

本文档记录「闻道 MindSpeak」的每次迭代更新。格式：

```
## [版本号] - 日期
### 新增 / 修复 / 优化 / 重构
- 条目
```

> 版本号维护在根目录 [`VERSION`](VERSION)，每次发布更新请在**顶部**追加一条记录。

---

## [1.1.2] - 2026-08-14

### 修复
- **安卓 APK 部分机型显示成"桌面版"**（宽视口问题）：某些 Android WebView 以约 980px 宽视口渲染页面，导致手机媒体查询不生效、页面像网页不像 App。三层通用兜底（不依赖手机型号）：
  1. **viewport 加固**：去掉 `user-scalable=no` / `maximum-scale=1.0`（已知 Android 宽视口雷区），改用 `shrink-to-fit=no`；
  2. **JS 视口自检**：页面加载即检测"布局视口远大于手机屏幕逻辑宽"，异常时重设 viewport 并整页重载（仅一次），同时加 `forced-mobile` 类；
  3. **CSS 兜底**：`html.forced-mobile` 下强制手机布局（底部导航、抽屉侧边栏、内容全宽、安全区），即使媒体查询完全失效也保证手机版。
- **WebView 原生加固**：APK 构建时在 `MainActivity` 关闭宽视口/概览模式（`setUseWideViewPort(false)` / `setLoadWithOverviewMode(false)`），从源头让所有安卓机型按手机宽度渲染。

---

## [1.1.1] - 2026-08-14

### 新增
- **iOS / Android 平台区分**：检测手机系统（`platform-ios` / `platform-android`），分别适配安全区、触控、沉浸式、底部导航高度（iOS 58px / Android 62px）；
- **Releases 资产平台标注**：安装包文件名明确区分平台（`MindSpeak-Android-*.apk` / Windows NSIS `.exe` / macOS `.dmg`），桌面版打 tag 时自动发布到 Release。

### 修复
- **手机端图标不显示**：SVG `<use>` 补 `xlink:href` 兜底、sprite 改用 0 尺寸隐藏，兼容旧 Android WebView / 部分 Tauri WebView；
- **在线版（GitHub Pages）未同步**：gh-pages 分支更新至最新构建。

### 优化
- 触控目标统一 ≥44px（按钮/下拉框/图标按钮），拇指更易点；
- 底部导航选中态胶囊高亮（含暗色模式）；
- README 明确说明 iOS 无安装包、请用 PWA 在线版。

---

## [1.1.0] - 2026-08-12

### 新增
- **PWA 支持**：manifest + Service Worker 离线缓存，可「添加到主屏幕」全屏当 App 使用；
  新增应用图标（512/192/maskable，与 favicon 同风格）、pwa-manifest.json、sw.js、
  构建时自动注入缓存版本号强制刷新；
- **APK 打包**：README 新增 PWABuilder 在线打包安卓安装包指引（免本地 SDK）。

### 优化
- **手机端 App 级适配**：全屏沉浸（viewport-fit=cover）、刘海屏安全区（safe-area）、
  动态视口（100dvh）、44px+ 触摸目标、禁用双击缩放/无横向溢出；
- 弹窗改**底部抽屉式**全屏化（App 风格）；
- 首页 / 道具店 / 单词表 / 练习区布局按手机重排。

### 构建
- 产物 terser 压缩（bundle 463KB → 278KB），dist 精简至 ~21MB。

### 修复
- 本地字母发音 / 支持图已同步最新素材。

---

## [1.0.1] - 2026-08-09

### 修复
- **手机朗读彻底修好（重要）**：手机/网页版（无本地 server）朗读改走 `_speakServerless`——
  点按手势内**立即**播放远程在线发音（有道词典美音 → Google 翻译），不再先干等
  `speechSynthesis` 4.5 秒（手机没有英文语音 = 白等），消除「手势过期被浏览器拦截
  `audio.play()` → 没声音」的根本问题；
- 远程发音全部失败后才退回浏览器系统语音，设备仍无英文语音才真正提示，绝不静默无声；
- 去掉误导性报错提示「请到系统设置安装英文 TTS」，改为更贴合网页/手机的场景提示。

### 其他
- 文档化：新增 `README.md`（项目介绍/快速开始/部署/目录结构）、`CHANGELOG.md`（本文档）；
- 版本分离：新增根目录 `VERSION` 文件，`node build.js` 构建时自动注入
  `dist/version.txt` 与 `dist/index.html` 的 `<meta name="app-version">`。

---

## [1.0.0] - 2026-08-09

### 新增
- 闻道 MindSpeak 全量源码公开（含前端 + server，排除 `.env` 与运行时数据库）；
- 能力测评、AI 助手 / AI 教练、词文串学、随声听、拼写测试、错题本、错词强化、
  跟读练习、番茄钟、成就徽章、道具商店、每日学习计划、单词 PK 等模块上线。

### 修复
- 安全加固：凭据移出项目目录，改从 `~/.mindspeak/server.env` 读取；
- 移除登录/邮箱验证码：无需账号，前端数据全部本地保存，后端仅保留 TTS 与日志；
- 朗读：探测本地 server 可达性，不可达时自动降级浏览器语音，不再弹红色报错；
- 移动端适配：汉堡抽屉导航 + 全宽内容区，替换窄条图标栏。

---

## 说明

- 早期（公开仓库前）的历史迭代记录已合并为 `1.0.0` 概述；
- 本仓库仅公开 1.0.x 之后的完整变更历史。
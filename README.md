# 闻道 MindSpeak · 英语学习助手

一套开箱即用的**本地英语学习桌面应用**（也可一键部署到 GitHub Pages / Vercel / Cloudflare Pages 在线使用）。无需注册账号、无需联网（离线模式）即可背单词、练听力、做拼写、刷语法，配合 Windows 本地服务还能离线朗读和信息加密。

> 当前版本：见 [VERSION](VERSION)（构建时自动注入 `dist/version.txt`）
> 迭代记录：见 [CHANGELOG.md](CHANGELOG.md)

---

## 📲 手机端安装方式（请按系统选择）

> **重要说明**：本软件在手机端有两种形态——**安卓有独立安装包（APK）**，**iOS 没有安装包（受苹果政策限制，只能使用在线 PWA 版）**。请先看清你的手机系统再选择，避免误以为 iOS 少了东西。

### 🤖 安卓（Android）→ 下载 APK 安装包

> **免费 · 免注册 · 离线可用**，安装到手机即可开启学习之旅。

<div align="center">

[![下载 APK](https://img.shields.io/badge/⬇️_下载最新版_APK_v1.1.0-brightgreen?style=for-the-badge&logo=android&logoColor=white)](https://github.com/Asthxx/mindspeak/releases/download/v1.1.0/app-release.apk)

[![查看全部版本](https://img.shields.io/badge/查看全部版本-blue?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Asthxx/mindspeak/releases)

</div>

1. 点击上方绿色按钮下载 `app-release.apk` 到手机；
2. 打开文件安装（首次需在手机设置中允许「安装未知来源应用」）；
3. 安装完成，打开「闻道 MindSpeak」即可开始背词学习。

> 每次发布版本时在 GitHub 创建 `v1.x.x` 标签，Actions 会自动把 APK 挂到 Releases 页面。也可以到仓库 **Actions → 打包安卓安装包 APK → Run workflow** 手动触发打包，完成后在 **Artifacts** 下载。

### 🍎 iOS（苹果）→ 无安装包，请用 PWA 在线版

> iOS **无法下载 APK**（苹果不允许侧载应用），因此没有 iOS 安装包。请在 **Safari** 中使用 **PWA 在线版**，功能与 APK 完全一致，可"添加到主屏幕"获得接近 App 的体验（全屏、离线缓存、应用图标）。

**iOS 添加到主屏幕步骤**：

1. 用 **Safari** 打开 [https://asthxx.github.io/mindspeak/](https://asthxx.github.io/mindspeak/)
2. 点击底部 **分享** 按钮（方框+箭头图标）；
3. 选择 **「添加到主屏幕」**；
4. 桌面出现「闻道 MindSpeak」图标，点击即可全屏使用。

> 首次打开请等待页面完全加载（离线缓存建立），之后断网也能用。

### 🌐 通用（任意系统）→ 在线版

| 渠道 | 说明 |
|---|---|
| **在线版（无需安装）** | [打开 GitHub Pages 在线版](https://asthxx.github.io/mindspeak/)（PWA，覆盖全部功能） |
| 桌面版（Windows / macOS） | 见下方「快速开始」章节，支持本地服务完整发音 |

---

## 为什么用它

- **零账号**：不需要邮箱、不使用云数据库，所有学习进度保存到**浏览器本地**（localStorage），任何人任何设备打开即用。
- **离线可用**：词库 60+ 个、语法/听力/阅读/拼写/跟读等全部内置在前端，纯静态也能跑（除发音外）。
- **发音可靠**：Windows 场景走本地 Microsoft SAPI（Zira 女声）；手机/网页版无系统英文语音时，自动用手势内播放远程在线发音（有道词典美音 → Google 翻译），**点击必出声**。
- **游戏化**：等级、积分、连续打卡、成就徽章、道具商店、每日计划……让背单词像打游戏一样有正反馈。

---

## 功能一览

| 模块 | 说明 |
|---|---|
| 📚 背单词 | 卡片翻页 / 列表视图、艾宾浩斯遗忘曲线复习、自适应复习间隔、每日新词目标、收藏、认识/记住/忘记三键 |
| 📖 词文串学 | 把今日新学+待复习单词串成短文，边读边巩固 |
| 🎧 听力训练 | 随声听循环朗读、听写模式边听边默写 |
| 📄 阅读训练 | 阅读理解练习 |
| ✍️ 语法练习 | 填空 / 句型转换 |
| 🔤 语境填空 | 上下文背单词 |
| 🏆 单词PK | 双人对战式复习 |
| 🔤 拼写测试 | 看中文写英文 / 听发音写英文 / 看英文选中文 |
| ❌ 错题本 | 集中复习错词，错词强化训练 |
| 🎙️ 跟读练习 | 听→仿读→发音检测（需浏览器麦克风） |
| ⏱️ 番茄钟 | 专注学习计时 |
| 🏅 成就徽章 | 打卡、连击、进阶勋章 |
| 🛍️ 道具商店 | 双倍经验、跳过、幸运星、护盾、冻结等趣味道具 |
| 🔍 查单词 / 收藏夹 | 快速查询与收藏 |
| 🤖 AI 助手 / AI 教练 | 学习报告、能力测评、对话式问答 |
| 🐍 能力测评 | 词汇 / 语法 / 听力 / 发音 / 阅读五维评测，生成专属计划 |
| ⚙️ 设置 | 更换朗读声音、语速、每日目标、数据备份 / 还原 / 导出 |

---

## 快速开始

### 方式一：直接本地打开（最简单，单词/练习全可用）

1. 下载或克隆本仓库；
2. **双击 `英语学习.bat`** 即可启动本地服务，浏览器自动打开 `http://localhost:3000`；
3. 或直接双击 `index.html` → 自动切换在线 `http://localhost:3000`（本地服务未运行则保持离线模式）。

### 方式二：部署在线版（手机也能用）

把 **`dist/` 目录**内容上传到 GitHub Pages / Vercel / Cloudflare Pages（只公开装这一个目录），或用 `node build.js` 重新构建：

```bash
npm install         # 安装 terser
node build.js       # 生成 dist/
```

在线版已内置 **PWA（渐进式 Web 应用）**：App 图标、离线缓存、全屏沉浸、刘海屏安全区，**可添加到主屏幕当 App 用**：

- 📱 **Android**：Chrome 打开在线地址 → 菜单「添加到主屏幕 / 安装应用」
- 🍎 **iOS**：Safari 打开 → 分享 → 「添加到主屏幕」

### 方式三：打包成安卓安装包（APK）

本仓库已配置 **GitHub Actions 云端自动打包**（无需本地 SDK）：

1. 打开仓库 **Actions** 页 → 选中 **「打包安卓安装包 APK」**；
2. 点 **Run workflow**（或在仓库创建 `v1.x.x` 标签自动触发）；
3. 构建完成后：打标签的版本会出现在 **Releases** 下载页；手动触发的在 **Artifacts** 里下载；
4. 把 APK 传入手机直接安装（需允许安装未知来源应用）。

APK 由 Capacitor 打包，内置全部词库与离线缓存，**断网也能背单词**。也可以在线用 PWA：`https://asthxx.github.io/mindspeak/` 添加到主屏幕。

### 方式四：自建本地服务（完整发音 + 日志）

```bash
cd server
npm install
node server.js
```

> 服务默认端口 `3000`；本地服务同时提供 `\api\tts`（SAPI 离线发音）、`\api\online-tts`（在线女声代理）、`\api\logs`（错误日志）等接口。
> 部署到公网 HTTPS 时，后端地址在 `js/api-config.js` 中配置。

---

## 目录结构

```
.
├── index.html          # 单页入口（全部页面/弹窗 DOM + PWA 注册）
├── css/                # 样式（组件 / 主题 / 移动端）
├── js/                 # 逻辑（app.js、各模块、日志、TTS 管理）
├── data/               # 词库与扩展数据（all-data.js 等）
├── assets/             # 图标、音频、图片、PWA 应用图标(pwa/)等
├── server/             # 可选本地服务：TTS / 日志 / 配置
├── dist/               # 构建产物（可部署目录，bundle.js 混淆压缩）
├── build.js            # 构建脚本（合并 JS + terser + 版本注入 + PWA 生成）
├── merge-data.js       # 词库合并脚本
├── sw.js               # Service Worker（离线缓存，构建时注入版本）
├── manifest.webmanifest # PWA 应用清单（构建时生成 dist/pwa-manifest.json）
├── VERSION             # 当前版本号（构建时读取）
└── CHANGELOG.md        # 迭代记录
```

---

## 技术栈

- 纯原生 HTML / CSS / JS（无框架，零依赖，离线可跑）
- Node.js（可选，仅供本地发音服务与会话日志）
- Terser（构建混淆）
- **PWA**：manifest + Service Worker 离线缓存，可安装到主屏幕 / 打包 APK
- 部署：GitHub Pages / Vercel / Cloudflare Pages 均可

---

## 数据与隐私

- 所有学习数据存储在**浏览器 localStorage**，只有你自己可见；
- 不注册、不收隐私、不发远程分析；后端（可选）仅用于本地朗读与日志，凭据从 `~/.mindspeak/server.env` 读取，项目内不存放任何密钥。

---

## 版本与迭代

- 版本号统一维护在 `VERSION` 文件，`node build.js` 时自动注入 `dist/version.txt` 与 `dist/index.html` 的 `<meta name="app-version">`。
- 每次发布更新请在 [CHANGELOG.md](CHANGELOG.md) 顶部追加一条记录（版本号 / 日期 / 内容）。

---

## License

仅供学习交流使用。
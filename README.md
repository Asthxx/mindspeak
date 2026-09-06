# 闻道 MindSpeak · 英语学习助手

一套开箱即用的**本地英语学习桌面应用**（也可部署到 **GitHub Pages** 等任意静态托管 / 服务器在线使用）。无需注册账号、无需联网（离线模式）即可背单词、练听力、做拼写、刷语法，配合 Windows 本地服务还能离线朗读和信息加密。

> 当前版本：见 [VERSION](VERSION)（构建时自动注入 `dist/version.txt`）
> 迭代记录：见 [CHANGELOG.md](CHANGELOG.md)

---

## 📲 手机端安装方式（请按系统选择）

> **重要说明**：本软件在手机端有两种形态——**安卓有独立安装包（APK）**，**iOS 没有安装包（受苹果政策限制，只能使用在线 PWA 版）**。请先看清你的手机系统再选择，避免误以为 iOS 少了东西。

### 🤖 安卓（Android）→ 下载 APK 安装包

> **免费 · 免注册 · 离线可用**，安装到手机即可开启学习之旅。

<div align="center">

[![下载 APK](https://img.shields.io/badge/GitHub_Release-下载最新版_APK_v1.1.0-brightgreen?style=for-the-badge&logo=github&logoColor=white)](https://github.com/你的用户名/你的仓库名/releases/latest)

</div>

1. 打开上方「GitHub Release 下载最新版 APK」链接（或仓库 Releases 页面），下载 `MindSpeak-Android-v1.1.0.apk`；
2. 打开文件安装（首次需在手机设置中允许「安装未知来源应用」）；
3. 安装完成，打开「闻道 MindSpeak」即可开始背词学习。

> 教程中「你的用户名 / 你的仓库名」请替换为你的 GitHub 账号与仓库名。APK 通过 GitHub Release 附件分发（不入库），发布步骤见「方式二 / 方式三」。

### 💻 Windows / macOS（桌面）→ 下载桌面安装包

桌面安装包按「方式三」本地构建（Capacitor / Tauri），产物命名 `MindSpeak-Windows-*.exe`（Windows）或 `MindSpeak-macOS-*.dmg`（macOS），请按文件名认准平台下载。构建好后作为 GitHub Release 附件一并发布。

| 文件名前缀 | 平台 | 说明 |
|---|---|---|
| `MindSpeak-Android-*.apk` | 🤖 安卓 | 手机安装包 |
| `MindSpeak-Windows-*.exe` | 🖥️ Windows | 桌面安装包（NSIS 安装向导） |
| `MindSpeak-macOS-*.dmg` | 🍏 macOS | 桌面安装包（Apple Silicon） |

> 若下载区看到 `MindSpeak_1.x.x_*` 旧命名文件，请忽略，以下载 `MindSpeak-平台-版本` 命名的新文件为准。

### 🍎 iOS（苹果）→ 无安装包，请用 PWA 在线版

> iOS **无法下载 APK**（苹果不允许侧载应用），因此没有 iOS 安装包。请在 **Safari** 中使用 **PWA 在线版**，功能与 APK 完全一致，可"添加到主屏幕"获得接近 App 的体验（全屏、离线缓存、应用图标）。

**iOS 添加到主屏幕步骤**：

1. 用 **Safari** 打开部署后的在线地址（如 `https://<你的用户名>.github.io/<你的仓库名>/`，见「方式二」）
2. 点击底部 **分享** 按钮（方框+箭头图标）；
3. 选择 **「添加到主屏幕」**；
4. 桌面出现「闻道 MindSpeak」图标，点击即可全屏使用。

> 首次打开请等待页面完全加载（离线缓存建立），之后断网也能用。

### 🌐 通用（任意系统）→ 在线版

| 渠道 | 说明 |
|---|---|
| **在线版（无需安装）** | 打开部署后的在线地址（PWA，覆盖全部功能），GitHub Pages 部署见「方式二」 |
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

### 方式二：部署在线版（GitHub Pages，手机也能用）

把仓库 push 到 GitHub 后，仓库内已内置 **GitHub Actions 自动发布**：每次推送到 `main` 会自动构建 `dist/` 并部署到 GitHub Pages（无需本地手动上传）。只需一次性开启 Pages：

1. 把代码推送到 GitHub 仓库（详见文末「GitHub 操作清单」）；
2. 打开仓库 **Settings → Pages**，在 **Build and deployment / Source** 下拉选择 **GitHub Actions**；
3. 之后每次推送代码到 `main`，自动重新构建并发布；在线地址为 `https://<你的用户名>.github.io/<你的仓库名>/`。

也可以跳过 Actions，本地 `node build.js` 生成 `dist/` 后手动发布：

```bash
npm install         # 安装 terser
node build.js       # 生成 dist/
```

> **在线版功能说明**：GitHub Pages 是纯静态托管，**无本地后端**（`server.js` 的 SAPI / Piper / Edge 高质量音色需本机服务），在线版会自动使用浏览器系统语音 + 有道 / 百度远程发音（国内直连），仍**点击必出声**、单词练习全可用。若你部署自己的后端，按「方式四」运行并把 `js/api-config.js` 的 `REMOTE_API` 改为后端 HTTPS 地址。

> 在线版已按 `connect-src` 放行配置：页面在 HTTPS 下可连接 `http://127.0.0.1:3000` / `http://localhost:3000`（本地后端调试）与任意 HTTPS 接口（在线发音 / AI）。后端如需安全接入，按「方式四」设置 `MS_TOKEN` 环境变量。

在线版已内置 **PWA（渐进式 Web 应用）**：App 图标、离线缓存、全屏沉浸、刘海屏安全区，**可添加到主屏幕当 App 用**：

- 📱 **Android**：Chrome 打开在线地址 → 菜单「添加到主屏幕 / 安装应用」
- 🍎 **iOS**：Safari 打开 → 分享 → 「添加到主屏幕」

### 方式三：打包成安卓安装包（APK）

本地打包（无需云端），产物为项目根目录下方按钮指向的 `MindSpeak-Android-v1.1.0.apk`：

```bash
node build.js                 # 先构建 dist/（web 资源）
npx cap sync android          # 把 dist 同步进 android/app/src/main/assets/public
# 需要 JDK 21（本机默认 Java 17 会报"无效的源发行版：21"），在 android/ 下执行：
..\fix-java.bat gradlew.bat assembleDebug
# 产物：android\app\build\outputs\apk\debug\app-debug.apk
```

把 APK 传入手机直接安装（需允许安装未知来源应用），或将 APK 作为 **GitHub Release 附件**发布（推荐，见文末「GitHub 操作清单」）让用户在线下载。

> APK 由 Capacitor 打包，内置全部词库与离线缓存，**断网也能背单词**。在线 PWA 版（部署后地址）也可添加到主屏幕。

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
- 部署：任意静态托管 / 服务器均可（本项目推荐 **GitHub Pages** 自动发布，Dist 相对路径 + PWA `start_url: "./"` 兼容 `/仓库名/` 子路径部署）；HTTPS 建议启用（PWA 与安全特性需要）

---

## GitHub 操作清单

以下步骤一次性完成即可（含自动发布 + APK 分发）：

1. **创建仓库**：登录 GitHub → New repository → 填写仓库名（如 `mindspeak`）→ Create repository。
2. **推送代码**（本机项目目录下）：
   ```bash
   git remote add origin https://github.com/<你的用户名>/<你的仓库名>.git
   git push -u origin main
   ```
   > 若提示 `remote origin already exists`，先执行 `git remote remove origin` 再添加。
3. **开启 Pages 自动发布**：仓库 **Settings → Pages** → Build and deployment → **Source 选 `GitHub Actions`**（保存后首次 Action 会自动运行，几分钟内发布完成）。
4. **访问地址**：`https://<你的用户名>.github.io/<你的仓库名>/`（PWA 可添加到主屏幕）。
5. **发布 APK**：本地按「方式三」打包出 `MindSpeak-Android-v1.1.0.apk`，到仓库 **Releases → Create a new release**，`Tag` 填 `v1.1.0`，把 APK 拖入附件上传（APK 不入库，通过 Release 分发），发布后手机上直接用上方的 Release 下载链接。后续每次升版本改个好记的 Tag（如 `v1.2.0`）即可。

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
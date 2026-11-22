# 闻道 MindSpeak · 缺陷与性能审查报告

- 审查日期：2026-11-22
- 审查范围：`js/`（26 个前端脚本，约 15.8k 行）、`server/`（5 个后端脚本，约 1.2k 行）、`index.html`、`sw.js`
- 方法：全量源码通读 + 真实浏览器（Edge headless + CDP）行为验证 + 服务端实测（curl/Node 探针）
- 基线：`npx vitest run` → 98 文件 / 975 用例全绿（首次运行出现 1 个 forks worker 超时，单独重跑 `tests/tts/voice-native-bypass.test.js` 通过，属已知环境抖动）

> 结论：架构与防御性编码整体扎实（Host 白名单、静态白名单、备份深度清洗、TTS 降级链、事件驱动刷新都已到位）。
> 但存在 **2 个"功能整块不可用"级缺陷**（阅读答题、Piper 离线音）与 **4 个必现的逻辑/边界错误**，
> 其中 3 项已用真实浏览器或服务端实测复现，非推测。

## 修复记录（2026-11-22，本次已改并逐条验收）

| 编号 | 问题 | 状态 | 验收方式 |
|---|---|---|---|
| P0-1 | 阅读答题按钮被 CSP 拦死 | ✅ 已修 | 真实浏览器点击 6/6；新增 `tests/core/reading-answer.test.js`(5) + CSP 守卫 |
| P0-2 | Piper 二进制路径 / `execFile input` | ✅ 已修 | 端到端合成 200 / 51872 字节 / 0.74s；二次命中缓存 3ms |
| P1-1 | 精选模式取词错位 | ✅ 已修 | `tests/core/word-selected-pool.test.js`(6)，且用旧实现验证会失败 |
| P1-2 | 长文本朗读必失败 | ✅ 已修 | 浏览器 1213 字符 → 3 块(460/422/328)，无失败提示 |
| P1-3 | 深色系统首帧闪白 | ✅ 已修 | 属性时间线 `null@8ms → dark@14ms`，不再出现 system |
| P1-4 | 下拉刷新判据恒真 | ✅ 已修 | 真实浏览器：中部下拉无指示器、顶部下拉有 |
| P2-2 | 朗读 `<audio>` 节点累积 | ✅ 已修 | 连读 5 次后 body 内 audio 节点数 = 0（修前 3 次即 3 个） |
| P2-3 | 预合成队列/去重表无上限、并发翻倍 | ✅ 已修 | `tests/core/p2-hardening.test.js`：两次翻卡仍只 2 路并发 |
| P2-4 | 通知点击深链是死代码 | ✅ 已修 | 注册 `localNotificationActionPerformed`，跳转走 `app.showTab` |
| P2-5 | 每日计划不防脏数据 | ✅ 已修 | null/字符串条目下 render 不抛错 |
| P2-6 | 测评等待无限自递归 | ✅ 已修 | 改用 `Loading.awaitLibrary`（15s 超时），close 可取消 |
| P2-7 | 测试守卫只扫 `index.html`，JS 里的内联事件漏网 | ✅ 已修 | `no-inline-script` 扩到扫 `js/**/*.js`；`head-boot-theme` 用真实源码锁首帧主题 |
| P2-9 | `resetData` 清理不全 | ✅ 已修 | 补 8 个键 + `ms_daily_reminder_sent_*` 动态键 |
| P2-10 | 路由异常落到 HTML 错误页 | ✅ 已修 | 注入抛错路由实测：`500 application/json`，堆栈只进日志 |
| P2-1 | gzip 每次全量重压 + 大文件每次重传 | ✅ 已修 | 内容哈希缓存：二次请求 0.161s→0.025s；data/assets 改 `no-cache`+ETag，条件请求 **304 / 0 字节 / 2.8ms** |
| P2-8 | dev server 上 SW 因缺 `js/bundle.js` 装不上 | ✅ 已修 | install 改逐个缓存（缺谁跳谁）；实测激活、缓存 17 项、仅跳过 bundle.js |
| P2-11 | 首屏手势解锁白下 60MB 离线音（本次新发现） | ✅ 已修 | 空白文本不再触发离线兜底 |
| P3-1 | AI 请求体超 500 被整条拒（LLM 静默失效） | ✅ 已修 | 按"正文 + 概况"总长留预算截断；测试断言 ≤500 且 body ≤2048 |
| P3-2 | AI「正在输入」气泡压在答复上方 | ✅ 已修 | 答复落地后再把占位搬到末尾；反向验证旧实现会失败 |
| P3-3 | `getDefaultGrammar` 改写全局 `GRAMMAR_DATA` | ✅ 已修 | 改为返回副本（`slice()`），读接口不再污染数据集 |
| P3-4 | 积分/等级内存值可超读取层封顶 | ✅ 已修 | points≤999999、level≤99，与 `UserState.get` 同口径 |
| P3-5 | `frame-ancestors` 写在 meta 无效且刷日志 | ✅ 已修 | 从 meta 移除；服务端下发 `X-Frame-Options: SAMEORIGIN`；控制台无警告 |
| P3-6 | 纯设置备份被判"格式错误" | ✅ 已修 | 校验放宽为"至少含一个已知备份字段" |

未修（留待决策）：无。P2-8 已按"缺谁跳谁"处理，不需要再决定 dev 是否注册 SW。

### 本次新增的回归测试（+5 文件 / +29 用例）

`tests/core/reading-answer.test.js`、`word-selected-pool.test.js`、`tts-longtext.test.js`、
`head-boot-theme.test.js`、`pull-refresh.test.js`、`p2-hardening.test.js`；
`tests/core/no-inline-script.test.js` 扩展为扫描 `js/**/*.js` 的内联事件；
`tests/tts/piper-tts.test.js` 增加 4 条服务端实现约束。

全量基线：**103 文件 / 1004 用例全绿**（原 98 / 975）。

---

## P0 · 功能整块不可用

### P0-1 阅读训练：答题按钮全部无响应（CSP 拦截内联事件）

- **位置**：`js/app.js:3822`（`ReadingModule.loadArticle` 生成的选项按钮带 `onclick="window.app.readingModule.checkAnswer(...)"`）
- **触发条件**：任意用户进入「阅读」页 → 选文章 → 点任意选项按钮
- **实测证据**（Edge + CDP，真实页面）：
  - 控制台：`Executing inline event handler violates the following Content Security Policy directive 'script-src 'self''. The action has been blocked.`
  - 点击后：`disabled=0, marked=0, total=8`（若 `checkAnswer` 执行，本题 4 个按钮会被 `disabled` 并加 `btn-correct/btn-wrong`）
- **影响范围**：阅读理解**无法作答、无法判分、答错不进错题本、不计积分/签到、不计每日挑战**；该模块目前只剩"读文章 + 显示答案"。`index.html` 的 CSP 无 `unsafe-inline`，因此 100% 必现。
- **根因**：CSP 收紧时只清理了 `index.html` 的内联脚本，漏掉了由 JS `innerHTML` 拼接出来的内联事件属性。
- **修复**：
  1. 生成按钮时改为 `data-q="i" data-opt="j"`，在 `#r-questions` 上做一次事件委托调用 `checkAnswer(i, j, btn)`；
  2. 删除 `onclick`；
  3. 给 `tests/core/no-inline-script.test.js` 增加一条守卫：扫描 `js/**/*.js` 里出现在字符串模板中的 `\son[a-z]+\s*=`（排除 `onstart/onend/onerror` 这类赋值），防止再次绕过。
- **验证**：进入阅读页点选项 → 按钮变灰、正确答案高亮、Toast "正确/错误"、错题本 +1；控制台无 CSP 报错。

### P0-2 内置/本地 Piper 语音永久不可用，且每次请求重复下载 20MB

- **位置**：`server/server.js:348`（`PIPER_BIN`）、`:403-436`（`ensurePiperBinary`）、`:500-502`（`execFile`）
- **实测证据**（本机文件系统）：
  - 实际解压结果：`~/.local/share/mindspeak-piper/piper/piper.exe`（38MB，含 dll）
  - 代码期望路径：`~/.local/share/mindspeak-piper/piper.exe`（少一层目录）
  - 因此 `fs.existsSync(PIPER_BIN)` 恒为 false → **每次请求都重新下载并解压 20MB zip**，随后 `execFile` 打不存在的路径 → ENOENT → 502。
- **配对缺陷（修好路径后会立刻暴露）**：`execFile(PIPER_BIN, [...], { input: text })` —— `child_process.execFile` **不支持 `input` 选项**（那是 `execFileSync` 的）。实测：带 `input` 的 `execFile` 子进程 stdin 永不收到数据也不关闭，直到 timeout（4s 测试即 4041ms 超时）。Piper CLI 从 stdin 读文本，所以会稳定 30s 超时后 502。
- **影响范围**：设置页「本地离线 · Piper 美音/英音」（`__local_piper_*`）三个音色全部失效；`/api/piper-tts` 每次请求产生 20MB 出网流量 + 解压开销。
- **修复**：
  1. `PIPER_BIN = path.join(PIPER_DIR, 'piper', 'piper' + suffix)`；解压后做一次"找 exe"兜底（`piper/piper.exe` 或根目录）；
  2. `ensurePiperBinary()` 返回 false 时**必须中止**，不要继续执行 `execFile`；
  3. 改用 `spawn` + 写 stdin 再 `end()`（或 `execFileSync(...,{input})`），并保留 30s 超时；
  4. 给 `finish()` 加 `done` 守卫（现在 45s 定时器与成功路径可能各调一次）。
- **验证**：删掉 `~/.local/share/mindspeak-piper/piper` 后请求 `/api/piper-tts?text=hello` → 首次下载解压、返回 `audio/wav` 且字节数 >40k；二次请求 <300ms；日志无 ENOENT。

---

## P1 · 必现的逻辑/边界错误

### P1-1 「精选学习」模式下，朗读/收藏/加错词/主动回忆取错单词

- **位置**：`js/app.js:3081`（`speakCurrent`）、`:3108`（`favoriteCurrent`）、`:3089`（`_syncFavBtn`）、`:3331`（`currentReviewCount`）、`:3073`（`flipCard`→`triggerRecall`）、`js/android-ui-init.js:273`
- **根因**：这些位置用 `getCurrentWords()[currentIndex]`（**未过滤的全量分类池**），而卡片渲染用 `getCardWords()`（精选池已过滤）。两个池下标语义不同。
- **实测证据**：设 `selected_words_<ci> = [第 2 个词]`、`learnSelectedOnly = true`、`currentIndex = 0` 后：
  - 卡片显示：`shownWord === cardPoolFirst` ✅
  - 但 `shownWord !== fullPoolFirst`（朗读/收藏会取到全量池第 1 个词）❌
- **影响**：开了"只学精选词"后，点朗读听到的是别的词、点收藏收藏错词、长按"加入错词本"记错词、主动回忆考错词——数据被写脏且用户难以察觉。
- **修复**：以上 6 处统一改为 `this.getCardWords()`；`triggerRecall(currentWord)` 的入参也改传精选池当前词。建议抽一个 `_currentCardWord()` 作为唯一取词入口。
- **验证**：开精选（只勾 1 个词）→ 卡片词 == 朗读日志里的词 == 收藏项 == 错题项。

### P1-2 长文本朗读必失败（>500 字符）

- **位置**：`server/server.js:218`（`/api/tts` 拒绝 >500）、`js/app.js:934`（`_speakLocal`）、`:1003`（`_speakGoogleTTS`）
- **实测**：600 字符请求 `/api/tts` → `http=400 {"ok":false,"message":"text too long or empty"}`
- **触发条件**：选中「本地男声/女声（SAPI）」或「在线自然女声（Google）」时朗读 >500（Google 侧约 >200）字符的整段文本，例如 AI 回答的"朗读"、阅读长段、例句拼接。
- **影响**：请求 400/被上游拒 → 触发降级链 → 最终弹"朗读失败"，长文本在这些音色下完全读不出来。`_speakRemoteFallback` 已用 `_chunkRemoteText(…,170)` 分块，但这两条路径没有复用。
- **修复**：在 `_speakLocal` / `_speakGoogleTTS` 入口复用 `_chunkRemoteText`（本地 500 → 建议 400 一块；Google 180 一块），用 `onend` 串行接力，并保留 `_waSeq` 代次守卫以支持"再点一次=停止"。
- **验证**：选 Google 音色朗读 800 字符 → 分 5 块连续出声、无 Toast 报错；中途再点一次立即停止。

### P1-3 深色系统下首帧闪白（约 180ms）

- **位置**：`js/head-boot.js:44-48`
- **根因**：`localStorage.getItem('theme')` 取到 `'system'`（这是 app.js 的默认值）后**原样**写进 `data-theme`；而 CSS 里没有 `[data-theme="system"]` 规则，也没有 `prefers-color-scheme` 媒体查询 → 首帧按默认亮色渲染。
- **实测**（`Emulation.setEmulatedMedia` 强制深色 + 记录属性变化时间线）：
  `t=11ms data-theme=null → t=21ms "system" → t=199ms "dark"`
- **影响**：所有"跟随系统"用户（默认设置）在深色系统下每次冷启动闪白一次；`mobile.css:550` 已明确移除 `prefers-color-scheme`，所以没有任何兜底。
- **修复**：head-boot 里解析三态——`light/dark` 直接用；`system` 或空值用 `matchMedia('(prefers-color-scheme: dark)')` 求值后再写 `data-theme`（并把用户原始选择单独存到 `data-theme-mode` 供 app.js 读取）。
- **验证**：深色系统 + `theme=system`，首帧属性即为 `dark`，无白色闪现（录屏或 trace 时间线）。

### P1-4 Android 下拉刷新判据失效：任意滚动位置都会触发

- **位置**：`js/android-ui-init.js:96`（`if (window.scrollY === 0)`）
- **实测**：`#main-content` 是唯一滚动容器，`scrollTop=400` 时 `window.scrollY` 仍为 `0` → 判据恒真。
- **影响**：词库页滚到中间时下拉也会触发"刷新"（`showTab('word')` 会复位滚动并重渲染），表现为"列表莫名回到顶部"。
- **修复**：改用 `document.getElementById('main-content').scrollTop === 0`（或用 `e.target.closest('.content')` 的 scrollTop），并在 touchmove 时同步检查。
- **验证**：滚到中部下拉 → 指示器不出现、页面不跳顶；滚到顶部下拉 → 正常触发。

---

## P2 · 可靠性 / 资源 / 性能

> 下表是**发现时的原始记录**（保留现场，便于回溯为什么这么改）。各项均已于 2026-11-22 处理，
> 逐条验收见上方「修复记录」表；P2-7 的测试盲区也已一并补上。唯一仍可选的是给 `data/`
> 加内容指纹后做长期缓存（当前为 `no-cache` + ETag 协商，命中即 304）。

| # | 问题 | 位置 | 证据 | 影响与修复要点 |
|---|---|---|---|---|
| P2-1 | 服务端 gzip 全量缓冲，9.9MB 数据脚本每次请求重压 | `server/server.js:878-906` | 实测：`/data/all-data.js` gzip 0.257s/2.41MB，未压缩 0.035s/9.89MB；`Cache-Control: no-store` | 本机/桌面每次刷新多付 ~220ms CPU + 约 12MB 峰值内存（body+gz 各一份）。建议：>2MB 直接不压（局域网另议）、或构建期预生成 `.gz` 按 mtime 复用、或改流式 `zlib.createGzip()` 不整体缓冲 |
| P2-2 | 在线/远程朗读不回收 `<audio>` 节点 | `app.js:910`（`_stopLocalAudio`）、`:1003`、`:1222` | 实测：连点 3 次 `_speakGoogleTTS` 后 `document.body` 里残留 3 个 audio | `_stopLocalAudio` 只 `pause()+src=''`，不 `_detachAudioEl`；并行抢播的败者同理。长会话 DOM 持续增长。修复：两处统一走 `_detachAudioEl` |
| P2-3 | 朗读预合成队列与去重表无上限 | `app.js:1676-1704` | `_prefetchPool` / `_prefetchSeen` 只增不减；HEAD 不计入限流 | 快速翻卡时每词排一个 HEAD，服务端每个 HEAD 起一个 PowerShell 合成进程（实测单次 0.5–1.5s）→ 低端机 CPU/磁盘尖峰。建议：队列上限 8、`_prefetchSeen` 用 LRU 或按分类清空 |
| P2-4 | 通知点击深链是死代码 | `js/notification-manager.js:275-281` | 全仓无 `localNotificationActionPerformed` 监听；`window.App.switchTab` 不存在（只有 `App.prototype.showTab`） | 点通知只打开 App、不跳页。修复：注册 `LocalNotifications.addListener('localNotificationActionPerformed', …)` 并调用 `window.app.showTab(module)`（把 `handleNotificationData` 一并修正） |
| P2-5 | 每日计划渲染不防脏数据 | `js/daily-plan.js:34-44` | `p.firstSeen` 未判空 | `word_progress` 里出现 `null` 值（旧版/手工备份导入）时 `TypeError`，且该异常发生在 `showTab('word')` 主链路上 → 切页中断。修复：`if (!p || typeof p !== 'object') return;` |
| P2-6 | 测评页词库未就绪时无限重试 | `js/assessment.js:432-438` | 800ms 自递归、无超时上限 | 词库文件缺失时按钮永久转圈 + 定时器常驻；`WordModule` 同类逻辑有 15s 超时。修复：复用 `Loading.awaitLibrary`（自带 15s 超时与失败提示） |
| P2-7 | 测试守卫存在盲区（假绿来源） | `tests/core/no-inline-script.test.js:23-26`、`:38` | 只扫 `index.html`；`:38` 把 `localStorage.getItem('theme')` 原始写入断言为"正确行为" | P0-1 与 P1-3 都是这样漏过去的。修复：守卫扩展到 `js/**/*.js`；主题断言改为"必须解析三态" |
| P2-8 | dev server 上 SW 注册必然失败 | `sw.js:18` + `js/head-boot.js:108-113` | `APP_SHELL` 含仅 `dist/` 才存在的 `js/bundle.js`；根目录无此文件 | `cache.addAll` 404 → install 失败（无提示），本地无法验证离线缓存。修复：按环境注入清单，或对 `bundle.js` 缺失时跳过 |
| P2-9 | `resetData` 清理不完整 | `js/app.js:7804` | 未清 `ai_chat_sessions`、`ai_assistant_settings`、`onboarding_seen`、`daily_reminder_*`、`speak_sessions` | "重置所有学习进度"后 AI 历史/设置仍在、引导不再自动弹。修复：补入清单（会话键与引导 seen 需一并清） |
| P2-10 | 下游异常拿不到 JSON 错误处理器 | `server/server.js:31-37` | 4 参错误中间件注册在路由**之前** | 只有 body 解析错误会命中；后续中间件/路由抛错仍走 Express 默认 HTML（非 production 含堆栈）。修复：在 404 前再注册一个 JSON 错误处理器 |

## P3 · 低危 / 一致性（均已于 2026-11-22 修复）

- `✅` AI 请求体超限：服务端单条 content ≤500，客户端旧实现先截 400 再拼 ~120 字学习概况 →
  正文稍长整条被拒、LLM 静默失效。现按"正文 + 概况"总长留预算截断（`js/ai-chat.js`）。
- `✅` 「正在输入」占位压在规则答复上方：`_llmAppend` 在 `_handle` 期间先插入占位，
  答复后插入 → 语义颠倒。现答复落地后把占位搬到末尾，LLM 返回再移除。
- `✅` `frame-ancestors` 写在 `<meta>` 无效且每次加载产生 CSP 警告（经 logger 写进 app.log）：
  已从 meta 移除，改由服务端下发 `X-Frame-Options: SAMEORIGIN`。
- `✅` `DataStore.getDefaultGrammar()` 直接 `push` 到全局 `GRAMMAR_DATA`：改为返回副本。
- `✅` `GamificationSystem.addPoints` 与 `UserState.get` 的封顶口径不一致（Lv.10000 vs 99）：已对齐。
- `✅` `importData` 仅当含 `wordProgress/mistakes/favorites` 才导入，纯设置备份被判格式错误：
  校验放宽为"至少包含一个已知备份字段"。
- `⬜` Google 合成失败不区分"超长"与"网络失败"，文案统一为「朗读失败」——纯文案优化，未改。

---

## 建议的修复顺序（已完成）

1. ~~P0-1~~ → 2. ~~P0-2~~ → 3. ~~P1-1、P1-2~~ → 4. ~~P1-3、P1-4~~ → 5. ~~测试守卫（P2 系列同批）~~ → 6. ~~P2 其余 + P3~~
全部落实，验收证据见上方「修复记录」表。

## 尚需真机确认的部分

- **P2-4 通知深链**：监听已注册、`app.showTab` 已修正，但需在装配
  `@capacitor/local-notifications` 的 APK 上点一次通知确认跳转（浏览器里只能用假插件验调用链）。
- **P1-4 下拉刷新**：已在真实 Chromium + 触摸事件下验证"中部不触发 / 顶部触发"，
  建议在 Android 真机再复核一次手感（阈值 80px、指示器位置）。
- **P0-2 Piper**：本机已完成"已有二进制 + 已有语音包"的端到端合成；
  "首次下载 20MB 包 → 解压 → 自检 → 合成"这段建议在干净目录（换个 `HOME`）跑一次。

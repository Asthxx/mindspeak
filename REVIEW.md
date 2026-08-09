# 英语APP 代码审查报告（defect-first）

审查范围：`index.html`（1148 行）、`js/app.js`（2598 行）、`css/*`（5 个 CSS）、`data/*`（70+ 数据 JS）抽样。
重点：必然崩溃、功能错误、健壮性、安全、性能。按严重程度降序，同类合并。

---

## 🔴 致命 / 功能性彻底失效

### 1. 错题本永远是空的 —— 没有任何模块往 `mistakes` 写数据
- 全代码中 `mistakes` 这个 localStorage key 只在 `MistakeModule.markKnown:1716`、`MistakeModule.clearAll:1723` 里**写入**，纯粹是删/标记。
- 拼写 `SpellingModule.submit:1083`、跟读 `SpeakModule.checkPronunciation:1801`、听力 `ListeningModule.submit:979`、语法 `GrammarModule.submitFill/submitTransform`、语境填空 `ContextModule.submit:1444` ——答错时都只 `this.wrong++`，**没有一处把错题 push 到 `mistakes`**。
- **后果**：错题本始终空白；错词强化训练（依赖 `mistakes`）永远跳"暂无错题"；错题本导出按钮虽有绑定（`exportMistakes`），但导出来永远是空 CSV。

### 2. 游戏化积分和每日挑战从未被推进
- `GamificationSystem.recordActivity` 定义于 `app.js:1918`，全代码**0 次调用**。用户答题、背词、做练习都不触发积分。
- `DailyChallenge.updateProgress` 定义于 `app.js:1986`，全代码**0 次调用**。任何模块完成后都不会通知每日挑战。
- `GamificationSystem.addPoints:1910` 中 `this.data.streak` 也从来没自增过，永远是初始化时的 `0`。
- `App.updateGlobalStats:2566` 用 `gami.streak`（永远是 0）显示顶栏"连续打卡 X 天"，但 `AnalysisModule.render:2107` 里自己计算 streak —— **同一个"连续打卡"在两处数字不一致**。
- **后果**：等级、积分、连续打卡数（顶栏）、每日挑战进度都无法增长。整个游戏化系统的 UI 是"摆设"。

### 3. 大批设置页按钮根本没绑定 handler
`App.prototype.bindSettings` 只绑了 `btn-save-progress`、`btn-export-data`、`btn-import-data`、`btn-reset-data`、`btn-save-goal`。下列按钮在 HTML 里存在，**JS 中零绑定**：
| 按钮 id | HTML 行 | 期望行为 | 实际 |
|---|---|---|---|
| `btn-export-fav` | 930 | 调 `exportFavorites()` | 点击无反应 |
| `btn-export-mistakes` | 931 | 调 `exportMistakes()` | 点击无反应 |
| `btn-share-card` | 963 | 调 `generateShareCard()` | 点击无反应 |
| `btn-download-card` | 966 | 调 `downloadShareCard()` | 点击无反应 |
| `toggle-active-recall` | 941 | 切主动回忆模式 | 无任何模式逻辑实现 |
- `generateShareCard` / `downloadShareCard` / `exportFavorites` / `exportMistakes` 是 `App.prototype` 上的死代码。

### 4. 主动回忆弹窗完全没接上
- HTML `index.html:1108` 有 `modal-recall` 弹窗，里面有 `recall-input` / `btn-recall-check` / `btn-recall-show` / `recall-meaning` / `recall-result` 等 id。
- `app.js` 中**没有任何 `safeBind('btn-recall-*', ...)`，也没有任何模块会显示这个弹窗**。
- 唯一相关的事件只有 `index.html:1110` 那张破图（见下条）。
- **后果**：弹窗是死的；用户切到任何模块都不会触发主动回忆，即使勾了设置里的"主动回忆模式"也没用。

### 5. SVG 引用 `#i-psychology` 在 sprite 里没有定义
- `index.html:1110` 用 `<use href="#i-psychology"/>`。
- 但 SVG sprite（`index.html:24-62`）里只定义了 `i-book / i-trophy / i-diamond / i-fire / i-check / i-translate / i-spellcheck / i-error / i-mic / i-edit / i-article / i-headphones / i-text / i-timer / i-bookmark / i-bookmark-add / i-search / i-settings / i-volume / i-add / i-chart / i-carousel / i-list / i-thumb-down / i-help / i-thumb-up / i-flip / i-quiz / i-analytics / i-calendar / i-save / i-upload / i-download / i-delete / i-sparkle / i-play / i-refresh`。
- **后果**：主动回忆弹窗标题前是一个空白/损坏的 SVG placeholder（即便弹窗接通了也破）。

---

## 🟠 功能错误（会跑但行为错）

### 6. 跟读练习：单例 SpeechRecognition 不能连点
- `SpeakModule.startRecord:1784` 每次点"开始跟读"都 `new SpeechRecognition()` 并 `.start()`。
- 上一次没有 `.stop()` 或处理 `onend`，重复点会让浏览器报"Recognition has already started"。
- `this.recognition` 也作为实例属性直接覆盖，旧实例的事件回调可能引用 `self.words[this.currentIndex]`，而 `currentIndex` 已经 `next()` 走了 —— 表现就是答错显示成下一题的词。

### 7. 听力"句子模式"用 `new RegExp(w.word, 'gi')` 存在注入与正则元字符问题
- `ListeningModule.showQuestion:964`、`ContextModule.start:1421` 都直接拿单词去构造 RegExp。
- 若词库中存在 `word: "I"` 或 `"?"` 等含正则元字符的条目，会抛 `SyntaxError`（"I" 还匹配不到，"?" 直接崩），整道题/整个模块卡住。
- 词库是 IIFE push 写入的，无法保证无特殊字符。

### 8. `closeAnswer` 在阅读理解、PK 等里靠 `querySelectorAll('.btn')` 取全部按钮，会被其他同级按钮污染
- `ReadingModule.checkAnswer:908`：`btn.parentElement.querySelectorAll('.btn')`，但阅读题的选项 `button` 是用 `<button class="btn btn-sm">` 渲染的（`app.js:898`）。
- 如果某题选项超过 4 个，或者后续 CSS 改了让 button 套了别的 `.btn` 子元素，会按错索引 disable。
- 不致命但很脆。

### 9. PK 结束逻辑不严谨
- `PKModule.endGame:1383` 既可能由 `timeLeft<=0` 触发，也可能由 `currentIndex>=words.length` 触发。
- 计时器在 `endGame` 里被 `clearInterval` —— OK，但 `startGame` 第二次被调用时如果上一次没结束（理论上不会，但 `startTimer` 前已 `if(this.timer) clearInterval(this.timer)`）—— 边界 OK，但如果用户中途切到别的 tab 造成 `setInterval` 节流到 1Hz 以下，倒计时和实际剩余秒数会偏。
- 真正的问题：`PKModule.startGame:1318` 设了 `timeLeft=60` 硬编码，**没有读取任何配置**。HTML 里写的也是 60，但若以后想改时长，得改两个地方。

### 10. `markWord('known')` 用错"本次"还是"下次"的 reviewCount
- `app.js:667`：`prog.nextReview = DataStore.getNextReview(key, prog.reviewCount);`（用**当前**计数算下次间隔），然后第 668 行才 `prog.reviewCount++`。
- 而 `DataStore.getNextReview` 里 `idx = Math.min(reviewCount, intervals.length-1)`。
- 也就是说，第一次答对 → `reviewCount`=0 → idx=0 → 1 天后复习 → 然后 `reviewCount` 变 1。这逻辑本身没错，但与 ring 显示的"阶段 reviewCount/8"**差一格感觉**：刚答第一题时 ring 是 `1/8`但下次复习在"1 天后"（间隔对应阶段 0，AI 英文 Coach 的艾宾浩斯表第 1 次复习也是 1 天）。**这块其实是对的**，但 ring 在 `showCurrentWord:626` 里用 `reviewCount/8*100` 画进度，答完 8 次刚好填满，但 `pct` 可能是 `NaN`（如果是 `0/8*100 = 0` 没问题；但 `reviewCount/8*100` 当 `reviewCount` 是 undefined 时是 `NaN`，会画出 `<svg style="stroke-dasharray: NaN, 100">` —— 浏览器会忽略，ring 显示空白）。
- 触发条件：词在 `wordProgress` 里但意外没 `reviewCount` 字段（如导入坏数据时）。建议 `prog.reviewCount || 0`。

---

## 🟡 健壮性 / 资源泄漏

### 11. 50+ 个 `<script defer>` 加载失败全靠"读取时返回 []"兜底
- `DataStore.getDefaultWords` 返回 `typeof WORD_LIBRARY !== 'undefined' ? WORD_LIBRARY : {categories: []}` —— 良好。
- 但 `WORD_LIBRARY` 本身定义在 `words-data.js`（420KB），如果这个文件因网络/代理/CSP 失败，后面所有扩充 IIFE 即使加载了也都 `if(typeof WORD_LIBRARY==="undefined") return`，**全部数据丢失但没有任何 UI 提示**，用户看到"加载中..."的 select 一直挂着，且报错只在 console。
- 建议至少在 `populateCategories` 里检测 `categories.length===0` 时 Toast.error 提示数据加载失败。

### 12. localStorage 没有配额保护，自定义背景能直接撑爆
- `Storage.setJSON` 已经有 try/catch 静默失败，不会崩。
- 但 `applyCustomBg` 把整张 5MB 图片的 dataURL 存进 `custom_bg` 这个 key —— 实际上大多数浏览器 localStorage 上限 5-10MB，再加上 `favorites` / `word_progress` / `checkins` / `mistakes` 等业务数据，单 hit 配额概率很高。
- 存满后，再点"保存学习进度"会**静默失败**（`setItem` 抛错被吞），用户体验为"我点了保存但没反应"。

### 13. 并发 tab 不监听 `storage` 事件，进度会被覆盖
- 两个 tab 同时开：A 在背词（写入 `word_progress`），B 也写自己的 `word_progress`，最后保存的覆盖先保存的。
- 没有任何 `window.addEventListener('storage', ...)`。多 tab 学习时数据会丢。

### 14. `confirm()`/`alert()` 在 CSP 与移动端会导致无 UI 反馈
- 多处用 `confirm('确定清空？')`：`FavoritesModule.clearAll:1625`、`MistakeModule.clearAll:1722`、`App.resetData:2307`、`PomodoroModule.initUI:1495`。
- 在某些 Webview（尤其微信、企业 IM 内嵌）`confirm` 直接返回 false 或卡死，用户点清空也没反应。

### 15. `SpeechUtil.speak` 全局 cancel，多模块互相打断
- `SpeechUtil.speak:53` 每次都 `window.speechSynthesis.cancel()`，意味着用户在背单词页听朗读时，如果切到听力页开始训练，前者会被立即打断（OK），但如果用户同时打开了"例句朗读"和其他按钮，后点的会取消前面的 —— 这是设计选择。更严重的是 `speechSynthesis` **没在用户手势里触发就直接 speak**：iOS Safari 要求必须在用户手势上下文里 speak，听力训练因为是在 `showQuestion` 里自动 `this.playAudio()`（非直接 click handler 内）→ iOS 上**听不到声音**。
- 影响：iOS Safari 用户听力训练第一次播放不出声。

---

## ⚪ 代码质量 / 可维护性

### 16. CSP 不够紧
- `index.html:7` 当前：`default-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' data: blob:`
- 没设 `connect-src` / `media-src` / `style-src`，所以它们回落到 `default-src 'self' 'unsafe-inline'` —— 没问题，但 `unsafe-inline` 在 script 里意味着任何 innerHTML 注入的 `<script>` 都会被执行。
- 好消息：所有用 `innerHTML` 拼 DOM 的地方，对**用户来源数据**（搜索单词、收藏、错题、PK 选项、阅读题）都走了 `escapeHtml`（`app.js:10`），这部分很到位。
- 但仍有几处**未 escape 的 innerHTML**：
  - `app.js:1170` 搜索单词结果的 `'<div class="search-count">找到 ' + results.length + ' 个结果</div>'` —— `results.length` 是 number 没问题。
  - `app.js:2153` `<li>' + t + '</li>` —— `t` 是硬编码 tips 字符串，安全。
  - `app.js:898` 阅读题选项拼接的 `onclick="window.app.readingModule.checkAnswer(' + i + ',' + j + ',this)"` —— `i`/`j` 是序号，安全。
  - `app.js:1600` 收藏朗读按钮：`onclick="SpeechUtil.speakWord(\'' + escapeHtml(f.word) + '\')"` —— 已 escape。
  - `app.js:2406` 自定义背景：`style.backgroundImage = 'url(' + bgData + ')'`，`bgData` 是 FileReader 生成的 dataURL —— 安全，但**没有长度上限校验**（实际 `file.size>5MB` 已拦，OK）。
- **结论**：当前 XSS 风险低，作者很注意。但 CSP 仍可收紧为 `script-src 'self'`，把 `index.html:14-20` 内联 theme-init 脚本提取到 `js/` 文件里。

### 17. 60+ 个 `words-expand*.js` 是完全等价的模板代码
- 文件 `words-expand17.js` ~ `words-expand41.js` 大小都恰好是 18384 / 18387 字节，结构作为 IIFE 完全相同，只是 push 到 `WORD_LIBRARY.categories[i]` 不同 index、数据不同。
- 每个文件开头都有 `console.log("S... added: "+added+", total: "+cat.words.length)` —— 加载完 50 个，console 50 条噪音。
- 真正的问题：加载 50 个小文件，**HTTP/1.1 下每个都是单独请求**，50 个 RTT，首页白屏时间显著拉长（即便 defer 也阻塞解析时机）。建议合并成 1-3 个大文件，或服务器开 HTTP/2 推送。

### 18. `safeBind` 与直接 `addEventListener` 并存，无统一约束
- 作者用 `safeBind` 防御元素不存在，但很多地方直接 `document.getElementById(...).addEventListener(...)`、或 `document.querySelectorAll(...).forEach(addEventListener)`，这些地方都假设元素一定存在。
- 例：`WordModule.bindEvents:489` 的 `document.querySelectorAll('.filter-btn')`，若 `wordlist.css` 加载失败导致 filter 按钮变成 display:none，filter 仍能点击；若 HTML 被改删了 `.filter-btn`，querySelectorAll 返回空 NodeList，forEach 静默无操作 —— OK。但若 `.card-area` 被删，`switchView:503` `document.querySelector('.card-area').classList.toggle(...)` 直接抛 `Cannot read property 'classList' of null`，整个 WordModule 初始化失败。
- 建议全部走 `safeBind` / `safeQuery` 的统一风格。

### 19. `==` 与 `===` 混用
- 多处用 `===`（一致、良好），但 `ThemeColor.applyPreset:240` `if (color === 'sage' || this.PRESETS.indexOf(color) === -1)` OK；`Storage.get:70` `v === null` OK；`escapeHtml:11` `str == null` —— 故意放宽兼故 undefined，OK。
- 但 `ThemeColor.applyPreset:240` 把 `'sage'` 又 set 回去当 key 存，且 `setActiveButton:288` 比较 `data-color === color` —— 一致。
- 总体没问题，但 `safeNumber:14` 用 `val ? val : fallback` 在 `val==='0'` 时会错（实际 `parseInt('0')` 是 0，`0 || fallback` 会回落 fallback），PK 题库选择 0 时正确取到 0 vs 走 fallback —— 这里**隐含 bug：PKModule.startGame:1308** `parseInt(value)` 若用户选了第一项（value='0'），`safeNumber('0', 0)` 返回 0，OK。同函数其它地方 `catIdx` 没走 safeNumber：`ListeningModule.start:947` `parseInt(...)` 返回 NaN 时 `if(catIdx >= cats.length) return` —— NaN≥length 是 false，不 return，`cats[NaN]` undefined → `.words.slice()` 抛 TypeError，整个听力训练挂掉。**真 bug**，建议都走 safeNumber。

### 20. 备份目录在主目录里
- `O:\工作\英语APP\英语APP备份_20260727_151355\` 与 `...\154627\` 包含一份完整代码副本（共 100+ 文件副本，几 MB），放在交付目录里。
- 不是 bug，但 Live Server / GitHub Pages 会把它们一起暴露出去；而且 `data/` 下的 expand*.js 在备份里和主目录里**同名不同内容**可能引起混淆。
- 建议把备份挪到 `O:\工作\_backup\英语APP\` 或干脆打包成 zip 单独放。

---

## 总体结论

**能跑**，作者在工具层（`safeBind`、`Storage` 包装、`escapeHtml`、模块 try/catch 包在 App.init）相当克制，单页肯清基本架构没问题。

**最大风险点（按修起来代价由高到低）**：
1. 🔴 **错题本 + 游戏化系统整套失效**：错题本从不写入、积分从不增加、每日挑战从不推进、主动回忆弹窗是死的、设置页一半按钮没绑 —— 这是一组关联缺陷，本质是"这些模块的连接线"没写完。如果用户期待这些功能可用，会立刻发现"为什么我背了一堆词等级还是 Lv.1"。
2. 🟠 **`new RegExp(w.word)` 正则注入** + **Apple iOS speech 不在手势内** —— 两个隐藏崩溃/无声 bug，触发面广。
3. 🟡 **5MB 自定义背景压爆 localStorage** 让"保存进度"静默失败 —— 长期用户的数据安全。
4. ⚪ **50+ expand.js 全是单独请求 + 50 条 console.log** —— 首屏性能 + 控制台噪音。

建议按 #1 → #2 → #3 顺序修。报告完。

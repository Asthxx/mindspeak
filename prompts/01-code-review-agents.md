# 1/3 多 Agent 并行代码审查

**Target:** Claude Code (builder agent)

## Objective
用多 Agent 并行任务对闻道 MindSpeak 做**全量代码审查**，找出：① 功能 bug（含潜在触发条件）② 屎山代码（坏味道/架构债/重复/死代码/隐患）。每个 Agent 必须挂载对应 Skill 并基于证据输出，禁止"感觉上像"的猜测。

## Context (carry forward)
- 项目：O:\工作\英语软件，vanilla JS PWA（约 20+ 个 js 模块 + server/server.js 658行 + css/theme-fx.css 586行 + tests/ 35文件291测试）
- 技术栈：无框架（var/IIFE/window.*），localStorage 数据层，Node express 后端，vitest 测试
- 我的可用 Skill 库（~/.config/opencode/skills/，审查必须挂载）：
  - understand / understand-explain：代码库结构关系与深挖
  - dispatching-parallel-agents：多任务并行编排（本任务是它的主场）
  - security-audit：服务端/注入类审查
  - systematic-debugging：疑似 bug 的证据化验证（不是看着猜）
  - verification-before-completion：每条结论必须验证后才算数
  - requesting-code-review：高影响区域复核
- 审查底薪（不可动摇）：localStorage 向后兼容、单词掌握判定、日期字符串 YYYY-MM-DD 格式、"单词-序号" key 正则解析

## Phase 0 — 挂载 understand 建立全景（主 Agent 亲自做，1 步）
1. 用 `skill` 工具加载 understand，产出代码库依赖图：模块清单、各模块入口、跨模块调用线（window.* 全局委托、EventBus、UserState）
2. 输出一份《架构基线》供 5 个审查 Agent 共用（避免重复探索、口径一致）

## Phase 1 — 用 dispatching-parallel-agents 并行派发 5 个审查 Agent
加载 `dispatching-parallel-agents` 技能遵其编排。**并行派发**以下 5 个 Agent（互相无共享状态）：

### Agent 1 — 前端交互层（重点关注）
- 范围：window.app、导航/标签、模态框、Toast、onboarding、设置页
- 审查点：全局委托事件引用悬空、重复绑定、DOM 泄漏（removeEventListener 缺失）、tab 切换时悬浮状态污染、双击竞态、事件目标 instanceof 判断遗漏 Navigation 根容器
- Skill：systematic-debugging（每条疑似 bug 给出复现路径）

### Agent 2 — 学习核心闭环（重点关注）
- 范围：word/spelling/phonetics/speak/grammar/reading/listening/pk/context 判定与进度写入
- 审查点：掌握状态误判（大小写/连字符 key 正则）、nextReview 计算边界（闰年/月末）、分数计算除零/NaN、道具作用域泄漏（PK 对局结束未清理）、计时器未清理、事件刷新（EventBus）与节流（300ms）竞态
- Skill：systematic-debugging

### Agent 3 — 数据层（重点关注）
- 范围：DataStore/localStorage/import·export/备份恢复/词库兼容
- 审查点：key 迁移兼容、JSON 解析失败恢复、导出-导入往返丢失、body 容量（localStorage 5MB）、并发写覆盖、旧数据格式升级
- Skill：verification-before-completion（每条数据完整性结论做最小复现验证）

### Agent 4 — 服务端与安全（重点关注）
- 范围：server/server.js 全部端点、CORS/令牌中间件、限流、日志
- 审查点：路径穿越（2026 F1 已修，测同类绕过是否还有其他）、XSS（SSML 注入/日志反射）、SSRF（url 参数）、限流绕过、令牌时序/日志敏感信息泄漏、静态白名单外漏
- Skill：security-audit（按其"可被利用的实质影响"分级，禁止理论口水账）

### Agent 5 — CSS/主题/样式债（中等关注）
- 范围：style.css 全家 + theme-fx.css 8 主题 + 移动端 375px
- 审查点：重复选择器/幽灵样式/性能（transform+filter 层爆炸）、主题变量缺失导致配色错乱、动画常驻 GPU、reduced-motion 缺失、滚动穿透
- Skill：不使用重技能，按代码风格自查 + 用 jsdom 或 grep 抽样验证

### 每个并行 Agent 的强制输出格式
```
模块: <模块名>
[BUG][严重度:P0/P1/P2/P3] <file:line> <现象> -> 复现步骤(或触发条件) -> 修复建议
[SMELL][类型] <file:line> <坏味道描述> -> 建议
[PASS] 审查过且无问题的区域
```
- 严重度口径：P0 可被利用的安全/数据丢失；P1 确定的功能错误；P2 边界条件崩溃/数据损坏隐患；P3 体验/维护性
- 每条结论必须做到：给出精确 file:line（探数据、read 代码确认，不用行数估算）；疑似 bug 至少写明触发条件
- **禁止**报告"代码写得不漂亮的价值观意见"——只报可操作的坏味道（重复 3 处相似逻辑、>300 行函数、多层 if 嵌套可塌陷、魔法数字无注释、隐藏副作用、死代码/字段）

## Phase 2 — 汇总与交叉验证（主 Agent）
1. 5 份报告收齐后，横向去重合并（多处 Agent 报同一根因的只留一条）
2. 交叉验证：跨模块耦合 bug（如 Agent2 报的进度问题在 Agent3 有数据层嫌疑）快速复核
3. 按 P0→P3 排序输出最终《审查报告》：每个发现含 [定位/现象/复现/建议修复/牵涉模块]

## 最终交付物
```
# 闻道 MindSpeak 代码审查报告
- 统计：共 X 发现（P0:n, P1:n, P2:n, P3:n），其中真实 bug n、坏味道 n、安全 n
- 高置信 vs 待验证：每条标注（已复现 / 疑似待复现 / 静态推断）
- 五模块各自 PASS 清单
- 修复优先级建议（哪些该马上修、哪些可缓、哪些重构时机）
- 附：所有发现按 file:line 的清单，可直接转成 TODO
```

## Scope
- 只读审查：只做探索/验证，**不修改任何生产代码**
- 验证手段允许：运行 vitest、起服务 curl、grep 探证据、jsdom 模拟；不允许：改代码、加依赖
- 若验证中发现确定性 bug 需要改代码才能确认：记录为「待修复」，不实施

## Stop Conditions
- 单个 Agent 对某条发现的证据有冲突：停下合并重验，不盲目采纳
- 5 个 Agent 中任 2 个对同一区域的结论矛盾：停下交叉复核后再写报告
- 超出代码库范围（android/ 原生、node_modules、已下线模块）：不审，标注排除原因

## Progress
✅ Phase0 全景图 / ✅ 5 个并行 Agent 完成 / ✅ 合并去重 / ✅ 终稿报告
每条 Agent 收回应：`[Agent N 完成] 发现 X 条 (BUG n / SMELL n)`
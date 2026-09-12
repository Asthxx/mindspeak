# 2/3 按审查报告修复

**Target:** Claude Code (builder agent)

## Objective
按多 Agent 代码审查产出的《审查报告》，逐条修复其中高效置信发现。只修报告里列出的项，按 P0 → P1 → P2 顺序推进；低置信"静态推断"项先复现验证再决定是否修。

## Context (carry forward)
- 项目：闻道 MindSpeak（O:\工作\英语软件），vanilla JS（var/IIFE/window.*），localStorage 数据层，express 后端，vitest（当前 291 测试 / 35 文件）
- 输入：《审查报告》（来自前置审查提示词）含 BUG/SMELL/PASS 三类发现，每条带 file:line + 严重度 + 复现路径
- 本任务基准约束（修复时不可破坏）：
  - localStorage 键名/结构向后兼容；新 key 必须规划迁移
  - 掌握判定 key 格式「单词-序号」用正则 `^(.*)-(\d+)$`（单词本身可含连字符）
  - 日期统一 getLocalDateStr()（YYYY-MM-DD），禁止手拼日期字符串
  - 中文输入/HTML 渲染必须走 escapeHtml
  - 服务端 CORS 同源 + MS_TOKEN 门禁 + 限流中间件不得绕过
  - 移动端 375px 可用的约束不回退

## 阶段 0 — 挂载 receiving-code-review 甄别发现（先审报告，不盲从）
1. 用 `skill` 工具加载 receiving-code-review
2. 对报告每条发现做三轮过滤：
   - **确认**：file:line 有据、复现路径可走 → 纳入修复队列
   - **降级**：证据单薄/静态推断的无确凿触发条件 → 标记"待复现"，先跑复现再定
   - **驳回**：误报（口径不成立、已在别处处理、非本项目代码）→ 记录驳回理由
3. 输出《修复队列》：按 [确认/待复现/驳回] + 严重度 排列；驳回项不给修复预算

## 阶段 1 — 逐批修复
载入 `verification-before-completion` + `test-driven-development` 约束工作方式。

### 第 1 批：P0（安全/数据丢失）——单条串行，全部搞定才进 P1
### 第 2 批：P1（确定的功能错误）——按模块分批，可并行（复用 dispatching-parallel-agents，模块间无耦合的批并发）
### 第 3 批：P2（边界/隐患）——有明确触发条件就修；纯维护性提升放到 SMELL 批
### 第 4 批：SMELL 重构（长函数、重复逻辑、死代码）——必须满足：行为零变化 + 有测试兜底 + diff 可读

### 每条修复的强制闭环
1. **systematic-debugging**：先复现/确认根因（定位精确 file:line，不猜）
2. **RED**：写一个失败测试复现该 bug（`npx vitest run <file>` 确认红）
3. **GREEN**：最小修复，确认变绿
4. **REFACTOR**：清理，跑全量确认无回归
5. **verification-before-completion**：加载技能，逐项核对（该 bug 测试绿 + 相关模块全量绿 + 手动触发路径如适用）

## 技能挂载总表
| 阶段 | Skill |
|------|-------|
| 阶段0 甄别报告 | receiving-code-review |
| 阶段1 修复 | systematic-debugging → test-driven-development → verification-before-completion |
| 阶段1 并行批 | dispatching-parallel-agents（仅 P1 模块无关批） |
| 阶段3 复核 | requesting-code-review |

## 输出格式（每条）
```
[FIX] <报告编号> <file:line>
- 复现: <步骤或条件>
- 根因: <一句话>
- 修改: <文件+改动摘要>
- 测试: <新增/修改的测试名>（RED→GREEN）
- 验证: vitest 结果 / 手动路径结果
```

## Scope
- 修改范围：js/ css/ server/ tests/；bug 必须改 HTML 结构（index.html 静态标签）时停下询问
- 不改：android/ 原生、node_modules、已下线模块
- 不新增 npm 依赖（必须时停下说明）
- P3 纯体验项除非零风险否则不动（留给后续 UX 迭代）

## Acceptance Criteria
- [ ] 修复队列 100% 闭环（确认项全修；待复现项有复现验证结论；驳回项有理由）
- [ ] 每条修复都有 RED→GREEN 测试变更记录
- [ ] `npx vitest run` 全量通过（291 + 新增）
- [ ] 服务端改动后 `curl` 冒烟每个受影响端点（health/tts/ai/logs）
- [ ] 无 localStorage 结构破坏（新增 key 有迁移，旧 key 原样写）
- [ ] `git diff --stat` 改动仅限声明的目录
- [ ] 输出最终统计：确认 n 条 → 修复 n-条 / 遗留 m-条（附原因）

## Stop Conditions（停下询问）
- 某条 bug 根因横跨 3+ 文件（先给方案再动手）
- 修复会触发 localStorage 结构变更或需要数据迁移
- 连续 3 次 RED 无法 GREEN（重新审视假设/复现，不是硬试）
- 出现"报告内外的新发现"——记入补充清单，本轮不扩大范围
- 需要新增依赖或改 index.html

## Progress
批完成即报告：
✅ P0 完成（n/n）→ ✅ P1 完成（n/n）→ ✅ P2（n/n）→ ✅ SMELL 本批范围（n/n）
最终输出：统计表 [确认/修复/遗留] + 补充发现清单（供下一轮审查）
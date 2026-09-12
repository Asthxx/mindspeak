# 3/3 修复后 git diff 终审

**Target:** Claude Code (builder agent)

## Objective
对「修复执行」阶段产生的全部代码改动（git diff）做**独立终审**。以验收者视角逐条审查每项修复：改动是否达成报告意图、是否引入回归、是否符合项目惯例、测试是否兜住。全量通过才允许宣告修复完成；有问题的条目退回重做，不得放水。

## Context (carry forward)
- 项目：O:\工作\英语软件，vanilla JS PWA + express 后端 + vitest（291 基础测试）
- 本任务输入三件套：
  1. 《审查报告》（多 Agent 审查产出，含 BUG/SMELL/待复现/驳回 清单）
  2. 《修复队列》+ 每条修复的 `[FIX]` 记录（复现/根因/修改/测试/RED→GREEN/验证）
  3. 当前 `git diff`（修复后工作区全部改动）
- 修复期声明的验收标准：确认项全修、每修复有 RED→GREEN、全量测试绿、服务端 curl 冒烟、localStorage 结构未破坏、改动仅在声明目录

## 阶段 0 — 挂载 requesting-code-review 并建立审查基线
1. 用 `skill` 工具加载 requesting-code-review，按其要点组织本终审
2. 并行采集证据：
   - `git status` / `git diff --stat`：范围是否超出声明目录
   - `git diff`（重点）+ `git log --oneline -5`（若已提交）
   - 修复期每条的 `[FIX]` 记录（无需重读整个 app，但发现的条目必须回读对应文件确认）
3. 输出《审查基线》：改动文件数、涉及模块、每条 FIX 对应的 diff 块

## 阶段 1 — 逐条验收（终审的核心）
对每条 `[FIX]` diff 块依次回答 5 个问题，任一不过 → 该条 REWORK：

### Q1 意图达成
- 读修复代码：是否真正解决了报告中该条 bug 的根因？还是只治了表象（错误路径仍可触发）？
- 对照复现步骤，补一个验证：能直接跑就跑（vitest），UI 相关用 jsdom 或逻辑推演确认根因点已闭合

### Q2 无回归
- 该修复触碰的函数，其它调用点是否受影响？（跨模块耦合提前查 grep 调用方）
- 修复引入的新分支是否覆盖了所有 exit 路径？（尤其：提前 return、异常不吞、finally 清理计时器/事件监听）

### Q3 测试匹配
- 是否存在与修复无关的大段测试改动（疑似为了变绿而改测试）？
- RED→GREEN 测试是否真能卡住该 bug（抽掉修复代码测试应红）？抽查 1-2 条反向验证

### Q4 惯例符合
- var/IIFE/window.* 风格、escapeHtml 转义、getLocalDateStr 日期、localStorage 兼容、无新依赖、无 index.html 改动的红线记录
- 服务端：CORS 同源、MS_TOKEN 门禁、限流中间件被绕过则 REWORK

### Q5 安全复核（仅涉服务端改动时）
- 加载 `security-audit`：对新增/修改的端点、校验、转发逻辑按"可被利用影响"复核；路径穿越/XSS/SSRF 三件套重扫

## 阶段 2 — 全量验证（verification-before-completion 执行）
1. 加载 verification-before-completion
2. 实跑验证，以命令输出为准：
   - `npx vitest run`：全绿（若红，定位到具体 FIX 条）
   - 服务端（如改动）：起 `node server/server.js` + curl 冒烟 /api/health、受影响端点
   - 前端逻辑（如改动且可脚本验证）：用现成 tests 或写临时验证脚本，不手改生产代码
3. 记录每个「验证结果」作为判决依据；禁止以"代码看着没问题"代替实跑

## 阶段 3 — 判决与收尾
### 输出判决表
```
| FIX编号 | 模块 | 判决 | 理由 | 证据 |
|---|---|---|---|---|
| FIX-01 | word | APPROVE | 根因闭合+测试确实卡住 | vitest 输出 |
| FIX-03 | server | REWORK | Q2 回归：启动顺序改变影响 X 调用点 | grep 结果 |
```
- **APPROVE**：5 问全过 + 实跑绿
- **REWORK**：任一问不过 → 退回，给出明确修改要求
- 对 REWORK 条目：若修改 ≤5 行且意图清晰，直接修复后复验；否则归入「退修队列」交回修复环境，本轮不处理
### 终审结论
- 全部 APPROVE：宣告修复完成，附验证矩阵 + 快照
- 存在 REWORK：不宣告完成，输出退修清单一并交付

## Scope
- 只读审查 + 小修补：可读可跑测试可 curl；**不重写功能**、不加功能
- 对 REWORK 条目最多做 ≤5 行直接修复；超出即退回
- 不改测试使其变绿（那是 REWORK 触发项，不是手段）

## Stop Conditions（停下询问）
- REWORK 条目的正确修法存在 2 种以上合理方案（涉及产品取舍）
- 审查中发现审查报告之外的新 P0 级问题（如安全口径变了）
- 修复阶段遗留（fail 原因未说明）的条目需要重新评估优先级

## Acceptance Criteria
- [ ] 判决表覆盖修复队列 100% 条目，无未判决项
- [ ] 每条 APPROVE 有实跑证据（vitest/curl 输出）在案
- [ ] REWORK 条目 ≤5 行直接修复的有复验记录；退修队列条目带明确修改要求
- [ ] `npx vitest run` 全量绿（终审结束时）
- [ ] 输出最终状态：修复闭环完成/未完成 + 遗留清单

## Progress
✅ 基线采集 → ✅ 逐条验收（Q1-Q5）→ ✅ 全量验证 → ✅ 判决输出
每条判决：`[APPROVE/REWORK] FIX-XX <一句话理由>`
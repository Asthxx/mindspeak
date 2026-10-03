# UI 无障碍与对比度专项修复实施计划

> **For agentic workers:** 本计划为回顾式归档——任务已于 2026-10-01 全部执行并验证，checkbox 已勾选，保留供复跑与回溯。
> REQUIRED SUB-SKILL: superpowers:executing-plans 逐任务执行。

**Goal:** 修复全局 UI 审计（`docs/ui-audit-20261001.md`）发现的 P0 对比度 / P1 触控区 / P1 移动端信息架构 / P2 视觉细节

**Spec:** `docs/superpowers/specs/2026-10-01-ui-audit-fixes-design.md`

## Global Constraints

- 所有颜色修复走 design-system.css 令牌，组件层零硬编码
- 三级文本灰阶层次不倒置（text > secondary > tertiary）
- 桌面端布局零回归（移动端改动全部收敛在 mobile.css 媒体查询）
- 每步后跑 `node scripts/ui-audit.mjs` 验证

---

## Task 1 · 令牌层修复（P0）

- [x] `--text-tertiary` 浅色 #8A8A8A → #616B76（css/design-system.css:56 附近，含注释）
- [x] `--text-tertiary` 深色 #707070 → #8A97A4（同文件深色区块）
- [x] 新增 `--coral-text` / `--warning-text`（浅色实色、深色别名到 --coral/--warning）
- [x] 新增 `--amber` / `--amber-light` 别名修复 4 处断链（.ai-tip-prevent 徽章无底色、发音中等分无配色等）
- [x] `--danger-dark` #D32F2F → #C62828

## Task 2 · 主题商店色包核算与修正（P0 扩展面）

- [x] 新增 `scripts/check-theme-contrast.mjs`：核算 16 组色包 tertiary 在卡片/画布/暖色/表面四类底上的对比度
- [x] 预演求解（保持 H/S 只调 L，目标 ≥4.6 留余量）
- [x] `--apply` 写入 15 处（极光/余烬/禅意/赛博朋克/北欧/复古/太空/糖果 × 浅深）
- [x] 复核 0 组不达标

## Task 3 · 组件层对比度（P0）

- [x] `.btn-primary` 渐变起点 → `--sage-hover`（css/style.css:190 附近）
- [x] `[data-theme="dark"] .btn-primary` 改「亮品牌底 + --text-inverse」
- [x] AI 徽章三档重配 + 深色覆盖（css/nav.css .ai-tip-*）
- [x] PK 倒计时、周报「今天/0 词」→ `--coral-text`
- [x] 邮箱链接、每日挑战奖励文案 → `--coral-text`
- [x] `.btn-danger` 文字 → `--danger-dark`；`.btn-undo` → `--sage-deep`
- [x] 进度环文字、周报汇总 → `--sage-deep`
- [x] AI hero 渐变终点 → `--sage-hover`；深色专项（深表面渐变 + 边框 + 文字令牌）
- [x] 深色 `.ai-tip-normal` 徽章、`.ai-set-link` 对比度补强
- [x] `.word-pos` 硬编码 #E0E7FF → `--sage-light`
- [x] 番茄钟渐变文字端点 → `--sage-deep` / `--coral-text`

## Task 4 · 触控目标（P1）

- [x] 全局 `input[type="checkbox"]` 20px + accent-color（design-system.css）；移动端 24px
- [x] 移除 `.r-toggle` / `.auto-save-toggle` 的 16px 硬编码
- [x] 输入框全局 min-height 36px / 移动端 44px
- [x] 移动端勾选行（settings/r-toggle/story-toggle/auto-save-toggle）整行 ≥44px
- [x] 图标按钮、色块 44px；消息操作按钮、`.ai-act`、`.ai-hist-main` ≥44px
- [x] AI 开关移动端 48×28（滑块尺寸同步）
- [x] `@media (hover:none)` 下 `.ai-hist-del` 常驻

## Task 5 · 移动端背单词页信息架构（P1）

- [x] index.html：`#btn-add-word` + `#btn-reset-card-pos` 包进 `#word-tools-extra`；前置「更多工具」按钮（aria-expanded/aria-controls）
- [x] style.css：桌面 `.word-tools-extra{display:contents}`、`.word-tools-toggle{display:none}`
- [x] mobile.css：≤768px 折叠样式 + `.open` 展开态
- [x] app.js：`#btn-word-tools` 点击切换 + aria 状态同步

## Task 6 · 检测脚本与验证（收尾）

- [x] scripts/ui-audit.mjs：识别 background-clip:text 渐变文字、渐变背景取最差色标、跳过 sr-only
- [x] 全量重跑：76 屏零低对比、零 console 错误
- [x] vitest 676/677（唯一失败 = signing-secrets git EBUSY 存量环境问题）
- [x] `node build.js` 构建通过
- [x] 文档归档：`docs/ui-audit-20261001.md` 补修复记录、CHANGELOG 追加「未发布」条目

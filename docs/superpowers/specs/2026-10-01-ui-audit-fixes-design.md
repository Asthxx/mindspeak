# UI 无障碍与对比度专项修复设计文档

**日期**: 2026-10-01
**状态**: 已实施并验证（76 屏真机复核：低对比 0 组 / 零 console 错误 / 676/677 测试通过）
**范围**: 全局对比度令牌、触控目标、移动端背单词页信息架构、AI hero 深色适配
**数据来源**: `docs/ui-audit-20261001.md`（审计方法与逐项实测）、`audit-shots/`（76 屏截图 + report.json）

---

## 1. 设计原则

1. **令牌优先**：所有修复落在 `design-system.css` 的令牌层（一处改动全局生效），组件层只消费令牌，不引入硬编码色值。
2. **层次不倒置**：调整三级文本灰阶时，必须保持 `--text > --text-secondary > --text-tertiary` 的对比度递减关系（浅色 14.1 > 6.90 > 5.42；深色 14.4 > 5.80 > 5.07）。
3. **「填充色」与「文字色」分离**：品牌强调色（sage/coral/warning）按 60-30-10 是为大面积填充设计的饱和度，直接当小字前景全部不达 AA。新增 `--coral-text` / `--warning-text` 文字态令牌，填充与文字各用各的。
4. **深色不是浅色反转**：深色下 sage 系翻亮（#7BA9CE 等），原「深底 + 白字」策略全部失效。凡品牌色作背景的组件（主按钮、徽章、hero）必须给深色专项映射。
5. **桌面零回归**：所有移动端改动集中在 `mobile.css` 的 `@media (max-width:768px)`；背单词工具折叠用 `display:contents` 保证桌面布局逐像素不变。

## 2. 令牌变更

| 令牌 | 旧 | 新 | 依据 |
|---|---|---|---|
| `--text-tertiary`（浅） | `#8A8A8A` | `#616B76` | 白 5.42 / ivory 5.00 / sage-surface 4.89:1 |
| `--text-tertiary`（深） | `#707070` | `#8A97A4` | 卡片 5.07 / 画布 5.78:1 |
| `--danger-dark`（浅） | `#D32F2F` | `#C62828` | danger-light 底 4.36 → 4.92:1 |
| `--coral-text` | 无 | 浅 `#B04A28` / 深 `var(--coral)` | 白 5.45 / ivory 5.03 / 深色 7.30:1 |
| `--warning-text` | 无 | 浅 `#8A5300` / 深 `var(--warning)` | warning-light 底 ≥5.5:1 |
| `--amber` / `--amber-light` | **未定义** | 别名 `--warning` / `--warning-light` | 修复 4 处静默失效 |

## 3. 组件决策

### 3.1 对比度（P0）
- `.btn-primary`：浅色渐变起点 `--sage`→`--sage-hover`（白字 5.27:1）；深色下品牌色翻亮，改「亮底 + `--text-inverse`」9.6:1。
- AI 提示徽章：urgent `--coral-text` 底白字 5.45:1；prevent 修复 `--amber` 断链后用 warning-light/warning-text；encourage `--sage-hover` 5.27:1；深色全部「深底亮字」≥7:1。
- 渐变背景组件（AI hero、进度环文字、番茄钟渐变文字）端点色全部压到达标区。
- `.word-pos` 硬编码 `#E0E7FF` → `--sage-light`（修复深色 1.47:1）。
- 主题商店 16 组色包：tertiary 保持色相只调明度自动求解（`scripts/check-theme-contrast.mjs --apply`），12 组修正后全部 ≥4.6:1。

### 3.2 触控目标（P1，WCAG 2.5.8）
- 复选框：全局 20px / 移动端 24px，`accent-color: var(--sage)`；命中区由外层 label 整行承担（移动端行高 ≥44px）。
- 输入框：全局 `min-height:36px` / 移动端 44px。
- 图标按钮、色块、消息操作、pill 行动按钮：移动端 44px。
- `#ai-hist-del` 在触屏（`@media (hover:none)`）常驻显示——hover-only 显形对触屏用户等于不存在。

### 3.3 移动端背单词页信息架构（P1）
- 问题：390px 首屏被词库/视图切换/精选学习/添加新词/重置进度 5 组控件占满，单词卡被挤出首屏。
- 方案：低频工具（添加新词、重置翻页进度）包进 `#word-tools-extra`，前置「更多工具」切换按钮（`aria-expanded`/`aria-controls`）；桌面 `display:contents` 平铺，移动端折叠。
- 首屏高频路径变为：词库 → 视图 → 精选 → 卡片 → 三键。

## 4. 验收（已全部通过）

- [x] `node scripts/ui-audit.mjs`：76 屏零低对比、零 console 错误、无横向溢出
- [x] `node scripts/check-theme-contrast.mjs`：16 组色包全部达标
- [x] vitest 676/677（唯一失败为 signing-secrets git EBUSY 存量环境问题，与本轮无关）
- [x] `node build.js` 构建通过（CSP 校验含 dist 无回退）
- [x] 桌面端布局与改造前一致（display:contents 保证）

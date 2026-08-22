# Android 端界面全量重构设计文档

**日期**: 2026-08-22
**状态**: 已批准
**范围**: 仅 Android 端界面/布局/交互，不动 Windows 网页，不动底层 JS 逻辑

---

## 1. 架构策略

### 核心原则
- **CSS 隔离**: 新建 `css/android.css`，所有 Android 专用样式用 `html.platform-android` 选择器隔离
- **页面结构复用**: index.html 的 `div.page` 结构不变，只通过 CSS 重排布局
- **JS 桥接最小化**: 只在 `android-ui-init.js` 里加 Android 特有交互，不改 app.js

### 不改动的文件
- `js/app.js` (7204 行) — 不动
- 所有页面模块 (WordModule, GrammarModule 等) — 不动
- `js/tts-manager.js` — 不动
- `css/style.css`, `css/design-system.css` — 不动
- Windows 网页的 HTML/CSS/JS — 完全不变

---

## 2. Android 页面布局重构

### 2.1 底部导航重设计

```
┌─────────────────────────────────┐
│          当前页面内容            │
│                                 │
│                                 │
├─────┬─────┬─────┬─────┬─────────┤
│ 首页 │ 学习 │ 练习 │ 成长 │ 我的  │
│  🏠  │  📖  │  ✏️  │  🏆  │  👤  │
└─────┴─────┴─────┴─────┴─────────┘
```

**5 个一级入口**: 首页、学习、练习、成长、我的

**二级功能折叠**:
- 学习 → word/story/listening/reading
- 练习 → grammar/spelling/pk/context/speak
- 成长 → badges/items

**交互**: 滑动切换一级标签（类似微信）

### 2.2 各页面 Android 布局

| 页面 | Windows 布局 | Android 新布局 |
|------|-------------|---------------|
| 首页 | 仪表盘卡片 | 全屏日报 + 底部快捷入口 |
| 学习（单词） | 侧边栏+主区域 | 全屏卡片堆叠，左右滑动切换 |
| 练习 | 列表式 | 全屏沉浸式，顶部进度条 |
| AI | 聊天气泡 | 全屏对话，底部输入框固定 |
| 设置 | 长列表 | 分组卡片，Material Design 风格 |

### 2.3 Android 特有交互

- **滑动返回**: 从左边缘右滑关闭当前页/返回上级
- **下拉刷新**: 学习页面下拉刷新今日任务
- **长按操作**: 单词卡片长按收藏/加入错词本
- **底部 Sheet**: 练习完成后的结果面板从底部滑出

---

## 3. CSS 实现 + 文件结构

### 3.1 新建文件

```
css/
├── android.css              ← 新建：所有 Android 专用样式
├── android-nav.css          ← 新建：Android 底部导航 + 手势
├── android-animations.css   ← 新建：转场动画、滑动手势
└── (原有 CSS 文件不动)
```

### 3.2 选择器隔离策略

```css
/* android.css 中的所有规则都用这个前缀 */
html.platform-android .bottom-nav { ... }
html.platform-android .page { ... }
html.platform-android .vocab-card { ... }
```

### 3.3 index.html 改动（最小）

```html
<!-- 现有结构不动，只在 <head> 加 -->
<link rel="stylesheet" href="css/android.css" id="android-css">
<link rel="stylesheet" href="css/android-nav.css">
<link rel="stylesheet" href="css/android-animations.css">
```

CSS 文件通过媒体查询 + 平台类自动生效/失效:
```css
/* android.css 开头 */
html:not(.platform-android) { display: none !important; }
```

### 3.4 响应式断点统一

| 断点 | 用途 |
|------|------|
| ≤360px | 小屏手机 |
| ≤480px | 标准手机 |
| ≤768px | 平板/大手机 |
| ≤1024px | 桌面 |

统一用这 4 个，删除其他零散断点。

---

## 4. JS 桥接

### 4.1 JS 改动范围

**只改 1 个文件: `js/android-ui-init.js`**

当前 27 行 → 扩展到约 150 行，新增:

| 功能 | 说明 |
|------|------|
| 手势系统 | 左边缘右滑返回（触摸事件监听） |
| 下拉刷新 | 学习页面下拉触发刷新 |
| 底部导航切换 | 5 个一级标签的切换逻辑 |
| 长按操作 | 单词卡片长按菜单 |
| 底部 Sheet | 练习结果面板滑出 |

### 4.2 EventBus 对接（可选）

如果需要 Android 特有事件通知页面模块，可以通过现有 `window.EventBus` 发事件:

```javascript
// android-ui-init.js 中
EventBus.emit('android:refresh-words');

// 页面模块中（如果需要响应）
EventBus.on('android:refresh-words', function() { ... });
```

优先用 CSS 解决，JS 事件是可选方案。

---

## 5. 测试策略

### 5.1 Playwright 自动化

- 模拟 Android 视口 (375px/414px) 测试页面切换
- 验证底部导航 5 个标签都能切换
- 验证各页面布局在手机上正确显示

### 5.2 真机测试

构建 APK 后在手机上验证:
- 底部导航 5 个标签都能切换
- 滑动返回正常工作
- 各页面布局在手机上正确显示
- 触摸区域大小合适 (≥44px)

### 5.3 回归测试

确保 Windows 网页不受影响:
- 在浏览器中打开 http://localhost:9095
- 验证所有页面正常显示
- 验证所有功能正常工作

---

## 6. 构建流程

```bash
node build.js              # 生成 dist/
npx cap sync android       # 同步到 Android
# 手动 patch Java 17 (capacitor.build.gradle)
.\gradlew assembleDebug    # 生成 APK
```

---

## 7. 实施步骤

1. 新建 `css/android.css`、`css/android-nav.css`、`css/android-animations.css`
2. 在 `css/android.css` 中实现底部导航重设计
3. 在 `css/android.css` 中实现各页面 Android 布局
4. 在 `js/android-ui-init.js` 中实现手势系统
5. 在 `js/android-ui-init.js` 中实现下拉刷新
6. 在 `js/android-ui-init.js` 中实现底部导航切换逻辑
7. 在 `js/android-ui-init.js` 中实现长按操作
8. 在 `js/android-ui-init.js` 中实现底部 Sheet
9. 运行 Playwright 测试
10. 构建 APK 并在真机上测试
11. 验证 Windows 网页不受影响

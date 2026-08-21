# Android 框架重建设计文档

**日期**: 2026-08-21
**状态**: 已确认
**路径**: Architectural

## 1. 背景与问题

### 当前 Android 框架的致命缺陷

| # | 问题 | 严重程度 |
|---|------|---------|
| 1 | 3 个 Android 模块从未被打包 — `android-ui-init.js`、`notification-manager.js`、`responsive-layout.js` 被 build.js 踢出 dist | 致命 |
| 2 | 原生 TTS 服务器从未启动 — Java 端写了 NanoHTTPD + Android TTS，但 JS 端从未调用 `startServer()` | 致命 |
| 3 | 缺少 RECORD_AUDIO 权限 — 跟读练习录音功能在真机上被拒绝 | 严重 |
| 4 | 密钥密码明文提交 git — mindspeak.jks + 密码写在 build.gradle 和 capacitor.config.ts | 严重 |
| 5 | SW 在 APK 内造成缓存污染 — 更新 APK 后首次启动仍可能加载旧缓存 | 中等 |
| 6 | 4 个版本号来源不统一 — VERSION/package.json/tauri.conf/build.gradle 各说各的 | 中等 |
| 7 | fix-java17.ps1 每次构建篡改 node_modules — 脆弱的 JDK 降级 hack | 中等 |
| 8 | 平台检测重复 — 内联脚本 + App.detectPlatform() 两套逻辑可能漂移 | 轻微 |

### 决策

选择 **方案 B：用 Capacitor 8 从零重建 Android 壳**，保留现有 `dist/` 构建产物，重新设计插件架构。

## 2. 整体架构

```
源码 (index.html + js/ + css/ + data/)
        │
        ▼  npm run build (build.js)
      dist/
        │
        ├── PWA: 直接部署 dist/
        │
        └── Android: capacitor.config.ts 指向 dist/
              │
              ▼  npx cap sync android
            android/
              ├─ app/src/main/assets/public/  ← dist/ 的副本
              ├─ app/src/main/java/.../MainActivity.java
              ├─ app/src/main/java/.../plugins/
              │   ├─ NativeTTSPlugin.java
              │   ├─ NotificationPlugin.java
              │   └─ RecorderPlugin.java
              ├─ app/src/main/AndroidManifest.xml
              └─ capacitor.config.ts (根目录)
```

### 核心原则

- `dist/` 是唯一构建产物，PWA 和 Android 共用
- Capacitor 只是原生能力的桥接层，不侵入业务逻辑
- 所有原生插件通过 `Capacitor.Plugins.XXX` 调用，JS 端有降级兜底

## 3. 原生插件架构

### 3.1 插件清单

| 插件 | Java 类 | JS 接口 | 作用 |
|------|---------|---------|------|
| NativeTTS | `NativeTTSPlugin.java` | `CapacitorNativeTTS.speak(text, lang)` | Android 原生 TTS，解决国产机无 Google TTS |
| StatusBar | Capacitor 内置 | `StatusBar.setStyle({color, style})` | 状态栏颜色/沉浸式 |
| NavigationBar | `@capgo/capacitor-navigation-bar` | `NavigationBar.setColor('#xxx')` | 底部导航栏颜色 |
| Notification | `NotificationPlugin.java` | `CapacitorNotification.schedule(options)` | 本地通知 |
| Recorder | `RecorderPlugin.java` | `CapacitorRecorder.start()/stop()` | 跟读录音 |

### 3.2 NativeTTS 降级链

```
CapacitorNativeTTS (Android 原生 TTS)
    ↓ 失败
SpeechUtil._speakTTSOnline (浏览器 speechSynthesis)
    ↓ 失败
SpeechUtil._speakGoogleTTS (Google 合成)
    ↓ 失败
SpeechUtil._speakLocal (远程 TTS API)
```

### 3.3 JS 端统一入口

`TTSManager.speak()` 内部判断 `isNativePlatform()` 决定走原生还是浏览器链路，业务代码零改动。

## 4. 构建管线

### 4.1 构建流程

```
npm run build
  ├─ 1. merge-data.js (合并词库)
  ├─ 2. build.js: 按 jsOrder 合并 JS → Terser 压缩
  │     修复: 将 android-ui-init / notification-manager / responsive-layout 加入 jsOrder
  ├─ 3. 生成 dist/
  │
  ▼
npm run android:build
  ├─ 4. npx cap sync android
  ├─ 5. gradlew assembleRelease
  └─ 6. 输出 APK
```

### 4.2 版本号统一管理

- 单一来源: `capacitor.config.ts` 的 `version` 字段
- `build.js` 读取并注入 `dist/index.html` 的 meta version
- `cap sync` 自动同步到 `android/app/build.gradle` 的 versionName + versionCode

### 4.3 构建脚本

```json
{
  "android:build": "npm run build && npx cap sync android && cd android && gradlew assembleRelease",
  "android:debug": "npm run build && npx cap sync android && cd android && gradlew assembleDebug",
  "android:install": "adb install android/app/build/outputs/apk/debug/app-debug.apk"
}
```

## 5. AndroidManifest + 权限

### 5.1 权限声明

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.VIBRATE" />
```

### 5.2 安全修复

- 删除 `mindspeak.jks` 从 git，加入 `.gitignore`
- 签名密码改为环境变量 `KEYSTORE_PASSWORD`
- 删除 `cleartext: true`，HTTPS-only
- Capacitor `server.androidScheme` 设为 `https`

### 5.3 应用配置

```json
{
  "appId": "com.mindspeak.english",
  "appName": "闻道 MindSpeak",
  "webDir": "dist",
  "server": { "androidScheme": "https" },
  "android": {
    "allowMixedContent": false,
    "backgroundColor": "#0F1419"
  }
}
```

## 6. Service Worker + 离线策略

### 6.1 APK 内 SW 策略

```js
if (window.Capacitor && window.Capacitor.isNative) {
  // APK 内：跳过 SW 缓存，直接用嵌入的文件
  return;
}
```

### 6.2 离线能力分层

| 场景 | 策略 |
|------|------|
| APK 内首次打开 | 所有资源已嵌入，无需网络 |
| APK 内 TTS | NativeTTS 插件（纯离线） |
| PWA 首次打开 | SW 预缓存 app-shell |
| PWA 离线使用 | SW stale-while-revalidate |
| 网络恢复后 | SW 自动更新缓存 |

## 7. 实施步骤概要

1. 删除现有 `android/` 目录
2. 重新初始化 Capacitor 8 项目
3. 编写 3 个原生插件（NativeTTS、Notification、Recorder）
4. 修复 `build.js` 打包遗漏
5. 统一版本号管理
6. 配置权限和安全
7. 调整 SW 策略
8. TDD 测试每个模块
9. 构建并真机验证

## 8. 验证清单

- [ ] `npm run build` 生成完整 dist/
- [ ] `npm run android:build` 生成可安装 APK
- [ ] APK 内 TTS 正常工作（国产机无 Google TTS）
- [ ] 跟读录音功能正常
- [ ] 本地通知按时触发
- [ ] 状态栏沉浸式效果
- [ ] 离线首次打开正常
- [ ] 版本号全部统一
- [ ] 无密钥泄露

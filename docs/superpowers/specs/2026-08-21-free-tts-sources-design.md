# 设计文档：免费高质量 TTS 声源 + 本地 Piper TTS

> **日期**: 2026-08-21
> **状态**: 已批准
> **范围**: 新增 Edge TTS 在线声源 + Piper TTS 本地离线声源

## 1. 背景

当前 TTS 系统有 7 个免费在线虚拟声源（有道/百度/Google）和 2 个 SAPI 本地声源（David/Zira），但音质中等，且 Android 端仅有有道可用。用户需要更多免费高质量声源和本地离线方案。

## 2. 目标

- 新增 **Edge TTS** 免费在线声源（6 个音色，神经网络级音质）
- 新增 **Piper TTS** 本地离线声源（3 个音色，接近真人音质）
- 保持现有架构和降级链路不变

## 3. 约束

- Edge TTS 无官方 REST API，必须经 server 代理 WebSocket
- Piper TTS 需下载二进制 + 语音包（~30MB/包）
- Android APK 无本地 server，需降级到有道等在线源
- 保持现有 `_speakRemoteFallback` 降级链路

## 4. 声源清单

### 4.1 Edge TTS（在线，免费，无需 API key）

| ID | 名称 | 音色 | 语言 |
|----|------|------|------|
| `edge_us_jenny` | Edge 美音女声 | `en-US-JennyNeural` | en-US |
| `edge_us_guy` | Edge 美音男声 | `en-US-GuyNeural` | en-US |
| `edge_gb_sonia` | Edge 英音女声 | `en-GB-SoniaNeural` | en-GB |
| `edge_au_natasha` | Edge 澳音女声 | `en-AU-NatashaNeural` | en-AU |
| `edge_in_neerja` | Edge 印度英语 | `en-IN-NeerjaNeural` | en-IN |
| `edge_zh_xiaoxiao` | Edge 中文女声 | `zh-CN-XiaoxiaoNeural` | zh-CN |

### 4.2 Piper TTS（本地，离线，需下载）

| ID | 名称 | 模型 | 大小 |
|----|------|------|------|
| `piper_us_amy` | Piper 美音女声 | `en_US-amy-medium` | ~30MB |
| `piper_us_lessac` | Piper 美音男声 | `en_US-lessac-medium` | ~30MB |
| `piper_gb_alba` | Piper 英音女声 | `en_GB-alba-medium` | ~30MB |

## 5. 架构变更

### 5.1 Server 端新增端点

#### `/api/edge-tts`

- 输入：`?text=...&lang=en-US&voice=en-US-JennyNeural`
- 处理：`edge-tts` Python 包 WebSocket 合成 → MP3 流
- 输出：`audio/mpeg` 流式响应
- 缓存：内存 LRU（SHA1 key，500 条上限）

#### `/api/piper-tts`

- 输入：`?text=...&voice=en_US-amy-medium`
- 处理：调用 Piper 二进制 → WAV 输出
- 输出：`audio/wav` 流式响应
- 语音包管理：首次使用自动下载到 `~/.local/share/piper-voices/`

### 5.2 前端变更

#### `js/app.js` — 在线声源表新增 Edge voices

```javascript
// SRC_ALL 新增：
{ id: 'edge_us_jenny', name: 'Edge 美音女声(Jenny)',
  url: function(t) { return base + '/api/edge-tts?text=' + ENC(t) + '&lang=en-US&voice=en-US-JennyNeural'; } },
// ... 其他 5 个 Edge 音色

// VOICE_FIRST 新增映射：
'__online_edge_us_jenny__': 'edge_us_jenny',
// ...
```

#### `js/app.js` — Piper voices 作为本地声源

```javascript
// settings voice dropdown 新增 Piper 选项（需要 server 可用时）
'__local_piper_us_amy__': 'Piper 美音女声（离线）',
'__local_piper_us_lessac__': 'Piper 美音男声（离线）',
'__local_piper_gb_alba__': 'Piper 英音女声（离线）'
```

#### `js/app.js` — Piper 朗读路径

```javascript
// _speakLocal 优先 Piper（如果 server 支持）：
if (settings.voiceName.indexOf('__local_piper_') === 0) {
  var piperUrl = base + '/api/piper-tts?text=' + ENC(text) + '&voice=' + voiceId;
  // ... audio 播放逻辑
}
```

### 5.3 设置页 UI 分组

声音下拉框新增分组（platform 条件控制）：

1. **本地离线** — 系统默认 + Piper（需 server） + SAPI（需 server）
2. **高质量在线** — Edge voices（需 server）
3. **免费在线** — 有道/百度/Google（现有，Android 仅显示有道）

## 6. 错误处理

- Server 不可用 → Edge/Piper 不显示在设置页，降级到有道/系统声音
- Edge TTS WebSocket 失败 → 降级到有道 → 降级到系统声音
- Piper 语音包未下载 → 自动下载（进度条）→ 失败降级到 Edge/SAPI
- Piper 二进制不存在 → 自动下载平台对应二进制 → 失败降级

## 7. 降级链路（完整）

```
用户选声 →
  Edge TTS → 有道 → 百度 → Google → 系统声音
  Piper → Edge → 有道 → 系统声音
  SAPI → 系统声音
  有道/百度/Google → 下一个在线源 → 系统声音
```

## 8. 测试策略

- 单元测试：Edge/Piper URL 构造、设置页渲染、降级逻辑
- 集成测试：Edge TTS 端点、Piper TTS 端点（mock 或真实 server）
- 手动测试：各平台设置页显示、声音切换、朗读播放

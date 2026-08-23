import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const appJs = readFileSync(join(root, 'js', 'app.js'), 'utf8');

// 提取 SpeakModule 的 startRecord/playAudio 方法源码段做静态断言
// （SpeakModule 未导出到 window，行为级测试无法触达实例）
function extractMethod(name) {
  const start = appJs.indexOf('SpeakModule.prototype.' + name);
  expect(start, 'method not found: ' + name).toBeGreaterThan(-1);
  // 下一个原型成员定义处为界（不依赖固定缩进，避免格式变化导致截取到文件尾）
  const m = appJs.slice(start + 1).match(/\n\s*SpeakModule\.prototype\./);
  const end = m ? start + 1 + m.index : appJs.length;
  return appJs.slice(start, end);
}

describe('跟读练习 Bug A — 播放声音统一', () => {
  const playAudio = extractMethod('playAudio');

  it('playAudio_uses_ttsmanager_unified_path', () => {
    // 统一经 TTSManager.speak（原生优先→web 兜底，同引擎同音色）
    expect(playAudio).toMatch(/TTSManager\.speak\(/);
    expect(playAudio).toMatch(/lang:\s*'en-US'/);
    expect(playAudio).toMatch(/rate:\s*0\.9/);
  });

  it('playAudio_no_multi_source_racing', () => {
    // 不再走 SpeechUtil 多源竞速路径
    expect(playAudio).not.toMatch(/speakWord|_speakRemoteFallback|youdao|edge-tts/);
  });
});

describe('跟读练习 Bug B — 未读就报错', () => {
  const startRecord = extractMethod('startRecord');

  it('getUserMedia_permission_gate_before_recognition_start', () => {
    // 权限门控存在且在运行时先于识别启动：
    // begin() 定义在前，但实际执行顺序由 "gate → then(begin)/catch(begin)" 保证 ——
    // 最后一个无条件 begin() 兜底必须出现在 getUserMedia 门控之后
    const gate = startRecord.indexOf('getUserMedia({ audio: true })');
    expect(gate).toBeGreaterThan(-1);
    const beginDef = startRecord.indexOf('var begin = function');
    expect(beginDef).toBeGreaterThan(-1);
    expect(beginDef).toBeLessThan(gate);
    const lastFallthrough = startRecord.lastIndexOf('begin();');
    expect(lastFallthrough, 'unconditional begin() fallback must come after permission gate').toBeGreaterThan(gate);
    // 授权成功路径也必须经过 begin()
    expect(startRecord).toMatch(/\.then\(function\(stream\) \{[\s\S]*?begin\(\);/);
  });

  it('error_classification_silent_for_no_speech_and_aborted', () => {
    // no-speech / aborted 分支静默处理，所在行不得出现 Toast
    const lines = startRecord.split('\n').filter(function(l) { return /err === '(no-speech|aborted)'/.test(l); });
    expect(lines.length).toBeGreaterThanOrEqual(1);
    for (var i = 0; i < lines.length; i++) {
      expect(lines[i], 'silent branch must not toast: ' + lines[i].trim()).not.toContain('Toast.');
    }
  });

  it('toast_only_for_not_allowed_network_audio_capture', () => {
    // 三类需告知的错误有对应 Toast 提示
    expect(startRecord).toMatch(/not-allowed[^}]*Toast\.error/);
    expect(startRecord).toMatch(/network[^}]*Toast\.error/);
    expect(startRecord).toMatch(/audio-capture[^}]*Toast\.error/);
  });

  it('grace_period_swallows_errors_within_2s_after_start', () => {
    // start 后 2s 内的 onerror 静默忽略
    expect(startRecord).toContain('_recStartedAt');
    expect(startRecord).toMatch(/Date\.now\(\)\s*-\s*self\._recStartedAt\s*<\s*2000/);
  });

  it('webkit_speech_recognition_compat_kept', () => {
    // Web Speech API 双前缀兼容不回归
    expect(startRecord).toContain("window.SpeechRecognition || window.webkitSpeechRecognition");
    expect(startRecord).toContain("'webkitSpeechRecognition' in window");
  });

  it('button_disabled_during_async_permission_gap', () => {
    // 权限弹窗期间按钮保持禁用，失败路径恢复
    expect(startRecord.indexOf("btn.disabled = true")).toBeGreaterThan(-1);
    expect((startRecord.match(/btn2?\.disabled = false/g) || []).length).toBeGreaterThanOrEqual(2);
  });
});

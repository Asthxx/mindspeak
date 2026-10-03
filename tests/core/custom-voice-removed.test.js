import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// 「自定义发音（真人录音）」功能下线守护
//
// 这不是一个只有 UI 的功能，播放侧同样有实打实的分支：
//   SpeechUtil.speak() 开头会查 custom_voice 映射，单词（无空格）命中就
//   new Audio(dataURL) 优先播放真人录音，播失败才回落 speechSynthesis。
// 所以只删设置页的 UI 会留下「存储里还有录音、朗读还会优先播它」的半截状态。
//
// 必须删除
//   - index.html 设置区块（标题/说明/两个 file input/两个按钮/列表容器）
//   - app.js 设置页绑定（导入映射、4MB 预算、renderCVList、批量/单文件导入）
//   - SpeechUtil.getCustomVoice 及 speak() 里的真人录音优先分支
//   - 备份字段 customVoice、导入清洗、store.js 映射、重置时的缓存清理
// 必须保留
//   - 其余发音设置：voiceName / voiceRate / voicePitch / voiceInstant /
//     ttsVoice、在线音色、试听按钮、_attachAudioEl/_detachAudioEl/_localAudio
//     （这些同时服务于在线音色音频与本地发音服务，不是真人录音专属）
//   - _stopLocalAudio 等其他调用点

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = p => readFileSync(join(root, p), 'utf8');
const html = read('index.html');
const app = read('js/app.js');
const store = read('js/core/store.js');

describe('设置页 UI 已移除', () => {
  it('不再有「自定义发音（真人录音）」标题', () => {
    expect(html).not.toMatch(/自定义发音/);
  });

  it('不再有真人录音说明文案', () => {
    expect(html).not.toMatch(/真人录音/);
    expect(html).not.toMatch(/发音包/);
  });

  it('不再有「添加录音」「批量导入发音包」按钮', () => {
    expect(html).not.toMatch(/btn-cv-add/);
    expect(html).not.toMatch(/btn-cv-dir/);
    expect(html).not.toMatch(/添加录音/);
    expect(html).not.toMatch(/批量导入发音包/);
  });

  it('不再有音频文件选择框与列表容器', () => {
    expect(html).not.toMatch(/id="cv-file"/);
    expect(html).not.toMatch(/id="cv-file-dir"/);
    expect(html).not.toMatch(/id="cv-list"/);
    expect(html).not.toMatch(/webkitdirectory/);
  });

  it('不再声明支持 MP3 / WAV / M4A', () => {
    expect(html).not.toMatch(/MP3 \/ WAV \/ M4A/);
  });

  it('不再提到 4MB 录音存储上限', () => {
    expect(html).not.toMatch(/4MB/);
  });
});

describe('设置页绑定代码已移除', () => {
  it('不再查询录音相关 DOM', () => {
    expect(app).not.toMatch(/getElementById\('cv-file'\)/);
    expect(app).not.toMatch(/getElementById\('cv-file-dir'\)/);
    expect(app).not.toMatch(/getElementById\('cv-list'\)/);
  });

  it('不再绑定录音按钮', () => {
    expect(app).not.toMatch(/safeBind\('btn-cv-add'/);
    expect(app).not.toMatch(/safeBind\('btn-cv-dir'/);
  });

  it('renderCVList 已删除', () => {
    expect(app).not.toMatch(/renderCVList/);
  });

  it('批量导入函数与 4MB 预算常量已删除', () => {
    expect(app).not.toMatch(/importAudioFiles/);
    expect(app).not.toMatch(/CV_BUDGET/);
  });

  it('不再用 FileReader 读取音频为 dataURL', () => {
    // 注意：readAsDataURL 仍被自定义背景上传使用（app.js:7043），
    // 那与发音无关，不能连坐删除。所以这里只断言没有音频导入语境：
    // 音频路径必须同时伴随 audio/MIME 判断或 __PENDING__ 占位（均已删）
    expect(app).not.toMatch(/audioFiles/);
    expect(app).not.toMatch(/accept="audio\/\*"/);
    expect(app).not.toMatch(/type\.indexOf\('audio'\)/);
  });
});

describe('播放侧真人录音分支已移除', () => {
  it('SpeechUtil.getCustomVoice 已删除', () => {
    expect(app).not.toMatch(/getCustomVoice/);
  });

  it('speak() 不再查 custom_voice 映射', () => {
    expect(app).not.toMatch(/var custom = this\.getCustomVoice\(\)/);
  });

  it('speak() 不再因命中录音而 new Audio(dataURL)', () => {
    const i = app.indexOf('speak: function(text, lang, opts)');
    expect(i, '未找到 SpeechUtil.speak').toBeGreaterThan(-1);
    const fn = app.slice(i, i + 2200);
    expect(fn, 'speak() 开头不应再有真人录音优先分支').not.toMatch(/custom\[key\]/);
    expect(fn, 'speak() 不应再从自定义映射取音频地址').not.toMatch(/new Audio\(custom/);
  });

  it('不再有 __PENDING__ 占位校验（该占位只服务于批量录音导入）', () => {
    expect(app).not.toMatch(/__PENDING__/);
  });

  it('不再缓存 _customVoice', () => {
    expect(app).not.toMatch(/_customVoice/);
  });

  it('custom_voice 存储键在应用代码中彻底消失', () => {
    expect(app).not.toMatch(/custom_voice/);
  });
});

describe('备份 / 导入 / 重置链路已清理', () => {
  it('store.js 不再映射 customVoice', () => {
    expect(store).not.toMatch(/customVoice/);
  });

  it('备份字段表不再含 customVoice', () => {
    expect(app).not.toMatch(/\['customVoice','custom_voice'/);
  });

  it('导入清洗不再写回 custom_voice', () => {
    expect(app).not.toMatch(/safe\.customVoice/);
    expect(app).not.toMatch(/setProgress\('custom_voice'/);
  });

  it('重置数据时不再清理 _customVoice 缓存', () => {
    expect(app).not.toMatch(/SpeechUtil\._customVoice = null/);
  });
});

describe('其余发音设置未被误伤', () => {
  it('在线音色与试听按钮保留', () => {
    expect(html).toMatch(/id="btn-voice-test"/);
    expect(app).toMatch(/safeBind\('btn-voice-test'/);
  });

  it('语音参数下拉与语速/音调保留', () => {
    // 这些是 select 的 id（连字符形式），不是 localStorage 键（下划线形式）
    expect(html).toMatch(/id="voice-rate"/);
    expect(html).toMatch(/id="voice-pitch"/);
    // 注：voice-instant 曾在此被断言「必须存在」，那是错误的设计锁定——
    // 「本地即时语音」开关已于方案 A 下线，其守护测试见
    // tests/core/voice-instant-toggle-removed.test.js（同时守住本机零延迟能力不被连坐删除）
  });

  it('SpeechUtil 仍导出', () => {
    expect(app).toMatch(/SpeechUtil/);
  });

  it('_attachAudioEl/_detachAudioEl 保留（在线音色与本地发音服务也用）', () => {
    expect(app).toMatch(/_attachAudioEl:\s*function/);
    expect(app).toMatch(/_detachAudioEl:\s*function/);
  });

  it('_stopLocalAudio 保留（在线音色播放也走它）', () => {
    expect(app).toMatch(/_stopLocalAudio/);
  });

  it('tts-manager 仍在（在线音色走它）', () => {
    expect(app).toMatch(/TTSManager/);
  });

  it('其余语音设置项未被误删', () => {
    expect(store).toMatch(/voiceName:\s*'voice_name'/);
    expect(store).toMatch(/voiceRate:\s*'voice_rate'/);
    expect(store).toMatch(/ttsVoice:\s*'tts_voice'/);
  });
});
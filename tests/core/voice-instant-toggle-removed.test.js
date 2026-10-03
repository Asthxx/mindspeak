import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// 设置页「本地即时语音」开关下线守护
//
// 决策记录（方案 A）：
//   本地即时语音不是独立功能，而是 app.js:662 的朗读总路由开关——
//   instant=true 走 _speakLocal（server SAPI，本机零延迟），
//   instant=false 走 _speakTTSOnline（百度/有道/谷歌 + speechSynthesis）。
//   删掉它等于让本机用户失去零延迟朗读，所以不能简单砍掉 instant。
//
//   采用 A：删 UI 与用户手动覆盖，instant 恒等于 !(serverDown)——
//   即探测到本机 server 就走本地即时语音，探测不到走在线。
//   这正是 app.js:291-295 里 hasInstant===false 分支的既有行为，
//   所以本机用户体验完全不变，网页版也不变。
//
//   不采用 B（仍读 voice_instant）：等于给一个看不见的开关留后门，
//   旧用户行为与新用户不一致且难以解释。
//   不采用 C（一律走在线）：本机零延迟体验消失，属真实功能退化，
//   且 _speakLocal / prefetch / keep-alive 全变死代码。
//
// 保留未动：_speakLocal、Piper/David/Zira 音色路径、prefetch、keep-alive、
// voice-select / voice-rate / voice-pitch / btn-voice-test。
// 删掉的是「用户能否手动拨这个开关」，不是「本机零延迟朗读」这个能力。

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => readFileSync(join(root, rel), 'utf8');

const app = read('js/app.js');
const html = read('index.html');
const store = read('js/core/store.js');

describe('设置页「本地即时语音」UI 已移除', () => {
  it('index.html 不含该开关的 checkbox', () => {
    expect(html, 'voice-instant checkbox 应删除').not.toContain('voice-instant');
  });

  it('index.html 不含「本地即时语音」文案', () => {
    expect(html, '「本地即时语音」文案应删除').not.toContain('本地即时语音');
  });

  it('index.html 不含「勾选…则用系统自带语音」这类引导勾选的说明', () => {
    expect(html, '说明文里引导勾选该开关的句子应改写').not.toMatch(/勾选[^<]*本地即时语音|勾选「本地即时语音」/);
  });
});

describe('手动覆盖的存储键已移除', () => {
  it('app.js 不再读写 voice_instant 键', () => {
    expect(app, 'voice_instant 的读写应删除').not.toMatch(/Storage\.set\(\s*'voice_instant'/);
    expect(app).not.toMatch(/Storage\.get\(\s*'voice_instant'/);
    expect(app, '不应再直接读 localStorage 探测该键').not.toMatch(/localStorage\.getItem\(\s*'voice_instant'\s*\)/);
  });

  it('store.js 不再声明 voiceInstant 映射', () => {
    expect(store, 'store.js 的 voiceInstant 映射应删除').not.toMatch(/voiceInstant:\s*'voice_instant'/);
  });

  it('备份字段表不再导出 voiceInstant', () => {
    const fields = app.match(/App\.prototype\._backupFields = \[[\s\S]*?\];/);
    expect(fields, '未找到 _backupFields').toBeTruthy();
    expect(fields[0], 'voiceInstant 不应再进备份').not.toContain("['voiceInstant'");
  });

  it('resetData 的 appKeys 保留 voice_instant 作旧数据清理', () => {
    const keys = app.match(/var appKeys = \[[\s\S]*?\];/);
    expect(keys, '未找到 appKeys').toBeTruthy();
    // 功能已删除，但键要留在 appKeys 里 —— 与 eca274d 保留 'items'/'item_buffs'
    // 的先例一致：旧用户 localStorage 中的残留键应由 resetData 清掉，
    // 否则这些死键会长期留在一用户数据里。
    expect(keys[0], 'voice_instant 应保留为旧数据清理项').toContain("'voice_instant'");
  });

  it('voice_instant 只出现在 appKeys 一处，不得有其它功能引用', () => {
    // appKeys 是纯清理清单，读写都在 Storage.remove(appKeys) 里。
    // 把它从 appKeys 之外抹掉，才能证明这个键确实只剩清理用途。
    // 注释行要排除：说明性文字提到键名不算引用。
    const code = app.split('\n')
      .filter((line) => !/^\s*\/\//.test(line))
      .join('\n')
      .replace(/var appKeys = \[[\s\S]*?\];/, 'var appKeys = [];');
    expect(code, 'voice_instant 不应出现在 appKeys 之外的代码中').not.toContain('voice_instant');
  });
});

describe('app.js 不再持有该开关的 UI 变量与事件绑定', () => {
  it('不再取用 voice-instant 元素', () => {
    expect(app, '不得再 getElementById 已删除的 voice-instant').not.toMatch(/getElementById\(\s*['"]voice-instant['"]/);
  });

  it('不再声明 voiceInstant 局部变量', () => {
    expect(app, 'voiceInstant 局部变量应删除').not.toMatch(/var voiceInstant\b/);
  });

  it('不再有切换该开关的 Toast 提示', () => {
    expect(app, '切换 Toast 应删除').not.toMatch(/已切换为本地即时语音|已切换为在线自然声/);
  });

  it('_syncInstantDefault 不再回写 checkbox', () => {
    // 原实现会把自动判定结果同步到 UI：var el = getElementById('voice-instant'); el.checked = target;
    expect(app, '不应再回写已删除的 checkbox').not.toMatch(/el\.checked\s*=\s*target/);
  });
});

describe('方案 A 核心语义：instant 恒由 server 可达性决定', () => {
  it('getSettings 不再返回 _defaultInstant（不再区分"用户设过没设过"）', () => {
    expect(app, '_defaultInstant 已无意义，应删除').not.toMatch(/_defaultInstant/);
  });

  it('_syncInstantDefault 不再因 _defaultInstant 而早退', () => {
    // 原守卫：if (!s || !s._defaultInstant) return;
    expect(app, '不应再有 _defaultInstant 早退守卫').not.toMatch(/!\s*s\._defaultInstant/);
  });

  it('instant 仍由 !(serverDown) 推导（保留本机零延迟能力）', () => {
    expect(app, '本机零延迟朗读必须保留：instant 仍按 serverDown 判定').toMatch(/instant:\s*!\(this\._serverDown === true\)/);
  });
});

describe('不得连坐删除本机朗读能力', () => {
  it('_speakLocal 仍在（instant=true 的实现）', () => {
    expect(app, '_speakLocal 是本机零延迟的实现，应保留').toMatch(/_speakLocal/);
  });

  it('朗读总路由分支仍在', () => {
    expect(app, 'app.js:662 的 instant 路由分支应保留').toMatch(/settings\.instant\s*&&\s*!\(this\._serverDown === true\)/);
  });

  it('Piper / SAPI 本地音色路径仍在', () => {
    expect(app, 'Piper 音色路径与 SAPI 音色路径应保留').toMatch(/__local_piper_/);
    expect(app).toMatch(/__local_david__|__local_zira__/);
  });

  it('预合成与 keep-alive 预热仍在（instant 的消费方）', () => {
    expect(app, 'prefetch 应保留').toMatch(/prefetch:\s*function/);
    expect(app, 'keep-alive 预热应保留').toMatch(/scheduleKeepAlive/);
    expect(app, '启动时的 primeVoices/scheduleKeepAlive 门控应保留').toMatch(/if \(!SpeechUtil\.getSettings\(\)\.instant\)/);
  });

  it('server 探测与降级提示仍在', () => {
    expect(app, '_probeServer 是 instant 判定的前提，应保留').toMatch(/_probeServer/);
    // 降级提示的完整门控：仅 server 不可达时提示，且 _probeNotifyShown 保证只弹一次。
    // 开关下线后这条提示承担了唯一的「已切到浏览器语音」用户告知，不能丢。
    expect(app, '降级 Toast 文案应保留').toMatch(/未检测到本地发音服务/);
    expect(app, '降级提示应仍受 _serverDown 门控').toMatch(/this\._serverDown === true && !this\._probeNotifyShown/);
    expect(app, '降级提示应仍受 Toast 存在性保护').toMatch(/if \(window\.Toast\) Toast\.warning/);
  });
});

describe('其余朗读设置不得被误伤', () => {
  it('voice-select / voice-rate / voice-pitch 仍在', () => {
    expect(html, '音色选择应保留').toContain('id="voice-select"');
    expect(html, '语速应保留').toContain('id="voice-rate"');
    expect(html, '音调应保留').toContain('id="voice-pitch"');
  });

  it('试听按钮仍在', () => {
    expect(html, 'btn-voice-test 应保留').toContain('btn-voice-test');
  });

  it('voice_name / voice_rate / voice_pitch 存储键仍在', () => {
    expect(app, 'voice_name 应保留').toMatch(/voice_name/);
    expect(app, 'voice_rate 应保留').toMatch(/voice_rate/);
    expect(app, 'voice_pitch 应保留').toMatch(/voice_pitch/);
    expect(store).toMatch(/voiceName:\s*'voice_name'/);
  });
});

describe('不得留下悬空引用', () => {
  it('app.js 无对已删除 checkbox 的引用', () => {
    expect(app, '不得残留 voice-instant 引用').not.toMatch(/voice-instant/);
  });

  it('store.js 无对已删除映射的读取方', () => {
    // voiceInstant 映射删除后，全仓不应再有 Storage.get('voiceInstant') 之类调用
    expect(app, '不应再取用已删除的 voiceInstant 映射').not.toMatch(/Storage\.\w+\(\s*['"]voiceInstant['"]/);
    expect(store, 'store.js 不应再有 voiceInstant').not.toMatch(/voiceInstant/);
  });
});
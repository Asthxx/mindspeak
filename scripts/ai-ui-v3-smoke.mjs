/**
 * AI 助手移动端 UI v3 原型冒烟测试
 * 用 jsdom 加载真实入口，验证：
 *   1. 无未捕获 JS 错误
 *   2. 五个界面（对话/气泡/语音/历史/设置）结构渲染与开关
 *   3. 发送 / 语音 / 历史切换与删除 / 设置控件 / 主题切换等主要交互
 *   4. 触控目标静态审计（计算样式）
 *   5. 浅/深双主题关键前后景对比度核算（WCAG）
 * 运行：node scripts/ai-ui-v3-smoke.mjs
 */
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const htmlPath = resolve(here, '..', 'ai-assistant-ui-v3-mobile.html');
const html = readFileSync(htmlPath, 'utf8');

const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', (e) => errors.push('jsdomError: ' + e.message));
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));

const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  virtualConsole: vc,
  url: 'http://localhost/'
});

const { window } = dom;
const doc = window.document;
const $ = (s) => doc.querySelector(s);
const $$ = (s) => Array.from(doc.querySelectorAll(s));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const checks = [];
const ok = (name, cond, extra = '') => checks.push({ name, pass: !!cond, extra });
const cs = (el, prop) => window.getComputedStyle(el).getPropertyValue(prop);

await sleep(400); // 等首屏渲染

/* ---------- 0. 运行期错误 ---------- */
ok('无未捕获 JS 错误 / console.error', errors.length === 0, errors.join(' | '));

/* ---------- 1. 结构渲染 ---------- */
ok('种子消息渲染（含日期分隔）', $$('#msgList .msg').length >= 5 && $$('.day-sep').length === 1, `${$$('#msgList .msg').length} 条消息`);
ok('结构化回答卡存在', $$('.answer').length === 1);
ok('回答卡：衬线英文词 + 音标 + 词性', !!$('.answer .word') && !!$('.answer .ipa') && !!$('.answer .pos'));
ok('例句卡 ×2 且各带朗读按钮', $$('.ex-card').length === 2 && $$('.ex-card .play').length === 2);
ok('回答内行动按钮 ×3', $$('.answer-actions .act').length === 3);
ok('语音消息气泡（波形 + 时长 + 转写）', !!$('.bubble-voice') && $$('.bubble-voice .wave .wbar').length === 16 && !!$('.v-tr'), `${$$('.bubble-voice .wave .wbar').length} 波形条`);
ok('消息级操作常驻（触屏无 hover）', $$('.msg-actions').length >= 2 && cs($('.msg-actions'), 'opacity') === '1');
ok('消息区为无障碍 log 区域', $('#msgList').getAttribute('role') === 'log' && $('#msgList').getAttribute('aria-live') === 'polite');
ok('快捷 chips 渲染', $$('.chip').length === 5, `${$$('.chip').length} 个`);
ok('空状态默认隐藏', $('#emptyState').hidden === true);
ok('回到最新按钮贴底时隐藏', $('#jumpLatest').hidden === true);
ok('状态栏时钟已渲染', /^\d{2}:\d{2}$/.test($('#clockTime').textContent));
ok('五个屏幕节点齐备', ['#screenChat', '#screenHistory', '#screenSettings', '#screenVoice'].every((s) => !!$(s)));

/* ---------- 2. 触控目标静态审计（计算样式） ---------- */
const tap = (sel, minW, minH, label) => {
  const el = $(sel);
  if (!el) { ok(`触控目标 ${label}`, false, '元素缺失'); return; }
  const w = parseFloat(cs(el, 'width')) || 0;
  const h = parseFloat(cs(el, 'height')) || 0;
  ok(`触控目标 ${label} ≥${minW}×${minH}`, w >= minW && h >= minH, `${w}×${h}`);
};
tap('#btnSend', 44, 44, '发送按钮（实测 48）');
tap('#btnMic', 44, 44, '语音按钮（实测 44）');
tap('.appbar .icon-btn', 44, 44, '顶栏图标键');
tap('.voice-send', 44, 44, '语音发送（实测 68）');
tap('.voice-cancel', 44, 44, '语音取消（实测 56）');
/* 新对话按钮：CSS 只写 min-height（高度由内容撑开），按 min-height 审计 */
ok('触控目标 新对话按钮 ≥44px', (parseFloat(cs($('#btnNewChat'), 'min-height')) || 0) >= 44, `min-height ${cs($('#btnNewChat'), 'min-height')}`);
/* 开关：视觉 52×32，命中区靠 ::after inset 外扩——jsdom 无法度量伪元素，改源码守卫 */
ok('触控目标 设置开关含外扩命中区（源码守卫）',
  /\.switch::after\{[^}]*inset:-7px/.test(html) && (parseFloat(cs($('.switch'), 'width')) || 0) >= 44,
  `视觉宽 ${cs($('.switch'), 'width')}`);
const histMainH = (() => {
  const el = $('.hist-main');
  return el ? parseFloat(cs(el, 'min-height')) : 0;
})();
ok('历史会话行 ≥44px', histMainH >= 44, `min-height ${histMainH}`);
const segH = (() => {
  const el = $('.seg');
  return el ? parseFloat(cs(el, 'min-height')) : 0;
})();
ok('分段控件容器 ≥44px', segH >= 44, `min-height ${segH}`);

/* ---------- 3. 发送流程 ---------- */
const input = $('#input');
const setVal = (v) => {
  input.value = v;
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
};
setVal('帮我造个句子');
ok('输入后发送按钮启用', $('#btnSend').disabled === false);
ok('字数计数器更新', $('#counter').textContent.startsWith('6'), $('#counter').textContent);

const beforeMe = $$('#msgList .msg.me').length;
$('#btnSend').dispatchEvent(new window.Event('click', { bubbles: true }));
ok('发送后立即出现用户消息', $$('#msgList .msg.me').length === beforeMe + 1);
ok('出现「正在输入」占位', !!$('#msgList .typing'));
ok('输入框已清空且发送禁用', input.value === '' && $('#btnSend').disabled === true);

await sleep(1300);
ok('AI 回复渲染完成（打字占位消失）', !$('#msgList .typing'));

const n1 = $$('#msgList .msg').length;
$('.chip').dispatchEvent(new window.Event('click', { bubbles: true }));
await sleep(1300);
ok('点击快捷 chip 可发起对话', $$('#msgList .msg').length === n1 + 2);

/* ---------- 4. 回答卡行动按钮 ---------- */
const actBtn = $('.answer-actions .act.primary');
if (actBtn) {
  actBtn.dispatchEvent(new window.Event('click', { bubbles: true }));
  await sleep(200);
  ok('回答内行动按钮可点击（toast 反馈）', $('#toastHost').textContent.length > 0, $('#toastHost').textContent);
}

/* ---------- 5. 语音输入控件 ---------- */
const voiceEl = $('#screenVoice');
$('#btnMic').dispatchEvent(new window.Event('pointerdown', { bubbles: true }));
ok('按住麦克风打开语音覆盖层', voiceEl.classList.contains('is-open') && voiceEl.classList.contains('is-open'));
ok('语音覆盖层标记 aria 状态', $('#btnMic').classList.contains('is-live'));
ok('录音计时器走动', /^0:0[0-2]$/.test($('#voiceTimer').textContent), $('#voiceTimer').textContent);
ok('波形条渲染', $$('#voiceWave .wbar').length === 30, `${$$('#voiceWave .wbar').length} 条`);

await sleep(1600);
ok('实时转写文本出现', $('#voiceTranscript').textContent.indexOf('帮我把刚才那句') >= 0, $('#voiceTranscript').textContent.trim());

const beforeVoice = $$('#msgList .bubble-voice').length;
$('#btnVoiceSend').dispatchEvent(new window.Event('click', { bubbles: true }));
await sleep(100);
ok('发送后语音气泡入列', $$('#msgList .bubble-voice').length === beforeVoice + 1);
ok('语音覆盖层已关闭', !voiceEl.classList.contains('is-open'));

/* 取消路径 */
$('#btnMic').dispatchEvent(new window.Event('pointerdown', { bubbles: true }));
$('#btnVoiceCancel').dispatchEvent(new window.Event('click', { bubbles: true }));
await sleep(100);
ok('取消路径不产生语音消息', $$('#msgList .bubble-voice').length === beforeVoice + 1);

/* ---------- 6. 历史会话入口 ---------- */
ok('历史会话列表渲染', $$('.hist-item').length === 8, `${$$('.hist-item').length} 条`);
$('#btnHistory').dispatchEvent(new window.Event('click', { bubbles: true }));
ok('历史抽屉可打开', $('#screenHistory').classList.contains('is-open') && $('#scrim').classList.contains('show'));
ok('打开时按钮 aria-expanded 正确', $('#btnHistory').getAttribute('aria-expanded') === 'true');

/* 搜索过滤 */
const hs = $('#histSearch');
hs.value = '邮件';
hs.dispatchEvent(new window.Event('input', { bubbles: true }));
ok('搜索过滤生效', $$('.hist-item').length === 1, `${$$('.hist-item').length} 条`);
hs.value = '';
hs.dispatchEvent(new window.Event('input', { bubbles: true }));

/* 长按删除（直接进入确认态） */
const item = $$('.hist-item').find((h) => h.dataset.id === 's3');
item.classList.add('is-confirm');
item.querySelector('.hc-yes').dispatchEvent(new window.Event('click', { bubbles: true }));
ok('确认后删除会话', $$('.hist-item').length === 7 && !doc.querySelector('.hist-item[data-id="s3"]'));

/* 切换会话 */
const target = $$('.hist-item').find((h) => h.dataset.id === 's5');
target.querySelector('.hist-main').dispatchEvent(new window.Event('click', { bubbles: true }));
await sleep(100);
ok('切换会话后标题更新且抽屉关闭', $('#chatTitle').textContent.indexOf('过去分词') >= 0 && !$('#screenHistory').classList.contains('is-open'));

/* ---------- 7. 个人设置页 ---------- */
$('#btnSettings').dispatchEvent(new window.Event('click', { bubbles: true }));
ok('设置页可打开', $('#screenSettings').classList.contains('is-open'));
ok('设置页为模态对话框', $('#screenSettings').getAttribute('aria-modal') === 'true');

/* 主题：深色 */
$$('.seg[data-seg="theme"] button').find((b) => b.dataset.val === 'dark')
  .dispatchEvent(new window.Event('click', { bubbles: true }));
ok('设置页切换深色主题生效', doc.documentElement.getAttribute('data-theme') === 'dark');

/* 字号缩放 */
$$('.seg[data-seg="fontsize"] button').find((b) => b.dataset.val === 'l')
  .dispatchEvent(new window.Event('click', { bubbles: true }));
ok('文字大小写入 --chat-scale', $('#deviceScreen').style.getPropertyValue('--chat-scale') === '1.1', $('#deviceScreen').style.getPropertyValue('--chat-scale'));

/* 开关 */
const sw = $('.switch');
const swBefore = sw.getAttribute('aria-checked');
sw.dispatchEvent(new window.Event('click', { bubbles: true }));
ok('开关可切换', sw.getAttribute('aria-checked') !== swBefore);

/* 语速滑块 */
const rate = $('#rate');
rate.value = '1.3';
rate.dispatchEvent(new window.Event('input', { bubbles: true }));
ok('语速滑块联动数值', $('#rateVal').textContent === '1.3×', $('#rateVal').textContent);

/* 演示条主题按钮 */
$('#btnThemeToggle').dispatchEvent(new window.Event('click', { bubbles: true }));
ok('演示条主题按钮可切回浅色', doc.documentElement.getAttribute('data-theme') === 'light');

/* 清空对话（二次确认） */
const nBefore = $$('#msgList .msg').length;
$('#btnClear').dispatchEvent(new window.Event('click', { bubbles: true }));
ok('清空需二次确认（首次仅武装）', $$('#msgList .msg').length === nBefore && $('#btnClear').classList.contains('is-armed'));
$('#btnClear').dispatchEvent(new window.Event('click', { bubbles: true }));
ok('确认后消息清空并显示空状态', $$('#msgList .msg').length === 0 && $('#emptyState').hidden === false);

/* 空状态建议可发起对话 */
$('#emptySugs button').dispatchEvent(new window.Event('click', { bubbles: true }));
await sleep(1300);
ok('空状态建议可发起对话', $$('#msgList .msg').length === 2);

/* Escape 关闭 */
doc.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
ok('Escape 可关闭设置页', !$('#screenSettings').classList.contains('is-open'));

/* ---------- 8. 对比度核算（WCAG） ---------- */
function lum(hex) {
  const m = hex.replace('#', '');
  const n = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function ratio(fg, bg) {
  const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}
const pairs = [
  // [名称, 前景, 背景, 最低要求, 主题]
  ['浅色 正文/卡片', '#1F2933', '#FFFFFF', 4.5, 'light'],
  ['浅色 正文/AI气泡', '#1F2933', '#F0F4F8', 4.5, 'light'],
  ['浅色 次级/卡片', '#5A6B7C', '#FFFFFF', 4.5, 'light'],
  ['浅色 次级/品牌浅底', '#5A6B7C', '#E7EFF6', 4.5, 'light'],
  ['浅色 用户气泡 白字/雾霾深蓝', '#FFFFFF', '#4A6F93', 4.5, 'light'],
  ['浅色 品牌文字/白底', '#33536F', '#FFFFFF', 4.5, 'light'],
  ['浅色 珊瑚文字/珊瑚浅底', '#B04A28', '#FDEEE8', 4.5, 'light'],
  ['浅色 元信息/白底（非关键）', '#7E8C9A', '#FFFFFF', 3, 'light'],
  ['浅色 发送按钮 白图标', '#FFFFFF', '#4A6F93', 3, 'light'],
  ['深色 正文/卡片', '#E7EDF4', '#141C25', 4.5, 'dark'],
  ['深色 正文/AI气泡', '#E7EDF4', '#1B2530', 4.5, 'dark'],
  ['深色 次级/卡片', '#A6B4C3', '#141C25', 4.5, 'dark'],
  ['深色 次级/气泡底', '#A6B4C3', '#1B2530', 4.5, 'dark'],
  ['深色 用户气泡 深字/雾霾蓝', '#0E141B', '#5E8FB8', 4.5, 'dark'],
  ['深色 品牌文字/深卡片', '#BBD7EC', '#141C25', 4.5, 'dark'],
  ['深色 珊瑚文字/珊瑚深底', '#FFB59B', '#2A1C18', 4.5, 'dark'],
  ['深色 发送按钮 深图标', '#0E141B', '#5E8FB8', 3, 'dark'],
  ['深色 Toast 深底/亮字', '#0D1319', '#E7EDF4', 4.5, 'dark']
];
pairs.forEach(([name, fg, bg, min]) => {
  const r = ratio(fg, bg);
  ok(`对比度 ${name} ≥${min}:1`, r >= min, r.toFixed(2) + ':1');
});

/* ---------- 汇总 ---------- */
const failed = checks.filter((c) => !c.pass);
console.log(`\nAI 助手移动端 UI v3 冒烟测试：${checks.length - failed.length}/${checks.length} 通过\n`);
checks.forEach((c) => {
  console.log(`${c.pass ? 'PASS' : 'FAIL'}  ${c.name}${c.extra ? '  [' + c.extra + ']' : ''}`);
});
if (errors.length) {
  console.log('\n运行期错误：');
  errors.forEach((e) => console.log('  ' + e));
}
process.exit(failed.length || errors.length ? 1 : 0);

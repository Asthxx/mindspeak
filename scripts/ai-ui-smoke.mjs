/**
 * AI 助手 UI v2 原型冒烟测试
 * 用 jsdom 加载真实入口，验证：脚本无未捕获错误 / 关键结构渲染 / 主要交互可用。
 * 运行：node scripts/ai-ui-smoke.mjs
 */
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const htmlPath = resolve(here, '..', 'ai-assistant-ui-v2.html');
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

const checks = [];
const ok = (name, cond, extra = '') => checks.push({ name, pass: !!cond, extra });

await new Promise((r) => setTimeout(r, 400)); // 等首屏渲染

// 1. 结构渲染
ok('历史栏渲染出会话项', $$('.hist-item').length >= 4, `${$$('.hist-item').length} 条`);
ok('快捷提问 chips 渲染', $$('.chip').length === 6, `${$$('.chip').length} 个`);
ok('消息列表已渲染', $$('#msgList .msg').length >= 2, `${$$('#msgList .msg').length} 条`);
ok('结构化回答卡存在', $$('.answer').length >= 1, `${$$('.answer').length} 张`);
ok('例句卡 + 朗读按钮', $$('.ex-card .play').length >= 1, `${$$('.ex-card .play').length} 个`);
ok('消息级操作（复制/朗读/重生成）', $$('.msg-actions [data-act]').length >= 3);
ok('消息区为无障碍 log 区域', $('#msgList').getAttribute('role') === 'log' && $('#msgList').getAttribute('aria-live') === 'polite');
ok('输入框初始发送按钮禁用', $('#btnSend').disabled === true);
ok('不采用气泡内折叠（避免双重滚动容器）', $$('.clamp, .expand-btn').length === 0);
ok('「回到最新」按钮存在且贴底时隐藏', !!$('#jumpLatest') && $('#jumpLatest').hidden === true);
ok('消息区是唯一滚动容器', $$('.msg-scroll').length === 1 && !!$('.conv-body .msg-scroll'));

// 2. 输入 → 发送
const input = $('#input');
const setVal = (v) => {
  input.value = v;
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
};
setVal('帮我制定学习计划');
ok('输入后发送按钮启用', $('#btnSend').disabled === false);
ok('字数计数器更新', $('#counter').textContent.startsWith('8'), $('#counter').textContent);

const before = $$('#msgList .msg.me').length;
$('#btnSend').dispatchEvent(new window.Event('click', { bubbles: true }));
ok('发送后立即出现用户消息', $$('#msgList .msg.me').length === before + 1);
ok('出现「正在输入」占位', !!$('#msgList .typing'));

await new Promise((r) => setTimeout(r, 900));
ok('AI 回复渲染完成（打字占位消失）', !$('#msgList .typing'));
ok('AI 回复为结构化卡片', $$('#msgList .msg:last-child .answer').length === 1);
ok('输入框已清空', input.value === '');

// 3. 快捷提问 chip
const n1 = $$('#msgList .msg').length;
$('.chip').dispatchEvent(new window.Event('click', { bubbles: true }));
await new Promise((r) => setTimeout(r, 900));
ok('点击快捷提问可发起对话', $$('#msgList .msg').length === n1 + 2);

// 4. 回答内行动按钮
const actBtn = $('.answer-actions .act');
if (actBtn) {
  const n2 = $$('#msgList .msg').length;
  actBtn.dispatchEvent(new window.Event('click', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 900));
  ok('回答内行动按钮可一键追问', $$('#msgList .msg').length === n2 + 2);
}

// 5. 历史切换（点击后列表会重绘，需重新查询节点）
const target = $$('.hist-item').find((h) => h.dataset.id === 's3');
if (target) {
  target.querySelector('.hist-main').dispatchEvent(new window.Event('click', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 100));
  const cur = $('.hist-main[aria-current="true"]');
  ok('切换历史会话生效', !!cur && cur.dataset.id === 's3', cur ? cur.dataset.id : 'none');
  ok('历史项无嵌套交互元素（button 内不含 button）', $$('.hist-item button button').length === 0);
  ok('删除按钮是独立 button', $$('.hist-item > button.del').length === $$('.hist-item').length);
}

// 6. 设置抽屉
$('#btnSettings').dispatchEvent(new window.Event('click', { bubbles: true }));
ok('设置抽屉可打开', $('#drawer').classList.contains('open') && $('#drawer').getAttribute('aria-hidden') === 'false');
$('#btnCloseDrawer').dispatchEvent(new window.Event('click', { bubbles: true }));
ok('设置抽屉可关闭', !$('#drawer').classList.contains('open'));

// 7. 开关 → 状态徽章联动
const sw = $('#swLlm');
sw.dispatchEvent(new window.Event('click', { bubbles: true }));
ok('LLM 开关联动状态徽章切到离线', $('#statusBadge').dataset.state === 'off' && /离线/.test($('#statusBadge').textContent));
sw.dispatchEvent(new window.Event('click', { bubbles: true }));
ok('LLM 开关可切回在线增强', $('#statusBadge').dataset.state === 'on');

// 8. 主题切换
$('#btnTheme').dispatchEvent(new window.Event('click', { bubbles: true }));
ok('主题可切换到深色', doc.documentElement.getAttribute('data-theme') === 'dark');
$('#btnTheme').dispatchEvent(new window.Event('click', { bubbles: true }));
ok('主题可切回浅色', doc.documentElement.getAttribute('data-theme') === 'light');

// 9. 优化前 / 优化后 对比
const legacyBtn = doc.querySelector('[data-mode="legacy"]');
legacyBtn.dispatchEvent(new window.Event('click', { bubbles: true }));
await new Promise((r) => setTimeout(r, 100));
ok('切到「优化前」旧版气泡', $$('#msgList .answer').length === 0 && $$('#msgList .bubble').length > 0);
doc.querySelector('[data-mode="new"]').dispatchEvent(new window.Event('click', { bubbles: true }));
await new Promise((r) => setTimeout(r, 100));
ok('切回「优化后」结构化卡片', $$('#msgList .answer').length >= 1);

// 10. 视口切换
doc.querySelector('[data-view="phone"]').dispatchEvent(new window.Event('click', { bubbles: true }));
ok('视口可切到手机档', $('#device').dataset.view === 'phone');

// 11. 新对话
$('#btnNew').dispatchEvent(new window.Event('click', { bubbles: true }));
await new Promise((r) => setTimeout(r, 100));
ok('可新建对话并给出引导', $$('#msgList .msg').length === 1 && /新对话已开始/.test($('#msgList').textContent));

// 12. 无未捕获错误
ok('运行期无 JS 报错', errors.length === 0, errors.join(' | '));

const failed = checks.filter((c) => !c.pass);
console.log('\n=== AI 助手 UI v2 原型冒烟测试 ===');
checks.forEach((c) => console.log(`${c.pass ? 'PASS' : 'FAIL'}  ${c.name}${c.extra ? '  (' + c.extra + ')' : ''}`));
console.log(`\n合计 ${checks.length} 项，通过 ${checks.length - failed.length}，失败 ${failed.length}`);
if (errors.length) console.log('\n捕获到的错误：\n' + errors.join('\n'));
dom.window.close();
process.exit(failed.length ? 1 : 0);

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const mobileCss = readFileSync(join(root, 'css', 'mobile.css'), 'utf8');
const styleCss = readFileSync(join(root, 'css', 'style.css'), 'utf8');

// Android 能力测评弹窗适配回归测试：
// 根因：老 WebView 不支持 dvh → 声明整条丢弃 → height 无界 → flex 滚动链断裂；
// 且 html.forced-mobile .modal-content (0,2,1) 的 max-height 压过 Android 规则 (0,2,0)。

// 提取不在任何 @media/@supports 块内的顶层 CSS 文本（括号深度解析，支持任意嵌套）
function topLevelText(css) {
  const stack = [];
  let lastClose = 0, out = '';
  for (let i = 0; i <= css.length; i++) {
    const ch = css[i];
    if (ch === '{') {
      if (!stack.some(Boolean)) out += css.slice(lastClose, i);
      const head = css.slice(lastClose, i);
      stack.push(/@[\w-]+/.test(head));
      lastClose = i + 1;
    } else if (ch === '}') {
      stack.pop();
      lastClose = i + 1;
    }
  }
  return out;
}

describe('测评弹窗 Android 适配 — css/mobile.css', () => {
  it('android_fullscreen_rule_scoped_to_phone_widths', () => {
    // 全屏化规则必须限定在 ≤768px 媒体查询内，不得在所有宽度生效
    expect(mobileCss).toMatch(/@media \(max-width:768px\)\{\s*\.platform-android \.modal-content\.assess-modal-content\{[^}]*height:100vh/);
  });

  it('android_rule_uses_vh_fallback_with_supports_dvh_upgrade', () => {
    // vh 兜底在前，@supports (height:100dvh) 升级在后
    expect(mobileCss).toContain('@supports (height:100dvh)');
    const supportsBlock = mobileCss.split('@supports (height:100dvh)')[1] || '';
    expect(supportsBlock).toContain('.platform-android .modal-content.assess-modal-content');
    expect(supportsBlock).toContain('height:100dvh');
  });

  it('android_rule_specificity_beats_forced_mobile_rule', () => {
    // .platform-android .modal-content.assess-modal-content = (0,3,0)
    // 必须压过 html.forced-mobile .modal-content = (0,2,1)
    expect(mobileCss).toContain('.platform-android .modal-content.assess-modal-content{border-radius:0;max-height:100vh;height:100vh}');
    expect(mobileCss).toContain('html.forced-mobile .modal-content{width:100%;max-width:100%;max-height:88dvh;overflow-y:auto;border-radius:var(--radius-lg) var(--radius-lg) 0 0}');
  });

  it('mobile_assess_width_rule_has_class_specificity_and_vh_fallback', () => {
    // 768px 断点内 width:100% 用 .modal-content.assess-modal-content (0,2,0)，max-height 双声明兜底
    expect(mobileCss).toContain('.modal-content.assess-modal-content{width:100%;max-width:100%;max-height:92vh;max-height:92dvh}');
  });

  it('no_unscoped_dvh_height_on_assess_modal', () => {
    // 不允许媒体查询之外出现 assess 弹窗的 dvh 高度声明（防回归）
    expect(topLevelText(mobileCss)).not.toMatch(/assess-modal-content[^}]*dvh/);
  });
});

describe('测评弹窗滚动链 — css/style.css', () => {
  it('assess_view_has_bounded_flex_scroll', () => {
    expect(styleCss).toMatch(/\.assess-view\{[^}]*flex:1;min-height:0;overflow-y:auto/);
  });

  it('quiz_body_has_bounded_flex_scroll', () => {
    expect(styleCss).toMatch(/#assess-quiz-body\{[^}]*flex:1;min-height:0;overflow-y:auto/);
  });

  it('assess_nav_does_not_shrink_bottom_buttons_visible', () => {
    expect(styleCss).toMatch(/\.assess-nav\{\s*flex-shrink:0/);
  });

  it('base_assess_modal_keeps_vh_maxheight_fallback', () => {
    // 老 WebView 下所有 dvh 规则失效时，基础规则的 vh max-height 兜底必须有界
    expect(styleCss).toMatch(/\.assess-modal-content\{[^}]*max-height:94vh/);
  });
});

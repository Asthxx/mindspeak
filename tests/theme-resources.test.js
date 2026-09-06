// ThemeShop 的 8 个商城主题预览图必须存在（assets/themes/<id>.svg）。
// 缺失会导致 items 页主题商城预览 404（E2E 浏览器捕获：aurora/ember/zen/
// cyberpunk/nordic/vintage/space/candy 全部 404）。
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const THEME_IDS = ['aurora', 'ember', 'zen', 'cyberpunk', 'nordic', 'vintage', 'space', 'candy'];

describe('theme shop preview assets', () => {
  THEME_IDS.forEach((id) => {
    it(`assets/themes/${id}.svg exists and is non-empty`, () => {
      const p = join(ROOT, 'assets', 'themes', id + '.svg');
      expect(existsSync(p), `missing ${p}`).toBe(true);
      const svg = readFileSync(p, 'utf8');
      expect(svg.length).toBeGreaterThan(50);
      // 必须含渐变（预览图片应是一张真实 SVG 背景，而不是空文件/占位）
      expect(svg).toMatch(/<svg/i);
      expect(svg).toMatch(/stop|linearGradient/i);
    });
  });
});
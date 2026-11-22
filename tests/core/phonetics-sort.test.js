// 音标网格按字母顺序展示（用户要求：48 个音标按字母顺序排一下）
//
// 原实现按教学分类拼接（元音在前、辅音在后，内部再按发音方式分组），
// 用户要求改为按音标符号的字母顺序展示。分类筛选（全部/元音/辅音）保持不变，
// 只是每种视图内的排列都按字母序。排序在展示层做（_sortSymbols 返回副本），
// 不动数据源 —— 详情弹层的查找、掌握度统计都不受影响。
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { bootstrapApp } from '../helpers/app-bootstrap.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

describe('音标排序', () => {
  beforeEach(async () => {
    vi.resetModules();
    await bootstrapApp();
  });

  it('PhoneticModule 提供 _sortSymbols，按 symbol 字母序排序且不改原数组', () => {
    const mod = window.app.phoneticModule;
    expect(mod, '音标模块应已初始化').toBeTruthy();
    expect(typeof mod._sortSymbols).toBe('function');
    const input = [{ symbol: 'θ', name: '清辅音' }, { symbol: 'b', name: 'B' }, { symbol: 'æ', name: 'A' }];
    const out = mod._sortSymbols(input);
    expect(out.map(x => x.symbol)).toEqual(input.map(x => x.symbol).slice().sort((a, b) => a.localeCompare(b, 'en')));
    // 不改原数组顺序
    expect(input.map(x => x.symbol)).toEqual(['θ', 'b', 'æ']);
  });

  it('进入音标页（全部视图）：卡片顺序与 _sortSymbols 一致（即字母序）', () => {
    window.app.showTab('phonetics');
    const cards = [...document.querySelectorAll('#phonetic-grid .ph-card')].map(c => c.dataset.symbol);
    const mod = window.app.phoneticModule;
    const expected = mod._sortSymbols(window.PHONETIC_DATA.vowels.concat(window.PHONETIC_DATA.consonants)).map(p => p.symbol);
    expect(cards).toEqual(expected);
  });

  it('分类筛选（元音视图）下同样按字母序', () => {
    window.app.showTab('phonetics');
    document.getElementById('phonetic-category').value = 'vowels';
    document.getElementById('phonetic-category').dispatchEvent(new Event('change'));
    const cards = [...document.querySelectorAll('#phonetic-grid .ph-card')].map(c => c.dataset.symbol);
    const expected = window.app.phoneticModule._sortSymbols(window.PHONETIC_DATA.vowels).map(p => p.symbol);
    expect(cards).toEqual(expected);
  });

  it('真实数据 48 个音标全量排序后依然 48 个、无丢失无重复', () => {
    const src = readFileSync(join(root, 'data', 'all-data.js'), 'utf8');
    const pd = new Function(src + '\n;return PHONETIC_DATA;')();
    const all = pd.vowels.concat(pd.consonants);
    const sorted = window.app.phoneticModule._sortSymbols(all);
    expect(sorted.length).toBe(48);
    expect(new Set(sorted.map(p => p.symbol)).size).toBe(48);
    // 相邻两两用同一 comparator 校验为非降序（自洽定义的"字母序"）
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i - 1].symbol.localeCompare(sorted[i].symbol, 'en')).toBeLessThanOrEqual(0);
    }
  });
});

// 行为级测试：单词学习模块（真实 DOM + 真实 app.js 模块，经由 bootstrapApp 加载）
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { bootstrapApp } from './helpers/app-bootstrap.js';

const today = () => {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};
const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};

describe('WordModule 行为', () => {
  beforeEach(async () => {
    vi.resetModules();
    await bootstrapApp();
  });

  function showWordTab() {
    window.app.showTab('word');
    return window.app.wordModule;
  }

  it('should_render_first_word_card_on_word_tab', () => {
    const wm = showWordTab();
    expect(document.getElementById('word-front').textContent).toContain('apple');
    expect(document.getElementById('word-back').textContent).toContain('苹果');
    expect(document.getElementById('word-progress').textContent).toBe('1/5');
    expect(wm.currentIndex).toBe(0);
    expect(wm.currentCategoryIndex).toBe(0);
  });

  it('should_mark_known_advance_and_schedule_future_review', () => {
    const wm = showWordTab();
    document.getElementById('btn-known').click();
    const p = wm.wordProgress['apple-0'];
    expect(p).toBeTruthy();
    expect(p.reviewCount).toBe(1);
    expect(p.status).toBe('learning');
    expect(p.nextReview).not.toBe(today());
    expect(p.lastReviewed).toBe(today());
    // 自动前进到下一卡
    expect(document.getElementById('word-front').textContent).toContain('book');
    expect(document.getElementById('word-progress').textContent).toBe('2/5');
  });

  it('should_mark_forgot_as_failed_with_zero_count', () => {
    const wm = showWordTab();
    document.getElementById('btn-forgot').click();
    const p = wm.wordProgress['apple-0'];
    expect(p.status).toBe('failed');
    expect(p.reviewCount).toBe(0);
    // 自适应默认开：不认识次日再来
    expect(p.nextReview).toBe(tomorrow());
    expect(document.getElementById('word-front').textContent).toContain('book');
  });

  it('should_mark_hesitate_with_incrementing_review_count', () => {
    const wm = showWordTab();
    document.getElementById('btn-hesitate').click();
    const p = wm.wordProgress['apple-0'];
    expect(p.status).toBe('learning');
    expect(p.reviewCount).toBe(1);
    expect(p.nextReview).not.toBe(today());
  });

  it('should_flip_card_and_favorite_current_word', () => {
    showWordTab();
    const back = document.getElementById('word-back');
    expect(back.classList.contains('hidden')).toBe(true);
    document.getElementById('btn-flip').click();
    expect(back.classList.contains('hidden')).toBe(false);
    document.getElementById('btn-fav-word').click();
    const favs = window.DataStore.getProgress('favorites', []);
    expect(favs.length).toBe(1);
    expect(favs[0].word).toBe('apple');
    // toggle: 重复收藏 = 取消收藏
    document.getElementById('btn-fav-word').click();
    expect(window.DataStore.getProgress('favorites', []).length).toBe(0);
    // 再次收藏
    document.getElementById('btn-fav-word').click();
    expect(window.DataStore.getProgress('favorites', []).length).toBe(1);
  });

  it('should_jump_to_word_by_number_and_persist_card_position', async () => {
    const wm = showWordTab();
    const input = document.getElementById('word-jump-input');
    input.value = '3';
    document.getElementById('btn-jump-word').click();
    expect(wm.currentIndex).toBe(2);
    expect(document.getElementById('word-front').textContent).toContain('cat');
    // saveCardPos 是 500ms 节流写盘；内存映射同步更新，落盘需等
    expect(wm._cardPosMap.c0).toEqual({ index: 2, listPage: 1 });
    await new Promise((r) => setTimeout(r, 550));
    const pos = window.Storage.getJSON('word_card_pos', {});
    expect(pos.c0).toEqual({ index: 2, listPage: 1 });
  });

  it('should_search_word_list_and_filter_by_status', () => {
    showWordTab();
    document.getElementById('btn-view-list').click();
    const list = document.getElementById('word-list');
    expect(list.classList.contains('hidden')).toBe(false);
    const search = document.getElementById('word-search');
    search.value = 'app';
    search.dispatchEvent(new Event('input'));
    let rows = document.querySelectorAll('#word-list-body .wl-row');
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain('apple');
    // 中文释义也可搜
    search.value = '苹果';
    search.dispatchEvent(new Event('input'));
    rows = document.querySelectorAll('#word-list-body .wl-row');
    expect(rows.length).toBe(1);
  });

  it('should_reject_duplicate_or_empty_word_when_adding', () => {
    const wm = showWordTab();
    const before = wm.categories[0].words.length;
    // 空值
    document.getElementById('new-word').value = '   ';
    document.getElementById('form-add-word').dispatchEvent(new Event('submit', { cancelable: true }));
    expect(wm.categories[0].words.length).toBe(before);
    // 重复（含大小写差异）
    document.getElementById('new-word').value = 'Apple';
    document.getElementById('form-add-word').dispatchEvent(new Event('submit', { cancelable: true }));
    expect(wm.categories[0].words.length).toBe(before);
    // 合法新词
    document.getElementById('new-word').value = 'zzz';
    document.getElementById('form-add-word').dispatchEvent(new Event('submit', { cancelable: true }));
    expect(wm.categories[0].words.length).toBe(before + 1);
  });

  it('should_reject_words_with_illegal_characters_or_excessive_length', () => {
    const wm = showWordTab();
    const before = wm.categories[0].words.length;
    // XSS 脚本
    document.getElementById('new-word').value = '<script>alert(1)</script>';
    document.getElementById('form-add-word').dispatchEvent(new Event('submit', { cancelable: true }));
    expect(wm.categories[0].words.length).toBe(before);
    // 中文
    document.getElementById('new-word').value = '苹果';
    document.getElementById('form-add-word').dispatchEvent(new Event('submit', { cancelable: true }));
    expect(wm.categories[0].words.length).toBe(before);
    // 非法符号
    document.getElementById('new-word').value = 'hello@world#!';
    document.getElementById('form-add-word').dispatchEvent(new Event('submit', { cancelable: true }));
    expect(wm.categories[0].words.length).toBe(before);
    // 超长（超过 40 字符）
    document.getElementById('new-word').value = 'a'.repeat(41);
    document.getElementById('form-add-word').dispatchEvent(new Event('submit', { cancelable: true }));
    expect(wm.categories[0].words.length).toBe(before);
    // 合法：连字符与撇号可接受
    document.getElementById('new-word').value = "rock-'n-roll";
    document.getElementById('form-add-word').dispatchEvent(new Event('submit', { cancelable: true }));
    expect(wm.categories[0].words.length).toBe(before + 1);
  });

  it('should_sync_switch_active_state_from_storage', () => {
    const wm = showWordTab();
    const sw = document.getElementById('btn-learn-selected');
    // 模拟 reload 后从 storage 恢复到开启态
    window.DataStore.setProgress('learn_selected_only', true);
    wm.learnSelectedOnly = true;
    wm._syncLearnSwitchUI();
    expect(sw.classList.contains('active')).toBe(true);
    wm.learnSelectedOnly = false;
    wm._syncLearnSwitchUI();
    expect(sw.classList.contains('active')).toBe(false);
    expect(wm.getCardWords().length).toBe(5);
  });

  it('should_default_card_pool_to_full_category', () => {
    const wm = showWordTab();
    expect(wm.learnSelectedOnly).toBe(false);
    expect(wm.getCardWords().length).toBe(5);
    expect(wm.isWordSelected('apple')).toBe(false);
  });

  it('should_toggle_selection_and_filter_card_pool', () => {
    const wm = showWordTab();
    wm.toggleSelectWord('apple');
    wm.toggleSelectWord('book');
    wm.toggleSelectWord('book'); // 再点一次取消
    expect(wm.isWordSelected('apple')).toBe(true);
    expect(wm.isWordSelected('book')).toBe(false);
    wm.toggleLearnSelected();
    expect(wm.learnSelectedOnly).toBe(true);
    expect(document.getElementById('btn-learn-selected').classList.contains('active')).toBe(true);
    const pool = wm.getCardWords();
    expect(pool.length).toBe(1);
    expect(pool[0].word).toBe('apple');
    // 关闭后恢复全量
    wm.toggleLearnSelected();
    expect(document.getElementById('btn-learn-selected').classList.contains('active')).toBe(false);
    expect(wm.getCardWords().length).toBe(5);
  });

  it('should_return_empty_pool_when_switch_on_but_no_selection', () => {
    const wm = showWordTab();
    wm.toggleLearnSelected();
    expect(wm.getCardWords().length).toBe(0);
  });

  it('should_mark_word_under_selected_pool_with_same_progress_key', () => {
    const wm = showWordTab();
    wm.toggleSelectWord('apple');
    wm.toggleLearnSelected();
    // 开启开关后卡片流走精选池：当前第 1 张就是 apple
    expect(document.getElementById('word-front').textContent).toContain('apple');
    expect(document.getElementById('word-progress').textContent).toBe('1/1');
    document.getElementById('btn-known').click();
    expect(wm.wordProgress['apple-0']).toBeTruthy();
    expect(wm.wordProgress['apple-0'].reviewCount).toBe(1);
    expect(wm.wordProgress['apple-0'].status).toBe('learning');
  });

  it('should_keep_selection_isolated_per_category', () => {
    const wm = showWordTab();
    wm.toggleSelectWord('apple');
    wm.selectCategory(1);
    expect(wm.isWordSelected('abandon')).toBe(false);
    wm.toggleSelectWord('abandon');
    expect(wm.getSelectedWords()).toEqual(['abandon']);
    wm.selectCategory(0);
    expect(wm.getSelectedWords()).toEqual(['apple']);
  });

  it('should_select_all_and_clear_current_category', () => {
    const wm = showWordTab();
    wm.selectAllWords();
    expect(wm.getSelectedWords().length).toBe(5);
    wm.clearSelection();
    expect(wm.getSelectedWords().length).toBe(0);
  });
});
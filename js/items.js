// ==================== 道具系统 ====================
var ItemSystem = (function() {
  var ITEMS = {
    hint:   { name: '提示卡', icon: '#i-item-hint',    desc: '拼写/语境填空时显示首字母和单词长度', price: 20, scene: '拼写测试/语境填空' },
    skip:   { name: '跳过卡', icon: '#i-item-skip',    desc: '跳过一题不记对错，并得 5 积分', price: 30, scene: '拼写测试/语境填空/单词PK' },
    lucky:  { name: '幸运卡', icon: '#i-item-lucky', desc: '四选一题自动排除两个错误选项', price: 35, scene: '拼写测试/单词PK' },
    shield: { name: '护盾卡', icon: '#i-item-shield',  desc: '单词PK答错一次不记错误', price: 50, scene: '单词PK（激活后自动生效）', duration: 24 * 3600 * 1000 },
    double: { name: '双倍卡', icon: '#i-item-double', desc: '本局单词PK结束时积分翻倍', price: 40, scene: '单词PK（激活后自动生效）', duration: 24 * 3600 * 1000 },
    freeze: { name: '时间冻结卡', icon: '#i-item-freeze', desc: '单词PK中倒计时增加 15 秒', price: 50, scene: '单词PK（题目下方点击）' },
    mystery:{ name: '神秘宝箱', icon: '#i-item-mystery',  desc: '开启随机开出道具或积分，最高价值 100 积分', price: 60, scene: '背包点击"开启"立即开箱', rare: true },
    renew:  { name: '补签卡', icon: '#i-item-renew', desc: '补签过去漏签的打卡日期，每次补签记 1 词', price: 30, scene: '打卡日历（点击漏签日期）' }
  };
  var BUFF_ITEMS = { shield: 'shield', double: 'double' };
  var MYSTERY_POOL = [
    { item: 'double',  weight: 16 },
    { item: 'shield',  weight: 16 },
    { item: 'lucky',   weight: 14 },
    { item: 'freeze',  weight: 12 },
    { item: 'skip',    weight: 10 },
    { item: 'hint',    weight: 8 },
    { points: 100,     weight: 12 },
    { points: 30,      weight: 12 }
  ];

  function ItemSystem() {
    this.data = DataStore.getProgress('items', { hint: 0, skip: 0, lucky: 0, shield: 0, double: 0, freeze: 0, mystery: 0, renew: 0 });
    var raw = DataStore.getProgress('item_buffs', {});
    this.buffs = {};
    var self = this;
    Object.keys(BUFF_ITEMS).forEach(function(id) {
      var v = raw[id];
      self.buffs[id] = (v && typeof v === 'object' && v.active) ? { active: true, exp: v.exp || 0 }
        : (v === true ? { active: true, exp: 0 } : { active: false, exp: 0 });
    });
    this.saveBuffs();
    this.checkExpiry();
    this.renderBag();
    this.renderShop();
    this.updateGlobalUI();
    setInterval(function() { self.checkExpiry(); }, 30000);
  }
  // 重新从 storage 加载道具库存与激活状态（导入备份/外部修改后防止旧内存覆盖新数据）
  ItemSystem.prototype.reload = function() {
    this.data = DataStore.getProgress('items', { hint: 0, skip: 0, lucky: 0, shield: 0, double: 0, freeze: 0, mystery: 0, renew: 0 });
    var raw = DataStore.getProgress('item_buffs', {});
    var self = this;
    this.buffs = {};
    Object.keys(BUFF_ITEMS).forEach(function(id) {
      var v = raw[id];
      self.buffs[id] = (v && typeof v === 'object' && v.active) ? { active: true, exp: v.exp || 0 }
        : (v === true ? { active: true, exp: 0 } : { active: false, exp: 0 });
    });
    this.checkExpiry();
    this.renderBag();
    this.renderShop();
    this.updateGlobalUI();
  };
  ItemSystem.prototype.save = function() { DataStore.setProgress('items', this.data); };
  ItemSystem.prototype.saveBuffs = function() { DataStore.setProgress('item_buffs', this.buffs); };
  ItemSystem.prototype.count = function(id) { return this.data[id] || 0; };
  ItemSystem.prototype.total = function() {
    var t = 0;
    for (var k in this.data) t += this.data[k];
    return t;
  };
  ItemSystem.prototype.buy = function(id) {
    var it = ITEMS[id];
    if (!it) return;
    var gami = window.app && window.app.gamification ? window.app.gamification.getStats() : null;
    if (!gami || gami.points < it.price) {
      Toast.warning('积分不足！需要 ' + it.price + ' 积分');
      return;
    }
    var ok = window.app.gamification.addPoints(-it.price);
    if (ok === false) return; // 积分扣除失败，不发放道具
    this.data[id] = this.count(id) + 1;
    this.save();
    Toast.success('获得「' + it.name + '」×1');
    this.renderBag();
    this.renderShop();
    this.updateGlobalUI();
  };
  ItemSystem.prototype.use = function(id) {
    if (this.count(id) <= 0) { Toast.warning('没有「' + (ITEMS[id] ? ITEMS[id].name : id) + '」了'); return false; }
    this.data[id]--;
    this.save();
    this.updateGlobalUI();
    this.renderBag();
    // P0-04 事件通知：道具被使用/消耗
    if (window.EventBus && window.MS && window.MS.EVENTS) {
      window.EventBus.emit(window.MS.EVENTS.ITEM_USED, { id: id, name: ITEMS[id] ? ITEMS[id].name : id, buff: false });
    }
    return true;
  };
  // 背包页使用：宝箱直接开箱，激活类道具只激活不扣数量，即时类道具跳转对应练习（不消耗，真正点击时才用）
  ItemSystem.prototype.activate = function(id) {
    if (id === 'mystery') { this.openMystery(); return; }
    if (id === 'renew') {
      Toast.info('「补签卡」已准备，去「打卡日历」点击漏签日期即可补签');
      if (window.app) window.app.showTab('settings');
      return;
    }
    if (BUFF_ITEMS[id]) { this.activateBuff(id); return; }
    var target = (id === 'lucky' || id === 'freeze') ? 'pk' : 'spelling';
    Toast.info('「' + ITEMS[id].name + '」已准备，练习开始后点击题目下方的道具按钮即可使用');
    if (window.app) {
      window.app.showTab(target);
      setTimeout(function() {
        var btn = document.getElementById(target === 'spelling' ? 'btn-start-spelling' : 'btn-start-pk');
        if (btn) btn.click();
      }, 60);
    }
  };
  // 开启神秘宝箱：随机获得道具或积分
  ItemSystem.prototype.openMystery = function() {
    if (this.count('mystery') <= 0) { Toast.warning('没有「神秘宝箱」了'); return; }
    this.data.mystery--;
    var total = 0;
    MYSTERY_POOL.forEach(function(p) { total += p.weight; });
    var r = Math.random() * total, acc = 0, picked = MYSTERY_POOL[MYSTERY_POOL.length - 1];
    for (var i = 0; i < MYSTERY_POOL.length; i++) {
      acc += MYSTERY_POOL[i].weight;
      if (r < acc) { picked = MYSTERY_POOL[i]; break; }
    }
    var msg;
    if (picked.item) {
      // P1-09：`|| 0` 兜底旧备份缺键导致的 NaN 库存
      this.data[picked.item] = (this.data[picked.item] || 0) + 1;
      msg = '获得「' + ITEMS[picked.item].name + '」×1';
    } else {
      if (window.app && window.app.gamification) window.app.gamification.addPoints(picked.points);
      msg = '获得 ' + picked.points + ' 积分';
    }
    // P1-09：一次落盘（宝箱消耗 + 奖励写入合并），消除两次 save 之间的丢失窗口
    this.save();
    Toast.success('🎁 宝箱开启！' + msg);
    this.renderBag();
    this.renderShop();
    this.updateGlobalUI();
  };
  // 背包激活：只激活状态不扣数量，卡片保留到真正使用时才消失
  ItemSystem.prototype.activateBuff = function(id) {
    var b = this.buffs[id];
    if (b && b.active) { Toast.info('「' + ITEMS[id].name + '」已在激活状态，下次单词PK自动生效'); return; }
    if (this.count(id) <= 0) { Toast.warning('没有「' + ITEMS[id].name + '」了'); return; }
    var dur = ITEMS[id].duration || 0;
    this.buffs[id] = { active: true, exp: dur > 0 ? Date.now() + dur : 0 };
    this.saveBuffs();
    Toast.success('「' + ITEMS[id].name + '」已激活' + (dur > 0 ? '，限时 ' + Math.round(dur / 3600000 * 10) / 10 + ' 小时，到期自动失效' : '') + '，下次单词PK自动生效');
    this.renderBag();
  };
  // 限时/过期道具处理：到期后自动失效并从背包消失
  ItemSystem.prototype.checkExpiry = function() {
    var changed = false, self = this, now = Date.now();
    Object.keys(BUFF_ITEMS).forEach(function(id) {
      var b = self.buffs[id];
      if (b && b.active && b.exp > 0 && b.exp <= now) {
        b.active = false;
        b.exp = 0;
        if (self.count(id) > 0) { self.data[id]--; self.save(); }
        changed = true;
        if (typeof Toast !== 'undefined') Toast.info('「' + ITEMS[id].name + '」已过期失效');
      }
    });
    if (changed) {
      this.saveBuffs();
      this.renderBag();
      this.updateGlobalUI();
    }
  };
  // PK开始借用：只读取激活状态，不扣数量、不清状态
  ItemSystem.prototype.borrowBuff = function(id) {
    this.checkExpiry();
    var b = this.buffs[id];
    return !!(b && b.active);
  };
  // 真正使用完（护盾抵挡/双倍结算）：解除激活并扣除数量，卡片消失
  ItemSystem.prototype.consumeBuff = function(id) {
    var b = this.buffs[id];
    if (!(b && b.active)) return false;
    b.active = false;
    b.exp = 0;
    this.saveBuffs();
    if (this.count(id) > 0) { this.data[id]--; this.save(); }
    this.renderBag();
    this.updateGlobalUI();
    // P0-04 事件通知：buff 道具被实际消耗
    if (window.EventBus && window.MS && window.MS.EVENTS) {
      window.EventBus.emit(window.MS.EVENTS.ITEM_USED, { id: id, name: ITEMS[id] ? ITEMS[id].name : id, buff: true });
    }
    return true;
  };
  // 本局未使用：保留激活状态，卡片不消失
  ItemSystem.prototype.returnBuff = function(id) {
    this.renderBag();
  };
  // 退回：工具栏点用的道具本局未用到时退回数量
  ItemSystem.prototype.refund = function(id) {
    this.data[id] = (this.data[id] || 0) + 1;
    this.save();
    this.renderBag();
    this.updateGlobalUI();
  };
  ItemSystem.prototype.renderBag = function() {
    this.checkExpiry();
    var el = document.getElementById('item-bag');
    if (!el) return;
    var self = this;
    var html = '';
    Object.keys(ITEMS).forEach(function(id) {
      var it = ITEMS[id];
      var n = self.count(id);
      var buffActive = BUFF_ITEMS[id] && !!(self.buffs[id] && self.buffs[id].active);
      if (n > 0) {
        var btnText = id === 'mystery' ? '开启' : (id === 'renew' ? '补签' : (BUFF_ITEMS[id] ? (buffActive ? '已激活' : '使用') : '去练习'));
        html += '<div class="item-bag-card' + (buffActive ? ' buff-active' : '') + (it.rare ? ' item-rare' : '') + '">'
          + '<div class="item-bag-icon"><svg class="icon"><use href="' + it.icon + '"/></svg></div>'
          + '<div class="item-bag-info">'
          + '<div class="item-bag-name">' + it.name + ' <span class="item-bag-count">×' + n + '</span></div>'
          + '<div class="item-bag-desc">' + it.desc + '</div>'
          + '<div class="item-bag-scene">适用：' + it.scene + '</div>'
          + '</div>'
          + '<button class="btn btn-sm item-bag-btn" data-use="' + id + '">' + btnText + '</button>'
          + '</div>';
      }
    });
    el.innerHTML = html || '<p class="empty-tip" style="margin:0">背包为空，先在下方商店购买道具吧</p>';
    el.querySelectorAll('[data-use]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        if (btn.textContent === '已激活') { Toast.info('已在激活状态，下次单词PK自动生效'); return; }
        self.activate(btn.dataset.use);
      });
    });
  };
  ItemSystem.prototype.renderShop = function() {
    var el = document.getElementById('item-shop-grid');
    if (!el) return;
    var self = this;
    el.innerHTML = Object.keys(ITEMS).map(function(id) {
      var it = ITEMS[id];
      return '<div class="item-card' + (it.rare ? ' item-rare' : '') + '">'
        + '<div class="item-icon"><svg class="icon"><use href="' + it.icon + '"/></svg></div>'
        + '<div class="item-name">' + it.name + '</div>'
        + '<div class="item-desc">' + it.desc + '</div>'
        + '<div class="item-own">拥有 ×' + self.count(id) + '</div>'
        + '<button class="btn btn-primary btn-sm" onclick="window.app.itemSystem.buy(\'' + id + '\')">' + it.price + ' 积分购买</button>'
        + '</div>';
    }).join('');
  };
  ItemSystem.prototype.updateGlobalUI = function() {
    var el = document.getElementById('stat-items');
    if (el) el.textContent = this.total();
  };
  // opts: [{id:'hint'},...]  handlers: {hint: function(){...}}
  ItemSystem.prototype.renderToolbar = function(containerId, opts, handlers) {
    var el = document.getElementById(containerId);
    if (!el) return;
    var self = this;
    var html = '';
    opts.forEach(function(o) {
      var it = ITEMS[o.id];
      if (self.count(o.id) > 0) {
        html += '<button class="item-tool-btn" data-item="' + o.id + '" title="' + it.desc + '">'
          + '<svg class="icon"><use href="' + it.icon + '"/></svg> ' + it.name + ' ×' + self.count(o.id)
          + '</button>';
      }
    });
    el.innerHTML = html;
    el.style.display = html ? 'flex' : 'none';
    el.querySelectorAll('[data-item]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        if (btn.disabled) return; // 防连点重复扣道具
        btn.disabled = true;
        var id = btn.dataset.item;
        // BUFF 道具已在激活状态（背包预激活生效中）：局内点用不再扣数，避免
        // "预激活 + 局内再点"双扣一张，也避免跳过 consumeBuff 导致预激活盾永久生效
        if (BUFF_ITEMS[id] && self.buffs[id] && self.buffs[id].active) {
          Toast.info('「' + ITEMS[id].name + '」已在激活状态，本局自动生效');
          return;
        }
        if (!self.use(id)) return;
        if (handlers && handlers[id]) handlers[id]();
        // P1-09 防连点烧卡：不再整排重建工具栏——重建会清掉 disabled，导致同一题/同一局内
        // 重复点击把「护盾/双倍/提示/幸运」等一次生效道具重复扣卡却无额外效果。
        // 这里只更新当前按钮的库存数量并保持禁用；下一题 showQuestion 会重建工具栏并重新启用。
        var left = self.count(id);
        btn.innerHTML = '<svg class="icon"><use href="' + ITEMS[id].icon + '"/></svg> ' + ITEMS[id].name + ' ×' + left;
        if (left <= 0) {
          btn.style.display = 'none';
          var allGone = opts.every(function(o) { return self.count(o.id) <= 0; });
          if (allGone) el.style.display = 'none';
        }
      });
    });
  };
  return ItemSystem;
})();

if (typeof window !== 'undefined') window.ItemSystem = ItemSystem;

// ==================== 专属主题（积分兑换） ====================
// 每个主题提供 light/dark 两套完整 CSS 变量，通过 [data-theme-id] 属性选择器注入，
// 优先级高于 design-system 的 [data-theme="dark"] 和 [data-theme-color] 预设。
var ThemeShop = (function() {
  var THEMES = [];

  function ThemeShop() {
    this.owned = DataStore.getProgress('owned_themes', {});
    this.applied = DataStore.getProgress('applied_theme', '') || '';
    this.styleEl = null;
    this.initStyle();
    var self = this;
    // 启动时恢复上次启用的主题（校验：未拥有或已下架的自动清除）
    if (this.applied) {
      var t = this.getTheme(this.applied);
      if (!t || !this.owned[this.applied]) {
        this.applied = '';
        DataStore.setProgress('applied_theme', '');
      } else {
        this.applyCss(this.applied);
      }
    }
    this.render();
  }
  ThemeShop.prototype.getTheme = function(id) {
    for (var i = 0; i < THEMES.length; i++) if (THEMES[i].id === id) return THEMES[i];
    return null;
  };
  ThemeShop.prototype.initStyle = function() {
    this.styleEl = document.getElementById('theme-shop-style');
    if (!this.styleEl) {
      this.styleEl = document.createElement('style');
      this.styleEl.id = 'theme-shop-style';
      document.head.appendChild(this.styleEl);
    }
  };
  // 把某个主题的 light/dark 变量组序列化为 CSS
  ThemeShop.prototype.buildCss = function(t) {
    var css = '';
    css += '[data-theme-id="' + t.id + '"]{\n' + this.varBlock(t.light) + '}\n';
    css += '[data-theme-id="' + t.id + '"][data-theme="dark"]{\n' + this.varBlock(t.dark) + '}\n';
    return css;
  };
  ThemeShop.prototype.varBlock = function(v) {
    return '  --ivory:' + v.ivory + ';--ivory-warm:' + v.ivoryWarm + ';--ivory-deep:' + v.ivoryDeep + ';--ivory-card:' + v.ivoryCard + ';--ivory-surface:' + v.ivorySurface + ';\n'
      + '  --sage:' + v.sage + ';--sage-deep:' + v.sageDeep + ';--sage-muted:' + v.sageMuted + ';--sage-light:' + v.sageLight + ';--sage-surface:' + v.sageSurface + ';--sage-hover:' + v.sageHover + ';\n'
      + '  --coral:' + v.coral + ';--coral-deep:' + v.coralDeep + ';--coral-hover:' + v.coralHover + ';--coral-light:' + v.coralLight + ';--coral-surface:' + v.coralSurface + ';\n'
      + '  --text:' + v.text + ';--text-secondary:' + v.textSecondary + ';--text-tertiary:' + v.textTertiary + ';--text-ghost:' + v.textGhost + ';--text-inverse:' + v.textInverse + ';\n'
      + '  --border:' + v.border + ';--border-light:' + v.borderLight + ';\n'
      + '  --sidebar-bg:' + v.sidebarBg + ';--sidebar-text:' + v.sidebarText + ';--sidebar-active:' + v.sidebarActive + ';--sidebar-hover:' + v.sidebarHover + ';\n';
  };
  ThemeShop.prototype.applyCss = function(id) {
    var t = this.getTheme(id);
    if (!t || !this.styleEl) return;
    document.documentElement.setAttribute('data-theme-id', id);
    this.styleEl.textContent = this.buildCss(t);
  };
  ThemeShop.prototype.clearCss = function() {
    document.documentElement.removeAttribute('data-theme-id');
    if (this.styleEl) this.styleEl.textContent = '';
  };
  ThemeShop.prototype.isOwned = function(id) { return !!this.owned[id]; };
  ThemeShop.prototype.isApplied = function(id) { return this.applied === id; };
  // 积分兑换：扣积分 → 记录拥有 → 立即启用
  ThemeShop.prototype.buy = function(id) {
    var t = this.getTheme(id);
    if (!t) return;
    if (this.isOwned(id)) { Toast.info('已拥有「' + t.name + '」，直接使用即可'); this.apply(id); return; }
    var gami = window.app && window.app.gamification ? window.app.gamification.getStats() : null;
    if (!gami || gami.points < t.price) {
      Toast.warning('积分不足！需要 ' + t.price + ' 积分');
      return;
    }
    window.app.gamification.addPoints(-t.price);
    this.owned[id] = true;
    DataStore.setProgress('owned_themes', this.owned);
    this.apply(id, true);
    Toast.success('🎨 兑换成功：已启用「' + t.name + '」主题');
    this.render();
  };
  // 启用已拥有的主题
  ThemeShop.prototype.apply = function(id, silent) {
    var t = this.getTheme(id);
    if (!t) return;
    if (!this.isOwned(id)) { Toast.warning('还没有「' + t.name + '」，先去兑换吧'); return; }
    this.applied = id;
    DataStore.setProgress('applied_theme', id);
    this.applyCss(id);
    if (!silent) Toast.success('已启用「' + t.name + '」主题');
    this.render();
  };
  // 恢复默认主题
  ThemeShop.prototype.clear = function() {
    this.applied = '';
    DataStore.setProgress('applied_theme', '');
    this.clearCss();
    Toast.info('已恢复默认主题');
    this.render();
  };
  ThemeShop.prototype.render = function() {
    var grid = document.getElementById('theme-shop-grid');
    if (!grid) return;
    var self = this;
    grid.innerHTML = THEMES.map(function(t) {
      var owned = self.isOwned(t.id);
      var applied = self.isApplied(t.id);
      var btn;
      if (applied) {
        btn = '<button class="btn btn-sm theme-btn-active" disabled><svg class="icon"><use href="#i-check"/></svg> 使用中</button>';
      } else if (owned) {
        btn = '<button class="btn btn-sm btn-primary" data-act="use" data-id="' + t.id + '"><svg class="icon"><use href="#i-play"/></svg> 使用</button>';
      } else {
        btn = '<button class="btn btn-sm btn-primary" data-act="buy" data-id="' + t.id + '"><svg class="icon"><use href="#i-item-double"/></svg> ' + t.price + ' 积分兑换</button>';
      }
      return '<div class="theme-card' + (applied ? ' theme-active' : '') + (owned ? ' theme-owned' : '') + '">'
        + '<div class="theme-preview" style="background:url(assets/themes/' + t.id + '.svg) center/cover, linear-gradient(135deg,' + t.preview[0] + ' 0%,' + t.preview[1] + ' 55%,' + t.preview[2] + ' 100%)"></div>'
        + '<div class="theme-name"><span class="theme-name-text">' + t.name + '</span>' + (owned ? '<span class="theme-badge-own">已拥有</span>' : '') + '</div>'
        + '<div class="theme-desc">' + t.desc + '</div>'
        + '<div class="theme-price"><svg class="icon"><use href="#i-diamond"/></svg> ' + t.price + ' 积分 · 永久拥有</div>'
        + btn
        + '</div>';
    }).join('');
    grid.querySelectorAll('[data-act]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var id = btn.dataset.id;
        if (btn.dataset.act === 'buy') self.buy(id);
        else self.apply(id);
      });
    });
    // 顶部状态栏：当前主题 + 恢复默认
    var bar = document.getElementById('theme-shop-bar');
    if (bar) {
      var cur = this.applied ? this.getTheme(this.applied) : null;
      if (cur) {
        bar.innerHTML = '<span style="font-size:0.85rem;color:var(--text-secondary)">当前主题：<b style="color:var(--text)">「' + cur.name + '」</b></span>'
          + '<button class="btn btn-sm btn-ghost" id="btn-theme-reset" style="margin-left:var(--sp-3)">恢复默认主题</button>';
        var resetBtn = document.getElementById('btn-theme-reset');
        if (resetBtn) resetBtn.addEventListener('click', function() { self.clear(); });
      } else {
        bar.innerHTML = '';
      }
    }
  };
  return ThemeShop;
})();

if (typeof window !== 'undefined') window.ThemeShop = ThemeShop;

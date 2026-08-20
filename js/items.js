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
  var THEMES = [
    {
      id: 'ocean', name: '深海蓝', price: 200, desc: '清爽的海洋蓝调，沉浸式学习氛围',
      preview: ['#0EA5E9', '#155E75', '#E0F2FE'],
      light: { ivory:'#F0F6FB', ivoryWarm:'#F5FAFE', ivoryDeep:'#E3EDF5', ivoryCard:'#FFFFFF', ivorySurface:'#F8FCFE', sage:'#0E7490', sageDeep:'#155E75', sageMuted:'#38BDF8', sageLight:'#E0F2FE', sageSurface:'#EFF8FD', sageHover:'#0C5E78', coral:'#FF8A65', coralDeep:'#E67A58', coralHover:'#FF7043', coralLight:'#FFF0EB', coralSurface:'#FFF5F0', text:'#0F172A', textSecondary:'#475569', textTertiary:'#94A3B8', textGhost:'#CBD5E1', textInverse:'#FFFFFF', border:'#DCE7F0', borderLight:'#E6EEF6', sidebarBg:'linear-gradient(180deg,#06283F 0%,#0C4A6E 55%,#155E75 100%)', sidebarText:'rgba(255,255,255,0.9)', sidebarActive:'rgba(56,189,248,0.25)', sidebarHover:'rgba(255,255,255,0.08)' },
      dark: { ivory:'#0B1220', ivoryWarm:'#0E1626', ivoryDeep:'#080D16', ivoryCard:'#111A2E', ivorySurface:'#16203A', sage:'#38BDF8', sageDeep:'#7DD3FC', sageMuted:'#0EA5E9', sageLight:'#0E2A3F', sageSurface:'#0B2233', sageHover:'#7DD3FC', coral:'#FF9A76', coralDeep:'#FFB095', coralHover:'#FF8560', coralLight:'#2D1F1A', coralSurface:'#2A1C18', text:'#E2E8F0', textSecondary:'#94A3B8', textTertiary:'#64748B', textGhost:'#475569', textInverse:'#0B1220', border:'#1E293B', borderLight:'#182233', sidebarBg:'linear-gradient(180deg,#030812 0%,#081F36 55%,#0B2233 100%)', sidebarText:'rgba(255,255,255,0.75)', sidebarActive:'rgba(56,189,248,0.22)', sidebarHover:'rgba(255,255,255,0.06)' }
    },
    {
      id: 'sakura', name: '樱花粉', price: 200, desc: '温柔的樱花粉，治愈系学习界面',
      preview: ['#F06A93', '#B93D63', '#FBE3EC'],
      light: { ivory:'#FDF5F7', ivoryWarm:'#FEF8FA', ivoryDeep:'#F9E9EE', ivoryCard:'#FFFFFF', ivorySurface:'#FEFBFC', sage:'#D6537A', sageDeep:'#B93D63', sageMuted:'#E98AA8', sageLight:'#FBE3EC', sageSurface:'#FDF0F5', sageHover:'#C74A70', coral:'#F97A8D', coralDeep:'#E2657B', coralHover:'#FF5F78', coralLight:'#FFE9ED', coralSurface:'#FFF5F7', text:'#3D2530', textSecondary:'#8A6A76', textTertiary:'#B79AA6', textGhost:'#D8C2CB', textInverse:'#FFFFFF', border:'#F2DCE5', borderLight:'#F7E7ED', sidebarBg:'linear-gradient(180deg,#3D1526 0%,#8C2E52 55%,#C74A70 100%)', sidebarText:'rgba(255,255,255,0.92)', sidebarActive:'rgba(255,255,255,0.25)', sidebarHover:'rgba(255,255,255,0.1)' },
      dark: { ivory:'#1C1216', ivoryWarm:'#211519', ivoryDeep:'#150D10', ivoryCard:'#2A1A20', ivorySurface:'#311D24', sage:'#F06A93', sageDeep:'#F59DB9', sageMuted:'#E04376', sageLight:'#3D1A26', sageSurface:'#331522', sageHover:'#F59DB9', coral:'#FF8FA0', coralDeep:'#FFB3C0', coralHover:'#FF7A8E', coralLight:'#401C24', coralSurface:'#381820', text:'#F2E4E9', textSecondary:'#C2A6B0', textTertiary:'#8F7280', textGhost:'#6B5460', textInverse:'#1C1216', border:'#3A222C', borderLight:'#2E1B24', sidebarBg:'linear-gradient(180deg,#12080C 0%,#2A1620 55%,#331522 100%)', sidebarText:'rgba(255,255,255,0.75)', sidebarActive:'rgba(240,106,147,0.22)', sidebarHover:'rgba(255,255,255,0.06)' }
    },
    {
      id: 'lavender', name: '薰衣草紫', price: 250, desc: '梦幻薰衣草紫，静谧专注的学习空间',
      preview: ['#A78BFA', '#6644CC', '#EDE7FE'],
      light: { ivory:'#F7F4FC', ivoryWarm:'#FAF8FE', ivoryDeep:'#EFEAF7', ivoryCard:'#FFFFFF', ivorySurface:'#FCFBFF', sage:'#7C5CE0', sageDeep:'#6644CC', sageMuted:'#A78BFA', sageLight:'#EDE7FE', sageSurface:'#F4F0FD', sageHover:'#6E4ED0', coral:'#FF8A65', coralDeep:'#E67A58', coralHover:'#FF7043', coralLight:'#FFF0EB', coralSurface:'#FFF5F0', text:'#231A3A', textSecondary:'#6F6390', textTertiary:'#A295C4', textGhost:'#CDC3E3', textInverse:'#FFFFFF', border:'#E5DEF2', borderLight:'#ECE6F6', sidebarBg:'linear-gradient(180deg,#170A33 0%,#3B2280 55%,#6644CC 100%)', sidebarText:'rgba(255,255,255,0.9)', sidebarActive:'rgba(255,255,255,0.25)', sidebarHover:'rgba(255,255,255,0.1)' },
      dark: { ivory:'#13101E', ivoryWarm:'#171327', ivoryDeep:'#0E0C18', ivoryCard:'#1E1831', ivorySurface:'#241C3B', sage:'#A78BFA', sageDeep:'#C4B5FD', sageMuted:'#8B5CF6', sageLight:'#2A1F45', sageSurface:'#1F1740', sageHover:'#C4B5FD', coral:'#FF9A76', coralDeep:'#FFB095', coralHover:'#FF8560', coralLight:'#2D1F1A', coralSurface:'#2A1C18', text:'#EAE5F5', textSecondary:'#AFA3CC', textTertiary:'#7C7298', textGhost:'#5C5472', textInverse:'#13101E', border:'#2C2440', borderLight:'#241D35', sidebarBg:'linear-gradient(180deg,#0A0616 0%,#1B1236 55%,#221A46 100%)', sidebarText:'rgba(255,255,255,0.75)', sidebarActive:'rgba(167,139,250,0.22)', sidebarHover:'rgba(255,255,255,0.06)' }
    },
    {
      id: 'forest', name: '森林绿', price: 250, desc: '自然森林绿，亲近自然的专注体验',
      preview: ['#4C9A6B', '#2F7A4D', '#DFF0E5'],
      light: { ivory:'#F2F7F3', ivoryWarm:'#F6FAF7', ivoryDeep:'#E6EFE9', ivoryCard:'#FFFFFF', ivorySurface:'#FAFCFB', sage:'#2F7A4D', sageDeep:'#25603D', sageMuted:'#4C9A6B', sageLight:'#DFF0E5', sageSurface:'#EFF7F1', sageHover:'#2A6C44', coral:'#FF8A65', coralDeep:'#E67A58', coralHover:'#FF7043', coralLight:'#FFF0EB', coralSurface:'#FFF5F0', text:'#16241B', textSecondary:'#5C7265', textTertiary:'#93A89C', textGhost:'#BCCBC1', textInverse:'#FFFFFF', border:'#DCE9E0', borderLight:'#E5EFE8', sidebarBg:'linear-gradient(180deg,#0B2416 0%,#1F5C3A 55%,#2F7A4D 100%)', sidebarText:'rgba(255,255,255,0.9)', sidebarActive:'rgba(255,255,255,0.25)', sidebarHover:'rgba(255,255,255,0.1)' },
      dark: { ivory:'#0F1712', ivoryWarm:'#131D16', ivoryDeep:'#0B120E', ivoryCard:'#17241C', ivorySurface:'#1C2C21', sage:'#4C9A6B', sageDeep:'#74B98E', sageMuted:'#2F7A4D', sageLight:'#152B1F', sageSurface:'#12241A', sageHover:'#74B98E', coral:'#FF9A76', coralDeep:'#FFB095', coralHover:'#FF8560', coralLight:'#2D1F1A', coralSurface:'#2A1C18', text:'#E2EBE5', textSecondary:'#9CB0A3', textTertiary:'#6E8477', textGhost:'#53665A', textInverse:'#0F1712', border:'#223329', borderLight:'#1B2A22', sidebarBg:'linear-gradient(180deg,#06100A 0%,#0F1F16 55%,#142821 100%)', sidebarText:'rgba(255,255,255,0.75)', sidebarActive:'rgba(76,154,107,0.22)', sidebarHover:'rgba(255,255,255,0.06)' }
    },
    {
      id: 'sunset', name: '落日暖橙', price: 300, desc: '温暖治愈的落日余晖，黄昏学习时光',
      preview: ['#F59E0B', '#D97706', '#FEF0D5'],
      light: { ivory:'#FDF6EF', ivoryWarm:'#FEF9F4', ivoryDeep:'#F8EDE1', ivoryCard:'#FFFFFF', ivorySurface:'#FEFBF7', sage:'#D97706', sageDeep:'#B45309', sageMuted:'#F59E0B', sageLight:'#FEF0D5', sageSurface:'#FDF6E7', sageHover:'#C26208', coral:'#F97316', coralDeep:'#EA6A0F', coralHover:'#FF8A3D', coralLight:'#FFEDDE', coralSurface:'#FFF7EF', text:'#2B1D12', textSecondary:'#7A5F44', textTertiary:'#B0926F', textGhost:'#D6C1A8', textInverse:'#FFFFFF', border:'#F0E1D0', borderLight:'#F6EBDE', sidebarBg:'linear-gradient(180deg,#331A06 0%,#8C4510 55%,#C26208 100%)', sidebarText:'rgba(255,255,255,0.92)', sidebarActive:'rgba(255,255,255,0.25)', sidebarHover:'rgba(255,255,255,0.1)' },
      dark: { ivory:'#1A130D', ivoryWarm:'#1F1710', ivoryDeep:'#140E09', ivoryCard:'#291E13', ivorySurface:'#312417', sage:'#F59E0B', sageDeep:'#FBBF24', sageMuted:'#D97706', sageLight:'#3A2A0E', sageSurface:'#2E2110', sageHover:'#FBBF24', coral:'#FB923C', coralDeep:'#FDB27E', coralHover:'#FF8A3D', coralLight:'#3A200E', coralSurface:'#331B0D', text:'#F3E9DC', textSecondary:'#C0A78E', textTertiary:'#8F7861', textGhost:'#6B5846', textInverse:'#1A130D', border:'#3B2C1C', borderLight:'#2F2215', sidebarBg:'linear-gradient(180deg,#100905 0%,#241A0E 55%,#2E2110 100%)', sidebarText:'rgba(255,255,255,0.8)', sidebarActive:'rgba(245,158,11,0.22)', sidebarHover:'rgba(255,255,255,0.06)' }
    },
    {
      id: 'midnight', name: '极夜黑金', price: 400, desc: '低调奢华的极夜黑金，夜读专属高级感',
      preview: ['#D4A017', '#2E2E3A', '#121218'],
      light: { ivory:'#F4F4F6', ivoryWarm:'#F8F8FA', ivoryDeep:'#E8E8EC', ivoryCard:'#FFFFFF', ivorySurface:'#FCFCFD', sage:'#2E2E3A', sageDeep:'#1E1E28', sageMuted:'#5A5A6E', sageLight:'#E9E9F0', sageSurface:'#F2F2F6', sageHover:'#23232E', coral:'#D4A017', coralDeep:'#B8860B', coralHover:'#E0B32E', coralLight:'#FBF3D9', coralSurface:'#FDF8E8', text:'#1A1A20', textSecondary:'#5A5A6B', textTertiary:'#8F8FA0', textGhost:'#B4B4C2', textInverse:'#FFFFFF', border:'#E3E3EA', borderLight:'#ECECF1', sidebarBg:'linear-gradient(180deg,#121218 0%,#2B2B38 100%)', sidebarText:'rgba(255,255,255,0.9)', sidebarActive:'rgba(212,160,23,0.22)', sidebarHover:'rgba(255,255,255,0.08)' },
      dark: { ivory:'#0F0F14', ivoryWarm:'#131318', ivoryDeep:'#0A0A0E', ivoryCard:'#181820', ivorySurface:'#1E1E28', sage:'#C9A227', sageDeep:'#DDBB4A', sageMuted:'#A98C1F', sageLight:'#2B2410', sageSurface:'#221C0E', sageHover:'#E3C257', coral:'#D4A017', coralDeep:'#B8860B', coralHover:'#E0B32E', coralLight:'#3A2E0E', coralSurface:'#33280D', text:'#EDEDF2', textSecondary:'#A5A5B5', textTertiary:'#76768A', textGhost:'#58586A', textInverse:'#0F0F14', border:'#262630', borderLight:'#1E1E27', sidebarBg:'linear-gradient(180deg,#08080C 0%,#1A1A24 100%)', sidebarText:'rgba(255,255,255,0.8)', sidebarActive:'rgba(212,160,23,0.25)', sidebarHover:'rgba(255,255,255,0.06)' }
    },
    {
      id: 'liquid', name: '液态光·品牌象牙', price: 300, desc: '品牌官方液态光风格：暖象牙底 + 鼠尾草绿 + 珊瑚橙',
      preview: ['#5B82A6', '#FF8A65', '#F8F6F1'],
      light: { ivory:'#F8F6F1', ivoryWarm:'#FCFAF6', ivoryDeep:'#EFECE5', ivoryCard:'#FFFFFF', ivorySurface:'#FDFCF9', sage:'#5B82A6', sageDeep:'#3E5C4C', sageMuted:'#7FA08F', sageLight:'#E7EFE9', sageSurface:'#F1F6F2', sageHover:'#46654F', coral:'#FF8A65', coralDeep:'#F2704F', coralHover:'#FF7A52', coralLight:'#FFEFE9', coralSurface:'#FFF6F2', text:'#2A2A28', textSecondary:'#6B6B63', textTertiary:'#A3A395', textGhost:'#C9C9BC', textInverse:'#FFFFFF', border:'#E8E4DB', borderLight:'#F0EDE6', sidebarBg:'linear-gradient(180deg,#2C4436 0%,#46654F 55%,#6B8A78 100%)', sidebarText:'rgba(255,255,255,0.92)', sidebarActive:'rgba(255,255,255,0.22)', sidebarHover:'rgba(255,255,255,0.08)' },
      dark: { ivory:'#1A1A17', ivoryWarm:'#201F1B', ivoryDeep:'#141411', ivoryCard:'#262521', ivorySurface:'#2C2B26', sage:'#7FA08F', sageDeep:'#A8C2B4', sageMuted:'#5B82A6', sageLight:'#26342D', sageSurface:'#1F2A25', sageHover:'#A8C2B4', coral:'#FF9A7C', coralDeep:'#FFB5A0', coralHover:'#FF855F', coralLight:'#3A2721', coralSurface:'#33221D', text:'#ECE9E0', textSecondary:'#B0AB9C', textTertiary:'#837F72', textGhost:'#5F5C52', textInverse:'#1A1A17', border:'#33322C', borderLight:'#2A2924', sidebarBg:'linear-gradient(180deg,#0D0F0C 0%,#1A241E 55%,#202B26 100%)', sidebarText:'rgba(255,255,255,0.8)', sidebarActive:'rgba(127,160,143,0.22)', sidebarHover:'rgba(255,255,255,0.06)' }
    },
    {
      id: 'abyss', name: '深渊之光', price: 400, desc: 'Abyssal Lumina：深海军蓝至黑渐变 + 青绿辉光暗夜主题',
      preview: ['#0A0E27', '#14E0C8', '#7B5CFF'],
      light: { ivory:'#F0F4FB', ivoryWarm:'#F6F9FD', ivoryDeep:'#E3EAF6', ivoryCard:'#FFFFFF', ivorySurface:'#F9FBFE', sage:'#0E7490', sageDeep:'#0B5D76', sageMuted:'#22C1B8', sageLight:'#DBF5F2', sageSurface:'#EEFBF9', sageHover:'#0A6578', coral:'#12B5A8', coralDeep:'#0E958B', coralHover:'#0FD0C0', coralLight:'#DBF8F4', coralSurface:'#ECFCF9', text:'#0E1B2A', textSecondary:'#4A5F75', textTertiary:'#8AA0B8', textGhost:'#B9C9DA', textInverse:'#FFFFFF', border:'#D8E4F0', borderLight:'#E4EDF6', sidebarBg:'linear-gradient(180deg,#070B1E 0%,#0E2C4A 55%,#123A5E 100%)', sidebarText:'rgba(255,255,255,0.9)', sidebarActive:'rgba(34,230,211,0.25)', sidebarHover:'rgba(255,255,255,0.08)' },
      dark: { ivory:'#0A0E27', ivoryWarm:'#0D1230', ivoryDeep:'#060919', ivoryCard:'#111734', ivorySurface:'#161D3E', sage:'#22E6D3', sageDeep:'#6FF2E4', sageMuted:'#0FB5A9', sageLight:'#0E2B33', sageSurface:'#0B2329', sageHover:'#6FF2E4', coral:'#4DE0CF', coralDeep:'#7CF0E2', coralHover:'#22D6C2', coralLight:'#0E2E2B', coralSurface:'#0C2825', text:'#E4EAF7', textSecondary:'#9FAEC9', textTertiary:'#6E7F9E', textGhost:'#4E5C77', textInverse:'#0A0E27', border:'#232E4E', borderLight:'#1B2440', sidebarBg:'linear-gradient(180deg,#03060F 0%,#0A1E28 55%,#0B2329 100%)', sidebarText:'rgba(255,255,255,0.8)', sidebarActive:'rgba(34,230,211,0.22)', sidebarHover:'rgba(255,255,255,0.06)' }
    },
    {
      id: 'battle', name: '能量对决', price: 350, desc: 'PK 对战风：暗紫能量渐变 + 玫红电光流动',
      preview: ['#6D28D9', '#DB2777', '#0F0B1E'],
      light: { ivory:'#F6F3FC', ivoryWarm:'#FAF8FE', ivoryDeep:'#ECE7F8', ivoryCard:'#FFFFFF', ivorySurface:'#FCFBFF', sage:'#7C3AED', sageDeep:'#6D28D9', sageMuted:'#A78BFA', sageLight:'#F0E9FE', sageSurface:'#F6F1FF', sageHover:'#6D28D9', coral:'#DB2777', coralDeep:'#BE185D', coralHover:'#EC4A90', coralLight:'#FDE8F1', coralSurface:'#FEF0F6', text:'#241A38', textSecondary:'#6B5E87', textTertiary:'#A294C4', textGhost:'#CBBFD9', textInverse:'#FFFFFF', border:'#E7DEF6', borderLight:'#EFE9FA', sidebarBg:'linear-gradient(180deg,#1C0E42 0%,#5B21B6 55%,#8B3DD8 100%)', sidebarText:'rgba(255,255,255,0.9)', sidebarActive:'rgba(255,255,255,0.25)', sidebarHover:'rgba(255,255,255,0.1)' },
      dark: { ivory:'#0F0B1E', ivoryWarm:'#140F26', ivoryDeep:'#0A0716', ivoryCard:'#1A1330', ivorySurface:'#211843', sage:'#A78BFA', sageDeep:'#C4B5FD', sageMuted:'#7C3AED', sageLight:'#2A2050', sageSurface:'#221A42', sageHover:'#C4B5FD', coral:'#EC4A90', coralDeep:'#F57FB1', coralHover:'#F2347E', coralLight:'#3D1A30', coralSurface:'#341528', text:'#EEEAF9', textSecondary:'#B3A6D1', textTertiary:'#83739F', textGhost:'#5F5278', textInverse:'#0F0B1E', border:'#2E2448', borderLight:'#251D3A', sidebarBg:'linear-gradient(180deg,#080513 0%,#1A1435 55%,#221A42 100%)', sidebarText:'rgba(255,255,255,0.8)', sidebarActive:'rgba(167,139,250,0.25)', sidebarHover:'rgba(255,255,255,0.06)' }
    },
    {
      id: 'lithos', name: 'Lithos·地心炽焰', price: 450, desc: 'Lithos 地质风：黑曜岩底 + 炽橙辉光，Deep Time 地层美学',
      preview: ['#E8702A', '#A67C52', '#0F0D0B'],
      light: { ivory:'#F7F4ED', ivoryWarm:'#FBF9F3', ivoryDeep:'#EDE7DA', ivoryCard:'#FFFFFF', ivorySurface:'#FDFBF6', sage:'#D2611F', sageDeep:'#B04E16', sageMuted:'#E8925C', sageLight:'#FCE7D6', sageSurface:'#FDF2E7', sageHover:'#C25A1B', coral:'#A67C52', coralDeep:'#8C643A', coralHover:'#B58A5C', coralLight:'#F5EADC', coralSurface:'#FBF4EA', text:'#292016', textSecondary:'#6E5D48', textTertiary:'#A08D74', textGhost:'#CBBBA4', textInverse:'#FFFFFF', border:'#E7DCC9', borderLight:'#F0E8DA', sidebarBg:'linear-gradient(180deg,#120C05 0%,#5E3A1C 55%,#7A4A1F 100%)', sidebarText:'rgba(255,255,255,0.92)', sidebarActive:'rgba(232,112,42,0.35)', sidebarHover:'rgba(255,255,255,0.1)' },
      dark: { ivory:'#0F0D0B', ivoryWarm:'#141210', ivoryDeep:'#0A0908', ivoryCard:'#1A1713', ivorySurface:'#211D18', sage:'#FF8A4C', sageDeep:'#FFA36B', sageMuted:'#E8702A', sageLight:'#3A2515', sageSurface:'#2D1D10', sageHover:'#FF9A63', coral:'#D8A05F', coralDeep:'#E2B578', coralHover:'#CB9253', coralLight:'#3A2A18', coralSurface:'#33241A', text:'#F2EBE0', textSecondary:'#B5A692', textTertiary:'#887861', textGhost:'#5F5443', textInverse:'#0F0D0B', border:'#2E2820', borderLight:'#262019', sidebarBg:'linear-gradient(180deg,#060504 0%,#1A120A 55%,#241810 100%)', sidebarText:'rgba(255,255,255,0.8)', sidebarActive:'rgba(255,138,76,0.25)', sidebarHover:'rgba(255,255,255,0.06)' }
    },
    {
      id: 'boomerang', name: 'Boomerang·回旋黑白', price: 400, desc: 'Boomerang 金融风：本白极简 + 墨黑主色，克制高级',
      preview: ['#191919', '#F4F3F3', '#FFFFFF'],
      light: { ivory:'#FFFFFF', ivoryWarm:'#FCFCFC', ivoryDeep:'#F4F3F3', ivoryCard:'#FFFFFF', ivorySurface:'#FAFAFA', sage:'#191919', sageDeep:'#000000', sageMuted:'#4A4A4A', sageLight:'#ECECEC', sageSurface:'#F4F3F3', sageHover:'#000000', coral:'#737373', coralDeep:'#525252', coralHover:'#404040', coralLight:'#F0F0F0', coralSurface:'#F7F7F7', text:'#191919', textSecondary:'#6B6B6B', textTertiary:'#9CA3AF', textGhost:'#D1D5DB', textInverse:'#FFFFFF', border:'#E5E5E5', borderLight:'#ECECEC', sidebarBg:'linear-gradient(180deg,#000000 0%,#191919 60%,#2E2E2E 100%)', sidebarText:'rgba(255,255,255,0.9)', sidebarActive:'rgba(255,255,255,0.2)', sidebarHover:'rgba(255,255,255,0.08)' },
      dark: { ivory:'#0F0F0F', ivoryWarm:'#141414', ivoryDeep:'#0A0A0A', ivoryCard:'#1A1A1A', ivorySurface:'#222222', sage:'#FFFFFF', sageDeep:'#E5E5E5', sageMuted:'#A3A3A3', sageLight:'#2A2A2A', sageSurface:'#1E1E1E', sageHover:'#D9D9D9', coral:'#9CA3AF', coralDeep:'#B9C0CA', coralHover:'#8B919B', coralLight:'#24272B', coralSurface:'#1F2125', text:'#F5F5F5', textSecondary:'#A3A3A3', textTertiary:'#737373', textGhost:'#525252', textInverse:'#0F0F0F', border:'#262626', borderLight:'#1F1F1F', sidebarBg:'linear-gradient(180deg,#000000 0%,#0F0F0F 60%,#222222 100%)', sidebarText:'rgba(255,255,255,0.8)', sidebarActive:'rgba(255,255,255,0.18)', sidebarHover:'rgba(255,255,255,0.06)' }
    }
  ];

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

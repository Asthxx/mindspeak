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
      id: 'aurora', name: '极光', price: 350,
      desc: '极光在午夜天幕缓慢漂移，青绿与紫辉交织',
      preview: ['#34D399', '#A78BFA', '#22D3EE'],
      light: {
        ivory: '#F2F7F6', ivoryWarm: '#F5FAF8', ivoryDeep: '#E3EFEB', ivoryCard: '#FFFFFF', ivorySurface: '#F8FCFB',
        sage: '#10B981', sageDeep: '#059669', sageMuted: '#6EE7B7', sageLight: '#D1FAE5', sageSurface: '#ECFDF5', sageHover: '#34D399',
        coral: '#8B5CF6', coralDeep: '#7C3AED', coralHover: '#A78BFA', coralLight: '#EDE9FE', coralSurface: '#F5F3FF',
        text: '#1E293B', textSecondary: '#475569', textTertiary: '#94A3B8', textGhost: '#CBD5E1', textInverse: '#FFFFFF',
        border: '#D7E5E0', borderLight: '#E8F1EE',
        sidebarBg: 'linear-gradient(180deg,#0F2E2A 0%,#134E4A 100%)', sidebarText: 'rgba(240,253,250,0.9)', sidebarActive: 'rgba(110,231,183,0.25)', sidebarHover: 'rgba(255,255,255,0.08)'
      },
      dark: {
        ivory: '#0B1512', ivoryWarm: '#0F1B17', ivoryDeep: '#07100D', ivoryCard: '#12201B', ivorySurface: '#152620',
        sage: '#34D399', sageDeep: '#6EE7B7', sageMuted: '#0E9F6E', sageLight: '#0F2E24', sageSurface: '#123328', sageHover: '#2DD4A0',
        coral: '#A78BFA', coralDeep: '#8B5CF6', coralHover: '#C4B5FD', coralLight: '#2A2440', coralSurface: '#221E38',
        text: '#E8F5F0', textSecondary: '#A7C4B8', textTertiary: '#6B8A7E', textGhost: '#3E574E', textInverse: '#06110D',
        border: '#1E332C', borderLight: '#16261F',
        sidebarBg: 'linear-gradient(180deg,#081511 0%,#0D211C 100%)', sidebarText: 'rgba(232,245,240,0.75)', sidebarActive: 'rgba(52,211,153,0.22)', sidebarHover: 'rgba(255,255,255,0.06)'
      }
    },
    {
      id: 'ember', name: '余烬', price: 300,
      desc: '炭火余温不熄，火星自底部缓缓升起',
      preview: ['#F59320', '#C2402A', '#FBB25A'],
      light: {
        ivory: '#FAF6F2', ivoryWarm: '#FBF8F4', ivoryDeep: '#F0E6DC', ivoryCard: '#FFFDFB', ivorySurface: '#FDF9F5',
        sage: '#E8830C', sageDeep: '#C96D05', sageMuted: '#F5A94E', sageLight: '#FCE9CF', sageSurface: '#FEF4E3', sageHover: '#F59320',
        coral: '#C2402A', coralDeep: '#A32F1D', coralHover: '#D95F49', coralLight: '#F8DCD4', coralSurface: '#FBEBE6',
        text: '#33261C', textSecondary: '#6B5240', textTertiary: '#A08772', textGhost: '#CDBBA8', textInverse: '#FFF8F0',
        border: '#E8D5C0', borderLight: '#F2E5D6',
        sidebarBg: 'linear-gradient(180deg,#3A241A 0%,#59331F 100%)', sidebarText: 'rgba(253,246,238,0.9)', sidebarActive: 'rgba(245,169,78,0.28)', sidebarHover: 'rgba(255,255,255,0.08)'
      },
      dark: {
        ivory: '#171008', ivoryWarm: '#1E150B', ivoryDeep: '#0E0904', ivoryCard: '#221810', ivorySurface: '#281D13',
        sage: '#F59320', sageDeep: '#FBB25A', sageMuted: '#C96D05', sageLight: '#33230F', sageSurface: '#3D2B13', sageHover: '#FFA93D',
        coral: '#E06A50', coralDeep: '#C2402A', coralHover: '#EC8A75', coralLight: '#38160E', coralSurface: '#2B110A',
        text: '#F7EDE2', textSecondary: '#CBB49E', textTertiary: '#96806B', textGhost: '#54463A', textInverse: '#120B05',
        border: '#332619', borderLight: '#241A10',
        sidebarBg: 'linear-gradient(180deg,#120A05 0%,#1F130A 100%)', sidebarText: 'rgba(247,237,226,0.72)', sidebarActive: 'rgba(245,147,32,0.24)', sidebarHover: 'rgba(255,255,255,0.06)'
      }
    },
    {
      id: 'zen', name: '禅意', price: 250,
      desc: '苔庭水纹，一笔淡墨呼吸吐纳',
      preview: ['#7A9B6D', '#C2554D', '#A3BD97'],
      light: {
        ivory: '#F7F6F1', ivoryWarm: '#FAF9F4', ivoryDeep: '#EBE9E0', ivoryCard: '#FFFFFF', ivorySurface: '#F4F3EC',
        sage: '#7A9B6D', sageDeep: '#5F7F53', sageMuted: '#A3BD97', sageLight: '#E7EFE2', sageSurface: '#F1F6EE', sageHover: '#8CA97F',
        coral: '#C2554D', coralDeep: '#A63E37', coralHover: '#D4796F', coralLight: '#F4E0DE', coralSurface: '#FAEEED',
        text: '#2E2C27', textSecondary: '#5C594F', textTertiary: '#918E82', textGhost: '#C4C1B5', textInverse: '#FFFFFF',
        border: '#DDD9CC', borderLight: '#EBE8DE',
        sidebarBg: 'linear-gradient(180deg,#3F4438 0%,#5A6150 100%)', sidebarText: 'rgba(247,246,241,0.9)', sidebarActive: 'rgba(163,189,151,0.28)', sidebarHover: 'rgba(255,255,255,0.08)'
      },
      dark: {
        ivory: '#131511', ivoryWarm: '#191B16', ivoryDeep: '#0B0D09', ivoryCard: '#1B1E18', ivorySurface: '#20241D',
        sage: '#8FBA7F', sageDeep: '#A9D298', sageMuted: '#6E9660', sageLight: '#232B1F', sageSurface: '#28311F', sageHover: '#9CC48B',
        coral: '#D4796F', coralDeep: '#B85248', coralHover: '#E0948C', coralLight: '#33201E', coralSurface: '#291816',
        text: '#EDEBE3', textSecondary: '#BFBDAF', textTertiary: '#8B897B', textGhost: '#4A483E', textInverse: '#0A0C08',
        border: '#2A2D24', borderLight: '#1D2018',
        sidebarBg: 'linear-gradient(180deg,#0D0F0B 0%,#161911 100%)', sidebarText: 'rgba(237,235,227,0.72)', sidebarActive: 'rgba(143,186,127,0.22)', sidebarHover: 'rgba(255,255,255,0.05)'
      }
    },
    {
      id: 'cyberpunk', name: '赛博朋克', price: 400,
      desc: '霓虹扫描线划过夜城，故障在字里行间闪烁',
      preview: ['#22D3EE', '#F472B6', '#A78BFA'],
      light: {
        ivory: '#EEF2F5', ivoryWarm: '#F4F8FA', ivoryDeep: '#DCE4E9', ivoryCard: '#FFFFFF', ivorySurface: '#F6F9FB',
        sage: '#0891B2', sageDeep: '#0E7490', sageMuted: '#22D3EE', sageLight: '#CFFAFE', sageSurface: '#ECFEFF', sageHover: '#06A6CC',
        coral: '#DB2777', coralDeep: '#BE185D', coralHover: '#EC4899', coralLight: '#FCE7F3', coralSurface: '#FDF2F8',
        text: '#0F172A', textSecondary: '#334155', textTertiary: '#7C8DA0', textGhost: '#C7D2DD', textInverse: '#FFFFFF',
        border: '#CFDCE4', borderLight: '#E2EBF0',
        sidebarBg: 'linear-gradient(180deg,#111827 0%,#1E2A45 100%)', sidebarText: 'rgba(226,242,250,0.9)', sidebarActive: 'rgba(34,211,238,0.26)', sidebarHover: 'rgba(255,255,255,0.08)'
      },
      dark: {
        ivory: '#0A0E14', ivoryWarm: '#0E141C', ivoryDeep: '#05080C', ivoryCard: '#101722', ivorySurface: '#141C2A',
        sage: '#22D3EE', sageDeep: '#67E8F9', sageMuted: '#0891B2', sageLight: '#0E2A33', sageSurface: '#123340', sageHover: '#3EE0F5',
        coral: '#F472B6', coralDeep: '#EC4899', coralHover: '#F9A8D4', coralLight: '#331527', coralSurface: '#2A0F20',
        text: '#E2F2FA', textSecondary: '#9FB8C8', textTertiary: '#5F7788', textGhost: '#2E4150', textInverse: '#04070B',
        border: '#1C2937', borderLight: '#131C27',
        sidebarBg: 'linear-gradient(180deg,#05070C 0%,#0B1322 100%)', sidebarText: 'rgba(226,242,250,0.75)', sidebarActive: 'rgba(34,211,238,0.24)', sidebarHover: 'rgba(255,255,255,0.06)'
      }
    },
    {
      id: 'nordic', name: '北欧', price: 275,
      desc: '峡湾晨雾，几何线条缓慢流动',
      preview: ['#4F8A7B', '#C97B5D', '#7FAFA1'],
      light: {
        ivory: '#F5F7F8', ivoryWarm: '#F9FBFB', ivoryDeep: '#E6EBED', ivoryCard: '#FFFFFF', ivorySurface: '#F2F5F6',
        sage: '#4F8A7B', sageDeep: '#3D6F62', sageMuted: '#7FAFA1', sageLight: '#DEEDE8', sageSurface: '#EDF5F2', sageHover: '#5C9C8D',
        coral: '#C97B5D', coralDeep: '#B05F42', coralHover: '#D89A7E', coralLight: '#F6E4DB', coralSurface: '#FBF0EA',
        text: '#2B3336', textSecondary: '#576266', textTertiary: '#8B979B', textGhost: '#C3CDCF', textInverse: '#FFFFFF',
        border: '#D9E1E3', borderLight: '#E8EEEF',
        sidebarBg: 'linear-gradient(180deg,#33424A 0%,#4A5D66 100%)', sidebarText: 'rgba(245,247,248,0.9)', sidebarActive: 'rgba(127,175,161,0.28)', sidebarHover: 'rgba(255,255,255,0.08)'
      },
      dark: {
        ivory: '#101619', ivoryWarm: '#151C20', ivoryDeep: '#0A0E10', ivoryCard: '#161D21', ivorySurface: '#1B2327',
        sage: '#6FB5A3', sageDeep: '#8FCCBC', sageMuted: '#4F8A7B', sageLight: '#1B2E29', sageSurface: '#20362F', sageHover: '#7FC2B0',
        coral: '#D89A7E', coralDeep: '#C97B5D', coralHover: '#E4B098', coralLight: '#2E1D16', coralSurface: '#241611',
        text: '#E6EDEE', textSecondary: '#AEBCBF', textTertiary: '#7A888B', textGhost: '#3D4A4D', textInverse: '#080D0F',
        border: '#232E32', borderLight: '#182023',
        sidebarBg: 'linear-gradient(180deg,#0B1113 0%,#131B1E 100%)', sidebarText: 'rgba(230,237,238,0.72)', sidebarActive: 'rgba(111,181,163,0.22)', sidebarHover: 'rgba(255,255,255,0.05)'
      }
    },
    {
      id: 'vintage', name: '复古', price: 225,
      desc: '老胶片颗粒与暗角，褪色的温暖',
      preview: ['#B5654A', '#8A8B5C', '#C98267'],
      light: {
        ivory: '#F6F1E7', ivoryWarm: '#F9F5EC', ivoryDeep: '#EAE2D2', ivoryCard: '#FFFDF8', ivorySurface: '#F4EFE4',
        sage: '#8A8B5C', sageDeep: '#6E6F45', sageMuted: '#A6A77E', sageLight: '#EAEAD8', sageSurface: '#F3F3E7', sageHover: '#9C9D6E',
        coral: '#B5654A', coralDeep: '#96482F', coralHover: '#C98267', coralLight: '#F0DDD4', coralSurface: '#F8ECE6',
        text: '#3A322A', textSecondary: '#6B5F51', textTertiary: '#998C7A', textGhost: '#CFC4B2', textInverse: '#FFFDF6',
        border: '#DFD3BE', borderLight: '#EBE2D2',
        sidebarBg: 'linear-gradient(180deg,#4A3B2C 0%,#6B5540 100%)', sidebarText: 'rgba(246,241,231,0.9)', sidebarActive: 'rgba(201,130,103,0.28)', sidebarHover: 'rgba(255,255,255,0.08)'
      },
      dark: {
        ivory: '#171310', ivoryWarm: '#1D1813', ivoryDeep: '#0E0B08', ivoryCard: '#1F1A14', ivorySurface: '#251F18',
        sage: '#A6A77E', sageDeep: '#C0C198', sageMuted: '#8A8B5C', sageLight: '#262619', sageSurface: '#2D2D1E', sageHover: '#B5B68F',
        coral: '#C98267', coralDeep: '#B5654A', coralHover: '#DA9B82', coralLight: '#2F1B14', coralSurface: '#261510',
        text: '#F1E9DB', textSecondary: '#C9BBA6', textTertiary: '#948871', textGhost: '#4E4437', textInverse: '#0C0906',
        border: '#302820', borderLight: '#221C15',
        sidebarBg: 'linear-gradient(180deg,#0F0B07 0%,#191209 100%)', sidebarText: 'rgba(241,233,219,0.72)', sidebarActive: 'rgba(166,167,126,0.22)', sidebarHover: 'rgba(255,255,255,0.05)'
      }
    },
    {
      id: 'space', name: '太空', price: 375,
      desc: '星云呼吸旋转，星点在深空眨眼',
      preview: ['#7FA3E8', '#F5BC47', '#A78BFA'],
      light: {
        ivory: '#EEF1F6', ivoryWarm: '#F3F6FA', ivoryDeep: '#DEE4EE', ivoryCard: '#FFFFFF', ivorySurface: '#F5F8FC',
        sage: '#4F7DD9', sageDeep: '#3A63B8', sageMuted: '#7FA3E8', sageLight: '#DEE8FA', sageSurface: '#EDF3FD', sageHover: '#5E8CE0',
        coral: '#E8A020', coralDeep: '#C98606', coralHover: '#F5BC47', coralLight: '#FCF0D4', coralSurface: '#FEF8E8',
        text: '#1C2433', textSecondary: '#48566B', textTertiary: '#8391A6', textGhost: '#C6D0DE', textInverse: '#FFFFFF',
        border: '#D5DEEA', borderLight: '#E5EBF3',
        sidebarBg: 'linear-gradient(180deg,#141B33 0%,#232E52 100%)', sidebarText: 'rgba(238,241,246,0.9)', sidebarActive: 'rgba(127,163,232,0.26)', sidebarHover: 'rgba(255,255,255,0.08)'
      },
      dark: {
        ivory: '#070B14', ivoryWarm: '#0B101C', ivoryDeep: '#04060B', ivoryCard: '#0D1320', ivorySurface: '#111828',
        sage: '#7FA3E8', sageDeep: '#A5C0F2', sageMuted: '#4F7DD9', sageLight: '#16223B', sageSurface: '#1B2A47', sageHover: '#8FB1EC',
        coral: '#F5BC47', coralDeep: '#E8A020', coralHover: '#FBD07A', coralLight: '#33270E', coralSurface: '#281F0B',
        text: '#E4EBF7', textSecondary: '#A6B4CC', textTertiary: '#6B7A94', textGhost: '#333F54', textInverse: '#03060C',
        border: '#1C2740', borderLight: '#131B2D',
        sidebarBg: 'linear-gradient(180deg,#030509 0%,#0A0F1E 100%)', sidebarText: 'rgba(228,235,247,0.75)', sidebarActive: 'rgba(127,163,232,0.24)', sidebarHover: 'rgba(255,255,255,0.06)'
      }
    },
    {
      id: 'candy', name: '糖果', price: 200,
      desc: '粉橙紫无规则糖果色系，轻盈欢快，漂浮气泡',
      preview: ['#FF6FA5', '#7FDCC0', '#B39DFF'],
      light: {
        ivory: '#FFF5F8', ivoryWarm: '#FFF8FA', ivoryDeep: '#FFE8F0', ivoryCard: '#FFFFFF', ivorySurface: '#FFFAFC',
        sage: '#4ECBA8', sageDeep: '#35B18E', sageMuted: '#7FDCC0', sageLight: '#DEF5EE', sageSurface: '#EAF9F4', sageHover: '#3DBC9B',
        coral: '#FF6FA5', coralDeep: '#F0528D', coralHover: '#FF87B5', coralLight: '#FFE4EE', coralSurface: '#FFECEF',
        text: '#46303C', textSecondary: '#7A5F6C', textTertiary: '#A58A96', textGhost: '#CBB3BE', textInverse: '#FFFFFF',
        border: '#F5DCE5', borderLight: '#FAE9EF',
        sidebarBg: 'linear-gradient(180deg,#7C4E9E 0%,#C86DA8 100%)', sidebarText: 'rgba(255,250,252,0.92)', sidebarActive: 'rgba(255,255,255,0.24)', sidebarHover: 'rgba(255,255,255,0.12)'
      },
      dark: {
        ivory: '#1A1018', ivoryWarm: '#21151E', ivoryDeep: '#130B12', ivoryCard: '#261824', ivorySurface: '#2D1E2A',
        sage: '#5FD9B6', sageDeep: '#7FE6C8', sageMuted: '#46C2A0', sageLight: '#1C332C', sageSurface: '#172B25', sageHover: '#72DFBF',
        coral: '#FF8AB8', coralDeep: '#FFA5CA', coralHover: '#FF74A9', coralLight: '#3A1B2C', coralSurface: '#311625',
        text: '#FBEFF5', textSecondary: '#C7A8B8', textTertiary: '#93788A', textGhost: '#63505C', textInverse: '#1A1018',
        border: '#3A2734', borderLight: '#2E1F2A',
        sidebarBg: 'linear-gradient(180deg,#140C12 0%,#2A1830 100%)', sidebarText: 'rgba(250,238,245,0.68)', sidebarActive: 'rgba(95,217,182,0.2)', sidebarHover: 'rgba(255,255,255,0.06)'
      }
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

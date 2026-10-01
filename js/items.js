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
    if (!window.app.gamification.addPoints(-t.price)) return;
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

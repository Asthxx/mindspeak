// ==================== 邮箱注册 / 登录 ====================
// 后端: server/ (Node.js + Express)，API 前缀 /api/auth
// 本地用 file:// 打开页面时自动指向 http://localhost:3000
var AuthModule = (function() {

  var TOKEN_KEY = 'auth_token';
  var USER_KEY = 'auth_user';

  function storeGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function storeSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function storeDel(k) { try { localStorage.removeItem(k); } catch (e) {} }

  function apiBase() {
    return window.API_BASE || 'http://localhost:3000';
  }

  function api(path, options) {
    options = options || {};
    var headers = { 'Content-Type': 'application/json' };
    var token = storeGet(TOKEN_KEY);
    if (token) headers['Authorization'] = 'Bearer ' + token;
    var controller = new AbortController();
    var timer = setTimeout(function() { controller.abort(); }, 15000); // 15s 超时，避免后端无响应时按钮永久卡死
    return fetch(apiBase() + path, {
      method: options.method || 'GET',
      headers: headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal
    }).then(function(res) {
      clearTimeout(timer);
      if (res.status === 401 || res.status === 403) {
        // token 失效：统一清理登录态并刷新 UI，避免运行期一直遗留"已登录"
        storeDel(TOKEN_KEY);
        storeDel(USER_KEY);
        me.updateUI();
      }
      return res.json().catch(function() { return { ok: false, message: '服务器响应异常' }; });
    }, function() {
      clearTimeout(timer);
      throw new Error('timeout');
    });
  }

  function getToken() { return storeGet(TOKEN_KEY); }
  function getUser() {
    try { return JSON.parse(storeGet(USER_KEY) || 'null'); } catch (e) { return null; }
  }

  function renderHeaderAvatar() {
    var img = document.getElementById('auth-avatar');
    var icon = document.getElementById('auth-icon-default');
    if (!img || !icon) return;
    var user = getUser();
    if (getToken() && user && user.avatar) {
      img.src = user.avatar;
      img.hidden = false;
      icon.style.display = 'none';
    } else {
      img.hidden = true;
      icon.style.display = '';
    }
  }

  var me = {
    countdown: null,

    init: function() {
      this.bindUI();
      this.updateUI();
      var token = getToken();
      if (token) {
        api('/api/auth/me').then(function(r) {
          if (r.ok) {
            storeSet(USER_KEY, JSON.stringify(r.user));
            me.updateUI();
          } else {
            storeDel(TOKEN_KEY);
            storeDel(USER_KEY);
            me.updateUI();
          }
        }).catch(function() {
          // 后端未启动/网络失败：保留本地登录态，不抛未处理拒绝
        });
      }
      // 跨 tab 登录态同步：另一 tab 登录/退出时本 tab 立即跟随
      window.addEventListener('storage', function(e) {
        if (e.key === TOKEN_KEY || e.key === USER_KEY) me.updateUI();
      });
    },

    bindUI: function() {
      var self = this;
      var authBtn = document.getElementById('btn-auth');
      if (authBtn) authBtn.addEventListener('click', function() {
        if (getToken()) { self.showUserModal(); } else { self.openAuthModal('login'); }
      });

      document.querySelectorAll('.auth-tab').forEach(function(tab) {
        tab.addEventListener('click', function() { self.switchTab(tab.dataset.authTab); });
      });
      document.querySelectorAll('[data-auth-switch]').forEach(function(a) {
        a.addEventListener('click', function(e) {
          e.preventDefault();
          self.switchTab(a.dataset.authSwitch);
        });
      });
      document.querySelectorAll('[data-auth-close]').forEach(function(b) {
        b.addEventListener('click', function() { self.closeModals(); });
      });

      var sendBtn = document.getElementById('btn-send-code');
      if (sendBtn) sendBtn.addEventListener('click', function() { self.sendCode(); });

      var loginForm = document.getElementById('form-auth-login');
      if (loginForm) loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        self.login();
      });

      var regForm = document.getElementById('form-auth-register');
      if (regForm) regForm.addEventListener('submit', function(e) {
        e.preventDefault();
        self.register();
      });

      var logoutBtn = document.getElementById('btn-logout');
      if (logoutBtn) logoutBtn.addEventListener('click', function() { self.logout(); });

      var chooseBtn = document.getElementById('btn-choose-avatar');
      var fileInput = document.getElementById('input-avatar');
      if (chooseBtn && fileInput) {
        chooseBtn.addEventListener('click', function() { fileInput.click(); });
        fileInput.addEventListener('change', function() { self.setAvatar(this); });
      }
      var clearBtn = document.getElementById('btn-clear-avatar');
      if (clearBtn) clearBtn.addEventListener('click', function() { self.clearAvatar(); });

      document.querySelectorAll('#modal-auth, #modal-user').forEach(function(modal) {
        modal.addEventListener('click', function(e) {
          if (e.target === modal) modal.classList.add('hidden');
        });
      });
    },

    switchTab: function(tab) {
      document.querySelectorAll('.auth-tab').forEach(function(t) {
        t.classList.toggle('active', t.dataset.authTab === tab);
      });
      document.getElementById('form-auth-login').classList.toggle('hidden', tab !== 'login');
      document.getElementById('form-auth-register').classList.toggle('hidden', tab !== 'register');
    },

    openAuthModal: function(tab) {
      this.switchTab(tab || 'login');
      document.getElementById('modal-auth').classList.remove('hidden');
    },

    showUserModal: function() {
      var user = getUser();
      var info = document.getElementById('user-info');
      var preview = document.getElementById('user-avatar-preview');
      var defIcon = document.getElementById('user-avatar-default');
      if (preview && defIcon) {
        if (user && user.avatar) {
          preview.src = user.avatar;
          preview.hidden = false;
          defIcon.style.display = 'none';
        } else {
          preview.hidden = true;
          defIcon.style.display = '';
        }
      }
      if (info) {
        info.textContent = '';
        var lines = [
          '昵称：' + (user ? user.nickname : '-'),
          '邮箱：' + (user ? user.email : '-')
        ];
        lines.forEach(function(line) {
          var p = document.createElement('p');
          p.style.margin = '4px 0';
          p.textContent = line;
          info.appendChild(p);
        });
      }
      document.getElementById('modal-user').classList.remove('hidden');
    },

    closeModals: function() {
      document.getElementById('modal-auth').classList.add('hidden');
      document.getElementById('modal-user').classList.add('hidden');
    },

    updateUI: function() {
      var btn = document.getElementById('btn-auth');
      var label = document.getElementById('auth-btn-label');
      var user = getUser();
      renderHeaderAvatar();
      if (!btn || !label) return;
      if (getToken() && user) {
        btn.title = '我的账号（' + user.email + '）';
        label.textContent = user.nickname;
      } else {
        btn.title = '登录 / 注册';
        label.textContent = '登录';
      }
    },

    setAvatar: function(input) {
      var file = input.files && input.files[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        if (window.Toast) Toast.error('图片太大，请选择 5MB 以内的图片');
        input.value = '';
        return;
      }
      var self = this;
      var reader = new FileReader();
      reader.onload = function(e) {
        var img = new Image();
        img.onload = function() {
          var size = 128;
          var canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          var ctx = canvas.getContext('2d');
          var min = Math.min(img.width, img.height);
          var sx = (img.width - min) / 2;
          var sy = (img.height - min) / 2;
          ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
          self.saveAvatar(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
      input.value = '';
    },

    saveAvatar: function(dataUrl) {
      var self = this;
      api('/api/auth/avatar', { method: 'POST', body: { avatar: dataUrl } }).then(function(r) {
        if (r.ok) {
          var user = getUser();
          if (user) {
            user.avatar = dataUrl;
            storeSet(USER_KEY, JSON.stringify(user));
          }
          self.showUserModal();
          self.updateUI();
          if (window.Toast) Toast.success('头像已更新');
        } else {
          if (window.Toast) Toast.error(r.message || '头像更新失败');
        }
      }).catch(function() {
        if (window.Toast) Toast.error('无法连接服务器');
      });
    },

    clearAvatar: function() {
      var self = this;
      api('/api/auth/avatar', { method: 'POST', body: { avatar: '' } }).then(function(r) {
        if (r.ok) {
          var user = getUser();
          if (user) {
            user.avatar = null;
            storeSet(USER_KEY, JSON.stringify(user));
          }
          self.showUserModal();
          self.updateUI();
          if (window.Toast) Toast.info('已清除头像');
        } else {
          if (window.Toast) Toast.error(r.message || '头像更新失败');
        }
      }).catch(function() {
        if (window.Toast) Toast.error('无法连接服务器');
      });
    },

    sendCode: function() {
      var email = document.getElementById('reg-email').value.trim();
      if (!email) {
        Toast.warning('请先填写邮箱');
        return;
      }
      var btn = document.getElementById('btn-send-code');
      var self = this;
      btn.disabled = true;
      api('/api/auth/send-code', { method: 'POST', body: { email: email } }).then(function(r) {
        if (r.ok) {
          Toast.success('验证码已发送到 ' + email + '，请查收');
          self.startCountdown(btn, 60);
        } else {
          Toast.error(r.message || '发送失败');
          btn.disabled = false;
        }
      }).catch(function() {
        Toast.error('无法连接服务器，请确认已启动 server/（node server.js）');
        btn.disabled = false;
      });
    },

    startCountdown: function(btn, seconds) {
      var self = this;
      if (this.countdown) clearInterval(this.countdown);
      var left = seconds;
      btn.textContent = left + 's';
      this.countdown = setInterval(function() {
        left--;
        if (left <= 0) {
          clearInterval(self.countdown);
          self.countdown = null;
          btn.disabled = false;
          btn.textContent = '发送验证码';
        } else {
          btn.textContent = left + 's';
        }
      }, 1000);
    },

    register: function() {
      var email = document.getElementById('reg-email').value.trim();
      var code = document.getElementById('reg-code').value.trim();
      var nickname = document.getElementById('reg-nickname').value.trim();
      var password = document.getElementById('reg-password').value;
      var password2 = document.getElementById('reg-password2').value;

      if (password !== password2) {
        if (window.Toast) Toast.error('两次输入的密码不一致');
        return;
      }
      var self = this;
      api('/api/auth/register', { method: 'POST', body: { email: email, code: code, nickname: nickname, password: password } })
        .then(function(r) {
          if (r.ok) {
            storeSet(TOKEN_KEY, r.token);
            storeSet(USER_KEY, JSON.stringify(r.user));
            self.closeModals();
            self.updateUI();
            if (window.Toast) Toast.success('注册成功，欢迎 ' + r.user.nickname + '！');
          } else {
            if (window.Toast) Toast.error(r.message || '注册失败');
          }
        }).catch(function() {
          if (window.Toast) Toast.error('无法连接服务器');
        });
    },

    login: function() {
      var email = document.getElementById('login-email').value.trim();
      var password = document.getElementById('login-password').value;
      var self = this;
      api('/api/auth/login', { method: 'POST', body: { email: email, password: password } })
        .then(function(r) {
          if (r.ok) {
            storeSet(TOKEN_KEY, r.token);
            storeSet(USER_KEY, JSON.stringify(r.user));
            self.closeModals();
            self.updateUI();
            if (window.Toast) Toast.success('登录成功，欢迎回来 ' + r.user.nickname + '！');
          } else {
            if (window.Toast) Toast.error(r.message || '登录失败');
          }
        }).catch(function() {
          if (window.Toast) Toast.error('无法连接服务器');
        });
    },

    logout: function() {
      storeDel(TOKEN_KEY);
      storeDel(USER_KEY);
      this.closeModals();
      this.updateUI();
      if (window.Toast) Toast.info('已退出登录');
    }
  };

  return me;
})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() { AuthModule.init(); });
} else {
  AuthModule.init();
}

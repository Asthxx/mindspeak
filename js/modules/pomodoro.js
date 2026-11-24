// 番茄钟模块（2026-11-24 从 js/app.js 拆出，纯移动、无逻辑改动）
// 依赖 DataStore / Toast / escapeHtml / SpeechUtil 等全局符号，由 app.js 及前置模块提供。
// ==================== 番茄钟模块 ====================
var PomodoroModule = (function() {
  function PomodoroModule() {
    this.timer = null;
    this.isRunning = false;
    this.sessions = DataStore.getProgress('pomodoro_sessions', 0);
    this.totalMinutes = DataStore.getProgress('pomodoro_minutes', 0);
    // 完成提醒音开关（弹窗不受此开关影响，总是显示）；设置页切换时即时更新本字段
    this.soundEnabled = DataStore.getProgress('pomodoro_sound_enabled', true) !== false;
    // 按 select 当前选中值初始化剩余秒数，让初始显示就是 MM:00 而不是 00:00
    var durSel = document.getElementById('pomodoro-duration');
    var minutes = durSel ? (parseInt(durSel.value) || 25) : 25;
    this.timeLeft = minutes * 60;
    this.initUI();
  }
  PomodoroModule.prototype.initUI = function() {
    var self = this;
    safeBind('btn-pomodoro-start', 'click', function() { self.toggle(); });
    safeBind('btn-pomodoro-reset', 'click', function() { self.reset(); });
    // 时长下拉切换：未运行时即时把显示更新为新时长（MM:00）；运行中需先确认是否放弃当前进度
    var durSel = document.getElementById('pomodoro-duration');
    if (durSel) {
      var prevDuration = durSel.value;  // 记下切换前的选中值，用户拒绝确认时还原它（而不是按 [15,60] 钳到错值）
      durSel.addEventListener('change', function() {
        var minutes = parseInt(durSel.value) || 25;
if (self.isRunning) {
          // 运行中切换：提示，否则把 timer 跑乱了
          ConfirmBox.confirm('正在专注中，切换时长会重置当前进度，确定吗？', function() {
            // 用户确认：清掉旧 timer，按新时长重新设 timeLeft
            if (self.timer) clearInterval(self.timer);
            self.timeLeft = minutes * 60;
            self.isRunning = false;
            self.updateDisplay();
            document.getElementById('btn-pomodoro-start').innerHTML = '<svg class="icon"><use href="#i-play"/></svg> 开始专注';
            prevDuration = durSel.value;  // 切换成功后更新基线
          }, {
            title: '切换专注时长',
            okText: '切换',
            danger: true,
            onCancel: function() {
              // 撤销选择：还原到切换前的那个 option（如 25 分钟），避免按 timeLeft 钳到 [15,60] 区间内的错误值
              durSel.value = prevDuration;
            }
          });
        } else {
          // 未运行：直接把显示改成新时长（MM:00），让用户看到自己的选择
          self.timeLeft = minutes * 60;
          self.updateDisplay();
          prevDuration = durSel.value; // 切换成功后更新基线
        }
      });
    }
    this.updateDisplay();
    this.updateStats();
  };
  PomodoroModule.prototype.toggle = function() { if (this.isRunning) this.pause(); else this.start(); };
PomodoroModule.prototype.start = function() {
    if (this.timer) clearInterval(this.timer);
    if (this.timeLeft <= 0) {
      var minutes = parseInt(document.getElementById('pomodoro-duration').value) || 25;
      this.timeLeft = minutes * 60;
    }
    this.isRunning = true;
    document.getElementById('btn-pomodoro-start').innerHTML = '<svg class="icon"><use href="#i-refresh"/></svg> 暂停';
    var self = this;
    // 时间戳驱动：后台节流 setInterval 会让每秒递减变慢，专注时长被拉长；
    // 改为记录截止时间，tick 时按真实差值取整
    this._deadline = Date.now() + this.timeLeft * 1000;
    this.timer = setInterval(function() {
      var remain = Math.max(0, Math.round((self._deadline - Date.now()) / 1000));
      if (remain !== self.timeLeft) {
        self.timeLeft = remain;
        self.updateDisplay();
      }
      if (self.timeLeft <= 0) self.complete();
    }, 250);
  };
  PomodoroModule.prototype.pause = function() {
    this.isRunning = false;
    if (this.timer) clearInterval(this.timer);
    this._deadline = 0;
    document.getElementById('btn-pomodoro-start').innerHTML = '<svg class="icon"><use href="#i-play"/></svg> 继续';
  };
  PomodoroModule.prototype.reset = function() {
    this.isRunning = false;
    if (this.timer) clearInterval(this.timer);
    // 重置后按当前选中时长回到 MM:00，而不是 00:00
    var minutes = parseInt(document.getElementById('pomodoro-duration').value) || 25;
    this.timeLeft = minutes * 60;
    this.updateDisplay();
    document.getElementById('btn-pomodoro-start').innerHTML = '<svg class="icon"><use href="#i-play"/></svg> 开始专注';
    document.getElementById('pomodoro-message').classList.add('hidden');
  };
  PomodoroModule.prototype.complete = function() {
    this.isRunning = false;
    if (this.timer) clearInterval(this.timer);
    this.sessions++;
    var minutes = parseInt(document.getElementById('pomodoro-duration').value) || 25;
    this.totalMinutes += minutes;
    DataStore.setProgress('pomodoro_sessions', this.sessions);
    DataStore.setProgress('pomodoro_minutes', this.totalMinutes);
    this.updateStats();
    var msgEl = document.getElementById('pomodoro-message');
    msgEl.classList.remove('hidden');
    msgEl.innerHTML = '专注完成！休息一下吧！';
    document.getElementById('btn-pomodoro-start').innerHTML = '<svg class="icon"><use href="#i-play"/></svg> 开始专注';
    // 完成后回到当前选中时长 MM:00，方便立即开下一轮
    this.timeLeft = minutes * 60;
    this.updateDisplay();
    Toast.success('番茄钟完成！');
    // 到时间提醒：弹窗（跨页面可见，不受开关影响）+ 三连提示音/震动（可设置关闭）
    ConfirmBox.alert('专注完成！休息一下吧。', { title: '番茄钟完成', okText: '知道了' });
    if (this.soundEnabled) {
      this._playAlertSound();
      this._vibrate();
    }
    // 系统通知：App 退到后台/锁屏时 setInterval 会被浏览器节流甚至挂起，
    // 上面的弹窗和提示音根本到不了用户，只有本地通知能把他叫回来。
    // 与"提醒音"开关分开控制：有人想静音但仍要收到通知。
    try {
      var notifyOn = typeof DataStore !== 'undefined' ? DataStore.getProgress('pomodoro_notify_enabled', true) !== false : true;
      if (notifyOn && window.NotificationManager) {
        window.NotificationManager.notifyNow('番茄钟完成', '专注结束啦，休息一下再继续。', { extra: { module: 'home' } });
      }
    } catch (e) {}
    if (window.app) window.app.recordActivity('pomodoro');
  };
  // 三连提示音：WebAudio 合成（880Hz 正弦短音 ×3），离线可用、无音频资源依赖；
  // 无 AudioContext 环境（低版本 WebView/测试）静默跳过，绝不抛错。
  PomodoroModule.prototype._playAlertSound = function() {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      var ctx = new AC();
      // iOS：定时器触发的 AudioContext 初始可能 suspended，resume 一下（autoplay 被拒则静默）
      if (ctx.resume && typeof ctx.resume === 'function') {
        var rp = ctx.resume();
        if (rp && typeof rp.catch === 'function') rp.catch(function() {});
      }
      var delays = [0, 0.35, 0.7];
      for (var i = 0; i < delays.length; i++) {
        (function(delay) {
          var osc = ctx.createOscillator();
          var gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = 880;
          var t0 = ctx.currentTime + delay;
          gain.gain.setValueAtTime(0.001, t0);
          gain.gain.exponentialRampToValueAtTime(0.4, t0 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.25);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t0);
          osc.stop(t0 + 0.28);
        })(delays[i]);
      }
      // 三连音最晚 0.7s 起播 + 0.28s 收尾 ≈ 1s；1.5s 后显式释放，防弱 WebView 不回收
      if (ctx.close && typeof ctx.close === 'function') {
        setTimeout(function() { try { ctx.close(); } catch (e) {} }, 1500);
      }
    } catch (e) {
      Logger.log('提醒音播放失败（静默跳过）');
    }
  };
  // 震动兜底：Android（Capacitor WebView）支持，iOS 忽略；仅做能力探测，失败不报错
  PomodoroModule.prototype._vibrate = function() {
    try {
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    } catch (e) {}
  };
  PomodoroModule.prototype.updateDisplay = function() {
    var min = Math.floor(this.timeLeft / 60);
    var sec = this.timeLeft % 60;
    document.getElementById('pomodoro-display').textContent = String(min).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
  };
  PomodoroModule.prototype.updateStats = function() {
    document.getElementById('pomodoro-stats').textContent = '已完成 ' + this.sessions + ' 个番茄 · 累计 ' + this.totalMinutes + ' 分钟';
  };
  return PomodoroModule;
})();

// 独立文件必须显式挂到 window：ESM 导入时顶层 var 不会成为全局符号，
// 而 app.js 的 init() 用裸标识符构造实例（浏览器多 script 标签下同理需要）。
if (typeof window !== 'undefined') window.PomodoroModule = PomodoroModule;

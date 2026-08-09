// ==================== 邮件发送（nodemailer） ====================
const nodemailer = require('nodemailer');
const config = require('./config');

const smtp = config.smtp;
const configured = !!(smtp.host && smtp.user && smtp.pass);

const transporter = configured
  ? nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: { user: smtp.user, pass: smtp.pass }
    })
  : null;

// 验证码落盘（供 Hidden 窗口下联调/用户查阅）：dev 模式与真实发信失败降级都写
function logCodeToFile(email, code) {
  try {
    const fs = require('fs');
    const path = require('path');
    const dir = path.join(__dirname, 'logs');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(path.join(dir, 'dev-codes.txt'),
      new Date().toLocaleString('zh-CN', { hour12: false }) + '  ' + email + '  →  ' + code + '\n', 'utf8');
  } catch (e) {}
}

// 返回 true=已真实发送；false=开发模式（打印到控制台）
function sendVerificationCode(email, code) {
  const from = smtp.from || smtp.user;
  if (!configured) {
    console.log(
      '\n[DEV] 未配置 SMTP，验证码不会真实发送。\n' +
      '      收件人: ' + email + '\n' +
      '      验证码: ' + code + '\n' +
      '      (在 server/config.js 填入 SMTP 配置后即可真实发信)\n'
    );
    // 启动脚本用 -WindowStyle Hidden 隐藏窗口，控制台输出不可见；
    // 同步落盘一份，供用户/联调在 server/logs/dev-codes.txt 查到验证码
    logCodeToFile(email, code);
    return Promise.resolve(false);
  }
  return transporter.sendMail({
    from: from ? '"闻道 MindSpeak" <' + from + '>' : undefined,
    to: email,
    subject: '闻道 MindSpeak 注册验证码',
    text: '你的注册验证码是：' + code + '，' + config.codeExpireMinutes + ' 分钟内有效。如果不是本人操作，请忽略本邮件。',
    html: '<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;border:1px solid #e5e9f0;border-radius:12px">'
      + '<h2 style="color:#0e7490;margin:0 0 12px">闻道 MindSpeak</h2>'
      + '<p style="color:#475569;margin:0 0 16px">你的注册验证码：</p>'
      + '<div style="font-size:32px;font-weight:700;letter-spacing:8px;color:#0f172a;background:#f1f5f9;padding:16px;border-radius:8px;text-align:center">' + code + '</div>'
      + '<p style="color:#94a3b8;font-size:13px;margin:16px 0 0">' + config.codeExpireMinutes + ' 分钟内有效。如果不是本人操作，请忽略本邮件。</p>'
      + '</div>'
  }).then(function(info) {
    console.log('[MAIL] 验证码已发送至', email, '→', info.messageId);
    return true;
  }).catch(function(err) {
    console.error('[MAIL] 发送失败:', err.message);
    // 兜底：真实发信失败时把验证码打到控制台，本机用户仍能注册，不卡死功能
    console.log('[MAIL] 降级：验证码 ' + code + '（收件人 ' + email + '，' + config.codeExpireMinutes + ' 分钟内有效）');
    logCodeToFile(email, code);
    return Promise.reject(err);
  });
}

module.exports = { sendVerificationCode, configured };
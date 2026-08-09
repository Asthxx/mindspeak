// ==================== 认证路由：注册 / 登录 / 验证码 / 当前用户 ====================
const express = require('express');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const db = require('./db');
const config = require('./config');
const mailer = require('./mailer');

const router = express.Router();
const scrypt = crypto.scryptSync;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const AVATAR_RE = /^data:image\/(png|jpe?g|webp|gif);base64,/i;
const AVATAR_MAX = 300 * 1024; // base64 字符串上限（约 200KB 图片）

function hashPassword(password, salt) {
  return scrypt(password, salt, 64).toString('hex');
}

function makeToken(user) {
  return jwt.sign({ uid: user.id, email: user.email }, config.jwtSecret, { expiresIn: '30d' });
}

function authMiddleware(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ ok: false, message: '未登录' });
  try {
    const payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
    req.userId = payload.uid;
    req.userEmail = payload.email;
    next();
  } catch (e) {
    return res.status(401).json({ ok: false, message: '登录已失效，请重新登录' });
  }
}

function genCode() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

// 发送验证码
router.post('/send-code', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ ok: false, message: '邮箱格式不正确' });
  }
  const now = Date.now();
  const last = db.prepare(
    'SELECT created_at FROM verification_codes WHERE email = ? AND purpose = ? ORDER BY id DESC LIMIT 1'
  ).get(email, 'register');
  if (last && now - last.created_at < config.codeResendSeconds * 1000) {
    const wait = Math.ceil((config.codeResendSeconds * 1000 - (now - last.created_at)) / 1000);
    return res.status(429).json({ ok: false, message: '发送太频繁，请 ' + wait + ' 秒后重试' });
  }

  const code = genCode();
  const expiresAt = now + config.codeExpireMinutes * 60 * 1000;
  const info = db.prepare(
    'INSERT INTO verification_codes (email, code, purpose, expires_at, used, created_at) VALUES (?,?,?,?,0,?)'
  ).run(email, code, 'register', expiresAt, now);

  // 把此邮箱此用途的旧验证码作废
  db.prepare('UPDATE verification_codes SET used = 1 WHERE email = ? AND purpose = ? AND id != ?')
    .run(email, 'register', Number(info.lastInsertRowid));

  mailer.sendVerificationCode(email, code).then(function() {
    res.json({ ok: true, message: '验证码已发送' });
  }).catch(function() {
    // 发送失败：删掉刚插入的验证码行，用户可立即重试（不占用 60s 冷却窗口）
    try { db.prepare('DELETE FROM verification_codes WHERE id = ?').run(Number(info.lastInsertRowid)); } catch (e) {}
    res.status(500).json({ ok: false, message: '邮件发送失败，请稍后重试（本机已把验证码打印到服务器控制台）' });
  });
});

// 注册
router.post('/register', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const code = String(req.body.code || '').trim();
  const password = String(req.body.password || '');
  const nickname = String(req.body.nickname || '').trim() || email.split('@')[0];

  if (!EMAIL_RE.test(email)) return res.status(400).json({ ok: false, message: '邮箱格式不正确' });
  if (!/^\d{6}$/.test(code)) return res.status(400).json({ ok: false, message: '请输入 6 位数字验证码' });
  if (password.length < 6) return res.status(400).json({ ok: false, message: '密码至少 6 位' });
  if (nickname.length > 20) return res.status(400).json({ ok: false, message: '昵称最长 20 个字符' });

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ ok: false, message: '该邮箱已注册，请直接登录' });

  const record = db.prepare(
    'SELECT id, code, expires_at, used, tries FROM verification_codes WHERE email = ? AND purpose = ? ORDER BY id DESC LIMIT 1'
  ).get(email, 'register');
  if (!record) return res.status(400).json({ ok: false, message: '请先获取验证码' });
  if (record.used) return res.status(400).json({ ok: false, message: '验证码已使用，请重新获取' });
  if (Date.now() > record.expires_at) return res.status(400).json({ ok: false, message: '验证码已过期，请重新获取' });
  if ((record.tries || 0) >= 5) return res.status(400).json({ ok: false, message: '验证码错误次数过多，请重新获取' });
  if (record.code !== code) {
    db.prepare('UPDATE verification_codes SET tries = (tries + 1) WHERE id = ?').run(record.id);
    return res.status(400).json({ ok: false, message: '验证码错误' });
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const info = db.prepare(
    'INSERT INTO users (email, nickname, password_hash, created_at) VALUES (?,?,?,?)'
  ).run(email, nickname, hashPassword(password, salt) + ':' + salt, Date.now());

  // 用户创建成功后才作废验证码（INSERT 失败时不消耗，用户可重试）
  db.prepare('UPDATE verification_codes SET used = 1 WHERE email = ? AND purpose = ?').run(email, 'register');

  const user = { id: Number(info.lastInsertRowid), email, nickname, avatar: null };
  res.json({ ok: true, message: '注册成功', token: makeToken(user), user });
});

// 登录
router.post('/login', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (!EMAIL_RE.test(email)) return res.status(400).json({ ok: false, message: '邮箱格式不正确' });
  if (!password) return res.status(400).json({ ok: false, message: '请输入密码' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.status(400).json({ ok: false, message: '邮箱未注册' });

  const sep = user.password_hash.lastIndexOf(':');
  const storedHash = user.password_hash.slice(0, sep);
  const salt = user.password_hash.slice(sep + 1);
  const inputHash = hashPassword(password, salt);
  if (inputHash !== storedHash) {
    return res.status(400).json({ ok: false, message: '密码错误' });
  }

  res.json({
    ok: true,
    message: '登录成功',
    token: makeToken(user),
    user: { id: user.id, email: user.email, nickname: user.nickname, avatar: user.avatar || null }
  });
});

// 当前登录用户
router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, email, nickname, avatar, created_at FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(401).json({ ok: false, message: '用户不存在' });
  res.json({ ok: true, user: { id: user.id, email: user.email, nickname: user.nickname, avatar: user.avatar || null, created_at: user.created_at } });
});

// 更新头像（avatar 传空字符串 = 清除）
router.post('/avatar', authMiddleware, (req, res) => {
  const avatar = String(req.body.avatar || '');
  if (!avatar) {
    db.prepare('UPDATE users SET avatar = NULL WHERE id = ?').run(req.userId);
    return res.json({ ok: true, message: '已清除头像' });
  }
  if (!AVATAR_RE.test(avatar)) {
    return res.status(400).json({ ok: false, message: '仅支持 PNG/JPEG/WebP/GIF 图片' });
  }
  if (avatar.length > AVATAR_MAX) {
    return res.status(400).json({ ok: false, message: '图片过大，请选择较小的图片' });
  }
  db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(avatar, req.userId);
  res.json({ ok: true, message: '头像已更新' });
});

module.exports = { router, authMiddleware };
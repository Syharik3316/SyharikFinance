const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const { Op } = require('sequelize');

const { User, Achievement, TelegramLinkToken } = require('../models');
const { authMiddleware } = require('../middleware/auth');
const { sendMail } = require('../utils/mailer');
const { isAllowedEmailDomain } = require('../utils/allowedEmailDomains');

const TELEGRAM_LINK_EXPIRES_MS = 10 * 60 * 1000; // 10 min

function generateLinkToken() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

const router = express.Router();

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizeLogin(login) {
  return String(login || '').trim();
}

function generateVerificationCode() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
}

function isDevMode() {
  return String(process.env.NODE_ENV || '').trim().toLowerCase() === 'development';
}

async function sendVerificationCode(user, code) {
  await sendMail({
    to: user.email,
    subject: 'Код подтверждения email',
    text: `Ваш код подтверждения: ${code}\n\nЕсли это были не вы — просто проигнорируйте письмо.`,
  });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', '..', 'uploads', 'avatars'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').slice(0, 10) || '.png';
    const safeExt = ['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(ext.toLowerCase())
      ? ext.toLowerCase()
      : '.png';
    cb(null, `u${req.user.id}-${Date.now()}-${Math.random().toString(16).slice(2)}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
});

router.get('/', authMiddleware, async (req, res) => {
  const user = await User.findByPk(req.user.id, {
    attributes: [
      'id',
      'login',
      'name',
      'email',
      'isVerified',
      'avatarUrl',
      'gems',
      'experience',
      'unlockedScenarios',
      'islandBestDays',
      'telegramId',
      'telegramUsername',
      'createdAt',
    ],
    include: [
      Achievement,
      {
        association: 'Progresses',
        include: [require('../models/scenario')],
      },
    ],
  });
  const json = user.toJSON ? user.toJSON() : user;
  json.telegramLinked = Boolean(json.telegramId);
  delete json.telegramId;
  if (!json.telegramLinked) delete json.telegramUsername;
  res.json(json);
});

router.patch('/', authMiddleware, async (req, res) => {
  try {
    const { name, login, email } = req.body;
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (name != null) {
      const newName = String(name).trim();
      if (newName.length > 12) return res.status(400).json({ message: 'Имя не более 12 символов' });
      user.name = newName;
    }

    if (login != null) {
      const newLogin = normalizeLogin(login);
      if (!newLogin) return res.status(400).json({ message: 'Invalid login' });
      if (newLogin.length > 16) return res.status(400).json({ message: 'Логин не более 16 символов' });
      const existing = await User.findOne({
        where: {
          login: newLogin,
          id: { [Op.ne]: user.id },
        },
      });
      if (existing) return res.status(409).json({ message: 'Login already taken' });
      user.login = newLogin;
    }

    let emailChanged = false;
    if (email != null) {
      const newEmail = normalizeEmail(email);
      if (!newEmail.includes('@')) return res.status(400).json({ message: 'Invalid email' });
      if (!isAllowedEmailDomain(newEmail)) {
        return res.status(400).json({
          message: 'Допускается только почта Gmail, Mail.ru, Yandex, Outlook и других распространённых сервисов.',
        });
      }
      const existing = await User.findOne({
        where: {
          email: newEmail,
          id: { [Op.ne]: user.id },
        },
      });
      if (existing) return res.status(409).json({ message: 'Email already taken' });
      if (newEmail !== user.email) {
        user.email = newEmail;
        user.isVerified = false;
        emailChanged = true;
      }
    }

    if (emailChanged) {
      const code = generateVerificationCode();
      user.verificationCodeHash = await bcrypt.hash(code, 10);
      user.verificationCodeExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
      await user.save();
      try {
        await sendVerificationCode(user, code);
      } catch (mailErr) {
        console.error('[ME] Failed to send verification email:', mailErr.message);
        return res.status(502).json({
          message: mailErr.message || 'Не удалось отправить письмо с кодом. Попробуйте позже.',
        });
      }
      return res.json({
        message: 'Profile updated. Email changed — verification code sent.',
        email: user.email,
        devCode: isDevMode() ? code : undefined,
      });
    }

    await user.save();
    res.json({ message: 'Profile updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

router.post('/password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'currentPassword and newPassword are required' });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 chars' });
    }

    const user = await User.findByPk(req.user.id);
    const ok = await bcrypt.compare(String(currentPassword), user.passwordHash);
    if (!ok) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    user.passwordHash = await bcrypt.hash(String(newPassword), 10);
    await user.save();
    res.json({ message: 'Password updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to change password' });
  }
});

router.post('/avatar', authMiddleware, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'avatar is required' });

    const user = await User.findByPk(req.user.id);
    user.avatarUrl = `/api/uploads/avatars/${req.file.filename}`;
    await user.save();

    res.json({ message: 'Avatar updated', avatarUrl: user.avatarUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to upload avatar' });
  }
});

// POST /api/me/telegram-link — выдать одноразовый код для привязки Telegram (только для авторизованного пользователя)
router.post('/telegram-link', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const linkCode = generateLinkToken();
    const expiresAt = new Date(Date.now() + TELEGRAM_LINK_EXPIRES_MS);

    await TelegramLinkToken.create({
      token: linkCode,
      userId: user.id,
      expiresAt,
    });

    res.json({
      linkCode,
      expiresIn: Math.floor(TELEGRAM_LINK_EXPIRES_MS / 1000),
      message: 'Send /link <code> to the bot within 10 minutes',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to generate link code' });
  }
});

// POST /api/me/telegram-unlink — отвязать Telegram от аккаунта
router.post('/telegram-unlink', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.telegramId = null;
    user.telegramUsername = null;
    await user.save();

    res.json({ message: 'Telegram unlinked' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to unlink Telegram' });
  }
});

// POST /api/me/gems удалён: начисление только на бэкенде (сценарии — /api/runs/finish, Остров — при сохранении /api/island-game).
router.post('/gems', authMiddleware, (req, res) => {
  res.status(410).json({ message: 'Earn gems by completing scenarios or playing the Island game. little cheater.' });
});

module.exports = router;


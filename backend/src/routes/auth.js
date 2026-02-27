const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { User } = require('../models');
const { sendMail } = require('../utils/mailer');
const { isAllowedEmailDomain } = require('../utils/allowedEmailDomains');

const router = express.Router();

function requireJwtSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required in .env');
  }
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizeLogin(login) {
  return String(login || '').trim();
}

function generateVerificationCode() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
}

/** true, если в .env указан NODE_ENV=development (регистр и пробелы не важны) — тогда код показывается в UI. */
function isDevMode() {
  return String(process.env.NODE_ENV || '').trim().toLowerCase() === 'development';
}

async function sendVerificationCode(email, code) {
  await sendMail({
    to: email,
    subject: 'Код подтверждения аккаунта',
    text: `Ваш код подтверждения: ${code}\n\nЕсли это были не вы — просто проигнорируйте письмо.`,
  });
}

router.post('/register', async (req, res) => {
  try {
    const { login, name, email, password } = req.body;

    const normalizedEmail = normalizeEmail(email);
    const normalizedLogin = normalizeLogin(login);

    if (!normalizedLogin || !name || !normalizedEmail || !password) {
      return res.status(400).json({
        message: 'login, name, email, password are required',
      });
    }

    const trimmedName = String(name).trim();
    if (!trimmedName) {
      return res.status(400).json({ message: 'Имя обязательно' });
    }
    if (trimmedName.length > 12) {
      return res.status(400).json({ message: 'Имя не более 12 символов' });
    }
    if (normalizedLogin.length > 16) {
      return res.status(400).json({ message: 'Логин не более 16 символов' });
    }

    if (!normalizedEmail.includes('@')) {
      return res.status(400).json({ message: 'Invalid email' });
    }
    if (!isAllowedEmailDomain(normalizedEmail)) {
      return res.status(400).json({
        message: 'Регистрация возможна только с почты Gmail, Mail.ru, Yandex, Outlook и других распространённых сервисов. Укажите email на разрешённом домене.',
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 chars' });
    }

    const existing = await User.findOne({
      where: {
        [Op.or]: [{ login: normalizedLogin }, { email: normalizedEmail }],
      },
    });

    if (existing) {
      return res.status(409).json({ message: 'User with this login/email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const code = generateVerificationCode();
    const verificationCodeHash = await bcrypt.hash(code, 10);
    const verificationCodeExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    // Сначала отправляем письмо — только потом создаём пользователя (если SMTP упадёт, пользователь не создастся)
    try {
      await sendVerificationCode(normalizedEmail, code);
    } catch (mailErr) {
      console.error('[AUTH] Failed to send verification email:', mailErr.message);
      const status = mailErr.code === 'EAUTH' ? 503 : 502;
      return res.status(status).json({
        message: mailErr.message || 'Не удалось отправить письмо с кодом. Проверьте адрес почты или попробуйте позже.',
      });
    }

    const user = await User.create({
      login: normalizedLogin,
      name: trimmedName,
      email: normalizedEmail,
      passwordHash,
      isVerified: false,
      verificationCodeHash,
      verificationCodeExpiresAt,
      characterKey: 'katya',
    });

    res.status(201).json({
      message: 'Registered. Check your email for verification code.',
      email: normalizedEmail,
      // В прототипе удобно видеть код без SMTP:
      devCode: isDevMode() ? code : undefined,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to register' });
  }
});

router.post('/verify', async (req, res) => {
  try {
    const { email, code } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !code) {
      return res.status(400).json({ message: 'email and code are required' });
    }

    const user = await User.findOne({ where: { email: normalizedEmail } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isVerified) {
      return res.json({ message: 'Already verified' });
    }

    if (!user.verificationCodeHash || !user.verificationCodeExpiresAt) {
      return res.status(400).json({ message: 'No active verification code' });
    }

    if (new Date(user.verificationCodeExpiresAt).getTime() < Date.now()) {
      return res.status(400).json({ message: 'Verification code expired' });
    }

    const ok = await bcrypt.compare(String(code), user.verificationCodeHash);
    if (!ok) {
      return res.status(400).json({ message: 'Invalid code' });
    }

    user.isVerified = true;
    user.verificationCodeHash = null;
    user.verificationCodeExpiresAt = null;
    await user.save();

    res.json({ message: 'Verified' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to verify' });
  }
});

router.post('/login', async (req, res) => {
  try {
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not set in environment');
      return res.status(500).json({
        message: 'Сервер не настроен: отсутствует JWT_SECRET. Добавьте переменную окружения на сервере.',
      });
    }

    const { loginOrEmail, password } = req.body;
    const identifier = String(loginOrEmail || '').trim();

    if (!identifier || !password) {
      return res.status(400).json({ message: 'loginOrEmail and password are required' });
    }

    const user = await User.findOne({
      where: {
        [Op.or]: [{ login: identifier }, { email: normalizeEmail(identifier) }],
      },
    });

    if (!user) {
      return res.status(400).json({ message: 'Неверный логин или пароль' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ message: 'Email is not verified' });
    }

    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) {
      return res.status(400).json({ message: 'Неверный логин или пароль' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.json({
      token,
      user: {
        id: user.id,
        login: user.login,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({
      message: err.message || 'Failed to login',
      ...(isDevMode() && { detail: err.stack }),
    });
  }
});

router.post('/resend-code', async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      return res.status(400).json({ message: 'email is required' });
    }

    const user = await User.findOne({ where: { email: normalizedEmail } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isVerified) {
      return res.json({ message: 'Already verified' });
    }

    const code = generateVerificationCode();
    user.verificationCodeHash = await bcrypt.hash(code, 10);
    user.verificationCodeExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    try {
      await sendVerificationCode(user.email, code);
    } catch (mailErr) {
      console.error('[AUTH] Failed to resend verification email:', mailErr.message);
      return res.status(502).json({
        message: mailErr.message || 'Не удалось отправить письмо. Попробуйте позже.',
      });
    }

    res.json({
      message: 'Verification code resent',
      devCode: isDevMode() ? code : undefined,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to resend code' });
  }
});

module.exports = router;


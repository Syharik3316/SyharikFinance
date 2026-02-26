const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { User } = require('../models');
const { sendMail } = require('../utils/mailer');

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

async function sendVerificationCode(user, code) {
  await sendMail({
    to: user.email,
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
    if (trimmedName.length > 10) {
      return res.status(400).json({ message: 'Имя не более 10 символов' });
    }
    if (normalizedLogin.length > 10) {
      return res.status(400).json({ message: 'Логин не более 10 символов' });
    }

    if (!normalizedEmail.includes('@')) {
      return res.status(400).json({ message: 'Invalid email' });
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

    await sendVerificationCode(user, code);

    res.status(201).json({
      message: 'Registered. Check your email for verification code.',
      email: user.email,
      // В прототипе удобно видеть код без SMTP:
      devCode: process.env.NODE_ENV === 'development' ? code : undefined,
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
      ...(process.env.NODE_ENV === 'development' && { detail: err.stack }),
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

    await sendVerificationCode(user, code);

    res.json({
      message: 'Verification code resent',
      devCode: process.env.NODE_ENV === 'development' ? code : undefined,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to resend code' });
  }
});

module.exports = router;


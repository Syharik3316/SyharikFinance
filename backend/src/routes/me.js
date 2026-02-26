const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const { Op } = require('sequelize');

const { User, Achievement } = require('../models');
const { authMiddleware } = require('../middleware/auth');
const { sendMail } = require('../utils/mailer');

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
  res.json(user);
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
      if (newName.length > 10) return res.status(400).json({ message: 'Имя не более 10 символов' });
      user.name = newName;
    }

    if (login != null) {
      const newLogin = normalizeLogin(login);
      if (!newLogin) return res.status(400).json({ message: 'Invalid login' });
      if (newLogin.length > 10) return res.status(400).json({ message: 'Логин не более 10 символов' });
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
      await sendVerificationCode(user, code);
      return res.json({
        message: 'Profile updated. Email changed — verification code sent.',
        email: user.email,
        devCode: process.env.NODE_ENV === 'development' ? code : undefined,
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

// POST /api/me/gems — начислить алмазы (например, за дни в мини-игре «Остров»)
router.post('/gems', authMiddleware, async (req, res) => {
  try {
    const amount = Math.max(0, Math.floor(Number(req.body?.amount) || 0));
    if (amount <= 0) return res.status(400).json({ message: 'amount must be a positive number' });

    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.gems = Math.max(0, Math.round((user.gems || 0) + amount));
    await user.save();

    res.json({ gems: user.gems });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to add gems' });
  }
});

module.exports = router;


const express = require('express');
const { Op } = require('sequelize');
const { User, TelegramLinkToken } = require('../models');

const router = express.Router();

/**
 * POST /api/telegram/link
 * Called by the Telegram bot when user sends /link <code>.
 * Body: { linkToken, telegramId, telegramUsername? }
 * Binds the Telegram account to the user who generated the token.
 */
router.post('/link', async (req, res) => {
  try {
    const { linkToken, telegramId, telegramUsername } = req.body;
    const rawToken = String(linkToken || '').trim().toUpperCase();
    const tgId = telegramId != null ? String(telegramId) : '';

    if (!rawToken || !tgId) {
      return res.status(400).json({
        ok: false,
        message: 'linkToken and telegramId are required',
      });
    }

    const row = await TelegramLinkToken.findOne({
      where: {
        token: rawToken,
        expiresAt: { [Op.gt]: new Date() },
      },
    });

    if (!row) {
      return res.status(400).json({
        ok: false,
        message: 'Invalid or expired code. Get a new code in your profile on the website.',
      });
    }

    const user = await User.findByPk(row.userId);
    if (!user) {
      await row.destroy();
      return res.status(400).json({ ok: false, message: 'User not found' });
    }

    const existingByTg = await User.findOne({ where: { telegramId: tgId } });
    if (existingByTg && existingByTg.id !== user.id) {
      return res.status(409).json({
        ok: false,
        message: 'This Telegram is already linked to another account.',
      });
    }

    user.telegramId = tgId;
    user.telegramUsername = telegramUsername ? String(telegramUsername).replace(/^@/, '').slice(0, 64) : null;
    await user.save();
    await row.destroy();

    res.json({
      ok: true,
      message: 'Telegram linked successfully',
      userName: user.name,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Server error' });
  }
});

module.exports = router;

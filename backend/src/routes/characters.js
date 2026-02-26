const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { User } = require('../models');

const router = express.Router();

const CHAR_COST = 50;

router.post('/unlock', authMiddleware, async (req, res) => {
  try {
    const { characterKey } = req.body;
    if (!['katya', 'ilya'].includes(characterKey)) {
      return res.status(400).json({ message: 'Can only unlock katya or ilya' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (characterKey === 'katya' && user.unlockedKatya) {
      return res.json({ message: 'Already unlocked', gems: user.gems });
    }
    if (characterKey === 'ilya' && user.unlockedIlya) {
      return res.json({ message: 'Already unlocked', gems: user.gems });
    }

    if ((user.gems || 0) < CHAR_COST) {
      return res.status(400).json({ message: 'Not enough gems' });
    }

    user.gems = Math.max(0, Math.round((user.gems || 0) - CHAR_COST));
    if (characterKey === 'katya') user.unlockedKatya = true;
    if (characterKey === 'ilya') user.unlockedIlya = true;
    await user.save();

    res.json({
      message: 'Character unlocked',
      gems: user.gems,
      unlockedKatya: user.unlockedKatya,
      unlockedIlya: user.unlockedIlya,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to unlock character' });
  }
});

module.exports = router;


const express = require('express');
const { User } = require('../models');

const router = express.Router();

const TOP_LIMIT = 20;

function levelFromExperience(exp) {
  return Math.floor((exp || 0) / 100) + 1;
}

// GET /api/leaderboard?by=experience | by=gems
router.get('/', async (req, res) => {
  try {
    const by = (req.query.by || 'experience').toLowerCase();
    const orderColumn = by === 'gems' ? 'gems' : 'experience';
    if (orderColumn !== 'gems' && orderColumn !== 'experience') {
      return res.status(400).json({ message: 'Invalid by: use experience or gems' });
    }

    const users = await User.findAll({
      attributes: ['id', 'login', 'name', 'avatarUrl', 'gems', 'experience'],
      order: [[orderColumn, 'DESC']],
      limit: TOP_LIMIT,
    });

    const list = users.map((u) => ({
      id: u.id,
      name: u.name,
      login: u.login,
      avatarUrl: u.avatarUrl,
      gems: Math.round(u.gems || 0),
      experience: u.experience || 0,
      level: levelFromExperience(u.experience),
    }));

    res.json({ by: orderColumn, list });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch leaderboard' });
  }
});

module.exports = router;

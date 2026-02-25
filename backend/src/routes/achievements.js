const express = require('express');
const { Achievement, User } = require('../models');

const router = express.Router();

// Get all achievements (optionally for specific user)
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;

    if (userId) {
      const user = await User.findByPk(userId, {
        include: [Achievement],
      });

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      return res.json(user.Achievements || []);
    }

    const all = await Achievement.findAll();
    res.json(all);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch achievements' });
  }
});

module.exports = router;

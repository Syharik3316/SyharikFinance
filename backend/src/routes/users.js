const express = require('express');
const { User, Progress, Scenario, Achievement } = require('../models');

const router = express.Router();

// Create user
router.post('/', async (req, res) => {
  try {
    const { name, age, characterKey } = req.body;

    if (!name || !characterKey) {
      return res.status(400).json({ message: 'name and characterKey are required' });
    }

    const user = await User.create({ name, age, characterKey });
    res.status(201).json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create user' });
  }
});

// Get user progress summary
router.get('/:id/progress', async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findByPk(userId, {
      include: [
        {
          model: Progress,
          include: [Scenario],
        },
        {
          model: Achievement,
        },
      ],
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch user progress' });
  }
});

module.exports = router;

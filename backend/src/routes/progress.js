const express = require('express');
const { Progress, Scenario, User } = require('../models');
const { Op } = require('sequelize');

const router = express.Router();

// Start scenario attempt (optional for frontend, but useful to track)
router.post('/start', async (req, res) => {
  try {
    const { userId, scenarioCode } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const scenario = await Scenario.findOne({ where: { code: scenarioCode } });
    if (!scenario) {
      return res.status(404).json({ message: 'Scenario not found' });
    }

    const progress = await Progress.create({
      userId: user.id,
      scenarioId: scenario.id,
      status: 'in_progress',
      lastAttemptAt: new Date(),
    });

    res.status(201).json(progress);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to start progress' });
  }
});

// Finish scenario and save summary
router.post('/finish', async (req, res) => {
  try {
    const {
      userId,
      scenarioCode,
      status, // 'passed' | 'failed'
      finalBudget,
      earned = 0,
      spent = 0,
    } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const scenario = await Scenario.findOne({ where: { code: scenarioCode } });
    if (!scenario) {
      return res.status(404).json({ message: 'Scenario not found' });
    }

    let progress = await Progress.findOne({
      where: {
        userId: user.id,
        scenarioId: scenario.id,
      },
    });

    if (!progress) {
      progress = await Progress.create({
        userId: user.id,
        scenarioId: scenario.id,
        status: status || 'failed',
        bestResult: finalBudget,
        earned,
        spent,
        lastAttemptAt: new Date(),
      });
    } else {
      progress.status = status || progress.status;
      progress.bestResult =
        progress.bestResult != null
          ? Math.max(progress.bestResult, finalBudget)
          : finalBudget;
      progress.earned += earned;
      progress.spent += spent;
      progress.lastAttemptAt = new Date();
      await progress.save();
    }

    res.json(progress);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to finish progress' });
  }
});

module.exports = router;

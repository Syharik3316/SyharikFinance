const express = require('express');
const { Scenario, ScenarioEvent, ScenarioChoice, User } = require('../models');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const UNLOCK_COST_GEMS = 25;

// POST /api/scenarios/unlock — купить доступ к сценарию за 25 алмазов (первые 2 по порядку бесплатны)
router.post('/unlock', authMiddleware, async (req, res) => {
  try {
    const { scenarioCode } = req.body;
    if (!scenarioCode) {
      return res.status(400).json({ message: 'scenarioCode is required' });
    }

    const scenarios = await Scenario.findAll({ order: [['id', 'ASC']] });
    const scenarioIndex = scenarios.findIndex((s) => s.code === scenarioCode);
    if (scenarioIndex < 0) {
      return res.status(404).json({ message: 'Scenario not found' });
    }
    if (scenarioIndex < 2) {
      return res.status(400).json({ message: 'First two scenarios are free' });
    }

    const user = await User.findByPk(req.user.id);
    const unlocked = Array.isArray(user.unlockedScenarios) ? user.unlockedScenarios : [];
    if (unlocked.includes(scenarioCode)) {
      return res.json({ message: 'Already unlocked', gems: user.gems, unlockedScenarios: unlocked });
    }

    const gems = Math.max(0, Number(user.gems) || 0);
    if (gems < UNLOCK_COST_GEMS) {
      return res.status(400).json({ message: 'Not enough gems', required: UNLOCK_COST_GEMS });
    }

    user.gems = Math.max(0, gems - UNLOCK_COST_GEMS);
    user.unlockedScenarios = [...unlocked, scenarioCode];
    await user.save();

    res.json({
      message: 'Scenario unlocked',
      gems: user.gems,
      unlockedScenarios: user.unlockedScenarios,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to unlock scenario' });
  }
});

// List all scenarios
router.get('/', async (req, res) => {
  try {
    const scenarios = await Scenario.findAll();
    res.json(scenarios);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch scenarios' });
  }
});

// Get scenario by code
router.get('/:code', async (req, res) => {
  try {
    const scenario = await Scenario.findOne({
      where: { code: req.params.code },
    });

    if (!scenario) {
      return res.status(404).json({ message: 'Scenario not found' });
    }

    res.json(scenario);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch scenario' });
  }
});

// Get events + choices for a scenario (for scenario 1 mainly)
router.get('/:code/events', async (req, res) => {
  try {
    const scenario = await Scenario.findOne({
      where: { code: req.params.code },
    });

    if (!scenario) {
      return res.status(404).json({ message: 'Scenario not found' });
    }

    const events = await ScenarioEvent.findAll({
      where: { scenarioId: scenario.id },
      order: [['dayIndex', 'ASC']],
      include: [ScenarioChoice],
    });

    res.json({
      scenario,
      events,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch scenario events' });
  }
});

module.exports = router;

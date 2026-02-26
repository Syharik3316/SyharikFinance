const express = require('express');
const { Op } = require('sequelize');

const { authMiddleware } = require('../middleware/auth');
const { User, Scenario, ScenarioRun, Progress, Achievement } = require('../models');

const router = express.Router();

async function getScenarioOr404(code, res) {
  const scenario = await Scenario.findOne({ where: { code } });
  if (!scenario) {
    res.status(404).json({ message: 'Scenario not found' });
    return null;
  }
  return scenario;
}

async function upsertProgress({ userId, scenarioId, status, finalBudget, earned = 0, spent = 0 }) {
  let progress = await Progress.findOne({ where: { userId, scenarioId } });

  if (!progress) {
    progress = await Progress.create({
      userId,
      scenarioId,
      status,
      bestResult: finalBudget,
      earned,
      spent,
      lastAttemptAt: new Date(),
    });
    return progress;
  }

  progress.status = status || progress.status;
  progress.bestResult =
    progress.bestResult != null ? Math.max(progress.bestResult, finalBudget) : finalBudget;
  progress.earned += earned;
  progress.spent += spent;
  progress.lastAttemptAt = new Date();
  await progress.save();
  return progress;
}

async function awardAchievementIfNeeded(user, code) {
  const achievement = await Achievement.findOne({ where: { code } });
  if (!achievement) return;

  // Check already awarded
  const existing = await user.getAchievements({
    where: { id: achievement.id },
    joinTableAttributes: [],
  });
  if (existing && existing.length > 0) return;

  await user.addAchievement(achievement);
}

// Get active run for scenario (or null)
router.get('/:scenarioCode', authMiddleware, async (req, res) => {
  try {
    const scenario = await getScenarioOr404(req.params.scenarioCode, res);
    if (!scenario) return;

    const run = await ScenarioRun.findOne({
      where: {
        userId: req.user.id,
        scenarioId: scenario.id,
        status: 'active',
      },
    });

    res.json(run || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch run' });
  }
});

// Start (or return existing) run
router.post('/start', authMiddleware, async (req, res) => {
  try {
    const { scenarioCode } = req.body;
    const scenario = await getScenarioOr404(scenarioCode, res);
    if (!scenario) return;

    const existing = await ScenarioRun.findOne({
      where: {
        userId: req.user.id,
        scenarioId: scenario.id,
        status: 'active',
      },
    });
    if (existing) return res.json(existing);

    const run = await ScenarioRun.create({
      userId: req.user.id,
      scenarioId: scenario.id,
      status: 'active',
      dayIndex: 0,
      budget: scenario.baseBudget,
      earned: 0,
      spent: 0,
      state: null,
    });

    res.status(201).json(run);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to start run' });
  }
});

// Save run state (autopersist on exit / between steps)
router.post('/save', authMiddleware, async (req, res) => {
  try {
    const { scenarioCode, dayIndex, budget, earned, spent, state } = req.body;
    const scenario = await getScenarioOr404(scenarioCode, res);
    if (!scenario) return;

    const run = await ScenarioRun.findOne({
      where: {
        userId: req.user.id,
        scenarioId: scenario.id,
        status: 'active',
      },
    });

    const round = (n) => (Number.isFinite(n) ? Math.round(n) : n);
    if (!run) {
      const created = await ScenarioRun.create({
        userId: req.user.id,
        scenarioId: scenario.id,
        status: 'active',
        dayIndex: Number.isFinite(dayIndex) ? dayIndex : 0,
        budget: round(Number.isFinite(budget) ? budget : scenario.baseBudget),
        earned: round(Number.isFinite(earned) ? earned : 0),
        spent: round(Number.isFinite(spent) ? spent : 0),
        state: state ?? null,
      });
      return res.status(201).json(created);
    }

    run.dayIndex = Number.isFinite(dayIndex) ? dayIndex : run.dayIndex;
    run.budget = round(Number.isFinite(budget) ? budget : run.budget);
    run.earned = round(Number.isFinite(earned) ? earned : run.earned);
    run.spent = round(Number.isFinite(spent) ? spent : run.spent);
    run.state = state ?? run.state;
    await run.save();

    res.json(run);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to save run' });
  }
});

// Finish run -> write Progress + award achievements + close run
router.post('/finish', authMiddleware, async (req, res) => {
  try {
    const { scenarioCode, status, finalBudget, earned = 0, spent = 0 } = req.body;
    const scenario = await getScenarioOr404(scenarioCode, res);
    if (!scenario) return;

    const user = await User.findByPk(req.user.id);
    const existingProgress = await Progress.findOne({
      where: { userId: user.id, scenarioId: scenario.id },
    });
    const firstPass = !existingProgress || existingProgress.status !== 'passed';

    const progress = await upsertProgress({
      userId: user.id,
      scenarioId: scenario.id,
      status,
      finalBudget,
      earned,
      spent,
    });

    const run = await ScenarioRun.findOne({
      where: {
        userId: user.id,
        scenarioId: scenario.id,
        status: 'active',
      },
    });
    const round = (n) => (Number.isFinite(n) ? Math.round(n) : n);
    if (run) {
      run.status = 'finished';
      run.dayIndex = scenario.maxDays ? scenario.maxDays : run.dayIndex;
      run.budget = round(Number.isFinite(finalBudget) ? finalBudget : run.budget);
      run.earned = round(Number.isFinite(earned) ? earned : run.earned);
      run.spent = round(Number.isFinite(spent) ? spent : run.spent);
      await run.save();
    }

    // Award achievements (prototype rules)
    if (scenario.code === 'bike_dream' && status === 'passed') {
      if (Number(spent) === 0 && Number(finalBudget) >= Number(scenario.goal || 5000)) {
        await awardAchievementIfNeeded(user, 'bike_no_spend');
      }
    }

    if (scenario.code === 'money_quiz' && status === 'passed') {
      await awardAchievementIfNeeded(user, 'quiz_master');
    }

    if (scenario.code === 'investment_race') {
      await awardAchievementIfNeeded(user, 'investment_champion');
    }

    if (scenario.code === 'lemonade_business' && status === 'passed') {
      await awardAchievementIfNeeded(user, 'lemonade_champion');
    }

    // XP: +50 за каждое первое прохождение сценария
    if (status === 'passed' && firstPass) {
      user.experience = (user.experience || 0) + 50;
    }

    // Алмазы: только за первое прохождение; за тест — только при результате от 80%
    if (status === 'passed' && firstPass) {
      const quizPass = scenario.code === 'money_quiz' && Number(finalBudget) >= 80;
      const nonQuizPass = scenario.code !== 'money_quiz';
      if (quizPass || nonQuizPass) {
        user.gems = Math.round((user.gems || 0) + 25);
      }
    }

    if (user.changed()) await user.save();

    res.json({ progress, runClosed: Boolean(run) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to finish run' });
  }
});

// Optionally restart (delete active run)
router.post('/restart', authMiddleware, async (req, res) => {
  try {
    const { scenarioCode } = req.body;
    const scenario = await getScenarioOr404(scenarioCode, res);
    if (!scenario) return;

    await ScenarioRun.destroy({
      where: {
        userId: req.user.id,
        scenarioId: scenario.id,
        status: 'active',
      },
    });

    const run = await ScenarioRun.create({
      userId: req.user.id,
      scenarioId: scenario.id,
      status: 'active',
      dayIndex: 0,
      budget: scenario.baseBudget,
      earned: 0,
      spent: 0,
      state: null,
    });

    res.status(201).json(run);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to restart run' });
  }
});

module.exports = router;


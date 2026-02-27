const express = require('express');
const { Op } = require('sequelize');

const { authMiddleware } = require('../middleware/auth');
const { sequelize, User, Scenario, ScenarioRun, Progress, Achievement } = require('../models');

const router = express.Router();

/** Минимальный dayIndex (0-based), при котором сценарий считается реально пройденным. Защита от finish без игры. */
function getMinDayIndexToComplete(scenario) {
  const code = scenario?.code;
  if (code === 'bike_dream') return (scenario.maxDays || 30) - 1;
  if (code === 'money_quiz') return 24; // 25 вопросов
  if (code === 'lemonade_business') return (scenario.maxDays || 30) - 1;
  if (code === 'investment_race') return (scenario.maxDays || 20) - 1;
  return 0;
}

async function getScenarioOr404(code, res) {
  const scenario = await Scenario.findOne({ where: { code } });
  if (!scenario) {
    res.status(404).json({ message: 'Scenario not found' });
    return null;
  }
  return scenario;
}

async function upsertProgress({ userId, scenarioId, status, finalBudget, earned = 0, spent = 0 }, transaction = null) {
  const opts = transaction ? { transaction } : {};
  let progress = await Progress.findOne({ where: { userId, scenarioId }, ...opts });

  if (!progress) {
    progress = await Progress.create({
      userId,
      scenarioId,
      status,
      bestResult: finalBudget,
      earned,
      spent,
      lastAttemptAt: new Date(),
    }, opts);
    return progress;
  }

  progress.status = status || progress.status;
  progress.bestResult =
    progress.bestResult != null ? Math.max(progress.bestResult, finalBudget) : finalBudget;
  progress.earned += earned;
  progress.spent += spent;
  progress.lastAttemptAt = new Date();
  await progress.save(opts);
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
// Защита: только при наличии активного run; награды только за реальное прохождение (dayIndex до конца) и только один раз (firstPass в транзакции).
router.post('/finish', authMiddleware, async (req, res) => {
  try {
    const { scenarioCode, status, finalBudget, earned = 0, spent = 0 } = req.body;
    const scenario = await getScenarioOr404(scenarioCode, res);
    if (!scenario) return;

    const run = await ScenarioRun.findOne({
      where: {
        userId: req.user.id,
        scenarioId: scenario.id,
        status: 'active',
      },
    });

    if (!run) {
      return res.status(400).json({ message: 'No active run to finish. Start or continue the scenario first.' });
    }

    const minDay = getMinDayIndexToComplete(scenario);
    const runCompleted = Number(run.dayIndex) >= minDay;
    const round = (n) => (Number.isFinite(n) ? Math.round(n) : n);

    const user = await User.findByPk(req.user.id);

    const t = await sequelize.transaction();
    try {
      const progressRow = await Progress.findOne({
        where: { userId: user.id, scenarioId: scenario.id },
        lock: t.LOCK.UPDATE,
        transaction: t,
      });
      const firstPass = !progressRow || progressRow.status !== 'passed';

      await upsertProgress({
        userId: user.id,
        scenarioId: scenario.id,
        status,
        finalBudget,
        earned,
        spent,
      }, t);

      const shouldAward = status === 'passed' && firstPass && runCompleted;
      if (shouldAward) {
        const quizPass = scenario.code === 'money_quiz' && Number(finalBudget) >= 80;
        const nonQuizPass = scenario.code !== 'money_quiz';
        if (quizPass || nonQuizPass) {
          user.experience = (user.experience || 0) + 50;
          user.gems = Math.round((user.gems || 0) + 25);
          await user.save({ transaction: t });
        }
      }

      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }

    run.status = 'finished';
    run.dayIndex = scenario.maxDays != null ? scenario.maxDays : run.dayIndex;
    run.budget = round(Number.isFinite(finalBudget) ? finalBudget : run.budget);
    run.earned = round(Number.isFinite(earned) ? earned : run.earned);
    run.spent = round(Number.isFinite(spent) ? spent : run.spent);
    await run.save();

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

    const progress = await Progress.findOne({ where: { userId: user.id, scenarioId: scenario.id } });
    res.json({ progress, runClosed: true });
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


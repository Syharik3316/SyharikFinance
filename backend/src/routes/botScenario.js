/**
 * API для прохождения сценариев из Telegram-бота.
 * GET /step — текущий шаг; POST /choice — сделать выбор и получить следующий шаг или итог.
 */
const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { Scenario, ScenarioRun, Progress, User, Achievement } = require('../models');
const { PLAYABLE_CODES, getStepContent, applyChoice } = require('../data/botScenarios');

const router = express.Router();

async function getScenarioByCode(code, res) {
  const scenario = await Scenario.findOne({ where: { code } });
  if (!scenario) {
    res.status(404).json({ message: 'Scenario not found' });
    return null;
  }
  return scenario;
}

async function finishRunAndProgress(userId, scenario, payload) {
  const { status, finalBudget, earned = 0, spent = 0 } = payload;
  let progress = await Progress.findOne({ where: { userId, scenarioId: scenario.id } });
  if (!progress) {
    progress = await Progress.create({
      userId,
      scenarioId: scenario.id,
      status,
      bestResult: finalBudget,
      earned,
      spent,
      lastAttemptAt: new Date(),
    });
  } else {
    progress.status = status || progress.status;
    progress.bestResult = progress.bestResult != null ? Math.max(progress.bestResult, finalBudget) : finalBudget;
    progress.earned += earned;
    progress.spent += spent;
    progress.lastAttemptAt = new Date();
    await progress.save();
  }

  const run = await ScenarioRun.findOne({
    where: { userId, scenarioId: scenario.id, status: 'active' },
  });
  if (run) {
    run.status = 'finished';
    run.budget = Math.round(Number.isFinite(finalBudget) ? finalBudget : run.budget);
    run.earned = Math.round(earned);
    run.spent = Math.round(spent);
    run.dayIndex = scenario.maxDays || run.dayIndex;
    await run.save();
  }

  const user = await User.findByPk(userId);
  if (scenario.code === 'bike_dream' && status === 'passed') {
    const achievement = await Achievement.findOne({ where: { code: 'bike_no_spend' } });
    if (achievement) {
      const has = await user.getAchievements({ where: { id: achievement.id }, joinTableAttributes: [] });
      if (!has.length) await user.addAchievement(achievement);
    }
  }
  if (scenario.code === 'money_quiz' && status === 'passed') {
    const achievement = await Achievement.findOne({ where: { code: 'quiz_master' } });
    if (achievement) {
      const has = await user.getAchievements({ where: { id: achievement.id }, joinTableAttributes: [] });
      if (!has.length) await user.addAchievement(achievement);
    }
  }
  const firstPass = !progress || progress.status !== 'passed';
  if (status === 'passed' && firstPass) {
    user.experience = (user.experience || 0) + 50;
    const quizPass = scenario.code === 'money_quiz' && Number(finalBudget) >= 80;
    const nonQuiz = scenario.code !== 'money_quiz';
    if (quizPass || nonQuiz) user.gems = Math.round((user.gems || 0) + 25);
    if (user.changed()) await user.save();
  }
}

// GET /api/bot-scenario/playable — список кодов сценариев, которые можно проходить в боте
router.get('/playable', authMiddleware, (req, res) => {
  res.json({ codes: PLAYABLE_CODES });
});

// GET /api/bot-scenario/:code/step — текущий шаг сценария (нужен активный run)
router.get('/:code/step', authMiddleware, async (req, res) => {
  try {
    const { code } = req.params;
    if (!PLAYABLE_CODES.includes(code)) {
      return res.status(400).json({ message: 'This scenario is not playable in the bot' });
    }
    const scenario = await getScenarioByCode(code, res);
    if (!scenario) return;

    const run = await ScenarioRun.findOne({
      where: {
        userId: req.user.id,
        scenarioId: scenario.id,
        status: 'active',
      },
    });

    if (!run) {
      return res.json({ noRun: true, scenarioCode: code, title: scenario.title });
    }

    const step = getStepContent(code, run);
    if (!step) {
      return res.json({ isFinished: true, scenarioCode: code, title: scenario.title });
    }

    res.json(step);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to get step' });
  }
});

// POST /api/bot-scenario/:code/choice — сделать выбор (choiceIndex 0-based)
router.post('/:code/choice', authMiddleware, async (req, res) => {
  try {
    const { code } = req.params;
    const choiceIndex = Number(req.body.choiceIndex);
    if (!PLAYABLE_CODES.includes(code)) {
      return res.status(400).json({ message: 'This scenario is not playable in the bot' });
    }
    if (!Number.isFinite(choiceIndex) || choiceIndex < 0) {
      return res.status(400).json({ message: 'choiceIndex is required and must be >= 0' });
    }

    const scenario = await getScenarioByCode(code, res);
    if (!scenario) return;

    const run = await ScenarioRun.findOne({
      where: {
        userId: req.user.id,
        scenarioId: scenario.id,
        status: 'active',
      },
    });

    if (!run) {
      return res.status(400).json({ message: 'No active run. Start the scenario first.' });
    }

    const state = run.state && typeof run.state === 'object' ? run.state : {};
    const result = applyChoice(code, run, choiceIndex, state);
    if (!result) {
      return res.status(400).json({ message: 'Invalid choice' });
    }

    const round = (n) => (Number.isFinite(n) ? Math.round(n) : n);

    if (result.isFinished) {
      if (code === 'bike_dream') {
        const status = result.budget >= (result.goal || 5000) ? 'passed' : 'failed';
        await finishRunAndProgress(req.user.id, scenario, {
          status,
          finalBudget: result.budget,
          earned: result.earned,
          spent: result.spent,
        });
        const resultText =
          status === 'passed'
            ? `Поздравляем! Ты накопил(а) ${result.budget} руб. и купил(а) велосипед!`
            : `Ты накопил(а) ${result.budget} руб. — до цели не хватило. В следующий раз получится лучше!`;
        return res.json({
          isFinished: true,
          result: resultText,
          passed: status === 'passed',
          finalBudget: result.budget,
          goal: result.goal,
        });
      }
      if (code === 'money_quiz') {
        const passed = (result.scorePercent || 0) >= 80;
        await finishRunAndProgress(req.user.id, scenario, {
          status: passed ? 'passed' : 'failed',
          finalBudget: result.scorePercent,
          earned: result.correctCount,
          spent: result.totalQuestions - result.correctCount,
        });
        const resultText =
          `Квиз завершён. Правильных ответов: ${result.correctCount} из ${result.totalQuestions} (${result.scorePercent}%).\n\n` +
          (passed ? 'Отлично! Ты прошёл(ла) квиз.' : 'Нужно 80% для победы. Попробуй ещё раз!');
        return res.json({
          isFinished: true,
          result: resultText,
          passed,
          scorePercent: result.scorePercent,
          correctCount: result.correctCount,
          totalQuestions: result.totalQuestions,
        });
      }
      if (code === 'lemonade_business') {
        const status = result.budget >= (result.goal || 5000) ? 'passed' : 'failed';
        await finishRunAndProgress(req.user.id, scenario, {
          status,
          finalBudget: result.budget,
          earned: result.earned,
          spent: result.spent,
        });
        const resultText =
          status === 'passed'
            ? `Поздравляем! Ты заработал(а) ${result.budget} руб. и купил(а) смартфон!`
            : `Итог: ${result.budget} руб. — до цели не хватило. В следующий раз получится лучше!`;
        return res.json({
          isFinished: true,
          result: resultText,
          passed: status === 'passed',
          finalBudget: result.budget,
          goal: result.goal,
        });
      }
    }

    run.dayIndex = result.nextDayIndex;
    run.budget = round(result.budget ?? run.budget);
    run.earned = round(result.earned ?? run.earned);
    run.spent = round(result.spent ?? run.spent);
    run.state = result.state ?? run.state;
    await run.save();

    const nextStep = getStepContent(code, run);
    const reply = {
      isFinished: false,
      nextStep,
      feedback: code === 'money_quiz' ? (result.isCorrect ? '✅ Верно!' : `❌ Неверно. ${result.explain || ''}`) : (result.comment || ''),
    };
    res.json(reply);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to apply choice' });
  }
});

module.exports = router;

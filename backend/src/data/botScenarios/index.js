/**
 * Сценарии, доступные для прохождения в Telegram-боте.
 * Не включаем: investment_race, island (игра «Остров»).
 */
const bikeDreamSteps = require('./bikeDreamSteps');
const moneyQuizQuestions = require('./moneyQuizQuestions');
const lemonadeSteps = require('./lemonadeSteps');

const PLAYABLE_CODES = ['bike_dream', 'money_quiz', 'lemonade_business'];

function getSteps(scenarioCode) {
  if (scenarioCode === 'bike_dream') return bikeDreamSteps;
  if (scenarioCode === 'money_quiz') return moneyQuizQuestions;
  if (scenarioCode === 'lemonade_business') return lemonadeSteps;
  return null;
}

function getStepContent(scenarioCode, run) {
  const steps = getSteps(scenarioCode);
  if (!steps) return null;
  const dayIndex = Number(run.dayIndex) || 0;
  if (scenarioCode === 'bike_dream') {
    const step = steps[dayIndex];
    if (!step) return null;
    const maxDays = 30;
    const isLastStep = dayIndex >= maxDays - 1;
    return {
      scenarioCode,
      dayIndex,
      title: step.title,
      text: step.text,
      choices: (step.choices || []).map((c, i) => ({ index: i + 1, label: c.label, delta: c.delta ?? 0 })),
      budget: run.budget,
      goal: 5000,
      maxDays,
      isLastStep,
    };
  }
  if (scenarioCode === 'money_quiz') {
    const question = steps[dayIndex];
    if (!question) return null;
    const total = steps.length;
    const isLastQuestion = dayIndex >= total - 1;
    return {
      scenarioCode,
      questionIndex: dayIndex,
      dayIndex,
      title: `Вопрос ${dayIndex + 1} из ${total}`,
      text: question.text,
      choices: (question.options || []).map((opt, i) => ({ index: i + 1, label: opt })),
      totalQuestions: total,
      isLastQuestion,
    };
  }
  if (scenarioCode === 'lemonade_business') {
    const step = steps[dayIndex];
    if (!step) return null;
    const maxDays = 30;
    const isLastStep = dayIndex >= maxDays - 1;
    return {
      scenarioCode,
      dayIndex,
      title: step.title,
      text: step.text,
      choices: (step.choices || []).map((c, i) => ({ index: i + 1, label: c.label, delta: c.delta ?? 0 })),
      budget: run.budget,
      goal: 5000,
      maxDays,
      isLastStep,
    };
  }
  return null;
}

function applyChoice(scenarioCode, run, choiceIndex, runState = {}) {
  const steps = getSteps(scenarioCode);
  if (!steps) return null;
  const dayIndex = Number(run.dayIndex) || 0;
  const step = steps[dayIndex];
  if (!step || choiceIndex < 0) return null;

  if (scenarioCode === 'bike_dream') {
    const choices = step.choices || [];
    const choice = choices[choiceIndex];
    if (!choice) return null;
    const delta = choice.delta ?? 0;
    const newBudget = Math.round((run.budget || 0) + delta);
    const newEarned = Math.round((run.earned || 0) + (delta > 0 ? delta : 0));
    const newSpent = Math.round((run.spent || 0) + (delta < 0 ? Math.abs(delta) : 0));
    const nextDayIndex = dayIndex + 1;
    const maxDays = 30;
    const isFinished = nextDayIndex >= maxDays;
    return {
      nextDayIndex,
      budget: newBudget,
      earned: newEarned,
      spent: newSpent,
      state: run.state || {},
      comment: choice.comment || '',
      isFinished,
      goal: 5000,
    };
  }

  if (scenarioCode === 'money_quiz') {
    const correctIndex = step.correct;
    const isCorrect = choiceIndex === correctIndex;
    const answers = (runState.answers && typeof runState.answers === 'object') ? runState.answers : {};
    answers[step.id] = choiceIndex;
    const nextDayIndex = dayIndex + 1;
    const total = steps.length;
    const isFinished = nextDayIndex >= total;
    const correctCount = Object.keys(answers).filter((qId) => {
      const q = steps.find((s) => s.id === qId);
      return q && answers[qId] === q.correct;
    }).length;
    const score = isFinished ? Math.round((correctCount / total) * 100) : 0;
    return {
      nextDayIndex,
      budget: run.budget,
      earned: run.earned,
      spent: run.spent,
      state: { ...runState, answers },
      isCorrect,
      explain: step.explain || (isCorrect ? 'Верно!' : 'Неверно.'),
      isFinished,
      correctCount: isFinished ? correctCount : undefined,
      totalQuestions: isFinished ? total : undefined,
      scorePercent: isFinished ? score : undefined,
    };
  }

  if (scenarioCode === 'lemonade_business') {
    const choices = step.choices || [];
    const choice = choices[choiceIndex];
    if (!choice) return null;
    const delta = choice.delta ?? 0;
    const newBudget = Math.round((run.budget || 0) + delta);
    const newEarned = Math.round((run.earned || 0) + (delta > 0 ? delta : 0));
    const newSpent = Math.round((run.spent || 0) + (delta < 0 ? Math.abs(delta) : 0));
    const nextDayIndex = dayIndex + 1;
    const maxDays = 30;
    const isFinished = nextDayIndex >= maxDays;
    return {
      nextDayIndex,
      budget: newBudget,
      earned: newEarned,
      spent: newSpent,
      state: run.state || {},
      comment: choice.comment || '',
      isFinished,
      goal: 5000,
    };
  }

  return null;
}

module.exports = {
  PLAYABLE_CODES,
  getSteps,
  getStepContent,
  applyChoice,
};

const {
  sequelize,
  Scenario,
  ScenarioEvent,
  ScenarioChoice,
  Achievement,
} = require('../models');

async function seedInitialData() {
  // Scenario 1: Dream bike (savings)
  let bikeScenario = await Scenario.findOne({ where: { code: 'bike_dream' } });
  if (!bikeScenario) {
    bikeScenario = await Scenario.create({
      code: 'bike_dream',
      title: 'Мечта о велосипеде',
      description:
        'Накопи 5000 монет на велосипед за 30 игровых дней, делая осознанные финансовые выборы.',
      type: 'savings',
      baseBudget: 1000,
      goal: 5000,
      maxDays: 30,
      difficulty: 'beginner',
    });
  }

  // Only a few representative events for prototype (можно расширить позже до 30)
  const eventsData = [
    {
      dayIndex: 1,
      text: 'Друзья зовут в кино. Билет стоит 300 монет.',
      choices: [
        {
          label: 'Пойду, не могу пропустить!',
          budgetDelta: -300,
          commentText:
            'Было весело, но до велосипеда теперь чуть дальше.',
        },
        {
          label: 'Откажусь, лучше отложу эти деньги.',
          budgetDelta: 0,
          commentText:
            'Ничего, в другой раз схожу, когда куплю велосипед.',
        },
      ],
    },
    {
      dayIndex: 5,
      text: 'Бабушка дарит тебе 200 монет просто так.',
      choices: [
        {
          label: 'Потрачу на сладости сейчас.',
          budgetDelta: 0,
          commentText:
            'Сладости были вкусные, но на велосипед это никак не приблизило.',
        },
        {
          label: 'Положу в копилку.',
          budgetDelta: 200,
          commentText:
            'Отличное решение! До велосипеда стало чуть ближе.',
        },
      ],
    },
    {
      dayIndex: 10,
      text: 'Распродажа в магазине игр. Любимая игра стоит 500 монет (вместо 1000).',
      choices: [
        {
          label: 'Куплю, это же выгодно!',
          budgetDelta: -500,
          commentText:
            'Игра классная, но велосипед придётся подождать.',
        },
        {
          label: 'Нет, я коплю на велосипед.',
          budgetDelta: 0,
          commentText:
            'Сдержался — и мечта о велосипеде чуть ближе.',
        },
      ],
    },
    {
      dayIndex: 15,
      text: 'Сосед предлагает помочь с уборкой двора за 150 монет.',
      choices: [
        {
          label: 'Соглашусь и положу деньги в копилку.',
          budgetDelta: 150,
          commentText:
            'Хорошая работа! Ты стал ближе к цели.',
        },
        {
          label: 'Соглашусь, но сразу куплю мороженое.',
          budgetDelta: 100,
          commentText:
            'И заработал, и порадовал себя, но накопишь чуть медленнее.',
        },
      ],
    },
  ];

  for (const event of eventsData) {
    const createdEvent = await ScenarioEvent.create({
      scenarioId: bikeScenario.id,
      dayIndex: event.dayIndex,
      text: event.text,
    });

    for (const choice of event.choices) {
      await ScenarioChoice.create({
        eventId: createdEvent.id,
        label: choice.label,
        budgetDelta: choice.budgetDelta,
        commentText: choice.commentText,
      });
    }
  }

  // Scenario 2: Friend birthday (budget)
  let birthdayScenario = await Scenario.findOne({ where: { code: 'friend_birthday' } });
  if (!birthdayScenario) {
    birthdayScenario = await Scenario.create({
      code: 'friend_birthday',
      title: 'День рождения друга',
      description:
        'Распредели 1000 монет между подарком, игрой и походом в пиццерию так, чтобы учесть бюджет и чувства друга.',
      type: 'budget',
      baseBudget: 1000,
      goal: null,
      maxDays: null,
      difficulty: 'beginner',
    });
  }

  // Scenario 3: Money quiz (stub)
  let quizScenario = await Scenario.findOne({ where: { code: 'money_quiz' } });
  if (!quizScenario) {
    quizScenario = await Scenario.create({
      code: 'money_quiz',
      title: 'Финансовый квиз',
      description: 'Ответь на вопросы про деньги и посмотри, насколько ты финансово грамотен.',
      type: 'quiz',
      baseBudget: 0,
      goal: null,
      maxDays: null,
      difficulty: 'beginner',
    });
  }

  // Scenario 4: Мой первый бизнес (лимонадный киоск)
  let businessScenario = await Scenario.findOne({ where: { code: 'lemonade_business' } });
  if (!businessScenario) {
    businessScenario = await Scenario.create({
      code: 'lemonade_business',
      title: 'Мой первый бизнес',
      description: 'Запусти киоск с лимонадом на 30 дней, заработай на смартфон (5000 монет). Аренда, конкуренты, погода и удачные дни — учись принимать решения.',
      type: 'business',
      baseBudget: 1500,
      goal: 5000,
      maxDays: 30,
      difficulty: 'beginner',
    });
  }

  // Scenario 5: Инвестиционная гонка
  let investScenario = await Scenario.findOne({ where: { code: 'investment_race' } });
  if (!investScenario) {
    investScenario = await Scenario.create({
      code: 'investment_race',
      title: 'Инвестиционная гонка',
      description: 'За 20 ходов преврати стартовые 1000 монет в как можно большую сумму. Покупай и продавай акции, облигации и крипту — учись доходности, рискам и диверсификации.',
      type: 'invest',
      baseBudget: 1000,
      goal: null,
      maxDays: 20,
      difficulty: 'beginner',
    });
  }

  // Achievements
  const achievementsData = [
    {
      code: 'bike_no_spend',
      title: 'Железная выдержка',
      description: 'Накопил 5000 монет на велосипед без единой лишней траты.',
      icon: '🏆',
    },
    {
      code: 'smart_friend',
      title: 'Лучший друг',
      description:
        'Выбрал подарок, который порадовал друга, и не остался без денег на неделю.',
      icon: '🎁',
    },
    {
      code: 'quiz_master',
      title: 'Квиз‑мастер',
      description: 'Лучший результат в финансовом тесте.',
      icon: '❓',
    },
    {
      code: 'investment_champion',
      title: 'Инвестиционный чемпион',
      description: 'Лучший итоговый баланс в сценарии «Инвестиционная гонка».',
      icon: '📈',
    },
  ];

  // Убеждаемся, что таблица achievements в utf8mb4 (иначе вставка с эмодзи/кавычками даёт ER_IMPOSSIBLE_STRING_CONVERSION)
  try {
    await sequelize.query(
      'ALTER TABLE achievements CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
      { raw: true }
    );
  } catch {
    // Таблица может ещё не существовать или уже в utf8mb4 — игнорируем
  }

  for (const data of achievementsData) {
    const existing = await Achievement.findOne({ where: { code: data.code } });
    if (!existing) {
      await Achievement.create(data);
    }
  }
}

module.exports = { seedInitialData };

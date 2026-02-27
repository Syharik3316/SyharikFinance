const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config();

// Ловим необработанные ошибки, чтобы процесс не падал молча и было видно причину
process.on('uncaughtException', (err) => {
  console.error('uncaughtException:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('unhandledRejection at:', promise, 'reason:', reason);
});

const { sequelize } = require('./models');
const { seedInitialData } = require('./seed/seedInitialData');

/** Добавить колонку islandBestDays в users, если её ещё нет (миграция при старте). */
async function ensureIslandBestDaysColumn() {
  const qi = sequelize.getQueryInterface();
  const tableDesc = await qi.describeTable('users');
  if (tableDesc.islandBestDays != null) return;
  await qi.addColumn('users', 'islandBestDays', {
    type: sequelize.Sequelize.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Лучший результат в мини-игре «Остров» (макс. дней)',
  });
  console.log('Migration: added column users.islandBestDays');
}

/** Добавить колонки telegramId, telegramUsername в users при старте. */
async function ensureTelegramColumns() {
  const qi = sequelize.getQueryInterface();
  const tableDesc = await qi.describeTable('users');
  if (tableDesc.telegramId == null) {
    await qi.addColumn('users', 'telegramId', {
      type: sequelize.Sequelize.STRING(64),
      allowNull: true,
    });
    console.log('Migration: added column users.telegramId');
  }
  if (tableDesc.telegramUsername == null) {
    await qi.addColumn('users', 'telegramUsername', {
      type: sequelize.Sequelize.STRING(64),
      allowNull: true,
    });
    console.log('Migration: added column users.telegramUsername');
  }
}

const usersRouter = require('./routes/users');
const authRouter = require('./routes/auth');
const meRouter = require('./routes/me');
const scenariosRouter = require('./routes/scenarios');
const progressRouter = require('./routes/progress');
const achievementsRouter = require('./routes/achievements');
const runsRouter = require('./routes/runs');
const leaderboardRouter = require('./routes/leaderboard');
const islandGameRouter = require('./routes/islandGame');
const chatRouter = require('./routes/chat');
const telegramRouter = require('./routes/telegram');
const botScenarioRouter = require('./routes/botScenario');

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

// Запрос от Telegram-бота (по секрету) — не лимитируем
const isBotRequest = (req) =>
  !!process.env.TELEGRAM_BOT_SECRET && req.get('x-bot-secret') === process.env.TELEGRAM_BOT_SECRET;

// Rate limit: общий лимит для всего API (защита от спама и DDoS). Бот не лимитируется.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { message: 'Слишком много запросов. Подожди 15 минут.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: isBotRequest,
});
// Жёсткий лимит для auth (логин, регистрация, верификация, повтор кода)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Слишком много попыток входа. Подожди 15 минут.' },
  standardHeaders: true,
  legacyHeaders: false,
});
// Защита от форсинга: runs (restart, start, save, finish). Бот не лимитируется.
const runsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  message: { message: 'Слишком много действий со сценариями. Подожди 15 минут.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: isBotRequest,
});
// Бот-сценарии: step + choice. Бот не лимитируется (до 200 по сути не ограничено).
const botScenarioLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { message: 'Слишком много запросов к сценарию. Подожди немного.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: isBotRequest,
});
// Остров сокровищ: сохранение/загрузка состояния
const islandGameLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 35,
  message: { message: 'Слишком много действий в игре. Подожди немного.' },
  standardHeaders: true,
  legacyHeaders: false,
});
// Progress (start/finish) — защита от накрутки
const progressLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Слишком много запросов прогресса. Подожди 15 минут.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/runs', runsLimiter);
app.use('/api/bot-scenario', botScenarioLimiter);
app.use('/api/island-game', islandGameLimiter);
app.use('/api/progress', progressLimiter);

// Ensure upload folders exist
const avatarsDir = path.join(__dirname, '..', 'uploads', 'avatars');
fs.mkdirSync(avatarsDir, { recursive: true });
// Раздаём статику через /api/uploads, чтобы и dev-прокси, и nginx пропускали к backend
app.use('/api/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRouter);
app.use('/api/me', meRouter);
app.use('/api/users', usersRouter);
app.use('/api/scenarios', scenariosRouter);
app.use('/api/progress', progressRouter);
app.use('/api/achievements', achievementsRouter);
app.use('/api/runs', runsRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/island-game', islandGameRouter);
app.use('/api/chat', chatRouter);
app.use('/api/telegram', telegramRouter);
app.use('/api/bot-scenario', botScenarioRouter);

const PORT = process.env.PORT || 4000;

async function start() {
  try {
    await sequelize.authenticate();
    // Без alter: true — иначе на таблице users с большим числом индексов MySQL даёт ER_TOO_MANY_KEYS (max 64).
    await sequelize.sync();
    await ensureIslandBestDaysColumn();
    await ensureTelegramColumns();
    await seedInitialData();

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();

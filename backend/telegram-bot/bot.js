const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Если API по HTTPS с самоподписным сертификатом — добавь в .env: ALLOW_SELF_SIGNED_SSL=true
if (process.env.ALLOW_SELF_SIGNED_SSL === 'true' || process.env.ALLOW_SELF_SIGNED_SSL === '1') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  console.warn('ALLOW_SELF_SIGNED_SSL: SSL-проверка отключена (только для самоподписных сертификатов).');
}

const { Telegraf } = require('telegraf');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BOT_SECRET = process.env.TELEGRAM_BOT_SECRET;
const API_BASE = (process.env.API_BASE_URL || 'http://localhost:4000').replace(/\/$/, '');
const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || 'SyharikFinanceBot';
const API_TIMEOUT_MS = 15000;

if (!BOT_TOKEN) {
  console.error('Set TELEGRAM_BOT_TOKEN in .env');
  process.exit(1);
}
if (!BOT_SECRET) {
  console.error('Set TELEGRAM_BOT_SECRET in .env (same as backend)');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// Состояние «в игре»: userId -> { step: 'pick' | 'play', scenarioCode?, waitingChoice? }
const playSessions = new Map();
const PLAYABLE_LIST = [
  { code: 'bike_dream', title: 'Мечта о велосипеде' },
  { code: 'money_quiz', title: 'Финансовый квиз' },
  { code: 'lemonade_business', title: 'Мой первый бизнес (лимонад)' },
];

function clearPlaySession(userId) {
  playSessions.delete(userId);
}

function fetchWithTimeout(url, options = {}, timeoutMs = API_TIMEOUT_MS) {
  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(to));
}

async function apiFetch(uri, options = {}) {
  const url = uri.startsWith('http') ? uri : `${API_BASE}${uri}`;
  const res = await fetchWithTimeout(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  return res;
}

async function apiWithTelegram(uri, options = {}, telegramId) {
  const url = uri.startsWith('http') ? uri : `${API_BASE}${uri}`;
  const res = await fetchWithTimeout(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Bot-Secret': BOT_SECRET,
      'X-Telegram-User-Id': String(telegramId),
      ...options.headers,
    },
  });
  return res;
}

// ——— /link <code>
bot.command('link', async (ctx) => {
  const text = ctx.message.text || '';
  const code = text.replace(/^\s*\/link\s*/, '').trim().toUpperCase();
  if (!code) {
    return ctx.reply(
      `Чтобы привязать аккаунт (бот @${BOT_USERNAME}):\n\n` +
      '1️⃣ Зайди на сайт в свой профиль\n' +
      '2️⃣ Нажми «Привязать Telegram» и скопируй код\n' +
      '3️⃣ Отправь сюда: /link КОД\n\n' +
      'Пример: /link ABC123'
    );
  }

  try {
    const res = await apiFetch('/api/telegram/link', {
      method: 'POST',
      body: JSON.stringify({
        linkToken: code,
        telegramId: ctx.from.id,
        telegramUsername: ctx.from.username || '',
      }),
    });
    const data = await res.json().catch(() => ({}));

    if (data.ok) {
      return ctx.reply(`✅ Готово, ${data.userName || 'друг'}! Аккаунт привязан. Теперь прогресс синхронизируется с сайтом. Попробуй /progress или /scenarios.`);
    }
    return ctx.reply(data.message || 'Код не подошёл или истёк. Получи новый код в профиле на сайте.');
  } catch (e) {
    const errMsg = e?.message || String(e);
    const isAbort = e?.name === 'AbortError';
    console.error('[bot /link] API error:', errMsg, e?.cause || '');
    if (isAbort) {
      return ctx.reply('Сервер не ответил вовремя. Проверь API_BASE_URL в .env и что backend запущен. Если бот на том же сервере — попробуй API_BASE_URL=http://127.0.0.1:4000');
    }
    return ctx.reply('Сервер недоступен. Проверь API_BASE_URL в .env и что backend запущен. В консоли бота видна подробная ошибка.');
  }
});

// ——— /progress
bot.command('progress', async (ctx) => {
  clearPlaySession(ctx.from.id);
  try {
    const res = await apiWithTelegram('/api/me', { method: 'GET' }, ctx.from.id, ctx.from.username);
    if (res.status === 401) {
      return ctx.reply('Сначала привяжи аккаунт: зайди в профиль на сайте и привяжи Telegram, затем отправь боту /link КОД.');
    }
    const user = await res.json().catch(() => null);
    if (!user) {
      return ctx.reply('Не удалось загрузить данные.');
    }

    const progresses = user.Progresses || [];
    const passed = progresses.filter((p) => p.status === 'passed');
    const inProgress = progresses.filter((p) => p.status === 'in_progress');
    const gems = Math.round(user.gems || 0);
    const exp = Math.round(user.experience || 0);

    let msg = `📊 Твой прогресс\n\n`;
    msg += `💎 Алмазы: ${gems}\n`;
    msg += `⭐ Опыт: ${exp}\n\n`;
    if (passed.length) {
      msg += `Пройдено сценариев: ${passed.length}\n`;
      passed.forEach((p) => {
        const title = p.Scenario?.title || p.Scenario?.code || 'Сценарий';
        msg += `  ✅ ${title}\n`;
      });
    }
    if (inProgress.length) {
      msg += `\nВ процессе: ${inProgress.length}\n`;
      inProgress.forEach((p) => {
        const title = p.Scenario?.title || p.Scenario?.code || 'Сценарий';
        msg += `  🔄 ${title}\n`;
      });
    }
    if (!passed.length && !inProgress.length) {
      msg += 'Пока нет пройденных сценариев. Начни на сайте или смотри список: /scenarios';
    }
    msg += '\n\nПродолжить игру можно на сайте — прогресс синхронизируется.';
    return ctx.reply(msg);
  } catch (e) {
    const errMsg = e?.message || String(e);
    console.error('[bot /progress] API error:', errMsg, e?.cause || '');
    return ctx.reply('Ошибка связи с сервером. Проверь, что backend запущен и API_BASE_URL в .env верный.');
  }
});

// ——— /play — прохождение сценариев в боте
bot.command('play', async (ctx) => {
  const uid = ctx.from.id;
  clearPlaySession(uid);
  try {
    const playRes = await apiWithTelegram('/api/bot-scenario/playable', { method: 'GET' }, uid);
    if (playRes.status === 401) {
      return ctx.reply('Сначала привяжи аккаунт: /link КОД (код в профиле на сайте).');
    }
    const data = await playRes.json().catch(() => ({}));
    const codes = data.codes || PLAYABLE_LIST.map((s) => s.code);
    playSessions.set(uid, { step: 'pick' });
    let msg = '🎮 Выбери сценарий (прогресс синхронизируется с сайтом):\n\n';
    codes.forEach((code, i) => {
      const item = PLAYABLE_LIST.find((s) => s.code === code) || { code, title: code };
      msg += `${i + 1}. ${item.title}\n`;
    });
    msg += '\nОтправь номер сценария (1, 2 или 3). Во время игры — /exit для выхода с сохранением.';
    return ctx.reply(msg);
  } catch (e) {
    console.error('[bot /play]', e?.message || e);
    return ctx.reply('Ошибка. Попробуй позже или используй /scenarios.');
  }
});

// ——— /exit — выйти из сценария с сохранением
bot.command('exit', async (ctx) => {
  const uid = ctx.from.id;
  const session = playSessions.get(uid);
  if (!session || session.step !== 'play' || !session.scenarioCode) {
    clearPlaySession(uid);
    return ctx.reply('Ты не в сценарии. Начать игру: /play');
  }
  const code = session.scenarioCode;
  try {
    const runRes = await apiWithTelegram(`/api/runs/${code}`, { method: 'GET' }, uid);
    const run = runRes.ok ? await runRes.json().catch(() => null) : null;
    if (run && run.status === 'active') {
      await apiWithTelegram('/api/runs/save', {
        method: 'POST',
        body: JSON.stringify({
          scenarioCode: code,
          dayIndex: run.dayIndex,
          budget: run.budget,
          earned: run.earned,
          spent: run.spent,
          state: run.state || {},
        }),
      }, uid);
    }
  } catch (e) {
    console.error('[bot /exit]', e?.message || e);
  }
  clearPlaySession(uid);
  return ctx.reply('✅ Прогресс сохранён. Продолжишь на сайте или в боте — /play');
});

// ——— /help — список всех команд
bot.command('help', async (ctx) => {
  const msg =
    '📋 Команды бота @' + BOT_USERNAME + '\n\n' +
    '/start — приветствие и краткая подсказка\n' +
    '/link КОД — привязать аккаунт к боту (код берёшь в профиле на сайте)\n' +
    '/play — выбрать и пройти сценарий в боте (велосипед, квиз, лимонад). Можно продолжить с сохранения или начать заново\n' +
    '/exit — выйти из сценария с сохранением прогресса\n' +
    '/progress — твой прогресс: алмазы, опыт, пройденные и текущие сценарии\n' +
    '/scenarios — список всех сценариев и ссылка на сайт для продолжения\n' +
    '/help — этот список команд';
  return ctx.reply(msg);
});

// ——— Обработка ответа в режиме игры (выбор сценария, продолжить/заново, выбор варианта)
async function handlePlayMessage(ctx) {
  const uid = ctx.from.id;
  const session = playSessions.get(uid);
  if (!session) return false;

  const text = (ctx.message?.text || '').trim();
  const num = parseInt(text, 10);
  if (!Number.isFinite(num) || num < 1) return true;

  if (session.step === 'confirm_continue') {
    const code = session.scenarioCode;
    if (num === 1) {
      try {
        const stepRes = await apiWithTelegram(`/api/bot-scenario/${code}/step`, { method: 'GET' }, uid);
        const step = await stepRes.json().catch(() => null);
        if (step?.noRun || step?.isFinished) {
          clearPlaySession(uid);
          return ctx.reply('Сохранение не найдено или сценарий уже завершён. Начни заново: /play').then(() => true);
        }
        playSessions.set(uid, { step: 'play', scenarioCode: code, waitingChoice: true });
        const choiceLines = (step.choices || []).map((c) => `${c.index}. ${c.label}`).join('\n');
        let msg = `${step.title || ''}\n\n${step.text || ''}\n\n`;
        if (step.budget != null && step.goal != null) msg += `💰 Бюджет: ${step.budget} руб. Цель: ${step.goal} руб.\n\n`;
        msg += 'Ответь цифрой выбора:\n' + choiceLines;
        return ctx.reply(msg).then(() => true);
      } catch (e) {
        clearPlaySession(uid);
        return ctx.reply('Ошибка. Попробуй /play снова.').then(() => true);
      }
    }
    if (num === 2) {
      try {
        await apiWithTelegram('/api/runs/restart', { method: 'POST', body: JSON.stringify({ scenarioCode: code }) }, uid);
        const stepRes = await apiWithTelegram(`/api/bot-scenario/${code}/step`, { method: 'GET' }, uid);
        const step = await stepRes.json().catch(() => null);
        if (!step || step.noRun) {
          clearPlaySession(uid);
          return ctx.reply('Не удалось начать заново. Попробуй /play.').then(() => true);
        }
        playSessions.set(uid, { step: 'play', scenarioCode: code, waitingChoice: true });
        const choiceLines = (step.choices || []).map((c) => `${c.index}. ${c.label}`).join('\n');
        let msg = `${step.title || ''}\n\n${step.text || ''}\n\n`;
        if (step.budget != null && step.goal != null) msg += `💰 Бюджет: ${step.budget} руб. Цель: ${step.goal} руб.\n\n`;
        msg += 'Ответь цифрой выбора:\n' + choiceLines;
        return ctx.reply(msg).then(() => true);
      } catch (e) {
        clearPlaySession(uid);
        return ctx.reply('Ошибка. Попробуй /play снова.').then(() => true);
      }
    }
    return ctx.reply('Отправь 1 — продолжить, или 2 — начать заново.').then(() => true);
  }

  if (session.step === 'pick') {
    const codes = PLAYABLE_LIST.map((s) => s.code);
    const code = codes[num - 1];
    if (!code) {
      return ctx.reply('Отправь 1, 2 или 3 для выбора сценария.').then(() => true);
    }
    try {
      const runRes = await apiWithTelegram(`/api/runs/${code}`, { method: 'GET' }, uid);
      const existingRun = runRes.ok ? await runRes.json().catch(() => null) : null;
      const hasActiveRun = existingRun && existingRun.status === 'active';

      if (hasActiveRun) {
        const stepRes = await apiWithTelegram(`/api/bot-scenario/${code}/step`, { method: 'GET' }, uid);
        const step = await stepRes.json().catch(() => null);
        if (step?.isFinished) {
          playSessions.set(uid, { step: 'pick' });
          return ctx.reply('Этот сценарий уже пройден. Выбери другой номер (1, 2 или 3).').then(() => true);
        }
        playSessions.set(uid, { step: 'confirm_continue', scenarioCode: code });
        return ctx.reply('У тебя есть сохранение по этому сценарию.\nПродолжить с сохранения (1) или начать заново (2)?').then(() => true);
      }

      const startRes = await apiWithTelegram('/api/runs/start', {
        method: 'POST',
        body: JSON.stringify({ scenarioCode: code }),
      }, uid);
      if (!startRes.ok) {
        const err = await startRes.json().catch(() => ({}));
        return ctx.reply(err.message || 'Не удалось начать сценарий.').then(() => true);
      }
      const stepRes = await apiWithTelegram(`/api/bot-scenario/${code}/step`, { method: 'GET' }, uid);
      const step = await stepRes.json().catch(() => null);
      if (step?.noRun) {
        return ctx.reply('Сценарий не найден. Попробуй /play снова.').then(() => {
          clearPlaySession(uid);
          return true;
        });
      }
      if (step?.isFinished) {
        clearPlaySession(uid);
        return ctx.reply('Этот сценарий уже пройден. Выбери другой: /play').then(() => true);
      }
      playSessions.set(uid, { step: 'play', scenarioCode: code, waitingChoice: true });
      const choiceLines = (step.choices || []).map((c) => `${c.index}. ${c.label}`).join('\n');
      let msg = `${step.title || ''}\n\n${step.text || ''}\n\n`;
      if (step.budget != null && step.goal != null) {
        msg += `💰 Бюджет: ${step.budget} руб. Цель: ${step.goal} руб.\n\n`;
      }
      msg += 'Ответь цифрой выбора:\n' + choiceLines;
      return ctx.reply(msg).then(() => true);
    } catch (e) {
      console.error('[bot play step]', e);
      clearPlaySession(uid);
      return ctx.reply('Ошибка загрузки шага. Попробуй /play снова.').then(() => true);
    }
  }

  if (session.step === 'play' && session.waitingChoice && session.scenarioCode) {
    const code = session.scenarioCode;
    const choiceIndex = num - 1;
    try {
      const choiceRes = await apiWithTelegram(`/api/bot-scenario/${code}/choice`, {
        method: 'POST',
        body: JSON.stringify({ choiceIndex }),
      }, uid);
      const data = await choiceRes.json().catch(() => ({}));
      if (data.isFinished && data.result) {
        clearPlaySession(uid);
        return ctx.reply(data.result).then(() => true);
      }
      if (data.feedback) {
        await ctx.reply(data.feedback);
      }
      const next = data.nextStep;
      if (!next) {
        return ctx.reply('Отправь номер варианта (1, 2 или 3).').then(() => true);
      }
      const choiceLines = (next.choices || []).map((c) => `${c.index}. ${c.label}`).join('\n');
      let msg = `${next.title || ''}\n\n${next.text || ''}\n\n`;
      if (next.budget != null && next.goal != null) {
        msg += `💰 Бюджет: ${next.budget} руб. Цель: ${next.goal} руб.\n\n`;
      }
      msg += 'Ответь цифрой выбора:\n' + choiceLines;
      return ctx.reply(msg).then(() => true);
    } catch (e) {
      console.error('[bot play choice]', e);
      return ctx.reply('Ошибка. Отправь цифру варианта снова.').then(() => true);
    }
  }

  return true;
}

bot.on('text', async (ctx, next) => {
  const handled = await handlePlayMessage(ctx);
  if (handled) return;
  return next();
});

// ——— /scenarios — список сценариев и активных runs с ссылкой «продолжить на сайте»
bot.command('scenarios', async (ctx) => {
  clearPlaySession(ctx.from.id);
  try {
    const [meRes, scenariosRes] = await Promise.all([
      apiWithTelegram('/api/me', { method: 'GET' }, ctx.from.id),
      apiFetch('/api/scenarios', { method: 'GET' }),
    ]);

    if (meRes.status === 401) {
      return ctx.reply('Сначала привяжи аккаунт через /link КОД (код берёшь в профиле на сайте).');
    }

    const user = await meRes.json().catch(() => null);
    const scenarios = await scenariosRes.json().catch(() => []);
    if (!Array.isArray(scenarios)) {
      return ctx.reply('Не удалось загрузить список сценариев.');
    }

    const baseUrl = 'https://admin107.fvds.ru';
    let msg = '🎮 Сценарии\n\n';

    for (const s of scenarios) {
      const code = s.code || '';
      const title = s.title || code;
      const runRes = await apiWithTelegram(`/api/runs/${code}`, { method: 'GET' }, ctx.from.id);
      const run = runRes.ok ? await runRes.json().catch(() => null) : null;
      const hasActive = run && run.status === 'active';
      const progress = (user?.Progresses || []).find((p) => p.Scenario?.code === code);
      const passed = progress?.status === 'passed';

      let line = hasActive ? '🔄 ' : passed ? '✅ ' : '📌 ';
      line += title;
      if (hasActive) {
        line += ' — можно продолжить на сайте';
      } else if (!passed) {
        line += ' — начать на сайте';
      }
      msg += line + '\n';
    }

    msg += `\nОткрой сайт и зайди на карту сценариев — там твой прогресс уже сохранён:\n${baseUrl}`;
    return ctx.reply(msg);
  } catch (e) {
    const errMsg = e?.message || String(e);
    console.error('[bot /scenarios] API error:', errMsg, e?.cause || '');
    return ctx.reply('Ошибка связи с сервером. Проверь API_BASE_URL и что backend запущен.');
  }
});

// ——— /start
bot.start(async (ctx) => {
  try {
    const res = await apiWithTelegram('/api/me', { method: 'GET' }, ctx.from.id);
    const linked = res.ok;

    if (linked) {
      return ctx.reply(
        'Привет! 👋 Ты уже привязан к аккаунту на сайте.\n\n' +
        'Команды:\n' +
        '/play — пройти сценарий (велосипед, квиз, лимонад)\n' +
        '/exit — выйти из сценария с сохранением\n' +
        '/progress — твой прогресс и алмазы\n' +
        '/scenarios — список сценариев и ссылки «продолжить на сайте»\n\n' +
        'Можно начать на сайте и продолжить здесь, или наоборот — прогресс синхронизируется.'
      );
    }

    return ctx.reply(
      'Привет! 👋 Это бот для игры по финансовой грамотности.\n\n' +
      'Чтобы синхронизировать прогресс с сайтом:\n' +
      '1️⃣ Зайди на сайт и в свой профиль\n' +
      '2️⃣ Нажми «Привязать Telegram» и скопируй код\n' +
      '3️⃣ Отправь сюда: /link КОД\n\n' +
      'После привязки используй /progress и /scenarios.'
    );
  } catch {
    return ctx.reply(
      'Привет! 👋 Привяжи аккаунт: зайди в профиль на сайте, получи код и отправь /link КОД.'
    );
  }
});

bot.launch().then(() => {
  console.log('Telegram bot is running');
}).catch((err) => {
  console.error('Bot failed to start:', err);
  process.exit(1);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

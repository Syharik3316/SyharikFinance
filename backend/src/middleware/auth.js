const jwt = require('jsonwebtoken');
const { User } = require('../models');

function requireJwtSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required in .env');
  }
}

/**
 * Authenticates by JWT (Authorization: Bearer) or by Telegram bot headers
 * (X-Bot-Secret + X-Telegram-User-Id). Used for web and for bot API calls so
 * progress/runs stay in sync (same user, same runs).
 */
async function authMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [type, token] = header.split(' ');
    const telegramId = req.headers['x-telegram-user-id'];
    const botSecret = req.headers['x-bot-secret'];

    // 1) Try Telegram bot auth (for bot calling our API)
    if (telegramId && botSecret && process.env.TELEGRAM_BOT_SECRET && botSecret === process.env.TELEGRAM_BOT_SECRET) {
      const user = await User.findOne({ where: { telegramId: String(telegramId) } });
      if (user) {
        req.user = user;
        return next();
      }
      return res.status(401).json({ message: 'Telegram account not linked. Use /link in the bot.' });
    }

    // 2) JWT (web)
    requireJwtSecret();
    if (type !== 'Bearer' || !token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(payload.userId);

    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
}

module.exports = { authMiddleware };


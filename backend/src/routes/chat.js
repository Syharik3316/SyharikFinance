const express = require('express');
const { getAccessToken, chatCompletions } = require('../services/gigachat');

const router = express.Router();

const GIGACHAT_AUTH_KEY = process.env.GIGACHAT_AUTHORIZATION_KEY || process.env.GIGACHAT_AUTH_KEY;

/**
 * POST /api/chat
 * Body: { message: string, history?: Array<{ role: 'user'|'assistant', content: string }> }
 * Returns: { reply: string } or 400/502
 */
router.post('/', async (req, res) => {
  try {
    const { message, history = [] } = req.body || {};
    const text = typeof message === 'string' ? message.trim() : '';
    if (!text) {
      return res.status(400).json({ message: 'message is required' });
    }

    if (!GIGACHAT_AUTH_KEY) {
      return res.status(503).json({
        message: 'Чат с ИИ временно недоступен. Обратитесь к администратору.',
      });
    }

    const messages = [];
    const maxHistory = 10;
    const recent = Array.isArray(history) ? history.slice(-maxHistory) : [];
    for (const h of recent) {
      if (h && (h.role === 'user' || h.role === 'assistant') && typeof h.content === 'string') {
        messages.push({ role: h.role, content: h.content.slice(0, 2000) });
      }
    }
    messages.push({ role: 'user', content: text.slice(0, 2000) });

    const accessToken = await getAccessToken(GIGACHAT_AUTH_KEY);
    const reply = await chatCompletions(accessToken, messages);

    res.json({ reply });
  } catch (err) {
    const msg = err.message || String(err);
    console.error('Chat GigaChat error:', msg);
    if (process.env.NODE_ENV !== 'production') {
      console.error(err.stack);
    }
    res.status(502).json({
      message: 'Не удалось получить ответ. Попробуйте позже или задайте вопрос короче.',
      error: process.env.NODE_ENV !== 'production' ? msg : undefined,
    });
  }
});

module.exports = router;

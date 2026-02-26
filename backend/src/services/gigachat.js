const https = require('https');
const qs = require('querystring');

const OAUTH_URL = 'ngw.devices.sberbank.ru';
const OAUTH_PATH = '/api/v2/oauth';
const OAUTH_PORT = 9443;
const CHAT_HOST = 'gigachat.devices.sberbank.ru';
const CHAT_PATH = '/api/v1/chat/completions';
const CHAT_PORT = 443;

// GigaChat использует самоподписанные сертификаты — без этого запросы падают с SSL ошибкой
const HTTPS_AGENT_OPTIONS = { rejectUnauthorized: false };

const SYSTEM_PROMPT = `Ты — дружелюбный помощник по финансовой грамотности для детей (примерно 7–14 лет).
Отвечай только на вопросы, связанные с деньгами, финансами, сбережениями, копилкой, бюджетом, карманными деньгами, покупками и т.п.
Пиши коротко, просто и по-доброму. Можно использовать примеры и сравнения.
Если вопрос не про финансы и грамотность (например, погода, игры, посторонние темы), вежливо ответь одной фразой: "Я помогаю только с вопросами про деньги и финансы. Спроси, например, как копить на мечту или что такое бюджет."`;

let cachedToken = null;
let tokenExpiresAt = 0;

function generateRqUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Получить access_token GigaChat (кэш на 30 мин, обновляем за 1 мин до истечения).
 * @param {string} authKey - Authorization key (Basic base64 из личного кабинета)
 * @returns {Promise<string>}
 */
function getAccessToken(authKey) {
  const now = Date.now();
  if (cachedToken && tokenExpiresAt > now + 60000) {
    return Promise.resolve(cachedToken);
  }

  return new Promise((resolve, reject) => {
    const postData = qs.stringify({ scope: 'GIGACHAT_API_PERS' });
    const options = {
      hostname: OAUTH_URL,
      port: OAUTH_PORT,
      path: OAUTH_PATH,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        RqUID: generateRqUID(),
        Authorization: authKey.startsWith('Basic ') ? authKey : `Basic ${authKey}`,
        'Content-Length': Buffer.byteLength(postData),
      },
      ...HTTPS_AGENT_OPTIONS,
    };

    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString();
        try {
          const body = JSON.parse(raw);
          if (res.statusCode !== 200) {
            reject(new Error(body.error_description || body.error || `OAuth ${res.statusCode}: ${raw.slice(0, 200)}`));
            return;
          }
          if (body.access_token) {
            cachedToken = body.access_token;
            tokenExpiresAt = body.expires_at || now + 29 * 60 * 1000;
            resolve(cachedToken);
          } else {
            reject(new Error(body.error_description || body.error || 'No access_token'));
          }
        } catch (e) {
          reject(new Error(`OAuth parse error: ${e.message}. Body: ${raw.slice(0, 300)}`));
        }
      });
    });
    req.on('error', (e) => reject(new Error(`OAuth request: ${e.message}`)));
    req.write(postData);
    req.end();
  });
}

/**
 * Отправить сообщения в GigaChat и получить ответ.
 * @param {string} accessToken
 * @param {Array<{role: string, content: string}>} messages - массив { role, content }, последнее — user
 * @returns {Promise<string>} - текст ответа ассистента
 */
function chatCompletions(accessToken, messages) {
  const payload = JSON.stringify({
    model: 'GigaChat',
    messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
    stream: false,
    temperature: 0.7,
    max_tokens: 512,
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: CHAT_HOST,
      port: CHAT_PORT,
      path: CHAT_PATH,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'Content-Length': Buffer.byteLength(payload, 'utf8'),
      },
      ...HTTPS_AGENT_OPTIONS,
    };

    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString();
        try {
          const body = JSON.parse(raw);
          if (res.statusCode !== 200) {
            const msg = body.error?.message || body.message || body.error || raw.slice(0, 200);
            reject(new Error(`GigaChat ${res.statusCode}: ${msg}`));
            return;
          }
          const choice = body.choices && body.choices[0];
          if (choice && choice.message && typeof choice.message.content === 'string') {
            resolve(choice.message.content.trim());
          } else if (body.error) {
            reject(new Error(body.error.message || body.error));
          } else {
            reject(new Error('Empty or invalid GigaChat response'));
          }
        } catch (e) {
          reject(new Error(`GigaChat parse: ${e.message}. Body: ${raw.slice(0, 300)}`));
        }
      });
    });
    req.on('error', (e) => reject(new Error(`GigaChat request: ${e.message}`)));
    req.write(payload, 'utf8');
    req.end();
  });
}

module.exports = {
  getAccessToken,
  chatCompletions,
};

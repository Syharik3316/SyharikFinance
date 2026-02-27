/**
 * Разрешённые домены почты для регистрации и смены email.
 * Регистрация через одноразовые/малоизвестные домены запрещена.
 */
const ALLOWED_EMAIL_DOMAINS = [
  'gmail.com',
  'googlemail.com',
  'mail.ru',
  'mail.com',
  'inbox.ru',
  'list.ru',
  'bk.ru',
  'yandex.ru',
  'ya.ru',
  'yandex.com',
  'yandex.by',
  'yandex.kz',
  'yandex.ua',
  'outlook.com',
  'hotmail.com',
  'hotmail.ru',
  'live.com',
  'live.ru',
  'msn.com',
  'yahoo.com',
  'yahoo.ru',
  'icloud.com',
  'me.com',
  'mac.com',
  'protonmail.com',
  'proton.me',
  'rambler.ru',
  'autorambler.ru',
  'myrambler.ru',
];

const DOMAINS_SET = new Set(ALLOWED_EMAIL_DOMAINS.map((d) => d.toLowerCase()));

/**
 * Проверяет, что email принадлежит одному из разрешённых доменов.
 * @param {string} email — нормализованный email (lowercase).
 * @returns {boolean}
 */
function isAllowedEmailDomain(email) {
  if (!email || typeof email !== 'string') return false;
  const parts = email.trim().toLowerCase().split('@');
  if (parts.length !== 2 || !parts[1]) return false;
  return DOMAINS_SET.has(parts[1]);
}

module.exports = { ALLOWED_EMAIL_DOMAINS, isAllowedEmailDomain };

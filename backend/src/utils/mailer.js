const nodemailer = require('nodemailer');

function asBool(value) {
  return String(value || '').toLowerCase() === 'true';
}

function isMailerConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.MAIL_FROM
  );
}

async function sendMail({ to, subject, text }) {
  const toAddress = typeof to === 'string' ? to.trim() : '';
  if (!toAddress || !toAddress.includes('@')) {
    throw new Error('Invalid email address for sending');
  }
  if (!subject || !text) {
    throw new Error('Subject and text are required');
  }

  if (!isMailerConfigured()) {
    const isProduction = String(process.env.NODE_ENV || '').trim().toLowerCase() === 'production';
    if (isProduction) {
      throw new Error(
        'SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM in environment.'
      );
    }
    console.log('[MAILER] SMTP not configured. Email would be sent to:', toAddress);
    console.log('[MAILER] Subject:', subject);
    console.log('[MAILER] Text:', text);
    return;
  }

  const allowSelfSigned = asBool(process.env.SMTP_ALLOW_SELF_SIGNED);
  const port = Number(process.env.SMTP_PORT);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error('Invalid SMTP_PORT (must be 1-65535)');
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: asBool(process.env.SMTP_SECURE),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    ...(allowSelfSigned
      ? {
          tls: {
            rejectUnauthorized: false,
          },
        }
      : {}),
  });

  try {
    await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: toAddress,
      subject: String(subject),
      text: String(text),
    });
  } catch (err) {
    console.error('[MAILER] Send failed:', err.message);
    if (err.response) console.error('[MAILER] Server response:', err.response);
    if (err.code) console.error('[MAILER] Code:', err.code);

    let msg = 'Не удалось отправить письмо';
    const code = err.code || '';
    const response = String(err.response || '');
    const lowerMessage = (err.message || '').toLowerCase();

    if (code === 'EAUTH') {
      const needAppPass =
        response.toLowerCase().includes('application password') ||
        response.toLowerCase().includes('parol prilozheniya') ||
        response.toLowerCase().includes('пароль приложения');
      msg = needAppPass
        ? 'Нужен пароль приложения (не обычный пароль). Mail.ru: Настройки → Безопасность → Пароль для внешнего приложения. Gmail: Пароли приложений в аккаунте Google.'
        : 'Ошибка авторизации SMTP (неверный логин/пароль или нужен пароль приложения)';
    } else if (code === 'ECONNECTION' || code === 'ETIMEDOUT') {
      msg = 'Не удалось подключиться к почтовому серверу';
    } else if (code === 'ESOCKET' && (lowerMessage.includes('self-signed') || lowerMessage.includes('certificate'))) {
      msg = 'Сервер использует самоподписный сертификат. В .env укажи SMTP_ALLOW_SELF_SIGNED=true';
    } else if (code === 'EENVELOPE' || response.includes('550') || lowerMessage.includes('not allowed sender')) {
      msg = 'Сервер отклонил адрес отправителя. Сделай MAIL_FROM таким же, как SMTP_USER (или разрешённый ящик в настройках почты).';
    }

    throw Object.assign(new Error(msg), { code: err.code, original: err });
  }
}

module.exports = { sendMail, isMailerConfigured };

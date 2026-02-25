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
  if (!isMailerConfigured()) {
    // Для прототипа: если SMTP не настроен — просто логируем.
    console.log('[MAILER] SMTP not configured. Email would be sent to:', to);
    console.log('[MAILER] Subject:', subject);
    console.log('[MAILER] Text:', text);
    return;
  }

  const allowSelfSigned = asBool(process.env.SMTP_ALLOW_SELF_SIGNED);

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
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

  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject,
    text,
  });
}

module.exports = { sendMail };


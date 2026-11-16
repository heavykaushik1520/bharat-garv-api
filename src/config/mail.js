import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

// Ensure .env is loaded even when this module is imported before index.js runs dotenv.config().
dotenv.config();

function readMailConfig() {
  const port = Number(process.env.SMTP_PORT) || 465;
  const secure =
    String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || port === 465;
  const pass = String(process.env.SMTP_PASS || '').trim();

  return {
    host: process.env.SMTP_HOST || 'mail.kalakary.com',
    port,
    secure,
    user: process.env.SMTP_USER || 'test@kalakary.com',
    pass,
    fromName: process.env.MAIL_FROM_NAME || 'Bharat Garv',
    fromEmail: process.env.MAIL_FROM_EMAIL || process.env.SMTP_USER || 'test@kalakary.com',
    adminNotifyEmail:
      process.env.ADMIN_NOTIFY_EMAIL || process.env.SMTP_USER || 'test@kalakary.com',
    appPublicUrl: String(
      process.env.APP_PUBLIC_URL || 'http://localhost:5173/bharat-garv'
    ).replace(/\/+$/, ''),
    resetExpiresMinutes: Math.min(
      240,
      Math.max(15, Number(process.env.PASSWORD_RESET_EXPIRES_MINUTES) || 60)
    ),
  };
}

/** Live config (always reads current process.env). */
export const mailConfig = new Proxy(
  {},
  {
    get(_target, prop) {
      const config = readMailConfig();
      return config[prop];
    },
  }
);

let transporter = null;
let transporterKey = '';

export function getMailTransporter() {
  const config = readMailConfig();
  const nextKey = `${config.host}|${config.port}|${config.user}|${config.pass}`;

  if (transporter && transporterKey === nextKey) return transporter;

  if (!config.host || !config.user) {
    throw new Error('SMTP is not configured (SMTP_HOST / SMTP_USER)');
  }
  if (!config.pass) {
    throw new Error('SMTP_PASS is missing — set the mailbox password in backend/.env');
  }

  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    rateDelta: 1000,
    rateLimit: 10,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
  });
  transporterKey = nextKey;

  return transporter;
}

export function getMailFromHeader() {
  const config = readMailConfig();
  const name = String(config.fromName || 'Bharat Garv').replace(/"/g, '');
  return `"${name}" <${config.fromEmail}>`;
}

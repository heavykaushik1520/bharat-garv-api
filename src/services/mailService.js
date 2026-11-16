import pool from '../config/db.js';
import { getMailFromHeader, getMailTransporter, mailConfig } from '../config/mail.js';

async function insertMailLog({ mailType, toEmail, subject, status, errorMessage = null, meta = null }) {
  try {
    const [result] = await pool.query(
      `INSERT INTO mail_log (mail_type, to_email, subject, status, error_message, meta_json, sent_at)
       VALUES (
         :mailType,
         :toEmail,
         :subject,
         :status,
         :errorMessage,
         :metaJson,
         CASE WHEN :sentFlag = 1 THEN UTC_TIMESTAMP() ELSE NULL END
       )`,
      {
        mailType,
        toEmail: String(toEmail || '').slice(0, 191),
        subject: String(subject || '').slice(0, 255),
        status,
        errorMessage: errorMessage ? String(errorMessage).slice(0, 500) : null,
        metaJson: meta ? JSON.stringify(meta) : null,
        sentFlag: status === 'sent' ? 1 : 0,
      }
    );
    return result.insertId;
  } catch (error) {
    console.error('[mail] failed to write mail_log', error.message);
    return null;
  }
}

/**
 * Send mail via SMTP with pooled transporter + durable mail_log.
 * Never throws to callers by default — email must not break core API flows.
 */
export async function sendAppMail({
  mailType,
  to,
  subject,
  html,
  text,
  meta = null,
  attachments = null,
  replyTo = null,
  throwOnError = false,
}) {
  const toEmail = String(to || '')
    .trim()
    .toLowerCase();
  if (!toEmail || !subject || !html) {
    const err = new Error('Mail payload is incomplete');
    if (throwOnError) throw err;
    await insertMailLog({
      mailType,
      toEmail: toEmail || 'unknown',
      subject: subject || '(missing subject)',
      status: 'failed',
      errorMessage: err.message,
      meta,
    });
    return { ok: false, error: err.message };
  }

  try {
    const transporter = getMailTransporter();
    const replyToEmail = String(replyTo || '')
      .trim()
      .toLowerCase();
    await transporter.sendMail({
      from: getMailFromHeader(),
      to: toEmail,
      subject,
      html,
      text: text || undefined,
      replyTo: replyToEmail || undefined,
      attachments: Array.isArray(attachments) && attachments.length ? attachments : undefined,
    });

    await insertMailLog({
      mailType,
      toEmail,
      subject,
      status: 'sent',
      meta,
    });
    return { ok: true };
  } catch (error) {
    const message = error?.message || 'Failed to send email';
    console.error(`[mail:${mailType}]`, message);
    await insertMailLog({
      mailType,
      toEmail,
      subject,
      status: 'failed',
      errorMessage: message,
      meta,
    });
    if (throwOnError) throw error;
    return { ok: false, error: message };
  }
}

/** Fire-and-forget helper so request handlers stay fast under load. */
export function queueMail(task) {
  setImmediate(() => {
    Promise.resolve()
      .then(task)
      .catch((error) => {
        console.error('[mail:queue]', error?.message || error);
      });
  });
}

export function buildAppUrl(path = '/') {
  const base = mailConfig.appPublicUrl;
  const normalized = String(path || '/').startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
}

export { mailConfig };

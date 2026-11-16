import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import pool from '../config/db.js';
import { httpError } from '../utils/httpError.js';
import { buildPasswordResetEmail } from '../templates/passwordResetEmail.js';
import { buildAppUrl, mailConfig, queueMail, sendAppMail } from './mailService.js';

const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 12;
const TOKEN_BYTES = 32;

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim().slice(0, 45);
  }
  return String(req.ip || '').slice(0, 45) || null;
}

function clientUserAgent(req) {
  return String(req.headers['user-agent'] || '').slice(0, 255) || null;
}

/**
 * Always returns a generic success payload (no email enumeration).
 * Creates a one-time hashed token and emails the reset link when the account exists.
 */
export async function requestPasswordReset(email, req) {
  const normalizedEmail = String(email || '')
    .trim()
    .toLowerCase();

  const generic = {
    success: true,
    message:
      'If an account exists for that email, a password reset link has been sent. Please check your inbox.',
  };

  const [users] = await pool.query(
    `SELECT id, email, first_name, is_active
     FROM users
     WHERE email = :email
     LIMIT 1`,
    { email: normalizedEmail }
  );

  const user = users[0];
  if (!user || !user.is_active) {
    return generic;
  }

  const rawToken = crypto.randomBytes(TOKEN_BYTES).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + mailConfig.resetExpiresMinutes * 60 * 1000);
  const expiresMysql = expiresAt.toISOString().slice(0, 19).replace('T', ' ');

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Invalidate unused active tokens for this user (one active reset at a time).
    await connection.query(
      `UPDATE password_reset_tokens
       SET used_at = UTC_TIMESTAMP()
       WHERE user_id = :userId
         AND used_at IS NULL
         AND expires_at > UTC_TIMESTAMP()`,
      { userId: user.id }
    );

    await connection.query(
      `INSERT INTO password_reset_tokens
        (user_id, token_hash, expires_at, requested_ip, user_agent)
       VALUES
        (:userId, :tokenHash, :expiresAt, :requestedIp, :userAgent)`,
      {
        userId: user.id,
        tokenHash,
        expiresAt: expiresMysql,
        requestedIp: clientIp(req),
        userAgent: clientUserAgent(req),
      }
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  const resetUrl = buildAppUrl(`/reset-password?token=${encodeURIComponent(rawToken)}`);
  const mail = buildPasswordResetEmail({
    firstName: user.first_name,
    resetUrl,
    expiresMinutes: mailConfig.resetExpiresMinutes,
  });

  // Password-reset delivery is important — await send so API can surface SMTP misconfig in logs/mail_log.
  await sendAppMail({
    mailType: 'password_reset',
    to: user.email,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    meta: { userId: user.id },
  });

  return generic;
}

export async function resetPasswordWithToken({ token, newPassword }) {
  const rawToken = String(token || '').trim();
  if (!/^[a-f0-9]{64}$/i.test(rawToken)) {
    throw httpError('This reset link is invalid or has expired', 400, [
      { field: 'token', message: 'This reset link is invalid or has expired' },
    ]);
  }

  const tokenHash = hashToken(rawToken);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `SELECT
         t.id AS token_id,
         t.user_id,
         t.expires_at,
         t.used_at,
         u.is_active,
         u.email
       FROM password_reset_tokens t
       INNER JOIN users u ON u.id = t.user_id
       WHERE t.token_hash = :tokenHash
       LIMIT 1
       FOR UPDATE`,
      { tokenHash }
    );

    const row = rows[0];
    if (!row || row.used_at || !row.is_active) {
      throw httpError('This reset link is invalid or has expired', 400, [
        { field: 'token', message: 'This reset link is invalid or has expired' },
      ]);
    }

    const expiresAt =
      row.expires_at instanceof Date
        ? row.expires_at
        : new Date(
            /Z$|[+-]\d{2}:\d{2}$/.test(String(row.expires_at))
              ? row.expires_at
              : `${String(row.expires_at).replace(' ', 'T')}Z`
          );
    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
      throw httpError('This reset link is invalid or has expired', 400, [
        { field: 'token', message: 'This reset link is invalid or has expired' },
      ]);
    }

    const encryptedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await connection.query(
      `UPDATE users
       SET password = :password,
           encrypted_password = :encryptedPassword
       WHERE id = :userId AND is_active = 1`,
      {
        password: newPassword,
        encryptedPassword,
        userId: row.user_id,
      }
    );

    await connection.query(
      `UPDATE password_reset_tokens
       SET used_at = UTC_TIMESTAMP()
       WHERE id = :tokenId`,
      { tokenId: row.token_id }
    );

    // Invalidate any other outstanding tokens for this account.
    await connection.query(
      `UPDATE password_reset_tokens
       SET used_at = UTC_TIMESTAMP()
       WHERE user_id = :userId
         AND used_at IS NULL
         AND id <> :tokenId`,
      { userId: row.user_id, tokenId: row.token_id }
    );

    await connection.commit();

    return {
      success: true,
      message: 'Password updated successfully. You can sign in with your new password.',
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/** Optional cleanup helper for cron / ops — deletes expired rows older than retentionDays. */
export async function purgeExpiredPasswordResetTokens(retentionDays = 7) {
  const days = Math.min(90, Math.max(1, Number(retentionDays) || 7));
  const [result] = await pool.query(
    `DELETE FROM password_reset_tokens
     WHERE expires_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL :days DAY)
        OR (used_at IS NOT NULL AND used_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL :days DAY))`,
    { days }
  );
  return Number(result.affectedRows || 0);
}

// Keep queueMail import used for future queued paths / lint friendliness via re-export if needed
export { queueMail };

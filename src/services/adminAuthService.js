import crypto from 'crypto';
import pool from '../config/db.js';
import { mailConfig } from '../config/mail.js';
import { httpError } from '../utils/httpError.js';
import { mapPublicAdmin, PUBLIC_ADMIN_SELECT } from '../utils/adminMapper.js';
import { plainPasswordsMatch } from '../utils/plainPassword.js';
import { signAccessToken } from '../utils/jwt.js';
import { buildAdminPasswordResetEmail } from '../templates/adminPasswordResetEmail.js';
import { buildAppUrl, sendAppMail } from './mailService.js';

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

function toMysqlDateTimeUtc(date = new Date()) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

export async function countAdmins(connection = pool) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS total FROM admins WHERE is_active = 1`
  );
  return Number(rows[0]?.total || 0);
}

export async function findAdminByEmail(email, connection = pool) {
  const [rows] = await connection.query(
    `SELECT *
     FROM admins
     WHERE email = :email
     LIMIT 1`,
    { email }
  );
  return rows[0] || null;
}

export async function findAdminById(id, connection = pool) {
  const [rows] = await connection.query(
    `SELECT ${PUBLIC_ADMIN_SELECT}
     FROM admins a
     WHERE a.id = :id
     LIMIT 1`,
    { id }
  );
  return mapPublicAdmin(rows[0]);
}

/**
 * Create an admin account.
 * - First admin (bootstrap): no auth required
 * - Later admins: caller must be an authenticated admin
 * Password is stored in plaintext as required by product rules.
 */
export async function createAdminAccount({ email, password, name, actorAdminId = null }) {
  const normalizedEmail = String(email || '')
    .trim()
    .toLowerCase();
  const normalizedName = String(name || '').trim();
  const plainPassword = String(password || '');

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const activeCount = await countAdmins(connection);
    if (activeCount > 0 && !actorAdminId) {
      throw httpError('Admin authentication required to create additional admins', 401, [
        { field: 'auth', message: 'Sign in as an admin to create another admin' },
      ]);
    }

    const existing = await findAdminByEmail(normalizedEmail, connection);
    if (existing) {
      throw httpError('An admin with this email already exists', 409, [
        { field: 'email', message: 'An admin with this email already exists' },
      ]);
    }

    const [result] = await connection.query(
      `INSERT INTO admins (email, password, name, is_active)
       VALUES (:email, :password, :name, 1)`,
      {
        email: normalizedEmail,
        password: plainPassword,
        name: normalizedName,
      }
    );

    const [rows] = await connection.query(
      `SELECT ${PUBLIC_ADMIN_SELECT}
       FROM admins a
       WHERE a.id = :id
       LIMIT 1`,
      { id: result.insertId }
    );

    await connection.commit();
    return mapPublicAdmin(rows[0]);
  } catch (error) {
    await connection.rollback();
    if (error?.code === 'ER_DUP_ENTRY') {
      throw httpError('An admin with this email already exists', 409, [
        { field: 'email', message: 'An admin with this email already exists' },
      ]);
    }
    throw error;
  } finally {
    connection.release();
  }
}

export async function loginAdmin({ email, password }) {
  const normalizedEmail = String(email || '')
    .trim()
    .replace(/\s+/g, '')
    .toLowerCase();
  const normalizedPassword = String(password || '').trim();

  const admin = await findAdminByEmail(normalizedEmail);
  const passwordOk = admin
    ? plainPasswordsMatch(admin.password, normalizedPassword)
    : false;

  if (!admin || !passwordOk) {
    throw httpError('Invalid email or password', 401, [
      { field: 'email', message: 'Invalid email or password' },
    ]);
  }

  if (!admin.is_active) {
    throw httpError('This admin account is deactivated', 403, [
      { field: 'email', message: 'This admin account is deactivated' },
    ]);
  }

  await pool.query(
    `UPDATE admins
     SET last_login_at = :lastLoginAt
     WHERE id = :id`,
    { id: admin.id, lastLoginAt: toMysqlDateTimeUtc() }
  );

  const publicAdmin = mapPublicAdmin({
    ...admin,
    last_login_at: new Date(),
  });

  const token = signAccessToken({
    sub: publicAdmin.id,
    email: publicAdmin.email,
    role: 'admin',
  });

  return { token, admin: publicAdmin };
}

export async function requestAdminPasswordReset(email, req) {
  const normalizedEmail = String(email || '')
    .trim()
    .toLowerCase();

  const generic = {
    success: true,
    message:
      'If an admin account exists for that email, a password reset link has been sent. Please check your inbox.',
  };

  const admin = await findAdminByEmail(normalizedEmail);
  if (!admin || !admin.is_active) {
    return generic;
  }

  const rawToken = crypto.randomBytes(TOKEN_BYTES).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + mailConfig.resetExpiresMinutes * 60 * 1000);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(
      `UPDATE admin_password_reset_tokens
       SET used_at = UTC_TIMESTAMP()
       WHERE admin_id = :adminId
         AND used_at IS NULL
         AND expires_at > UTC_TIMESTAMP()`,
      { adminId: admin.id }
    );

    await connection.query(
      `INSERT INTO admin_password_reset_tokens
        (admin_id, token_hash, expires_at, requested_ip, user_agent)
       VALUES
        (:adminId, :tokenHash, :expiresAt, :requestedIp, :userAgent)`,
      {
        adminId: admin.id,
        tokenHash,
        expiresAt: toMysqlDateTimeUtc(expiresAt),
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

  const resetUrl = buildAppUrl(
    `/admin/reset-password?token=${encodeURIComponent(rawToken)}`
  );
  const mail = buildAdminPasswordResetEmail({
    name: admin.name,
    resetUrl,
    expiresMinutes: mailConfig.resetExpiresMinutes,
  });

  await sendAppMail({
    mailType: 'admin_password_reset',
    to: admin.email,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    meta: { adminId: admin.id },
  });

  return generic;
}

export async function resetAdminPasswordWithToken({ token, newPassword }) {
  const rawToken = String(token || '').trim();
  const tokenHash = hashToken(rawToken);
  const plainPassword = String(newPassword || '');

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `SELECT t.id AS token_id, t.admin_id, a.is_active
       FROM admin_password_reset_tokens t
       INNER JOIN admins a ON a.id = t.admin_id
       WHERE t.token_hash = :tokenHash
         AND t.used_at IS NULL
         AND t.expires_at > UTC_TIMESTAMP()
       LIMIT 1
       FOR UPDATE`,
      { tokenHash }
    );

    const row = rows[0];
    if (!row || !row.is_active) {
      throw httpError('This reset link is invalid or has expired', 400, [
        { field: 'token', message: 'This reset link is invalid or has expired' },
      ]);
    }

    await connection.query(
      `UPDATE admins
       SET password = :password
       WHERE id = :adminId`,
      { password: plainPassword, adminId: row.admin_id }
    );

    await connection.query(
      `UPDATE admin_password_reset_tokens
       SET used_at = UTC_TIMESTAMP()
       WHERE id = :tokenId`,
      { tokenId: row.token_id }
    );

    // Invalidate any other unused tokens for this admin.
    await connection.query(
      `UPDATE admin_password_reset_tokens
       SET used_at = UTC_TIMESTAMP()
       WHERE admin_id = :adminId
         AND used_at IS NULL
         AND id <> :tokenId`,
      { adminId: row.admin_id, tokenId: row.token_id }
    );

    await connection.commit();
    return { success: true, message: 'Password updated successfully. You can sign in now.' };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

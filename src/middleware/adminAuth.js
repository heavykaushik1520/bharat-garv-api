import pool from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { mapPublicAdmin, PUBLIC_ADMIN_SELECT } from '../utils/adminMapper.js';

function unauthorized(message = 'Please sign in as an admin to continue') {
  const error = new Error(message);
  error.statusCode = 401;
  return error;
}

async function loadAdminFromToken(header) {
  const [scheme, token] = String(header || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw unauthorized();
  }

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch {
    throw unauthorized('Admin session expired. Please sign in again.');
  }

  if (decoded.role !== 'admin') {
    throw unauthorized('Admin access required.');
  }

  const adminId = Number(decoded.sub);
  if (!Number.isInteger(adminId) || adminId <= 0) {
    throw unauthorized('Invalid admin session. Please sign in again.');
  }

  const [rows] = await pool.query(
    `SELECT ${PUBLIC_ADMIN_SELECT}
     FROM admins a
     WHERE a.id = :id
     LIMIT 1`,
    { id: adminId }
  );

  if (!rows.length) {
    throw unauthorized('Admin account not found. Please sign in again.');
  }

  if (!rows[0].is_active) {
    throw unauthorized('This admin account is deactivated.');
  }

  return {
    admin: mapPublicAdmin(rows[0]),
    token,
  };
}

export const requireAdminAuth = asyncHandler(async (req, _res, next) => {
  const session = await loadAdminFromToken(req.headers.authorization);
  req.admin = session.admin;
  req.adminToken = session.token;
  next();
});

/** Attaches req.admin when a valid admin token is present; never fails. */
export const optionalAdminAuth = asyncHandler(async (req, _res, next) => {
  try {
    if (req.headers.authorization) {
      const session = await loadAdminFromToken(req.headers.authorization);
      req.admin = session.admin;
      req.adminToken = session.token;
    }
  } catch {
    req.admin = null;
    req.adminToken = null;
  }
  next();
});

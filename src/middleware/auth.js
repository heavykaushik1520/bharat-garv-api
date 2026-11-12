import pool from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { mapPublicUser, PUBLIC_USER_SELECT } from '../utils/userMapper.js';

function unauthorized(message = 'Please sign in to continue') {
  const error = new Error(message);
  error.statusCode = 401;
  return error;
}

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw unauthorized();
  }

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch {
    throw unauthorized('Session expired. Please sign in again.');
  }

  const userId = Number(decoded.sub);
  if (!Number.isInteger(userId) || userId <= 0) {
    throw unauthorized('Invalid session. Please sign in again.');
  }

  const [rows] = await pool.query(
    `SELECT ${PUBLIC_USER_SELECT}
     FROM users u
     INNER JOIN schools s ON s.id = u.school_id
     WHERE u.id = :id
     LIMIT 1`,
    { id: userId }
  );

  if (!rows.length) {
    throw unauthorized('Account not found. Please sign in again.');
  }

  if (!rows[0].is_active) {
    throw unauthorized('Your account is deactivated. Contact support.');
  }

  req.user = mapPublicUser(rows[0]);
  req.token = token;
  next();
});

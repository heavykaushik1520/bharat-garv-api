import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

function getJwtSecret() {
  return process.env.JWT_SECRET || 'dev-only-change-me-bharat-garv';
}

function getJwtExpiresIn() {
  return process.env.JWT_EXPIRES_IN || '7d';
}

export function signAccessToken(payload) {
  const { sub, ...claims } = payload;
  return jwt.sign(claims, getJwtSecret(), {
    expiresIn: getJwtExpiresIn(),
    subject: String(sub),
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, getJwtSecret());
}

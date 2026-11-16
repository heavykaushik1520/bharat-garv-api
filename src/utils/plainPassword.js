import crypto from 'crypto';

/**
 * Constant-time-ish plain-string compare for admin passwords stored in plaintext.
 */
export function plainPasswordsMatch(stored, provided) {
  const left = Buffer.from(String(stored ?? ''), 'utf8');
  const right = Buffer.from(String(provided ?? ''), 'utf8');

  if (left.length !== right.length) {
    // Spend comparable work even on length mismatch.
    crypto.timingSafeEqual(left, left);
    return false;
  }

  return crypto.timingSafeEqual(left, right);
}

import { asyncHandler } from '../utils/asyncHandler.js';
import { httpError } from '../utils/httpError.js';

function toBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (value === undefined || value === null || value === '') return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function parseOptions(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== 'string' || !raw.trim()) {
    throw httpError('Options are required', 400, [
      { field: 'options', message: 'Options are required' },
    ]);
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error('Options must be an array');
    }
    return parsed;
  } catch {
    throw httpError('Options must be valid JSON', 400, [
      { field: 'options', message: 'Options must be valid JSON' },
    ]);
  }
}

/**
 * Normalizes multipart form fields so Zod validators can stay shared
 * between JSON and multipart question endpoints.
 */
export const parseQuestionMultipart = asyncHandler(async (req, _res, next) => {
  const body = req.body || {};

  req.body = {
    headlineEn: body.headlineEn,
    headlineHi: body.headlineHi,
    headlineMr: body.headlineMr,
    hasImage: toBoolean(body.hasImage, false),
    keepExistingImage: toBoolean(body.keepExistingImage, false),
    options: parseOptions(body.options),
    ...(body.sortOrder !== undefined && body.sortOrder !== ''
      ? { sortOrder: body.sortOrder }
      : {}),
  };

  next();
});

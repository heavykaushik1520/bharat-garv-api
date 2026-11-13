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

function parseQuestions(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== 'string' || !raw.trim()) {
    throw httpError('At least one question is required', 400, [
      { field: 'questions', message: 'At least one question is required' },
    ]);
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error('Questions must be an array');
    }
    return parsed;
  } catch {
    throw httpError('Questions must be valid JSON', 400, [
      { field: 'questions', message: 'Questions must be valid JSON' },
    ]);
  }
}

function collectQuestionImageFiles(files = []) {
  const byIndex = new Map();

  for (const file of files) {
    const match = String(file.fieldname || '').match(/^image_(\d+)$/);
    if (!match) {
      throw httpError('Unexpected file field', 400, [
        {
          field: 'image',
          message: 'Use image_0, image_1, … matching each question that includes an image',
        },
      ]);
    }

    const index = Number(match[1]);
    if (byIndex.has(index)) {
      throw httpError('Duplicate image upload for the same question', 400, [
        { field: `questions.${index}.image`, message: 'Only one image is allowed per question' },
      ]);
    }
    byIndex.set(index, file);
  }

  return byIndex;
}

/**
 * Normalizes JSON or multipart section-create payloads so Zod stays shared.
 * Multipart may include question images as image_0, image_1, …
 */
export const parseSectionCreateMultipart = asyncHandler(async (req, _res, next) => {
  const body = req.body || {};
  const questions = parseQuestions(body.questions).map((question) => ({
    ...question,
    hasImage: toBoolean(question?.hasImage, false),
  }));

  req.sectionQuestionFiles = collectQuestionImageFiles(req.files || []);

  req.body = {
    titleEn: body.titleEn,
    titleHi: body.titleHi,
    titleMr: body.titleMr,
    subtitleEn: body.subtitleEn,
    subtitleHi: body.subtitleHi,
    subtitleMr: body.subtitleMr,
    youtubeUrlEn: body.youtubeUrlEn,
    youtubeUrlHi: body.youtubeUrlHi,
    youtubeUrlMr: body.youtubeUrlMr,
    questions,
    ...(body.sortOrder !== undefined && body.sortOrder !== ''
      ? { sortOrder: body.sortOrder }
      : {}),
  };

  next();
});

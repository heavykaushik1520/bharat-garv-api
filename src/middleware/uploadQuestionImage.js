import fs from 'fs/promises';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import {
  ALLOWED_QUESTION_IMAGE_EXT,
  ALLOWED_QUESTION_IMAGE_MIME,
  MAX_QUESTION_IMAGE_BYTES,
  QUESTION_IMAGE_DIR,
  toPublicQuestionImagePath,
} from '../config/uploads.js';
import { httpError } from '../utils/httpError.js';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, QUESTION_IMAGE_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ALLOWED_QUESTION_IMAGE_EXT.has(ext) ? ext : '.jpg';
    const name = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${safeExt}`;
    cb(null, name);
  },
});

function fileFilter(_req, file, cb) {
  const mime = String(file.mimetype || '').toLowerCase();
  const ext = path.extname(file.originalname || '').toLowerCase();

  if (!ALLOWED_QUESTION_IMAGE_MIME.has(mime)) {
    return cb(
      httpError('Only JPG, PNG, WEBP, or GIF images are allowed', 400, [
        { field: 'image', message: 'Only JPG, PNG, WEBP, or GIF images are allowed' },
      ])
    );
  }

  if (!ALLOWED_QUESTION_IMAGE_EXT.has(ext)) {
    return cb(
      httpError('Invalid image file extension', 400, [
        { field: 'image', message: 'Use a .jpg, .jpeg, .png, .webp, or .gif file' },
      ])
    );
  }

  return cb(null, true);
}

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_QUESTION_IMAGE_BYTES,
    files: 1,
    fields: 20,
    fieldSize: 256 * 1024,
  },
  fileFilter,
});

export const uploadQuestionImage = upload.single('image');

export async function safeUnlinkPublicImage(publicUrl) {
  try {
    const { absolutePathFromPublicUrl } = await import('../config/uploads.js');
    const absolute = absolutePathFromPublicUrl(publicUrl);
    if (!absolute) return;
    await fs.unlink(absolute);
  } catch {
    // Ignore missing files / unlink races
  }
}

export async function safeUnlinkUploadedFile(file) {
  if (!file?.path) return;
  try {
    await fs.unlink(file.path);
  } catch {
    // Ignore missing files
  }
}

export function uploadedQuestionImagePublicPath(file) {
  if (!file?.filename) return null;
  return toPublicQuestionImagePath(file.filename);
}

export function cleanupUploadOnError(error, req, _res, next) {
  if (req.file?.path) {
    fs.unlink(req.file.path).catch(() => {});
  }
  next(error);
}

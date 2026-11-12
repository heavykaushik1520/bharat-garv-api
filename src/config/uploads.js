import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const UPLOAD_ROOT = path.resolve(__dirname, '../../uploads');
export const QUESTION_IMAGE_DIR = path.join(UPLOAD_ROOT, 'questions');
export const QUESTION_IMAGE_PUBLIC_PREFIX = '/uploads/questions';

export const MAX_QUESTION_IMAGE_BYTES = 2 * 1024 * 1024;
export const ALLOWED_QUESTION_IMAGE_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]);

export const ALLOWED_QUESTION_IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

export function ensureUploadDirs() {
  fs.mkdirSync(QUESTION_IMAGE_DIR, { recursive: true });
}

export function toPublicQuestionImagePath(filename) {
  return `${QUESTION_IMAGE_PUBLIC_PREFIX}/${filename}`;
}

export function absolutePathFromPublicUrl(publicUrl) {
  if (!publicUrl || typeof publicUrl !== 'string') return null;
  if (!publicUrl.startsWith(`${QUESTION_IMAGE_PUBLIC_PREFIX}/`)) return null;
  const filename = path.basename(publicUrl);
  if (!filename || filename.includes('..')) return null;
  return path.join(QUESTION_IMAGE_DIR, filename);
}

ensureUploadDirs();

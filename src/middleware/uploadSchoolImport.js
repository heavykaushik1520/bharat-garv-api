import multer from 'multer';
import path from 'path';
import { httpError } from '../utils/httpError.js';

const ALLOWED_EXT = new Set(['.xlsx', '.csv']);
const ALLOWED_MIME = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'application/csv',
  'text/plain',
  'application/octet-stream',
]);

const MAX_BYTES = 5 * 1024 * 1024; // 5MB

const storage = multer.memoryStorage();

function fileFilter(_req, file, cb) {
  const mime = String(file.mimetype || '').toLowerCase();
  const ext = path.extname(file.originalname || '').toLowerCase();

  if (!ALLOWED_EXT.has(ext)) {
    return cb(
      httpError('Only .xlsx or .csv files are allowed', 400, [
        { field: 'file', message: 'Upload an .xlsx or .csv file' },
      ])
    );
  }

  if (mime && !ALLOWED_MIME.has(mime)) {
    return cb(
      httpError('Unsupported file type. Use .xlsx or .csv', 400, [
        { field: 'file', message: 'Unsupported file type. Use .xlsx or .csv' },
      ])
    );
  }

  return cb(null, true);
}

export const uploadSchoolImport = multer({
  storage,
  limits: {
    fileSize: MAX_BYTES,
    files: 1,
    fields: 5,
    fieldSize: 16 * 1024,
  },
  fileFilter,
}).single('file');

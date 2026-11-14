import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  exportAdminStudents,
  getAdminStudent,
  listAdminStudents,
  updateAdminStudentStatus,
} from '../controllers/adminStudentsController.js';
import { validate } from '../middleware/validate.js';
import {
  exportAdminStudentsSchema,
  listAdminStudentsSchema,
  studentIdParamSchema,
  updateStudentStatusSchema,
} from '../validators/studentValidators.js';

const router = Router();

const readLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 180,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again shortly.',
  },
});

const exportLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many exports. Please wait a moment and try again.',
  },
});

const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many changes. Please wait a moment and try again.',
  },
});

router.get('/', readLimiter, validate(listAdminStudentsSchema), listAdminStudents);
// Registered before /:id so "export" is never treated as a student id.
router.get('/export', exportLimiter, validate(exportAdminStudentsSchema), exportAdminStudents);
router.get('/:id', readLimiter, validate(studentIdParamSchema), getAdminStudent);
router.patch(
  '/:id/status',
  writeLimiter,
  validate(updateStudentStatusSchema),
  updateAdminStudentStatus
);

export default router;

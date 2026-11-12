import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  getAdminStudent,
  listAdminStudents,
  updateAdminStudentStatus,
} from '../controllers/adminStudentsController.js';
import { validate } from '../middleware/validate.js';
import {
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
router.get('/:id', readLimiter, validate(studentIdParamSchema), getAdminStudent);
router.patch(
  '/:id/status',
  writeLimiter,
  validate(updateStudentStatusSchema),
  updateAdminStudentStatus
);

export default router;

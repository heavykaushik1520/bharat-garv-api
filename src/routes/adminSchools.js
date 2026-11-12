import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  createAdminSchool,
  deleteAdminSchool,
  getAdminSchool,
  listAdminSchools,
  updateAdminSchool,
} from '../controllers/adminSchoolsController.js';
import { validate } from '../middleware/validate.js';
import {
  createSchoolSchema,
  listAdminSchoolsSchema,
  schoolIdParamSchema,
  updateSchoolSchema,
} from '../validators/schoolValidators.js';

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

router.get('/', readLimiter, validate(listAdminSchoolsSchema), listAdminSchools);
router.get('/:id', readLimiter, validate(schoolIdParamSchema), getAdminSchool);
router.post('/', writeLimiter, validate(createSchoolSchema), createAdminSchool);
router.put('/:id', writeLimiter, validate(updateSchoolSchema), updateAdminSchool);
router.delete('/:id', writeLimiter, validate(schoolIdParamSchema), deleteAdminSchool);

export default router;

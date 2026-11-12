import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { getSchool, listSchools } from '../controllers/schoolsController.js';
import { validate } from '../middleware/validate.js';
import {
  listPublicSchoolsSchema,
  publicSchoolIdParamSchema,
} from '../validators/publicSchoolValidators.js';

const router = Router();

const schoolsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 180,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
  },
});

router.get('/', schoolsLimiter, validate(listPublicSchoolsSchema), listSchools);
router.get('/:id', schoolsLimiter, validate(publicSchoolIdParamSchema), getSchool);

export default router;

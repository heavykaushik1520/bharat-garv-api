import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  createAdminProgram,
  deleteAdminProgram,
  getAdminProgram,
  listAdminPrograms,
  updateAdminProgram,
} from '../controllers/adminProgramsController.js';
import { validate } from '../middleware/validate.js';
import {
  createProgramSchema,
  listAdminProgramsSchema,
  programIdParamSchema,
  updateProgramSchema,
} from '../validators/programValidators.js';

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

router.get('/', readLimiter, validate(listAdminProgramsSchema), listAdminPrograms);
router.get('/:id', readLimiter, validate(programIdParamSchema), getAdminProgram);
router.post('/', writeLimiter, validate(createProgramSchema), createAdminProgram);
router.put('/:id', writeLimiter, validate(updateProgramSchema), updateAdminProgram);
router.delete('/:id', writeLimiter, validate(programIdParamSchema), deleteAdminProgram);

export default router;

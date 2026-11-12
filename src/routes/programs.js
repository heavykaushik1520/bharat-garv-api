import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  getPublicProgram,
  listPublicPrograms,
  reportSectionVideoProgress,
  submitPublicSection,
} from '../controllers/programsController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  publicProgramIdSchema,
  submitSectionSchema,
  videoProgressSchema,
} from '../validators/programContentValidators.js';

const router = Router();

const readLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 240,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again shortly.',
  },
});

const submitLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many submissions. Please wait a moment and try again.',
  },
});

const videoProgressLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many progress updates. Please wait a moment.',
  },
});

// Catalog is public so the competition page can show participate cards.
// Program detail, video progress, and quiz submit stay authenticated.
router.get('/', readLimiter, listPublicPrograms);
router.get('/:id', requireAuth, readLimiter, validate(publicProgramIdSchema), getPublicProgram);
router.post(
  '/:programId/sections/:sectionId/video-progress',
  requireAuth,
  videoProgressLimiter,
  validate(videoProgressSchema),
  reportSectionVideoProgress
);
router.post(
  '/:programId/sections/:sectionId/submit',
  requireAuth,
  submitLimiter,
  validate(submitSectionSchema),
  submitPublicSection
);

export default router;

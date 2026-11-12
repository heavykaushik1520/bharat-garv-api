import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  createAdminQuestion,
  createAdminSection,
  deleteAdminQuestion,
  deleteAdminSection,
  getAdminProgramTree,
  updateAdminQuestion,
  updateAdminSection,
} from '../controllers/adminProgramContentController.js';
import { parseQuestionMultipart } from '../middleware/parseQuestionMultipart.js';
import {
  cleanupUploadOnError,
  uploadQuestionImage,
} from '../middleware/uploadQuestionImage.js';
import { validate } from '../middleware/validate.js';
import {
  createQuestionSchema,
  createSectionSchema,
  programSectionIdParamsSchema,
  programSectionParamsSchema,
  questionIdParamsSchema,
  updateQuestionSchema,
  updateSectionSchema,
} from '../validators/programContentValidators.js';

const router = Router({ mergeParams: true });

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

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many uploads. Please wait a moment and try again.',
  },
});

function runUpload(req, res, next) {
  uploadQuestionImage(req, res, (error) => {
    if (!error) return next();
    return cleanupUploadOnError(error, req, res, next);
  });
}

const questionWriteChain = [
  uploadLimiter,
  runUpload,
  parseQuestionMultipart,
  // validate runs after upload; failed validation is cleaned in errorHandler
];

router.get('/tree', readLimiter, validate(programSectionParamsSchema), getAdminProgramTree);

router.post('/sections', writeLimiter, validate(createSectionSchema), createAdminSection);
router.put(
  '/sections/:sectionId',
  writeLimiter,
  validate(updateSectionSchema),
  updateAdminSection
);
router.delete(
  '/sections/:sectionId',
  writeLimiter,
  validate(programSectionIdParamsSchema),
  deleteAdminSection
);

router.post(
  '/sections/:sectionId/questions',
  ...questionWriteChain,
  validate(createQuestionSchema),
  createAdminQuestion
);
router.put(
  '/sections/:sectionId/questions/:questionId',
  ...questionWriteChain,
  validate(updateQuestionSchema),
  updateAdminQuestion
);
router.delete(
  '/sections/:sectionId/questions/:questionId',
  writeLimiter,
  validate(questionIdParamsSchema),
  deleteAdminQuestion
);

export default router;

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  downloadMyCertificate,
  listMyCertificates,
  regenerateMyCertificate,
} from '../controllers/studentCertificatesController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  listMyCertificatesSchema,
  myCertificateProgramParamSchema,
} from '../validators/certificateValidators.js';

const router = Router();

const readLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many certificate requests. Please try again shortly.',
  },
});

const downloadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many certificate downloads. Please try again shortly.',
  },
});

const regenerateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many regenerate requests. Please wait a few minutes and try again.',
  },
});

router.use(requireAuth);

router.get('/', readLimiter, validate(listMyCertificatesSchema), listMyCertificates);
router.get(
  '/:programId/download',
  downloadLimiter,
  validate(myCertificateProgramParamSchema),
  downloadMyCertificate
);
router.post(
  '/:programId/regenerate',
  regenerateLimiter,
  validate(myCertificateProgramParamSchema),
  regenerateMyCertificate
);

export default router;

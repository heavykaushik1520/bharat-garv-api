import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  getAdminAnalyticsClasses,
  getAdminAnalyticsDashboard,
  getAdminAnalyticsSchools,
  getAdminAnalyticsToppers,
} from '../controllers/adminAnalyticsController.js';
import { validate } from '../middleware/validate.js';
import {
  analyticsDashboardSchema,
  analyticsProgramFilterSchema,
  analyticsSchoolsSchema,
  analyticsToppersSchema,
} from '../validators/analyticsValidators.js';

const router = Router();

const readLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many analytics requests. Please try again shortly.',
  },
});

router.get(
  '/dashboard',
  readLimiter,
  validate(analyticsDashboardSchema),
  getAdminAnalyticsDashboard
);

router.get(
  '/schools',
  readLimiter,
  validate(analyticsSchoolsSchema),
  getAdminAnalyticsSchools
);

router.get(
  '/classes',
  readLimiter,
  validate(analyticsProgramFilterSchema),
  getAdminAnalyticsClasses
);

router.get(
  '/toppers',
  readLimiter,
  validate(analyticsToppersSchema),
  getAdminAnalyticsToppers
);

export default router;

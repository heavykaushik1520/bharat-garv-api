import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  createAdmin,
  forgotPassword,
  login,
  me,
  resetPassword,
} from '../controllers/adminAuthController.js';
import { optionalAdminAuth, requireAdminAuth } from '../middleware/adminAuth.js';
import { validate } from '../middleware/validate.js';
import {
  adminForgotPasswordSchema,
  adminLoginSchema,
  adminResetPasswordSchema,
  createAdminSchema,
} from '../validators/adminAuthValidators.js';

const router = Router();

const createLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many admin creation attempts. Please try again later.',
  },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many sign-in attempts. Please try again later.',
  },
});

const forgotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many password reset requests. Please try again later.',
  },
});

const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many password reset attempts. Please try again later.',
  },
});

const meLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please slow down.',
  },
});

// API-only bootstrap / invite endpoint — no frontend UI.
router.post(
  '/create',
  createLimiter,
  optionalAdminAuth,
  validate(createAdminSchema),
  createAdmin
);

router.post('/login', loginLimiter, validate(adminLoginSchema), login);
router.post(
  '/forgot-password',
  forgotLimiter,
  validate(adminForgotPasswordSchema),
  forgotPassword
);
router.post(
  '/reset-password',
  resetLimiter,
  validate(adminResetPasswordSchema),
  resetPassword
);
router.get('/me', requireAdminAuth, meLimiter, me);

export default router;

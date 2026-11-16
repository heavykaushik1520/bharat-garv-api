import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { submitContactMessage } from '../controllers/contactController.js';
import { validate } from '../middleware/validate.js';
import { contactMessageSchema } from '../validators/contactValidators.js';

const router = Router();

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many contact messages. Please try again later.',
  },
});

router.post('/', contactLimiter, validate(contactMessageSchema), submitContactMessage);

export default router;

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  createAdminSchool,
  deleteAdminSchool,
  downloadSchoolImportTemplate,
  getAdminSchool,
  importAdminSchools,
  listAdminSchools,
  updateAdminSchool,
} from '../controllers/adminSchoolsController.js';
import { uploadSchoolImport } from '../middleware/uploadSchoolImport.js';
import { validate } from '../middleware/validate.js';
import {
  createSchoolSchema,
  listAdminSchoolsSchema,
  schoolIdParamSchema,
  schoolImportTemplateSchema,
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

const importLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many import attempts. Please try again later.',
  },
});

router.get('/', readLimiter, validate(listAdminSchoolsSchema), listAdminSchools);
router.get(
  '/import/template',
  readLimiter,
  validate(schoolImportTemplateSchema),
  downloadSchoolImportTemplate
);
router.post('/import', importLimiter, uploadSchoolImport, importAdminSchools);
router.get('/:id', readLimiter, validate(schoolIdParamSchema), getAdminSchool);
router.post('/', writeLimiter, validate(createSchoolSchema), createAdminSchool);
router.put('/:id', writeLimiter, validate(updateSchoolSchema), updateAdminSchool);
router.delete('/:id', writeLimiter, validate(schoolIdParamSchema), deleteAdminSchool);

export default router;

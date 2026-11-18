import { z } from 'zod';
import { normalizeSchoolText } from '../utils/schoolLabel.js';

const schoolNameSchema = z
  .string({ required_error: 'School name is required' })
  .transform((value) => normalizeSchoolText(value))
  .pipe(
    z
      .string()
      .min(2, 'School name must be at least 2 characters')
      .max(180, 'School name must be at most 180 characters')
      .refine((value) => /[A-Za-z0-9]/.test(value), {
        message: 'School name must include letters or numbers',
      })
  );

const schoolWardSchema = z
  .string({ required_error: 'Ward is required' })
  .transform((value) => normalizeSchoolText(value))
  .pipe(
    z
      .string()
      .min(1, 'Ward is required')
      .max(120, 'Ward must be at most 120 characters')
      .refine((value) => /[A-Za-z0-9]/.test(value), {
        message: 'Ward must include letters or numbers',
      })
  );

const schoolMediumSchema = z
  .string({ required_error: 'Medium is required' })
  .transform((value) => normalizeSchoolText(value))
  .pipe(
    z
      .string()
      .min(1, 'Medium is required')
      .max(80, 'Medium must be at most 80 characters')
      .refine((value) => /[A-Za-z0-9]/.test(value), {
        message: 'Medium must include letters or numbers',
      })
  );

export const createSchoolSchema = z.object({
  body: z
    .object({
      name: schoolNameSchema,
      ward: schoolWardSchema,
      medium: schoolMediumSchema,
    })
    .strict(),
});

export const updateSchoolSchema = z.object({
  params: z.object({
    id: z.coerce
      .number({ invalid_type_error: 'Invalid school id' })
      .int('Invalid school id')
      .positive('Invalid school id'),
  }),
  body: z
    .object({
      name: schoolNameSchema,
      ward: schoolWardSchema,
      medium: schoolMediumSchema,
    })
    .strict(),
});

export const schoolIdParamSchema = z.object({
  params: z.object({
    id: z.coerce
      .number({ invalid_type_error: 'Invalid school id' })
      .int('Invalid school id')
      .positive('Invalid school id'),
  }),
});

export const listAdminSchoolsSchema = z.object({
  query: z.object({
    search: z
      .string()
      .trim()
      .max(180, 'Search text is too long')
      .optional()
      .default(''),
    page: z.coerce
      .number()
      .int()
      .min(1, 'Page must be at least 1')
      .optional()
      .default(1),
    limit: z.coerce
      .number()
      .int()
      .min(1, 'Limit must be at least 1')
      .max(100, 'Limit cannot exceed 100')
      .optional()
      .default(10),
  }),
});

export const schoolImportTemplateSchema = z.object({
  query: z.object({
    format: z
      .enum(['xlsx', 'csv'], {
        invalid_type_error: 'Format must be xlsx or csv',
      })
      .optional()
      .default('xlsx'),
  }),
});

export { schoolNameSchema, schoolWardSchema, schoolMediumSchema };

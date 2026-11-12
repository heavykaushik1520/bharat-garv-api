import { z } from 'zod';

const schoolNameSchema = z
  .string({ required_error: 'School name is required' })
  .trim()
  .min(2, 'School name must be at least 2 characters')
  .max(180, 'School name must be at most 180 characters')
  .refine((value) => /[A-Za-z0-9]/.test(value), {
    message: 'School name must include letters or numbers',
  });

export const createSchoolSchema = z.object({
  body: z
    .object({
      name: schoolNameSchema,
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

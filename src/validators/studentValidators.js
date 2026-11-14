import { z } from 'zod';

const emptyToUndefined = (value) => {
  if (value === '' || value === undefined || value === null) return undefined;
  return value;
};

const PAGE_LIMITS = [10, 25, 50, 100];

const idParam = z.coerce
  .number({ invalid_type_error: 'Invalid student id' })
  .int('Invalid student id')
  .positive('Invalid student id');

export const studentIdParamSchema = z.object({
  params: z.object({
    id: idParam,
  }),
});

const studentListFiltersSchema = z.object({
  search: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(180, 'Search text is too long').optional().default('')
  ),
  schoolId: z.preprocess(
    emptyToUndefined,
    z.coerce
      .number({ invalid_type_error: 'Invalid school filter' })
      .int('Invalid school filter')
      .positive('Invalid school filter')
      .optional()
  ),
  standard: z.preprocess(
    emptyToUndefined,
    z.coerce
      .number({ invalid_type_error: 'Invalid standard filter' })
      .int('Invalid standard filter')
      .min(5, 'Standard must be between 5 and 9')
      .max(9, 'Standard must be between 5 and 9')
      .optional()
  ),
  preferredLanguage: z.preprocess(
    emptyToUndefined,
    z
      .enum(['en', 'hi', 'mr'], {
        invalid_type_error: 'Language must be en, hi, or mr',
      })
      .optional()
  ),
  status: z.preprocess(
    emptyToUndefined,
    z.enum(['all', 'active', 'inactive']).optional().default('all')
  ),
  sort: z.preprocess(
    emptyToUndefined,
    z.enum(['newest', 'oldest', 'name_asc', 'name_desc']).optional().default('newest')
  ),
});

export const listAdminStudentsSchema = z.object({
  query: studentListFiltersSchema.extend({
    page: z.preprocess(
      emptyToUndefined,
      z.coerce.number().int().min(1, 'Page must be at least 1').optional().default(1)
    ),
    limit: z.preprocess(emptyToUndefined, z.coerce.number().int().optional().default(10)).refine(
      (value) => PAGE_LIMITS.includes(value),
      { message: 'Limit must be one of 10, 25, 50, or 100' }
    ),
  }),
});

export const exportAdminStudentsSchema = z.object({
  query: studentListFiltersSchema.extend({
    format: z.preprocess(
      emptyToUndefined,
      z
        .enum(['csv', 'xlsx'], {
          invalid_type_error: 'Format must be csv or xlsx',
        })
        .optional()
        .default('csv')
    ),
  }),
});

export const updateStudentStatusSchema = z.object({
  params: z.object({
    id: idParam,
  }),
  body: z
    .object({
      isActive: z.boolean({
        required_error: 'Status is required',
        invalid_type_error: 'Status must be true or false',
      }),
    })
    .strict(),
});

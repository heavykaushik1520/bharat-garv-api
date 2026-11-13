import { z } from 'zod';

const optionalProgramId = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') return undefined;
  return value;
}, z.coerce
  .number({ invalid_type_error: 'programId must be a number' })
  .int('programId must be an integer')
  .positive('programId must be positive')
  .optional());

const optionalSearch = z
  .string()
  .trim()
  .max(180, 'Search text is too long')
  .optional()
  .default('');

const pageSchema = z.coerce
  .number()
  .int()
  .min(1, 'Page must be at least 1')
  .optional()
  .default(1);

const limitSchema = z.coerce
  .number()
  .int()
  .min(1, 'Limit must be at least 1')
  .max(100, 'Limit cannot exceed 100')
  .optional()
  .default(20);

const topLimitSchema = z.coerce
  .number()
  .int()
  .min(1, 'Top limit must be at least 1')
  .max(50, 'Top limit cannot exceed 50')
  .optional()
  .default(5);

const schoolSortSchema = z
  .enum(['participants_desc', 'participants_asc', 'name_asc', 'name_desc', 'accuracy_desc'])
  .optional()
  .default('participants_desc');

export const analyticsDashboardSchema = z.object({
  query: z
    .object({
      programId: optionalProgramId,
      topLimit: topLimitSchema,
      schoolPage: pageSchema,
      schoolLimit: limitSchema,
      schoolSearch: optionalSearch,
      schoolSort: schoolSortSchema,
    })
    .strict(),
});

export const analyticsSchoolsSchema = z.object({
  query: z
    .object({
      programId: optionalProgramId,
      search: optionalSearch,
      page: pageSchema,
      limit: limitSchema,
      sort: schoolSortSchema,
    })
    .strict(),
});

export const analyticsToppersSchema = z.object({
  query: z
    .object({
      programId: optionalProgramId,
      limit: topLimitSchema,
    })
    .strict(),
});

export const analyticsProgramFilterSchema = z.object({
  query: z
    .object({
      programId: optionalProgramId,
    })
    .strict(),
});

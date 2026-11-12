import { z } from 'zod';

const emptyToUndefined = (value) => {
  if (value === '' || value === undefined || value === null) return undefined;
  return value;
};

export const listPublicSchoolsSchema = z.object({
  query: z.object({
    search: z.preprocess(
      emptyToUndefined,
      z.string().trim().max(180, 'Search text is too long').optional().default('')
    ),
    limit: z.preprocess(
      emptyToUndefined,
      z.coerce
        .number()
        .int()
        .min(1, 'Limit must be at least 1')
        .max(50, 'Limit cannot exceed 50')
        .optional()
        .default(20)
    ),
  }),
});

export const publicSchoolIdParamSchema = z.object({
  params: z.object({
    id: z.coerce
      .number({ invalid_type_error: 'Invalid school id' })
      .int('Invalid school id')
      .positive('Invalid school id'),
  }),
});

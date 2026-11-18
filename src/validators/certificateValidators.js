import { z } from 'zod';

const programIdParam = z.coerce
  .number({ invalid_type_error: 'Invalid programme id' })
  .int('Invalid programme id')
  .positive('Invalid programme id');

export const listMyCertificatesSchema = z.object({
  query: z.object({
    limit: z.coerce
      .number()
      .int()
      .min(1, 'Limit must be at least 1')
      .max(50, 'Limit cannot exceed 50')
      .optional()
      .default(50),
  }),
});

export const myCertificateProgramParamSchema = z.object({
  params: z.object({
    programId: programIdParam,
  }),
});

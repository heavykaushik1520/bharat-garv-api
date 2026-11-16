import { z } from 'zod';

const emptyToUndefined = (value) => {
  if (value === '' || value === undefined || value === null) return undefined;
  return value;
};

const headingSchema = (label) =>
  z
    .string({ required_error: `${label} is required` })
    .trim()
    .min(2, `${label} must be at least 2 characters`)
    .max(220, `${label} must be at most 220 characters`);

/** Accepts numeric id or URL slug. */
export const programRefParam = z
  .string({ required_error: 'Program is required' })
  .trim()
  .min(1, 'Program is required')
  .max(190, 'Program reference is too long')
  .regex(/^[a-zA-Z0-9-]+$/, 'Invalid program reference');

const programSlugBodySchema = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .trim()
    .max(180, 'Slug must be at most 180 characters')
    .regex(/^[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*$/, 'Use lowercase letters, numbers, and hyphens only')
    .optional()
);

const dateOnlyBodySchema = (fieldLabel) =>
  z
    .string({ required_error: `${fieldLabel} is required` })
    .trim()
    .min(1, `${fieldLabel} is required`)
    .max(40, `${fieldLabel} is invalid`)
    .refine((value) => {
      const datePart = (value.includes('T') ? value.slice(0, 10) : value.slice(0, 10)).trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return false;
      const [y, m, d] = datePart.split('-').map(Number);
      const probe = new Date(Date.UTC(y, m - 1, d));
      return (
        !Number.isNaN(probe.getTime()) &&
        probe.getUTCFullYear() === y &&
        probe.getUTCMonth() === m - 1 &&
        probe.getUTCDate() === d
      );
    }, `${fieldLabel} must be a valid date`);

const programBodyBase = {
  headingEn: headingSchema('English heading'),
  headingHi: headingSchema('Hindi heading'),
  headingMr: headingSchema('Marathi heading'),
  slug: programSlugBodySchema,
  startsAt: dateOnlyBodySchema('Start date'),
  endsAt: dateOnlyBodySchema('End date'),
};

function refineScheduleWindow(body, ctx) {
  const startDay = (body.startsAt.includes('T') ? body.startsAt : body.startsAt).slice(0, 10);
  const endDay = (body.endsAt.includes('T') ? body.endsAt : body.endsAt).slice(0, 10);
  if (endDay < startDay) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['endsAt'],
      message: 'End date must be on or after start date',
    });
  }
}

export const createProgramSchema = z.object({
  body: z
    .object(programBodyBase)
    .strict()
    .superRefine(refineScheduleWindow),
});

export const updateProgramSchema = z.object({
  params: z.object({
    id: programRefParam,
  }),
  body: z
    .object(programBodyBase)
    .strict()
    .superRefine(refineScheduleWindow),
});

export const programIdParamSchema = z.object({
  params: z.object({
    id: programRefParam,
  }),
});

export const listAdminProgramsSchema = z.object({
  query: z.object({
    search: z.preprocess(
      emptyToUndefined,
      z.string().trim().max(220, 'Search text is too long').optional().default('')
    ),
    page: z.preprocess(
      emptyToUndefined,
      z.coerce.number().int().min(1, 'Page must be at least 1').optional().default(1)
    ),
    limit: z.preprocess(
      emptyToUndefined,
      z.coerce
        .number()
        .int()
        .min(1, 'Limit must be at least 1')
        .max(100, 'Limit cannot exceed 100')
        .optional()
        .default(10)
    ),
  }),
});

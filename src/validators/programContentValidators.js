import { z } from 'zod';
import { programRefParam } from './programValidators.js';
import { normalizeYoutubeUrl } from '../utils/youtube.js';

const emptyToUndefined = (value) => {
  if (value === '' || value === undefined || value === null) return undefined;
  return value;
};

const idParam = (label = 'id') =>
  z.coerce
    .number({ invalid_type_error: `Invalid ${label}` })
    .int(`Invalid ${label}`)
    .positive(`Invalid ${label}`);

const text = (label, min, max) =>
  z
    .string({ required_error: `${label} is required` })
    .trim()
    .min(min, `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`);

const localizedTriple = (prefix, min, max) => ({
  [`${prefix}En`]: text(`English ${prefix}`, min, max),
  [`${prefix}Hi`]: text(`Hindi ${prefix}`, min, max),
  [`${prefix}Mr`]: text(`Marathi ${prefix}`, min, max),
});

const youtubeUrlSchema = z
  .string({ required_error: 'YouTube URL is required' })
  .trim()
  .min(11, 'YouTube URL is required')
  .max(500, 'YouTube URL is too long')
  .refine((value) => Boolean(normalizeYoutubeUrl(value)), {
    message: 'Enter a valid YouTube video link',
  })
  .transform((value) => normalizeYoutubeUrl(value));

const optionSchema = z
  .object({
    labelEn: text('English option', 1, 300),
    labelHi: text('Hindi option', 1, 300),
    labelMr: text('Marathi option', 1, 300),
    isCorrect: z.boolean({ required_error: 'Correct flag is required' }),
  })
  .strict();

const optionsArraySchema = z
  .array(optionSchema)
  .length(4, 'Exactly 4 options are required')
  .superRefine((options, ctx) => {
    const correctCount = options.filter((item) => item.isCorrect).length;
    if (correctCount !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Exactly one option must be marked correct',
        path: ['correctOption'],
      });
    }
  });

const questionBodyBaseSchema = z
  .object({
    ...localizedTriple('headline', 2, 400),
    hasImage: z.boolean().optional().default(false),
    keepExistingImage: z.boolean().optional().default(false),
    options: optionsArraySchema,
    sortOrder: z.preprocess(
      emptyToUndefined,
      z.coerce.number().int().min(1).max(1000).optional()
    ),
  })
  .strict();

/** Shared multipart question payload (image file is validated in middleware/controller). */
const questionBodySchema = questionBodyBaseSchema;

const sectionBodySchema = z
  .object({
    ...localizedTriple('title', 2, 220),
    ...localizedTriple('subtitle', 2, 400),
    youtubeUrl: youtubeUrlSchema,
    sortOrder: z.preprocess(
      emptyToUndefined,
      z.coerce.number().int().min(1).max(1000).optional()
    ),
  })
  .strict();

export const programSectionParamsSchema = z.object({
  params: z.object({
    programId: programRefParam,
  }),
});

export const programSectionIdParamsSchema = z.object({
  params: z.object({
    programId: programRefParam,
    sectionId: idParam('section id'),
  }),
});

export const createSectionSchema = z.object({
  params: z.object({
    programId: programRefParam,
  }),
  body: sectionBodySchema,
});

export const updateSectionSchema = z.object({
  params: z.object({
    programId: programRefParam,
    sectionId: idParam('section id'),
  }),
  body: sectionBodySchema,
});

export const createQuestionSchema = z.object({
  params: z.object({
    programId: programRefParam,
    sectionId: idParam('section id'),
  }),
  body: questionBodySchema,
});

export const updateQuestionSchema = z.object({
  params: z.object({
    programId: programRefParam,
    sectionId: idParam('section id'),
    questionId: idParam('question id'),
  }),
  body: questionBodySchema,
});

export const questionIdParamsSchema = z.object({
  params: z.object({
    programId: programRefParam,
    sectionId: idParam('section id'),
    questionId: idParam('question id'),
  }),
});

export const reorderSectionsSchema = z.object({
  params: z.object({
    programId: programRefParam,
  }),
  body: z
    .object({
      sectionIds: z
        .array(idParam('section id'))
        .min(1, 'At least one section is required')
        .max(100, 'Too many sections'),
    })
    .strict(),
});

export const submitSectionSchema = z.object({
  params: z.object({
    programId: programRefParam,
    sectionId: idParam('section id'),
  }),
  body: z
    .object({
      answers: z
        .array(
          z
            .object({
              questionId: idParam('question id'),
              optionId: idParam('option id'),
            })
            .strict()
        )
        .min(1, 'Answers are required')
        .max(100, 'Too many answers'),
    })
    .strict()
    .superRefine((data, ctx) => {
      const seen = new Set();
      for (const answer of data.answers) {
        if (seen.has(answer.questionId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Duplicate answer for the same question',
            path: ['answers'],
          });
          break;
        }
        seen.add(answer.questionId);
      }
    }),
});

export const publicProgramIdSchema = z.object({
  params: z.object({
    id: programRefParam,
  }),
});

export const videoProgressSchema = z.object({
  params: z.object({
    programId: programRefParam,
    sectionId: idParam('section id'),
  }),
  body: z
    .object({
      currentTime: z.coerce
        .number({ invalid_type_error: 'Current time is invalid' })
        .min(0, 'Current time cannot be negative')
        .max(12 * 60 * 60, 'Current time is too large'),
      duration: z.coerce
        .number({ invalid_type_error: 'Duration is invalid' })
        .min(1, 'Video duration is invalid')
        .max(12 * 60 * 60, 'Video duration is too large'),
      ended: z.boolean().optional().default(false),
    })
    .strict(),
});

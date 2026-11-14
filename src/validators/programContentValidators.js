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

const youtubeUrlSchema = (label = 'YouTube URL') =>
  z
    .string({ required_error: `${label} is required` })
    .trim()
    .min(11, `${label} is required`)
    .max(500, `${label} is too long`)
    .refine((value) => Boolean(normalizeYoutubeUrl(value)), {
      message: `Enter a valid ${label}`,
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
    ...localizedTriple('headline', 2, 1000),
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

/** Nested question payload used when creating a section atomically. */
const nestedCreateQuestionSchema = z
  .object({
    ...localizedTriple('headline', 2, 1000),
    hasImage: z.boolean().optional().default(false),
    options: optionsArraySchema,
    sortOrder: z.preprocess(
      emptyToUndefined,
      z.coerce.number().int().min(1).max(1000).optional()
    ),
  })
  .strict();

const questionsToServeSchema = z.preprocess((value) => {
  if (value === '' || value === undefined || value === null) return null;
  return value;
}, z.union([
  z.null(),
  z.coerce
    .number({ invalid_type_error: 'Questions per student must be a number' })
    .int('Questions per student must be a whole number')
    .min(1, 'Questions per student must be at least 1')
    .max(100, 'Questions per student cannot exceed 100'),
]));

const sectionMetaSchema = z
  .object({
    ...localizedTriple('title', 2, 220),
    ...localizedTriple('subtitle', 2, 400),
    youtubeUrlEn: youtubeUrlSchema('English YouTube URL'),
    youtubeUrlHi: youtubeUrlSchema('Hindi YouTube URL'),
    youtubeUrlMr: youtubeUrlSchema('Marathi YouTube URL'),
    sortOrder: z.preprocess(
      emptyToUndefined,
      z.coerce.number().int().min(1).max(1000).optional()
    ),
    questionsToServe: questionsToServeSchema.optional().default(null),
  })
  .strict();

/** Section create requires at least one fully valid question. */
const createSectionBodySchema = sectionMetaSchema
  .extend({
    questions: z
      .array(nestedCreateQuestionSchema)
      .min(1, 'Each section must include at least one question')
      .max(100, 'Too many questions for one section'),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.questionsToServe != null && data.questionsToServe > data.questions.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Questions per student (${data.questionsToServe}) cannot exceed the question bank (${data.questions.length})`,
        path: ['questionsToServe'],
      });
    }
  });

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
  body: createSectionBodySchema,
});

export const updateSectionSchema = z.object({
  params: z.object({
    programId: programRefParam,
    sectionId: idParam('section id'),
  }),
  body: sectionMetaSchema,
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

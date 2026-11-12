import { z } from 'zod';

const phoneRegex = /^[6-9]\d{9}$/;
const nameRegex = /^[A-Za-z][A-Za-z .'-]{0,78}[A-Za-z]?$/;
const divisionRegex = /^[A-Za-z0-9]{1,10}$/;
const rollRegex = /^\d{1,10}$/;

/** Shared password rules for signup / change-password */
export const passwordSchema = z
  .string({ required_error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters')
  .max(15, 'Password must be at most 15 characters')
  .refine((value) => !/\s/.test(value), {
    message: 'Password must not contain spaces',
  })
  .refine((value) => /[A-Z]/.test(value), {
    message: 'Password must include an uppercase letter',
  })
  .refine((value) => /[a-z]/.test(value), {
    message: 'Password must include a lowercase letter',
  })
  .refine((value) => /[0-9]/.test(value), {
    message: 'Password must include a number',
  })
  .refine((value) => /[^A-Za-z0-9]/.test(value), {
    message: 'Password must include a special character',
  });

const emailSchema = z
  .string({ required_error: 'Email is required' })
  .trim()
  .toLowerCase()
  .email('Enter a valid email address')
  .max(191, 'Email is too long');

const phoneSchema = z
  .string({ required_error: 'Phone number is required' })
  .trim()
  .transform((value) => value.replace(/[\s-]/g, '').replace(/^\+91/, ''))
  .refine((value) => phoneRegex.test(value), {
    message: 'Enter a valid 10-digit Indian mobile number',
  });

const firstNameSchema = z
  .string({ required_error: 'First name is required' })
  .trim()
  .min(2, 'First name must be at least 2 characters')
  .max(80, 'First name is too long')
  .regex(nameRegex, 'Enter a valid first name');

const lastNameSchema = z
  .string({ required_error: 'Last name is required' })
  .trim()
  .min(2, 'Last name must be at least 2 characters')
  .max(80, 'Last name is too long')
  .regex(nameRegex, 'Enter a valid last name');

const schoolIdSchema = z.coerce
  .number({
    required_error: 'School is required',
    invalid_type_error: 'School is required',
  })
  .int('Invalid school')
  .positive('Invalid school');

const standardSchema = z.coerce
  .number({
    required_error: 'Standard is required',
    invalid_type_error: 'Standard is required',
  })
  .int('Standard must be a whole number')
  .min(1, 'Standard must be between 1 and 9')
  .max(9, 'Standard must be between 1 and 9');

const divisionSchema = z
  .string({ required_error: 'Division is required' })
  .trim()
  .toUpperCase()
  .regex(divisionRegex, 'Enter a valid division (e.g. A, B, C)');

const rollNumberSchema = z
  .string({ required_error: 'Roll number is required' })
  .trim()
  .regex(rollRegex, 'Roll number must be digits only (max 10)');

const preferredLanguageSchema = z.enum(['en', 'hi', 'mr'], {
  required_error: 'Language is required',
  invalid_type_error: 'Language must be English, Hindi or Marathi',
});

/** Login only checks presence/length — complexity belongs to signup/change-password */
export const loginPasswordSchema = z
  .string({ required_error: 'Password is required' })
  .min(1, 'Password is required')
  .max(72, 'Password must be at most 72 characters');

export const loginSchema = z.object({
  body: z
    .object({
      email: emailSchema,
      password: loginPasswordSchema,
    })
    .strict(),
});

export const signupSchema = z.object({
  body: z
    .object({
      email: emailSchema,
      password: passwordSchema,
      phone: phoneSchema,
      firstName: firstNameSchema,
      lastName: lastNameSchema,
      schoolId: schoolIdSchema,
      standard: standardSchema,
      division: divisionSchema,
      rollNumber: rollNumberSchema,
      preferredLanguage: preferredLanguageSchema,
    })
    .strict(),
});

export const updateProfileSchema = z.object({
  body: z
    .object({
      email: emailSchema,
      phone: phoneSchema,
      firstName: firstNameSchema,
      lastName: lastNameSchema,
      schoolId: schoolIdSchema,
      standard: standardSchema,
      division: divisionSchema,
      rollNumber: rollNumberSchema,
      preferredLanguage: preferredLanguageSchema,
    })
    .strict(),
});

export const changePasswordSchema = z.object({
  body: z
    .object({
      currentPassword: loginPasswordSchema,
      newPassword: passwordSchema,
    })
    .strict()
    .refine((data) => data.currentPassword !== data.newPassword, {
      message: 'New password must be different from current password',
      path: ['newPassword'],
    }),
});

export const updateLanguageSchema = z.object({
  body: z
    .object({
      preferredLanguage: preferredLanguageSchema,
    })
    .strict(),
});

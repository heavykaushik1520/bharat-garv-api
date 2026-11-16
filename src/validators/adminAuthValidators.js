import { z } from 'zod';
import { loginPasswordSchema, passwordSchema } from './authValidators.js';

const emailSchema = z
  .string({ required_error: 'Email is required' })
  .trim()
  .transform((value) => value.replace(/\s+/g, '').toLowerCase())
  .pipe(
    z
      .string()
      .min(1, 'Email is required')
      .email('Enter a valid email address')
      .max(191, 'Email is too long')
  );

const nameSchema = z
  .string({ required_error: 'Name is required' })
  .trim()
  .min(2, 'Name must be at least 2 characters')
  .max(120, 'Name is too long')
  .regex(/^[A-Za-z][A-Za-z .'-]{0,118}[A-Za-z]?$/, 'Enter a valid name');

export const createAdminSchema = z.object({
  body: z
    .object({
      email: emailSchema,
      password: passwordSchema,
      name: nameSchema,
    })
    .strict(),
});

export const adminLoginSchema = z.object({
  body: z
    .object({
      email: emailSchema,
      password: loginPasswordSchema,
    })
    .strict(),
});

export const adminForgotPasswordSchema = z.object({
  body: z
    .object({
      email: emailSchema,
    })
    .strict(),
});

export const adminResetPasswordSchema = z.object({
  body: z
    .object({
      token: z
        .string({ required_error: 'Reset token is required' })
        .trim()
        .regex(/^[a-f0-9]{64}$/i, 'This reset link is invalid or has expired'),
      newPassword: passwordSchema,
    })
    .strict(),
});

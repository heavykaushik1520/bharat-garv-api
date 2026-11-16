import { z } from 'zod';

const trimmed = (max, label) =>
  z
    .string({ required_error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} is too long`);

export const contactMessageSchema = z.object({
  body: z
    .object({
      firstName: trimmed(80, 'First name'),
      lastName: trimmed(80, 'Last name'),
      email: z
        .string({ required_error: 'Email is required' })
        .trim()
        .toLowerCase()
        .email('Enter a valid email address')
        .max(191, 'Email is too long'),
      subject: trimmed(160, 'Subject'),
      message: trimmed(4000, 'Message'),
    })
    .strict(),
});

import { z } from 'zod';
import { Constraints } from '@antiverse/database';

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email().max(Constraints.EMAIL_MAX_LENGTH).transform(v => v.toLowerCase().trim()),
    password: z.string().min(Constraints.PASSWORD_MIN_LENGTH).max(Constraints.PASSWORD_MAX_LENGTH),
    displayName: z.string().min(Constraints.DISPLAY_NAME_MIN_LENGTH).max(Constraints.DISPLAY_NAME_MAX_LENGTH).trim(),
    role: z.enum(['keeper', 'researcher']).default('keeper'),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().length(128),
  }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    displayName: z.string().min(Constraints.DISPLAY_NAME_MIN_LENGTH).max(Constraints.DISPLAY_NAME_MAX_LENGTH).trim().optional(),
    password: z.string().min(Constraints.PASSWORD_MIN_LENGTH).max(Constraints.PASSWORD_MAX_LENGTH).optional(),
  }).refine(data => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  }),
});

export const updateRoleSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    role: z.enum(['keeper', 'researcher', 'admin']),
  }),
});

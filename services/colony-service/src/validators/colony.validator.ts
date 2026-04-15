import { z } from 'zod';
import { Constraints } from '@antiverse/database';

export const createColonySchema = z.object({
  body: z.object({
    name: z.string().min(1).max(Constraints.COLONY_NAME_MAX_LENGTH).trim(),
    speciesId: z.string().uuid(),
    description: z.string().max(Constraints.COLONY_DESCRIPTION_MAX_LENGTH).optional(),
    foundingDate: z.string().datetime().optional(), // ISO 8601
    queenCount: z.number().int().min(1).default(1),
    estimatedWorkerCount: z.number().int().min(0).optional(),
  }),
});

export const updateColonySchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    name: z.string().min(1).max(Constraints.COLONY_NAME_MAX_LENGTH).trim().optional(),
    description: z.string().max(Constraints.COLONY_DESCRIPTION_MAX_LENGTH).optional(),
    status: z.enum(['active', 'inactive', 'deceased']).optional(),
    queenCount: z.number().int().min(1).optional(),
    estimatedWorkerCount: z.number().int().min(0).optional(),
  }).refine(data => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  }),
});

export const addMemberSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    userId: z.string().uuid(),
    accessRole: z.enum(['collaborator', 'viewer']),
  }),
});

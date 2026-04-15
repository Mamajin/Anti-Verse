import { z } from 'zod';
import { Constraints } from '@antiverse/database';

export const environmentalReadingSchema = z.object({
  temperature: z.number().min(-50).max(100).optional(),
  humidity: z.number().min(0).max(100).optional(),
  lightLevel: z.number().min(0).max(100000).optional(),
});

export const createLogEntrySchema = z.object({
  params: z.object({
    colonyId: z.string().uuid(),
  }),
  body: z.object({
    entryType: z.enum(['observation', 'feeding', 'maintenance', 'environmental']).default('observation'),
    title: z.string().min(1).max(Constraints.LOG_TITLE_MAX_LENGTH),
    content: z.string().max(Constraints.LOG_CONTENT_MAX_LENGTH),
    occurredAt: z.string().datetime().optional(), // ISO 8601
    environmentalReading: environmentalReadingSchema.optional(),
  }),
});

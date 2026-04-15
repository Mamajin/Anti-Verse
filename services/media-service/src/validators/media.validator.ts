import { z } from 'zod';

export const createUploadSchema = z.object({
  body: z.object({
    colonyId: z.string().uuid(),
    filename: z.string().min(1).max(255),
    contentType: z.enum([
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'video/mp4', 'video/webm'
    ]),
    sizeBytes: z.number().int().min(1),
    caption: z.string().max(500).optional(),
    logEntryId: z.string().uuid().optional(),
  })
});

export const confirmUploadSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  })
});

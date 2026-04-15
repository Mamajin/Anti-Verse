import { Request, Response, NextFunction } from 'express';
import { MediaModel } from '../models/media.model';
import { AppError } from '../utils/AppError';
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config';
import crypto from 'crypto';

const s3 = new S3Client({
  endpoint: config.S3_ENDPOINT,
  region: config.S3_REGION,
  forcePathStyle: config.S3_FORCE_PATH_STYLE,
  credentials: {
    accessKeyId: config.S3_ACCESS_KEY,
    secretAccessKey: config.S3_SECRET_KEY,
  },
});

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
};

export class MediaController {

  static async requestUpload(req: Request, res: Response, next: NextFunction) {
    try {
      const data = req.body;
      const context = req.colonyContext!;

      // Media size limits
      const isVideo = data.contentType.startsWith('video');
      const maxSize = isVideo ? 500 * 1024 * 1024 : 50 * 1024 * 1024;
      if (data.sizeBytes > maxSize) {
        throw AppError.badRequest(`File size exceeds limit (${isVideo ? '500MB' : '50MB'})`);
      }

      const mediaId = crypto.randomUUID();
      const ext = MIME_TO_EXT[data.contentType];
      const fileKey = `colonies/${data.colonyId}/media/${mediaId}.${ext}`;

      // Create pending record
      const record = await MediaModel.create({
        id: mediaId,
        colony_id: data.colonyId,
        user_id: context.userId, // Populated via inter-service
        log_entry_id: data.logEntryId || null,
        file_key: fileKey,
        filename: data.filename,
        content_type: data.contentType,
        size_bytes: data.sizeBytes,
        caption: data.caption || null,
        status: 'pending'
      });

      // Generate pre-signed PUT URL
      const command = new PutObjectCommand({
        Bucket: config.S3_BUCKET,
        Key: fileKey,
        ContentType: data.contentType,
      });

      const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 900 });

      res.status(201).json({
        data: {
          id: record.id,
          uploadUrl,
          fileKey: record.file_key
        }
      });
    } catch (err) {
      next(err);
    }
  }

  static async confirmUpload(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const record = await MediaModel.findById(id);

      if (!record) throw AppError.notFound('Media record not found');
      if (record.status !== 'pending') throw AppError.badRequest('Upload not pending');

      // Add colonyAccessGuard check manually since route param doesn't have colonyId
      if (req.colonyContext!.colonyId !== record.colony_id) throw AppError.forbidden();

      // Verify S3 object exists
      let exists = false;
      try {
        await s3.send(new HeadObjectCommand({
          Bucket: config.S3_BUCKET,
          Key: record.file_key,
        }));
        exists = true;
      } catch (e: any) {
        if (e.name === 'NotFound') exists = false;
        else throw e;
      }

      if (!exists) {
        await MediaModel.updateStatus(id, 'failed');
        throw AppError.badRequest('Upload not verifiable in S3 bucket. Marked failed.');
      }

      await MediaModel.updateStatus(id, 'ready');

      // Generate read URL
      const getCommand = new GetObjectCommand({
        Bucket: config.S3_BUCKET,
        Key: record.file_key,
      });

      const url = await getSignedUrl(s3, getCommand, { expiresIn: 3600 });

      res.json({
        data: {
          id,
          status: 'ready',
          url,
          filename: record.filename
        }
      });
    } catch (err) {
      next(err);
    }
  }

  static async listColonyMedia(req: Request, res: Response, next: NextFunction) {
    try {
      const { colonyId } = req.query; // Used via query params
      const records = await MediaModel.getColonyMedia(colonyId as string);

      // We should ideally generate presigned URLs for all of them
      const mediaWithUrls = await Promise.all(records.map(async rec => {
        const command = new GetObjectCommand({
          Bucket: config.S3_BUCKET,
          Key: rec.file_key,
        });
        const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
        return {
          id: rec.id,
          filename: rec.filename,
          caption: rec.caption,
          contentType: rec.content_type,
          createdAt: rec.created_at,
          url
        };
      }));

      res.json({ data: mediaWithUrls });
    } catch (err) {
      next(err);
    }
  }
}

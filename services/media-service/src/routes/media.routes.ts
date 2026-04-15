import { Router, RequestHandler } from 'express';
import { MediaController } from '../controllers/media.controller';
import { validate } from '../middleware/validate';
import { requireColonyAccess } from '../middleware/colonyAccessGuard';
import { createUploadSchema, confirmUploadSchema } from '../validators/media.validator';
import { AccessRole } from '@antiverse/types';

const router = Router();

// Uploading requires Owner level on the targeted colony
router.post('/upload', validate(createUploadSchema), requireColonyAccess([AccessRole.Owner]) as RequestHandler, MediaController.requestUpload);

// In confirming, the client passes `colonyId` so the guard works.
// Or we could parse it, but for simplicity, we require the query param: ?colonyId=...
router.post('/:id/confirm', validate(confirmUploadSchema), requireColonyAccess([AccessRole.Owner]) as RequestHandler, MediaController.confirmUpload);

// Fetching media based on query ?colonyId=...
router.get('/', requireColonyAccess([AccessRole.Owner, AccessRole.Collaborator, AccessRole.Viewer]) as RequestHandler, MediaController.listColonyMedia);

export default router;

import { Router, RequestHandler } from 'express';
import { LogController } from '../controllers/log.controller';
import { validate } from '../middleware/validate';
import { requireColonyAccess } from '../middleware/colonyAccessGuard';
import { createLogEntrySchema } from '../validators/log.validator';
import { AccessRole } from '@antiverse/types';

const router = Router();

// Routes
router.get('/:colonyId', requireColonyAccess([AccessRole.Owner, AccessRole.Collaborator, AccessRole.Viewer]) as RequestHandler, LogController.getLogs);

router.post('/:colonyId', validate(createLogEntrySchema), requireColonyAccess([AccessRole.Owner]) as RequestHandler, LogController.createLog);

// Note: delete route requires both colonyId and logId.
// Example /api/logs/:colonyId/:id
router.delete('/:colonyId/:id', requireColonyAccess([AccessRole.Owner]) as RequestHandler, LogController.deleteLog);

export default router;

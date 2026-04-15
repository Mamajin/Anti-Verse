import { Router, RequestHandler } from 'express';
import { ColonyController } from '../controllers/colony.controller';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/authGuard';
import { requireAccess } from '../middleware/colonyGuard';
import { createColonySchema, updateColonySchema, addMemberSchema } from '../validators/colony.validator';

const router = Router();

import { AccessRole } from '@antiverse/types';

// Public / Lookup
router.get('/species', ColonyController.listSpecies);

// All other endpoints require authentication
router.use(authGuard as RequestHandler);

// Colonies
router.get('/', ColonyController.listColonies);
router.post('/', validate(createColonySchema), ColonyController.createColony);

// Colony-specific
router.get('/:id', requireAccess([AccessRole.Owner, AccessRole.Collaborator, AccessRole.Viewer]) as RequestHandler, ColonyController.getColony);
router.patch('/:id', validate(updateColonySchema), requireAccess([AccessRole.Owner]) as RequestHandler, ColonyController.updateColony);

// Members
router.get('/:id/members', requireAccess([AccessRole.Owner, AccessRole.Collaborator, AccessRole.Viewer]) as RequestHandler, ColonyController.listMembers);
router.post('/:id/members', validate(addMemberSchema), requireAccess([AccessRole.Owner]) as RequestHandler, ColonyController.addMember);

// Internal verify endpoint for other services (Log/Media)
router.get('/:id/verify', requireAccess([AccessRole.Owner, AccessRole.Collaborator, AccessRole.Viewer]) as RequestHandler, (req, res) => {
  res.json({
    data: {
      colonyId: req.params.id,
      userId: req.user!.userId,
      accessRole: req.accessRole
    }
  });
});

export default router;

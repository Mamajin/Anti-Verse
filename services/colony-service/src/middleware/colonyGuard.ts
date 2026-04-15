import { Request, Response, NextFunction } from 'express';
import { MemberModel } from '../models/member.model';
import { AppError } from '../utils/AppError';
import { AccessRole } from '@antiverse/types';

declare global {
  namespace Express {
    interface Request {
      accessRole?: AccessRole;
    }
  }
}

/**
 * Validates if the authenticated user has access to the colony.
 * Also attaches the specific AccessRole ('owner', 'collaborator', 'viewer') to req.accessRole.
 */
export const requireAccess = (allowedRoles: AccessRole[] = [AccessRole.Owner, AccessRole.Collaborator, AccessRole.Viewer]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const colonyId = req.params.id;
      const userId = req.user?.userId;

      if (!userId) return next(AppError.unauthorized());
      if (!colonyId) return next(AppError.badRequest('Missing colony ID'));

      const roleStr = await MemberModel.getMemberRole(colonyId, userId);

      if (!roleStr) {
        throw AppError.forbidden(`Requires one of roles: ${allowedRoles.join(', ')} on this colony`);
      }
      
      const role = roleStr as AccessRole;

      if (!allowedRoles.includes(role)) {
        throw AppError.forbidden(`Requires one of roles: ${allowedRoles.join(', ')} on this colony`);
      }

      req.accessRole = role;
      next();
    } catch (err) {
      next(err);
    }
  };
};

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
      let role: AccessRole;

      if (!roleStr) {
        // If NO role is found, we check if it's a "Read" request.
        // If so, we grant a default 'viewer' role to any authenticated researcher.
        if (req.method === 'GET') {
          role = AccessRole.Viewer;
        } else {
          throw AppError.forbidden(`Requires one of roles: ${allowedRoles.join(', ')} on this colony`);
        }
      } else {
        role = roleStr as AccessRole;
      }

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

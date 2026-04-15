import { Request, Response, NextFunction } from 'express';
import { verifyColony } from '@antiverse/api-client';
import { AppError } from '../utils/AppError';
import type { AccessRole, VerifyColonyResult } from '@antiverse/types';

declare global {
  namespace Express {
    interface Request {
      colonyContext?: VerifyColonyResult;
    }
  }
}

export const requireColonyAccess = (allowedRoles: AccessRole[] = ['owner', 'collaborator', 'viewer'] as AccessRole[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const colonyId = req.params.colonyId || req.body.colonyId || req.query.colonyId;
      const authHeader = req.headers.authorization;

      if (!colonyId) return next(AppError.badRequest('Missing colony ID in context'));
      if (!authHeader) return next(AppError.unauthorized());

      const token = authHeader.substring(7);

      const context = await verifyColony(colonyId, token);

      if (!allowedRoles.includes(context.accessRole)) {
        throw AppError.forbidden(`Requires one of roles: ${allowedRoles.join(', ')} on this colony`);
      }

      req.colonyContext = context;
      next();
    } catch (err: any) {
      if (err.response && err.response.status === 403) {
         next(AppError.forbidden());
      } else if (err.response && err.response.status === 401) {
         next(AppError.unauthorized());
      } else {
         next(err);
      }
    }
  };
};

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import type { UserRole } from '@antiverse/types';

export const roleGuard = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(AppError.unauthorized());
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(AppError.forbidden(`Requires one of roles: ${allowedRoles.join(', ')}`));
    }

    next();
  };
};

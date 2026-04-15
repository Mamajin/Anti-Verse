import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '@antiverse/api-client';
import { AppError } from '../utils/AppError';
import type { UserRole, VerifyTokenResult } from '@antiverse/types';

declare global {
  namespace Express {
    interface Request {
      user?: VerifyTokenResult;
    }
  }
}

export const authGuard = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(AppError.unauthorized('Missing or malformed authorization header'));
  }

  const token = authHeader.substring(7);

  try {
    const payload = await verifyToken(token);
    req.user = payload;
    next();
  } catch (error) {
    next(AppError.unauthorized('Invalid or expired token'));
  }
};

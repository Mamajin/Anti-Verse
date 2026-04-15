import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger';
import { AppError } from '../utils/AppError';
import { ErrorCode, ApiErrorResponse } from '@antiverse/types';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const isAppError = err instanceof AppError;
  const status = isAppError ? err.status : 500;
  const code = isAppError ? err.code : ErrorCode.InternalError;
  const message = isAppError ? err.message : 'Internal Server Error';
  
  if (!isAppError) {
    logger.error({ err, reqId: req.id }, 'Unhandled Exception');
  }

  const response: ApiErrorResponse = {
    error: {
      status,
      code,
      message,
      requestId: req.id as string,
      details: isAppError ? err.details : undefined,
    },
  };

  res.status(status).json(response);
}

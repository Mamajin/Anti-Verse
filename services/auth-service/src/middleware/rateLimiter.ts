import rateLimit from 'express-rate-limit';
import { AppError } from '../utils/AppError';
import { ErrorCode } from '@antiverse/types';

export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(new AppError(429, ErrorCode.RateLimitExceeded, 'Too many requests, please try again later.'));
  },
});

export const standardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(new AppError(429, ErrorCode.RateLimitExceeded, 'Too many requests, please try again later.'));
  },
});

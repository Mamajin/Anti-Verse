import { describe, it, expect } from 'vitest';
import { AppError } from '../utils/AppError';
import { ErrorCode } from '@antiverse/types';

describe('AppError Utility', () => {
  it('instantiates correctly as a custom error', () => {
    const err = new AppError(400, ErrorCode.ValidationError, 'Validation failed');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
    expect(err.status).toBe(400);
    expect(err.code).toBe(ErrorCode.ValidationError);
    expect(err.message).toBe('Validation failed');
  });

  it('provides helper factory methods', () => {
    const notFound = AppError.notFound('Colony missing');
    expect(notFound.status).toBe(404);
    expect(notFound.code).toBe(ErrorCode.NotFound);
    expect(notFound.message).toBe('Colony missing');

    const internal = AppError.internal();
    expect(internal.status).toBe(500);
    expect(internal.code).toBe(ErrorCode.InternalError);
    expect(internal.message).toBe('Internal server error');
  });
});

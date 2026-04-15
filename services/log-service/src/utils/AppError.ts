import { ErrorCode, FieldError } from '@antiverse/types';

export class AppError extends Error {
  public readonly status: number;
  public readonly code: ErrorCode;
  public readonly details?: FieldError[];

  constructor(
    status: number,
    code: ErrorCode,
    message: string,
    details?: FieldError[]
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static badRequest(message: string, details?: FieldError[]) {
    return new AppError(400, ErrorCode.ValidationError, message, details);
  }

  static unauthorized(message = 'Unauthorized') {
    return new AppError(401, ErrorCode.Unauthorized, message);
  }

  static forbidden(message = 'Forbidden') {
    return new AppError(403, ErrorCode.Forbidden, message);
  }

  static notFound(message = 'Resource not found') {
    return new AppError(404, ErrorCode.NotFound, message);
  }

  static conflict(message: string) {
    return new AppError(409, ErrorCode.Conflict, message);
  }

  static internal(message = 'Internal server error') {
    return new AppError(500, ErrorCode.InternalError, message);
  }
}

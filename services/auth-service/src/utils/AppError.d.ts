import { ErrorCode, FieldError } from '@antiverse/types';
export declare class AppError extends Error {
    readonly status: number;
    readonly code: ErrorCode;
    readonly details?: FieldError[];
    constructor(status: number, code: ErrorCode, message: string, details?: FieldError[]);
    static badRequest(message: string, details?: FieldError[]): AppError;
    static unauthorized(message?: string): AppError;
    static forbidden(message?: string): AppError;
    static notFound(message?: string): AppError;
    static conflict(message: string): AppError;
    static internal(message?: string): AppError;
}
//# sourceMappingURL=AppError.d.ts.map
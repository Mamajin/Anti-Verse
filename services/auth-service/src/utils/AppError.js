"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
const types_1 = require("@antiverse/types");
class AppError extends Error {
    status;
    code;
    details;
    constructor(status, code, message, details) {
        super(message);
        this.status = status;
        this.code = code;
        this.details = details;
        Object.setPrototypeOf(this, AppError.prototype);
    }
    static badRequest(message, details) {
        return new AppError(400, types_1.ErrorCode.ValidationError, message, details);
    }
    static unauthorized(message = 'Unauthorized') {
        return new AppError(401, types_1.ErrorCode.Unauthorized, message);
    }
    static forbidden(message = 'Forbidden') {
        return new AppError(403, types_1.ErrorCode.Forbidden, message);
    }
    static notFound(message = 'Resource not found') {
        return new AppError(404, types_1.ErrorCode.NotFound, message);
    }
    static conflict(message) {
        return new AppError(409, types_1.ErrorCode.Conflict, message);
    }
    static internal(message = 'Internal server error') {
        return new AppError(500, types_1.ErrorCode.InternalError, message);
    }
}
exports.AppError = AppError;
//# sourceMappingURL=AppError.js.map
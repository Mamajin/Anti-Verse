"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const logger_1 = require("../logger");
const AppError_1 = require("../utils/AppError");
const types_1 = require("@antiverse/types");
function errorHandler(err, req, res, next) {
    const isAppError = err instanceof AppError_1.AppError;
    const status = isAppError ? err.status : 500;
    const code = isAppError ? err.code : types_1.ErrorCode.InternalError;
    const message = isAppError ? err.message : 'Internal Server Error';
    if (!isAppError) {
        logger_1.logger.error({ err, reqId: req.id }, 'Unhandled Exception');
    }
    const response = {
        error: {
            status,
            code,
            message,
            requestId: req.id,
            details: isAppError ? err.details : undefined,
        },
    };
    res.status(status).json(response);
}
//# sourceMappingURL=errorHandler.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authGuard = void 0;
const tokens_1 = require("../utils/tokens");
const AppError_1 = require("../utils/AppError");
const authGuard = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(AppError_1.AppError.unauthorized('Missing or malformed authorization header'));
    }
    const token = authHeader.substring(7);
    try {
        const payload = (0, tokens_1.verifyAccessToken)(token);
        req.user = payload;
        next();
    }
    catch (error) {
        next(AppError_1.AppError.unauthorized('Invalid or expired token'));
    }
};
exports.authGuard = authGuard;
//# sourceMappingURL=authGuard.js.map
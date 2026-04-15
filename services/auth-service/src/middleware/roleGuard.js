"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roleGuard = void 0;
const AppError_1 = require("../utils/AppError");
const roleGuard = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(AppError_1.AppError.unauthorized());
        }
        if (!allowedRoles.includes(req.user.role)) {
            return next(AppError_1.AppError.forbidden(`Requires one of roles: ${allowedRoles.join(', ')}`));
        }
        next();
    };
};
exports.roleGuard = roleGuard;
//# sourceMappingURL=roleGuard.js.map
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.standardLimiter = exports.strictLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const AppError_1 = require("../utils/AppError");
const types_1 = require("@antiverse/types");
exports.strictLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next) => {
        next(new AppError_1.AppError(429, types_1.ErrorCode.RateLimitExceeded, 'Too many requests, please try again later.'));
    },
});
exports.standardLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next) => {
        next(new AppError_1.AppError(429, types_1.ErrorCode.RateLimitExceeded, 'Too many requests, please try again later.'));
    },
});
//# sourceMappingURL=rateLimiter.js.map
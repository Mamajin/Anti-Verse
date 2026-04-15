"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateRoleSchema = exports.updateProfileSchema = exports.refreshSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
const database_1 = require("@antiverse/database");
exports.registerSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email().max(database_1.Constraints.EMAIL_MAX_LENGTH).transform(v => v.toLowerCase().trim()),
        password: zod_1.z.string().min(database_1.Constraints.PASSWORD_MIN_LENGTH).max(database_1.Constraints.PASSWORD_MAX_LENGTH),
        displayName: zod_1.z.string().min(database_1.Constraints.DISPLAY_NAME_MIN_LENGTH).max(database_1.Constraints.DISPLAY_NAME_MAX_LENGTH).trim(),
        role: zod_1.z.enum(['keeper', 'researcher']).default('keeper'),
    }),
});
exports.loginSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email(),
        password: zod_1.z.string().min(1),
    }),
});
exports.refreshSchema = zod_1.z.object({
    body: zod_1.z.object({
        refreshToken: zod_1.z.string().length(128),
    }),
});
exports.updateProfileSchema = zod_1.z.object({
    body: zod_1.z.object({
        displayName: zod_1.z.string().min(database_1.Constraints.DISPLAY_NAME_MIN_LENGTH).max(database_1.Constraints.DISPLAY_NAME_MAX_LENGTH).trim().optional(),
        password: zod_1.z.string().min(database_1.Constraints.PASSWORD_MIN_LENGTH).max(database_1.Constraints.PASSWORD_MAX_LENGTH).optional(),
    }).refine(data => Object.keys(data).length > 0, {
        message: "At least one field must be provided for update",
    }),
});
exports.updateRoleSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().uuid(),
    }),
    body: zod_1.z.object({
        role: zod_1.z.enum(['keeper', 'researcher', 'admin']),
    }),
});
//# sourceMappingURL=auth.validator.js.map
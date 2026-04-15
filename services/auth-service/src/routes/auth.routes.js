"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const validate_1 = require("../middleware/validate");
const rateLimiter_1 = require("../middleware/rateLimiter");
const authGuard_1 = require("../middleware/authGuard");
const auth_validator_1 = require("../validators/auth.validator");
const router = (0, express_1.Router)();
// Public endpoints
router.post('/register', rateLimiter_1.strictLimiter, (0, validate_1.validate)(auth_validator_1.registerSchema), auth_controller_1.AuthController.register);
router.post('/login', rateLimiter_1.strictLimiter, (0, validate_1.validate)(auth_validator_1.loginSchema), auth_controller_1.AuthController.login);
router.post('/refresh', rateLimiter_1.standardLimiter, (0, validate_1.validate)(auth_validator_1.refreshSchema), auth_controller_1.AuthController.refresh);
router.post('/logout', rateLimiter_1.standardLimiter, auth_controller_1.AuthController.logout);
// Protected endpoints
router.get('/verify', authGuard_1.authGuard, auth_controller_1.AuthController.verify);
router.get('/profile', rateLimiter_1.standardLimiter, authGuard_1.authGuard, auth_controller_1.AuthController.profile);
router.patch('/profile', rateLimiter_1.standardLimiter, authGuard_1.authGuard, (0, validate_1.validate)(auth_validator_1.updateProfileSchema), auth_controller_1.AuthController.updateProfile);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map
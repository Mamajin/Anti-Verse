import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validate } from '../middleware/validate';
import { strictLimiter, standardLimiter } from '../middleware/rateLimiter';
import { authGuard } from '../middleware/authGuard';
import { registerSchema, loginSchema, refreshSchema, updateProfileSchema } from '../validators/auth.validator';

const router = Router();

// Public endpoints
router.post('/register', strictLimiter, validate(registerSchema), AuthController.register);
router.post('/login', strictLimiter, validate(loginSchema), AuthController.login);
router.post('/refresh', standardLimiter, validate(refreshSchema), AuthController.refresh);
router.post('/logout', standardLimiter, AuthController.logout);

// Protected endpoints
router.get('/verify', authGuard, AuthController.verify);
router.get('/profile', standardLimiter, authGuard, AuthController.profile);
router.patch('/profile', standardLimiter, authGuard, validate(updateProfileSchema), AuthController.updateProfile);

export default router;

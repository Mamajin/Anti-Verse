import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { UserModel } from '../models/user.model';
import { TokenModel } from '../models/token.model';
import { Constraints } from '@antiverse/database';
import { AppError } from '../utils/AppError';
import { generateAccessToken, generateRefreshToken, hashToken, getRefreshTokenExpiry } from '../utils/tokens';
import type { RegisterRequest, LoginRequest, UpdateProfileRequest, UserRole } from '@antiverse/types';

export class AuthController {
  
  static async register(req: Request<{}, {}, RegisterRequest>, res: Response, next: NextFunction) {
    try {
      const { email, password, displayName, role } = req.body;

      const existing = await UserModel.findByEmail(email);
      if (existing) {
        throw AppError.conflict('Email is already registered');
      }

      const password_hash = await bcrypt.hash(password, Constraints.BCRYPT_SALT_ROUNDS);

      const user = await UserModel.create({
        email,
        password_hash,
        display_name: displayName,
        role: role || 'keeper',
      });

      res.status(201).json({ data: UserModel.toDomain(user) });
    } catch (err) {
      next(err);
    }
  }

  static async login(req: Request<{}, {}, LoginRequest>, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;

      const user = await UserModel.findByEmail(email);
      if (!user || !user.is_active) {
        throw AppError.unauthorized('Invalid creds'); // obfuscated intentionally
      }

      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        throw AppError.unauthorized('Invalid creds');
      }

      // Generate Tokens
      const payload = { userId: user.id, role: user.role as UserRole };
      const accessToken = generateAccessToken(payload);
      const { token: refreshToken, hash } = generateRefreshToken();
      const expiresAt = getRefreshTokenExpiry();

      await TokenModel.create(user.id, hash, expiresAt);

      res.json({
        data: {
          accessToken,
          refreshToken,
          user: UserModel.toSummary(user),
        }
      });
    } catch (err) {
      // Improve obfuscation so timings aren't a dead giveaway (ideally you'd use a dummy hash check, but this is a start)
      if (err instanceof AppError && err.message === 'Invalid creds') {
          next(AppError.unauthorized('Invalid email or password'));
      } else {
          next(err);
      }
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) throw AppError.badRequest('Missing refresh token');

      const hash = hashToken(refreshToken);
      const tokenRecord = await TokenModel.findByHash(hash);

      if (!tokenRecord || tokenRecord.expires_at < new Date()) {
        if (tokenRecord) await TokenModel.delete(tokenRecord.id); // cleanup expired
        throw AppError.unauthorized('Invalid or expired refresh token');
      }

      const user = await UserModel.findById(tokenRecord.user_id);
      if (!user || !user.is_active) {
        throw AppError.unauthorized('Account disabled');
      }

      // Rotate token
      await TokenModel.delete(tokenRecord.id);

      const payload = { userId: user.id, role: user.role as UserRole };
      const newAccessToken = generateAccessToken(payload);
      const { token: newRefreshToken, hash: newHash } = generateRefreshToken();
      
      await TokenModel.create(user.id, newHash, getRefreshTokenExpiry());

      res.json({
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        }
      });
    } catch (err) {
      next(err);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      if (refreshToken) {
        const hash = hashToken(refreshToken);
        const record = await TokenModel.findByHash(hash);
        if (record) {
          await TokenModel.delete(record.id);
        }
      }
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }

  static async verify(req: Request, res: Response, next: NextFunction) {
    res.json({ data: req.user });
  }

  static async profile(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await UserModel.findById(req.user!.userId);
      if (!user) throw AppError.notFound();
      res.json({ data: UserModel.toDomain(user) });
    } catch (err) {
      next(err);
    }
  }

  static async updateProfile(req: Request<{}, {}, UpdateProfileRequest>, res: Response, next: NextFunction) {
    try {
      const updates: any = {};
      if (req.body.displayName) updates.display_name = req.body.displayName;
      if (req.body.password) {
        updates.password_hash = await bcrypt.hash(req.body.password, Constraints.BCRYPT_SALT_ROUNDS);
      }

      const user = await UserModel.update(req.user!.userId, updates);
      if (!user) throw AppError.notFound();

      res.json({ data: UserModel.toDomain(user) });
    } catch (err) {
      next(err);
    }
  }
}

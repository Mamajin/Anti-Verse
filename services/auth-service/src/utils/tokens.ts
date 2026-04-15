import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import type { UserRole } from '@antiverse/types';

export interface TokenPayload {
  userId: string;
  role: UserRole;
}

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.JWT_ACCESS_SECRET, {
    expiresIn: config.JWT_ACCESS_TTL as any,
  });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, config.JWT_ACCESS_SECRET) as TokenPayload;
}

/**
 * Generates a strong opaque refresh token.
 * Returns both the cleartext token (for the user) and the SHA-256 hash (for the DB).
 */
export function generateRefreshToken(): { token: string; hash: string } {
  const token = crypto.randomBytes(64).toString('hex');
  const hash = hashToken(token);
  return { token, hash };
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Calculates the expiration date based on the JWT_REFRESH_TTL string (e.g. '7d').
 */
export function getRefreshTokenExpiry(): Date {
  const ttl = config.JWT_REFRESH_TTL;
  const match = ttl.match(/^(\d+)([dhms])$/);
  if (!match) throw new Error(`Invalid JWT_REFRESH_TTL format: ${ttl}`);
  
  const value = parseInt(match[1], 10);
  const unit = match[2];
  
  const multipliers: Record<string, number> = {
    'd': 24 * 60 * 60 * 1000,
    'h': 60 * 60 * 1000,
    'm': 60 * 1000,
    's': 1000,
  };
  
  return new Date(Date.now() + value * multipliers[unit]);
}

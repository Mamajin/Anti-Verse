import { db } from '../db';
import { Tables } from '@antiverse/database';

export interface RefreshTokenRow {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  created_at: Date;
}

export const TokenModel = {
  async create(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await db<RefreshTokenRow>(Tables.AUTH_REFRESH_TOKENS).insert({
      user_id: userId,
      token_hash: tokenHash,
      expires_at: expiresAt,
    });
  },

  async findByHash(tokenHash: string): Promise<RefreshTokenRow | undefined> {
    return db<RefreshTokenRow>(Tables.AUTH_REFRESH_TOKENS)
      .where({ token_hash: tokenHash })
      .first();
  },

  async delete(id: string): Promise<void> {
    await db(Tables.AUTH_REFRESH_TOKENS).where({ id }).delete();
  },

  async deleteAllForUser(userId: string): Promise<void> {
    await db(Tables.AUTH_REFRESH_TOKENS).where({ user_id: userId }).delete();
  },

  async cleanupExpired(): Promise<number> {
    return db(Tables.AUTH_REFRESH_TOKENS)
      .where('expires_at', '<', new Date())
      .delete();
  }
};

import { db } from '../db';
import { Tables } from '@antiverse/database';
import type { User, UserSummary } from '@antiverse/types';

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  role: 'keeper' | 'researcher' | 'admin';
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export const UserModel = {
  async findByEmail(email: string): Promise<UserRow | undefined> {
    return db<UserRow>(Tables.AUTH_USERS)
      .where({ email: email.toLowerCase() })
      .first();
  },

  async findById(id: string): Promise<UserRow | undefined> {
    return db<UserRow>(Tables.AUTH_USERS).where({ id }).first();
  },

  async create(data: Partial<UserRow>): Promise<UserRow> {
    const [user] = await db<UserRow>(Tables.AUTH_USERS)
      .insert(data)
      .returning('*');
    return user;
  },

  async update(id: string, data: Partial<UserRow>): Promise<UserRow | undefined> {
    const [user] = await db<UserRow>(Tables.AUTH_USERS)
      .where({ id })
      .update({ ...data, updated_at: new Date() })
      .returning('*');
    return user;
  },

  toDomain(row: UserRow): User {
    return {
      id: row.id,
      email: row.email,
      displayName: row.display_name,
      role: row.role as User['role'],
      isActive: row.is_active,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  },

  toSummary(row: UserRow): UserSummary {
    return {
      id: row.id,
      email: row.email,
      displayName: row.display_name,
      role: row.role as UserSummary['role'],
    };
  }
};

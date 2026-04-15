import { db } from '../db';
import { Tables } from '@antiverse/database';

export interface ColonyRow {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  species_id: string;
  status: 'active' | 'inactive' | 'deceased';
  founding_date: Date | null;
  queen_count: number;
  estimated_worker_count: number | null;
  created_at: Date;
  updated_at: Date;
}

export const ColonyModel = {
  async findById(id: string): Promise<ColonyRow | undefined> {
    return db<ColonyRow>(Tables.COLONY_COLONIES).where({ id }).first();
  },

  async findByUserId(userId: string): Promise<ColonyRow[]> {
    // A user might own colonies OR be a member of colonies.
    // To list all colonies accessible to a user, we join the members table or check ownership.
    return db<ColonyRow>({ c: Tables.COLONY_COLONIES })
      .distinct('c.*')
      .leftJoin({ m: Tables.COLONY_MEMBERS }, 'c.id', 'm.colony_id')
      .where('c.owner_id', userId)
      .orWhere('m.user_id', userId)
      .orderBy('c.created_at', 'desc');
  },

  async findAll(): Promise<ColonyRow[]> {
    return db<ColonyRow>(Tables.COLONY_COLONIES).orderBy('created_at', 'desc');
  },

  async create(data: Partial<ColonyRow>): Promise<ColonyRow> {
    const [colony] = await db<ColonyRow>(Tables.COLONY_COLONIES).insert(data).returning('*');
    return colony;
  },

  async update(id: string, data: Partial<ColonyRow>): Promise<ColonyRow | undefined> {
    const [colony] = await db<ColonyRow>(Tables.COLONY_COLONIES)
      .where({ id })
      .update({ ...data, updated_at: new Date() })
      .returning('*');
    return colony;
  },

  async delete(id: string): Promise<void> {
    await db(Tables.COLONY_COLONIES).where({ id }).delete();
  }
};

import { db } from '../db';
import { Tables } from '@antiverse/database';

export interface ColonyMemberRow {
  colony_id: string;
  user_id: string;
  user_display_name: string;
  user_email: string;
  access_role: 'owner' | 'collaborator' | 'viewer';
  granted_at: Date;
}

export const MemberModel = {
  async addMember(data: ColonyMemberRow): Promise<void> {
    await db(Tables.COLONY_MEMBERS).insert(data).onConflict(['colony_id', 'user_id']).merge();
  },

  async removeMember(colonyId: string, userId: string): Promise<void> {
    await db(Tables.COLONY_MEMBERS).where({ colony_id: colonyId, user_id: userId }).delete();
  },

  async getMembers(colonyId: string): Promise<ColonyMemberRow[]> {
    return db<ColonyMemberRow>(Tables.COLONY_MEMBERS).where({ colony_id: colonyId }).orderBy('granted_at', 'asc');
  },
  
  async getMemberRole(colonyId: string, userId: string): Promise<'owner' | 'collaborator' | 'viewer' | null> {
    const col = await db(Tables.COLONY_COLONIES).select('owner_id').where({ id: colonyId }).first();
    if (col && col.owner_id === userId) return 'owner';
    
    const member = await db<ColonyMemberRow>(Tables.COLONY_MEMBERS)
      .where({ colony_id: colonyId, user_id: userId })
      .first();
      
    return member ? member.access_role : null;
  }
};

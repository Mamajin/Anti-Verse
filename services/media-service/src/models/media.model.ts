import { db } from '../db';
import { Tables } from '@antiverse/database';

export interface MediaFileRow {
  id: string;
  colony_id: string;
  user_id: string;
  log_entry_id: string | null;
  file_key: string;
  filename: string;
  content_type: string;
  size_bytes: string | number; // pg driver returns bigint as string
  caption: string | null;
  status: 'pending' | 'ready' | 'failed';
  created_at: Date;
}

export const MediaModel = {
  async create(data: Partial<MediaFileRow>): Promise<MediaFileRow> {
    const [record] = await db<MediaFileRow>(Tables.MEDIA_FILES).insert(data).returning('*');
    return record;
  },

  async findById(id: string): Promise<MediaFileRow | undefined> {
    return db<MediaFileRow>(Tables.MEDIA_FILES).where({ id }).first();
  },
  
  async findByFileKey(fileKey: string): Promise<MediaFileRow | undefined> {
    return db<MediaFileRow>(Tables.MEDIA_FILES).where({ file_key: fileKey }).first();
  },

  async updateStatus(id: string, status: 'pending' | 'ready' | 'failed'): Promise<void> {
    await db(Tables.MEDIA_FILES).where({ id }).update({ status });
  },

  async getColonyMedia(colonyId: string): Promise<MediaFileRow[]> {
    return db<MediaFileRow>(Tables.MEDIA_FILES)
      .where({ colony_id: colonyId, status: 'ready' })
      .orderBy('created_at', 'desc');
  }
};

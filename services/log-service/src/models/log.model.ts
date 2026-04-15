import { db } from '../db';
import { Tables } from '@antiverse/database';

export interface LogEntryRow {
  id: string;
  colony_id: string;
  user_id: string;
  user_display_name: string;
  entry_type: 'observation' | 'feeding' | 'maintenance' | 'environmental';
  title: string;
  content: string;
  occurred_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface EnvironmentalReadingRow {
  log_entry_id: string;
  temperature: number | null;
  humidity: number | null;
  light_level: number | null;
}

export const LogModel = {
  async findByColonyId(colonyId: string): Promise<(LogEntryRow & Partial<EnvironmentalReadingRow>)[]> {
    return db(Tables.LOG_ENTRIES)
      .leftJoin(Tables.LOG_ENVIRONMENTAL_READINGS, `${Tables.LOG_ENTRIES}.id`, `${Tables.LOG_ENVIRONMENTAL_READINGS}.log_entry_id`)
      .where('colony_id', colonyId)
      .orderBy('occurred_at', 'desc')
      .select(`${Tables.LOG_ENTRIES}.*`, 'temperature', 'humidity', 'light_level');
  },

  async findById(id: string): Promise<(LogEntryRow & Partial<EnvironmentalReadingRow>) | undefined> {
    return db(Tables.LOG_ENTRIES)
      .leftJoin(Tables.LOG_ENVIRONMENTAL_READINGS, `${Tables.LOG_ENTRIES}.id`, `${Tables.LOG_ENVIRONMENTAL_READINGS}.log_entry_id`)
      .where(`${Tables.LOG_ENTRIES}.id`, id)
      .first()
      .select(`${Tables.LOG_ENTRIES}.*`, 'temperature', 'humidity', 'light_level');
  },

  async create(data: Partial<LogEntryRow>, envData?: Partial<EnvironmentalReadingRow>): Promise<LogEntryRow> {
    return db.transaction(async (trx) => {
      const [entry] = await trx<LogEntryRow>(Tables.LOG_ENTRIES).insert(data).returning('*');
      
      if (envData && (envData.temperature != null || envData.humidity != null || envData.light_level != null)) {
        await trx(Tables.LOG_ENVIRONMENTAL_READINGS).insert({
          ...envData,
          log_entry_id: entry.id
        });
      }

      return entry;
    });
  },

  async delete(id: string): Promise<void> {
    await db(Tables.LOG_ENTRIES).where({ id }).delete();
  }
};

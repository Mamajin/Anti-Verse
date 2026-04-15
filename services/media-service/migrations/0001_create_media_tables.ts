import { Knex } from 'knex';
import { Tables } from '@antiverse/database';

export async function up(knex: Knex): Promise<void> {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

  await knex.raw(`
    DO $$ BEGIN
      CREATE TYPE media_status AS ENUM ('pending', 'ready', 'failed');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `);

  await knex.schema.createTable(Tables.MEDIA_FILES, (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('colony_id').notNullable();
    table.uuid('user_id').notNullable();
    table.uuid('log_entry_id');
    table.string('file_key', 500).notNullable().unique();
    table.string('filename', 255).notNullable();
    table.string('content_type', 100).notNullable();
    table.bigInteger('size_bytes').notNullable();
    table.string('caption', 500);
    table.specificType('status', 'media_status').notNullable().defaultTo('pending');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(['colony_id'], 'idx_media_files_colony_id');
    table.index(['user_id'], 'idx_media_files_user_id');
  });

  await knex.raw(`ALTER TABLE ${Tables.MEDIA_FILES} ADD CONSTRAINT chk_size_bytes CHECK (size_bytes > 0)`);

  await knex.raw(`
    CREATE INDEX idx_media_files_log_entry_id
    ON ${Tables.MEDIA_FILES} (log_entry_id)
    WHERE log_entry_id IS NOT NULL;
  `);

  await knex.raw(`
    CREATE INDEX idx_media_files_colony_status
    ON ${Tables.MEDIA_FILES} (colony_id, status, created_at DESC);
  `);

  await knex.raw(`
    CREATE INDEX idx_media_files_cleanup
    ON ${Tables.MEDIA_FILES} (status, created_at)
    WHERE status = 'pending';
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists(Tables.MEDIA_FILES);
  await knex.raw('DROP TYPE IF EXISTS media_status');
}

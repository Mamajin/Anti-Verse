import { Knex } from 'knex';
import { Tables } from '@antiverse/database';

export async function up(knex: Knex): Promise<void> {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

  await knex.raw(`
    DO $$ BEGIN
      CREATE TYPE log_entry_type AS ENUM ('observation', 'feeding', 'maintenance', 'environmental');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await knex.schema.createTable(Tables.LOG_ENTRIES, (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('colony_id').notNullable(); // External reference to colony service
    table.uuid('user_id').notNullable(); // External reference to auth service
    table.string('user_display_name', 50).notNullable();
    table.specificType('entry_type', 'log_entry_type').notNullable().defaultTo('observation');
    table.string('title', 200).notNullable();
    table.text('content').notNullable();
    table.timestamp('occurred_at', { useTz: true }).notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(['colony_id', 'occurred_at'], 'idx_log_entries_colony_occured');
  });

  await knex.schema.createTable(Tables.LOG_ENVIRONMENTAL_READINGS, (table) => {
    table.uuid('log_entry_id').primary().references('id').inTable(Tables.LOG_ENTRIES).onDelete('CASCADE');
    table.decimal('temperature', 5, 2);
    table.decimal('humidity', 5, 2);
    table.decimal('light_level', 7, 2);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists(Tables.LOG_ENVIRONMENTAL_READINGS);
  await knex.schema.dropTableIfExists(Tables.LOG_ENTRIES);
  await knex.raw('DROP TYPE IF EXISTS log_entry_type');
}

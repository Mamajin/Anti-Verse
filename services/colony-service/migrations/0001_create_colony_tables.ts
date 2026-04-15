import { Knex } from 'knex';
import { Tables } from '@antiverse/database';

export async function up(knex: Knex): Promise<void> {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

  await knex.raw(`
    DO $$ BEGIN
      CREATE TYPE colony_status AS ENUM ('active', 'inactive', 'deceased');
      CREATE TYPE access_role AS ENUM ('owner', 'collaborator', 'viewer');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await knex.schema.createTable(Tables.COLONY_SPECIES, (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('scientific_name', 200).notNullable().unique();
    table.string('common_name', 200).notNullable();
    table.string('subfamily', 100).notNullable();
    table.text('description');
    table.string('native_region', 200);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable(Tables.COLONY_COLONIES, (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('owner_id').notNullable(); // Relates to auth_users, but no FK since different service boundary in theory (shared DB but isolated conceptual boundary)
    table.string('name', 100).notNullable();
    table.text('description');
    table.uuid('species_id').notNullable().references('id').inTable(Tables.COLONY_SPECIES).onDelete('RESTRICT');
    table.specificType('status', 'colony_status').notNullable().defaultTo('active');
    table.timestamp('founding_date', { useTz: true });
    table.integer('queen_count').notNullable().defaultTo(1);
    table.integer('estimated_worker_count');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(['owner_id'], 'idx_colony_colonies_owner');
  });

  await knex.schema.createTable(Tables.COLONY_MEMBERS, (table) => {
    table.uuid('colony_id').notNullable().references('id').inTable(Tables.COLONY_COLONIES).onDelete('CASCADE');
    table.uuid('user_id').notNullable();
    table.string('user_display_name', 50).notNullable();
    table.string('user_email', 255).notNullable();
    table.specificType('access_role', 'access_role').notNullable();
    table.timestamp('granted_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.primary(['colony_id', 'user_id']); // composite PK
    table.index(['user_id'], 'idx_colony_members_user'); // lookup colonies by user
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists(Tables.COLONY_MEMBERS);
  await knex.schema.dropTableIfExists(Tables.COLONY_COLONIES);
  await knex.schema.dropTableIfExists(Tables.COLONY_SPECIES);
  await knex.raw('DROP TYPE IF EXISTS colony_status');
  await knex.raw('DROP TYPE IF EXISTS access_role');
}

import { Knex } from 'knex';
import { Tables } from '@antiverse/database';

export async function up(knex: Knex): Promise<void> {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

  await knex.raw(`
    DO $$ BEGIN
      CREATE TYPE user_role AS ENUM ('keeper', 'researcher', 'admin');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await knex.schema.createTable(Tables.AUTH_USERS, (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('email', 255).notNullable().unique();
    table.string('password_hash', 255).notNullable();
    table.string('display_name', 50).notNullable();
    table.specificType('role', 'user_role').notNullable().defaultTo('keeper');
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(['role'], 'idx_auth_users_role');
  });

  await knex.raw(`
    CREATE INDEX idx_auth_users_is_active
    ON ${Tables.AUTH_USERS} (is_active)
    WHERE is_active = false;
  `);

  await knex.schema.createTable(Tables.AUTH_REFRESH_TOKENS, (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable(Tables.AUTH_USERS).onDelete('CASCADE');
    table.string('token_hash', 255).notNullable().unique();
    table.timestamp('expires_at', { useTz: true }).notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(['user_id'], 'idx_auth_refresh_tokens_user_id');
    table.index(['expires_at'], 'idx_auth_refresh_tokens_expires_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists(Tables.AUTH_REFRESH_TOKENS);
  await knex.schema.dropTableIfExists(Tables.AUTH_USERS);
  await knex.raw('DROP TYPE IF EXISTS user_role');
}

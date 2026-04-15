# Migration 001 – Auth Service Schema

**Service**: `auth-service`
**Database**: `antiverse` (shared instance)
**Table prefix**: `auth_` (logical namespace, no enforced schema separation)

---

## Tables

### `auth_users`

Stores user accounts and credentials.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | Unique user identifier |
| `email` | `VARCHAR(255)` | `NOT NULL`, `UNIQUE` | Login email address |
| `password_hash` | `VARCHAR(255)` | `NOT NULL` | bcrypt hash of the password |
| `display_name` | `VARCHAR(50)` | `NOT NULL` | User-facing display name |
| `role` | `VARCHAR(20)` | `NOT NULL`, `DEFAULT 'keeper'`, `CHECK (role IN ('keeper', 'researcher', 'admin'))` | User role for RBAC |
| `is_active` | `BOOLEAN` | `NOT NULL`, `DEFAULT true` | Soft-disable flag |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT NOW()` | Account creation time |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT NOW()` | Last profile update |

**Indexes**
- `idx_auth_users_email` — `UNIQUE` on `email` (fast login lookup)
- `idx_auth_users_role` — on `role` (admin listing queries)

---

### `auth_refresh_tokens`

Stores active refresh tokens for session management. Tokens are rotated on each refresh.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | Token record ID |
| `user_id` | `UUID` | `NOT NULL`, `REFERENCES auth_users(id) ON DELETE CASCADE` | Owner user |
| `token_hash` | `VARCHAR(255)` | `NOT NULL`, `UNIQUE` | SHA-256 hash of the opaque refresh token |
| `expires_at` | `TIMESTAMPTZ` | `NOT NULL` | Token expiration (7 days from creation) |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT NOW()` | Token issuance time |

**Indexes**
- `idx_auth_refresh_tokens_user_id` — on `user_id` (list/revoke user sessions)
- `idx_auth_refresh_tokens_expires_at` — on `expires_at` (cleanup job)

---

## Knex Migration

```js
// migrations/001_create_auth_tables.js

exports.up = async function (knex) {
  // Enable UUID generation
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

  await knex.schema.createTable('auth_users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('email', 255).notNullable().unique();
    table.string('password_hash', 255).notNullable();
    table.string('display_name', 50).notNullable();
    table
      .enu('role', ['keeper', 'researcher', 'admin'], {
        useNative: true,
        enumName: 'user_role',
      })
      .notNullable()
      .defaultTo('keeper');
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(['role'], 'idx_auth_users_role');
  });

  await knex.schema.createTable('auth_refresh_tokens', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('auth_users').onDelete('CASCADE');
    table.string('token_hash', 255).notNullable().unique();
    table.timestamp('expires_at', { useTz: true }).notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(['user_id'], 'idx_auth_refresh_tokens_user_id');
    table.index(['expires_at'], 'idx_auth_refresh_tokens_expires_at');
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('auth_refresh_tokens');
  await knex.schema.dropTableIfExists('auth_users');
  await knex.raw('DROP TYPE IF EXISTS user_role');
};
```

---

## Seed Data

```js
// seeds/001_admin_user.js

const bcrypt = require('bcrypt');

exports.seed = async function (knex) {
  const hash = await bcrypt.hash('admin123456', 12);

  await knex('auth_users')
    .insert({
      email: 'admin@antiverse.local',
      password_hash: hash,
      display_name: 'System Admin',
      role: 'admin',
    })
    .onConflict('email')
    .ignore();
};
```

> ⚠️ The seed password is for **local development only**. Production must use environment variables or a secure onboarding flow.

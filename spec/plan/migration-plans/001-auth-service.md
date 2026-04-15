# Migration 001 – Auth Service Schema

**Service**: `auth-service`
**Database**: `antiverse` (shared instance)
**Table prefix**: `auth_`
**Migration tracking table**: `auth_service_migrations`

---

## Tables

### `auth_users`

Stores user accounts and credentials.

| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY` | `gen_random_uuid()` | Unique user identifier |
| `email` | `VARCHAR(255)` | `NOT NULL`, `UNIQUE` | — | Login email (lowercased, trimmed) |
| `password_hash` | `VARCHAR(255)` | `NOT NULL` | — | bcrypt hash (12 salt rounds) |
| `display_name` | `VARCHAR(50)` | `NOT NULL` | — | User-facing display name |
| `role` | `user_role` ENUM | `NOT NULL` | `'keeper'` | One of: `keeper`, `researcher`, `admin` |
| `is_active` | `BOOLEAN` | `NOT NULL` | `true` | Soft-disable flag (false = account locked) |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL` | `NOW()` | Account creation time |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL` | `NOW()` | Last profile update |

**Type Decisions**

| Column | Why This Type |
|---|---|
| `id` (UUID) | Prevents enumeration attacks (vs auto-increment). Safe for distributed systems. |
| `email` (VARCHAR 255) | RFC 5321 allows up to 254 chars. 255 gives margin. |
| `password_hash` (VARCHAR 255) | bcrypt output is 60 chars but 255 allows future algorithm changes. |
| `role` (native ENUM) | PostgreSQL native enum for type safety and storage efficiency (4 bytes vs string). |
| `*_at` (TIMESTAMPTZ) | Timezone-aware timestamps. Always stored as UTC. |

**Indexes**

| Name | Columns | Type | Purpose |
|---|---|---|---|
| `auth_users_pkey` | `id` | PRIMARY KEY (unique, B-tree) | PK lookup |
| `auth_users_email_unique` | `email` | UNIQUE (B-tree) | Fast login lookup, prevents duplicates |
| `idx_auth_users_role` | `role` | B-tree | Admin listing queries: "show all researchers" |
| `idx_auth_users_is_active` | `is_active` | B-tree (partial: WHERE is_active = false) | Find disabled accounts |

---

### `auth_refresh_tokens`

Stores hashed refresh tokens. Each row represents one active session. Tokens are single-use (rotated on each refresh).

| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY` | `gen_random_uuid()` | Token record ID |
| `user_id` | `UUID` | `NOT NULL`, `FK → auth_users(id) ON DELETE CASCADE` | — | Token owner |
| `token_hash` | `VARCHAR(255)` | `NOT NULL`, `UNIQUE` | — | SHA-256 hash of the opaque refresh token |
| `expires_at` | `TIMESTAMPTZ` | `NOT NULL` | — | Token expiry (7 days from creation) |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL` | `NOW()` | Token issuance time |

**Type Decisions**

| Column | Why This Type |
|---|---|
| `token_hash` (VARCHAR 255) | SHA-256 produces 64 hex chars. 255 allows future hash algorithm changes. |
| `expires_at` | Explicit expiry enables DB-level cleanup without parsing tokens. |

**Indexes**

| Name | Columns | Type | Purpose |
|---|---|---|---|
| `auth_refresh_tokens_pkey` | `id` | PRIMARY KEY | PK lookup |
| `auth_refresh_tokens_token_hash_unique` | `token_hash` | UNIQUE | Fast token verification on refresh |
| `idx_auth_refresh_tokens_user_id` | `user_id` | B-tree | Revoke all sessions for a user |
| `idx_auth_refresh_tokens_expires_at` | `expires_at` | B-tree | Cleanup job: DELETE WHERE expires_at < NOW() |

**Cascade Behavior**: `ON DELETE CASCADE` from `auth_users` — deleting a user automatically revokes all their refresh tokens.

---

## Knex Migration

```js
// migrations/001_create_auth_tables.js

exports.up = async function (knex) {
  // Enable UUID generation
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

  // Create native ENUM type
  await knex.raw(`
    DO $$ BEGIN
      CREATE TYPE user_role AS ENUM ('keeper', 'researcher', 'admin');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await knex.schema.createTable('auth_users', (table) => {
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

  // Partial index for disabled accounts
  await knex.raw(`
    CREATE INDEX idx_auth_users_is_active
    ON auth_users (is_active)
    WHERE is_active = false;
  `);

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

## Rollback Strategy

**`exports.down`** drops tables in reverse dependency order:
1. Drop `auth_refresh_tokens` (depends on `auth_users`)
2. Drop `auth_users`
3. Drop `user_role` ENUM type

**Data loss warning**: Rolling back this migration deletes all user accounts and sessions. In production, prefer forward migrations (add/modify columns) over rollbacks.

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

  console.log('✅ Auth seed complete: admin@antiverse.local / admin123456');
};
```

> ⚠️ The seed password is for **local development only**. Never use in production. Production admin accounts should be created via a secure setup script or environment variable.

---

## Maintenance Queries

```sql
-- Clean up expired refresh tokens (run periodically)
DELETE FROM auth_refresh_tokens WHERE expires_at < NOW();

-- Count active sessions per user
SELECT user_id, COUNT(*) as sessions
FROM auth_refresh_tokens
WHERE expires_at > NOW()
GROUP BY user_id
ORDER BY sessions DESC;

-- Find inactive/locked accounts
SELECT id, email, display_name, created_at
FROM auth_users
WHERE is_active = false;

-- Count users by role
SELECT role, COUNT(*) as count FROM auth_users GROUP BY role;
```

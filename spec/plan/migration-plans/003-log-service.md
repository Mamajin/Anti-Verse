# Migration 003 – Log Service Schema

**Service**: `log-service`
**Database**: `antiverse` (shared instance)
**Table prefix**: `log_`

---

## Tables

### `log_entries`

Journal entries linked to colonies. Each entry has a type and optional environmental readings.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | Entry identifier |
| `colony_id` | `UUID` | `NOT NULL` | Colony this entry belongs to (validated via Colony Service API) |
| `user_id` | `UUID` | `NOT NULL` | Author's user ID (from Auth Service) |
| `entry_type` | `VARCHAR(20)` | `NOT NULL`, `CHECK (entry_type IN ('observation', 'feeding', 'maintenance', 'environmental'))` | Entry category |
| `title` | `VARCHAR(200)` | `NOT NULL` | Short title / summary |
| `content` | `TEXT` | `NOT NULL` | Full observation text |
| `occurred_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT NOW()` | When the observation occurred |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT NOW()` | Record creation time |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT NOW()` | Last edit time |

**Indexes**
- `idx_log_entries_colony_id` — on `colony_id` (list entries for a colony)
- `idx_log_entries_user_id` — on `user_id` (list entries by a user)
- `idx_log_entries_occurred_at` — on `occurred_at` (date range queries)
- `idx_log_entries_entry_type` — on `entry_type` (filter by type)
- `idx_log_entries_colony_occurred` — composite on `(colony_id, occurred_at DESC)` (paginated colony timeline)

---

### `log_environmental_readings`

Structured environmental measurements attached to log entries. One reading per log entry (1:1 relationship, but stored separately for query performance on chart data).

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | Reading identifier |
| `log_entry_id` | `UUID` | `NOT NULL`, `UNIQUE`, `REFERENCES log_entries(id) ON DELETE CASCADE` | Parent log entry |
| `colony_id` | `UUID` | `NOT NULL` | Denormalized colony ID for faster chart queries |
| `temperature` | `DECIMAL(5,2)` | | Temperature in °C |
| `humidity` | `DECIMAL(5,2)` | `CHECK (humidity >= 0 AND humidity <= 100)` | Relative humidity % |
| `light_level` | `DECIMAL(10,2)` | `CHECK (light_level >= 0)` | Light intensity in lux |
| `recorded_at` | `TIMESTAMPTZ` | `NOT NULL` | Copied from parent entry's `occurred_at` |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT NOW()` | Record creation time |

**Indexes**
- `idx_log_env_colony_recorded` — composite on `(colony_id, recorded_at DESC)` (time-series chart queries)
- `idx_log_env_log_entry_id` — `UNIQUE` on `log_entry_id` (1:1 join)

---

## Design Decisions

### Why separate the environmental readings table?

1. **Chart performance**: The dashboard uses Apex Charts to plot temperature/humidity/light over time. A dedicated table allows efficient range queries without loading full log text content.
2. **Schema clarity**: Not all log entries have environmental data. Separating avoids sparse nullable columns on the main table.
3. **Denormalized `colony_id`**: Copied from the parent entry to avoid a JOIN when building chart datasets.

### Colony validation

The Log Service does **not** have a foreign key to `colony_colonies` (that table belongs to Colony Service). Instead, on every write operation, the Log Service calls `GET /api/colonies/:id/verify` on the Colony Service to confirm:
- The colony exists
- The requesting user has at least `collaborator` access

---

## Knex Migration

```js
// migrations/003_create_log_tables.js

exports.up = async function (knex) {
  await knex.schema.createTable('log_entries', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('colony_id').notNullable();
    table.uuid('user_id').notNullable();
    table
      .enu('entry_type', ['observation', 'feeding', 'maintenance', 'environmental'], {
        useNative: true,
        enumName: 'log_entry_type',
      })
      .notNullable();
    table.string('title', 200).notNullable();
    table.text('content').notNullable();
    table.timestamp('occurred_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(['colony_id'], 'idx_log_entries_colony_id');
    table.index(['user_id'], 'idx_log_entries_user_id');
    table.index(['occurred_at'], 'idx_log_entries_occurred_at');
    table.index(['entry_type'], 'idx_log_entries_entry_type');
    table.index(['colony_id', 'occurred_at'], 'idx_log_entries_colony_occurred');
  });

  await knex.schema.createTable('log_environmental_readings', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('log_entry_id')
      .notNullable()
      .unique()
      .references('id')
      .inTable('log_entries')
      .onDelete('CASCADE');
    table.uuid('colony_id').notNullable();
    table.decimal('temperature', 5, 2);
    table.decimal('humidity', 5, 2);
    table.decimal('light_level', 10, 2);
    table.timestamp('recorded_at', { useTz: true }).notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    // Range constraints
    table.check('?? IS NULL OR (?? >= 0 AND ?? <= 100)', ['humidity', 'humidity', 'humidity']);
    table.check('?? IS NULL OR ?? >= 0', ['light_level', 'light_level']);

    table.index(['colony_id', 'recorded_at'], 'idx_log_env_colony_recorded');
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('log_environmental_readings');
  await knex.schema.dropTableIfExists('log_entries');
  await knex.raw('DROP TYPE IF EXISTS log_entry_type');
};
```

---

## Seed Data

```js
// seeds/003_sample_log_entries.js
// NOTE: This seed depends on having a colony and user inserted first.
// Use in dev only after auth + colony seeds have run.

exports.seed = async function (knex) {
  // Sample entries would reference real colony/user IDs from prior seeds.
  // Skipping auto-insert here; use the API or a dev script instead.
  console.log('Log seed: Use the API to create sample log entries after colonies exist.');
};
```

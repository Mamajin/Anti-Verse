# Migration 003 – Log Service Schema

**Service**: `log-service`
**Database**: `antiverse` (shared instance)
**Table prefix**: `log_`
**Migration tracking table**: `log_service_migrations`

---

## Tables

### `log_entries`

Journal entries linked to colonies. Each entry has a category type and free-text content.

| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY` | `gen_random_uuid()` | Entry identifier |
| `colony_id` | `UUID` | `NOT NULL` | — | Colony this entry belongs to. *Not a FK — validated via Colony Service API.* |
| `user_id` | `UUID` | `NOT NULL` | — | Author's user ID. *Not a FK — validated via Auth Service API.* |
| `entry_type` | `log_entry_type` ENUM | `NOT NULL` | — | Category: `observation`, `feeding`, `maintenance`, `environmental` |
| `title` | `VARCHAR(200)` | `NOT NULL` | — | Short title / summary |
| `content` | `TEXT` | `NOT NULL` | — | Full observation text (max 10,000 chars enforced at app layer) |
| `occurred_at` | `TIMESTAMPTZ` | `NOT NULL` | `NOW()` | When the observation occurred (user-specified or default) |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL` | `NOW()` | Record creation time |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL` | `NOW()` | Last edit time |

**Type Decisions**

| Column | Why This Type |
|---|---|
| `colony_id` (UUID, no FK) | Cross-service reference. Colony Service owns this data. Validated on every write via `GET /api/colonies/:id/verify`. |
| `user_id` (UUID, no FK) | Cross-service reference. Auth Service owns this data. Validated via JWT verification. |
| `entry_type` (native ENUM) | Fixed set of 4 values. Type-safe, storage-efficient, and queryable. |
| `content` (TEXT) | Unbounded at DB level; 10,000 char limit enforced by Zod validation in the API layer. |
| `occurred_at` (TIMESTAMPTZ) | The observation time may differ from creation time (user backdates entries). Timezone-aware for global use. |

**Indexes**

| Name | Columns | Type | Purpose |
|---|---|---|---|
| `log_entries_pkey` | `id` | PRIMARY KEY | PK lookup |
| `idx_log_entries_colony_id` | `colony_id` | B-tree | List all entries for a colony |
| `idx_log_entries_user_id` | `user_id` | B-tree | List all entries by a user |
| `idx_log_entries_entry_type` | `entry_type` | B-tree | Filter by entry type |
| `idx_log_entries_colony_occurred` | `(colony_id, occurred_at DESC)` | B-tree composite | **Primary query pattern**: paginated colony timeline sorted by most recent |
| `idx_log_entries_colony_type_occurred` | `(colony_id, entry_type, occurred_at DESC)` | B-tree composite | Colony timeline filtered by type |

**Index Design Rationale**: The two composite indexes cover the two most common query patterns:
1. "Show me all entries for colony X, newest first" → `idx_log_entries_colony_occurred`
2. "Show me all observation entries for colony X, newest first" → `idx_log_entries_colony_type_occurred`

Both support efficient keyset or offset pagination.

---

### `log_environmental_readings`

Structured environmental measurements attached to log entries. One reading per log entry (1:1 relationship). Stored separately for chart query performance.

| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY` | `gen_random_uuid()` | Reading identifier |
| `log_entry_id` | `UUID` | `NOT NULL`, `UNIQUE`, `FK → log_entries(id) ON DELETE CASCADE` | — | Parent log entry (1:1) |
| `colony_id` | `UUID` | `NOT NULL` | — | **Denormalized** colony ID for chart queries |
| `temperature` | `DECIMAL(5,2)` | — | — | Temperature in °C (range: -99.99 to 999.99) |
| `humidity` | `DECIMAL(5,2)` | `CHECK (>= 0 AND <= 100)` | — | Relative humidity % |
| `light_level` | `DECIMAL(10,2)` | `CHECK (>= 0)` | — | Light intensity in lux |
| `recorded_at` | `TIMESTAMPTZ` | `NOT NULL` | — | Copied from parent's `occurred_at` |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL` | `NOW()` | Record creation time |

**Type Decisions**

| Column | Why This Type |
|---|---|
| `temperature` (DECIMAL 5,2) | 2 decimal precision for scientific readings. Range supports -99.99°C to 999.99°C (sufficient for all terrestrial environments). |
| `humidity` (DECIMAL 5,2) | Percentage 0.00–100.00. Check constraint enforces valid range. |
| `light_level` (DECIMAL 10,2) | Lux can range from 0 (dark) to 100,000+ (direct sunlight). DECIMAL(10,2) supports up to 99,999,999.99 lux. |
| `colony_id` (denormalized) | Key design decision — see rationale below. |
| `recorded_at` (copied) | Duplicated from parent entry to avoid joining `log_entries` for chart data queries. |

**Indexes**

| Name | Columns | Type | Purpose |
|---|---|---|---|
| `log_environmental_readings_pkey` | `id` | PRIMARY KEY | PK lookup |
| `log_env_log_entry_id_unique` | `log_entry_id` | UNIQUE | Enforces 1:1 with log_entries; fast join |
| `idx_log_env_colony_recorded` | `(colony_id, recorded_at DESC)` | B-tree composite | **Chart query** — time-series range scans for Apex Charts |

---

## Design Decisions

### Why a Separate Environmental Readings Table?

**Option A (rejected)**: Add temperature/humidity/light columns directly to `log_entries`.
- ❌ Most log entries (~70%) won't have environmental data → lots of NULL columns
- ❌ Chart queries would scan the large `log_entries` table including all text content
- ❌ Adding new sensor types (e.g., CO2, pH) would keep expanding the main table

**Option B (chosen)**: Separate `log_environmental_readings` table.
- ✅ Only query the small, numeric-only table for chart data
- ✅ The composite index `(colony_id, recorded_at)` gives fast time-series range scans
- ✅ No NULL bloat in the main entries table
- ✅ Easy to add new sensor columns without touching log_entries
- ✅ Denormalized `colony_id` eliminates the need for a join in chart queries

### Why Denormalize `colony_id`?

The `colony_id` exists on both `log_entries` and `log_environmental_readings`. This is intentional:

- **Without denormalization**: Chart queries would need to join `log_environmental_readings` → `log_entries` to filter by colony. For large datasets with thousands of readings, this join is unnecessary overhead.
- **With denormalization**: Chart query becomes a simple index scan: `SELECT * FROM log_environmental_readings WHERE colony_id = $1 AND recorded_at BETWEEN $2 AND $3 ORDER BY recorded_at`.
- **Consistency**: Since readings are always created alongside their parent entry (same transaction), and colony_id never changes on an entry, the denormalized value is always correct.

### Cross-Service Validation

The Log Service does **not** have a foreign key to `colony_colonies` — that table belongs to Colony Service. On every **write** operation (create, update, delete), the Log Service:

1. Calls `GET /api/auth/verify` to confirm the user's identity
2. Calls `GET /api/colonies/:id/verify` to confirm:
   - The colony exists and is not deleted
   - The requesting user has at least `collaborator` access (not `viewer`)

On **read** operations, the same verification happens but `viewer` access is sufficient.

---

## Knex Migration

```js
// migrations/003_create_log_tables.js

exports.up = async function (knex) {
  // Create native ENUM type
  await knex.raw(`
    DO $$ BEGIN
      CREATE TYPE log_entry_type AS ENUM ('observation', 'feeding', 'maintenance', 'environmental');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `);

  // Log entries
  await knex.schema.createTable('log_entries', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('colony_id').notNullable();
    table.uuid('user_id').notNullable();
    table.specificType('entry_type', 'log_entry_type').notNullable();
    table.string('title', 200).notNullable();
    table.text('content').notNullable();
    table.timestamp('occurred_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(['colony_id'], 'idx_log_entries_colony_id');
    table.index(['user_id'], 'idx_log_entries_user_id');
    table.index(['entry_type'], 'idx_log_entries_entry_type');
  });

  // Composite indexes for common query patterns
  await knex.raw(`
    CREATE INDEX idx_log_entries_colony_occurred
    ON log_entries (colony_id, occurred_at DESC);
  `);
  await knex.raw(`
    CREATE INDEX idx_log_entries_colony_type_occurred
    ON log_entries (colony_id, entry_type, occurred_at DESC);
  `);

  // Environmental readings
  await knex.schema.createTable('log_environmental_readings', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('log_entry_id').notNullable().unique().references('id').inTable('log_entries').onDelete('CASCADE');
    table.uuid('colony_id').notNullable();
    table.decimal('temperature', 5, 2);
    table.decimal('humidity', 5, 2);
    table.decimal('light_level', 10, 2);
    table.timestamp('recorded_at', { useTz: true }).notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  // Check constraints
  await knex.raw(`
    ALTER TABLE log_environmental_readings
    ADD CONSTRAINT chk_humidity CHECK (humidity IS NULL OR (humidity >= 0 AND humidity <= 100));
  `);
  await knex.raw(`
    ALTER TABLE log_environmental_readings
    ADD CONSTRAINT chk_light_level CHECK (light_level IS NULL OR light_level >= 0);
  `);

  // Chart query index (the most important index in this table)
  await knex.raw(`
    CREATE INDEX idx_log_env_colony_recorded
    ON log_environmental_readings (colony_id, recorded_at DESC);
  `);
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('log_environmental_readings');
  await knex.schema.dropTableIfExists('log_entries');
  await knex.raw('DROP TYPE IF EXISTS log_entry_type');
};
```

---

## Rollback Strategy

**`exports.down`** drops tables in reverse dependency order:
1. `log_environmental_readings` (FK → log_entries)
2. `log_entries`
3. `log_entry_type` ENUM

**Data loss warning**: Rolling back deletes all log entries and environmental readings. Media attached to log entries will become orphaned (their `log_entry_id` reference will be dangling).

---

## Seed Data

```js
// seeds/003_sample_log_entries.js
// NOTE: Requires admin user (from auth seed) and at least one colony to exist.
// Run after auth and colony seeds. For manual dev setup, create a colony via API first.

exports.seed = async function (knex) {
  console.log('ℹ️  Log seed: Create sample entries via the API after setting up a colony.');
  console.log('   Example:');
  console.log('   1. POST /api/auth/login → get access token');
  console.log('   2. POST /api/colonies → create a colony');
  console.log('   3. POST /api/logs/:colonyId → create log entries');
};
```

---

## Maintenance Queries

```sql
-- Count entries per colony
SELECT colony_id, COUNT(*) as entry_count
FROM log_entries
GROUP BY colony_id
ORDER BY entry_count DESC;

-- Count entries by type
SELECT entry_type, COUNT(*) as count FROM log_entries GROUP BY entry_type;

-- Average environmental readings per colony (last 30 days)
SELECT
  colony_id,
  ROUND(AVG(temperature), 1) as avg_temp,
  ROUND(AVG(humidity), 1) as avg_humidity,
  ROUND(AVG(light_level), 0) as avg_light,
  COUNT(*) as reading_count
FROM log_environmental_readings
WHERE recorded_at > NOW() - INTERVAL '30 days'
GROUP BY colony_id;

-- Chart data query (what the API endpoint generates)
SELECT recorded_at, temperature, humidity, light_level
FROM log_environmental_readings
WHERE colony_id = $1
  AND recorded_at BETWEEN $2 AND $3
ORDER BY recorded_at ASC;

-- Entries with no environmental reading (content-only entries)
SELECT le.id, le.title, le.entry_type
FROM log_entries le
LEFT JOIN log_environmental_readings er ON le.id = er.log_entry_id
WHERE er.id IS NULL
  AND le.colony_id = $1;
```

---

## Example Queries (Application Layer)

```sql
-- Paginated colony timeline (most common query)
SELECT le.*, er.temperature, er.humidity, er.light_level
FROM log_entries le
LEFT JOIN log_environmental_readings er ON le.id = er.log_entry_id
WHERE le.colony_id = $1
ORDER BY le.occurred_at DESC
LIMIT $2 OFFSET $3;

-- Filtered by type
SELECT le.*, er.temperature, er.humidity, er.light_level
FROM log_entries le
LEFT JOIN log_environmental_readings er ON le.id = er.log_entry_id
WHERE le.colony_id = $1
  AND le.entry_type = $2
ORDER BY le.occurred_at DESC
LIMIT $3 OFFSET $4;

-- Date range filter
SELECT le.*, er.temperature, er.humidity, er.light_level
FROM log_entries le
LEFT JOIN log_environmental_readings er ON le.id = er.log_entry_id
WHERE le.colony_id = $1
  AND le.occurred_at BETWEEN $2 AND $3
ORDER BY le.occurred_at DESC;
```

# Migration 002 – Colony Service Schema

**Service**: `colony-service`
**Database**: `antiverse` (shared instance)
**Table prefix**: `colony_`
**Migration tracking table**: `colony_service_migrations`

---

## Tables

### `colony_species`

Reference catalog of ant species. Admin-editable. Pre-populated via seed data.

| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY` | `gen_random_uuid()` | Species identifier |
| `scientific_name` | `VARCHAR(200)` | `NOT NULL`, `UNIQUE` | — | e.g., "Camponotus pennsylvanicus" |
| `common_name` | `VARCHAR(200)` | `NOT NULL` | — | e.g., "Black Carpenter Ant" |
| `subfamily` | `VARCHAR(100)` | `NOT NULL` | — | Taxonomic subfamily (e.g., "Formicinae") |
| `description` | `TEXT` | — | — | General information and characteristics |
| `native_region` | `VARCHAR(200)` | — | — | Geographic range description |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL` | `NOW()` | Record creation time |

**Type Decisions**

| Column | Why This Type |
|---|---|
| `scientific_name` (VARCHAR 200) | Longest known ant genus+species names are ~80 chars. 200 provides margin for subspecies. |
| `description` (TEXT) | Unbounded; species descriptions vary widely in length. |
| No `updated_at` | Species data is reference data, rarely edited. `created_at` is sufficient. |

**Indexes**

| Name | Columns | Type | Purpose |
|---|---|---|---|
| `colony_species_pkey` | `id` | PRIMARY KEY | PK lookup |
| `colony_species_scientific_name_unique` | `scientific_name` | UNIQUE | Prevent duplicate species entries |
| `idx_colony_species_search` | `scientific_name`, `common_name` | GIN trigram (pg_trgm) | Full-text fuzzy search |

**Search Index**: The trigram GIN index enables efficient `ILIKE '%partial%'` searches on both names. Requires the `pg_trgm` extension.

---

### `colony_colonies`

Core colony records. Each colony belongs to one species and one owner.

| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY` | `gen_random_uuid()` | Colony identifier |
| `owner_id` | `UUID` | `NOT NULL` | — | User ID of the colony creator (from Auth Service). *Not a FK — cross-service.* |
| `species_id` | `UUID` | `NOT NULL`, `FK → colony_species(id)` | — | Species foreign key |
| `name` | `VARCHAR(100)` | `NOT NULL` | — | Colony display name |
| `description` | `TEXT` | — | — | Detailed colony description |
| `status` | `colony_status` ENUM | `NOT NULL` | `'active'` | Lifecycle: `active`, `inactive`, `deceased` |
| `founding_date` | `DATE` | — | — | Date the colony was founded/captured |
| `queen_count` | `INTEGER` | `NOT NULL`, `CHECK (>= 0)` | `1` | Number of queens |
| `estimated_worker_count` | `INTEGER` | `CHECK (>= 0)` | — | Estimated worker population |
| `is_deleted` | `BOOLEAN` | `NOT NULL` | `false` | Soft-delete flag |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL` | `NOW()` | Record creation time |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL` | `NOW()` | Last update time |

**Type Decisions**

| Column | Why This Type |
|---|---|
| `owner_id` (UUID, no FK) | This references a user in `auth_users`, but we can't add a FK across service boundaries. Validated via Auth Service API at write time. |
| `status` (native ENUM) | Fixed set of values. ENUM is type-safe and storage-efficient. |
| `founding_date` (DATE) | Date-only (no time component). Many colonies are captured with only the date known. |
| `queen_count` (INTEGER) | Ant colonies can have 0 queens (queenless period) or multiple (polygyne species). |
| `is_deleted` (BOOLEAN) | Soft delete allows recovery. Hard delete would cascade to logs/media via API. |

**Indexes**

| Name | Columns | Type | Purpose |
|---|---|---|---|
| `colony_colonies_pkey` | `id` | PRIMARY KEY | PK lookup |
| `idx_colony_colonies_owner_id` | `owner_id` | B-tree | List colonies by owner |
| `idx_colony_colonies_species_id` | `species_id` | B-tree | Filter by species |
| `idx_colony_colonies_status` | `status` | B-tree | Filter by lifecycle status |
| `idx_colony_colonies_not_deleted` | `id`, `owner_id` | B-tree (partial: WHERE is_deleted = false) | Most queries filter out deleted colonies |

---

### `colony_members`

Tracks shared access to colonies (collaboration). Maps users to colonies with access levels.

| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY` | `gen_random_uuid()` | Membership record ID |
| `colony_id` | `UUID` | `NOT NULL`, `FK → colony_colonies(id) ON DELETE CASCADE` | — | Colony FK |
| `user_id` | `UUID` | `NOT NULL` | — | User ID (from Auth Service). *Not a FK — cross-service.* |
| `access_role` | `colony_access_role` ENUM | `NOT NULL` | — | One of: `owner`, `collaborator`, `viewer` |
| `granted_at` | `TIMESTAMPTZ` | `NOT NULL` | `NOW()` | When access was granted |

**Constraints**

| Constraint | Type | Description |
|---|---|---|
| `colony_members_colony_user_unique` | UNIQUE | `(colony_id, user_id)` — A user can have only one role per colony |

**Indexes**

| Name | Columns | Type | Purpose |
|---|---|---|---|
| `colony_members_pkey` | `id` | PRIMARY KEY | PK lookup |
| `colony_members_colony_user_unique` | `colony_id`, `user_id` | UNIQUE | Prevents duplicate membership |
| `idx_colony_members_user_id` | `user_id` | B-tree | "List all colonies I have access to" |
| `idx_colony_members_colony_id` | `colony_id` | B-tree | "List all members of this colony" |

**Cascade Behavior**: `ON DELETE CASCADE` from `colony_colonies` — deleting (actually soft-deleting won't trigger this; hard delete would) a colony removes all member records.

---

## Knex Migration

```js
// migrations/002_create_colony_tables.js

exports.up = async function (knex) {
  // Enable trigram search extension
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pg_trgm"');

  // Create native ENUM types
  await knex.raw(`
    DO $$ BEGIN
      CREATE TYPE colony_status AS ENUM ('active', 'inactive', 'deceased');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `);
  await knex.raw(`
    DO $$ BEGIN
      CREATE TYPE colony_access_role AS ENUM ('owner', 'collaborator', 'viewer');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `);

  // Species catalog
  await knex.schema.createTable('colony_species', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('scientific_name', 200).notNullable().unique();
    table.string('common_name', 200).notNullable();
    table.string('subfamily', 100).notNullable();
    table.text('description');
    table.string('native_region', 200);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  // Trigram search index on species names
  await knex.raw(`
    CREATE INDEX idx_colony_species_search
    ON colony_species
    USING GIN ((scientific_name || ' ' || common_name) gin_trgm_ops);
  `);

  // Colonies
  await knex.schema.createTable('colony_colonies', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('owner_id').notNullable();
    table.uuid('species_id').notNullable().references('id').inTable('colony_species');
    table.string('name', 100).notNullable();
    table.text('description');
    table.specificType('status', 'colony_status').notNullable().defaultTo('active');
    table.date('founding_date');
    table.integer('queen_count').notNullable().defaultTo(1);
    table.integer('estimated_worker_count');
    table.boolean('is_deleted').notNullable().defaultTo(false);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(['owner_id'], 'idx_colony_colonies_owner_id');
    table.index(['species_id'], 'idx_colony_colonies_species_id');
    table.index(['status'], 'idx_colony_colonies_status');
  });

  // Check constraints
  await knex.raw('ALTER TABLE colony_colonies ADD CONSTRAINT chk_queen_count CHECK (queen_count >= 0)');
  await knex.raw('ALTER TABLE colony_colonies ADD CONSTRAINT chk_worker_count CHECK (estimated_worker_count IS NULL OR estimated_worker_count >= 0)');

  // Partial index for non-deleted colonies
  await knex.raw(`
    CREATE INDEX idx_colony_colonies_not_deleted
    ON colony_colonies (id, owner_id)
    WHERE is_deleted = false;
  `);

  // Colony members
  await knex.schema.createTable('colony_members', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('colony_id').notNullable().references('id').inTable('colony_colonies').onDelete('CASCADE');
    table.uuid('user_id').notNullable();
    table.specificType('access_role', 'colony_access_role').notNullable();
    table.timestamp('granted_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.unique(['colony_id', 'user_id'], { indexName: 'colony_members_colony_user_unique' });
    table.index(['user_id'], 'idx_colony_members_user_id');
    table.index(['colony_id'], 'idx_colony_members_colony_id');
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('colony_members');
  await knex.schema.dropTableIfExists('colony_colonies');
  await knex.schema.dropTableIfExists('colony_species');
  await knex.raw('DROP TYPE IF EXISTS colony_status');
  await knex.raw('DROP TYPE IF EXISTS colony_access_role');
};
```

---

## Rollback Strategy

**`exports.down`** drops tables in reverse dependency order:
1. `colony_members` (FK → colony_colonies)
2. `colony_colonies` (FK → colony_species)
3. `colony_species`
4. ENUM types

**Data loss warning**: Rolling back deletes all colony data, members, and species catalog. In production, prefer additive migrations.

---

## Seed Data

```js
// seeds/002_species_catalog.js

exports.seed = async function (knex) {
  const species = [
    {
      scientific_name: 'Camponotus pennsylvanicus',
      common_name: 'Black Carpenter Ant',
      subfamily: 'Formicinae',
      description: 'One of the largest ant species in North America (8–13mm workers). Known for nesting in dead wood and wooden structures. Nocturnal foragers. Colonies can reach 10,000+ workers. Polymorphic workers with major and minor castes.',
      native_region: 'Eastern North America',
    },
    {
      scientific_name: 'Solenopsis invicta',
      common_name: 'Red Imported Fire Ant',
      subfamily: 'Myrmicinae',
      description: 'Aggressive species (2–6mm workers) known for its painful venomous sting. Highly invasive. Builds large mound nests. Colonies can be monogyne (single queen) or polygyne (multiple queens). One of the most studied ant species.',
      native_region: 'South America (now global invasive)',
    },
    {
      scientific_name: 'Atta cephalotes',
      common_name: 'Leafcutter Ant',
      subfamily: 'Myrmicinae',
      description: 'Fungus-farming ant species. Workers cut fresh vegetation and carry it to underground gardens where they cultivate a symbiotic fungus. Highly polymorphic with castes ranging from 1mm minima to 16mm soldiers. Colonies can contain millions of workers.',
      native_region: 'Central and South America',
    },
    {
      scientific_name: 'Lasius niger',
      common_name: 'Black Garden Ant',
      subfamily: 'Formicinae',
      description: 'The most common garden ant in Europe (3.5–5mm workers). Excellent beginner species for ant keeping. Queens can live 15–30 years. Monogyne colonies typically reach 5,000–15,000 workers. Famous for tending aphids for honeydew.',
      native_region: 'Europe, Northern Asia',
    },
    {
      scientific_name: 'Messor barbarus',
      common_name: 'Harvester Ant',
      subfamily: 'Myrmicinae',
      description: 'Popular seed-harvesting ant in the ant keeping hobby. Distinctive bicolored workers (red head, black gaster, 3–14mm). Highly polymorphic. Store seeds in underground granaries. Relatively low maintenance. Native to the Mediterranean.',
      native_region: 'Mediterranean Europe, North Africa',
    },
    {
      scientific_name: 'Formica rufa',
      common_name: 'Red Wood Ant',
      subfamily: 'Formicinae',
      description: 'Builds large mound nests (up to 2m tall) from pine needles and twigs in forests. Workers (4.5–9mm) can spray formic acid for defense. Colonies are often polygynous and can form supercolonies. Important forest ecosystem engineers.',
      native_region: 'Europe, Northern Asia',
    },
    {
      scientific_name: 'Pogonomyrmex barbatus',
      common_name: 'Red Harvester Ant',
      subfamily: 'Myrmicinae',
      description: 'Desert-dwelling harvester ant (6–7mm workers). Has the most toxic insect venom (by weight). Constructs deep nests with extensive tunnel systems. Granivorous diet. Featured in numerous scientific studies on collective behavior.',
      native_region: 'Southwestern United States, Northern Mexico',
    },
    {
      scientific_name: 'Pheidole megacephala',
      common_name: 'Big-headed Ant',
      subfamily: 'Myrmicinae',
      description: 'One of the world\'s worst invasive species. Distinct dimorphism: minor workers (2mm) and major workers (3.5mm) with disproportionately large heads. Forms supercolonies. Originally from southern Africa, now pantropical.',
      native_region: 'Southern Africa (now pantropical invasive)',
    },
    {
      scientific_name: 'Crematogaster scutellaris',
      common_name: 'Mediterranean Acrobat Ant',
      subfamily: 'Myrmicinae',
      description: 'Named for their habit of raising their heart-shaped gaster over their thorax when alarmed. Workers are 3–5mm. Build carton nests in tree cavities. Arboreal species that tends sap-sucking insects. Popular in European ant keeping.',
      native_region: 'Mediterranean Europe, North Africa',
    },
    {
      scientific_name: 'Harpegnathos saltator',
      common_name: 'Jumping Ant',
      subfamily: 'Ponerinae',
      description: 'Remarkable ant species where workers can become "gamergates" (reproductive workers) when the queen dies. Known for their impressive jumping ability. Large (14–18mm), visual hunters with excellent eyesight. Small colony sizes (50–200).',
      native_region: 'Indian Subcontinent',
    },
  ];

  for (const sp of species) {
    await knex('colony_species').insert(sp).onConflict('scientific_name').ignore();
  }

  console.log(`✅ Colony seed complete: ${species.length} species inserted`);
};
```

---

## Maintenance Queries

```sql
-- Count colonies by status
SELECT status, COUNT(*) as count FROM colony_colonies WHERE is_deleted = false GROUP BY status;

-- Find orphaned colonies (owner no longer exists — verify via Auth API)
SELECT id, owner_id, name FROM colony_colonies WHERE is_deleted = false;

-- Colony member counts
SELECT c.id, c.name, COUNT(m.id) as member_count
FROM colony_colonies c
LEFT JOIN colony_members m ON c.id = m.colony_id
WHERE c.is_deleted = false
GROUP BY c.id, c.name
ORDER BY member_count DESC;

-- Species popularity (most-used species)
SELECT s.common_name, s.scientific_name, COUNT(c.id) as colony_count
FROM colony_species s
LEFT JOIN colony_colonies c ON s.id = c.species_id AND c.is_deleted = false
GROUP BY s.id
ORDER BY colony_count DESC;

-- Search species by partial name (uses trigram index)
SELECT * FROM colony_species
WHERE (scientific_name || ' ' || common_name) ILIKE '%carpenter%';
```

---

## Example Queries (Application Layer)

```sql
-- List colonies for a user (via colony_members join)
SELECT c.*, s.scientific_name, s.common_name, m.access_role
FROM colony_colonies c
JOIN colony_members m ON c.id = m.colony_id
JOIN colony_species s ON c.species_id = s.id
WHERE m.user_id = $1 AND c.is_deleted = false
ORDER BY c.created_at DESC
LIMIT $2 OFFSET $3;

-- Verify colony access (internal endpoint)
SELECT m.access_role
FROM colony_members m
JOIN colony_colonies c ON m.colony_id = c.id
WHERE c.id = $1 AND m.user_id = $2 AND c.is_deleted = false;
```

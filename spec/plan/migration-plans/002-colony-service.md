# Migration 002 – Colony Service Schema

**Service**: `colony-service`
**Database**: `antiverse` (shared instance)
**Table prefix**: `colony_`

---

## Tables

### `colony_species`

Reference catalog of ant species. Populated via seed data; admin-editable.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | Species identifier |
| `scientific_name` | `VARCHAR(200)` | `NOT NULL`, `UNIQUE` | e.g. "Camponotus pennsylvanicus" |
| `common_name` | `VARCHAR(200)` | `NOT NULL` | e.g. "Black Carpenter Ant" |
| `subfamily` | `VARCHAR(100)` | `NOT NULL` | Taxonomic subfamily |
| `description` | `TEXT` | | General information |
| `native_region` | `VARCHAR(200)` | | Geographic range |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT NOW()` | Record creation time |

**Indexes**
- `idx_colony_species_scientific_name` — `UNIQUE` on `scientific_name`
- `idx_colony_species_search` — GIN trigram on `scientific_name` + `common_name` (full-text search)

---

### `colony_colonies`

Core colony records.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | Colony identifier |
| `owner_id` | `UUID` | `NOT NULL` | User ID of the colony owner (from Auth) |
| `species_id` | `UUID` | `NOT NULL`, `REFERENCES colony_species(id)` | Species FK |
| `name` | `VARCHAR(100)` | `NOT NULL` | Colony display name |
| `description` | `TEXT` | | Detailed colony description |
| `status` | `VARCHAR(20)` | `NOT NULL`, `DEFAULT 'active'`, `CHECK (status IN ('active', 'inactive', 'deceased'))` | Lifecycle state |
| `founding_date` | `DATE` | | Date the colony was founded / captured |
| `queen_count` | `INTEGER` | `NOT NULL`, `DEFAULT 1`, `CHECK (queen_count >= 0)` | Number of queens |
| `estimated_worker_count` | `INTEGER` | `CHECK (estimated_worker_count >= 0)` | Estimated population |
| `is_deleted` | `BOOLEAN` | `NOT NULL`, `DEFAULT false` | Soft-delete flag |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT NOW()` | Record creation time |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT NOW()` | Last update time |

**Indexes**
- `idx_colony_colonies_owner_id` — on `owner_id` (user's colony list)
- `idx_colony_colonies_species_id` — on `species_id` (species lookup)
- `idx_colony_colonies_status` — on `status` (filter queries)

---

### `colony_members`

Tracks shared access to colonies (collaboration).

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | Membership record ID |
| `colony_id` | `UUID` | `NOT NULL`, `REFERENCES colony_colonies(id) ON DELETE CASCADE` | Colony FK |
| `user_id` | `UUID` | `NOT NULL` | User ID of the member (from Auth) |
| `access_role` | `VARCHAR(20)` | `NOT NULL`, `CHECK (access_role IN ('owner', 'collaborator', 'viewer'))` | Access level |
| `granted_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT NOW()` | When access was granted |

**Constraints**
- `UNIQUE (colony_id, user_id)` — A user can have only one role per colony

**Indexes**
- `idx_colony_members_user_id` — on `user_id` (list colonies a user can access)
- `idx_colony_members_colony_id` — on `colony_id` (list members of a colony)

---

## Knex Migration

```js
// migrations/002_create_colony_tables.js

exports.up = async function (knex) {
  await knex.schema.createTable('colony_species', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('scientific_name', 200).notNullable().unique();
    table.string('common_name', 200).notNullable();
    table.string('subfamily', 100).notNullable();
    table.text('description');
    table.string('native_region', 200);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('colony_colonies', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('owner_id').notNullable();
    table.uuid('species_id').notNullable().references('id').inTable('colony_species');
    table.string('name', 100).notNullable();
    table.text('description');
    table
      .enu('status', ['active', 'inactive', 'deceased'], {
        useNative: true,
        enumName: 'colony_status',
      })
      .notNullable()
      .defaultTo('active');
    table.date('founding_date');
    table.integer('queen_count').notNullable().defaultTo(1);
    table.integer('estimated_worker_count');
    table.boolean('is_deleted').notNullable().defaultTo(false);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(['owner_id'], 'idx_colony_colonies_owner_id');
    table.index(['species_id'], 'idx_colony_colonies_species_id');
    table.index(['status'], 'idx_colony_colonies_status');

    // Ensure non-negative constraints
    table.check('?? >= 0', ['queen_count']);
    table.check('?? >= 0 OR ?? IS NULL', ['estimated_worker_count', 'estimated_worker_count']);
  });

  await knex.schema.createTable('colony_members', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('colony_id')
      .notNullable()
      .references('id')
      .inTable('colony_colonies')
      .onDelete('CASCADE');
    table.uuid('user_id').notNullable();
    table
      .enu('access_role', ['owner', 'collaborator', 'viewer'], {
        useNative: true,
        enumName: 'colony_access_role',
      })
      .notNullable();
    table.timestamp('granted_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.unique(['colony_id', 'user_id']);
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

## Seed Data

```js
// seeds/002_species_catalog.js

exports.seed = async function (knex) {
  const species = [
    {
      scientific_name: 'Camponotus pennsylvanicus',
      common_name: 'Black Carpenter Ant',
      subfamily: 'Formicinae',
      description: 'One of the largest ant species in North America. Known for nesting in dead wood.',
      native_region: 'Eastern North America',
    },
    {
      scientific_name: 'Solenopsis invicta',
      common_name: 'Red Imported Fire Ant',
      subfamily: 'Myrmicinae',
      description: 'Aggressive species known for its painful sting. Highly invasive.',
      native_region: 'South America',
    },
    {
      scientific_name: 'Atta cephalotes',
      common_name: 'Leafcutter Ant',
      subfamily: 'Myrmicinae',
      description: 'Fungus-farming ant species. Colonies can contain millions of workers.',
      native_region: 'Central and South America',
    },
    {
      scientific_name: 'Lasius niger',
      common_name: 'Black Garden Ant',
      subfamily: 'Formicinae',
      description: 'Common garden ant found across Europe. Popular species for beginners.',
      native_region: 'Europe, Asia',
    },
    {
      scientific_name: 'Messor barbarus',
      common_name: 'Harvester Ant',
      subfamily: 'Myrmicinae',
      description: 'Seed-harvesting ant popular in ant keeping. Red and black coloration.',
      native_region: 'Mediterranean region',
    },
    {
      scientific_name: 'Formica rufa',
      common_name: 'Red Wood Ant',
      subfamily: 'Formicinae',
      description: 'Builds large mound nests in forests. Known for squirting formic acid.',
      native_region: 'Europe',
    },
    {
      scientific_name: 'Pogonomyrmex barbatus',
      common_name: 'Red Harvester Ant',
      subfamily: 'Myrmicinae',
      description: 'Desert-dwelling harvester ant. Has a notably painful sting.',
      native_region: 'Southwestern United States, Mexico',
    },
    {
      scientific_name: 'Pheidole megacephala',
      common_name: 'Big-headed Ant',
      subfamily: 'Myrmicinae',
      description: 'Invasive species with distinct major and minor worker castes.',
      native_region: 'Southern Africa',
    },
  ];

  for (const sp of species) {
    await knex('colony_species').insert(sp).onConflict('scientific_name').ignore();
  }
};
```

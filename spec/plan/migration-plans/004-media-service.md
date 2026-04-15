# Migration 004 – Media Service Schema

**Service**: `media-service`
**Database**: `antiverse` (shared instance)
**Table prefix**: `media_`

---

## Tables

### `media_files`

Metadata records for files stored in S3. The actual binary data lives in S3; this table tracks metadata, ownership, and status.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | Media record identifier |
| `colony_id` | `UUID` | `NOT NULL` | Colony this media belongs to (validated via Colony Service API) |
| `user_id` | `UUID` | `NOT NULL` | Uploader's user ID (from Auth Service) |
| `log_entry_id` | `UUID` | | Optional link to a specific log entry (validated via Log Service API) |
| `file_key` | `VARCHAR(500)` | `NOT NULL`, `UNIQUE` | S3 object key (e.g. `colonies/{colonyId}/media/{uuid}.jpg`) |
| `filename` | `VARCHAR(255)` | `NOT NULL` | Original filename from the client |
| `content_type` | `VARCHAR(100)` | `NOT NULL` | MIME type (e.g. `image/jpeg`, `video/mp4`) |
| `size_bytes` | `BIGINT` | `NOT NULL`, `CHECK (size_bytes > 0)` | File size in bytes |
| `caption` | `VARCHAR(500)` | | User-provided caption or description |
| `status` | `VARCHAR(20)` | `NOT NULL`, `DEFAULT 'pending'`, `CHECK (status IN ('pending', 'ready', 'failed'))` | Upload lifecycle status |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT NOW()` | Record creation time |

**Indexes**
- `idx_media_files_colony_id` — on `colony_id` (list media for a colony)
- `idx_media_files_user_id` — on `user_id` (list media by uploader)
- `idx_media_files_log_entry_id` — on `log_entry_id` (media attached to a log entry)
- `idx_media_files_status` — on `status` (cleanup pending uploads)
- `idx_media_files_file_key` — `UNIQUE` on `file_key` (S3 key lookup)

---

## Upload Flow

```
Client                  Media Service                  S3
  │                          │                          │
  │── POST /media/upload ───►│                          │
  │   { colonyId, filename,  │                          │
  │     contentType, size }  │                          │
  │                          │── Validate colony ───────│
  │                          │   (Colony Service API)   │
  │                          │                          │
  │                          │── Generate S3 key ──────►│
  │                          │── Create pre-signed URL  │
  │                          │                          │
  │                          │── INSERT media_files ────│
  │                          │   (status: 'pending')    │
  │                          │                          │
  │◄── { uploadUrl, id } ───│                          │
  │                          │                          │
  │── PUT <uploadUrl> ─────────────────────────────────►│
  │   (binary file data)     │                          │
  │◄───────── 200 OK ──────────────────────────────────│
  │                          │                          │
  │── POST /media/:id/       │                          │
  │   confirm ──────────────►│                          │
  │                          │── Verify object exists ─►│
  │                          │── UPDATE status='ready'  │
  │◄── { id, url, status } ─│                          │
```

## S3 Key Structure

```
colonies/
  {colonyId}/
    media/
      {mediaId}.{extension}
```

Example: `colonies/a1b2c3d4/media/e5f6g7h8.jpg`

---

## Allowed Content Types

| Category | MIME Types | Max Size |
|---|---|---|
| Image | `image/jpeg`, `image/png`, `image/webp`, `image/gif` | 50 MB |
| Video | `video/mp4`, `video/webm` | 500 MB |

---

## Cleanup: Stale Pending Uploads

A scheduled job (cron or on-demand) should clean up `pending` records older than 24 hours:

```sql
DELETE FROM media_files
WHERE status = 'pending'
  AND created_at < NOW() - INTERVAL '24 hours';
```

---

## Knex Migration

```js
// migrations/004_create_media_tables.js

exports.up = async function (knex) {
  await knex.schema.createTable('media_files', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('colony_id').notNullable();
    table.uuid('user_id').notNullable();
    table.uuid('log_entry_id');
    table.string('file_key', 500).notNullable().unique();
    table.string('filename', 255).notNullable();
    table.string('content_type', 100).notNullable();
    table.bigInteger('size_bytes').notNullable();
    table.string('caption', 500);
    table
      .enu('status', ['pending', 'ready', 'failed'], {
        useNative: true,
        enumName: 'media_status',
      })
      .notNullable()
      .defaultTo('pending');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    // Constraints
    table.check('?? > 0', ['size_bytes']);

    // Indexes
    table.index(['colony_id'], 'idx_media_files_colony_id');
    table.index(['user_id'], 'idx_media_files_user_id');
    table.index(['log_entry_id'], 'idx_media_files_log_entry_id');
    table.index(['status'], 'idx_media_files_status');
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('media_files');
  await knex.raw('DROP TYPE IF EXISTS media_status');
};
```

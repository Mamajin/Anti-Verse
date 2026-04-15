# Migration 004 – Media Service Schema

**Service**: `media-service`
**Database**: `antiverse` (shared instance)
**Table prefix**: `media_`
**Migration tracking table**: `media_service_migrations`

---

## Tables

### `media_files`

Metadata records for files stored in S3. The actual binary data lives in S3/MinIO; this table tracks ownership, status, and attributes.

| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY` | `gen_random_uuid()` | Media record identifier |
| `colony_id` | `UUID` | `NOT NULL` | — | Colony this media belongs to. *Not a FK — validated via Colony Service API.* |
| `user_id` | `UUID` | `NOT NULL` | — | Uploader's user ID. *Not a FK — validated via Auth Service API.* |
| `log_entry_id` | `UUID` | — | — | Optional link to a specific log entry. *Not a FK — validated via Log Service API.* |
| `file_key` | `VARCHAR(500)` | `NOT NULL`, `UNIQUE` | — | S3 object key (e.g., `colonies/{colonyId}/media/{id}.jpg`) |
| `filename` | `VARCHAR(255)` | `NOT NULL` | — | Original filename from the client (for display) |
| `content_type` | `VARCHAR(100)` | `NOT NULL` | — | MIME type (e.g., `image/jpeg`, `video/mp4`) |
| `size_bytes` | `BIGINT` | `NOT NULL`, `CHECK (> 0)` | — | File size in bytes |
| `caption` | `VARCHAR(500)` | — | — | User-provided caption or description |
| `status` | `media_status` ENUM | `NOT NULL` | `'pending'` | Upload lifecycle: `pending` → `ready` or `failed` |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL` | `NOW()` | Record creation time |

**Type Decisions**

| Column | Why This Type |
|---|---|
| `file_key` (VARCHAR 500) | S3 key format: `colonies/{uuid}/media/{uuid}.{ext}`. Maximum observed length ~110 chars, but 500 allows for future restructuring. |
| `filename` (VARCHAR 255) | Original filenames. Most OS limit filenames to 255 chars. |
| `content_type` (VARCHAR 100) | MIME types rarely exceed 50 chars. 100 provides margin. |
| `size_bytes` (BIGINT) | Video files can exceed 2GB (INTEGER max is ~2.1 GB). BIGINT supports up to 8 EB. |
| `log_entry_id` (nullable UUID) | Optional attachment. Many media files are uploaded to a colony without being linked to a specific log entry. |
| `status` (native ENUM) | Three fixed states in the upload lifecycle. |
| No `updated_at` | Media metadata is write-once (set on upload, never edited). Status transitions are the only updates, and they use `status` column. |

**Indexes**

| Name | Columns | Type | Purpose |
|---|---|---|---|
| `media_files_pkey` | `id` | PRIMARY KEY | PK lookup |
| `media_files_file_key_unique` | `file_key` | UNIQUE | Prevent duplicate S3 keys; fast key lookup for S3 operations |
| `idx_media_files_colony_id` | `colony_id` | B-tree | List media for a colony |
| `idx_media_files_user_id` | `user_id` | B-tree | List media uploaded by a user |
| `idx_media_files_log_entry_id` | `log_entry_id` | B-tree (partial: WHERE log_entry_id IS NOT NULL) | Find media attached to a specific log entry |
| `idx_media_files_colony_status` | `(colony_id, status, created_at DESC)` | B-tree composite | **Primary query**: list ready media for a colony, newest first |
| `idx_media_files_cleanup` | `(status, created_at)` | B-tree (partial: WHERE status = 'pending') | Cleanup job: find stale pending uploads |

---

## Upload Lifecycle

```
State: pending ──────► ready
         │
         └──────────► failed

pending: Metadata created, pre-signed URL generated, waiting for client upload
ready:   Client confirmed upload, S3 object verified to exist
failed:  Confirmation attempted but S3 object not found, or cleanup job expired the record
```

### State Transitions

| From | To | Trigger |
|---|---|---|
| — | `pending` | `POST /media/upload` creates metadata and pre-signed URL |
| `pending` | `ready` | `POST /media/:id/confirm` verifies S3 object exists |
| `pending` | `failed` | `POST /media/:id/confirm` but S3 object doesn't exist |
| `pending` | (deleted) | Cleanup job: record older than 24 hours |

---

## Upload Flow (Detailed)

```
Client                       Media Service                    S3 / MinIO
  │                               │                               │
  │── POST /media/upload ────────►│                               │
  │   {                           │                               │
  │     colonyId, filename,       │                               │
  │     contentType, sizeBytes,   │                               │
  │     caption?, logEntryId?     │                               │
  │   }                           │                               │
  │                               │                               │
  │                               │── Auth: GET /auth/verify ────►│
  │                               │◄── { userId, role } ──────────│
  │                               │                               │
  │                               │── Colony: GET /colonies/      │
  │                               │   :id/verify ────────────────►│
  │                               │◄── { accessRole } ────────────│
  │                               │   (must be owner/collaborator)│
  │                               │                               │
  │                               │── (if logEntryId provided)    │
  │                               │   Log: GET /logs/:colonyId/   │
  │                               │   :entryId/verify ───────────►│
  │                               │◄── { entryId, colonyId } ─────│
  │                               │                               │
  │                               │── Generate file_key:          │
  │                               │   colonies/{colonyId}/media/  │
  │                               │   {mediaId}.{ext}             │
  │                               │                               │
  │                               │── Generate pre-signed PUT URL │
  │                               │   with conditions:            │
  │                               │   - Content-Type must match   │
  │                               │   - Content-Length <= sizeBytes│
  │                               │   - Expires in 15 minutes     │
  │                               │                               │
  │                               │── INSERT INTO media_files     │
  │                               │   (status = 'pending')        │
  │                               │                               │
  │◄── 201 {                      │                               │
  │     id, uploadUrl, fileKey    │                               │
  │   } ─────────────────────────│                               │
  │                               │                               │
  │                               │                               │
  │── PUT {uploadUrl} ────────────────────────────────────────────►│
  │   Headers:                    │                               │
  │     Content-Type: image/jpeg  │                               │
  │   Body: <raw binary file>     │                               │
  │◄──────────────── 200 OK ──────────────────────────────────────│
  │                               │                               │
  │                               │                               │
  │── POST /media/:id/confirm ───►│                               │
  │                               │── HEAD {fileKey} ────────────►│
  │                               │◄── 200 (object exists) ──────│
  │                               │                               │
  │                               │── UPDATE media_files          │
  │                               │   SET status = 'ready'        │
  │                               │                               │
  │                               │── Generate pre-signed GET URL │
  │                               │   (1 hour TTL, for display)   │
  │                               │                               │
  │◄── 200 {                      │                               │
  │     id, status: 'ready',      │                               │
  │     url, filename, ...        │                               │
  │   } ─────────────────────────│                               │
```

---

## S3 Key Structure

```
antiverse-media/                    ← S3 Bucket
└── colonies/
    └── {colonyId}/                 ← UUID, one folder per colony
        └── media/
            ├── {mediaId}.jpg       ← UUID-based filename
            ├── {mediaId}.png
            └── {mediaId}.mp4
```

Example: `colonies/a1b2c3d4-e5f6-7890-abcd-ef1234567890/media/b2c3d4e5-f6a7-8901-bcde-f12345678901.jpg`

### Key Generation Logic

```typescript
function generateFileKey(colonyId: string, mediaId: string, contentType: string): string {
  const ext = MIME_TO_EXT[contentType]; // { 'image/jpeg': 'jpg', 'image/png': 'png', ... }
  return `colonies/${colonyId}/media/${mediaId}.${ext}`;
}

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
};
```

**Security**: The S3 key contains only server-generated UUIDs. The user's original filename is stored in the `filename` column for display purposes but never used in the S3 path, preventing path traversal attacks.

---

## Pre-Signed URL Generation

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({
  endpoint: config.s3.endpoint,
  region: config.s3.region,
  forcePathStyle: config.s3.forcePathStyle,
  credentials: {
    accessKeyId: config.s3.accessKey,
    secretAccessKey: config.s3.secretKey,
  },
});

// Generate upload URL (PUT)
async function generateUploadUrl(fileKey: string, contentType: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: config.s3.bucket,
    Key: fileKey,
    ContentType: contentType,
  });
  return getSignedUrl(s3, command, { expiresIn: 900 }); // 15 minutes
}

// Generate download URL (GET)
async function generateDownloadUrl(fileKey: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: config.s3.bucket,
    Key: fileKey,
  });
  return getSignedUrl(s3, command, { expiresIn: 3600 }); // 1 hour
}
```

---

## Allowed Content Types & Size Limits

| Category | MIME Type | Extension | Max Size | Notes |
|---|---|---|---|---|
| Image | `image/jpeg` | `.jpg` | 50 MB | Most common for colony photos |
| Image | `image/png` | `.png` | 50 MB | Screenshots, diagrams |
| Image | `image/webp` | `.webp` | 50 MB | Modern format, smaller files |
| Image | `image/gif` | `.gif` | 50 MB | Animated observations |
| Video | `video/mp4` | `.mp4` | 500 MB | Standard video format |
| Video | `video/webm` | `.webm` | 500 MB | Web-optimized video |

All other MIME types are rejected at validation time with `400 VALIDATION_ERROR`.

---

## Cleanup: Stale Pending Uploads

A cleanup function runs periodically (via cron or at service startup) to delete orphaned `pending` records:

```typescript
async function cleanupStalePendingUploads() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

  // Find stale records
  const staleRecords = await db(Tables.MEDIA_FILES)
    .where('status', 'pending')
    .andWhere('created_at', '<', cutoff.toISOString())
    .select('id', 'file_key');

  // Delete from S3 (best-effort, may not exist)
  for (const record of staleRecords) {
    try {
      await s3.send(new DeleteObjectCommand({
        Bucket: config.s3.bucket,
        Key: record.file_key,
      }));
    } catch {
      // Object may not exist (upload never happened), that's fine
    }
  }

  // Delete metadata records
  const deletedCount = await db(Tables.MEDIA_FILES)
    .where('status', 'pending')
    .andWhere('created_at', '<', cutoff.toISOString())
    .delete();

  logger.info({ deletedCount }, 'Cleaned up stale pending uploads');
}
```

**Trigger Options**:
1. **Startup**: Run on service startup (simple, but misses long-running instances)
2. **Interval**: Run every 6 hours via `setInterval`
3. **Cron**: External cron job calls a cleanup endpoint

---

## Knex Migration

```js
// migrations/004_create_media_tables.js

exports.up = async function (knex) {
  // Create native ENUM type
  await knex.raw(`
    DO $$ BEGIN
      CREATE TYPE media_status AS ENUM ('pending', 'ready', 'failed');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `);

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
    table.specificType('status', 'media_status').notNullable().defaultTo('pending');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(['colony_id'], 'idx_media_files_colony_id');
    table.index(['user_id'], 'idx_media_files_user_id');
  });

  // Check constraint
  await knex.raw('ALTER TABLE media_files ADD CONSTRAINT chk_size_bytes CHECK (size_bytes > 0)');

  // Partial index for log entry attachment (only non-null values)
  await knex.raw(`
    CREATE INDEX idx_media_files_log_entry_id
    ON media_files (log_entry_id)
    WHERE log_entry_id IS NOT NULL;
  `);

  // Composite index for primary query: list ready media for a colony
  await knex.raw(`
    CREATE INDEX idx_media_files_colony_status
    ON media_files (colony_id, status, created_at DESC);
  `);

  // Cleanup index: find stale pending uploads efficiently
  await knex.raw(`
    CREATE INDEX idx_media_files_cleanup
    ON media_files (status, created_at)
    WHERE status = 'pending';
  `);
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('media_files');
  await knex.raw('DROP TYPE IF EXISTS media_status');
};
```

---

## Rollback Strategy

**`exports.down`** drops:
1. `media_files` table
2. `media_status` ENUM type

**Data loss warning**: Rolling back deletes all media metadata. S3 objects are NOT deleted by this migration (they exist independently). Orphaned S3 objects would need to be cleaned up manually.

**S3 Cleanup After Rollback** (if needed):
```bash
# List all objects in the bucket
mc ls local/antiverse-media --recursive

# Delete all objects (DESTRUCTIVE)
mc rm local/antiverse-media --recursive --force
```

---

## Maintenance Queries

```sql
-- Media count by colony
SELECT colony_id, COUNT(*) as file_count,
  SUM(size_bytes) as total_bytes,
  pg_size_pretty(SUM(size_bytes)::bigint) as total_size
FROM media_files
WHERE status = 'ready'
GROUP BY colony_id
ORDER BY total_bytes DESC;

-- Media count by type
SELECT content_type, COUNT(*) as count,
  pg_size_pretty(SUM(size_bytes)::bigint) as total_size
FROM media_files
WHERE status = 'ready'
GROUP BY content_type
ORDER BY count DESC;

-- Find stale pending uploads (candidates for cleanup)
SELECT id, colony_id, filename, created_at,
  AGE(NOW(), created_at) as age
FROM media_files
WHERE status = 'pending'
  AND created_at < NOW() - INTERVAL '24 hours'
ORDER BY created_at ASC;

-- Total storage used
SELECT
  pg_size_pretty(SUM(size_bytes)::bigint) as total_storage,
  COUNT(*) as total_files,
  COUNT(*) FILTER (WHERE content_type LIKE 'image/%') as images,
  COUNT(*) FILTER (WHERE content_type LIKE 'video/%') as videos
FROM media_files
WHERE status = 'ready';

-- Media for a specific log entry
SELECT * FROM media_files
WHERE log_entry_id = $1 AND status = 'ready'
ORDER BY created_at DESC;
```

---

## Example Queries (Application Layer)

```sql
-- List ready media for a colony (paginated, newest first)
SELECT id, colony_id, log_entry_id, filename, content_type,
  size_bytes, caption, status, created_at
FROM media_files
WHERE colony_id = $1 AND status = 'ready'
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- List ready media by type
SELECT * FROM media_files
WHERE colony_id = $1 AND status = 'ready'
  AND content_type LIKE $2  -- 'image/%' or 'video/%'
ORDER BY created_at DESC
LIMIT $3 OFFSET $4;

-- Count for pagination
SELECT COUNT(*) as total
FROM media_files
WHERE colony_id = $1 AND status = 'ready';
```

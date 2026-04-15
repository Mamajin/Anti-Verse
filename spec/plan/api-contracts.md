# Anti-Verse – API Contracts

All services follow RESTful conventions. Request/response bodies are JSON (`Content-Type: application/json`). Authentication is via `Authorization: Bearer <JWT>` header unless noted otherwise. All responses follow the standard envelope format.

---

## Standard Response Envelopes

### Success (Single Resource)
```json
{
  "data": { ... }
}
```

### Success (List with Pagination)
```json
{
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalItems": 42,
    "totalPages": 3
  }
}
```

### Error
```json
{
  "error": {
    "status": 400,
    "code": "VALIDATION_ERROR",
    "message": "Human-readable description",
    "requestId": "uuid",
    "details": [
      { "field": "body.email", "message": "Must be a valid email address" }
    ]
  }
}
```

### Standard Error Codes

| Code | HTTP Status | Description |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Request body/params/query failed Zod validation |
| `UNAUTHORIZED` | 401 | Missing, malformed, or expired authentication token |
| `FORBIDDEN` | 403 | Authenticated but role or colony access is insufficient |
| `NOT_FOUND` | 404 | Resource does not exist or has been soft-deleted |
| `CONFLICT` | 409 | Duplicate resource (e.g., email already registered) |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests in the time window |
| `SERVICE_UNAVAILABLE` | 502 | Upstream service is unreachable |
| `GATEWAY_TIMEOUT` | 504 | Upstream service did not respond in time |
| `INTERNAL_ERROR` | 500 | Unexpected server error (stack trace NOT exposed) |

### Standard Headers (All Responses)

| Header | Value | Description |
|---|---|---|
| `Content-Type` | `application/json` | Response format |
| `X-Request-ID` | `uuid` | Unique request identifier for tracing |
| `RateLimit-Limit` | `integer` | Max requests in current window |
| `RateLimit-Remaining` | `integer` | Remaining requests in current window |
| `RateLimit-Reset` | `integer` | Seconds until window resets |

---

## 1. Auth Service (`/api/auth`)

**Base URL**: `http://auth-service:3001/api/auth`
**Rate Limit**: 10 requests / 15 minutes (login, register); 100 / 15 min (other endpoints)

---

### POST `/register`

Create a new user account.

**Authentication**: None required
**Rate Limit**: Strict (10 / 15 min)

**Request Body**
```json
{
  "email": "string (required, valid email, max 255 chars)",
  "password": "string (required, 8–128 chars)",
  "displayName": "string (required, 2–50 chars, trimmed)",
  "role": "keeper | researcher (optional, default: 'keeper')"
}
```

> **Note**: The `admin` role cannot be self-assigned during registration. Only an existing admin can promote users via `PATCH /profile/:id/role`.

**Validation Rules (Zod)**
```typescript
z.object({
  email: z.string().email().max(255).transform(v => v.toLowerCase().trim()),
  password: z.string().min(8).max(128),
  displayName: z.string().min(2).max(50).trim(),
  role: z.enum(['keeper', 'researcher']).default('keeper'),
})
```

**Response `201 Created`**
```json
{
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "email": "keeper@example.com",
    "displayName": "Alice Smith",
    "role": "keeper",
    "createdAt": "2026-04-15T08:00:00.000Z"
  }
}
```

**Error Responses**

| Status | Code | Condition |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Missing/invalid fields (details include field-level messages) |
| `409` | `CONFLICT` | Email already registered |
| `429` | `RATE_LIMIT_EXCEEDED` | Too many registration attempts |

---

### POST `/login`

Authenticate and receive access + refresh tokens.

**Authentication**: None required
**Rate Limit**: Strict (10 / 15 min)

**Request Body**
```json
{
  "email": "string (required, valid email)",
  "password": "string (required)"
}
```

**Response `200 OK`**
```json
{
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs... (JWT, 15 min TTL)",
    "refreshToken": "a3f8c9d0e1... (opaque hex, 128 chars, 7 day TTL)",
    "user": {
      "id": "uuid",
      "email": "keeper@example.com",
      "displayName": "Alice Smith",
      "role": "keeper"
    }
  }
}
```

**Error Responses**

| Status | Code | Condition |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Missing email or password |
| `401` | `UNAUTHORIZED` | Invalid email or password (same message for both to prevent enumeration) |
| `429` | `RATE_LIMIT_EXCEEDED` | Too many login attempts |

**Security Notes**
- The error message for wrong email vs. wrong password is intentionally identical to prevent email enumeration.
- Failed login attempts are logged (IP, email, timestamp) but the password is never logged.
- The refresh token is generated as 64 random bytes (hex-encoded, 128 chars). Only its SHA-256 hash is stored in the database.

---

### POST `/refresh`

Exchange a refresh token for a new access token. The refresh token is rotated (old one invalidated).

**Authentication**: None required (refresh token is in the body)

**Request Body**
```json
{
  "refreshToken": "string (required, 128 hex chars)"
}
```

**Response `200 OK`**
```json
{
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs... (new JWT)",
    "refreshToken": "b4g9d1e2f3... (new opaque token, old one is now invalid)"
  }
}
```

**Error Responses**

| Status | Code | Condition |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Missing refresh token |
| `401` | `UNAUTHORIZED` | Refresh token is invalid, expired, or already used |

**Token Rotation Flow**
1. Hash the provided refresh token with SHA-256
2. Look up the hash in `auth_refresh_tokens`
3. Verify not expired
4. **Delete** the old token record (single-use)
5. Generate a new access token and new refresh token
6. Store the new refresh token's hash
7. Return both new tokens

---

### POST `/logout`

Invalidate the current refresh token, ending the session.

**Authentication**: None required (refresh token is in the body)

**Request Body**
```json
{
  "refreshToken": "string (required)"
}
```

**Response `204 No Content`** (empty body)

**Behavior**: Deletes the refresh token record from the database. If the token doesn't exist (already logged out or expired), still returns `204` (idempotent).

---

### GET `/verify` *(Internal Only)*

Used by other services to verify an access token and get the user's identity. **Not exposed to the client.**

**Authentication**: `Authorization: Bearer <accessToken>`

**Response `200 OK`**
```json
{
  "data": {
    "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "role": "keeper"
  }
}
```

**Error Responses**

| Status | Code | Condition |
|---|---|---|
| `401` | `UNAUTHORIZED` | Token missing, malformed, expired, or signature invalid |

**Performance Note**: The Auth Service verifies JWTs locally (it has the secret), so this endpoint is fast (~1ms). Other services should cache the result for the duration of a single request processing.

---

### GET `/profile`

Get the authenticated user's profile.

**Authentication**: Required

**Response `200 OK`**
```json
{
  "data": {
    "id": "uuid",
    "email": "keeper@example.com",
    "displayName": "Alice Smith",
    "role": "keeper",
    "isActive": true,
    "createdAt": "2026-04-15T08:00:00.000Z",
    "updatedAt": "2026-04-15T09:30:00.000Z"
  }
}
```

---

### PATCH `/profile`

Update the authenticated user's own profile.

**Authentication**: Required

**Request Body** *(all fields optional, at least one required)*
```json
{
  "displayName": "string (2–50 chars, optional)",
  "password": "string (8–128 chars, optional)"
}
```

**Validation**: If `password` is provided, it is hashed with bcrypt before storage. The old password is not required (user is already authenticated via JWT).

**Response `200 OK`** — Updated profile object (same shape as `GET /profile`).

---

### GET `/admin/users` *(Admin Only)*

List all users. Requires `admin` role.

**Authentication**: Required
**Role**: `admin`

**Query Parameters**

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | integer | `1` | Page number |
| `limit` | integer | `20` | Items per page (max 100) |
| `role` | string | — | Filter by role: `keeper`, `researcher`, `admin` |
| `search` | string | — | Search by email or display name |

**Response `200 OK`** — Paginated user list (passwords/hashes never included).

---

### PATCH `/admin/users/:id/role` *(Admin Only)*

Change a user's role.

**Authentication**: Required
**Role**: `admin`

**Request Body**
```json
{
  "role": "keeper | researcher | admin"
}
```

**Response `200 OK`** — Updated user object.

**Error Responses**

| Status | Code | Condition |
|---|---|---|
| `403` | `FORBIDDEN` | Non-admin attempting role change |
| `404` | `NOT_FOUND` | User ID doesn't exist |

---

## 2. Colony Service (`/api`)

**Base URL**: `http://colony-service:3002/api`

---

### GET `/colonies`

List colonies accessible to the authenticated user. Returns colonies where the user is an owner, collaborator, or viewer. Researchers and admins can optionally see all colonies.

**Authentication**: Required

**Query Parameters**

| Param | Type | Default | Validation | Description |
|---|---|---|---|---|
| `page` | integer | `1` | min 1 | Page number |
| `limit` | integer | `20` | min 1, max 100 | Items per page |
| `status` | string | — | `active`, `inactive`, `deceased` | Filter by lifecycle status |
| `search` | string | — | max 100 chars | Search by colony name (case-insensitive) |
| `all` | boolean | `false` | — | If `true` and role is researcher/admin, show all colonies (not just user's) |

**Response `200 OK`**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Colony Alpha",
      "description": "First colony, captured locally",
      "species": {
        "id": "uuid",
        "scientificName": "Lasius niger",
        "commonName": "Black Garden Ant"
      },
      "status": "active",
      "foundingDate": "2025-06-15",
      "queenCount": 1,
      "estimatedWorkerCount": 250,
      "accessRole": "owner",
      "createdAt": "2025-06-15T10:00:00.000Z",
      "updatedAt": "2026-04-10T14:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalItems": 5,
    "totalPages": 1
  }
}
```

---

### POST `/colonies`

Create a new colony. The authenticated user becomes the `owner`.

**Authentication**: Required

**Request Body**
```json
{
  "name": "string (required, 1–100 chars)",
  "speciesId": "uuid (required, must exist in colony_species)",
  "description": "string (optional, max 2000 chars)",
  "foundingDate": "ISO 8601 date string (optional, e.g., '2025-06-15')",
  "queenCount": "integer (required, >= 0)",
  "estimatedWorkerCount": "integer (optional, >= 0)"
}
```

**Validation Rules (Zod)**
```typescript
z.object({
  name: z.string().min(1).max(100).trim(),
  speciesId: z.string().uuid(),
  description: z.string().max(2000).optional(),
  foundingDate: z.string().date().optional(), // YYYY-MM-DD
  queenCount: z.number().int().min(0),
  estimatedWorkerCount: z.number().int().min(0).optional(),
})
```

**Response `201 Created`** — Full colony object with `accessRole: "owner"`.

**Side Effects**:
1. Inserts a row in `colony_colonies`
2. Inserts a row in `colony_members` with `access_role = 'owner'` for the creator

**Error Responses**

| Status | Code | Condition |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Missing/invalid fields |
| `404` | `NOT_FOUND` | `speciesId` doesn't exist in the species catalog |

---

### GET `/colonies/:id`

Get a single colony by ID, including full description and species details.

**Authentication**: Required

**URL Parameters**: `id` — UUID of the colony

**Response `200 OK`**
```json
{
  "data": {
    "id": "uuid",
    "name": "Colony Alpha",
    "description": "Full description text...",
    "species": {
      "id": "uuid",
      "scientificName": "Lasius niger",
      "commonName": "Black Garden Ant",
      "subfamily": "Formicinae",
      "description": "Common garden ant...",
      "nativeRegion": "Europe, Asia"
    },
    "status": "active",
    "foundingDate": "2025-06-15",
    "queenCount": 1,
    "estimatedWorkerCount": 250,
    "accessRole": "owner",
    "createdAt": "2025-06-15T10:00:00.000Z",
    "updatedAt": "2026-04-10T14:30:00.000Z"
  }
}
```

**Error Responses**

| Status | Code | Condition |
|---|---|---|
| `403` | `FORBIDDEN` | User has no access to this colony (and is not admin/researcher) |
| `404` | `NOT_FOUND` | Colony doesn't exist or is soft-deleted |

---

### PATCH `/colonies/:id`

Update colony details. Requires `owner` or `collaborator` access (or `admin` role).

**Authentication**: Required
**Colony Access**: `owner` or `collaborator`

**Request Body** *(all fields optional, at least one required)*
```json
{
  "name": "string (1–100 chars)",
  "description": "string (max 2000 chars)",
  "status": "active | inactive | deceased",
  "queenCount": "integer (>= 0)",
  "estimatedWorkerCount": "integer (>= 0)"
}
```

**Response `200 OK`** — Updated colony object.

**Side Effects**: Updates `updated_at` timestamp.

---

### DELETE `/colonies/:id`

Soft-delete a colony (sets `is_deleted = true`). Requires `owner` access or `admin` role.

**Authentication**: Required
**Colony Access**: `owner` only (or `admin`)

**Response `204 No Content`**

**Side Effects**: Sets `is_deleted = true` on the colony. Log entries and media are NOT deleted (they become orphaned but can be recovered by un-deleting the colony).

---

### GET `/colonies/:id/members`

List users who have access to this colony.

**Authentication**: Required
**Colony Access**: Any member can view the member list

**Response `200 OK`**
```json
{
  "data": [
    {
      "userId": "uuid",
      "displayName": "Alice Smith",
      "email": "alice@example.com",
      "accessRole": "owner",
      "grantedAt": "2025-06-15T10:00:00.000Z"
    },
    {
      "userId": "uuid",
      "displayName": "Bob Jones",
      "email": "bob@example.com",
      "accessRole": "collaborator",
      "grantedAt": "2026-01-20T15:00:00.000Z"
    }
  ]
}
```

> **Note**: `displayName` and `email` are fetched from Auth Service via internal API call.

---

### POST `/colonies/:id/members`

Grant a user access to this colony. Requires `owner` access (or `admin` role).

**Authentication**: Required
**Colony Access**: `owner` only

**Request Body**
```json
{
  "userId": "uuid (required, must be a valid user)",
  "accessRole": "collaborator | viewer (required)"
}
```

> **Note**: The `owner` role cannot be granted via this endpoint. There is exactly one owner per colony (the creator).

**Response `201 Created`**
```json
{
  "data": {
    "colonyId": "uuid",
    "userId": "uuid",
    "accessRole": "collaborator",
    "grantedAt": "2026-04-15T08:00:00.000Z"
  }
}
```

**Error Responses**

| Status | Code | Condition |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Invalid role or missing userId |
| `404` | `NOT_FOUND` | User doesn't exist (verified via Auth Service) |
| `409` | `CONFLICT` | User already has access to this colony |

---

### DELETE `/colonies/:id/members/:userId`

Revoke a user's access to a colony. Requires `owner` access (or `admin` role). Cannot remove the owner.

**Authentication**: Required
**Colony Access**: `owner` only

**Response `204 No Content`**

**Error Responses**

| Status | Code | Condition |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Attempting to remove the owner |
| `404` | `NOT_FOUND` | Member not found |

---

### GET `/species`

List all species in the reference catalog. Public within authenticated context.

**Authentication**: Required

**Query Parameters**

| Param | Type | Description |
|---|---|---|
| `search` | string | Search by scientific or common name (case-insensitive, trigram matching) |

**Response `200 OK`**
```json
{
  "data": [
    {
      "id": "uuid",
      "scientificName": "Lasius niger",
      "commonName": "Black Garden Ant",
      "subfamily": "Formicinae",
      "description": "Common garden ant found across Europe...",
      "nativeRegion": "Europe, Asia",
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### POST `/species` *(Admin Only)*

Add a new species to the catalog.

**Authentication**: Required
**Role**: `admin`

**Request Body**
```json
{
  "scientificName": "string (required, 1–200 chars, must be unique)",
  "commonName": "string (required, 1–200 chars)",
  "subfamily": "string (required, 1–100 chars)",
  "description": "string (optional)",
  "nativeRegion": "string (optional, max 200 chars)"
}
```

**Response `201 Created`** — Full species object.

---

### GET `/colonies/:id/verify` *(Internal Only)*

Used by Log and Media services to verify colony existence and user access. **Not exposed to the client.**

**Authentication**: Required (token forwarded from original request)

**Response `200 OK`**
```json
{
  "data": {
    "colonyId": "uuid",
    "userId": "uuid",
    "accessRole": "owner | collaborator | viewer"
  }
}
```

**Error Responses**

| Status | Code | Condition |
|---|---|---|
| `403` | `FORBIDDEN` | User has no access to this colony |
| `404` | `NOT_FOUND` | Colony doesn't exist or is deleted |

---

## 3. Log Service (`/api/logs`)

**Base URL**: `http://log-service:3003/api/logs`

---

### GET `/:colonyId`

List log entries for a colony, sorted by `occurred_at` descending.

**Authentication**: Required
**Colony Access**: Any member (verified via Colony Service)

**Query Parameters**

| Param | Type | Default | Validation | Description |
|---|---|---|---|---|
| `page` | integer | `1` | min 1 | Page number |
| `limit` | integer | `20` | min 1, max 100 | Items per page |
| `type` | string | — | `observation`, `feeding`, `maintenance`, `environmental` | Filter by entry type |
| `from` | string | — | ISO 8601 datetime | Start date filter (inclusive) |
| `to` | string | — | ISO 8601 datetime | End date filter (inclusive) |

**Response `200 OK`**
```json
{
  "data": [
    {
      "id": "uuid",
      "colonyId": "uuid",
      "userId": "uuid",
      "userDisplayName": "Alice Smith",
      "entryType": "observation",
      "title": "Workers exploring new outworld",
      "content": "Observed approximately 20 workers...",
      "occurredAt": "2026-04-14T16:30:00.000Z",
      "environmentalReading": null,
      "createdAt": "2026-04-14T17:00:00.000Z",
      "updatedAt": "2026-04-14T17:00:00.000Z"
    },
    {
      "id": "uuid",
      "colonyId": "uuid",
      "userId": "uuid",
      "userDisplayName": "Alice Smith",
      "entryType": "environmental",
      "title": "Morning readings",
      "content": "Standard morning check.",
      "occurredAt": "2026-04-14T08:00:00.000Z",
      "environmentalReading": {
        "temperature": 25.5,
        "humidity": 65.0,
        "lightLevel": 300.0
      },
      "createdAt": "2026-04-14T08:05:00.000Z",
      "updatedAt": "2026-04-14T08:05:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "totalItems": 47, "totalPages": 3 }
}
```

---

### POST `/:colonyId`

Create a new log entry. Requires `owner` or `collaborator` access to the colony.

**Authentication**: Required
**Colony Access**: `owner` or `collaborator` (verified via Colony Service; `viewer` gets 403)

**Request Body**
```json
{
  "entryType": "observation | feeding | maintenance | environmental (required)",
  "title": "string (required, 1–200 chars)",
  "content": "string (required, 1–10000 chars)",
  "occurredAt": "ISO 8601 datetime (optional, defaults to server time)",
  "environmentalReading": {
    "temperature": "number (optional, decimal, °C)",
    "humidity": "number (optional, 0–100, %)",
    "lightLevel": "number (optional, >= 0, lux)"
  }
}
```

**Validation Rules (Zod)**
```typescript
z.object({
  entryType: z.enum(['observation', 'feeding', 'maintenance', 'environmental']),
  title: z.string().min(1).max(200).trim(),
  content: z.string().min(1).max(10000),
  occurredAt: z.string().datetime().optional(),
  environmentalReading: z.object({
    temperature: z.number().optional(),
    humidity: z.number().min(0).max(100).optional(),
    lightLevel: z.number().min(0).optional(),
  }).optional(),
})
```

**Response `201 Created`** — Full log entry object with environmental reading.

**Side Effects**:
1. Inserts into `log_entries`
2. If `environmentalReading` is provided with at least one non-null field, inserts into `log_environmental_readings` with denormalized `colony_id` and `recorded_at`

---

### GET `/:colonyId/:entryId`

Get a single log entry.

**Authentication**: Required
**Colony Access**: Any member

**Response `200 OK`** — Full log entry object.

---

### PATCH `/:colonyId/:entryId`

Update a log entry. Only the original author or an admin can update.

**Authentication**: Required
**Authorization**: Entry author or `admin` role

**Request Body** *(all fields optional)*
```json
{
  "title": "string (1–200 chars)",
  "content": "string (1–10000 chars)",
  "entryType": "observation | feeding | maintenance | environmental",
  "occurredAt": "ISO 8601 datetime",
  "environmentalReading": {
    "temperature": "number | null",
    "humidity": "number | null",
    "lightLevel": "number | null"
  }
}
```

**Response `200 OK`** — Updated log entry object.

---

### DELETE `/:colonyId/:entryId`

Delete a log entry and its associated environmental reading. Only the author or admin can delete.

**Authentication**: Required
**Authorization**: Entry author or `admin` role

**Response `204 No Content`**

**Side Effects**: Cascade deletes the associated `log_environmental_readings` row (if any).

---

### GET `/:colonyId/environmental`

Get environmental reading time-series data for chart visualization.

**Authentication**: Required
**Colony Access**: Any member

**Query Parameters**

| Param | Type | Required | Description |
|---|---|---|---|
| `from` | ISO 8601 | Yes | Start date (inclusive) |
| `to` | ISO 8601 | Yes | End date (inclusive) |
| `metric` | string | No | `temperature`, `humidity`, `lightLevel`, or `all` (default) |

**Response `200 OK`**
```json
{
  "data": [
    {
      "recordedAt": "2026-04-10T08:00:00.000Z",
      "temperature": 24.5,
      "humidity": 62.0,
      "lightLevel": 280.0
    },
    {
      "recordedAt": "2026-04-11T08:00:00.000Z",
      "temperature": 25.0,
      "humidity": 65.0,
      "lightLevel": 320.0
    }
  ]
}
```

**Performance Note**: This endpoint queries `log_environmental_readings` directly using the composite index `(colony_id, recorded_at)`. It does NOT join with `log_entries` — the denormalized `colony_id` enables fast range scans.

---

### GET `/:colonyId/export`

Export log entries as CSV or JSON file download. **Requires `researcher` or `admin` role.**

**Authentication**: Required
**Role**: `researcher` or `admin`

**Query Parameters**

| Param | Type | Default | Description |
|---|---|---|---|
| `format` | string | `json` | `csv` or `json` |
| `from` | ISO 8601 | — | Start date filter |
| `to` | ISO 8601 | — | End date filter |
| `includeEnvironmental` | boolean | `true` | Include environmental readings in export |

**Response `200 OK`**
- `Content-Type: application/json` (JSON export)
- `Content-Type: text/csv` (CSV export)
- `Content-Disposition: attachment; filename="colony-{id}-logs-{date}.{ext}"`

**CSV Format**
```csv
id,colonyId,entryType,title,content,occurredAt,temperature,humidity,lightLevel,createdAt
uuid,uuid,observation,"Title","Content",2026-04-14T08:00:00Z,25.5,65.0,300.0,2026-04-14T08:05:00Z
```

---

### GET `/:colonyId/:entryId/verify` *(Internal Only)*

Used by the Media Service to verify a log entry exists and belongs to the specified colony.

**Authentication**: Required

**Response `200 OK`**
```json
{
  "data": {
    "entryId": "uuid",
    "colonyId": "uuid"
  }
}
```

---

## 4. Media Service (`/api/media`)

**Base URL**: `http://media-service:3004/api/media`

---

### POST `/upload`

Register media metadata and receive a pre-signed S3 upload URL. The client then uploads the file directly to S3 using the URL.

**Authentication**: Required
**Colony Access**: `owner` or `collaborator` (verified via Colony Service)
**Rate Limit**: Strict (30 / hour)

**Request Body**
```json
{
  "colonyId": "uuid (required)",
  "logEntryId": "uuid (optional — attach to a specific log entry)",
  "filename": "string (required, 1–255 chars)",
  "contentType": "string (required, must be in allowlist)",
  "sizeBytes": "integer (required, > 0, within limits)",
  "caption": "string (optional, max 500 chars)"
}
```

**Content Type Allowlist**

| Type | MIME | Max Size |
|---|---|---|
| JPEG | `image/jpeg` | 50 MB |
| PNG | `image/png` | 50 MB |
| WebP | `image/webp` | 50 MB |
| GIF | `image/gif` | 50 MB |
| MP4 | `video/mp4` | 500 MB |
| WebM | `video/webm` | 500 MB |

**Validation Rules (Zod)**
```typescript
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm'];
const MAX_IMAGE_SIZE = 50 * 1024 * 1024;  // 50 MB
const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500 MB

z.object({
  colonyId: z.string().uuid(),
  logEntryId: z.string().uuid().optional(),
  filename: z.string().min(1).max(255),
  contentType: z.enum(ALLOWED_TYPES),
  sizeBytes: z.number().int().positive(),
  caption: z.string().max(500).optional(),
}).refine(data => {
  const isVideo = data.contentType.startsWith('video/');
  const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
  return data.sizeBytes <= maxSize;
}, { message: 'File exceeds size limit' });
```

**Response `201 Created`**
```json
{
  "data": {
    "id": "uuid (media record ID)",
    "uploadUrl": "https://minio:9000/antiverse-media/colonies/xxx/media/yyy.jpg?X-Amz-... (pre-signed PUT URL, 15 min TTL)",
    "fileKey": "colonies/a1b2c3d4/media/e5f6g7h8.jpg"
  }
}
```

**Client Upload Instructions**:
```javascript
// After receiving the uploadUrl, upload the file directly to S3:
await fetch(uploadUrl, {
  method: 'PUT',
  headers: { 'Content-Type': contentType },
  body: file, // raw File object
});

// Then confirm the upload:
await api.post(`/media/${mediaId}/confirm`);
```

**Error Responses**

| Status | Code | Condition |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Unsupported content type, file too large, missing fields |
| `403` | `FORBIDDEN` | User has viewer-only access to colony |
| `404` | `NOT_FOUND` | Colony or log entry not found |
| `429` | `RATE_LIMIT_EXCEEDED` | Upload limit reached |

---

### POST `/:id/confirm`

Confirm that the client has completed the S3 upload. Verifies the object exists in S3, then marks the media record as `ready`.

**Authentication**: Required
**Authorization**: Must be the original uploader

**Response `200 OK`**
```json
{
  "data": {
    "id": "uuid",
    "status": "ready",
    "url": "https://minio:9000/antiverse-media/colonies/xxx/media/yyy.jpg?X-Amz-... (pre-signed GET URL, 1 hour TTL)",
    "filename": "colony-photo.jpg",
    "contentType": "image/jpeg",
    "sizeBytes": 1048576,
    "caption": "Workers exploring the outworld",
    "createdAt": "2026-04-15T08:00:00.000Z"
  }
}
```

**Error Responses**

| Status | Code | Condition |
|---|---|---|
| `404` | `NOT_FOUND` | Media record doesn't exist or belongs to another user |
| `400` | `VALIDATION_ERROR` | S3 object not found (upload didn't complete) — status set to `failed` |

---

### GET `/colony/:colonyId`

List media files for a colony.

**Authentication**: Required
**Colony Access**: Any member

**Query Parameters**

| Param | Type | Default | Validation | Description |
|---|---|---|---|---|
| `page` | integer | `1` | min 1 | Page number |
| `limit` | integer | `20` | min 1, max 100 | Items per page |
| `type` | string | — | `image`, `video` | Filter by file type |
| `logEntryId` | uuid | — | — | Filter media attached to a specific log entry |

**Response `200 OK`**
```json
{
  "data": [
    {
      "id": "uuid",
      "colonyId": "uuid",
      "logEntryId": "uuid | null",
      "userId": "uuid",
      "filename": "colony-photo.jpg",
      "contentType": "image/jpeg",
      "sizeBytes": 1048576,
      "caption": "Workers exploring the outworld",
      "url": "https://... (pre-signed GET URL, 1 hour TTL)",
      "status": "ready",
      "createdAt": "2026-04-15T08:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "totalItems": 12, "totalPages": 1 }
}
```

> **Note**: Only media with `status = 'ready'` is returned in listings. Pending uploads are not visible.

---

### DELETE `/:id`

Delete a media record and its S3 object. Only the uploader or admin can delete.

**Authentication**: Required
**Authorization**: Original uploader or `admin` role

**Response `204 No Content`**

**Side Effects**:
1. Deletes the S3 object using the stored `file_key`
2. Deletes the `media_files` row

---

## 5. Health Check (All Services)

### GET `/health`

**Authentication**: None required

**Response `200 OK`** (healthy)
```json
{
  "status": "healthy",
  "service": "colony-service",
  "version": "1.0.0",
  "uptime": 3600.5,
  "timestamp": "2026-04-15T08:00:00.000Z",
  "checks": {
    "database": { "status": "healthy", "responseTime": 2 }
  }
}
```

**Response `503 Service Unavailable`** (unhealthy)
```json
{
  "status": "unhealthy",
  "service": "colony-service",
  "checks": {
    "database": { "status": "unhealthy", "error": "Connection refused" }
  }
}
```

For the Media Service, an additional S3 check is included:
```json
{
  "checks": {
    "database": { "status": "healthy", "responseTime": 2 },
    "s3": { "status": "healthy", "responseTime": 15 }
  }
}
```

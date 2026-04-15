# Anti-Verse – API Contracts

All services follow RESTful conventions. Request/response bodies are JSON. Authentication is via `Authorization: Bearer <JWT>` header unless noted otherwise.

---

## 1. Auth Service (`/api/auth`)

Base URL: `http://auth-service:3001/api/auth`

### POST `/register`

Create a new user account.

**Request Body**
```json
{
  "email": "string (required, unique)",
  "password": "string (required, min 8 chars)",
  "displayName": "string (required, 2–50 chars)",
  "role": "keeper | researcher"
}
```

**Response `201 Created`**
```json
{
  "id": "uuid",
  "email": "string",
  "displayName": "string",
  "role": "keeper | researcher",
  "createdAt": "ISO 8601"
}
```

**Errors**
| Status | Condition |
|---|---|
| `400` | Validation failed (missing fields, weak password) |
| `409` | Email already registered |

---

### POST `/login`

Authenticate and receive tokens.

**Request Body**
```json
{
  "email": "string (required)",
  "password": "string (required)"
}
```

**Response `200 OK`**
```json
{
  "accessToken": "string (JWT, 15 min TTL)",
  "refreshToken": "string (opaque, 7 day TTL)",
  "user": {
    "id": "uuid",
    "email": "string",
    "displayName": "string",
    "role": "keeper | researcher | admin"
  }
}
```

**Errors**
| Status | Condition |
|---|---|
| `401` | Invalid email or password |

---

### POST `/refresh`

Exchange a refresh token for a new access token.

**Request Body**
```json
{
  "refreshToken": "string (required)"
}
```

**Response `200 OK`**
```json
{
  "accessToken": "string (new JWT)",
  "refreshToken": "string (rotated)"
}
```

**Errors**
| Status | Condition |
|---|---|
| `401` | Refresh token is invalid or expired |

---

### POST `/logout`

Invalidate the current refresh token.

**Request Body**
```json
{
  "refreshToken": "string (required)"
}
```

**Response `204 No Content`**

---

### GET `/verify` *(internal only)*

Used by other services to verify an access token. Not exposed to the client.

**Headers**: `Authorization: Bearer <accessToken>`

**Response `200 OK`**
```json
{
  "userId": "uuid",
  "role": "keeper | researcher | admin"
}
```

**Errors**
| Status | Condition |
|---|---|
| `401` | Token missing, malformed, or expired |

---

### GET `/profile`

Get the authenticated user's profile.

**Headers**: `Authorization: Bearer <accessToken>`

**Response `200 OK`**
```json
{
  "id": "uuid",
  "email": "string",
  "displayName": "string",
  "role": "keeper | researcher | admin",
  "createdAt": "ISO 8601",
  "updatedAt": "ISO 8601"
}
```

---

### PATCH `/profile`

Update the authenticated user's profile.

**Headers**: `Authorization: Bearer <accessToken>`

**Request Body** *(all fields optional)*
```json
{
  "displayName": "string (2–50 chars)",
  "password": "string (min 8 chars)"
}
```

**Response `200 OK`** — Updated profile object.

---

## 2. Colony Service (`/api/colonies`)

Base URL: `http://colony-service:3002/api`

### GET `/colonies`

List colonies accessible to the authenticated user.

**Headers**: `Authorization: Bearer <accessToken>`

**Query Parameters**
| Param | Type | Default | Description |
|---|---|---|---|
| `page` | integer | `1` | Page number |
| `limit` | integer | `20` | Items per page (max 100) |
| `status` | string | — | Filter by: `active`, `inactive`, `deceased` |
| `search` | string | — | Search by colony name |

**Response `200 OK`**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "string",
      "species": {
        "id": "uuid",
        "scientificName": "string",
        "commonName": "string"
      },
      "status": "active | inactive | deceased",
      "foundingDate": "ISO 8601 | null",
      "queenCount": "integer",
      "estimatedWorkerCount": "integer | null",
      "createdAt": "ISO 8601"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalItems": 42,
    "totalPages": 3
  }
}
```

---

### POST `/colonies`

Create a new colony.

**Headers**: `Authorization: Bearer <accessToken>`

**Request Body**
```json
{
  "name": "string (required, 1–100 chars)",
  "speciesId": "uuid (required)",
  "description": "string (optional, max 2000 chars)",
  "foundingDate": "ISO 8601 date (optional)",
  "queenCount": "integer (required, >= 0)",
  "estimatedWorkerCount": "integer (optional, >= 0)"
}
```

**Response `201 Created`** — Full colony object.

**Errors**
| Status | Condition |
|---|---|
| `400` | Validation failed |
| `404` | Species ID not found |

---

### GET `/colonies/:id`

Get a single colony by ID.

**Response `200 OK`** — Full colony object with description.

**Errors**
| Status | Condition |
|---|---|
| `403` | User does not have access to this colony |
| `404` | Colony not found |

---

### PATCH `/colonies/:id`

Update a colony. Only the owner or admin can update.

**Request Body** *(all fields optional)*
```json
{
  "name": "string",
  "description": "string",
  "status": "active | inactive | deceased",
  "queenCount": "integer",
  "estimatedWorkerCount": "integer"
}
```

**Response `200 OK`** — Updated colony object.

---

### DELETE `/colonies/:id`

Soft-delete a colony. Only the owner or admin can delete.

**Response `204 No Content`**

---

### GET `/colonies/:id/members`

List users who have access to this colony.

**Response `200 OK`**
```json
{
  "data": [
    {
      "userId": "uuid",
      "displayName": "string",
      "accessRole": "owner | collaborator | viewer",
      "grantedAt": "ISO 8601"
    }
  ]
}
```

---

### POST `/colonies/:id/members`

Grant a user access to this colony. Only the owner or admin can grant access.

**Request Body**
```json
{
  "userId": "uuid (required)",
  "accessRole": "collaborator | viewer (required)"
}
```

**Response `201 Created`**

---

### DELETE `/colonies/:id/members/:userId`

Revoke a user's access to this colony.

**Response `204 No Content`**

---

### GET `/species`

List all species in the reference catalog.

**Query Parameters**
| Param | Type | Description |
|---|---|---|
| `search` | string | Search by scientific or common name |

**Response `200 OK`**
```json
{
  "data": [
    {
      "id": "uuid",
      "scientificName": "string",
      "commonName": "string",
      "subfamily": "string",
      "description": "string",
      "nativeRegion": "string"
    }
  ]
}
```

---

### GET `/colonies/:id/verify` *(internal only)*

Used by Log Service and Media Service to verify colony existence and user access.

**Headers**: `Authorization: Bearer <accessToken>`

**Response `200 OK`**
```json
{
  "colonyId": "uuid",
  "userId": "uuid",
  "accessRole": "owner | collaborator | viewer"
}
```

---

## 3. Log Service (`/api/logs`)

Base URL: `http://log-service:3003/api/logs`

### GET `/:colonyId`

List log entries for a colony.

**Headers**: `Authorization: Bearer <accessToken>`

**Query Parameters**
| Param | Type | Default | Description |
|---|---|---|---|
| `page` | integer | `1` | Page number |
| `limit` | integer | `20` | Items per page (max 100) |
| `type` | string | — | Filter by: `observation`, `feeding`, `maintenance`, `environmental` |
| `from` | ISO 8601 | — | Start date filter |
| `to` | ISO 8601 | — | End date filter |

**Response `200 OK`**
```json
{
  "data": [
    {
      "id": "uuid",
      "colonyId": "uuid",
      "userId": "uuid",
      "entryType": "observation | feeding | maintenance | environmental",
      "title": "string",
      "content": "string",
      "occurredAt": "ISO 8601",
      "environmentalReading": {
        "temperature": "number | null (°C)",
        "humidity": "number | null (%)",
        "lightLevel": "number | null (lux)"
      },
      "createdAt": "ISO 8601"
    }
  ],
  "pagination": { "..." : "..." }
}
```

---

### POST `/:colonyId`

Create a new log entry.

**Headers**: `Authorization: Bearer <accessToken>`

**Request Body**
```json
{
  "entryType": "observation | feeding | maintenance | environmental (required)",
  "title": "string (required, 1–200 chars)",
  "content": "string (required, max 10000 chars)",
  "occurredAt": "ISO 8601 (optional, defaults to now)",
  "environmentalReading": {
    "temperature": "number (optional, °C)",
    "humidity": "number (optional, 0–100 %)",
    "lightLevel": "number (optional, lux >= 0)"
  }
}
```

**Response `201 Created`** — Full log entry object.

**Errors**
| Status | Condition |
|---|---|
| `400` | Validation failed |
| `403` | User is a viewer (read-only access to colony) |
| `404` | Colony not found or user has no access |

---

### GET `/:colonyId/:entryId`

Get a single log entry.

**Response `200 OK`** — Full log entry object.

---

### PATCH `/:colonyId/:entryId`

Update a log entry. Only the author or admin can update.

**Request Body** *(all fields optional)*
```json
{
  "title": "string",
  "content": "string",
  "entryType": "string",
  "occurredAt": "ISO 8601",
  "environmentalReading": { "..." : "..." }
}
```

**Response `200 OK`** — Updated log entry object.

---

### DELETE `/:colonyId/:entryId`

Delete a log entry. Only the author or admin can delete.

**Response `204 No Content`**

---

### GET `/:colonyId/environmental`

Get environmental reading history for charts.

**Query Parameters**
| Param | Type | Description |
|---|---|---|
| `from` | ISO 8601 | Start date (required) |
| `to` | ISO 8601 | End date (required) |
| `metric` | string | `temperature`, `humidity`, `lightLevel`, or `all` (default) |

**Response `200 OK`**
```json
{
  "data": [
    {
      "recordedAt": "ISO 8601",
      "temperature": "number | null",
      "humidity": "number | null",
      "lightLevel": "number | null"
    }
  ]
}
```

---

### GET `/:colonyId/export`

Export log entries as CSV or JSON. **Requires `researcher` or `admin` role.**

**Query Parameters**
| Param | Type | Default | Description |
|---|---|---|---|
| `format` | string | `json` | `csv` or `json` |
| `from` | ISO 8601 | — | Start date filter |
| `to` | ISO 8601 | — | End date filter |

**Response `200 OK`** — File download with appropriate `Content-Type`.

---

## 4. Media Service (`/api/media`)

Base URL: `http://media-service:3004/api/media`

### POST `/upload`

Request a pre-signed upload URL and register media metadata.

**Headers**: `Authorization: Bearer <accessToken>`

**Request Body**
```json
{
  "colonyId": "uuid (required)",
  "logEntryId": "uuid (optional – attach to a log entry)",
  "filename": "string (required)",
  "contentType": "string (required, e.g. image/jpeg, video/mp4)",
  "sizeBytes": "integer (required, max 50 MB for images, 500 MB for video)",
  "caption": "string (optional, max 500 chars)"
}
```

**Response `201 Created`**
```json
{
  "id": "uuid",
  "uploadUrl": "string (pre-signed S3 PUT URL, 15 min TTL)",
  "fileKey": "string (S3 object key)"
}
```

**Errors**
| Status | Condition |
|---|---|
| `400` | Unsupported content type or file too large |
| `403` | User has viewer-only access to colony |
| `404` | Colony or log entry not found |

---

### POST `/:id/confirm`

Confirm that a file upload to S3 has completed. Marks the media record as `ready`.

**Response `200 OK`**
```json
{
  "id": "uuid",
  "status": "ready",
  "url": "string (public or pre-signed GET URL)"
}
```

---

### GET `/colony/:colonyId`

List media for a colony.

**Headers**: `Authorization: Bearer <accessToken>`

**Query Parameters**
| Param | Type | Default | Description |
|---|---|---|---|
| `page` | integer | `1` | Page number |
| `limit` | integer | `20` | Items per page (max 100) |
| `type` | string | — | Filter: `image`, `video` |

**Response `200 OK`**
```json
{
  "data": [
    {
      "id": "uuid",
      "colonyId": "uuid",
      "logEntryId": "uuid | null",
      "filename": "string",
      "contentType": "string",
      "sizeBytes": "integer",
      "caption": "string | null",
      "url": "string",
      "status": "pending | ready",
      "createdAt": "ISO 8601"
    }
  ],
  "pagination": { "..." : "..." }
}
```

---

### DELETE `/:id`

Delete a media record and its S3 object. Only the uploader or admin can delete.

**Response `204 No Content`**

---

## 5. Common Error Response Format

All services return errors in a consistent shape:

```json
{
  "error": {
    "status": 400,
    "code": "VALIDATION_ERROR",
    "message": "Human-readable description",
    "details": [
      {
        "field": "email",
        "message": "Must be a valid email address"
      }
    ]
  }
}
```

### Standard Error Codes

| Code | HTTP Status | Description |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Request body/params failed validation |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Authenticated but insufficient permissions |
| `NOT_FOUND` | 404 | Resource does not exist |
| `CONFLICT` | 409 | Duplicate resource (e.g., email) |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

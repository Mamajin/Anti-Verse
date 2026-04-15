# Anti-Verse – System Architecture

## 1. Overview

Anti-Verse is a microservices-based platform for ant keepers and researchers to manage, monitor, and document ant colonies. The system is decomposed into four backend services, a shared packages layer, and a React client dashboard.

### High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        React Client (Port 3000)                         │
│             Tailwind CSS v3 · DaisyUI · Zustand · Apex Charts           │
│             React Router v6 · Vite · TypeScript                         │
└──────┬──────────┬──────────────┬──────────────┬──────────────────────────┘
       │          │              │              │
  /api/auth  /api/colonies  /api/logs     /api/media
       │          │              │              │
┌──────▼──────┐ ┌─▼────────────┐ ┌▼────────────┐ ┌▼───────────────┐
│ Auth Service│ │Colony Service│ │ Log Service │ │ Media Service  │
│  Port 3001  │ │  Port 3002   │ │  Port 3003  │ │   Port 3004    │
│             │ │              │ │             │ │                │
│ • Register  │ │ • Colonies   │ │ • Entries   │ │ • Upload URLs  │
│ • Login     │ │ • Species    │ │ • Env Data  │ │ • Metadata     │
│ • JWT/RBAC  │ │ • Members    │ │ • Export    │ │ • Confirm      │
│ • Profiles  │ │ • Lifecycle  │ │ • Charts    │ │ • Delete       │
└──────┬──────┘ └──┬───────────┘ └──┬──────────┘ └──┬────────────┘
       │           │                │               │
       │    ┌──────▼────────────────▼───────────────▼──┐
       │    │       PostgreSQL 15 (Port 5432)           │
       └───►│  Shared instance, separate table prefixes │
            │  auth_*  colony_*  log_*  media_*         │
            └──────────────────────────────────────────┘
                                                    │
                                          ┌─────────▼─────────┐
                                          │  MinIO / S3       │
                                          │  Port 9000 (API)  │
                                          │  Port 9001 (UI)   │
                                          │  Bucket:          │
                                          │  antiverse-media  │
                                          └───────────────────┘
```

---

## 2. Design Principles

| # | Principle | Description | Enforcement |
|---|---|---|---|
| 1 | **Service Autonomy** | Each service owns its data and logic. No cross-service imports. | PR review checklist |
| 2 | **API-First Communication** | Services talk via internal HTTP, never direct DB cross-queries. | `packages/api-client` wrapper |
| 3 | **Zero-AI Policy** | All logic is deterministic. No LLM, ML, or predictive components. | PR review checklist |
| 4 | **Role-Based Access** | Three roles: `keeper`, `researcher`, `admin`. Enforced at Auth Service. | JWT claims + middleware |
| 5 | **Shared DB, Separate Tables** | Services share a PostgreSQL instance but never query another service's table prefixes. | Table naming convention (`auth_*`, `colony_*`, etc.) |
| 6 | **Acyclic Dependencies** | Service dependency graph must be a DAG. Auth ← Colony ← Log ← Media. | Architecture review |
| 7 | **Fail Fast** | Validate inputs at the boundary (Zod schemas). Return clear errors. | Validation middleware |

---

## 3. Service Responsibilities (Detailed)

### 3.1 Auth Service (`services/auth-service` — Port 3001)

**Domain**: User identity, authentication, authorization.

| Responsibility | Details |
|---|---|
| User Registration | Email + password signup. bcrypt hashing (12 rounds). Assigns `keeper` role by default. |
| Login | Validates credentials, issues JWT access token (15 min) + opaque refresh token (7 days). |
| Token Refresh | Rotates refresh tokens on each use. Old tokens are invalidated (single-use). |
| Token Verification | Internal endpoint (`GET /api/auth/verify`) for other services to validate JWTs and extract `userId` + `role`. |
| Profile Management | Users can update display name and password. Admins can update any user's role. |
| Session Revocation | Logout invalidates the refresh token. Admins can revoke all sessions for a user. |

**Tables owned**: `auth_users`, `auth_refresh_tokens`

**Dependencies**: None (root of the dependency graph).

---

### 3.2 Colony Service (`services/colony-service` — Port 3002)

**Domain**: Ant colonies, species catalog, collaboration.

| Responsibility | Details |
|---|---|
| Colony CRUD | Create, read, update, soft-delete colonies. Owners can manage; collaborators can edit; viewers read-only. |
| Species Catalog | Pre-seeded reference database of ant species. Admin-editable. Searchable by scientific/common name. |
| Lifecycle Tracking | Colonies have statuses: `active` → `inactive` → `deceased`. Transitions are manual. |
| Population Tracking | `queen_count` and `estimated_worker_count` fields. Updated manually by keepers. |
| Collaboration | Colony owners can invite users as `collaborator` or `viewer`. One role per user per colony. |
| Colony Verification | Internal endpoint (`GET /api/colonies/:id/verify`) for Log/Media services to confirm colony existence and user access. |

**Tables owned**: `colony_species`, `colony_colonies`, `colony_members`

**Dependencies**: Auth Service (token verification).

---

### 3.3 Log Service (`services/log-service` — Port 3003)

**Domain**: Observation journal, environmental data, data export.

| Responsibility | Details |
|---|---|
| Journal Entries | CRUD for categorized entries: `observation`, `feeding`, `maintenance`, `environmental`. Free-text content with titles. |
| Environmental Readings | Structured numeric data: temperature (°C), humidity (%), light level (lux). Stored in a separate table for chart query performance. |
| Timeline Queries | Paginated, filterable entry lists sorted by `occurred_at`. Support date range filters. |
| Chart Data | Dedicated endpoint returning time-series environmental data for Apex Charts. |
| Data Export | CSV/JSON export of log entries with optional date filtering. Restricted to `researcher` and `admin` roles. |

**Tables owned**: `log_entries`, `log_environmental_readings`

**Dependencies**: Auth Service (token verification), Colony Service (colony access verification).

---

### 3.4 Media Service (`services/media-service` — Port 3004)

**Domain**: File uploads, S3 storage, media metadata.

| Responsibility | Details |
|---|---|
| Pre-signed Uploads | Generates S3 pre-signed PUT URLs for client-side direct uploads. Client uploads to S3, then confirms via API. |
| Metadata Storage | Tracks filename, MIME type, size, caption, S3 key, and upload status (`pending` → `ready` → `failed`). |
| Colony Media | Media is always linked to a colony. Optionally linked to a specific log entry. |
| Media Listing | Paginated, filterable list of media for a colony. Filter by type (image/video). |
| Cleanup | Scheduled job deletes `pending` records older than 24 hours (orphaned uploads). |
| Deletion | Deletes both the metadata record and the S3 object. Only the uploader or admin can delete. |

**Tables owned**: `media_files`

**Dependencies**: Auth Service (token verification), Colony Service (colony access verification), Log Service (log entry verification for attachment).

---

## 4. Inter-Service Communication

### 4.1 Communication Pattern

All inter-service communication uses **synchronous HTTP REST** over the internal Docker network (`anti-verse-net`). Services use the `packages/api-client` library which wraps Axios with:

- Base URL configuration from environment variables
- Automatic forwarding of the `Authorization` header from the original request
- Timeout configuration (5 seconds default)
- Retry logic (1 retry on 5xx errors, no retry on 4xx)
- Structured error handling that maps upstream errors to local error types

### 4.2 Communication Matrix

```
                    Auth        Colony       Log         Media
                    Service     Service      Service     Service
                    ─────────   ─────────    ─────────   ─────────
Auth Service        —           ✗            ✗           ✗
Colony Service      ◄ verify    —            ✗           ✗
Log Service         ◄ verify    ◄ verify     —           ✗
Media Service       ◄ verify    ◄ verify     ◄ verify    —

◄ = calls that service    ✗ = never calls    — = self
```

### 4.3 Dependency Graph (Acyclic)

```
Auth Service          (Layer 0 – no dependencies)
    ▲
    │
Colony Service        (Layer 1 – depends on Auth)
    ▲
    │
Log Service           (Layer 2 – depends on Auth, Colony)
    ▲
    │
Media Service         (Layer 3 – depends on Auth, Colony, Log)
```

**Rule**: A service at Layer N may only call services at Layer N-1 or lower. Never upward or lateral at the same layer.

### 4.4 Internal API Call Flow Example

```
Client → POST /api/logs/abc-123 (create log entry)
         │
         ▼
    Log Service receives request
         │
         ├──► Auth Service: GET /api/auth/verify
         │    Headers: { Authorization: Bearer <token from client> }
         │    Response: { userId: "xyz", role: "keeper" }
         │
         ├──► Colony Service: GET /api/colonies/abc-123/verify
         │    Headers: { Authorization: Bearer <token from client> }
         │    Response: { colonyId: "abc-123", userId: "xyz", accessRole: "owner" }
         │
         ├── Validate: accessRole is "owner" or "collaborator" (not "viewer")
         │
         ├── INSERT into log_entries table
         │
         └──► Response 201: { id: "new-entry-id", ... }
```

---

## 5. Request Lifecycle

Every incoming HTTP request to any service follows this standardized middleware pipeline:

```
Incoming Request
    │
    ▼
┌─────────────────────┐
│ 1. CORS Middleware   │  Validates Origin header against CORS_ORIGIN env var
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ 2. Request Logger   │  Logs: method, path, IP, user-agent, timestamp
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ 3. Body Parser      │  JSON parsing with 10MB limit. Rejects non-JSON.
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ 4. Request ID       │  Generates UUID for tracing. Sets X-Request-ID header.
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ 5. Rate Limiter     │  Per-IP rate limiting (configurable per route).
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ 6. Auth Middleware   │  Extracts JWT from Authorization header.
│    (protected routes)│  Calls Auth Service verify endpoint.
│                      │  Attaches { userId, role } to req.user.
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ 7. Role Guard        │  Checks req.user.role against route requirements.
│    (where applicable)│  Returns 403 if insufficient permissions.
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ 8. Validation        │  Zod schema validates req.body, req.params, req.query.
│                      │  Returns 400 with field-level errors on failure.
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ 9. Controller        │  Business logic. DB queries via models. Calls other
│                      │  services via api-client if needed.
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ 10. Response         │  Serializes response. Sets status code.
│     Formatter        │  Wraps in standard { data, pagination } shape.
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ 11. Error Handler    │  Global catch-all. Formats errors into standard shape.
│     (global)         │  Logs stack traces. Never leaks internals to client.
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ 12. Response Logger  │  Logs: status code, response time, content length.
└─────────────────────┘
```

---

## 6. Error Handling Strategy

### 6.1 Error Classes

Each service defines a hierarchy of custom error classes:

```typescript
// Base application error
class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: { field: string; message: string }[]
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Specific error types
class ValidationError extends AppError {
  constructor(details: { field: string; message: string }[]) {
    super(400, 'VALIDATION_ERROR', 'Request validation failed', details);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(401, 'UNAUTHORIZED', message);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(403, 'FORBIDDEN', message);
  }
}

class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, 'NOT_FOUND', `${resource} not found`);
  }
}

class ConflictError extends AppError {
  constructor(message: string) {
    super(409, 'CONFLICT', message);
  }
}
```

### 6.2 Global Error Handler

```typescript
// Applied as the last middleware in the Express app
function globalErrorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  if (err instanceof AppError) {
    // Known application error — return structured response
    return res.status(err.statusCode).json({
      error: {
        status: err.statusCode,
        code: err.code,
        message: err.message,
        details: err.details ?? [],
        requestId: req.requestId, // from Request ID middleware
      },
    });
  }

  // Unknown error — log full stack, return generic 500
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    requestId: req.requestId,
    path: req.path,
    method: req.method,
  });

  return res.status(500).json({
    error: {
      status: 500,
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      requestId: req.requestId,
    },
  });
}
```

### 6.3 Upstream Service Error Handling

When a service calls another service and receives an error:

| Upstream Status | Local Behavior |
|---|---|
| `401` | Return `401` to the client (token is invalid) |
| `403` | Return `403` to the client (insufficient access) |
| `404` | Return `404` to the client (resource not found) |
| `5xx` | Retry once, then return `502 Bad Gateway` with `SERVICE_UNAVAILABLE` code |
| Timeout | Return `504 Gateway Timeout` |

---

## 7. Logging Strategy

### 7.1 Logger Configuration

All services use a shared logging utility built on **pino** (fast, structured JSON logger):

```typescript
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  base: {
    service: process.env.SERVICE_NAME, // e.g., 'auth-service'
  },
});
```

### 7.2 What Gets Logged

| Event | Level | Fields |
|---|---|---|
| Incoming request | `info` | method, path, ip, userAgent, requestId |
| Response sent | `info` | method, path, statusCode, responseTime (ms), requestId |
| Auth verification fail | `warn` | reason, ip, requestId |
| Validation error | `warn` | fields, requestId |
| DB query error | `error` | query (sanitized), error message, requestId |
| Upstream service error | `error` | targetService, statusCode, error, requestId |
| Unhandled exception | `error` | error, stack, requestId |
| Service startup | `info` | port, nodeEnv, dbHost |
| Graceful shutdown | `info` | reason (SIGTERM/SIGINT) |

### 7.3 What Never Gets Logged

- Passwords or password hashes
- JWT tokens (access or refresh)
- Full request bodies containing sensitive data
- S3 secret keys
- Database connection strings with passwords

---

## 8. Health Checks

Every service exposes a health check endpoint:

### `GET /health`

Returns the service's health status and readiness of its dependencies.

```json
{
  "status": "healthy",
  "service": "colony-service",
  "version": "1.0.0",
  "uptime": 3600,
  "timestamp": "2026-04-15T08:00:00.000Z",
  "checks": {
    "database": {
      "status": "healthy",
      "responseTime": 2
    }
  }
}
```

For the Media Service, an additional S3 check:
```json
{
  "checks": {
    "database": { "status": "healthy", "responseTime": 2 },
    "s3": { "status": "healthy", "responseTime": 15 }
  }
}
```

**Usage in Docker Compose:**
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
  interval: 30s
  timeout: 5s
  retries: 3
  start_period: 10s
```

---

## 9. Technology Stack (Detailed)

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Runtime** | Node.js | 18.x or 20.x LTS | JavaScript/TypeScript execution |
| **Language** | TypeScript | 5.x | Type safety across all services |
| **Backend Framework** | Express.js | 4.x | HTTP server and routing |
| **Validation** | Zod | 3.x | Runtime request/response validation |
| **Database** | PostgreSQL | 15.x | Relational data storage |
| **Query Builder** | Knex.js | 3.x | SQL query builder + migrations |
| **Authentication** | jsonwebtoken | 9.x | JWT signing and verification |
| **Password Hashing** | bcrypt | 5.x | Password hashing (12 rounds) |
| **HTTP Client** | Axios | 1.x | Inter-service HTTP calls |
| **Logging** | pino | 8.x | Structured JSON logging |
| **Object Storage** | @aws-sdk/client-s3 | 3.x | S3 pre-signed URL generation |
| **Frontend** | React | 18.x | UI rendering |
| **Build Tool** | Vite | 5.x | Frontend dev server + bundler |
| **Routing** | React Router | 6.x | Client-side routing |
| **Styling** | Tailwind CSS | 3.x | Utility-first CSS framework |
| **Component Library** | DaisyUI | 4.x | Tailwind component library |
| **State Management** | Zustand | 4.x | Lightweight global state |
| **Charts** | react-apexcharts | 1.x | Data visualization |
| **Containerization** | Docker | 24.x | Service containers |
| **Orchestration** | Docker Compose | 2.x | Local multi-service dev |
| **Testing** | Vitest | 1.x | Unit and integration tests |
| **Linting** | ESLint | 8.x | Code quality |
| **Formatting** | Prettier | 3.x | Code formatting |

---

## 10. Shared Packages

### 10.1 `packages/tailwind-config`

Shared Tailwind CSS + DaisyUI preset consumed by the client app.

```js
// packages/tailwind-config/index.js
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
      {
        antiverse: {
          'primary': '#4f46e5',       // Indigo – primary actions
          'secondary': '#0891b2',     // Cyan – secondary UI
          'accent': '#f59e0b',        // Amber – highlights & badges
          'neutral': '#1e293b',       // Slate – neutral text/BG
          'base-100': '#0f172a',      // Dark background
          'base-200': '#1e293b',      // Slightly lighter BG
          'base-300': '#334155',      // Card/surface BG
          'info': '#3b82f6',          // Blue – info alerts
          'success': '#22c55e',       // Green – success states
          'warning': '#f59e0b',       // Amber – warning states
          'error': '#ef4444',         // Red – error states
        },
      },
      'light',  // Built-in DaisyUI light theme as fallback
    ],
    darkTheme: 'antiverse',
  },
};
```

### 10.2 `packages/types`

Shared TypeScript interfaces and enums used across services and the client.

```typescript
// Key types exported:
export enum UserRole { Keeper = 'keeper', Researcher = 'researcher', Admin = 'admin' }
export enum ColonyStatus { Active = 'active', Inactive = 'inactive', Deceased = 'deceased' }
export enum AccessRole { Owner = 'owner', Collaborator = 'collaborator', Viewer = 'viewer' }
export enum LogEntryType { Observation = 'observation', Feeding = 'feeding', Maintenance = 'maintenance', Environmental = 'environmental' }
export enum MediaStatus { Pending = 'pending', Ready = 'ready', Failed = 'failed' }

export interface ApiResponse<T> { data: T }
export interface PaginatedResponse<T> { data: T[]; pagination: Pagination }
export interface Pagination { page: number; limit: number; totalItems: number; totalPages: number }
export interface ApiError { error: { status: number; code: string; message: string; details?: FieldError[] } }
```

### 10.3 `packages/database`

Shared database constants to prevent typos and keep table names in sync.

```typescript
// Table names
export const Tables = {
  AUTH_USERS: 'auth_users',
  AUTH_REFRESH_TOKENS: 'auth_refresh_tokens',
  COLONY_SPECIES: 'colony_species',
  COLONY_COLONIES: 'colony_colonies',
  COLONY_MEMBERS: 'colony_members',
  LOG_ENTRIES: 'log_entries',
  LOG_ENVIRONMENTAL_READINGS: 'log_environmental_readings',
  MEDIA_FILES: 'media_files',
} as const;

// Column constraints
export const Constraints = {
  EMAIL_MAX_LENGTH: 255,
  DISPLAY_NAME_MAX_LENGTH: 50,
  COLONY_NAME_MAX_LENGTH: 100,
  LOG_TITLE_MAX_LENGTH: 200,
  LOG_CONTENT_MAX_LENGTH: 10000,
  CAPTION_MAX_LENGTH: 500,
  MAX_IMAGE_SIZE_BYTES: 50 * 1024 * 1024,   // 50 MB
  MAX_VIDEO_SIZE_BYTES: 500 * 1024 * 1024,   // 500 MB
} as const;
```

### 10.4 `packages/api-client`

Internal HTTP client for service-to-service communication.

```typescript
// Usage in a service controller:
import { authClient, colonyClient } from '@antiverse/api-client';

// Verify the token from the incoming request
const user = await authClient.verify(req.headers.authorization);

// Check colony access
const access = await colonyClient.verifyAccess(colonyId, req.headers.authorization);
```

Features:
- Configurable base URLs from environment variables
- Automatic `Authorization` header forwarding
- 5-second timeout with 1 retry on 5xx
- Structured error mapping

---

## 11. Authentication & Authorization (Detailed)

### 11.1 Token Flow

```
┌──────────┐                    ┌──────────────┐
│  Client   │                    │ Auth Service  │
└────┬─────┘                    └──────┬───────┘
     │                                 │
     │─── POST /auth/login ───────────►│
     │    { email, password }          │
     │                                 │── bcrypt.compare(password, hash)
     │                                 │── Generate accessToken (JWT, 15min)
     │                                 │── Generate refreshToken (opaque, 7d)
     │                                 │── Hash refreshToken with SHA-256
     │                                 │── Store hash in auth_refresh_tokens
     │◄── { accessToken,              │
     │      refreshToken, user } ─────│
     │                                 │
     │  ┌─── Later (access token      │
     │  │    expired) ──────────┐     │
     │  │                       │     │
     │─── POST /auth/refresh ────────►│
     │    { refreshToken }             │
     │                                 │── Hash provided token
     │                                 │── Lookup hash in DB
     │                                 │── Verify not expired
     │                                 │── Delete old token record
     │                                 │── Create new pair
     │◄── { accessToken,              │
     │      refreshToken } ───────────│
     │                                 │
     │─── POST /auth/logout ─────────►│
     │    { refreshToken }             │
     │                                 │── Delete token record from DB
     │◄── 204 No Content ────────────│
```

### 11.2 JWT Claims (Access Token Payload)

```json
{
  "sub": "user-uuid-here",
  "role": "keeper",
  "iat": 1713168000,
  "exp": 1713168900
}
```

- `sub`: User's UUID
- `role`: User's RBAC role
- `iat`: Issued-at timestamp
- `exp`: Expiration timestamp (15 minutes after iat)

### 11.3 Role Permissions Matrix

| Action | Keeper | Researcher | Admin |
|---|---|---|---|
| Register account | ✅ | ✅ | ✅ |
| Login / logout | ✅ | ✅ | ✅ |
| Update own profile | ✅ | ✅ | ✅ |
| Create colony | ✅ | ✅ | ✅ |
| Manage own colonies | ✅ | ✅ | ✅ |
| Create log entries (own/collab colonies) | ✅ | ✅ | ✅ |
| Upload media (own/collab colonies) | ✅ | ✅ | ✅ |
| View all colonies (read-only browse) | ❌ | ✅ | ✅ |
| Export data (CSV/JSON) | ❌ | ✅ | ✅ |
| Manage any user's role | ❌ | ❌ | ✅ |
| Delete any colony | ❌ | ❌ | ✅ |
| Revoke any user's sessions | ❌ | ❌ | ✅ |
| Access admin dashboard | ❌ | ❌ | ✅ |

### 11.4 Colony-Level Access Roles

| Action | Owner | Collaborator | Viewer |
|---|---|---|---|
| View colony details | ✅ | ✅ | ✅ |
| View log entries | ✅ | ✅ | ✅ |
| View media | ✅ | ✅ | ✅ |
| Create log entries | ✅ | ✅ | ❌ |
| Upload media | ✅ | ✅ | ❌ |
| Edit colony details | ✅ | ✅ | ❌ |
| Delete colony | ✅ | ❌ | ❌ |
| Manage members | ✅ | ❌ | ❌ |

---

## 12. Deployment Topology (Docker Compose)

### Network Layout

```
┌─────────────────── anti-verse-net (bridge) ───────────────────┐
│                                                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │  auth    │  │  colony  │  │  log     │  │  media   │     │
│  │  :3001   │  │  :3002   │  │  :3003   │  │  :3004   │     │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘     │
│       │              │             │              │            │
│       └──────┬───────┴─────┬───────┴──────┬──────┘            │
│              │             │              │                    │
│         ┌────▼─────┐  ┌───▼──────┐  ┌────▼─────┐            │
│         │ postgres │  │  minio   │  │  client  │            │
│         │ :5432    │  │  :9000   │  │  :3000   │            │
│         │          │  │  :9001   │  │          │            │
│         └──────────┘  └──────────┘  └──────────┘            │
│                                                                │
└────────────────────────────────────────────────────────────────┘
           │              │  │            │
    Host: 5432       9000  9001       3000
    (Postgres)     (S3 API)(Console) (Client)
```

### Port Mapping Summary

| Container | Internal Port | Host Port | Description |
|---|---|---|---|
| postgres | 5432 | 5432 | PostgreSQL database |
| minio | 9000 | 9000 | S3-compatible API |
| minio | 9001 | 9001 | MinIO web console |
| auth-service | 3001 | 3001 | Auth API |
| colony-service | 3002 | 3002 | Colony API |
| log-service | 3003 | 3003 | Log API |
| media-service | 3004 | 3004 | Media API |
| client | 3000 | 3000 | Vite dev server |

---

## 13. Graceful Shutdown

All services implement graceful shutdown to prevent request drops:

```typescript
// In app.ts of each service
const server = app.listen(port);

async function shutdown(signal: string) {
  logger.info({ signal }, 'Shutdown signal received');

  // 1. Stop accepting new connections
  server.close();

  // 2. Wait for in-flight requests to complete (max 10s)
  await new Promise((resolve) => setTimeout(resolve, 10000));

  // 3. Close database connections
  await knex.destroy();

  // 4. Exit
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
```

---

## 14. Future Considerations

| Area | Enhancement | Priority |
|---|---|---|
| **API Gateway** | NGINX/Traefik for single entry point, rate limiting, CORS | High |
| **Event Bus** | RabbitMQ for async events (colony status changed, media uploaded) | Medium |
| **Caching** | Redis for session cache, species catalog, frequently-read data | Medium |
| **CI/CD** | GitHub Actions pipelines per service with independent build/test/deploy | High |
| **Monitoring** | Prometheus metrics + Grafana dashboards per service | Medium |
| **Search** | Elasticsearch for full-text search across logs and colonies | Low |
| **Notifications** | Email/push notifications for colony events and collaboration invites | Low |
| **Mobile** | React Native companion app for field observations | Low |

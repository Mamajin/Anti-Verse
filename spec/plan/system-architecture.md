# Anti-Verse – System Architecture

## 1. Overview

Anti-Verse is a microservices-based platform for ant keepers and researchers to manage, monitor, and document ant colonies. The system is decomposed into four backend services, a shared packages layer, and a React client dashboard.

```
┌─────────────────────────────────────────────────────────────────┐
│                        React Client (MUI v3)                    │
│                  MobX State  ·  Apex Charts  ·  Emotion         │
└──────────┬──────────┬──────────┬──────────┬─────────────────────┘
           │          │          │          │
      /api/auth  /api/colonies  /api/logs  /api/media
           │          │          │          │
┌──────────▼──┐ ┌─────▼──────┐ ┌▼────────┐ ┌▼───────────┐
│ Auth Service│ │Colony Svc  │ │Log Svc  │ │Media Svc   │
│  (JWT/RBAC) │ │ (Species,  │ │(Journal,│ │(S3, image/ │
│             │ │  Profiles) │ │ Env Data│ │ video meta)│
└──────┬──────┘ └─────┬──────┘ └──┬──────┘ └──┬─────────┘
       │              │           │            │
       │   ┌──────────▼───────────▼────────────▼──┐
       │   │       PostgreSQL (shared instance)    │
       └──►│  Each service owns its own tables     │
           └───────────────────────────────────────┘
```

## 2. Design Principles

| Principle | Description |
|---|---|
| **Service Autonomy** | Each service owns its data and logic. No cross-service imports. |
| **API-First Communication** | Services talk via internal HTTP calls, never direct DB cross-talk. |
| **Zero-AI Policy** | All logic is deterministic. No LLM, ML, or predictive components. |
| **Role-Based Access** | Three roles: `keeper`, `researcher`, `admin`. Enforced at Auth Service. |
| **Shared DB, Separate Schemas** | Services share a PostgreSQL instance but never query another service's tables. |

## 3. Service Responsibilities

### 3.1 Auth Service (`services/auth-service`)

- User registration and login (email + password)
- JWT access token & refresh token issuance
- Role-Based Access Control (RBAC) with three roles: `keeper`, `researcher`, `admin`
- User profile management
- Token validation endpoint for other services to verify requests

### 3.2 Colony Service (`services/colony-service`)

- CRUD operations for ant colonies
- Species reference catalog
- Colony lifecycle tracking (founding → active → inactive → deceased)
- Colony sharing / collaboration (owner, collaborator, viewer)
- Population estimates and queen tracking

### 3.3 Log Service (`services/log-service`)

- Observation journal entries linked to colonies
- Structured environmental data readings (temperature, humidity, light)
- Entry categorization (observation, feeding, maintenance, environmental)
- Timestamped event history
- Data export for research (CSV/JSON)

### 3.4 Media Service (`services/media-service`)

- Pre-signed URL generation for S3 uploads
- Image and video metadata storage
- Media linked to colonies and optionally to log entries
- Thumbnail generation (future)
- Storage quota management per user

## 4. Inter-Service Communication

Services communicate exclusively via **synchronous HTTP** over the internal Docker network. No message queues in the initial architecture.

### Communication Map

| Caller | Callee | Purpose |
|---|---|---|
| Colony Service | Auth Service | Verify user identity on incoming requests |
| Log Service | Auth Service | Verify user identity on incoming requests |
| Log Service | Colony Service | Validate colony existence and user access |
| Media Service | Auth Service | Verify user identity on incoming requests |
| Media Service | Colony Service | Validate colony existence for media attachment |
| Media Service | Log Service | Validate log entry existence for media attachment |

> **Rule**: No circular dependencies. The dependency graph is strictly: `Auth ← Colony ← Log ← Media` (left services never call right services).

## 5. Technology Stack

| Layer | Technology |
|---|---|
| **Runtime** | Node.js |
| **Language** | TypeScript |
| **Backend Framework** | Express.js |
| **Database** | PostgreSQL |
| **ORM / Query Builder** | Knex.js (migrations + queries) |
| **Authentication** | JSON Web Tokens (JWT) |
| **Object Storage** | S3-compatible (AWS S3 / MinIO for local dev) |
| **Frontend Framework** | React |
| **UI Library** | Material-UI v3 + Emotion (`css={{}}` prop) |
| **State Management** | MobX (`useLocalStore`) |
| **Charts** | Apex Charts |
| **Containerization** | Docker + Docker Compose |
| **Testing** | Vitest |
| **Linting** | ESLint |

## 6. Shared Packages (`packages/`)

| Package | Purpose |
|---|---|
| `packages/theme` | MUI v3 design tokens (`tokens.ts`), palette, typography, spacing |
| `packages/types` | Shared TypeScript interfaces & enums (roles, statuses, API contracts) |
| `packages/database` | Shared DB constants (table names, column constraints) |

## 7. Authentication & Authorization Flow

```
Client                Auth Service            Other Service
  │                       │                        │
  │── POST /auth/login ──►│                        │
  │◄── { accessToken,     │                        │
  │     refreshToken } ───│                        │
  │                       │                        │
  │── GET /colonies ──────────────────────────────►│
  │   (Authorization: Bearer <accessToken>)        │
  │                       │◄── GET /auth/verify ───│
  │                       │── { userId, role } ───►│
  │◄──────────────── colony data ──────────────────│
```

### Roles & Permissions

| Action | Keeper | Researcher | Admin |
|---|---|---|---|
| Manage own colonies | ✅ | ✅ | ✅ |
| Create log entries | ✅ | ✅ | ✅ |
| Upload media | ✅ | ✅ | ✅ |
| Export data (CSV/JSON) | ❌ | ✅ | ✅ |
| View all colonies (read-only) | ❌ | ✅ | ✅ |
| Manage users | ❌ | ❌ | ✅ |
| Delete any colony | ❌ | ❌ | ✅ |

## 8. Deployment Topology (Docker Compose)

```yaml
# Logical layout
services:
  postgres:        # Shared PostgreSQL instance
  minio:           # S3-compatible object storage (local dev)
  auth-service:    # Port 3001
  colony-service:  # Port 3002
  log-service:     # Port 3003
  media-service:   # Port 3004
  client:          # Port 3000 (dev server)
```

All services share an internal Docker network (`anti-verse-net`) for inter-service HTTP calls. Only the client and API gateway ports are exposed to the host.

## 9. Future Considerations

- **API Gateway**: Introduce an NGINX or Traefik gateway for routing, rate limiting, and CORS.
- **Event-Driven Communication**: Add a message broker (e.g., RabbitMQ) for async events like "colony status changed".
- **Caching**: Add Redis for session caching and frequently-read species data.
- **CI/CD**: GitHub Actions pipelines per service with independent build/test/deploy.

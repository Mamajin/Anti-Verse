# 🐜 Anti-Verse

Anti-Verse is a digital platform designed for **ant keepers and researchers** to manage, monitor, and document ant colonies. The system helps users organize colony information, record environmental conditions, track colony development, and store observations in a structured way.

---

## Table of Contents

- [Purpose](#purpose)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [1. Clone & Install](#1-clone--install)
  - [2. Environment Variables](#2-environment-variables)
  - [3. Start with Docker Compose](#3-start-with-docker-compose)
  - [4. Run Database Migrations](#4-run-database-migrations)
  - [5. Seed Development Data](#5-seed-development-data)
  - [6. Access the Application](#6-access-the-application)
- [Running Without Docker](#running-without-docker)
- [External Service Setup](#external-service-setup)
- [Environment Variable Reference](#environment-variable-reference)
- [Useful Commands](#useful-commands)
- [Troubleshooting](#troubleshooting)

---

## Purpose

Ant research often relies on scattered notes, spreadsheets, or manual observation logs. Anti-Verse provides a **centralized, structured system** where users can:

- Manage multiple ant colonies with species profiles
- Record colony observations and behaviors in a journal
- Log environmental data (temperature, humidity, light) with time-series charts
- Store photos and videos of colony development
- Export data for research and documentation (CSV / JSON)
- Collaborate with other keepers and researchers on shared colonies

---

## Key Features

| Feature | Description |
|---|---|
| 🏠 Colony Management | Create, edit, and track ant colonies through their lifecycle |
| 📋 Species Catalog | Reference database of ant species with taxonomy info |
| 📝 Observation Journal | Categorized log entries (observation, feeding, maintenance, environmental) |
| 🌡️ Environmental Tracking | Temperature, humidity, and light readings with Apex Charts visualizations |
| 📸 Media Storage | Upload colony photos/videos to S3 with pre-signed URLs |
| 👥 Collaboration | Share colonies with other users (owner / collaborator / viewer roles) |
| 📊 Data Export | Export logs and environmental data as CSV or JSON (researcher+ only) |
| 🔐 Role-Based Access | Three roles: **Keeper**, **Researcher**, **Admin** |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Tailwind CSS v3, DaisyUI, Zustand, React Router v6 |
| **Charts** | Apex Charts (react-apexcharts) |
| **Backend** | Node.js, Express.js, TypeScript |
| **Database** | PostgreSQL 15 |
| **ORM** | Knex.js (migrations + query builder) |
| **Auth** | JWT (access + refresh tokens), bcrypt |
| **Object Storage** | S3-compatible (AWS S3 or MinIO for local dev) |
| **Containerization** | Docker, Docker Compose |
| **Testing** | Vitest |
| **Linting** | ESLint, Prettier |

---

## Prerequisites

Before you begin, ensure you have the following installed:

| Tool | Version | Installation |
|---|---|---|
| **Node.js** | 18.x or 20.x LTS | [nodejs.org](https://nodejs.org/) |
| **npm** | 9.x+ (bundled with Node) | Comes with Node.js |
| **Docker** | 24.x+ | [docs.docker.com/get-docker](https://docs.docker.com/get-docker/) |
| **Docker Compose** | v2.x+ (bundled with Docker Desktop) | Included in Docker Desktop |
| **Git** | 2.x+ | [git-scm.com](https://git-scm.com/) |

### Optional (for running without Docker)

| Tool | Version | Purpose |
|---|---|---|
| **PostgreSQL** | 15.x | Database server |
| **MinIO** | Latest | S3-compatible object storage for local dev |

---

## Project Structure

```
Anti-Verse/
├── client/                          # React client application
│   ├── public/                      # Static assets
│   ├── src/
│   │   ├── components/              # Reusable UI components
│   │   │   ├── common/              # Buttons, modals, inputs, layout
│   │   │   ├── colony/              # Colony-specific components
│   │   │   ├── log/                 # Log entry components
│   │   │   └── media/               # Media gallery components
│   │   ├── pages/                   # Route-level pages
│   │   │   ├── Dashboard.tsx
│   │   │   ├── ColonyList.tsx
│   │   │   ├── ColonyDetail.tsx
│   │   │   ├── LogEntries.tsx
│   │   │   ├── MediaGallery.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   └── Settings.tsx
│   │   ├── stores/                  # Zustand state stores
│   │   │   ├── authStore.ts
│   │   │   ├── colonyStore.ts
│   │   │   ├── logStore.ts
│   │   │   └── mediaStore.ts
│   │   ├── hooks/                   # Custom React hooks
│   │   ├── utils/                   # Helpers, API client, formatters
│   │   ├── types/                   # Client-side TypeScript types
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css                # Tailwind directives
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── vite.config.ts
│   └── package.json
│
├── services/
│   ├── auth-service/                # Authentication & user management
│   │   ├── src/
│   │   │   ├── controllers/         # Route handlers
│   │   │   ├── middleware/          # Auth middleware, validation
│   │   │   ├── models/              # Knex query functions
│   │   │   ├── routes/              # Express route definitions
│   │   │   ├── utils/               # JWT helpers, password hashing
│   │   │   ├── validators/          # Request validation schemas (Zod)
│   │   │   ├── config.ts            # Environment config
│   │   │   └── app.ts               # Express app setup
│   │   ├── migrations/              # Knex migration files
│   │   ├── seeds/                   # Dev seed data
│   │   ├── tests/                   # Vitest test files
│   │   ├── knexfile.ts
│   │   └── package.json
│   │
│   ├── colony-service/              # Colony & species management
│   │   └── (same structure as auth-service)
│   │
│   ├── log-service/                 # Observation journal & env data
│   │   └── (same structure as auth-service)
│   │
│   └── media-service/               # S3 uploads & media metadata
│       └── (same structure as auth-service)
│
├── packages/
│   ├── tailwind-config/             # Shared Tailwind + DaisyUI theme preset
│   │   ├── index.js                 # Tailwind preset config
│   │   ├── themes.js                # DaisyUI custom theme definitions
│   │   └── package.json
│   ├── types/                       # Shared TypeScript types
│   │   ├── src/
│   │   │   ├── auth.ts              # User, Role, Token types
│   │   │   ├── colony.ts            # Colony, Species, Member types
│   │   │   ├── log.ts               # LogEntry, EnvironmentalReading types
│   │   │   ├── media.ts             # MediaFile, UploadRequest types
│   │   │   ├── api.ts               # ApiResponse, PaginatedResponse, ApiError
│   │   │   └── index.ts             # Barrel export
│   │   └── package.json
│   ├── database/                    # Shared DB constants
│   │   ├── src/
│   │   │   ├── tables.ts            # Table name constants
│   │   │   └── constraints.ts       # Column limits, enum values
│   │   └── package.json
│   └── api-client/                  # Internal HTTP client
│       ├── src/
│       │   ├── client.ts            # Axios-based HTTP client
│       │   ├── authClient.ts        # Auth Service API wrapper
│       │   ├── colonyClient.ts      # Colony Service API wrapper
│       │   ├── logClient.ts         # Log Service API wrapper
│       │   └── index.ts
│       └── package.json
│
├── spec/
│   └── plan/                        # Planning & architecture docs
│       ├── system-architecture.md
│       ├── api-contracts.md
│       ├── frontend-architecture.md
│       ├── service-internals.md
│       ├── deployment.md
│       ├── testing-strategy.md
│       ├── security.md
│       ├── development-workflow.md
│       └── migration-plans/
│           ├── 001-auth-service.md
│           ├── 002-colony-service.md
│           ├── 003-log-service.md
│           └── 004-media-service.md
│
├── docker-compose.yml               # Full local development stack
├── .env.example                     # Template for environment variables
├── .gitignore
├── AGENTS.md                        # AI agent coding rules
├── LICENSE
└── README.md                        # This file
```

---

## Getting Started

### 1. Clone & Install

```bash
# Clone the repository
git clone https://github.com/your-org/Anti-Verse.git
cd Anti-Verse

# Install dependencies for all workspaces
# (If using npm workspaces — otherwise install per-service)
npm install

# Or install each service individually:
cd services/auth-service && npm install && cd ../..
cd services/colony-service && npm install && cd ../..
cd services/log-service && npm install && cd ../..
cd services/media-service && npm install && cd ../..
cd client && npm install && cd ..
```

### 2. Environment Variables

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` with your local settings. See the [Environment Variable Reference](#environment-variable-reference) section below for all variables.

### 3. Start with Docker Compose

The easiest way to run the entire stack:

```bash
# Build and start all services, database, and MinIO
docker-compose up --build

# Run in detached mode (background)
docker-compose up --build -d

# View logs for a specific service
docker-compose logs -f auth-service
```

This starts:
- **PostgreSQL** on port `5432`
- **MinIO** (S3) on port `9000` (API) and `9001` (Console UI)
- **Auth Service** on port `3001`
- **Colony Service** on port `3002`
- **Log Service** on port `3003`
- **Media Service** on port `3004`
- **Client** on port `3000`

### 4. Run Database Migrations

After the services are running, execute migrations for each service:

```bash
# Run all migrations
docker-compose exec auth-service npx knex migrate:latest
docker-compose exec colony-service npx knex migrate:latest
docker-compose exec log-service npx knex migrate:latest
docker-compose exec media-service npx knex migrate:latest
```

### 5. Seed Development Data

Populate the database with sample data for local development:

```bash
docker-compose exec auth-service npx knex seed:run
docker-compose exec colony-service npx knex seed:run
docker-compose exec log-service npx knex seed:run
docker-compose exec media-service npx knex seed:run
```

This creates:
- An admin user (`admin@antiverse.local` / `admin123456`)
- 8 common ant species in the catalog
- Sample colonies and log entries (if configured)

### 6. Access the Application

| Service | URL | Description |
|---|---|---|
| **Client App** | [http://localhost:3000](http://localhost:3000) | Main web dashboard |
| **MinIO Console** | [http://localhost:9001](http://localhost:9001) | S3 object browser (login: `minioadmin` / `minioadmin`) |
| **Auth API** | [http://localhost:3001/api/auth](http://localhost:3001/api/auth) | Auth Service endpoints |
| **Colony API** | [http://localhost:3002/api/colonies](http://localhost:3002/api/colonies) | Colony Service endpoints |
| **Log API** | [http://localhost:3003/api/logs](http://localhost:3003/api/logs) | Log Service endpoints |
| **Media API** | [http://localhost:3004/api/media](http://localhost:3004/api/media) | Media Service endpoints |

---

## Running Without Docker

If you prefer to run services directly on your machine:

### 1. Install PostgreSQL

**Windows (Chocolatey):**
```bash
choco install postgresql15
```

**macOS (Homebrew):**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql-15
sudo systemctl start postgresql
```

After installing, create the database:
```sql
-- Connect to PostgreSQL
psql -U postgres

-- Create the database
CREATE DATABASE antiverse;

-- Create a dedicated user (optional but recommended)
CREATE USER antiverse_user WITH PASSWORD 'antiverse_pass';
GRANT ALL PRIVILEGES ON DATABASE antiverse TO antiverse_user;
```

### 2. Install MinIO (S3-compatible storage)

**Windows (Chocolatey):**
```bash
choco install minio
minio server C:\minio-data --console-address ":9001"
```

**macOS (Homebrew):**
```bash
brew install minio/stable/minio
minio server ~/minio-data --console-address ":9001"
```

**Docker (standalone):**
```bash
docker run -p 9000:9000 -p 9001:9001 \
  -e "MINIO_ROOT_USER=minioadmin" \
  -e "MINIO_ROOT_PASSWORD=minioadmin" \
  minio/minio server /data --console-address ":9001"
```

After MinIO is running, create the media bucket:
1. Open [http://localhost:9001](http://localhost:9001) (login: `minioadmin` / `minioadmin`)
2. Go to **Buckets** → **Create Bucket**
3. Name it `antiverse-media`
4. Set access policy to **Private**

### 3. Set Environment Variables

Update your `.env` to point at your local PostgreSQL and MinIO:

```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=antiverse
DATABASE_USER=antiverse_user
DATABASE_PASSWORD=antiverse_pass

S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=antiverse-media
S3_REGION=us-east-1
```

### 4. Run Each Service

Open a separate terminal for each:

```bash
# Terminal 1 – Auth Service
cd services/auth-service
npm run dev

# Terminal 2 – Colony Service
cd services/colony-service
npm run dev

# Terminal 3 – Log Service
cd services/log-service
npm run dev

# Terminal 4 – Media Service
cd services/media-service
npm run dev

# Terminal 5 – Client
cd client
npm run dev
```

---

## External Service Setup

### MinIO S3 Bucket Configuration

After MinIO is running, you need to create the storage bucket used by the Media Service:

**Option A: Via MinIO Console UI**
1. Open [http://localhost:9001](http://localhost:9001)
2. Login with `minioadmin` / `minioadmin`
3. Navigate to **Buckets** → **Create Bucket**
4. Name: `antiverse-media`
5. Versioning: Disabled
6. Object Locking: Disabled
7. Click **Create Bucket**

**Option B: Via MinIO Client CLI (`mc`)**
```bash
# Install mc
# Windows: choco install minio-client
# macOS: brew install minio/stable/mc

# Configure alias
mc alias set local http://localhost:9000 minioadmin minioadmin

# Create bucket
mc mb local/antiverse-media

# Verify
mc ls local/
```

### PostgreSQL Extensions

The auth service migration enables the `pgcrypto` extension for UUID generation. Ensure your PostgreSQL user has the `CREATE EXTENSION` privilege, or pre-install it:

```sql
-- As superuser
\c antiverse
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

---

## Environment Variable Reference

Create a `.env` file in the project root. All services read from this file.

| Variable | Required | Default | Description |
|---|---|---|---|
| **Database** | | | |
| `DATABASE_HOST` | Yes | `postgres` | PostgreSQL hostname |
| `DATABASE_PORT` | No | `5432` | PostgreSQL port |
| `DATABASE_NAME` | Yes | `antiverse` | Database name |
| `DATABASE_USER` | Yes | `antiverse_user` | Database username |
| `DATABASE_PASSWORD` | Yes | — | Database password |
| **JWT** | | | |
| `JWT_ACCESS_SECRET` | Yes | — | Secret key for signing access tokens (min 32 chars) |
| `JWT_REFRESH_SECRET` | Yes | — | Secret key for signing refresh tokens (min 32 chars) |
| `JWT_ACCESS_TTL` | No | `15m` | Access token time-to-live |
| `JWT_REFRESH_TTL` | No | `7d` | Refresh token time-to-live |
| **S3 / MinIO** | | | |
| `S3_ENDPOINT` | Yes | `http://minio:9000` | S3-compatible endpoint URL |
| `S3_ACCESS_KEY` | Yes | — | S3 access key |
| `S3_SECRET_KEY` | Yes | — | S3 secret key |
| `S3_BUCKET` | Yes | `antiverse-media` | S3 bucket name |
| `S3_REGION` | No | `us-east-1` | S3 region |
| `S3_FORCE_PATH_STYLE` | No | `true` | Use path-style URLs (required for MinIO) |
| **Services** | | | |
| `AUTH_SERVICE_URL` | No | `http://auth-service:3001` | Internal URL for Auth Service |
| `COLONY_SERVICE_URL` | No | `http://colony-service:3002` | Internal URL for Colony Service |
| `LOG_SERVICE_URL` | No | `http://log-service:3003` | Internal URL for Log Service |
| `MEDIA_SERVICE_URL` | No | `http://media-service:3004` | Internal URL for Media Service |
| **General** | | | |
| `NODE_ENV` | No | `development` | `development`, `test`, or `production` |
| `LOG_LEVEL` | No | `info` | `debug`, `info`, `warn`, `error` |
| `CORS_ORIGIN` | No | `http://localhost:3000` | Allowed CORS origin for the client |

---

## Useful Commands

```bash
# ────── Docker ──────
docker-compose up --build          # Start everything
docker-compose down                # Stop everything
docker-compose down -v             # Stop + delete volumes (WARNING: deletes DB data)
docker-compose logs -f auth-service  # Follow logs for a service

# ────── Database ──────
cd services/auth-service
npx knex migrate:latest            # Run pending migrations
npx knex migrate:rollback          # Undo last migration batch
npx knex migrate:status            # Check migration status
npx knex seed:run                  # Run seed files

# ────── Testing ──────
cd services/auth-service && npm run test          # Run unit tests
cd services/auth-service && npm run test:watch     # Watch mode
cd services/auth-service && npm run test:coverage  # With coverage

# ────── Linting ──────
cd client && npm run lint          # Check for lint errors
cd client && npm run lint --fix    # Auto-fix lint errors

# ────── Type Checking ──────
cd services/auth-service && npx tsc --noEmit   # Type check without building

# ────── Client ──────
cd client && npm run dev           # Start dev server (Vite)
cd client && npm run build         # Production build
cd client && npm run preview       # Preview production build
```

---

## Troubleshooting

### Docker: Port already in use

```bash
# Find what's using the port (e.g., 5432)
# Windows:
netstat -aon | findstr :5432
# macOS/Linux:
lsof -i :5432

# Kill the process or change the port in docker-compose.yml
```

### Database: "pgcrypto" extension error

If migrations fail with `extension "pgcrypto" does not exist`:
```sql
-- Connect as superuser and enable it
psql -U postgres -d antiverse
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

### MinIO: Bucket not found

If the Media Service fails with "bucket does not exist":
```bash
# Create it via mc CLI
mc alias set local http://localhost:9000 minioadmin minioadmin
mc mb local/antiverse-media
```

### Services: Cannot connect to other services

Ensure all services are on the same Docker network. Check `docker-compose.yml` for the `networks` section. If running locally (without Docker), update the `*_SERVICE_URL` environment variables to use `http://localhost:<port>`.

### Client: Tailwind classes not applying

Ensure `tailwind.config.js` has the correct `content` paths:
```js
content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}']
```
And that `index.css` includes the Tailwind directives:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

---

🐜 *Anti-Verse – Exploring the universe of ants.*

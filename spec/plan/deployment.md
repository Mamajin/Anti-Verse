# Anti-Verse – Deployment

## 1. Overview

Anti-Verse is deployed as a set of Docker containers orchestrated by Docker Compose for local development. This document provides the full `docker-compose.yml`, environment configuration, network layout, volume management, and production considerations.

---

## 2. Docker Compose (`docker-compose.yml`)

```yaml
version: "3.9"

services:
  # ══════════════════════════════════════════
  # Infrastructure
  # ══════════════════════════════════════════

  postgres:
    image: postgres:15-alpine
    container_name: antiverse-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${DATABASE_NAME:-antiverse}
      POSTGRES_USER: ${DATABASE_USER:-antiverse_user}
      POSTGRES_PASSWORD: ${DATABASE_PASSWORD:?DATABASE_PASSWORD is required}
    ports:
      - "${DATABASE_PORT:-5432}:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DATABASE_USER:-antiverse_user} -d ${DATABASE_NAME:-antiverse}"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s
    networks:
      - anti-verse-net

  minio:
    image: minio/minio:latest
    container_name: antiverse-minio
    restart: unless-stopped
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${S3_ACCESS_KEY:-minioadmin}
      MINIO_ROOT_PASSWORD: ${S3_SECRET_KEY:-minioadmin}
    ports:
      - "9000:9000"     # S3 API
      - "9001:9001"     # Web Console
    volumes:
      - minio_data:/data
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
    networks:
      - anti-verse-net

  # MinIO bucket initialization
  minio-init:
    image: minio/mc:latest
    container_name: antiverse-minio-init
    depends_on:
      minio:
        condition: service_healthy
    entrypoint: >
      /bin/sh -c "
        mc alias set local http://minio:9000 ${S3_ACCESS_KEY:-minioadmin} ${S3_SECRET_KEY:-minioadmin};
        mc mb local/${S3_BUCKET:-antiverse-media} --ignore-existing;
        echo 'Bucket ${S3_BUCKET:-antiverse-media} is ready';
        exit 0;
      "
    networks:
      - anti-verse-net

  # ══════════════════════════════════════════
  # Backend Services
  # ══════════════════════════════════════════

  auth-service:
    build:
      context: ./services/auth-service
      dockerfile: Dockerfile
    container_name: antiverse-auth
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      SERVICE_NAME: auth-service
      PORT: 3001
      NODE_ENV: ${NODE_ENV:-development}
      DATABASE_HOST: postgres
      DATABASE_PORT: 5432
      DATABASE_NAME: ${DATABASE_NAME:-antiverse}
      DATABASE_USER: ${DATABASE_USER:-antiverse_user}
      DATABASE_PASSWORD: ${DATABASE_PASSWORD:?required}
      JWT_ACCESS_SECRET: ${JWT_ACCESS_SECRET:?required}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET:?required}
      JWT_ACCESS_TTL: ${JWT_ACCESS_TTL:-15m}
      JWT_REFRESH_TTL: ${JWT_REFRESH_TTL:-7d}
      CORS_ORIGIN: ${CORS_ORIGIN:-http://localhost:3000}
      LOG_LEVEL: ${LOG_LEVEL:-info}
    ports:
      - "3001:3001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 15s
    networks:
      - anti-verse-net

  colony-service:
    build:
      context: ./services/colony-service
      dockerfile: Dockerfile
    container_name: antiverse-colony
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
      auth-service:
        condition: service_healthy
    environment:
      SERVICE_NAME: colony-service
      PORT: 3002
      NODE_ENV: ${NODE_ENV:-development}
      DATABASE_HOST: postgres
      DATABASE_PORT: 5432
      DATABASE_NAME: ${DATABASE_NAME:-antiverse}
      DATABASE_USER: ${DATABASE_USER:-antiverse_user}
      DATABASE_PASSWORD: ${DATABASE_PASSWORD:?required}
      JWT_ACCESS_SECRET: ${JWT_ACCESS_SECRET:?required}
      AUTH_SERVICE_URL: http://auth-service:3001
      CORS_ORIGIN: ${CORS_ORIGIN:-http://localhost:3000}
      LOG_LEVEL: ${LOG_LEVEL:-info}
    ports:
      - "3002:3002"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3002/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 15s
    networks:
      - anti-verse-net

  log-service:
    build:
      context: ./services/log-service
      dockerfile: Dockerfile
    container_name: antiverse-log
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
      auth-service:
        condition: service_healthy
      colony-service:
        condition: service_healthy
    environment:
      SERVICE_NAME: log-service
      PORT: 3003
      NODE_ENV: ${NODE_ENV:-development}
      DATABASE_HOST: postgres
      DATABASE_PORT: 5432
      DATABASE_NAME: ${DATABASE_NAME:-antiverse}
      DATABASE_USER: ${DATABASE_USER:-antiverse_user}
      DATABASE_PASSWORD: ${DATABASE_PASSWORD:?required}
      JWT_ACCESS_SECRET: ${JWT_ACCESS_SECRET:?required}
      AUTH_SERVICE_URL: http://auth-service:3001
      COLONY_SERVICE_URL: http://colony-service:3002
      CORS_ORIGIN: ${CORS_ORIGIN:-http://localhost:3000}
      LOG_LEVEL: ${LOG_LEVEL:-info}
    ports:
      - "3003:3003"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3003/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 15s
    networks:
      - anti-verse-net

  media-service:
    build:
      context: ./services/media-service
      dockerfile: Dockerfile
    container_name: antiverse-media
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
      auth-service:
        condition: service_healthy
      colony-service:
        condition: service_healthy
      minio-init:
        condition: service_completed_successfully
    environment:
      SERVICE_NAME: media-service
      PORT: 3004
      NODE_ENV: ${NODE_ENV:-development}
      DATABASE_HOST: postgres
      DATABASE_PORT: 5432
      DATABASE_NAME: ${DATABASE_NAME:-antiverse}
      DATABASE_USER: ${DATABASE_USER:-antiverse_user}
      DATABASE_PASSWORD: ${DATABASE_PASSWORD:?required}
      JWT_ACCESS_SECRET: ${JWT_ACCESS_SECRET:?required}
      AUTH_SERVICE_URL: http://auth-service:3001
      COLONY_SERVICE_URL: http://colony-service:3002
      LOG_SERVICE_URL: http://log-service:3003
      S3_ENDPOINT: http://minio:9000
      S3_ACCESS_KEY: ${S3_ACCESS_KEY:-minioadmin}
      S3_SECRET_KEY: ${S3_SECRET_KEY:-minioadmin}
      S3_BUCKET: ${S3_BUCKET:-antiverse-media}
      S3_REGION: ${S3_REGION:-us-east-1}
      S3_FORCE_PATH_STYLE: "true"
      CORS_ORIGIN: ${CORS_ORIGIN:-http://localhost:3000}
      LOG_LEVEL: ${LOG_LEVEL:-info}
    ports:
      - "3004:3004"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3004/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 15s
    networks:
      - anti-verse-net

  # ══════════════════════════════════════════
  # Frontend
  # ══════════════════════════════════════════

  client:
    build:
      context: ./client
      dockerfile: Dockerfile
    container_name: antiverse-client
    restart: unless-stopped
    depends_on:
      - auth-service
      - colony-service
      - log-service
      - media-service
    environment:
      VITE_AUTH_URL: http://localhost:3001/api
      VITE_COLONY_URL: http://localhost:3002/api
      VITE_LOG_URL: http://localhost:3003/api
      VITE_MEDIA_URL: http://localhost:3004/api
    ports:
      - "3000:3000"
    networks:
      - anti-verse-net

# ══════════════════════════════════════════
# Volumes & Networks
# ══════════════════════════════════════════

volumes:
  postgres_data:
    driver: local
  minio_data:
    driver: local

networks:
  anti-verse-net:
    driver: bridge
```

---

## 3. Environment File (`.env.example`)

```env
# ──────────────────────────────────────────
# Anti-Verse Environment Configuration
# Copy this file to .env and fill in values
# ──────────────────────────────────────────

# ── General ──
NODE_ENV=development
LOG_LEVEL=info

# ── Database (PostgreSQL) ──
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_NAME=antiverse
DATABASE_USER=antiverse_user
DATABASE_PASSWORD=change_me_in_production

# ── JWT Secrets ──
# Generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_ACCESS_SECRET=change_me_generate_a_64_byte_hex_string
JWT_REFRESH_SECRET=change_me_generate_a_different_64_byte_hex_string
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d

# ── S3 / MinIO ──
S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=antiverse-media
S3_REGION=us-east-1
S3_FORCE_PATH_STYLE=true

# ── CORS ──
CORS_ORIGIN=http://localhost:3000

# ── Service URLs (Docker internal) ──
AUTH_SERVICE_URL=http://auth-service:3001
COLONY_SERVICE_URL=http://colony-service:3002
LOG_SERVICE_URL=http://log-service:3003
MEDIA_SERVICE_URL=http://media-service:3004
```

---

## 4. Startup Order

The Docker Compose `depends_on` with `condition: service_healthy` ensures correct startup:

```
Step 1:  postgres + minio               (infrastructure, parallel)
Step 2:  minio-init                      (creates S3 bucket, exits)
Step 3:  auth-service                    (waits for postgres healthy)
Step 4:  colony-service                  (waits for postgres + auth healthy)
Step 5:  log-service                     (waits for postgres + auth + colony healthy)
Step 6:  media-service                   (waits for postgres + auth + colony + minio-init)
Step 7:  client                          (waits for all services)
```

This matches the **acyclic dependency graph**: Auth → Colony → Log → Media.

---

## 5. Volumes

| Volume | Container | Mount Point | Purpose |
|---|---|---|---|
| `postgres_data` | postgres | `/var/lib/postgresql/data` | Persistent database storage |
| `minio_data` | minio | `/data` | Persistent object storage |

### Resetting Data

```bash
# Stop everything and delete ALL data (database + S3)
docker-compose down -v

# Delete only database data
docker volume rm anti-verse_postgres_data

# Delete only S3/media data
docker volume rm anti-verse_minio_data
```

---

## 6. Network Topology

All containers are on a single bridge network: `anti-verse-net`.

### Internal DNS (Container Names)

| Service | Hostname | Internal URL |
|---|---|---|
| PostgreSQL | `postgres` | `postgres:5432` |
| MinIO | `minio` | `http://minio:9000` |
| Auth Service | `auth-service` | `http://auth-service:3001` |
| Colony Service | `colony-service` | `http://colony-service:3002` |
| Log Service | `log-service` | `http://log-service:3003` |
| Media Service | `media-service` | `http://media-service:3004` |
| Client | `client` | `http://client:3000` |

Services use these internal hostnames for inter-service communication. The client uses `localhost:<port>` since it runs in the user's browser.

---

## 7. Running Migrations in Docker

After `docker-compose up --build`:

```bash
# Run all migrations (in dependency order)
docker-compose exec auth-service npx knex migrate:latest
docker-compose exec colony-service npx knex migrate:latest
docker-compose exec log-service npx knex migrate:latest
docker-compose exec media-service npx knex migrate:latest

# Run all seeds
docker-compose exec auth-service npx knex seed:run
docker-compose exec colony-service npx knex seed:run

# Check migration status
docker-compose exec auth-service npx knex migrate:status

# Rollback last migration batch
docker-compose exec auth-service npx knex migrate:rollback
```

---

## 8. Client Dockerfile

```dockerfile
# client/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
```

```nginx
# client/nginx.conf
server {
    listen 3000;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location /assets {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # No cache for index.html
    location = /index.html {
        add_header Cache-Control "no-cache";
    }
}
```

---

## 9. Development vs. Production

| Aspect | Development | Production |
|---|---|---|
| **Database** | Docker PostgreSQL with local volume | Managed PostgreSQL (AWS RDS, etc.) |
| **Object Storage** | MinIO container | AWS S3 |
| **JWT Secrets** | Simple dev strings | Long random hex strings (via secrets manager) |
| **CORS** | `http://localhost:3000` | Production domain |
| **Logging** | `pino-pretty` (colorized) | JSON logs (shipped to CloudWatch/ELK) |
| **SSL** | None | TLS termination at load balancer |
| **Client** | Vite dev server (HMR) | NGINX serving static build |
| **Restart Policy** | `unless-stopped` | `always` |
| **Replicas** | 1 per service | Auto-scaling per service |
| **Health Checks** | Docker healthcheck | Load balancer health checks |
| **Secrets** | `.env` file | AWS Secrets Manager / Vault |

---

## 10. Useful Docker Commands

```bash
# ── Lifecycle ──
docker-compose up --build              # Build + start all
docker-compose up --build -d           # Build + start in background
docker-compose down                    # Stop all (keep volumes)
docker-compose down -v                 # Stop all + delete volumes
docker-compose restart auth-service    # Restart one service

# ── Logs ──
docker-compose logs -f                 # Follow all logs
docker-compose logs -f auth-service    # Follow one service
docker-compose logs --tail 100         # Last 100 lines

# ── Debugging ──
docker-compose exec auth-service sh    # Shell into container
docker-compose ps                      # List running containers
docker stats                           # Resource usage

# ── Rebuild single service ──
docker-compose build auth-service
docker-compose up -d auth-service

# ── Database access ──
docker-compose exec postgres psql -U antiverse_user -d antiverse
```

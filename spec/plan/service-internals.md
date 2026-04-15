# Anti-Verse – Service Internals

## 1. Overview

Each backend service follows an identical internal structure and conventions. This document defines the folder layout, middleware pipeline, controller pattern, model layer, validation strategy, configuration management, and the internal API client.

---

## 2. Service Folder Structure

Every service (`auth-service`, `colony-service`, `log-service`, `media-service`) follows this structure:

```
services/[service-name]/
├── src/
│   ├── controllers/          # Route handler functions
│   │   └── [resource].controller.ts
│   ├── middleware/            # Express middleware
│   │   ├── auth.middleware.ts      # JWT verification (calls Auth Service)
│   │   ├── roleGuard.middleware.ts # Role-based access check
│   │   ├── validate.middleware.ts  # Zod schema validation
│   │   ├── requestId.middleware.ts # UUID request tracing
│   │   ├── rateLimiter.middleware.ts # Per-route rate limiting
│   │   └── errorHandler.middleware.ts # Global error handler
│   ├── models/               # Database query functions (Knex)
│   │   └── [resource].model.ts
│   ├── routes/               # Express Router definitions
│   │   ├── index.ts               # Aggregates all routes
│   │   └── [resource].routes.ts
│   ├── validators/           # Zod schemas for request validation
│   │   └── [resource].validator.ts
│   ├── utils/                # Service-specific utilities
│   │   ├── errors.ts              # Custom error classes
│   │   └── logger.ts              # Pino logger instance
│   ├── config.ts             # Environment variable parsing
│   ├── db.ts                 # Knex instance
│   └── app.ts                # Express app setup + middleware registration
├── migrations/               # Knex migration files
│   └── 00X_create_[table].ts
├── seeds/                    # Development seed data
│   └── 00X_[description].ts
├── tests/                    # Vitest test files
│   ├── controllers/
│   │   └── [resource].controller.test.ts
│   ├── models/
│   │   └── [resource].model.test.ts
│   └── setup.ts              # Test setup (DB, mocks)
├── knexfile.ts               # Knex config (reads from config.ts)
├── tsconfig.json
├── package.json
├── Dockerfile
└── .env.example
```

---

## 3. Application Bootstrap (`app.ts`)

```typescript
// src/app.ts — Standard for all services
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { logger } from './utils/logger';
import { requestIdMiddleware } from './middleware/requestId.middleware';
import { errorHandler } from './middleware/errorHandler.middleware';
import { routes } from './routes';
import { db } from './db';

const app = express();

// ── Security ──
app.use(helmet());
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
}));

// ── Parsing ──
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Tracing ──
app.use(requestIdMiddleware);

// ── Request logging ──
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info({
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime: Date.now() - start,
      requestId: req.requestId,
      ip: req.ip,
    });
  });
  next();
});

// ── Health check ──
app.get('/health', async (_req, res) => {
  const dbStart = Date.now();
  try {
    await db.raw('SELECT 1');
    res.json({
      status: 'healthy',
      service: config.serviceName,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      checks: {
        database: { status: 'healthy', responseTime: Date.now() - dbStart },
      },
    });
  } catch (err) {
    res.status(503).json({
      status: 'unhealthy',
      service: config.serviceName,
      checks: {
        database: { status: 'unhealthy', error: (err as Error).message },
      },
    });
  }
});

// ── Routes ──
app.use(routes);

// ── 404 catch-all ──
app.use((_req, res) => {
  res.status(404).json({
    error: { status: 404, code: 'NOT_FOUND', message: 'Endpoint not found' },
  });
});

// ── Global error handler (must be last) ──
app.use(errorHandler);

// ── Start server ──
const server = app.listen(config.port, () => {
  logger.info({ port: config.port, env: config.nodeEnv }, `${config.serviceName} started`);
});

// ── Graceful shutdown ──
async function shutdown(signal: string) {
  logger.info({ signal }, 'Shutdown signal received');
  server.close(async () => {
    await db.destroy();
    logger.info('Database connections closed');
    process.exit(0);
  });
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export { app };
```

---

## 4. Configuration (`config.ts`)

Each service reads environment variables at startup and validates them:

```typescript
// src/config.ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3001),
  SERVICE_NAME: z.string().default('auth-service'),

  // Database
  DATABASE_HOST: z.string(),
  DATABASE_PORT: z.coerce.number().default(5432),
  DATABASE_NAME: z.string(),
  DATABASE_USER: z.string(),
  DATABASE_PASSWORD: z.string(),

  // JWT (auth-service only, but defined in base for verification)
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32).optional(),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),

  // Inter-service URLs
  AUTH_SERVICE_URL: z.string().url().default('http://auth-service:3001'),
  COLONY_SERVICE_URL: z.string().url().default('http://colony-service:3002'),
  LOG_SERVICE_URL: z.string().url().default('http://log-service:3003'),
  MEDIA_SERVICE_URL: z.string().url().default('http://media-service:3004'),

  // S3 (media-service only)
  S3_ENDPOINT: z.string().url().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().default('us-east-1'),
  S3_FORCE_PATH_STYLE: z.coerce.boolean().default(true),

  // General
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.format());
  process.exit(1);
}

export const config = {
  nodeEnv: parsed.data.NODE_ENV,
  port: parsed.data.PORT,
  serviceName: parsed.data.SERVICE_NAME,
  db: {
    host: parsed.data.DATABASE_HOST,
    port: parsed.data.DATABASE_PORT,
    name: parsed.data.DATABASE_NAME,
    user: parsed.data.DATABASE_USER,
    password: parsed.data.DATABASE_PASSWORD,
  },
  jwt: {
    accessSecret: parsed.data.JWT_ACCESS_SECRET,
    refreshSecret: parsed.data.JWT_REFRESH_SECRET,
    accessTTL: parsed.data.JWT_ACCESS_TTL,
    refreshTTL: parsed.data.JWT_REFRESH_TTL,
  },
  services: {
    auth: parsed.data.AUTH_SERVICE_URL,
    colony: parsed.data.COLONY_SERVICE_URL,
    log: parsed.data.LOG_SERVICE_URL,
    media: parsed.data.MEDIA_SERVICE_URL,
  },
  s3: {
    endpoint: parsed.data.S3_ENDPOINT,
    accessKey: parsed.data.S3_ACCESS_KEY,
    secretKey: parsed.data.S3_SECRET_KEY,
    bucket: parsed.data.S3_BUCKET,
    region: parsed.data.S3_REGION,
    forcePathStyle: parsed.data.S3_FORCE_PATH_STYLE,
  },
  logLevel: parsed.data.LOG_LEVEL,
  corsOrigin: parsed.data.CORS_ORIGIN,
} as const;
```

---

## 5. Database Layer (`db.ts`)

```typescript
// src/db.ts
import knex from 'knex';
import { config } from './config';

export const db = knex({
  client: 'pg',
  connection: {
    host: config.db.host,
    port: config.db.port,
    database: config.db.name,
    user: config.db.user,
    password: config.db.password,
  },
  pool: {
    min: 2,
    max: 10,
    acquireTimeoutMillis: 30000,
    idleTimeoutMillis: 10000,
  },
  migrations: {
    directory: '../migrations',
    tableName: `${config.serviceName.replace('-', '_')}_migrations`,
  },
  seeds: {
    directory: '../seeds',
  },
});
```

> **Note**: Each service uses a unique `tableName` for its migration tracking table (e.g., `auth_service_migrations`, `colony_service_migrations`) so they don't conflict in the shared database.

---

## 6. Controller Pattern

Controllers are thin functions that:
1. Extract validated data from `req`
2. Call model functions for DB operations
3. Call other services via `api-client` if needed
4. Return structured responses

```typescript
// src/controllers/colony.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as ColonyModel from '../models/colony.model';
import { colonyClient } from '@antiverse/api-client';
import { NotFoundError, ForbiddenError } from '../utils/errors';

export async function listColonies(req: Request, res: Response, next: NextFunction) {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const userId = req.user!.userId;

    const result = await ColonyModel.findByUser(userId, {
      page: Number(page),
      limit: Math.min(Number(limit), 100),
      status: status as string | undefined,
      search: search as string | undefined,
    });

    return res.json({
      data: result.data,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
}

export async function getColony(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const colony = await ColonyModel.findById(id);
    if (!colony) throw new NotFoundError('Colony');

    // Check access
    const member = await ColonyModel.getMember(id, userId);
    if (!member && req.user!.role !== 'admin') {
      throw new ForbiddenError('You do not have access to this colony');
    }

    return res.json({ data: colony });
  } catch (err) {
    next(err);
  }
}

export async function createColony(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const colony = await ColonyModel.create({ ...req.body, ownerId: userId });

    // Auto-add creator as owner in members table
    await ColonyModel.addMember(colony.id, userId, 'owner');

    return res.status(201).json({ data: colony });
  } catch (err) {
    next(err);
  }
}
```

---

## 7. Model Layer

Models encapsulate all Knex queries. They return plain objects, not Knex query builders.

```typescript
// src/models/colony.model.ts
import { db } from '../db';
import { Tables } from '@antiverse/database';

interface FindByUserOptions {
  page: number;
  limit: number;
  status?: string;
  search?: string;
}

export async function findByUser(userId: string, options: FindByUserOptions) {
  const { page, limit, status, search } = options;
  const offset = (page - 1) * limit;

  let query = db(Tables.COLONY_COLONIES)
    .join(Tables.COLONY_MEMBERS, `${Tables.COLONY_COLONIES}.id`, `${Tables.COLONY_MEMBERS}.colony_id`)
    .join(Tables.COLONY_SPECIES, `${Tables.COLONY_COLONIES}.species_id`, `${Tables.COLONY_SPECIES}.id`)
    .where(`${Tables.COLONY_MEMBERS}.user_id`, userId)
    .andWhere(`${Tables.COLONY_COLONIES}.is_deleted`, false)
    .select(
      `${Tables.COLONY_COLONIES}.*`,
      `${Tables.COLONY_SPECIES}.scientific_name`,
      `${Tables.COLONY_SPECIES}.common_name`,
      `${Tables.COLONY_MEMBERS}.access_role`
    );

  if (status) query = query.andWhere(`${Tables.COLONY_COLONIES}.status`, status);
  if (search) query = query.andWhereILike(`${Tables.COLONY_COLONIES}.name`, `%${search}%`);

  // Count total before pagination
  const countQuery = query.clone().clearSelect().clearOrder().count('* as total').first();
  const totalResult = await countQuery;
  const totalItems = Number(totalResult?.total ?? 0);

  // Apply pagination
  const data = await query.orderBy(`${Tables.COLONY_COLONIES}.created_at`, 'desc').offset(offset).limit(limit);

  return {
    data,
    pagination: {
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
    },
  };
}

export async function findById(id: string) {
  return db(Tables.COLONY_COLONIES)
    .join(Tables.COLONY_SPECIES, `${Tables.COLONY_COLONIES}.species_id`, `${Tables.COLONY_SPECIES}.id`)
    .where(`${Tables.COLONY_COLONIES}.id`, id)
    .andWhere(`${Tables.COLONY_COLONIES}.is_deleted`, false)
    .select(
      `${Tables.COLONY_COLONIES}.*`,
      `${Tables.COLONY_SPECIES}.scientific_name`,
      `${Tables.COLONY_SPECIES}.common_name`,
      `${Tables.COLONY_SPECIES}.subfamily`
    )
    .first();
}

export async function create(data: Omit<Colony, 'id' | 'createdAt' | 'updatedAt'>) {
  const [colony] = await db(Tables.COLONY_COLONIES).insert(data).returning('*');
  return colony;
}
```

---

## 8. Validation Layer (Zod)

Request validation schemas are defined per resource and applied via middleware:

```typescript
// src/validators/colony.validator.ts
import { z } from 'zod';

export const createColonySchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    speciesId: z.string().uuid(),
    description: z.string().max(2000).optional(),
    foundingDate: z.string().datetime().optional(),
    queenCount: z.number().int().min(0),
    estimatedWorkerCount: z.number().int().min(0).optional(),
  }),
});

export const updateColonySchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(2000).optional(),
    status: z.enum(['active', 'inactive', 'deceased']).optional(),
    queenCount: z.number().int().min(0).optional(),
    estimatedWorkerCount: z.number().int().min(0).optional(),
  }),
});

export const listColoniesSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(['active', 'inactive', 'deceased']).optional(),
    search: z.string().max(100).optional(),
  }),
});
```

### Validation Middleware

```typescript
// src/middleware/validate.middleware.ts
import { z, ZodSchema } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../utils/errors';

export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      throw new ValidationError(details);
    }

    // Replace req properties with parsed (and coerced) values
    req.body = result.data.body ?? req.body;
    req.params = result.data.params ?? req.params;
    req.query = result.data.query ?? req.query;

    next();
  };
}
```

### Usage in Routes

```typescript
// src/routes/colony.routes.ts
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createColonySchema, listColoniesSchema } from '../validators/colony.validator';
import * as ColonyController from '../controllers/colony.controller';

const router = Router();

router.get('/', authMiddleware, validate(listColoniesSchema), ColonyController.listColonies);
router.post('/', authMiddleware, validate(createColonySchema), ColonyController.createColony);
router.get('/:id', authMiddleware, ColonyController.getColony);

export { router as colonyRoutes };
```

---

## 9. Auth Middleware

For **non-auth services**, the auth middleware calls the Auth Service to verify tokens:

```typescript
// src/middleware/auth.middleware.ts (colony, log, media services)
import { Request, Response, NextFunction } from 'express';
import { authClient } from '@antiverse/api-client';
import { UnauthorizedError } from '../utils/errors';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: { userId: string; role: string };
      requestId?: string;
    }
  }
}

export async function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or malformed Authorization header');
    }

    const result = await authClient.verify(authHeader);
    req.user = { userId: result.userId, role: result.role };
    next();
  } catch (err) {
    next(new UnauthorizedError('Invalid or expired token'));
  }
}
```

For the **auth service itself**, the middleware verifies JWTs locally (it has the secret):

```typescript
// src/middleware/auth.middleware.ts (auth-service)
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { UnauthorizedError } from '../utils/errors';

export function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError();
  }

  try {
    const token = authHeader.split(' ')[1];
    const payload = jwt.verify(token, config.jwt.accessSecret) as { sub: string; role: string };
    req.user = { userId: payload.sub, role: payload.role };
    next();
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }
}
```

---

## 10. Role Guard Middleware

```typescript
// src/middleware/roleGuard.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../utils/errors';

export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw new ForbiddenError();
    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError(`Required role: ${roles.join(' or ')}`);
    }
    next();
  };
}

// Usage:
// router.get('/admin/users', authMiddleware, requireRole('admin'), AdminController.listUsers);
// router.get('/export', authMiddleware, requireRole('researcher', 'admin'), LogController.export);
```

---

## 11. Rate Limiter

```typescript
// src/middleware/rateLimiter.middleware.ts
import rateLimit from 'express-rate-limit';

// Default: 100 requests per 15 minutes per IP
export const defaultLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: { status: 429, code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests' },
  },
});

// Strict: 10 requests per 15 minutes (login, register)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: { status: 429, code: 'RATE_LIMIT_EXCEEDED', message: 'Too many authentication attempts' },
  },
});

// Upload: 30 uploads per hour
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: { status: 429, code: 'RATE_LIMIT_EXCEEDED', message: 'Upload limit reached' },
  },
});
```

---

## 12. Error Classes

```typescript
// src/utils/errors.ts — shared across all services

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details: { field: string; message: string }[] = []
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(details: { field: string; message: string }[]) {
    super(400, 'VALIDATION_ERROR', 'Request validation failed', details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(403, 'FORBIDDEN', message);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(404, 'NOT_FOUND', `${resource} not found`);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, 'CONFLICT', message);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(service: string) {
    super(502, 'SERVICE_UNAVAILABLE', `${service} is currently unavailable`);
  }
}
```

---

## 13. Logger

```typescript
// src/utils/logger.ts
import pino from 'pino';
import { config } from '../config';

export const logger = pino({
  level: config.logLevel,
  transport:
    config.nodeEnv === 'development'
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } }
      : undefined,
  base: {
    service: config.serviceName,
    env: config.nodeEnv,
  },
  redact: {
    paths: ['req.headers.authorization', 'password', 'passwordHash', 'refreshToken'],
    censor: '[REDACTED]',
  },
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
});
```

---

## 14. Knex Configuration (`knexfile.ts`)

```typescript
// knexfile.ts
import { config } from './src/config';

export default {
  development: {
    client: 'pg',
    connection: {
      host: config.db.host,
      port: config.db.port,
      database: config.db.name,
      user: config.db.user,
      password: config.db.password,
    },
    migrations: {
      directory: './migrations',
      extension: 'ts',
      tableName: `${config.serviceName.replace(/-/g, '_')}_migrations`,
    },
    seeds: {
      directory: './seeds',
      extension: 'ts',
    },
    pool: { min: 2, max: 10 },
  },

  test: {
    client: 'pg',
    connection: {
      host: 'localhost',
      port: 5432,
      database: 'antiverse_test',
      user: 'antiverse_user',
      password: 'antiverse_pass',
    },
    migrations: {
      directory: './migrations',
      extension: 'ts',
      tableName: `${config.serviceName.replace(/-/g, '_')}_migrations`,
    },
    pool: { min: 1, max: 5 },
  },

  production: {
    client: 'pg',
    connection: {
      host: config.db.host,
      port: config.db.port,
      database: config.db.name,
      user: config.db.user,
      password: config.db.password,
      ssl: { rejectUnauthorized: false },
    },
    migrations: {
      directory: './migrations',
      extension: 'ts',
      tableName: `${config.serviceName.replace(/-/g, '_')}_migrations`,
    },
    pool: { min: 2, max: 20 },
  },
};
```

---

## 15. Dockerfile (Standard for all services)

```dockerfile
# Multi-stage build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/seeds ./seeds
COPY --from=builder /app/knexfile.js ./

USER appuser
EXPOSE 3001
CMD ["node", "dist/app.js"]
```

> **Note**: Each service's Dockerfile changes only the `EXPOSE` port and `SERVICE_NAME` env var. The build process is identical.

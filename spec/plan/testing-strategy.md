# Anti-Verse – Testing Strategy

## 1. Overview

Every service and the client app are tested using **Vitest**. The strategy focuses on fast, deterministic unit tests with optional integration tests for critical paths. No end-to-end browser tests in the initial phase.

---

## 2. Testing Stack

| Tool | Version | Purpose |
|---|---|---|
| **Vitest** | 1.x | Test runner and assertion library |
| **supertest** | 6.x | HTTP assertions for Express apps |
| **@testing-library/react** | 14.x | React component testing |
| **@testing-library/jest-dom** | 6.x | DOM assertions |
| **msw** | 2.x | Mock Service Worker for API mocking (frontend) |
| **vitest-mock-extended** | 1.x | Deep mock utilities |

---

## 3. Test Types

### 3.1 Unit Tests

Test individual functions in isolation: controllers, models (with mocked DB), validators, utilities.

**Scope**: Every service
**Mocking**: Database (Knex), inter-service API calls, external services (S3)
**Speed**: < 1 second per test file

### 3.2 Integration Tests

Test a full request through the Express middleware pipeline with a real (test) database.

**Scope**: Critical paths only (login, colony creation, log entry CRUD)
**Database**: Separate test database (`antiverse_test`), migrated before tests, truncated between tests
**Speed**: < 5 seconds per test file

### 3.3 Component Tests (Frontend)

Test React components in isolation with mocked stores and API.

**Scope**: All components with logic (forms, conditional rendering, event handlers)
**Mocking**: Zustand stores, API calls via MSW
**Speed**: < 2 seconds per test file

---

## 4. Test File Conventions

### Backend Services

```
services/[service-name]/
├── tests/
│   ├── setup.ts                          # Global test setup
│   ├── helpers/
│   │   ├── db.ts                         # Test database helpers
│   │   └── fixtures.ts                   # Test data factories
│   ├── unit/
│   │   ├── controllers/
│   │   │   └── [resource].controller.test.ts
│   │   ├── models/
│   │   │   └── [resource].model.test.ts
│   │   ├── middleware/
│   │   │   └── [middleware].test.ts
│   │   ├── validators/
│   │   │   └── [resource].validator.test.ts
│   │   └── utils/
│   │       └── [utility].test.ts
│   └── integration/
│       └── [resource].integration.test.ts
```

### Frontend

```
client/src/
├── components/
│   ├── colony/
│   │   ├── ColonyCard.tsx
│   │   └── ColonyCard.test.tsx          # Co-located with component
│   └── ...
├── stores/
│   ├── authStore.ts
│   └── authStore.test.ts               # Co-located with store
└── utils/
    ├── formatters.ts
    └── formatters.test.ts              # Co-located with utility
```

### Naming Convention

- Unit tests: `[filename].test.ts`
- Integration tests: `[resource].integration.test.ts`
- Test files are co-located with source files (frontend) or in `tests/` directory (backend)

---

## 5. Test Configuration

### Vitest Config (Backend)

```typescript
// services/[service-name]/vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/config.ts', 'src/app.ts', 'src/db.ts'],
      thresholds: {
        branches: 70,
        functions: 70,
        lines: 70,
        statements: 70,
      },
    },
    testTimeout: 10000,
  },
});
```

### Vitest Config (Frontend)

```typescript
// client/vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/types/**'],
    },
  },
});
```

---

## 6. Test Setup

### Backend Setup

```typescript
// tests/setup.ts
import { beforeAll, afterAll, afterEach } from 'vitest';
import { db } from '../src/db';

beforeAll(async () => {
  // Run migrations on test DB
  await db.migrate.latest();
});

afterEach(async () => {
  // Truncate all tables between tests
  const tables = await db.raw(`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename LIKE 'auth_%'
  `);
  for (const { tablename } of tables.rows) {
    await db.raw(`TRUNCATE TABLE "${tablename}" CASCADE`);
  }
});

afterAll(async () => {
  await db.destroy();
});
```

### Frontend Setup

```typescript
// client/src/test-setup.ts
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
```

---

## 7. Test Data Factories

```typescript
// tests/helpers/fixtures.ts
import { v4 as uuid } from 'uuid';

export function createUser(overrides?: Partial<User>): User {
  return {
    id: uuid(),
    email: `user-${uuid().slice(0, 8)}@test.local`,
    displayName: 'Test User',
    role: 'keeper',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createColony(overrides?: Partial<Colony>): Colony {
  return {
    id: uuid(),
    ownerId: uuid(),
    speciesId: uuid(),
    name: `Colony ${uuid().slice(0, 6)}`,
    description: 'A test colony',
    status: 'active',
    foundingDate: '2026-01-01',
    queenCount: 1,
    estimatedWorkerCount: 50,
    isDeleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createLogEntry(overrides?: Partial<LogEntry>): LogEntry {
  return {
    id: uuid(),
    colonyId: uuid(),
    userId: uuid(),
    entryType: 'observation',
    title: 'Test observation',
    content: 'Observed normal activity.',
    occurredAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}
```

---

## 8. Mocking Patterns

### 8.1 Mocking the Database (Unit Tests)

```typescript
// tests/unit/models/colony.model.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '../../src/db';
import * as ColonyModel from '../../src/models/colony.model';
import { createColony } from '../helpers/fixtures';

vi.mock('../../src/db');

describe('ColonyModel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findById', () => {
    it('returns a colony when found', async () => {
      const mockColony = createColony();

      // Mock the Knex query chain
      const mockFirst = vi.fn().mockResolvedValue(mockColony);
      const mockSelect = vi.fn().mockReturnValue({ first: mockFirst });
      const mockAndWhere = vi.fn().mockReturnValue({ select: mockSelect });
      const mockWhere = vi.fn().mockReturnValue({ andWhere: mockAndWhere });
      const mockJoin = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db).mockReturnValue({ join: mockJoin } as any);

      const result = await ColonyModel.findById(mockColony.id);
      expect(result).toEqual(mockColony);
    });

    it('returns undefined when not found', async () => {
      const mockFirst = vi.fn().mockResolvedValue(undefined);
      const mockSelect = vi.fn().mockReturnValue({ first: mockFirst });
      const mockAndWhere = vi.fn().mockReturnValue({ select: mockSelect });
      const mockWhere = vi.fn().mockReturnValue({ andWhere: mockAndWhere });
      const mockJoin = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db).mockReturnValue({ join: mockJoin } as any);

      const result = await ColonyModel.findById('nonexistent');
      expect(result).toBeUndefined();
    });
  });
});
```

### 8.2 Mocking Inter-Service Calls (Unit Tests)

```typescript
// tests/unit/controllers/log.controller.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authClient, colonyClient } from '@antiverse/api-client';

vi.mock('@antiverse/api-client');

describe('LogController', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: auth succeeds
    vi.mocked(authClient.verify).mockResolvedValue({
      userId: 'user-123',
      role: 'keeper',
    });

    // Default: colony access is owner
    vi.mocked(colonyClient.verifyAccess).mockResolvedValue({
      colonyId: 'colony-123',
      userId: 'user-123',
      accessRole: 'owner',
    });
  });

  it('returns 403 when user is a viewer', async () => {
    vi.mocked(colonyClient.verifyAccess).mockResolvedValue({
      colonyId: 'colony-123',
      userId: 'user-123',
      accessRole: 'viewer',
    });

    // ... test creating a log entry returns 403
  });
});
```

### 8.3 Mocking API in Frontend (MSW)

```typescript
// client/src/mocks/handlers.ts
import { http, HttpResponse } from 'msw';
import { createUser, createColony } from './fixtures';

export const handlers = [
  http.post('*/auth/login', () => {
    return HttpResponse.json({
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      user: createUser(),
    });
  }),

  http.get('*/colonies', () => {
    return HttpResponse.json({
      data: [createColony(), createColony(), createColony()],
      pagination: { page: 1, limit: 20, totalItems: 3, totalPages: 1 },
    });
  }),
];
```

### 8.4 Integration Tests with supertest

```typescript
// tests/integration/auth.integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';
import { db } from '../../src/db';

describe('Auth API Integration', () => {
  const testUser = {
    email: 'integration@test.local',
    password: 'TestPass123!',
    displayName: 'Integration Test',
    role: 'keeper',
  };

  beforeAll(async () => {
    await db.migrate.latest();
  });

  afterAll(async () => {
    await db.destroy();
  });

  describe('POST /api/auth/register', () => {
    it('creates user and returns 201', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.email).toBe(testUser.email);
      expect(res.body.role).toBe('keeper');
      expect(res.body).not.toHaveProperty('password');
      expect(res.body).not.toHaveProperty('passwordHash');
    });

    it('returns 409 for duplicate email', async () => {
      await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(409);
    });
  });

  describe('POST /api/auth/login', () => {
    it('returns tokens on valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.user.email).toBe(testUser.email);
    });

    it('returns 401 on wrong password', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: 'wrongpassword' })
        .expect(401);
    });
  });
});
```

---

## 9. Coverage Targets

| Metric | Target | Rationale |
|---|---|---|
| Line Coverage | ≥ 70% | Catch regressions without over-testing |
| Branch Coverage | ≥ 70% | Ensure error paths are tested |
| Function Coverage | ≥ 70% | All public functions should be tested |
| Critical Paths | 100% | Auth login, token refresh, colony CRUD, log creation |

### Measuring Coverage

```bash
# Per-service coverage
cd services/auth-service
npm run test:coverage

# Output: text summary + HTML report in coverage/
```

---

## 10. npm Scripts

Each service's `package.json`:

```json
{
  "scripts": {
    "dev": "tsx watch src/app.ts",
    "build": "tsc",
    "start": "node dist/app.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint src/ tests/",
    "lint:fix": "eslint src/ tests/ --fix",
    "typecheck": "tsc --noEmit"
  }
}
```

Client `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint src/",
    "lint:fix": "eslint src/ --fix"
  }
}
```

---

## 11. CI Integration

Tests should run in CI for every PR:

```yaml
# .github/workflows/test.yml (example)
name: Test

on:
  pull_request:
    branches: [main]

jobs:
  test-service:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: [auth-service, colony-service, log-service, media-service]
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_DB: antiverse_test
          POSTGRES_USER: antiverse_user
          POSTGRES_PASSWORD: test_password
        ports: ["5432:5432"]
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: cd services/${{ matrix.service }} && npm ci
      - run: cd services/${{ matrix.service }} && npm run typecheck
      - run: cd services/${{ matrix.service }} && npm run lint
      - run: cd services/${{ matrix.service }} && npm run test:coverage

  test-client:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: cd client && npm ci
      - run: cd client && npm run lint
      - run: cd client && npm run test:coverage
      - run: cd client && npm run build
```

# Anti-Verse – Development Workflow

## 1. Overview

This document defines the development workflow for Anti-Verse: Git strategy, PR process, code review, local development setup, debugging tips, and coding conventions.

---

## 2. Git Branching Strategy

### Branch Types

```
main                    # Production-ready code. Always deployable.
├── develop             # Integration branch. PRs merge here first.
│   ├── feature/xxx     # New features
│   ├── fix/xxx         # Bug fixes
│   ├── refactor/xxx    # Code refactoring (no behavior change)
│   └── docs/xxx        # Documentation changes
```

### Branch Naming Convention

```
{type}/{service}-{short-description}

Examples:
  feature/auth-refresh-token-rotation
  fix/colony-member-duplicate-check
  refactor/log-model-pagination
  docs/api-contracts-media-upload
```

### Rules

1. **Never push directly to `main` or `develop`**. All changes go through PRs.
2. **One service per branch**. Don't mix changes across services unless it's a shared API contract update.
3. **Keep branches short-lived**. Aim for < 3 days. Break large features into smaller PRs.
4. **Rebase on `develop`** before creating a PR to keep history clean.

---

## 3. PR Process

### Creating a PR

1. Create a feature branch from `develop`
2. Make your changes
3. Run local checks:
   ```bash
   cd services/[service] && npm run typecheck
   cd services/[service] && npm run lint
   cd services/[service] && npm run test
   ```
4. Push and create a PR to `develop`
5. Fill in the PR template (see below)
6. Request review

### PR Template

```markdown
## Summary
Brief description of what this PR does.

## Service(s) Modified
- [ ] auth-service
- [ ] colony-service
- [ ] log-service
- [ ] media-service
- [ ] client
- [ ] packages/*

## Type of Change
- [ ] Feature
- [ ] Bug fix
- [ ] Refactor
- [ ] Documentation

## Checklist
- [ ] Service boundaries respected (no cross-service imports)
- [ ] UI uses only Tailwind classes + DaisyUI (no inline styles, no hardcoded colors)
- [ ] Zero AI/ML logic
- [ ] Unit tests added/updated
- [ ] Type checking passes (`npm run typecheck`)
- [ ] Linting passes (`npm run lint`)
- [ ] All tests pass (`npm run test`)

## Screenshots (if UI changes)
Before | After
```

### PR Size Guidelines

| Size | Lines Changed | Ideal? |
|---|---|---|
| 🟢 Small | < 100 | ✅ Preferred |
| 🟡 Medium | 100 – 300 | ✅ Acceptable |
| 🟠 Large | 300 – 500 | ⚠️ Consider splitting |
| 🔴 Very Large | 500+ | ❌ Must split (except initial scaffolding) |

---

## 4. Code Review Checklist

### Reviewer Checklist

**Architecture**
- [ ] Does the code respect service boundaries?
- [ ] Are inter-service calls going through `packages/api-client`?
- [ ] Is the dependency direction correct (no upward or circular calls)?

**Code Quality**
- [ ] Are functions focused and under ~50 lines?
- [ ] Are variable names descriptive?
- [ ] Is there duplicated code that should be extracted?
- [ ] Are error cases handled (not just happy paths)?

**Security**
- [ ] No secrets, passwords, or tokens in code or logs
- [ ] User inputs validated with Zod before processing
- [ ] Database queries use parameterized values
- [ ] Auth middleware applied to protected routes
- [ ] Role guards applied where needed

**Testing**
- [ ] Unit tests cover new/changed logic
- [ ] Edge cases tested (empty input, not found, unauthorized)
- [ ] Mocks are realistic and don't mask bugs

**Frontend** (if applicable)
- [ ] Components use only Tailwind + DaisyUI classes
- [ ] No hardcoded color values
- [ ] Responsive design considered (mobile → desktop)
- [ ] Loading and error states handled
- [ ] Accessibility: labels, aria attributes, keyboard navigation

---

## 5. Local Development Setup

### First-Time Setup

```bash
# 1. Clone
git clone https://github.com/your-org/Anti-Verse.git
cd Anti-Verse

# 2. Copy environment file
cp .env.example .env
# Edit .env with your settings (especially DATABASE_PASSWORD, JWT secrets)

# 3. Start infrastructure (Postgres + MinIO)
docker-compose up -d postgres minio minio-init

# 4. Install dependencies
cd services/auth-service && npm install && cd ../..
cd services/colony-service && npm install && cd ../..
cd services/log-service && npm install && cd ../..
cd services/media-service && npm install && cd ../..
cd client && npm install && cd ..
cd packages/types && npm install && cd ../..
cd packages/database && npm install && cd ../..
cd packages/api-client && npm install && cd ../..
cd packages/tailwind-config && npm install && cd ../..

# 5. Run migrations
cd services/auth-service && npx knex migrate:latest && cd ../..
cd services/colony-service && npx knex migrate:latest && cd ../..
cd services/log-service && npx knex migrate:latest && cd ../..
cd services/media-service && npx knex migrate:latest && cd ../..

# 6. Seed development data
cd services/auth-service && npx knex seed:run && cd ../..
cd services/colony-service && npx knex seed:run && cd ../..

# 7. Start services (each in a separate terminal)
cd services/auth-service && npm run dev
cd services/colony-service && npm run dev
cd services/log-service && npm run dev
cd services/media-service && npm run dev
cd client && npm run dev
```

### Daily Workflow

```bash
# Pull latest develop
git checkout develop && git pull

# Create feature branch
git checkout -b feature/colony-add-species-filter

# Start infrastructure if not running
docker-compose up -d postgres minio

# Start the services you need (usually just one + auth)
cd services/auth-service && npm run dev    # Terminal 1
cd services/colony-service && npm run dev  # Terminal 2
cd client && npm run dev                   # Terminal 3

# ... make changes, run tests frequently ...
cd services/colony-service && npm run test:watch
```

---

## 6. Debugging Tips

### Backend

**1. Check service logs**
```bash
# Docker logs
docker-compose logs -f colony-service

# Local dev: pino-pretty auto-formats in development mode
cd services/colony-service && npm run dev
# Logs show colored, human-readable output
```

**2. Database queries**
```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U antiverse_user -d antiverse

# Useful queries:
\dt                                    -- List all tables
SELECT * FROM colony_colonies LIMIT 5; -- Inspect data
\d colony_colonies                     -- Show table schema
```

**3. Inter-service communication issues**
```bash
# Test if a service is reachable
curl http://localhost:3001/health
curl http://localhost:3002/health

# Test auth verification
curl -H "Authorization: Bearer <token>" http://localhost:3001/api/auth/verify
```

**4. Knex debugging**
```typescript
// Add .toSQL() to see the generated query without executing it
const query = db('colony_colonies').where('status', 'active').toSQL();
console.log(query);
```

### Frontend

**1. Zustand DevTools**
```typescript
// In development, Zustand stores can be inspected via React DevTools
// Or use the devtools middleware:
import { devtools } from 'zustand/middleware';

const useAuthStore = create<AuthState>()(
  devtools(
    (set, get) => ({ ... }),
    { name: 'auth-store' }
  )
);
```

**2. Network requests**
- Use browser DevTools → Network tab to inspect API calls
- Check request headers (Authorization present?)
- Check response status codes and bodies

**3. Tailwind class debugging**
- Use browser DevTools → Elements tab → search for the element
- Check computed styles to verify Tailwind classes are applying
- Use `border border-red-500` temporarily to debug layout issues

---

## 7. Coding Conventions

### TypeScript

```typescript
// ✅ Use interfaces for object shapes
interface Colony {
  id: string;
  name: string;
  status: ColonyStatus;
}

// ✅ Use enums for finite value sets (from packages/types)
enum ColonyStatus {
  Active = 'active',
  Inactive = 'inactive',
  Deceased = 'deceased',
}

// ✅ Use explicit return types on public functions
export async function findById(id: string): Promise<Colony | undefined> { ... }

// ❌ Don't use `any`
function processData(data: any) { ... }

// ✅ Use `unknown` and narrow
function processData(data: unknown) {
  if (isColony(data)) { ... }
}
```

### Naming Conventions

| Item | Convention | Example |
|---|---|---|
| Files | camelCase | `colonyController.ts` |
| Components | PascalCase | `ColonyCard.tsx` |
| Functions | camelCase | `findByUser()` |
| Constants | UPPER_SNAKE_CASE | `MAX_IMAGE_SIZE_BYTES` |
| Types/Interfaces | PascalCase | `ColonyMember` |
| Enums | PascalCase (members too) | `ColonyStatus.Active` |
| Database columns | snake_case | `created_at` |
| API JSON fields | camelCase | `{ "createdAt": "..." }` |
| CSS classes | Tailwind utilities | `bg-primary text-lg` |
| Environment variables | UPPER_SNAKE_CASE | `DATABASE_HOST` |

### File Organization

```typescript
// Standard import order:
// 1. Node.js built-ins
import path from 'path';

// 2. External libraries
import express from 'express';
import { z } from 'zod';

// 3. Internal packages
import { Tables } from '@antiverse/database';
import { Colony } from '@antiverse/types';

// 4. Local imports
import { db } from '../db';
import { config } from '../config';
import { NotFoundError } from '../utils/errors';
```

### Error Handling

```typescript
// ✅ Always use try/catch in controllers and pass errors to next()
export async function createColony(req: Request, res: Response, next: NextFunction) {
  try {
    // ... business logic
    res.status(201).json({ data: colony });
  } catch (err) {
    next(err); // Global error handler formats the response
  }
}

// ✅ Throw custom errors for known error cases
if (!colony) throw new NotFoundError('Colony');
if (member.accessRole === 'viewer') throw new ForbiddenError('Viewers cannot edit');

// ❌ Don't catch and swallow errors
try {
  await db.insert(data);
} catch {
  // Never empty catch blocks
}
```

---

## 8. Commit Message Convention

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
{type}({scope}): {description}

Types: feat, fix, refactor, docs, test, chore
Scope: auth, colony, log, media, client, packages, infra

Examples:
  feat(colony): add species search with trigram index
  fix(auth): handle expired refresh token gracefully
  test(log): add unit tests for environmental chart endpoint
  docs(api): update media upload contract with size limits
  chore(infra): add health check to docker-compose
  refactor(client): extract ColonyCard into separate component
```

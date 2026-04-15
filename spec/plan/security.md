# Anti-Verse – Security

## 1. Overview

This document details the security measures implemented across all Anti-Verse services: authentication, authorization, data protection, input validation, and infrastructure hardening.

---

## 2. Authentication

### 2.1 Password Policy

| Rule | Requirement |
|---|---|
| Minimum length | 8 characters |
| Maximum length | 128 characters |
| Hashing algorithm | bcrypt |
| Salt rounds | 12 (adjustable via config, minimum 10) |
| Storage | Only the bcrypt hash is stored; plaintext is never persisted or logged |

### 2.2 Password Hashing

```typescript
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
```

### 2.3 JWT Configuration

| Parameter | Value | Notes |
|---|---|---|
| Access token algorithm | HS256 | HMAC SHA-256 |
| Access token TTL | 15 minutes | Short-lived to limit exposure |
| Access token claims | `sub` (userId), `role`, `iat`, `exp` | Minimal claims |
| Refresh token format | Opaque (64-byte random hex) | Not a JWT |
| Refresh token TTL | 7 days | Stored as SHA-256 hash in DB |
| Refresh token rotation | On every refresh | One-time use; old token invalidated |

### 2.4 JWT Secret Management

| Environment | Approach |
|---|---|
| Development | Strings in `.env` file (not committed to git) |
| Production | Environment variables injected from secrets manager (AWS Secrets Manager, HashiCorp Vault, etc.) |

**Generating secrets:**
```bash
# Generate a secure 64-byte hex secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 2.5 Refresh Token Security

1. **Stored as hash**: The database stores `SHA-256(token)`, not the raw token
2. **Single-use**: Each refresh rotates the token; the old hash is deleted
3. **Expiration**: Tokens expire after 7 days
4. **Revocation**: Logout deletes the token record; admin can revoke all tokens for a user
5. **Cleanup**: A scheduled job deletes expired tokens from `auth_refresh_tokens`

```typescript
import crypto from 'crypto';

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString('hex');
}
```

---

## 3. Authorization (RBAC)

### 3.1 System Roles

| Role | Level | Description |
|---|---|---|
| `keeper` | Basic | Can manage own colonies, create logs, upload media |
| `researcher` | Extended | All keeper permissions + view all colonies + data export |
| `admin` | Full | All permissions + user management + delete any resource |

### 3.2 Colony Access Roles

| Role | Granted By | Permissions |
|---|---|---|
| `owner` | System (on colony creation) | Full control: edit, delete, manage members |
| `collaborator` | Colony owner | Read + write: create logs, upload media, edit colony details |
| `viewer` | Colony owner | Read only: view colony, logs, media |

### 3.3 Enforcement Layers

1. **Middleware**: `authMiddleware` verifies JWT and attaches `req.user` with `userId` and `role`
2. **Route-level**: `requireRole('admin')` middleware blocks unauthorized roles
3. **Controller-level**: Colony access is checked by querying `colony_members` or calling Colony Service's verify endpoint
4. **Model-level**: Queries are always scoped by `userId` or colony membership

---

## 4. Input Validation & Sanitization

### 4.1 Validation Strategy

All incoming data is validated using **Zod schemas** at the request boundary (via middleware). Invalid requests are rejected with `400 VALIDATION_ERROR` before reaching any business logic.

### 4.2 What Gets Validated

| Input | Validation |
|---|---|
| **Request body** | Type checking, length limits, enum values, format (email, UUID, ISO datetime) |
| **URL params** | UUID format for IDs |
| **Query params** | Numeric ranges, allowed enum values, max string length |
| **File uploads** | MIME type whitelist, size limits, filename sanitization |

### 4.3 Sanitization Rules

| Rule | Implementation |
|---|---|
| HTML stripping | Not needed (API returns JSON, client renders with React which escapes by default) |
| SQL injection | Prevented by using Knex.js parameterized queries (never raw string interpolation) |
| Path traversal | S3 keys are generated server-side (UUID-based), never from user input |
| Unicode normalization | Email addresses are lowercased and trimmed before storage |

---

## 5. SQL Injection Prevention

Anti-Verse uses **Knex.js** for all database queries, which parameterizes all values:

```typescript
// ✅ SAFE — Knex parameterizes the value
const user = await db('auth_users').where('email', email).first();

// ✅ SAFE — Knex parameterizes these too
const colonies = await db('colony_colonies')
  .whereILike('name', `%${search}%`)
  .andWhere('status', status);

// ❌ NEVER DO THIS — raw string interpolation
const user = await db.raw(`SELECT * FROM auth_users WHERE email = '${email}'`);
```

### Rules

- **Never** use `db.raw()` with string interpolation
- If `db.raw()` is necessary, use parameterized bindings: `db.raw('SELECT * FROM ?? WHERE ?? = ?', [table, column, value])`
- All queries go through model functions; controllers never write SQL directly

---

## 6. Rate Limiting

### 6.1 Configuration

| Endpoint Category | Window | Max Requests | Per |
|---|---|---|---|
| Authentication (`/auth/login`, `/auth/register`) | 15 minutes | 10 | IP address |
| General API endpoints | 15 minutes | 100 | IP address |
| File uploads (`/media/upload`) | 1 hour | 30 | IP address |

### 6.2 Implementation

Rate limiting uses `express-rate-limit` middleware. See `service-internals.md` for the implementation.

### 6.3 Response on Rate Limit

```json
{
  "error": {
    "status": 429,
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests, please try again later"
  }
}
```

Headers included:
- `RateLimit-Limit`: Max requests in window
- `RateLimit-Remaining`: Remaining requests
- `RateLimit-Reset`: Seconds until window resets

---

## 7. CORS Configuration

### 7.1 Settings

```typescript
app.use(cors({
  origin: config.corsOrigin,           // e.g., 'http://localhost:3000'
  credentials: true,                    // Allow cookies / auth headers
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID', 'RateLimit-Limit', 'RateLimit-Remaining'],
  maxAge: 86400,                       // Pre-flight cache: 24 hours
}));
```

### 7.2 Environment-Specific Origins

| Environment | `CORS_ORIGIN` |
|---|---|
| Development | `http://localhost:3000` |
| Staging | `https://staging.antiverse.app` |
| Production | `https://antiverse.app` |

---

## 8. Security Headers

All services use **Helmet.js** which sets the following headers:

| Header | Value | Purpose |
|---|---|---|
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing |
| `X-Frame-Options` | `DENY` | Prevent clickjacking |
| `X-XSS-Protection` | `0` | Disable legacy XSS filter (CSP is better) |
| `Strict-Transport-Security` | `max-age=15552000` | Enforce HTTPS (production) |
| `Content-Security-Policy` | `default-src 'self'` | Restrict resource loading |
| `Referrer-Policy` | `no-referrer` | Don't leak referrer info |

---

## 9. File Upload Security

### 9.1 Allowed File Types

| Category | MIME Types |
|---|---|
| Image | `image/jpeg`, `image/png`, `image/webp`, `image/gif` |
| Video | `video/mp4`, `video/webm` |

All other MIME types are rejected with `400 VALIDATION_ERROR`.

### 9.2 Size Limits

| Type | Max Size |
|---|---|
| Image | 50 MB |
| Video | 500 MB |

### 9.3 Upload Security Measures

| Measure | Implementation |
|---|---|
| **Content type validation** | MIME type checked against whitelist at metadata registration |
| **Size validation** | Size checked at metadata registration; S3 pre-signed URL has max content-length condition |
| **Filename sanitization** | Original filename stored for display; S3 key is UUID-based (no user input in key path) |
| **Direct-to-S3 upload** | File binary never touches the API server; client uploads directly to S3 via pre-signed URL |
| **Pre-signed URL expiry** | PUT URLs expire after 15 minutes |
| **Upload confirmation** | Media status is `pending` until explicitly confirmed; stale records cleaned up after 24h |
| **Private bucket** | S3 bucket has no public access; download URLs are pre-signed GET URLs |

### 9.4 S3 Key Structure

```
colonies/{colonyId}/media/{mediaId}.{ext}
```

- `colonyId` and `mediaId` are UUIDs (server-generated)
- `ext` is derived from the validated MIME type, not from user input
- No user-controllable path segments

---

## 10. Data Protection

### 10.1 Sensitive Data Handling

| Data | Storage | Logging | API Response |
|---|---|---|---|
| Password | bcrypt hash only | Never logged | Never returned |
| Refresh token | SHA-256 hash in DB | Never logged | Returned once on login/refresh |
| Access token | Not stored (stateless) | Never logged | Returned on login/refresh |
| Email | Plaintext in DB | Logged on auth events only | Returned in profile |
| JWT secrets | Environment variable | Never logged | Never returned |
| S3 credentials | Environment variable | Never logged | Never returned |
| DB password | Environment variable | Never logged | Never returned |

### 10.2 Logger Redaction

The pino logger is configured to redact sensitive fields:

```typescript
redact: {
  paths: [
    'req.headers.authorization',
    'password',
    'passwordHash',
    'refreshToken',
    'accessToken',
  ],
  censor: '[REDACTED]',
}
```

---

## 11. Dependency Security

| Practice | Implementation |
|---|---|
| **Audit** | Run `npm audit` weekly and before each release |
| **Lock files** | Commit `package-lock.json` to pin exact dependency versions |
| **Minimal dependencies** | Prefer built-in Node.js modules where possible |
| **Update cadence** | Monthly dependency updates; critical security patches immediately |

---

## 12. Security Checklist (Per PR)

- [ ] No plaintext passwords or secrets in code or logs
- [ ] All user inputs validated with Zod schemas
- [ ] Database queries use Knex parameterized queries (no string interpolation)
- [ ] New endpoints have appropriate auth middleware and role guards
- [ ] File upload endpoints validate MIME type and size
- [ ] No `console.log` with sensitive data (use logger with redaction)
- [ ] Rate limiting applied to sensitive endpoints
- [ ] CORS origin is environment-specific (not `*`)

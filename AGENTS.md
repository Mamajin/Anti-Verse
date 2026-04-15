# AGENTS.md

### Do
- **Service Autonomy:** Ensure logic stays within its designated service boundary. A service should never directly import code or logic from another service.
- **Inter-Service Communication:** Use the internal API client (`packages/api-client`) for cross-service requests.
- **Zero-AI Policy:** All logic must be deterministic. Absolutely no LLM integrations or predictive modeling.
- **Tailwind CSS v3 & DaisyUI:** Use Tailwind CSS v3 utility classes with DaisyUI components for all UI styling. Configure themes via `tailwind.config.js` using DaisyUI's theme system.
- **Design Tokens:** Pull all shared design values (colors, spacing, typography scales) from `packages/tailwind-config`. No hardcoded color values in component files.
- **State Management:** Use **Zustand** for all client-side state. Create one store per domain (auth, colony, log, media). Stores live in `client/src/stores/`.
- **Data Visualization:** Use **Apex Charts** (via `react-apexcharts`) for all data logging and population trend charts.

### Don't
- **No Direct DB Cross-Talk:** While services share a PostgreSQL instance, Service A must never query Service B's tables directly. Use API calls.
- **No Circular Dependencies:** Service A calling Service B which calls Service A is strictly forbidden. The dependency direction is: `Auth ← Colony ← Log ← Media`.
- **No Monolithic PRs:** Avoid PRs that touch more than one service unless it is a shared API contract change.
- **No Hardcoding Colors:** Do not use raw HEX/RGB values in components. Use Tailwind classes (`text-primary`, `bg-base-200`) backed by the DaisyUI theme.
- **No AI Components:** This is a manual research tool. No "smart" suggestions or automated analysis.
- **No Inline Styles:** Do not use `style={{}}` or CSS-in-JS. All styling must go through Tailwind utility classes.

### Commands
```bash
# Start the full environment
docker-compose up --build

# Service-specific checks
cd services/[service-name] && npm run tsc --noEmit
cd services/[service-name] && npm run test

# Frontend checks
cd client && npm run lint --fix
cd client && npm run build         # production build check
cd client && npm run dev           # local dev server

# Run all service tests
cd services/auth-service && npm run test
cd services/colony-service && npm run test
cd services/log-service && npm run test
cd services/media-service && npm run test
```

### Safety and Permissions
**Allowed without prompt:**
- Reading files across all services.
- Running linting, type-checks, and unit tests on single services.

**Ask first:**
- Modifying `docker-compose.yml` or adding new Docker volumes.
- Changing shared database schemas in `packages/database`.
- Installing new npm packages in any service.
- Modifying the shared Tailwind config in `packages/tailwind-config`.

### Project Structure
```
Anti-Verse/
├── client/                        # React + Tailwind + DaisyUI dashboard
│   ├── src/
│   │   ├── components/            # Reusable UI components
│   │   ├── pages/                 # Route-level page components
│   │   ├── stores/                # Zustand stores (one per domain)
│   │   ├── hooks/                 # Custom React hooks
│   │   ├── utils/                 # Client-side utilities
│   │   ├── types/                 # Client-specific type definitions
│   │   └── App.tsx                # Root app with router
│   ├── tailwind.config.js         # Extends packages/tailwind-config
│   └── package.json
├── services/
│   ├── auth-service/              # User accounts, JWT, RBAC
│   ├── colony-service/            # Species, colony profiles, life cycles
│   ├── log-service/               # Journal entries, environmental data
│   └── media-service/             # S3 integration, image/video metadata
├── packages/
│   ├── tailwind-config/           # Shared Tailwind + DaisyUI theme preset
│   ├── types/                     # Shared TypeScript interfaces & enums
│   ├── database/                  # Shared DB constants (table names, etc.)
│   └── api-client/                # Internal HTTP client for service-to-service calls
├── spec/
│   └── plan/                      # Architecture & planning documents
│       ├── migration-plans/       # Per-service database migration specs
│       └── ...                    # System architecture, API contracts, etc.
├── docker-compose.yml
├── .env.example
├── AGENTS.md
└── README.md
```

### Service Interaction Example
- **Good:** `LogService` sends an HTTP request to `AuthService` to verify a Researcher's ID via `packages/api-client`.
- **Bad:** `LogService` imports the `User` model from `AuthService` to run a database query directly.

### API Specifications
| Service | Endpoint | Description |
|---|---|---|
| Auth | `POST /api/auth/login` | Authenticate and receive JWT tokens |
| Auth | `POST /api/auth/register` | Create a new user account |
| Auth | `GET /api/auth/verify` | Internal: verify access token |
| Colonies | `GET /api/colonies` | List colonies for authenticated user |
| Colonies | `POST /api/colonies` | Create a new colony |
| Colonies | `GET /api/colonies/:id/verify` | Internal: verify colony access |
| Logs | `POST /api/logs/:colonyId` | Create a log entry for a colony |
| Logs | `GET /api/logs/:colonyId` | List log entries for a colony |
| Media | `POST /api/media/upload` | Request pre-signed S3 upload URL |

### PR Checklist
- [ ] Are service boundaries respected (no cross-service imports)?
- [ ] Does the UI use only Tailwind classes and DaisyUI components (no inline styles)?
- [ ] Are colors referenced via theme tokens, not hardcoded?
- [ ] Is there **zero** AI/ML logic?
- [ ] Did you include/update unit tests for the specific service modified?
- [ ] Are Zustand stores updated if domain state changed?

---
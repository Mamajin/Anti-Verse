# AGENTS.md

### Do
- **Service Autonomy:** Ensure logic stays within its designated service boundary. A service should never directly import code or logic from another service.
- **Inter-Service Communication:** Use the internal API client for cross-service requests. 
- **Zero-AI Policy:** All logic must be deterministic. Absolutely no LLM integrations or predictive modeling.
- **MUI v3 & Emotion:** Use Material-UI v3 components with the `css={{}}` prop for all styling.
- **Design Tokens:** Pull all styles from `packages/theme/tokens.ts`. No hardcoded values.
- **State Management:** Use **MobX** (`useLocalStore`). Each service should have its own stores; the frontend should coordinate them.
- **Data Visualization:** Use **Apex Charts** for all data logging and population trends.

### Don't
- **No Direct DB Cross-Talk:** While services share a PostgreSQL instance, Service A must never query Service B’s tables directly. Use API calls.
- **No Circular Dependencies:** Service A calling Service B which calls Service A is strictly forbidden.
- **No Monolithic PRs:** Avoid PRs that touch more than one service unless it is a shared API contract change.
- **No Hardcoding:** Do not use raw HEX/RGB values. Use `theme.palette`.
- **No AI Components:** This is a manual research tool. No "smart" suggestions or automated analysis.

### Commands
```bash
# Start the full environment
docker-compose up --build

# Service-specific checks
cd services/[service-name] && npm run tsc --noEmit
cd services/[service-name] && npm run vitest run

# Frontend checks
cd client && npm run eslint --fix
```

### Safety and Permissions
**Allowed without prompt:**
- Reading files across all services.
- Running linting, type-checks, and unit tests on single services.

**Ask first:**
- Modifying `docker-compose.yml` or adding new Docker volumes.
- Changing shared database schemas in `packages/database`.
- Installing new npm packages in any service.

### Project Structure
- `services/auth-service/`: User accounts, JWT, and Role-Based Access Control (RBAC).
- `services/colony-service/`: Core "Ant" logic (Species, profiles, life cycles).
- `services/log-service/`: Journal entries and manual environmental data.
- `services/media-service/`: S3 integration and image/video metadata.
- `client/`: The React/MUI v3 web dashboard.
- `packages/`: Shared code (Design tokens, shared types, database constants).

### Service Interaction Example
- **Good:** `LogService` sends an HTTP request to `AuthService` to verify a Researcher’s ID.
- **Bad:** `LogService` imports `User` model from `AuthService` to run a database query.

### API Specifications
- **Auth:** `POST /api/auth/login`
- **Colonies:** `GET /api/colonies` (via `colony-service`)
- **Logs:** `POST /api/logs/:colonyId` (via `log-service`)
- **Media:** `POST /api/media/upload` (via `media-service`)

### PR Checklist
- [ ] Are service boundaries respected (No cross-service imports)?
- [ ] Is the code compatible with MUI v3?
- [ ] Is there **zero** AI/ML logic?
- [ ] Did you include/update unit tests for the specific service modified?

---
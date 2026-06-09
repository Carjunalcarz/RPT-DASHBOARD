# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Layout

This is a multi-app monorepo for a Philippine Local Government Unit (LGU) Real Property Tax Assessment System:

- [express-backend/](express-backend/) — Node.js/Express API (CommonJS, Node ≥18). Talks to **Supabase/PostgreSQL** (writes) and **MSSQL** (read-only legacy `RPTAS_AGUSAN` source). Uses Prisma with two generated clients.
- [frontend/](frontend/) — React 19 + Vite + TypeScript-friendly JSX. The original RPTAS standalone UI; uses TanStack Query, React Router v7, Radix UI, Tailwind.
- [LocalGovernmentUnit/](LocalGovernmentUnit/) — React 19 + Vite + TypeScript admin shell ("admin-system-template") that hosts RPTAS as a pluggable module (`src/modules/rptas`) alongside `Accounting`, `MyOffice`, `budget`, `gse&bac`, `hr-payroll`, `system-admin`.
- [docs/](docs/) — Architecture specs ([SYSTEM_ARCHITECTURE_SPEC.md](docs/SYSTEM_ARCHITECTURE_SPEC.md), [RPTAS_MODULE_ARCHITECTURE.md](docs/RPTAS_MODULE_ARCHITECTURE.md), [MIGRATION_GUIDE.md](docs/MIGRATION_GUIDE.md)).
- Root [package.json](package.json) is essentially empty — there is no top-level orchestrator; cd into each app to run its scripts.

## Critical Architectural Constraints

### MSSQL is READ-ONLY
The MSSQL database is the legacy source-of-truth being migrated FROM. See [README.md](README.md):
- **Never** write/update/delete/alter against MSSQL — not from app code, not from migration scripts.
- All new state (FAAS drafts, users, audit logs, edits) lives in **Supabase/PostgreSQL**.
- Migration flow is one-directional: MSSQL → Supabase.

### Dynamic DB schema
The Supabase schema name is configurable via `DB_SCHEMA` env var (default `rptas`). All raw SQL must interpolate it from [src/config/database.js](express-backend/src/config/database.js) — never hardcode `rptas.` in queries. SQL setup files use a `__DB_SCHEMA__` placeholder replaced at startup. Connection URLs must include `?schema=...&search_path=...,public`. See [express-backend/SCHEMA_CONFIGURATION.md](express-backend/SCHEMA_CONFIGURATION.md).

### API Key auth (no JWT)
Authentication was migrated from JWT to a single shared API key. See [API_KEY_MIGRATION.md](API_KEY_MIGRATION.md):
- Backend reads `API_ACCESS_KEY` from env; middleware ([express-backend/src/middleware/auth.js](express-backend/src/middleware/auth.js)) accepts it via `x-api-key` header, `Authorization: Bearer …`, or `access_token` cookie (Swagger UI).
- Frontend attaches it via Axios from `VITE_API_ACCESS_KEY`.
- On success the middleware injects a mock Admin `req.user` so legacy code reading `req.user.id` / `req.user.role` keeps working — do not assume `req.user` reflects a real authenticated person.
- Rate-limited to 1000 req / 15 min per IP.

## Backend (express-backend/)

### Commands
```bash
npm run dev                       # nodemon, runs predev (prisma generate if missing + startup.js)
npm start                         # production
npm test                          # jest (tests/ and src/tests/)
npm run test:watch
npm run test:coverage
npx jest path/to/file.test.js     # single test file
npx jest -t "test name pattern"   # single test by name
npm run lint                      # eslint src/**/*.js
npm run prisma:generate           # both clients (mssql + supabase)
npm run prisma:migrate:deploy     # deploy supabase migrations only
npm run seed                      # seed mssql then supabase
```

### Hybrid architecture (two patterns coexist)
The backend is **mid-refactor** from a monolithic controller/routes layout to a Modular Plugin Architecture. Both run simultaneously inside [src/server.js](express-backend/src/server.js):

1. **Legacy monolith** — flat controllers/routes/services under [src/modules/rptas/](express-backend/src/modules/rptas/) (`controllers/`, `routes/`, `services/`). [routes/index.js](express-backend/src/modules/rptas/routes/index.js) mounts ~40 route files at paths like `/api/v1/faas`, `/api/v1/users`, `/api/rptmast`, etc. **Some endpoints have both `/api/...` and `/api/v1/...` aliases** — preserve both when editing.
2. **v2 Plugin modules** — `HealthModule`, `UserModule`, `FaasModule`, `PropertyModule`, `AssessmentModule`, `OopModule`, `PayorModule` live in subfolders alongside the legacy code (e.g. [src/modules/rptas/faas/FaasModule.js](express-backend/src/modules/rptas/faas/FaasModule.js), [src/modules/treasury/](express-backend/src/modules/treasury/)). They register via `pluginManager.registerModule(...)` and resolve dependencies through the **awilix** DI container at [src/core/di/container.js](express-backend/src/core/di/container.js).

When adding a new feature, prefer the v2 pattern: extend `ModuleContract` ([src/core/contracts/](express-backend/src/core/contracts/)), inject services through `awilix`, attach routes via the module's `init(app)`. See [docs/MIGRATION_GUIDE.md](docs/MIGRATION_GUIDE.md) for the step-by-step conversion recipe.

### Two Prisma clients
- [prisma/schema.mssql.prisma](express-backend/prisma/schema.mssql.prisma) → generated to `src/generated/mssql-client` (read-only)
- [prisma/schema.supabase.prisma](express-backend/prisma/schema.supabase.prisma) → generated to `src/generated/supabase-client-v6` (read/write)
- `postinstall`/`prestart`/`predev` auto-run `prisma:generate:if-missing`. If you change schema files, regenerate explicitly.
- `DatabaseAdapter` ([src/core/adapters/](express-backend/src/core/adapters/)) abstracts which client a service talks to — services should depend on the adapter, not on a Prisma client directly.

### Other backend conventions
- Logging via `winston` ([src/utils/logger.js](express-backend/src/utils/logger.js)) with daily rotation.
- Errors: throw `AppError(message, statusCode)` from `middleware/errorHandler.js`; the global error handler converts to JSON.
- Idempotency middleware is mounted globally — POST/PUT routes can rely on `Idempotency-Key` header dedup.
- Swagger UI is served (definition built via `swagger-jsdoc`); JSDoc `@swagger` comments on routes feed it.

## Frontend apps

### frontend/ (legacy standalone RPTAS UI)
```bash
npm run dev      # vite
npm run build    # vite build
npm test         # vitest run --passWithNoTests
```
- Plain JSX (no TypeScript in source despite the typescript devDep).
- Axios client at `src/services/api.ts` auto-injects `x-api-key` from `VITE_API_ACCESS_KEY`.
- This app is being absorbed into LocalGovernmentUnit as a module — avoid adding new features here unless explicitly fixing the standalone build. Mirror new work into `LocalGovernmentUnit/src/modules/rptas`.

### LocalGovernmentUnit/ (the host shell — primary frontend)
```bash
npm run dev              # vite
npm run build            # tsc || true && vite build  (TS errors do NOT fail the build)
npm run lint             # eslint . --ext ts,tsx
npm test                 # vitest
npm run test:ui          # vitest --ui
npm run test:coverage
npx vitest run path/to/file.test.ts   # single test file
npm run seed-modules     # node ./scripts/seedModules.js
```

- The `build` script uses `tsc || true` — **type errors are non-fatal at build time**. Run `npm run lint` and check `tsc_output*.txt` if you're verifying type correctness.
- State: Zustand stores in `src/store`, TanStack Query for server state, Redux Toolkit is also present (legacy).
- Each module under `src/modules/<domain>/` is expected to expose its own `routes` and `navigation` config — the shell composes them into the global router and sidebar (`src/routes/`, sidebar in `src/components/`). RBAC filtering uses `permissionCode` metadata; see [docs/RPTAS_MODULE_ARCHITECTURE.md](docs/RPTAS_MODULE_ARCHITECTURE.md) for the contract.
- Always prefix module-specific env vars with `VITE_<MODULE>_` (e.g. `VITE_RPTAS_*`).
- Supabase client used directly here (`@supabase/supabase-js`) for storage/image uploads (`system_logo`, `profile_picture` buckets) — see [LocalGovernmentUnit/SUPABASE_SETUP.md](LocalGovernmentUnit/SUPABASE_SETUP.md).

## Required environment variables

**express-backend/.env** (see [express-backend/DEPLOYMENT.md](express-backend/DEPLOYMENT.md) for the full list):
`NODE_ENV`, `PORT`, `API_ACCESS_KEY`, `JWT_SECRET`, `SUPABASE_DB_URL`, `SUPABASE_DIRECT_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `DB_SCHEMA`, `MSSQL_CONNECTION_STRING`, `CORS_ORIGIN`. Optional: `ALLOW_MSSQL_FAILURE=true` lets startup proceed if MSSQL is down.

**frontend/.env**: `VITE_API_ACCESS_KEY` (plus API base URL).

**LocalGovernmentUnit/.env**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, plus `VITE_<MODULE>_*` per module.

## Things to avoid

- Don't run `git add .` — the repo contains many uncommitted `fix-*.js` / `fix-*.cjs` helper scripts and `tsc_output*.txt` debug dumps from previous sessions; stage explicit files only.
- Don't touch `test_result.md` outside the documented testing-protocol format — it's the structured handoff file between the main and testing agents (see the preserved block at the top of that file).
- Don't add JWT validation back to the backend — auth was deliberately simplified to API key.
- Don't hardcode the `rptas` schema in raw SQL; use `DB_SCHEMA` interpolation.

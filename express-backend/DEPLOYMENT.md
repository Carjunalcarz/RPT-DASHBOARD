# Coolify Deployment (Docker)

## What’s Included

- Production Dockerfile (multi-stage, non-root, minimal base image)
- Coolify-ready Compose file with health checks, logging limits, security hardening, resource limits, and scaling knobs
- Local Compose file to validate container startup and request handling with a Postgres container
- Liveness/readiness endpoints
- Secrets-safe `.env` + `.env.example`

## Prerequisites

- Coolify installed with a working proxy (Traefik/Caddy) and Let’s Encrypt enabled
- A Postgres database for the primary Prisma datasource (Supabase Postgres or a compatible Postgres instance)
- If MSSQL is required: reachable SQL Server instance and `MSSQL_CONNECTION_STRING`

## Environment Variables (Coolify)

Set these in Coolify (Application → Environment Variables). Do not commit secrets.

Required:

- `NODE_ENV=production`
- `PORT=3000`
- `API_ACCESS_KEY` (used by API key auth)
- `JWT_SECRET`
- `SUPABASE_DB_URL`
- `SUPABASE_DIRECT_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `DB_SCHEMA` (e.g. `rptas`)
- `MSSQL_CONNECTION_STRING` (required by the MSSQL Prisma client)

Optional:

- `ALLOW_MSSQL_FAILURE=true` (allows startup to proceed if MSSQL is unreachable)
- `ALLOW_FORCE_ADMIN=false` (**dev bootstrap only — keep `false` in production**). When `true` and the client sends `x-force-admin: true` (set by the frontend `VITE_FORCE_ADMIN=true`), `GET /rbac/me` persists a real `super_admin` role for the authenticated user. Intended to promote your first admin once; while enabled, **every** user who logs in is promoted, so set both flags back to `false` afterwards.
- `REFRESH_REPORTING_ON_STARTUP=false`
- `LOG_LEVEL=info`
- `LOG_TO_FILES=false`
- `LOG_DIR=logs`
- `HEALTHCHECK_PATH=/health/live`

## Docker Compose (Coolify)

Use [docker-compose.coolify.yml](file:///d:/COOLIFY/express-backend/docker-compose.coolify.yml) as the application source configuration.

Recommended Coolify setup:

- Application type: Docker Compose
- Build strategy: Build on server (or via linked Git provider)
- Container port: `3000`
- Healthcheck: enabled (uses `/health/ready` in Compose)
- Replicas: set in Coolify UI or via `REPLICAS` env var
- Resource limits: set in Coolify UI; Compose provides defaults

### Domains + SSL/TLS

- Add your domain to the application in Coolify and enable HTTPS.
- Let’s Encrypt is handled by the Coolify proxy; no app-level TLS is needed.
- Ensure `CORS_ORIGIN` includes your frontend domain(s).

## Build / Deploy / Rollback

### Automated Builds

- Connect the repository to Coolify via Git (GitHub/GitLab).
- Enable automatic deployments on push to `main` (production) and optionally `develop` (staging).

### Environment-Specific Config

- Create separate Coolify applications for `staging` and `production`.
- Use different domain names and different environment variables per app.
- Keep DBs and secrets separated between environments.

### Rollback

- Coolify keeps deployment history; rollback to a prior successful deployment when needed.
- Keep a retention policy (e.g., last N images/deployments) so older images remain available.

## Security Hardening

Implemented in [Dockerfile](file:///d:/COOLIFY/express-backend/Dockerfile) + Compose:

- Runs as non-root (`node` user)
- Minimal base image (`node:bookworm-slim`)
- Drops Linux capabilities (`cap_drop: ALL`)
- Disables privilege escalation (`no-new-privileges`)
- Read-only filesystem with `/tmp` as tmpfs

Secrets handling:

- Store secrets only in Coolify environment variables / secrets
- Rotate any secrets that were previously committed to git

### Vulnerability Scanning

Options:

- Add a CI job (GitHub Actions/GitLab CI) to run Trivy on the Docker image and fail builds on critical findings.
- Run Trivy as a scheduled job against the latest deployed image and alert on new critical CVEs.

## Monitoring and Alerting

Minimum:

- Configure an external uptime monitor (Uptime Kuma / Better Stack / Pingdom) to poll:
  - `/health/live` for liveness
  - `/health/ready` for readiness (DB connectivity)

Recommended:

- Enable Coolify notifications (email/Discord/Slack) for failed deployments and unhealthy containers.
- Collect logs centrally (Loki/Promtail or any log drain) and alert on error spikes.
- Track application metrics (Prometheus + Grafana) if you have an existing stack.

## Backups

Primary database (Supabase/Postgres):

- If using a managed Postgres/Supabase: enable their built-in backups + PITR where available.
- If self-hosted Postgres: schedule `pg_dump` and store off-host (S3-compatible storage).

Application:

- The app is stateless when `LOG_TO_FILES=false`.
- If you enable file logging, back up the mounted log volume only if you have a retention/compliance requirement.

## Local End-to-End Validation

Use [docker-compose.local.yml](file:///d:/COOLIFY/express-backend/docker-compose.local.yml) to validate container startup and request handling:

1. Build and start:
   - `docker compose -f docker-compose.local.yml up --build`
2. Validate:
   - `GET http://localhost:3000/health/live`
   - `GET http://localhost:3000/health/ready`
3. Optional:
   - `GET http://localhost:3000/api-docs`

If readiness fails, inspect container logs; migrations and reporting setup run during startup.

## Troubleshooting

- Healthcheck failing immediately:
  - Verify required env vars exist in Coolify (especially `SUPABASE_DB_URL`, `SUPABASE_DIRECT_URL`, `MSSQL_CONNECTION_STRING`)
  - Ensure database hostnames are reachable from the Coolify server network
- Prisma errors on startup:
  - Confirm DB URLs include correct schema/search_path settings
  - Confirm DB user has privileges to create schema/tables/functions if migrations/reporting setup require it
- Requests blocked by CORS:
  - Set `CORS_ORIGIN` to a comma-separated list of allowed origins (exact matches)
- Too few logs in production:
  - Set `LOG_LEVEL=info` (or `debug` temporarily)

## Maintenance Procedures

- Rotate `API_ACCESS_KEY` and `JWT_SECRET` periodically.
- Keep Node dependencies updated; redeploy after upgrades.
- Review CVE scan results and rebuild images after base image updates.
- Validate backups by performing periodic restore tests.

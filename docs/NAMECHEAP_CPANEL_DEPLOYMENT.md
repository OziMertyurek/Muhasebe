# Namecheap cPanel Deployment Foundation

This document describes the approved Phase 1 hosted web deployment foundation for `avorayazilim.com`.

It is not a production deployment record. Do not change DNS, enable Cloudflare proxying, create a production database, or expose accounting pages publicly until later phases are approved.

## Approved Environment

- Production domain: `avorayazilim.com`
- Registrar: Guzel Hosting
- DNS / edge: Cloudflare Free
- Cloudflare nameservers: `alex.ns.cloudflare.com`, `lana.ns.cloudflare.com`
- Hosting: Namecheap Stellar Plus Shared Hosting
- Control panel: cPanel
- cPanel addon domain: `avorayazilim.com`
- cPanel document root: `~/avorayazilim.com`
- Selected Node.js runtime: `24.18.0`
- Application mode: `Production`

Cloudflare web records are intentionally DNS-only for initial setup. Do not enable proxying or change the origin DNS record until the Namecheap Node.js app is proven reachable.

## Selected Deployment Model

Use the Next.js standalone output with a thin cPanel startup wrapper.

Selected model:

```text
npm run web:build
npm run web:prepare
upload dist/hosted-web contents to cPanel application root
install dependencies on Namecheap Linux
cPanel starts app.js
app.js loads Next standalone server.js
```

Why this model:

- It follows the repository's existing `output: "standalone"` Next.js configuration.
- It avoids `next start`, which is not intended for standalone output.
- It avoids a custom Next.js server.
- It keeps hosted deployment separate from Electron packaging.
- It lets the generated Next server bind to the port provided by the hosting environment through `process.env.PORT`.
- It avoids uploading Windows-built `node_modules` or native `.node` binaries to Linux.

Do not use Electron startup scripts for hosted web deployment.

## Exact cPanel Values

Recommended cPanel Setup Node.js App values:

```text
Node.js version: 24.18.0
Application mode: Production
Application root: avorayazilim-app
Application URL: https://avorayazilim.com
Application startup file: app.js
```

Use a dedicated `avorayazilim-app` application root so Node application files do not mix with the addon-domain document root `~/avorayazilim.com`. The document root can remain a temporary static/verification location while the Node app is configured and tested.

If cPanel/Namecheap requires the application root to be under the addon-domain root for SSL include generation, stop and verify with hosting support before moving files. Do not improvise with production DNS.

## Build and Artifact Commands

From a clean local checkout:

```bash
npm ci
npm.cmd run prisma:generate
npm.cmd run web:build
npm.cmd run web:prepare
npm.cmd run web:package
```

The deployment artifact is created at:

```text
dist/hosted-web/
```

The cPanel startup file inside the artifact is:

```text
app.js
```

The generated Next standalone server remains:

```text
server.js
```

The health endpoint is:

```text
/api/health
```

The temporary PostgreSQL connectivity diagnostic endpoint is:

```text
/api/diagnostics/postgres-select-1
```

This endpoint is for guarded cPanel PostgreSQL connectivity testing only. It is
not a permanent application health check. It does not use Prisma, does not run
migrations, and does not change the application database.

## Artifact Contents

The artifact should include:

- `app.js`
- `server.js`
- `.next/static/`
- `.next/server/` and other traced standalone files
- `package.json`
- `package-lock.json`
- `prisma/schema.prisma`
- `deploy-info.json`
- `public/` if the repository has public assets

The artifact must not include:

- `node_modules/`
- `.next/node_modules/`
- native `.node` binaries
- `.env` files
- `prisma/dev.db`
- SQLite journal files
- `storage/`
- uploads
- restore backups
- backups
- `docs/`
- `deployment/`
- `scripts/`
- `src/`
- `*.bat`
- `build/`
- desktop `dist/` outputs outside `dist/hosted-web`
- Electron wrapper files
- bundled desktop Node runtime
- bundled desktop Python runtime
- Windows font files or Windows-specific native packages such as `sharp-win32`

The artifact is intentionally Linux-installable rather than self-contained with
local dependencies. Do not upload `node_modules` from a Windows workstation.

## Manual Deployment Workflow

1. Start from a clean local checkout on the intended branch.
2. Run `npm ci`.
3. Run `npm.cmd run prisma:generate`.
4. Run `npm.cmd run web:build`.
5. Run `npm.cmd run web:prepare`.
6. Inspect `dist/hosted-web/` and confirm forbidden files are absent.
7. Create the cPanel Node.js app with the exact values above.
8. Create `avorayazilim-hosted-web-clean.zip` from the contents of `dist/hosted-web/`, not from the parent folder.
9. Upload the clean ZIP to `/home/avornqik/avorayazilim-app`.
10. Extract the ZIP in `/home/avornqik/avorayazilim-app`.
11. Verify that `app.js`, `server.js`, `package.json`, `package-lock.json`, `.next/`, and `prisma/schema.prisma` are present.
12. Verify that `node_modules/`, `.next/node_modules/`, `.env`, `prisma/dev.db`, `storage/uploads`, Electron files, BAT files, and native `.node` binaries are absent before dependency install.
13. In cPanel Setup Node.js App, add environment variables from the approved inventory.
14. Install dependencies on Namecheap Linux before starting the app.
15. Run `npx prisma migrate deploy` against the clean PostgreSQL database.
16. Run `npm run prisma:generate` if Prisma Client generation did not run during install.
17. Verify no dependency or migration errors.
18. Start or restart the application in cPanel.
19. Verify `https://avorayazilim.com/api/health` only after the app URL is routed to the Node app.
20. Sign in through the configured PIN/auth path before testing DB-backed pages.
21. Test the PostgreSQL diagnostic endpoint only with the temporary diagnostic variables enabled.
22. Immediately disable the diagnostic afterward by setting `POSTGRES_DIAGNOSTIC_ENABLED=false`, and remove the diagnostic token and URL when the test is complete.
23. Keep Cloudflare DNS-only until the Namecheap origin is verified.
24. Update Cloudflare origin DNS only after the Node app responds correctly.
25. Enable Cloudflare proxying later, after HTTPS/cookie behavior is verified.

## Namecheap Dependency Install

The clean artifact does not contain local `node_modules`. Dependencies must be
installed on Namecheap Linux so server packages such as `@prisma/adapter-pg`,
`pg`, and `sharp` are built or downloaded for the server OS.

Preferred reproducible SSH command from the application root:

```bash
cd /home/avornqik/avorayazilim-app
npm ci --omit=dev
```

Use `npm ci` because it installs exactly from `package-lock.json` and removes
any stale dependency tree before installing. This is the safest option after
uploading a clean artifact.

cPanel's **Run NPM Install** button can be used when SSH is unavailable, but it
normally runs `npm install` against `package.json`. That is less reproducible
than `npm ci` because semver ranges may resolve newer compatible versions.

If `@prisma/client` generation does not run during install, run this from the
same Namecheap application root after `npm ci`:

```bash
npm run prisma:generate
```

Initialize or update the clean PostgreSQL schema before opening DB-backed pages:

```bash
npx prisma migrate deploy
```

This applies the active PostgreSQL migrations in `prisma/migrations/`. The
historical SQLite migrations are archived in the repository for reference only
and must not be applied to PostgreSQL.

Do not paste real database credentials or diagnostic tokens into shell history,
support tickets, screenshots, or repository files.

## Environment Variables

Hosted web minimum:

```text
NODE_ENV=production
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require
```

cPanel/Passenger should provide:

```text
PORT
```

Do not hardcode `PORT`.

Temporary PostgreSQL SELECT 1 diagnostic variables:

```text
POSTGRES_DIAGNOSTIC_ENABLED=true
POSTGRES_DIAGNOSTIC_TOKEN=<random value with at least 32 characters>
POSTGRES_DIAGNOSTIC_DATABASE_URL=postgresql://avornqik_avora_app:<password>@127.0.0.200:5432/avornqik_avora_erp?sslmode=disable
```

Set these only in cPanel Setup Node.js App environment variables. Do not put
the real token, database password, or full connection URL in repository files,
support tickets, screenshots, or deployment notes.

Use the diagnostic with an authenticated request:

```bash
curl -X POST \
  -H "Authorization: Bearer <POSTGRES_DIAGNOSTIC_TOKEN>" \
  https://avorayazilim.com/api/diagnostics/postgres-select-1
```

Expected success response:

```json
{
  "status": "ok",
  "query": "SELECT 1",
  "latencyMs": 12
}
```

Enable these variables only during the cPanel PostgreSQL connectivity test.
After the test succeeds or fails, immediately set:

```text
POSTGRES_DIAGNOSTIC_ENABLED=false
```

When the diagnostic is no longer needed, remove `POSTGRES_DIAGNOSTIC_TOKEN`
and `POSTGRES_DIAGNOSTIC_DATABASE_URL` too, then restart the Node.js app.

Do not use `NEXT_PUBLIC_*` for secrets.

## Environment Variable Inventory

Current variables used by the repository:

| Variable | Classification | Notes |
| --- | --- | --- |
| `NODE_ENV` | Build/runtime | Use `production` for hosted web. |
| `PORT` | Runtime, cPanel-provided | Used by generated Next standalone server. Do not hardcode. |
| `HOSTNAME` / `HOST` | Optional runtime | Electron uses these for localhost packaged mode. Hosted web should not force them. |
| `DATABASE_URL` | Required runtime secret | PostgreSQL connection string. Do not commit or expose it. |
| `POSTGRES_DIAGNOSTIC_ENABLED` | Temporary runtime diagnostic | Enables the guarded `/api/diagnostics/postgres-select-1` endpoint only when set to `true`. |
| `POSTGRES_DIAGNOSTIC_TOKEN` | Temporary runtime secret | Bearer token for the diagnostic endpoint. Use at least 32 random characters. |
| `POSTGRES_DIAGNOSTIC_DATABASE_URL` | Temporary runtime secret | PostgreSQL URL used only by the guarded diagnostic endpoint. |
| `APP_MODE` | Electron/local mode | `desktop` enables AppData paths. Do not set for hosted web. |
| `DESKTOP_MODE` | Electron/local mode | Do not set for hosted web. |
| `APP_PROJECT_ROOT` | Electron/local path override | Do not set for hosted web unless a path issue is explicitly diagnosed. |
| `APPDATA` | Electron/Windows desktop | Not a hosted web variable. |
| `ELECTRON_START_URL` | Electron-only | Not hosted web. |
| `ELECTRON_SERVER_MODE` | Electron-only | Not hosted web. |
| `ELECTRON_RUN_AS_NODE` | Electron-only safety | Not hosted web. |
| `BUNDLED_NODE_PATH` | Electron packaging/runtime | Not hosted web. |
| `NODE_BUNDLE_SOURCE` / `NODE_BUNDLE_SOURCE_*` | Electron packaging | Not hosted web. |
| `BUNDLED_PYTHON_PATH` | Electron/AI local runtime | Not hosted web. |
| `MARKITDOWN_PYTHON` | Optional AI runtime | Avoid for Phase 1 hosted smoke test. Future worker decision. |
| `PYTHON_BUNDLE_SOURCE` | Electron packaging | Not hosted web. |

## Phase 6 Document / AI Processing

Hosted web startup must not depend on Python, MarkItDown, or a live external AI
provider. On Namecheap shared hosting, use:

```text
DOCUMENT_PROCESSOR_MODE=HOSTED_SAFE
DOCUMENT_PROCESSING_TIMEOUT_MS=30000
```

Optional names reserved for later provider work:

```text
DOCUMENT_UPLOAD_DIR=/home/ACCOUNT/avorayazilim-uploads
DOCUMENT_AI_PROVIDER=disabled
DOCUMENT_AI_API_BASE_URL=
DOCUMENT_AI_MODEL=
DOCUMENT_AI_API_KEY=
```

Do not commit real provider secrets. `HOSTED_SAFE` keeps normal accounting,
inventory, file upload, and manual review screens available. AI extraction jobs
show a Turkish unavailable/manual-review message and can be retried later. A
failed AI job does not delete the uploaded source document and does not create
accounting, stock, payment, or invoice data. `POSTED` AI jobs are terminal and
remain linked to their created invoice.

Local development can keep `DOCUMENT_PROCESSOR_MODE=LOCAL` to use the existing
MarkItDown/Python path. `EXTERNAL_AI` is only an integration point for a future
environment-configured provider; malformed provider output must be rejected and
only review drafts may be created.

Future variables not implemented yet:

- Web auth secrets/session keys.
- PostgreSQL connection pooling configuration.
- Cloudflare R2 credentials/bucket settings.
- AI worker queue/service settings.

## PostgreSQL Runtime Boundary

Hosted web uses Prisma with PostgreSQL as the canonical runtime database.

Production requirements:

- `DATABASE_URL` must be a PostgreSQL connection string.
- `npx prisma migrate deploy` must run successfully before DB-backed pages are used.
- `prisma/migrations/000001_postgresql_baseline` is the active clean PostgreSQL baseline.
- The archived `prisma/sqlite-migrations/` history is reference-only and must not be deployed to PostgreSQL.
- SQLite file backup/restore routes are disabled under PostgreSQL runtime.

The user-facing backup screen may still show business export tools, but managed
PostgreSQL backup, PITR, restore, and disaster recovery are infrastructure
responsibilities.

## Local Filesystem Boundary

These areas still depend on local filesystem behavior and are not fixed in Phase 1:

- File uploads: `src/app/(dashboard)/files/actions.ts`
- File path helpers: `src/lib/app-paths.ts`
- Backup/restore: `src/lib/backup-utils.ts` and `src/app/(dashboard)/settings/backup/*`
- MarkItDown extraction: `src/lib/markitdown-utils.ts`, `src/lib/python-runtime-utils.ts`, `python-worker/`
- System Status desktop diagnostics: `src/lib/system-status-utils.ts`
- Desktop dry-run/bootstrap utilities: `src/lib/desktop-*`

Do not silently remove these features. They are migration boundaries for later phases.

## Authentication Boundary

Local PIN auth is still transitional. Hosted production now fails closed when no
PIN/auth seed exists, and state-changing requests require same-origin hosted web
headers instead of localhost-only headers.

Before exposing accounting pages publicly:

- Configure a strong PIN or approved web authentication path.
- Verify login, logout, protected dashboard access, and protected POST routes.
- Do not treat local PIN as the final multi-user authentication model.

## Cloudflare DNS Boundary

Current Cloudflare web records remain DNS-only for initial setup.

After the Namecheap Node app is proven reachable:

1. update the Cloudflare origin DNS record to the Namecheap hosting origin;
2. keep DNS-only until origin behavior is verified;
3. enable proxying later after HTTPS, cookies, and health checks work through Cloudflare.

Do not change DNS from the repository.

## Rollback Procedure

If the hosted Node app fails:

1. Stop the cPanel Node.js app.
2. Restore the previous uploaded `avorayazilim-app` folder or remove the failed upload.
3. Leave Cloudflare DNS unchanged if DNS has not been moved.
4. If DNS was moved later, point it back to the previous origin and keep the record DNS-only while debugging.
5. Continue using the current local/Electron path until the hosted issue is fixed.

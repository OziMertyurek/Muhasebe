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
cPanel starts app.js
app.js loads Next standalone server.js
```

Why this model:

- It follows the repository's existing `output: "standalone"` Next.js configuration.
- It avoids `next start`, which is not intended for standalone output.
- It avoids a custom Next.js server.
- It keeps hosted deployment separate from Electron packaging.
- It lets the generated Next server bind to the port provided by the hosting environment through `process.env.PORT`.

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

This endpoint is for the Phase 2A cPanel runtime test only. It is not a
permanent application health check. It does not use Prisma, does not run
migrations, and does not change the application's current SQLite baseline.

## Artifact Contents

The artifact should include:

- `app.js`
- `server.js`
- `.next/static/`
- `.next/server/` and other traced standalone files
- `node_modules/` traced by Next standalone output
- `deploy-info.json`
- `public/` if the repository has public assets

The artifact must not include:

- `.env` files
- `prisma/dev.db`
- SQLite journal files
- `storage/`
- uploads
- restore backups
- `build/`
- desktop `dist/` outputs outside `dist/hosted-web`
- Electron wrapper files
- bundled desktop Node runtime
- bundled desktop Python runtime

## Manual Deployment Workflow

1. Start from a clean local checkout on the intended branch.
2. Run `npm ci`.
3. Run `npm.cmd run prisma:generate`.
4. Run `npm.cmd run web:build`.
5. Run `npm.cmd run web:prepare`.
6. Inspect `dist/hosted-web/` and confirm forbidden files are absent.
7. Create the cPanel Node.js app with the exact values above.
8. Upload the contents of `dist/hosted-web/` into the cPanel application root `avorayazilim-app`.
9. In cPanel Setup Node.js App, add environment variables from the approved inventory.
10. Use cPanel's Run NPM Install only if Namecheap requires it for the uploaded artifact. The standalone artifact already contains traced runtime dependencies, but native module compatibility may still require server-side install/rebuild on shared hosting.
11. Start or restart the application in cPanel.
12. Verify `https://avorayazilim.com/api/health` only after the app URL is routed to the Node app.
13. Keep Cloudflare DNS-only until the Namecheap origin is verified.
14. Update Cloudflare origin DNS only after the Node app responds correctly.
15. Enable Cloudflare proxying later, after HTTPS/cookie behavior is verified.

## Environment Variables

Phase 1 minimum:

```text
NODE_ENV=production
```

cPanel/Passenger should provide:

```text
PORT
```

Do not hardcode `PORT`.

Current transitional SQLite smoke-test variable:

```text
DATABASE_URL=file:./prisma/dev.db
```

This is only for a temporary non-production smoke test if the application must reach DB-backed pages before Phase 2. Do not treat hosted SQLite as production architecture.

Future Phase 2 PostgreSQL variable:

```text
DATABASE_URL=postgresql://...
```

Do not set a real PostgreSQL value until Phase 2 is approved and implemented.

Temporary Phase 2A PostgreSQL SELECT 1 diagnostic variables:

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
| `DATABASE_URL` | Runtime now, future PostgreSQL | Currently SQLite. PostgreSQL target in Phase 2. |
| `POSTGRES_DIAGNOSTIC_ENABLED` | Temporary runtime diagnostic | Enables the guarded `/api/diagnostics/postgres-select-1` endpoint only when set to `true`. |
| `POSTGRES_DIAGNOSTIC_TOKEN` | Temporary runtime secret | Bearer token for the diagnostic endpoint. Use at least 32 random characters. |
| `POSTGRES_DIAGNOSTIC_DATABASE_URL` | Temporary runtime secret | PostgreSQL URL used only by the diagnostic endpoint before Prisma migration. |
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

Future variables not implemented yet:

- Web auth secrets/session keys.
- PostgreSQL connection pooling configuration.
- Cloudflare R2 credentials/bucket settings.
- AI worker queue/service settings.

## SQLite / PostgreSQL Boundary

Phase 1 does not migrate the database.

Current blockers for real hosted production:

- `prisma/schema.prisma` uses SQLite.
- `src/lib/prisma.ts` uses `@prisma/adapter-better-sqlite3`.
- `prisma.config.ts` creates SQLite files for `file:` URLs.
- Existing migrations are SQLite migrations.
- Backup/restore code expects `database/dev.db`.
- Hosted shared-server filesystem SQLite is not the approved production architecture.

Phase 1 success is limited to:

- the Next.js server can boot, and
- `/api/health` can respond without database access.

DB-backed accounting pages are Phase 2/3 dependent and should not be considered production-ready on Namecheap in this phase.

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

Current local PIN auth is not suitable for public hosted access.

Known hosted blocker:

- `requireLocalRequestOrigin()` rejects non-localhost hosts.
- Dashboard layout uses onboarding and local PIN guards.
- Export and AI POST routes call local auth helpers.
- Cookies are named for local auth and signed from the local PIN hash.

Do not weaken these checks in Phase 1. Public hosted accounting access waits for Phase 3 web authentication.

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

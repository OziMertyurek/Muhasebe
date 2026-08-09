# Hosted Web Migration Roadmap

This roadmap records the approved hosted web transition direction. It is migration guidance, not proof that the target architecture has already been implemented.

Current branch context: `feature/invoice-line-items` contains the current Invoice Line Item Phase 1/2 work. That work remains valid and reusable under the hosted web architecture.

## Target Direction

```text
User Browser
-> Production Domain
-> Cloudflare Free
   DNS / TLS / Proxy / Edge Security
-> Hosted Next.js Node Application
-> Server Actions / Route Handlers
-> Prisma
-> Managed PostgreSQL
```

Additional target services:

- Cloudflare R2 for persistent `FileAttachment` binaries.
- Server-side AI/document worker for MarkItDown/Python extraction.
- Managed database backups for infrastructure disaster recovery.

The application hosting provider and managed PostgreSQL vendor are not selected yet.

## Cloudflare Free Principles

- Use Cloudflare Free for DNS, SSL/TLS, reverse proxy, CDN where appropriate, and free-tier security protections where available.
- Do not depend on Cloudflare paid-only features.
- Do not move business logic into Cloudflare-specific edge behavior.
- The app must remain functional if advanced Cloudflare features are unavailable.
- Cloudflare is not the application server, relational database, authentication system, or backup system.

## Hosting Selection Criteria

The application host should support:

- Next.js Node runtime
- custom domain
- environment variables
- production logs
- simple deployment
- stable long-running server behavior
- Prisma/PostgreSQL connectivity
- HTTPS behind Cloudflare
- reasonable cost
- European region availability where useful
- straightforward rollback/deployment history

## PostgreSQL Provider Selection Criteria

The managed PostgreSQL provider should support:

- Prisma compatibility
- managed backups
- PITR if available
- SSL connections
- connection pooling
- migration tooling
- monitoring
- reasonable free/low-cost entry tier
- European region availability where useful
- predictable upgrade path

## Phase 0: Architecture Decisions and Charter

Goal: Record the approved direction before coding.

Scope:

- `DEVELOPMENT_CHARTER.md`
- `docs/architecture/decisions/`
- `docs/HOSTED_WEB_MIGRATION_ROADMAP.md`
- current README/Roadmap documentation pointers

Main files/modules likely affected:

- Documentation only.

What stays untouched:

- Application source
- Prisma schema and migrations
- package dependencies
- Electron runtime
- Invoice Line Item implementation

Dependencies:

- Product Owner approval of the hosted web direction.

Main risks:

- Documentation accidentally describes future work as implemented.
- Historical release notes get rewritten incorrectly.

Acceptance criteria:

- ADRs exist for the major approved decisions.
- Charter no longer treats offline-first, Electron, SQLite, or AppData as permanent requirements.
- Roadmap records open provider decisions and phase boundaries.
- Working tree changes are documentation only.

Rollback strategy:

- Revert the documentation commit before any code migration depends on it.

What must NOT be changed yet:

- Do not implement PostgreSQL, authentication, R2, hosting, or Electron removal.

## Phase 1: Web Runtime / Deployment Foundation

Goal: Prepare the app to run as a hosted Next.js Node application without changing the database provider.

Scope:

- Deployment configuration
- environment variable conventions
- production logging expectations
- health/smoke checks
- domain-independent URL handling

Main files/modules likely affected:

- `next.config.ts`
- environment documentation
- deployment scripts or config added after provider selection
- route/runtime configuration where needed

What stays untouched:

- Prisma provider remains SQLite until Phase 2.
- Local/Electron behavior remains available.
- Invoice Line Item business logic remains unchanged unless a web-runtime issue is found.

Dependencies:

- Application hosting provider selection.

Main risks:

- Hosted runtime differs from local/Electron standalone behavior.
- Server Actions or file-system assumptions fail in production.

Acceptance criteria:

- Hosted Next.js app boots in a test environment.
- Environment configuration is documented.
- No production domain is hardcoded.
- Core pages render against the current transitional database setup.

Rollback strategy:

- Keep local/Electron path working.
- Revert deployment config if the selected host is unsuitable.

What must NOT be changed yet:

- Do not migrate data to PostgreSQL.
- Do not remove Electron.
- Do not expose public production traffic before auth is safe.

## Phase 2: PostgreSQL Transition

Goal: Move from local SQLite to managed PostgreSQL as the centralized relational database.

Scope:

- Prisma datasource/provider migration
- Prisma client adapter changes
- SQLite-to-PostgreSQL data migration plan
- migration validation
- Decimal/DateTime verification
- transaction behavior verification

Main files/modules likely affected:

- `prisma/schema.prisma`
- `prisma.config.ts`
- `src/lib/prisma.ts`
- `prisma/migrations/`
- database setup documentation
- backup/restore documentation

What stays untouched:

- Electron remains until parity is proven.
- Object storage is not required yet unless file paths block testing.
- Stock module is not started.

Dependencies:

- Managed PostgreSQL vendor selected.
- Database credentials and SSL configuration available.
- Data migration plan approved.

Main risks:

- Decimal precision differences.
- Date/time interpretation differences.
- SQLite-specific migration SQL cannot be reused directly.
- Existing backup/restore code assumes a SQLite file.

Acceptance criteria:

- Prisma validates and connects to PostgreSQL.
- Core accounting CRUD works on PostgreSQL.
- Invoice Line Item creation works on PostgreSQL.
- Migration plan preserves existing records.
- Rollback backup exists before migration.

Rollback strategy:

- Keep SQLite backup/export before provider switch.
- Keep desktop/local state available until PostgreSQL parity is accepted.

What must NOT be changed yet:

- Do not start Stock V1.
- Do not retire Electron.
- Do not allow user-facing live DB restore.

## Phase 3: Web Authentication

Goal: Replace local PIN protection with safe hosted web authentication.

Scope:

- user accounts
- email/password or managed credential handling
- secure password hashing if self-managed
- HttpOnly session cookies
- logout
- rate limiting
- password reset capability
- route protection
- future roles/users readiness

Main files/modules likely affected:

- `src/lib/security-utils.ts`
- `src/app/login/`
- `src/app/cikis/`
- protected dashboard layout
- export routes
- AI extraction routes
- audit log metadata
- possible new user/session models after approval

What stays untouched:

- No enterprise IAM.
- No broad role model unless separately approved.
- Electron/local PIN remains only if needed for transitional desktop mode.

Dependencies:

- Authentication library/provider decision.
- PostgreSQL availability if auth state is database-backed.

Main risks:

- Public routes exposed incorrectly.
- CSRF or session cookie mistakes.
- Rate limiting placed only at Cloudflare instead of app/auth layer.

Acceptance criteria:

- Unauthenticated users cannot access protected accounting data.
- Login, logout, password reset, and session expiry work.
- State-changing routes are protected.
- Existing exports and AI routes require authenticated sessions.

Rollback strategy:

- Disable public exposure.
- Revert auth integration before production traffic if security tests fail.

What must NOT be changed yet:

- Do not remove local PIN code until desktop transition needs are resolved.
- Do not add enterprise IAM.

## Phase 4: Object Storage

Goal: Move file attachment binaries from local filesystem/AppData to persistent object storage.

Scope:

- Upload to Cloudflare R2 or compatible object storage.
- Authenticated download/preview routes.
- `FileAttachment` storage-key compatibility.
- AI worker access to uploaded files.
- Object-storage backup/versioning policy.

Main files/modules likely affected:

- `src/app/(dashboard)/files/actions.ts`
- `src/lib/file-utils.ts`
- `src/lib/markitdown-utils.ts`
- file detail pages
- backup/restore docs
- possible `FileAttachment` model extension after approval

What stays untouched:

- Business modules should keep using `FileAttachment` relationships.
- Electron local uploads remain until migration/parity is accepted.

Dependencies:

- Object-storage credentials/configuration.
- R2 implementation decision.
- Authenticated file access design.

Main risks:

- Broken file previews/downloads.
- Object keys exposed or guessed.
- AI extraction cannot access files safely.
- Migration loses local upload binaries.

Acceptance criteria:

- Upload, list, detail, download, and AI extraction flows work with object storage in test.
- Local file migration is documented and tested.
- Application instance disk is not required for persistent hosted attachments.

Rollback strategy:

- Keep local uploads backed up.
- Revert file storage config before deleting any local data.

What must NOT be changed yet:

- Do not delete local `storage/uploads/` or AppData uploads.
- Do not rely on paid Cloudflare features.

## Phase 5: Core Accounting Parity

Goal: Verify that existing accounting functionality works in hosted web mode.

Scope:

- Dashboard
- Companies
- Invoices and InvoiceItems
- Payments
- Financial Accounts
- Expenses
- Recurring Expenses
- Important Dates
- Reports
- Files
- AI extraction
- Audit Logs
- Trash
- Settings
- Help

Main files/modules likely affected:

- Only bug fixes discovered during parity testing.

What stays untouched:

- Electron removal waits until this phase passes.
- Stock remains out of scope.

Dependencies:

- PostgreSQL, web auth, and object storage stable enough for parity testing.

Main risks:

- Hidden local filesystem assumptions.
- Multi-user/concurrency behavior differs from desktop.
- Reports or exports behave differently with PostgreSQL.

Acceptance criteria:

- Core CRUD and reporting smoke tests pass.
- Invoice Line Item creation and totals work.
- Export flows remain user-facing.
- No old CRM backup work is merged into this branch.

Rollback strategy:

- Keep desktop/Electron release path available.
- Fix or revert individual parity regressions.

What must NOT be changed yet:

- Do not remove Electron before parity signoff.
- Do not start Stock V1.

## Phase 6: Electron Retirement

Goal: Remove desktop-only runtime and packaging after hosted web parity is accepted.

Scope:

- Electron shell
- AppData helpers
- bundled Node/Python packaging
- installer/portable commands
- desktop diagnostics
- desktop-only docs

Main files/modules likely affected:

- `electron/`
- `scripts/electron-after-pack.js`
- `scripts/prepare-standalone.js`
- `scripts/prepare-bundled-python.js`
- `package.json`
- `.github/workflows/macos-build.yml`
- `src/lib/desktop-*`
- `src/lib/node-runtime-utils.ts`
- desktop sections in docs

What stays untouched:

- Core accounting modules.
- Hosted deployment config.
- Database and auth behavior unless cleanup requires small references.

Dependencies:

- Product Owner approval after web parity.

Main risks:

- Removing shared helper code accidentally used by web runtime.
- Losing diagnostic capability before hosted observability is ready.

Acceptance criteria:

- Electron-specific code and dependencies are removed in small commits.
- Web app still builds and runs.
- Docs no longer instruct current users to use desktop packages.

Rollback strategy:

- Revert the Electron removal commit if hidden dependency is found.

What must NOT be changed yet:

- Do not remove Electron before Phase 5 acceptance.

## Phase 7: Production Domain + Cloudflare

Goal: Put the hosted app behind the production domain and Cloudflare Free.

Scope:

- DNS
- SSL/TLS
- proxy/CDN settings
- free-tier security configuration
- environment-based domain configuration
- production smoke tests

Main files/modules likely affected:

- Deployment/provider configuration
- operations documentation
- environment variable documentation

What stays untouched:

- No source-code hardcoded production domain.
- Business logic remains provider-independent.

Dependencies:

- Hosted app, auth, database, object storage, and core parity stable.

Main risks:

- DNS/proxy misconfiguration.
- Cookie or HTTPS behavior broken behind proxy.
- Assuming unavailable paid Cloudflare features.

Acceptance criteria:

- Production domain serves HTTPS.
- Auth cookies work correctly.
- Core smoke tests pass through Cloudflare.
- App remains functional without paid Cloudflare features.

Rollback strategy:

- Revert DNS/proxy changes.
- Point domain back to previous target or pause proxying while debugging.

What must NOT be changed yet:

- Do not hardcode the production domain.
- Do not move business logic to Cloudflare.

## Phase 8: Legacy / Desktop / Test Cleanup

Goal: Clean obsolete desktop, local, and historical test artifacts after migration.

Scope:

- stale docs
- obsolete release templates
- desktop-only test instructions
- ignored local artifacts
- old packaging references

Main files/modules likely affected:

- `README.md`
- `docs/`
- `.github/`
- ignored local artifact guidance

What stays untouched:

- Historical release notes should remain historical, not rewritten as if history changed.
- Core accounting behavior remains stable.

Dependencies:

- Electron retirement complete or explicitly approved.

Main risks:

- Deleting useful historical context.
- Removing test coverage still needed for web parity.

Acceptance criteria:

- Current docs describe hosted web operation.
- Historical docs are clearly labeled.
- Legitimate test infrastructure remains.

Rollback strategy:

- Revert individual cleanup commits.

What must NOT be changed yet:

- Do not delete historical records merely because they mention desktop.

## Phase 9: Stock V1

Goal: Start the first major new business module after hosted foundation stability.

Scope:

- Product model
- StockMovement model
- Warehouse/location model if approved
- purchase/sales integration
- invoice line integration
- audit trail
- transaction-safe stock updates

Main files/modules likely affected:

- Prisma schema and migrations
- invoice line item flows
- new stock pages/actions/components
- reports/dashboard additions

What stays untouched:

- No stock implementation before this phase.

Dependencies:

- PostgreSQL stable
- web authentication stable
- persistent file storage stable
- core accounting parity accepted

Main risks:

- Concurrency errors in stock movements.
- Incorrect invoice/stock transaction boundaries.
- Over-designing inventory before product requirements are approved.

Acceptance criteria:

- Product Owner approves Stock V1 scope.
- Database transaction design is reviewed before coding.
- Stock changes are auditable and rollback-safe.

Rollback strategy:

- Keep Stock V1 in small schema/business increments.
- Avoid coupling stock to unrelated accounting flows until verified.

What must NOT be changed yet:

- Do not design or implement Stock before hosted foundation acceptance.

# ADR 0002: PostgreSQL as Central Database

## Status

Accepted as target direction. Not implemented.

## Context

The current application uses Prisma with SQLite through `@prisma/adapter-better-sqlite3`. SQLite is tied to local files, AppData, local backup ZIPs, and desktop bootstrap logic.

The hosted application needs centralized persistent relational storage, concurrent access, managed backups, and a foundation suitable for future stock tracking.

## Decision

Managed PostgreSQL is the target centralized relational database. The exact managed PostgreSQL vendor remains open.

## Alternatives Considered

- SQLite/D1-style storage: close to the current model but not the best fit for multi-user accounting, stock transactions, and Prisma migration continuity.
- MySQL/MariaDB: viable with Prisma, but PostgreSQL is preferred for relational integrity, ecosystem maturity, and future stock/audit workloads.
- CockroachDB: powerful but operationally more complex than this product currently requires.

## Consequences

- `prisma/schema.prisma`, migrations, `src/lib/prisma.ts`, and database setup docs will need a later migration.
- SQLite-specific migration SQL and backup assumptions must be replaced.
- Decimal and DateTime behavior must be verified during migration.

## Migration Notes

Provider/vendor selection criteria:

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

## Rollback / Safety Notes

Do not switch providers without a tested export/import path from SQLite to PostgreSQL and a verified backup. Keep the current SQLite/Electron state untouched until PostgreSQL parity is proven.

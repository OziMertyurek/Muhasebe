# ADR 0001: Hosted Web Transition

## Status

Accepted for migration planning. Not fully implemented.

## Context

The product direction has changed from a desktop/offline-first Electron application to a hosted web application accessed through a domain. The existing accounting modules, Next.js App Router structure, Prisma business logic, and current Invoice Line Item work should be preserved where possible.

Electron remains in the repository during the transition because desktop parity and data safety still matter until the hosted web version is proven.

## Decision

The target runtime is a hosted Next.js Node application accessed through a production domain. Domain-specific values must be provided through environment and deployment configuration, not hardcoded in source code.

The migration will be incremental. Electron remains temporarily supported until hosted web parity is verified.

## Alternatives Considered

- Big-bang desktop removal: rejected because it risks breaking working accounting flows and makes rollback difficult.
- Parallel rewrite: rejected because it would duplicate business logic and slow parity verification.
- Keep desktop/offline-first permanently: rejected because the approved product direction is hosted web access.

## Consequences

- Runtime assumptions must move from localhost/AppData to hosted server, managed database, and persistent object storage.
- Local-only authentication and backup/restore behavior must be replaced or re-scoped.
- Existing modules must be tested for web-safe behavior before Electron is retired.

## Migration Notes

- Preserve current accounting workflows first.
- Keep the Invoice Line Item branch intact.
- Introduce web infrastructure in phases before removing desktop code.

## Rollback / Safety Notes

The Electron runtime and current SQLite/local behavior remain available during early phases. Each migration phase must have a clear rollback path and must not merge desktop-only assumptions into the hosted target.

# ADR 0006: Hosted Backup / Restore Policy

## Status

Accepted as target policy. Not implemented.

## Context

Current backup/restore is designed for local SQLite and local uploads. It downloads ZIP files containing `database/dev.db`, `uploads/`, and `backup-info.json`, and restore can replace the local database file.

Hosted production cannot safely allow normal users to replace the live database.

## Decision

Separate Business Data Export from Infrastructure Backup / Disaster Recovery.

Target hosted behavior:

- Existing CSV/PDF/business exports remain user-facing.
- Managed PostgreSQL backups and PITR become infrastructure responsibility.
- Object-storage backup/versioning policy is handled at the storage/infrastructure level where appropriate.
- Normal users must not be able to replace the live production database.

## Alternatives Considered

- Keep user-facing full DB restore: rejected for hosted production safety.
- Remove all exports: rejected because business exports remain valuable.
- Build custom backup infrastructure first: rejected until provider choices are made.

## Consequences

- Local full restore UI/routes become transitional desktop functionality.
- Hosted admin/disaster recovery must be documented separately from user workflows.
- Audit logs should continue to record business export actions.

## Migration Notes

Hosted backup implementation depends on PostgreSQL provider and object-storage provider decisions.

## Rollback / Safety Notes

Keep existing local backup/restore during Electron transition. Do not expose hosted restore until an explicit admin-only disaster recovery design is approved.

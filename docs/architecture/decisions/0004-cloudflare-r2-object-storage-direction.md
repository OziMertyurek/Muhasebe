# ADR 0004: Cloudflare R2 Object Storage Direction

## Status

Preferred direction. Not implemented.

## Context

Current file uploads are stored on the local filesystem under `storage/uploads/` or desktop AppData uploads. `FileAttachment.filePath` stores a relative path such as `storage/uploads/<file>`. AI extraction resolves those local paths before calling MarkItDown.

Hosted deployment needs persistent file storage that is independent of application instance disk.

## Decision

Cloudflare R2 is the preferred object-storage direction for persistent `FileAttachment` binaries. The exact implementation remains future work.

## Alternatives Considered

- Local server disk: rejected for hosted production because it is fragile across deploys, restarts, scaling, and backups.
- PostgreSQL byte storage: rejected for normal file attachments because it increases database size and backup pressure.
- Other S3-compatible object storage: viable fallback if R2 does not fit operational or cost constraints.

## Consequences

- Upload, download, preview, backup, and AI extraction paths must be refactored around object keys instead of local filesystem paths.
- `FileAttachment` can remain conceptually compatible, but may later need fields such as storage provider, bucket, key, checksum, and visibility.

## Migration Notes

Cloudflare Free constraints remain in force. The app must not rely on paid-only Cloudflare behavior for core file access.

## Rollback / Safety Notes

Keep local upload behavior until object storage upload/download and data migration are verified. Do not delete local upload files during migration.

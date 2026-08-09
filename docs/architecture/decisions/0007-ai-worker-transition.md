# ADR 0007: AI Worker Transition

## Status

Accepted as target direction. Not implemented.

## Context

Current AI/document extraction uses MarkItDown through a Python subprocess. Desktop packaging includes bundled Python so local users do not need a separate Python installation. The flow assumes local upload file paths.

Hosted deployment needs safer, more controllable document processing.

## Decision

Keep MarkItDown/Python temporarily. Transition AI/document extraction toward a server-side worker/job model.

Bundled desktop Python will be removed only after hosted web parity is proven.

## Alternatives Considered

- Remove Python immediately: rejected because current extraction work would be disrupted.
- Run Python directly in normal web requests forever: rejected because long-running subprocess work should be isolated and controlled.
- Full external AI pipeline now: rejected until hosted foundation is stable.

## Consequences

- Extraction should become asynchronous or job-based.
- The worker must handle object-storage files, temporary files, file type limits, timeouts, and sanitized errors.
- Raw extracted text remains sensitive and must not be exposed casually.

## Migration Notes

The future worker may run in the same hosting environment initially if safe, then move to a separate worker/service if operational needs require it.

## Rollback / Safety Notes

Keep the current local MarkItDown path during Electron transition. Do not remove bundled Python until hosted extraction parity is verified.

# ADR 0008: Electron Retirement Strategy

## Status

Accepted as transitional strategy. Not implemented.

## Context

Electron currently starts or attaches to the local Next.js server, prepares AppData database paths, manages bundled Node/Python, handles desktop downloads, and exposes support diagnostics.

The approved product direction is hosted web, but existing desktop behavior must not be broken prematurely.

## Decision

Electron is transitional. It remains temporarily supported until hosted web parity is proven, then desktop-specific code can be retired in a controlled cleanup phase.

## Alternatives Considered

- Remove Electron now: rejected because it would risk current users and obscure migration regressions.
- Keep Electron permanently: rejected because the target product is hosted web access.
- Maintain two full products indefinitely: rejected because it would increase maintenance cost and divergence.

## Consequences

- Desktop packaging, AppData, bundled runtimes, and diagnostics remain during early migration.
- New hosted features should avoid new Electron-only dependencies.
- Removal must happen after parity verification, not before.

## Migration Notes

Likely retirement candidates include `electron/`, Electron build scripts, desktop AppData helpers, bundled Node/Python packaging, installer/portable commands, desktop diagnostics, and desktop-only documentation.

## Rollback / Safety Notes

Keep Electron code untouched until web parity acceptance. If hosted migration stalls, the existing desktop path remains available.

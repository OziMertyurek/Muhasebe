# ADR 0005: Web Authentication Direction

## Status

Accepted as target direction. Exact library/provider not selected.

## Context

Current security uses local PIN authentication stored in `AppSetting`, signed local cookies, and localhost-only Host/Origin checks. This protects a local desktop app but is not enough for a public domain.

## Decision

Replace local PIN authentication with real web authentication.

Initial safe target:

- user accounts
- email/password
- secure password hashing or managed credential handling
- secure HttpOnly session cookies
- logout
- rate limiting
- password reset capability
- architecture ready for future roles/users

Enterprise IAM is out of scope.

## Alternatives Considered

- Keep local PIN: rejected for hosted public access.
- Enterprise SSO/IAM first: rejected as over-engineered for the initial hosted product.
- Anonymous/shared access: rejected because the application handles financial data.

## Consequences

- `src/lib/security-utils.ts`, login/logout routes, protected layouts, export routes, AI routes, and audit metadata will need later changes.
- Authorization and future role design must be prepared without blocking the initial hosted migration.

## Migration Notes

Authentication selection criteria remain open: simple Next.js compatibility, secure sessions, password reset support, rate limiting story, low operational overhead, and future user/role compatibility.

## Rollback / Safety Notes

Do not remove local PIN until hosted authentication is implemented, tested, and accepted. During transition, avoid mixing local PIN assumptions with public web routes.

# ADR 0003: Cloudflare Free Edge Boundary

## Status

Accepted as target edge direction. Not implemented.

## Context

The production domain is already owned and ready. Cloudflare Free plan will be used initially. The architecture must not depend on Cloudflare Pro, Business, Enterprise, or paid-only features.

Cloudflare is an edge/network layer, not automatically the application host, relational database, authentication system, or business logic runtime.

## Decision

Use Cloudflare Free for DNS, SSL/TLS, reverse proxy, CDN where appropriate, and free-tier security protections where available.

The application server and managed PostgreSQL database remain separate responsibilities. The app must remain functional even if advanced Cloudflare features are unavailable.

## Alternatives Considered

- No Cloudflare: possible, but loses simple domain/TLS/proxy/security benefits.
- Cloudflare paid-feature architecture: rejected because the approved constraint is Free plan usage.
- Cloudflare as full application/database platform: rejected for this phase because the target is hosted Next.js Node runtime plus managed PostgreSQL.

## Consequences

- No business logic may depend on Cloudflare-specific paid features.
- Rate limiting and edge security can supplement application controls but cannot replace application authentication, authorization, validation, or server-side rate limiting.
- Domain-specific configuration must remain environment/deployment based.

## Migration Notes

Target boundary:

```text
User Browser
-> Production Domain
-> Cloudflare Free: DNS / TLS / Proxy / Edge Security
-> Hosted Next.js Node Application
```

## Rollback / Safety Notes

DNS/proxy changes must be reversible. The application should be deployable behind or without Cloudflare during troubleshooting.

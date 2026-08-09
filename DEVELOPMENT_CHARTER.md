# Development Charter

This charter defines how this repository must be developed. It is for future developers, future ChatGPT/Codex sessions, and future maintainers.

The repository is the source of truth. Before changing behavior, inspect the actual code, configuration, migrations, documentation, and current Git state.

It is not a feature list and it does not replace the README. It describes the engineering workflow, product judgment, architecture direction, and quality standards expected for this project.

## Table of Contents

- [Development Workflow](#development-workflow)
- [Architecture Principles](#architecture-principles)
- [Product Philosophy](#product-philosophy)
- [UI / UX Philosophy](#ui--ux-philosophy)
- [Database Rules](#database-rules)
- [Security Rules](#security-rules)
- [Verification Checklist](#verification-checklist)
- [Git Standards](#git-standards)
- [Communication Rules](#communication-rules)
- [Product Owner Approval](#product-owner-approval)
- [Preserve Existing Quality](#preserve-existing-quality)
- [AI Rules](#ai-rules)
- [Final Principle](#final-principle)

## Development Workflow

Every development task should follow this sequence:

Analysis

Risk Assessment

Implementation Plan

Approval

Development

Verification

Commit

Push

Do not skip directly to implementation for changes that affect UI, UX, database structure, business rules, security, deployment, or architecture. Understand the current repository first, identify the smallest safe change, and verify the result before committing.

Do not invent business rules. If a requirement is unclear, state the uncertainty and ask for Product Owner approval before encoding assumptions into the product.

## Architecture Principles

### Hosted Web First

The approved long-term product direction is a hosted web application accessed through a domain. New architecture work should move toward a secure hosted Next.js Node runtime, not deeper desktop-only coupling.

Domain-specific values must come from environment variables or deployment configuration. Do not hardcode the production domain or environment-specific URLs into application source code.

### Incremental Migration

Migration from desktop/local runtime to hosted web must be incremental. Preserve working accounting functionality while replacing infrastructure assumptions in safe phases.

Do not use a large rewrite when a smaller verified migration step can preserve behavior and reduce rollback risk.

### Electron Temporary Compatibility

Electron is transitional. It must remain supported until hosted web parity is proven and the Product Owner approves retirement.

Do not remove Electron, AppData helpers, desktop packaging, bundled runtime logic, or desktop documentation as an early migration shortcut. New work should avoid creating new Electron-only dependencies unless explicitly approved.

### Next.js

Next.js is the main application framework. Follow existing App Router, Server Action, Route Handler, rendering, and component patterns before introducing new abstractions.

The target hosted runtime is a Next.js Node runtime. The application hosting provider has not been selected yet.

### Prisma

Prisma is the database access layer and schema authority. Data changes should use typed Prisma APIs and should preserve clear model relationships.

Do not bypass Prisma for business data unless there is a documented technical reason and Product Owner approval.

### Centralized PostgreSQL

Managed PostgreSQL is the approved target centralized relational database. The exact PostgreSQL provider has not been selected yet.

SQLite remains part of the current transitional desktop/local architecture. Do not change the Prisma provider, migrations, adapter, or database configuration unless the task explicitly approves that migration step.

### Persistent Object Storage

Hosted file attachments must move toward persistent object storage. Cloudflare R2 is the preferred direction, but it has not been implemented yet.

Do not rely on application instance disk as permanent hosted storage. Local `storage/uploads/` and AppData uploads remain transitional behavior while Electron/local support exists.

### Cloudflare Free as Edge Layer

Cloudflare Free is the approved initial edge/network layer for DNS, SSL/TLS, reverse proxy, CDN where appropriate, and free-tier security protections.

Do not design core application behavior around Cloudflare paid-only features. Cloudflare is not automatically the application host, relational database, authentication system, or business logic layer.

### Secure Web Authentication

Local PIN authentication is transitional and suitable only for the current local/desktop model. Hosted public access requires real web authentication with user accounts, secure credential handling, HttpOnly session cookies, logout, rate limiting, password reset capability, and a path toward future roles/users.

The exact authentication library or provider has not been approved yet. Do not implement one without Product Owner approval.

### Infrastructure Backup Separate From Business Export

Hosted production must distinguish business data export from infrastructure backup/disaster recovery.

CSV/PDF and other business exports may remain user-facing. Managed PostgreSQL backups, PITR, object-storage backup/versioning, and production restore procedures are infrastructure responsibilities. Normal users must not be able to replace the live production database.

### Small Commits

Each commit should represent one logical change. Small commits are easier to review, test, revert, and understand later.

### Security First

The application handles sensitive financial data. Authentication, authorization, validation, error handling, auditability, rate limiting, and safe operational behavior must be considered before adding or changing behavior.

### Minimal UI

The interface should be calm, clear, and task-focused. Avoid adding controls, cards, text, or screens unless they reduce user effort or improve understanding.

## Product Philosophy

The goal is not to add as many features as possible.

The goal is to create a professional, maintainable, secure, and user-friendly accounting platform for real business operations. New functionality should make the product more reliable, understandable, and useful.

Feature count is less important than trust, clarity, data safety, and daily usability.

Stock tracking is planned after the hosted foundation is stable. Do not start Stock V1 before PostgreSQL, web authentication, persistent file storage, and core accounting parity are proven.

## UI / UX Philosophy

The dashboard is a quick overview, not a full report center. It should help users understand the current business state and the next important action quickly.

Avoid information overload. Prefer simplicity. Reduce cognitive load.

Think like an end user, not like a developer. Labels, workflows, empty states, and confirmations should match how small business users think about their work.

## Database Rules

Use small migrations with clear names.

Do not make unnecessary schema changes. Before changing a model, confirm that the change is required by the product behavior and that it will not break existing records.

Always consider data migration, backup, rollback, and restore compatibility. During the transition, this includes both current SQLite/local data and the approved PostgreSQL target.

Do not create migrations, reset databases, push schemas, change database providers, or run destructive database commands unless the task explicitly approves that action.

## Security Rules

Before implementing new features, always verify:

- Authentication
- Authorization
- Validation
- Error Handling
- Rate limiting where relevant
- Audit/log behavior where relevant

Do not expose stack traces, sensitive file paths, raw extracted text, secrets, database URLs, environment values, or private business data in the UI or logs unless there is a deliberate and safe diagnostic design.

## Verification Checklist

Before every commit, verify the relevant checks:

- `npm.cmd run lint`
- `npm.cmd run build`
- Prisma validation, if schema or Prisma code changed
- Smoke tests for affected workflows
- Documentation review, if architecture or product direction changed

Known warnings should be reported, never hidden. If a warning is accepted, explain why it is known and why it does not block the change.

## Git Standards

One logical feature equals one commit.

Use Conventional Commits, such as:

- `feat: ...`
- `fix: ...`
- `docs: ...`
- `chore: ...`

Never mix unrelated work. Never commit temporary code, debug scripts, generated build files, local databases, uploads, logs, backup ZIPs, build artifacts, or test artifacts.

Do not amend, squash, force-push, or rewrite history unless explicitly requested and approved.

## Communication Rules

Every completed task report should include:

- What changed
- Why it changed
- Files modified
- Risks
- Verification results

If something fails, report the exact failure and stop when continuing would be unsafe.

## Product Owner Approval

Medium or large features must not be implemented immediately.

For changes that affect UI, UX, database, business rules, security, deployment, or architecture, first provide:

- Analysis
- Alternatives
- Risks
- Recommendation

Then wait for Product Owner approval before implementation.

Small bug fixes may proceed immediately only when explicitly requested and clearly scoped.

## Preserve Existing Quality

Never improve one module by degrading another.

Avoid regressions. Preserve existing data, behavior, styling conventions, and user workflows unless the requested change explicitly requires altering them.

Favor stability over speed. Quality is more important than feature count.

## AI Rules

Do not guess. Do not invent business rules.

Always inspect the repository before making assumptions. Use actual code, configuration, migrations, and runtime behavior as the source of truth.

When information is missing, state the uncertainty clearly and recommend the safest next step.

MarkItDown/Python support is transitional. It may remain while Electron/local parity exists, but hosted document extraction should move toward a server-side worker/job model.

## Final Principle

When several valid solutions exist, prefer the one that is:

- Simpler
- Safer
- Easier to maintain
- Easier to understand

# Development Charter

This charter defines how this repository must be developed. It is for future developers, future ChatGPT/Codex sessions, and future maintainers.

It is not a feature list and it does not replace the README. It describes the engineering workflow, product judgment, and quality standards expected for this project.

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

↓

Risk Assessment

↓

Implementation Plan

↓

Approval

↓

Development

↓

Verification

↓

Commit

↓

Push

Do not skip directly to implementation for changes that affect UI, UX, database structure, business rules, or architecture. Understand the current repository first, identify the smallest safe change, and verify the result before committing.

## Architecture Principles

### Offline First

The application must remain useful without depending on a remote server. Local data ownership, backup discipline, and predictable desktop behavior are core product values.

### Electron

Electron provides the desktop shell and local application experience. Desktop-specific behavior should be handled carefully and should not weaken the web development workflow.

### Next.js

Next.js is the main application framework. Follow existing routing, server action, rendering, and component patterns before introducing new abstractions.

### Prisma

Prisma is the database access layer and schema authority. Data changes should use typed Prisma APIs and should preserve clear model relationships.

### SQLite

SQLite supports the offline-first local database model. Treat the database file as user data. Never run destructive database commands without explicit approval.

### Small Commits

Each commit should represent one logical change. Small commits are easier to review, test, revert, and understand later.

### Security First

Local desktop software still handles sensitive financial data. Authentication, authorization, validation, and safe error handling must be considered before adding or changing behavior.

### Minimal UI

The interface should be calm, clear, and task-focused. Avoid adding controls, cards, text, or screens unless they reduce user effort or improve understanding.

## Product Philosophy

The goal is not to add as many features as possible.

The goal is to create a professional, maintainable, and user-friendly desktop ERP platform. New functionality should make the product more reliable, understandable, and useful for real business operations.

Feature count is less important than trust, clarity, data safety, and daily usability.

## UI / UX Philosophy

The dashboard is a quick overview, not a full report center. It should help users understand the current business state and the next important action quickly.

Avoid information overload. Prefer simplicity. Reduce cognitive load.

Think like an end user, not like a developer. Labels, workflows, empty states, and confirmations should match how small business users think about their work.

## Database Rules

Use small migrations with clear names.

Do not make unnecessary schema changes. Before changing a model, confirm that the change is required by the product behavior and that it will not break existing records.

Always consider backup and restore compatibility. Schema changes must preserve user data and must be safe for local SQLite databases.

Do not create migrations, reset databases, push schemas, or run destructive database commands unless the task explicitly approves that action.

## Security Rules

Before implementing new features, always verify:

- Authentication
- Authorization
- Validation
- Error Handling

Do not expose stack traces, sensitive file paths, raw extracted text, secrets, or private business data in the UI or logs unless there is a deliberate and safe diagnostic design.

## Verification Checklist

Before every commit, verify the relevant checks:

- `npm.cmd run lint`
- `npm.cmd run build`
- Prisma validation, if schema or Prisma code changed
- Smoke tests for affected workflows

Known warnings should be reported, never hidden. If a warning is accepted, explain why it is known and why it does not block the change.

## Git Standards

One logical feature equals one commit.

Use Conventional Commits, such as:

- `feat: ...`
- `fix: ...`
- `docs: ...`
- `chore: ...`

Never mix unrelated work. Never commit temporary code, debug scripts, generated build files, local databases, uploads, logs, or test artifacts.

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

For changes that affect UI, UX, database, business rules, or architecture, first provide:

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

## Final Principle

When several valid solutions exist, prefer the one that is:

- Simpler
- Safer
- Easier to maintain
- Easier to understand

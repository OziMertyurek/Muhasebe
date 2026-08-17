# V1.0 Release Checklist

This checklist is for release-candidate verification before deploying the hosted
web application. Do not put real secrets in this file.

## Before Deploy

- Confirm Git branch is clean and reviewed.
- Run `npm.cmd exec prisma -- validate` with a PostgreSQL `DATABASE_URL`.
- Run `npm.cmd exec prisma -- generate` with a PostgreSQL `DATABASE_URL`.
- Run `npm.cmd exec tsc -- --noEmit`.
- Run `npm.cmd run lint`.
- Run `npm.cmd test`.
- Run `npm.cmd run web:package`.
- Audit `dist/hosted-web/` for forbidden files: `.env`, secrets, SQLite DBs,
  uploads, tests, source-only folders, Electron, Python worker, and native
  Windows `.node` binaries.
- Confirm the production PostgreSQL backup/restore responsibility and initial
  backup state with the hosting/database provider.
- Prepare required environment variables in the hosting control panel:
  `NODE_ENV=production`, `DATABASE_URL`, `DOCUMENT_PROCESSOR_MODE=HOSTED_SAFE`
  where no live AI provider is configured.

## Deploy

- Upload the contents of `dist/hosted-web/` to the cPanel application root.
- Extract the artifact without uploading local `node_modules`.
- Run `npm ci --omit=dev` on the hosting server.
- Run `npx prisma migrate deploy` against the clean PostgreSQL database.
- Run `npm run prisma:generate` if the client was not generated during install.
- Restart the Node.js application with startup file `app.js`.

## Verify

- Open `/api/health` and expect `{"status":"healthy"}`.
- Verify login/PIN behavior and logout.
- Multi-device hosted login smoke:
  - Device A: complete first setup, log in, and create one test Cari.
  - Device B, private browser, or phone: open the production domain, choose
    `Giriş Yap`, authenticate, and verify the same test Cari appears.
  - Confirm Device B does not repeat onboarding.
  - Log out and confirm reauthentication is required.
- Create or inspect a Cari.
- Create or inspect an Urun / Stok card.
- Create a purchase invoice and verify stock increase/payable.
- Create a sales invoice and verify stock decrease/receivable.
- Record tahsilat/odeme and verify invoice status.
- Upload a supported document.
- Verify AI hosted-safe unavailable state or configured provider review flow.
- Open dashboard and reports and compare totals to expected business data.

## After Deploy

- Keep PostgreSQL diagnostic variables disabled unless actively testing with a
  one-time token.
- Review application logs for startup, Prisma, auth, and upload errors.
- Confirm HTTPS and cookie behavior through the final domain path.
- Confirm production PostgreSQL backup strategy and restore ownership.
- Do not change DNS/Cloudflare state without Product Owner approval.

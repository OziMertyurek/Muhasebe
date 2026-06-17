/* eslint-disable @typescript-eslint/no-require-imports */
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");

const [, , databasePath, migrationsPath, standaloneRoot] = process.argv;

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function getMigrationDirectories(rootPath) {
  return fs
    .readdirSync(rootPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((first, second) => first.localeCompare(second));
}

function ensurePrismaMigrationsTable(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "checksum" TEXT NOT NULL,
      "finished_at" DATETIME,
      "migration_name" TEXT NOT NULL,
      "logs" TEXT,
      "rolled_back_at" DATETIME,
      "started_at" DATETIME NOT NULL DEFAULT current_timestamp,
      "applied_steps_count" INTEGER NOT NULL DEFAULT 0
    );
  `);
}

if (!databasePath || !migrationsPath || !standaloneRoot) {
  fail("Desktop veritabani bootstrap parametreleri eksik.");
}

if (!fs.existsSync(migrationsPath)) {
  fail("Migration klasoru bulunamadi.");
}

fs.mkdirSync(path.dirname(databasePath), { recursive: true });

const standaloneRequire = createRequire(path.join(standaloneRoot, "package.json"));
const Database = standaloneRequire("better-sqlite3");
const database = new Database(databasePath);

try {
  database.pragma("foreign_keys = ON");
  ensurePrismaMigrationsTable(database);

  const appliedMigration = database.prepare(`
    SELECT 1
    FROM "_prisma_migrations"
    WHERE "migration_name" = ? AND "rolled_back_at" IS NULL
    LIMIT 1
  `);
  const insertMigration = database.prepare(`
    INSERT INTO "_prisma_migrations" (
      "id",
      "checksum",
      "finished_at",
      "migration_name",
      "logs",
      "rolled_back_at",
      "started_at",
      "applied_steps_count"
    )
    VALUES (?, ?, datetime('now'), ?, NULL, NULL, datetime('now'), 1)
  `);

  for (const migrationName of getMigrationDirectories(migrationsPath)) {
    if (appliedMigration.get(migrationName)) {
      continue;
    }

    const migrationFilePath = path.join(migrationsPath, migrationName, "migration.sql");

    if (!fs.existsSync(migrationFilePath)) {
      continue;
    }

    const migrationSql = fs.readFileSync(migrationFilePath, "utf8");
    const checksum = crypto.createHash("sha256").update(migrationSql).digest("hex");
    const migrationId = crypto.randomUUID();

    database.exec("BEGIN");
    try {
      database.exec(migrationSql);
      insertMigration.run(migrationId, checksum, migrationName);
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  }
} finally {
  database.close();
}

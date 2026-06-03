import { defineConfig } from "prisma/config";
import { dirname, resolve } from "node:path";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";

const databaseUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";

function ensureSqliteFile(url: string) {
  if (!url.startsWith("file:") || url === "file::memory:") {
    return;
  }

  const sqlitePath = url.replace(/^file:/, "").split("?")[0];

  if (!sqlitePath || sqlitePath === ":memory:") {
    return;
  }

  const absolutePath = resolve(sqlitePath);
  const directory = dirname(absolutePath);

  if (!existsSync(directory)) {
    mkdirSync(directory, { recursive: true });
  }

  if (!existsSync(absolutePath)) {
    writeFileSync(absolutePath, "");
  }
}

ensureSqliteFile(databaseUrl);

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: databaseUrl,
  },
  migrations: {
    path: "prisma/migrations",
  },
});

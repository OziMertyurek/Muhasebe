/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = process.cwd();
const standaloneDir = path.join(projectRoot, ".next", "standalone");
const staticSourceDir = path.join(projectRoot, ".next", "static");
const publicSourceDir = path.join(projectRoot, "public");
const startupSourcePath = path.join(projectRoot, "deployment", "hosted-web", "app.js");
const artifactDir = path.join(projectRoot, "dist", "hosted-web");
const standaloneNextNodeModulesDir = path.join(standaloneDir, ".next", "node_modules");
const expectedNextVersion = "16.2.9";
const forbiddenArtifactEntries = [
  ".env",
  ".env.local",
  ".env.production",
  ".git",
  ".next/cache",
  path.join(".next", "node_modules"),
  "build",
  "deployment",
  "dist",
  "docs",
  "electron",
  "node_modules",
  "python",
  "python-worker",
  "scripts",
  "storage",
  "tests",
  path.join("prisma", "dev.db"),
  path.join("prisma", "dev.db-journal"),
  path.join("prisma", "dev.db.pin-reset-backup-20260724-104458.db"),
  path.join("prisma", "sqlite-migrations"),
  "node",
  "start-dev.bat",
  "start-prod.bat",
  "stop-info.bat",
];

function assertExists(targetPath, message) {
  if (!fs.existsSync(targetPath)) {
    throw new Error(message);
  }
}

function copyDirectory(source, target) {
  if (!fs.existsSync(source)) {
    return;
  }

  fs.rmSync(target, { recursive: true, force: true });
  fs.cpSync(source, target, {
    recursive: true,
    force: true,
    dereference: true,
  });
}

function removeForbiddenEntries() {
  for (const entry of forbiddenArtifactEntries) {
    fs.rmSync(path.join(artifactDir, entry), {
      recursive: true,
      force: true,
    });
  }
}

function getStandalonePackageAliases() {
  const aliases = new Map();

  if (!fs.existsSync(standaloneNextNodeModulesDir)) {
    return aliases;
  }

  const entries = fs.readdirSync(standaloneNextNodeModulesDir, {
    withFileTypes: true,
  });

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    if (entry.name === "pg" || entry.name.startsWith("pg-")) {
      aliases.set(entry.name, "pg");
      continue;
    }

    if (entry.name !== "@prisma") {
      continue;
    }

    const prismaDir = path.join(standaloneNextNodeModulesDir, entry.name);
    const prismaEntries = fs.readdirSync(prismaDir, { withFileTypes: true });

    for (const prismaEntry of prismaEntries) {
      if (prismaEntry.isDirectory() && prismaEntry.name.startsWith("client-")) {
        aliases.set(`@prisma/${prismaEntry.name}`, "@prisma/client");
      }
    }
  }

  return aliases;
}

function addFallbackStandalonePackageAliases(aliases) {
  const patterns = [
    {
      pattern: /@prisma\/client-[0-9a-f]+/g,
      packageName: "@prisma/client",
    },
    {
      pattern: /pg-[0-9a-f]+/g,
      packageName: "pg",
    },
  ];
  const stack = [artifactDir];

  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }

      if (!entry.isFile() || ![".js", ".mjs", ".cjs"].includes(path.extname(entry.name))) {
        continue;
      }

      const content = fs.readFileSync(fullPath, "utf8");

      for (const { pattern, packageName } of patterns) {
        for (const match of content.matchAll(pattern)) {
          aliases.set(match[0], packageName);
        }
      }
    }
  }
}

function rewriteStandaloneExternalAliases(aliases) {
  addFallbackStandalonePackageAliases(aliases);

  if (aliases.size === 0) {
    return;
  }

  const extensions = new Set([".js", ".mjs", ".cjs"]);
  const stack = [artifactDir];

  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }

      if (!entry.isFile() || !extensions.has(path.extname(entry.name))) {
        continue;
      }

      let content = fs.readFileSync(fullPath, "utf8");
      let updated = content;

      for (const [fromPackage, toPackage] of aliases) {
        updated = updated.split(fromPackage).join(toPackage);
      }

      if (updated !== content) {
        fs.writeFileSync(fullPath, updated);
      }
    }
  }
}

function copyPrismaSchema() {
  const sourceSchemaPath = path.join(projectRoot, "prisma", "schema.prisma");
  const targetSchemaPath = path.join(artifactDir, "prisma", "schema.prisma");

  assertExists(sourceSchemaPath, "Prisma schema is missing.");
  fs.mkdirSync(path.dirname(targetSchemaPath), { recursive: true });
  fs.copyFileSync(sourceSchemaPath, targetSchemaPath);
}

function copyPrismaConfig() {
  const sourceConfigPath = path.join(projectRoot, "prisma.config.ts");
  const targetConfigPath = path.join(artifactDir, "prisma.config.ts");

  assertExists(sourceConfigPath, "Prisma config is missing.");
  fs.copyFileSync(sourceConfigPath, targetConfigPath);
}

function copyPrismaMigrations() {
  const sourceMigrationsPath = path.join(projectRoot, "prisma", "migrations");
  const targetMigrationsPath = path.join(artifactDir, "prisma", "migrations");

  if (!fs.existsSync(sourceMigrationsPath)) {
    return;
  }

  copyDirectory(sourceMigrationsPath, targetMigrationsPath);
}

function copyGeneratedPrismaClient() {
  const sourceGeneratedClientPath = path.join(projectRoot, "src", "generated", "prisma");
  const targetGeneratedClientPath = path.join(artifactDir, "src", "generated", "prisma");

  assertExists(sourceGeneratedClientPath, "Generated Prisma client is missing. Run prisma generate first.");
  copyDirectory(sourceGeneratedClientPath, targetGeneratedClientPath);
}

function pruneSourceExceptGeneratedPrismaClient() {
  const artifactSourcePath = path.join(artifactDir, "src");
  const generatedPrismaPath = path.join(artifactSourcePath, "generated", "prisma");
  const preservedClientPath = path.join(artifactDir, ".prisma-generated-client-tmp");

  if (!fs.existsSync(generatedPrismaPath)) {
    return;
  }

  copyDirectory(generatedPrismaPath, preservedClientPath);
  fs.rmSync(artifactSourcePath, { recursive: true, force: true });
  copyDirectory(preservedClientPath, generatedPrismaPath);
  fs.rmSync(preservedClientPath, { recursive: true, force: true });
}

function copyPackageMetadata() {
  for (const fileName of ["package.json", "package-lock.json"]) {
    const sourcePath = path.join(projectRoot, fileName);

    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, path.join(artifactDir, fileName));
    }
  }
}

function failIfForbiddenFilesRemain() {
  const forbiddenPatterns = [
    /(^|[\\/])\.env($|[\\/])/,
    /(^|[\\/])\.env\./,
    /(^|[\\/])\.git($|[\\/])/,
    /(^|[\\/])node_modules($|[\\/])/,
    /(^|[\\/])[^\\/]+\.node$/,
    /(^|[\\/])dev\.db(-journal)?$/,
    /^storage([\\/]|$)/,
    /^build([\\/]|$)/,
    /^dist([\\/]|$)/,
    /^docs([\\/]|$)/,
    /^deployment([\\/]|$)/,
    /^electron([\\/]|$)/,
    /^scripts([\\/]|$)/,
    /^tests([\\/]|$)/,
    /^python([\\/]|$)/,
    /^python-worker([\\/]|$)/,
    /(^|[\\/]).+\.bat$/,
    /sharp-win32/,
    /win32/,
    /C:[\\/]Windows[\\/]Fonts/,
  ];
  const stack = [artifactDir];

  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      const relativePath = path.relative(artifactDir, fullPath);
      const normalizedRelativePath = relativePath.split(path.sep).join("/");

      if (
        normalizedRelativePath.startsWith("src/")
        && normalizedRelativePath !== "src/generated"
        && normalizedRelativePath !== "src/generated/prisma"
        && !normalizedRelativePath.startsWith("src/generated/prisma/")
      ) {
        throw new Error(`Forbidden deployment artifact entry found: ${relativePath}`);
      }

      if (forbiddenPatterns.some((pattern) => pattern.test(relativePath))) {
        throw new Error(`Forbidden deployment artifact entry found: ${relativePath}`);
      }

      if (entry.isDirectory()) {
        stack.push(fullPath);
      }
    }
  }
}

function writeArtifactMetadata() {
  const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, "package.json"), "utf8"));
  const metadata = {
    name: packageJson.name,
    version: packageJson.version,
    target: "hosted-web-cpanel",
    generatedAt: new Date().toISOString(),
    startupFile: "app.js",
    healthPath: "/api/health",
  };

  fs.writeFileSync(
    path.join(artifactDir, "deploy-info.json"),
    `${JSON.stringify(metadata, null, 2)}\n`,
  );
}

function assertPinnedNextVersion() {
  const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, "package.json"), "utf8"));
  const packageLock = JSON.parse(fs.readFileSync(path.join(projectRoot, "package-lock.json"), "utf8"));
  const packageNextVersion = packageJson.dependencies?.next;
  const lockRootNextVersion = packageLock.packages?.[""]?.dependencies?.next;
  const lockedNextVersion = packageLock.packages?.["node_modules/next"]?.version;

  if (
    packageNextVersion !== expectedNextVersion
    || lockRootNextVersion !== expectedNextVersion
    || lockedNextVersion !== expectedNextVersion
  ) {
    throw new Error(
      `Next version skew detected. Expected package and lockfile Next ${expectedNextVersion}.`,
    );
  }
}

assertExists(standaloneDir, "Next standalone output is missing. Run npm run web:build first.");
assertExists(path.join(standaloneDir, "server.js"), "Next standalone server.js is missing.");
assertExists(startupSourcePath, "Hosted web startup file template is missing.");
assertPinnedNextVersion();

const standalonePackageAliases = getStandalonePackageAliases();

fs.rmSync(artifactDir, { recursive: true, force: true });
fs.mkdirSync(path.dirname(artifactDir), { recursive: true });
fs.cpSync(standaloneDir, artifactDir, {
  recursive: true,
  force: true,
  dereference: true,
});

rewriteStandaloneExternalAliases(standalonePackageAliases);
copyDirectory(staticSourceDir, path.join(artifactDir, ".next", "static"));
copyDirectory(publicSourceDir, path.join(artifactDir, "public"));
fs.copyFileSync(startupSourcePath, path.join(artifactDir, "app.js"));
copyPackageMetadata();
copyPrismaConfig();
copyPrismaSchema();
copyPrismaMigrations();
copyGeneratedPrismaClient();
removeForbiddenEntries();
pruneSourceExceptGeneratedPrismaClient();
writeArtifactMetadata();
failIfForbiddenFilesRemain();

console.log(`Hosted web deployment artifact prepared: ${path.relative(projectRoot, artifactDir)}`);
console.log("cPanel Application startup file: app.js");

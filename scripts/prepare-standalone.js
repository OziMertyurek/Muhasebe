/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = process.cwd();
const standaloneDir = path.join(projectRoot, ".next", "standalone");
const staticSourceDir = path.join(projectRoot, ".next", "static");
const staticTargetDir = path.join(standaloneDir, ".next", "static");
const nativePlatformArch = `${process.platform}-${process.arch}`;

const forbiddenStandaloneEntries = [
  "dist",
  "storage",
  path.join("prisma", "dev.db"),
  path.join("prisma", "dev.db-journal"),
];

function copyStaticAssets() {
  if (!fs.existsSync(staticSourceDir)) {
    return;
  }

  fs.cpSync(staticSourceDir, staticTargetDir, {
    recursive: true,
    force: true,
  });
}

function cleanForbiddenStandaloneEntries() {
  for (const entry of forbiddenStandaloneEntries) {
    fs.rmSync(path.join(standaloneDir, entry), {
      recursive: true,
      force: true,
    });
  }
}

function replaceLinkWithCopy(targetPath) {
  const realPath = fs.realpathSync(targetPath);
  fs.rmSync(targetPath, {
    recursive: true,
    force: true,
  });
  fs.cpSync(realPath, targetPath, {
    recursive: true,
    force: true,
    dereference: true,
  });
}

function replaceLinksInTree(rootDir) {
  if (!fs.existsSync(rootDir)) {
    return;
  }

  const entries = fs.readdirSync(rootDir, {
    withFileTypes: true,
  });

  for (const entry of entries) {
    const entryPath = path.join(rootDir, entry.name);
    const stats = fs.lstatSync(entryPath);

    if (stats.isSymbolicLink()) {
      replaceLinkWithCopy(entryPath);
      continue;
    }

    if (stats.isDirectory()) {
      replaceLinksInTree(entryPath);
    }
  }
}

function copyRuntimePackageToStandalone(packageName) {
  const sourcePackageDir = path.join(projectRoot, "node_modules", ...packageName.split("/"));
  const targetPackageDir = path.join(standaloneDir, "node_modules", ...packageName.split("/"));

  if (!fs.existsSync(sourcePackageDir)) {
    throw new Error(`${packageName} runtime paketi bulunamadi. Once npm install calistirin.`);
  }

  fs.rmSync(targetPackageDir, {
    recursive: true,
    force: true,
  });
  fs.cpSync(sourcePackageDir, targetPackageDir, {
    recursive: true,
    force: true,
    dereference: true,
  });
}

function copyBetterSqliteNativeBinding() {
  const sourceBindingPath = path.join(
    projectRoot,
    "node_modules",
    "better-sqlite3",
    "build",
    "Release",
    "better_sqlite3.node",
  );

  if (!fs.existsSync(sourceBindingPath)) {
    throw new Error("better-sqlite3 native binding bulunamadi. Once npm install calistirin.");
  }

  const targetBetterSqliteDir = path.join(
    standaloneDir,
    "node_modules",
    "better-sqlite3",
  );
  const releaseTargetPath = path.join(
    targetBetterSqliteDir,
    "build",
    "Release",
    "better_sqlite3.node",
  );
  const bindingTargetPath = path.join(
    targetBetterSqliteDir,
    "lib",
    "binding",
    `node-v${process.versions.modules}-${nativePlatformArch}`,
    "better_sqlite3.node",
  );

  for (const targetPath of [releaseTargetPath, bindingTargetPath]) {
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.copyFileSync(sourceBindingPath, targetPath);
  }
}

cleanForbiddenStandaloneEntries();
copyStaticAssets();
replaceLinksInTree(standaloneDir);
copyRuntimePackageToStandalone("@prisma/client-runtime-utils");
copyBetterSqliteNativeBinding();

/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = process.cwd();
const standaloneDir = path.join(projectRoot, ".next", "standalone");
const staticSourceDir = path.join(projectRoot, ".next", "static");
const staticTargetDir = path.join(standaloneDir, ".next", "static");

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

cleanForbiddenStandaloneEntries();
copyStaticAssets();
replaceLinksInTree(standaloneDir);

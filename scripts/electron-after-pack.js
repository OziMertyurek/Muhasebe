/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");

const forbiddenEntries = [
  "dist",
  "storage",
  path.join("prisma", "dev.db"),
  path.join("prisma", "dev.db-journal"),
];

function removeForbiddenEntries(targetDir) {
  for (const entry of forbiddenEntries) {
    fs.rmSync(path.join(targetDir, entry), {
      recursive: true,
      force: true,
    });
  }
}

exports.default = async function afterPack(context) {
  const sourceStandaloneDir = path.join(context.packager.projectDir, ".next", "standalone");
  const targetStandaloneDir = path.join(context.appOutDir, "resources", "standalone");

  if (!fs.existsSync(sourceStandaloneDir)) {
    throw new Error("Standalone build bulunamadi. Once npm run build calistirin.");
  }

  fs.rmSync(targetStandaloneDir, {
    recursive: true,
    force: true,
  });

  fs.cpSync(sourceStandaloneDir, targetStandaloneDir, {
    recursive: true,
    force: true,
    dereference: true,
  });

  removeForbiddenEntries(targetStandaloneDir);
};

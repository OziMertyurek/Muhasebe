/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = process.cwd();
const artifactDir = path.join(projectRoot, "dist", "hosted-web");
const generatedClientDir = path.join(artifactDir, "src", "generated", "prisma");
const forbiddenPatterns = [
  ".prisma/client/default",
  ".prisma\\client\\default",
  "@prisma/client/default",
];

function assertExists(targetPath, message) {
  if (!fs.existsSync(targetPath)) {
    throw new Error(message);
  }
}

function assertNoForbiddenRuntimeReference() {
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

      if (!entry.isFile() || ![".js", ".json", ".ts", ".mjs", ".cjs"].includes(path.extname(entry.name))) {
        continue;
      }

      const content = fs.readFileSync(fullPath, "utf8");
      const forbiddenPattern = forbiddenPatterns.find((pattern) => content.includes(pattern));

      if (forbiddenPattern) {
        throw new Error(
          `Forbidden Prisma runtime reference "${forbiddenPattern}" found in ${path.relative(artifactDir, fullPath)}`,
        );
      }
    }
  }
}

assertExists(artifactDir, "Hosted artifact is missing. Run npm run web:package first.");
assertExists(path.join(generatedClientDir, "client.ts"), "Explicit generated Prisma client is missing from hosted artifact.");
assertExists(path.join(generatedClientDir, "internal", "class.ts"), "Generated Prisma client internals are missing from hosted artifact.");
assertNoForbiddenRuntimeReference();

console.log("Hosted Prisma runtime audit passed.");

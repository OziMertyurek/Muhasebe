/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = process.cwd();
const standaloneDir = path.join(projectRoot, ".next", "standalone");
const staticSourceDir = path.join(projectRoot, ".next", "static");
const publicSourceDir = path.join(projectRoot, "public");
const startupSourcePath = path.join(projectRoot, "deployment", "hosted-web", "app.js");
const artifactDir = path.join(projectRoot, "dist", "hosted-web");
const nativePlatformArch = `${process.platform}-${process.arch}`;
const nextCompiledServerRuntimePackagePath = path.join(
  "next",
  "dist",
  "compiled",
  "next-server",
);
const requiredNextServerRuntimeFiles = [
  "app-route-turbo.runtime.prod.js",
];
const forbiddenArtifactEntries = [
  ".env",
  ".env.local",
  ".env.production",
  ".git",
  ".next/cache",
  "build",
  "dist",
  "storage",
  path.join("prisma", "dev.db"),
  path.join("prisma", "dev.db-journal"),
  "python",
  "node",
  "electron",
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

function copyRuntimePackage(packageName) {
  const sourcePackageDir = path.join(projectRoot, "node_modules", ...packageName.split("/"));
  const targetPackageDir = path.join(artifactDir, "node_modules", ...packageName.split("/"));

  assertExists(sourcePackageDir, `${packageName} runtime package is missing. Run npm install first.`);
  copyDirectory(sourcePackageDir, targetPackageDir);
}

function copyNextCompiledServerRuntimes() {
  const sourceRuntimeDir = path.join(
    projectRoot,
    "node_modules",
    nextCompiledServerRuntimePackagePath,
  );
  const targetRuntimeDir = path.join(
    artifactDir,
    "node_modules",
    nextCompiledServerRuntimePackagePath,
  );

  assertExists(sourceRuntimeDir, "Next compiled server runtime folder is missing. Run npm install first.");

  for (const fileName of requiredNextServerRuntimeFiles) {
    assertExists(
      path.join(sourceRuntimeDir, fileName),
      `Next compiled server runtime file is missing: ${fileName}`,
    );
  }

  copyDirectory(sourceRuntimeDir, targetRuntimeDir);
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

  assertExists(sourceBindingPath, "better-sqlite3 native binding is missing. Run npm install first.");

  const targetBetterSqliteDir = path.join(
    artifactDir,
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

function removeForbiddenEntries() {
  for (const entry of forbiddenArtifactEntries) {
    fs.rmSync(path.join(artifactDir, entry), {
      recursive: true,
      force: true,
    });
  }
}

function failIfForbiddenFilesRemain() {
  const forbiddenPatterns = [
    /(^|[\\/])\.env($|[\\/])/,
    /(^|[\\/])\.env\./,
    /(^|[\\/])dev\.db(-journal)?$/,
    /^storage([\\/]|$)/,
    /^build([\\/]|$)/,
    /^electron([\\/]|$)/,
    /^python([\\/]|$)/,
  ];
  const stack = [artifactDir];

  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      const relativePath = path.relative(artifactDir, fullPath);

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

assertExists(standaloneDir, "Next standalone output is missing. Run npm run web:build first.");
assertExists(path.join(standaloneDir, "server.js"), "Next standalone server.js is missing.");
assertExists(startupSourcePath, "Hosted web startup file template is missing.");

fs.rmSync(artifactDir, { recursive: true, force: true });
fs.mkdirSync(path.dirname(artifactDir), { recursive: true });
fs.cpSync(standaloneDir, artifactDir, {
  recursive: true,
  force: true,
  dereference: true,
});

copyDirectory(staticSourceDir, path.join(artifactDir, ".next", "static"));
copyDirectory(publicSourceDir, path.join(artifactDir, "public"));
fs.copyFileSync(startupSourcePath, path.join(artifactDir, "app.js"));
copyNextCompiledServerRuntimes();
copyRuntimePackage("@prisma/client-runtime-utils");
copyBetterSqliteNativeBinding();
removeForbiddenEntries();
writeArtifactMetadata();
failIfForbiddenFilesRemain();

console.log(`Hosted web deployment artifact prepared: ${path.relative(projectRoot, artifactDir)}`);
console.log("cPanel Application startup file: app.js");

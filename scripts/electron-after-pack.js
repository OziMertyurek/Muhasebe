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

function ensureElectronEntrypoint(context) {
  const sourcePackagePath = path.join(context.packager.projectDir, "package.json");
  const targetPackagePath = path.join(context.appOutDir, "resources", "app", "package.json");

  if (!fs.existsSync(targetPackagePath)) {
    throw new Error("Packaged app package.json bulunamadi.");
  }

  const sourcePackage = JSON.parse(fs.readFileSync(sourcePackagePath, "utf8"));
  const targetPackage = JSON.parse(fs.readFileSync(targetPackagePath, "utf8"));
  const nextPackage = {
    ...targetPackage,
    name: targetPackage.name || sourcePackage.name,
    version: targetPackage.version || sourcePackage.version,
    productName: targetPackage.productName || sourcePackage.build?.productName,
    main: "electron/main.js",
  };

  fs.writeFileSync(targetPackagePath, `${JSON.stringify(nextPackage, null, 2)}\n`);
}

function copyBundledNodeRuntime(context) {
  if (process.platform !== "win32") {
    return;
  }

  const sourceNodePath = process.execPath;
  const targetNodeDir = path.join(context.appOutDir, "resources", "node");
  const targetNodePath = path.join(targetNodeDir, "node.exe");

  if (!fs.existsSync(sourceNodePath)) {
    throw new Error("Node runtime bulunamadi. Portable paket icin node.exe kopyalanamadi.");
  }

  fs.rmSync(targetNodeDir, {
    recursive: true,
    force: true,
  });
  fs.mkdirSync(targetNodeDir, {
    recursive: true,
  });
  fs.copyFileSync(sourceNodePath, targetNodePath);
}

function copyBundledPythonRuntime(context) {
  if (process.platform !== "win32") {
    return;
  }

  const sourcePythonDir = path.join(context.packager.projectDir, "build", "python");
  const sourcePythonPath = path.join(sourcePythonDir, "python.exe");
  const targetPythonDir = path.join(context.appOutDir, "resources", "python");

  if (!fs.existsSync(sourcePythonPath)) {
    console.warn(
      "Bundled Python runtime bulunamadi. Paket sistem Python fallback kullanabilir; prepare:bundled-python calistirin.",
    );
    return;
  }

  fs.rmSync(targetPythonDir, {
    recursive: true,
    force: true,
  });
  fs.cpSync(sourcePythonDir, targetPythonDir, {
    recursive: true,
    force: true,
    dereference: true,
  });
}

function copyBetterSqliteNativeBinding(context) {
  const sourceBindingPath = path.join(
    context.packager.projectDir,
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
    context.appOutDir,
    "resources",
    "standalone",
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
    `node-v${process.versions.modules}-win32-x64`,
    "better_sqlite3.node",
  );

  for (const targetPath of [releaseTargetPath, bindingTargetPath]) {
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.copyFileSync(sourceBindingPath, targetPath);
  }
}

function copyRuntimePackageToStandalone(context, packageName) {
  const sourcePackageDir = path.join(context.packager.projectDir, "node_modules", ...packageName.split("/"));
  const targetPackageDir = path.join(
    context.appOutDir,
    "resources",
    "standalone",
    "node_modules",
    ...packageName.split("/"),
  );

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
  copyRuntimePackageToStandalone(context, "@prisma/client-runtime-utils");
  copyBetterSqliteNativeBinding(context);
  ensureElectronEntrypoint(context);
  copyBundledNodeRuntime(context);
  copyBundledPythonRuntime(context);
};

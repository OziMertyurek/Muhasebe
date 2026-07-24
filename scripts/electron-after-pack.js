/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");

const forbiddenEntries = [
  "dist",
  "storage",
  path.join("prisma", "dev.db"),
  path.join("prisma", "dev.db-journal"),
];
const nextCompiledServerRuntimePackagePath = path.join(
  "next",
  "dist",
  "compiled",
  "next-server",
);
const requiredNextServerRuntimeFiles = [
  "app-route-turbo.runtime.prod.js",
];

function getTargetPlatform(context) {
  return context.electronPlatformName || process.platform;
}

function getTargetArch(context) {
  const arch = context.arch;

  if (typeof arch === "string") {
    return arch;
  }

  const archMap = new Map([
    [0, "ia32"],
    [1, "x64"],
    [2, "armv7l"],
    [3, "arm64"],
  ]);

  return archMap.get(arch) || process.arch;
}

function getPlatformArchKey(context) {
  return `${getTargetPlatform(context)}-${getTargetArch(context)}`;
}

function getResourcesDir(context) {
  const platform = getTargetPlatform(context);

  if (platform !== "darwin") {
    return path.join(context.appOutDir, "resources");
  }

  const appInfo = context.packager.appInfo;
  const appFileName = appInfo?.productFilename || appInfo?.productName || "Muhasebe Takip";
  const candidates = [
    path.join(context.appOutDir, `${appFileName}.app`, "Contents", "Resources"),
    path.join(context.appOutDir, "Muhasebe Takip.app", "Contents", "Resources"),
    path.join(context.appOutDir, "Contents", "Resources"),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) || candidates[0];
}

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
  const targetPackagePath = path.join(getResourcesDir(context), "app", "package.json");

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
  const targetPlatform = getTargetPlatform(context);
  const targetArch = getTargetArch(context);
  const platformArchKey = getPlatformArchKey(context);
  const envSourceKey = `NODE_BUNDLE_SOURCE_${platformArchKey.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;
  const configuredSource = process.env[envSourceKey] || process.env.NODE_BUNDLE_SOURCE;
  const sourceNodePath =
    configuredSource ||
    (process.platform === targetPlatform && process.arch === targetArch
      ? process.execPath
      : "");
  const targetNodeDir =
    targetPlatform === "win32"
      ? path.join(getResourcesDir(context), "node")
      : path.join(getResourcesDir(context), "node", platformArchKey, "bin");
  const targetNodePath = path.join(targetNodeDir, targetPlatform === "win32" ? "node.exe" : "node");

  if (!fs.existsSync(sourceNodePath)) {
    console.warn(
      `Bundled Node runtime bulunamadi (${platformArchKey}). Paket sistem Node fallback kullanabilir; ${envSourceKey} ayarlayin.`,
    );
    return;
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
  const targetPlatform = getTargetPlatform(context);
  const platformArchKey = getPlatformArchKey(context);
  const sourcePythonDir =
    targetPlatform === "win32"
      ? path.join(context.packager.projectDir, "build", "python")
      : path.join(context.packager.projectDir, "build", "python", platformArchKey);
  const sourcePythonPath = path.join(
    sourcePythonDir,
    ...(targetPlatform === "win32" ? ["python.exe"] : ["bin", "python3"]),
  );
  const targetPythonDir =
    targetPlatform === "win32"
      ? path.join(getResourcesDir(context), "python")
      : path.join(getResourcesDir(context), "python", platformArchKey);

  if (!fs.existsSync(sourcePythonPath)) {
    console.warn(
      `Bundled Python runtime bulunamadi (${platformArchKey}). Paket sistem Python fallback kullanabilir; prepare:bundled-python calistirin.`,
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
    getResourcesDir(context),
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
    `node-v${process.versions.modules}-${getPlatformArchKey(context)}`,
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
    getResourcesDir(context),
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

function copyNextCompiledServerRuntimes(context) {
  const sourceRuntimeDir = path.join(
    context.packager.projectDir,
    "node_modules",
    nextCompiledServerRuntimePackagePath,
  );
  const targetRuntimeDir = path.join(
    getResourcesDir(context),
    "standalone",
    "node_modules",
    nextCompiledServerRuntimePackagePath,
  );

  if (!fs.existsSync(sourceRuntimeDir)) {
    throw new Error("Next compiled server runtime klasoru bulunamadi. Once npm install calistirin.");
  }

  for (const fileName of requiredNextServerRuntimeFiles) {
    if (!fs.existsSync(path.join(sourceRuntimeDir, fileName))) {
      throw new Error(`Next compiled server runtime dosyasi bulunamadi: ${fileName}`);
    }
  }

  fs.rmSync(targetRuntimeDir, {
    recursive: true,
    force: true,
  });
  fs.cpSync(sourceRuntimeDir, targetRuntimeDir, {
    recursive: true,
    force: true,
    dereference: true,
  });
}

exports.default = async function afterPack(context) {
  const sourceStandaloneDir = path.join(context.packager.projectDir, ".next", "standalone");
  const targetStandaloneDir = path.join(getResourcesDir(context), "standalone");

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
  copyNextCompiledServerRuntimes(context);
  copyRuntimePackageToStandalone(context, "@prisma/client-runtime-utils");
  copyBetterSqliteNativeBinding(context);
  ensureElectronEntrypoint(context);
  copyBundledNodeRuntime(context);
  copyBundledPythonRuntime(context);
};

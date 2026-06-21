/* eslint-disable @typescript-eslint/no-require-imports */
const electron = require("electron");
const { execFileSync, spawn } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const APP_NAME = "Muhasebe Takip";
const DESKTOP_DATA_FOLDER_NAME = "MuhasebeTakip";
const EARLY_STARTUP_LOG_PATH = path.join(
  process.env.APPDATA || process.cwd(),
  DESKTOP_DATA_FOLDER_NAME,
  "logs",
  "startup.log",
);

if (!electron.app) {
  try {
    fs.mkdirSync(path.dirname(EARLY_STARTUP_LOG_PATH), { recursive: true });
    fs.appendFileSync(
      EARLY_STARTUP_LOG_PATH,
      `[${new Date().toISOString()}] electron-app-unavailable ELECTRON_RUN_AS_NODE is set or Electron app module could not be loaded.\n`,
    );
  } catch {
    // Early startup logging is best-effort only.
  }

  process.stderr.write(
    "Muhasebe Takip Electron uygulamasi baslatilamadi. ELECTRON_RUN_AS_NODE ortam degiskenini temizleyin.\n",
  );
  process.exit(1);
}

const { app, BrowserWindow, shell } = electron;
app.setName(APP_NAME);

const APP_URL = process.env.ELECTRON_START_URL || "http://localhost:3000";
const SERVER_MODE =
  process.env.ELECTRON_SERVER_MODE === "production" || app.isPackaged ? "production" : "development";
const PROJECT_ROOT = app.isPackaged ? path.join(process.resourcesPath, "app") : path.join(__dirname, "..");
const APP_ICON_PATH = path.join(PROJECT_ROOT, "assets", "icon.ico");
const STANDALONE_SERVER_PATH = app.isPackaged
  ? resolveFirstExistingPath([
      path.join(process.resourcesPath, "standalone", "server.js"),
      path.join(process.resourcesPath, "app", ".next", "standalone", "server.js"),
      path.join(process.resourcesPath, "app", "resources", "standalone", "server.js"),
    ])
  : path.join(PROJECT_ROOT, ".next", "standalone", "server.js");
const STANDALONE_ROOT = path.dirname(STANDALONE_SERVER_PATH);
const DESKTOP_APP_DATA_DIR = path.join(app.getPath("appData"), DESKTOP_DATA_FOLDER_NAME);
const DESKTOP_DATABASE_PATH = path.join(DESKTOP_APP_DATA_DIR, "database", "dev.db");
const DESKTOP_DATABASE_URL = `file:${DESKTOP_DATABASE_PATH.replace(/\\/g, "/")}`;
const LOCAL_DATABASE_URL = `file:${path.join(PROJECT_ROOT, "prisma", "dev.db").replace(/\\/g, "/")}`;
const DESKTOP_BOOTSTRAP_SCRIPT_PATH = resolveFirstExistingPath([
  path.join(PROJECT_ROOT, "electron", "desktop-db-bootstrap.js"),
  path.join(process.resourcesPath || "", "app", "electron", "desktop-db-bootstrap.js"),
]);
const DESKTOP_MIGRATIONS_PATH = resolveFirstExistingPath([
  path.join(PROJECT_ROOT, "prisma", "migrations"),
  path.join(process.resourcesPath || "", "app", "prisma", "migrations"),
]);
const BUNDLED_NODE_PATH = resolveFirstExistingPath(getBundledNodeCandidates());
const BUNDLED_PYTHON_PATH = resolveFirstExistingPath(getBundledPythonCandidates());
const STARTUP_LOG_PATH = path.join(DESKTOP_APP_DATA_DIR, "logs", "startup.log");
const SERVER_CHECK_TIMEOUT_MS = 2500;
const SERVER_START_TIMEOUT_MS = 60000;
const SERVER_POLL_INTERVAL_MS = 1000;
const DOWNLOADS_FOLDER_NAME = DESKTOP_DATA_FOLDER_NAME;
const NODE_RUNTIME_MISSING_MESSAGE = "Node runtime bulunamadi. Uygulama sunucusu baslatilamadi.";

let nextServerProcess = null;
let nextDevServerPortOwnerPid = null;
let startedNextServer = false;
let isCleaningUp = false;
let serverStartupError = null;
let desktopRuntimePrepared = false;

function resolveFirstExistingPath(candidates) {
  return candidates.find((candidate) => candidate && fs.existsSync(candidate)) || candidates[0];
}

function getPlatformArchKey() {
  return `${process.platform}-${process.arch}`;
}

function getBundledNodeCandidates() {
  const resourcesRoot = process.resourcesPath || PROJECT_ROOT;

  if (process.platform === "win32") {
    return [
      path.join(resourcesRoot, "node", "node.exe"),
      path.join(resourcesRoot, "node", "win32-x64", "node.exe"),
    ];
  }

  if (process.platform === "darwin") {
    return [path.join(resourcesRoot, "node", getPlatformArchKey(), "bin", "node")];
  }

  return [path.join(resourcesRoot, "node", getPlatformArchKey(), "bin", "node")];
}

function getBundledPythonCandidates() {
  const resourcesRoot = process.resourcesPath || PROJECT_ROOT;

  if (process.platform === "win32") {
    return [
      path.join(resourcesRoot, "python", "python.exe"),
      path.join(resourcesRoot, "python", "win32-x64", "python.exe"),
    ];
  }

  if (process.platform === "darwin") {
    return [path.join(resourcesRoot, "python", getPlatformArchKey(), "bin", "python3")];
  }

  return [path.join(resourcesRoot, "python", getPlatformArchKey(), "bin", "python3")];
}

function redactValue(value) {
  if (value === null || value === undefined || value === "") {
    return value;
  }

  return "[set]";
}

function serializeLogDetails(details = {}) {
  return Object.entries(details)
    .map(([key, value]) => `${key}=${value instanceof Error ? value.message : String(value)}`)
    .join(" ");
}

function writeStartupLog(message, details) {
  const line = `[${new Date().toISOString()}] ${message}${
    details ? ` ${serializeLogDetails(details)}` : ""
  }\n`;

  try {
    fs.mkdirSync(path.dirname(STARTUP_LOG_PATH), { recursive: true });
    fs.appendFileSync(STARTUP_LOG_PATH, line);
  } catch {
    try {
      const fallbackLogDir = path.join(app.getPath("userData"), "logs");
      fs.mkdirSync(fallbackLogDir, { recursive: true });
      fs.appendFileSync(path.join(fallbackLogDir, "startup.log"), line);
    } catch {
      // Startup logging must never prevent the app from opening.
    }
  }
}

function buildChildProcessEnv(overrides = {}) {
  const env = {
    ...process.env,
    ...overrides,
  };

  delete env.ELECTRON_RUN_AS_NODE;

  if (app.isPackaged && fs.existsSync(BUNDLED_PYTHON_PATH)) {
    env.BUNDLED_PYTHON_PATH = BUNDLED_PYTHON_PATH;
    env.MARKITDOWN_PYTHON = BUNDLED_PYTHON_PATH;
  }

  if (app.isPackaged && fs.existsSync(BUNDLED_NODE_PATH)) {
    env.BUNDLED_NODE_PATH = BUNDLED_NODE_PATH;
  }

  return env;
}

function getNodeRuntimeCommand() {
  if (app.isPackaged && fs.existsSync(BUNDLED_NODE_PATH)) {
    return {
      command: BUNDLED_NODE_PATH,
      label: "bundled-node",
    };
  }

  return {
    command: process.platform === "win32" ? "node.exe" : "node",
    label: "system-node",
  };
}

function isNodeRuntimeMissingError(error) {
  const code = error?.code;
  const message = String(error?.message || "");
  return code === "ENOENT" && /node/i.test(message);
}

function logStartupSnapshot() {
  writeStartupLog("startup", {
    packaged: app.isPackaged,
    mode: SERVER_MODE,
    cwd: process.cwd(),
    appPath: app.getAppPath(),
    resourcesPath: process.resourcesPath,
    userData: app.getPath("userData"),
    platform: process.platform,
    arch: process.arch,
    standaloneServerExists: fs.existsSync(STANDALONE_SERVER_PATH),
    bootstrapScriptExists: fs.existsSync(DESKTOP_BOOTSTRAP_SCRIPT_PATH),
    migrationsExists: fs.existsSync(DESKTOP_MIGRATIONS_PATH),
    bundledNodeExists: fs.existsSync(BUNDLED_NODE_PATH),
    bundledPythonExists: fs.existsSync(BUNDLED_PYTHON_PATH),
    nodeRuntime: fs.existsSync(BUNDLED_NODE_PATH) ? "bundled" : "fallback",
    pythonRuntime: fs.existsSync(BUNDLED_PYTHON_PATH) ? "bundled" : "fallback",
    databaseUrl: redactValue(getServerDatabaseUrl()),
  });
}

function getServerDatabaseUrl() {
  return app.isPackaged ? DESKTOP_DATABASE_URL : process.env.DATABASE_URL || LOCAL_DATABASE_URL;
}

function getServerAppMode() {
  return app.isPackaged ? "desktop" : process.env.APP_MODE;
}

function ensureDesktopDataDirectories() {
  const dirs = [
    path.dirname(DESKTOP_DATABASE_PATH),
    path.join(DESKTOP_APP_DATA_DIR, "uploads"),
    path.join(DESKTOP_APP_DATA_DIR, "restore-backups"),
    path.join(DESKTOP_APP_DATA_DIR, "backups"),
    path.join(DESKTOP_APP_DATA_DIR, "logs"),
  ];

  for (const dir of dirs) {
    fs.mkdirSync(dir, { recursive: true });
  }

  writeStartupLog("desktop-data-directories-ready", {
    databaseDir: fs.existsSync(path.dirname(DESKTOP_DATABASE_PATH)),
    uploadsDir: fs.existsSync(path.join(DESKTOP_APP_DATA_DIR, "uploads")),
    restoreBackupsDir: fs.existsSync(path.join(DESKTOP_APP_DATA_DIR, "restore-backups")),
    backupsDir: fs.existsSync(path.join(DESKTOP_APP_DATA_DIR, "backups")),
    logsDir: fs.existsSync(path.join(DESKTOP_APP_DATA_DIR, "logs")),
  });
}

function runDesktopDatabaseBootstrap() {
  if (!fs.existsSync(DESKTOP_BOOTSTRAP_SCRIPT_PATH) || !fs.existsSync(DESKTOP_MIGRATIONS_PATH)) {
    writeStartupLog("desktop-db-bootstrap-missing-files", {
      bootstrapScriptExists: fs.existsSync(DESKTOP_BOOTSTRAP_SCRIPT_PATH),
      migrationsExists: fs.existsSync(DESKTOP_MIGRATIONS_PATH),
    });
    throw new Error("Desktop veritabani hazirlama dosyalari bulunamadi.");
  }

  const nodeRuntime = getNodeRuntimeCommand();
  writeStartupLog("desktop-db-bootstrap-start", {
    command: nodeRuntime.label,
    databaseExistsBefore: fs.existsSync(DESKTOP_DATABASE_PATH),
    databaseUrl: redactValue(DESKTOP_DATABASE_URL),
  });

  try {
    const output = execFileSync(
      nodeRuntime.command,
      [DESKTOP_BOOTSTRAP_SCRIPT_PATH, DESKTOP_DATABASE_PATH, DESKTOP_MIGRATIONS_PATH, STANDALONE_ROOT],
      {
        cwd: PROJECT_ROOT,
        env: buildChildProcessEnv({
          APP_MODE: "desktop",
          DATABASE_URL: DESKTOP_DATABASE_URL,
          APP_PROJECT_ROOT: PROJECT_ROOT,
        }),
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      },
    );

    writeStartupLog("desktop-db-bootstrap-complete", {
      databaseExistsAfter: fs.existsSync(DESKTOP_DATABASE_PATH),
      output: output.trim() || "-",
    });
  } catch (error) {
    const runtimeMissing = isNodeRuntimeMissingError(error);
    writeStartupLog("desktop-db-bootstrap-failed", {
      message: runtimeMissing ? NODE_RUNTIME_MISSING_MESSAGE : error instanceof Error ? error.message : String(error),
      stdout: error?.stdout ? String(error.stdout).trim() : "-",
      stderr: error?.stderr ? String(error.stderr).trim() : "-",
    });
    if (runtimeMissing) {
      throw new Error(NODE_RUNTIME_MISSING_MESSAGE);
    }
    throw error;
  }
}

function preparePackagedDesktopRuntime() {
  if (!app.isPackaged || desktopRuntimePrepared) {
    return;
  }

  try {
    ensureDesktopDataDirectories();
    runDesktopDatabaseBootstrap();
    desktopRuntimePrepared = true;
  } catch (error) {
    writeStartupLog("desktop-runtime-prepare-failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    if (error instanceof Error && error.message === NODE_RUNTIME_MISSING_MESSAGE) {
      throw error;
    }
    process.stderr.write(
      `Desktop veritabani hazirlanamadi. ${error instanceof Error ? error.message : String(error)}\n`,
    );
    throw new Error("Desktop veritabani hazirlanamadi.");
  }
}

function checkServer(url) {
  return new Promise((resolve) => {
    const request = http.get(url, (response) => {
      response.resume();
      resolve(response.statusCode >= 200 && response.statusCode < 500);
    });

    request.on("error", () => resolve(false));
    request.setTimeout(SERVER_CHECK_TIMEOUT_MS, () => {
      request.destroy();
      resolve(false);
    });
  });
}

function wait(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function getDownloadsDirectory() {
  return path.join(app.getPath("downloads"), DOWNLOADS_FOLDER_NAME);
}

function sanitizeDownloadFileName(fileName) {
  const baseName = path.basename(String(fileName || "indirilen-dosya"));
  const withoutTraversal = baseName.replace(/\.\.+/g, ".");
  const sanitized = withoutTraversal
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\s+/g, " ")
    .replace(/^\.+/, "")
    .trim();

  return (sanitized || "indirilen-dosya").slice(0, 180);
}

function getUniqueDownloadPath(downloadsDir, fileName) {
  const parsed = path.parse(fileName);
  let candidate = path.join(downloadsDir, fileName);
  let index = 1;

  while (fs.existsSync(candidate)) {
    const nextFileName = `${parsed.name}-${index}${parsed.ext}`;
    candidate = path.join(downloadsDir, nextFileName);
    index += 1;
  }

  return candidate;
}

function configureDownloadHandling(window) {
  const downloadSession = window.webContents.session;

  if (downloadSession.__muhasebeDownloadHandlingConfigured) {
    return;
  }

  downloadSession.__muhasebeDownloadHandlingConfigured = true;

  downloadSession.on("will-download", (_event, item) => {
    let savePath = "";

    try {
      const downloadsDir = getDownloadsDirectory();
      fs.mkdirSync(downloadsDir, { recursive: true });

      const safeFileName = sanitizeDownloadFileName(item.getFilename());
      savePath = getUniqueDownloadPath(downloadsDir, safeFileName);
      item.setSavePath(savePath);
    } catch {
      process.stderr.write("Indirme hazirlanamadi. Lutfen indirme klasoru izinlerini kontrol edin.\n");
    }

    item.once("done", (_event, state) => {
      const safeFileName = savePath ? path.basename(savePath) : sanitizeDownloadFileName(item.getFilename());

      if (state === "completed") {
        process.stdout.write(`Indirme tamamlandi: ${safeFileName}\n`);
        return;
      }

      process.stderr.write(`Indirme tamamlanamadi: ${safeFileName} (${state})\n`);
    });
  });
}

function getNextServerCommand() {
  if (SERVER_MODE === "production") {
    if (!fs.existsSync(STANDALONE_SERVER_PATH)) {
      throw new Error("Standalone production build bulunamadı. Önce npm run build çalıştırın.");
    }
    const nodeRuntime = getNodeRuntimeCommand();

    return {
      command: nodeRuntime.command,
      label: nodeRuntime.label,
      args: [STANDALONE_SERVER_PATH],
    };
  }

  const scriptName = "dev";

  if (process.platform === "win32") {
    return {
      command: "cmd.exe",
      args: ["/d", "/s", "/c", "npm.cmd", "run", scriptName],
    };
  }

  return {
    command: "npm",
    args: ["run", scriptName],
  };
}

function startNextServer() {
  const serverCommand = getNextServerCommand();
  writeStartupLog("next-server-start", {
    mode: SERVER_MODE,
    command: serverCommand.label || serverCommand.command,
    args: serverCommand.args.join(" "),
    cwd: SERVER_MODE === "production" ? STANDALONE_ROOT : PROJECT_ROOT,
    databaseUrl: redactValue(getServerDatabaseUrl()),
  });
  const child = spawn(serverCommand.command, serverCommand.args, {
    cwd: SERVER_MODE === "production" ? STANDALONE_ROOT : PROJECT_ROOT,
    env: buildChildProcessEnv({
      APP_PROJECT_ROOT: PROJECT_ROOT,
      APP_MODE: getServerAppMode(),
      DATABASE_URL: getServerDatabaseUrl(),
      NODE_ENV: SERVER_MODE === "production" ? "production" : process.env.NODE_ENV,
      ...serverCommand.env,
    }),
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

  nextServerProcess = child;
  startedNextServer = true;

  child.stdout?.on("data", (data) => {
    process.stdout.write(data);
    writeStartupLog("next-server-stdout", { message: String(data).trim() });
  });

  child.stderr?.on("data", (data) => {
    process.stderr.write(data);
    writeStartupLog("next-server-stderr", { message: String(data).trim() });
  });

  child.on("error", (error) => {
    serverStartupError = error;
    writeStartupLog("next-server-error", { message: error.message });
    process.stderr.write(`Next.js ${SERVER_MODE} server başlatılamadı: ${error.message}\n`);
  });

  child.on("exit", (code, signal) => {
    if (nextServerProcess === child) {
      nextServerProcess = null;
    }

    if (!isCleaningUp && code !== 0) {
      writeStartupLog("next-server-exit", { code, signal: signal || "-" });
      process.stderr.write(`Next.js ${SERVER_MODE} server kapandı. code=${code} signal=${signal || "-"}\n`);
    }
  });

  return child;
}

async function waitForServerReady(url) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < SERVER_START_TIMEOUT_MS) {
    if (await checkServer(url)) {
      writeStartupLog("server-ready", { mode: SERVER_MODE });
      return true;
    }

    await wait(SERVER_POLL_INTERVAL_MS);
  }

  writeStartupLog("server-ready-timeout", { mode: SERVER_MODE, timeoutMs: SERVER_START_TIMEOUT_MS });
  return false;
}

async function ensureNextServer() {
  try {
    preparePackagedDesktopRuntime();
  } catch (error) {
    serverStartupError = error;
    return false;
  }

  if (await checkServer(APP_URL)) {
    writeStartupLog("using-existing-server", { url: APP_URL });
    return true;
  }

  try {
    startNextServer();
  } catch (error) {
    serverStartupError = error;
    return false;
  }

  const ready = await waitForServerReady(APP_URL);

  if (ready && startedNextServer) {
    nextDevServerPortOwnerPid = getWindowsPortOwnerPid(APP_URL);
  }

  return ready;
}

function getWindowsPortOwnerPid(url) {
  if (process.platform !== "win32") {
    return null;
  }

  const { port } = new URL(url);

  try {
    const output = execFileSync("netstat", ["-ano", "-p", "tcp"], {
      encoding: "utf8",
      windowsHide: true,
    });

    const line = output
      .split(/\r?\n/)
      .find((entry) => entry.includes(`:${port}`) && entry.includes("LISTENING"));

    const pid = line?.trim().split(/\s+/).at(-1);
    return pid ? Number(pid) : null;
  } catch {
    return null;
  }
}

function buildServerErrorPage() {
  const manualCommand = SERVER_MODE === "production" ? "npm run build && npm run electron:prod" : "npm run dev";
  const isDesktopDatabaseError = serverStartupError?.message === "Desktop veritabani hazirlanamadi.";
  const isNodeRuntimeMissing = serverStartupError?.message === NODE_RUNTIME_MISSING_MESSAGE;
  const title =
    isNodeRuntimeMissing
      ? "Node runtime bulunamadi"
      : isDesktopDatabaseError
      ? "Desktop veritabani hazirlanamadi"
      : SERVER_MODE === "production"
      ? "Production sunucu başlatılamadı"
      : "Uygulama sunucusu başlatılamadı";
  const description =
    isNodeRuntimeMissing
      ? "Node runtime bulunamadi. Uygulama sunucusu baslatilamadi."
      : isDesktopDatabaseError
      ? "Uygulama verileri hazirlanirken hata olustu. Lutfen uygulamayi yeniden baslatmayi deneyin."
      : SERVER_MODE === "production"
      ? "Electron açıldı, ancak production sunucu belirlenen sürede hazır hale gelmedi. Önce npm run build çalıştırın."
      : "Electron açıldı, ancak uygulama sunucusu belirlenen sürede hazır hale gelmedi.";

  return `data:text/html;charset=utf-8,${encodeURIComponent(`
    <!doctype html>
    <html lang="tr">
      <head>
        <meta charset="utf-8" />
        <title>Muhasebe Takip</title>
        <style>
          body {
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            font-family: Arial, sans-serif;
            background: #f8fafc;
            color: #172033;
          }
          main {
            width: min(560px, calc(100vw - 48px));
            border: 1px solid #d9e2ef;
            border-radius: 12px;
            background: white;
            padding: 32px;
            box-shadow: 0 20px 60px rgba(15, 23, 42, 0.08);
          }
          h1 { margin: 0 0 12px; font-size: 24px; }
          p { margin: 0 0 12px; line-height: 1.6; color: #475569; }
          code {
            display: inline-block;
            border-radius: 6px;
            background: #eef2f7;
            padding: 2px 6px;
            color: #0f172a;
          }
        </style>
      </head>
      <body>
        <main>
          <h1>${title}</h1>
          <p>${description}</p>
          <p>Lütfen terminal çıktısını kontrol edin. Manuel denemek için <code>${manualCommand}</code> komutunu çalıştırabilirsiniz.</p>
          ${serverStartupError ? `<p>Teknik hata: <code>${String(serverStartupError.message || serverStartupError)}</code></p>` : ""}
        </main>
      </body>
    </html>
  `)}`;
}

function buildFatalErrorPage() {
  return `data:text/html;charset=utf-8,${encodeURIComponent(`
    <!doctype html>
    <html lang="tr">
      <head>
        <meta charset="utf-8" />
        <title>Muhasebe Takip</title>
        <style>
          body {
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            font-family: Arial, sans-serif;
            background: #f8fafc;
            color: #172033;
          }
          main {
            width: min(560px, calc(100vw - 48px));
            border: 1px solid #d9e2ef;
            border-radius: 12px;
            background: white;
            padding: 32px;
            box-shadow: 0 20px 60px rgba(15, 23, 42, 0.08);
          }
          h1 { margin: 0 0 12px; font-size: 24px; }
          p { margin: 0 0 12px; line-height: 1.6; color: #475569; }
          code {
            display: inline-block;
            border-radius: 6px;
            background: #eef2f7;
            padding: 2px 6px;
            color: #0f172a;
          }
        </style>
      </head>
      <body>
        <main>
          <h1>Uygulama baslatilamadi.</h1>
          <p>Detaylar uygulama log klasorundeki <code>logs/startup.log</code> dosyasina yazildi.</p>
          <p>Lutfen uygulamayi yeniden baslatmayi deneyin. Sorun devam ederse startup log dosyasini kontrol edin.</p>
        </main>
      </body>
    </html>
  `)}`;
}

function showFatalErrorWindow(error) {
  writeStartupLog("fatal-error-window", {
    message: error instanceof Error ? error.message : String(error),
  });

  const window = new BrowserWindow({
    title: "Muhasebe Takip",
    width: 720,
    height: 420,
    minWidth: 640,
    minHeight: 360,
    icon: fs.existsSync(APP_ICON_PATH) ? APP_ICON_PATH : undefined,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
      sandbox: true,
    },
  });

  window.loadURL(buildFatalErrorPage());
}

function handleFatalStartupError(error) {
  serverStartupError = error;
  writeStartupLog("fatal-startup-error", {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack || "-" : "-",
  });

  if (app.isReady()) {
    showFatalErrorWindow(error);
    return;
  }

  app.whenReady().then(() => showFatalErrorWindow(error));
}

async function createWindow() {
  logStartupSnapshot();

  const window = new BrowserWindow({
    title: "Muhasebe Takip",
    width: 1366,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    icon: fs.existsSync(APP_ICON_PATH) ? APP_ICON_PATH : undefined,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
      sandbox: true,
    },
  });

  window.once("ready-to-show", () => {
    window.show();
  });

  configureDownloadHandling(window);

  window.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  window.webContents.on("will-navigate", (event, url) => {
    const target = new URL(url);
    const appTarget = new URL(APP_URL);

    if (target.origin !== appTarget.origin) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  const serverReady = await ensureNextServer();
  await window.loadURL(serverReady ? APP_URL : buildServerErrorPage());
}

function cleanupNextServer() {
  if (isCleaningUp || !startedNextServer) {
    return;
  }

  isCleaningUp = true;
  const childPids = [nextServerProcess?.pid, nextDevServerPortOwnerPid]
    .filter(Boolean)
    .map(String);

  if (process.platform === "win32") {
    for (const childPid of new Set(childPids)) {
      try {
        execFileSync("taskkill", ["/pid", childPid, "/T", "/F"], {
          stdio: "ignore",
          windowsHide: true,
        });
      } catch {
        // The process may already be closed; cleanup should stay best-effort.
      }
    }
  } else {
    nextServerProcess?.kill("SIGTERM");
  }
}

process.on("uncaughtException", handleFatalStartupError);
process.on("unhandledRejection", handleFatalStartupError);

app.on("render-process-gone", (_event, _webContents, details) => {
  writeStartupLog("render-process-gone", {
    reason: details.reason,
    exitCode: details.exitCode,
  });
});

app.on("child-process-gone", (_event, details) => {
  writeStartupLog("child-process-gone", {
    type: details.type,
    reason: details.reason,
    exitCode: details.exitCode,
  });
});

app.whenReady().then(createWindow).catch(handleFatalStartupError);

app.on("before-quit", cleanupNextServer);

app.on("window-all-closed", () => {
  cleanupNextServer();
  app.quit();
});

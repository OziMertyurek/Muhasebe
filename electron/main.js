/* eslint-disable @typescript-eslint/no-require-imports */
const { app, BrowserWindow, shell } = require("electron");
const { execFileSync, spawn } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const APP_URL = process.env.ELECTRON_START_URL || "http://localhost:3000";
const SERVER_MODE = process.env.ELECTRON_SERVER_MODE === "production" ? "production" : "development";
const PROJECT_ROOT = path.join(__dirname, "..");
const STANDALONE_SERVER_PATH = path.join(PROJECT_ROOT, ".next", "standalone", "server.js");
const SERVER_CHECK_TIMEOUT_MS = 2500;
const SERVER_START_TIMEOUT_MS = 60000;
const SERVER_POLL_INTERVAL_MS = 1000;

let nextServerProcess = null;
let nextDevServerPortOwnerPid = null;
let startedNextServer = false;
let isCleaningUp = false;
let serverStartupError = null;

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

function getNextServerCommand() {
  if (SERVER_MODE === "production") {
    if (!fs.existsSync(STANDALONE_SERVER_PATH)) {
      throw new Error("Standalone production build bulunamadı. Önce npm run build çalıştırın.");
    }

    return {
      command: process.platform === "win32" ? "node.exe" : "node",
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
  const child = spawn(serverCommand.command, serverCommand.args, {
    cwd: PROJECT_ROOT,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "",
      NODE_ENV: SERVER_MODE === "production" ? "production" : process.env.NODE_ENV,
      ...serverCommand.env,
    },
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

  nextServerProcess = child;
  startedNextServer = true;

  child.stdout?.on("data", (data) => {
    process.stdout.write(data);
  });

  child.stderr?.on("data", (data) => {
    process.stderr.write(data);
  });

  child.on("error", (error) => {
    serverStartupError = error;
    process.stderr.write(`Next.js ${SERVER_MODE} server başlatılamadı: ${error.message}\n`);
  });

  child.on("exit", (code, signal) => {
    if (nextServerProcess === child) {
      nextServerProcess = null;
    }

    if (!isCleaningUp && code !== 0) {
      process.stderr.write(`Next.js ${SERVER_MODE} server kapandı. code=${code} signal=${signal || "-"}\n`);
    }
  });

  return child;
}

async function waitForServerReady(url) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < SERVER_START_TIMEOUT_MS) {
    if (await checkServer(url)) {
      return true;
    }

    await wait(SERVER_POLL_INTERVAL_MS);
  }

  return false;
}

async function ensureNextServer() {
  if (await checkServer(APP_URL)) {
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
  const title =
    SERVER_MODE === "production"
      ? "Production sunucu başlatılamadı"
      : "Uygulama sunucusu başlatılamadı";
  const description =
    SERVER_MODE === "production"
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

async function createWindow() {
  const window = new BrowserWindow({
    title: "Muhasebe Takip",
    width: 1366,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
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

app.whenReady().then(createWindow);

app.on("before-quit", cleanupNextServer);

app.on("window-all-closed", () => {
  cleanupNextServer();
  app.quit();
});

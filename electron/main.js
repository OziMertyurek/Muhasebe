/* eslint-disable @typescript-eslint/no-require-imports */
const { app, BrowserWindow, shell } = require("electron");
const http = require("node:http");
const path = require("node:path");

const APP_URL = process.env.ELECTRON_START_URL || "http://localhost:3000";
const SERVER_CHECK_TIMEOUT_MS = 2500;

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

function buildServerErrorPage() {
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
          <h1>Next.js server bulunamadı</h1>
          <p>Electron penceresi açıldı, ancak uygulama <code>${APP_URL}</code> adresinde çalışmıyor.</p>
          <p>Önce ayrı bir terminalde <code>npm run dev</code> komutunu çalıştırın, ardından <code>npm run electron:dev</code> komutunu tekrar deneyin.</p>
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

  const serverReady = await checkServer(APP_URL);
  await window.loadURL(serverReady ? APP_URL : buildServerErrorPage());
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  app.quit();
});

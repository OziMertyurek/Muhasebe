import "server-only";

import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export function isDesktopMode() {
  return (
    process.env.APP_MODE?.toLocaleLowerCase("tr-TR") === "desktop" ||
    process.env.DESKTOP_MODE === "1"
  );
}

export function getProjectRoot() {
  return process.cwd();
}

export function getDatabasePath() {
  return join(getProjectRoot(), "prisma", "dev.db");
}

export function getUploadsDir() {
  return join(getProjectRoot(), "storage", "uploads");
}

export function getRestoreBackupsDir() {
  return join(getProjectRoot(), "storage", "restore-backups");
}

export function getBackupsDir() {
  return join(getProjectRoot(), "storage", "backups");
}

export function getLogsDir() {
  return join(getProjectRoot(), "storage", "logs");
}

export function getPythonWorkerDir() {
  return join(getProjectRoot(), "python-worker");
}

export function getPythonWorkerScriptPath() {
  return join(getPythonWorkerDir(), "extract_markdown.py");
}

export function getDesktopAppDataDir() {
  const appDataRoot =
    process.env.APPDATA ||
    (process.platform === "win32"
      ? join(homedir(), "AppData", "Roaming")
      : join(homedir(), ".local", "share"));

  return join(appDataRoot, "MuhasebeTakip");
}

export function getDesktopDatabasePath() {
  return join(getDesktopAppDataDir(), "database", "dev.db");
}

export function getDesktopUploadsDir() {
  return join(getDesktopAppDataDir(), "uploads");
}

export function getDesktopRestoreBackupsDir() {
  return join(getDesktopAppDataDir(), "restore-backups");
}

export function getDesktopBackupsDir() {
  return join(getDesktopAppDataDir(), "backups");
}

export function getDesktopLogsDir() {
  return join(getDesktopAppDataDir(), "logs");
}

export async function ensureDesktopDataDirs() {
  const dirs = [
    dirname(getDesktopDatabasePath()),
    getDesktopUploadsDir(),
    getDesktopRestoreBackupsDir(),
    getDesktopBackupsDir(),
    getDesktopLogsDir(),
  ];

  await Promise.all(dirs.map((dir) => mkdir(dir, { recursive: true })));

  return {
    appDataDir: getDesktopAppDataDir(),
    databasePath: getDesktopDatabasePath(),
    uploadsDir: getDesktopUploadsDir(),
    restoreBackupsDir: getDesktopRestoreBackupsDir(),
    backupsDir: getDesktopBackupsDir(),
    logsDir: getDesktopLogsDir(),
  };
}

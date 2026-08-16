import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

const appDataFolderName = "MuhasebeTakip";

export function isDesktopMode() {
  return (
    process.env.APP_MODE?.toLocaleLowerCase("tr-TR") === "desktop" ||
    process.env.DESKTOP_MODE === "1"
  );
}

export function getProjectRoot() {
  return process.env.APP_PROJECT_ROOT || process.cwd();
}

export function getDatabasePath() {
  if (isDesktopMode()) {
    return getDesktopDatabasePath();
  }

  return join(getProjectRoot(), "prisma", "dev.db");
}

export function getUploadsDir() {
  if (isDesktopMode()) {
    return getDesktopUploadsDir();
  }

  return process.env.DOCUMENT_UPLOAD_DIR || join(getProjectRoot(), "storage", "uploads");
}

export function getRestoreBackupsDir() {
  if (isDesktopMode()) {
    return getDesktopRestoreBackupsDir();
  }

  return join(getProjectRoot(), "storage", "restore-backups");
}

export function getBackupsDir() {
  if (isDesktopMode()) {
    return getDesktopBackupsDir();
  }

  return join(getProjectRoot(), "storage", "backups");
}

export function getLogsDir() {
  if (isDesktopMode()) {
    return getDesktopLogsDir();
  }

  return join(getProjectRoot(), "storage", "logs");
}

export function getPythonWorkerDir() {
  return join(getProjectRoot(), "python-worker");
}

export function getPythonWorkerScriptPath() {
  return join(getPythonWorkerDir(), "extract_markdown.py");
}

export function getDesktopAppDataRoot(
  platform = process.platform,
  homeDir = homedir(),
) {
  if (platform === "win32") {
    return process.env.APPDATA || join(homeDir, "AppData", "Roaming");
  }

  if (platform === "darwin") {
    return join(homeDir, "Library", "Application Support");
  }

  return join(homeDir, ".local", "share");
}

export function getDesktopAppDataDir() {
  return join(getDesktopAppDataRoot(), appDataFolderName);
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

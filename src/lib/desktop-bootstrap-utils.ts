import "server-only";

import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import {
  getDesktopBackupsDir,
  getDesktopDatabasePath,
  getDesktopLogsDir,
  getDesktopRestoreBackupsDir,
  getDesktopUploadsDir,
  isDesktopMode,
} from "@/lib/app-paths";

export type DesktopBootstrapStatus = {
  desktopMode: boolean;
  appDataDirAvailable: boolean;
  databaseDirExists: boolean;
  databaseFileExists: boolean;
  uploadsDirExists: boolean;
  restoreBackupsDirExists: boolean;
  backupsDirExists: boolean;
  logsDirExists: boolean;
  readyForDesktopRuntime: boolean;
  warnings: string[];
};

export function checkDesktopDatabaseExists() {
  return existsSync(getDesktopDatabasePath());
}

export function checkDesktopUploadsDirExists() {
  return existsSync(getDesktopUploadsDir());
}

export function checkDesktopRestoreBackupsDirExists() {
  return existsSync(getDesktopRestoreBackupsDir());
}

export function checkDesktopBackupsDirExists() {
  return existsSync(getDesktopBackupsDir());
}

export function checkDesktopLogsDirExists() {
  return existsSync(getDesktopLogsDir());
}

export function getDesktopBootstrapStatus(): DesktopBootstrapStatus {
  const desktopMode = isDesktopMode();
  const databaseDirExists = existsSync(dirname(getDesktopDatabasePath()));
  const databaseFileExists = checkDesktopDatabaseExists();
  const uploadsDirExists = checkDesktopUploadsDirExists();
  const restoreBackupsDirExists = checkDesktopRestoreBackupsDirExists();
  const backupsDirExists = checkDesktopBackupsDirExists();
  const logsDirExists = checkDesktopLogsDirExists();
  const requiredDirsExist =
    databaseDirExists &&
    uploadsDirExists &&
    restoreBackupsDirExists &&
    backupsDirExists &&
    logsDirExists;
  const warnings: string[] = [];

  if (!desktopMode) {
    warnings.push("Desktop mode aktif degil; AppData klasorleri otomatik hazirlanmaz.");
  }

  if (!requiredDirsExist) {
    warnings.push("Desktop veri klasorlerinin tamami hazir degil.");
  }

  if (!databaseFileExists) {
    warnings.push("Desktop SQLite veritabani dosyasi henuz yok.");
  }

  return {
    desktopMode,
    appDataDirAvailable: true,
    databaseDirExists,
    databaseFileExists,
    uploadsDirExists,
    restoreBackupsDirExists,
    backupsDirExists,
    logsDirExists,
    readyForDesktopRuntime: desktopMode && requiredDirsExist,
    warnings,
  };
}

export async function ensureDesktopDataStructure() {
  const dirs = [
    dirname(getDesktopDatabasePath()),
    getDesktopUploadsDir(),
    getDesktopRestoreBackupsDir(),
    getDesktopBackupsDir(),
    getDesktopLogsDir(),
  ];

  await Promise.all(dirs.map((dir) => mkdir(dir, { recursive: true })));

  return getDesktopBootstrapStatus();
}

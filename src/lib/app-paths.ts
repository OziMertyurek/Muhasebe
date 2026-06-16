import "server-only";

import { join } from "node:path";

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

import { existsSync, statSync } from "node:fs";
import { basename, join } from "node:path";

export function getDatabaseBackupInfo() {
  const databasePath = join(process.cwd(), "prisma", "dev.db");

  if (!existsSync(databasePath)) {
    return {
      databasePath,
      exists: false,
      size: null,
      fileName: basename(databasePath),
    };
  }

  const stat = statSync(databasePath);

  return {
    databasePath,
    exists: stat.isFile(),
    size: stat.isFile() ? stat.size : null,
    fileName: basename(databasePath),
  };
}

export function getUploadsBackupInfo() {
  const uploadsPath = join(/* turbopackIgnore: true */ process.cwd(), "storage", "uploads");
  const exists = existsSync(uploadsPath);

  return {
    uploadsPath,
    exists,
  };
}

export function formatBackupFileName(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `accounting-backup-${year}-${month}-${day}-${hours}-${minutes}.db`;
}

export function formatFileSize(bytes: number | null) {
  if (bytes === null) {
    return "-";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

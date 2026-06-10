import { existsSync, statSync } from "node:fs";
import {
  cp,
  mkdir,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import JSZip from "jszip";
import { appInfo } from "@/lib/app-info";

export const maxBackupZipSize = 500 * 1024 * 1024;

export type BackupMetadata = {
  appName?: string;
  version?: string;
  mode?: string;
  database?: string;
  backupDate?: string;
  includes?: string[];
  note?: string;
};

export type BackupValidationResult = {
  isValid: boolean;
  metadata: BackupMetadata | null;
  hasDatabase: boolean;
  hasUploads: boolean;
  uploadFileCount: number;
  totalSize: number;
  warnings: string[];
  errors: string[];
};

export type RestoreBackupResult = {
  success: boolean;
  metadata: BackupMetadata | null;
  restoredDatabase: boolean;
  restoredUploadFileCount: number;
  safetyBackupPath: string;
  warnings: string[];
  message: string;
};

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

function formatDatePart(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return { year, month, day, hours, minutes };
}

export function formatBackupFileName(date = new Date()) {
  const { year, month, day, hours, minutes } = formatDatePart(date);

  return `accounting-backup-${year}-${month}-${day}-${hours}-${minutes}.db`;
}

export function formatFullBackupFileName(date = new Date()) {
  const { year, month, day, hours, minutes } = formatDatePart(date);

  return `muhasebe-yedek-${year}-${month}-${day}-${hours}-${minutes}.zip`;
}

function formatRestoreDirectoryName(date = new Date()) {
  const { year, month, day, hours, minutes } = formatDatePart(date);
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `before-restore-${year}-${month}-${day}-${hours}-${minutes}-${seconds}`;
}

function getUniqueRestoreBackupPath(date = new Date()) {
  const backupBasePath = join(process.cwd(), "storage", "restore-backups");
  const directoryName = formatRestoreDirectoryName(date);
  let candidatePath = join(backupBasePath, directoryName);
  let suffix = 2;

  while (existsSync(candidatePath)) {
    candidatePath = join(backupBasePath, `${directoryName}-${suffix}`);
    suffix += 1;
  }

  return candidatePath;
}

export function createBackupMetadata(date = new Date(), uploadsExists = false) {
  return {
    appName: appInfo.appName,
    version: appInfo.version,
    mode: appInfo.mode.toLocaleLowerCase("tr-TR"),
    database: appInfo.database,
    backupDate: date.toISOString(),
    includes: ["database", "uploads"],
    note: uploadsExists
      ? "Bu yedek local veritabanı ve upload dosyalarını içerir."
      : "Bu yedek local veritabanını içerir. Upload klasörü bulunamadığı için boş olarak eklenmiştir.",
  };
}

function normalizeZipEntryName(name: string) {
  return name.replace(/\\/g, "/");
}

function hasUnsafeZipPath(name: string) {
  const normalized = normalizeZipEntryName(name);

  return (
    normalized.startsWith("/") ||
    /^[a-zA-Z]:/.test(normalized) ||
    normalized.split("/").some((segment) => segment === "..")
  );
}

function isUnexpectedSensitiveEntry(name: string) {
  const normalized = normalizeZipEntryName(name).toLocaleLowerCase("tr-TR");
  const parts = normalized.split("/");

  return (
    parts.includes(".env") ||
    parts.includes(".env.local") ||
    parts.includes("node_modules") ||
    parts.includes(".next") ||
    parts.includes(".git")
  );
}

function isRestoreAllowedEntry(name: string) {
  const normalized = normalizeZipEntryName(name);

  return (
    normalized === "backup-info.json" ||
    normalized === "database/" ||
    normalized === "database/dev.db" ||
    normalized === "uploads/" ||
    normalized.startsWith("uploads/")
  );
}

function isBackupMetadata(value: unknown): value is BackupMetadata {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export async function validateBackupZip(file: File): Promise<BackupValidationResult> {
  const warnings: string[] = [];
  const errors: string[] = [];
  let metadata: BackupMetadata | null = null;
  let hasDatabase = false;
  let hasUploads = false;
  let uploadFileCount = 0;

  if (!file.name.toLocaleLowerCase("tr-TR").endsWith(".zip")) {
    errors.push("Sadece .zip uzantılı tam yedek dosyaları kontrol edilebilir.");
  }

  if (file.size > maxBackupZipSize) {
    errors.push("ZIP dosyası 500 MB sınırını aşıyor.");
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      metadata,
      hasDatabase,
      hasUploads,
      uploadFileCount,
      totalSize: file.size,
      warnings,
      errors,
    };
  }

  let zip: JSZip;

  try {
    zip = await JSZip.loadAsync(await file.arrayBuffer());
  } catch {
    return {
      isValid: false,
      metadata,
      hasDatabase,
      hasUploads,
      uploadFileCount,
      totalSize: file.size,
      warnings,
      errors: ["ZIP dosyası okunamadı veya geçerli bir ZIP formatında değil."],
    };
  }

  const entries = Object.values(zip.files);

  for (const entry of entries) {
    const normalizedName = normalizeZipEntryName(entry.name);
    const originalName = normalizeZipEntryName(
      (entry as { unsafeOriginalName?: string }).unsafeOriginalName ?? entry.name,
    );

    if (originalName !== "/" && hasUnsafeZipPath(originalName)) {
      warnings.push(`Güvensiz dosya yolu algılandı: ${originalName}`);
    }

    if (isUnexpectedSensitiveEntry(originalName)) {
      warnings.push(`Beklenmeyen hassas dosya veya klasör algılandı: ${originalName}`);
    }

    if (normalizedName === "database/dev.db" && !entry.dir) {
      hasDatabase = true;
    }

    if (normalizedName === "uploads/" || normalizedName.startsWith("uploads/")) {
      hasUploads = true;

      if (!entry.dir) {
        uploadFileCount += 1;
      }
    }
  }

  const metadataFile = zip.file("backup-info.json");

  if (!metadataFile) {
    errors.push("backup-info.json bulunamadı.");
  } else {
    try {
      const parsed = JSON.parse(await metadataFile.async("string")) as unknown;

      if (isBackupMetadata(parsed)) {
        metadata = parsed;
      } else {
        errors.push("backup-info.json beklenen nesne formatında değil.");
      }
    } catch {
      errors.push("backup-info.json okunamadı veya geçerli JSON değil.");
    }
  }

  if (!hasDatabase) {
    errors.push("database/dev.db bulunamadı.");
  } else {
    try {
      const databaseEntry = zip.file("database/dev.db");
      const databaseBuffer = await databaseEntry?.async("nodebuffer");
      const sqliteHeader = databaseBuffer?.subarray(0, 16).toString("ascii");

      if (sqliteHeader !== "SQLite format 3\u0000") {
        errors.push("database/dev.db geçerli bir SQLite veritabanı gibi görünmüyor.");
      }
    } catch {
      errors.push("database/dev.db okunamadı.");
    }
  }

  if (!hasUploads) {
    warnings.push("uploads klasörü yok, dosya ekleri geri yüklenemeyebilir.");
  }

  if (metadata) {
    const expectedFields: Array<keyof BackupMetadata> = [
      "appName",
      "version",
      "mode",
      "database",
      "backupDate",
      "includes",
      "note",
    ];

    for (const field of expectedFields) {
      if (metadata[field] === undefined || metadata[field] === null) {
        warnings.push(`backup-info.json içinde ${field} alanı eksik.`);
      }
    }

    if (metadata.appName && metadata.appName !== appInfo.appName) {
      warnings.push("Bu ZIP beklenen uygulama adına ait görünmüyor.");
    }

    if (metadata.version && metadata.version !== appInfo.version) {
      warnings.push("Yedek farklı bir sürümden alınmış olabilir.");
    }

    if (metadata.database && metadata.database !== appInfo.database) {
      warnings.push("Yedek farklı bir veritabanı tipi için oluşturulmuş olabilir.");
    }
  }

  if (!metadata || !hasDatabase) {
    errors.push("Bu ZIP beklenen yedek formatına benzemiyor.");
  }

  return {
    isValid: errors.length === 0,
    metadata,
    hasDatabase,
    hasUploads,
    uploadFileCount,
    totalSize: file.size,
    warnings: Array.from(new Set(warnings)),
    errors: Array.from(new Set(errors)),
  };
}

async function countFilesInDirectory(directoryPath: string) {
  if (!existsSync(directoryPath)) {
    return 0;
  }

  let count = 0;
  const entries = await readdir(directoryPath, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      count += await countFilesInDirectory(entryPath);
    } else if (entry.isFile()) {
      count += 1;
    }
  }

  return count;
}

export async function createPreRestoreBackup() {
  const database = getDatabaseBackupInfo();
  const uploads = getUploadsBackupInfo();
  const backupDate = new Date();
  const backupRoot = getUniqueRestoreBackupPath(backupDate);
  const backupDatabasePath = join(backupRoot, "database", "dev.db");
  const backupUploadsPath = join(backupRoot, "uploads");

  await mkdir(dirname(backupDatabasePath), { recursive: true });

  if (database.databasePath && database.exists) {
    await cp(database.databasePath, backupDatabasePath);
  }

  await mkdir(backupUploadsPath, { recursive: true });

  if (uploads.exists) {
    await cp(uploads.uploadsPath, backupUploadsPath, {
      recursive: true,
      force: true,
      errorOnExist: false,
    });
  }

  await writeFile(
    join(backupRoot, "backup-info.json"),
    JSON.stringify(
      {
        ...createBackupMetadata(backupDate, uploads.exists),
        note: "Bu yedek restore işleminden önce otomatik güvenlik yedeği olarak oluşturuldu.",
      },
      null,
      2,
    ),
    "utf8",
  );

  return backupRoot;
}

async function safeExtractBackupZip(file: File, targetRoot: string) {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const warnings: string[] = [];
  let extractedUploadFileCount = 0;
  let extractedDatabase = false;
  let metadata: BackupMetadata | null = null;
  const databaseTargetPath = join(targetRoot, "database", "dev.db");
  const uploadsTargetPath = join(targetRoot, "uploads");

  await mkdir(dirname(databaseTargetPath), { recursive: true });
  await mkdir(uploadsTargetPath, { recursive: true });

  for (const entry of Object.values(zip.files)) {
    const normalizedName = normalizeZipEntryName(entry.name);
    const originalName = normalizeZipEntryName(
      (entry as { unsafeOriginalName?: string }).unsafeOriginalName ?? entry.name,
    );

    if (originalName !== "/" && hasUnsafeZipPath(originalName)) {
      throw new Error(`Güvensiz dosya yolu nedeniyle restore durduruldu: ${originalName}`);
    }

    if (isUnexpectedSensitiveEntry(originalName)) {
      throw new Error(`Beklenmeyen hassas dosya nedeniyle restore durduruldu: ${originalName}`);
    }

    if (!isRestoreAllowedEntry(normalizedName)) {
      warnings.push(`Beklenmeyen dosya atlandı: ${normalizedName}`);
      continue;
    }

    if (entry.dir) {
      continue;
    }

    if (normalizedName === "backup-info.json") {
      try {
        const parsed = JSON.parse(await entry.async("string")) as unknown;
        metadata = isBackupMetadata(parsed) ? parsed : null;
      } catch {
        metadata = null;
      }
      continue;
    }

    if (normalizedName === "database/dev.db") {
      await writeFile(databaseTargetPath, await entry.async("nodebuffer"));
      extractedDatabase = true;
      continue;
    }

    if (normalizedName.startsWith("uploads/")) {
      const relativeUploadPath = normalizedName.slice("uploads/".length);

      if (!relativeUploadPath || hasUnsafeZipPath(relativeUploadPath)) {
        continue;
      }

      const uploadTargetPath = join(uploadsTargetPath, ...relativeUploadPath.split("/"));
      await mkdir(dirname(uploadTargetPath), { recursive: true });
      await writeFile(uploadTargetPath, await entry.async("nodebuffer"));
      extractedUploadFileCount += 1;
    }
  }

  return {
    metadata,
    warnings: Array.from(new Set(warnings)),
    extractedDatabase,
    extractedUploadFileCount,
    databaseTargetPath,
    uploadsTargetPath,
  };
}

export async function restoreFromBackupZip(file: File): Promise<RestoreBackupResult> {
  const validation = await validateBackupZip(file);

  if (!validation.isValid) {
    throw new Error(validation.errors.join(" "));
  }

  const blockingWarning = validation.warnings.find(
    (warning) =>
      warning.startsWith("Güvensiz dosya yolu") ||
      warning.startsWith("Beklenmeyen hassas dosya"),
  );

  if (blockingWarning) {
    throw new Error(blockingWarning);
  }

  const database = getDatabaseBackupInfo();

  if (!database.databasePath) {
    throw new Error("Hedef veritabanı yolu bulunamadı.");
  }

  const restoreDate = new Date();
  const tempRoot = join(
    process.cwd(),
    "storage",
    "restore-temp",
    `restore-${restoreDate.getTime()}`,
  );
  let safetyBackupPath = "";

  try {
    const extracted = await safeExtractBackupZip(file, tempRoot);

    if (!extracted.extractedDatabase) {
      throw new Error("Yedek içinde database/dev.db bulunamadı.");
    }

    safetyBackupPath = await createPreRestoreBackup();

    await mkdir(dirname(database.databasePath), { recursive: true });
    await cp(extracted.databaseTargetPath, database.databasePath, { force: true });

    const uploads = getUploadsBackupInfo();
    await rm(uploads.uploadsPath, { recursive: true, force: true });
    await mkdir(uploads.uploadsPath, { recursive: true });
    await cp(extracted.uploadsTargetPath, uploads.uploadsPath, {
      recursive: true,
      force: true,
      errorOnExist: false,
    });

    const restoredUploadFileCount = await countFilesInDirectory(uploads.uploadsPath);

    return {
      success: true,
      metadata: extracted.metadata ?? validation.metadata,
      restoredDatabase: true,
      restoredUploadFileCount,
      safetyBackupPath,
      warnings: Array.from(new Set([...validation.warnings, ...extracted.warnings])),
      message:
        "Geri yükleme tamamlandı. Verilerin doğru yüklenmesi için local server'ı durdurup tekrar başlatmanız önerilir.",
    };
  } catch (error) {
    if (safetyBackupPath) {
      try {
        const backupDatabasePath = join(safetyBackupPath, "database", "dev.db");
        const backupUploadsPath = join(safetyBackupPath, "uploads");
        const uploads = getUploadsBackupInfo();

        if (existsSync(backupDatabasePath)) {
          await cp(backupDatabasePath, database.databasePath, { force: true });
        }

        await rm(uploads.uploadsPath, { recursive: true, force: true });
        await mkdir(uploads.uploadsPath, { recursive: true });

        if (existsSync(backupUploadsPath)) {
          await cp(backupUploadsPath, uploads.uploadsPath, {
            recursive: true,
            force: true,
            errorOnExist: false,
          });
        }
      } catch {
        throw new Error(
          "Restore sırasında hata oluştu. Otomatik güvenlik yedeği alındı ancak geri alma işlemi tamamlanamadı.",
        );
      }
    }

    const message =
      error instanceof Error
        ? error.message
        : "Geri yükleme sırasında beklenmeyen bir hata oluştu.";

    throw new Error(
      safetyBackupPath
        ? `${message} Mevcut dosyalar otomatik güvenlik yedeğinden geri alındı.`
        : message,
    );
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
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

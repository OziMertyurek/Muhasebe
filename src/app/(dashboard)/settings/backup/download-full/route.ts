import { existsSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import JSZip from "jszip";
import { createAuditLog } from "@/lib/audit-log-utils";
import { isPostgresRuntime } from "@/lib/app-paths";
import { updateLastFullBackupDate } from "@/lib/backup-reminder-utils";
import {
  createBackupMetadata,
  formatFullBackupFileName,
  getDatabaseBackupInfo,
  getUploadsBackupInfo,
} from "@/lib/backup-utils";
import { requireRequestOnboardingCompleted } from "@/lib/onboarding-utils";
import { requireRequestLocalAuth } from "@/lib/security-utils";

export const runtime = "nodejs";

const blockedNames = new Set([
  ".env",
  ".env.local",
  ".git",
  ".next",
  "node_modules",
]);

function isBlockedBackupFile(fileName: string) {
  const lower = fileName.toLocaleLowerCase("tr-TR");

  return lower.endsWith(".db") || lower.endsWith(".db-journal");
}

function getSafeZipPath(root: string, filePath: string) {
  const relativePath = relative(root, filePath);

  if (
    !relativePath ||
    relativePath.startsWith("..") ||
    relativePath.includes(`..${sep}`) ||
    relativePath.includes(":")
  ) {
    return null;
  }

  return relativePath.split(sep).join("/");
}

async function addUploadsToZip(zip: JSZip, uploadsPath: string) {
  const uploadsFolder = zip.folder("uploads");

  if (!uploadsFolder || !existsSync(uploadsPath)) {
    return;
  }
  const safeUploadsFolder = uploadsFolder;

  async function walk(directory: string) {
    const entries = await readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
      if (blockedNames.has(entry.name) || isBlockedBackupFile(entry.name)) {
        continue;
      }

      const absolutePath = join(directory, entry.name);
      const zipPath = getSafeZipPath(uploadsPath, absolutePath);

      if (!zipPath) {
        continue;
      }

      if (entry.isDirectory()) {
        safeUploadsFolder.folder(zipPath);
        await walk(absolutePath);
      } else if (entry.isFile()) {
        const fileStat = await stat(absolutePath);

        if (!fileStat.isFile()) {
          continue;
        }

        safeUploadsFolder.file(zipPath, await readFile(absolutePath));
      }
    }
  }

  await walk(uploadsPath);
}

export async function GET(request: Request) {
  const authResponse = await requireRequestLocalAuth(request);

  if (authResponse) {
    return authResponse;
  }

  const onboardingResponse = await requireRequestOnboardingCompleted();

  if (onboardingResponse) {
    return onboardingResponse;
  }

  const database = getDatabaseBackupInfo();
  const uploads = getUploadsBackupInfo();

  if (isPostgresRuntime()) {
    return new Response("PostgreSQL üretim ortamında tam ZIP yedeği veritabanını içermez. Altyapı yedeklerini kullanın.", {
      status: 410,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }

  if (!database.databasePath || !database.exists) {
    return new Response("Veritabanı dosyası bulunamadı. Tam yedek oluşturulamadı.", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }

  try {
    const zip = new JSZip();
    const backupDate = new Date();

    zip.file("database/dev.db", await readFile(database.databasePath));
    await addUploadsToZip(zip, uploads.uploadsPath);
    zip.file(
      "backup-info.json",
      JSON.stringify(createBackupMetadata(backupDate, uploads.exists), null, 2),
    );

    const archive = await zip.generateAsync({
      type: "arraybuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });
    const fileName = formatFullBackupFileName(backupDate);

    await updateLastFullBackupDate(backupDate);
    await createAuditLog({
      entityType: "BACKUP",
      action: "FULL_BACKUP_DOWNLOAD",
      title: "Tam yedek indirildi",
      description: "Veritabanı ve upload metadata paketi ZIP olarak indirildi.",
      metadata: {
        fileName,
        size: archive.byteLength,
        uploadsIncluded: uploads.exists,
      },
    });

    return new Response(archive, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response("Tam yedek ZIP dosyası oluşturulurken bir hata oluştu.", {
      status: 500,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }
}

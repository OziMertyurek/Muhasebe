import { createAuditLog } from "@/lib/audit-log-utils";
import { isPostgresRuntime } from "@/lib/app-paths";
import { maxBackupZipSize, restoreFromBackupZip } from "@/lib/backup-utils";
import { requireRequestOnboardingCompleted } from "@/lib/onboarding-utils";
import { prisma } from "@/lib/prisma";
import { requireRequestLocalAuth } from "@/lib/security-utils";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authResponse = await requireRequestLocalAuth(request);

  if (authResponse) {
    return authResponse;
  }

  const onboardingResponse = await requireRequestOnboardingCompleted();

  if (onboardingResponse) {
    return onboardingResponse;
  }

  if (isPostgresRuntime()) {
    return Response.json(
      {
        message:
          "PostgreSQL üretim ortamında ZIP restore desteklenmez. Geri yükleme hosting/veritabanı sağlayıcısı üzerinden yapılmalıdır.",
      },
      { status: 410 },
    );
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return Response.json(
      { message: "Restore isteği okunamadı." },
      { status: 400 },
    );
  }

  const confirmation = formData.get("confirmation");
  const file = formData.get("backupFile");

  if (confirmation !== "understood") {
    return Response.json(
      { message: "Geri yükleme için veri değişikliği onayı gerekiyor." },
      { status: 400 },
    );
  }

  if (!(file instanceof File)) {
    return Response.json(
      { message: "Geri yüklenecek ZIP dosyası seçilmedi." },
      { status: 400 },
    );
  }

  if (!file.name.toLocaleLowerCase("tr-TR").endsWith(".zip")) {
    return Response.json(
      { message: "Sadece .zip uzantılı tam yedek dosyaları geri yüklenebilir." },
      { status: 400 },
    );
  }

  if (file.size > maxBackupZipSize) {
    return Response.json(
      { message: "ZIP dosyası 500 MB sınırını aşıyor." },
      { status: 413 },
    );
  }

  try {
    await prisma.$disconnect();
    const result = await restoreFromBackupZip(file);
    await createAuditLog({
      entityType: "RESTORE",
      action: "BACKUP_RESTORE",
      title: "Yedek geri yüklendi",
      description: "Tam yedek ZIP dosyası içeri aktarıldı. Server yeniden başlatılmalı.",
      metadata: {
        fileName: file.name,
        size: file.size,
        restoredUploadFileCount: result.restoredUploadFileCount,
        restoredDatabase: result.restoredDatabase,
        safetyBackupPath: result.safetyBackupPath ? "storage/restore-backups" : null,
      },
    });

    return Response.json(result);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Geri yükleme sırasında beklenmeyen bir hata oluştu.";
    const status =
      message.includes("Restore sırasında hata") ||
      message.includes("geri alma işlemi tamamlanamadı")
        ? 500
        : 400;

    await createAuditLog({
      entityType: "RESTORE",
      action: "BACKUP_RESTORE",
      title: "Yedek geri yükleme başarısız",
      description: message,
      metadata: {
        fileName: file.name,
        size: file.size,
        status,
      },
    });

    return Response.json(
      {
        message,
      },
      { status },
    );
  }
}

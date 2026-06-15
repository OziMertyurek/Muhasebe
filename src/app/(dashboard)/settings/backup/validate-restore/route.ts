import { createAuditLog } from "@/lib/audit-log-utils";
import { maxBackupZipSize, validateBackupZip } from "@/lib/backup-utils";
import { requireRequestLocalAuth } from "@/lib/security-utils";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authResponse = await requireRequestLocalAuth(request);

  if (authResponse) {
    return authResponse;
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return Response.json(
      { message: "Dosya yükleme isteği okunamadı." },
      { status: 400 },
    );
  }

  const file = formData.get("backupFile");

  if (!(file instanceof File)) {
    return Response.json(
      { message: "Kontrol edilecek ZIP dosyası seçilmedi." },
      { status: 400 },
    );
  }

  if (file.size > maxBackupZipSize) {
    return Response.json(
      { message: "ZIP dosyası 500 MB sınırını aşıyor." },
      { status: 413 },
    );
  }

  const result = await validateBackupZip(file);
  await createAuditLog({
    entityType: "RESTORE",
    action: "BACKUP_VALIDATE",
    title: result.isValid ? "Yedek ZIP doğrulandı" : "Yedek ZIP doğrulama hatası",
    description: result.isValid
      ? "Seçilen tam yedek ZIP dosyası geçerli görünüyor."
      : "Seçilen ZIP dosyasında eksik veya hatalı alanlar var.",
    metadata: {
      fileName: file.name,
      size: file.size,
      isValid: result.isValid,
      warnings: result.warnings,
      errors: result.errors,
      metadata: result.metadata,
    },
  });

  return Response.json(result, {
    status: result.errors.length > 0 ? 422 : 200,
  });
}

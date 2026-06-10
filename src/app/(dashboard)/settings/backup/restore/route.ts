import { maxBackupZipSize, restoreFromBackupZip } from "@/lib/backup-utils";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
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

    return Response.json(
      {
        message,
      },
      { status },
    );
  }
}

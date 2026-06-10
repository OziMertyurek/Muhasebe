import { maxBackupZipSize, validateBackupZip } from "@/lib/backup-utils";

export const runtime = "nodejs";

export async function POST(request: Request) {
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

  return Response.json(result, {
    status: result.errors.length > 0 ? 422 : 200,
  });
}

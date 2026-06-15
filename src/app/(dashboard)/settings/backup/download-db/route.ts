import { readFile } from "node:fs/promises";
import { createAuditLog } from "@/lib/audit-log-utils";
import { getDatabaseBackupInfo, formatBackupFileName } from "@/lib/backup-utils";
import { requireRequestLocalAuth } from "@/lib/security-utils";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authResponse = await requireRequestLocalAuth(request);

  if (authResponse) {
    return authResponse;
  }

  const database = getDatabaseBackupInfo();

  if (!database.databasePath || !database.exists) {
    return new Response("Veritabanı dosyası bulunamadı.", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }

  const file = await readFile(database.databasePath);
  const fileName = formatBackupFileName();

  await createAuditLog({
    entityType: "BACKUP",
    action: "BACKUP_DOWNLOAD",
    title: "Veritabanı yedeği indirildi",
    description: "Sadece SQLite veritabanı yedeği indirildi.",
    metadata: { fileName, size: file.byteLength },
  });

  return new Response(file, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}

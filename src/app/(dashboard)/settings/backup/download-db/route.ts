import { readFile } from "node:fs/promises";
import { getDatabaseBackupInfo, formatBackupFileName } from "@/lib/backup-utils";

export const runtime = "nodejs";

export async function GET() {
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

  return new Response(file, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${formatBackupFileName()}"`,
      "Cache-Control": "no-store",
    },
  });
}

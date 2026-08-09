"use server";

import { revalidatePath } from "next/cache";
import { createAuditLog } from "@/lib/audit-log-utils";
import {
  buildCrmImportPreview,
  filterRowsAgainstCurrentDatabase,
  rowToCreateData,
  sanitizeCrmImportRows,
  type CrmImportPreview,
} from "@/lib/crm-import-utils";
import { prisma } from "@/lib/prisma";

export type CrmImportActionState = {
  message?: string;
  error?: string;
  preview?: CrmImportPreview;
  importSummary?: {
    added: number;
    duplicateSkipped: number;
    invalidRows: number;
  };
};

const maxCsvSizeBytes = 2 * 1024 * 1024;

export async function previewCrmImportAction(
  _previousState: CrmImportActionState,
  formData: FormData,
): Promise<CrmImportActionState> {
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Lütfen CSV dosyası seçin." };
  }

  const fileName = file.name.toLocaleLowerCase("tr-TR");

  if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
    return {
      error: "Excel dosyanızı CSV olarak dışa aktarıp yükleyebilirsiniz.",
    };
  }

  if (!fileName.endsWith(".csv")) {
    return { error: "Bu aşamada yalnızca CSV dosyası desteklenir." };
  }

  if (file.size > maxCsvSizeBytes) {
    return { error: "CSV dosyası en fazla 2 MB olabilir." };
  }

  try {
    const csvText = await file.text();
    const preview = await buildCrmImportPreview(csvText);

    if (preview.summary.totalRows === 0) {
      return { error: "CSV içinde aktarılacak satır bulunamadı." };
    }

    return {
      message: "Ön izleme hazır. Veritabanına yazmadan önce sonuçları kontrol edin.",
      preview,
    };
  } catch {
    return { error: "CSV dosyası okunurken bir hata oluştu." };
  }
}

export async function confirmCrmImportAction(
  _previousState: CrmImportActionState,
  formData: FormData,
): Promise<CrmImportActionState> {
  const payload = formData.get("payload");

  if (typeof payload !== "string" || !payload.trim()) {
    return { error: "Aktarılacak satır bulunamadı. Lütfen dosyayı tekrar ön izleyin." };
  }

  try {
    const rows = sanitizeCrmImportRows(JSON.parse(payload));
    const uniqueRows = await filterRowsAgainstCurrentDatabase(rows);
    const duplicateSkipped = rows.length - uniqueRows.length;

    if (uniqueRows.length === 0) {
      return {
        message: "Eklenecek yeni firma bulunamadı.",
        importSummary: {
          added: 0,
          duplicateSkipped,
          invalidRows: 0,
        },
      };
    }

    const data = uniqueRows.map((row) => rowToCreateData(row));

    await prisma.crmCompany.createMany({ data });
    await createAuditLog({
      entityType: "CRM_COMPANY",
      action: "CREATE",
      title: `Firma takip CSV içe aktarımı: ${data.length} kayıt eklendi`,
      description: "CSV içe aktarma ile firma takip kayıtları oluşturuldu.",
      after: {
        added: data.length,
        duplicateSkipped,
      },
    });

    revalidatePath("/crm");
    revalidatePath("/crm/import");

    return {
      message: "CSV içe aktarma tamamlandı.",
      importSummary: {
        added: data.length,
        duplicateSkipped,
        invalidRows: 0,
      },
    };
  } catch {
    return { error: "Firma kayıtları içe aktarılırken bir hata oluştu." };
  }
}

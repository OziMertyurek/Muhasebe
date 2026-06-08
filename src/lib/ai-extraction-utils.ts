import type { FileRelatedType } from "@prisma/client";
import { aiExtractionRelatedTypeLabels } from "@/lib/ai-extraction-labels";
export {
  aiExtractionRelatedTypeLabels,
  aiExtractionRelatedTypeOptions,
  aiExtractionStatusLabels,
  aiExtractionStatusOptions,
  formatConfidence,
  hasExtractionError,
  validateJsonText,
} from "@/lib/ai-extraction-labels";

const supportedMimeTypes = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

const supportedExtensions = [".pdf", ".png", ".jpg", ".jpeg", ".webp"];

export function isAiExtractionSupportedFile(file: {
  relatedType: FileRelatedType;
  mimeType?: string | null;
  originalFileName: string;
}) {
  if (file.relatedType !== "INVOICE" && file.relatedType !== "OTHER") {
    return false;
  }

  if (file.mimeType && supportedMimeTypes.has(file.mimeType)) {
    return true;
  }

  const lowerName = file.originalFileName.toLowerCase();
  return supportedExtensions.some((extension) => lowerName.endsWith(extension));
}

export function getAiExtractionFileWhere() {
  return {
    relatedType: { in: ["INVOICE", "OTHER"] as FileRelatedType[] },
    OR: [
      { mimeType: "application/pdf" },
      { mimeType: "image/png" },
      { mimeType: "image/jpeg" },
      { mimeType: "image/webp" },
      { originalFileName: { endsWith: ".pdf" } },
      { originalFileName: { endsWith: ".png" } },
      { originalFileName: { endsWith: ".jpg" } },
      { originalFileName: { endsWith: ".jpeg" } },
      { originalFileName: { endsWith: ".webp" } },
    ],
  };
}

export async function getAiExtractionFileOptions() {
  const { prisma } = await import("@/lib/prisma");
  const files = await prisma.fileAttachment.findMany({
    where: getAiExtractionFileWhere(),
    orderBy: { uploadedAt: "desc" },
    select: {
      id: true,
      originalFileName: true,
      relatedType: true,
      mimeType: true,
      uploadedAt: true,
    },
  });

  return files.filter(isAiExtractionSupportedFile).map((file) => ({
    id: file.id,
    label: `${file.originalFileName} - ${aiExtractionRelatedTypeLabels[file.relatedType]}`,
    originalFileName: file.originalFileName,
  }));
}

// Gelecek aşama notu:
// 1. PDF/görsel dosyadan OCR metni çıkarılacak.
// 2. AI ile metin fatura alanlarını içeren JSON yapısına dönüştürülecek.
// 3. Kullanıcı onayından sonra bu JSON üzerinden Invoice kaydı oluşturulacak.

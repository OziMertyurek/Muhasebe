import type { FileRelatedType } from "#prisma/client";
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

const supportedMimeByExtension = new Map([
  [".pdf", "application/pdf"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".html", "text/html"],
  [".htm", "text/html"],
]);

export function isAiExtractionSupportedFile(file: {
  relatedType: FileRelatedType;
  mimeType?: string | null;
  originalFileName: string;
}) {
  if (file.relatedType !== "INVOICE" && file.relatedType !== "OTHER") {
    return false;
  }

  const lowerName = file.originalFileName.toLowerCase();
  const dotIndex = lowerName.lastIndexOf(".");
  const extension = dotIndex === -1 ? "" : lowerName.slice(dotIndex);

  return Boolean(file.mimeType) && supportedMimeByExtension.get(extension) === file.mimeType;
}

export function getAiExtractionFileWhere() {
  return {
    deletedAt: null,
    relatedType: { in: ["INVOICE", "OTHER"] as FileRelatedType[] },
    OR: [
      { mimeType: "application/pdf" },
      { mimeType: "image/png" },
      { mimeType: "image/jpeg" },
      { mimeType: "image/webp" },
      { mimeType: "text/html" },
      { originalFileName: { endsWith: ".pdf" } },
      { originalFileName: { endsWith: ".png" } },
      { originalFileName: { endsWith: ".jpg" } },
      { originalFileName: { endsWith: ".jpeg" } },
      { originalFileName: { endsWith: ".webp" } },
      { originalFileName: { endsWith: ".html" } },
      { originalFileName: { endsWith: ".htm" } },
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

// Gelecek aÅŸama notu:
// 1. PDF/gÃ¶rsel dosyadan OCR metni Ã§Ä±karÄ±lacak.
// 2. AI ile metin fatura alanlarÄ±nÄ± iÃ§eren JSON yapÄ±sÄ±na dÃ¶nÃ¼ÅŸtÃ¼rÃ¼lecek.
// 3. KullanÄ±cÄ± onayÄ±ndan sonra bu JSON Ã¼zerinden Invoice kaydÄ± oluÅŸturulacak.
